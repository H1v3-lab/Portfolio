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

## Mettre en ligne (gratuit)

GitHub Pages : Settings → Pages → Source « Deploy from a branch » → `main` / `/ (root)`.

## Modifier

- **Certifications** : section `#certifications` dans `index.html` (un modèle de carte est en commentaire).
- **Assistant IA** : réponses dans le tableau `KB` de `assets/js/main.js`.
- **Textes FR/EN** : objet `T` dans `assets/js/main.js` (les éléments avec `data-i18n`).
- **Logos** : fichiers dans `assets/img/logos/`. Pour remplacer un logo (meilleure qualité) ou en ajouter un, dépose le fichier officiel avec le même nom ; si un fichier manque, les initiales s'affichent automatiquement (`data-fb`).
- Toutes les animations sont coupées automatiquement si le visiteur a activé « réduire les animations ».
