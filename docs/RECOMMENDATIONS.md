# SecondServe recommendation profile

The food-finder profile is a local browser convenience, not an account. It can store an optional display name, approximate Kadıköy neighborhood, private address note, household size, food-category interests, donation/discount preference, and search radius in `localStorage` on this device.

Recommendations are deterministic: user-selected categories and offer types rank above straight-line proximity; the radius and selected listing filters remove out-of-scope demo items. The neighborhood is represented by a coarse seeded map center. An optional user-initiated browser location overrides it in tab memory only. The free-text address is not used to calculate distance, sent to the server, or sent to a geocoder.

All current nearby items are fictional. Preference matches do not verify serving size, ingredients, allergens, safety, price, or current availability. Ask the business directly in any real deployment.
