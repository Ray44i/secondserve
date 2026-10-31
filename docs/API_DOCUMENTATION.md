# SecondServe local API

All endpoints are served by the local Node process. Demo workflow routes require `x-secondserve-session` from the demo role picker. This header is not real authentication.

- `GET /api/secondserve/status` — model feature flag and local storage/demo metadata.
- `POST /api/secondserve/session` — select a demo role; recipient role also supplies a seeded organization ID.
- `GET /api/secondserve/state` — current listing, candidates, offers, events, audit entries, and impact grouped by unit.
- `POST /api/secondserve/demo/load` — coordinator loads a seeded scenario.
- Other `/api/secondserve/*` routes implement listing intake, decision, offer, recipient response, pickup report, and coordinator verification. See `server.mjs` for request shapes and role checks.
- `POST /api/secondserve/intake-draft` — optional model extraction from user-provided text when enabled. Returns a draft requiring human confirmation; does not mutate workflow state.

These APIs are for a local demo only. Do not deploy them as-is or use them for real food-safety decisions.
