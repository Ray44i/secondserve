# SecondServe — 3-minute demo

## Before recording

- Start the local app and confirm it loads at `http://127.0.0.1:4173/secondserve.html`.
- Use the prepared demo scenario. Do not reset or complete a batch you need later.
- If showing Muse Spark, verify the local setting is enabled and the consent screen is visible. Make one deliberate request only; it may consume credits. If it fails, show the clearly labeled prepared sample and say the model call is optional.
- Do not show `.env`, keys, account billing pages, private addresses, or personal data.
- Keep the simulated checkout explicit. Do not suggest a real payment or pickup occurred.

## Timed walkthrough

### 0:00–0:20 — The problem and the promise

**Show:** SecondServe welcome screen, then the role selection.

**Say:** “Good food is thrown away while people nearby could use it. SecondServe gives providers a simple way to account for surplus, then routes what remains to nearby people or community partners. This is a working local prototype; the network and transactions shown here are simulated.”

### 0:20–0:55 — Provider creates a reliable batch

**Show:** Provider → Inventory & closeout. Select the cookie photo. If the API is enabled and you are comfortable using credits, separately consent and request the Muse Spark product/count suggestion. Opt in to show the actual provider photo on the nearby offer. Pause on the review step.

**Say:** “Muse Spark can suggest the visible product and estimate countable items in-frame. The provider reviews the suggestion and confirms the real batch. The model cannot see hidden stock or verify ingredients, allergens, freshness, or safe handling.”

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

**Show:** Impact summary and the public GitHub repository.

**Say:** “The goal is to make surplus measurable and recoverable, from provider inventory to verified handoff. This prototype demonstrates that workflow with opt-in Meta AI assistance, deterministic inventory rules, and a human-confirmed rescue process. Thank you.”

## Recording checks

- Keep the cursor out of the way and browser zoom at a readable level.
- Rehearse once with a timer. If over three minutes, shorten the intro and narration; do not skip the pickup-verification step.
- Make sure the final video shows the product working, not slides alone.
- Review the export, then submit the video, project description, and public repository URL on the hackathon platform before the deadline.
