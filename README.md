# Northstar Dynamic Experience Platform

A React Native home screen whose content, ordering, eligibility, and lifecycle are decided by Go services. The app renders only versioned native widget types; it does not evaluate business rules or execute arbitrary backend-provided UI code.

## Run locally

Install dependencies, then start the supervised services:

```sh
./.agents/setup
amp orb services ensure
```

The service set contains:

| Service | Port | Purpose |
| --- | ---: | --- |
| React Native web | 8082 | Expo renderer and demo persona switcher |
| Experience API | 8090 | Rules, lifecycle, ordering, and render JSON |
| Customer Facts | 8091 | Customer, segment, and KYC mock facts |
| Campaign Outcomes | 8092 | Eligibility and offer outcome mocks |
| Journey State | 8093 | Application and resumable-journey mocks |

The React Native app uses `EXPO_PUBLIC_API_URL` when supplied. Otherwise, web derives port 8090 from its current host and Android uses `10.0.2.2:8090`.

## Demo scenarios

Use the persona chips in the app:

- **Aarav** — pending KYC and two independently removable offers.
- **Meera** — verified KYC and no eligible offers.
- **Kabir** — a loan offer replaced by an in-progress journey.
- **New user** — onboarding tasks instead of financial-health insights.

Mock state can also be changed through the explicitly non-production `PUT /__mock/{userId}` endpoints. See [`backend/README.md`](backend/README.md) for examples.

## Verify

```sh
npm run typecheck
npx expo export --platform web
cd backend && go test -race ./... && go vet ./...
```
