# Hackathon demo notes

## Tremoroom

Tremoroom is an independent solo entry about room-scale earthquake preparedness. Its distinctive demo loop is: pick a what-if, observe an illustrative room scenario, review the flagged items, and leave with a personal action card.

The entry screen offers Resident and Specialist demo views. Residents can select a room photo for local preview. Live visual analysis is opt-in, disabled by default, and requires server configuration plus explicit consent and a button click; it sends a resized photo to Meta Model API and may use credits. Role state is simulated in this browser, not secure authentication or production RBAC. Resident marks sample actions; Specialist views them read-only and can add a local note. The sample room, action queue and score are fictional demonstration data.

## Three-minute demo

| Time | Show | Say |
| --- | --- | --- |
| 0:00–0:25 | Tremoroom identity and illustrated room | “Tremoroom is an independent room-readiness prototype. This is a sample room, not an AI scan.” |
| 0:25–1:00 | Strong motion + Aftershock scenario | “This scripted what-if makes unsecured objects visible across two movements. It is not a damage prediction.” |
| 1:00–1:30 | Doorway blocked scenario | “We do not invent a safe alternate route. The demo asks people to check their building’s approved guidance.” |
| 1:30–2:10 | Review flags, mark bookcase, update checklist | “A resident can confirm a sample action. The score weights are illustrative, not validated engineering criteria.” |
| 2:10–2:35 | Build and print the room action card | “Open items become a locally generated checklist to take away. No room data is uploaded.” |
| 2:35–3:00 | Specialist view and, if explicitly enabled, an authorized scan | “Specialist access is simulated. Vision outputs are candidate observations with uncertainty, not a safety inspection.” |

## Rubric story

- **Impact (30%)**: practical preparedness prompts at room scale.
- **Meta AI tooling (25%)**: an opt-in Meta Model API image-understanding path returns candidate objects, normalized boxes, conditional possibilities and suggested checks. Live output must only be claimed after an authorized live scan.
- **Technical depth (20%)**: scripted what-if state, transparent rules, role-specific demo permissions, and generated action cards.
- **Demo (25%)**: one visible loop from scenario to review to take-home checklist.

## Boundaries

The shaking sequence is an authored animation, not physical simulation. It cannot estimate structural integrity, damage probability, safe shelter locations, or evacuation routes. The blocked-doorway scenario explicitly directs viewers to their real building guidance. The score is an illustrative checklist value, not a safety rating.

Room analysis and the earlier Forkcast adapter are disabled by default. Do not claim the sample scene, movements, risk labels, or score came from AI. Live room analysis requires `TREMOROOM_VISION_ENABLED=true`, a private `MODEL_API_KEY`, explicit user consent, and a click. It may consume credits. Never commit API keys. For a judging video, use the actual successful output from a consented scan, or clearly label the AI path as configured but not demonstrated.

## Submission reminders

The supplied event screenshot lists the required submission on the Cerebral Valley platform with every teammate, a three-minute demo video, a public GitHub repository and the Nov 4, 2026 deadline at 9:00 PM ET. Recheck the platform for changes and submit early.

## API safety

The app can call Meta Model API for room vision after the user chooses a photo, checks consent, and clicks Analyze. The app does not make background model requests. Never commit API keys or private photos.
