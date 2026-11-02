# SecondServe — hackathon readiness snapshot

**Reviewed:** November 2, 2026  
**Hackathon deadline shown in the event materials:** November 4, 9:00 PM ET (November 5, 5:00 AM Istanbul time)

This is a status snapshot, not a promise of a judging score. The event rubric scores **Impact 30%, Meta AI tooling 25%, Technical depth 20%, and Demo 25%**.

## Where the project stands

SecondServe is a solo-builder, local prototype for coordinating surplus food from a provider batch through inventory reconciliation, nearby discovery, partner matching, cancellation recovery, and pickup verification. The central idea is that a reservation or match is not counted as impact; only the quantity a coordinator records at handoff appears in the verified ledger.

### Prototype workflow

| Area | Status | What is implemented | Important boundary |
| --- | --- | --- | --- |
| First impression and roles | Working demo | Branded landing page and separate User and Provider paths; owner controls stay out of public role selection | Role selection is a demo switch, not secure login or production RBAC |
| Nearby food | Working demo | Map, categories, free and discounted filters, approximate radius, profile-based recommendations, store details, and basket | Fictional businesses and offers; approximate location; no real reservation network |
| Household donations | Working demo | Users can post food as a free donation and share a food photo | Local prototype only; no verified recipient or real handoff |
| Provider inventory | Working demo | Morning batch, explicit photo consent for AI suggestions, separate shopper-photo consent, sale events, remaining-stock calculation, and scheduled closeout | POS sales are simulated; no register integration |
| Meta Muse Spark | Integrated, needs a clean demo | Opt-in photo intake, text intake, and an optional coordinator brief | AI output is advisory; a real call may use credits; provider must confirm facts |
| Rescue coordinator | Working simulated scenario | Deterministic eligibility checks, weighted matching, offer response, cancellation recovery, and verified-pickup ledger | Sample partners, capacities, distances, and messages are simulated |
| Checkout | Demo flow | Basket, pickup details, simulated payment choice, and order receipt | No payment is collected and no real booking is made |
| Impact story | Improved in this update | A visual four-step journey now explains report → checks → route/recover → verified handoff | No CO₂ or waste-saved estimate is claimed without a defensible baseline |

The project code is not production-ready by design: it uses a local SQLite database, simulated organizations and transactions, and demo role selectors. Describe it as a prototype in the video and submission.

## Final scope decision for the deadline

- **Product story:** a neighborhood surplus marketplace that communities can adopt; households and providers offer free or discounted surplus, nearby people discover it, and rescue partners can receive eligible offers.
- **What this build proves:** the end-to-end workflow in a Kadıköy sample network, including consented Meta AI drafting, deterministic inventory/matching rules, cancellation recovery, and pickup verification.
- **What this build does not claim:** live partner participation, public multi-user accounts, card payment, live POS, or a real rescue event. These require external people, accounts, and deployment; adding rushed mock integrations would not make the impact real.
- **Final call:** stop feature expansion. Record the clear three-minute story, label all sample outcomes, and submit the public repo plus video and CV form before the deadline. Only add a real impact claim if a consenting provider and recipient complete and verify a real pickup.

## Evidence against the judging rubric

These are conservative **readiness estimates**, not predictions of the judges’ scores. They reflect the evidence currently prepared for submission, including that the final video is not recorded yet.

| Criterion | Weight | Readiness now | Strongest evidence | What raises it next |
| --- | ---: | ---: | --- | --- |
| Impact | 30% | 6/10 | Surplus discovery, free donations, partner rescue, recovery after cancellation, and verified pickup accounting | Tell one concrete end-to-end story and explain why verified handoff is the impact measure; avoid unsupported savings claims |
| Meta AI tooling | 25% | 6/10 | Muse Spark text/photo drafts and an advisory coordinator brief are integrated; a real Muse Spark text extraction succeeded on Nov 2 using explicitly fictional test facts | Capture the user-visible flow in the video, then show human review and state what the model cannot verify |
| Technical depth | 20% | 7/10 | Local backend and SQLite, stock reconciliation, safety/eligibility gates, matching, reservations, recovery, and impact events | Show the same batch moving through the system; clearly identify simulated POS, data, and payments |
| Demo | 25% | 3/10 | The local workflow and a timed 3-minute script exist | Create, review, and upload the actual 3-minute video; rehearse once and keep it within the event limit |

The current evidence-weighted readiness estimate is about **55/100**. The demo score is low because the actual video is missing. This is not an official judge score or a guarantee of ranking.

### Confirmed Meta AI interaction (Nov 2)

One real `muse-spark-1.3` request through the SecondServe backend returned a structured draft from a deliberately fictional note. It extracted “chocolate chip cookies,” `18 pieces`, bakery, ambient storage, “this morning,” and an 8:00 PM pickup time. It returned allergens, condition, date, and preference as unknown/missing. The note itself already stated that 18 pieces remained; the model did **not** calculate 24 produced minus 6 sold. This request created no listing and changed no impact totals. No photo was sent. For judging evidence, reproduce the request once through the visible provider UI if you choose to show it on video; that separate request may use credits.

## Submission checklist

The event slide you shared says to submit three things by the deadline:

- **Public GitHub repo:** ready at <https://github.com/Ray44i/tremoroom>. The latest UI and photo-offer changes are committed on `main`.
- **Three-minute demo video:** not recorded or uploaded yet. The narration and shot plan are in [HACKATHON_DEMO_SCRIPT.md](HACKATHON_DEMO_SCRIPT.md).
- **CV platform submission:** not verified. Open the event submission page and submit the project there, including every teammate. Since you are submitting solo, confirm your own participant entry is included.

## Next actions, in order

1. **Fresh cookie demo offer is staged locally.** It uses your cookie photo and fictional demo data: four opening pieces, three simulated POS sales, one piece remaining, ₺45 regular price / ₺31.50 demo price, with pickup by November 3 at 8:00 PM Istanbul time. The earlier expired batch remains unchanged. This is not a real sale or a claim that real food is available.
2. **Rehearse the recovery story.** Load the cancellation recovery scenario, run matching, show the fallback recipient, and record the verified pickup. Use only the prepared demo scenario.
3. **Show Meta AI once if ready.** Use a non-sensitive product photo, read the consent text on camera, make one request only, review/correct the draft, and never show the API key or billing page. If the API is unavailable, explain that the call is optional; do not pretend a model response occurred.
4. **Record the video.** Follow the 3-minute timing in the script. Show the product working, state the simulated boundaries, review the export, and upload it.
5. **Submit on the CV platform.** Enter the project description, video, public repo URL, and your participant/team details. Confirm the platform shows a submitted/complete status before the deadline.

## Recommended 3-minute story

**Problem:** good food becomes waste while people nearby may need it.  
**Product:** providers report a batch; sales reduce stock; people browse free or discounted food; coordinators match eligible partners.  
**Distinctive moment:** the first pickup cancels, so the coordinator reroutes the offer rather than counting a failed handoff as success.  
**AI role:** Muse Spark can draft visible product facts; a human confirms them. Deterministic rules control stock and eligibility.  
**Impact proof:** only pickup-verified quantities count. All people, businesses, distances, and transactions in the demo are simulated.
