# Dynamic Experience Platform (DXP) — demo

Backend-driven mobile home screen: the app is a renderer, the backend decides widgets, ordering,
sections, theme and experiments. See [PLAN.md](PLAN.md) for the product vision and
[DEMO_SPEC.md](DEMO_SPEC.md) for the backend ⟷ renderer contract.

## Run

```bash
# terminal 1 — manifest API on :8080 (Go 1.26, stdlib only, in-memory seed data)
cd backend && go run ./cmd/server

# terminal 2 — renderer on :8082 (Expo React Native, web preview)
cd mobile && npx expo start --web --port 8082
```

Open http://localhost:8082. Use the header to switch demo users, hit **Debug** to see each widget's
priority and the rules that fired, and **Refresh** to re-fetch the manifest.

## What to look for

| user | what the backend decides |
|---|---|
| Priya (premium) | dark theme, pre-approved loan pinned to the hero banner, no KYC nags |
| Arjun (new) | light theme, onboarding layout — KYC / vKYC / email / mobile pinned to the top |
| Meera (birthday) | festive theme, birthday widget takes the hero |
| Rahul (thin file) | loan and credit-card offers suppressed by risk rules; FD and pledge instead |
| Guest | generic product shelf, zero personalization |

Nothing about those screens is in the app — swap the JSON in `backend/data/` and the home screen
changes with no app rebuild.

## Layout

```
backend/   Go manifest API — rules engine, experiments, feature flags, analytics (in-memory)
  data/    seed JSON: widgets, layouts, themes, rules, experiments, flags, users
mobile/    Expo RN renderer — registry of 14 widget types + 5 section layouts
```

## Test

```bash
cd backend && go test ./...
cd mobile   && npx tsc --noEmit
```
