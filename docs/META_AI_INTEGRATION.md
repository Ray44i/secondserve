# Meta AI integration

SecondServe's Meta Model API integration is controlled by `SECONDSERVE_MODEL_ENABLED=true` and the server-side `MODEL_API_KEY` in local `.env`. The key is never sent to browser code. The current local status endpoint reports the model tools as enabled; this configuration check does not prove that a live request will succeed.

All requests require an explicit action:

- **Structured text intake:** Muse Spark drafts only facts stated in a provider's note. The server validates constrained output; the draft does not create a listing.
- **Food-photo draft:** After selecting a resized food image, the provider must check the consent box and click the analysis button. Muse Spark may suggest visible food identity/category and countable units in frame. The provider reviews the suggestion. It cannot infer off-frame stock, ingredients, allergens, dates, freshness, handling, or safety.
- **Coordinator brief:** Muse Spark explains already-computed deterministic match results for human review. It cannot change eligibility, score candidates, release holds, or dispatch offers.

The photo request may consume hackathon credits. Use a non-personal image for rehearsal. If the model call fails or its output is unclear, skip it in the recorded demo and never describe a seeded result as live AI output.

Never commit `.env`, expose API keys, send private business data without authorization, or present model output as verified food-safety information.
