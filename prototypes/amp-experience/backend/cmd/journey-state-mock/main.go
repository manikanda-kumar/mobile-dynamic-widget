package main

import (
	"dynamicwidget/backend/internal/domain"
	"dynamicwidget/backend/internal/mockserver"
	"dynamicwidget/backend/internal/run"
)

func main() { run.HTTP("8093", mockserver.New("journey-state", domain.JourneyFixtures()).Handler()) }
