package experience

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"dynamicwidget/backend/internal/domain"
)

type HTTPSource struct {
	Client                               *http.Client
	CustomerURL, CampaignURL, JourneyURL string
}

func (s HTTPSource) Load(ctx context.Context, user string) (domain.CustomerFacts, domain.CampaignState, domain.JourneyState, error) {
	var c domain.CustomerFacts
	var campaigns domain.CampaignState
	var journeys domain.JourneyState
	errCh := make(chan error, 3)
	var wg sync.WaitGroup
	for _, x := range []struct {
		base, path string
		dst        any
	}{{s.CustomerURL, "customer-facts", &c}, {s.CampaignURL, "campaign-outcomes", &campaigns}, {s.JourneyURL, "journey-state", &journeys}} {
		wg.Add(1)
		go func(x struct {
			base, path string
			dst        any
		}) {
			defer wg.Done()
			errCh <- s.get(ctx, x.base+"/v1/"+x.path+"/"+url.PathEscape(user), x.dst)
		}(x)
	}
	wg.Wait()
	close(errCh)
	for err := range errCh {
		if err != nil {
			return c, campaigns, journeys, err
		}
	}
	return c, campaigns, journeys, nil
}
func (s HTTPSource) get(ctx context.Context, u string, dst any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	resp, err := s.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("domain service %s returned %s", u, resp.Status)
	}
	if err := json.NewDecoder(resp.Body).Decode(dst); err != nil {
		return fmt.Errorf("decode %s: %w", u, err)
	}
	return nil
}

type commandRecord struct {
	InstanceID string
	Request    CommandRequest
	Response   CommandResponse
}
type suppression struct {
	Command      string
	SnoozedUntil time.Time
}
type CommandStore struct {
	mu         sync.RWMutex
	commands   map[string]commandRecord
	suppressed map[string]suppression
	versions   map[string]int
}

func NewCommandStore() *CommandStore {
	return &CommandStore{commands: map[string]commandRecord{}, suppressed: map[string]suppression{}, versions: map[string]int{}}
}
func (s *CommandStore) Suppressed(user, id string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	state, ok := s.suppressed[user+"|"+id]
	return ok && (state.Command == "dismiss" || time.Now().Before(state.SnoozedUntil))
}
func (s *CommandStore) InstanceVersion(user, id string) int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if version := s.versions[user+"|"+id]; version > 0 {
		return version
	}
	return 1
}

type CommandRequest struct {
	CommandID               string `json:"commandId"`
	Command                 string `json:"command"`
	ExpectedInstanceVersion int    `json:"expectedInstanceVersion"`
	SnoozedUntil            string `json:"snoozedUntil,omitempty"`
}
type CommandResponse struct {
	CommandID         string   `json:"commandId"`
	RemoveInstanceIDs []string `json:"removeInstanceIds"`
	RefetchDecision   bool     `json:"refetchDecision"`
	InstanceVersion   int      `json:"instanceVersion"`
}

func (s *CommandStore) Replay(user, id string, r CommandRequest) (CommandResponse, int, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	old, ok := s.commands[user+"|"+r.CommandID]
	if !ok {
		return CommandResponse{}, 0, false, nil
	}
	if old.InstanceID != id || old.Request != r {
		return CommandResponse{}, 409, true, fmt.Errorf("commandId already used with different input")
	}
	return old.Response, 200, true, nil
}

func (s *CommandStore) Apply(user, id string, r CommandRequest, allowed bool) (CommandResponse, int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if old, ok := s.commands[user+"|"+r.CommandID]; ok {
		if old.InstanceID != id || old.Request != r {
			return CommandResponse{}, 409, fmt.Errorf("commandId already used with different input")
		}
		return old.Response, 200, nil
	}
	key := user + "|" + id
	currentVersion := s.versions[key]
	if currentVersion == 0 {
		currentVersion = 1
	}
	if r.ExpectedInstanceVersion != currentVersion {
		return CommandResponse{}, 409, fmt.Errorf("stale instance version")
	}
	if !allowed {
		return CommandResponse{}, 404, fmt.Errorf("instance or command is not available")
	}
	if r.Command != "dismiss" && r.Command != "snooze" {
		return CommandResponse{}, 400, fmt.Errorf("unsupported command")
	}
	state := suppression{Command: r.Command}
	if r.Command == "snooze" {
		until, err := time.Parse(time.RFC3339, r.SnoozedUntil)
		if err != nil || !until.After(time.Now()) {
			return CommandResponse{}, 400, fmt.Errorf("snoozedUntil must be a future RFC3339 timestamp")
		}
		state.SnoozedUntil = until
	}
	nextVersion := currentVersion + 1
	out := CommandResponse{r.CommandID, []string{id}, true, nextVersion}
	s.commands[user+"|"+r.CommandID] = commandRecord{id, r, out}
	s.suppressed[key] = state
	s.versions[key] = nextVersion
	return out, 200, nil
}

type API struct {
	Engine   *Engine
	Commands *CommandStore
}

func (a *API) Handler() http.Handler {
	m := http.NewServeMux()
	m.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) { writeJSON(w, 200, map[string]string{"status": "ok"}) })
	m.HandleFunc("GET /v1/experiences/home", a.home)
	m.HandleFunc("POST /v1/widget-instances/{instanceId}/commands", a.command)
	return withCORS(m)
}
func (a *API) home(w http.ResponseWriter, r *http.Request) {
	user := r.Header.Get("X-Mock-User-Id")
	if user == "" {
		user = "aarav"
	}
	catalog := r.Header.Get("X-Renderer-Catalog-Version")
	if catalog == "" {
		catalog = "1"
	}
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()
	out, err := a.Engine.Decide(ctx, user, catalog)
	if err != nil {
		writeJSON(w, 502, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, out)
}
func (a *API) command(w http.ResponseWriter, r *http.Request) {
	user := r.Header.Get("X-Mock-User-Id")
	if user == "" {
		user = "aarav"
	}
	var req CommandRequest
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if err := d.Decode(&req); err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	if req.CommandID == "" {
		writeJSON(w, 400, map[string]string{"error": "commandId required"})
		return
	}
	instanceID := r.PathValue("instanceId")
	if out, status, replayed, err := a.Commands.Replay(user, instanceID, req); replayed {
		if err != nil {
			writeJSON(w, status, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, status, out)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()
	decision, err := a.Engine.Decide(ctx, user, "1")
	if err != nil {
		writeJSON(w, 502, map[string]string{"error": err.Error()})
		return
	}
	allowed := false
	for _, slot := range decision.Slots {
		for _, item := range slot.Items {
			if item.InstanceID != instanceID {
				continue
			}
			for _, action := range item.Actions {
				allowed = allowed || (action.Type == "command" && action.Command == req.Command)
			}
		}
	}
	out, status, err := a.Commands.Apply(user, instanceID, req, allowed)
	if err != nil {
		writeJSON(w, status, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, status, out)
}
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Mock-User-Id, X-Renderer-Catalog-Version")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		if strings.EqualFold(r.Method, "OPTIONS") {
			w.WriteHeader(204)
			return
		}
		next.ServeHTTP(w, r)
	})
}
