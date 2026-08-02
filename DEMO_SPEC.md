# DXP Demo — Shared Contract (backend ⟷ mobile renderer)

Authoritative interface spec. Both the Go backend and the Expo RN renderer MUST conform to this
file exactly. Do not change field names without updating this file.

## Repo layout

```
backend/            # Go 1.26 module: github.com/manikanda-kumar/mobile-dynamic-widget/backend
  cmd/server/main.go
  internal/...
  data/*.json       # seed data (widgets, layouts, themes, rules, experiments, users)
mobile/             # Expo React Native app (web preview target)
  App.tsx
  src/...
```

## Backend

- Go 1.26, stdlib `net/http` + `http.ServeMux` routing only (no web framework deps).
- Storage: in-memory, hydrated at boot from `backend/data/*.json` (embedded via `embed.FS`).
- Port: `8080` (override with `PORT` env var).
- CORS: permissive (`Access-Control-Allow-Origin: *`, allow `GET, POST, OPTIONS`, headers
  `Content-Type, X-User-Id`), including preflight handling — the Expo web app calls cross-origin.
- Zero third-party modules. Tests via `go test ./...` (stdlib `testing`).

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | `{"status":"ok"}` |
| GET | `/api/v1/manifest?userId=<id>&layout=<optional>` | Personalized widget manifest |
| GET | `/api/v1/users` | Demo users list (for the app's user switcher) |
| GET | `/api/v1/themes` | All themes |
| POST | `/api/v1/analytics/events` | Batch ingest of analytics events |
| GET | `/api/v1/analytics/summary` | Aggregated counters (demo introspection) |

`userId` may also arrive via `X-User-Id` header; query param wins. Unknown/missing user → fall back
to the anonymous default user (`anon`) rather than erroring.

### Manifest response (GET /api/v1/manifest)

```json
{
  "version": 3,
  "generatedAt": "2026-08-03T10:00:00Z",
  "userId": "u_priya",
  "layout": "home_v2",
  "theme": {
    "id": "banking_dark",
    "name": "Banking Dark",
    "colors": {
      "background": "#0B1120", "surface": "#151E2E", "surfaceAlt": "#1E2A3E",
      "primary": "#4F8DF7", "onPrimary": "#FFFFFF",
      "text": "#F2F5FA", "textMuted": "#94A3B8",
      "border": "#243449", "success": "#34D399", "warning": "#FBBF24", "danger": "#F87171"
    },
    "radius": 16,
    "spacing": 12
  },
  "experiments": [
    { "id": "exp_offer_position", "variant": "B", "bucket": 47 }
  ],
  "sections": [
    {
      "id": "sec_hero",
      "layout": "banner",
      "title": null,
      "widgets": [ /* Widget[] */ ]
    },
    {
      "id": "sec_offers",
      "layout": "carousel",
      "title": "For you",
      "widgets": [ /* Widget[] */ ]
    }
  ]
}
```

- `sections[].layout` ∈ `banner` | `carousel` | `vertical` | `horizontal` | `grid`.
- Grid sections carry `"columns": 2 | 3` (default 2 when absent).
- Widgets inside every section are ordered by descending final `priority` (see ranking below).
- Empty sections are omitted from the response entirely.

### Widget object

```json
{
  "id": "w_loan_offer",
  "type": "loan_offer",
  "priority": 92,
  "size": "2x1",
  "data": {
    "title": "Pre-approved ₹5,00,000",
    "subtitle": "Rate from 10.5% · Disbursal in 2 hours",
    "badge": "Pre-approved",
    "icon": "loan",
    "imageUrl": null,
    "progress": null,
    "amount": "₹5,00,000",
    "cta": { "label": "Check offer", "action": "navigate", "target": "loan/offer/OFF123" }
  },
  "analytics": { "impressionKey": "loan_offer::OFF123", "experimentId": "exp_offer_position" }
}
```

- `size` ∈ `1x1` | `2x1` | `2x2` | `3x1` (renderer hint; carousel/banner may ignore).
- `data` fields are all optional except `title`. Renderer must tolerate nulls/missing keys.
- `analytics.experimentId` may be null.

### Widget types (all 14 from PLAN.md — registry must include every one)

`loan_offer`, `credit_card_offer`, `fd`, `pledge`, `kyc`, `vkyc`, `email_verification`,
`mobile_verification`, `birthday`, `anniversary`, `rewards`, `cashback`, `payments`, `investments`

### Ranking / personalization (rules engine)

Manifest assembly per request:

1. Resolve user profile from `data/users.json` (segment, productsOwned, kycStatus, emailVerified,
   mobileVerified, riskBand, geo, mlScores, recentActivity, birthdayToday, anniversaryToday).
2. Evaluate rules from `data/rules.json`. Each rule is data-driven:
   ```json
   {
     "id": "r_hide_kyc_when_verified",
     "widgetType": "kyc",
     "when": [ { "field": "kycStatus", "op": "eq", "value": "verified" } ],
     "effect": { "action": "hide" }
   }
   ```
   - `op` ∈ `eq` | `neq` | `in` | `nin` | `gt` | `gte` | `lt` | `lte` | `contains` | `exists`.
   - `effect.action` ∈ `show` | `hide` | `boost` | `penalize` | `pin`, with numeric
     `effect.value` for boost/penalize (added to priority) and `effect.section` to route a widget
     into a named section.
   - All `when` conditions must hold (AND). Rules with no conditions always apply.
3. Base priority comes from `data/widgets.json`; ML score for that widget type (if present in
   `user.mlScores`) contributes `score * 20`.
4. Experiment assignment (below) may further re-rank or swap section placement.
5. Sort desc by final priority, stable on widget id.

Expose the reasoning: include a per-widget `"debug"` object (`basePriority`, `mlBoost`,
`appliedRules: string[]`, `finalPriority`) ONLY when the request has `?debug=1`.

### Experiments

`data/experiments.json` defines experiments with variants and traffic split:

```json
{
  "id": "exp_offer_position",
  "enabled": true,
  "variants": [
    { "id": "A", "weight": 50, "effects": [] },
    { "id": "B", "weight": 50, "effects": [ { "widgetType": "loan_offer", "boost": 40, "section": "sec_hero" } ] }
  ]
}
```

Assignment: deterministic bucket = `fnv32a(userId + ":" + experimentId) % 100`, mapped through
cumulative variant weights. Same user always gets the same variant. Report assignment in
`manifest.experiments`.

### Feature flags

`data/flags.json`: `{ "flagKey": { "enabled": bool, "segments": ["premium"] } }`. A widget entry in
`widgets.json` may declare `"flag": "fd_widget_v2"`; when the flag resolves false for the user, the
widget is dropped.

### Analytics

`POST /api/v1/analytics/events` body:

```json
{ "userId": "u_priya", "events": [
  { "type": "impression", "widgetId": "w_loan_offer", "widgetType": "loan_offer",
    "experimentId": "exp_offer_position", "variant": "B", "ts": 1754212800000,
    "meta": { "dwellMs": 1200, "position": 0 } }
] }
```

`type` ∈ `impression` | `click` | `dwell` | `scroll` | `conversion` | `dismiss`.
Response `{"accepted": <n>}`. Server keeps counters in memory; `GET /api/v1/analytics/summary`
returns per-widgetType and per-experiment-variant counts of each event type plus CTR.

### Seed data — demo users (all must exist in `data/users.json`)

| id | name | story it demonstrates |
|---|---|---|
| `u_priya` | Priya (premium, KYC done) | investments/rewards heavy, no KYC nag, loan offer boosted |
| `u_arjun` | Arjun (new user, KYC pending) | onboarding widgets pinned to top: kyc, vkyc, email/mobile verification |
| `u_meera` | Meera (birthday today) | birthday widget pinned hero, cashback + payments |
| `u_rahul` | Rahul (thin file, high risk) | no loan/credit offers (rules hide), FD + pledge instead |
| `anon` | Guest | generic layout, no personalized offers |

Each user must produce a visibly different home screen. Vary segments across variants so the A/B
experiment is observable by switching users.

## Mobile renderer (Expo React Native, web preview)

- Expo SDK (latest stable), TypeScript, `npx expo start --web` as the demo entry point.
- API base URL: `process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080"`.
- **Server-driven only**: the app has a static widget registry keyed by the 14 `type` strings and a
  layout registry keyed by the 5 section layouts. It renders exclusively what the manifest says —
  no hardcoded screen composition, no client-side ordering.
- Unknown widget `type` or section `layout` → render nothing (log a warning), never crash. Include
  a deliberate unknown-type case in a `?demo=unknown` path or a seeded widget to prove graceful
  degradation.
- Theme comes from the manifest (colors/radius/spacing) and is applied via context — no local
  theme constants beyond fallbacks.
- Header controls (demo affordances): user switcher (from `/api/v1/users`), pull-to-refresh /
  refresh button, a "debug" toggle that requests `?debug=1` and shows per-widget priority +
  applied rules, and a small badge showing the assigned experiment variant.
- Analytics: fire `impression` when a widget first becomes visible, `click` on CTA press, batch and
  POST to `/api/v1/analytics/events` (flush on 10 events or 3s).
- Must run acceptably in a mobile-sized browser viewport; use `SafeAreaView`/flex layouts, no
  fixed pixel screen widths.

## Definition of done

1. `cd backend && go build ./... && go test ./...` passes.
2. `cd backend && go run ./cmd/server` serves `/health` and a valid manifest for all 5 users.
3. `cd mobile && npx expo start --web` renders the home screen, and switching users visibly changes
   widget set/order/theme.
4. `README.md` at repo root documents both run commands in under 10 lines.
