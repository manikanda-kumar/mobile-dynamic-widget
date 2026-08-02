# Dynamic widget Go backend

Four standard-library Go services provide deterministic mock domain data and a composed home experience. Run each command from `backend/` (separate terminals):

```sh
go run ./cmd/customer-facts-mock       # :8091
go run ./cmd/campaign-outcomes-mock    # :8092
go run ./cmd/journey-state-mock        # :8093
go run ./cmd/experience-api            # :8090
```

Every service honors `PORT`. The Experience API additionally honors `CUSTOMER_FACTS_BASE_URL`, `CAMPAIGN_OUTCOMES_BASE_URL`, and `JOURNEY_STATE_BASE_URL`. Domain reads are `GET /v1/customer-facts/{userId}`, `/v1/campaign-outcomes/{userId}`, and `/v1/journey-state/{userId}`. All services expose `GET /health` and CORS preflight support.

## Try scenarios

```sh
# Aarav: pending KYC plus two independent eligible offers
curl -s -H 'X-Mock-User-Id: aarav' -H 'X-Renderer-Catalog-Version: 1' \
  http://localhost:8090/v1/experiences/home

# Kabir: loan acquisition campaign is replaced by an in-progress journey
curl -s -H 'X-Mock-User-Id: kabir' http://localhost:8090/v1/experiences/home

# Clearly test-only mutation; reset restores all deterministic fixtures
curl -X PUT -H 'Content-Type: application/json' http://localhost:8091/__mock/aarav \
  -d '{"userId":"aarav","name":"Aarav","kycStatus":"verified","segment":"premium","products":["savings"],"balance":245600,"creditScore":782,"stateVersion":2}'
curl -X POST http://localhost:8091/__mock/reset

# Use an instanceId from the experience response. Repeating commandId is idempotent.
curl -X POST -H 'Content-Type: application/json' -H 'X-Mock-User-Id: aarav' \
  http://localhost:8090/v1/widget-instances/INSTANCE_ID/commands \
  -d '{"commandId":"demo-1","command":"dismiss","expectedInstanceVersion":1}'
```

Supported command names are `dismiss` and `snooze`. Success returns `removeInstanceIds`, `refetchDecision`, and the resulting instance version. A new command with an expected version other than `1` returns HTTP 409. State is process-local and intentionally resets on restart. Mock users are `aarav`, `meera`, `kabir`, and `new-user`.

Run tests with `go test ./...`.
