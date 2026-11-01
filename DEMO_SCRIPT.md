# SecondServe · three-minute hackathon demo

## Before recording

- Start the local server and confirm the header reports **Muse Spark · opt-in tools**. Do not show `.env`, API keys, billing, or personal account details.
- Use the existing sample cookie batch for checkout, or create a clearly labeled demo batch. Do not reset or delete local data just to prepare the video.
- For the photo segment, use a non-personal food image. Check the consent box only when you are ready to send it to Meta; the request may consume credits. Skip the segment if the request fails or the result is unclear.
- Rehearse role switching and confirm that the public repository is current. All offers, providers, quantities, locations, POS events, and orders shown here are demo data.

## Timed script

### 0:00–0:15 · The problem

**Say:** “Good food gets wasted when businesses cannot quickly account for what sold and route the rest to nearby people. SecondServe turns a daily leftover batch into a clear, reviewable pickup offer.”

**Show:** the SecondServe landing page and its local-demo disclosure.

### 0:15–0:55 · Provider + Meta AI

**Show:** enter as Provider, select a cookie photo, check consent, and click **Identify product & estimate count**. Pause on the actual Muse Spark result.

**Say:** “Muse Spark suggests the food and estimates only visible units. The provider checks the estimate and confirms the real batch; the model cannot see hidden stock or verify allergens, dates, or safety.”

**Show:** correct the product/count if needed; enter price, discount, pickup deadline, and provider-confirmed facts; attest and start the batch. Do not claim the AI verified any field.

### 0:55–1:20 · Track what remains

**Show:** record a simulated POS sale, point to opening quantity, sale, and remaining quantity, then click **Publish remaining stock now**.

**Say:** “Inventory uses explicit arithmetic: opening stock minus recorded sales and customer orders. The closeout offer publishes only the confirmed remainder at the provider’s selected discount.”

### 1:20–2:15 · Find a nearby offer

**Show:** switch to User, open the nearby map, click the cookie pin, and show the provider storefront, pickup location, approximate distance, pickup deadline, and active offers. Add the cookies to the basket.

**Say:** “People can inspect the provider’s nearby offers before choosing. The map and business records are sample data, and the distance is approximate.”

### 2:15–2:50 · Review checkout

**Show:** basket and payment review: quantity, regular price, savings, pickup fee, distance, and cutoff. Select a demo payment option and place the demo order only if the sample stock is ready to change.

**Say:** “Checkout shows the pickup details and savings. This prototype does not process payment; completing the demo order only updates sample inventory.”

### 2:50–3:00 · Close

**Say:** “SecondServe makes surplus easier to account for and discover while keeping people responsible for food facts and pickup. The public repository contains the prototype; none of these demo offers are live.”

**Show:** the project name and repository URL.

## Backup if photo analysis is unreliable

Skip the model call rather than showing a spinner or failed request. Explain that photo suggestions are an opt-in feature and continue with a prefilled demo batch. Do not label a typed or seeded result as live AI output.
