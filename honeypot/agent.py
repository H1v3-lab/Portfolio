#!/usr/bin/env python3
"""
Honeypot agent — passive. Listens on commonly-scanned ports, records the source IP,
the protocol, and the first bytes / credentials an attacker sends, then ships the events
to the Cloudflare Worker. It NEVER executes anything an attacker sends.

Config via environment variables:
  HP_INGEST_URL   https://sakoi-cyber.me/api/honeypot/ingest   (required)
  HP_TOKEN        the shared secret, same as the Worker's HP_TOKEN secret (required)
  HP_GEOIP        path to a GeoLite2-Country.mmdb (optional; country shown as ?? without it)
  HP_SSH_PORT     SSH honeypot port (default 22)
  HP_HTTP_PORT    HTTP honeypot port (default 80)
  HP_TCP_PORTS    comma list of extra TCP capture ports (default 23,21,25,3306,5432,6379,8080,5900,3389,2375)

Dependencies:  pip install paramiko geoip2
(geoip2 is optional — the agent runs without it, countries just show as ??.)
"""
import os, socket, threading, queue, time, json, urllib.request, sys

INGEST = os.environ.get("HP_INGEST_URL", "").strip()
TOKEN  = os.environ.get("HP_TOKEN", "").strip()
SSH_PORT  = int(os.environ.get("HP_SSH_PORT", "22"))
HTTP_PORT = int(os.environ.get("HP_HTTP_PORT", "80"))
TCP_PORTS = [int(p) for p in os.environ.get("HP_TCP_PORTS", "23,21,25,3306,5432,6379,8080,5900,3389,2375").split(",") if p.strip()]
GEOIP = os.environ.get("HP_GEOIP", "").strip()

if not INGEST or not TOKEN:
    sys.exit("HP_INGEST_URL and HP_TOKEN are required")

# -------- GeoIP (optional) --------
_geo = None
if GEOIP:
    try:
        import geoip2.database
        _geo = geoip2.database.Reader(GEOIP)
    except Exception as e:
        print("geoip disabled:", e, flush=True)

def country(ip):
    if not _geo:
        return "??"
    try:
        return _geo.country(ip).country.iso_code or "??"
    except Exception:
        return "??"

# -------- event queue + flusher --------
Q = queue.Queue(maxsize=5000)

def emit(ip, proto, port, cred=None, payload=None, path=None, ua=None):
    ev = {"ts": int(time.time()), "ip": ip, "country": country(ip), "proto": proto, "port": port}
    if cred: ev["cred"] = cred[:240]
    if payload: ev["payload"] = payload[:240]
    if path: ev["path"] = path[:240]
    if ua: ev["ua"] = ua[:240]
    try: Q.put_nowait(ev)
    except queue.Full: pass
    print(time.strftime("%H:%M:%S"), proto, port, ip, (cred or payload or path or ""), flush=True)

def flusher():
    while True:
        batch = []
        try:
            batch.append(Q.get(timeout=5))
            while len(batch) < 200:
                batch.append(Q.get_nowait())
        except queue.Empty:
            pass
        if not batch:
            continue
        body = json.dumps({"events": batch}).encode()
        req = urllib.request.Request(INGEST, data=body, method="POST",
            headers={"content-type": "application/json", "authorization": "Bearer " + TOKEN})
        try:
            urllib.request.urlopen(req, timeout=10).read()
        except Exception as e:
            print("flush error:", e, flush=True)
            time.sleep(5)

# -------- helpers --------
def printable(b):
    try:
        return b.decode("utf-8", "replace").replace("\r", " ").replace("\n", " ").strip()
    except Exception:
        return b.decode("latin-1", "replace").strip()

def listener(port, handler):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(("0.0.0.0", port))
        s.listen(50)
    except Exception as e:
        print("cannot bind", port, ":", e, flush=True)
        return
    print("listening on", port, flush=True)
    while True:
        try:
            conn, addr = s.accept()
            threading.Thread(target=handler, args=(conn, addr, port), daemon=True).start()
        except Exception:
            time.sleep(0.1)

# -------- generic TCP capture --------
def tcp_handler(conn, addr, port):
    ip = addr[0]
    try:
        conn.settimeout(4)
        data = conn.recv(512)
        emit(ip, "tcp", port, payload=printable(data) if data else None)
    except Exception:
        emit(ip, "tcp", port)
    finally:
        try: conn.close()
        except Exception: pass

# -------- HTTP capture --------
def http_handler(conn, addr, port):
    ip = addr[0]
    try:
        conn.settimeout(4)
        data = conn.recv(2048)
        text = data.decode("latin-1", "replace") if data else ""
        lines = text.split("\r\n")
        reqline = lines[0][:160] if lines else ""
        ua = ""
        for line in lines:
            if line.lower().startswith("user-agent:"):
                ua = line.split(":", 1)[1].strip()[:200]
        emit(ip, "http", port, path=reqline or None, ua=ua or None)
        conn.sendall(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")
    except Exception:
        emit(ip, "http", port)
    finally:
        try: conn.close()
        except Exception: pass

# -------- SSH honeypot (captures attempted credentials, always rejects) --------
def start_ssh():
    try:
        import paramiko
    except Exception as e:
        print("paramiko missing, SSH honeypot off:", e, flush=True)
        return
    keypath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hp_host_key")
    if os.path.exists(keypath):
        host_key = paramiko.RSAKey(filename=keypath)
    else:
        host_key = paramiko.RSAKey.generate(2048)
        host_key.write_private_key_file(keypath)

    class Server(paramiko.ServerInterface):
        def __init__(self, ip): self.ip = ip
        def get_allowed_auths(self, username): return "password,publickey"
        def check_auth_password(self, username, password):
            emit(self.ip, "ssh", SSH_PORT, cred=(username + " / " + password)[:240])
            return paramiko.AUTH_FAILED
        def check_auth_publickey(self, username, key):
            emit(self.ip, "ssh", SSH_PORT, cred=(username + " / key:" + key.get_name())[:240])
            return paramiko.AUTH_FAILED
        def check_channel_request(self, kind, chanid): return paramiko.OPEN_SUCCEEDED

    def handle(conn, addr, port):
        ip = addr[0]
        try:
            conn.settimeout(8)
            t = paramiko.Transport(conn)
            t.local_version = "SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.4"
            t.add_server_key(host_key)
            t.start_server(server=Server(ip))
            t.join(timeout=10)
        except Exception:
            pass
        finally:
            try: conn.close()
            except Exception: pass

    threading.Thread(target=listener, args=(SSH_PORT, handle), daemon=True).start()

def main():
    threading.Thread(target=flusher, daemon=True).start()
    start_ssh()
    threading.Thread(target=listener, args=(HTTP_PORT, http_handler), daemon=True).start()
    for p in TCP_PORTS:
        threading.Thread(target=listener, args=(p, tcp_handler), daemon=True).start()
    print("honeypot agent running", flush=True)
    while True:
        time.sleep(3600)

if __name__ == "__main__":
    main()
