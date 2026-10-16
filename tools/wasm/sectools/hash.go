package main

import (
	"crypto/md5"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/hex"
	"errors"
	"hash/crc32"
	"regexp"
	"strings"
)

type hashResult struct {
	Mode    string       `json:"mode"` // "digest" | "identify"
	Digests []digestRow  `json:"digests,omitempty"`
	Guesses []hashGuess  `json:"guesses,omitempty"`
	Findings []finding   `json:"findings,omitempty"`
}

type digestRow struct {
	Name string `json:"name"`
	Hex  string `json:"hex"`
	Bits int    `json:"bits"`
}

type hashGuess struct {
	Name       string `json:"name"`
	Confidence string `json:"confidence"` // "élevée" | "moyenne"
	Hashcat    string `json:"hashcat"`
}

var hexRe = regexp.MustCompile(`^[0-9a-fA-F]+$`)

func analyzeHash(input, mode string) (*hashResult, error) {
	if input == "" {
		return nil, errors.New("aucune donnée fournie")
	}
	if mode == "identify" {
		return identifyHash(strings.TrimSpace(input)), nil
	}
	return digestAll(input), nil
}

func digestAll(s string) *hashResult {
	data := []byte(s)
	md := md5.Sum(data)
	s1 := sha1.Sum(data)
	s256 := sha256.Sum256(data)
	s384 := sha512.Sum384(data)
	s512 := sha512.Sum512(data)
	crc := crc32.ChecksumIEEE(data)
	return &hashResult{
		Mode: "digest",
		Digests: []digestRow{
			{"CRC32", hexN(uint64(crc), 8), 32},
			{"MD5", hex.EncodeToString(md[:]), 128},
			{"SHA-1", hex.EncodeToString(s1[:]), 160},
			{"SHA-256", hex.EncodeToString(s256[:]), 256},
			{"SHA-384", hex.EncodeToString(s384[:]), 384},
			{"SHA-512", hex.EncodeToString(s512[:]), 512},
		},
		Findings: []finding{{"info", "Calcul local",
			"Ces condensats sont calculés dans ton navigateur (WASM). MD5 et SHA-1 sont cassés pour la résistance aux collisions : à éviter pour la sécurité."}},
	}
}

func hexN(v uint64, width int) string {
	h := hex.EncodeToString([]byte{byte(v >> 24), byte(v >> 16), byte(v >> 8), byte(v)})
	if len(h) > width {
		return h[len(h)-width:]
	}
	return h
}

// identifyHash guesses candidate algorithms from a hash string's shape.
func identifyHash(s string) *hashResult {
	res := &hashResult{Mode: "identify"}

	// Prefixed / structured formats first (highest confidence).
	prefixed := []struct{ pre, name, cat string }{
		{"$2a$", "bcrypt", "3200"}, {"$2b$", "bcrypt", "3200"}, {"$2y$", "bcrypt", "3200"},
		{"$argon2id$", "Argon2id", "—"}, {"$argon2i$", "Argon2i", "—"}, {"$argon2d$", "Argon2d", "—"},
		{"$6$", "sha512crypt", "1800"}, {"$5$", "sha256crypt", "7400"}, {"$1$", "md5crypt", "500"},
		{"$y$", "yescrypt", "—"}, {"$pbkdf2-sha256$", "PBKDF2-HMAC-SHA256", "—"},
		{"{SSHA}", "LDAP SSHA", "111"}, {"{SHA}", "LDAP SHA", "101"},
	}
	for _, p := range prefixed {
		if strings.HasPrefix(s, p.pre) {
			res.Guesses = append(res.Guesses, hashGuess{p.name, "élevée", p.cat})
		}
	}
	if len(res.Guesses) > 0 {
		return res
	}

	if !hexRe.MatchString(s) {
		res.Findings = append(res.Findings, finding{"warn", "Format non reconnu",
			"Ni hexadécimal, ni format préfixé connu ($2a$, $6$, {SSHA}…)."})
		return res
	}

	byLen := map[int][]hashGuess{
		8:   {{"CRC32", "moyenne", "—"}},
		16:  {{"MySQL 3.23 / demi-MD5", "moyenne", "—"}},
		32:  {{"MD5", "élevée", "0"}, {"NTLM", "élevée", "1000"}, {"MD4", "moyenne", "900"}, {"LM", "moyenne", "3000"}},
		40:  {{"SHA-1", "élevée", "100"}, {"MySQL 4.1+ (*…)", "moyenne", "300"}, {"RIPEMD-160", "moyenne", "6000"}},
		56:  {{"SHA-224", "élevée", "—"}, {"SHA3-224", "moyenne", "—"}},
		64:  {{"SHA-256", "élevée", "1400"}, {"SHA3-256", "moyenne", "17400"}, {"BLAKE2s-256", "moyenne", "—"}},
		96:  {{"SHA-384", "élevée", "10800"}, {"SHA3-384", "moyenne", "—"}},
		128: {{"SHA-512", "élevée", "1700"}, {"SHA3-512", "moyenne", "17600"}, {"Whirlpool", "moyenne", "6100"}, {"BLAKE2b-512", "moyenne", "—"}},
	}
	if g, ok := byLen[len(s)]; ok {
		res.Guesses = g
	} else {
		res.Findings = append(res.Findings, finding{"info", "Longueur atypique",
			"Longueur hexadécimale inhabituelle — peut être tronqué, salé, ou un format propriétaire."})
	}
	return res
}
