package domain

type CustomerFacts struct {
	UserID       string   `json:"userId"`
	Name         string   `json:"name"`
	KYCStatus    string   `json:"kycStatus"`
	Segment      string   `json:"segment"`
	Products     []string `json:"products"`
	Balance      float64  `json:"balance"`
	CreditScore  int      `json:"creditScore"`
	StateVersion int      `json:"stateVersion"`
}

type Campaign struct {
	CampaignID string `json:"campaignId"`
	Type       string `json:"type"`
	Outcome    string `json:"outcome"`
	Eligible   bool   `json:"eligible"`
}

type CampaignState struct {
	UserID       string     `json:"userId"`
	Campaigns    []Campaign `json:"campaigns"`
	StateVersion int        `json:"stateVersion"`
}

type Journey struct {
	EntityID   string `json:"entityId"`
	Type       string `json:"type"`
	CampaignID string `json:"campaignId"`
	Status     string `json:"status"`
}

type JourneyState struct {
	UserID       string    `json:"userId"`
	Journeys     []Journey `json:"journeys"`
	StateVersion int       `json:"stateVersion"`
}

func CustomerFixtures() map[string]CustomerFacts {
	return map[string]CustomerFacts{
		"aarav":    {"aarav", "Aarav", "pending", "premium", []string{"savings"}, 245600, 782, 1},
		"meera":    {"meera", "Meera", "verified", "mass", []string{"savings", "credit_card"}, 48600, 735, 1},
		"kabir":    {"kabir", "Kabir", "pending", "mass", []string{"savings", "loan"}, 89300, 701, 1},
		"new-user": {"new-user", "New customer", "pending", "new", nil, 0, 0, 1},
	}
}

func CampaignFixtures() map[string]CampaignState {
	return map[string]CampaignState{
		"aarav":    {"aarav", []Campaign{{"loan-growth-1", "loan", "eligible", true}, {"card-premium-1", "credit_card", "eligible", true}}, 1},
		"meera":    {"meera", []Campaign{{"loan-growth-1", "loan", "accepted", true}, {"card-premium-1", "credit_card", "eligible", false}}, 1},
		"kabir":    {"kabir", []Campaign{{"loan-growth-1", "loan", "applied", true}}, 1},
		"new-user": {"new-user", nil, 1},
	}
}

func JourneyFixtures() map[string]JourneyState {
	return map[string]JourneyState{
		"aarav":    {"aarav", nil, 1},
		"meera":    {"meera", nil, 1},
		"kabir":    {"kabir", []Journey{{"loan-app-901", "loan", "loan-growth-1", "under_review"}}, 1},
		"new-user": {"new-user", nil, 1},
	}
}
