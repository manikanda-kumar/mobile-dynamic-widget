package experience

import "fmt"

type Definition struct {
	WidgetID    string
	Slot        string
	Renderer    string
	Priority    int
	Enabled     bool
	Eligibility Condition
	Props       map[string]any
}

type Config struct {
	Version     string
	Limits      map[string]int
	Definitions []Definition
}

// DefaultConfig is configuration data. The engine below does not embed eligibility rules.
func DefaultConfig() Config {
	return Config{"home-2026.08.1", map[string]int{"home_summary": 1, "home_actions": 4, "home_offers": 4, "home_insights": 4}, []Definition{
		{"account-summary", "home_summary", "account_summary", 100, true, Condition{Op: "exists", Fact: "customer.name"}, map[string]any{"eyebrow": "TOTAL BALANCE", "change": "+₹12,400 this month", "accountLabel": "Savings account", "accountNumber": "•• 4821"}},
		{"quick-actions", "home_actions", "quick_actions", 100, true, Condition{Op: "exists", Fact: "customer.name"}, map[string]any{"actions": []any{map[string]any{"label": "Send", "icon": "send"}, map[string]any{"label": "Add money", "icon": "plus"}, map[string]any{"label": "Pay bills", "icon": "credit-card"}, map[string]any{"label": "Rewards", "icon": "gift"}}}},
		{"kyc-reminder", "home_insights", "kyc_nudge", 90, true, Condition{Op: "eq", Fact: "customer.kycStatus", Value: "pending"}, map[string]any{"tag": "ACTION NEEDED", "title": "Complete your KYC", "description": "Verify your identity to unlock every Northstar feature.", "cta": "Continue verification", "icon": "shield", "color": "#E5F2E9"}},
		{"financial-health", "home_insights", "financial_health", 60, true, Condition{Op: "neq", Fact: "customer.segment", Value: "new"}, map[string]any{"label": "Looking strong", "caption": "Up 6 points since last month", "metrics": []any{map[string]any{"label": "Savings", "value": "32%", "progress": 0.72}, map[string]any{"label": "Spending", "value": "On track", "progress": 0.58}}}},
		{"getting-started", "home_insights", "task_list", 70, true, Condition{Op: "eq", Fact: "customer.segment", Value: "new"}, map[string]any{"title": "Finish setting up", "completed": 0, "tasks": []any{map[string]any{"title": "Add money", "detail": "Fund your new account", "done": false, "icon": "plus"}, map[string]any{"title": "Complete KYC", "detail": "Takes about 2 min", "done": false, "icon": "shield"}}}},
	}}
}

func (c Config) Validate() error {
	known := map[string]bool{"customer.name": true, "customer.kycStatus": true, "customer.segment": true}
	if c.Version == "" {
		return fmt.Errorf("config version required")
	}
	seen := map[string]bool{}
	for _, d := range c.Definitions {
		if seen[d.WidgetID] {
			return fmt.Errorf("duplicate widget %s", d.WidgetID)
		}
		seen[d.WidgetID] = true
		if c.Limits[d.Slot] <= 0 {
			return fmt.Errorf("unknown slot %s", d.Slot)
		}
		if err := validateCondition(d.Eligibility, known); err != nil {
			return fmt.Errorf("widget %s: %w", d.WidgetID, err)
		}
	}
	return nil
}
