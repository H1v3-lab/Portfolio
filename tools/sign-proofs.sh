#!/usr/bin/env bash
# Generate the keybase-style identity proofs for /identite.html.
#
# Run this on a machine that holds Dmod's PGP PRIVATE key (never on the server).
# It clear-signs one statement per linked account and writes proofs/<id>.asc,
# which the page then verifies live against pgp.asc.
#
#   bash tools/sign-proofs.sh
#
# Requires: gpg, with the secret key for 7A1E7DFF5B9C126533A5EF2FB73CAA6CDE272EE6.
set -euo pipefail

FPR="7A1E7DFF5B9C126533A5EF2FB73CAA6CDE272EE6"
cd "$(dirname "$0")/.."
mkdir -p proofs

sign() {
  local id="$1" statement="$2"
  printf '%s\n' "$statement" | gpg --local-user "$FPR" --clearsign --armor --output "proofs/$id.asc" --yes
  echo "  signed proofs/$id.asc"
}

echo "Signing identity proofs with key $FPR …"

sign github "I am H1v3-lab on GitHub (https://github.com/H1v3-lab).
This statement binds my PGP key $FPR to that account.
sakoi-cyber.me identity proof."

sign domain "I control the domain sakoi-cyber.me and its subdomains.
This statement binds my PGP key $FPR to https://sakoi-cyber.me.
sakoi-cyber.me identity proof."

sign blog "I control blog.sakoi-cyber.me (my blog).
This statement binds my PGP key $FPR to https://blog.sakoi-cyber.me.
sakoi-cyber.me identity proof."

# Flip "signed": false -> true in the manifest for proofs whose .asc now exists.
python3 - <<'PY'
import json, os
p = "assets/data/proofs.json"
m = json.load(open(p))
for pr in m["proofs"]:
    pr["signed"] = os.path.exists(pr["file"])
json.dump(m, open(p, "w"), ensure_ascii=False, indent=2)
print("  updated", p)
PY

echo "Done. Commit the proofs/ directory and assets/data/proofs.json, then push."
