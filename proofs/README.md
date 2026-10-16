# Identity proofs

Keybase-style proofs for [`/identite.html`](../identite.html): short statements
clear-signed with Dmod's PGP key (`7A1E7DFF5B9C126533A5EF2FB73CAA6CDE272EE6`),
binding the key to each linked account. The page verifies them **live in the
browser** against [`pgp.asc`](../pgp.asc) — no server, no trust required.

## How to (re)generate

On a machine that holds the **private** key:

```sh
bash tools/sign-proofs.sh
git add proofs/ assets/data/proofs.json
git commit -m "Sign identity proofs"
git push
```

The script clear-signs each statement into `proofs/<id>.asc` and flips
`"signed": true` in `assets/data/proofs.json`. Until a proof is signed, the page
shows it as *awaiting signature* (and makes no network request for it).

Files here (`*.asc`) are the signed statements; this README is not served as a proof.
