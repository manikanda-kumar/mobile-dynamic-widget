package manifest

import (
	"testing"
	"testing/fstest"
	"time"

	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/model"
	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/store"
)

// ---------------------------------------------------------------------------
// Synthetic fixture: a minimal but complete seed set exercising ordering, flags,
// rule routing, pinning and experiment effects in isolation from the demo data.
// ---------------------------------------------------------------------------

const fixtureThemes = `[{"id":"t_test","name":"Test","colors":{"background":"#000","surface":"#111","surfaceAlt":"#222","primary":"#333","onPrimary":"#fff","text":"#fff","textMuted":"#aaa","border":"#444","success":"#0f0","warning":"#ff0","danger":"#f00"},"radius":8,"spacing":8}]`

const fixtureLayouts = `[{"id":"l_test","name":"Test","theme":"t_test","sections":[
  {"id":"sec_hero","layout":"banner","title":null},
  {"id":"sec_main","layout":"vertical","title":"Main"},
  {"id":"sec_grid","layout":"grid","title":"Grid"},
  {"id":"sec_grid3","layout":"grid","title":"Grid3","columns":3},
  {"id":"sec_empty","layout":"carousel","title":"Empty"}
]}]`

const fixtureUsers = `[
 {"id":"anon","name":"Guest","segment":"guest","kycStatus":"none","layout":"l_test","theme":"t_test","mlScores":{}},
 {"id":"u_test","name":"Test","segment":"premium","kycStatus":"verified","riskBand":"low","productsOwned":["fd"],
  "recentActivity":["upi_payment"],"mlScores":{"loan_offer":0.5,"fd":0.25},"layout":"l_test","theme":"t_test"}
]`

// Base priorities are chosen so the pre-rule order (a=10, b=20, c=30) differs
// from the expected post-rule order, proving ranking actually happens.
const fixtureWidgets = `[
 {"id":"w_a","type":"loan_offer","section":"sec_main","priority":10,"size":"2x1","data":{"title":"A"},"analytics":{"impressionKey":"a"}},
 {"id":"w_b","type":"fd","section":"sec_main","priority":20,"size":"2x1","data":{"title":"B"},"analytics":{"impressionKey":"b"}},
 {"id":"w_c","type":"payments","section":"sec_main","priority":30,"size":"1x1","data":{"title":"C"},"analytics":{"impressionKey":"c"}},
 {"id":"w_tie_z","type":"rewards","section":"sec_grid","priority":50,"size":"1x1","data":{"title":"Z"},"analytics":{"impressionKey":"z"}},
 {"id":"w_tie_a","type":"cashback","section":"sec_grid","priority":50,"size":"1x1","data":{"title":"A"},"analytics":{"impressionKey":"tie_a"}},
 {"id":"w_pin","type":"kyc","section":"sec_main","priority":1,"size":"2x1","data":{"title":"Pinned"},"analytics":{"impressionKey":"pin"}},
 {"id":"w_flagged","type":"vkyc","section":"sec_grid3","priority":40,"size":"1x1","flag":"f_on","data":{"title":"Flagged on"},"analytics":{"impressionKey":"f_on"}},
 {"id":"w_flagged_off","type":"pledge","section":"sec_grid3","priority":41,"size":"1x1","flag":"f_off","data":{"title":"Flagged off"},"analytics":{"impressionKey":"f_off"}},
 {"id":"w_flag_missing","type":"investments","section":"sec_grid3","priority":42,"size":"1x1","flag":"f_undefined","data":{"title":"Unknown flag"},"analytics":{"impressionKey":"f_undef"}},
 {"id":"w_hidden","type":"birthday","section":"sec_empty","priority":90,"size":"3x1","defaultVisible":false,"data":{"title":"Hidden"},"analytics":{"impressionKey":"hidden"}},
 {"id":"w_anniv","type":"anniversary","section":"sec_empty","priority":5,"size":"3x1","defaultVisible":false,"data":{"title":"Anniv"},"analytics":{"impressionKey":"anniv"}},
 {"id":"w_email","type":"email_verification","section":"sec_grid","priority":6,"size":"1x1","data":{"title":"Email"},"analytics":{"impressionKey":"email"}},
 {"id":"w_mobile","type":"mobile_verification","section":"sec_grid","priority":7,"size":"1x1","data":{"title":"Mobile"},"analytics":{"impressionKey":"mobile"}},
 {"id":"w_card","type":"credit_card_offer","section":"sec_grid","priority":8,"size":"1x1","data":{"title":"Card"},"analytics":{"impressionKey":"card"}}
]`

const fixtureRules = `[
 {"id":"r_boost_a","widgetType":"loan_offer","when":[{"field":"segment","op":"eq","value":"premium"}],"effect":{"action":"boost","value":45}},
 {"id":"r_penalize_c","widgetType":"payments","when":[],"effect":{"action":"penalize","value":25}},
 {"id":"r_pin_kyc","widgetType":"kyc","when":[],"effect":{"action":"pin"}},
 {"id":"r_route_anniv","widgetType":"anniversary","when":[],"effect":{"action":"show","section":"sec_hero"}}
]`

const fixtureFlags = `{"f_on":{"enabled":true,"segments":[]},"f_off":{"enabled":false,"segments":[]},"f_segment":{"enabled":true,"segments":["premium"]}}`

const fixtureExperiments = `[
 {"id":"exp_test","name":"Test","enabled":true,"targets":["loan_offer"],
  "variants":[{"id":"only","weight":100,"effects":[{"widgetType":"loan_offer","boost":5}]}]},
 {"id":"exp_off","name":"Off","enabled":false,"targets":["fd"],
  "variants":[{"id":"A","weight":100,"effects":[{"widgetType":"fd","hide":true}]}]}
]`

func fixtureStore(t *testing.T) *store.Store {
	t.Helper()
	fsys := fstest.MapFS{
		"themes.json":      {Data: []byte(fixtureThemes)},
		"layouts.json":     {Data: []byte(fixtureLayouts)},
		"users.json":       {Data: []byte(fixtureUsers)},
		"widgets.json":     {Data: []byte(fixtureWidgets)},
		"rules.json":       {Data: []byte(fixtureRules)},
		"flags.json":       {Data: []byte(fixtureFlags)},
		"experiments.json": {Data: []byte(fixtureExperiments)},
	}
	s, err := store.Load(fsys)
	if err != nil {
		t.Fatalf("load fixture store: %v", err)
	}
	return s
}

func sectionByID(m model.Manifest, id string) *model.Section {
	for i := range m.Sections {
		if m.Sections[i].ID == id {
			return &m.Sections[i]
		}
	}
	return nil
}

func widgetIDs(sec *model.Section) []string {
	if sec == nil {
		return nil
	}
	out := make([]string, 0, len(sec.Widgets))
	for _, w := range sec.Widgets {
		out = append(out, w.ID)
	}
	return out
}

func equalStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// ---------------------------------------------------------------------------

func TestAssemblyOrdersByFinalPriority(t *testing.T) {
	s := fixtureStore(t)
	m := Build(s, Options{UserID: "u_test", Now: time.Unix(0, 0)})

	main := sectionByID(m, "sec_main")
	if main == nil {
		t.Fatal("sec_main missing")
	}
	// w_pin is pinned (base 1) so it leads despite the lowest base priority.
	// w_a: 10 base + 10 ml (0.5*20) + 45 rule + 5 experiment = 70
	// w_b: 20 base + 5 ml                                    = 25
	// w_c: 30 base - 25 rule                                 = 5
	want := []string{"w_pin", "w_a", "w_b", "w_c"}
	if got := widgetIDs(main); !equalStrings(got, want) {
		t.Fatalf("sec_main order = %v, want %v", got, want)
	}
	if main.Widgets[1].Priority != 70 {
		t.Fatalf("w_a priority = %d, want 70", main.Widgets[1].Priority)
	}
	if main.Widgets[2].Priority != 25 {
		t.Fatalf("w_b priority = %d, want 25", main.Widgets[2].Priority)
	}
	if main.Widgets[3].Priority != 5 {
		t.Fatalf("w_c priority = %d, want 5", main.Widgets[3].Priority)
	}
}

func TestAssemblyTiesBreakOnWidgetID(t *testing.T) {
	s := fixtureStore(t)
	m := Build(s, Options{UserID: "u_test"})

	grid := sectionByID(m, "sec_grid")
	if grid == nil {
		t.Fatal("sec_grid missing")
	}
	// w_tie_a and w_tie_z both land on 50; ascending id must decide.
	got := widgetIDs(grid)
	if len(got) < 2 || got[0] != "w_tie_a" || got[1] != "w_tie_z" {
		t.Fatalf("tie order = %v, want w_tie_a before w_tie_z", got)
	}
}

func TestSectionsFollowLayoutOrderAndDropEmpties(t *testing.T) {
	s := fixtureStore(t)
	m := Build(s, Options{UserID: "u_test"})

	want := []string{"sec_hero", "sec_main", "sec_grid", "sec_grid3"}
	got := make([]string, 0, len(m.Sections))
	for _, sec := range m.Sections {
		got = append(got, sec.ID)
	}
	if !equalStrings(got, want) {
		t.Fatalf("section order = %v, want %v (sec_empty must be dropped)", got, want)
	}
	// sec_hero is populated only because a rule routed w_anniv into it.
	if ids := widgetIDs(sectionByID(m, "sec_hero")); !equalStrings(ids, []string{"w_anniv"}) {
		t.Fatalf("sec_hero = %v, want [w_anniv] via rule section routing", ids)
	}
}

func TestGridColumnsDefaultToTwo(t *testing.T) {
	s := fixtureStore(t)
	m := Build(s, Options{UserID: "u_test"})

	grid := sectionByID(m, "sec_grid")
	if grid.Columns == nil || *grid.Columns != 2 {
		t.Fatalf("sec_grid columns = %v, want 2", grid.Columns)
	}
	grid3 := sectionByID(m, "sec_grid3")
	if grid3.Columns == nil || *grid3.Columns != 3 {
		t.Fatalf("sec_grid3 columns = %v, want 3", grid3.Columns)
	}
	if sectionByID(m, "sec_main").Columns != nil {
		t.Fatal("non-grid sections must not carry columns")
	}
}

func TestFlagsGateWidgets(t *testing.T) {
	s := fixtureStore(t)
	m := Build(s, Options{UserID: "u_test"})

	ids := widgetIDs(sectionByID(m, "sec_grid3"))
	if !equalStrings(ids, []string{"w_flagged"}) {
		t.Fatalf("sec_grid3 = %v, want only w_flagged (disabled and unknown flags drop)", ids)
	}
}

func TestDefaultHiddenWidgetsStayOut(t *testing.T) {
	s := fixtureStore(t)
	m := Build(s, Options{UserID: "u_test"})

	for _, sec := range m.Sections {
		for _, w := range sec.Widgets {
			if w.ID == "w_hidden" {
				t.Fatal("defaultVisible=false widget appeared without a show rule")
			}
		}
	}
}

func TestDebugOnlyWhenRequested(t *testing.T) {
	s := fixtureStore(t)

	plain := Build(s, Options{UserID: "u_test"})
	for _, sec := range plain.Sections {
		for _, w := range sec.Widgets {
			if w.Debug != nil {
				t.Fatalf("widget %s carried debug without ?debug=1", w.ID)
			}
		}
	}

	dbg := Build(s, Options{UserID: "u_test", Debug: true})
	main := sectionByID(dbg, "sec_main")
	var wa model.Widget
	for _, w := range main.Widgets {
		if w.ID == "w_a" {
			wa = w
		}
	}
	if wa.Debug == nil {
		t.Fatal("w_a missing debug object")
	}
	if wa.Debug.BasePriority != 10 || wa.Debug.MLBoost != 10 || wa.Debug.RuleDelta != 45 ||
		wa.Debug.ExperimentBoost != 5 || wa.Debug.FinalPriority != 70 {
		t.Fatalf("debug breakdown = %+v", *wa.Debug)
	}
	if len(wa.Debug.AppliedRules) != 1 || wa.Debug.AppliedRules[0] != "r_boost_a" {
		t.Fatalf("appliedRules = %v, want [r_boost_a]", wa.Debug.AppliedRules)
	}
}

func TestExperimentTaggingAndDisabledExperiments(t *testing.T) {
	s := fixtureStore(t)
	m := Build(s, Options{UserID: "u_test"})

	if len(m.Experiments) != 1 || m.Experiments[0].ID != "exp_test" {
		t.Fatalf("experiments = %+v, want only exp_test", m.Experiments)
	}
	if m.Experiments[0].Bucket < 0 || m.Experiments[0].Bucket > 99 {
		t.Fatalf("bucket %d out of range", m.Experiments[0].Bucket)
	}

	main := sectionByID(m, "sec_main")
	for _, w := range main.Widgets {
		switch w.Type {
		case "loan_offer":
			if w.Analytics.ExperimentID == nil || *w.Analytics.ExperimentID != "exp_test" {
				t.Fatalf("loan_offer must be tagged with exp_test, got %v", w.Analytics.ExperimentID)
			}
		case "fd":
			// exp_off is disabled: its hide effect must not apply and it must not tag.
			if w.Analytics.ExperimentID != nil {
				t.Fatalf("fd tagged by a disabled experiment: %v", *w.Analytics.ExperimentID)
			}
		}
	}
}

func TestUnknownUserFallsBackToAnon(t *testing.T) {
	s := fixtureStore(t)
	for _, id := range []string{"", "does_not_exist"} {
		m := Build(s, Options{UserID: id})
		if m.UserID != "anon" {
			t.Fatalf("userId %q resolved to %q, want anon", id, m.UserID)
		}
	}
}

func TestManifestEnvelope(t *testing.T) {
	s := fixtureStore(t)
	at := time.Date(2026, 8, 3, 10, 0, 0, 0, time.UTC)
	m := Build(s, Options{UserID: "u_test", Now: at})

	if m.Version != Version {
		t.Fatalf("version = %d, want %d", m.Version, Version)
	}
	if m.GeneratedAt != "2026-08-03T10:00:00Z" {
		t.Fatalf("generatedAt = %q", m.GeneratedAt)
	}
	if m.Layout != "l_test" || m.Theme.ID != "t_test" {
		t.Fatalf("layout/theme = %q/%q", m.Layout, m.Theme.ID)
	}
}

func TestLayoutOverride(t *testing.T) {
	s := fixtureStore(t)
	if m := Build(s, Options{UserID: "u_test", Layout: "l_test"}); m.Layout != "l_test" {
		t.Fatalf("layout override = %q", m.Layout)
	}
	// Unknown layouts must fall back to the user's own layout, not error.
	if m := Build(s, Options{UserID: "u_test", Layout: "l_nope"}); m.Layout != "l_test" {
		t.Fatalf("unknown layout override = %q, want l_test", m.Layout)
	}
}

func TestDemoUnknownInjectsUnrenderableWidget(t *testing.T) {
	s := fixtureStore(t)

	normal := Build(s, Options{UserID: "u_test"})
	for _, sec := range normal.Sections {
		for _, w := range sec.Widgets {
			if w.ID == "w_demo_unknown_type" {
				t.Fatal("unknown-type widget leaked into a normal manifest")
			}
		}
	}

	demo := Build(s, Options{UserID: "u_test", Demo: "unknown"})
	found := false
	for _, sec := range demo.Sections {
		for _, w := range sec.Widgets {
			if w.ID == "w_demo_unknown_type" {
				found = true
				for _, known := range model.WidgetTypes {
					if w.Type == known {
						t.Fatalf("demo widget type %q must not be in the registry", w.Type)
					}
				}
			}
		}
	}
	if !found {
		t.Fatal("?demo=unknown did not inject the graceful-degradation widget")
	}
}

// ---------------------------------------------------------------------------
// Real seed data
// ---------------------------------------------------------------------------

func seedStore(t *testing.T) *store.Store {
	t.Helper()
	s, err := store.New()
	if err != nil {
		t.Fatalf("load seed data: %v", err)
	}
	return s
}

func TestSeedUsersProduceDistinctHomeScreens(t *testing.T) {
	s := seedStore(t)
	users := []string{"u_priya", "u_arjun", "u_meera", "u_rahul", "anon"}

	signatures := map[string]string{}
	for _, id := range users {
		m := Build(s, Options{UserID: id})
		if len(m.Sections) == 0 {
			t.Fatalf("%s got an empty manifest", id)
		}
		sig := ""
		for _, sec := range m.Sections {
			sig += sec.ID + ":"
			for _, w := range sec.Widgets {
				sig += w.ID + ","
			}
			sig += "|"
		}
		for other, otherSig := range signatures {
			if otherSig == sig {
				t.Fatalf("%s and %s produce identical home screens", id, other)
			}
		}
		signatures[id] = sig
	}
}

func TestSeedUserStories(t *testing.T) {
	s := seedStore(t)

	types := func(id string) map[string]int {
		m := Build(s, Options{UserID: id})
		out := map[string]int{}
		for _, sec := range m.Sections {
			for _, w := range sec.Widgets {
				out[w.Type]++
			}
		}
		return out
	}

	priya := types("u_priya")
	for _, nag := range []string{"kyc", "vkyc", "email_verification", "mobile_verification"} {
		if priya[nag] > 0 {
			t.Fatalf("verified premium user should not see %s", nag)
		}
	}
	if priya["investments"] == 0 || priya["rewards"] == 0 || priya["loan_offer"] == 0 {
		t.Fatalf("priya missing investments/rewards/loan_offer: %v", priya)
	}

	arjun := types("u_arjun")
	for _, onboarding := range []string{"kyc", "vkyc", "email_verification", "mobile_verification"} {
		if arjun[onboarding] == 0 {
			t.Fatalf("kyc-pending user missing %s widget: %v", onboarding, arjun)
		}
	}
	arjunManifest := Build(s, Options{UserID: "u_arjun"})
	if arjunManifest.Sections[0].ID != "sec_onboarding" {
		t.Fatalf("arjun's first section = %s, want sec_onboarding", arjunManifest.Sections[0].ID)
	}

	meera := types("u_meera")
	if meera["birthday"] == 0 {
		t.Fatalf("birthday user missing birthday widget: %v", meera)
	}
	meeraManifest := Build(s, Options{UserID: "u_meera"})
	hero := sectionByID(meeraManifest, "sec_hero")
	if hero == nil || hero.Widgets[0].Type != "birthday" {
		t.Fatalf("birthday widget must lead the hero section, got %v", widgetIDs(hero))
	}

	rahul := types("u_rahul")
	if rahul["loan_offer"] > 0 || rahul["credit_card_offer"] > 0 {
		t.Fatalf("high-risk thin-file user must not see credit offers: %v", rahul)
	}
	if rahul["fd"] == 0 || rahul["pledge"] == 0 {
		t.Fatalf("high-risk thin-file user should see fd + pledge: %v", rahul)
	}

	guest := types("anon")
	for _, personalized := range []string{"loan_offer", "credit_card_offer", "rewards", "cashback", "kyc"} {
		if guest[personalized] > 0 {
			t.Fatalf("guest must not see personalized widget %s: %v", personalized, guest)
		}
	}
	if len(guest) == 0 {
		t.Fatal("guest manifest is empty; expected a generic screen")
	}
}

func TestSeedRegistryCoversEveryWidgetType(t *testing.T) {
	s := seedStore(t)
	seen := map[string]bool{}
	for _, w := range s.Widgets {
		seen[w.Type] = true
	}
	for _, typ := range model.WidgetTypes {
		if !seen[typ] {
			t.Fatalf("widgets.json is missing type %q", typ)
		}
	}
}

func TestSeedManifestsAreStableAcrossCalls(t *testing.T) {
	s := seedStore(t)
	for _, id := range []string{"u_priya", "u_arjun", "u_meera", "u_rahul", "anon"} {
		at := time.Unix(0, 0)
		a := Build(s, Options{UserID: id, Now: at})
		b := Build(s, Options{UserID: id, Now: at})
		if len(a.Sections) != len(b.Sections) {
			t.Fatalf("%s: section count drifted", id)
		}
		for i := range a.Sections {
			if !equalStrings(widgetIDs(&a.Sections[i]), widgetIDs(&b.Sections[i])) {
				t.Fatalf("%s: section %s order is not deterministic", id, a.Sections[i].ID)
			}
		}
	}
}
