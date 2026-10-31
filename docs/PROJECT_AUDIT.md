# SecondServe project audit

Audit date: 2026-10-31.

## Current build

- Root app is SecondServe, a solo food-surplus rescue coordination prototype.
- Browser UI: `secondserve.html`, `secondserve.css`, `secondserve.js`.
- Nearby food board with donation/discount/category/radius filters and OpenStreetMap map pins. The listings and pins are fictional demo data.
- Node server: `server.mjs`; data: Node built-in SQLite in ignored `data/secondserve.sqlite`.
- Domain: `secondserve-domain.mjs`; schema: `secondserve-schema.sql`.
- Optional structured intake draft uses Muse Spark only after explicit user action and requires `SECONDSERVE_MODEL_ENABLED=true` and a server-side key.
- Domain tests are in `tests/secondserve.test.mjs`.

## Implemented workflow

Constrained intake, human-review safety holds, eligibility and weighted ranking, simulated offer dispatch, acceptance capacity reservation, cancellation release and recovery reroute, recipient pickup report, coordinator quantity verification, and verified impact ledger. Database mutations use SQLite transactions. Impact quantities are grouped by unit.

## Confirmed prototype limits

Demo role selection is not authentication or secure RBAC. Recipients, marketplace listings, prices, registry status, capacities, availability, and coordinates are fictional. OpenStreetMap supplies the basemap; there is no live business inventory, geocoding, booking, or route calculation. Dispatch and notifications are simulated. There is no image analysis, external partner integration, hosted deployment, emissions model, or automated split allocation. Safety heuristics are not certification or legal advice.

## Submission checks to complete

Check that the public repository opens logged out; record an honest three-minute demo showing the cancellation and verified-pickup path; submit the repository, video, and CV platform form before the organizer's deadline. The deadline copied from the participant portal screenshots is Wednesday Nov 4 at 9:00 PM ET; verify the live portal because event dates may change.
