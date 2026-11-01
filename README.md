# SecondServe

**Surplus food, routed with care.** SecondServe is a solo-builder prototype of an AI-assisted food rescue network. Providers can use an opt-in product photo to draft a visible item count, confirm the batch, and let sale events reconcile stock; a local scheduler releases eligible leftovers to the nearby board at the provider's chosen time and discount. Customers can browse the offer and simulate a pickup purchase. The prototype also coordinates recipient-partner rescues, recovers from cancellations, and counts food as rescued only after pickup quantity is verified.

## Run locally

Requires Node.js 22.9 or newer (the app uses Node's built-in SQLite module).

```sh
npm install
Copy-Item .env.example .env
npm start
```

Open <http://127.0.0.1:4173>. The SQLite demo database is created under ignored `data/`. Demo scenarios reset the active workflow when selected. Never commit `.env` or put an API key in browser code.

## Demo workflow

1. Choose **Provider** and create a morning batch. If demonstrating Meta AI, select a food photo, review the consent text, check consent, and explicitly click **Identify product & estimate count**. Review or correct the draft; AI does not verify the full batch or food-safety facts.
2. Enter price, discount, pickup deadline, handling/date/allergen facts, confirm the provider attestation, and start the batch.
3. Record a simulated POS sale. The provider ledger shows remaining units. Use **Publish remaining stock now** for a live demo, or let the local scheduler publish at the chosen closeout time.
4. Switch to **User**. Click a listing or map pin to view the provider storefront and its active offers, then add a product to the basket.
5. Review approximate distance, pickup deadline, savings, and the demo payment status. Completing checkout creates a simulated reservation and updates sample inventory; it does not take payment or guarantee a real pickup.
6. For the separate rescue-coordination story, open the **Owner workspace**, load the recovery scenario, run matching, then show acceptance, cancellation, rerouting, and pickup verification. Only verified quantities enter that impact ledger.

## Provider closeout loop

1. Choose **Provider** and enter a morning batch. A resized photo can optionally ask Muse Spark to suggest the product/category and estimate countable units visible in-frame; it prefills the quantity and unit when confidence is medium or high. Confirm that the photo shows the complete morning batch. The visual estimate cannot include hidden/off-frame stock or verify safety. Add the price, pickup deadline, and provider-confirmed handling/date/allergen facts.
2. In the prototype, use **Record sale event** to simulate a POS sale. A real POS connector would send these idempotent sale events automatically; no register vendor is connected here.
3. The local server runs the 21:00 Istanbul closeout. It reconciles opening stock minus POS sales, then adds the remaining eligible quantity to the nearby discounted offers. Restarting the server also runs any missed closeout.
4. Choose **User** to see the offer. Open its storefront, add it to the basket, and continue through the clearly labeled demo checkout. Completing the order reduces the same inventory count; it does not take payment or create a real booking.

The scheduler uses deterministic stock math; Muse Spark is not asked to infer sales or inventory. Unknown allergens, unconfirmed handling, expired pickup windows, or missing provider attestation prevent the batch from being listed automatically.

## Household free donations

From the **User** dashboard, choose **Donate leftover food**. Household posts are donation-only (the server forces the preference to `donation`), require the donor to confirm declared allergen, date, storage, condition, and pickup details, and appear on the nearby board while active. The Admin demo can evaluate them for recipient partners. Use a neighborhood or public pickup point only; do not enter a home address or private contact details. Household posts remain in the local demo database; there is no real public network, contact exchange, or pickup booking.

Offers and partner registry data are simulated; no outside organizations are contacted.

## Meta Muse Spark tooling

Set `MODEL_API_KEY` in local `.env` and `SECONDSERVE_MODEL_ENABLED=true`. SecondServe uses Muse Spark in three explicit, bounded steps:

- **Structured text intake:** a donor can ask Muse Spark to extract only facts stated in a business note. It creates an editable draft, never a listing or offer.
- **Multimodal photo intake:** after choosing an image, the provider must check consent and click Analyze; this may use credits. The browser resizes the image before sending it to Meta. The model suggests visible food identity/category and may estimate separable, visible units to prefill the opening quantity. It cannot infer the full batch from hidden or off-frame items, ingredients, allergens, freshness, handling, safety, or eligibility. The provider reviews and confirms every field before creating a batch; no listing is created by image analysis alone.
- **Coordinator brief:** after deterministic eligibility checks, a coordinator may ask Muse Spark to explain the already-computed result and suggest questions to verify. It cannot change scores, recommend excluded recipients, release a safety hold, or dispatch an offer.

No model request is made implicitly. Every generated result is advisory and must be reviewed by a person. Requests may consume Meta Model API credits. The app sends the text or resized image only after the corresponding explicit action. Never commit `.env` or publish API keys.

## Data and safety boundaries

- This is a single-process local prototype backed by SQLite, not a deployed multi-user service.
- Login roles are demo role selectors, not authentication or production RBAC.
- Food-finder profiles are stored in this browser only. The neighborhood sets an approximate map center; the address field is a private note and is not used for routing.
- Nearby businesses, products, prices, pickup windows, recipient records, verification badges, coordinates, capacity, and availability are fictional demo fixtures. OpenStreetMap provides real map tiles, but there is no live business inventory, geocoder, or booking flow. Location sorting is approximate; the location is kept in the current tab.
- Provider batches, point-of-sale events, evening offers, and customer purchases are also simulated; the app has no real POS, payment, or marketplace integration. The local scheduler must be running or restarted to publish at closeout time.
- Notifications are simulated. No recipient receives an actual email, SMS, or push message.
- Food-photo suggestions and coordinator briefs are AI-generated and can be wrong; neither is a safety inspection or an authority for handling decisions.
- Split allocation requires coordinator review.
- Rules are conservative product heuristics, not legal, food-safety, or regulatory certification. A qualified business/coordinator remains responsible for applicable local requirements and handoff.
- Impact shows food quantities grouped by unit and verified pickup count. It does not estimate emissions or claim waste avoided without a defensible baseline.

## Checks

Run `npm test` for the domain, safety-gate, matching, reservation, cancellation, pickup-verification, and impact-unit tests. This does not validate food-safety outcomes, model accuracy, deployment security, or external partner operations.

## Hackathon fit

The supplied judging rubric weights Impact 30%, Meta AI tooling 25%, Demo 25%, Technical depth 20%. SecondServe demonstrates an end-to-end simulated rescue and uses Muse Spark for structured text extraction, consented multimodal image understanding, and a coordinator brief grounded in deterministic match results. Keep the demo centered on those bounded model roles, human review, recovery after cancellation, and verified pickup impact. It is a prototype; state the limitations above clearly.
