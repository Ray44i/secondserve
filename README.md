# FactorySight

**See the difference. Understand the defect. Verify the result.** FactorySight is a local-first visual inspection prototype for small manufacturers. It compares an approved reference photo with a part under inspection, combines human-visible image comparison with optional Meta model observations, and records the inspector's decision.

## Run

Requires Node.js 20.17 or newer. Copy `.env.example` to `.env`, add a private Meta Model API key, and enable only the model features you intend to try. Then run:

```sh
npm install
npm start
```

Open <http://127.0.0.1:4173>. Do not publish `.env` or part photos.

## Workflow

1. Enter a product ID/type and inspection profile.
2. Choose a reference photo and a photo of the part. Supported inputs: JPEG, PNG, WebP; 12 MB each.
3. Compare locally side by side, with overlay, or a raw pixel-difference cue.
4. If enabled, check consent and explicitly click Muse Spark analysis to send resized copies of both photos to Meta Model API. Findings are candidate observations with qualitative uncertainty and approximate boxes, not confirmed defects.
5. Optionally ask SAM 3.1 to segment the named component. Segmentation localizes an object and does not detect defects.
6. An inspector confirms, rejects, or marks each finding as uncertain. Save metadata/decisions locally and print/save the report as PDF.

## Architecture

Dependency-light Node server; plain HTML/CSS/browser JavaScript; Meta Model API via official OpenAI-compatible endpoints; official `@meta-sam/parser` for SAM streaming masks. Image files stay in memory and are not saved. Inspection metadata and decision history are stored in this browser's localStorage. There is no database, cloud storage, secure login, or production RBAC.

## Configuration

`MODEL_API_KEY` stays in the ignored local `.env`. Optional `MODEL_API_MODEL` defaults to `muse-spark-1.3`. `FACTORYSIGHT_VISION_ENABLED` and `FACTORYSIGHT_SAM_ENABLED` gate separate features and default to `false` in `.env.example`. The server exposes only feature availability at `/api/factorysight/status`; neither model runs until the user consents and clicks its action.

## Tests

Run `npm test`. Current automated tests cover image data URL validation, inspection input constraints, and Muse result-schema validation. They do not measure model accuracy, SAM quality, or manufacturing defect performance.

## Demo and limits

See `docs/DEMO_SCRIPT.md`, `docs/SUBMISSION_DESCRIPTION.md`, and `docs/KNOWN_LIMITATIONS.md`. The local difference view is sensitive to image angle, scale and lighting. Model outputs are uncalibrated suggestions. This prototype does not issue compliance, safety, or product-release decisions. No sample component photos or 40-image evaluation set are bundled; provide an approved controlled pair before claiming a real part demonstration.

The previous Tremoroom prototype remains accessible at `/index.html` as a fallback.
