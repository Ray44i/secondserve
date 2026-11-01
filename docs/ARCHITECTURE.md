# SecondServe architecture

## Runtime

Node.js 22.9+ serves a browser-native interface and JSON API. `server.mjs` owns a local SQLite `DatabaseSync` instance and keeps the Meta API key server-side. Domain transitions live in `secondserve-domain.mjs`; schema is in `secondserve-schema.sql`. The application is a local, single-process demo.

## Data and transitions

Organizations and recipient profiles are seeded fictional fixtures. Listings have explicit date type, storage, condition, allergens, attestation, location, deadline, and preference fields. The decision agent first checks hard eligibility/safety constraints, then ranks remaining candidates. Accepting an offer reserves capacity. Cancellation releases it and reruns matching while excluding the failed partner. Pickup report remains unverified until coordinator confirms quantity, which creates a verified impact record.

## Model boundary

Muse Spark is called only after an explicit user action when configured. Text and food-photo outputs are advisory drafts; the user must review and confirm every business fact. Photo analysis can suggest visible food identity and countable units, but cannot see hidden stock or verify ingredients, allergens, freshness, handling, or safety. A coordinator brief may explain deterministic match results but cannot change eligibility or dispatch an offer. Each model request may consume credits.

Provider batches reconcile opening stock minus recorded POS sales and customer purchases. The local closeout scheduler publishes eligible leftovers; the provider can also publish remaining stock immediately for the demo. Customers can open a provider storefront, add an offer to a browser-memory basket, and complete a simulated checkout. The purchase mutation reduces sample inventory, but no payment is processed and no pickup is guaranteed.

## Authentication and deployment boundary

Role sessions are in-memory demo tokens; anyone can select any demo role. This is not secure authentication/RBAC. SQLite is local and intended for one server process; no hosted database, migration process, account isolation, or deployment hardening exists. Offer dispatch is local simulation, with no outbound messages.
