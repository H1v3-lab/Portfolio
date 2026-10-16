package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"hash"
	"strings"
	"time"
)

type jwtResult struct {
	Header    map[string]any `json:"header"`
	Payload   map[string]any `json:"payload"`
	Claims    []claimRow     `json:"claims"`
	Alg       string         `json:"alg"`
	Typ       string         `json:"typ"`
	Kid       string         `json:"kid"`
	Signature string         `json:"signature"` // "none" | "unverified" | "valid" | "invalid"
	Findings  []finding      `json:"findings"`
}

type claimRow struct {
	Key   string `json:"key"`
	Value string `json:"value"`
	Human string `json:"human"`
}

func b64urlDecode(s string) ([]byte, error) {
	// JWT uses base64url without padding; be lenient about optional padding.
	if m := len(s) % 4; m != 0 {
		s += strings.Repeat("=", 4-m)
	}
	return base64.URLEncoding.DecodeString(s)
}

func analyzeJWT(token, secret string) (*jwtResult, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, errors.New("aucun jeton fourni")
	}
	if strings.HasPrefix(strings.ToLower(token), "bearer ") {
		token = strings.TrimSpace(token[7:])
	}
	parts := strings.Split(token, ".")
	if len(parts) != 2 && len(parts) != 3 {
		return nil, errors.New("structure invalide : un JWT a 2 ou 3 segments séparés par des points")
	}

	res := &jwtResult{Header: map[string]any{}, Payload: map[string]any{}}

	hb, err := b64urlDecode(parts[0])
	if err != nil {
		return nil, fmt.Errorf("en-tête illisible : %v", err)
	}
	if err := json.Unmarshal(hb, &res.Header); err != nil {
		return nil, fmt.Errorf("en-tête JSON invalide : %v", err)
	}
	pb, err := b64urlDecode(parts[1])
	if err != nil {
		return nil, fmt.Errorf("charge utile illisible : %v", err)
	}
	if err := json.Unmarshal(pb, &res.Payload); err != nil {
		return nil, fmt.Errorf("charge utile JSON invalide : %v", err)
	}

	res.Alg, _ = res.Header["alg"].(string)
	res.Typ, _ = res.Header["typ"].(string)
	res.Kid, _ = res.Header["kid"].(string)
	alg := strings.ToUpper(res.Alg)

	res.Claims = describeClaims(res.Payload)

	// --- Structural / cryptographic findings ---
	var fnd []finding

	switch {
	case alg == "NONE" || alg == "":
		res.Signature = "none"
		fnd = append(fnd, finding{"crit", "alg = none",
			"Le jeton se déclare non signé : n'importe qui peut forger la charge utile. À rejeter côté serveur (interdire explicitement « none »)."})
	case strings.HasPrefix(alg, "HS"):
		fnd = append(fnd, finding{"info", "Algorithme symétrique (" + alg + ")",
			"La même clé secrète signe et vérifie. Si un serveur accepte aussi RS256, tente la confusion d'algorithme : signer en HS256 avec la clé publique RSA comme secret."})
	case strings.HasPrefix(alg, "RS") || strings.HasPrefix(alg, "PS") || strings.HasPrefix(alg, "ES") || strings.HasPrefix(alg, "ED"):
		fnd = append(fnd, finding{"info", "Algorithme asymétrique (" + alg + ")",
			"Signé par clé privée, vérifié par clé publique. Vérifie que le serveur fige l'algorithme attendu et ne se laisse pas rétrograder en HS256 (alg confusion) ni en « none »."})
	default:
		fnd = append(fnd, finding{"warn", "Algorithme inhabituel (" + res.Alg + ")", "Algorithme non standard ou inconnu."})
	}

	if len(parts) == 2 || (len(parts) == 3 && parts[2] == "") {
		if res.Signature == "" {
			res.Signature = "none"
		}
		fnd = append(fnd, finding{"crit", "Signature absente", "Aucun segment de signature n'est présent."})
	}

	// Attempt verification for HMAC algorithms when a secret is supplied.
	if secret != "" && strings.HasPrefix(alg, "HS") && len(parts) == 3 && parts[2] != "" {
		ok, verr := verifyHS(alg, parts[0]+"."+parts[1], parts[2], []byte(secret))
		switch {
		case verr != nil:
			fnd = append(fnd, finding{"warn", "Vérification impossible", verr.Error()})
		case ok:
			res.Signature = "valid"
			fnd = append(fnd, finding{"ok", "Signature valide", "La signature HMAC correspond au secret fourni."})
			if len(secret) < 16 {
				fnd = append(fnd, finding{"warn", "Secret court",
					fmt.Sprintf("Le secret ne fait que %d octets : vulnérable au cassage par dictionnaire/force brute (ex. hashcat -m 16500).", len(secret))})
			}
		default:
			res.Signature = "invalid"
			fnd = append(fnd, finding{"crit", "Signature invalide", "La signature ne correspond pas au secret fourni."})
		}
	} else if res.Signature == "" {
		res.Signature = "unverified"
		if strings.HasPrefix(alg, "HS") {
			fnd = append(fnd, finding{"info", "Signature non vérifiée", "Fournis le secret HMAC pour tenter la vérification."})
		} else {
			fnd = append(fnd, finding{"info", "Signature non vérifiée", "La vérification asymétrique (clé publique) n'est pas effectuée ici."})
		}
	}

	// Temporal claims.
	now := time.Now()
	if exp, ok := claimTime(res.Payload, "exp"); ok {
		if now.After(exp) {
			fnd = append(fnd, finding{"warn", "Jeton expiré", "exp = " + exp.UTC().Format(time.RFC3339) + " (dépassé)."})
		}
	} else {
		fnd = append(fnd, finding{"warn", "Pas d'expiration (exp)", "Sans exp, un jeton volé reste valable indéfiniment."})
	}
	if nbf, ok := claimTime(res.Payload, "nbf"); ok && now.Before(nbf) {
		fnd = append(fnd, finding{"warn", "Pas encore valide (nbf)", "nbf = " + nbf.UTC().Format(time.RFC3339) + " (futur)."})
	}

	res.Findings = fnd
	return res, nil
}

func verifyHS(alg, signingInput, sig string, key []byte) (bool, error) {
	var h func() hash.Hash
	switch alg {
	case "HS256":
		h = sha256.New
	case "HS384":
		h = sha512.New384
	case "HS512":
		h = sha512.New
	default:
		return false, errors.New("algorithme HMAC non pris en charge : " + alg)
	}
	mac := hmac.New(h, key)
	mac.Write([]byte(signingInput))
	expected := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	got := strings.TrimRight(sig, "=")
	return hmac.Equal([]byte(expected), []byte(got)), nil
}

func describeClaims(p map[string]any) []claimRow {
	order := []struct{ k, label string }{
		{"iss", "Émetteur (iss)"}, {"sub", "Sujet (sub)"}, {"aud", "Audience (aud)"},
		{"exp", "Expiration (exp)"}, {"nbf", "Valide à partir de (nbf)"}, {"iat", "Émis le (iat)"},
		{"jti", "Identifiant (jti)"},
	}
	var rows []claimRow
	for _, o := range order {
		if v, ok := p[o.k]; ok {
			row := claimRow{Key: o.label, Value: fmt.Sprintf("%v", v)}
			if o.k == "exp" || o.k == "nbf" || o.k == "iat" {
				if t, ok := claimTime(p, o.k); ok {
					row.Human = t.UTC().Format("2006-01-02 15:04:05 UTC")
				}
			}
			rows = append(rows, row)
		}
	}
	return rows
}

func claimTime(p map[string]any, key string) (time.Time, bool) {
	v, ok := p[key]
	if !ok {
		return time.Time{}, false
	}
	if f, ok := v.(float64); ok {
		return time.Unix(int64(f), 0), true
	}
	return time.Time{}, false
}
