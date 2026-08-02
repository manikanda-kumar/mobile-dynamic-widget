// Package analytics keeps in-memory counters for client-reported widget events
// and exposes the aggregated view used for demo introspection.
package analytics

import (
	"sync"

	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/model"
)

// Counts is a per-event-type tally plus a derived click-through rate.
type Counts struct {
	Impression int     `json:"impression"`
	Click      int     `json:"click"`
	Dwell      int     `json:"dwell"`
	Scroll     int     `json:"scroll"`
	Conversion int     `json:"conversion"`
	Dismiss    int     `json:"dismiss"`
	Total      int     `json:"total"`
	CTR        float64 `json:"ctr"`
}

func (c *Counts) add(eventType string) {
	switch eventType {
	case model.EventImpression:
		c.Impression++
	case model.EventClick:
		c.Click++
	case model.EventDwell:
		c.Dwell++
	case model.EventScroll:
		c.Scroll++
	case model.EventConversion:
		c.Conversion++
	case model.EventDismiss:
		c.Dismiss++
	default:
		return
	}
	c.Total++
	c.CTR = ratio(c.Click, c.Impression)
}

func ratio(clicks, impressions int) float64 {
	if impressions == 0 {
		return 0
	}
	return float64(clicks) / float64(impressions)
}

// Summary is the GET /api/v1/analytics/summary response.
type Summary struct {
	TotalEvents  int                          `json:"totalEvents"`
	TotalUsers   int                          `json:"totalUsers"`
	ByEventType  map[string]int               `json:"byEventType"`
	ByWidgetType map[string]Counts            `json:"byWidgetType"`
	ByExperiment map[string]map[string]Counts `json:"byExperiment"`
}

// Collector accumulates events. Safe for concurrent use.
type Collector struct {
	mu           sync.RWMutex
	total        int
	users        map[string]struct{}
	byEventType  map[string]int
	byWidgetType map[string]*Counts
	byExperiment map[string]map[string]*Counts
}

// NewCollector returns an empty collector.
func NewCollector() *Collector {
	return &Collector{
		users:        map[string]struct{}{},
		byEventType:  map[string]int{},
		byWidgetType: map[string]*Counts{},
		byExperiment: map[string]map[string]*Counts{},
	}
}

// Valid reports whether an event type is in the accepted set.
func Valid(eventType string) bool {
	for _, t := range model.EventTypes {
		if t == eventType {
			return true
		}
	}
	return false
}

// Ingest records a batch and returns how many events were accepted. Events with
// an unrecognised type are silently dropped rather than failing the batch.
func (c *Collector) Ingest(batch model.EventBatch) int {
	c.mu.Lock()
	defer c.mu.Unlock()

	if batch.UserID != "" {
		c.users[batch.UserID] = struct{}{}
	}

	accepted := 0
	for _, ev := range batch.Events {
		if !Valid(ev.Type) {
			continue
		}
		accepted++
		c.total++
		c.byEventType[ev.Type]++

		if ev.WidgetType != "" {
			counts, ok := c.byWidgetType[ev.WidgetType]
			if !ok {
				counts = &Counts{}
				c.byWidgetType[ev.WidgetType] = counts
			}
			counts.add(ev.Type)
		}

		if ev.ExperimentID != "" {
			variant := ev.Variant
			if variant == "" {
				variant = "unassigned"
			}
			byVariant, ok := c.byExperiment[ev.ExperimentID]
			if !ok {
				byVariant = map[string]*Counts{}
				c.byExperiment[ev.ExperimentID] = byVariant
			}
			counts, ok := byVariant[variant]
			if !ok {
				counts = &Counts{}
				byVariant[variant] = counts
			}
			counts.add(ev.Type)
		}
	}
	return accepted
}

// Summary returns a point-in-time copy of all counters.
func (c *Collector) Summary() Summary {
	c.mu.RLock()
	defer c.mu.RUnlock()

	s := Summary{
		TotalEvents:  c.total,
		TotalUsers:   len(c.users),
		ByEventType:  make(map[string]int, len(model.EventTypes)),
		ByWidgetType: make(map[string]Counts, len(c.byWidgetType)),
		ByExperiment: make(map[string]map[string]Counts, len(c.byExperiment)),
	}
	for _, t := range model.EventTypes {
		s.ByEventType[t] = c.byEventType[t]
	}
	for k, v := range c.byWidgetType {
		s.ByWidgetType[k] = *v
	}
	for exp, byVariant := range c.byExperiment {
		out := make(map[string]Counts, len(byVariant))
		for variant, v := range byVariant {
			out[variant] = *v
		}
		s.ByExperiment[exp] = out
	}
	return s
}
