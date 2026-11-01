export const DEMO_CENTER = Object.freeze({ lat: 40.9824, lon: 29.0608 });

export const NEIGHBORHOODS = Object.freeze({
  kadikoy: Object.freeze({ label: 'Kadıköy center', lat: 40.9824, lon: 29.0608 }),
  moda: Object.freeze({ label: 'Moda', lat: 40.9848, lon: 29.0269 }),
  yeldegirmeni: Object.freeze({ label: 'Yeldeğirmeni', lat: 40.9930, lon: 29.0278 }),
  osmanaga: Object.freeze({ label: 'Osmanağa', lat: 40.9892, lon: 29.0301 }),
  caferaga: Object.freeze({ label: 'Caferağa', lat: 40.9796, lon: 29.0321 }),
  fenerbahce: Object.freeze({ label: 'Fenerbahçe', lat: 40.9740, lon: 29.0480 })
});

export function distanceKm(from, to) {
  const rad = Math.PI / 180, dLat = (to.lat - from.lat) * rad, dLon = (to.lon - from.lon) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(from.lat * rad) * Math.cos(to.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function recommendFoodListings(listings, { origin = DEMO_CENTER, profile = null, offerFilter = 'all', categoryFilter = 'all', radiusKm = 10 } = {}) {
  const preferredCategories = Array.isArray(profile?.categories) ? profile.categories : [];
  const candidates = listings.map((item) => {
    const distance = distanceKm(origin, { lat: Number(item.lat), lon: Number(item.lon) });
    const categoryMatch = preferredCategories.includes(item.category);
    const offerMatch = Boolean(profile && profile.offerPreference !== 'all' && profile.offerPreference === item.offerType);
    const categoryBoost = categoryMatch ? 35 : 0, offerBoost = offerMatch ? 20 : 0;
    return { ...item, distanceKm: distance, categoryMatch, offerMatch, recommendationScore: categoryBoost + offerBoost + Math.max(0, 15 - distance) };
  }).filter((item) => (offerFilter === 'all' || item.offerType === offerFilter)
    && (categoryFilter === 'all' || item.category === categoryFilter)
    && item.distanceKm <= Number(radiusKm));

  candidates.sort((a, b) => profile
    ? b.recommendationScore - a.recommendationScore || a.distanceKm - b.distanceKm
    : a.distanceKm - b.distanceKm);

  return candidates.map((item, index) => ({
    ...item,
    recommended: Boolean(profile) && index < 2,
    recommendationReason: item.categoryMatch && item.offerMatch ? 'Matches your food and offer preferences'
      : item.categoryMatch ? 'Matches your food interests'
        : item.offerMatch ? 'Matches your offer preference'
          : `Nearby in ${NEIGHBORHOODS[profile?.neighborhood]?.label || 'your area'}`
  }));
}
