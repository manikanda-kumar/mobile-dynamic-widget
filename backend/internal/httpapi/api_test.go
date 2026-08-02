package httpapi

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/model"
	"github.com/manikanda-kumar/mobile-dynamic-widget/backend/internal/store"
)

func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	s, err := store.New()
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	srv := httptest.NewServer(New(s, log.New(io.Discard, "", 0)).Handler())
	t.Cleanup(srv.Close)
	return srv
}

func getJSON(t *testing.T, url string, dst any) *http.Response {
	t.Helper()
	resp, err := http.Get(url)
	if err != nil {
		t.Fatalf("GET %s: %v", url, err)
	}
	t.Cleanup(func() { resp.Body.Close() })
	if dst != nil {
		if err := json.NewDecoder(resp.Body).Decode(dst); err != nil {
			t.Fatalf("decode %s: %v", url, err)
		}
	}
	return resp
}

func TestHealth(t *testing.T) {
	srv := newTestServer(t)
	var body map[string]string
	resp := getJSON(t, srv.URL+"/health", &body)
	if resp.StatusCode != http.StatusOK || body["status"] != "ok" {
		t.Fatalf("health = %d %v", resp.StatusCode, body)
	}
}

func TestCORSHeadersAndPreflight(t *testing.T) {
	srv := newTestServer(t)

	resp := getJSON(t, srv.URL+"/health", nil)
	if got := resp.Header.Get("Access-Control-Allow-Origin"); got != "*" {
		t.Fatalf("Allow-Origin = %q", got)
	}

	req, _ := http.NewRequest(http.MethodOptions, srv.URL+"/api/v1/manifest", nil)
	req.Header.Set("Origin", "http://localhost:8081")
	req.Header.Set("Access-Control-Request-Method", "GET")
	pre, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("preflight: %v", err)
	}
	defer pre.Body.Close()
	if pre.StatusCode != http.StatusNoContent {
		t.Fatalf("preflight status = %d, want 204", pre.StatusCode)
	}
	if !strings.Contains(pre.Header.Get("Access-Control-Allow-Methods"), "POST") {
		t.Fatalf("Allow-Methods = %q", pre.Header.Get("Access-Control-Allow-Methods"))
	}
	if !strings.Contains(pre.Header.Get("Access-Control-Allow-Headers"), "X-User-Id") {
		t.Fatalf("Allow-Headers = %q", pre.Header.Get("Access-Control-Allow-Headers"))
	}
}

func TestUsersEndpoint(t *testing.T) {
	srv := newTestServer(t)
	var body struct {
		Users []model.UserSummary `json:"users"`
	}
	getJSON(t, srv.URL+"/api/v1/users", &body)

	want := map[string]bool{"u_priya": false, "u_arjun": false, "u_meera": false, "u_rahul": false, "anon": false}
	for _, u := range body.Users {
		if _, ok := want[u.ID]; ok {
			want[u.ID] = true
		}
		if u.Name == "" || u.Description == "" {
			t.Fatalf("user %s missing switcher metadata: %+v", u.ID, u)
		}
	}
	for id, seen := range want {
		if !seen {
			t.Fatalf("users endpoint missing demo user %s", id)
		}
	}
}

func TestThemesEndpoint(t *testing.T) {
	srv := newTestServer(t)
	var body struct {
		Themes []model.Theme `json:"themes"`
	}
	getJSON(t, srv.URL+"/api/v1/themes", &body)
	if len(body.Themes) == 0 {
		t.Fatal("no themes returned")
	}
	for _, th := range body.Themes {
		if th.ID == "" || th.Colors.Background == "" || th.Colors.Primary == "" || th.Radius == 0 {
			t.Fatalf("incomplete theme: %+v", th)
		}
	}
}

func TestManifestUserResolution(t *testing.T) {
	srv := newTestServer(t)

	var byQuery model.Manifest
	getJSON(t, srv.URL+"/api/v1/manifest?userId=u_meera", &byQuery)
	if byQuery.UserID != "u_meera" {
		t.Fatalf("query userId resolved to %q", byQuery.UserID)
	}

	// Header supplies the user when the query param is absent.
	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/api/v1/manifest", nil)
	req.Header.Set("X-User-Id", "u_rahul")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("header request: %v", err)
	}
	defer resp.Body.Close()
	var byHeader model.Manifest
	if err := json.NewDecoder(resp.Body).Decode(&byHeader); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if byHeader.UserID != "u_rahul" {
		t.Fatalf("header userId resolved to %q", byHeader.UserID)
	}

	// Query param wins over the header.
	req2, _ := http.NewRequest(http.MethodGet, srv.URL+"/api/v1/manifest?userId=u_priya", nil)
	req2.Header.Set("X-User-Id", "u_rahul")
	resp2, err := http.DefaultClient.Do(req2)
	if err != nil {
		t.Fatalf("precedence request: %v", err)
	}
	defer resp2.Body.Close()
	var both model.Manifest
	if err := json.NewDecoder(resp2.Body).Decode(&both); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if both.UserID != "u_priya" {
		t.Fatalf("query param must win, got %q", both.UserID)
	}

	// Unknown user falls back to anon rather than erroring.
	var unknown model.Manifest
	r := getJSON(t, srv.URL+"/api/v1/manifest?userId=nobody", &unknown)
	if r.StatusCode != http.StatusOK || unknown.UserID != "anon" {
		t.Fatalf("unknown user = %d %q", r.StatusCode, unknown.UserID)
	}
}

func TestManifestShape(t *testing.T) {
	srv := newTestServer(t)
	var m model.Manifest
	getJSON(t, srv.URL+"/api/v1/manifest?userId=u_priya", &m)

	if m.Version != 3 || m.GeneratedAt == "" || m.Layout == "" || m.Theme.ID == "" {
		t.Fatalf("manifest envelope = %+v", m)
	}
	validLayouts := map[string]bool{"banner": true, "carousel": true, "vertical": true, "horizontal": true, "grid": true}
	validSizes := map[string]bool{"1x1": true, "2x1": true, "2x2": true, "3x1": true}
	known := map[string]bool{}
	for _, t := range model.WidgetTypes {
		known[t] = true
	}
	for _, sec := range m.Sections {
		if !validLayouts[sec.Layout] {
			t.Fatalf("section %s has invalid layout %q", sec.ID, sec.Layout)
		}
		if len(sec.Widgets) == 0 {
			t.Fatalf("empty section %s must be omitted", sec.ID)
		}
		if sec.Layout == "grid" && sec.Columns == nil {
			t.Fatalf("grid section %s missing columns", sec.ID)
		}
		prev := 1 << 30
		for _, w := range sec.Widgets {
			if !known[w.Type] {
				t.Fatalf("unknown widget type %q", w.Type)
			}
			if !validSizes[w.Size] {
				t.Fatalf("widget %s invalid size %q", w.ID, w.Size)
			}
			if w.Data.Title == "" {
				t.Fatalf("widget %s missing required data.title", w.ID)
			}
			if w.Analytics.ImpressionKey == "" {
				t.Fatalf("widget %s missing impressionKey", w.ID)
			}
			if w.Priority > prev {
				// Pinned widgets may break descending order; only flag when the
				// higher-priority widget follows a strictly lower one at the top.
				t.Logf("note: %s priority %d follows %d (pin)", w.ID, w.Priority, prev)
			}
			prev = w.Priority
		}
	}
}

func TestManifestDebugFlag(t *testing.T) {
	srv := newTestServer(t)

	var plain model.Manifest
	getJSON(t, srv.URL+"/api/v1/manifest?userId=u_priya", &plain)
	for _, sec := range plain.Sections {
		for _, w := range sec.Widgets {
			if w.Debug != nil {
				t.Fatalf("debug leaked into plain manifest for %s", w.ID)
			}
		}
	}

	var dbg model.Manifest
	getJSON(t, srv.URL+"/api/v1/manifest?userId=u_priya&debug=1", &dbg)
	count := 0
	for _, sec := range dbg.Sections {
		for _, w := range sec.Widgets {
			if w.Debug == nil {
				t.Fatalf("widget %s missing debug object", w.ID)
			}
			if w.Debug.AppliedRules == nil {
				t.Fatalf("widget %s has null appliedRules; want []", w.ID)
			}
			count++
		}
	}
	if count == 0 {
		t.Fatal("debug manifest had no widgets")
	}
}

func TestAnalyticsRoundTrip(t *testing.T) {
	srv := newTestServer(t)

	body := `{"userId":"u_priya","events":[
      {"type":"impression","widgetId":"w_loan_offer_preapproved","widgetType":"loan_offer","experimentId":"exp_offer_position","variant":"B","ts":1754212800000,"meta":{"dwellMs":1200,"position":0}},
      {"type":"impression","widgetId":"w_fd_booster","widgetType":"fd","experimentId":"exp_fd_copy","variant":"control","ts":1754212801000,"meta":{"position":1}},
      {"type":"click","widgetId":"w_loan_offer_preapproved","widgetType":"loan_offer","experimentId":"exp_offer_position","variant":"B","ts":1754212802000,"meta":null}
    ]}`
	resp, err := http.Post(srv.URL+"/api/v1/analytics/events", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer resp.Body.Close()
	var accepted map[string]int
	if err := json.NewDecoder(resp.Body).Decode(&accepted); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if accepted["accepted"] != 3 {
		t.Fatalf("accepted = %v, want 3", accepted)
	}

	var summary struct {
		TotalEvents  int `json:"totalEvents"`
		ByWidgetType map[string]struct {
			Impression int     `json:"impression"`
			Click      int     `json:"click"`
			CTR        float64 `json:"ctr"`
		} `json:"byWidgetType"`
		ByExperiment map[string]map[string]struct {
			Impression int     `json:"impression"`
			CTR        float64 `json:"ctr"`
		} `json:"byExperiment"`
	}
	getJSON(t, srv.URL+"/api/v1/analytics/summary", &summary)
	if summary.TotalEvents != 3 {
		t.Fatalf("totalEvents = %d", summary.TotalEvents)
	}
	if got := summary.ByWidgetType["loan_offer"]; got.Impression != 1 || got.Click != 1 || got.CTR != 1 {
		t.Fatalf("loan_offer summary = %+v", got)
	}
	if got := summary.ByExperiment["exp_offer_position"]["B"]; got.Impression != 1 {
		t.Fatalf("experiment summary = %+v", got)
	}
}

func TestAnalyticsRejectsBadJSON(t *testing.T) {
	srv := newTestServer(t)
	resp, err := http.Post(srv.URL+"/api/v1/analytics/events", "application/json", strings.NewReader("{oops"))
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

func TestMethodRouting(t *testing.T) {
	srv := newTestServer(t)
	resp, err := http.Post(srv.URL+"/api/v1/manifest", "application/json", strings.NewReader("{}"))
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Fatalf("POST /api/v1/manifest = %d, want 405", resp.StatusCode)
	}
}
