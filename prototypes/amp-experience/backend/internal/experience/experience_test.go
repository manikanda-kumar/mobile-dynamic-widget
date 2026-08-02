package experience

import (
	"context"
	"reflect"
	"testing"
	"time"

	"dynamicwidget/backend/internal/domain"
)

func TestEvaluate(t *testing.T) {
	facts := map[string]any{"a": "x", "b": true}
	tests := []struct {
		name    string
		c       Condition
		want    bool
		wantErr bool
	}{
		{"eq", Condition{Op: "eq", Fact: "a", Value: "x"}, true, false}, {"neq", Condition{Op: "neq", Fact: "a", Value: "y"}, true, false}, {"in", Condition{Op: "in", Fact: "a", Value: []any{"x", "z"}}, true, false}, {"exists", Condition{Op: "exists", Fact: "b"}, true, false}, {"all", Condition{Op: "all", Children: []Condition{{Op: "exists", Fact: "a"}, {Op: "eq", Fact: "b", Value: true}}}, true, false}, {"any", Condition{Op: "any", Children: []Condition{{Op: "eq", Fact: "a", Value: "no"}, {Op: "exists", Fact: "b"}}}, true, false}, {"not", Condition{Op: "not", Children: []Condition{{Op: "eq", Fact: "a", Value: "no"}}}, true, false}, {"unknown fact", Condition{Op: "eq", Fact: "nope", Value: 1}, false, true}, {"unknown op", Condition{Op: "wat"}, false, true}}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Evaluate(tt.c, facts)
			if (err != nil) != tt.wantErr || got != tt.want {
				t.Fatalf("got %v, %v", got, err)
			}
		})
	}
}

type fixtureSource struct{ user string }

func (f fixtureSource) Load(_ context.Context, user string) (domain.CustomerFacts, domain.CampaignState, domain.JourneyState, error) {
	return domain.CustomerFixtures()[user], domain.CampaignFixtures()[user], domain.JourneyFixtures()[user], nil
}
func slot(r Response, id string) Slot {
	for _, s := range r.Slots {
		if s.ID == id {
			return s
		}
	}
	return Slot{}
}
func TestDeterministicOrderingAndScenarios(t *testing.T) {
	e, err := NewEngine(DefaultConfig(), fixtureSource{}, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	a, err := e.Decide(context.Background(), "aarav", "1")
	if err != nil {
		t.Fatal(err)
	}
	b, _ := e.Decide(context.Background(), "aarav", "1")
	if !reflect.DeepEqual(a, b) {
		t.Fatal("decision is not deterministic")
	}
	insights := slot(a, "home_insights").Items
	if len(insights) < 1 || insights[0].Renderer.Type != "kyc_nudge" {
		t.Fatal("pending KYC should rank first")
	}
	offers := slot(a, "home_offers").Items
	if len(offers) != 2 || offers[0].InstanceID == offers[1].InstanceID {
		t.Fatal("eligible campaigns need independent instances")
	}
	meera, _ := e.Decide(context.Background(), "meera", "1")
	if len(slot(meera, "home_offers").Items) != 0 {
		t.Fatal("terminal/ineligible offers should be removed")
	}
	kabir, _ := e.Decide(context.Background(), "kabir", "1")
	got := slot(kabir, "home_offers").Items
	if len(got) != 1 || got[0].Renderer.Type != "journey_status" {
		t.Fatalf("journey should replace offer: %#v", got)
	}
}
func TestCommandIdempotencyAndStaleVersion(t *testing.T) {
	s := NewCommandStore()
	req := CommandRequest{CommandID: "c1", Command: "dismiss", ExpectedInstanceVersion: 1}
	first, status, err := s.Apply("aarav", "i1", req, true)
	if err != nil || status != 200 {
		t.Fatal(status, err)
	}
	again, status, err := s.Apply("aarav", "i1", req, true)
	if err != nil || !reflect.DeepEqual(first, again) {
		t.Fatal("retry was not idempotent")
	}
	_, status, err = s.Apply("aarav", "i1", CommandRequest{CommandID: "c2", Command: "dismiss", ExpectedInstanceVersion: 1}, true)
	if status != 409 || err == nil {
		t.Fatal("a fresh command must observe the transitioned instance version")
	}
	_, status, err = s.Apply("aarav", "i2", CommandRequest{CommandID: "c3", Command: "snooze", ExpectedInstanceVersion: 2, SnoozedUntil: time.Now().Add(time.Hour).Format(time.RFC3339)}, true)
	if status != 409 || err == nil {
		t.Fatal("stale version should conflict")
	}
}
