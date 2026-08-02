package rules

import (
	"testing"

	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/model"
)

func testProfile() map[string]any {
	return map[string]any{
		"segment":        "premium",
		"kycStatus":      "verified",
		"emailVerified":  true,
		"mobileVerified": false,
		"riskBand":       "low",
		"geo":            "Mumbai",
		"productsOwned":  []any{"savings", "investments", "credit_card"},
		"recentActivity": []any{"upi_payment", "sip_installment"},
		"mlScores":       map[string]any{"loan_offer": 0.86, "pledge": 0.18},
		"tenureMonths":   float64(54),
		"creditScore":    float64(812),
	}
}

func TestMatchOperators(t *testing.T) {
	profile := testProfile()

	cases := []struct {
		name string
		cond model.Condition
		want bool
	}{
		// eq
		{"eq string hit", model.Condition{Field: "segment", Op: "eq", Value: "premium"}, true},
		{"eq string miss", model.Condition{Field: "segment", Op: "eq", Value: "new"}, false},
		{"eq bool hit", model.Condition{Field: "emailVerified", Op: "eq", Value: true}, true},
		{"eq bool miss", model.Condition{Field: "emailVerified", Op: "eq", Value: false}, false},
		{"eq number hit", model.Condition{Field: "tenureMonths", Op: "eq", Value: float64(54)}, true},
		{"eq missing field", model.Condition{Field: "nope", Op: "eq", Value: "x"}, false},

		// neq
		{"neq hit", model.Condition{Field: "kycStatus", Op: "neq", Value: "pending"}, true},
		{"neq miss", model.Condition{Field: "kycStatus", Op: "neq", Value: "verified"}, false},
		{"neq missing field is true", model.Condition{Field: "nope", Op: "neq", Value: "x"}, true},

		// in / nin
		{"in scalar hit", model.Condition{Field: "riskBand", Op: "in", Value: []any{"low", "medium"}}, true},
		{"in scalar miss", model.Condition{Field: "riskBand", Op: "in", Value: []any{"high"}}, false},
		{"in slice overlap", model.Condition{Field: "productsOwned", Op: "in", Value: []any{"fd", "investments"}}, true},
		{"in slice no overlap", model.Condition{Field: "productsOwned", Op: "in", Value: []any{"fd", "pledge"}}, false},
		{"nin hit", model.Condition{Field: "segment", Op: "nin", Value: []any{"guest", "new"}}, true},
		{"nin miss", model.Condition{Field: "segment", Op: "nin", Value: []any{"premium"}}, false},

		// numeric comparisons
		{"gt hit", model.Condition{Field: "creditScore", Op: "gt", Value: float64(750)}, true},
		{"gt miss", model.Condition{Field: "creditScore", Op: "gt", Value: float64(812)}, false},
		{"gte boundary", model.Condition{Field: "creditScore", Op: "gte", Value: float64(812)}, true},
		{"lt hit", model.Condition{Field: "tenureMonths", Op: "lt", Value: float64(60)}, true},
		{"lt miss", model.Condition{Field: "tenureMonths", Op: "lt", Value: float64(54)}, false},
		{"lte boundary", model.Condition{Field: "tenureMonths", Op: "lte", Value: float64(54)}, true},
		{"gte on nested ml score", model.Condition{Field: "mlScores.loan_offer", Op: "gte", Value: 0.7}, true},
		{"lt on nested ml score", model.Condition{Field: "mlScores.pledge", Op: "lt", Value: 0.2}, true},
		{"numeric op on string field", model.Condition{Field: "segment", Op: "gt", Value: float64(1)}, false},

		// contains
		{"contains slice hit", model.Condition{Field: "recentActivity", Op: "contains", Value: "upi_payment"}, true},
		{"contains slice miss", model.Condition{Field: "recentActivity", Op: "contains", Value: "gold_loan_enquiry"}, false},
		{"contains substring", model.Condition{Field: "geo", Op: "contains", Value: "umba"}, true},
		{"contains map key", model.Condition{Field: "mlScores", Op: "contains", Value: "loan_offer"}, true},

		// exists
		{"exists true", model.Condition{Field: "mlScores.loan_offer", Op: "exists", Value: true}, true},
		{"exists true on absent", model.Condition{Field: "mlScores.fd", Op: "exists", Value: true}, false},
		{"exists false on absent", model.Condition{Field: "mlScores.fd", Op: "exists", Value: false}, true},
		{"exists defaults to true", model.Condition{Field: "segment", Op: "exists"}, true},

		// unknown op never matches
		{"unknown op", model.Condition{Field: "segment", Op: "regex", Value: "prem.*"}, false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := Match(tc.cond, profile); got != tc.want {
				t.Fatalf("Match(%+v) = %v, want %v", tc.cond, got, tc.want)
			}
		})
	}
}

func TestMatchesAllIsAnd(t *testing.T) {
	profile := testProfile()
	all := []model.Condition{
		{Field: "segment", Op: "eq", Value: "premium"},
		{Field: "kycStatus", Op: "eq", Value: "verified"},
	}
	if !MatchesAll(all, profile) {
		t.Fatal("all conditions hold, want true")
	}
	one := append(append([]model.Condition{}, all...), model.Condition{Field: "riskBand", Op: "eq", Value: "high"})
	if MatchesAll(one, profile) {
		t.Fatal("one condition fails, want false")
	}
	if !MatchesAll(nil, profile) {
		t.Fatal("empty condition list must always match")
	}
}

func widget(id, typ, section string, prio float64, defaultVisible *bool) model.WidgetDef {
	return model.WidgetDef{ID: id, Type: typ, Section: section, Priority: prio, DefaultVisible: defaultVisible}
}

func ptrBool(b bool) *bool { return &b }

func TestApplyEffects(t *testing.T) {
	profile := testProfile()
	w := widget("w_loan", "loan_offer", "sec_offers", 80, nil)

	rs := []model.Rule{
		{ID: "r_boost", WidgetType: "loan_offer", Effect: model.Effect{Action: "boost", Value: 18}},
		{ID: "r_penalize", WidgetType: "loan_offer", Effect: model.Effect{Action: "penalize", Value: 5}},
		{ID: "r_other_type", WidgetType: "fd", Effect: model.Effect{Action: "boost", Value: 100}},
		{ID: "r_pin", WidgetID: "w_loan", Effect: model.Effect{Action: "pin", Section: "sec_hero"}},
		{ID: "r_not_matching", WidgetType: "loan_offer",
			When:   []model.Condition{{Field: "segment", Op: "eq", Value: "guest"}},
			Effect: model.Effect{Action: "hide"}},
	}

	got := Apply(rs, profile, w)
	if !got.Visible {
		t.Fatal("widget should stay visible")
	}
	if got.Delta != 13 {
		t.Fatalf("delta = %v, want 13", got.Delta)
	}
	if !got.Pinned {
		t.Fatal("widget should be pinned")
	}
	if got.Section != "sec_hero" {
		t.Fatalf("section = %q, want sec_hero", got.Section)
	}
	want := []string{"r_boost", "r_penalize", "r_pin"}
	if len(got.Applied) != len(want) {
		t.Fatalf("appliedRules = %v, want %v", got.Applied, want)
	}
	for i := range want {
		if got.Applied[i] != want[i] {
			t.Fatalf("appliedRules = %v, want %v", got.Applied, want)
		}
	}
}

func TestApplyVisibilityLastWriteWins(t *testing.T) {
	profile := testProfile()

	t.Run("hide after show", func(t *testing.T) {
		w := widget("w_kyc", "kyc", "sec_onboarding", 88, nil)
		rs := []model.Rule{
			{ID: "r_show", WidgetType: "kyc", Effect: model.Effect{Action: "show"}},
			{ID: "r_hide", WidgetType: "kyc",
				When:   []model.Condition{{Field: "kycStatus", Op: "eq", Value: "verified"}},
				Effect: model.Effect{Action: "hide"}},
		}
		if Apply(rs, profile, w).Visible {
			t.Fatal("later hide rule must win")
		}
	})

	t.Run("show reveals default-hidden widget", func(t *testing.T) {
		w := widget("w_birthday", "birthday", "sec_hero", 70, ptrBool(false))
		if Apply(nil, profile, w).Visible {
			t.Fatal("defaultVisible=false widget must start hidden")
		}
		rs := []model.Rule{{ID: "r_show", WidgetType: "birthday", Effect: model.Effect{Action: "show"}}}
		if !Apply(rs, profile, w).Visible {
			t.Fatal("show rule must reveal a default-hidden widget")
		}
	})
}

func TestApplyTargeting(t *testing.T) {
	profile := testProfile()
	w := widget("w_fd_booster", "fd", "sec_products", 72, nil)

	rs := []model.Rule{
		{ID: "r_wildcard", WidgetType: "*", Effect: model.Effect{Action: "boost", Value: 1}},
		{ID: "r_untargeted", Effect: model.Effect{Action: "boost", Value: 2}},
		{ID: "r_type_list", WidgetTypes: []string{"fd", "pledge"}, Effect: model.Effect{Action: "boost", Value: 4}},
		{ID: "r_type_list_miss", WidgetTypes: []string{"rewards"}, Effect: model.Effect{Action: "boost", Value: 8}},
		{ID: "r_id_miss", WidgetID: "w_other", Effect: model.Effect{Action: "boost", Value: 16}},
	}
	if got := Apply(rs, profile, w).Delta; got != 7 {
		t.Fatalf("delta = %v, want 7 (wildcard + untargeted + type list)", got)
	}
}

func TestLookupDottedPath(t *testing.T) {
	profile := testProfile()
	if v, ok := Lookup(profile, "mlScores.loan_offer"); !ok || v != 0.86 {
		t.Fatalf("Lookup nested = %v, %v", v, ok)
	}
	if _, ok := Lookup(profile, "mlScores.missing"); ok {
		t.Fatal("missing nested key must report not found")
	}
	if _, ok := Lookup(profile, "segment.nested"); ok {
		t.Fatal("descending into a scalar must report not found")
	}
	if _, ok := Lookup(profile, ""); ok {
		t.Fatal("empty path must report not found")
	}
}
