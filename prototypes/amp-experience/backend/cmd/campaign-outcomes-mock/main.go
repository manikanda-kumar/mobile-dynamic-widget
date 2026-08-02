package main

import (
	"dynamicwidget/backend/internal/domain"
	"dynamicwidget/backend/internal/mockserver"
	"dynamicwidget/backend/internal/run"
)

func main() {
	run.HTTP("8092", mockserver.New("campaign-outcomes", domain.CampaignFixtures()).Handler())
}
