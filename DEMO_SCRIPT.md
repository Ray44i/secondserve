# Tremoroom · three-minute judging demo

## Before recording

- Use one consented room photo. Pick a clear, ordinary bedroom or living room with visible furniture; do not use a private photo you do not want sent to Meta.
- Start the local app with `npm start`, open `http://127.0.0.1:4173`, and choose **Resident**. The demo role switch is simulated, not real authentication.
- If demonstrating Meta vision, check the consent text and click **Analyze room with Meta AI**. Wait for a successful result before recording. It sends a resized image to Meta and may use credits. If it fails, do not pass sample content off as model output; use the alternate ending below.
- Reset the sample checklist, close overlays, and scroll to the top. Record the app itself at readable size; rehearse once and keep the final video to three minutes.

## Timed script

| Time | On screen | Suggested narration |
|---|---|---|
| 0:00–0:20 | Opening view and room walkthrough | “Renters and families often do not know which room changes are practical. Tremoroom starts with one room and turns visible questions into small actions a household can verify.” |
| 0:20–0:55 | Show photo scan result, candidate boxes, confidence and uncertainty | “With consent, Meta Model API suggests candidate objects from a room photo. These are visual observations, not a structural inspection. The resident checks what the model may have missed or misunderstood.” |
| 0:55–1:25 | Select **Strong** and **Aftershock**; run the scenario | “The what-if makes the review concrete: we can rehearse an initial movement and a follow-up. This is an authored illustration, not earthquake physics or a damage forecast.” |
| 1:25–1:55 | Review flags and confirm one checked action | “Each flag explains why it appeared and gives a practical check. Counts show only which sample actions the resident marked; the app never scores room safety.” |
| 1:55–2:25 | Choose renter context, then build the room card | “The renter card avoids unapproved drilling and turns open checks into practical next steps. After a successful scan, it can include candidate checks too. The card is built in the browser.” |
| 2:25–2:45 | Switch to Specialist reviewer and show read-only state | “A reviewer can inspect unresolved items while resident controls become read-only. This prototype simulates roles locally; it does not claim secure accounts or real specialist dispatch.” |
| 2:45–3:00 | Return to the results/disclaimer | “Tremoroom uses AI to notice, transparent prompts to explain, and human confirmation to decide the next step. It supports preparedness; it does not replace local authorities or qualified professionals.” |

## If the live scan is unavailable

At 0:20 say: “The Meta Model API image-analysis path is implemented and opt-in, but this recording uses the clearly labeled sample room because a live scan did not complete.” Show the consent interface without claiming it produced the sample flags. Do not show a fake or replayed response as live model output.

## Recording checks

- Keep on-screen labels readable; avoid filming the full desktop if the app can fill the frame.
- Capture the complete three-minute clip with narration and no long loading pauses.
- Avoid showing API keys, account IDs, billing details, personal email, or private room metadata.
- Watch the exported video once, check sound and playback, and confirm it is at most three minutes before uploading.
