# API du mini-CTF (classement)

Petit Cloudflare Worker servi sur `sakoi-cyber.me/api/ctf/*`, avec une base D1.

| Route | Rôle |
|---|---|
| `POST /api/ctf/flag` `{sid, flag}` | Vérifie le flag côté serveur et l'horodate avec l'horloge du serveur |
| `POST /api/ctf/finish` `{sid, pseudo}` | Enregistre le pseudo une fois les 6 flags trouvés ; calcule le score |
| `GET /api/ctf/leaderboard` | Top 20 |

**Score** = 750 points de flags (50 + 100 + 100 + 150 + 150 + 200) + bonus vitesse de 2 250 points,
divisé par deux toutes les 30 minutes. Le temps est mesuré par le serveur entre le premier et le dernier flag.

Données enregistrées : un identifiant de session aléatoire, les numéros de flags et leurs heures, puis le pseudo,
le score et le temps. Aucune adresse IP, aucun cookie.

## Déploiement (tableau de bord Cloudflare, une seule fois)

1. **Base de données** : *Stockage et bases de données → D1 → Créer* → nom `ctf`.
   Onglet **Console** : coller le contenu de `schema.sql` → **Exécuter**.
2. **Worker** : *Workers & Pages → Créer → Worker* → nom `ctf-api` → **Déployer**, puis **Modifier le code** :
   remplacer tout par le contenu de `worker.js` → **Déployer**.
3. **Liaison** : dans le Worker → *Paramètres → Liaisons → Ajouter → Base de données D1* →
   nom de variable `DB`, base `ctf` → **Déployer**.
4. **Route** : dans le Worker → *Paramètres → Domaines et routes → Ajouter → Route* →
   zone `sakoi-cyber.me`, route `sakoi-cyber.me/api/*`.
5. Vérifier : `https://sakoi-cyber.me/api/ctf/leaderboard` doit répondre `{"players":0,"top":[]}`.

## Modération

D1 → `ctf` → Console :

```sql
SELECT id, pseudo, score, seconds FROM scores ORDER BY score DESC;
DELETE FROM scores WHERE pseudo = 'pseudo-à-retirer';
```

Si un flag change, mettre à jour les empreintes à la fois dans `worker.js` et dans `assets/js/ctf.js`.
