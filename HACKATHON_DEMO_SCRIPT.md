# SecondServe — 3-minute demo

## Before recording

- Start the local app and confirm it loads at `http://127.0.0.1:4173/secondserve.html`.
- Use the prepared demo scenario. Do not reset or complete a batch you need later.
- One real `muse-spark-1.3` text extraction has been confirmed with fictional test facts. To make it visible to judges, enter the same fictional note in the Provider intake and click **Draft from note with Muse Spark** once during recording; that request may use credits. Do not imply the model verified a real batch.
- Do not show `.env`, keys, account billing pages, private addresses, or personal data.
- Keep the simulated checkout explicit. Do not suggest a real payment or pickup occurred.

## Timed walkthrough

### 0:00–0:20 — The problem and the promise

**Show:** SecondServe welcome screen, then the role selection.

**Say:** “Good food is thrown away while people nearby could use it. SecondServe gives providers a simple way to account for surplus, then routes what remains to nearby people or community partners. This is a working local prototype; the network and transactions shown here are simulated.”

### 0:20–0:55 — Provider creates a reliable batch

**Show:** Provider → intake. Enter: “Fictional demo batch: 24 chocolate chip cookies prepared this morning, 6 sold, 18 remain. Pickup today at 8:00 PM. Storage ambient. No date or allergen facts stated.” Click **Draft from note with Muse Spark** once and pause on the returned draft and missing-facts list. The confirmed response extracted 18 pieces; that quantity was explicitly supplied in the note, not inferred from sales.

**Say:** “Muse Spark turns a provider’s note into a structured draft and flags missing fields. It does not create an offer, calculate stock from sales, or verify physical quantities, allergens, dates, freshness, or safe handling. The provider confirms the facts; deterministic rules handle stock and eligibility.”

### 0:55–1:20 — Inventory follows actual sales

**Show:** Prepared batch ledger; record one simulated POS sale and point to the remaining quantity. Show the timed closeout or the safe ‘Publish remaining stock now’ demo action if the schedule is not due.

**Say:** “Stock accounting is deterministic: opening quantity minus recorded sales and customer pickups. At the provider’s release time, eligible leftovers become an offer at the provider’s chosen discount. There is no live POS connection in this prototype.”

### 1:20–1:55 — A neighbor finds and reviews food

**Show:** User → Nearby food. Use the map/list, open the Golden Crust storefront, and show the offer, pickup area, time, and savings. Add one item and show the basket without submitting it.

**Say:** “A neighbor can compare free donations and discounted food, inspect the provider’s other offers, and review pickup details before continuing. Short distances are demo estimates based on the selected area.”

### 1:55–2:35 — Rescue coordination handles a failed pickup

**Show:** Owner workspace → load the recovery scenario → run matching. Show the eligible recipient, then acceptance, cancellation, rerouting, and verified pickup. Use the prepared scenario rather than inventing a live partner.

**Say:** “SecondServe also supports partner rescue. The coordinator reviews eligible recipients, and if a pickup falls through, the system can reroute the offer. A cancellation alone does not count as impact; only the quantity recorded at verified pickup enters the rescued-food ledger.”

### 2:35–3:00 — Impact and close

**Show:** The new four-step impact journey, the verified impact ledger, and the public GitHub repository. Point out that the local demo data is simulated and that the ledger only counts quantities after pickup is verified.

**Say:** “The goal is to make surplus measurable and recoverable, from provider inventory to verified handoff. This prototype demonstrates that workflow with opt-in Meta AI assistance, deterministic inventory rules, and a human-confirmed rescue process. Thank you.”

## Recording checks

- Keep the cursor out of the way and browser zoom at a readable level.
- Rehearse once with a timer. If over three minutes, shorten the intro and narration; do not skip the pickup-verification step.
- Make sure the final video shows the product working, not slides alone.
- Review the export, then submit the video, project description, and public repository URL on the hackathon platform before the deadline.
