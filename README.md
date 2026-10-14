# Portfolio — Dmod

Portfolio cybersécurité de Dominique-Savio SAKOI (Dmod). Site 100 % statique : aucun framework, aucune dépendance, aucun build.

## Structure

```
index.html          page principale (contenu)
404.html            page d'erreur
robots.txt
assets/css/style.css   mise en page, rail, sections, chat
assets/css/fx.css      effets : loader, curseur, tilt 3D, glitch, marquee…
assets/js/main.js      langue FR/EN, titre tapé, navigation, assistant IA, logo 0_0
assets/js/fx.js        globe 3D (canvas), parallax, curseur, cartes 3D, compteurs, terminal…
assets/img/og.png      image d'aperçu quand on partage le lien
```

## Voir en local

```
python3 -m http.server 8000
```
puis ouvrir http://localhost:8000

## Mettre en ligne (GitHub Pages)

1. Settings → Pages → Source « Deploy from a branch » → branche `main`, dossier `/ (root)`.
2. Le site est publié sur `https://h1v3-lab.github.io/Portfolio/` (ou `https://<compte>.github.io/` si le dépôt s'appelle `<compte>.github.io`).
3. Nom de domaine perso : Settings → Pages → Custom domain, puis cocher « Enforce HTTPS ». GitHub crée le fichier `CNAME` à la racine.
   - domaine racine (`exemple.com`) : 4 enregistrements `A` vers `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (et `AAAA` `2606:50c0:8000::153` à `8003::153` pour l'IPv6) ;
   - sous-domaine (`www.exemple.com`) : un `CNAME` vers `h1v3-lab.github.io`.

Le fichier `.nojekyll` désactive Jekyll pour que tous les fichiers soient servis tels quels.

## Modifier

- **Certifications** : section `#certifications` dans `index.html` (un modèle de carte est en commentaire).
- **Assistant IA** : réponses dans le tableau `KB` de `assets/js/main.js`.
- **Textes FR/EN** : objet `T` dans `assets/js/main.js` (les éléments avec `data-i18n`).
- **Logos** : fichiers dans `assets/img/logos/`. Pour remplacer un logo (meilleure qualité) ou en ajouter un, dépose le fichier officiel avec le même nom ; si un fichier manque, les initiales s'affichent automatiquement (`data-fb`).
- **Writeups** : page `writeups.html`, alimentée par `writeups/index.json`. Pour publier un writeup :
  1. copie `writeups/_modele.md` vers `writeups/<slug-du-ctf>/<nom>.md` et rédige-le en Markdown ;
  2. ajoute-le dans la liste `writeups` du bon CTF dans `writeups/index.json` :
     `{ "title": "JWT confusion", "category": "web", "difficulty": "moyen", "file": "writeups/esig-tech-arena-2026/jwt-confusion.md" }`
  3. un writeup hébergé ailleurs (GitHub, Medium…) s'ajoute avec `"url": "https://…"` au lieu de `"file"`.
  Le nombre de writeups s'affiche automatiquement sur chaque carte CTF.
- **Couleurs** : classes `tier-gold`, `tier-silver`, `tier-bronze` (1er, 2e, 3e) sur une carte ; chaque compétence et projet a sa couleur via `style="--c:#hex"`.
- **Modèles 3D** : fichiers `.glb` dans `assets/models/`, affichés par `assets/js/models.js` (three.js 0.160 dans `assets/vendor/three/`, chargé seulement quand un modèle approche de l'écran). Pour en ajouter un : `<div class="model3d" data-model="assets/models/x.glb" data-rim="#couleur1,#couleur2"></div>`. Les modèles d'origine (.3mf) ont été convertis et allégés (~1 Mo chacun) ; un export `.glb` texturé depuis Tripo remplacerait directement le rendu « studio ».
- Toutes les animations sont coupées automatiquement si le visiteur a activé « réduire les animations ».
