# Honeypot — « attaques en direct »

Un petit honeypot **passif** tourne sur un VPS, écoute les ports les plus scannés, et enregistre
pour chaque tentative : l'IP source, le protocole, le port, les identifiants SSH essayés et les
premiers octets envoyés. Il **n'exécute jamais** ce que l'attaquant envoie. Les événements partent
vers un Cloudflare Worker (base D1), et la page `sakoi-cyber.me/attaques.html` les affiche en direct.

```
  VPS (agent.py)  ──POST /ingest (Bearer token)──▶  Worker + D1  ◀──GET /stats──  attaques.html
  ports 22,23,80,…                                 sakoi-cyber.me/api/honeypot/*
```

## 1. L'API (Cloudflare, une seule fois)

1. **Secret partagé** : génère un jeton, p. ex. `openssl rand -hex 24`. Garde-le, il va des deux côtés.
2. **D1** : *Stockage et bases de données → D1 → Créer* → nom `honeypot`.
   Console → coller `schema.sql` (une ligne) → **Exécuter**.
3. **Worker** : *Workers & Pages → Créer → Worker* → nom `honeypot-api` → **Déployer** →
   **Modifier le code** → coller `worker.js` → **Déployer**.
4. **Liaison D1** : Worker → *Paramètres → Liaisons → Ajouter → D1* → variable `DB`, base `honeypot`.
5. **Secret** : Worker → *Paramètres → Variables et secrets → Ajouter* → type **Secret** →
   nom `HP_TOKEN`, valeur = le jeton de l'étape 1.
6. **Route** : Worker → *Paramètres → Domaines et routes → Ajouter → Route* → `sakoi-cyber.me/api/honeypot/*`.
   (Plus précise que `/api/*` et `/api/arena/*` : les trois Workers cohabitent.)
7. Vérifier : `https://sakoi-cyber.me/api/honeypot/stats` répond un JSON avec `totals: {total:0,…}`.

## 2. Le VPS Oracle Cloud (Always Free)

### Créer l'instance
1. Console Oracle Cloud → **Compute → Instances → Create instance**.
2. **Image** : Canonical **Ubuntu** (22.04 ou 24.04). **Shape** : `VM.Standard.A1.Flex` (ARM, Always Free), 1 OCPU / 6 Go suffisent largement.
3. **Ajoute ta clé SSH publique** (génère-la avec `ssh-keygen -t ed25519` si besoin).
4. Crée l'instance, note son **IP publique**.

### Ouvrir les ports (deux niveaux de pare-feu chez Oracle)
1. **Security List / NSG** (réseau) : VCN → Subnet → *Security List* → *Add Ingress Rules*.
   Source `0.0.0.0/0`, protocole TCP, ports : `22,23,25,80,2375,3306,3389,5432,5900,6379,8080` **et** ton port d'admin (voir plus bas).
2. **iptables de l'instance** : Oracle Ubuntu a un pare-feu local. On l'ouvrira dans le script.

### ⚠️ D'abord, déplace ton vrai SSH (sinon tu te bloques)
Le honeypot va prendre le port 22. Déplace l'administration sur un autre port **avant** :
```bash
sudo sed -i 's/^#\?Port .*/Port 2222/' /etc/ssh/sshd_config
sudo systemctl restart ssh
# ouvre 2222 dans la Security List Oracle, puis reconnecte-toi : ssh -p 2222 ubuntu@IP
```
Vérifie que `ssh -p 2222` fonctionne **dans une nouvelle fenêtre** avant de continuer.

### Installer l'agent
```bash
sudo apt update && sudo apt install -y python3-pip
sudo pip3 install paramiko geoip2 --break-system-packages

sudo useradd -r -s /usr/sbin/nologin honeypot || true
sudo mkdir -p /opt/honeypot
# copie agent.py et honeypot.service sur le VPS (scp, ou git clone de ce dossier)
sudo cp agent.py /opt/honeypot/
sudo cp honeypot.service /etc/systemd/system/

# (optionnel, pour les pays) base GeoLite2-Country :
# crée un compte gratuit maxmind.com, télécharge GeoLite2-Country.mmdb,
# puis : sudo cp GeoLite2-Country.mmdb /opt/honeypot/

# la configuration (le secret partagé) :
sudo tee /opt/honeypot/honeypot.env >/dev/null <<'ENV'
HP_INGEST_URL=https://sakoi-cyber.me/api/honeypot/ingest
HP_TOKEN=colle-ici-le-meme-jeton
HP_GEOIP=/opt/honeypot/GeoLite2-Country.mmdb
ENV
sudo chmod 600 /opt/honeypot/honeypot.env
sudo chown -R honeypot:honeypot /opt/honeypot

# ouvre le pare-feu local sur les ports écoutés
for p in 22 23 25 80 2375 3306 3389 5432 5900 6379 8080; do sudo iptables -I INPUT -p tcp --dport $p -j ACCEPT; done
sudo apt install -y iptables-persistent && sudo netfilter-persistent save

sudo systemctl daemon-reload
sudo systemctl enable --now honeypot
sudo systemctl status honeypot          # doit être "active (running)"
journalctl -u honeypot -f               # tu verras les premières attaques en minutes
```

En général, les premiers scans SSH arrivent **en quelques minutes** sur une IP publique fraîche.

## 3. Vérifier la page

`https://sakoi-cyber.me/attaques.html` : le globe, les compteurs et le flux se remplissent dès les
premiers événements (la page interroge `/stats` toutes les 10 s).

## 4. Threat intel — les « dossiers » par attaquant (optionnel mais recommandé)

La page affiche aussi un **dossier CTI par IP** (réseau/ASN, nœud Tor, réputation, services visés,
identifiants). L'enrichissement se fait côté Worker, en cache dans D1. Pour l'activer :

1. **Tables d'enrichissement** : Worker → D1 `honeypot` → console → coller `schema-intel.sql`
   (une ligne) → **Exécuter**. Crée `intel`, `torexits`, `meta` sans toucher à `events`.
2. **Redéployer** `worker.js` (il expose maintenant `GET /api/honeypot/attackers`).
3. C'est tout : l'**ASN / propriétaire réseau** (Team Cymru via DNS-over-HTTPS) et le **flag Tor**
   (liste publique des nœuds de sortie, rafraîchie ~2×/jour) fonctionnent **sans aucune clé**.

### Réputation (facultatif — ajoute des clés API gratuites)

Pour afficher un score de réputation, ajoute l'un de ces secrets au Worker
(*Paramètres → Variables et secrets → Secret*) :

- `ABUSEIPDB_KEY` — compte gratuit sur abuseipdb.com (1 000 requêtes/jour) : score de confiance
  d'abus, nombre de signalements, type d'usage, FAI.
- `GREYNOISE_KEY` — compte communauté gratuit sur greynoise.io : classification benign / malicious.

Sans ces clés, les dossiers restent complets (réseau, Tor, pays, services, identifiants, volume,
première/dernière vue) : seule la ligne « réputation » est masquée. L'enrichissement est **budgété**
(quelques IP par requête) et **mis en cache une semaine** par IP, pour rester largement dans les
quotas gratuits.

## Sécurité & éthique

- L'agent est **100 % passif** : il journalise, il ne lance rien. Aucune donnée de l'attaquant n'est exécutée.
- L'ingestion est **authentifiée** (Bearer token) : personne ne peut injecter de faux événements.
- Le honeypot ne sert **qu'à observer** des attaques dirigées contre lui-même — jamais à attaquer qui que ce soit.
- Le VPS doit rester isolé : aucune donnée sensible, administration sur un port séparé avec clé SSH.
- Données publiées : IP source, pays, port, protocole, identifiants essayés. Pas de données personnelles de visiteurs, aucun cookie.

## Entretien

- Les événements de plus de 30 jours sont supprimés automatiquement.
- Changer le jeton : mets à jour le secret `HP_TOKEN` du Worker **et** `/opt/honeypot/honeypot.env`, puis `sudo systemctl restart honeypot`.
- Mettre à jour la base GeoLite2 de temps en temps (MaxMind publie des mises à jour).
