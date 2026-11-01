import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { MATCH_WEIGHTS, acceptOffer, cancelAcceptedOffer, createProviderBatch, dispatchOffer, getNearbyDemoListings, getNearbyListings, getProviderBatches, getSecondServeState, initializeSecondServe, loadDemoScenario, markPickedUp, purchaseProviderOffer, recordProviderSale, runDecisionAgent, runProviderEveningCloseout, verifyPickup } from '../secondserve-domain.mjs';
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
  const reason=s.events.find(event=>event.type==='SAFETY_REVIEW_REQUIRED').metadata.reasons.join(' ');
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

test('morning production stock reconciles POS sales and auto-lists only leftovers at 21:00 Istanbul time', () => {
  const db=setup(), morning=new Date('2026-11-01T10:00:00.000Z');
  const batch=createProviderBatch(db,{foodName:'Chocolate chip cookies',category:'bakery',openingQuantity:20,unit:'pieces',retailPriceTry:2.5,discountPercent:30,
    pickupLocation:'Kadıköy, Istanbul',pickupDeadline:'2026-11-01T20:30:00.000Z',allergens:'Wheat, milk, eggs',storage:'ambient',condition:'reported_intact',expiryType:'not_applicable',attested:true},'donor',morning);
  assert.equal(batch.status,'TRACKING');assert.equal(batch.remainingQuantity,20);
  recordProviderSale(db,batch.id,12,{externalRef:'register-event-1',now:new Date('2026-11-01T12:00:00.000Z')});
  recordProviderSale(db,batch.id,12,{externalRef:'register-event-1',now:new Date('2026-11-01T12:01:00.000Z')});
  assert.equal(getProviderBatches(db)[0].remainingQuantity,8);
  assert.deepEqual(runProviderEveningCloseout(db,new Date('2026-11-01T17:59:00.000Z')),[]);
  const published=runProviderEveningCloseout(db,new Date('2026-11-01T18:00:00.000Z'));
  assert.equal(published.length,1);assert.equal(published[0].quantity,8);
  const offer=getNearbyListings(db).find(item=>item.batchId===batch.id);
  assert.equal(offer.quantity,8);assert.equal(offer.priceTry,1.75);assert.equal(offer.regularPriceTry,2.5);
  const receipt=purchaseProviderOffer(db,batch.id,3,new Date('2026-11-01T18:01:00.000Z'));
  assert.equal(receipt.totalTry,5.25);assert.equal(receipt.remainingQuantity,5);assert.equal(receipt.paymentTaken,false);
  assert.equal(getProviderBatches(db)[0].remainingQuantity,5);db.close();
});

test('provider sales and evening release cannot oversell, and unknown handling facts block batch creation', () => {
  const db=setup(),morning=new Date('2026-11-01T10:00:00.000Z'),facts={foodName:'Cookies',category:'bakery',openingQuantity:5,unit:'pieces',retailPriceTry:1,
    discountPercent:20,pickupLocation:'Kadıköy',pickupDeadline:'2026-11-01T20:30:00.000Z',allergens:'Unknown',storage:'ambient',condition:'reported_intact',expiryType:'not_applicable',attested:true};
  assert.throws(()=>createProviderBatch(db,facts,'donor',morning),/Confirm the morning quantity/);
  facts.allergens='Wheat';const batch=createProviderBatch(db,facts,'donor',morning);
  assert.throws(()=>recordProviderSale(db,batch.id,6),/Sale exceeds available stock/);
  runProviderEveningCloseout(db,new Date('2026-11-01T18:00:00.000Z'));
  assert.throws(()=>purchaseProviderOffer(db,batch.id,6),/Only 5 pieces remain/);db.close();
});
