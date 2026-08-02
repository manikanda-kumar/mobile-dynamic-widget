// Package rules implements the data-driven personalization rules engine.
//
// A rule targets widgets (by type, type list, or exact id), carries a set of
// AND-ed conditions over the flattened user profile, and applies one effect:
// show, hide, boost, penalize or pin — optionally routing the widget into a
// different section.
package rules

import (
	"fmt"
	"strings"

	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/model"
)

// Result is the aggregate outcome of evaluating every rule against one widget.
type Result struct {
	Visible bool     // final visibility after show/hide rules (last one wins)
	Delta   float64  // sum of boost (+) and penalize (-) effects
	Section string   // section the widget lands in, possibly re-routed
	Pinned  bool     // pinned widgets sort above everything else in the section
	Applied []string // ids of rules that matched, in evaluation order
}

// Apply evaluates rs against the profile for one widget definition.
//
// Rules are evaluated in file order. For visibility, the last matching
// show/hide rule wins — this makes rule ordering in data/rules.json the single
// place that resolves show-vs-hide conflicts.
func Apply(rs []model.Rule, profile map[string]any, w model.WidgetDef) Result {
	res := Result{
		Visible: w.VisibleByDefault(),
		Section: w.Section,
		Applied: []string{},
	}
	for _, r := range rs {
		if !targets(r, w) || !MatchesAll(r.When, profile) {
			continue
		}
		res.Applied = append(res.Applied, r.ID)
		switch r.Effect.Action {
		case model.ActionShow:
			res.Visible = true
		case model.ActionHide:
			res.Visible = false
		case model.ActionBoost:
			res.Delta += r.Effect.Value
		case model.ActionPenalize:
			res.Delta -= r.Effect.Value
		case model.ActionPin:
			res.Pinned = true
		}
		if r.Effect.Section != "" {
			res.Section = r.Effect.Section
		}
	}
	return res
}

// targets reports whether the rule applies to this widget at all.
func targets(r model.Rule, w model.WidgetDef) bool {
	if r.WidgetID != "" && r.WidgetID != w.ID {
		return false
	}
	if r.WidgetType != "" && r.WidgetType != "*" && r.WidgetType != w.Type {
		return false
	}
	if len(r.WidgetTypes) > 0 {
		found := false
		for _, t := range r.WidgetTypes {
			if t == w.Type {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

// MatchesAll reports whether every condition holds (AND). No conditions => true.
func MatchesAll(conds []model.Condition, profile map[string]any) bool {
	for _, c := range conds {
		if !Match(c, profile) {
			return false
		}
	}
	return true
}

// Match evaluates a single condition against the flattened profile.
func Match(c model.Condition, profile map[string]any) bool {
	actual, present := Lookup(profile, c.Field)

	switch c.Op {
	case model.OpExists:
		want := true
		if b, ok := c.Value.(bool); ok {
			want = b
		}
		return (present && actual != nil) == want
	case model.OpEq:
		return present && equal(actual, c.Value)
	case model.OpNeq:
		return !present || !equal(actual, c.Value)
	case model.OpIn:
		return present && inList(actual, c.Value)
	case model.OpNin:
		return !present || !inList(actual, c.Value)
	case model.OpGt, model.OpGte, model.OpLt, model.OpLte:
		if !present {
			return false
		}
		a, okA := toFloat(actual)
		b, okB := toFloat(c.Value)
		if !okA || !okB {
			return false
		}
		switch c.Op {
		case model.OpGt:
			return a > b
		case model.OpGte:
			return a >= b
		case model.OpLt:
			return a < b
		default:
			return a <= b
		}
	case model.OpContains:
		return present && contains(actual, c.Value)
	default:
		return false
	}
}

// Lookup resolves a possibly dotted field path, e.g. "mlScores.loan_offer".
func Lookup(profile map[string]any, field string) (any, bool) {
	if field == "" {
		return nil, false
	}
	var cur any = profile
	for _, part := range strings.Split(field, ".") {
		m, ok := cur.(map[string]any)
		if !ok {
			return nil, false
		}
		cur, ok = m[part]
		if !ok {
			return nil, false
		}
	}
	return cur, true
}

// equal compares loosely: numerics numerically, bools as bools, everything else
// by string form. JSON gives us float64/bool/string, so this stays predictable.
func equal(a, b any) bool {
	if ab, ok := a.(bool); ok {
		bb, ok2 := b.(bool)
		return ok2 && ab == bb
	}
	if af, ok := toFloat(a); ok {
		if bf, ok2 := toFloat(b); ok2 {
			return af == bf
		}
		return false
	}
	return fmt.Sprint(a) == fmt.Sprint(b)
}

// inList reports whether actual is a member of the rule's list value. When
// actual is itself a list (e.g. productsOwned), any overlap counts.
func inList(actual, value any) bool {
	list, ok := asSlice(value)
	if !ok {
		// Degrade to equality so a scalar "value" still behaves sanely.
		return equal(actual, value)
	}
	if actuals, ok := asSlice(actual); ok {
		for _, a := range actuals {
			for _, v := range list {
				if equal(a, v) {
					return true
				}
			}
		}
		return false
	}
	for _, v := range list {
		if equal(actual, v) {
			return true
		}
	}
	return false
}

// contains reports slice membership, or substring containment for strings.
func contains(actual, value any) bool {
	if items, ok := asSlice(actual); ok {
		for _, it := range items {
			if equal(it, value) {
				return true
			}
		}
		return false
	}
	if s, ok := actual.(string); ok {
		return strings.Contains(s, fmt.Sprint(value))
	}
	if m, ok := actual.(map[string]any); ok {
		_, found := m[fmt.Sprint(value)]
		return found
	}
	return false
}

func asSlice(v any) ([]any, bool) {
	switch t := v.(type) {
	case []any:
		return t, true
	case []string:
		out := make([]any, len(t))
		for i, s := range t {
			out[i] = s
		}
		return out, true
	default:
		return nil, false
	}
}

func toFloat(v any) (float64, bool) {
	switch t := v.(type) {
	case float64:
		return t, true
	case float32:
		return float64(t), true
	case int:
		return float64(t), true
	case int64:
		return float64(t), true
	default:
		return 0, false
	}
}
