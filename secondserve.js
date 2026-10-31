const $ = (id) => document.getElementById(id);
const savedSession = (() => { try { return JSON.parse(sessionStorage.getItem('secondserve.demo.session') || '{}'); } catch { return {}; } })();
const state = { token: savedSession.token || '', role: savedSession.role || '', organizationId: savedSession.organizationId || '', data: null, model: false, busy: false };
const roleNames = { donor: 'Food business', coordinator: 'Rescue coordinator', recipient: 'Recipient partner' };
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
    await refresh();
    if(role==='coordinator'&&!state.data?.activeListing) toast('Choose a scenario and load the recovery workspace.');
  } catch(e) { toast(e.message); }
}
function orgName(id) { return state.data?.recipients?.find(x=>x.id===id)?.name || ({'charity-a':'Charity A','kitchen-b':'Community Kitchen B','charity-c':'Charity C'}[id]||'Recipient'); }
function activeOffer(d) { return d?.offers?.[0] || null; }
function statusPill(el, value) { el.textContent=value||'WAITING'; el.dataset.status=value||'WAITING'; }
function render(d) {
  state.data=d; const item=d.activeListing, offer=activeOffer(d);
  $('workflow').hidden=state.role!=='coordinator';
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
async function doAction(path,body={}) {if(state.busy)return;setBusy(true);try{render(await request(path,{method:'POST',body}));toast('Workflow state updated by the SecondServe backend.');}catch(e){toast(e.message);}finally{setBusy(false);}}
document.querySelectorAll('[data-role]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.role==='recipient'&&$('loginOrgWrap').hidden){$('loginOrgWrap').hidden=false;return;}login(button.dataset.role);}));
$('loginOrg').onchange=()=>{};
document.querySelectorAll('[data-role]').forEach(button=>button.addEventListener('pointerenter',()=>{if(button.dataset.role==='recipient')$('loginOrgWrap').hidden=false;}));
$('switchRole').onclick=()=>{state.token='';state.role='';state.organizationId='';sessionStorage.removeItem('secondserve.demo.session');showLogin();};
$('loadScenario').onclick=()=>doAction('/api/secondserve/demo/load',{scenario:$('scenario').value});
$('runAgent').onclick=()=>doAction('/api/secondserve/agent/run');
$('dispatchOffer').onclick=()=>doAction('/api/secondserve/offers/dispatch');
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
$('expiryType').onchange=()=>{const value=$('expiryType').value;$('expiryDateWrap').hidden=['unknown','not_applicable'].includes(value);};
function localDateTimeInput(date) {const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);return local.toISOString().slice(0,16);}
const now=new Date();$('pickupDeadline').value=localDateTimeInput(new Date(now.getTime()+75*60000));$('preparedAt').value=localDateTimeInput(new Date(now.getTime()-120*60000));
async function boot() {
  try {const status=await request('/api/secondserve/status',{auth:false});state.model=Boolean(status.modelEnabled);$('modelStatus').innerHTML=`<i></i> ${state.model?'Muse Spark · opt-in draft':'Muse Spark disabled'}`;$('modelStatus').classList.toggle('ready',state.model);$('parseNote').disabled=!state.model;}
  catch {$('modelStatus').textContent='Server unavailable';}
  try {state.data=await request('/api/secondserve/state');} catch(e) {toast(e.message);return;}
  if(state.token&&state.role){try{render(state.data);$('loginScreen').hidden=true;$('appShell').hidden=false;$('roleLabel').textContent=roleNames[state.role]+(state.organizationId?` · ${orgName(state.organizationId)}`:'');}catch{showLogin();}}
}
boot();
