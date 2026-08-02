package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"dynamicwidget/backend/internal/experience"
	"dynamicwidget/backend/internal/run"
)

func env(name, fallback string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return fallback
}
func main() {
	store := experience.NewCommandStore()
	source := experience.HTTPSource{Client: &http.Client{Timeout: 2 * time.Second}, CustomerURL: env("CUSTOMER_FACTS_BASE_URL", "http://localhost:8091"), CampaignURL: env("CAMPAIGN_OUTCOMES_BASE_URL", "http://localhost:8092"), JourneyURL: env("JOURNEY_STATE_BASE_URL", "http://localhost:8093")}
	engine, err := experience.NewEngine(experience.DefaultConfig(), source, store.Suppressed, store.InstanceVersion)
	if err != nil {
		log.Fatal(err)
	}
	run.HTTP("8090", (&experience.API{Engine: engine, Commands: store}).Handler())
}
