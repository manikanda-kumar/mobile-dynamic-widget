// Package store hydrates the in-memory DXP catalogue from the embedded seed
// JSON and answers lookups for users, widgets, layouts, themes and flags.
package store

import (
	"encoding/json"
	"fmt"
	"io/fs"

	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/data"
	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/model"
)

// AnonUserID is the fallback profile used for unknown or missing user ids.
const AnonUserID = "anon"

// Store is the read-only catalogue. It is fully populated at boot and never
// mutated afterwards, so it is safe for concurrent reads.
type Store struct {
	Users       []model.User
	usersByID   map[string]model.User
	Widgets     []model.WidgetDef
	Layouts     []model.LayoutDef
	layoutsByID map[string]model.LayoutDef
	Themes      []model.Theme
	themesByID  map[string]model.Theme
	Rules       []model.Rule
	Experiments []model.Experiment
	Flags       map[string]model.Flag
}

// New loads the store from the embedded seed data.
func New() (*Store, error) { return Load(data.FS) }

// Load hydrates a store from any filesystem exposing the seed JSON files.
func Load(fsys fs.FS) (*Store, error) {
	s := &Store{}
	if err := readJSON(fsys, "users.json", &s.Users); err != nil {
		return nil, err
	}
	if err := readJSON(fsys, "widgets.json", &s.Widgets); err != nil {
		return nil, err
	}
	if err := readJSON(fsys, "layouts.json", &s.Layouts); err != nil {
		return nil, err
	}
	if err := readJSON(fsys, "themes.json", &s.Themes); err != nil {
		return nil, err
	}
	if err := readJSON(fsys, "rules.json", &s.Rules); err != nil {
		return nil, err
	}
	if err := readJSON(fsys, "experiments.json", &s.Experiments); err != nil {
		return nil, err
	}
	if err := readJSON(fsys, "flags.json", &s.Flags); err != nil {
		return nil, err
	}

	s.usersByID = make(map[string]model.User, len(s.Users))
	for _, u := range s.Users {
		s.usersByID[u.ID] = u
	}
	s.layoutsByID = make(map[string]model.LayoutDef, len(s.Layouts))
	for _, l := range s.Layouts {
		s.layoutsByID[l.ID] = l
	}
	s.themesByID = make(map[string]model.Theme, len(s.Themes))
	for _, t := range s.Themes {
		s.themesByID[t.ID] = t
	}
	if s.Flags == nil {
		s.Flags = map[string]model.Flag{}
	}

	if err := s.validate(); err != nil {
		return nil, err
	}
	return s, nil
}

func readJSON(fsys fs.FS, name string, dst any) error {
	b, err := fs.ReadFile(fsys, name)
	if err != nil {
		return fmt.Errorf("read %s: %w", name, err)
	}
	if err := json.Unmarshal(b, dst); err != nil {
		return fmt.Errorf("parse %s: %w", name, err)
	}
	return nil
}

// validate catches seed-data drift at boot instead of at request time.
func (s *Store) validate() error {
	known := map[string]bool{}
	for _, t := range model.WidgetTypes {
		known[t] = false
	}
	sections := map[string]bool{}
	for _, l := range s.Layouts {
		for _, sec := range l.Sections {
			sections[sec.ID] = true
		}
	}
	for _, w := range s.Widgets {
		if _, ok := known[w.Type]; !ok {
			return fmt.Errorf("widget %s: unknown type %q", w.ID, w.Type)
		}
		known[w.Type] = true
		if !sections[w.Section] {
			return fmt.Errorf("widget %s: section %q is not declared by any layout", w.ID, w.Section)
		}
	}
	for t, seen := range known {
		if !seen {
			return fmt.Errorf("widget registry is missing type %q", t)
		}
	}
	if _, ok := s.usersByID[AnonUserID]; !ok {
		return fmt.Errorf("users.json must define the %q fallback user", AnonUserID)
	}
	if len(s.Themes) == 0 || len(s.Layouts) == 0 {
		return fmt.Errorf("themes.json and layouts.json must be non-empty")
	}
	return nil
}

// User resolves a user id, falling back to the anonymous profile.
func (s *Store) User(id string) model.User {
	if u, ok := s.usersByID[id]; ok {
		return u
	}
	return s.usersByID[AnonUserID]
}

// Layout resolves a layout id, falling back to the first declared layout.
func (s *Store) Layout(id string) model.LayoutDef {
	if l, ok := s.layoutsByID[id]; ok {
		return l
	}
	return s.Layouts[0]
}

// HasLayout reports whether the layout id is known.
func (s *Store) HasLayout(id string) bool {
	_, ok := s.layoutsByID[id]
	return ok
}

// Theme resolves a theme id, falling back to the first declared theme.
func (s *Store) Theme(id string) model.Theme {
	if t, ok := s.themesByID[id]; ok {
		return t
	}
	return s.Themes[0]
}

// FlagEnabled resolves a feature flag for a user. Unknown flag keys resolve to
// false so a widget can never leak on a typo. An empty segment list means the
// flag applies to everyone.
func (s *Store) FlagEnabled(key string, u model.User) bool {
	f, ok := s.Flags[key]
	if !ok || !f.Enabled {
		return false
	}
	if len(f.Segments) == 0 {
		return true
	}
	for _, seg := range f.Segments {
		if seg == u.Segment {
			return true
		}
	}
	return false
}

// UserSummaries projects every demo user for the app's user switcher.
func (s *Store) UserSummaries() []model.UserSummary {
	out := make([]model.UserSummary, 0, len(s.Users))
	for _, u := range s.Users {
		out = append(out, u.Summary())
	}
	return out
}
