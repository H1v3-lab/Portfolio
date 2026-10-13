# Nom du challenge

**CTF :** ESIG Tech Arena 2026 · **Catégorie :** web · **Difficulté :** moyenne · **Points :** 300

## Énoncé

> Copie ici l'énoncé du challenge.

## Reconnaissance

Ce que tu as observé en premier (ports, endpoints, fichiers, indices…).

## Exploitation

Les étapes, avec le code utile :

```bash
curl -s "http://cible/api?id=1' UNION SELECT flag FROM secrets-- -"
```

```python
from pwn import *
r = remote("cible", 1337)
```

## Flag

`FLAG{...}`

## Ce que j'en retiens

Une ou deux leçons, et comment corriger la vulnérabilité.
