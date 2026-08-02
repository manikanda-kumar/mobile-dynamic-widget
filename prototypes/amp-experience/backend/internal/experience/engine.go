package experience

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"dynamicwidget/backend/internal/domain"
)

type Source interface {
	Load(context.Context, string) (domain.CustomerFacts, domain.CampaignState, domain.JourneyState, error)
}
type Renderer struct {
	Type    string `json:"type"`
	Version int    `json:"version"`
}
type Action struct {
	Type    string `json:"type"`
	Command string `json:"command,omitempty"`
	Target  string `json:"target,omitempty"`
}
type Item struct {
	InstanceID      string         `json:"instanceId"`
	WidgetID        string         `json:"widgetId"`
	CampaignID      string         `json:"campaignId,omitempty"`
	Renderer        Renderer       `json:"renderer"`
	Rank            int            `json:"rank"`
	InstanceVersion int            `json:"instanceVersion"`
	Props           map[string]any `json:"props"`
	Actions         []Action       `json:"actions"`
}
type Layout struct {
	Type    string `json:"type"`
	Columns int    `json:"columns,omitempty"`
}
type Slot struct {
	ID     string `json:"id"`
	Title  string `json:"title,omitempty"`
	Action string `json:"action,omitempty"`
	Layout Layout `json:"layout"`
	Items  []Item `json:"items"`
}
type Page struct {
	Customer   map[string]any      `json:"customer"`
	Theme      map[string]any      `json:"theme"`
	Navigation []map[string]string `json:"navigation"`
}
type Response struct {
	SchemaVersion    string `json:"schemaVersion"`
	DecisionID       string `json:"decisionId"`
	ConfigVersion    string `json:"configVersion"`
	UserStateVersion string `json:"userStateVersion"`
	Page             Page   `json:"page"`
	Slots            []Slot `json:"slots"`
}

type Engine struct {
	config          Config
	source          Source
	suppressed      func(string, string) bool
	instanceVersion func(string, string) int
}

func NewEngine(c Config, s Source, suppressed func(string, string) bool, instanceVersion func(string, string) int) (*Engine, error) {
	if err := c.Validate(); err != nil {
		return nil, err
	}
	return &Engine{c, s, suppressed, instanceVersion}, nil
}
func stableID(parts ...string) string {
	h := sha256.Sum256([]byte(strings.Join(parts, "|")))
	return hex.EncodeToString(h[:8])
}

func (e *Engine) Decide(ctx context.Context, user, catalog string) (Response, error) {
	c, campaigns, journeys, err := e.source.Load(ctx, user)
	if err != nil {
		return Response{}, err
	}
	versions := fmt.Sprintf("%d-%d-%d", c.StateVersion, campaigns.StateVersion, journeys.StateVersion)
	facts := map[string]any{"customer.name": c.Name, "customer.kycStatus": c.KYCStatus, "customer.segment": c.Segment}
	bySlot := map[string][]Item{}
	for _, d := range e.config.Definitions {
		if !d.Enabled {
			continue
		}
		ok, err := Evaluate(d.Eligibility, facts)
		if err != nil {
			return Response{}, err
		}
		if !ok {
			continue
		}
		props := copyMap(d.Props)
		if d.Renderer == "account_summary" {
			props["balance"] = formatINR(c.Balance)
			props["accountLabel"] = title(c.Segment) + " savings"
			props["segmentLabel"] = title(c.Segment)
		}
		if d.Renderer == "financial_health" {
			props["score"] = min(100, c.CreditScore/10)
		}
		id := stableID(user, d.WidgetID)
		bySlot[d.Slot] = append(bySlot[d.Slot], Item{id, d.WidgetID, "", Renderer{d.Renderer, 1}, d.Priority, e.version(user, id), props, defaultActions(d.Renderer)})
	}
	terminal := map[string]bool{"accepted": true, "applied": true}
	journeyByCampaign := map[string]domain.Journey{}
	for _, j := range journeys.Journeys {
		journeyByCampaign[j.CampaignID] = j
	}
	for _, campaign := range campaigns.Campaigns {
		journey, hasJourney := journeyByCampaign[campaign.CampaignID]
		if !hasJourney && (!campaign.Eligible || terminal[campaign.Outcome]) {
			continue
		}
		renderer := "loan_offer"
		props := map[string]any{"tag": "PRE-APPROVED", "title": "Grow your plans, not your waiting time.", "description": "Personal loan up to ₹5L at a special rate.", "cta": "View offer", "icon": "arrow-up-right", "color": "#E5F2E9"}
		if campaign.Type == "credit_card" {
			renderer = "credit_card_offer"
			props = map[string]any{"tag": "REWARDS", "title": "Make every weekend count.", "description": "5X points on dining with Northstar Gold.", "cta": "Explore card", "icon": "credit-card", "color": "#F5EBD8"}
		}
		widget := "offer-" + campaign.Type
		if hasJourney {
			renderer = "journey_status"
			widget = "journey-" + journey.Type
			props = map[string]any{"tag": "IN PROGRESS", "title": "Your loan is moving forward.", "description": humanStatus(journey.Status) + " · Application " + journey.EntityID, "cta": "View application", "icon": "bar-chart-2", "color": "#E3ECF7"}
		}
		id := stableID(user, widget, campaign.CampaignID)
		bySlot["home_offers"] = append(bySlot["home_offers"], Item{id, widget, campaign.CampaignID, Renderer{renderer, 1}, 80, e.version(user, id), props, defaultActions(renderer)})
	}
	order := []string{"home_summary", "home_actions", "home_offers", "home_insights"}
	layouts := map[string]Layout{"home_summary": {"vertical", 0}, "home_actions": {"grid", 4}, "home_offers": {"carousel", 0}, "home_insights": {"vertical", 0}}
	titles := map[string]string{"home_offers": "Picked for you", "home_insights": "Your financial health"}
	slots := make([]Slot, 0, 4)
	for _, sid := range order {
		items := bySlot[sid]
		filtered := items[:0]
		for _, it := range items {
			if e.suppressed == nil || !e.suppressed(user, it.InstanceID) {
				filtered = append(filtered, it)
			}
		}
		items = filtered
		sort.Slice(items, func(i, j int) bool {
			if items[i].Rank == items[j].Rank {
				return items[i].InstanceID < items[j].InstanceID
			}
			return items[i].Rank > items[j].Rank
		})
		if n := e.config.Limits[sid]; len(items) > n {
			items = items[:n]
		}
		for i := range items {
			items[i].Rank = i + 1
		}
		action := ""
		if sid == "home_offers" && len(items) > 0 {
			action = "View all"
		}
		slots = append(slots, Slot{sid, titles[sid], action, layouts[sid], items})
	}
	decision := stableID(user, catalog, e.config.Version, versions)
	return Response{"1.0", decision, e.config.Version, versions, Page{map[string]any{"id": user, "name": c.Name}, map[string]any{"mode": "light", "primary": "#265DFF", "background": "#F6F8FC"}, []map[string]string{{"id": "home", "label": "Home"}, {"id": "payments", "label": "Payments"}, {"id": "insights", "label": "Insights"}, {"id": "profile", "label": "Profile"}}}, slots}, nil
}

func (e *Engine) version(user, instanceID string) int {
	if e.instanceVersion == nil {
		return 1
	}
	return e.instanceVersion(user, instanceID)
}
func copyMap(m map[string]any) map[string]any {
	o := map[string]any{}
	for k, v := range m {
		o[k] = v
	}
	return o
}
func defaultActions(renderer string) []Action {
	if strings.Contains(renderer, "offer") {
		return []Action{{"navigate", "", "offer/details"}, {"command", "dismiss", ""}}
	}
	if renderer == "kyc_nudge" {
		return []Action{{"navigate", "", "kyc/start"}, {"command", "snooze", ""}}
	}
	return []Action{{"navigate", "", "widget/" + renderer}}
}

func formatINR(value float64) string {
	digits := strconv.FormatInt(int64(value), 10)
	if len(digits) <= 3 {
		return "₹" + digits
	}
	last := digits[len(digits)-3:]
	head := digits[:len(digits)-3]
	for i := len(head) - 2; i > 0; i -= 2 {
		head = head[:i] + "," + head[i:]
	}
	return "₹" + head + "," + last
}

func humanStatus(status string) string {
	return title(strings.ReplaceAll(status, "_", " "))
}

func title(value string) string {
	if value == "" {
		return value
	}
	return strings.ToUpper(value[:1]) + value[1:]
}
