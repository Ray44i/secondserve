# FactorySight Repository Audit

Audit date: 2026-10-31

## Current architecture

- A dependency-free Node.js 20 HTTP server (`server.mjs`) serves static files from the repository and exposes a small set of Meta Model API proxy endpoints.
- The UI is plain HTML, CSS and browser JavaScript. The root page is Tremoroom; `forkcast.html` is an earlier prototype. There is no framework build step.
- The server reads ignored `.env` settings. It holds API credentials server-side and reports only feature-enabled booleans at `/api/status`.
- Existing Meta integration: `POST /api/analyze-room` sends a resized user photo to Muse Spark through the OpenAI-compatible Chat Completions endpoint, parses bounded JSON observations and returns sanitized errors. `POST /api/extract` supports a text-only Forkcast extraction path.
- The local status endpoint currently reports Tremoroom vision enabled and Forkcast extraction disabled. This confirms configuration presence, not successful model access. No inspection request has been made during this audit.

## Existing functionality

- Tremoroom: local role-picker demo, illustrative room animation, checklist counts, consent-gated photo analysis, locally generated printable action card.
- Forkcast: earlier food-donation coordination prototype with a server-backed extraction feature.
- README, demo script, runbook and hackathon checklist for Tremoroom.

## Missing for FactorySight

- No FactorySight UI, factory inspection workflow or reference-versus-inspected product comparison.
- No SAM 3.1 adapter or mask parsing/rendering.
- No image alignment, normalization, or difference visualization.
- No inspection rules, finding lifecycle, reviewer history, dashboard, or PDF inspection report.
- No database, object storage, migrations, real login/RBAC, persistent server-side inspection history, dataset, ground truth, or evaluation.
- No test script or automated test suite; `package.json` only defines `npm start`.
- No factory component images are currently included in the repository.

## Dependencies and configuration

- Node.js >=20; no installed application dependencies are declared.
- `.env` exists locally and is ignored. Its contents were not read or copied. `.env.example` currently documents the Tremoroom/Forkcast flags and blank `MODEL_API_KEY`.
- No configured SQL database or object-storage service is present.
- The app currently binds to loopback (`127.0.0.1`), so it is a local prototype rather than a hosted service.

## Verified Meta API capabilities

Official Meta Model API documentation (reviewed 2026-10-31) documents:

- Muse Spark model ID `muse-spark-1.3`; image understanding accepts a base64 data URL in a user message using Chat Completions or Responses.
- SAM 3.1 model ID `sam-3.1`; segmentation runs through `POST https://api.meta.ai/v1/responses` and streams box/mask geometry for a text concept plus image. Meta's cookbook uses the official `@meta-sam/parser` package for segmentation output; the app must not invent its own parser.
- Official docs describe SAM masks as geometry, not defect classification. Segmentation alone cannot establish a defect.

References: [Meta Model API image understanding](https://dev.meta.ai/docs/image-understanding), [Meta media segmentation](https://dev.meta.ai/docs/media-segmentation), [Meta SAM API basics](https://dev.meta.ai/docs/cookbook/sam-api-basics), [Meta API reference](https://dev.meta.ai/docs/api-reference).

## Risks

- The pasted prompt requests a production-sized system (database, object storage, SAM segmentation, OpenCV alignment, audit history, PDF, a 40-image benchmark) while the submission deadline is only days away. Implementing all of that responsibly in the current stack is not credible.
- FactorySight has no component imagery or agreed inspection tolerance/profile, so pixel differences and defect labels cannot be validated as real industrial quality decisions.
- No evidence yet that this account can successfully call SAM 3.1 or that any model output is reliable for manufacturing defects.
- Existing live repository is publicly presented as Tremoroom. A full pivot requires updating the public repository, README, product identity and submission materials; external links to the old product may remain cached.
- Any uploaded production part image may be confidential. Images will remain local until the user explicitly starts an analysis; only a resized image will be sent to Meta after consent.

## Recommendation

Build a clearly scoped, single-workstation FactorySight MVP in the existing Node/browser stack: paired reference and inspection images; explicit user-triggered Muse Spark candidate observations; transparent local image-difference visualization; human-only finding decisions; local inspection history; and a printable report. Integrate SAM 3.1 only after a minimal documented response/parser probe. Label the demo dataset as synthetic or user-provided, and never imply the model or image delta validates a real product.
