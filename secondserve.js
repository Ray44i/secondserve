import { DEMO_CENTER, NEIGHBORHOODS, recommendFoodListings } from './secondserve-recommendations.mjs';
const $ = (id) => document.getElementById(id);
const savedSession = (() => { try { return JSON.parse(sessionStorage.getItem('secondserve.demo.session') || '{}'); } catch { return {}; } })();
if(savedSession.role==='household'){sessionStorage.removeItem('secondserve.demo.session');savedSession.token='';savedSession.role='';}
const savedProfile = (() => { try { return JSON.parse(localStorage.getItem('secondserve.food.profile') || 'null'); } catch { return null; } })();
const state = { token: savedSession.token || '', role: savedSession.role || '', organizationId: savedSession.organizationId || '', data: null, model: false, busy: false, view:'nearby', listings:[], offerFilter:'all', categoryFilter:'all', radiusKm:Number(savedProfile?.radiusKm||10), userLocation:null, locationSource:'demo', profile:savedProfile, marketMap:null, marketMarkers:[], userMarker:null, foodPhotoDataUrl:'',householdPhotoDataUrl:'',batchPhotoDataUrl:'',providerBatches:[],activeProviderBatch:null,cart:[],checkoutBusy:false,lastReceipts:[] };
const roleNames = { neighbor:'User', donor:'Provider', coordinator:'Owner', recipient:'Recipient partner' };
const marketCategories = [
  { value:'Bakery',label:'Bakery & bread',icon:'♨' },{ value:'Produce',label:'Fruit & veg',icon:'✿' },
  { value:'Prepared meals',label:'Ready meals',icon:'▤' },{ value:'Dairy',label:'Dairy & chilled',icon:'◉' },
  { value:'Pantry',label:'Pantry staples',icon:'▦' },{ value:'Drinks',label:'Drinks',icon:'◌' }
];
const merchantProfiles={
  'Golden Crust Bakery':{name:'Golden Crust',mark:'GC'},'Demo Bakery A':{name:'Moda Fırını',mark:'MF'},
  'Demo Market B':{name:'Yeldeğirmeni Pazarı',mark:'YP'},'Demo Kitchen C':{name:'Osmanağa Sofrası',mark:'OS'},
  'Demo Grocer D':{name:'Caferağa Gıda',mark:'CG'},'Demo Bakery E':{name:'Fenerbahçe Fırını',mark:'FF'},
  'Demo Produce F':{name:'Moda Bahçesi',mark:'MB'},'Demo Grocer G':{name:'Mahalle Kileri',mark:'MK'},
  'Demo Market H':{name:'Kadıköy Kiler',mark:'KK'},'Demo Juice Bar I':{name:'Meyve Barı',mark:'MY'},
  'Demo Cafe J':{name:'Moda Kahve',mark:'MK'},'Community donor':{name:'Komşu Paylaşımı',mark:'KP'}
};
function merchantProfile(name){return merchantProfiles[name]||{name,mark:String(name||'S').trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase()};}
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
function showLogin() { $('welcomeScreen').hidden=true; $('loginScreen').hidden=false; $('appShell').hidden=true; $('loginOrgWrap').hidden=true; }
async function login(role) {
  try {
    const body={role}; if(role==='recipient') body.organizationId=$('loginOrg').value;
    const result=await request('/api/secondserve/session',{method:'POST',body,auth:false});
    state.token=result.token; state.role=result.role; state.organizationId=result.organizationId||''; sessionStorage.setItem('secondserve.demo.session',JSON.stringify({token:state.token,role:state.role,organizationId:state.organizationId}));
    $('welcomeScreen').hidden=true; $('loginScreen').hidden=true; $('appShell').hidden=false; $('roleLabel').textContent=roleNames[state.role]+(state.organizationId?` · ${orgName(state.organizationId)}`:'');
    setView(role==='neighbor'?'nearby':role==='donor'?'provider':'operations');
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
function setView(view,navKey=null) {
  state.view=view;
  $('nearby').hidden=view!=='nearby';
  $('operationsWorkspace').hidden=!['operations','provider'].includes(view);
  document.querySelectorAll('[data-operations]').forEach(el=>{el.hidden=view!=='operations';});
  $('operationsWorkspace').classList.toggle('provider-mode',view==='provider');
  document.querySelectorAll('[data-role-nav]').forEach(link=>{link.hidden=link.dataset.roleNav!==state.role;});
  const defaultNavKey=state.role==='neighbor'?'nearby':state.role==='donor'?'inventory':state.role==='recipient'?'partner':'overview';
  document.querySelectorAll('.sidebar nav a[data-nav-key]').forEach(a=>a.classList.toggle('active',a.dataset.navKey===(navKey||defaultNavKey)));
  const modeLabel={neighbor:'COMMUNITY',donor:'FOOD PROVIDER',coordinator:'RESCUE CONTROL',recipient:'PARTNER SPACE'}[state.role]||'WORKSPACE';
  if($('sidebarModeLabel'))$('sidebarModeLabel').textContent=modeLabel;
  $('viewLabel').textContent=view==='nearby'?'NEARBY FOOD':view==='provider'?'INVENTORY & CLOSEOUT':state.role==='recipient'?'RECIPIENT PARTNER':'RESCUE OPERATIONS';
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
function mapOfferPopup(item){
  const category=marketCategories.find(value=>value.value===item.category),merchant=merchantProfile(item.business);
  const price=item.offerType==='donation'?'FREE':`₺${fmtNum(item.priceTry)}`;
  const visual=item.photoDataUrl?`<img src="${safe(item.photoDataUrl)}" alt="">`:`<span aria-hidden="true">${({Bakery:'🥐',Produce:'🥬','Prepared meals':'🍲',Dairy:'🥛',Pantry:'🫙',Drinks:'🧃',Other:'🍽️'}[item.category]||'🍽️')}</span>`;
  const offerLabel=item.offerType==='donation'?'FREE SHARE':`${item.discountPercent||0}% OFF`;
  const addButton=item.purchaseable&&state.role==='neighbor'?'<button type="button" class="map-popup-add">＋ Add to basket</button>':'';
  return `<article class="map-offer-popup"><div class="map-popup-visual">${visual}<span class="map-popup-badge ${item.offerType==='donation'?'is-free':''}">${offerLabel}</span></div><div class="map-popup-body"><div class="map-popup-provider"><i>${safe(merchant.mark)}</i><span><b>${safe(merchant.name)}</b><small>SIMULATED LOCAL BUSINESS</small></span><strong>${price}</strong></div><h3>${safe(item.name)}</h3><div class="map-popup-facts"><span><b>${fmtNum(item.quantity)} ${safe(item.unit)}</b> available</span><span>${safe(category?.label||item.category)}</span><span>${safe(item.location)} · ${distanceLabel(item.distanceKm)}</span><span>Pickup by ${when(item.pickupUntil)}</span></div><div class="map-popup-actions"><button type="button" class="map-popup-view">View shop &amp; details <span>→</span></button>${addButton}</div><small class="map-popup-demo">Demo listing · distance is approximate</small></div></article>`;
}
function renderMarketplace(){
  const list=$('marketList'); if(!list)return;
  $('openBasket').hidden=state.role!=='neighbor';
  initMarketMap(); const items=visibleMarketListings(); list.replaceChildren(); state.marketMarkers.forEach(m=>m.remove());state.marketMarkers=[];
  renderCategoryFilters();
  $('marketCount').textContent=`${items.length} nearby ${items.length===1?'offer':'offers'}`;
  $('mapLiveCount').innerHTML=`<i></i> ${items.length} ${items.length===1?'SPOT':'SPOTS'}`;
  $('mapCaption').textContent=state.locationSource==='device'?'Approximate distance from your location · demo listings':state.profile?`Approximate distance from ${NEIGHBORHOODS[state.profile.neighborhood]?.label||'your area'} · demo listings`:'Illustrative demo locations · Kadıköy';
  $('mapAreaLabel').textContent=state.locationSource==='device'?'YOUR AREA · APPROXIMATE':state.profile?`${NEIGHBORHOODS[state.profile.neighborhood]?.label||'YOUR AREA'} · DEMO`:'KADIKÖY · DEMO AREA';
  $('profileSummary').textContent=state.profile?`${state.profile.name?`Recommendations for ${state.profile.name}`:'Your recommendations'} · ${NEIGHBORHOODS[state.profile.neighborhood]?.label||'Kadıköy'} · ${state.profile.householdSize} ${Number(state.profile.householdSize)===1?'person':'people'} · ${state.profile.offerPreference==='all'?'donations + discounts':state.profile.offerPreference==='donation'?'donations first':'discounts first'}`:'Create a profile to personalize nearby recommendations.';
  $('editProfile').textContent=state.profile?'✎ Edit your profile':'＋ Create your profile';
  if(!items.length)list.innerHTML='<div class="empty-state">No demo listings match these filters within this radius. Try a wider search or change the category.</div>';
  for(const [index,item] of items.entries()){
    const card=document.createElement('article');card.className='market-card';card.style.setProperty('--card-order',index);card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',`${item.name}, ${item.offerType==='donation'?'free donation':`${item.priceTry} Turkish lira`}, ${distanceLabel(item.distanceKm)}`);
    const price=item.offerType==='donation'?'FREE':`${fmtNum(item.priceTry)} ₺`;
    const pickLabel=item.recommended?`<div class="recommendation-badge">✦ RECOMMENDED FOR YOU · ${safe(item.recommendationReason)}</div>`:'';
    const category=marketCategories.find(value=>value.value===item.category);
    const merchant=merchantProfile(item.business);
    const foodArt={Bakery:'🥐',Produce:'🥬','Prepared meals':'🍲',Dairy:'🥛',Pantry:'🫙',Drinks:'🧃',Other:'🍽️'}[item.category]||'🍽️';
    const visual=item.photoDataUrl?`<div class="market-card-visual"><img src="${safe(item.photoDataUrl)}" alt="Provider photo of ${safe(item.name)}" loading="lazy"><span class="photo-label">PROVIDER PHOTO</span></div>`:`<div class="market-card-visual market-demo-art art-${category?.value?.toLowerCase().replaceAll(' ','-')||'other'}"><span class="visual-illustration" aria-hidden="true">${foodArt}</span><span class="demo-art-note">SIMULATED LISTING ART</span></div>`;
    card.innerHTML=`${visual}<div class="market-card-main">${pickLabel}<div class="market-card-labels"><span class="category-pill"><i aria-hidden="true">${category?.icon||'•'}</i>${safe(category?.label||item.category)}</span><span class="market-type ${item.offerType==='discounted_sale'?'discount':''}">${item.offerType==='donation'?'FREE DONATION':item.discountPercent?`${item.discountPercent}% OFF`:'DISCOUNTED'}</span></div><h3>${safe(item.name)}</h3><div class="market-business"><i aria-hidden="true">${safe(merchant.mark)}</i><span><b>${safe(merchant.name)}</b><small>SIMULATED LOCAL BUSINESS</small></span></div><p>${safe(item.note)}</p></div><div class="market-price">${price}<small>${item.regularPriceTry?`WAS ${fmtNum(item.regularPriceTry)} ₺`:(item.offerType==='donation'?'NO COST':'DEMO PRICE')}</small></div><div class="market-card-foot"><span><b>${fmtNum(item.quantity)} ${safe(item.unit)}</b> left</span><span>${safe(item.location)}</span><span><b>${distanceLabel(item.distanceKm)}</b></span><span>Pickup by ${when(item.pickupUntil)}</span></div>`;
    if(item.purchaseable&&state.role==='neighbor'){
      const buy=document.createElement('div');buy.className='quick-buy';const quantity=document.createElement('input');quantity.type='number';quantity.min='1';quantity.step='1';quantity.max=String(item.quantity);quantity.value='1';quantity.setAttribute('aria-label',`Quantity of ${item.name} to buy for pickup`);
      const action=document.createElement('button');action.className='button primary';action.type='button';action.textContent='Add to basket';action.title='Add this offer to your basket; no order is placed yet.';
      action.onclick=event=>{event.stopPropagation();addToBasket(item,Number(quantity.value));};
      const caveat=document.createElement('small');caveat.textContent='Review basket before demo checkout';buy.onclick=event=>event.stopPropagation();buy.append(quantity,action,caveat);card.append(buy);
    }
    const showStore=()=>openStorefront(item);
    card.onclick=showStore;card.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showStore();}};list.append(card);
    if(state.marketMap){const shortPrice=item.offerType==='donation'?'FREE':`${fmtNum(item.priceTry)} ₺`;const shortUnit={pieces:'pc',packs:'pk',boxes:'box',portions:'serv',loaves:'loaf',bottles:'btl',bags:'bags',bundles:'sets',pairs:'pairs',kg:'kg'}[item.unit]||String(item.unit||'').slice(0,4);const icon=L.divIcon({className:'market-map-marker',html:`<div class="map-price-pin ${item.offerType==='discounted_sale'?'discount':''}" style="--pin-order:${index}"><b>${safe(shortPrice)}</b><small>${fmtNum(item.quantity)} ${safe(shortUnit)} left</small></div>`,iconSize:[104,48],iconAnchor:[52,47]});const marker=L.marker([item.lat,item.lon],{icon,zIndexOffset:item.recommended?250:0}).addTo(state.marketMap);marker.bindPopup(mapOfferPopup(item),{className:'map-offer-leaflet',maxWidth:310,minWidth:270,autoPanPadding:[18,18]});marker.bindTooltip(`${item.name} · ${shortPrice} · ${fmtNum(item.quantity)} ${item.unit} left`,{direction:'top',offset:[0,-40]});marker.on('click',()=>{state.marketMarkers.forEach(other=>other.getElement()?.classList.remove('map-selected'));marker.getElement()?.classList.add('map-selected');});marker.on('popupopen',event=>{const root=event.popup.getElement();root?.querySelector('.map-popup-view')?.addEventListener('click',()=>openStorefront(item));root?.querySelector('.map-popup-add')?.addEventListener('click',()=>{addToBasket(item,1);marker.closePopup();});});marker.on('popupclose',()=>marker.getElement()?.classList.remove('map-selected'));state.marketMarkers.push(marker);}
  }
  updateBasketBadge();
  if(state.marketMap&&state.userLocation){if(!state.userMarker)state.userMarker=L.marker([state.userLocation.lat,state.userLocation.lon],{icon:L.divIcon({className:'',html:'<div class="food-marker user"></div>',iconSize:[17,17],iconAnchor:[8,8]})}).addTo(state.marketMap);else state.userMarker.setLatLng([state.userLocation.lat,state.userLocation.lon]);state.userMarker.bindPopup('Your location (kept in this tab).');}
  if(state.marketMap&&!state.userLocation&&items.length){const bounds=L.latLngBounds(items.map(i=>[i.lat,i.lon]));if(items.length>1)state.marketMap.fitBounds(bounds.pad(.18));}
}
function addToBasket(item,quantity){
  const amount=Number(quantity),available=Number(item.quantity);
  if(!Number.isInteger(amount)||amount<1||amount>available){toast(`Choose 1–${fmtNum(available)} ${item.unit}.`);return;}
  const existing=state.cart.find(row=>row.batchId===item.batchId);
  if(existing){if(existing.quantity+amount>available){toast(`Only ${fmtNum(available-existing.quantity)} more ${item.unit} can be added.`);return;}existing.quantity+=amount;}
  else state.cart.push({id:item.id,batchId:item.batchId,name:item.name,business:item.business,unit:item.unit,category:item.category,offerType:item.offerType,discountPercent:item.discountPercent,photoDataUrl:item.photoDataUrl||null,quantity:amount,stock:available,priceTry:Number(item.priceTry),regularPriceTry:Number(item.regularPriceTry||item.priceTry||0),location:item.location,pickupUntil:item.pickupUntil,distanceKm:Number(item.distanceKm||0)});
  updateBasketBadge();pulseBasket();renderBasket();toast(`${amount} ${item.unit} added to your basket.`);
}
function pulseBasket(){for(const element of [$('openBasket'),$('sidebarBasketCount')])if(element){element.classList.remove('basket-pulse');void element.offsetWidth;element.classList.add('basket-pulse');window.setTimeout(()=>element.classList.remove('basket-pulse'),700);}}
function openStorefront(item){
  const offers=state.listings.filter(listing=>listing.business===item.business).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  const isCommunity=item.business==='Community donor';
  $('storeKicker').textContent=isCommunity?'COMMUNITY DONOR · LOCAL DEMO':'PROVIDER PROFILE · LOCAL DEMO';
  const merchant=merchantProfile(item.business);$('storeTitle').textContent=merchant.name;$('storeTitle').dataset.rawName=item.business;document.querySelector('.store-avatar').textContent=merchant.mark;
  $('storeSubtitle').textContent=isCommunity?'Community listings shared near this pickup area.':'Nearby surplus from this provider, with pickup details for each offer.';
  $('storeBannerLocation').textContent=item.location||'Nearby pickup';
  $('storeFacts').innerHTML=`<div><small>PICKUP AREA</small><b>${safe(item.location)}</b></div><div><small>APPROX. DISTANCE</small><b>${distanceLabel(item.distanceKm)}</b></div><div><small>ACTIVE OFFERS</small><b>${offers.length}</b></div><div><small>NETWORK STATUS</small><b>Demo listing</b></div>`;
  $('storeOfferCount').textContent=`${offers.length} ${offers.length===1?'offer':'offers'}`;
  const host=$('storeOffers');host.replaceChildren();
  if(!offers.length)host.innerHTML='<div class="basket-empty"><b>No active offers</b><span>This provider has no other offers on the nearby board right now.</span></div>';
  for(const offer of offers){
    const row=document.createElement('article');row.className='store-offer';const price=offer.offerType==='donation'?'FREE':`₺${fmtNum(offer.priceTry)}`;
    row.innerHTML=`<div><div class="store-offer-tags"><span>${offer.offerType==='donation'?'FREE DONATION':offer.discountPercent?`${safe(offer.discountPercent)}% OFF`:'DISCOUNTED'}</span><small>${safe(offer.location)} · ${Number(offer.distanceKm||0).toFixed(1)} km</small></div><b>${safe(offer.name)}</b><small>${fmtNum(offer.quantity)} ${safe(offer.unit)} left · pickup by ${when(offer.pickupUntil)}</small></div><div class="store-offer-price"><b>${price}</b>${offer.regularPriceTry?`<small>was ₺${fmtNum(offer.regularPriceTry)}</small>`:''}${offer.purchaseable&&state.role==='neighbor'?'<button type="button" class="button secondary store-add">Add</button>':''}</div>`;
    const add=row.querySelector('.store-add');if(add)add.onclick=()=>addToBasket(offer,1);host.append(row);
  }
  $('storeDialog').showModal();
}
function updateBasketBadge(){const count=state.cart.reduce((sum,item)=>sum+item.quantity,0);const badge=$('basketCount');if(badge)badge.textContent=String(count);const sideBadge=$('sidebarBasketCount');if(sideBadge)sideBadge.textContent=String(count);const button=$('openBasket');if(button)button.setAttribute('aria-label',`Open basket, ${count} items`);}
function cartTotal(){return Math.round(state.cart.reduce((sum,item)=>sum+item.quantity*item.priceTry,0)*100)/100;}
function distanceLabel(value){const km=Number(value||0);return km<.05?'nearby (demo estimate)':`${km.toFixed(1)} km (approx.)`;}
function renderBasket(){
  const host=$('basketItems');if(!host)return;host.replaceChildren();
  if(!state.cart.length){host.innerHTML='<div class="basket-empty"><b>Your basket is empty</b><span>Choose a discounted nearby offer and add it here to review it before checkout.</span></div>';}
  for(const [index,item] of state.cart.entries()){
    const row=document.createElement('article');row.className='basket-row';row.style.setProperty('--row-order',index);
    const category=marketCategories.find(entry=>entry.value===item.category);const regular=item.quantity*item.regularPriceTry,saved=Math.max(0,regular-item.quantity*item.priceTry);
    row.innerHTML=`<div class="basket-food-art" aria-hidden="true">${item.photoDataUrl?`<img src="${safe(item.photoDataUrl)}" alt="">`:`<span>${category?.icon||'🍲'}</span>`}<small>${item.offerType==='donation'?'GIFT':item.discountPercent?`${item.discountPercent}% OFF`:'NEARBY'}</small></div><div class="basket-product"><div class="basket-row-main"><div><b>${safe(item.name)}</b><small>${safe(item.business)}</small></div><button type="button" class="basket-remove" aria-label="Remove ${safe(item.name)} from basket">Remove</button></div><div class="basket-meta"><span>⌖ ${safe(item.location)}</span><span>${distanceLabel(item.distanceKm)}</span><span>Pickup by ${when(item.pickupUntil)}</span></div>${item.unavailable?'<small class="basket-unavailable">This offer is no longer available.</small>':''}<div class="basket-row-bottom"><div class="basket-quantity"><button type="button" class="qty-step" data-step="-1" aria-label="Decrease quantity" ${item.unavailable||item.quantity<=1?'disabled':''}>−</button><input type="number" min="1" max="${Math.max(1,item.stock)}" step="1" value="${item.quantity}" aria-label="Quantity of ${safe(item.name)}" ${item.unavailable?'disabled':''}><button type="button" class="qty-step" data-step="1" aria-label="Increase quantity" ${item.unavailable||item.quantity>=item.stock?'disabled':''}>+</button><span>${safe(item.unit)}</span></div><div class="basket-line-price"><small>${fmtNum(item.priceTry)} ₺ each${saved?` · saves ₺${saved.toFixed(2)}`:''}</small><b>${(item.quantity*item.priceTry).toFixed(2)} ₺</b></div></div></div>`;
    row.querySelector('input').onchange=event=>{const amount=Number(event.target.value);if(!Number.isInteger(amount)||amount<1||amount>item.stock){event.target.value=String(item.quantity);toast(`Choose 1–${fmtNum(item.stock)} ${item.unit}.`);return;}item.quantity=amount;renderBasket();updateBasketBadge();};
    row.querySelectorAll('.qty-step').forEach(button=>button.onclick=()=>{const amount=item.quantity+Number(button.dataset.step);if(amount<1||amount>item.stock)return;item.quantity=amount;renderBasket();updateBasketBadge();});
    row.querySelector('.basket-remove').onclick=()=>{state.cart.splice(index,1);renderBasket();updateBasketBadge();};host.append(row);
  }
  const regular=state.cart.reduce((sum,item)=>sum+item.quantity*item.regularPriceTry,0),saved=Math.max(0,regular-cartTotal());$('basketRegular').textContent=`₺${regular.toFixed(2)}`;$('basketSavings').textContent=`−₺${saved.toFixed(2)}`;$('basketSubtotal').textContent=`₺${cartTotal().toFixed(2)}`;$('toPayment').disabled=!state.cart.length||state.cart.some(item=>item.unavailable||item.quantity>item.stock)||state.checkoutBusy;
}
function showCheckoutStage(stage){$('basketStage').hidden=stage!=='basket';$('paymentStage').hidden=stage!=='payment';$('receiptStage').hidden=stage!=='receipt';$('basketTitle').textContent=stage==='basket'?'Your basket':stage==='payment'?'Demo checkout':'Order confirmed';$('checkoutKicker').textContent=stage==='basket'?'USER · YOUR BASKET':stage==='payment'?'USER · DEMO PAYMENT':'USER · DEMO RECEIPT';$('checkoutSubtitle').textContent=stage==='basket'?'Review quantities before continuing to demo checkout.':stage==='payment'?'Choose a demo method and review the amount before placing this simulated order.':'Your demo order was recorded locally.';}
function renderPaymentSummary(){
  const host=$('paymentSummary');host.replaceChildren();
  for(const item of state.cart){const row=document.createElement('div');row.className='payment-summary-row';row.innerHTML=`<span><b>${safe(item.name)} × ${item.quantity} ${safe(item.unit)}</b><small>${safe(item.business)} · ${safe(item.location)} · ${distanceLabel(item.distanceKm)}</small><small>Pickup by ${when(item.pickupUntil)}</small></span><b>₺${(item.quantity*item.priceTry).toFixed(2)}</b>`;host.append(row);}
  const regular=state.cart.reduce((sum,item)=>sum+item.quantity*item.regularPriceTry,0),saved=Math.max(0,regular-cartTotal());
  const details=document.createElement('div');details.className='payment-breakdown';details.innerHTML=`<div><span>Regular price</span><b>₺${regular.toFixed(2)}</b></div><div class="saved"><span>You save</span><b>−₺${saved.toFixed(2)}</b></div><div><span>Pickup fee</span><b>₺0.00</b></div>`;host.append(details);
  const total=document.createElement('div');total.className='payment-summary-total';total.innerHTML=`<span>Total due in demo</span><b>₺${cartTotal().toFixed(2)}</b>`;host.append(total);
}
async function completeDemoOrder(){
  if(state.checkoutBusy||!state.cart.length)return;state.checkoutBusy=true;$('completeDemoOrder').disabled=true;$('completeDemoOrder').textContent='Processing demo order…';
  const completed=[],failed=[];
  for(const item of [...state.cart]){
    try{const result=await request(`/api/secondserve/nearby/provider-${encodeURIComponent(item.batchId)}/purchase`,{method:'POST',body:{quantity:item.quantity}});completed.push({...result,name:item.name,business:item.business,location:item.location,pickupUntil:item.pickupUntil});state.cart=state.cart.filter(row=>row.batchId!==item.batchId);}
    catch(error){failed.push(`${item.name}: ${error.message}`);}
  }
  state.lastReceipts=completed;state.checkoutBusy=false;updateBasketBadge();await loadMarketplace();
  if(failed.length){renderBasket();showCheckoutStage('basket');toast(completed.length?`Some items were ordered. ${failed.join(' ')}`:failed.join(' '));$('completeDemoOrder').disabled=false;$('completeDemoOrder').textContent='Complete demo order →';return;}
  $('receiptContent').innerHTML=`<div class="receipt-status">DEMO ORDER · NOT A PAYMENT</div>${completed.map(item=>`<article class="receipt-line"><b>${safe(item.quantity)} ${safe(item.unit)} · ${safe(item.name)}</b><span>${safe(item.business)} · ${safe(item.location)}</span><span>Pickup by ${when(item.pickupUntil)}</span><small>Demo order reference ${safe(item.receipt)}</small></article>`).join('')}<div class="payment-summary-total"><span>Recorded demo total</span><b>₺${completed.reduce((sum,item)=>sum+Number(item.totalTry||0),0).toFixed(2)}</b></div><p>Payment method: ${document.querySelector('input[name="demoPayment"]:checked')?.value==='pickup'?'Pay at pickup (demo)':'Simulated card (demo)'} · <b>No charge taken</b></p>`;
  showCheckoutStage('receipt');$('completeDemoOrder').disabled=false;$('completeDemoOrder').textContent='Complete demo order →';
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
  for(const batch of state.providerBatches){const row=document.createElement('article');row.className='provider-batch';const pct=Math.max(0,Math.min(100,batch.remainingQuantity/batch.openingQuantity*100)),finalPrice=(Number(batch.retailPriceTry)*(1-Number(batch.discountPercent)/100)).toFixed(2);
    row.innerHTML=`<div class="provider-batch-top"><b>${safe(batch.foodName)} · ${fmtNum(batch.openingQuantity)} ${safe(batch.unit)}</b><span>${safe(batch.status.replaceAll('_',' '))}</span></div><div class="provider-batch-meta"><span>POS sold ${fmtNum(batch.soldQuantity)}</span><span>Customer pickups ${fmtNum(batch.purchasedQuantity)}</span><span><b>${fmtNum(batch.remainingQuantity)} ${safe(batch.unit)} remaining</b></span><span>${batch.discountPercent}% off · ₺${finalPrice} each</span></div><div class="provider-stockbar"><i style="width:${pct}%"></i></div><div class="provider-batch-meta"><span>Auto release ${safe(batch.closeoutTime||'21:00')} Europe/Istanbul · pickup by ${when(batch.pickupDeadline)}</span></div>`;
    if(batch.status==='TRACKING'&&batch.remainingQuantity>0){const release=document.createElement('button');release.type='button';release.className='button secondary provider-release-now';release.textContent='Publish remaining stock now';release.onclick=async()=>{release.disabled=true;try{await request(`/api/secondserve/provider/batches/${encodeURIComponent(batch.id)}/release-now`,{method:'POST',body:{}});await loadProviderBatches();await loadMarketplace();toast('Offer is live on the User nearby board. Checkout is still demo-only.');}catch(error){toast(error.message);release.disabled=false;}};row.append(release);}
    host.append(row);
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
  try{const result=await request('/api/secondserve/nearby',{auth:false});state.listings=result.listings||[];for(const cartItem of state.cart){const live=state.listings.find(item=>item.batchId===cartItem.batchId&&item.purchaseable);cartItem.unavailable=!live;if(live){cartItem.stock=Number(live.quantity);cartItem.priceTry=Number(live.priceTry);cartItem.pickupUntil=live.pickupUntil;}}renderMarketplace();renderBasket();if(!window.L)$('mapCaption').textContent='Map library unavailable · browse the nearby list below.';}
  catch(error){$('marketList').innerHTML=`<div class="empty-state">Could not load listings: ${safe(error.message)}</div>`;}
}
document.querySelectorAll('.sidebar nav a[data-view]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();setView(link.dataset.view,link.dataset.navKey);if(link.hash&&link.dataset.navKey!=='nearby')document.querySelector(link.hash)?.scrollIntoView({behavior:'smooth'});}));
document.querySelectorAll('.sidebar nav a[data-action]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();setView('nearby',link.dataset.navKey);if(link.dataset.action==='donate')$('shareFood').click();if(link.dataset.action==='basket')$('openBasket').click();}));
$('enterWorkspace').onclick=()=>{ $('welcomeScreen').hidden=true; $('loginScreen').hidden=false; window.scrollTo({top:0,behavior:'smooth'}); };
$('backToWelcome').onclick=()=>{ $('loginScreen').hidden=true; $('welcomeScreen').hidden=false; window.scrollTo({top:0,behavior:'smooth'}); };
document.querySelectorAll('[data-offer-filter]').forEach(button=>button.addEventListener('click',()=>{state.offerFilter=button.dataset.offerFilter;document.querySelectorAll('[data-offer-filter]').forEach(item=>item.classList.toggle('active',item===button));renderMarketplace();}));
$('marketRadius').onchange=event=>{state.radiusKm=Number(event.target.value);renderMarketplace();};
$('openBasket').onclick=()=>{renderBasket();showCheckoutStage('basket');$('basketDialog').showModal();};
$('closeStore').onclick=$('storeDone').onclick=()=>$('storeDialog').close();
$('storeDialog').addEventListener('click',event=>{if(event.target===$('storeDialog'))$('storeDialog').close();});
$('closeBasket').onclick=()=>$('basketDialog').close();
$('continueShopping').onclick=()=>$('basketDialog').close();
$('toPayment').onclick=()=>{if(!state.cart.length)return;renderPaymentSummary();showCheckoutStage('payment');};
$('backToBasket').onclick=()=>{renderBasket();showCheckoutStage('basket');};
$('completeDemoOrder').onclick=completeDemoOrder;
$('closeReceipt').onclick=()=>$('basketDialog').close();
$('basketDialog').addEventListener('click',event=>{if(event.target===$('basketDialog'))$('basketDialog').close();});
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
$('shareFood').onclick=()=>{
  if(state.role!=='neighbor'){toast('Choose the User role to share a free household donation.');return;}
  $('householdDonationForm').reset();
  state.householdPhotoDataUrl='';$('homeFoodPhotoPreview').hidden=true;$('homeFoodPhotoStatus').textContent='No photo selected.';
  $('homeDonationStatus').textContent='No details are shared until you submit.';
  $('homeExpiryDateWrap').hidden=true;$('homeExpiryDate').required=false;
  $('homePickupLocation').value=state.profile?.neighborhood||'';
  $('householdDonationDialog').showModal();
};
$('homeFoodPhoto').onchange=async()=>{
  const file=$('homeFoodPhoto').files?.[0];state.householdPhotoDataUrl='';$('homeFoodPhotoPreview').hidden=true;
  if(!file){$('homeFoodPhotoStatus').textContent='No photo selected.';return;}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024){$('homeFoodPhotoStatus').textContent='Choose a JPEG, PNG, or WebP photo under 12 MB.';$('homeFoodPhoto').value='';return;}
  $('homeFoodPhotoStatus').textContent='Compressing photo in this browser…';
  try{const bitmap=await createImageBitmap(file),scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d',{alpha:false}).drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Could not compress this photo.')),'image/jpeg',.72));if(blob.size>1_500_000)throw new Error('Compressed photo is too large. Try a smaller image.');
    state.householdPhotoDataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read this photo.'));reader.readAsDataURL(blob);});$('homeFoodPhotoPreview').src=state.householdPhotoDataUrl;$('homeFoodPhotoPreview').hidden=false;$('homeFoodPhotoStatus').textContent=`Photo attached (${fmtNum(blob.size/1024)} KB). It will appear on the nearby demo board.`;
  }catch(error){state.householdPhotoDataUrl='';$('homeFoodPhotoStatus').textContent=error.message;}
};
$('closeHouseholdDonation').onclick=$('cancelHouseholdDonation').onclick=()=>$('householdDonationDialog').close();
$('homeExpiryType').onchange=()=>{const applicable=$('homeExpiryType').value!=='not_applicable';$('homeExpiryDateWrap').hidden=!applicable;$('homeExpiryDate').required=applicable;};
$('householdDonationForm').onsubmit=async event=>{
  event.preventDefault();if(state.role!=='neighbor')return;
  const expiryType=$('homeExpiryType').value,expiryDate=$('homeExpiryDate').value,pickupValue=$('homePickupDeadline').value,preparedValue=$('homePreparedAt').value,area=NEIGHBORHOODS[$('homePickupLocation').value];
  const body={foodName:$('homeFoodName').value.trim(),category:$('homeCategory').value,quantity:Number($('homeQuantity').value),unit:$('homeUnit').value,
    preparedAt:preparedValue?new Date(preparedValue).toISOString():null,expiryType,expiryAt:expiryType==='use_by'&&expiryDate?new Date(`${expiryDate}T23:59:00`).toISOString():null,
    bestBeforeAt:expiryType==='best_before'&&expiryDate?new Date(`${expiryDate}T23:59:00`).toISOString():null,storage:$('homeStorage').value,allergens:$('homeAllergens').value.trim(),
    condition:$('homeCondition').value,pickupDeadline:pickupValue?new Date(pickupValue).toISOString():'',pickupLocation:area?.label||'',preference:'donation',attested:$('homeAttested').checked,photoDataUrl:state.householdPhotoDataUrl||null,
    pickupLat:area?.lat??null,pickupLon:area?.lon??null};
  const submit=event.submitter;submit.disabled=true;$('homeDonationStatus').textContent='Posting the free offer to this local demo…';
  try{await request('/api/secondserve/listings',{method:'POST',body});$('householdDonationDialog').close();await loadMarketplace();toast('Free donation posted to the local nearby demo. Partner pickup is simulated; no real people are notified.');}
  catch(error){$('homeDonationStatus').textContent=error.message;toast(error.message);}
  finally{submit.disabled=false;}
};
$('loadScenario').onclick=()=>doAction('/api/secondserve/demo/load',{scenario:$('scenario').value});
$('runAgent').onclick=()=>doAction('/api/secondserve/agent/run');
$('dispatchOffer').onclick=()=>doAction('/api/secondserve/offers/dispatch');
$('productionForm').onsubmit=async event=>{
  event.preventDefault();if(state.role!=='donor')return;
  const expiryType=$('batchExpiryType').value,expiryDate=$('batchExpiryDate').value;
  const body={foodName:$('batchFoodName').value.trim(),category:$('batchCategory').value,openingQuantity:Number($('batchOpening').value),unit:$('batchUnit').value,
    retailPriceTry:Number($('batchPrice').value),discountPercent:Number($('batchDiscount').value),closeoutTime:$('batchCloseoutTime').value,pickupLocation:$('batchPickupLocation').value.trim(),pickupDeadline:new Date($('batchPickupDeadline').value).toISOString(),
    allergens:$('batchAllergens').value.trim(),storage:$('batchStorage').value,condition:'reported_intact',expiryType,
    expiryAt:expiryType!=='not_applicable'&&expiryDate?new Date(`${expiryDate}T23:59:00`).toISOString():null,attested:$('batchAttested').checked,
    photoDataUrl:$('batchPhotoShare').checked?state.batchPhotoDataUrl:null};
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
function updateDiscountPreview(){const price=Number($('batchPrice').value),discount=Number($('batchDiscount').value);$('batchDiscountedPricePreview').textContent=price>0?`₺${(price*(1-discount/100)).toFixed(2)} each (${discount}% off)`:'Enter a regular price';}
$('batchPrice').addEventListener('input',updateDiscountPreview);$('batchDiscount').addEventListener('change',updateDiscountPreview);
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
    const canApplyCount=draft.visibleCount>0&&['high','medium'].includes(draft.countConfidence)&&draft.countUnit!=='unknown';
    if(canApplyCount){$('batchOpening').value=String(draft.visibleCount);$('batchUnit').value=draft.countUnit;}
    $('batchPhotoStatus').textContent=canApplyCount
      ?`${result.model} suggests ${draft.foodName}: ${draft.visibleCount} ${draft.countUnit} visible (${draft.countConfidence} count confidence). ${draft.countDescription} Confirm this photo shows the whole morning batch; image counts can miss hidden or off-frame items. Verify price, allergens, storage, dates, and all business facts.`
      :`${result.model} suggests ${draft.foodName||'a food item'}: ${draft.visibleDescription} Count not clear enough to autofill (${draft.countDescription}). Enter the full batch quantity yourself. Verify price, allergens, storage, dates, and all business facts.`;
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
function setSuggestedBatchDeadline(){const current=new Date(),[hour,minute]=$('batchCloseoutTime').value.split(':').map(Number),release=new Date(current);release.setHours(hour,minute,0,0);const suggested=new Date(current.getTime()+3*60*60000);if(release>current&&suggested<=release)suggested.setTime(release.getTime()+2*60*60000);$('batchPickupDeadline').value=localDateTimeInput(suggested);}
setSuggestedBatchDeadline();$('batchCloseoutTime').addEventListener('change',setSuggestedBatchDeadline);
$('homePickupDeadline').value=localDateTimeInput(new Date(now.getTime()+4*60*60000));
async function boot() {
  try {const status=await request('/api/secondserve/status',{auth:false});state.model=Boolean(status.modelEnabled);$('modelStatus').innerHTML=`<i></i> ${state.model?'Muse Spark · opt-in tools':'Muse Spark disabled'}`;$('modelStatus').classList.toggle('ready',state.model);$('parseNote').disabled=!state.model;updateVisionButton();updateBatchPhotoButton();}
  catch {$('modelStatus').textContent='Server unavailable';}
  try {state.data=await request('/api/secondserve/state');} catch(e) {toast(e.message);return;}
  await loadMarketplace();
  if(state.token&&state.role){try{render(state.data);$('welcomeScreen').hidden=true;$('loginScreen').hidden=true;$('appShell').hidden=false;$('roleLabel').textContent=roleNames[state.role]+(state.organizationId?` · ${orgName(state.organizationId)}`:'');setView(state.role==='neighbor'?'nearby':state.role==='donor'?'provider':'operations');if(state.role==='donor')await loadProviderBatches();}catch{showLogin();}}
}
// Keep the buyer board and provider ledger fresh while a demo role is open.
setInterval(()=>{
  if(document.hidden)return;
  if(state.role==='neighbor')loadMarketplace();
  else if(state.role==='donor')loadProviderBatches();
},30_000);
boot();
