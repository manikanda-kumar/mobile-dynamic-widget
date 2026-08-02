package analytics

import (
	"sync"
	"testing"

	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/model"
)

func TestIngestCountsAndCTR(t *testing.T) {
	c := NewCollector()

	accepted := c.Ingest(model.EventBatch{
		UserID: "u_priya",
		Events: []model.Event{
			{Type: "impression", WidgetType: "loan_offer", ExperimentID: "exp_offer_position", Variant: "B"},
			{Type: "impression", WidgetType: "loan_offer", ExperimentID: "exp_offer_position", Variant: "B"},
			{Type: "impression", WidgetType: "loan_offer", ExperimentID: "exp_offer_position", Variant: "B"},
			{Type: "impression", WidgetType: "loan_offer", ExperimentID: "exp_offer_position", Variant: "B"},
			{Type: "click", WidgetType: "loan_offer", ExperimentID: "exp_offer_position", Variant: "B"},
			{Type: "dwell", WidgetType: "fd"},
			{Type: "scroll", WidgetType: "fd"},
			{Type: "conversion", WidgetType: "fd"},
			{Type: "dismiss", WidgetType: "fd"},
			{Type: "teleport", WidgetType: "fd"}, // unknown type: dropped
		},
	})
	if accepted != 9 {
		t.Fatalf("accepted = %d, want 9 (unknown event type dropped)", accepted)
	}

	s := c.Summary()
	if s.TotalEvents != 9 {
		t.Fatalf("totalEvents = %d, want 9", s.TotalEvents)
	}
	if s.TotalUsers != 1 {
		t.Fatalf("totalUsers = %d, want 1", s.TotalUsers)
	}
	loan := s.ByWidgetType["loan_offer"]
	if loan.Impression != 4 || loan.Click != 1 || loan.Total != 5 {
		t.Fatalf("loan_offer counts = %+v", loan)
	}
	if loan.CTR != 0.25 {
		t.Fatalf("loan_offer CTR = %v, want 0.25", loan.CTR)
	}
	fd := s.ByWidgetType["fd"]
	if fd.Dwell != 1 || fd.Scroll != 1 || fd.Conversion != 1 || fd.Dismiss != 1 || fd.CTR != 0 {
		t.Fatalf("fd counts = %+v", fd)
	}
	variant := s.ByExperiment["exp_offer_position"]["B"]
	if variant.Impression != 4 || variant.Click != 1 || variant.CTR != 0.25 {
		t.Fatalf("experiment variant counts = %+v", variant)
	}
	for _, typ := range model.EventTypes {
		if _, ok := s.ByEventType[typ]; !ok {
			t.Fatalf("byEventType missing key %q", typ)
		}
	}
}

func TestIngestUnassignedVariantBucket(t *testing.T) {
	c := NewCollector()
	c.Ingest(model.EventBatch{UserID: "u", Events: []model.Event{
		{Type: "impression", WidgetType: "fd", ExperimentID: "exp_fd_copy"},
	}})
	if got := c.Summary().ByExperiment["exp_fd_copy"]["unassigned"].Impression; got != 1 {
		t.Fatalf("unassigned bucket impressions = %d, want 1", got)
	}
}

func TestSummaryIsASnapshot(t *testing.T) {
	c := NewCollector()
	c.Ingest(model.EventBatch{UserID: "u", Events: []model.Event{{Type: "click", WidgetType: "fd"}}})
	snap := c.Summary()
	c.Ingest(model.EventBatch{UserID: "u", Events: []model.Event{{Type: "click", WidgetType: "fd"}}})
	if snap.ByWidgetType["fd"].Click != 1 {
		t.Fatal("earlier summary mutated after further ingestion")
	}
	if c.Summary().ByWidgetType["fd"].Click != 2 {
		t.Fatal("later summary did not observe the new event")
	}
}

func TestIngestIsConcurrencySafe(t *testing.T) {
	c := NewCollector()
	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			c.Ingest(model.EventBatch{UserID: "u", Events: []model.Event{
				{Type: "impression", WidgetType: "fd", ExperimentID: "e", Variant: "A"},
			}})
		}()
		wg.Add(1)
		go func() {
			defer wg.Done()
			_ = c.Summary()
		}()
	}
	wg.Wait()
	if got := c.Summary().TotalEvents; got != 50 {
		t.Fatalf("totalEvents = %d, want 50", got)
	}
}

func TestValid(t *testing.T) {
	for _, ok := range model.EventTypes {
		if !Valid(ok) {
			t.Fatalf("%q should be a valid event type", ok)
		}
	}
	if Valid("nope") {
		t.Fatal("unknown event type reported valid")
	}
}
