const DEFAULT_BATCH = {
  id: 'FC-024',
  quantity: 30,
  itemName: 'sourdough',
  unit: 'loaves',
  serviceCategory: 'free-donation',
  askingPrice: 0,
  currency: 'USD',
  pickupBy: 20 * 60 + 30,
  prepFactsComplete: true,
  syntheticSafetyFlag: 'clear'
};

const batch = { ...DEFAULT_BATCH };

const recipients = [
  { id: 'sahil', name: 'Sahil Community Kitchen', capacity: 36, distanceKm: 1.2, etaMinutes: 8, closesAt: 20 * 60, available: true },
  { id: 'kadikoy', name: 'Kadıköy Community Pantry', capacity: 35, distanceKm: 2.6, etaMinutes: 17, closesAt: 21 * 60, available: true },
  { id: 'moda', name: 'Moda Neighbourhood Fridge', capacity: 18, distanceKm: 0.6, etaMinutes: 5, closesAt: 20 * 60 + 30, available: true }
];
const scenarioRecipients = recipients.map((recipient) => ({ ...recipient }));

const DEMO_NOW = 19 * 60 + 10;
const CANCEL_TIME = 19 * 60 + 25;
const HANDOFF_BUFFER_MINUTES = 10;

const state = {
  phase: 'draft',
  cancelledRecipientId: null,
  excludedRecipientIds: new Set(),
  selectedRecipientId: null,
  events: [{ type: 'intake', title: 'Sample note ready', detail: 'Donor can review and submit the fictional batch', time: '19:10', complete: false }]
};

const ROLE_PERMISSIONS = {
  donor: new Set(['submit_donation', 'view_own_status']),
  coordinator: new Set(['review_batch', 'dispatch_offer', 'replan', 'view_audit', 'reset_demo']),
  recipient: new Set(['view_assigned_offer', 'accept_offer', 'decline_offer', 'confirm_pickup'])
};
const ROLE_LABELS = { donor: 'Donor partner', coordinator: 'Rescue coordinator', recipient: 'Recipient kitchen' };
let currentRole = null;
let selectedServiceCategory = 'free-donation';

const $ = (selector) => document.querySelector(selector);
const byId = (id) => document.getElementById(id);

function can(permission) {
  return Boolean(currentRole && ROLE_PERMISSIONS[currentRole]?.has(permission));
}

function signInAs(role) {
  if (!ROLE_PERMISSIONS[role]) return;
  currentRole = role;
  if (state.phase === 'draft') {
    state.events = role === 'donor'
      ? [{ type: 'intake', title: 'Sample offer ready', detail: 'Review the fictional note and submit an offer', time: '19:10', complete: false }]
      : [{ type: 'intake', title: 'Network standing by', detail: role === 'coordinator' ? 'Waiting for a donor partner to submit an offer' : 'No recipient offer has been dispatched yet', time: '19:10', complete: false }];
    renderTimeline();
  }
  byId('loginScreen').hidden = true;
  byId('appShell').hidden = false;
  renderRoleView();
  if (role === 'coordinator') requestAnimationFrame(() => {
    if (!leafletMap) initializeMap();
    else leafletMap.invalidateSize();
  });
}

function signOutToRolePicker() {
  currentRole = null;
  byId('appShell').hidden = true;
  byId('loginScreen').hidden = false;
}

function renderRoleView() {
  document.body.dataset.role = currentRole || '';
  byId('roleSessionLabel').textContent = ROLE_LABELS[currentRole] || '';
  byId('intakePanel').hidden = currentRole !== 'donor';
  byId('routesPanel').hidden = currentRole !== 'coordinator';
  byId('decisionPanel').hidden = currentRole !== 'coordinator';
  byId('actionRow').hidden = currentRole !== 'coordinator';
  byId('recipientOfferPanel').hidden = currentRole !== 'recipient';
  byId('logicCard').hidden = currentRole === 'recipient';
  byId('impactPanel').hidden = currentRole === 'recipient';
  byId('resetButton').hidden = !can('reset_demo');
  byId('dispatchButton').hidden = !(can('dispatch_offer') && state.phase === 'submitted' && state.selectedRecipientId);
  byId('cancelButton').hidden = !(can('replan') && ['proposed', 'declined'].includes(state.phase));
  byId('confirmButton').hidden = !(can('confirm_pickup') && state.phase === 'accepted');
  byId('acceptOfferButton').hidden = !(can('accept_offer') && ['proposed', 'rerouted'].includes(state.phase));
  byId('declineOfferButton').hidden = !(can('decline_offer') && ['proposed', 'rerouted'].includes(state.phase));
  byId('offerRecipient').textContent = recipients.find((item) => item.id === state.selectedRecipientId)?.name || 'Waiting for coordinator';
  byId('offerDetails').textContent = `${batch.quantity} ${batch.itemName} ${batch.unit} · ${serviceLabel(batch)} · pickup by ${clockLabel(batch.pickupBy)}`;

  const roleControls = {
    donor: ['Create a donation', 'Submit an item and track its progress. Recipient and routing controls stay with the coordinator.'],
    coordinator: ['Review and coordinate', 'See the full route comparison, explain every rejection, then dispatch or recover the plan.'],
    recipient: ['Recipient offer inbox', 'See only the offer assigned to this kitchen. Accept, decline, or confirm the simulated pickup.']
  };
  const [heading, text] = roleControls[currentRole];
  byId('roleViewHeading').textContent = heading;
  byId('roleViewDescription').textContent = text;
  byId('roleProgressLabel').textContent = state.phase === 'confirmed' ? 'HANDOFF CONFIRMED'
    : state.phase === 'draft' ? 'DRAFT READY'
      : state.phase === 'submitted' ? 'SUBMITTED · AWAITING REVIEW'
        : state.phase === 'declined' ? 'RECIPIENT DECLINED · REVIEW NEEDED'
          : state.phase === 'no-route' ? 'HELD · MANUAL REVIEW' : state.phase.toUpperCase();

  const statusByPhase = {
    draft: 'DRAFT · NOT SUBMITTED', submitted: 'AWAITING COORDINATOR', proposed: 'OFFER SENT',
    rerouted: 'BACKUP OFFER SENT', accepted: 'OFFER ACCEPTED', declined: 'OFFER DECLINED',
    confirmed: 'HANDOFF CONFIRMED', 'no-route': 'HELD FOR REVIEW'
  };
  byId('batchStatus').textContent = statusByPhase[state.phase] || 'DEMO';
  if (state.phase === 'draft') {
    byId('routesTitle').textContent = 'Waiting for a donation';
    byId('routeCount').textContent = 'No batch submitted';
    byId('selectedName').textContent = 'No route yet';
    byId('selectedReason').textContent = 'A donor must submit a note before the coordinator can review routes.';
    byId('selectedEta').textContent = '—';
  }

  const offerCopy = {
    draft: ['Waiting for a donation', 'WAITING', 'There is no pickup offer yet. The coordinator will send an offer after reviewing the donation.'],
    submitted: ['Coordinator review in progress', 'IN REVIEW', 'Your donation is in the rescue network. A coordinator is checking capacity and pickup time.'],
    proposed: ['New pickup offer', 'ACTION NEEDED', 'Review the batch and pickup deadline. Accept only if your kitchen can take the full amount.'],
    rerouted: ['Backup pickup offer', 'ACTION NEEDED', 'The first recipient could not take the batch. This backup offer fits the remaining capacity and time window.'],
    accepted: ['Offer accepted', 'ACCEPTED', 'When the simulated handoff is complete, confirm it to record the outcome.'],
    declined: ['Coordinator notified', 'DECLINED', 'This offer was declined. The coordinator can now replan for another recipient.'],
    confirmed: ['Handoff recorded', 'COMPLETE', 'The simulated pickup is confirmed. This is a demo outcome, not a real collection.'],
    'no-route': ['Donation held for review', 'ON HOLD', 'No recipient passed all configured checks. The coordinator needs to review this batch.']
  };
  const [offerHeading, offerStatus, offerMessage] = offerCopy[state.phase] || offerCopy.draft;
  byId('offerHeading').textContent = offerHeading;
  byId('offerStatus').textContent = offerStatus;
  byId('offerMessage').textContent = offerMessage;
  updateRouteMap();
}

function clockLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function batchDescription() {
  return `${batch.quantity} ${batch.itemName} ${batch.unit} · ${serviceLabel(batch)} · Apricot Bakehouse`;
}

function serviceLabel(item) {
  const labels = {
    'free-donation': 'Free donation',
    'discounted-surplus': 'Discounted surplus',
    'prepared-meals': 'Prepared meals',
    'pantry-restock': 'Pantry restock'
  };
  const base = labels[item.serviceCategory] || labels['free-donation'];
  return item.serviceCategory === 'discounted-surplus'
    ? `${base} · ${item.currency} ${Number(item.askingPrice || 0).toFixed(2)} total`
    : base;
}

function updateJourney() {
  const activeStep = state.phase === 'draft' ? 1 : state.phase === 'no-route' ? 2 : ['rerouted', 'accepted'].includes(state.phase) ? 4 : state.phase === 'confirmed' ? 4 : 3;
  ['intake', 'check', 'reroute', 'confirm'].forEach((name, index) => {
    const step = byId(`journey-${name}`);
    step.classList.toggle('done', index + 1 < activeStep || state.phase === 'confirmed');
    step.classList.toggle('active', index + 1 === activeStep && state.phase !== 'confirmed');
  });
}

function updateRouteMap() {
  const map = byId('routeMap');
  if (!map) return;
  map.dataset.destination = state.selectedRecipientId || 'none';
  map.dataset.phase = state.phase;
  map.querySelectorAll('[data-route]').forEach((route) => {
    route.classList.toggle('route-active', route.dataset.route === state.selectedRecipientId);
  });
  map.querySelectorAll('[data-map-stop]').forEach((stop) => {
    const id = stop.dataset.mapStop;
    stop.classList.toggle('map-stop-active', id === state.selectedRecipientId);
    stop.classList.toggle('map-stop-cancelled', id === state.cancelledRecipientId);
  });
  updateJourney();
}

let leafletMap = null;
let mapMarkerLayer = null;
let mapSearchCenter = { lat: 40.9869, lon: 29.0345 };
let selectedNearbyPlace = null;
let nearbyPlaces = [];
let nearbySearchCache = new Map();

function mapStatus(message, count = '') {
  byId('mapStatus').textContent = message;
  byId('mapResultCount').textContent = count;
}

function setMapSearchCenter(lat, lon, message) {
  mapSearchCenter = { lat, lon };
  leafletMap.setView([lat, lon], Math.max(leafletMap.getZoom(), 13));
  mapMarkerLayer.clearLayers();
  L.circleMarker([lat, lon], { radius: 7, color: '#fff', weight: 3, fillColor: '#c66d3b', fillOpacity: 1 })
    .bindTooltip('Nearby search center').addTo(mapMarkerLayer);
  mapStatus(message || `Center set · ${lat.toFixed(4)}, ${lon.toFixed(4)}. Search when ready.`);
}

function initializeMap() {
  if (!window.L || !byId('realMap')) {
    mapStatus('Map library could not load. Check your internet connection and reload.');
    return;
  }
  leafletMap = L.map('realMap', { scrollWheelZoom: false }).setView([mapSearchCenter.lat, mapSearchCenter.lon], 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
  }).addTo(leafletMap);
  mapMarkerLayer = L.layerGroup().addTo(leafletMap);
  setMapSearchCenter(mapSearchCenter.lat, mapSearchCenter.lon, 'Map ready · Kadıköy sample area. Click the map to set a search center.');
  leafletMap.on('click', (event) => {
    setMapSearchCenter(event.latlng.lat, event.latlng.lng, `Map center set · ${event.latlng.lat.toFixed(4)}, ${event.latlng.lng.toFixed(4)}. Search when ready.`);
  });
}

function requestDeviceLocation() {
  if (!navigator.geolocation) {
    mapStatus('This browser does not provide location access. Click the map to choose a search center.');
    return;
  }
  byId('locateMeButton').disabled = true;
  mapStatus('Waiting for your location permission…');
  navigator.geolocation.getCurrentPosition((position) => {
    byId('locateMeButton').disabled = false;
    setMapSearchCenter(position.coords.latitude, position.coords.longitude, 'Location centered in this tab only. Tap Find places to search nearby.');
  }, (error) => {
    byId('locateMeButton').disabled = false;
    mapStatus(error.code === error.PERMISSION_DENIED
      ? 'Location permission was not granted. Click the map to choose an area instead.'
      : 'Could not read location. Click the map to choose an area instead.');
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
}

function distanceBetweenKm(a, b) {
  const radians = (value) => value * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLon = radians(b.lon - a.lon);
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function placeCoordinates(element) {
  return {
    lat: Number(element.lat ?? element.center?.lat),
    lon: Number(element.lon ?? element.center?.lon)
  };
}

function placeCategory(tags) {
  if (tags.amenity === 'food_sharing' || tags.amenity === 'fridge'
    || ['food_sharing', 'community_fridge'].includes(tags.social_facility)) return 'Community fridge / food sharing';
  if (tags.amenity === 'food_bank' || tags.social_facility === 'food_bank') return 'Food bank';
  if (tags.amenity === 'soup_kitchen' || tags.social_facility === 'soup_kitchen') return 'Soup kitchen';
  return 'Community food support';
}

function selectNearbyPlace(place) {
  selectedNearbyPlace = place;
  byId('placeVerification').hidden = false;
  byId('selectedPlaceName').textContent = `${place.name} · ${place.category}`;
  const osmType = place.osmType === 'node' ? 'node' : place.osmType;
  byId('selectedPlaceLink').href = `https://www.openstreetmap.org/${osmType}/${encodeURIComponent(place.osmId)}`;
  byId('placeCapacity').value = '';
  byId('placeEta').value = '';
  byId('placeClosing').value = '';
  byId('placeVerified').checked = false;
  byId('addPlaceButton').disabled = true;
  nearbyPlaces.forEach((item) => item.marker.setStyle({ color: item === place ? '#143b33' : '#ffffff', fillColor: item === place ? '#d9f37a' : '#517da5', radius: item === place ? 10 : 7 }));
}

function renderNearbyPlaces(elements) {
  const list = byId('nearbyPlaceList');
  list.replaceChildren();
  nearbyPlaces = [];
  mapMarkerLayer.clearLayers();
  L.circleMarker([mapSearchCenter.lat, mapSearchCenter.lon], { radius: 7, color: '#fff', weight: 3, fillColor: '#c66d3b', fillOpacity: 1 })
    .bindTooltip('Nearby search center').addTo(mapMarkerLayer);

  const usable = elements.map((element) => {
    const point = placeCoordinates(element);
    const tags = element.tags || {};
    const category = placeCategory(tags);
    const name = tags.name || tags['name:en'] || tags.operator || `${category} · unnamed map point`;
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return null;
    return { name, category, lat: point.lat, lon: point.lon, osmType: element.type, osmId: element.id, distanceKm: distanceBetweenKm(mapSearchCenter, point) };
  }).filter(Boolean).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 25);
  nearbyPlaces = usable;

  if (!usable.length) {
    list.innerHTML = '<div class="nearby-empty">No matching places were mapped in this search area. That does not mean no local services exist.</div>';
    mapStatus('No matching mapped places found.', '0 places');
    return;
  }

  usable.forEach((place) => {
    const marker = L.circleMarker([place.lat, place.lon], { radius: 7, color: '#ffffff', weight: 2, fillColor: '#517da5', fillOpacity: 1 })
      .bindTooltip(place.name, { direction: 'top' }).addTo(mapMarkerLayer);
    marker.on('click', () => selectNearbyPlace(place));
    place.marker = marker;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nearby-place';
    const detail = document.createElement('span');
    detail.className = 'nearby-place-type';
    detail.textContent = `${place.category} · ${place.distanceKm.toFixed(1)} km from search center`;
    const name = document.createElement('strong');
    name.textContent = place.name;
    const arrow = document.createElement('span');
    arrow.className = 'nearby-place-arrow';
    arrow.textContent = '＋';
    button.append(name, detail, arrow);
    button.addEventListener('click', () => {
      leafletMap.setView([place.lat, place.lon], Math.max(leafletMap.getZoom(), 15));
      selectNearbyPlace(place);
    });
    list.append(button);
  });
  mapStatus('Select a mapped place, then verify it before routing.', `${usable.length} places`);
}

async function searchNearbyPlaces() {
  if (!leafletMap || !can('review_batch')) return;
  const now = Date.now();
  if (searchNearbyPlaces.pending) return;
  if (now - (searchNearbyPlaces.lastAt || 0) < 30000) {
    mapStatus('Please wait 30 seconds between nearby searches; the public map-data service has limited capacity.');
    return;
  }
  searchNearbyPlaces.lastAt = now;
  const radius = Number(byId('searchRadius').value);
  const { lat, lon } = mapSearchCenter;
  const cacheKey = `${lat.toFixed(3)}:${lon.toFixed(3)}:${radius}`;
  if (nearbySearchCache.has(cacheKey)) {
    renderNearbyPlaces(nearbySearchCache.get(cacheKey));
    return;
  }
  searchNearbyPlaces.pending = true;
  byId('searchNearbyButton').disabled = true;
  mapStatus('Searching OpenStreetMap for food banks, soup kitchens, and food-sharing points…');
  const query = `[out:json][timeout:18];(nwr(around:${radius},${lat.toFixed(5)},${lon.toFixed(5)})["amenity"="food_bank"];nwr(around:${radius},${lat.toFixed(5)},${lon.toFixed(5)})["amenity"="food_sharing"];nwr(around:${radius},${lat.toFixed(5)},${lon.toFixed(5)})["amenity"="fridge"];nwr(around:${radius},${lat.toFixed(5)},${lon.toFixed(5)})["amenity"="soup_kitchen"];nwr(around:${radius},${lat.toFixed(5)},${lon.toFixed(5)})["social_facility"~"^(food_bank|soup_kitchen|food_sharing|community_fridge)$"];);out center 30;`;
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: `data=${encodeURIComponent(query)}`
    });
    if (!response.ok) throw new Error(`Nearby search returned HTTP ${response.status}.`);
    const payload = await response.json();
    const elements = Array.isArray(payload.elements) ? payload.elements : [];
    nearbySearchCache.set(cacheKey, elements);
    renderNearbyPlaces(elements);
  } catch {
    mapStatus('Nearby search could not reach the public OpenStreetMap data service. The base map still works; wait 30 seconds before trying again.');
  } finally {
    searchNearbyPlaces.pending = false;
    byId('searchNearbyButton').disabled = false;
  }
}

function addSelectedPlaceToCandidates() {
  if (!can('review_batch') || !selectedNearbyPlace) return;
  if (!['submitted', 'no-route'].includes(state.phase)) {
    mapStatus('Submit a donor offer first. Then verify and add a nearby place to its route check.');
    return;
  }
  const capacity = Number(byId('placeCapacity').value);
  const etaMinutes = Number(byId('placeEta').value);
  const closeValue = byId('placeClosing').value;
  const verified = byId('placeVerified').checked;
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 999 || !Number.isInteger(etaMinutes) || etaMinutes < 1 || etaMinutes > 240 || !closeValue || !verified) return;

  const [hours, minutes] = closeValue.split(':').map(Number);
  const id = `osm-${selectedNearbyPlace.osmType}-${selectedNearbyPlace.osmId}`;
  if (recipients.some((recipient) => recipient.id === id)) {
    mapStatus('This OpenStreetMap place is already in the route comparison.');
    return;
  }
  recipients.push({
    id,
    name: selectedNearbyPlace.name,
    category: selectedNearbyPlace.category,
    source: 'OpenStreetMap · coordinator verified',
    latitude: selectedNearbyPlace.lat,
    longitude: selectedNearbyPlace.lon,
    capacity,
    distanceKm: selectedNearbyPlace.distanceKm,
    etaMinutes,
    closesAt: hours * 60 + minutes,
    available: true
  });
  state.events.push({ type: 'candidate', title: 'Nearby place verified for comparison', detail: `${selectedNearbyPlace.name} · capacity and pickup terms confirmed by coordinator`, time: '19:11', complete: true });
  const evaluation = evaluateCandidates(DEMO_NOW, state.excludedRecipientIds);
  byId('routeCount').textContent = `${evaluation.checks.length} checked · ${evaluation.ranked.length} feasible`;
  if (evaluation.selected) {
    state.phase = 'submitted';
    state.selectedRecipientId = evaluation.selected.id;
  } else {
    state.phase = 'no-route';
    state.selectedRecipientId = null;
    byId('selectedName').textContent = 'Batch held for review';
    byId('selectedEta').textContent = '—';
    byId('selectedTag').textContent = 'HOLD';
    byId('selectedReason').textContent = 'No recipient passed every hard constraint.';
  }
  renderCandidateList(evaluation);
  if (evaluation.selected) setSelectedRecipient(evaluation.selected.id);
  byId('dispatchButton').hidden = !(evaluation.selected && can('dispatch_offer'));
  byId('cancelButton').hidden = true;
  byId('routesTitle').textContent = evaluation.selected ? 'Best available route' : 'No feasible route';
  byId('actionCopy').innerHTML = evaluation.selected
    ? '<span class="action-step">COORDINATOR REVIEW</span><strong>Review the new comparison, then approve the suggested route.</strong>'
    : '<span class="action-step">SAFE STOP</span><strong>This place was added, but the current batch still has no feasible route.</strong>';
  byId('placeVerification').hidden = true;
  mapStatus(`${selectedNearbyPlace.name} added after coordinator verification.`);
  renderRoleView();
  renderTimeline();
}

function renderCandidateList(evaluation) {
  const list = byId('candidateList');
  list.replaceChildren();
  evaluation.checks.forEach((candidate, index) => {
    const row = document.createElement('div');
    row.className = 'candidate-row';
    row.dataset.candidate = candidate.id;
    if (candidate.id === state.selectedRecipientId) row.classList.add(state.phase === 'rerouted' ? 'new-selected' : 'selected-candidate');
    if (candidate.id === state.cancelledRecipientId) row.classList.add('cancelled');

    const marker = document.createElement('span');
    marker.className = 'candidate-marker';
    marker.textContent = String(index + 1).padStart(2, '0');
    const name = document.createElement('span');
    name.className = 'candidate-name';
    name.textContent = candidate.name;
    const facts = document.createElement('span');
    facts.className = 'candidate-facts';
    facts.textContent = `${candidate.distanceKm.toFixed(1)} km · cap. ${candidate.capacity} · closes ${clockLabel(candidate.closesAt)}${candidate.source ? ' · OSM' : ''}`;
    const status = document.createElement('span');
    status.className = 'candidate-state';
    status.id = `state-${candidate.id}`;
    status.textContent = candidate.id === state.cancelledRecipientId ? 'CANCELLED'
      : candidate.id === state.selectedRecipientId ? (state.phase === 'rerouted' ? 'REROUTED' : state.phase === 'submitted' ? 'SUGGESTED' : 'SELECTED')
        : candidate.feasible ? 'BACKUP'
          : candidate.reasons.some((reason) => reason.startsWith('Capacity')) ? 'CAPACITY TOO LOW'
            : candidate.reasons.includes('Missing preparation or storage facts') ? 'FACTS MISSING' : 'WINDOW CLOSED';
    row.append(marker, name, facts, status);
    if (candidate.source) row.title = `${candidate.category}. ${candidate.source}. ETA, capacity and cutoff were entered and verified by the coordinator.`;
    list.append(row);
  });
}

function parseDonorNote(note) {
  const units = '(loaves?|meals?|boxes?|crates?|bags?|portions?)';
  const directMatch = note.match(new RegExp(`\\b(\\d{1,3})\\s+([a-z][a-z' -]{0,35}?)\\s+${units}\\b`, 'i'));
  const ofMatch = directMatch ? null : note.match(new RegExp(`\\b(\\d{1,3})\\s+${units}\\s+of\\s+([a-z][a-z' -]{0,35}?)(?=[,.;]|$)`, 'i'));
  const quantityMatch = directMatch || ofMatch;
  const pickupMatch = note.match(/\b(?:pickup(?:\s+(?:by|at))?|pick\s*up(?:\s+(?:by|at))?|deadline(?:\s*(?:is|by|at|:))?|by|before|until)\s*(?:[:\-]\s*)?(\d{1,2}):([0-5]\d)\b/i);

  if (!quantityMatch || !pickupMatch) return null;

  const quantity = Number(quantityMatch[1]);
  const pickupHour = Number(pickupMatch[1]);
  const pickupMinute = Number(pickupMatch[2]);
  if (quantity < 1 || quantity > 999 || pickupHour > 23) return null;

  const unitText = (directMatch ? quantityMatch[3] : quantityMatch[2]).toLowerCase();
  const itemText = directMatch ? quantityMatch[2] : quantityMatch[3];
  const unit = /^loaf/.test(unitText) ? 'loaves' : unitText.endsWith('s') ? unitText : `${unitText}s`;
  const itemName = itemText
    .replace(/\b(?:fresh|unsold|surplus|batch|of|we have|donating)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'bread';
  const hasPreparationFact = /\b(?:baked|prepared)\s+at\s+\d{1,2}:\d{2}\b/i.test(note);
  const hasStorageFact = /\b(?:stored|kept)\s+(?:at|below)\s+\d+(?:\.\d+)?\s*°?\s*C\b/i.test(note);

  return {
    quantity,
    itemName,
    unit,
    pickupBy: pickupHour * 60 + pickupMinute,
    prepFactsComplete: hasPreparationFact && hasStorageFact
  };
}

function evaluateCandidates(nowMinutes, excludedIds = new Set()) {
  const checks = recipients.map((recipient) => {
    const reasons = [];
    if (excludedIds.has(recipient.id)) reasons.push('Recipient cancelled');
    if (!batch.prepFactsComplete) reasons.push('Missing preparation or storage facts');
    if (batch.syntheticSafetyFlag !== 'clear') reasons.push('Safety review required');
    if (!recipient.available) reasons.push('Recipient unavailable');
    if (recipient.capacity < batch.quantity) reasons.push(`Capacity ${recipient.capacity} is below ${batch.quantity}`);

    const readyAt = nowMinutes + recipient.etaMinutes + HANDOFF_BUFFER_MINUTES;
    const cutoff = Math.min(batch.pickupBy, recipient.closesAt);
    if (readyAt > cutoff) reasons.push(`Pickup window closes at ${clockLabel(recipient.closesAt)}`);

    return {
      ...recipient,
      readyAt,
      feasible: reasons.length === 0,
      reasons,
      score: recipient.etaMinutes + Math.max(0, recipient.capacity - batch.quantity) * 0.05
    };
  });

  const ranked = checks.filter((candidate) => candidate.feasible).sort((a, b) => a.score - b.score);
  return { checks, ranked, selected: ranked[0] || null };
}

function setSelectedRecipient(recipientId) {
  state.selectedRecipientId = recipientId;
  const selected = recipients.find((recipient) => recipient.id === recipientId);
  updateRouteMap();
  if (!selected) return;

  byId('selectedName').textContent = selected.name;
  byId('selectedEta').textContent = selected.etaMinutes;
  byId('selectedReason').textContent = state.phase === 'rerouted'
    ? `Best remaining feasible route · full batch capacity · pickup by ${clockLabel(Math.min(batch.pickupBy, selected.closesAt))}`
    : state.phase === 'submitted' ? 'Suggested route · awaiting coordinator approval'
      : 'Fastest feasible pickup · full batch capacity';
  byId('selectedTag').textContent = state.phase === 'rerouted' ? 'BACKUP' : state.phase === 'submitted' ? 'REVIEW' : 'OFFER SENT';

  const evaluation = evaluateCandidates(
    state.phase === 'rerouted' ? CANCEL_TIME : DEMO_NOW,
    state.excludedRecipientIds
  );
  recipients.forEach((recipient) => {
    const row = document.querySelector(`[data-candidate="${recipient.id}"]`);
    const status = byId(`state-${recipient.id}`);
    const candidate = evaluation.checks.find((item) => item.id === recipient.id);
    if (!row || !status) return;
    row.classList.remove('selected-candidate', 'new-selected', 'cancelled');

    if (recipient.id === state.cancelledRecipientId) {
      row.classList.add('cancelled');
      status.textContent = 'CANCELLED';
      return;
    }
    if (recipient.id === state.selectedRecipientId) {
      row.classList.add(state.phase === 'rerouted' ? 'new-selected' : 'selected-candidate');
      status.textContent = state.phase === 'rerouted' ? 'REROUTED' : 'SELECTED';
      return;
    }
    if (candidate?.reasons.includes('Missing preparation or storage facts')) status.textContent = 'FACTS MISSING';
    else if (candidate?.reasons.some((reason) => reason.startsWith('Capacity'))) status.textContent = 'CAPACITY TOO LOW';
    else if (!candidate?.feasible) status.textContent = 'WINDOW CLOSED';
    else status.textContent = 'BACKUP';
  });
}

function updateBatchDisplay() {
  byId('quantityDisplay').textContent = batch.quantity;
  byId('quantityUnit').textContent = batch.unit;
  byId('itemNameDisplay').textContent = `Fresh ${batch.itemName}`;
  byId('serviceBadge').textContent = serviceLabel(batch).toUpperCase();
  byId('deadlineDisplay').textContent = clockLabel(batch.pickupBy);
  byId('timeRemaining').textContent = `${Math.max(0, batch.pickupBy - DEMO_NOW)} min remaining`;

  const safetyStrip = document.querySelector('.safety-strip');
  safetyStrip.classList.toggle('warning', !batch.prepFactsComplete);
  byId('safetyTitle').textContent = batch.prepFactsComplete ? 'Required demo facts present' : 'Required demo facts missing';
  byId('safetyDescription').textContent = batch.prepFactsComplete
    ? 'A preparation time and storage temperature were found. This is not a food-safety determination.'
    : 'Add a preparation time and storage temperature before the demo will consider routes.';
  byId('safetyIcon').textContent = batch.prepFactsComplete ? '✓' : '!';
}

function renderIntakePlan(parsed) {
  Object.assign(batch, parsed);
  state.phase = 'submitted';
  state.cancelledRecipientId = null;
  state.excludedRecipientIds = new Set();

  const result = evaluateCandidates(DEMO_NOW);
  state.selectedRecipientId = result.selected?.id || null;
  updateBatchDisplay();

  byId('routeCount').textContent = `${result.checks.length} checked · ${result.ranked.length} feasible`;
  renderCandidateList(result);

  state.events = [
    { type: 'intake', title: 'Offer submitted · demo', detail: batchDescription(), time: '19:10', complete: true },
    {
      type: 'safety',
      title: batch.prepFactsComplete ? 'Required note fields present' : 'Required note fields missing',
      detail: batch.prepFactsComplete ? 'Preparation and storage facts stated · not a safety determination' : 'Routing held until the required demo fields are provided',
      time: '19:10',
      complete: true
    }
  ];

  if (result.selected) {
    state.events.push({ type: 'proposal', title: 'Route recommendation ready', detail: `${result.selected.name} · ${result.selected.etaMinutes} min ETA · awaiting coordinator approval`, time: '19:10', complete: false });
    byId('batchStatus').textContent = 'AWAITING COORDINATOR';
    byId('routesTitle').textContent = 'Best available route';
    setSelectedRecipient(result.selected.id);
    byId('actionCopy').innerHTML = '<span class="action-step">COORDINATOR REVIEW</span><strong>Approve and dispatch the suggested route to begin the handoff.</strong>';
    byId('dispatchButton').hidden = false;
    byId('cancelButton').hidden = true;
  } else {
    state.phase = 'no-route';
    state.events.push({ type: 'hold', title: 'Batch held for review', detail: batch.prepFactsComplete ? 'No recipient passed every hard constraint' : 'Complete the preparation and storage fields first', time: '19:10', complete: false });
    byId('batchStatus').textContent = batch.prepFactsComplete ? 'NO FEASIBLE ROUTE' : 'INTAKE NEEDS FACTS';
    byId('routesTitle').textContent = batch.prepFactsComplete ? 'No feasible route' : 'Routing paused';
    byId('selectedName').textContent = 'Batch held for review';
    byId('selectedEta').textContent = '—';
    byId('selectedTag').textContent = 'HOLD';
    byId('selectedReason').textContent = batch.prepFactsComplete ? 'No recipient passed every hard constraint.' : 'Provide the missing demo facts before routing.';
    byId('actionCopy').innerHTML = '<span class="action-step">SAFE STOP</span><strong>Forkcast will not propose a route until the checks pass.</strong>';
    byId('cancelButton').hidden = true;
    byId('dispatchButton').hidden = true;
  }
  updateRouteMap();
  byId('rescuedDisplay').textContent = '0';
  byId('impactStatus').textContent = 'AWAITING CONFIRMATION';
  byId('impactMessage').textContent = 'Nothing counted as rescued until pickup is confirmed.';
  byId('confirmButton').hidden = true;
  renderRoleView();
  renderTimeline();
}

function parseIntake() {
  if (!can('submit_donation')) return;
  const parsed = parseDonorNote(byId('donorNote').value);
  const result = byId('intakeResult');
  if (!parsed) {
    result.className = 'intake-result error';
    result.textContent = 'Could not extract an item amount and pickup time. Try “30 sourdough loaves, pickup by 20:30” or “12 pantry boxes, pickup by 20:30”. Nothing changed.';
    return;
  }

  const offerData = collectOfferDetails();
  if (offerData.error) {
    result.className = 'intake-result error';
    result.textContent = offerData.error;
    return;
  }

  renderIntakePlan({ ...parsed, ...offerData.value });
  result.className = `intake-result ${parsed.prepFactsComplete ? 'success' : 'error'}`;
  result.textContent = `${parsed.quantity} ${parsed.itemName} ${parsed.unit} · ${serviceLabel(batch)} · pickup by ${clockLabel(parsed.pickupBy)} · ${parsed.prepFactsComplete ? 'required demo fields found' : 'preparation or storage facts missing; routing paused'}. Extracted locally; no Meta API request was made.`;
  showToast(parsed.prepFactsComplete ? 'Demo batch extracted and checked.' : 'Intake saved; routing paused for missing facts.');
}

function collectOfferDetails() {
  const askingPrice = selectedServiceCategory === 'discounted-surplus' ? Number(byId('offerPrice').value) : 0;
  if (selectedServiceCategory === 'discounted-surplus' && (!Number.isFinite(askingPrice) || askingPrice <= 0)) {
    return { error: 'Enter a discounted total price for this batch before submitting.' };
  }
  return { value: {
    serviceCategory: selectedServiceCategory,
    askingPrice,
    currency: byId('offerCurrency').value
  } };
}

async function parseIntakeWithMeta() {
  if (!can('submit_donation')) return;
  const result = byId('intakeResult');
  const note = byId('donorNote').value.trim();
  const offerData = collectOfferDetails();
  if (offerData.error) {
    result.className = 'intake-result error';
    result.textContent = offerData.error;
    return;
  }
  result.className = 'intake-result';
  result.textContent = 'Sending this note to Meta Model API for structured extraction…';
  byId('metaExtractButton').disabled = true;

  try {
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Meta extraction failed.');

    const extracted = payload.extraction;
    if (!extracted || !Number.isInteger(extracted.quantity) || extracted.quantity < 1 || extracted.quantity > 999
      || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(extracted.pickupTime)) {
      throw new Error('The model did not return a usable quantity and pickup time. Nothing changed.');
    }
    const [hours, minutes] = extracted.pickupTime.split(':').map(Number);
    const parsed = {
      quantity: extracted.quantity,
      itemName: extracted.itemName,
      unit: extracted.unit,
      pickupBy: hours * 60 + minutes,
      ...offerData.value,
      // Only deterministic checks on the source note can satisfy the demo facts gate.
      prepFactsComplete: /\b(?:baked|prepared)\s+at\s+\d{1,2}:\d{2}\b/i.test(note)
        && /\b(?:stored|kept)\s+(?:at|below)\s+\d+(?:\.\d+)?\s*°?\s*C\b/i.test(note)
    };
    if (typeof parsed.itemName !== 'string' || !parsed.itemName.trim() || parsed.itemName.length > 36
      || !/^[a-z][a-z' -]*$/i.test(parsed.itemName)
      || !['loaves', 'meals', 'boxes', 'crates', 'bags', 'portions'].includes(parsed.unit)) {
      throw new Error('The model returned fields outside the supported demo format. Nothing changed.');
    }

    renderIntakePlan(parsed);
    result.className = `intake-result ${parsed.prepFactsComplete ? 'success' : 'error'}`;
    result.textContent = `${parsed.quantity} ${parsed.itemName} ${parsed.unit} · ${serviceLabel(batch)} · pickup by ${clockLabel(parsed.pickupBy)} · ${parsed.prepFactsComplete ? 'required demo fields found' : 'preparation or storage facts missing; routing paused'}. Extracted with Meta Model API; deterministic route checks remain in the browser.`;
    showToast(parsed.prepFactsComplete ? 'Meta extraction checked against demo rules.' : 'Intake held for missing demo facts.');
  } catch (error) {
    result.className = 'intake-result error';
    result.textContent = `${error.message || 'Meta extraction failed.'} You can use the local Extract & check control instead.`;
  } finally {
    byId('metaExtractButton').disabled = false;
  }
}

function renderTimeline() {
  const timeline = byId('timeline');
  timeline.replaceChildren();

  state.events.forEach((event, index) => {
    const item = document.createElement('div');
    item.className = `timeline-item ${event.complete ? 'completed' : 'current'} ${event.type === 'cancel' ? 'event' : ''}`;

    const marker = document.createElement('span');
    marker.className = 'timeline-marker';
    marker.textContent = event.complete ? '✓' : (event.type === 'cancel' ? '!' : String(index + 1));

    const content = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = event.title;
    const detail = document.createElement('span');
    detail.textContent = event.detail;
    const time = document.createElement('time');
    time.textContent = event.time;
    content.append(title, detail, time);
    item.append(marker, content);
    timeline.append(item);
  });
}

function showToast(message) {
  const toast = byId('toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function cancelAndReplan() {
  if (!can('replan') || !['proposed', 'declined'].includes(state.phase)) return;

  state.phase = 'rerouted';
  state.cancelledRecipientId = state.selectedRecipientId;
  state.excludedRecipientIds.add(state.cancelledRecipientId);
  const result = evaluateCandidates(CANCEL_TIME, state.excludedRecipientIds);
  const cancellationTime = clockLabel(CANCEL_TIME);

  state.events[state.events.length - 1].complete = true;
  state.events.push({
    type: 'cancel',
    title: 'Recipient cancelled',
    detail: `${recipients.find((item) => item.id === state.cancelledRecipientId).name} released the batch`,
    time: cancellationTime,
    complete: true
  });

  if (!result.selected) {
    state.phase = 'no-route';
    state.events.push({ type: 'replan', title: 'No safe route available', detail: 'No recipient passed every hard constraint', time: cancellationTime, complete: false });
    byId('batchStatus').textContent = 'NO FEASIBLE ROUTE';
    byId('routesTitle').textContent = 'No safe option remains';
    byId('selectedName').textContent = 'Batch held for review';
    byId('selectedEta').textContent = '—';
    byId('selectedTag').textContent = 'HOLD';
    byId('selectedReason').textContent = 'No recipient passed every hard constraint.';
    byId('actionCopy').innerHTML = '<span class="action-step">SAFE STOP</span><strong>Nothing is counted as rescued without a feasible handoff.</strong>';
    byId('cancelButton').hidden = true;
    updateRouteMap();
    renderRoleView();
    renderTimeline();
    return;
  }

  state.selectedRecipientId = result.selected.id;
  state.events.push({
    type: 'replan',
    title: 'Plan recalculated',
    detail: `${result.selected.name} · ${result.selected.etaMinutes} min ETA`,
    time: cancellationTime,
    complete: false
  });

  byId('batchStatus').textContent = 'REROUTED · AWAITING PICKUP';
  byId('routesTitle').textContent = 'Best remaining route';
  setSelectedRecipient(result.selected.id);
  updateRouteMap();
  byId('actionCopy').innerHTML = '<span class="action-step">RECIPIENT ACTION</span><strong>Send this backup offer for acceptance before pickup.</strong>';
  byId('cancelButton').hidden = true;
  byId('confirmButton').hidden = true;
  renderRoleView();
  showToast(`Replanned to ${result.selected.name}.`);
  renderTimeline();
}

function confirmPickup() {
  if (!can('confirm_pickup') || state.phase !== 'accepted') return;
  state.phase = 'confirmed';
  updateRouteMap();
  const recipient = recipients.find((item) => item.id === state.selectedRecipientId);
  const arrivalBase = state.cancelledRecipientId ? CANCEL_TIME : DEMO_NOW;
  const eventTime = clockLabel(arrivalBase + recipient.etaMinutes + HANDOFF_BUFFER_MINUTES);
  state.events[state.events.length - 1].complete = true;
  state.events.push({
    type: 'confirm',
    title: 'Simulated pickup confirmed',
    detail: `${batch.quantity} ${batch.itemName} ${batch.unit} · ${recipient.name}`,
    time: eventTime,
    complete: true
  });
  byId('batchStatus').textContent = 'SIMULATED HANDOFF COMPLETE';
  byId('impactStatus').textContent = 'SIMULATED · VERIFIED';
  byId('rescuedDisplay').textContent = batch.quantity;
  byId('impactMessage').textContent = 'Pickup confirmation recorded in the demo outcome ledger.';
  byId('actionCopy').innerHTML = `<span class="action-step">SCENARIO COMPLETE</span><strong>${batch.quantity} ${batch.itemName} ${batch.unit} recorded after simulated pickup confirmation.</strong>`;
  byId('confirmButton').hidden = true;
  renderRoleView();
  renderTimeline();
  showToast('Simulated outcome recorded.');
}

function resetDemo() {
  if (!can('reset_demo')) return;
  Object.assign(batch, DEFAULT_BATCH);
  recipients.splice(0, recipients.length, ...scenarioRecipients.map((recipient) => ({ ...recipient })));
  selectedNearbyPlace = null;
  byId('placeVerification').hidden = true;
  byId('candidateList').replaceChildren();
  state.phase = 'draft';
  state.cancelledRecipientId = null;
  state.excludedRecipientIds = new Set();
  state.selectedRecipientId = null;
  state.events = [{ type: 'intake', title: 'Sample note ready', detail: 'Donor can review and submit the fictional batch', time: '19:10', complete: false }];
  byId('donorNote').value = '30 sourdough loaves, baked at 16:00, stored at 4°C, pickup by 20:30';
  selectedServiceCategory = 'free-donation';
  document.querySelectorAll('[data-service]').forEach((button) => button.classList.toggle('selected', button.dataset.service === selectedServiceCategory));
  byId('discountFields').hidden = true;
  byId('offerPrice').value = '';
  const result = byId('intakeResult');
  result.className = 'intake-result';
  result.textContent = 'This local demo parser never sends your note anywhere. Extracted values update the fictional batch below.';
  updateBatchDisplay();
  byId('rescuedDisplay').textContent = '0';
  byId('impactStatus').textContent = 'AWAITING CONFIRMATION';
  byId('impactMessage').textContent = 'Nothing counted as rescued until pickup is confirmed.';
  byId('routeCount').textContent = 'No batch submitted';
  byId('routesTitle').textContent = 'Waiting for a donation';
  byId('selectedName').textContent = 'No route yet';
  byId('selectedEta').textContent = '—';
  byId('selectedReason').textContent = 'A donor must submit a note before the coordinator can review routes.';
  byId('selectedTag').textContent = 'WAITING';
  byId('dispatchButton').hidden = true;
  byId('cancelButton').hidden = true;
  byId('confirmButton').hidden = true;
  updateRouteMap();
  renderRoleView();
  renderTimeline();
  showToast('Scenario reset. Start again as the donor.');
}

function dispatchRoute() {
  if (!can('dispatch_offer') || state.phase !== 'submitted' || !state.selectedRecipientId) return;
  state.phase = 'proposed';
  const selected = recipients.find((recipient) => recipient.id === state.selectedRecipientId);
  if (state.events.length) state.events[state.events.length - 1].complete = true;
  state.events.push({ type: 'dispatch', title: 'Pickup offer dispatched', detail: `${selected.name} · ${selected.etaMinutes} min ETA`, time: '19:12', complete: false });
  byId('routesTitle').textContent = 'Offer is in the rescue network';
  byId('actionCopy').innerHTML = '<span class="action-step">NEXT EVENT</span><strong>Simulate a cancellation to test the backup route.</strong>';
  setSelectedRecipient(selected.id);
  renderRoleView();
  renderTimeline();
  showToast(`Offer sent to ${selected.name}.`);
}

function acceptOffer() {
  if (!can('accept_offer') || !['proposed', 'rerouted'].includes(state.phase)) return;
  state.phase = 'accepted';
  const recipient = recipients.find((item) => item.id === state.selectedRecipientId);
  state.events.push({ type: 'accept', title: 'Recipient accepted offer', detail: `${recipient.name} reserved capacity for ${batch.quantity} ${batch.unit}`, time: state.cancelledRecipientId ? '19:27' : '19:12', complete: false });
  renderRoleView();
  renderTimeline();
  showToast('Offer accepted. Confirm the simulated handoff when it arrives.');
}

function declineOffer() {
  if (!can('decline_offer') || !['proposed', 'rerouted'].includes(state.phase)) return;
  state.phase = 'declined';
  const recipient = recipients.find((item) => item.id === state.selectedRecipientId);
  state.events.push({ type: 'decline', title: 'Recipient declined offer', detail: `${recipient.name} cannot take the batch · coordinator notified`, time: '19:12', complete: true });
  renderRoleView();
  renderTimeline();
  showToast('Coordinator notified. They can replan the batch.');
}

document.querySelectorAll('[data-login-role]').forEach((button) => {
  button.addEventListener('click', () => signInAs(button.dataset.loginRole));
});
byId('switchRoleButton').addEventListener('click', signOutToRolePicker);
byId('parseIntakeButton').addEventListener('click', parseIntake);
byId('metaExtractButton')?.addEventListener('click', parseIntakeWithMeta);
byId('dispatchButton').addEventListener('click', dispatchRoute);
byId('cancelButton').addEventListener('click', cancelAndReplan);
byId('acceptOfferButton').addEventListener('click', acceptOffer);
byId('declineOfferButton').addEventListener('click', declineOffer);
byId('confirmButton').addEventListener('click', confirmPickup);
byId('resetButton').addEventListener('click', resetDemo);
byId('locateMeButton').addEventListener('click', requestDeviceLocation);
byId('searchNearbyButton').addEventListener('click', searchNearbyPlaces);
byId('addPlaceButton').addEventListener('click', addSelectedPlaceToCandidates);
['placeCapacity', 'placeEta', 'placeClosing', 'placeVerified'].forEach((id) => {
  byId(id).addEventListener('input', () => {
    byId('addPlaceButton').disabled = !(byId('placeCapacity').value && byId('placeEta').value && byId('placeClosing').value && byId('placeVerified').checked);
  });
  byId(id).addEventListener('change', () => {
    byId('addPlaceButton').disabled = !(byId('placeCapacity').value && byId('placeEta').value && byId('placeClosing').value && byId('placeVerified').checked);
  });
});
document.querySelectorAll('[data-service]').forEach((button) => {
  button.addEventListener('click', () => {
    selectedServiceCategory = button.dataset.service;
    document.querySelectorAll('[data-service]').forEach((item) => item.classList.toggle('selected', item === button));
    byId('discountFields').hidden = selectedServiceCategory !== 'discounted-surplus';
  });
});

// This local status check only reveals the optional control; it never contacts Meta.
fetch('/api/status').then((response) => response.ok ? response.json() : null).then((status) => {
  if (!status?.metaExtractionEnabled) return;
  byId('metaExtractButton').hidden = false;
  byId('intakeMode').textContent = 'META AI OPT-IN · CLICK TO SEND NOTE';
  byId('modelStatus').innerHTML = '<span class="model-dot"></span> Meta extraction ready · click to send';
}).catch(() => {});

updateBatchDisplay();
updateRouteMap();
renderTimeline();
