package store

import (
	"strings"
	"testing"
	"testing/fstest"

	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/model"
)

func TestNewLoadsSeedData(t *testing.T) {
	s, err := New()
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	if len(s.Users) < 5 || len(s.Widgets) < 14 || len(s.Rules) == 0 || len(s.Experiments) == 0 {
		t.Fatalf("seed data looks thin: %d users, %d widgets, %d rules, %d experiments",
			len(s.Users), len(s.Widgets), len(s.Rules), len(s.Experiments))
	}
	for _, id := range []string{"u_priya", "u_arjun", "u_meera", "u_rahul", "anon"} {
		if s.User(id).ID != id {
			t.Fatalf("missing demo user %s", id)
		}
	}
	if s.User("who?").ID != AnonUserID {
		t.Fatal("unknown user must fall back to anon")
	}
	if s.Layout("nope").ID == "" || s.Theme("nope").ID == "" {
		t.Fatal("unknown layout/theme must fall back to the first entry")
	}
}

func TestFlagResolution(t *testing.T) {
	s := &Store{Flags: map[string]model.Flag{
		"global_on":  {Enabled: true},
		"global_off": {Enabled: false},
		"premium":    {Enabled: true, Segments: []string{"premium", "loyal"}},
	}}
	premium := model.User{Segment: "premium"}
	newbie := model.User{Segment: "new"}

	cases := []struct {
		flag string
		user model.User
		want bool
	}{
		{"global_on", newbie, true},
		{"global_off", premium, false},
		{"premium", premium, true},
		{"premium", newbie, false},
		{"undefined", premium, false},
	}
	for _, tc := range cases {
		if got := s.FlagEnabled(tc.flag, tc.user); got != tc.want {
			t.Fatalf("FlagEnabled(%q, %q) = %v, want %v", tc.flag, tc.user.Segment, got, tc.want)
		}
	}
}

func TestLoadRejectsBadSeedData(t *testing.T) {
	base := func() fstest.MapFS {
		return fstest.MapFS{
			"themes.json":      {Data: []byte(`[{"id":"t","name":"T","radius":8,"spacing":8}]`)},
			"layouts.json":     {Data: []byte(`[{"id":"l","name":"L","theme":"t","sections":[{"id":"s","layout":"vertical","title":null}]}]`)},
			"users.json":       {Data: []byte(`[{"id":"anon","name":"Guest","layout":"l","theme":"t"}]`)},
			"rules.json":       {Data: []byte(`[]`)},
			"experiments.json": {Data: []byte(`[]`)},
			"flags.json":       {Data: []byte(`{}`)},
			"widgets.json":     {Data: []byte(`[]`)},
		}
	}

	t.Run("unknown widget type", func(t *testing.T) {
		fsys := base()
		fsys["widgets.json"] = &fstest.MapFile{Data: []byte(
			`[{"id":"w","type":"teleporter","section":"s","priority":1,"size":"1x1","data":{"title":"x"}}]`)}
		if _, err := Load(fsys); err == nil || !strings.Contains(err.Error(), "unknown type") {
			t.Fatalf("err = %v, want unknown type", err)
		}
	})

	t.Run("undeclared section", func(t *testing.T) {
		fsys := base()
		fsys["widgets.json"] = &fstest.MapFile{Data: []byte(
			`[{"id":"w","type":"fd","section":"sec_ghost","priority":1,"size":"1x1","data":{"title":"x"}}]`)}
		if _, err := Load(fsys); err == nil || !strings.Contains(err.Error(), "not declared") {
			t.Fatalf("err = %v, want undeclared section", err)
		}
	})

	t.Run("incomplete widget registry", func(t *testing.T) {
		if _, err := Load(base()); err == nil || !strings.Contains(err.Error(), "missing type") {
			t.Fatalf("err = %v, want missing widget type", err)
		}
	})

	t.Run("missing anon user", func(t *testing.T) {
		fsys := base()
		fsys["users.json"] = &fstest.MapFile{Data: []byte(`[{"id":"u","name":"U"}]`)}
		if _, err := Load(fsys); err == nil {
			t.Fatal("missing anon user must fail validation")
		}
	})

	t.Run("malformed json", func(t *testing.T) {
		fsys := base()
		fsys["rules.json"] = &fstest.MapFile{Data: []byte(`[`)}
		if _, err := Load(fsys); err == nil || !strings.Contains(err.Error(), "parse rules.json") {
			t.Fatalf("err = %v, want parse error", err)
		}
	})
}
