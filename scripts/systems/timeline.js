// ============================================================
// TIMELINE SYSTEM
// ============================================================
// Structure: tracks[objectId] = { name, keyframes:[{t, px,py,pz, rx,ry,rz, sx,sy,sz}] }
const tlTracks   = {};   // objectId -> { name, objRef, keyframes:[], visKeyframes:[] }
window.tlTracks  = tlTracks; // keybindings.js va boshqa modullar uchun global
let   tlDuration = 5;
let   tlCurrent  = 0;
let   tlPlaying  = false;
let   tlSelKF    = null;   // { objId, idx, isVis }
let   tlScrubbing = false;
let   tlGlobalEase = 'smooth'; // default easing for new keyframes

// ── EASING FUNCTIONS ──────────────────────────────────────────
const EASINGS = {
  linear:  t => t,
  smooth:  t => t*t*(3-2*t),
  bounce:  t => {
    if (t < 1/2.75) return 7.5625*t*t;
    if (t < 2/2.75) { t-=1.5/2.75;   return 7.5625*t*t+0.75; }
    if (t < 2.5/2.75){ t-=2.25/2.75; return 7.5625*t*t+0.9375; }
    t-=2.625/2.75; return 7.5625*t*t+0.984375;
  },
  elastic: t => {
    if(t===0||t===1) return t;
    return -Math.pow(2,10*(t-1))*Math.sin((t-1.1)*5*Math.PI);
  },
  back:    t => {
    const c = 1.70158;
    return t*t*((c+1)*t - c);
  },
};

// ── TANGENT — affects how the curve enters/exits a keyframe ───
// tangent:'auto'  → use easing fn normally
// tangent:'flat'  → zero velocity at this KF (smooth landing)
// tangent:'sharp' → instant jump (step)
function tlInterp(a, b, t, prop) {
  let alpha = b.t===a.t ? 1 : (t-a.t)/(b.t-a.t);
  alpha = Math.max(0,Math.min(1,alpha));

  // Tangent overrides
  const outT = a.tangent || 'auto';
  const inT  = b.tangent || 'auto';

  // Step / sharp: instant change at b.t
  if (outT==='sharp' || inT==='sharp') {
    return alpha < 1 ? a[prop] : b[prop];
  }

  // Flat tangent: apply cubic hermite with zero slopes
  if (outT==='flat' || inT==='flat') {
    // Hermite with p0=a, p1=b, m0=0, m1=0
    const h00 = 2*alpha*alpha*alpha - 3*alpha*alpha + 1;
    const h01 = -2*alpha*alpha*alpha + 3*alpha*alpha;
    return h00*a[prop] + h01*b[prop];
  }

  // Normal easing
  const easeFn = EASINGS[a.ease || tlGlobalEase] || EASINGS.smooth;
  const eased = easeFn(alpha);
  return a[prop] + (b[prop]-a[prop])*eased;
}

function tlGetOrCreate(obj) {
  const id = obj.userData.id;
  if (!tlTracks[id]) {
    tlTracks[id] = { name:obj.userData.name, objRef:obj, keyframes:[], visKeyframes:[], soundKeyframes:[], loop:false };
  }
  if (!tlTracks[id].soundKeyframes) tlTracks[id].soundKeyframes = [];
  return tlTracks[id];
}

window.tlSetGlobalEase = function(v) { tlGlobalEase = v; };

window.tlAddKeyframe = function() {
  if (!selectedObj) { log('⚠ Avval obyekt tanlang', 'lw'); return; }
  const track = tlGetOrCreate(selectedObj);
  const o = selectedObj;
  const ease = tlGlobalEase;
  const kf = {
    t: tlCurrent,
    // py0 — scale kompensatsiya uchun saqlanadi (ob'ekt zaminga kirmasin)
    py0: o.position.y,   // KF paytidagi Y pozitsiya
    sy0: o.scale.y,      // KF paytidagi Y scale (pastki chegara = py0 - sy0*0.5)
    rx:o.rotation.x, ry:o.rotation.y, rz:o.rotation.z,
    sx:o.scale.x,    sy:o.scale.y,    sz:o.scale.z,
    ease, tangent:'auto',
  };
  const ei = track.keyframes.findIndex(k=>Math.abs(k.t-tlCurrent)<0.05);
  if (ei>=0) { kf.ease=track.keyframes[ei].ease; kf.tangent=track.keyframes[ei].tangent; track.keyframes[ei]=kf; }
  else { track.keyframes.push(kf); track.keyframes.sort((a,b)=>a.t-b.t); }
  tlRender();
  log(`◆ KF [${ease}]: ${o.userData.name} @ ${tlCurrent.toFixed(2)}s`, 'lok');
};

// Visibility keyframe
window.tlAddVisKeyframe = function() {
  if (!selectedObj) { log('⚠ Avval obyekt tanlang', 'lw'); return; }
  const track = tlGetOrCreate(selectedObj);
  const o = selectedObj;
  // Toggle: if currently visible add vis=1, else vis=0
  const curVis = o.visible ? 1 : 0;
  const vkf = { t: tlCurrent, vis: curVis };
  const ei = track.visKeyframes.findIndex(k=>Math.abs(k.t-tlCurrent)<0.05);
  if (ei>=0) track.visKeyframes[ei] = vkf;
  else { track.visKeyframes.push(vkf); track.visKeyframes.sort((a,b)=>a.t-b.t); }
  tlRender();
  log(`👁 VIS KF: ${o.userData.name} → ${curVis?'Ko\'rinadi':'Ko\'rinmaydi'} @ ${tlCurrent.toFixed(2)}s`, 'lok');
};

window.tlDeleteKeyframe = function() {
  if (!tlSelKF) { log('⚠ Keyframe tanlanmagan', 'lw'); return; }
  const tr = tlTracks[tlSelKF.objId];
  if (!tr) return;
  if (tlSelKF.isVis) {
    tr.visKeyframes.splice(tlSelKF.idx, 1);
  } else if (tlSelKF.isSnd) {
    tr.soundKeyframes.splice(tlSelKF.idx, 1);
    $('tl-snd-popup').style.display = 'none';
  } else {
    tr.keyframes.splice(tlSelKF.idx, 1);
  }
  tlSelKF = null;
  $('tl-kf-popup').style.display = 'none';
  tlRender();
};

window.tlSetDuration = function(v) { tlDuration=Math.max(1,v); tlRender(); };

// ── SOUND KEYFRAME ─────────────────────────────────────────────
let _tlSelSndKF = null; // { objId, idx }
let _tlPrevTime  = 0;   // for sound trigger detection

window.tlAddSoundKeyframe = function() {
  if (!selectedObj) { log('⚠ Avval obyekt tanlang', 'lw'); return; }
  const track = tlGetOrCreate(selectedObj);
  // Populate sound select
  _tlFillSoundSelect();
  // Check if KF already exists at this time
  const ei = track.soundKeyframes.findIndex(k => Math.abs(k.t - tlCurrent) < 0.05);
  const existing = ei >= 0 ? track.soundKeyframes[ei] : null;
  if (existing) {
    // Edit existing
    _tlSelSndKF = { objId: selectedObj.userData.id, idx: ei };
    $('sp-sound').value  = existing.sound  || 'impact';
    $('sp-volume').value = existing.volume ?? 1;
    $('sp-vol-lbl').textContent = (existing.volume ?? 1).toFixed(1);
    $('sp-spatial').checked = existing.spatial !== false;
  } else {
    // New at cursor
    const skf = { t: tlCurrent, sound: 'impact', volume: 1, spatial: true };
    track.soundKeyframes.push(skf);
    track.soundKeyframes.sort((a, b) => a.t - b.t);
    const ni = track.soundKeyframes.indexOf(skf);
    _tlSelSndKF = { objId: selectedObj.userData.id, idx: ni };
    $('sp-sound').value  = 'impact';
    $('sp-volume').value = 1;
    $('sp-vol-lbl').textContent = '1.0';
    $('sp-spatial').checked = true;
    log(`♪ SND KF: @ ${tlCurrent.toFixed(2)}s`, 'lok');
  }
  // Show popup near toolbar
  const btn = document.querySelector('.tl-btn[onclick*="SND"]') || document.querySelector('.tl-btn');
  const rect = btn ? btn.getBoundingClientRect() : {bottom:120,left:300};
  _tlShowSndPopup(rect.left, rect.bottom + 6);
  tlRender();
};

function _tlFillSoundSelect() {
  const sel = $('sp-sound'); if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = Object.keys(SoundSystem.library).map(n =>
    `<option value="${n}">${n}</option>`).join('');
  if (prev && SoundSystem.library[prev]) sel.value = prev;
}

function _tlShowSndPopup(x, y) {
  const pop = $('tl-snd-popup'); if (!pop) return;
  pop.style.display = 'block';
  pop.style.left = Math.min(x, window.innerWidth - 210) + 'px';
  pop.style.top  = Math.min(y, window.innerHeight - 160) + 'px';
  // Wire up volume label
  const vSlider = $('sp-volume');
  if (vSlider) {
    vSlider.oninput = () => { $('sp-vol-lbl').textContent = parseFloat(vSlider.value).toFixed(1); };
  }
}

window.tlSndKfSave = function() {
  if (!_tlSelSndKF) return;
  const tr = tlTracks[_tlSelSndKF.objId]; if (!tr) return;
  const skf = tr.soundKeyframes[_tlSelSndKF.idx]; if (!skf) return;
  skf.sound   = $('sp-sound').value   || 'impact';
  skf.volume  = parseFloat($('sp-volume').value) || 1;
  skf.spatial = $('sp-spatial').checked;
  $('tl-snd-popup').style.display = 'none';
  tlRender();
  log(`♪ SND KF saqlandi: '${skf.sound}' vol:${skf.volume.toFixed(1)} @ ${skf.t.toFixed(2)}s`, 'lok');
};

window.tlSndKfDelete = function() {
  if (!_tlSelSndKF) return;
  const tr = tlTracks[_tlSelSndKF.objId]; if (!tr) return;
  tr.soundKeyframes.splice(_tlSelSndKF.idx, 1);
  _tlSelSndKF = null;
  $('tl-snd-popup').style.display = 'none';
  tlRender();
};

window.tlSndKfPreview = function() {
  const snd = $('sp-sound').value; if (!snd) return;
  const vol = parseFloat($('sp-volume').value) || 1;
  SoundSystem.play(snd, null, { volume: vol });
};

// Close snd popup on outside click
document.addEventListener('click', e => {
  const pop = $('tl-snd-popup');
  if (pop && pop.style.display !== 'none' && !pop.contains(e.target)) {
    pop.style.display = 'none';
  }
});

// Per-track loop toggle
window.tlToggleTrackLoop = function(id) {
  const tr = tlTracks[id]; if (!tr) return;
  tr.loop = !tr.loop;
  tlRender();
  log(`🔄 Loop [${tr.name}]: ${tr.loop ? 'Yoqildi' : 'O\'chirildi'}`, 'lok');
};
window.tlPlay = function() {
  tlPlaying=true;
  $('tl-play-btn').textContent='⏸';
  $('tl-play-btn').onclick=tlPause;
};
window.tlPause = function() {
  tlPlaying=false;
  $('tl-play-btn').textContent='▶';
  $('tl-play-btn').onclick=tlPlay;
};
window.tlStop = function() {
  tlPlaying=false; tlCurrent=0; _tlPrevTime=0;
  $('tl-play-btn').textContent='▶';
  $('tl-play-btn').onclick=tlPlay;
  tlApplyAll(0); tlRender();
};

// ── DUPLICATE KEYFRAME ─────────────────────────────────────────
window.tlDuplicateKeyframe = function() {
  if (!tlSelKF) { log('⚠ Avval keyframe tanlang', 'lw'); return; }
  const tr = tlTracks[tlSelKF.objId];
  if (!tr) return;
  if (tlSelKF.isVis) {
    const vk = tr.visKeyframes[tlSelKF.idx];
    if (!vk) return;
    const newT = Math.min(tlDuration, vk.t + 0.2);
    const clone = { ...vk, t: newT };
    tr.visKeyframes.push(clone);
    tr.visKeyframes.sort((a,b) => a.t - b.t);
  } else {
    const kf = tr.keyframes[tlSelKF.idx];
    if (!kf) return;
    const newT = Math.min(tlDuration, kf.t + 0.2);
    const clone = { ...kf, t: newT };
    tr.keyframes.push(clone);
    tr.keyframes.sort((a,b) => a.t - b.t);
  }
  tlRender();
  log('⧉ Keyframe nusxalandi', 'lok');
};

// ── DUPLICATE TRACK ────────────────────────────────────────────
window.tlDuplicateTrack = function() {
  if (!selectedObj) { log('⚠ Avval obyekt tanlang', 'lw'); return; }
  const srcId = selectedObj.userData.id;
  const srcTr = tlTracks[srcId];
  if (!srcTr || (srcTr.keyframes.length === 0 && srcTr.visKeyframes.length === 0)) {
    log('⚠ Bu ob\'yektda track mavjud emas', 'lw'); return;
  }
  // Clone the current object
  const srcObj = selectedObj;
  let newObj;
  const primIdx = Math.max(0, (typeof PRIMITIVES !== 'undefined') ?
    PRIMITIVES.findIndex(p => p.name === srcObj.userData.type) : 0);
  const texIdx = (typeof TEXTURES !== 'undefined') ?
    TEXTURES.findIndex(t => t.name === srcObj.userData.texName) : 0;
  newObj = addObject(primIdx, texIdx >= 0 ? texIdx : 0);
  if (!newObj) { log('⚠ Nusxa yaratib bo\'lmadi', 'lw'); return; }
  newObj.position.copy(srcObj.position);
  newObj.rotation.copy(srcObj.rotation);
  newObj.scale.copy(srcObj.scale);
  newObj.userData.name = srcObj.userData.name + '_copy';
  // Copy material
  let srcMat = srcObj.material;
  if (!srcMat) srcObj.traverse(ch => { if (!srcMat && ch.isMesh && ch.material) srcMat = Array.isArray(ch.material) ? ch.material[0] : ch.material; });
  let dstMat = newObj.material;
  if (!dstMat) newObj.traverse(ch => { if (!dstMat && ch.isMesh && ch.material) dstMat = Array.isArray(ch.material) ? ch.material[0] : ch.material; });
  if (srcMat && dstMat) {
    try { dstMat.color.copy(srcMat.color); } catch(e){}
    dstMat.roughness = srcMat.roughness; dstMat.metalness = srcMat.metalness;
    dstMat.opacity = srcMat.opacity; dstMat.transparent = srcMat.transparent;
    dstMat.needsUpdate = true;
  }
  // Copy track
  const newId = newObj.userData.id;
  tlTracks[newId] = {
    name: newObj.userData.name,
    objRef: newObj,
    loop: srcTr.loop,
    keyframes: srcTr.keyframes.map(k => ({...k})),
    visKeyframes: srcTr.visKeyframes.map(k => ({...k})),
    soundKeyframes: (srcTr.soundKeyframes||[]).map(k => ({...k})),
  };
  updateHierarchy && updateHierarchy();
  updateStats && updateStats();
  tlRender();
  log(`⧉ Track nusxalandi: ${srcObj.userData.name} → ${newObj.userData.name}`, 'lok');
};

// ── CUT RANGE MODE ─────────────────────────────────────────────
let _tlCutMode = false;
let _tlCutStart = null;
let _tlCutEnd = null;

window.tlToggleCutMode = function() {
  _tlCutMode = !_tlCutMode;
  _tlCutStart = null; _tlCutEnd = null;
  const btn = $('tl-cut-btn');
  const rangeEl = $('tl-cut-range');
  if (_tlCutMode) {
    if (btn) { btn.style.background='rgba(255,107,53,0.2)'; btn.style.color='var(--accent2)'; btn.textContent='✂ Bekor'; }
    if (rangeEl) rangeEl.style.display='none';
    log('✂ Kesish rejimi: diapazonni tanlash uchun timeline-ga chap → o\'ng bosing', 'lw');
  } else {
    if (btn) { btn.style.background=''; btn.style.color='var(--accent2)'; btn.textContent='✂ Kes'; }
    if (rangeEl) rangeEl.style.display='none';
  }
};

window.tlCutRange = function() {
  if (_tlCutStart === null || _tlCutEnd === null) { log('⚠ Diapazon tanlanmagan', 'lw'); return; }
  const t0 = Math.min(_tlCutStart, _tlCutEnd);
  const t1 = Math.max(_tlCutStart, _tlCutEnd);
  if (t1 - t0 < 0.05) { log('⚠ Diapazon juda kichik', 'lw'); return; }

  let removedKF = 0;
  Object.values(tlTracks).forEach(tr => {
    // Remove transform KFs in range
    const before = tr.keyframes.length;
    tr.keyframes = tr.keyframes.filter(k => k.t < t0 || k.t > t1);
    removedKF += before - tr.keyframes.length;
    // Remove vis KFs in range
    const vbefore = tr.visKeyframes.length;
    tr.visKeyframes = tr.visKeyframes.filter(k => k.t < t0 || k.t > t1);
    removedKF += vbefore - tr.visKeyframes.length;
    // Shift remaining KFs after t1 to fill the gap
    const shift = t1 - t0;
    tr.keyframes.forEach(k => { if (k.t > t1) k.t -= shift; });
    tr.visKeyframes.forEach(k => { if (k.t > t1) k.t -= shift; });
  });

  // Shorten duration
  tlDuration = Math.max(1, tlDuration - (t1 - t0));
  const durInp = $('tl-dur-inp'); if (durInp) durInp.value = tlDuration.toFixed(1);

  // Exit cut mode
  _tlCutMode = false; _tlCutStart = null; _tlCutEnd = null;
  const btn = $('tl-cut-btn');
  if (btn) { btn.style.background=''; btn.textContent='✂ Kes'; }
  const rangeEl = $('tl-cut-range'); if (rangeEl) rangeEl.style.display='none';

  tlCurrent = Math.min(tlCurrent, tlDuration);
  tlApplyAll(tlCurrent); tlRender();
  log(`✂ Kesildi: ${t0.toFixed(2)}s–${t1.toFixed(2)}s, ${removedKF} KF o'chirildi`, 'lok');
};

// ── EXPORT / IMPORT TIMELINE JSON ─────────────────────────────
// Har bir ob'ektning TO'LIQ ma'lumotlari saqlanadi
window.tlExportJSON = async function() {
  // Nom so'rash modali
  const existingModal = document.getElementById('tl-export-name-modal');
  if (existingModal) existingModal.remove();

  const nameModal = document.createElement('div');
  nameModal.id = 'tl-export-name-modal';
  nameModal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:99999';
  nameModal.innerHTML = `
    <div style="background:var(--panel);border:1px solid var(--accent);padding:18px 22px;min-width:320px;box-shadow:0 0 32px rgba(0,229,255,0.2)">
      <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--accent);letter-spacing:2px;margin-bottom:12px">⬇ EXPORT NOMI</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);margin-bottom:6px">Fayl nomini kiriting:</div>
      <input id="tl-export-name-inp" type="text" value="mening_animatsiyam"
        style="width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--accent);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:11px;padding:6px 8px;outline:none;border-radius:2px;margin-bottom:12px">
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button onclick="document.getElementById('tl-export-name-modal').remove()"
          style="background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--muted);font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;padding:5px 14px;cursor:pointer">Bekor</button>
        <button id="tl-export-confirm-btn"
          style="background:rgba(0,229,255,.12);border:1px solid var(--accent);color:var(--accent);font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;padding:5px 14px;cursor:pointer">✓ Export</button>
      </div>
    </div>`;
  document.body.appendChild(nameModal);

  const inp = document.getElementById('tl-export-name-inp');
  inp.focus(); inp.select();

  // Enter tugmasi bilan ham tasdiqlash
  inp.onkeydown = e => { if (e.key === 'Enter') document.getElementById('tl-export-confirm-btn').click(); };

  document.getElementById('tl-export-confirm-btn').onclick = async () => {
    const exportName = (inp.value.trim() || 'apex3d_anim').replace(/[^a-zA-Z0-9_\-\.а-яА-ЯёЁ]/g, '_');
    nameModal.remove();
    await _tlDoExport(exportName);
  };
};

window._tlDoExport = async function(exportName) {
  const camObj = objects.find(o => o.userData && o.userData.isCamera);

  // ── GLB model fayllarini yig'ish ─────────────────────────────
  const modelFileMap = {};
  const addedModels  = new Set();

  // a) Asset library dan yuklangan modellar
  for (const m of loadedModels) {
    if (!m.buffer || addedModels.has(m.name)) continue;
    const safe = m.name.replace(/[^a-zA-Z0-9_\-]/g,'_') + '.glb';
    modelFileMap[m.name] = { path: 'models/' + safe, buffer: m.buffer };
    addedModels.add(m.name);
  }
  // b) To'g'ridan-to'g'ri import (drag-drop) — _glbBuffer
  for (const o of objects) {
    if ((!o.userData.isGLB && !o.userData.isGLTF) || addedModels.has(o.userData.name)) continue;
    const buf = o.userData._glbBuffer;
    if (!buf) continue;
    const safe = o.userData.name.replace(/[^a-zA-Z0-9_\-]/g,'_') + '.glb';
    modelFileMap[o.userData.name] = { path: 'models/' + safe, buffer: buf };
    addedModels.add(o.userData.name);
  }

  const hasGLBModels = Object.keys(modelFileMap).length > 0;

  // ── Texture fayllarini yig'ish ────────────────────────────────
  const textureFileMap = {}; // objId → 'textures/xxx'

  for (const o of objects) {
    const b64   = o.userData.textureBase64;
    const tname = o.userData.textureName;
    if (!b64 || !tname) continue;
    const safeTex = 'tex_' + o.userData.id + '_' + tname.replace(/[^a-zA-Z0-9_\-\.]/g,'_');
    const commaIdx = b64.indexOf(',');
    const base64Data = commaIdx >= 0 ? b64.substring(commaIdx + 1) : b64;
    textureFileMap[o.userData.id] = { path: 'textures/' + safeTex, base64Data };
  }

  const hasTextures   = Object.keys(textureFileMap).length > 0;
  const needsZip      = hasGLBModels || hasTextures;

  // ── Har bir ob'ektning TO'LIQ ma'lumotlari ──────────────────
  const objectsData = objects.map(o => {
    let mat = o.material;
    if (!mat) o.traverse(ch => { if (!mat && ch.isMesh && ch.material) mat = Array.isArray(ch.material) ? ch.material[0] : ch.material; });

    const pb       = physBodies.find(b => b.mesh === o);
    const isCamera = o.userData.isCamera || false;
    const isGLBobj = o.userData.isGLB || o.userData.isGLTF || false;

    return {
      id:         o.userData.id,
      name:       o.userData.name,
      type:       o.userData.type || 'Kub',
      texName:    o.userData.texName || null,
      isStatic:   o.userData.isStatic  || false,
      isCamera:   isCamera,
      isGLB:      isGLBobj,
      glbFile:    isGLBobj ? (modelFileMap[o.userData.name]?.path || null) : null,
      isEntity:   o.userData.isEntity  || false,
      entityType: o.userData.entityType || null,
      visible:    o.visible,

      position: { x: o.position.x, y: o.position.y, z: o.position.z },
      rotation: { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z },
      scale:    { x: o.scale.x,    y: o.scale.y,    z: o.scale.z    },

      material: mat ? {
        color:             '#' + mat.color.getHexString(),
        emissive:          mat.emissive ? '#' + mat.emissive.getHexString() : '#000000',
        emissiveIntensity: mat.emissiveIntensity ?? 0,
        roughness:         mat.roughness ?? 0.5,
        metalness:         mat.metalness ?? 0,
        opacity:           mat.opacity ?? 1,
        transparent:       mat.transparent ?? false,
        wireframe:         mat.wireframe ?? false,
      } : null,

      physics: pb ? {
        mass:        pb.mass ?? 1,
        restitution: pb.restitution ?? 0.4,
        isStatic:    pb.isStatic ?? false,
        physMode:    o.userData.physMode || 'solid',
      } : null,

      parentId:  o.userData.parentId || null,
      children:  o.userData.children || [],
      script:    o.userData.script   || null,

      textureFile: textureFileMap[o.userData.id]?.path || null,

      camProps: isCamera ? {
        fov:       o.userData.fov  || 60,
        near:      o.userData.near || 0.1,
        far:       o.userData.far  || 100,
        _isActive: o.userData._isActive || false,
      } : null,

      track: tlTracks[o.userData.id] ? {
        keyframes:    tlTracks[o.userData.id].keyframes    || [],
        visKeyframes: tlTracks[o.userData.id].visKeyframes || [],
      } : null,
    };
  });

  // ── Camera xulosasi (ixtiyoriy) ──────────────────────────────
  const camData = camObj ? {
    id:       camObj.userData.id,
    name:     camObj.userData.name,
    position: { x: camObj.position.x, y: camObj.position.y, z: camObj.position.z },
    rotation: { x: camObj.rotation.x, y: camObj.rotation.y, z: camObj.rotation.z },
    fov:      camObj.userData.fov  || 60,
    near:     camObj.userData.near || 0.1,
    far:      camObj.userData.far  || 100,
  } : null;

  const exportData = {
    engine:       'APEX3D',
    version:      '3.0',
    exportedAt:   new Date().toISOString(),
    duration:     tlDuration,
    globalEase:   tlGlobalEase,
    objectCount:  objects.length,
    hasGLBModels: hasGLBModels,
    hasTextures:  hasTextures,
    camera:       camData,
    objects:      objectsData,
  };

  // ── Model yoki texture bor → ZIP, aks holda oddiy JSON ──────
  if (needsZip && typeof JSZip !== 'undefined') {
    log('📦 Export ZIP tayyorlanmoqda...', 'lw');
    const zip = new JSZip();

    // models/
    for (const [, md] of Object.entries(modelFileMap)) {
      zip.folder('models').file(md.path.replace('models/',''), md.buffer);
    }
    // textures/
    for (const [, td] of Object.entries(textureFileMap)) {
      zip.folder('textures').file(td.path.replace('textures/',''), td.base64Data, {base64: true});
    }

    zip.file('apex3d_anim.json', JSON.stringify(exportData, null, 2));

    try {
      const blob = await zip.generateAsync({type:'blob', compression:'DEFLATE', compressionOptions:{level:6}});
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = exportName + '.zip';
      a.click();
      URL.revokeObjectURL(url);
      const mCount = Object.keys(modelFileMap).length;
      const tCount = Object.keys(textureFileMap).length;
      log(`⬇ Export ZIP: ${objects.length} ob'ekt · ${mCount} model · ${tCount} texture · ${Object.keys(tlTracks).length} track`, 'lok');
    } catch(err) {
      log('❌ ZIP export xatosi: ' + err.message, 'le');
    }
  } else {
    // Faqat primitivlar, texture/model yo'q → oddiy JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = exportName + '.json';
    a.click();
    URL.revokeObjectURL(url);
    log(`⬇ Export JSON: ${objects.length} ob'ekt · ${Object.keys(tlTracks).length} track`, 'lok');
  }
};

// Import: JSON yuklab, modal oynada ko'rsatib, tasdiqlangandan keyin qo'llash
let _tlPendingImport = null;

window.tlImportJSON = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const inputEl = event.target;

  // ZIP fayl bo'lsa — ichidagi apex3d_anim.json ni olib parse qil
  if (file.name.endsWith('.zip')) {
    if (typeof JSZip === 'undefined') { log('❌ JSZip yuklanmagan', 'le'); inputEl.value=''; return; }
    file.arrayBuffer().then(async buf => {
      try {
        const zip = await JSZip.loadAsync(buf);
        // apex3d_anim.json yoki apex-file.json yoki istalgan .json faylni qidirish
        let jsonFile = zip.file('apex3d_anim.json') || zip.file('apex-file.json');
        if (!jsonFile) {
          const keys = Object.keys(zip.files).filter(k => k.endsWith('.json') && !zip.files[k].dir);
          if (keys.length > 0) jsonFile = zip.file(keys[0]);
        }
        if (!jsonFile) { log('❌ ZIP ichida JSON fayli topilmadi', 'le'); inputEl.value=''; return; }
        const jsonText = await jsonFile.async('string');
        let data;
        try { data = JSON.parse(jsonText); } catch(pe) { log('❌ JSON parse xatosi: ' + pe.message, 'le'); inputEl.value=''; return; }
        if (data.engine !== 'APEX3D') { log('⚠ Bu APEX3D animatsiya fayli emas!', 'le'); inputEl.value=''; return; }
        _tlPendingImport = { ...data, _zipObj: zip };
        tlShowImportModal(data, file.name);
      } catch(err) {
        log('⚠ ZIP o\'qishda xato: ' + err.message, 'le');
      } finally {
        inputEl.value = '';
      }
    }).catch(err => { log('❌ Fayl o\'qib bo\'lmadi: ' + err.message, 'le'); inputEl.value=''; });
    return;
  }

  // Oddiy JSON fayl
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.engine !== 'APEX3D') { log('⚠ Bu APEX3D animatsiya fayli emas!', 'le'); return; }
      _tlPendingImport = data;
      tlShowImportModal(data, file.name);
    } catch(err) {
      log('⚠ JSON parse xatosi: ' + err.message, 'le');
    } finally {
      inputEl.value = '';
    }
  };
  reader.onerror = () => { log('❌ Fayl o\'qib bo\'lmadi', 'le'); inputEl.value=''; };
  reader.readAsText(file);
};

function tlShowImportModal(data, filename) {
  const old = document.getElementById('tl-import-modal');
  if (old) old.remove();

  // Ob'ektlar va ularning track statistikasi
  const objs = data.objects || [];
  const totalKF = objs.reduce((s, o) => s + (o.track?.keyframes?.length||0) + (o.track?.visKeyframes?.length||0), 0);
  const withTrack = objs.filter(o => o.track && ((o.track.keyframes?.length||0) + (o.track.visKeyframes?.length||0)) > 0);

  const modal = document.createElement('div');
  modal.id = 'tl-import-modal';
  modal.classList.add('ui-overlay');

  modal.innerHTML = `
    <div style="background:var(--panel);border:1px solid var(--accent);width:460px;max-height:82vh;display:flex;flex-direction:column;box-shadow:0 0 40px rgba(0,229,255,0.18)">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border)">
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--accent);letter-spacing:2px">⬆ ANIMATSIYA YUKLASH</span>
        <span onclick="document.getElementById('tl-import-modal').remove()" style="cursor:pointer;color:var(--muted);font-size:14px;padding:0 4px">✕</span>
      </div>
      <!-- Body -->
      <div style="padding:12px 14px;overflow-y:auto;flex:1">

        <!-- Umumiy ma'lumot -->
        <div style="background:rgba(0,229,255,0.04);border:1px solid var(--border);padding:10px;margin-bottom:10px">
          <div style="display:grid;grid-template-columns:110px 1fr;gap:4px 8px;font-family:'Share Tech Mono',monospace;font-size:10px">
            <span style="color:var(--muted)">Fayl:</span>
            <span style="color:var(--accent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${filename}">${filename}</span>
            <span style="color:var(--muted)">Engine:</span>
            <span style="color:var(--text)">${data.engine} v${data.version}</span>
            <span style="color:var(--muted)">Davom:</span>
            <span style="color:var(--text)">${data.duration?.toFixed(2)||'?'}s</span>
            <span style="color:var(--muted)">Ob'ektlar:</span>
            <span style="color:var(--text)">${objs.length}</span>
            <span style="color:var(--muted)">Animatsiyali:</span>
            <span style="color:var(--accent)">${withTrack.length} ta (${totalKF} keyframe)</span>
            <span style="color:var(--muted)">Sana:</span>
            <span style="color:var(--muted);font-size:9px">${data.exportedAt ? new Date(data.exportedAt).toLocaleString() : '?'}</span>
          </div>
        </div>

        <!-- Camera -->
        ${data.camera ? `
        <div style="border:1px solid rgba(204,136,255,0.35);padding:8px;margin-bottom:10px">
          <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent4);letter-spacing:1px;margin-bottom:5px">🎥 KAMERA</div>
          <div style="display:grid;grid-template-columns:80px 1fr;gap:3px 8px;font-family:'Share Tech Mono',monospace;font-size:10px">
            <span style="color:var(--muted)">Nom:</span><span style="color:var(--accent4)">${data.camera.name}</span>
            <span style="color:var(--muted)">FOV:</span><span style="color:var(--text)">${data.camera.fov}°</span>
            <span style="color:var(--muted)">Pozitsiya:</span>
            <span style="color:var(--text)">X:${data.camera.position?.x?.toFixed(2)} Y:${data.camera.position?.y?.toFixed(2)} Z:${data.camera.position?.z?.toFixed(2)}</span>
          </div>
        </div>` : ''}

        <!-- Ob'ektlar ro'yxati -->
        <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:1px;margin-bottom:5px">BARCHA OB'EKTLAR</div>
        <div style="border:1px solid var(--border);max-height:200px;overflow-y:auto">
          ${objs.map(o => {
            const kfCount = (o.track?.keyframes?.length||0) + (o.track?.visKeyframes?.length||0);
            const matCol = o.material?.color || '#888';
            const icon = o.isCamera ? '🎥' : o.isEntity ? '🎮' : o.isStatic ? '🔒' : '◆';
            return `<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;border-bottom:1px solid rgba(255,255,255,0.04);font-family:'Share Tech Mono',monospace;font-size:10px">
              <span>${icon}</span>
              <div style="width:8px;height:8px;border-radius:2px;background:${matCol};flex-shrink:0;border:1px solid rgba(255,255,255,0.1)"></div>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)">${o.name}</span>
              <span style="color:var(--muted);font-size:9px">${o.type}</span>
              ${kfCount > 0 ? `<span style="color:var(--accent);font-size:9px;background:rgba(0,229,255,0.08);padding:1px 4px;border-radius:2px">${kfCount}kf</span>` : ''}
              ${o.script ? `<span style="color:var(--accent3);font-size:9px">⚡</span>` : ''}
              ${o.physics ? `<span style="color:var(--accent2);font-size:9px">🌊</span>` : ''}
            </div>`;
          }).join('')}
        </div>

        <div style="margin-top:10px;padding:8px;background:rgba(255,107,53,0.05);border:1px solid rgba(255,107,53,0.2);font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent2);line-height:1.7">
          ⚠ Sahnaga QO'SHIMCHA yuklash: mavjud ob'ektlar saqlanib qoladi.<br>
          Sahnani tozalab yuklamoqchi bo'lsangiz — avval sahnani tozalab oling.
        </div>
      </div>
      <!-- Footer -->
      <div style="display:flex;gap:8px;padding:10px 14px;border-top:1px solid var(--border);justify-content:flex-end">
        <button onclick="document.getElementById('tl-import-modal').remove()"
          style="background:rgba(255,255,255,0.04);border:1px solid var(--border);color:var(--muted);font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;padding:5px 16px;cursor:pointer;letter-spacing:1px">Bekor</button>
        <button onclick="tlConfirmImport(true)"
          style="background:rgba(255,107,53,0.1);border:1px solid rgba(255,107,53,0.5);color:var(--accent2);font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;padding:5px 16px;cursor:pointer;letter-spacing:1px">🗑 Tozalab Yuklash</button>
        <button onclick="tlConfirmImport(false)"
          style="background:rgba(0,229,255,0.12);border:1px solid var(--accent);color:var(--accent);font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;padding:5px 16px;cursor:pointer;letter-spacing:1px">✓ Qo'shimcha Yuklash</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

window.tlConfirmImport = function(clearScene) {
  const data = _tlPendingImport;
  if (!data) return;

  // Sahnani tozalash (agar kerak bo'lsa)
  if (clearScene) {
    [...objects].forEach(o => {
      if (!o.userData.isStatic) {
        scene.remove(o);
        const pi = physBodies.findIndex(b => b.mesh === o);
        if (pi > -1) physBodies.splice(pi, 1);
        objects.splice(objects.indexOf(o), 1);
      }
    });
    Object.keys(tlTracks).forEach(k => delete tlTracks[k]);
    log('🗑 Sahna tozalandi', 'lw');
  }

  // Duration va ease
  if (data.duration) {
    tlDuration = data.duration;
    const inp = $('tl-dur-inp');
    if (inp) inp.value = data.duration;
  }
  if (data.globalEase) tlGlobalEase = data.globalEase;

  let loaded = 0, skipped = 0;

  // ── Har bir ob'ektni qayta tiklash ──
  (data.objects || []).forEach(od => {
    if (od.isStatic) return; // Zamin kabi statik ob'ektlarni o'tkazib yubor

    let mesh;

    // Camera ob'ekti
    if (od.isCamera) {
      addCameraObject();
      mesh = objects[objects.length - 1];
      if (mesh && od.camProps) {
        mesh.userData.fov  = od.camProps.fov;
        mesh.userData.near = od.camProps.near;
        mesh.userData.far  = od.camProps.far;
      }
    }
    // GLB model — ZIP ichidan yuklab olish yoki placeholder Kub bilan almashtirish
    else if (od.isGLB || od.type === 'GLB' || od.type === 'GLTF') {
      const zipObj = data._zipObj || null;
      if (zipObj && od.glbFile) {
        // ZIP ichidan GLB ni asinxron yuklab sahnaga qo'shish
        (async () => {
          try {
            const buf = await zipObj.file(od.glbFile)?.async('arraybuffer');
            if (buf && typeof THREE !== 'undefined') {
              const loader = getGLTFLoader ? getGLTFLoader() : new THREE.GLTFLoader();
              loader.parse(buf, '', gltf => {
                const clone = gltf.scene;
                const wrapper = new THREE.Group();
                wrapper.add(clone);
                const newId = ++objIdC;
                wrapper.userData = { id: newId, name: od.name, type: 'GLB', isGLB: true };
                if (od.position) wrapper.position.set(od.position.x, od.position.y, od.position.z);
                if (od.rotation) wrapper.rotation.set(od.rotation.x, od.rotation.y, od.rotation.z);
                // Saqlangan scale ni ishlatish (auto-normalize YO'Q)
                if (od.scale) wrapper.scale.set(od.scale.x, od.scale.y, od.scale.z);
                else {
                  // Faqat scale saqlanmagan eski fayllar uchun normalize
                  const box = new THREE.Box3().setFromObject(clone);
                  const size = box.getSize(new THREE.Vector3());
                  const maxDim = Math.max(size.x, size.y, size.z);
                  if (maxDim > 5) clone.scale.setScalar(5 / maxDim);
                  else if (maxDim < 0.3) clone.scale.setScalar(0.5 / maxDim);
                }
                wrapper.traverse(ch => { if (ch.isMesh || ch.isSkinnedMesh) { ch.castShadow = true; ch.receiveShadow = true; } });
                scene.add(wrapper); objects.push(wrapper);
                if (od.track) {
                  tlTracks[newId] = { name: od.name, objRef: wrapper, keyframes: od.track.keyframes || [], visKeyframes: od.track.visKeyframes || [] };
                }
                updateHierarchy(); updateStats(); tlRender();
                log(`📦 GLB yuklandi (ZIP): ${od.name}`, 'lok');
              }, () => log(`⚠ GLB parse xatosi: ${od.name}`, 'lw'));
            } else {
              // Buffer yo'q — placeholder Kub
              mesh = addObject(0, 0);
              log(`⚠ GLB topilmadi (${od.glbFile}), Kub bilan almashtirildi: ${od.name}`, 'lw');
            }
          } catch(e) {
            log(`⚠ GLB yuklanmadi: ${od.name} — ${e.message}`, 'lw');
          }
        })();
        return; // Asinxron yuklanmoqda, pastdagi sync kod shart emas
      } else {
        // ZIP yo'q yoki glbFile noma'lum — Kub bilan almashtir
        mesh = addObject(0, 0);
        log(`⚠ GLB model mavjud emas, Kub bilan almashtirildi: ${od.name}`, 'lw');
      }
    }
    // Oddiy primitiv ob'ekt
    else {
      let primIdx = PRIMITIVES.findIndex(p => p.name === od.type);
      if (primIdx < 0) {
        // Noma'lum type — Kub bilan almashtir, o'tkazib yuborma
        primIdx = 0;
        log(`⚠ Noma'lum tur (${od.type}), Kub bilan almashtirildi: ${od.name}`, 'lw');
      }
      const texIdx = TEXTURES.findIndex(t => t.name === od.texName);
      mesh = addObject(primIdx, texIdx >= 0 ? texIdx : 0);
    }

    if (!mesh) { skipped++; return; }

    // ── Transform ──
    if (od.position) mesh.position.set(od.position.x, od.position.y, od.position.z);
    if (od.rotation) mesh.rotation.set(od.rotation.x, od.rotation.y, od.rotation.z);
    if (od.scale)    mesh.scale.set(od.scale.x, od.scale.y, od.scale.z);

    // ── Material ──
    if (od.material) {
      let mat = mesh.material;
      if (!mat) mesh.traverse(ch => { if (!mat && ch.isMesh && ch.material) mat = Array.isArray(ch.material) ? ch.material[0] : ch.material; });
      if (mat) {
        try { mat.color.set(od.material.color); } catch(e){}
        if (od.material.emissive && mat.emissive) {
          try { mat.emissive.set(od.material.emissive); } catch(e){}
          mat.emissiveIntensity = od.material.emissiveIntensity ?? 0;
        }
        mat.roughness    = od.material.roughness    ?? 0.5;
        mat.metalness    = od.material.metalness    ?? 0;
        mat.opacity      = od.material.opacity      ?? 1;
        mat.transparent  = od.material.transparent  ?? false;
        mat.wireframe    = od.material.wireframe    ?? false;
        mat.needsUpdate  = true;
      }
    }

    // ── Ko'rinish ──
    mesh.visible = od.visible ?? true;

    // ── userData ──
    mesh.userData.name     = od.name;
    mesh.userData.texName  = od.texName;
    mesh.userData.physMode = od.physics?.physMode || 'solid';
    mesh.userData.script   = od.script || null;

    // ── Fizika body ──
    if (od.physics) {
      const pb = physBodies.find(b => b.mesh === mesh);
      if (pb) {
        pb.mass        = od.physics.mass        ?? 1;
        pb.restitution = od.physics.restitution ?? 0.4;
        pb.isStatic    = od.physics.isStatic    ?? false;
      }
    }

    // ── Timeline track ──
    if (od.track) {
      const id = mesh.userData.id;
      tlTracks[id] = {
        name:         od.name,
        objRef:       mesh,
        keyframes:    od.track.keyframes    || [],
        visKeyframes: od.track.visKeyframes || [],
      };
    }

    loaded++;
  });

  // Ierarxiya va UI yangilash
  tlCurrent = 0;
  tlApplyAll(0);
  tlRender();
  updateHierarchy();
  updateStats();

  const modal = $('tl-import-modal');
  if (modal) modal.remove();
  _tlPendingImport = null;

  log(`⬆ Yuklandi: ${loaded} ob'ekt, ${Object.keys(tlTracks).length} track${skipped ? ` (${skipped} o'tkazib yuborildi)` : ''}`, 'lok');
};

// KF property setters (called from popup)
window.tlSetKfEase = function(v) {
  if (!tlSelKF||tlSelKF.isVis) return;
  const tr=tlTracks[tlSelKF.objId]; if(!tr) return;
  tr.keyframes[tlSelKF.idx].ease=v;
  tlRender();
  log(`◆ Easing → ${v}`, 'lok');
};
window.tlSetKfTangent = function(v) {
  if (!tlSelKF||tlSelKF.isVis) return;
  const tr=tlTracks[tlSelKF.objId]; if(!tr) return;
  tr.keyframes[tlSelKF.idx].tangent=v;
  tlRender();
};
window.tlSetKfVis = function(v) {
  if (!tlSelKF||!tlSelKF.isVis) return;
  const tr=tlTracks[tlSelKF.objId]; if(!tr) return;
  tr.visKeyframes[tlSelKF.idx].vis=parseInt(v);
  tlRender();
};

// ── APPLY ─────────────────────────────────────────────────────
function tlApplyAll(t) {
  Object.values(tlTracks).forEach(tr => {
    const obj = tr.objRef;
    if (!obj || !obj.parent) return;

    // Per-track loop: remap t within the track's keyframe span
    let lt = t;
    const kfs = tr.keyframes;
    if (tr.loop && kfs.length >= 2) {
      const tStart = kfs[0].t;
      const tEnd   = kfs[kfs.length - 1].t;
      const span   = tEnd - tStart;
      if (span > 0 && t >= tStart) {
        lt = tStart + ((t - tStart) % span);
      }
    }

    // Transform keyframes
    if (kfs.length > 0) {
      if (kfs.length===1) {
        // Faqat bitta KF — u KF ga yaqin bo'lgandagina qo'lla
        const k=kfs[0];
        obj.rotation.set(k.rx,k.ry,k.rz);
        const newSy1 = k.sy ?? obj.scale.y;
        obj.scale.set(k.sx??obj.scale.x, newSy1, k.sz??obj.scale.z);
        // Scale Y o'zgarganda pastki chegara bir xil qolsin
        if (k.py0 !== undefined && k.sy0 !== undefined) {
          const bottomY = k.py0 - k.sy0 * 0.5;
          obj.position.y = bottomY + newSy1 * 0.5;
        }
      } else {
        let a=kfs[0], b=kfs[kfs.length-1];
        let inRange = false;
        for (let i=0;i<kfs.length-1;i++) {
          if (lt>=kfs[i].t && lt<=kfs[i+1].t) { a=kfs[i]; b=kfs[i+1]; inRange=true; break; }
        }
        if (!inRange) {
          if (lt < kfs[0].t) { a=kfs[0]; b=kfs[0]; }
          else { a=kfs[kfs.length-1]; b=kfs[kfs.length-1]; }
        }
        obj.rotation.set(
          tlInterp(a,b,lt,'rx'), tlInterp(a,b,lt,'ry'), tlInterp(a,b,lt,'rz')
        );
        const newSyM = tlInterp(a,b,lt,'sy');
        obj.scale.set(
          tlInterp(a,b,lt,'sx'), newSyM, tlInterp(a,b,lt,'sz')
        );
        // Scale Y o'zgarganda pastki chegara bir xil qolsin
        if (a.py0 !== undefined && a.sy0 !== undefined) {
          const py0 = tlInterp(a,b,lt,'py0');
          const sy0 = tlInterp(a,b,lt,'sy0');
          const bottomY = py0 - sy0 * 0.5;
          obj.position.y = bottomY + newSyM * 0.5;
        }
      }
      if (outlineMesh && selectedObj===obj) {
        outlineMesh.position.copy(obj.position);
        outlineMesh.rotation.copy(obj.rotation);
        outlineMesh.scale.copy(obj.scale).multiplyScalar(1.07);
      }
    }

    // Visibility keyframes — step: before first KF = visible, each KF sets state going forward
    const vkfs = tr.visKeyframes;
    if (vkfs.length > 0) {
      // Before first keyframe: always visible
      if (lt < vkfs[0].t) {
        obj.visible = true;
      } else {
        // Find last vis KF at or before lt
        let visVal = 1; // default visible
        for (const vk of vkfs) {
          if (vk.t <= lt) visVal = vk.vis;
          else break;
        }
        obj.visible = visVal === 1;
      }
    }

    // Camera object aktiv bo'lsa real kamera ham harakat qiladi
    if (obj.userData && obj.userData.isCamera && obj.userData._isActive) {
      camera.position.copy(obj.position);
      camera.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
      camera.fov = obj.userData.fov || 60;
      camera.updateProjectionMatrix();
    }

    // ── Sound Keyframes — faqat oldinga ijro paytida fire qilsin ──
    if (tlPlaying && !tlScrubbing && t > _tlPrevTime) {
      const skfs = tr.soundKeyframes || [];
      for (const skf of skfs) {
        if (_tlPrevTime < skf.t && skf.t <= t) {
          SoundSystem.play(skf.sound || 'impact',
            skf.spatial !== false ? (tr.objRef || null) : null,
            { volume: skf.volume ?? 1 });
        }
      }
    }
  });
  _tlPrevTime = t;
}

// ── RENDER ────────────────────────────────────────────────────
function tlRender() {
  const tracksEl=$('tl-tracks'), scrubRow=$('tl-scrubber-row');
  if (!tracksEl||!scrubRow) return;

  // Tick marks
  scrubRow.querySelectorAll('.tl-tick,.tl-tick-lbl').forEach(e=>e.remove());
  const W=scrubRow.clientWidth||400;
  const steps=Math.min(20,Math.floor(tlDuration)*2);
  for (let i=0;i<=steps;i++) {
    const x=(i/steps)*W;
    const tick=document.createElement('div');
    tick.className='tl-tick'; tick.style.left=x+'px'; scrubRow.appendChild(tick);
    if (i%2===0) {
      const lbl=document.createElement('div');
      lbl.className='tl-tick-lbl'; lbl.style.left=(x+2)+'px';
      lbl.textContent=(i/steps*tlDuration).toFixed(1)+'s'; scrubRow.appendChild(lbl);
    }
  }
  const ph=$('tl-playhead');
  if (ph) ph.style.left=(tlCurrent/tlDuration*W)+'px';

  // Tracks
  tracksEl.innerHTML='';
  if (Object.keys(tlTracks).length===0) {
    tracksEl.innerHTML='<div style="padding:8px;font-size:10px;color:var(--muted);font-family:\'Share Tech Mono\',monospace;text-align:center">Obyekt tanlang → ◆ KF yoki 👁 VIS bosing</div>';
    return;
  }

  Object.entries(tlTracks).forEach(([id, tr])=>{
    const hasKF  = tr.keyframes.length > 0;
    const hasVis = tr.visKeyframes.length > 0;
    if (!hasKF && !hasVis) return;
    // --- Transform track ---
    if (hasKF) {
      const row=document.createElement('div'); row.className='tl-track';
      const lbl=document.createElement('div'); lbl.className='tl-track-lbl';
      lbl.style.cursor='pointer'; lbl.title='Egri chiziq muharrirni ochish';
      lbl.onclick=()=>ceOpen(id,'pos');

      // Loop tugmasi
      const loopBtn=document.createElement('button');
      loopBtn.textContent='🔄';
      loopBtn.title='Loop — animatsiya oxiriga yetganda avtomatik qayta boshlaydi';
      loopBtn.style.cssText=`background:${tr.loop?'rgba(57,255,20,.18)':'none'};border:1px solid ${tr.loop?'rgba(57,255,20,.5)':'var(--border)'};color:${tr.loop?'var(--accent3)':'var(--muted)'};font-size:9px;padding:0 3px;border-radius:2px;cursor:pointer;flex-shrink:0;line-height:14px;height:14px`;
      loopBtn.onclick=e=>{e.stopPropagation();tlToggleTrackLoop(id);};
      lbl.appendChild(loopBtn);

      const typeSpan=document.createElement('span');
      typeSpan.className='tl-track-type tl-track-type-pos';
      typeSpan.textContent='POS';
      lbl.appendChild(typeSpan);

      const nameSpan=document.createElement('span');
      nameSpan.style.cssText='color:var(--muted);overflow:hidden;text-overflow:ellipsis';
      nameSpan.textContent=tr.name;
      lbl.appendChild(nameSpan);
      row.appendChild(lbl);
      const lane=document.createElement('div'); lane.className='tl-track-lane';

      lane.onclick=e=>{
        if (e.target.classList.contains('tl-kf')) return;
        const rect=lane.getBoundingClientRect();
        tlCurrent=Math.max(0,Math.min(tlDuration,(e.clientX-rect.left)/rect.width*tlDuration));
        tlApplyAll(tlCurrent); tlRender();
        $('tl-kf-popup').style.display='none';
      };
      lane.ondblclick=e=>{
        if (e.target.classList.contains('tl-kf')) return;
        const rect=lane.getBoundingClientRect();
        tlCurrent=Math.max(0,Math.min(tlDuration,(e.clientX-rect.left)/rect.width*tlDuration));
        // Set selected obj to this track's obj
        const tObj = tr.objRef || objects.find(o=>o.userData.id==id);
        if (tObj) { selectObject(tObj); }
        tlAddKeyframe();
        tlRender();
        log('◆ KF qo\'shildi @ '+tlCurrent.toFixed(2)+'s (2x bosish)', 'lok');
      };

      // Segments with easing color
      for (let i=0;i<tr.keyframes.length-1;i++) {
        const seg=document.createElement('div');
        const ease=tr.keyframes[i].ease||'smooth';
        seg.className=`tl-segment ease-${ease}`;
        seg.style.left=(tr.keyframes[i].t/tlDuration*100)+'%';
        seg.style.width=((tr.keyframes[i+1].t-tr.keyframes[i].t)/tlDuration*100)+'%';
        // Draw easing curve SVG inside segment
        const sw=Math.max(10,(tr.keyframes[i+1].t-tr.keyframes[i].t)/tlDuration*W);
        seg.innerHTML=`<svg width="100%" height="14" style="position:absolute;top:0;left:0;pointer-events:none;opacity:.6"><polyline points="${tlEaseCurvePoints(ease,sw)}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
        lane.appendChild(seg);
      }

      // KF diamonds
      tr.keyframes.forEach((kf,ki)=>{
        const dot=document.createElement('div');
        const ease=kf.ease||'smooth';
        const isSel=tlSelKF&&!tlSelKF.isVis&&tlSelKF.objId==id&&tlSelKF.idx===ki;
        dot.className=`tl-kf ease-${ease}${isSel?' selected':''}`;
        dot.style.left=(kf.t/tlDuration*100)+'%';
        dot.title=`${tr.name} @ ${kf.t.toFixed(2)}s [${ease}]`;

        // Click → open popup
        dot.onclick=e=>{
          e.stopPropagation();
          tlSelKF={objId:id,idx:ki,isVis:false};
          tlCurrent=kf.t; tlApplyAll(tlCurrent); tlRender();
          showKfPopup(e.clientX,e.clientY,kf,false);
        };

        // Drag
        dot.onmousedown=e=>{
          e.stopPropagation();
          const startX=e.clientX, startT=kf.t;
          const onmove=ev=>{
            const lr=lane.getBoundingClientRect();
            kf.t=Math.max(0,Math.min(tlDuration,startT+(ev.clientX-startX)/lr.width*tlDuration));
            tr.keyframes.sort((a,b)=>a.t-b.t); tlRender();
          };
          const onup=()=>{document.removeEventListener('mousemove',onmove);document.removeEventListener('mouseup',onup)};
          document.addEventListener('mousemove',onmove); document.addEventListener('mouseup',onup);
        };
        lane.appendChild(dot);
      });
      row.appendChild(lane); tracksEl.appendChild(row);
    }

    // --- Visibility track ---
    if (hasVis) {
      const vrow=document.createElement('div'); vrow.className='tl-track';
      const vlbl=document.createElement('div'); vlbl.className='tl-track-lbl';
      vlbl.style.cursor='pointer'; vlbl.title='Egri chiziq muharrirni ochish';
      vlbl.onclick=()=>ceOpen(id,'vis');

      // Loop tugmasi (VIS)
      const vLoopBtn=document.createElement('button');
      vLoopBtn.textContent='🔄';
      vLoopBtn.title='Loop — animatsiya oxiriga yetganda avtomatik qayta boshlaydi';
      vLoopBtn.style.cssText=`background:${tr.loop?'rgba(57,255,20,.18)':'none'};border:1px solid ${tr.loop?'rgba(57,255,20,.5)':'var(--border)'};color:${tr.loop?'var(--accent3)':'var(--muted)'};font-size:9px;padding:0 3px;border-radius:2px;cursor:pointer;flex-shrink:0;line-height:14px;height:14px`;
      vLoopBtn.onclick=e=>{e.stopPropagation();tlToggleTrackLoop(id);};
      vlbl.appendChild(vLoopBtn);

      const vTypeSpan=document.createElement('span');
      vTypeSpan.className='tl-track-type tl-track-type-vis';
      vTypeSpan.textContent='VIS';
      vlbl.appendChild(vTypeSpan);

      const vNameSpan=document.createElement('span');
      vNameSpan.style.cssText='color:var(--muted);overflow:hidden;text-overflow:ellipsis';
      vNameSpan.textContent=tr.name;
      vlbl.appendChild(vNameSpan);
      vrow.appendChild(vlbl);
      const vlane=document.createElement('div'); vlane.className='tl-track-lane';

      // Visibility bar segments
      let lastX=0, lastVis=1;
      tr.visKeyframes.forEach((vk,vi)=>{
        const xPct=vk.t/tlDuration*100;
        if (lastVis===1 && xPct>lastX) {
          const bar=document.createElement('div');
          bar.style.cssText=`position:absolute;top:5px;bottom:5px;left:${lastX}%;width:${xPct-lastX}%;background:rgba(204,136,255,.18);border-top:1px solid var(--accent4);border-bottom:1px solid var(--accent4)`;
          vlane.appendChild(bar);
        }
        lastX=xPct; lastVis=vk.vis;
      });
      if (lastVis===1 && lastX<100) {
        const bar=document.createElement('div');
        bar.style.cssText=`position:absolute;top:5px;bottom:5px;left:${lastX}%;width:${100-lastX}%;background:rgba(204,136,255,.18);border-top:1px solid var(--accent4);border-bottom:1px solid var(--accent4)`;
        vlane.appendChild(bar);
      }

      vlane.onclick=e=>{
        if (e.target.classList.contains('tl-kf-vis')) return;
        const rect=vlane.getBoundingClientRect();
        tlCurrent=Math.max(0,Math.min(tlDuration,(e.clientX-rect.left)/rect.width*tlDuration));
        tlApplyAll(tlCurrent); tlRender();
        $('tl-kf-popup').style.display='none';
      };

      tr.visKeyframes.forEach((vk,vi)=>{
        const dot=document.createElement('div');
        const isSel=tlSelKF&&tlSelKF.isVis&&tlSelKF.objId==id&&tlSelKF.idx===vi;
        dot.className=`tl-kf-vis ${vk.vis?'vis-on':'vis-off'}${isSel?' selected':''}`;
        dot.style.left=(vk.t/tlDuration*100)+'%';
        dot.title=`${vk.vis?'Ko\'rinadi':'Ko\'rinmaydi'} @ ${vk.t.toFixed(2)}s`;
        dot.onclick=e=>{
          e.stopPropagation();
          tlSelKF={objId:id,idx:vi,isVis:true};
          tlCurrent=vk.t; tlApplyAll(tlCurrent); tlRender();
          showKfPopup(e.clientX,e.clientY,vk,true);
        };
        dot.onmousedown=e=>{
          e.stopPropagation();
          const startX=e.clientX, startT=vk.t;
          const onmove=ev=>{
            const lr=vlane.getBoundingClientRect();
            vk.t=Math.max(0,Math.min(tlDuration,startT+(ev.clientX-startX)/lr.width*tlDuration));
            tr.visKeyframes.sort((a,b)=>a.t-b.t); tlRender();
          };
          const onup=()=>{document.removeEventListener('mousemove',onmove);document.removeEventListener('mouseup',onup)};
          document.addEventListener('mousemove',onmove); document.addEventListener('mouseup',onup);
        };
        vlane.appendChild(dot);
      });
      vrow.appendChild(vlane); tracksEl.appendChild(vrow);
    }

    // --- Sound track ---
    const hasSnd = (tr.soundKeyframes||[]).length > 0;
    if (hasSnd) {
      const srow = document.createElement('div'); srow.className = 'tl-track';
      const slbl = document.createElement('div'); slbl.className = 'tl-track-lbl';

      const sTypeSpan = document.createElement('span');
      sTypeSpan.className = 'tl-track-type tl-track-type-snd';
      sTypeSpan.textContent = 'SND';
      slbl.appendChild(sTypeSpan);

      const sNameSpan = document.createElement('span');
      sNameSpan.style.cssText = 'color:var(--muted);overflow:hidden;text-overflow:ellipsis';
      sNameSpan.textContent = tr.name;
      slbl.appendChild(sNameSpan);
      srow.appendChild(slbl);

      const slane = document.createElement('div'); slane.className = 'tl-track-lane';

      // Click on lane → add sound KF here
      slane.onclick = e => {
        if (e.target.classList.contains('tl-kf-snd')) return;
        const rect = slane.getBoundingClientRect();
        tlCurrent = Math.max(0, Math.min(tlDuration, (e.clientX - rect.left) / rect.width * tlDuration));
        const tObj = tr.objRef || objects.find(o => o.userData.id == id);
        if (tObj) selectObject(tObj);
        tlAddSoundKeyframe();
      };

      // Sound KF markers
      (tr.soundKeyframes || []).forEach((skf, si) => {
        const dot = document.createElement('div');
        const isSel = _tlSelSndKF && _tlSelSndKF.objId == id && _tlSelSndKF.idx === si;
        dot.className = 'tl-kf-snd' + (isSel ? ' selected' : '');
        dot.style.left = (skf.t / tlDuration * 100) + '%';
        dot.title = `♪ ${skf.sound} vol:${skf.volume ?? 1} @ ${skf.t.toFixed(2)}s`;

        dot.onclick = e => {
          e.stopPropagation();
          _tlSelSndKF = { objId: id, idx: si };
          tlCurrent = skf.t; tlApplyAll(tlCurrent); tlRender();
          _tlFillSoundSelect();
          $('sp-sound').value  = skf.sound || 'impact';
          $('sp-volume').value = skf.volume ?? 1;
          $('sp-vol-lbl').textContent = (skf.volume ?? 1).toFixed(1);
          $('sp-spatial').checked = skf.spatial !== false;
          _tlShowSndPopup(e.clientX, e.clientY + 10);
        };

        dot.onmousedown = e => {
          e.stopPropagation();
          const startX = e.clientX, startT = skf.t;
          const onmove = ev => {
            const lr = slane.getBoundingClientRect();
            skf.t = Math.max(0, Math.min(tlDuration, startT + (ev.clientX - startX) / lr.width * tlDuration));
            tr.soundKeyframes.sort((a, b) => a.t - b.t); tlRender();
          };
          const onup = () => { document.removeEventListener('mousemove', onmove); document.removeEventListener('mouseup', onup); };
          document.addEventListener('mousemove', onmove); document.addEventListener('mouseup', onup);
        };
        slane.appendChild(dot);
      });
      srow.appendChild(slane); tracksEl.appendChild(srow);
    }


  // Scrubber drag
  scrubRow.ondblclick=e=>{
    if (!selectedObj) return;
    const rect=scrubRow.getBoundingClientRect();
    tlCurrent=Math.max(0,Math.min(tlDuration,(e.clientX-rect.left)/rect.width*tlDuration));
    tlAddKeyframe();
    log('◆ KF qo\'shildi @ '+tlCurrent.toFixed(2)+'s', 'lok');
  };
  scrubRow.onmousedown=e=>{
    // CUT MODE: select range
    if (_tlCutMode) {
      const rect = scrubRow.getBoundingClientRect();
      _tlCutStart = Math.max(0, Math.min(tlDuration, (e.clientX - rect.left) / rect.width * tlDuration));
      _tlCutEnd = _tlCutStart;
      const rangeEl = $('tl-cut-range');
      const moveC = ev => {
        _tlCutEnd = Math.max(0, Math.min(tlDuration, (ev.clientX - rect.left) / rect.width * tlDuration));
        const t0 = Math.min(_tlCutStart, _tlCutEnd) / tlDuration * 100;
        const t1 = Math.max(_tlCutStart, _tlCutEnd) / tlDuration * 100;
        if (rangeEl) {
          rangeEl.style.display = 'block';
          rangeEl.style.left = t0 + '%';
          rangeEl.style.width = (t1 - t0) + '%';
        }
      };
      const upC = () => {
        document.removeEventListener('mousemove', moveC);
        document.removeEventListener('mouseup', upC);
        // Show cut confirm button
        if (rangeEl && Math.abs(_tlCutEnd - _tlCutStart) > 0.05) {
          log(`✂ Diapazon: ${Math.min(_tlCutStart,_tlCutEnd).toFixed(2)}s – ${Math.max(_tlCutStart,_tlCutEnd).toFixed(2)}s | Kesish uchun "✂ Kes" tugmasini yana bosing`, 'lw');
          const btn = $('tl-cut-btn');
          if (btn) { btn.textContent = '✂ Tasdiqlash'; btn.onclick = () => tlCutRange(); }
        }
      };
      document.addEventListener('mousemove', moveC);
      document.addEventListener('mouseup', upC);
      return;
    }
    tlScrubbing=true;
    $('tl-kf-popup').style.display='none';
    const move=ev=>{
      const rect=scrubRow.getBoundingClientRect();
      tlCurrent=Math.max(0,Math.min(tlDuration,(ev.clientX-rect.left)/rect.width*tlDuration));
      tlApplyAll(tlCurrent);
      const lbl=$('tl-time-lbl'); if(lbl) lbl.textContent=tlCurrent.toFixed(2)+'s';
      const ph2=$('tl-playhead'); if(ph2) ph2.style.left=(tlCurrent/tlDuration*(scrubRow.clientWidth||400))+'px';
    };
    const up=()=>{tlScrubbing=false;document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up)};
    document.addEventListener('mousemove',move); document.addEventListener('mouseup',up);
    move(e);
  };

// ── KF POPUP ──────────────────────────────────────────────────

  });
}
