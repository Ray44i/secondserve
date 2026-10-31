# SecondServe hackathon runbook

## Local launch

1. Use Node.js 22.9 or newer.
2. Run `npm install` and `npm start`.
3. Open `http://127.0.0.1:4173`.
4. The optional model intake requires a local `.env` with `MODEL_API_KEY` and `SECONDSERVE_MODEL_ENABLED=true`; skip it if not configured.

## Rehearsal

Run `npm test`. Load the recovery scenario and rehearse coordinator → recipient accept/cancel → coordinator replacement → recipient pickup report → coordinator verification. Reset the scenario before recording. Use fictional demo data only.

## Submission

Confirm the public repository works logged out. Record a three-minute demo of the current build; show only work created during the event. Submit the CV platform form, demo video, and public repo before the deadline shown in the live participant portal. The supplied screenshot showed Nov 4 at 9:00 PM ET; verify the portal's current deadline.
