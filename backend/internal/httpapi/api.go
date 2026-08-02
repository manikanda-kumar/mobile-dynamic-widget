// Package httpapi wires the DXP HTTP surface: stdlib http.ServeMux routing,
// permissive CORS for the Expo web preview, and JSON encoding.
package httpapi

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/analytics"
	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/manifest"
	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/model"
	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/store"
)

// Server holds the request-scoped dependencies.
type Server struct {
	Store     *store.Store
	Analytics *analytics.Collector
	Logger    *log.Logger
}

// New builds a Server over the given catalogue.
func New(s *store.Store, logger *log.Logger) *Server {
	return &Server{Store: s, Analytics: analytics.NewCollector(), Logger: logger}
}

// Handler returns the fully routed, CORS-wrapped handler.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.handleHealth)
	mux.HandleFunc("GET /api/v1/manifest", s.handleManifest)
	mux.HandleFunc("GET /api/v1/users", s.handleUsers)
	mux.HandleFunc("GET /api/v1/themes", s.handleThemes)
	mux.HandleFunc("POST /api/v1/analytics/events", s.handleAnalyticsEvents)
	mux.HandleFunc("GET /api/v1/analytics/summary", s.handleAnalyticsSummary)
	return withCORS(mux)
}

// withCORS answers preflights and stamps CORS headers on every response.
// The Expo web preview runs on a different origin, so this must be permissive.
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Access-Control-Allow-Origin", "*")
		h.Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		h.Set("Access-Control-Allow-Headers", "Content-Type, X-User-Id")
		h.Set("Access-Control-Max-Age", "600")
		h.Add("Vary", "Origin")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleManifest(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	// Query param wins over the header; both are optional.
	userID := strings.TrimSpace(q.Get("userId"))
	if userID == "" {
		userID = strings.TrimSpace(r.Header.Get("X-User-Id"))
	}

	m := manifest.Build(s.Store, manifest.Options{
		UserID: userID,
		Layout: strings.TrimSpace(q.Get("layout")),
		Debug:  isTruthy(q.Get("debug")),
		Demo:   strings.TrimSpace(q.Get("demo")),
	})
	writeJSON(w, http.StatusOK, m)
}

func (s *Server) handleUsers(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"users": s.Store.UserSummaries()})
}

func (s *Server) handleThemes(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"themes": s.Store.Themes})
}

func (s *Server) handleAnalyticsEvents(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var batch model.EventBatch
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	if err := dec.Decode(&batch); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON body"})
		return
	}
	if batch.UserID == "" {
		batch.UserID = strings.TrimSpace(r.Header.Get("X-User-Id"))
	}
	accepted := s.Analytics.Ingest(batch)
	writeJSON(w, http.StatusOK, map[string]int{"accepted": accepted})
}

func (s *Server) handleAnalyticsSummary(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.Analytics.Summary())
}

func isTruthy(v string) bool {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(body); err != nil {
		// Status is already written; nothing useful left to do but log upstream.
		_ = err
	}
}
