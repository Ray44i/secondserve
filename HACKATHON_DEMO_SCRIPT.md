# SecondServe — 3-minute demo

## Before recording

- Start the local app and confirm it loads at `http://127.0.0.1:4173/secondserve.html`.
- Use the prepared demo scenario. Do not reset or complete a batch you need later.
- One real `muse-spark-1.3` text extraction has been confirmed with fictional test facts. To make it visible to judges, enter the same fictional note in the Provider intake and click **Draft from note with Muse Spark** once during recording; that request may use credits. Do not imply the model verified a real batch.
- Do not show `.env`, keys, account billing pages, private addresses, or personal data.
- Keep the simulated checkout explicit. Do not suggest a real payment or pickup occurred.

## Timed walkthrough

### 0:00–0:18 — The problem and the promise

**Show:** SecondServe welcome screen, then the role selection.

**Say:** “Good food can go to waste while nearby people and community organizations could use it. SecondServe is a neighborhood surplus marketplace: providers list free or discounted food, nearby people find it, and rescue partners can take what a listing cannot reach. This prototype uses fictional Kadıköy records; it is not a live network.”

### 0:18–0:48 — AI drafts; provider stays responsible

**Show:** Provider → intake. Enter: “Fictional demo batch: 24 chocolate chip cookies prepared this morning, 6 sold, 18 remain. Pickup today at 8:00 PM. Storage ambient. No date or allergen facts stated.” Click **Draft from note with Muse Spark** once and pause on the returned draft and missing-facts list. The confirmed response extracted 18 pieces; that quantity was explicitly supplied in the note, not inferred from sales.

**Say:** “Muse Spark turns a provider’s note into a structured draft and flags missing fields. It does not create an offer, calculate stock from sales, or verify physical quantities, allergens, dates, freshness, or safe handling. The provider confirms the facts; deterministic rules handle stock and eligibility.”

### 0:48–1:15 — Inventory follows recorded sales

**Show:** Prepared batch ledger; record one simulated POS sale and point to the remaining quantity. Show the timed closeout or the safe ‘Publish remaining stock now’ demo action if the schedule is not due.

**Say:** “Stock accounting is deterministic: opening quantity minus recorded sales and customer pickups. At the provider’s release time, eligible leftovers become an offer at the provider’s chosen discount. There is no live POS connection in this prototype.”

### 1:15–1:45 — A neighbor finds nearby food

**Show:** User → Nearby food. Use the map/list, open the Golden Crust storefront, and show the offer, pickup area, time, and savings. Add one item and show the basket without submitting it.

**Say:** “The marketplace is designed for any neighborhood that has participating providers. Here the Kadıköy pins and offers are sample data; the map makes free and discounted food, stock, distance, and pickup time easy to compare.”

### 1:45–2:38 — Rescue coordination recovers a failed pickup

**Show:** Owner workspace → load the recovery scenario → run matching. Show the eligible recipient, then acceptance, cancellation, rerouting, and verified pickup. Use the prepared scenario rather than inventing a live partner.

**Say:** “SecondServe also supports partner rescue. The coordinator reviews eligible recipients, and if a pickup falls through, the system can reroute the offer. A cancellation alone does not count as impact; only the quantity recorded at verified pickup enters the rescued-food ledger.”

### 2:38–3:00 — Impact and close

**Show:** The new four-step impact journey, the verified impact ledger, and the public GitHub repository. Point out that the local demo data is simulated and that the ledger only counts quantities after pickup is verified.

**Say:** “SecondServe connects nearby discovery with a recovery path when pickup plans fail. Only a human-confirmed handoff belongs in the impact ledger. These quantities and partners are simulated in this prototype; we do not claim a real rescue yet. Thank you.”

## Recording checks

- Keep the cursor out of the way and browser zoom at a readable level.
- Rehearse once with a timer. If over three minutes, shorten the intro and narration; do not skip the pickup-verification step.
- Make sure the final video shows the product working, not slides alone.
- Review the export, then submit the video, project description, and public repository URL on the hackathon platform before the deadline.
