package main

import (
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/pem"
	"errors"
	"fmt"
	"net"
	"strings"
	"time"
)

type certResult struct {
	Subject      string    `json:"subject"`
	Issuer       string    `json:"issuer"`
	Serial       string    `json:"serial"`
	NotBefore    string    `json:"notBefore"`
	NotAfter     string    `json:"notAfter"`
	DaysLeft     int       `json:"daysLeft"`
	IsCA         bool      `json:"isCA"`
	SelfSigned   bool      `json:"selfSigned"`
	KeyType      string    `json:"keyType"`
	SigAlg       string    `json:"sigAlg"`
	SANs         []string  `json:"sans"`
	KeyUsage     []string  `json:"keyUsage"`
	ExtKeyUsage  []string  `json:"extKeyUsage"`
	FingerSHA256 string    `json:"fingerprintSha256"`
	FingerSHA1   string    `json:"fingerprintSha1"`
	Findings     []finding `json:"findings"`
}

func analyzeCert(input string) (*certResult, error) {
	der, err := decodeCert(strings.TrimSpace(input))
	if err != nil {
		return nil, err
	}
	c, err := x509.ParseCertificate(der)
	if err != nil {
		return nil, fmt.Errorf("parsing X.509 impossible : %v", err)
	}

	res := &certResult{
		Subject:    c.Subject.String(),
		Issuer:     c.Issuer.String(),
		Serial:     c.SerialNumber.Text(16),
		NotBefore:  c.NotBefore.UTC().Format(time.RFC3339),
		NotAfter:   c.NotAfter.UTC().Format(time.RFC3339),
		IsCA:       c.IsCA,
		SelfSigned: c.Subject.String() == c.Issuer.String(),
		SigAlg:     c.SignatureAlgorithm.String(),
	}
	res.DaysLeft = int(time.Until(c.NotAfter).Hours() / 24)
	res.KeyType = keyTypeString(c)
	res.SANs = collectSANs(c)
	res.KeyUsage = keyUsageStrings(c.KeyUsage)
	res.ExtKeyUsage = extKeyUsageStrings(c.ExtKeyUsage)

	s256 := sha256.Sum256(der)
	s1 := sha1.Sum(der)
	res.FingerSHA256 = colonHex(s256[:])
	res.FingerSHA1 = colonHex(s1[:])

	res.Findings = certFindings(c, res)
	return res, nil
}

// decodeCert accepts PEM, raw base64 DER, or hex DER.
func decodeCert(in string) ([]byte, error) {
	if in == "" {
		return nil, errors.New("aucun certificat fourni")
	}
	if blk, _ := pem.Decode([]byte(in)); blk != nil {
		return blk.Bytes, nil
	}
	compact := strings.Join(strings.Fields(in), "")
	if b, err := base64.StdEncoding.DecodeString(compact); err == nil && len(b) > 0 {
		return b, nil
	}
	if b, err := hex.DecodeString(compact); err == nil && len(b) > 0 {
		return b, nil
	}
	return nil, errors.New("format non reconnu : colle un certificat PEM (-----BEGIN CERTIFICATE-----), du DER en base64 ou en hexadécimal")
}

func keyTypeString(c *x509.Certificate) string {
	switch pk := c.PublicKey.(type) {
	case *rsa.PublicKey:
		return fmt.Sprintf("RSA %d bits", pk.N.BitLen())
	case *ecdsa.PublicKey:
		return "ECDSA " + pk.Curve.Params().Name
	case ed25519.PublicKey:
		return "Ed25519"
	default:
		return c.PublicKeyAlgorithm.String()
	}
}

func collectSANs(c *x509.Certificate) []string {
	var out []string
	for _, d := range c.DNSNames {
		out = append(out, "DNS:"+d)
	}
	for _, ip := range c.IPAddresses {
		out = append(out, "IP:"+ip.String())
	}
	for _, e := range c.EmailAddresses {
		out = append(out, "email:"+e)
	}
	for _, u := range c.URIs {
		out = append(out, "URI:"+u.String())
	}
	return out
}

func keyUsageStrings(u x509.KeyUsage) []string {
	names := []struct {
		bit  x509.KeyUsage
		name string
	}{
		{x509.KeyUsageDigitalSignature, "Signature numérique"},
		{x509.KeyUsageContentCommitment, "Non-répudiation"},
		{x509.KeyUsageKeyEncipherment, "Chiffrement de clé"},
		{x509.KeyUsageDataEncipherment, "Chiffrement de données"},
		{x509.KeyUsageKeyAgreement, "Accord de clé"},
		{x509.KeyUsageCertSign, "Signature de certificats"},
		{x509.KeyUsageCRLSign, "Signature de CRL"},
	}
	var out []string
	for _, n := range names {
		if u&n.bit != 0 {
			out = append(out, n.name)
		}
	}
	return out
}

func extKeyUsageStrings(us []x509.ExtKeyUsage) []string {
	m := map[x509.ExtKeyUsage]string{
		x509.ExtKeyUsageServerAuth:      "Serveur TLS",
		x509.ExtKeyUsageClientAuth:      "Client TLS",
		x509.ExtKeyUsageCodeSigning:     "Signature de code",
		x509.ExtKeyUsageEmailProtection: "Protection e-mail",
		x509.ExtKeyUsageTimeStamping:    "Horodatage",
		x509.ExtKeyUsageOCSPSigning:     "Signature OCSP",
	}
	var out []string
	for _, u := range us {
		if s, ok := m[u]; ok {
			out = append(out, s)
		}
	}
	return out
}

func certFindings(c *x509.Certificate, r *certResult) []finding {
	var f []finding
	now := time.Now()
	switch {
	case now.After(c.NotAfter):
		f = append(f, finding{"crit", "Certificat expiré", "A expiré le " + r.NotAfter + "."})
	case now.Before(c.NotBefore):
		f = append(f, finding{"warn", "Pas encore valide", "Valide seulement à partir du " + r.NotBefore + "."})
	case r.DaysLeft < 30:
		f = append(f, finding{"warn", "Expiration proche", fmt.Sprintf("Expire dans %d jours.", r.DaysLeft)})
	default:
		f = append(f, finding{"ok", "Période de validité OK", fmt.Sprintf("Encore %d jours.", r.DaysLeft)})
	}

	if pk, ok := c.PublicKey.(*rsa.PublicKey); ok && pk.N.BitLen() < 2048 {
		f = append(f, finding{"crit", "Clé RSA faible", fmt.Sprintf("RSA %d bits : en dessous du minimum recommandé de 2048 bits.", pk.N.BitLen())})
	}

	sig := strings.ToUpper(c.SignatureAlgorithm.String())
	if strings.Contains(sig, "SHA1") || strings.Contains(sig, "MD5") {
		f = append(f, finding{"crit", "Signature faible", c.SignatureAlgorithm.String() + " : algorithme de hachage obsolète (collisions)."})
	}

	if r.SelfSigned {
		f = append(f, finding{"info", "Auto-signé", "Le sujet et l'émetteur sont identiques (racine ou certificat de test)."})
	}

	// TLS server certs should not exceed 398 days of validity (CA/B Forum).
	if !c.IsCA {
		if days := int(c.NotAfter.Sub(c.NotBefore).Hours() / 24); days > 398 {
			f = append(f, finding{"warn", "Validité trop longue", fmt.Sprintf("%d jours : au-delà de la limite de 398 jours pour un certificat TLS public.", days)})
		}
	}

	if len(c.DNSNames) == 0 && len(c.IPAddresses) == 0 && !c.IsCA {
		f = append(f, finding{"warn", "Aucun SAN", "Pas de Subject Alternative Name : les navigateurs modernes rejettent les certificats sans SAN."})
	}

	// Surface a leaf wildcard as informational context.
	for _, d := range c.DNSNames {
		if net.ParseIP(d) == nil && strings.HasPrefix(d, "*.") {
			f = append(f, finding{"info", "Certificat générique", "Couvre " + d + " (wildcard)."})
			break
		}
	}
	return f
}

func colonHex(b []byte) string {
	parts := make([]string, len(b))
	for i, x := range b {
		parts[i] = fmt.Sprintf("%02X", x)
	}
	return strings.Join(parts, ":")
}
