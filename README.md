# SecondServe

**Surplus food, routed with care.** SecondServe is a solo-builder prototype of an AI-assisted food rescue coordinator with a nearby surplus board for donation and discounted-food discovery. It turns a reported batch into a traceable workflow: confirm facts, hold incomplete listings for human review, rank eligible recipient partners, simulate offers, recover from cancellation, and count food as rescued only after pickup quantity is verified.

## Run locally

Requires Node.js 22.9 or newer (the app uses Node's built-in SQLite module).

```sh
npm install
Copy-Item .env.example .env
npm start
```

Open <http://127.0.0.1:4173>. The SQLite demo database is created under ignored `data/`. Demo scenarios reset the active workflow when selected. Never commit `.env` or put an API key in browser code.

## Demo workflow

1. Choose **Find food nearby** to browse donation and discounted-food demo listings. Filter by offer type, food category, and distance radius; inspect the OpenStreetMap view. Create a food-finder profile to rank listings by neighborhood, preferred categories, and offer type. The optional address note stays in local browser storage and is not geocoded or sent to the server.
2. Choose **Rescue coordinator** and load the recovery scenario.
3. Run the decision agent and review its hard constraints, candidate ranking, and exclusions.
4. Dispatch the first offer. Switch to **Recipient partner**, choose Charity A, accept, then cancel it.
5. Switch back to coordinator: the reservation is released and the recovery agent routes a replacement offer to Community Kitchen B.
6. Accept the replacement, report a pickup as the recipient, and verify a quantity as coordinator. Only that verified quantity enters the impact ledger.
7. Try the review scenario to see incomplete handling facts blocked from automatic matching.

Offers and partner registry data are simulated; no outside organizations are contacted.

## Meta Muse Spark intake

Set `MODEL_API_KEY` in local `.env` and `SECONDSERVE_MODEL_ENABLED=true`. The optional intake action sends the note entered by the user to Meta Muse Spark and returns a structured **draft**. It never creates a listing or offer. Review every field; missing dates, handling conditions, allergens, and safety facts must remain unknown until a human confirms them. No other model request is made implicitly.

## Data and safety boundaries

- This is a single-process local prototype backed by SQLite, not a deployed multi-user service.
- Login roles are demo role selectors, not authentication or production RBAC.
- Food-finder profiles are stored in this browser only. The neighborhood sets an approximate map center; the address field is a private note and is not used for routing.
- Nearby businesses, products, prices, pickup windows, recipient records, verification badges, coordinates, capacity, and availability are fictional demo fixtures. OpenStreetMap provides real map tiles, but there is no live business inventory, geocoder, or booking flow. Location sorting is approximate; the location is kept in the current tab.
- Notifications are simulated. No recipient receives an actual email, SMS, or push message.
- Photos and image-based food inspection are not implemented. The intake model is text-only.
- Split allocation requires coordinator review.
- Rules are conservative product heuristics, not legal, food-safety, or regulatory certification. A qualified business/coordinator remains responsible for applicable local requirements and handoff.
- Impact shows food quantities grouped by unit and verified pickup count. It does not estimate emissions or claim waste avoided without a defensible baseline.

## Checks

Run `npm test` for the domain, safety-gate, matching, reservation, cancellation, pickup-verification, and impact-unit tests. This does not validate food-safety outcomes, model accuracy, deployment security, or external partner operations.

## Hackathon fit

The supplied judging rubric weights Impact 30%, Meta AI tooling 25%, Demo 25%, Technical depth 20%. SecondServe demonstrates a complete, reviewable rescue-state workflow, uses Muse Spark for optional structured intake, explains safety holds, and keeps verified impact auditable. It is a prototype; the limitations above should be stated in the demo rather than hidden.
