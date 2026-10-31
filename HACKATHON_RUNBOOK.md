# FactorySight Hackathon Runbook

## Product

FactorySight is a solo, local-first visual inspection workstation. It compares a known-good part photo with an inspection photo, optionally requests Muse Spark observations and SAM 3.1 object segmentation, and keeps inspector decisions separate.

## Current workflow

- Select product metadata and two controlled images.
- Compare locally; difference view is a raw visual cue, not a defect classifier.
- Check consent and explicitly request Muse Spark or SAM 3.1. Both can use credits.
- Review candidate observations, human-confirm/reject/mark uncertain, save metadata and print a report.
- Photos are held in memory only; history is localStorage metadata only.

## Meta model facts verified from official docs

- Muse Spark `muse-spark-1.3`: image input via `POST /v1/chat/completions` at `https://api.meta.ai/v1`.
- SAM 3.1 `sam-3.1`: streaming `POST /v1/responses`, official `@meta-sam/parser`.
- SAM segments a prompted object; it does not classify defects. No automated performance claim.

## Submission deadline

Official event page says Nov 4, 2026, 9:00 PM ET. For Istanbul (UTC+3), that's Nov 5, 2026, 5:00 AM. Recheck the participant portal and submit early.

## Must finish

1. Replace the public repository's Tremoroom README/About and confirm root opens FactorySight.
2. Capture one controlled, permission-approved bracket pair (normal and visibly altered) with consistent camera/lighting.
3. Re-run Muse/SAM through the consented UI using those exact photos; record actual outputs and failures in the evaluation report.
4. Prepare a 3-minute screen recording using only verified behavior.
5. Submit project, video, and public repository via the Cerebral Valley portal; save confirmation.

## Demo boundaries

Never call a model candidate a confirmed defect. Never imply pixel-diff or SAM proves defect/compliance. If a live model call fails, show local comparison and say the AI path remains unverified on the part pair.
