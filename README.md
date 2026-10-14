# Portfolio — Dmod

Portfolio cybersécurité de Dominique-Savio SAKOI (Dmod). Site 100 % statique : aucun framework, aucune dépendance, aucun build.

## Structure

```
index.html            accueil : logo, titre, À propos, et cartes « Explorer » vers chaque page
competences.html      compétences
projets.html          projets
ctf.html              CTF (liens vers les writeups)
certifications.html   certifications
formation.html        formation
experience.html       expérience
contact.html          contact (email, LinkedIn, GitHub, formulaire)
writeups.html         lecteur de writeups (writeups/index.json)
404.html              page d'erreur
assets/css/style.css  mise en page et styles
assets/css/fx.css     effets (loader, curseur, tilt 3D, glitch…)
assets/js/main.js     langue FR/EN, navigation, assistant IA, logo 0_0, formulaires
assets/js/fx.js       globe 3D, parallax, transitions au défilement, compteurs…
assets/js/models.js   personnages 3D (three.js)
```

Chaque page contient le même menu de gauche, l'assistant et les mêmes scripts : une modification du menu se fait dans tous les fichiers `.html`.
Les résumés de la page d'accueil (section `#explore` de `index.html`) sont à mettre à jour quand une page change beaucoup.

## Voir en local

```
python3 -m http.server 8000
```
puis ouvrir http://localhost:8000

## Mettre en ligne (GitHub Pages)

1. Settings → Pages → Source « Deploy from a branch » → branche `main`, dossier `/ (root)`.
2. Le site est publié sur `https://h1v3-lab.github.io/Portfolio/` (ou `https://<compte>.github.io/` si le dépôt s'appelle `<compte>.github.io`).
3. Nom de domaine : **sakoi-cyber.me** (fichier `CNAME`). Pour le (re)configurer : Settings → Pages → Custom domain, puis cocher « Enforce HTTPS ». GitHub crée le fichier `CNAME` à la racine.
   - domaine racine (`exemple.com`) : 4 enregistrements `A` vers `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (et `AAAA` `2606:50c0:8000::153` à `8003::153` pour l'IPv6) ;
   - sous-domaine (`www.exemple.com`) : un `CNAME` vers `h1v3-lab.github.io`.

Le fichier `.nojekyll` désactive Jekyll pour que tous les fichiers soient servis tels quels.

## Modifier

- **Certifications** : `certifications.html` (un modèle de carte est en commentaire).
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
- **Après une modification d'un fichier CSS ou JS** : lancer `python3 tools/version-assets.py`. Le script ajoute `?v=<empreinte>` aux liens des pages pour que les navigateurs rechargent les nouveaux fichiers au lieu d'une ancienne version en cache.
- Toutes les animations sont coupées automatiquement si le visiteur a activé « réduire les animations ».
