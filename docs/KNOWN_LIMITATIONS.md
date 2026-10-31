# Known Limitations

- No approved manufacturing sample images or ground truth are bundled.
- Muse Spark candidate findings are uncalibrated visual language outputs. It can miss, mislocate, or invent differences; an inspector must decide.
- SAM 3.1 segments prompted object concepts. It does not identify defects.
- The Canvas pixel difference is not geometrically registered or lighting-normalized; small framing changes can dominate the visualization.
- No declared engineering tolerances, gauges, metrology, compliance standards, or release criteria are implemented.
- No persistent server database, secure authentication, production RBAC, multi-user history, or cloud image storage exists.
- Browser localStorage holds metadata only and may be cleared by the browser. Photos are session-only.
- The printable report uses the browser's print-to-PDF flow; there is no standalone PDF backend.
- No quantitative defect-detection performance is established.
