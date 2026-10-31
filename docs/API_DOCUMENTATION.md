# API Documentation

Base: same-origin local Node server. The key is private in `.env` and never sent to browser code.

## `GET /api/factorysight/status`

Returns `{ "visionEnabled": boolean, "samEnabled": boolean, "model": "muse-spark-1.3" }`. Does not call a model.

## `POST /api/factorysight/analyze`

Requires `FACTORYSIGHT_VISION_ENABLED=true` and `MODEL_API_KEY`. JSON body: `reference`, `inspection` (JPEG/PNG/WebP base64 data URLs, at most 5 MB each), `productType` (1–60 chars), `profile` (up to 80 chars), and `note` (up to 300 chars). Upstream is `POST https://api.meta.ai/v1/chat/completions`, model `muse-spark-1.3`, with two `user` image parts and a strict JSON schema. Returns candidate findings with category, visible evidence, comparison, verification step, qualitative uncertainty, and normalized approximate box. Empty findings are not a pass result. Upstream bodies and stack traces are not returned.

## `POST /api/factorysight/segment`

Requires `FACTORYSIGHT_SAM_ENABLED=true` and `MODEL_API_KEY`. JSON body: `image` data URL and a 1–80 character noun phrase `concept`. Upstream is a streaming `sam-3.1` Responses API call. `@meta-sam/parser` decodes the stream; response includes mask SVG paths and box geometry. Segmentation is not defect classification. Request can consume credits.

Both POST routes are called only from explicit UI actions. The UI consent covers transmission to Meta; status check and local comparison do not send images.
