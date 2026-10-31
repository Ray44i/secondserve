# Tremoroom

**See what could move. Know what to check next.** Tremoroom helps renters and families in earthquake-prone homes turn room-level questions into clear, human-verified actions. It combines consent-based visual observations, illustrative what-if scenarios, and a take-home action card.

## Run locally

Requires Node.js 20 or newer. Run npm start and open http://127.0.0.1:4173. The root page is Tremoroom; the earlier Forkcast prototype remains at /forkcast.html.

## Demo walkthrough

1. Choose Resident or Specialist reviewer. This demo sign-in switches local views only; it is not authentication.
2. Choose a room photo for a local preview. If room analysis has been deliberately enabled by the operator, read and check the consent box, then click Analyze; this sends a resized image to Meta Model API and may use credits. Otherwise, the photo remains local. Then select Light, Moderate, or Strong motion and a Main shaking, Aftershock, or Doorway blocked what-if.
3. Run the 8-second, four-phase illustration. Watch the bookcase and mirror move according to the chosen scenario and sample confirmations.
4. Review why each item was flagged. After checking the real room, residents can mark actions; the interface shows counts of marked and open items, never a safety score. The Specialist view is read-only for resident actions.
5. Build a personal room action card from open sample actions and, after a successful scan, model-suggested checks. Print it or save it as PDF from the browser print dialog. The card is generated locally.
6. If no live scan is enabled, explain that the room, movement, observations and checklist weights are scripted sample data. If scanning is enabled, identify model findings as candidate visual observations, show uncertainty, then build the action card so viewers can see model suggestions become human-verified next steps.

## Product boundaries

The animated scenarios are scripted visual examples, not earthquake physics, damage forecasts, evacuation guidance, structural inspections, or validated safety ratings. Scenario profile names are illustrative controls, not measured ground motion. A photograph cannot establish a building's structural safety. Residents should verify their rooms and follow local emergency guidance and qualified professionals.

The role picker is not real login or secure RBAC. Scenario choices, checkboxes and the generated action card remain in the current browser page; no account, personal room photo, or review request is sent to a server.

Room photo analysis uses a separate disabled-by-default switch: `TREMOROOM_VISION_ENABLED=false`. Enabling it also requires `MODEL_API_KEY` in the private `.env`. A user must choose a photo, explicitly check consent, and click Analyze before an image is sent. Images are resized in-browser, not logged or stored by this server, and are forwarded to Meta Model API. A request may use credits. `/api/status` reports configuration only; it does not make a model request. The API response is constrained to visible-object observations, conditional possibilities, practical checks, confidence labels, and uncertainty. It is not a safety or structural assessment. The local sample must never be presented as AI output.

## Hackathon fit

- **Impact (30%)**: focus on renters and families in earthquake-prone homes, turning visible room questions into human-verified next steps.
- **Meta AI tooling (25%)**: an opt-in Meta Model API vision endpoint analyzes a resized room photo and returns candidate objects, normalized boxes, conditional possibilities, suggested checks, and uncertainties. Only claim live use after showing a successful scan in the recording.
- **Technical depth (20%)**: scenario state, explainable checklist rules, role-specific demo access, resident correction, and a locally generated action card.
- **Demo (25%)**: a clear room scene, selectable what-ifs, visible motion, mitigation, and a printable take-home outcome.

## Files

- index.html, tremoroom.css, tremoroom.js: Tremoroom demo.
- forkcast.html, styles.css, app.js: earlier Forkcast prototype.
- server.mjs: local static server, optional Meta room-vision endpoint, and earlier Forkcast adapter (both model paths require explicit configuration).
- .env.example: disabled-by-default API configuration.
- DEMO_SCRIPT.md and SUBMISSION_CHECKLIST.md: recording and final hand-in guides.
