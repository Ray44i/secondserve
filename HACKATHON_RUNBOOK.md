# Meta Global AI Developer Hackathon runbook

## Deadline and required deliverables

The event page lists project submissions due **Wednesday, November 4, 2026 at 9:00 PM ET**. In Türkiye (Europe/Istanbul), that is **Thursday, November 5 at 5:00 AM**. The participant portal is authoritative if organizers update the deadline.

The live submission slide supplied for this event lists four requirements:

1. Submit on the Cerebral Valley platform with every teammate listed (for this solo entry, use the builder's account).
2. Upload a 3-minute demo video showing only work built during the event.
3. Link a public GitHub repository and confirm it opens in a logged-out browser.
4. Submit before the deadline; do not wait until the final hour.

## Local launch

1. Use Node.js 22.9 or newer.
2. Run `npm install` once if dependencies are missing.
3. Start with `npm start`. The default address is `http://127.0.0.1:4173`. If that port is occupied in PowerShell, use `$env:PORT='4175'; npm start` and open `http://127.0.0.1:4175`.
4. The Meta Model API needs a local `.env` with `MODEL_API_KEY` and `SECONDSERVE_MODEL_ENABLED=true`. Keep the key private; never show `.env` in the recording.

## Final verification

- Run `npm test` from the project directory; the current suite passes 16 tests.
- Start the exact version to be recorded and run the cancellation-recovery story in `DEMO_SCRIPT.md` once without recording.
- If showing Muse Spark, check that **Muse Spark · opt-in tools** appears. Rehearse the coordinator brief. For photo analysis, use a non-personal food image and show both explicit consent and the result. Every model request may consume credits.
- Do not present generated drafts as verified facts or simulated offers as live inventory.
- Ensure the public repo has the final pushed commit and that `.env`, local databases, keys, and personal data are absent.
- Record exactly 3 minutes; review playback, sound, readable UI, and the final frame.
- Submit the video and public repo on the participant portal, list the solo builder, and save the portal confirmation.
