// Package manifest assembles the personalized widget manifest: flags, rules,
// ML scores and experiments are folded into a final per-widget priority, then
// widgets are grouped into the layout's sections and ranked.
package manifest

import (
	"math"
	"sort"
	"time"

	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/experiments"
	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/model"
	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/rules"
	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/store"
)

// Version is the manifest schema version advertised to the renderer.
const Version = 3

// mlWeight scales a 0..1 ML score into priority points.
const mlWeight = 20.0

// Options are the per-request knobs for Build.
type Options struct {
	UserID string    // resolved via store fallback rules
	Layout string    // optional layout override (?layout=)
	Debug  bool      // emit per-widget debug objects (?debug=1)
	Demo   string    // demo escape hatch; "unknown" injects an unrenderable widget
	Now    time.Time // generation timestamp; zero means time.Now()
}

// ranked is a widget plus everything needed to sort and explain it.
type ranked struct {
	widget  model.Widget
	section string
	pinned  bool
	score   float64
}

// Build produces the manifest for one request.
func Build(s *store.Store, opt Options) model.Manifest {
	now := opt.Now
	if now.IsZero() {
		now = time.Now()
	}
	user := s.User(opt.UserID)
	profile := user.Profile()

	layoutID := user.Layout
	if opt.Layout != "" && s.HasLayout(opt.Layout) {
		layoutID = opt.Layout
	}
	layout := s.Layout(layoutID)

	themeID := user.Theme
	if themeID == "" {
		themeID = layout.Theme
	}

	assignments, variants := experiments.AssignAll(s.Experiments, user.ID)
	expByType := experimentByWidgetType(s.Experiments)

	widgets := s.Widgets
	if opt.Demo == "unknown" {
		widgets = append(append([]model.WidgetDef{}, widgets...), unknownTypeWidget(layout))
	}

	buckets := map[string][]ranked{}
	for _, def := range widgets {
		// 1. Feature flag gate.
		if def.Flag != "" && !s.FlagEnabled(def.Flag, user) {
			continue
		}

		// 2. Rules.
		outcome := rules.Apply(s.Rules, profile, def)
		if !outcome.Visible {
			continue
		}

		// 3. Base priority + ML contribution.
		base := def.Priority
		ml := mlWeight * user.MLScores[def.Type]

		// 4. Experiment effects for the user's assigned variants.
		expBoost, expSection, expHide := applyVariants(variants, def)
		if expHide {
			continue
		}
		section := outcome.Section
		if expSection != "" {
			section = expSection
		}

		final := base + ml + outcome.Delta + expBoost

		w := model.Widget{
			ID:        def.ID,
			Type:      def.Type,
			Priority:  round(final),
			Size:      def.Size,
			Data:      def.Data,
			Analytics: def.Analytics,
		}
		if expID, ok := expByType[def.Type]; ok {
			id := expID
			w.Analytics.ExperimentID = &id
		}
		if opt.Debug {
			w.Debug = &model.WidgetDebug{
				BasePriority:    round(base),
				MLBoost:         round(ml),
				RuleDelta:       round(outcome.Delta),
				ExperimentBoost: round(expBoost),
				AppliedRules:    outcome.Applied,
				Section:         section,
				Pinned:          outcome.Pinned,
				FinalPriority:   round(final),
			}
		}

		buckets[section] = append(buckets[section], ranked{
			widget:  w,
			section: section,
			pinned:  outcome.Pinned,
			score:   final,
		})
	}

	// 5. Emit sections in layout order, ranked, dropping empties.
	sections := make([]model.Section, 0, len(layout.Sections))
	for _, def := range layout.Sections {
		items := buckets[def.ID]
		if len(items) == 0 {
			continue
		}
		sortRanked(items)
		ws := make([]model.Widget, 0, len(items))
		for _, it := range items {
			ws = append(ws, it.widget)
		}
		sec := model.Section{
			ID:      def.ID,
			Layout:  def.Layout,
			Title:   def.Title,
			Widgets: ws,
		}
		if def.Layout == model.LayoutGrid {
			cols := 2
			if def.Columns != nil && *def.Columns > 0 {
				cols = *def.Columns
			}
			sec.Columns = &cols
		}
		sections = append(sections, sec)
	}

	return model.Manifest{
		Version:     Version,
		GeneratedAt: now.UTC().Format(time.RFC3339),
		UserID:      user.ID,
		Layout:      layout.ID,
		Theme:       s.Theme(themeID),
		Experiments: assignments,
		Sections:    sections,
	}
}

// sortRanked orders a section: pinned first, then descending final priority,
// then ascending widget id so ties are stable and reproducible.
func sortRanked(items []ranked) {
	sort.SliceStable(items, func(i, j int) bool {
		a, b := items[i], items[j]
		if a.pinned != b.pinned {
			return a.pinned
		}
		if a.score != b.score {
			return a.score > b.score
		}
		return a.widget.ID < b.widget.ID
	})
}

// applyVariants folds the assigned variants' effects for one widget.
func applyVariants(variants map[string]model.Variant, def model.WidgetDef) (boost float64, section string, hide bool) {
	for _, v := range variants {
		for _, e := range v.Effects {
			if e.WidgetID != "" && e.WidgetID != def.ID {
				continue
			}
			if e.WidgetType != "" && e.WidgetType != "*" && e.WidgetType != def.Type {
				continue
			}
			if e.WidgetID == "" && e.WidgetType == "" {
				continue
			}
			if e.Hide {
				hide = true
			}
			boost += e.Boost
			if e.Section != "" {
				section = e.Section
			}
		}
	}
	return boost, section, hide
}

// experimentByWidgetType maps each targeted widget type to its experiment id so
// impressions are attributable in every variant, including the control.
func experimentByWidgetType(exps []model.Experiment) map[string]string {
	out := map[string]string{}
	for _, e := range exps {
		if !e.Enabled {
			continue
		}
		for _, t := range e.Targets {
			if _, taken := out[t]; !taken {
				out[t] = e.ID
			}
		}
	}
	return out
}

// unknownTypeWidget is the deliberate graceful-degradation case: a widget whose
// type is absent from the renderer's registry. Injected only for ?demo=unknown.
func unknownTypeWidget(layout model.LayoutDef) model.WidgetDef {
	section := "sec_hero"
	if len(layout.Sections) > 0 {
		section = layout.Sections[0].ID
	}
	sub := "Your renderer should skip this card without crashing"
	badge := "Unknown type"
	return model.WidgetDef{
		ID:       "w_demo_unknown_type",
		Type:     "quantum_yield_ticker",
		Section:  section,
		Priority: 999,
		Size:     "3x1",
		Data: model.WidgetData{
			Title:    "Widget type not in the registry",
			Subtitle: &sub,
			Badge:    &badge,
		},
		Analytics: model.WidgetAnalytics{ImpressionKey: "demo::unknown_type"},
	}
}

func round(f float64) int { return int(math.Round(f)) }
