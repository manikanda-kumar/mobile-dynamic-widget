package main

import (
	"dynamicwidget/backend/internal/domain"
	"dynamicwidget/backend/internal/mockserver"
	"dynamicwidget/backend/internal/run"
)

func main() { run.HTTP("8091", mockserver.New("customer-facts", domain.CustomerFixtures()).Handler()) }
