// Package data embeds the DXP seed corpus so the binary is self-contained.
package data

import "embed"

// FS holds widgets, layouts, themes, rules, experiments, flags and demo users.
//
//go:embed *.json
var FS embed.FS
