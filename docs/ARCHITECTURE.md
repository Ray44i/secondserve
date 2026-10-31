# Architecture

## Runtime

Browser UI (`factorysight.html`, `factorysight.css`, `factorysight.js`) runs on a dependency-light Node HTTP server (`server.mjs`). Browser validation checks decoded image type/size/dimensions; server checks data URLs, limits, fields, upstream responses, and JSON findings. The private API key is read only server-side from ignored `.env`.

## Data flow

- Local pair comparison uses Canvas; the diff is a heuristic visualization only.
- Muse Spark receives resized reference + inspection photos after the checkbox and Analyze click. Server validates the schema and returns suggestions only.
- SAM 3.1 receives a resized inspection image and a short product-type prompt after consent and a separate Segment click. Its official parser decodes streamed geometry. Masks locate the component, not defects.
- Inspector decisions and timestamp history are held in page memory, then may be saved as metadata in browser localStorage. Raw images are never persisted by the app.
- Print view forms a report from the current session and human decisions. Reopened local records do not retain photos.

## Production boundary

No SQL database, cloud object storage, authentication, secure multi-user RBAC, audit server, calibrated tolerances, or factory-device integration is implemented. Do not treat this workstation demo as a production QMS.
