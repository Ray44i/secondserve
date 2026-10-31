const $ = (id) => document.getElementById(id);
const shell = document.querySelector('.shell');
let roleIndex = 0, toastTimer;
function toast(message) {
  const node = $('toast'); node.textContent = message; node.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 2600);
}
function setRole(index, dismissGate) {
  roleIndex = index;
  const specialist = index === 1;
  shell.classList.toggle('role-specialist', specialist);
  $('role').innerHTML = '⌘ <span>' + (specialist ? 'Specialist view' : 'Resident view') + '</span> ⌄';
  $('roleDesc').textContent = specialist ? 'Specialist view · inspect resident confirmations and unresolved flags.' : 'Resident view · mark changes and request a review.';
  $('switchRole').textContent = specialist ? 'Switch to resident view ↗' : 'Switch to specialist view ↗';
  document.querySelectorAll('.check input').forEach((input) => { input.disabled = specialist; });
  $('housingStatus').disabled = specialist;
  $('recalcText').textContent = specialist ? 'Resident actions are read-only in the specialist workspace.' : 'Select a mitigation to see how the sample checklist changes.';
  $('buildPlan').disabled = specialist;
  if (dismissGate) $('loginScreen').hidden = true;
}
document.querySelectorAll('[data-entry]').forEach((button) => button.addEventListener('click', () => {
  setRole(button.dataset.entry === 'specialist' ? 1 : 0, true);
}));
$('role').addEventListener('click', () => {
  setRole((roleIndex + 1) % 2, false);
  toast('Demo workspace changed. Role permissions are simulated in this browser only.');
});
$('switchRole').addEventListener('click', () => {
  setRole((roleIndex + 1) % 2, false);
  toast('Demo workspace changed. This is not secure authentication.');
});
function calculate() {
  const anchor = $('anchor').checked, move = $('move').checked, exit = $('exit').checked;
  const confirmed = Number(anchor) + Number(move) + Number(exit);
  const pending = 3 - confirmed;
  $('pendingCount').textContent = pending;
  $('pendingCountLabel').textContent = pending === 1 ? '1 action' : pending + ' actions';
  $('confirmedCount').textContent = confirmed + ' of 3';
  $('ring').style.setProperty('--n', Math.round(confirmed / 3 * 100));
  $('progressBar').style.width = Math.round(confirmed / 3 * 100) + '%';
  $('status').textContent = pending ? pending + ' TO VERIFY' : 'ALL 3 MARKED COMPLETE';
  $('summary').textContent = pending
    ? confirmed + ' of 3 sample actions marked complete. Check the actual room before marking an action.'
    : 'All three sample actions are marked complete. This checklist does not rate room safety.';
  $('rBooks').classList.toggle('resolved', anchor); $('rMirror').classList.toggle('resolved', move); $('rExit').classList.toggle('resolved', exit);
  $('queue').textContent = String(Number(!anchor) + Number(!move)).padStart(2, '0');
  $('recalcText').textContent = 'Progress updated: ' + confirmed + ' of 3 sample actions marked. Confirm each in the real room.';
}
$('recalcBtn').addEventListener('click', () => { if (!roleIndex) { calculate(); toast('Sample checklist updated. Confirm changes in the real room.'); } });
document.querySelectorAll('[data-jump]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.jump).scrollIntoView({ behavior: 'smooth' })));
let simulationId = 0;
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
function applyEventPreview() {
  $('scene').classList.toggle('event-blocked', $('eventType').value === 'blocked');
}
$('eventType').addEventListener('change', applyEventPreview);
applyEventPreview();
$('quake').addEventListener('click', async () => {
  const thisRun = ++simulationId;
  const scene = $('scene'), button = $('quake'), profile = $('profile').value, eventType = $('eventType').value;
  scene.classList.remove('quaking', 'post-shake', 'intensity-light', 'intensity-moderate', 'intensity-strong', 'bookcase-fixed', 'mirror-fixed', 'event-aftershock');
  scene.classList.toggle('event-blocked', eventType === 'blocked');
  scene.classList.add('intensity-' + profile);
  if (eventType !== 'blocked') scene.classList.add('quaking');
  if ($('anchor').checked) scene.classList.add('bookcase-fixed');
  if ($('move').checked) scene.classList.add('mirror-fixed');
  button.disabled = true;
  button.textContent = 'Scenario playing…';
  const phaseSets = {
    main: [
      ['01 BUILD-UP', 'Movement begins · notice the items you marked for review.'],
      ['02 STRONGEST MOVEMENT', 'The room illustration moves through the chosen profile.'],
      ['03 SHAKING EASES', 'The motion slows · watch the marked objects.'],
      ['04 REVIEW', 'Compare what moved with the actions you confirmed.']
    ],
    aftershock: [
      ['01 FIRST SHAKE', 'The first movement begins · watch the room.'],
      ['02 PAUSE', 'The main movement eases · keep the scene in view.'],
      ['03 AFTERSHOCK', 'A second, shorter illustrative movement begins.'],
      ['04 REVIEW', 'Review the same objects again after the second movement.']
    ],
    blocked: [
      ['01 WHAT-IF', 'The primary doorway is marked unavailable in this scenario.'],
      ['02 PAUSE', 'The room itself remains still · review your household plan.'],
      ['03 PLAN CHECK', 'Do not assume another route is clear or safe.'],
      ['04 REVIEW', 'Confirm evacuation guidance for your actual building.']
    ]
  };
  const phases = phaseSets[eventType];
  $('simHeadline').textContent = eventType === 'blocked' ? 'What if the doorway is blocked?' : eventType === 'aftershock' ? 'Aftershock rehearsal' : 'Main shaking · ' + profile;
  for (let i = 0; i < phases.length; i++) {
    if (thisRun !== simulationId) return;
    if (eventType === 'aftershock' && i === 1) scene.classList.remove('quaking');
    if (eventType === 'aftershock' && i === 2) {
      scene.classList.add('quaking', 'event-aftershock');
      setTimeout(() => { if (thisRun === simulationId) scene.classList.remove('quaking'); }, 900);
    }
    $('simPhase').textContent = phases[i][0] + ' / 4 · ILLUSTRATIVE ONLY';
    $('simDetail').textContent = phases[i][1];
    for (let j = 1; j <= 4; j++) $('phase' + j).classList.toggle('done', j <= i + 1);
    await pause(2000);
  }
  if (thisRun !== simulationId) return;
  scene.classList.remove('quaking');
  if (eventType === 'main' || eventType === 'aftershock') scene.classList.add('post-shake');
  button.disabled = false;
  button.textContent = 'Replay scenario ↗';
  if (eventType === 'blocked') {
    $('simHeadline').textContent = 'Exit-path question · review locally';
    $('simDetail').textContent = 'The primary door is marked unavailable in this what-if. Check your building’s approved guidance; this demo cannot recommend another route.';
  } else {
    const bookcase = $('anchor').checked ? 'The bookcase is marked secured.' : profile === 'strong' ? 'The unsecured bookcase tips in this illustration.' : 'The unsecured bookcase sways in this illustration.';
    const mirror = $('move').checked ? 'The mirror is marked moved or protected.' : profile === 'strong' ? 'The wall mirror shifts in this illustration.' : 'The mirror remains a review item.';
    $('simHeadline').textContent = eventType === 'aftershock' ? 'Aftershock sequence complete' : 'Scenario complete · review the room';
    $('simDetail').textContent = bookcase + ' ' + mirror + ' This scripted illustration is not a prediction of earthquake damage.';
  }
  $('simPhase').textContent = 'COMPLETE · SCRIPTED EXAMPLE · NOT A SAFETY SCORE';
  toast('Scenario complete. Confirm real conditions with qualified local guidance.');
});
$('buildPlan').addEventListener('click', () => {
  const steps = [];
  const housingStatus = $('housingStatus').value;
  if (!$('anchor').checked) {
    if (housingStatus === 'renter') steps.push('Ask your landlord or property manager about an approved way to secure the tall bookcase. Do not drill or alter the rental without permission; meanwhile, keep heavy items low.');
    else if (housingStatus === 'owner') steps.push('Check whether the tall bookcase is secured to the wall; use suitable anchoring and ask a qualified local specialist if you are unsure.');
    else steps.push('Check whether the tall bookcase is secured to the wall. If you rent, ask permission before drilling; keep heavy items low while you verify.');
  }
  if (!$('move').checked) {
    if (housingStatus === 'renter') steps.push('Consider moving the mirror away from the bed. Before applying safety film or changing fixtures, check your lease or ask the property manager.');
    else steps.push('Review the wall mirror near the bed and decide whether to move it or use suitable safety film.');
  }
  if (!$('exit').checked) steps.push('Walk the real route to your exit and note anything that could block it.');
  if (latestRoomAnalysis) {
    latestRoomAnalysis.objects.forEach((item) => steps.push('Verify ' + item.name + ': ' + item.next_step));
  }
  if (!steps.length) steps.push('Recheck the marked changes in the actual room and review this card after furniture or room-layout changes.');
  const list = $('planSteps'); list.replaceChildren();
  steps.forEach((step) => { const item = document.createElement('li'); item.textContent = step; list.append(item); });
  $('planTitle').textContent = steps.length + ' next step' + (steps.length === 1 ? '' : 's') + ' for this room';
  $('actionCard').hidden = false;
  $('actionCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  toast('Your room card is assembled locally. No details were uploaded.');
});
$('printPlan').addEventListener('click', () => window.print());
const modal = $('modal');
function openModal(thing) {
  $('note').value = thing ? 'Please review the ' + thing.toLowerCase() + ' in this room.' : '';
  $('save').textContent = roleIndex ? 'Save specialist note ↗' : 'Save demo request ↗';
  modal.classList.add('open');
}
function closeModal() { modal.classList.remove('open'); }
document.querySelectorAll('.review-open').forEach((button) => button.addEventListener('click', () => openModal(button.dataset.thing)));
$('reviewBtn').addEventListener('click', () => openModal(''));
$('close').addEventListener('click', closeModal); $('cancel').addEventListener('click', closeModal);
modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
$('save').addEventListener('click', () => {
  closeModal();
  toast(roleIndex ? 'Specialist note saved locally. Nothing was sent.' : 'Demo review request saved locally. Nothing was sent.');
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
let photoUrl = null, selectedPhoto = null, visionReady = false, latestRoomAnalysis = null;
const allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];
fetch('/api/status').then((response) => response.ok ? response.json() : null).then((status) => {
  visionReady = Boolean(status?.tremoroomVisionEnabled);
  $('visionStatus').textContent = visionReady ? 'Room analysis is configured. Nothing is sent until you check consent and click Analyze.' : 'Room analysis is currently disabled on this server. The photo remains a local preview.';
  updateAnalyzeButton();
}).catch(() => { $('visionStatus').textContent = 'Could not check server configuration. The photo remains a local preview.'; });
function updateAnalyzeButton() {
  $('analyzeRoom').disabled = !(visionReady && selectedPhoto && $('photoConsent').checked);
}
$('photoConsent').addEventListener('change', updateAnalyzeButton);
$('uploadButton').addEventListener('click', () => $('roomPhoto').click());
$('roomPhoto').addEventListener('change', () => {
  const file = $('roomPhoto').files[0];
  if (!file) return;
  if (!allowedPhotoTypes.includes(file.type)) { toast('Choose a JPEG, PNG, or WebP image.'); $('roomPhoto').value = ''; return; }
  if (file.size > 12 * 1024 * 1024) { toast('Choose a photo smaller than 12 MB.'); $('roomPhoto').value = ''; return; }
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  selectedPhoto = file;
  latestRoomAnalysis = null;
  photoUrl = URL.createObjectURL(file);
  $('photoPreview').src = photoUrl;
  $('photoPanel').hidden = false;
  $('analysisPanel').hidden = true;
  $('photoConsent').checked = false;
  $('photoStatus').textContent = 'The sample simulation below is separate from this photo.';
  updateAnalyzeButton();
});
function makeResizedDataUrl(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const tempUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(tempUrl);
      const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Could not prepare the photo.'));
        if (blob.size > 5 * 1024 * 1024) return reject(new Error('Resized photo is still too large. Choose a smaller image.'));
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the resized photo.'));
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.82);
    };
    image.onerror = () => { URL.revokeObjectURL(tempUrl); reject(new Error('Could not open this photo.')); };
    image.src = tempUrl;
  });
}
function appendText(parent, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  parent.append(node);
  return node;
}
function renderRoomAnalysis(data, imageSrc) {
  latestRoomAnalysis = data;
  $('analysisSummary').textContent = data.summary;
  $('analysisImage').src = imageSrc;
  const boxes = $('analysisBoxes'); boxes.replaceChildren();
  const findings = $('analysisFindings'); findings.replaceChildren();
  data.objects.forEach((item, index) => {
    const box = document.createElement('button');
    box.type = 'button'; box.className = 'analysis-box';
    box.style.left = (item.bbox[0] / 10) + '%'; box.style.top = (item.bbox[1] / 10) + '%';
    box.style.width = ((item.bbox[2] - item.bbox[0]) / 10) + '%'; box.style.height = ((item.bbox[3] - item.bbox[1]) / 10) + '%';
    box.setAttribute('aria-label', 'Observation ' + (index + 1) + ': ' + item.name);
    box.addEventListener('click', () => document.getElementById('finding-' + index).scrollIntoView({ behavior: 'smooth', block: 'center' }));
    boxes.append(box);
    const card = document.createElement('article'); card.className = 'finding-card'; card.id = 'finding-' + index;
    const head = document.createElement('header'); appendText(head, 'h5', '', item.name); appendText(head, 'span', 'confidence ' + item.confidence, item.confidence + ' confidence'); card.append(head);
    appendText(card, 'small', 'finding-location', item.location);
    appendText(card, 'p', '', item.observation);
    appendText(card, 'b', 'field-label', 'POSSIBLE IF UNSECURED'); appendText(card, 'p', 'conditional', item.possible_outcome);
    appendText(card, 'b', 'field-label', 'SUGGESTED CHECK'); appendText(card, 'p', '', item.next_step);
    findings.append(card);
  });
  const unknowns = $('analysisUncertainties'); unknowns.replaceChildren();
  data.uncertainties.forEach((text) => appendText(unknowns, 'li', '', text));
  $('analysisPanel').hidden = false;
  $('analysisPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
$('analyzeRoom').addEventListener('click', async () => {
  if (!visionReady || !selectedPhoto || !$('photoConsent').checked) return;
  const button = $('analyzeRoom'); button.disabled = true; button.textContent = 'Preparing and analyzing…';
  $('photoStatus').textContent = 'The resized image is being sent to Meta for analysis. This may use credits.';
  try {
    const dataUrl = await makeResizedDataUrl(selectedPhoto);
    const response = await fetch('/api/analyze-room', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image: dataUrl }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Analysis could not be completed.');
    renderRoomAnalysis(payload.analysis, photoUrl);
    $('photoStatus').textContent = 'Candidate findings are shown below. Verify them in person.';
  } catch (error) {
    $('photoStatus').textContent = error.message || 'Analysis failed. Your photo preview is still available.';
  } finally {
    button.textContent = 'Analyze room with Meta AI';
    updateAnalyzeButton();
  }
});
$('clearPhoto').addEventListener('click', () => {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = null; selectedPhoto = null; latestRoomAnalysis = null;
  $('photoPreview').removeAttribute('src'); $('analysisImage').removeAttribute('src');
  $('roomPhoto').value = ''; $('photoConsent').checked = false;
  $('photoPanel').hidden = true; $('analysisPanel').hidden = true;
  updateAnalyzeButton(); toast('Photo preview and findings removed from this page.');
});
window.addEventListener('pagehide', () => { if (photoUrl) URL.revokeObjectURL(photoUrl); });document.querySelectorAll('.check input').forEach((input) => input.addEventListener('change', () => {
  $('actionCard').hidden = true;
  $('recalcText').textContent = 'Changes selected. Update the checklist or rebuild the room card.';
}));
