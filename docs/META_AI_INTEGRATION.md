# Meta AI integration

SecondServe's optional feature calls Muse Spark for text-only structured intake extraction. It is controlled by `SECONDSERVE_MODEL_ENABLED` and a private `MODEL_API_KEY` in local `.env`. The user explicitly enters a note and activates the draft action. No API call runs on page load.

The system instruction tells the model to extract only stated facts, preserve unknowns, distinguish use-by and best-before, and not create a listing. Structured output is validated server-side. The app labels the returned content a draft and requires a person to review it. No image analysis is implemented in this product.

Never commit keys, paste secrets in chat, or treat model output as verified food-safety information. Check the current Meta model terms and hackathon credit conditions before using production data.
