# CV platform submission copy — SecondServe

Use this as the project-description draft. Keep the video and repository links as separate form fields if the platform provides them.

## Project title

SecondServe

## One-line summary

SecondServe is a neighborhood food-surplus marketplace: providers share end-of-day food as free or discounted offers, nearby people and rescue partners find it, and impact counts only after pickup is verified.

## Project description

Good food is often discarded while nearby people and community organizations could use it. SecondServe is designed as a neighborhood marketplace that a local community could use to coordinate surplus from provider inventory to handoff. A provider records a morning batch and pickup window; sales reduce stock; the remaining food can appear as a free donation or discounted offer. Neighbors browse nearby listings, while a coordinator checks recipient constraints, sends an offer, and reroutes it if a pickup falls through. Only quantities confirmed at pickup enter the impact ledger. The current prototype demonstrates this idea with fictional Kadıköy records; it is not yet a live marketplace or a real impact pilot.

Meta Muse Spark is used as an opt-in assistant for extracting details from a provider note, suggesting visible product identity/count from a photo, and summarizing already-computed recipient matches for a coordinator. The model does not control inventory, eligibility, or dispatch and cannot verify hidden stock, ingredients, allergens, freshness, or food safety. A human reviews and confirms the information.

The prototype uses a local Node.js and SQLite backend with deterministic inventory accounting, eligibility checks, matching, reservation, cancellation recovery, and pickup-verification events. Businesses, recipients, distances, sale events, payment choices, and transactions are simulated. No real payment is taken and no live partner network or POS integration is connected.

## What is distinctive

The workflow treats a failed pickup as a recovery problem and separates a promised rescue from a verified one. This makes the impact story auditable: reported, offered, accepted, and actually collected quantities remain separate.

## Built with

Meta Muse Spark (opt-in multimodal and structured-text assistance), Node.js, SQLite, browser UI, and OpenStreetMap map tiles with simulated nearby locations.

## Links

- Public source repository: <https://github.com/Ray44i/tremoroom>
- Demo video: **Add the reviewed 3-minute video URL after recording and upload.**

## Claims to avoid

- Do not say that listed stores or recipient organizations are real partners.
- Do not say checkout charges a card or reserves real food.
- Do not claim measured food-waste, carbon, or health outcomes; the prototype does not have a validated baseline.
- Do not say AI verifies allergens, safety, freshness, or the full quantity available.
