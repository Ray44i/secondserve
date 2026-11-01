import { randomUUID } from 'node:crypto';

export const MATCH_WEIGHTS = Object.freeze({ foodCompatibility: 0.25, capacity: 0.20, distance: 0.20, timeAvailability: 0.20, preference: 0.10, reliability: 0.05 });
const nowIso = () => new Date().toISOString();
const asJson = (value) => JSON.stringify(value ?? {});
const fromJson = (value, fallback = []) => { try { return JSON.parse(value); } catch { return fallback; } };
const tx = (db, run) => { db.exec('BEGIN IMMEDIATE'); try { const value = run(); db.exec('COMMIT'); return value; } catch (error) { db.exec('ROLLBACK'); throw error; } };
const utcPlusMinutes = (mins) => new Date(Date.now() + mins * 60_000).toISOString();
const localMinute = (iso) => { const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso)); return Number(parts.find((p) => p.type === 'hour').value) * 60 + Number(parts.find((p) => p.type === 'minute').value); };
const localDay = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
const distanceKm = (aLat, aLon, bLat, bLon) => { const r = Math.PI / 180, dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r; const a = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); };

export function getNearbyDemoListings() {
  const expires = (minutes) => new Date(Date.now() + minutes * 60_000).toISOString();
  return [
    { id:'market-bread', name:'Daily bread bundle', business:'Demo Bakery A', category:'Bakery', quantity:6, unit:'loaves', offerType:'donation', priceTry:null, location:'Moda, Kadıköy', lat:40.9848, lon:29.0269, pickupUntil:expires(55), note:'Same-day surplus. Confirm ingredients with the business before pickup.' },
    { id:'market-produce', name:'Seasonal produce box', business:'Demo Market B', category:'Produce', quantity:3, unit:'kg', offerType:'discounted_sale', priceTry:45, location:'Yeldeğirmeni, Kadıköy', lat:40.9930, lon:29.0278, pickupUntil:expires(80), note:'Discounted demo price. Check produce condition at collection.' },
    { id:'market-soup', name:'Vegetable soup portions', business:'Demo Kitchen C', category:'Prepared meals', quantity:12, unit:'portions', offerType:'donation', priceTry:null, location:'Osmanağa, Kadıköy', lat:40.9892, lon:29.0301, pickupUntil:expires(45), note:'Chilled demo listing. Ask about allergens and storage history.' },
    { id:'market-yogurt', name:'Yogurt multipack', business:'Demo Grocer D', category:'Dairy', quantity:5, unit:'packs', offerType:'discounted_sale', priceTry:35, location:'Caferağa, Kadıköy', lat:40.9796, lon:29.0321, pickupUntil:expires(95), note:'Discounted demo price. Verify date and cold-chain details with the shop.' },
    { id:'market-pastry', name:'Pastry end-of-day box', business:'Demo Bakery E', category:'Bakery', quantity:8, unit:'pieces', offerType:'discounted_sale', priceTry:30, location:'Fenerbahçe, Kadıköy', lat:40.9740, lon:29.0480, pickupUntil:expires(65), note:'End-of-day demo listing. Ingredients and handling require confirmation.' },
    { id:'market-fruit', name:'Seasonal fruit bag', business:'Demo Produce F', category:'Produce', quantity:4, unit:'bags', offerType:'donation', priceTry:null, location:'Moda, Kadıköy', lat:40.9808, lon:29.0214, pickupUntil:expires(70), note:'Surplus demo offer. Ask the shop to confirm contents and condition.' },
    { id:'market-chickpeas', name:'Chickpea pantry bundle', business:'Demo Grocer G', category:'Pantry', quantity:6, unit:'packs', offerType:'donation', priceTry:null, location:'Yeldeğirmeni, Kadıköy', lat:40.9954, lon:29.0256, pickupUntil:expires(110), note:'Shelf-stable demo bundle. Check labels and dates at pickup.' },
    { id:'market-olives', name:'Olive jar pair', business:'Demo Market H', category:'Pantry', quantity:3, unit:'bundles', offerType:'discounted_sale', priceTry:50, location:'Osmanağa, Kadıköy', lat:40.9871, lon:29.0345, pickupUntil:expires(85), note:'Discounted demo offer. Review package labels before purchase.' },
    { id:'market-juice', name:'Fresh juice bottles', business:'Demo Juice Bar I', category:'Drinks', quantity:5, unit:'bottles', offerType:'donation', priceTry:null, location:'Caferağa, Kadıköy', lat:40.9778, lon:29.0272, pickupUntil:expires(40), note:'Same-day demo surplus. Ask about ingredients and storage directly.' },
    { id:'market-coffee', name:'Cold brew pair', business:'Demo Cafe J', category:'Drinks', quantity:4, unit:'pairs', offerType:'discounted_sale', priceTry:40, location:'Moda, Kadıköy', lat:40.9861, lon:29.0237, pickupUntil:expires(90), note:'Discounted demo offer. Verify ingredients and handling with the cafe.' }
  ];
}

export function initializeSecondServe(db, schemaSql) {
  db.exec(schemaSql);
  db.exec('PRAGMA foreign_keys = ON;');
  const count = db.prepare('SELECT COUNT(*) AS n FROM organizations').get().n;
  if (count) return;
  const insertOrg = db.prepare('INSERT INTO organizations(id,name,type,lat,lon,service_radius_km,verified_status,created_at) VALUES(?,?,?,?,?,?,?,?)');
  const insertRecipient = db.prepare('INSERT INTO recipient_profiles(organization_id,accepted_categories,maximum_capacity,storage_capabilities,close_minute,transportation_available,preference,reliability) VALUES(?,?,?,?,?,?,?,?)');
  const created = nowIso();
  insertOrg.run('golden-crust', 'Golden Crust Bakery', 'business', 40.9824, 29.0608, 0, 'simulated', created);
  const orgs = [
    ['charity-a', 'Charity A', 'charity', 40.9914, 29.0472, 15, 'verified-demo', ['bakery', 'produce', 'pantry', 'prepared_meals'], 25, ['ambient', 'chilled'], 1439, 1, 'donation', 0.94],
    ['kitchen-b', 'Community Kitchen B', 'community_kitchen', 40.9580, 29.0780, 15, 'verified-demo', ['bakery', 'produce', 'pantry', 'prepared_meals'], 40, ['ambient', 'chilled', 'frozen'], 1439, 1, 'donation', 0.88],
    ['charity-c', 'Charity C', 'charity', 40.9710, 29.0210, 10, 'verified-demo', ['bakery', 'produce', 'pantry'], 15, ['ambient', 'chilled'], 1439, 1, 'donation', 0.91]
  ];
  for (const [id, name, type, lat, lon, radius, verification, categories, capacity, storage, closes, transport, preference, reliability] of orgs) {
    insertOrg.run(id, name, type, lat, lon, radius, verification, created);
    insertRecipient.run(id, asJson(categories), capacity, asJson(storage), closes, transport, preference, reliability);
  }
}

const scenarios = {
  recovery: { business: 'Golden Crust Bakery', foodName: 'Butter croissants', category: 'bakery', quantity: 20, unit: 'pieces', preparedAt: () => utcPlusMinutes(-120), expiryType: 'not_applicable', expiryAt: null, bestBeforeAt: null, storage: 'ambient', allergens: 'Wheat, milk, eggs', condition: 'reported_intact', preference: 'donation', pickupMinutes: 75, attested: true, title: 'Autonomous recovery: cancellation and reroute' },
  success: { business: 'Golden Crust Bakery', foodName: 'Sourdough bread', category: 'bakery', quantity: 30, unit: 'loaves', preparedAt: () => utcPlusMinutes(-90), expiryType: 'not_applicable', expiryAt: null, bestBeforeAt: null, storage: 'ambient', allergens: 'Wheat', condition: 'reported_intact', preference: 'donation', pickupMinutes: 100, attested: true, title: 'Successful rescue: verified pickup' },
  review: { business: 'Golden Crust Bakery', foodName: 'Prepared lunch boxes', category: 'prepared_meals', quantity: 12, unit: 'portions', preparedAt: () => utcPlusMinutes(-30), expiryType: 'unknown', expiryAt: null, bestBeforeAt: null, storage: 'unknown', allergens: 'Unknown', condition: 'unknown', preference: 'donation', pickupMinutes: 60, attested: false, title: 'Safety hold: missing verified facts' }
};

function addEvent(db, listingId, type, actorRole, description, metadata = {}) {
  const id = randomUUID(), created = nowIso();
  db.prepare('INSERT INTO agent_events(id,listing_id,event_type,actor_role,description,metadata,created_at) VALUES(?,?,?,?,?,?,?)').run(id, listingId, type, actorRole, description, asJson(metadata), created);
  return { id, type, actorRole, description, metadata, createdAt: created };
}
function addAudit(db, role, action, entityType, entityId, metadata = {}) {
  db.prepare('INSERT INTO audit_logs(id,actor_role,action,entity_type,entity_id,metadata,created_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(), role, action, entityType, entityId, asJson(metadata), nowIso());
}
function currentListing(db, listingId) {
  return db.prepare('SELECT * FROM surplus_listings WHERE id=?').get(listingId);
}
function insertListing(db, fields) {
  const id = randomUUID(), now = nowIso();
  const businessLocation = db.prepare('SELECT lat,lon FROM organizations WHERE id=?').get('golden-crust');
  db.prepare(`INSERT INTO surplus_listings(id,business_id,food_name,category,quantity,unit,pickup_location,pickup_lat,pickup_lon,prepared_at,expiry_type,expiry_at,best_before_at,storage_condition,allergens,food_condition,pickup_deadline,pickup_window_start,pickup_window_end,strategy_preference,business_attested,status,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, 'golden-crust', fields.foodName, fields.category, fields.quantity, fields.unit, fields.pickupLocation || 'Kadıköy, Istanbul', businessLocation.lat, businessLocation.lon, fields.preparedAt ?? null, fields.expiryType, fields.expiryAt ?? null, fields.bestBeforeAt ?? null, fields.storage, fields.allergens, fields.condition, fields.pickupDeadline, fields.pickupWindowStart ?? null, fields.pickupDeadline, fields.preference, fields.attested ? 1 : 0, 'AVAILABLE', now, now);
  db.prepare('INSERT INTO app_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('activeListingId', id);
  return id;
}

function scenarioFields(key) {
  const s = scenarios[key]; if (!s) throw Object.assign(new Error('Choose a supported demo scenario.'), { status: 400 });
  const deadline = utcPlusMinutes(s.pickupMinutes);
  return { ...s, preparedAt: s.preparedAt(), pickupDeadline: deadline, pickupWindowStart: nowIso(), pickupLocation: 'Kadıköy, Istanbul', expiryAt: s.expiryAt };
}

export function loadDemoScenario(db, key = 'recovery', role = 'coordinator') {
  return tx(db, () => {
    db.exec('DELETE FROM impact_records; DELETE FROM pickups; DELETE FROM offers; DELETE FROM matches; DELETE FROM agent_runs; DELETE FROM agent_events; DELETE FROM audit_logs; DELETE FROM surplus_listings;');
    const fields = scenarioFields(key), id = insertListing(db, fields);
    addEvent(db, id, 'LISTING_CREATED', role, `${fields.title} loaded. All organizations and outcomes in this workspace are simulated.`, { scenario: key, quantity: fields.quantity, unit: fields.unit });
    addAudit(db, role, 'demo_scenario_loaded', 'surplus_listing', id, { scenario: key });
    return getSecondServeState(db);
  });
}

export function createListing(db, raw, role = 'donor') {
  const fields = {
    foodName: String(raw.foodName ?? '').trim(), category: raw.category,
    quantity: Number(raw.quantity), unit: raw.unit,
    preparedAt: raw.preparedAt || null, expiryType: raw.expiryType || 'unknown',
    expiryAt: raw.expiryAt || null, bestBeforeAt: raw.bestBeforeAt || null,
    storage: raw.storage || 'unknown', allergens: String(raw.allergens ?? 'Unknown').trim(),
    condition: raw.condition || 'unknown', pickupDeadline: raw.pickupDeadline,
    pickupLocation: String(raw.pickupLocation ?? '').trim(), pickupWindowStart: raw.pickupWindowStart || null, preference: raw.preference || 'donation',
    attested: raw.attested === true
  };
  if (!fields.foodName || fields.foodName.length > 80 || !['bakery','produce','dairy','prepared_meals','pantry','other'].includes(fields.category)
    || !Number.isFinite(fields.quantity) || fields.quantity <= 0 || fields.quantity > 10000
    || !['kg','pieces','boxes','portions','crates','loaves'].includes(fields.unit)
    || !['use_by','best_before','not_applicable','unknown'].includes(fields.expiryType)
    || !['ambient','chilled','frozen','unknown'].includes(fields.storage)
    || !['reported_intact','damaged','unknown'].includes(fields.condition)
    || !['donation','discounted_sale','split'].includes(fields.preference) || !fields.pickupLocation || fields.pickupLocation.length > 160
    || fields.allergens.length > 240 || !Number.isFinite(Date.parse(fields.pickupDeadline))
    || new Date(fields.pickupDeadline) <= new Date() || new Date(fields.pickupDeadline) > new Date(Date.now() + 24 * 60 * 60_000)) {
    throw Object.assign(new Error('Check food name, category, quantity, unit, storage, offer preference, and a pickup deadline within 24 hours.'), { status: 400 });
  }
  if (fields.expiryType === 'use_by' && !Number.isFinite(Date.parse(fields.expiryAt))) throw Object.assign(new Error('Enter the stated use-by date.'), { status: 400 });
  if (fields.expiryType === 'best_before' && !Number.isFinite(Date.parse(fields.bestBeforeAt))) throw Object.assign(new Error('Enter the stated best-before date.'), { status: 400 });
  return tx(db, () => {
    const id = insertListing(db, fields);
    addEvent(db, id, 'LISTING_CREATED', role, `Business reported ${fields.quantity} ${fields.unit} of ${fields.foodName}.`, { category: fields.category, pickupDeadline: fields.pickupDeadline });
    addAudit(db, role, 'surplus_listing_created', 'surplus_listing', id, { category: fields.category, quantity: fields.quantity, unit: fields.unit });
    return getSecondServeState(db);
  });
}

function reviewReasons(listing) {
  const issues = [];
  if (!listing.business_attested) issues.push('Business has not attested to the listing facts and handling history.');
  if (listing.storage_condition === 'unknown') issues.push('Storage condition is missing; no automatic match is allowed.');
  if (listing.food_condition !== 'reported_intact') issues.push('Food condition is not confirmed as intact; human review is required.');
  if (listing.allergens === 'Unknown' || !listing.allergens.trim()) issues.push('Allergen information is unknown; request clarification before handoff.');
  if (listing.expiry_type === 'unknown') issues.push('Date type and date were not verified; use-by and best-before are distinct.');
  if (listing.expiry_type === 'best_before' && listing.best_before_at && Date.parse(listing.best_before_at) < Date.now()) issues.push('The declared best-before date has passed; hold for human review rather than equating it with a use-by date.');
  if (listing.expiry_type === 'best_before' && listing.best_before_at && Date.parse(listing.best_before_at) <= Date.parse(listing.pickup_deadline)) issues.push('The pickup window reaches the declared best-before date; a human must review it. Best-before is not treated as use-by.');
  if (listing.strategy_preference === 'split') issues.push('Split allocation is not automated in this prototype; coordinator review is required.');
  return issues;
}

function scoreCandidate(listing, row) {
  const profile = row, org = row;
  const reasons = [];
  const categoryOk = fromJson(profile.accepted_categories).includes(listing.category);
  const storageOk = fromJson(profile.storage_capabilities).includes(listing.storage_condition);
  const distance = distanceKm(dbNumber(listing.pickup_lat, 40.9824), dbNumber(listing.pickup_lon, 29.0608), org.lat, org.lon);
  const deadline = Date.parse(listing.pickup_deadline), now = Date.now();
  const deadlineLocal = localMinute(listing.pickup_deadline), etaMinutes = Math.max(4, Math.round(distance * 3 + 3));
  const dateType = listing.expiry_type;
  let dateOk = true;
  if (dateType === 'use_by' && listing.expiry_at && Date.parse(listing.expiry_at) <= deadline) dateOk = false;
  const closesInTime = deadlineLocal <= profile.close_minute;
  const arrivesInTime = now + (etaMinutes + 15) * 60_000 <= deadline;
  const checks = [
    [org.verified_status === 'verified-demo', 'Recipient organization is not verified in demo registry.'],
    [categoryOk, `Does not accept ${listing.category.replaceAll('_', ' ')}.`],
    [Number(profile.maximum_capacity) - Number(profile.reserved_capacity) >= Number(listing.quantity), `Capacity available is below ${listing.quantity} ${listing.unit}.`],
    [storageOk, `Cannot confirm the declared ${listing.storage_condition} storage requirement.`],
    [Boolean(profile.transportation_available), 'No pickup transportation is available.'],
    [distance <= Number(org.service_radius_km), `Outside recipient service radius (${distance.toFixed(1)} km).`],
    [closesInTime && arrivesInTime, 'Recipient cannot meet pickup deadline and arrival buffer.'],
    [dateOk, 'Use-by constraint would be crossed before pickup.']
  ];
  for (const [ok, reason] of checks) if (!ok) reasons.push(reason);
  const pref = profile.preference === listing.strategy_preference ? 100 : 65;
  const comps = {
    foodCompatibility: categoryOk ? 100 : 0,
    capacity: Math.max(0, Math.min(100, Number(profile.maximum_capacity) / Number(listing.quantity) * 100)),
    distance: Math.max(0, Math.min(100, (1 - distance / Number(org.service_radius_km)) * 100)),
    timeAvailability: closesInTime && arrivesInTime ? Math.max(55, Math.min(100, (deadline - now - (etaMinutes + 15) * 60_000) / 60_000 + 55)) : 0,
    preference: pref,
    reliability: Number(profile.reliability) * 100
  };
  const weightedScore = Number(Object.entries(MATCH_WEIGHTS).reduce((sum, [key, weight]) => sum + comps[key] * weight, 0).toFixed(1));
  const eligible = reasons.length === 0;
  const explanation = eligible
    ? `${org.name} is eligible for the full quantity, accepts this category and declared storage, has pickup capacity, and fits the deadline within its service radius.`
    : reasons.join(' ');
  return { org, distanceKm: Number(distance.toFixed(1)), etaMinutes, score: weightedScore, components: comps, eligible, reasons, explanation };
}
const dbNumber = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function recordRun(db, listingId, type, status, input, output) {
  const start = nowIso();
  db.prepare('INSERT INTO agent_runs(id,listing_id,agent_type,status,input_summary,output_summary,started_at,finished_at) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(), listingId, type, status, asJson(input), asJson(output), start, nowIso());
}

function evaluateListing(db, listing, attempt = 1) {
  const blocks = reviewReasons(listing);
  if (listing.expiry_type === 'use_by' && listing.expiry_at && Date.parse(listing.expiry_at) <= Date.now()) {
    db.prepare("UPDATE surplus_listings SET status='EXPIRED', updated_at=? WHERE id=?").run(nowIso(), listing.id);
    addEvent(db, listing.id, 'LISTING_EXPIRED', 'decision_agent', 'The stated use-by date has passed. No offers were sent.', { reason: 'use_by_passed' });
    recordRun(db, listing.id, 'decision', 'blocked', { listingId: listing.id }, { status: 'EXPIRED', reasons: ['Use-by date has passed.'] });
    return { status: 'EXPIRED', matches: [], reasons: ['Use-by date has passed.'] };
  }
  if (blocks.length) {
    db.prepare("UPDATE surplus_listings SET status='NEEDS_REVIEW', updated_at=? WHERE id=?").run(nowIso(), listing.id);
    addEvent(db, listing.id, 'SAFETY_REVIEW_REQUIRED', 'decision_agent', 'Automatic matching paused because required verified information is missing or needs review.', { reasons: blocks });
    recordRun(db, listing.id, 'decision', 'needs_review', { listingId: listing.id }, { status: 'NEEDS_REVIEW', reasons: blocks });
    return { status: 'NEEDS_REVIEW', matches: [], reasons: blocks };
  }
  if (listing.expiry_type === 'use_by' && Date.parse(listing.expiry_at) <= Date.parse(listing.pickup_deadline)) {
    const reason = 'The use-by date occurs before the pickup deadline; no offer can meet the constraint.';
    db.prepare("UPDATE surplus_listings SET status='EXPIRED', updated_at=? WHERE id=?").run(nowIso(), listing.id);
    addEvent(db, listing.id, 'LISTING_EXPIRED', 'decision_agent', reason, { reason: 'pickup_after_use_by' });
    recordRun(db, listing.id, 'decision', 'blocked', { listingId: listing.id }, { status: 'EXPIRED', reasons: [reason] });
    return { status: 'EXPIRED', matches: [], reasons: [reason] };
  }
  const orgs = db.prepare(`SELECT o.*,p.accepted_categories,p.maximum_capacity,p.storage_capabilities,p.close_minute,p.transportation_available,p.preference,p.reliability,p.reserved_capacity
    FROM organizations o JOIN recipient_profiles p ON p.organization_id=o.id ORDER BY o.name`).all();
  const candidates = orgs.map((row) => scoreCandidate(listing, row));
  const ordered = [...candidates.filter((item) => item.eligible).sort((a,b) => b.score-a.score), ...candidates.filter((item) => !item.eligible).sort((a,b) => b.score-a.score)];
  for (const candidate of ordered) {
    const matchId = randomUUID();
    db.prepare('INSERT INTO matches(id,listing_id,recipient_id,score,components,eligible,reasons,attempt,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(matchId, listing.id, candidate.org.id, candidate.score, asJson(candidate.components), candidate.eligible ? 1 : 0, asJson(candidate.reasons), attempt, nowIso());
    candidate.matchId = matchId;
    addEvent(db, listing.id, candidate.eligible ? 'RECIPIENT_ELIGIBLE' : 'RECIPIENT_FILTERED', 'matching_agent', candidate.eligible ? `${candidate.org.name} scored ${candidate.score}/100 and passed all hard constraints.` : `${candidate.org.name} excluded: ${candidate.reasons[0]}`, { recipientId: candidate.org.id, score: candidate.score, eligible: candidate.eligible, reasons: candidate.reasons, components: candidate.components });
  }
  const selected = ordered.find((item) => item.eligible);
  if (!selected) {
    db.prepare("UPDATE surplus_listings SET status='NEEDS_REVIEW', updated_at=? WHERE id=?").run(nowIso(), listing.id);
    const reasons = ['No verified recipient passed every eligibility constraint.'];
    addEvent(db, listing.id, 'NO_ELIGIBLE_MATCH', 'matching_agent', 'No suitable recipient found. The listing remains held for human intervention.', { reasons });
    recordRun(db, listing.id, 'matching', 'needs_review', { listingId: listing.id, candidates: candidates.length }, { status: 'NEEDS_REVIEW', reasons });
    return { status: 'NEEDS_REVIEW', matches: ordered, reasons };
  }
  db.prepare("UPDATE surplus_listings SET status='MATCHING', updated_at=? WHERE id=?").run(nowIso(), listing.id);
  addEvent(db, listing.id, 'STRATEGY_SELECTED', 'decision_agent', `${listing.strategy_preference === 'discounted_sale' ? 'Discounted sale' : 'Donation'} strategy selected. ${selected.org.name} is the highest-scoring eligible recipient.`, { strategy: listing.strategy_preference, selectedRecipientId: selected.org.id, matchScore: selected.score, weights: MATCH_WEIGHTS });
  recordRun(db, listing.id, 'matching', 'completed', { listingId: listing.id, candidates: candidates.length }, { selectedRecipientId: selected.org.id, score: selected.score, weights: MATCH_WEIGHTS });
  return { status: 'MATCHING', matches: ordered, selected };
}

export function runDecisionAgent(db, role = 'coordinator') {
  return tx(db, () => {
    const id = db.prepare("SELECT value FROM app_meta WHERE key='activeListingId'").get()?.value;
    const listing = id && currentListing(db, id);
    if (!listing) throw Object.assign(new Error('Load or create a listing before running the agent.'), { status: 409 });
    if (!['AVAILABLE','NEEDS_REVIEW'].includes(listing.status)) throw Object.assign(new Error(`Agent cannot run while listing status is ${listing.status}.`), { status: 409 });
    return evaluateListing(db, listing, 1) && getSecondServeState(db);
  });
}

function selectedMatch(db, listingId, recipientId) {
  return db.prepare('SELECT * FROM matches WHERE listing_id=? AND recipient_id=? AND eligible=1 ORDER BY attempt DESC, score DESC LIMIT 1').get(listingId, recipientId);
}
function sendOffer(db, listing, match, actorRole, isRecovery = false) {
  const recipient = db.prepare('SELECT name FROM organizations WHERE id=?').get(match.recipient_id);
  const id = randomUUID(), created = nowIso(), deadline = listing.pickup_deadline;
  db.prepare('INSERT INTO offers(id,listing_id,recipient_id,match_id,offered_quantity,status,response_deadline,reservation_active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id, listing.id, match.recipient_id, match.id, listing.quantity, 'OFFER_SENT', deadline, 0, created, created);
  db.prepare("UPDATE surplus_listings SET status='OFFER_SENT', updated_at=? WHERE id=?").run(created, listing.id);
  db.prepare('INSERT INTO pickups(id,offer_id,scheduled_window,status) VALUES(?,?,?,?)').run(randomUUID(), id, listing.pickup_deadline, 'PENDING');
  addEvent(db, listing.id, isRecovery ? 'REPLACEMENT_OFFER_SENT' : 'OFFER_SENT', actorRole, `${isRecovery ? 'Recovery agent sent a replacement offer to' : 'Offer sent to'} ${recipient.name} for ${listing.quantity} ${listing.unit}. No external message is sent in this demo.`, { offerId: id, recipientId: match.recipient_id, quantity: listing.quantity, responseDeadline: deadline, simulated: true });
  addAudit(db, actorRole, isRecovery ? 'replacement_offer_sent' : 'offer_sent', 'offer', id, { recipientId: match.recipient_id, quantity: listing.quantity });
  return id;
}

export function dispatchOffer(db, role = 'coordinator') {
  return tx(db, () => {
    const state = getSecondServeState(db), listing = state.activeListing;
    if (!listing || listing.status !== 'MATCHING') throw Object.assign(new Error('Run the decision and matching agents before dispatching.'), { status: 409 });
    const match = db.prepare('SELECT * FROM matches WHERE listing_id=? AND eligible=1 ORDER BY attempt DESC, score DESC LIMIT 1').get(listing.id);
    if (!match) throw Object.assign(new Error('No eligible recipient can receive an offer.'), { status: 409 });
    sendOffer(db, currentListing(db, listing.id), match, role);
    return getSecondServeState(db);
  });
}

function resolveOffer(db, listingId, offerId) {
  const offer = db.prepare('SELECT * FROM offers WHERE id=? AND listing_id=?').get(offerId, listingId);
  if (!offer) throw Object.assign(new Error('Offer was not found.'), { status: 404 });
  return offer;
}

export function acceptOffer(db, listingId, offerId, recipientId, role = 'recipient') {
  return tx(db, () => {
    const offer = resolveOffer(db, listingId, offerId);
    if (offer.recipient_id !== recipientId) throw Object.assign(new Error('This demo recipient cannot act on another organization’s offer.'), { status: 403 });
    if (offer.status !== 'OFFER_SENT') throw Object.assign(new Error(`Offer cannot be accepted from ${offer.status}.`), { status: 409 });
    if (Date.parse(offer.response_deadline) <= Date.now()) throw Object.assign(new Error('Offer response window has expired.'), { status: 409 });
    const profile = db.prepare('SELECT maximum_capacity,reserved_capacity FROM recipient_profiles WHERE organization_id=?').get(recipientId);
    if (profile.maximum_capacity - profile.reserved_capacity < offer.offered_quantity) throw Object.assign(new Error('Recipient no longer has enough unreserved capacity.'), { status: 409 });
    const now = nowIso();
    db.prepare("UPDATE offers SET status='ACCEPTED',reservation_active=1,updated_at=? WHERE id=? AND status='OFFER_SENT'").run(now, offerId);
    db.prepare('UPDATE recipient_profiles SET reserved_capacity=reserved_capacity+? WHERE organization_id=?').run(offer.offered_quantity, recipientId);
    db.prepare("UPDATE surplus_listings SET status='ACCEPTED',updated_at=? WHERE id=?").run(now, listingId);
    db.prepare("UPDATE pickups SET status='SCHEDULED' WHERE offer_id=?").run(offerId);
    const recipient = db.prepare('SELECT name FROM organizations WHERE id=?').get(recipientId);
    addEvent(db, listingId, 'OFFER_ACCEPTED', role, `${recipient.name} accepted and reserved ${offer.offered_quantity} units. Pickup is not yet verified.`, { offerId, recipientId, quantity: offer.offered_quantity });
    addAudit(db, role, 'offer_accepted', 'offer', offerId, { recipientId });
    return getSecondServeState(db);
  });
}

function releaseReservation(db, offer) {
  if (!offer.reservation_active) return;
  db.prepare('UPDATE recipient_profiles SET reserved_capacity=MAX(0,reserved_capacity-?) WHERE organization_id=?').run(offer.offered_quantity, offer.recipient_id);
  db.prepare('UPDATE offers SET reservation_active=0 WHERE id=?').run(offer.id);
}

function recoverListing(db, listingId, role) {
  const listing = currentListing(db, listingId), latest = db.prepare('SELECT * FROM offers WHERE listing_id=? ORDER BY created_at DESC LIMIT 1').get(listingId);
  const prior = db.prepare('SELECT recipient_id FROM offers WHERE listing_id=?').all(listingId);
  const excluded = new Set(prior.map((item) => item.recipient_id));
  const attempt = db.prepare('SELECT COALESCE(MAX(attempt),0)+1 AS n FROM matches WHERE listing_id=?').get(listingId).n;
  const result = evaluateListingForRecovery(db, listing, attempt, excluded);
  if (!result.selected) {
    db.prepare("UPDATE surplus_listings SET status='NEEDS_REVIEW',updated_at=? WHERE id=?").run(nowIso(), listingId);
    addEvent(db, listingId, 'HUMAN_ESCALATION', 'recovery_agent', 'No remaining recipient passed the hard constraints. Human intervention is required.', { excludedRecipients: [...excluded] });
    recordRun(db, listingId, 'recovery', 'needs_review', { listingId, excludedRecipients: [...excluded] }, { status: 'NEEDS_REVIEW' });
    return;
  }
  sendOffer(db, currentListing(db, listingId), result.selected, 'recovery_agent', true);
  recordRun(db, listingId, 'recovery', 'completed', { listingId, excludedRecipients: [...excluded] }, { nextRecipientId: result.selected.recipient_id, score: result.selected.score });
}

function evaluateListingForRecovery(db, listing, attempt, excluded) {
  const blocks = reviewReasons(listing);
  if (blocks.length) return { selected: null };
  const orgs = db.prepare(`SELECT o.*,p.accepted_categories,p.maximum_capacity,p.storage_capabilities,p.close_minute,p.transportation_available,p.preference,p.reliability,p.reserved_capacity
    FROM organizations o JOIN recipient_profiles p ON p.organization_id=o.id ORDER BY o.name`).all();
  const candidates = orgs.map((row) => scoreCandidate(listing, row));
  const sorted = [...candidates.filter((c) => c.eligible && !excluded.has(c.org.id)).sort((a,b)=>b.score-a.score), ...candidates.filter((c)=>!c.eligible || excluded.has(c.org.id))];
  let selected = null;
  for (const c of sorted) {
    const matchId = randomUUID(), reasons = excluded.has(c.org.id) ? ['Previously offered recipient is excluded to prevent duplicate offers.'] : c.reasons;
    const eligible = c.eligible && !excluded.has(c.org.id);
    const result = db.prepare('INSERT INTO matches(id,listing_id,recipient_id,score,components,eligible,reasons,attempt,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(matchId, listing.id, c.org.id, c.score, asJson(c.components), eligible ? 1 : 0, asJson(reasons), attempt, nowIso());
    if (eligible && !selected) selected = { id: matchId, listing_id: listing.id, recipient_id: c.org.id, score: c.score, components: asJson(c.components), eligible: 1 };
    addEvent(db, listing.id, eligible ? 'RECIPIENT_ELIGIBLE' : 'RECIPIENT_FILTERED', 'matching_agent', eligible ? `${c.org.name} scored ${c.score}/100 and passed constraints on recovery attempt ${attempt}.` : `${c.org.name} excluded on recovery attempt ${attempt}: ${reasons[0] || 'hard constraint not met'}.`, { recipientId: c.org.id, score: c.score, eligible, reasons });
  }
  if (selected) {
    addEvent(db, listing.id, 'PLAN_RECALCULATED', 'recovery_agent', 'Cancellation detected. Reservation released, prior recipient excluded, remaining time and eligible matches recalculated.', { attempt, selectedRecipientId: selected.recipient_id, selectedScore: selected.score });
    db.prepare("UPDATE surplus_listings SET status='MATCHING',updated_at=? WHERE id=?").run(nowIso(), listing.id);
  }
  return { selected };
}

export function declineOffer(db, listingId, offerId, recipientId, role = 'recipient') {
  return tx(db, () => {
    const offer = resolveOffer(db, listingId, offerId);
    if (offer.recipient_id !== recipientId) throw Object.assign(new Error('This demo recipient cannot act on another organization’s offer.'), { status: 403 });
    if (offer.status !== 'OFFER_SENT') throw Object.assign(new Error(`Offer cannot be declined from ${offer.status}.`), { status: 409 });
    db.prepare("UPDATE offers SET status='DECLINED',updated_at=? WHERE id=?").run(nowIso(), offerId);
    db.prepare("UPDATE surplus_listings SET status='CANCELLED',updated_at=? WHERE id=?").run(nowIso(), listingId);
    addEvent(db, listingId, 'OFFER_DECLINED', role, 'Recipient declined the offer. The recovery agent will find another eligible option.', { offerId, recipientId });
    addAudit(db, role, 'offer_declined', 'offer', offerId, { recipientId });
    recoverListing(db, listingId, role);
    return getSecondServeState(db);
  });
}

export function cancelAcceptedOffer(db, listingId, offerId, recipientId, role = 'recipient') {
  return tx(db, () => {
    const offer = resolveOffer(db, listingId, offerId);
    if (offer.recipient_id !== recipientId) throw Object.assign(new Error('This demo recipient cannot act on another organization’s offer.'), { status: 403 });
    if (offer.status !== 'ACCEPTED') throw Object.assign(new Error(`Only an accepted offer can be cancelled; current status: ${offer.status}.`), { status: 409 });
    releaseReservation(db, offer);
    db.prepare("UPDATE offers SET status='CANCELLED',updated_at=? WHERE id=?").run(nowIso(), offerId);
    db.prepare("UPDATE pickups SET status='CANCELLED' WHERE offer_id=?").run(offerId);
    db.prepare("UPDATE surplus_listings SET status='CANCELLED',updated_at=? WHERE id=?").run(nowIso(), listingId);
    const name = db.prepare('SELECT name FROM organizations WHERE id=?').get(recipientId).name;
    addEvent(db, listingId, 'OFFER_CANCELLED', role, `${name} cancelled after accepting. Its ${offer.offered_quantity}-unit reservation was released.`, { offerId, recipientId, releasedQuantity: offer.offered_quantity });
    addAudit(db, role, 'accepted_offer_cancelled', 'offer', offerId, { recipientId });
    recoverListing(db, listingId, role);
    return getSecondServeState(db);
  });
}

export function markPickedUp(db, listingId, offerId, recipientId, quantity, role = 'recipient') {
  return tx(db, () => {
    const offer = resolveOffer(db, listingId, offerId);
    if (offer.recipient_id !== recipientId) throw Object.assign(new Error('Only the assigned recipient can report pickup.'), { status: 403 });
    if (offer.status !== 'ACCEPTED') throw Object.assign(new Error('Pickup can only be reported for an accepted offer.'), { status: 409 });
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0 || amount > offer.offered_quantity) throw Object.assign(new Error('Enter a positive pickup quantity no greater than the accepted offer.'), { status: 400 });
    const now = nowIso();
    db.prepare("UPDATE offers SET status='PICKED_UP',updated_at=? WHERE id=?").run(now, offerId);
    db.prepare("UPDATE surplus_listings SET status='PICKED_UP',updated_at=? WHERE id=?").run(now, listingId);
    db.prepare("UPDATE pickups SET status='PICKED_UP',reported_quantity=?,picked_up_at=? WHERE offer_id=?").run(amount, now, offerId);
    addEvent(db, listingId, 'PICKUP_REPORTED', role, `Recipient reported pickup of ${amount} ${currentListing(db, listingId).unit}. Awaiting coordinator verification; not counted as rescued yet.`, { offerId, quantity: amount });
    addAudit(db, role, 'pickup_reported', 'pickup', offerId, { quantity: amount });
    return getSecondServeState(db);
  });
}

export function verifyPickup(db, listingId, offerId, quantity, role = 'coordinator') {
  return tx(db, () => {
    const offer = resolveOffer(db, listingId, offerId);
    if (offer.status !== 'PICKED_UP') throw Object.assign(new Error('Recipient must report pickup before the coordinator can verify it.'), { status: 409 });
    const pickup = db.prepare('SELECT * FROM pickups WHERE offer_id=?').get(offerId), amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0 || amount > pickup.reported_quantity) throw Object.assign(new Error('Verified quantity must be positive and no greater than the recipient-reported amount.'), { status: 400 });
    const listing = currentListing(db, listingId), recipient = db.prepare('SELECT name FROM organizations WHERE id=?').get(offer.recipient_id);
    const now = nowIso();
    db.prepare("UPDATE pickups SET status='VERIFIED',verified_quantity=?,verified_at=? WHERE offer_id=?").run(amount, now, offerId);
    db.prepare("UPDATE surplus_listings SET status='COMPLETED',updated_at=? WHERE id=?").run(now, listingId);
    db.prepare("UPDATE offers SET status='COMPLETED',reservation_active=0,updated_at=? WHERE id=?").run(now, offerId);
    db.prepare('UPDATE recipient_profiles SET reserved_capacity=MAX(0,reserved_capacity-?) WHERE organization_id=?').run(offer.offered_quantity, offer.recipient_id);
    db.prepare('INSERT INTO impact_records(id,listing_id,offer_id,rescued_quantity,unit,rescue_type,verification_status,verified_at) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(), listingId, offerId, amount, listing.unit, listing.strategy_preference, 'VERIFIED', now);
    addEvent(db, listingId, 'PICKUP_VERIFIED', role, `Coordinator verified ${amount} ${listing.unit} picked up by ${recipient.name}. Verified quantity is now counted in impact.`, { offerId, quantity: amount, recipientId: offer.recipient_id });
    addEvent(db, listingId, 'RESCUE_COMPLETED', 'impact_agent', 'Impact ledger updated from a verified pickup record.', { offerId, quantity: amount, unit: listing.unit, verificationStatus: 'VERIFIED' });
    addAudit(db, role, 'pickup_verified', 'pickup', offerId, { quantity: amount });
    return getSecondServeState(db);
  });
}

function mapListing(row) {
  if (!row) return null;
  const business = row.business_id && { id: row.business_id, name: row.business_id === 'golden-crust' ? 'Golden Crust Bakery' : row.business_id };
  return { id: row.id, business, foodName: row.food_name, category: row.category, quantity: row.quantity, unit: row.unit, pickupLocation: row.pickup_location,
    preparedAt: row.prepared_at, expiryType: row.expiry_type, expiryAt: row.expiry_at, bestBeforeAt: row.best_before_at,
    storage: row.storage_condition, allergens: row.allergens, condition: row.food_condition, pickupDeadline: row.pickup_deadline,
    pickupWindowStart: row.pickup_window_start, preference: row.strategy_preference, attested: Boolean(row.business_attested),
    status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function getSecondServeState(db) {
  const id = db.prepare("SELECT value FROM app_meta WHERE key='activeListingId'").get()?.value || null;
  const activeListingRow = id ? currentListing(db, id) : null;
  const recipients = db.prepare(`SELECT o.*,p.accepted_categories,p.maximum_capacity,p.storage_capabilities,p.close_minute,p.transportation_available,p.preference,p.reliability,p.reserved_capacity
    FROM organizations o JOIN recipient_profiles p ON p.organization_id=o.id ORDER BY o.name`).all().map((r) => ({ id:r.id,name:r.name,type:r.type,lat:r.lat,lon:r.lon,serviceRadiusKm:r.service_radius_km,verification:r.verified_status,
      acceptedCategories:fromJson(r.accepted_categories),capacity:r.maximum_capacity,reservedCapacity:r.reserved_capacity,storageCapabilities:fromJson(r.storage_capabilities),closeMinute:r.close_minute,
      transportationAvailable:Boolean(r.transportation_available),preference:r.preference,reliability:r.reliability }));
  const matches = id ? db.prepare(`SELECT m.*,o.name AS recipient_name,o.type AS recipient_type,o.lat,o.lon,p.maximum_capacity,p.reserved_capacity,p.accepted_categories,p.storage_capabilities,p.reliability
    FROM matches m JOIN organizations o ON o.id=m.recipient_id JOIN recipient_profiles p ON p.organization_id=o.id WHERE m.listing_id=? ORDER BY m.attempt DESC,m.eligible DESC,m.score DESC`).all(id).map((m) => ({ id:m.id,listingId:m.listing_id,recipient:{id:m.recipient_id,name:m.recipient_name,type:m.recipient_type,lat:m.lat,lon:m.lon,capacity:m.maximum_capacity,reservedCapacity:m.reserved_capacity,acceptedCategories:fromJson(m.accepted_categories),storageCapabilities:fromJson(m.storage_capabilities),reliability:m.reliability},score:m.score,components:fromJson(m.components,{}),eligible:Boolean(m.eligible),reasons:fromJson(m.reasons),attempt:m.attempt,createdAt:m.created_at })) : [];
  const offers = id ? db.prepare('SELECT of.*,o.name AS recipient_name FROM offers of JOIN organizations o ON o.id=of.recipient_id WHERE of.listing_id=? ORDER BY of.created_at DESC').all(id).map((o)=>({id:o.id,listingId:o.listing_id,recipientId:o.recipient_id,recipientName:o.recipient_name,quantity:o.offered_quantity,status:o.status,responseDeadline:o.response_deadline,reservationActive:Boolean(o.reservation_active),createdAt:o.created_at,updatedAt:o.updated_at})) : [];
  const pickups = id ? db.prepare('SELECT p.* FROM pickups p JOIN offers o ON o.id=p.offer_id WHERE o.listing_id=? ORDER BY p.rowid DESC').all(id).map((p)=>({offerId:p.offer_id,status:p.status,reportedQuantity:p.reported_quantity,verifiedQuantity:p.verified_quantity,scheduledWindow:p.scheduled_window,pickedUpAt:p.picked_up_at,verifiedAt:p.verified_at})) : [];
  const events = id ? db.prepare('SELECT * FROM agent_events WHERE listing_id=? ORDER BY created_at,id').all(id).map((e)=>({id:e.id,type:e.event_type,actorRole:e.actor_role,description:e.description,metadata:fromJson(e.metadata,{}),createdAt:e.created_at})) : [];
  const runs = id ? db.prepare('SELECT * FROM agent_runs WHERE listing_id=? ORDER BY started_at,id DESC').all(id).map((r)=>({id:r.id,type:r.agent_type,status:r.status,input:fromJson(r.input_summary,{}),output:fromJson(r.output_summary,{}),startedAt:r.started_at,finishedAt:r.finished_at})) : [];
  const impact = db.prepare("SELECT rescue_type AS rescueType,unit,SUM(rescued_quantity) AS quantity,COUNT(*) AS pickups FROM impact_records WHERE verification_status='VERIFIED' GROUP BY rescue_type,unit ORDER BY rescue_type").all();
  const audit = db.prepare('SELECT * FROM audit_logs ORDER BY created_at,id').all().map((a)=>({role:a.actor_role,action:a.action,entityType:a.entity_type,entityId:a.entity_id,metadata:fromJson(a.metadata,{}),createdAt:a.created_at}));
  const groupedQuantities = (rows) => Object.fromEntries(rows.map((row) => [row.unit, Number(row.quantity)]));
  const reported = db.prepare('SELECT unit,COALESCE(SUM(quantity),0) AS quantity FROM surplus_listings GROUP BY unit').all();
  const accepted = db.prepare("SELECT l.unit,SUM(o.offered_quantity) AS quantity FROM offers o JOIN surplus_listings l ON l.id=o.listing_id WHERE o.status IN ('ACCEPTED','PICKED_UP','COMPLETED') GROUP BY l.unit").all();
  return { activeListing:mapListing(activeListingRow), recipients, matches, offers, pickups, events, agentRuns:runs, audit, impact,
    impactSummary:{ verifiedByUnit:groupedQuantities(impact), verifiedPickups:impact.reduce((sum,row)=>sum+Number(row.pickups),0), reportedByUnit:groupedQuantities(reported), acceptedByUnit:groupedQuantities(accepted),
      verifiedOnly:true, estimatedWasteAvoided:null }, weights:MATCH_WEIGHTS, demo:true, timezone:'Europe/Istanbul' };
}
