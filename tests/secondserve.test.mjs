import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { MATCH_WEIGHTS, acceptOffer, cancelAcceptedOffer, dispatchOffer, getNearbyDemoListings, getSecondServeState, initializeSecondServe, loadDemoScenario, markPickedUp, runDecisionAgent, verifyPickup } from '../secondserve-domain.mjs';
import { recommendFoodListings } from '../secondserve-recommendations.mjs';

function setup() {
  const db = new DatabaseSync(':memory:');
  initializeSecondServe(db, readFileSync(new URL('../secondserve-schema.sql', import.meta.url), 'utf8'));
  return db;
}
function runAndDispatch(db) {
  runDecisionAgent(db);
  dispatchOffer(db);
  const s=getSecondServeState(db); return { listing:s.activeListing, offer:s.offers[0] };
}

test('recovery demo ranks only hard-eligible recipients and explains exclusions', () => {
  const db=setup(); loadDemoScenario(db,'recovery');
  const s=runDecisionAgent(db);
  assert.equal(s.activeListing.status,'MATCHING');
  assert.equal(s.matches.find(m=>m.eligible).recipient.id,'charity-a');
  assert.equal(s.matches.find(m=>m.recipient.id==='charity-c').eligible,false);
  assert.match(s.matches.find(m=>m.recipient.id==='charity-c').reasons.join(' '),/Capacity/);
  assert.equal(Object.values(MATCH_WEIGHTS).reduce((a,b)=>a+b,0),1);
  db.close();
});

test('acceptance reserves capacity and duplicate acceptance is rejected', () => {
  const db=setup(); loadDemoScenario(db,'recovery'); const {listing,offer}=runAndDispatch(db);
  const s=acceptOffer(db,listing.id,offer.id,'charity-a');
  assert.equal(s.activeListing.status,'ACCEPTED');
  assert.equal(s.recipients.find(r=>r.id==='charity-a').reservedCapacity,20);
  assert.throws(()=>acceptOffer(db,listing.id,offer.id,'charity-a'),/cannot be accepted/);
  assert.equal(getSecondServeState(db).recipients.find(r=>r.id==='charity-a').reservedCapacity,20);
  db.close();
});

test('accepted cancellation releases capacity and recovery automatically sends a new offer', () => {
  const db=setup(); loadDemoScenario(db,'recovery'); const {listing,offer}=runAndDispatch(db);
  acceptOffer(db,listing.id,offer.id,'charity-a');
  const s=cancelAcceptedOffer(db,listing.id,offer.id,'charity-a');
  assert.equal(s.activeListing.status,'OFFER_SENT');
  assert.equal(s.offers[0].recipientId,'kitchen-b');
  assert.equal(s.offers[0].status,'OFFER_SENT');
  assert.equal(s.recipients.find(r=>r.id==='charity-a').reservedCapacity,0);
  assert.ok(s.events.some(e=>e.type==='PLAN_RECALCULATED'));
  assert.ok(s.events.some(e=>e.type==='REPLACEMENT_OFFER_SENT'));
  assert.equal(s.offers.length,2);
  db.close();
});

test('recipient pickup report is not counted until a coordinator verifies quantity', () => {
  const db=setup(); loadDemoScenario(db,'recovery'); const {listing,offer}=runAndDispatch(db);
  acceptOffer(db,listing.id,offer.id,'charity-a');
  const reported=markPickedUp(db,listing.id,offer.id,'charity-a',18);
  assert.equal(reported.activeListing.status,'PICKED_UP');
  assert.deepEqual(reported.impactSummary.verifiedByUnit,{});
  assert.equal(reported.pickups[0].reportedQuantity,18);
  const done=verifyPickup(db,listing.id,offer.id,17);
  assert.equal(done.activeListing.status,'COMPLETED');
  assert.deepEqual(done.impactSummary.verifiedByUnit,{pieces:17});
  assert.equal(done.impactSummary.verifiedPickups,1);
  assert.equal(done.pickups[0].verifiedQuantity,17);
  db.close();
});

test('safety hold blocks matching if key handling facts are missing', () => {
  const db=setup(); loadDemoScenario(db,'review');
  const s=runDecisionAgent(db);
  assert.equal(s.activeListing.status,'NEEDS_REVIEW');
  assert.equal(s.offers.length,0);
  const reason=s.events.at(-1).metadata.reasons.join(' ');
  assert.match(reason,/storage condition is missing/i);
  assert.match(reason,/not attested/i);
  db.close();
});

test('expired use-by listing is blocked; it is not treated like best-before', () => {
  const db=setup(); loadDemoScenario(db,'success');
  db.prepare("UPDATE surplus_listings SET expiry_type='use_by',expiry_at=?,business_attested=1,allergens='Wheat' WHERE status='AVAILABLE'").run(new Date(Date.now()-60_000).toISOString());
  let s=runDecisionAgent(db);
  assert.equal(s.activeListing.status,'EXPIRED'); assert.equal(s.matches.length,0);
  loadDemoScenario(db,'success');
  db.prepare("UPDATE surplus_listings SET expiry_type='best_before',best_before_at=?,business_attested=1,allergens='Wheat' WHERE status='AVAILABLE'").run(new Date(Date.now()-60_000).toISOString());
  s=runDecisionAgent(db);
  assert.equal(s.activeListing.status,'NEEDS_REVIEW'); assert.equal(s.offers.length,0);
  db.close();
});

test('pickup cannot be verified before recipient reports it', () => {
  const db=setup(); loadDemoScenario(db,'recovery'); const {listing,offer}=runAndDispatch(db);
  acceptOffer(db,listing.id,offer.id,'charity-a');
  assert.throws(()=>verifyPickup(db,listing.id,offer.id,20),/must report pickup/);
  assert.deepEqual(getSecondServeState(db).impactSummary.verifiedByUnit,{});
  db.close();
});

test('verified impact quantities are grouped by unit, never added together', () => {
  const db=setup(); loadDemoScenario(db,'recovery'); const {listing,offer}=runAndDispatch(db);
  const now=new Date().toISOString();
  const insert=db.prepare("INSERT INTO impact_records(id,listing_id,offer_id,rescued_quantity,unit,rescue_type,verification_status,verified_at) VALUES(?,?,?,?,?,'donation','VERIFIED',?)");
  insert.run('impact-pieces',listing.id,offer.id,17,'pieces',now);
  insert.run('impact-kg',listing.id,offer.id,2.5,'kg',now);
  assert.deepEqual(getSecondServeState(db).impactSummary.verifiedByUnit,{kg:2.5,pieces:17});
  db.close();
});

test('nearby food board includes fictional donation and discounted pins with valid pickup windows', () => {
  const listings=getNearbyDemoListings();
  assert.equal(listings.length,10);
  assert.deepEqual([...new Set(listings.map(item=>item.category))].sort(),['Bakery','Dairy','Drinks','Pantry','Prepared meals','Produce']);
  assert.deepEqual([...new Set(listings.map(item=>item.offerType))].sort(),['discounted_sale','donation']);
  assert.ok(listings.every(item=>item.business.startsWith('Demo ')));
  assert.ok(listings.every(item=>Number.isFinite(item.lat)&&Number.isFinite(item.lon)&&Date.parse(item.pickupUntil)>Date.now()));
});

test('profile ranking promotes chosen offer/category within the selected area and radius', () => {
  const listings=getNearbyDemoListings();
  const recommended=recommendFoodListings(listings,{origin:{lat:40.9824,lon:29.0608},profile:{neighborhood:'kadikoy',categories:['Produce'],offerPreference:'discounted_sale'},radiusKm:5});
  assert.equal(recommended[0].category,'Produce');
  assert.equal(recommended[0].offerType,'discounted_sale');
  assert.equal(recommended[0].recommended,true);
  assert.ok(recommended.every(item=>item.distanceKm<=5));
  assert.match(recommended[0].recommendationReason,/food and offer preferences/);
});

test('without a profile, the food board sorts by distance and makes no personalized claims', () => {
  const listings=getNearbyDemoListings();
  const nearby=recommendFoodListings(listings,{profile:null,radiusKm:3});
  assert.ok(nearby.every((item,index)=>index===0||nearby[index-1].distanceKm<=item.distanceKm));
  assert.ok(nearby.every(item=>item.recommended===false));
});
