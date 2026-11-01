import { DEMO_CENTER, NEIGHBORHOODS, recommendFoodListings } from './secondserve-recommendations.mjs';
const $ = (id) => document.getElementById(id);
const savedSession = (() => { try { return JSON.parse(sessionStorage.getItem('secondserve.demo.session') || '{}'); } catch { return {}; } })();
const savedProfile = (() => { try { return JSON.parse(localStorage.getItem('secondserve.food.profile') || 'null'); } catch { return null; } })();
const state = { token: savedSession.token || '', role: savedSession.role || '', organizationId: savedSession.organizationId || '', data: null, model: false, busy: false, view:'nearby', listings:[], offerFilter:'all', categoryFilter:'all', radiusKm:Number(savedProfile?.radiusKm||10), userLocation:null, locationSource:'demo', profile:savedProfile, marketMap:null, marketMarkers:[], userMarker:null, foodPhotoDataUrl:'',batchPhotoDataUrl:'',providerBatches:[],activeProviderBatch:null };
const roleNames = { neighbor:'Food seeker', donor: 'Food business', coordinator: 'Rescue coordinator', recipient: 'Recipient partner' };
const marketCategories = [
  { value:'Bakery',label:'Bakery & bread',icon:'♨' },{ value:'Produce',label:'Fruit & veg',icon:'✿' },
  { value:'Prepared meals',label:'Ready meals',icon:'▤' },{ value:'Dairy',label:'Dairy & chilled',icon:'◉' },
  { value:'Pantry',label:'Pantry staples',icon:'▦' },{ value:'Drinks',label:'Drinks',icon:'◌' }
];
if(state.profile){state.userLocation=NEIGHBORHOODS[state.profile.neighborhood]?.lat?{lat:NEIGHBORHOODS[state.profile.neighborhood].lat,lon:NEIGHBORHOODS[state.profile.neighborhood].lon}:DEMO_CENTER;state.locationSource='profile';}
$('marketRadius').value=String(state.radiusKm);
const fmtNum = (n) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(Number(n || 0));
const fmtUnits = (byUnit) => Object.entries(byUnit || {}).map(([unit,quantity]) => `${fmtNum(quantity)} ${unit}`).join(' · ') || '0';
const safe = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const when = (v) => v ? new Intl.DateTimeFormat(undefined, { dateStyle:'short', timeStyle:'short' }).format(new Date(v)) : '—';
function toast(message) { const el=$('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),3200); }
function setBusy(value) { state.busy=value; }
async function request(path, {method='GET',body,auth=true}={}) {
  const headers={}; if(body!==undefined) headers['content-type']='application/json'; if(auth&&state.token) headers['x-secondserve-session']=state.token;
  const response=await fetch(path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const result=await response.json().catch(()=>({error:'The server returned an unreadable response.'}));
  if(!response.ok) throw new Error(result.error||`Request failed (${response.status}).`);
  return result;
}
function showLogin() { $('loginScreen').hidden=false; $('appShell').hidden=true; $('loginOrgWrap').hidden=true; }
async function login(role) {
  try {
    const body={role}; if(role==='recipient') body.organizationId=$('loginOrg').value;
    const result=await request('/api/secondserve/session',{method:'POST',body,auth:false});
    state.token=result.token; state.role=result.role; state.organizationId=result.organizationId||''; sessionStorage.setItem('secondserve.demo.session',JSON.stringify({token:state.token,role:state.role,organizationId:state.organizationId}));
    $('loginScreen').hidden=true; $('appShell').hidden=false; $('roleLabel').textContent=roleNames[state.role]+(state.organizationId?` · ${orgName(state.organizationId)}`:'');
    setView(role==='neighbor'?'nearby':'operations');
    await refresh();
    if(role==='neighbor') await loadMarketplace();
    if(role==='donor') await loadProviderBatches();
    if(role==='coordinator'&&!state.data?.activeListing) toast('Choose a scenario and load the recovery workspace.');
  } catch(e) { toast(e.message); }
}
function orgName(id) { return state.data?.recipients?.find(x=>x.id===id)?.name || ({'charity-a':'Charity A','kitchen-b':'Community Kitchen B','charity-c':'Charity C'}[id]||'Recipient'); }
function activeOffer(d) { return d?.offers?.[0] || null; }
function statusPill(el, value) { el.textContent=value||'WAITING'; el.dataset.status=value||'WAITING'; }
function render(d) {
  state.data=d; const item=d.activeListing, offer=activeOffer(d);
  $('workflow').hidden=state.role!=='coordinator';
  $('providerPanel').hidden=state.role!=='donor';
  $('reportedMetric').textContent=fmtUnits(d.impactSummary.reportedByUnit);
  $('acceptedMetric').textContent=fmtUnits(d.impactSummary.acceptedByUnit);
  $('rescuedMetric').textContent=fmtUnits(d.impactSummary.verifiedByUnit);
  $('verifiedPickupMetric').textContent=`${fmtNum(d.impactSummary.verifiedPickups)} verified pickups`;
  $('impactVerified').textContent=fmtUnits(d.impactSummary.verifiedByUnit); $('impactPickups').textContent=fmtNum(d.impactSummary.verifiedPickups);
  $('deadlineChip').textContent=item?`PICKUP BY ${when(item.pickupDeadline)}`:'No active listing';
  $('heroScenario').textContent=item?`${item.quantity} ${item.unit} ${item.foodName.toLowerCase()} · ${item.status.replaceAll('_',' ')}`:'Load a scenario to begin.';
  $('listingForm').hidden=!(state.role==='donor'&&!item);
  $('listingSummary').hidden=!item;
  if(item) {
    $('listingTitle').textContent=`${fmtNum(item.quantity)} ${item.unit} · ${item.foodName}`;
    $('listingSubtitle').textContent=`${item.business.name} · ${item.pickupLocation||'Kadıköy, Istanbul'} · ${item.preference.replaceAll('_',' ')}`;
    statusPill($('listingStatus'),item.status);
    $('listingSummary').innerHTML=[
      ['CATEGORY',item.category.replaceAll('_',' ')],['PICKUP DEADLINE',when(item.pickupDeadline)],['STORAGE',item.storage],['DATE TYPE',item.expiryType.replaceAll('_',' ')],['DATE VALUE',item.expiryAt?when(item.expiryAt):item.bestBeforeAt?when(item.bestBeforeAt):'Not stated'],['ALLERGENS',item.allergens],['CONDITION',item.condition.replaceAll('_',' ')],['PREFERENCE',item.preference.replaceAll('_',' ')],['BUSINESS ATTESTATION',item.attested?'Recorded':'Missing']
    ].map(([label,value])=>`<div class="summary-cell"><small>${safe(label)}</small><b>${safe(value)}</b></div>`).join('');
    renderGates(item,d,offer);
  } else {
    $('listingTitle').textContent='No active surplus'; $('listingSubtitle').textContent=state.role==='donor'?'Enter the batch facts below; the business must confirm the listing before it becomes active.':'Load a demo scenario or ask a food business to report a batch.';
    statusPill($('listingStatus'),'WAITING'); $('listingSummary').replaceChildren();
    $('decisionStatus').textContent='Waiting for a listing'; $('decisionExplanation').textContent='The agent will explain constraints, candidates, exclusions, and its next action.';
    $('gateList').querySelectorAll('b').forEach(b=>b.textContent='WAITING');
  }
  renderMatches(d.matches||[]);
  renderOffer(item,offer);
  renderEvents(d.events||[]);
  renderRuns(d.agentRuns||[]);
  if(state.role==='coordinator') $('impactNote').textContent='Reported food and accepted offers are separate from verified rescued food. Nothing counts as rescued until pickup quantity is verified.';
}
function renderGates(item,d,offer) {
  const brief=$('museBrief'), briefKey=item?`${item.id}:${item.status}:${d.matches?.length||0}`:'';
  if(brief.dataset.key!==briefKey){brief.dataset.key=briefKey;brief.replaceChildren();brief.hidden=true;}
  $('askMuseBrief').hidden=!(state.model&&state.role==='coordinator'&&item&&['MATCHING','NEEDS_REVIEW'].includes(item.status));
  const needs= item.status==='NEEDS_REVIEW';
  const validAttest=Boolean(item.attested);
  const validDate=item.expiryType!=='unknown'&&item.storage!=='unknown'&&!(item.expiryType==='use_by'&&item.expiryAt&&Date.parse(item.expiryAt)<=Date.now());
  const hasEligible=(d.matches||[]).some(m=>m.eligible);
  const gates=[
    [validAttest,needs?'REVIEW':validAttest?'CONFIRMED':'MISSING'],
    [validDate,needs?'REVIEW':validDate?'CHECKED':'MISSING'],
    [hasEligible,hasEligible?'PASSED':item.status==='MATCHING'?'NO MATCH':'PENDING'],
    [Boolean(offer&&['ACCEPTED','PICKED_UP','COMPLETED'].includes(offer.status)),item.status.replaceAll('_',' ')]
  ];
  [...$('gateList').children].forEach((row,i)=>{row.classList.toggle('ok',gates[i][0]);row.classList.toggle('blocked',needs||item.status==='EXPIRED');row.querySelector('b').textContent=gates[i][1];});
  $('decisionStatus').textContent=needs?'Human review required':item.status==='MATCHING'?'Eligible recipient found':item.status.replaceAll('_',' ');
  const last=d.events?.at(-1);
  const selected=(d.matches||[]).find(m=>m.eligible&&m.attempt===Math.max(1,...(d.matches||[]).map(x=>x.attempt)));
  $('decisionExplanation').textContent=needs?(last?.description||'The listing is held. Complete verified facts and ask a coordinator to review.'):
    selected?`${selected.recipient.name} currently leads at ${selected.score}/100. The match score only ranks recipients that passed every hard constraint.`:
    item.status==='AVAILABLE'?'Run deterministic safety and eligibility checks before the system proposes a recipient.':last?.description||'The rescue workflow is waiting for its next authorized action.';
  $('runAgent').hidden=!(state.role==='coordinator'&&item.status==='AVAILABLE');
  $('dispatchOffer').hidden=!(state.role==='coordinator'&&item.status==='MATCHING'&&hasEligible);
}
function renderMatches(matches) {
  const list=$('matchList'); list.replaceChildren();
  if(!matches.length){list.innerHTML='<div class="empty-state">Eligible recipients and exclusion reasons appear after the agent runs.</div>'; $('matchCaption').textContent='No recipients have been evaluated yet.';return;}
  const attempt=Math.max(...matches.map(m=>m.attempt)); const current=matches.filter(m=>m.attempt===attempt);
  $('matchCaption').textContent=`Attempt ${attempt} · ${current.filter(m=>m.eligible).length} eligible · ${current.length-current.filter(m=>m.eligible).length} excluded by hard constraints.`;
  for(const m of current){const row=document.createElement('div');row.className='match-row';const reasons=m.reasons?.length?m.reasons.join(' '):`${m.recipient.capacity-m.recipient.reservedCapacity} units capacity available · ${m.recipient.reliability*100}% demo reliability`;
    const parts=Object.entries(m.components||{}).map(([k,v])=>`${k.replace(/[A-Z]/g,x=>' '+x.toLowerCase())} ${Math.round(v)}`).join(' · ');
    row.innerHTML=`<div class="match-name"><b>${safe(m.recipient.name)}</b><small>${safe(m.recipient.type.replaceAll('_',' '))} · ${m.eligible?'ranked candidate':'filtered out'}</small></div><div class="score-display"><b>${fmtNum(m.score)}</b><span class="score-bar"><i style="width:${Math.min(100,Math.max(0,m.score))}%"></i></span></div><div class="match-reason" title="${safe(parts)}">${safe(reasons)}</div><span class="match-status ${m.eligible?'':'filtered'}">${m.eligible?'ELIGIBLE':'EXCLUDED'}</span>`;
    list.append(row);
  }
}
function renderOffer(item,offer) {
  const actions=$('offerActions');actions.replaceChildren();
  if(!item||!offer){$('offerTitle').textContent='No offer sent';statusPill($('offerStatus'),'WAITING');$('offerContent').innerHTML='<div class="empty-state">An offer appears here after the coordinator dispatches an eligible match.</div>';return;}
  $('offerTitle').textContent=offer.status==='OFFER_SENT'?'Recipient response needed':offer.status.replaceAll('_',' ').toLowerCase().replace(/^./,c=>c.toUpperCase()); statusPill($('offerStatus'),offer.status);
  $('offerContent').innerHTML=`<div class="offer-card"><div class="offer-recipient"><b>${safe(offer.recipientName)}</b><span class="match-status">${safe(offer.status)}</span></div><div class="offer-quantity">${fmtNum(offer.quantity)} <small>${safe(item.unit)} · ${safe(item.foodName)}</small></div><div class="offer-details"><span>BUSINESS<b>${safe(item.business.name)}</b></span><span>PICKUP BY<b>${when(item.pickupDeadline)}</b></span><span>OFFER RESPONSE BY<b>${when(offer.responseDeadline)}</b></span><span>RESERVATION<b>${offer.reservationActive?'Capacity held':'Not reserved'}</b></span></div></div>`;
  const action=(label,cls,fn)=>{const b=document.createElement('button');b.className=`button ${cls||''}`;b.textContent=label;b.onclick=fn;actions.append(b);};
  const listingPath=`/api/secondserve/listings/${encodeURIComponent(item.id)}/offers/${encodeURIComponent(offer.id)}`;
  if(state.role==='recipient'&&offer.recipientId===state.organizationId&&offer.status==='OFFER_SENT'){
    action('Accept & reserve capacity','primary',()=>doAction(`${listingPath}/accept`));action('Decline offer','',()=>doAction(`${listingPath}/decline`));
  }
  if(state.role==='recipient'&&offer.recipientId===state.organizationId&&offer.status==='ACCEPTED'){
    action('Simulate recipient cancellation','',()=>doAction(`${listingPath}/cancel`));
    const qty=document.createElement('input');qty.type='number';qty.min='0.1';qty.step='any';qty.max=String(offer.quantity);qty.value=String(offer.quantity);qty.setAttribute('aria-label','Quantity picked up');qty.className='pickup-quantity';actions.append(qty);
    action('Report pickup','primary',()=>doAction(`${listingPath}/pickup`,{quantity:Number(qty.value)}));
  }
  if(['coordinator','donor'].includes(state.role)&&offer.status==='PICKED_UP'){
    const pickup=d.pickups?.find(p=>p.offerId===offer.id); const amount=pickup?.reportedQuantity ?? offer.quantity;
    const qty=document.createElement('input');qty.type='number';qty.min='0.1';qty.step='any';qty.max=String(amount);qty.value=String(amount);qty.setAttribute('aria-label','Verified pickup quantity');qty.className='pickup-quantity';actions.append(qty);
    action('Verify quantity & complete rescue','primary',()=>doAction(`${listingPath}/verify`,{quantity:Number(qty.value)}));
  }
}
function renderEvents(events) {
  const host=$('timeline');host.replaceChildren();
  if(!events.length){host.innerHTML='<div class="empty-state">The event log will show intake, constraints, matching, offer responses, recovery, and pickup verification.</div>';return;}
  for(const e of [...events].reverse()) {const row=document.createElement('div');row.className=`timeline-event ${/CANCEL|FILTER|REVIEW|EXPIRED|ESCALATION/.test(e.type)?'alert':''}`;row.innerHTML=`<span class="event-dot">${/CANCEL|FILTER|REVIEW|EXPIRED/.test(e.type)?'!':'✓'}</span><div class="event-copy"><strong>${safe(e.description)}</strong><small>AGENT · ${safe(e.actorRole.replaceAll('_',' '))}</small><time>${when(e.createdAt)}</time></div>`;host.append(row);}
}
function renderRuns(runs) {const host=$('agentRunList');host.replaceChildren();if(!runs.length){host.innerHTML='<span class="run-chip"><i></i> Standing by</span>';return;}for(const r of runs){const chip=document.createElement('span');chip.className='run-chip';chip.innerHTML=`<i></i>${safe(r.type.toUpperCase())} · ${safe(r.status.toUpperCase())}`;host.append(chip);}}
async function refresh() { try { render(await request('/api/secondserve/state')); } catch(e) { toast(e.message); } }
function setView(view) {
  state.view=view;
  $('nearby').hidden=view!=='nearby';
  document.querySelectorAll('[data-operations]').forEach(el=>{el.hidden=view!=='operations';});
  document.querySelectorAll('.sidebar nav a[data-view]').forEach(a=>a.classList.toggle('active',a.dataset.view===view));
  $('viewLabel').textContent=view==='nearby'?'NEARBY FOOD':'RESCUE OPERATIONS';
  if(view==='nearby'){if(!state.listings.length)loadMarketplace();requestAnimationFrame(()=>state.marketMap?.invalidateSize());}
}
function initMarketMap(){
  if(state.marketMap||!window.L)return;
  state.marketMap=L.map('nearbyMap',{scrollWheelZoom:false}).setView([DEMO_CENTER.lat,DEMO_CENTER.lon],13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(state.marketMap);
}
function visibleMarketListings(){
  const origin=state.userLocation||DEMO_CENTER;
  return recommendFoodListings(state.listings,{origin,profile:state.profile,offerFilter:state.offerFilter,categoryFilter:state.categoryFilter,radiusKm:state.radiusKm});
}
function renderMarketplace(){
  const list=$('marketList'); if(!list)return;
  initMarketMap(); const items=visibleMarketListings(); list.replaceChildren(); state.marketMarkers.forEach(m=>m.remove());state.marketMarkers=[];
  renderCategoryFilters();
  $('marketCount').textContent=`${items.length} demo ${items.length===1?'listing':'listings'}`;
  $('mapLiveCount').innerHTML=`<i></i> ${items.length} ${items.length===1?'SPOT':'SPOTS'}`;
  $('mapCaption').textContent=state.locationSource==='device'?'Approximate distance from your location · demo listings':state.profile?`Approximate distance from ${NEIGHBORHOODS[state.profile.neighborhood]?.label||'your area'} · demo listings`:'Illustrative demo locations · Kadıköy';
  $('mapAreaLabel').textContent=state.locationSource==='device'?'YOUR AREA · APPROXIMATE':state.profile?`${NEIGHBORHOODS[state.profile.neighborhood]?.label||'YOUR AREA'} · DEMO`:'KADIKÖY · DEMO AREA';
  $('profileSummary').textContent=state.profile?`${state.profile.name?`Recommendations for ${state.profile.name}`:'Your recommendations'} · ${NEIGHBORHOODS[state.profile.neighborhood]?.label||'Kadıköy'} · ${state.profile.householdSize} ${Number(state.profile.householdSize)===1?'person':'people'} · ${state.profile.offerPreference==='all'?'donations + discounts':state.profile.offerPreference==='donation'?'donations first':'discounts first'}`:'Create a profile to personalize nearby recommendations.';
  $('editProfile').textContent=state.profile?'✎ Edit your profile':'＋ Create your profile';
  if(!items.length)list.innerHTML='<div class="empty-state">No demo listings match these filters within this radius. Try a wider search or change the category.</div>';
  for(const [index,item] of items.entries()){
    const card=document.createElement('article');card.className='market-card';card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',`${item.name}, ${item.offerType==='donation'?'free donation':`${item.priceTry} Turkish lira`}, ${item.distanceKm.toFixed(1)} kilometers away`);
    const price=item.offerType==='donation'?'FREE':`${fmtNum(item.priceTry)} ₺`;
    const pickLabel=item.recommended?`<div class="recommendation-badge">✦ RECOMMENDED FOR YOU · ${safe(item.recommendationReason)}</div>`:'';
    const category=marketCategories.find(value=>value.value===item.category);
    card.innerHTML=`<div>${pickLabel}<div class="market-card-labels"><span class="category-pill"><i aria-hidden="true">${category?.icon||'•'}</i>${safe(category?.label||item.category)}</span><span class="market-type ${item.offerType==='discounted_sale'?'discount':''}">${item.offerType==='donation'?'FREE DONATION':item.discountPercent?`${item.discountPercent}% OFF`:'DISCOUNTED'}</span></div><h3>${safe(item.name)}</h3><div class="market-business">${safe(item.business)}</div><p>${safe(item.note)}</p></div><div class="market-price">${price}<small>${item.regularPriceTry?`WAS ${fmtNum(item.regularPriceTry)} ₺`:(item.offerType==='donation'?'NO COST':'DEMO PRICE')}</small></div><div class="market-card-foot"><span><b>${fmtNum(item.quantity)} ${safe(item.unit)}</b> left</span><span>${safe(item.location)}</span><span><b>${item.distanceKm.toFixed(1)} km</b> approx.</span><span>Pickup by ${when(item.pickupUntil)}</span></div>`;
    if(item.purchaseable&&state.role==='neighbor'){
      const buy=document.createElement('div');buy.className='quick-buy';const quantity=document.createElement('input');quantity.type='number';quantity.min='1';quantity.step='1';quantity.max=String(item.quantity);quantity.value='1';quantity.setAttribute('aria-label',`Quantity of ${item.name} to buy for pickup`);
      const action=document.createElement('button');action.className='button primary';action.type='button';action.textContent='Buy for pickup · demo';action.title='Simulated purchase only; no payment is taken.';
      action.onclick=async event=>{event.stopPropagation();action.disabled=true;try{const receipt=await request(`/api/secondserve/nearby/provider-${encodeURIComponent(item.batchId)}/purchase`,{method:'POST',body:{quantity:Number(quantity.value)}});await loadMarketplace();toast(`${receipt.quantity} ${receipt.unit} reserved for pickup. No payment was taken.`);}catch(error){toast(error.message);action.disabled=false;}};
      const caveat=document.createElement('small');caveat.textContent='Demo checkout · no payment';buy.append(quantity,action,caveat);card.append(buy);
    }
    const focus=()=>{document.querySelectorAll('.market-card').forEach(el=>el.classList.remove('selected'));card.classList.add('selected');const marker=state.marketMarkers[index];if(marker){state.marketMap?.setView(marker.getLatLng(),15,{animate:true});marker.openPopup();}};
    card.onclick=focus;card.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();focus();}};list.append(card);
    if(state.marketMap){const shortPrice=item.offerType==='donation'?'FREE':`${fmtNum(item.priceTry)} ₺`;const icon=L.divIcon({className:'',html:`<div class="map-price-pin ${item.offerType==='discounted_sale'?'discount':''}"><b>${safe(shortPrice)}</b><small>${index+1}</small></div>`,iconSize:[78,45],iconAnchor:[39,44]});const marker=L.marker([item.lat,item.lon],{icon}).addTo(state.marketMap);marker.bindPopup(`<div class="map-popup"><small>${item.offerType==='donation'?'COMMUNITY DONATION':'EVENING FOOD DEAL'}</small><b>${safe(item.name)}</b><span>${safe(item.business)} · ${safe(item.location)}</span><strong>${price}${item.regularPriceTry?` <del>${fmtNum(item.regularPriceTry)} ₺</del>`:''}</strong><span>${fmtNum(item.quantity)} ${safe(item.unit)} · ${item.distanceKm.toFixed(1)} km away</span></div>`,{className:'food-map-popup',closeButton:false});marker.on('click',()=>{document.querySelectorAll('.market-card').forEach(el=>el.classList.remove('selected'));card.classList.add('selected');card.scrollIntoView({block:'nearest',behavior:'smooth'});});state.marketMarkers.push(marker);}
  }
  if(state.marketMap&&state.userLocation){if(!state.userMarker)state.userMarker=L.marker([state.userLocation.lat,state.userLocation.lon],{icon:L.divIcon({className:'',html:'<div class="food-marker user"></div>',iconSize:[17,17],iconAnchor:[8,8]})}).addTo(state.marketMap);else state.userMarker.setLatLng([state.userLocation.lat,state.userLocation.lon]);state.userMarker.bindPopup('Your location (kept in this tab).');}
  if(state.marketMap&&!state.userLocation&&items.length){const bounds=L.latLngBounds(items.map(i=>[i.lat,i.lon]));if(items.length>1)state.marketMap.fitBounds(bounds.pad(.18));}
}
function fitMarketPins(){
  if(!state.marketMap)return;
  const points=state.marketMarkers.map(marker=>marker.getLatLng());
  if(state.userLocation)points.push([state.userLocation.lat,state.userLocation.lon]);
  if(points.length>1)state.marketMap.fitBounds(L.latLngBounds(points).pad(.22),{animate:true,maxZoom:15});
  else if(state.userLocation)state.marketMap.setView([state.userLocation.lat,state.userLocation.lon],14,{animate:true});
}
async function loadProviderBatches(){
  if(state.role!=='donor'||!state.token)return;
  try{const result=await request('/api/secondserve/provider/batches');state.providerBatches=result.batches||[];renderProviderBatches();}
  catch(error){$('providerStatus').textContent=error.message;}
}
function renderProviderBatches(){
  const host=$('providerBatches');if(!host)return;host.replaceChildren();
  const live=state.providerBatches.filter(batch=>['TRACKING','LISTED'].includes(batch.status));state.activeProviderBatch=live[0]||null;$('recordPosSale').disabled=!state.activeProviderBatch;
  if(!state.providerBatches.length){host.innerHTML='<div class="empty-state">Start a morning batch. The simulated POS will then update the remaining count.</div>';return;}
  for(const batch of state.providerBatches){const row=document.createElement('article');row.className='provider-batch';const pct=Math.max(0,Math.min(100,batch.remainingQuantity/batch.openingQuantity*100));
    row.innerHTML=`<div class="provider-batch-top"><b>${safe(batch.foodName)} · ${fmtNum(batch.openingQuantity)} ${safe(batch.unit)}</b><span>${safe(batch.status.replaceAll('_',' '))}</span></div><div class="provider-batch-meta"><span>POS sold ${fmtNum(batch.soldQuantity)}</span><span>Customer pickups ${fmtNum(batch.purchasedQuantity)}</span><span><b>${fmtNum(batch.remainingQuantity)} ${safe(batch.unit)} remaining</b></span><span>${batch.discountPercent}% evening discount</span></div><div class="provider-stockbar"><i style="width:${pct}%"></i></div><div class="provider-batch-meta"><span>Auto closeout 21:00 Europe/Istanbul · pickup by ${when(batch.pickupDeadline)}</span></div>`;host.append(row);
  }
}
function renderCategoryFilters(){
  const host=$('marketCategoryFilters');if(!host)return;
  const candidates=recommendFoodListings(state.listings,{origin:state.userLocation||DEMO_CENTER,profile:state.profile,offerFilter:state.offerFilter,categoryFilter:'all',radiusKm:state.radiusKm});
  const counts=new Map(marketCategories.map(category=>[category.value,candidates.filter(item=>item.category===category.value).length]));
  const categories=[{value:'all',label:'Everything',icon:'⌘',count:candidates.length},...marketCategories.filter(category=>state.listings.some(item=>item.category===category.value)).map(category=>({...category,count:counts.get(category.value)||0}))];
  host.replaceChildren();
  for(const category of categories){
    const button=document.createElement('button');button.type='button';button.className=`category-tile${state.categoryFilter===category.value?' active':''}`;button.setAttribute('aria-pressed',String(state.categoryFilter===category.value));
    button.innerHTML=`<i aria-hidden="true">${category.icon}</i><span>${safe(category.label)}</span><small>${category.count} ${category.count===1?'offer':'offers'}</small>`;
    button.onclick=()=>{state.categoryFilter=category.value;renderMarketplace();};host.append(button);
  }
}
async function loadMarketplace(){
  try{const result=await request('/api/secondserve/nearby',{auth:false});state.listings=result.listings||[];renderMarketplace();if(!window.L)$('mapCaption').textContent='Map library unavailable · browse the nearby list below.';}
  catch(error){$('marketList').innerHTML=`<div class="empty-state">Could not load listings: ${safe(error.message)}</div>`;}
}
document.querySelectorAll('.sidebar nav a[data-view]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();setView(link.dataset.view);if(link.dataset.view==='operations'&&link.hash)document.querySelector(link.hash)?.scrollIntoView({behavior:'smooth'});}));
document.querySelectorAll('[data-offer-filter]').forEach(button=>button.addEventListener('click',()=>{state.offerFilter=button.dataset.offerFilter;document.querySelectorAll('[data-offer-filter]').forEach(item=>item.classList.toggle('active',item===button));renderMarketplace();}));
$('marketRadius').onchange=event=>{state.radiusKm=Number(event.target.value);renderMarketplace();};
$('mapShowAll').onclick=fitMarketPins;
$('editProfile').onclick=()=>{
  const profile=state.profile||{};$('profileName').value=profile.name||'';$('profileAddress').value=profile.addressNote||'';$('profileNeighborhood').value=profile.neighborhood||'kadikoy';$('profileHousehold').value=String(profile.householdSize||1);$('profileOffer').value=profile.offerPreference||'all';$('profileRadius').value=String(profile.radiusKm||10);
  document.querySelectorAll('input[name="profileCategory"]').forEach(box=>{box.checked=profile.categories?.includes(box.value)||false;});$('profileDialog').showModal();
};
$('closeProfile').onclick=$('cancelProfile').onclick=()=>$('profileDialog').close();
$('profileForm').onsubmit=event=>{
  event.preventDefault();const profile={name:$('profileName').value.trim(),addressNote:$('profileAddress').value.trim(),neighborhood:$('profileNeighborhood').value,householdSize:Number($('profileHousehold').value),offerPreference:$('profileOffer').value,categories:[...document.querySelectorAll('input[name="profileCategory"]:checked')].map(box=>box.value),radiusKm:Number($('profileRadius').value)};
  state.profile=profile;state.userLocation={lat:NEIGHBORHOODS[profile.neighborhood].lat,lon:NEIGHBORHOODS[profile.neighborhood].lon};state.locationSource='profile';state.radiusKm=profile.radiusKm;$('marketRadius').value=String(profile.radiusKm);localStorage.setItem('secondserve.food.profile',JSON.stringify(profile));$('locationHint').textContent=`Approximate distances from ${NEIGHBORHOODS[profile.neighborhood].label}. Exact address stays in this browser.`;$('profileDialog').close();state.marketMap?.setView([state.userLocation.lat,state.userLocation.lon],13);renderMarketplace();toast('Profile saved in this browser. Recommendations updated.');
};
$('removeProfile').onclick=()=>{if(!state.profile)return;if(!window.confirm('Remove the saved food-finder profile from this browser?'))return;localStorage.removeItem('secondserve.food.profile');state.profile=null;state.userLocation=DEMO_CENTER;state.locationSource='demo';state.radiusKm=10;$('marketRadius').value='10';$('locationHint').textContent='Approximate distances from the demo center in Kadıköy.';$('profileDialog').close();renderMarketplace();toast('Saved profile removed from this browser.');};
$('useLocation').onclick=()=>{
  if(!navigator.geolocation){$('locationHint').textContent='Location is unavailable in this browser. Showing Kadıköy demo area.';return;}
  $('locationHint').textContent='Waiting for your browser location permission…';
  navigator.geolocation.getCurrentPosition(position=>{state.userLocation={lat:position.coords.latitude,lon:position.coords.longitude};state.locationSource='device';$('locationHint').textContent='Sorted by approximate straight-line distance from your location. Demo listings may not be real.';if(state.marketMap)state.marketMap.setView([state.userLocation.lat,state.userLocation.lon],13);renderMarketplace();},error=>{$('locationHint').textContent=error.code===1?'Location permission was not granted. Showing your saved area or Kadıköy demo center.':'Could not get your location. Showing your saved area or Kadıköy demo center.';toast('Showing your profile area; you can still browse the sample listings.');},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
};
async function doAction(path,body={}) {if(state.busy)return;setBusy(true);try{render(await request(path,{method:'POST',body}));toast('Workflow state updated by the SecondServe backend.');}catch(e){toast(e.message);}finally{setBusy(false);}}
document.querySelectorAll('[data-role]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.role==='recipient'&&$('loginOrgWrap').hidden){$('loginOrgWrap').hidden=false;return;}login(button.dataset.role);}));
$('loginOrg').onchange=()=>{};
document.querySelectorAll('[data-role]').forEach(button=>button.addEventListener('pointerenter',()=>{if(button.dataset.role==='recipient')$('loginOrgWrap').hidden=false;}));
$('switchRole').onclick=()=>{state.token='';state.role='';state.organizationId='';sessionStorage.removeItem('secondserve.demo.session');showLogin();};
$('loadScenario').onclick=()=>doAction('/api/secondserve/demo/load',{scenario:$('scenario').value});
$('runAgent').onclick=()=>doAction('/api/secondserve/agent/run');
$('dispatchOffer').onclick=()=>doAction('/api/secondserve/offers/dispatch');
$('productionForm').onsubmit=async event=>{
  event.preventDefault();if(state.role!=='donor')return;
  const expiryType=$('batchExpiryType').value,expiryDate=$('batchExpiryDate').value;
  const body={foodName:$('batchFoodName').value.trim(),category:$('batchCategory').value,openingQuantity:Number($('batchOpening').value),unit:$('batchUnit').value,
    retailPriceTry:Number($('batchPrice').value),discountPercent:Number($('batchDiscount').value),pickupLocation:$('batchPickupLocation').value.trim(),pickupDeadline:new Date($('batchPickupDeadline').value).toISOString(),
    allergens:$('batchAllergens').value.trim(),storage:$('batchStorage').value,condition:'reported_intact',expiryType,
    expiryAt:expiryType!=='not_applicable'&&expiryDate?new Date(`${expiryDate}T23:59:00`).toISOString():null,attested:$('batchAttested').checked};
  $('providerStatus').textContent='Saving the morning batch…';
  try{const result=await request('/api/secondserve/provider/batches',{method:'POST',body});$('providerStatus').textContent=`Batch started. ${fmtNum(result.batch.openingQuantity)} ${result.batch.unit} will be reconciled with POS sales.`;state.providerBatches.unshift(result.batch);renderProviderBatches();$('batchFoodName').value='';$('batchOpening').value='';$('batchPrice').value='';$('batchAllergens').value='';$('batchAttested').checked=false;toast('Morning batch started. POS sales will reduce available stock.');}
  catch(error){$('providerStatus').textContent=error.message;toast(error.message);}
};
$('recordPosSale').onclick=async()=>{
  const batch=state.activeProviderBatch,quantity=Number($('posSaleQty').value);if(!batch||!quantity)return;
  $('recordPosSale').disabled=true;
  try{const result=await request(`/api/secondserve/provider/batches/${encodeURIComponent(batch.id)}/sales`,{method:'POST',body:{quantity}});$('posSaleQty').value='';state.providerBatches=state.providerBatches.map(item=>item.id===batch.id?result.batch:item);await loadProviderBatches();toast(`${fmtNum(quantity)} ${batch.unit} sale synced. ${fmtNum(result.batch.remainingQuantity)} remain.`);}
  catch(error){toast(error.message);$('recordPosSale').disabled=false;}
};
$('batchExpiryType').onchange=()=>{$('batchExpiryDateWrap').hidden=$('batchExpiryType').value==='not_applicable';};
$('batchPhoto').onchange=async()=>{
  const file=$('batchPhoto').files?.[0];state.batchPhotoDataUrl='';$('batchPhotoPreview').hidden=true;updateBatchPhotoButton();
  if(!file){$('batchPhotoStatus').textContent='Nothing is sent until consent and button click.';return;}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024){$('batchPhotoStatus').textContent='Choose a JPEG, PNG, or WebP image smaller than 12 MB.';$('batchPhoto').value='';return;}
  $('batchPhotoStatus').textContent='Resizing in this browser…';
  try{const bitmap=await createImageBitmap(file),scale=Math.min(1,1536/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d',{alpha:false}).drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Could not resize the image.')),'image/jpeg',.78));if(blob.size>3*1024*1024)throw new Error('Resized image exceeds the 3 MB limit. Choose a smaller photo.');
    state.batchPhotoDataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read the image.'));reader.readAsDataURL(blob);});$('batchPhotoPreview').src=state.batchPhotoDataUrl;$('batchPhotoPreview').hidden=false;$('batchPhotoStatus').textContent=`Preview ready (${fmtNum(blob.size/1024)} KB). Not sent yet.`;
  }catch(error){state.batchPhotoDataUrl='';$('batchPhotoStatus').textContent=error.message;}
  updateBatchPhotoButton();
};
$('batchPhotoConsent').onchange=updateBatchPhotoButton;
$('analyzeBatchPhoto').onclick=async()=>{
  if(!state.model||!state.batchPhotoDataUrl||!$('batchPhotoConsent').checked)return;
  $('analyzeBatchPhoto').disabled=true;$('batchPhotoStatus').textContent='Sending the resized image to Meta. It may use credits; verify the suggestion.';
  try{const result=await request('/api/secondserve/intake/vision',{method:'POST',body:{consent:true,dataUrl:state.batchPhotoDataUrl}}),draft=result.draft;
    if(draft.foodName&&draft.foodName.toLowerCase()!=='unknown')$('batchFoodName').value=draft.foodName;
    $('batchCategory').value=draft.category==='unknown'?'other':draft.category;
    $('batchPhotoStatus').textContent=`${result.model} suggests: ${draft.visibleDescription} · uncertainty ${draft.uncertainty}. You still enter the morning quantity and verify every business fact.`;
  }catch(error){$('batchPhotoStatus').textContent=error.message;toast(error.message);}finally{updateBatchPhotoButton();}
};
function updateBatchPhotoButton(){const button=$('analyzeBatchPhoto');if(button)button.disabled=!state.model||!state.batchPhotoDataUrl||!$('batchPhotoConsent')?.checked;}
$('askMuseBrief').onclick=async()=>{
  const button=$('askMuseBrief');button.disabled=true;$('museBrief').hidden=true;button.textContent='Preparing advisory brief…';
  try {
    const result=await request('/api/secondserve/brief',{method:'POST',body:{}}),host=$('museBrief'),brief=result.brief;
    const heading=document.createElement('b');heading.textContent=`Muse Spark coordinator brief · ${result.model} · advisory only`;host.replaceChildren(heading);
    const summary=document.createElement('p');summary.textContent=brief.summary;host.append(summary);
    const priority=document.createElement('p');priority.textContent=`Priority: ${brief.priority}`;host.append(priority);
    for(const [label,values] of [['Questions to verify',brief.questions],['Considerations',brief.considerations]])if(values.length){const title=document.createElement('small');title.textContent=label;host.append(title);const list=document.createElement('ul');for(const value of values){const li=document.createElement('li');li.textContent=value;list.append(li);}host.append(list);}
    const note=document.createElement('small');note.textContent='Muse Spark cannot change eligibility, resolve a safety hold, or send an offer. Coordinator review remains required.';host.append(note);host.hidden=false;
  }catch(e){toast(e.message);}
  finally{button.disabled=false;button.textContent='Ask Muse Spark for a coordinator brief';}
};
$('listingForm').addEventListener('submit',async(event)=>{
  event.preventDefault(); if(state.role!=='donor')return;
  const dateType=$('expiryType').value, date=$('expiryDate').value;
  const pickupValue=$('pickupDeadline').value;
  const prepValue=$('preparedAt').value;
  const body={foodName:$('foodName').value.trim(),category:$('foodCategory').value,quantity:Number($('quantity').value),unit:$('unit').value,
    preparedAt:prepValue?new Date(prepValue).toISOString():null,expiryType:dateType,expiryAt:dateType==='use_by'&&date?new Date(`${date}T23:59:00`).toISOString():null,
    bestBeforeAt:dateType==='best_before'&&date?new Date(`${date}T23:59:00`).toISOString():null,storage:$('storage').value,
    allergens:$('allergens').value.trim()||'Unknown',condition:$('condition').value,pickupDeadline:pickupValue?new Date(pickupValue).toISOString():'',
    pickupLocation:$('pickupLocation').value.trim(),preference:$('preference').value,attested:$('attested').checked};
  await doAction('/api/secondserve/listings',body);
});
$('parseNote').onclick=async()=>{
  if(!state.model||!$('businessNote').value.trim())return;
  $('intakeStatus').textContent='Sending this note to Muse Spark for a structured draft. Verify every field; nothing is created automatically.';
  try{const result=await request('/api/secondserve/intake/parse',{method:'POST',body:{note:$('businessNote').value.trim()}});const d=result.draft;
    if(d.foodName)$('foodName').value=d.foodName;$('foodCategory').value=d.category==='unknown'?'other':d.category;if(d.quantity>0)$('quantity').value=d.quantity;if(d.unit!=='unknown')$('unit').value=d.unit;
    if(d.storage)$('storage').value=d.storage;if(d.dateType)$('expiryType').value=d.dateType;
    if(d.dateValue)$('expiryDate').value=d.dateValue;if(d.allergens)$('allergens').value=d.allergens;if(d.condition)$('condition').value=d.condition;
    if(d.preference!=='unknown')$('preference').value=d.preference;
    const today=localDateTimeInput(new Date()).slice(0,10);
    if(/^\d{2}:\d{2}$/.test(d.preparedAt))$('preparedAt').value=`${today}T${d.preparedAt}`;
    if(/^\d{2}:\d{2}$/.test(d.pickupDeadline))$('pickupDeadline').value=`${today}T${d.pickupDeadline}`;
    $('intakeStatus').textContent=`Draft from ${result.model}. Missing: ${d.missingFacts.join(', ')||'none stated'}. Check facts, set pickup time, attest, then submit.`;toast('AI draft filled only explicit facts. Please review and correct it.');
  }catch(e){$('intakeStatus').textContent=e.message;toast(e.message);}
};
$('foodPhoto').onchange=async()=>{
  const file=$('foodPhoto').files?.[0]; state.foodPhotoDataUrl=''; $('foodPhotoPreview').hidden=true; updateVisionButton();
  if(!file){$('visionStatus').textContent='Nothing is sent until you select a photo, check consent, and click Analyze.';return;}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){ $('visionStatus').textContent='Choose a JPEG, PNG, or WebP image.'; $('foodPhoto').value='';return; }
  if(file.size>12*1024*1024){$('visionStatus').textContent='Choose a photo under 12 MB so it can be resized in your browser.';$('foodPhoto').value='';return;}
  $('visionStatus').textContent='Preparing a smaller preview in this browser…';
  try {
    const source=await createImageBitmap(file), scale=Math.min(1,1536/Math.max(source.width,source.height)), canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(source.width*scale));canvas.height=Math.max(1,Math.round(source.height*scale));
    canvas.getContext('2d',{alpha:false}).drawImage(source,0,0,canvas.width,canvas.height);source.close();
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(new Error('Could not resize this photo.')),'image/jpeg',.78));
    if(blob.size>3*1024*1024)throw new Error('The resized photo is still too large. Choose a smaller image.');
    state.foodPhotoDataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read this photo.'));reader.readAsDataURL(blob);});
    $('foodPhotoPreview').src=state.foodPhotoDataUrl;$('foodPhotoPreview').hidden=false;$('visionStatus').textContent=`Resized preview ready (${fmtNum(blob.size/1024)} KB). Not sent yet.`;
  }catch(e){state.foodPhotoDataUrl='';$('visionStatus').textContent=e.message;}
  updateVisionButton();
};
$('visionConsent').onchange=updateVisionButton;
$('analyzeFoodPhoto').onclick=async()=>{
  if(!state.model||!state.foodPhotoDataUrl||!$('visionConsent').checked)return;
  $('analyzeFoodPhoto').disabled=true;$('visionStatus').textContent='Sending the resized photo to Meta Muse Spark. It may use credits; please verify every suggestion.';
  try {
    const result=await request('/api/secondserve/intake/vision',{method:'POST',body:{consent:true,dataUrl:state.foodPhotoDataUrl}}),d=result.draft;
    if(d.foodName&&d.foodName.toLowerCase()!=='unknown')$('foodName').value=d.foodName;
    $('foodCategory').value=d.category==='unknown'?'other':d.category;
    const note=$('businessNote').value.trim();
    $('businessNote').value=[note,`[Muse Spark visual draft — verify] ${d.visibleDescription}`,`Uncertainty: ${d.uncertainty}.`, `Still needs business confirmation: ${d.missingFacts.join(', ')}.`].filter(Boolean).join('\n');
    $('visionStatus').textContent=`Draft from ${result.model}; not safety-verified. ${d.missingFacts.join(' · ')}`;
    toast('Photo draft added. Confirm all listing facts yourself.');
  }catch(e){$('visionStatus').textContent=e.message;toast(e.message);}
  finally{updateVisionButton();}
};
function updateVisionButton(){const button=$('analyzeFoodPhoto');if(button)button.disabled=!state.model||!state.foodPhotoDataUrl||!$('visionConsent')?.checked||state.busy;}
$('expiryType').onchange=()=>{const value=$('expiryType').value;$('expiryDateWrap').hidden=['unknown','not_applicable'].includes(value);};
function localDateTimeInput(date) {const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);return local.toISOString().slice(0,16);}
const now=new Date();$('pickupDeadline').value=localDateTimeInput(new Date(now.getTime()+75*60000));$('preparedAt').value=localDateTimeInput(new Date(now.getTime()-120*60000));
$('batchPickupDeadline').value=localDateTimeInput(new Date(now.getTime()+3*60*60000));
async function boot() {
  try {const status=await request('/api/secondserve/status',{auth:false});state.model=Boolean(status.modelEnabled);$('modelStatus').innerHTML=`<i></i> ${state.model?'Muse Spark · opt-in tools':'Muse Spark disabled'}`;$('modelStatus').classList.toggle('ready',state.model);$('parseNote').disabled=!state.model;updateVisionButton();updateBatchPhotoButton();}
  catch {$('modelStatus').textContent='Server unavailable';}
  try {state.data=await request('/api/secondserve/state');} catch(e) {toast(e.message);return;}
  await loadMarketplace();
  if(state.token&&state.role){try{render(state.data);$('loginScreen').hidden=true;$('appShell').hidden=false;$('roleLabel').textContent=roleNames[state.role]+(state.organizationId?` · ${orgName(state.organizationId)}`:'');setView(state.role==='neighbor'?'nearby':'operations');if(state.role==='donor')await loadProviderBatches();}catch{showLogin();}}
}
// Keep the buyer board and provider ledger fresh while a demo role is open.
setInterval(()=>{
  if(document.hidden)return;
  if(state.role==='neighbor')loadMarketplace();
  else if(state.role==='donor')loadProviderBatches();
},30_000);
boot();
