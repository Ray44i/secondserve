# Limitations and responsible-use boundary

- Single-user local demo with SQLite; no deployment, account isolation, production login, or secure RBAC.
- Food-finder profiles are stored only in local browser storage; they are not verified identities, secure accounts, or cloud-synced profiles. The free-text address is a private note, is not used for routing, and is never sent to the server or geocoded.
- The nearby food finder displays fictional businesses, products, prices, pickup windows, and pins; there is no real inventory, reservation service, or external business integration.
- OpenStreetMap supplies the map tiles. Distances are approximate straight-line estimates; there is no live geocoder or routing engine. Optional browser location stays in the tab and sorts sample pins. Tile requests reveal the displayed map area to the tile provider.
- Offer dispatch and external notifications are simulated.
- The optional model feature extracts text only. It does not inspect food or photos and cannot confirm safety.
- Business attestations and declared facts are unverified; coordinators and businesses must follow applicable local requirements.
- Date/storage rules are conservative product heuristics, not legal advice or regulatory certification.
- Split allocation is held for human review.
- Verified quantity is grouped by unit. The prototype does not calculate emissions or claim avoided waste.
- The fixed demo fixtures and scoring weights need field validation with recipient organizations.
