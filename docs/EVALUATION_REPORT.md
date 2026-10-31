# Evaluation Report

Status: initial engineering validation only; no manufacturing accuracy claim.

## Data

No approved bracket image pairs or labeled manufacturing dataset were present during the repository audit. Dataset size: **0 component images / 0 ground-truth annotations**. Do not report precision, recall, false-positive rate, localization scores, or human agreement without collected ground truth.

## Automated checks

`npm test` validates supported image data URLs and size limits, inspection input fields, empty model findings, qualitative uncertainty values, and normalized-box shape/order. Results: 5 tests passed, 0 failed (2026-10-31).

## Manual/model checks

2026-10-31 integration smoke probe: a public Wikimedia Commons Metal Bracket image (same image used as both reference and inspection) was sent to Muse Spark through the app endpoint. HTTP 200; zero candidate findings. This is a useful identical-image smoke result, not evidence of defect detection or accuracy. The same public image sent to SAM 3.1 with the prompt “metal bracket” returned HTTP 200, one parsed box and one parsed mask. This verifies the endpoint/parser path only; it does not validate segmentation quality on production parts. The source image was not committed or retained.

Pixel difference has not been evaluated against controlled manufacturing variation. No actual defect pair has been model-tested. Do not derive accuracy metrics from these smoke probes.

## Next evaluation

Capture controlled reference/inspection pairs with fixed camera, distance, lighting, and annotated target regions. Have an inspector label observations independently. Report the actual sample count, false positives/misses, localization method, and failure cases; do not use the model to certify products.
