// Package model holds the wire and seed-data types shared across the DXP backend.
//
// JSON field names in this package are part of the contract in DEMO_SPEC.md and
// must not be renamed without updating that document.
package model

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

// ThemeColors is the fixed colour palette every theme must provide.
type ThemeColors struct {
	Background string `json:"background"`
	Surface    string `json:"surface"`
	SurfaceAlt string `json:"surfaceAlt"`
	Primary    string `json:"primary"`
	OnPrimary  string `json:"onPrimary"`
	Text       string `json:"text"`
	TextMuted  string `json:"textMuted"`
	Border     string `json:"border"`
	Success    string `json:"success"`
	Warning    string `json:"warning"`
	Danger     string `json:"danger"`
}

// Theme is a renderer-applied design token set.
type Theme struct {
	ID      string      `json:"id"`
	Name    string      `json:"name"`
	Colors  ThemeColors `json:"colors"`
	Radius  int         `json:"radius"`
	Spacing int         `json:"spacing"`
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

// Section layout kinds understood by the renderer.
const (
	LayoutBanner     = "banner"
	LayoutCarousel   = "carousel"
	LayoutVertical   = "vertical"
	LayoutHorizontal = "horizontal"
	LayoutGrid       = "grid"
)

// SectionDef is a section slot declared by a layout.
type SectionDef struct {
	ID      string  `json:"id"`
	Layout  string  `json:"layout"`
	Title   *string `json:"title"`
	Columns *int    `json:"columns,omitempty"`
}

// LayoutDef is an ordered list of section slots plus a fallback theme.
type LayoutDef struct {
	ID       string       `json:"id"`
	Name     string       `json:"name"`
	Theme    string       `json:"theme"`
	Sections []SectionDef `json:"sections"`
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

// User is a demo customer profile: the entire personalization input surface.
type User struct {
	ID               string             `json:"id"`
	Name             string             `json:"name"`
	Initials         string             `json:"initials"`
	Description      string             `json:"description"`
	Segment          string             `json:"segment"`
	ProductsOwned    []string           `json:"productsOwned"`
	KYCStatus        string             `json:"kycStatus"`
	EmailVerified    bool               `json:"emailVerified"`
	MobileVerified   bool               `json:"mobileVerified"`
	RiskBand         string             `json:"riskBand"`
	Geo              string             `json:"geo"`
	MLScores         map[string]float64 `json:"mlScores"`
	RecentActivity   []string           `json:"recentActivity"`
	BirthdayToday    bool               `json:"birthdayToday"`
	AnniversaryToday bool               `json:"anniversaryToday"`
	TenureMonths     int                `json:"tenureMonths"`
	MonthlyIncomeInr int                `json:"monthlyIncomeInr"`
	CreditScore      int                `json:"creditScore"`
	Device           string             `json:"device"`
	Layout           string             `json:"layout"`
	Theme            string             `json:"theme"`
}

// Profile flattens the user into the map the rules engine evaluates against.
// Nested ML scores are addressable with dotted paths, e.g. "mlScores.loan_offer".
func (u User) Profile() map[string]any {
	ml := make(map[string]any, len(u.MLScores))
	for k, v := range u.MLScores {
		ml[k] = v
	}
	return map[string]any{
		"id":               u.ID,
		"name":             u.Name,
		"segment":          u.Segment,
		"productsOwned":    toAnySlice(u.ProductsOwned),
		"kycStatus":        u.KYCStatus,
		"emailVerified":    u.EmailVerified,
		"mobileVerified":   u.MobileVerified,
		"riskBand":         u.RiskBand,
		"geo":              u.Geo,
		"mlScores":         ml,
		"recentActivity":   toAnySlice(u.RecentActivity),
		"birthdayToday":    u.BirthdayToday,
		"anniversaryToday": u.AnniversaryToday,
		"tenureMonths":     float64(u.TenureMonths),
		"monthlyIncomeInr": float64(u.MonthlyIncomeInr),
		"creditScore":      float64(u.CreditScore),
		"device":           u.Device,
	}
}

func toAnySlice(in []string) []any {
	out := make([]any, len(in))
	for i, v := range in {
		out[i] = v
	}
	return out
}

// UserSummary is the trimmed shape returned by GET /api/v1/users.
type UserSummary struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Initials    string `json:"initials"`
	Description string `json:"description"`
	Segment     string `json:"segment"`
	KYCStatus   string `json:"kycStatus"`
	RiskBand    string `json:"riskBand"`
	Geo         string `json:"geo"`
	Layout      string `json:"layout"`
	Theme       string `json:"theme"`
}

// Summary projects a User down to the switcher payload.
func (u User) Summary() UserSummary {
	return UserSummary{
		ID:          u.ID,
		Name:        u.Name,
		Initials:    u.Initials,
		Description: u.Description,
		Segment:     u.Segment,
		KYCStatus:   u.KYCStatus,
		RiskBand:    u.RiskBand,
		Geo:         u.Geo,
		Layout:      u.Layout,
		Theme:       u.Theme,
	}
}

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

// WidgetTypes is the closed registry of renderable widget types (PLAN.md).
var WidgetTypes = []string{
	"loan_offer", "credit_card_offer", "fd", "pledge",
	"kyc", "vkyc", "email_verification", "mobile_verification",
	"birthday", "anniversary", "rewards", "cashback",
	"payments", "investments",
}

// CTA is the single call-to-action a widget may carry.
type CTA struct {
	Label  string `json:"label"`
	Action string `json:"action"`
	Target string `json:"target"`
}

// WidgetData is the renderer payload. Everything except Title is optional and
// may serialise as null; the renderer must tolerate nulls and missing keys.
type WidgetData struct {
	Title    string   `json:"title"`
	Subtitle *string  `json:"subtitle"`
	Badge    *string  `json:"badge"`
	Icon     *string  `json:"icon"`
	ImageURL *string  `json:"imageUrl"`
	Progress *float64 `json:"progress"`
	Amount   *string  `json:"amount"`
	CTA      *CTA     `json:"cta"`
}

// WidgetAnalytics carries the impression key and (optional) owning experiment.
type WidgetAnalytics struct {
	ImpressionKey string  `json:"impressionKey"`
	ExperimentID  *string `json:"experimentId"`
}

// WidgetDef is a seed-data widget definition (data/widgets.json).
type WidgetDef struct {
	ID             string          `json:"id"`
	Type           string          `json:"type"`
	Section        string          `json:"section"`
	Priority       float64         `json:"priority"`
	Size           string          `json:"size"`
	Flag           string          `json:"flag,omitempty"`
	DefaultVisible *bool           `json:"defaultVisible,omitempty"`
	Data           WidgetData      `json:"data"`
	Analytics      WidgetAnalytics `json:"analytics"`
}

// VisibleByDefault reports whether the widget is a candidate before rules run.
func (w WidgetDef) VisibleByDefault() bool {
	return w.DefaultVisible == nil || *w.DefaultVisible
}

// WidgetDebug explains how a widget's final priority was computed. Emitted only
// when the manifest request carries ?debug=1.
type WidgetDebug struct {
	BasePriority    int      `json:"basePriority"`
	MLBoost         int      `json:"mlBoost"`
	RuleDelta       int      `json:"ruleDelta"`
	ExperimentBoost int      `json:"experimentBoost"`
	AppliedRules    []string `json:"appliedRules"`
	Section         string   `json:"section"`
	Pinned          bool     `json:"pinned"`
	FinalPriority   int      `json:"finalPriority"`
}

// Widget is the rendered manifest entry.
type Widget struct {
	ID        string          `json:"id"`
	Type      string          `json:"type"`
	Priority  int             `json:"priority"`
	Size      string          `json:"size"`
	Data      WidgetData      `json:"data"`
	Analytics WidgetAnalytics `json:"analytics"`
	Debug     *WidgetDebug    `json:"debug,omitempty"`
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

// Section is a populated manifest section.
type Section struct {
	ID      string   `json:"id"`
	Layout  string   `json:"layout"`
	Title   *string  `json:"title"`
	Columns *int     `json:"columns,omitempty"`
	Widgets []Widget `json:"widgets"`
}

// ExperimentAssignment is the per-user variant assignment reported back.
type ExperimentAssignment struct {
	ID      string `json:"id"`
	Variant string `json:"variant"`
	Bucket  int    `json:"bucket"`
}

// Manifest is the full GET /api/v1/manifest response.
type Manifest struct {
	Version     int                    `json:"version"`
	GeneratedAt string                 `json:"generatedAt"`
	UserID      string                 `json:"userId"`
	Layout      string                 `json:"layout"`
	Theme       Theme                  `json:"theme"`
	Experiments []ExperimentAssignment `json:"experiments"`
	Sections    []Section              `json:"sections"`
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

// Supported condition operators.
const (
	OpEq       = "eq"
	OpNeq      = "neq"
	OpIn       = "in"
	OpNin      = "nin"
	OpGt       = "gt"
	OpGte      = "gte"
	OpLt       = "lt"
	OpLte      = "lte"
	OpContains = "contains"
	OpExists   = "exists"
)

// Supported rule effect actions.
const (
	ActionShow     = "show"
	ActionHide     = "hide"
	ActionBoost    = "boost"
	ActionPenalize = "penalize"
	ActionPin      = "pin"
)

// Condition is one predicate over the flattened user profile.
type Condition struct {
	Field string `json:"field"`
	Op    string `json:"op"`
	Value any    `json:"value"`
}

// Effect is what a matching rule does to a widget.
type Effect struct {
	Action  string  `json:"action"`
	Value   float64 `json:"value,omitempty"`
	Section string  `json:"section,omitempty"`
}

// Rule is a data-driven personalization rule. Targeting is by widget type
// (single or list) and/or an exact widget id; an empty target matches all.
// All When conditions must hold (AND); an empty When always matches.
type Rule struct {
	ID          string      `json:"id"`
	WidgetType  string      `json:"widgetType,omitempty"`
	WidgetTypes []string    `json:"widgetTypes,omitempty"`
	WidgetID    string      `json:"widgetId,omitempty"`
	When        []Condition `json:"when"`
	Effect      Effect      `json:"effect"`
}

// ---------------------------------------------------------------------------
// Experiments
// ---------------------------------------------------------------------------

// VariantEffect re-ranks or re-routes widgets for an assigned variant.
type VariantEffect struct {
	WidgetType string  `json:"widgetType,omitempty"`
	WidgetID   string  `json:"widgetId,omitempty"`
	Boost      float64 `json:"boost,omitempty"`
	Section    string  `json:"section,omitempty"`
	Hide       bool    `json:"hide,omitempty"`
}

// Variant is one arm of an experiment.
type Variant struct {
	ID      string          `json:"id"`
	Weight  int             `json:"weight"`
	Effects []VariantEffect `json:"effects"`
}

// Experiment is a deterministic, weight-split A/B(/n) test.
// Targets lists the widget types tagged with this experiment id for analytics,
// regardless of which variant the user landed in.
type Experiment struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Enabled  bool      `json:"enabled"`
	Targets  []string  `json:"targets"`
	Variants []Variant `json:"variants"`
}

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

// Flag gates a widget. When Segments is non-empty the user's segment must be
// listed for the flag to resolve true.
type Flag struct {
	Enabled  bool     `json:"enabled"`
	Segments []string `json:"segments"`
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

// Analytics event types.
const (
	EventImpression = "impression"
	EventClick      = "click"
	EventDwell      = "dwell"
	EventScroll     = "scroll"
	EventConversion = "conversion"
	EventDismiss    = "dismiss"
)

// EventTypes is the closed set of accepted analytics event types.
var EventTypes = []string{
	EventImpression, EventClick, EventDwell,
	EventScroll, EventConversion, EventDismiss,
}

// Event is a single client-reported interaction.
type Event struct {
	Type         string         `json:"type"`
	WidgetID     string         `json:"widgetId"`
	WidgetType   string         `json:"widgetType"`
	ExperimentID string         `json:"experimentId"`
	Variant      string         `json:"variant"`
	TS           int64          `json:"ts"`
	Meta         map[string]any `json:"meta"`
}

// EventBatch is the POST /api/v1/analytics/events request body.
type EventBatch struct {
	UserID string  `json:"userId"`
	Events []Event `json:"events"`
}
