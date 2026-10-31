# Hackathon Submission Description (draft)

**Name:** FactorySight

**One-line:** A human-led visual inspection desk that compares a part to its reference, surfaces candidate visual differences with Meta AI, and documents the inspector's decision.

**Problem:** Small manufacturing teams need to investigate visible differences consistently, but a visual cue alone cannot determine whether an item violates its specification.

**Solution:** The prototype shows reference and inspected images side by side, provides an explicitly heuristic pixel-difference view, optionally asks Muse Spark for candidate observations, and optionally uses SAM 3.1 to segment the prompted component. The inspector confirms, rejects, or marks a finding uncertain and prints a report separating model output from human decisions.

**Meta technology:** Muse Spark image understanding via Meta Model API; SAM 3.1 segmentation via Meta Model API and the official `@meta-sam/parser`, when enabled and successfully demonstrated.

**Architecture:** Plain browser UI plus Node server. Images remain in session memory; metadata/history are local to the browser. No cloud database or multi-user authentication.

**Impact and innovation:** A focused investigation workflow for small workshops that makes evidence and uncertainty visible while keeping final decisions with people. No business or defect-detection performance claims are made.

**Demo:** Use a controlled, permission-approved bracket image pair; compare; review actual model findings (if the calls succeed); apply an inspector decision; print the report.
