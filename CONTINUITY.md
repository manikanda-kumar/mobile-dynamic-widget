# Continuity Ledger

## Goal (incl. success criteria)

Stand up a runnable DXP (Dynamic Experience Platform) demo from PLAN.md.
Success: `backend/` Go server serves personalized widget manifests; `mobile/` Expo RN app renders
them server-driven in web preview; switching demo users visibly changes widgets/order/theme;
README documents both run commands.

## Constraints/Assumptions

- Backend language is **Go** (user correction; PLAN.md updated, was Kotlin/Spring)
- Storage: in-memory hydrated from JSON seed files — no Postgres/Redis/Kafka for the demo
- Renderer: Expo React Native, **web preview** target (`npx expo start --web`), no iOS sim needed
- Scope: PLAN.md Phase 1 + a taste of Phase 2/3 — widget registry, layout engine, manifest API,
  rules-based personalization, one A/B experiment, feature flags, 2 themes, analytics events
- Local toolchain confirmed: go 1.26.4, node 26.4.0, java 26, docker running

## Key decisions

- `DEMO_SPEC.md` at repo root is the authoritative backend⟷mobile contract; both build agents
  conform to it (endpoints, JSON field names, ranking, experiments, analytics, seed users)
- Go backend: stdlib only (net/http + ServeMux + embed.FS), zero third-party deps, port 8080, CORS open
- Server-driven purity: app holds a static registry of the 14 widget types + 5 section layouts and
  renders only what the manifest dictates; unknown types degrade gracefully
- 5 demo users (u_priya, u_arjun, u_meera, u_rahul, anon) each yield a visibly different home screen
- Work split across two parallel subagents (backend / mobile), file scopes disjoint

## State

### Done

- Read PLAN.md; confirmed repo had no code (only PLAN.md + CONTINUITY.md)
- Checked local toolchain
- Clarified stack with user: Go backend, Expo RN web preview, in-memory seed, Phase 1 + 2/3 taste
- Wrote `DEMO_SPEC.md` shared contract
- Updated PLAN.md tech stack Kotlin/Spring → Go; added `.gitignore`
- Launched two background subagents: Go backend build, Expo RN renderer build

- Backend built + independently verified by me: `go build/vet/test` green (6 test pkgs); all 5 users
  return distinct manifests (theme, layout, sections, widget mix); `?debug=1` exposes
  basePriority/mlBoost/ruleDelta/experimentBoost/appliedRules; analytics POST + summary (CTR) work;
  CORS preflight returns 204 with `*`
- Backend left running on :8080 (background) for the mobile agent to hit

- Mobile renderer built (Expo SDK 57 + TS): registry of 14 widget types + 5 section layouts,
  manifest-driven theme via React context, header (user switcher / refresh / debug toggle /
  experiment variant badges), analytics batching (flush at 10 events, 3s, or unmount)
- Mobile verified by the agent against the **live** backend on :8080: `npx tsc --noEmit` clean;
  Playwright at 390x844 showed all 5 users rendering distinct screens (theme + sections + widget
  mix); `?debug=1` renders per-widget finalPriority/basePriority/mlBoost/appliedRules + section
  meta; impressions fire only for visible widgets (IntersectionObserver), CTA click POSTs to
  `/api/v1/analytics/events` (server summary: 120 events / 5 users); no console errors at 390px
  or 1280px
- Degradation verified: API blocked → red "Backend unreachable" banner with the failing URL +
  bundled fixture renders; unknown widget `type` and unknown section `layout` warn and skip
  without crashing
- Mobile agent stopped the Expo dev server it started (port 8082 free)

- Joint pass run by me (not just agent claim): `npx tsc --noEmit` clean; Playwright at 390x844
  against live backend — all 5 users render distinct themes/sections/widgets, Debug overlay shows
  `P88 base 88 · ml 0 · kyc · 2x1` + applied-rule chips, offline route-abort falls back to bundled
  fixture, unknown `crypto_ticker` type and `masonry` layout warn-and-skip. Screenshots inspected.
- Wrote root `README.md`; committed everything as e6ce633 (67 files)

### Now

- Demo is complete and committed. Backend :8080 and Expo web :8082 left running for the user.

### Next

- Optional polish: backend can populate the renderer's already-supported optional `data` fields
  (`stats`, `items`, `series`, `delta`/`deltaDirection`, `progressLabel`, `footnote`) to densify
  fd / payments / kyc / investments / cashback cards with no app change
- Optional: push to origin (not pushed yet)

## Open questions

- None currently

## Working set (files/ids/commands)

- files: `DEMO_SPEC.md` (contract), `PLAN.md`, `backend/` (agent-owned), `mobile/` (agent-owned)
- mobile source map: `mobile/src/{types,api,theme,analytics,render,widgets,ui,components,screens}`
  (`render/` = layout registry + WidgetHost, `widgets/registry.ts` = the 14 type→component map)
- commands:
  - `cd backend && go build ./... && go test ./... && go run ./cmd/server` (port 8080)
  - `cd mobile && npx expo start --web`
  - `curl 'http://localhost:8080/api/v1/manifest?userId=u_priya&debug=1'`

## Project learnings

- Repo was scaffolding-only at session start — "demo app" means build it, not run it
- Expo not installed locally; `npx expo` will prompt to install unless run non-interactively
- Browser tools block `file://` — use the http URL Expo prints
- `create-expo-app` is broken on npm 12 (cannot parse `npm pack --dry-run --json`); scaffold via
  `npm pack expo-template-blank-typescript` + untar + rename `gitignore` → `.gitignore`
- Playwright needed `npx playwright install chromium` (cache held only older builds)
- No `frontend-design` skill here; `~/.agents/skills/impeccable` is the equivalent design skill
