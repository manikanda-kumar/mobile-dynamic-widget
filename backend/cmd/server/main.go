// Command server runs the Dynamic Experience Platform demo backend.
//
//	go run ./cmd/server        # listens on :8080 (override with PORT)
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/httpapi"
	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/store"
)

func main() {
	logger := log.New(os.Stdout, "dxp ", log.LstdFlags)

	catalogue, err := store.New()
	if err != nil {
		logger.Fatalf("seed data: %v", err)
	}
	logger.Printf("loaded %d users, %d widgets, %d rules, %d experiments, %d layouts, %d themes",
		len(catalogue.Users), len(catalogue.Widgets), len(catalogue.Rules),
		len(catalogue.Experiments), len(catalogue.Layouts), len(catalogue.Themes))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           httpapi.New(catalogue, logger).Handler(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		logger.Printf("listening on http://localhost:%s", port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Fatalf("serve: %v", err)
		}
	}()

	<-ctx.Done()
	logger.Print("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Printf("shutdown: %v", err)
	}
}
