# Implementation Status

Updated: 2026-08-02

## Delivered

### React Native renderer

- Expo/React Native application for Android and web.
- Versioned, allowlisted renderer registry; backend JSON cannot create arbitrary native components.
- Runtime validation of the experience envelope, actions, and renderer-specific props.
- Backend-controlled vertical, grid, and carousel slots.
- Backend-controlled widget content, ordering, visibility, section metadata, and navigation.
- Loading, retry, and last-valid-response behavior.
- Demo persona switching with stale-request protection.
- Acknowledged dismiss and timed-snooze commands, animated removal, and decision refetch.
- Android safe-area handling and responsive 360 px/mobile rendering.

### Go services

- `experience-api`: combines domain data, evaluates rules, resolves lifecycle, orders widgets, and returns final render decisions.
- `customer-facts-mock`: serves customer, segment, balance, risk, and KYC facts.
- `campaign-outcomes-mock`: serves campaign eligibility and terminal outcomes.
- `journey-state-mock`: serves applications and resumable journey state.
- Deterministic fixtures for Aarav, Meera, Kabir, and a new customer.
- Explicit non-production mutation/reset endpoints for exercising business-state changes.
- Config validation and constrained `all`, `any`, `not`, `eq`, `neq`, `in`, and `exists` conditions.
- Stable ordering, slot limits, independent offer instances, and entity-state replacement.
- Idempotent commands, optimistic instance versions, action authorization, and timed snoozing.
- CORS, health endpoints, concurrent-safe in-memory state, and concurrent domain fetches.

### Proven scenarios

| Persona/state | Result |
| --- | --- |
| Aarav | Pending KYC, financial health, and two independently removable offers |
| Meera | Verified KYC and terminal/ineligible offers removed |
| Kabir | Acquisition offer replaced by an in-progress loan journey |
| New customer | Onboarding task list replaces established-customer insights |
| KYC changed to verified | KYC widget disappears after the next decision |
| Dismiss/snooze | Widget is removed only after backend acknowledgement |

## Verification completed

- TypeScript strict typecheck.
- Expo dependency compatibility check.
- Production web export.
- Go unit and integration tests with the race detector.
- Go vet.
- Browser tests for all personas and lifecycle removal.
- Public portal smoke tests for both the app and Experience API.
- Android 15/API 35 release APK build and emulator smoke test.

## Current service map

| Service | Port |
| --- | ---: |
| React Native web | 8082 |
| Experience API | 8090 |
| Customer Facts mock | 8091 |
| Campaign Outcomes mock | 8092 |
| Journey State mock | 8093 |

All services are declared in `.amp/services.yaml`; `.agents/setup` installs the required Go toolchain and JavaScript dependencies.

## Pending work

### Next milestone: contracts and skeletons

- Add an OpenAPI 3.1 contract and shared golden response examples.
- Generate or verify Go and TypeScript DTO compatibility from the contract.
- Move widget definitions from compiled Go fixtures into versioned JSON configuration loaded and validated at startup.
- Add the constrained skeleton registry, schema validation, renderer mapping, and reduced-motion behavior.
- Cache or bundle skeleton definitions so initial loading does not introduce another network waterfall.

### Lifecycle and persistence

- Include command/lifecycle state in aggregate `userStateVersion` and `decisionId` semantics.
- Persist dismissals, snoozes, idempotency records, and instance versions in PostgreSQL.
- Add expiry cleanup and injected-clock tests for snooze and campaign schedules.
- Define the production precedence table for business facts, campaign outcomes, entity state, dismissal, snooze, and expiry.
- Add authenticated identity; remove mock user headers and mutation routes from production builds.

### Decision platform

- Expand the typed fact registry and rule operators only as required by real campaigns.
- Add schedules, conditional boosts, dependencies, mutual-exclusion groups, and per-group limits to external configuration.
- Add renderer-capability negotiation for older app versions.
- Add configuration publishing, validation, rollback, and audit history.
- Decide whether the domain mocks remain separate deployments or become adapters inside a Go modular monolith for the first production release.

### Product capabilities

- Analytics for impressions, clicks, dwell, scroll, conversion, and removal reasons.
- Deterministic experiment allocation and experiment-result reporting.
- CMS integration for approved content and theme tokens.
- Additional renderer types and accessibility/localization coverage.
- Offline/last-known-good persistence if offline startup becomes a product requirement.

### Production readiness

- Timeouts, retries, circuit breaking, structured logs, metrics, and tracing.
- API rate limits, payload bounds, URL/action allowlists, and security review.
- PostgreSQL migrations and production fixture/config seeding.
- CI for TypeScript, Expo export, Go race tests, contract tests, and Android builds.
- Deployment manifests and environment-specific service discovery.

## Known prototype constraints

- Domain and lifecycle state is in memory and resets when services restart.
- Widget configuration is currently compiled into the Go service rather than authored as external JSON.
- Navigation actions are rendered but do not yet connect to a production navigation stack.
- The demo persona selector and `__mock` routes are intentionally prototype-only.
- New content and ordering can be shipped from the backend, but a genuinely new native renderer still requires an app release.
