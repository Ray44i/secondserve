# Technical architecture and design notes

- Node built-in HTTP server and SQLite keep the prototype dependency-light and runnable locally.
- Domain transitions are separated from HTTP handling and operate on a local relational schema.
- Mutations use SQLite transactions; offer acceptance reserves capacity and cancellation releases it.
- Matching applies hard eligibility checks before weighted sorting. Scores are configurable demo heuristics, not empirically calibrated.
- Optional Muse Spark structured extraction is server-side, schema-constrained, feature-flagged, opt-in, and draft-only.
- UI renders persisted workflow events and separates reported, accepted, and coordinator-verified quantities. Mixed units are never summed.
- Demo role sessions are not production security. No live geocoding, partner notification, or external database is integrated.
