# SecondServe architecture

## Runtime

Node.js 22.9+ serves a browser-native interface and JSON API. `server.mjs` owns a local SQLite `DatabaseSync` instance and keeps the Meta API key server-side. Domain transitions live in `secondserve-domain.mjs`; schema is in `secondserve-schema.sql`. The application is a local, single-process demo.

## Data and transitions

Organizations and recipient profiles are seeded fictional fixtures. Listings have explicit date type, storage, condition, allergens, attestation, location, deadline, and preference fields. The decision agent first checks hard eligibility/safety constraints, then ranks remaining candidates. Accepting an offer reserves capacity. Cancellation releases it and reruns matching while excluding the failed partner. Pickup report remains unverified until coordinator confirms quantity, which creates a verified impact record.

## Model boundary

Muse Spark is called only by an explicit intake action when configured. The user-authored note is treated as untrusted data; the API requests constrained structured output and the server validates enumerations and lengths. It creates a draft only; it cannot create a listing or send an offer. Human review is mandatory. No image is sent or analyzed.

## Authentication and deployment boundary

Role sessions are in-memory demo tokens; anyone can select any demo role. This is not secure authentication/RBAC. SQLite is local and intended for one server process; no hosted database, migration process, account isolation, or deployment hardening exists. Offer dispatch is local simulation, with no outbound messages.
