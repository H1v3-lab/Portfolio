# sectools — crypto toolkit (Go → WebAssembly)

A small offensive/defensive crypto toolkit that powers the **Labo crypto** page
(`/labo.html`). It is written in Go and compiled to WebAssembly, so it runs
**entirely in the visitor's browser** — no token, certificate or secret ever
leaves the page, and there is no backend to attack.

The real work is done by the Go standard library (`crypto/x509`, `crypto/rsa`,
`crypto/ecdsa`, `crypto/ed25519`, `crypto/hmac`, `crypto/sha*`), so the module
has **zero third-party dependencies**.

## Tools

| Tool | What it does |
|------|--------------|
| **JWT** | Decodes header/payload, flags `alg:none`, HS↔RS confusion risk, missing/expired `exp`, short HMAC secrets; verifies HS256/384/512 when a secret is supplied. |
| **X.509** | Parses PEM / base64-DER / hex-DER certificates: subject, issuer, validity, key type & size, signature algorithm, SANs, key usages, SHA-256/SHA-1 fingerprints; flags expiry, weak keys (RSA < 2048), SHA-1/MD5 signatures, self-signed, >398-day validity, missing SAN. |
| **Hash** | Computes CRC32/MD5/SHA-1/SHA-256/384/512 of an input, or identifies a hash from its shape (length + prefixes like `$2a$`, `$6$`, `{SSHA}`) with hashcat mode hints. |

## Exported functions

The module exports three functions on `globalThis`, each returning a JSON string:

```
sectoolsJWT(token, secret?)  // secret is optional, for HMAC verification
sectoolsCert(pemOrDer)
sectoolsHash(input, mode)     // mode = "digest" | "identify"
```

The front-end (`assets/js/labo.js`) loads the module lazily and renders the
results with `textContent` only (CSP-safe).

## Build

```sh
cd tools/wasm/sectools
GOOS=js GOARCH=wasm go build -trimpath -ldflags="-s -w" -o ../../../assets/wasm/sectools.wasm .
# runtime shim (ships next to the wasm):
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" ../../../assets/wasm/wasm_exec.js
```

After rebuilding, update the `?v=` content hash in `assets/js/labo.js`:

```sh
python3 -c "import hashlib;print(hashlib.sha256(open('assets/wasm/sectools.wasm','rb').read()).hexdigest()[:10])"
```

## CSP

Instantiating WebAssembly requires `'wasm-unsafe-eval'` in the page's
`script-src`. This is a narrowly-scoped source expression: it allows WASM
compilation **without** permitting JavaScript `eval()`. The Go runtime shim
(`wasm_exec.js`) contains no `eval()` call, so `'unsafe-eval'` is **not** needed.

```
script-src 'self' 'wasm-unsafe-eval' '<importmap-hash>';
```
