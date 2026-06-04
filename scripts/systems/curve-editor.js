// ============================================================
// CURVE EDITOR — Egri chiziq muharrir
// ============================================================
let ceObjId    = null;   // hozir ochilgan track id
let ceMode     = 'pos';  // 'pos' | 'vis'
let ceResizeH  = 180;    // panel balandligi (cho'ziladigan)
let ceResizeStep = 0;    // 0=180 1=260 2=120
let ceDragging = false;  // bezier handle drag
let ceDragHandle = null; // {kfIdx, which:'in'|'out'}
let ceIsResizing = false;
let ceResizeStartY = 0, ceResizeStartH = 0;

const CE_SIZES = [180, 280, 120]; // 3 xil o'lcham

function ceOpen(objId, mode) {
  ceObjId = objId;
  ceMode  = mode;
  const panel = $('curve-editor-panel');
  if (!panel) return;
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  const body = $('curve-editor-body');
  if (body) body.style.height = ceResizeH + 'px';

  const tr = tlTracks[objId];
  const nameLbl = $('ce-track-name');
  if (nameLbl && tr) nameLbl.textContent = tr.name;

  // Build track tabs
  ceBuildTabs();
  // Show/hide ease row
  const easeRow = $('ce-ease-row');
  if (easeRow) easeRow.style.display = mode==='vis' ? 'none' : 'flex';

  ceDrawCanvas();
  ceSyncEaseButtons();
}

window.ceClose = function() {
  const panel = $('curve-editor-panel');
  if (panel) panel.style.display = 'none';
  ceObjId = null;
};

window.ceCycleResize = function() {
  ceResizeStep = (ceResizeStep + 1) % CE_SIZES.length;
  ceResizeH = CE_SIZES[ceResizeStep];
  const body = $('curve-editor-body');
  if (body) body.style.height = ceResizeH + 'px';
  // Resize canvas
  ceResizeCanvas();
  ceDrawCanvas();
};

function ceResizeCanvas() {
  const wrap = $('curve-canvas-wrap');
  const cv   = $('curve-canvas');
  if (!wrap || !cv) return;
  const w = wrap.clientWidth || 209;
  const h = Math.max(60, ceResizeH - 80);
  cv.width  = w;
  cv.height = h;
  cv.style.height = h + 'px';
}

function ceBuildTabs() {
  const tabs = $('ce-track-tabs');
  if (!tabs || !ceObjId) return;
  const tr = tlTracks[ceObjId];
  if (!tr) return;
  tabs.innerHTML = '';
  if (tr.keyframes.length > 0) {
    const t = document.createElement('div');
    t.className = 'ce-tab' + (ceMode==='pos'?' active':'');
    t.textContent = 'POS/ROT';
    t.onclick = () => { ceMode='pos'; ceBuildTabs(); const er=$('ce-ease-row'); if(er) er.style.display='flex'; ceDrawCanvas(); ceSyncEaseButtons(); };
    tabs.appendChild(t);
  }
  if (tr.visKeyframes.length > 0) {
    const t = document.createElement('div');
    t.className = 'ce-tab vis-tab' + (ceMode==='vis'?' active':'');
    t.textContent = '👁 VIS';
    t.onclick = () => { ceMode='vis'; ceBuildTabs(); const er=$('ce-ease-row'); if(er) er.style.display='none'; ceDrawCanvas(); };
    tabs.appendChild(t);
  }
}

function ceSyncEaseButtons() {
  if (!ceObjId) return;
  const tr = tlTracks[ceObjId];
  if (!tr || !tr.keyframes.length) return;
  // Get dominant ease from selected KF or first KF
  let ease = 'smooth';
  if (tlSelKF && !tlSelKF.isVis && tlSelKF.objId == ceObjId) {
    ease = tr.keyframes[tlSelKF.idx]?.ease || 'smooth';
  } else if (tr.keyframes.length) {
    ease = tr.keyframes[0].ease || 'smooth';
  }
  document.querySelectorAll('.ce-ease-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.ease === ease);
  });
}

window.ceSetEase = function(ease) {
  if (!ceObjId) return;
  const tr = tlTracks[ceObjId];
  if (!tr) return;
  // Apply to selected KF or ALL KFs
  if (tlSelKF && !tlSelKF.isVis && tlSelKF.objId == ceObjId) {
    tr.keyframes[tlSelKF.idx].ease = ease;
  } else {
    tr.keyframes.forEach(k => k.ease = ease);
  }
  tlGlobalEase = ease;
  ceSyncEaseButtons();
  ceDrawCanvas();
  tlRender();
  log(`◈ Easing → ${ease}${tlSelKF?` (KF ${tlSelKF.idx})`:'(barchasi)'}`, 'lok');
};

// ── CANVAS DRAW ───────────────────────────────────────────────
function ceDrawCanvas() {
  const cv  = $('curve-canvas');
  if (!cv) return;
  ceResizeCanvas();
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  ctx.clearRect(0,0,W,H);

  // Background
  ctx.fillStyle = '#080b12';
  ctx.fillRect(0,0,W,H);

  // Grid
  ctx.strokeStyle = '#1e2530';
  ctx.lineWidth = 1;
  for (let i=0; i<=4; i++) {
    const y = (i/4)*H;
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
  }
  for (let i=0; i<=8; i++) {
    const x = (i/8)*W;
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
  }
  // Axis labels
  ctx.fillStyle = '#4a5568';
  ctx.font = '8px "Share Tech Mono"';
  ctx.fillText('0', 3, H-3);
  ctx.fillText('1', 3, 10);
  ctx.fillText('t→', W-18, H-3);

  if (!ceObjId) { ceDrawInfo('Track tanlanmagan'); return; }
  const tr = tlTracks[ceObjId];
  if (!tr) { ceDrawInfo('Track topilmadi'); return; }

  if (ceMode === 'vis') {
    ceDrawVisTrack(ctx, tr, W, H);
  } else {
    ceDrawEasingCurves(ctx, tr, W, H);
  }

  // Playhead
  if (tlDuration > 0) {
    const px = (tlCurrent / tlDuration) * W;
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,H); ctx.stroke();
    ctx.setLineDash([]);
  }
}

function ceDrawEasingCurves(ctx, tr, W, H) {
  const kfs = tr.keyframes;
  if (kfs.length === 0) { ceDrawInfo('Keyframe yo\'q — ◆ KF bosing'); return; }

  const EASE_COLORS = {
    linear:'#88aacc', smooth:'#39ff14', bounce:'#ff6b35', elastic:'#cc88ff', back:'#ffcc00'
  };
  const PAD = 12;

  // Draw each segment
  for (let si=0; si<kfs.length-1; si++) {
    const a = kfs[si], b = kfs[si+1];
    const ease = a.ease || 'smooth';
    const tangent = a.tangent || 'auto';
    const fn = EASINGS[ease] || EASINGS.smooth;
    const col = EASE_COLORS[ease] || '#00e5ff';
    const x0 = (a.t / tlDuration) * W;
    const x1 = (b.t / tlDuration) * W;

    // Draw curve
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.shadowColor = col;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    const steps = Math.max(20, Math.round((x1-x0)));
    for (let i=0; i<=steps; i++) {
      const t = i/steps;
      let y;
      if (tangent === 'sharp') {
        y = t < 1 ? 0 : 1;
      } else if (tangent === 'flat') {
        const h00 = 2*t*t*t-3*t*t+1, h01 = -2*t*t*t+3*t*t;
        y = h00*0 + h01*1; // flat hermite from 0 to 1
      } else {
        y = fn(t);
      }
      const px = x0 + t*(x1-x0);
      const py = H - PAD - y*(H - PAD*2);
      if (i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Segment label
    const midX = (x0+x1)/2;
    ctx.fillStyle = col;
    ctx.font = '8px "Share Tech Mono"';
    ctx.globalAlpha = 0.7;
    ctx.fillText(ease, midX-16, H-2);
    ctx.globalAlpha = 1;
  }

  // Draw keyframe dots
  kfs.forEach((kf, ki) => {
    const px = (kf.t / tlDuration) * W;
    const isSel = tlSelKF && !tlSelKF.isVis && tlSelKF.objId==ceObjId && tlSelKF.idx===ki;
    const col = EASE_COLORS[kf.ease||'smooth'] || '#00e5ff';
    ctx.fillStyle = isSel ? '#fff' : col;
    ctx.strokeStyle = isSel ? col : '#fff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = col;
    ctx.shadowBlur = isSel ? 8 : 3;
    ctx.beginPath();
    // Diamond shape
    ctx.save();
    ctx.translate(px, H/2);
    ctx.rotate(Math.PI/4);
    ctx.fillRect(-5,-5,10,10);
    ctx.strokeRect(-5,-5,10,10);
    ctx.restore();
    ctx.shadowBlur = 0;

    // Time label
    ctx.fillStyle = '#4a5568';
    ctx.font = '8px "Share Tech Mono"';
    ctx.fillText(kf.t.toFixed(1)+'s', px+3, 10);
  });

  // Info
  const infoEl = $('ce-info');
  if (infoEl) {
    const selKf = tlSelKF && !tlSelKF.isVis && tlSelKF.objId==ceObjId ? kfs[tlSelKF.idx] : null;
    infoEl.textContent = selKf
      ? `KF ${tlSelKF.idx}: t=${selKf.t.toFixed(2)}s | ease=${selKf.ease||'smooth'} | tangent=${selKf.tangent||'auto'}`
      : `${kfs.length} keyframe | Bosing: easing tanlash`;
  }
}

function ceDrawVisTrack(ctx, tr, W, H) {
  const vkfs = tr.visKeyframes;
  if (vkfs.length === 0) { ceDrawInfo('Vis keyframe yo\'q — 👁 VIS bosing'); return; }

  const midY = H / 2;
  const onY  = midY - 22;
  const offY = midY + 22;

  // Draw vis state line
  let prevX = 0, prevVis = 1; // before first KF = visible
  const allPts = [{t:0, vis:1}, ...vkfs, {t:tlDuration, vis: vkfs[vkfs.length-1].vis}];

  for (let i=0; i<allPts.length-1; i++) {
    const x0 = (allPts[i].t / tlDuration) * W;
    const x1 = (allPts[i+1].t / tlDuration) * W;
    const vis = allPts[i].vis;
    const y = vis ? onY : offY;
    const col = vis ? '#cc88ff' : '#4a5568';

    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.shadowColor = vis ? '#cc88ff' : 'transparent';
    ctx.shadowBlur = vis ? 6 : 0;
    ctx.beginPath();
    ctx.moveTo(x0, y); ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Vertical drop at transition
    if (i < allPts.length-2) {
      const nextVis = allPts[i+1].vis;
      if (nextVis !== vis) {
        const nextY = nextVis ? onY : offY;
        ctx.strokeStyle = '#4a5568';
        ctx.lineWidth = 1;
        ctx.setLineDash([3,3]);
        ctx.beginPath();
        ctx.moveTo(x1, y); ctx.lineTo(x1, nextY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // Labels
  ctx.fillStyle = '#cc88ff';
  ctx.font = '9px "Share Tech Mono"';
  ctx.fillText('KO\'RINADI', 4, onY - 4);
  ctx.fillStyle = '#4a5568';
  ctx.fillText('YASHIRIN', 4, offY - 4);

  // KF markers
  vkfs.forEach((vk, vi) => {
    const px = (vk.t / tlDuration) * W;
    const py = vk.vis ? onY : offY;
    const isSel = tlSelKF && tlSelKF.isVis && tlSelKF.objId==ceObjId && tlSelKF.idx===vi;
    ctx.fillStyle = isSel ? '#fff' : (vk.vis ? '#cc88ff' : '#4a5568');
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#cc88ff'; ctx.shadowBlur = isSel ? 8 : 3;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    // Time
    ctx.fillStyle = '#4a5568'; ctx.font='8px "Share Tech Mono"';
    ctx.fillText(vk.t.toFixed(1)+'s', px+4, py-6);
    // Vis label
    ctx.fillStyle = vk.vis ? '#cc88ff' : '#4a5568';
    ctx.fillText(vk.vis ? '👁' : '🚫', px-5, py+16);
  });

  const infoEl = $('ce-info');
  if (infoEl) infoEl.textContent = `${vkfs.length} vis keyframe | Kalit qo'yilguncha ko'rinadi`;
}

function ceDrawInfo(msg) {
  const cv = $('curve-canvas'); if (!cv) return;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#4a5568';
  ctx.font = '10px "Share Tech Mono"';
  ctx.fillText(msg, cv.width/2-80, cv.height/2+4);
  const infoEl = $('ce-info');
  if (infoEl) infoEl.textContent = msg;
}

// Canvas click — select KF by clicking near it
$('curve-canvas')?.addEventListener('click', e => {
  if (!ceObjId) return;
  const cv = $('curve-canvas');
  const rect = cv.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (cv.width / rect.width);
  const my = (e.clientY - rect.top)  * (cv.height / rect.height);
  const tr = tlTracks[ceObjId];
  if (!tr) return;

  const kfs = ceMode==='vis' ? tr.visKeyframes : tr.keyframes;
  let closest = null, closestDist = 20;
  kfs.forEach((kf, ki) => {
    const px = (kf.t / tlDuration) * cv.width;
    const dist = Math.abs(px - mx);
    if (dist < closestDist) { closestDist=dist; closest=ki; }
  });
  if (closest !== null) {
    tlSelKF = { objId: ceObjId, idx: closest, isVis: ceMode==='vis' };
    tlCurrent = kfs[closest].t;
    tlApplyAll(tlCurrent); tlRender(); ceDrawCanvas();
    ceSyncEaseButtons();
  }
});

// Resize by dragging header
$('curve-editor-header')?.addEventListener('mousedown', e => {
  if (e.target.id === 'curve-editor-close') return;
  ceIsResizing = true;
  ceResizeStartY = e.clientY;
  ceResizeStartH = ceResizeH;
  e.preventDefault();
});
document.addEventListener('mousemove', e => {
  if (!ceIsResizing) return;
  const dy = ceResizeStartY - e.clientY; // drag up = bigger
  ceResizeH = Math.max(100, Math.min(400, ceResizeStartH + dy));
  const body = $('curve-editor-body');
  if (body) body.style.height = ceResizeH + 'px';
  ceResizeCanvas(); ceDrawCanvas();
});
document.addEventListener('mouseup', () => { ceIsResizing = false; });

// Redraw curve editor every frame when playing