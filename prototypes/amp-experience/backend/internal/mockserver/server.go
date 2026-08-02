package mockserver

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
)

type Server[T any] struct {
	mu       sync.RWMutex
	initial  map[string]T
	state    map[string]T
	resource string
}

func New[T any](resource string, fixtures map[string]T) *Server[T] {
	s := &Server[T]{resource: resource, initial: clone(fixtures)}
	s.reset()
	return s
}

func clone[T any](in map[string]T) map[string]T {
	b, _ := json.Marshal(in)
	var out map[string]T
	_ = json.Unmarshal(b, &out)
	return out
}

func (s *Server[T]) reset() { s.state = clone(s.initial) }

func (s *Server[T]) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) { write(w, 200, map[string]string{"status": "ok"}) })
	mux.HandleFunc("GET /v1/"+s.resource+"/{userId}", s.get)
	// Test-only controls; never expose these routes in a production deployment.
	mux.HandleFunc("PUT /__mock/{userId}", s.put)
	mux.HandleFunc("POST /__mock/reset", s.handleReset)
	return cors(mux)
}

func (s *Server[T]) get(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	v, ok := s.state[r.PathValue("userId")]
	s.mu.RUnlock()
	if !ok {
		write(w, 404, map[string]string{"error": "unknown user"})
		return
	}
	write(w, 200, v)
}

func (s *Server[T]) put(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var v T
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&v); err != nil {
		write(w, 400, map[string]string{"error": err.Error()})
		return
	}
	s.mu.Lock()
	s.state[r.PathValue("userId")] = v
	s.mu.Unlock()
	write(w, 200, v)
}

func (s *Server[T]) handleReset(w http.ResponseWriter, _ *http.Request) {
	s.mu.Lock()
	s.reset()
	s.mu.Unlock()
	write(w, 200, map[string]bool{"reset": true})
}

func write(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Mock-User-Id, X-Renderer-Catalog-Version")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS")
		if strings.EqualFold(r.Method, "OPTIONS") {
			w.WriteHeader(204)
			return
		}
		next.ServeHTTP(w, r)
	})
}
