# FactorySight Master Plan

## Goal and deadline

Create a credible solo-entry prototype for the Meta Global AI Developer Hackathon by the Nov 4, 2026 9:00 PM ET deadline. The public organizer information supplied by the user gives rubric weights of Impact 30%, Meta AI tooling 25%, Demo 25%, and Technical depth 20%; recheck the participant portal before submission.

## Scope decision

Keep the current dependency-free Node.js server and browser-native UI. Do not add Next.js, FastAPI, PostgreSQL or cloud storage under the remaining time unless a concrete deployment or account need appears. This MVP is a local inspection workstation, not a production factory quality system.

## Architecture

- Browser: responsive multi-panel dashboard; paired images; local image-difference view; candidate model observations; human review controls; locally stored demo inspections; browser print-to-PDF report.
- Node server: static app, validation, safe errors, timeouts, and server-side Meta requests using the existing private `MODEL_API_KEY`.
- Meta Muse Spark: identify visible part/features and propose candidate observations from paired photos. Keep observed evidence, potential issue, and unknowns distinct. Never mark a defect confirmed.
- Meta SAM 3.1: optional promptable component/region segmentation behind a separate user action and feature flag; parse only with the official Meta SAM parser. Do not imply segmentation detects defects.
- Comparison engine: browser Canvas computes a side-by-side/overlay/difference image after image dimension checks. Treat differences as review cues, not proof; initial demo should control angle, distance and lighting.
- Storage: browser localStorage for non-sensitive metadata and decisions; images held in memory only and cleared when the page closes. No database or uploaded image persistence in this deadline MVP.

## MVP workflow

1. Start an inspection with product ID, profile, optional note, reference image, and inspected image.
2. Validate MIME, byte size, decoded dimensions and image readability in browser and server.
3. Show aligned side-by-side images and a transparent local difference overlay.
4. On explicit consent and click, send only resized chosen images to Muse Spark; return schema-validated observations with uncertainty.
5. Optionally segment the bracket with SAM 3.1 only after a successful documented parser integration.
6. Create findings with status `pending review`; deterministic code controls transitions.
7. Inspector confirms, rejects or marks uncertain and can add a comment; preserve timestamped local history.
8. Print a report that clearly separates AI suggestions, algorithmic difference cues and human decisions.

## Data model (local MVP)

`inspections`: id, productId, productType, profile, createdAt, status, referenceImageName, inspectionImageName, note.

`findings`: id, inspectionId, category, description, normalizedBox, source (`model`, `difference`, `human`), uncertainty, status, createdAt.

`reviews`: id, findingId, decision, comment, reviewerLabel, createdAt.

Store only JSON metadata in localStorage. Keep raw images in memory and do not persist them.

## API design

- `GET /api/factorysight/status`: feature flags and model ID labels only.
- `POST /api/factorysight/analyze`: validates paired image data URLs and profile; sends user-provided images to Muse Spark only after explicit user action/consent; returns strict structured candidate observations.
- `POST /api/factorysight/segment` (optional): invokes SAM 3.1 streaming response for a supplied image and noun-phrase prompt; official parser validates geometry before response.
- No API for findings/reviews in the deadline MVP; these remain local.

## Implementation sequence

1. Create repository audit and this plan; confirm official API support (complete).
2. Build the FactorySight page and inspection form.
3. Implement local image validation, side-by-side view, and difference overlay.
4. Add safe Muse Spark adapter and structured response validation; do not make model requests without explicit user action.
5. Add deterministic finding/review states and local history.
6. Add print report and accessible loading/error/empty states.
7. Probe and add SAM 3.1 only if the official parser can be installed and a real response is confirmed within time.
8. Add tests, run them, document true results/limitations, prepare 3-minute demo and submission description.

## Testing strategy

- Unit tests: image data URL and size validation; schema validation; human-review transitions; image difference math on tiny synthetic images; report field separation.
- Integration: server status and malformed/disabled requests do not leak secrets; successful calls only with user consent.
- AI evaluation: small disclosed sample set with manually recorded observations; no performance claims or invented metrics. If time/data permit, publish the actual image count and failure examples.

## Demo strategy

Use a controlled, well-lit fixed-camera pair of actual bracket images provided or approved by the user. Show normal first, then a visibly marked difference, inspect a candidate, make a human decision, and print a report. If real images or successful Meta output are unavailable, label every asset and output as synthetic/demo and do not claim an AI result.

## File plan

- `factorysight.html`, `factorysight.css`, `factorysight.js`: product UI.
- `server.mjs`: narrowly scoped FactorySight API routes and static MIME types.
- `docs/PROJECT_AUDIT.md`, `docs/MASTER_PLAN.md`, `docs/ARCHITECTURE.md`, `docs/API_DOCUMENTATION.md`, `docs/EVALUATION_REPORT.md`, `docs/KNOWN_LIMITATIONS.md`, `docs/DEMO_SCRIPT.md`, `docs/SUBMISSION_DESCRIPTION.md`.
- `.env.example`: blank flags and model labels; never include credentials.

## Risks and release gate

- No actual SAM availability or response has been demonstrated; do not claim SAM integration until probed.
- Muse output is a candidate observation, not defect truth.
- Pixel difference reacts to lighting, angle, scale, and camera movement; show its parameters and never call it a defect detector.
- Human decision remains authoritative. No compliance/safety certification.
- Before publishing, inspect the staged file list and confirm `.env`, private photos, and `tmp/` are excluded.
- Required external tasks: the user supplies/approves component photos; user records video; user completes the hackathon submission.

## Build status (2026-10-31)

- Complete: repository audit; FactorySight UI; validated paired image uploads; local side-by-side/overlay/difference views; consent-gated Muse Spark structured analysis; SAM 3.1 streaming segmentation parsed with the official Meta library; human review decisions/history; local metadata history; print report; server-side image validation; submission documentation; 5 automated tests passing.
- Verified API smoke probes on a public bracket photo: Muse Spark endpoint returned HTTP 200 with 0 findings when the exact same image was supplied twice; SAM 3.1 returned HTTP 200 with 1 box and 1 mask. This confirms connectivity/parser operation, not product-level accuracy.
- Remaining: visual browser QA; run through the consented UI with a user-approved reference/defect pair; evaluate real model output/failure cases; rename/update the GitHub repository and About text; record the final video; submit.
- SAM segmentation button is separate from Muse analysis and explicitly warned as a credit-using request. Both features remain gated by local server flags and the UI consent checkbox.
