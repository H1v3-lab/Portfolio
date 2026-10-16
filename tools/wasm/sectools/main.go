// sectools — a small offensive/defensive crypto toolkit compiled to WebAssembly.
//
// Everything runs 100% client-side in the visitor's browser: no token, certificate
// or secret ever leaves the page. The Go standard library does the real work
// (crypto/x509, crypto/rsa, crypto/ecdsa, crypto/ed25519, crypto/hmac, crypto/sha*),
// so the module has zero third-party dependencies.
//
// Build:  GOOS=js GOARCH=wasm go build -o ../../../assets/wasm/sectools.wasm .
//
// The JS side (assets/js/labo.js) calls three functions exported on globalThis:
//   sectoolsJWT(token, secret?)  -> JSON string
//   sectoolsCert(pemOrDer)       -> JSON string
//   sectoolsHash(input, mode)    -> JSON string
package main

import (
	"encoding/json"
	"syscall/js"
)

// finding is one observation the tools surface to the UI.
type finding struct {
	Level  string `json:"level"` // "crit" | "warn" | "ok" | "info"
	Title  string `json:"title"`
	Detail string `json:"detail"`
}

// wrap turns a Go analyzer (value + error) into the JSON string the browser expects.
func wrap(v any, err error) string {
	if err != nil {
		b, _ := json.Marshal(map[string]string{"error": err.Error()})
		return string(b)
	}
	b, e := json.Marshal(v)
	if e != nil {
		return `{"error":"internal serialization error"}`
	}
	return string(b)
}

func arg(args []js.Value, i int) string {
	if i < len(args) && args[i].Type() == js.TypeString {
		return args[i].String()
	}
	return ""
}

func jwtFn(_ js.Value, args []js.Value) any  { return wrap(analyzeJWT(arg(args, 0), arg(args, 1))) }
func certFn(_ js.Value, args []js.Value) any { return wrap(analyzeCert(arg(args, 0))) }
func hashFn(_ js.Value, args []js.Value) any { return wrap(analyzeHash(arg(args, 0), arg(args, 1))) }

func main() {
	js.Global().Set("sectoolsJWT", js.FuncOf(jwtFn))
	js.Global().Set("sectoolsCert", js.FuncOf(certFn))
	js.Global().Set("sectoolsHash", js.FuncOf(hashFn))
	if ready := js.Global().Get("__sectoolsReady"); ready.Type() == js.TypeFunction {
		ready.Invoke()
	}
	select {} // keep the Go runtime alive so the exported funcs stay callable
}
