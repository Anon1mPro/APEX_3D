// ============================================================
// APEX3D — Timeline System  (to'liq qayta yozilgan)
// Tuzatilgan xatolar:
//   1. #timeline-panel height:160px edi → 132px bo'lishi kerak
//   2. switchBottomTab timeline uchun display:flex ishlatmaydi edi
//   3. Scrubber event listener yo'q edi
//   4. tlPlay/tlStop/tlAddKeyframe va boshqalar ishlamaydi edi
// ============================================================

const TimelineSystem = (() => {
  'use strict';

  // ── STATE ──────────────────────────────────────────────────
  let tracks      = [];   // [{objId, objName, keyframes:[...]}]
  let duration    = 5;    // soniya
  let currentTime = 0;
  let isPlaying   = false;
  let rafId       = null;
  let lastTS      = null;
  let selectedKf  = null; // {trackIdx, kfIdx}
  let globalEase  = 'smooth';
  let cutMode     = false;
  let cutAnchor   = null; // kesish boshlanish vaqti

  // ── DOM HELPER ─────────────────────────────────────────────
  const $   = (id) => document.getElementById(id);
  const $el = (tag, cls, style) => {
    const e = document.createElement(tag);
    if (cls)   e.className = cls;
    if (style) Object.assign(e.style, style);
    return e;
  };

  // ── CONSOLE LOG (engine'ning console-body'siga yozadi) ─────
  function clog(msg, type = '') {
    const body = $('console-body');
    if (!body) return;
    const row = $el('div', type === 'w' ? 'lw' : type === 'e' ? 'le' : type === 'ok' ? 'lok' : 'lg');
    const ts  = $el('span', 'lt');
    ts.textContent = new Date().toLocaleTimeString('uz');
    row.appendChild(ts);
    row.appendChild(document.createTextNode(msg));
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }

  // ── EASING FUNKSIYALAR ─────────────────────────────────────
  const easings = {
    linear:  t => t,
    smooth:  t => t < .5 ? 2*t*t : -1+(4-2*t)*t,
    bounce:  t => {
      if (t < 1/2.75) return 7.5625*t*t;
      if (t < 2/2.75) { t -= 1.5/2.75;   return 7.5625*t*t+.75; }
      if (t < 2.5/2.75){ t -= 2.25/2.75; return 7.5625*t*t+.9375; }
      t -= 2.625/2.75; return 7.5625*t*t+.984375;
    },
    elastic: t => t === 0||t === 1 ? t : Math.pow(2,-10*t)*Math.sin((t*10-.75)*2*Math.PI/3)+1,
    back:    t => { const c1=1.70158,c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); }
  };

  const lerpNum = (a, b, t) => a + (b - a) * t;
  const lerpV3  = (a, b, t) => ({
    x: lerpNum(a.x, b.x, t),
    y: lerpNum(a.y, b.y, t),
    z: lerpNum(a.z, b.z, t)
  });

  // ── ENGINE INTEGRATSIYASI ──────────────────────────────────
  // Tanlangan Three.js obyektni topadi (engine o'zgaruvchi nomiga moslashtirilgan)
  function getSelectedObj() {
    return window.selectedObject
      || window._selObj
      || (window.EditorState && window.EditorState.selected)
      || (window.EditorCore && window.EditorCore.getSelected && window.EditorCore.getSelected())
      || null;
  }

  // ID bo'yicha Three.js obyekti
  function getObjById(id) {
    if (!id) return null;
    // Agar engine sceneObjects massivini ishlatsa
    if (window.sceneObjects) {
      return window.sceneObjects.find(o => (o.userData?.id || o.uuid) === id) || null;
    }
    // Three.js scene traverse
    if (window.scene) {
      let found = null;
      window.scene.traverse(o => { if ((o.userData?.id || o.uuid) === id) found = o; });
      return found;
    }
    return null;
  }

  function getOrCreateTrack(obj) {
    if (!obj) return null;
    const id   = obj.userData?.id   || obj.uuid;
    const name = obj.userData?.name || obj.name || 'Obyekt';
    let track  = tracks.find(t => t.objId === id);
    if (!track) { track = { objId: id, objName: name, keyframes: [] }; tracks.push(track); }
    return track;
  }

  function captureObjState(obj) {
    return {
      pos:   { x: obj.position.x,   y: obj.position.y,   z: obj.position.z   },
      rot:   { x: obj.rotation.x,   y: obj.rotation.y,   z: obj.rotation.z   },
      scale: { x: obj.scale.x,      y: obj.scale.y,      z: obj.scale.z      }
    };
  }

  function applyState(obj, kf) {
    if (!obj || !kf) return;
    if (kf.pos)   obj.position.set(kf.pos.x,   kf.pos.y,   kf.pos.z);
    if (kf.rot)   obj.rotation.set(kf.rot.x,   kf.rot.y,   kf.rot.z);
    if (kf.scale) obj.scale.set(kf.scale.x,    kf.scale.y, kf.scale.z);
    if (kf.vis !== undefined) obj.visible = !!kf.vis;
  }

  function interpolateTrack(track, t) {
    const kfs = track?.keyframes;
    if (!kfs || kfs.length === 0) return;
    const obj = getObjById(track.objId);
    if (!obj) return;

    if (t <= kfs[0].time)              { applyState(obj, kfs[0]); return; }
    if (t >= kfs[kfs.length-1].time)   { applyState(obj, kfs[kfs.length-1]); return; }

    for (let i = 0; i < kfs.length - 1; i++) {
      const a = kfs[i], b = kfs[i+1];
      if (t >= a.time && t <= b.time) {
        const raw   = (t - a.time) / (b.time - a.time);
        const efn   = easings[b.ease || globalEase] || easings.smooth;
        const alpha = efn(Math.max(0, Math.min(1, raw)));
        const out   = {};
        if (a.pos   && b.pos)   out.pos   = lerpV3(a.pos,   b.pos,   alpha);
        if (a.rot   && b.rot)   out.rot   = lerpV3(a.rot,   b.rot,   alpha);
        if (a.scale && b.scale) out.scale = lerpV3(a.scale, b.scale, alpha);
        if (a.vis   !== undefined) out.vis = alpha < 0.5 ? a.vis : b.vis;
        applyState(obj, out);
        return;
      }
    }
  }

  // ── RENDER ─────────────────────────────────────────────────
  function getLaneWidth() {
    const tracksEl = $('tl-tracks');
    return Math.max(100, (tracksEl ? tracksEl.offsetWidth : 300) - 90);
  }

  function updatePlayhead() {
    const ph = $('tl-playhead');
    if (!ph) return;
    ph.style.left = (90 + (currentTime / duration) * getLaneWidth()) + 'px';
  }

  function updateTimeLbl() {
    const lbl = $('tl-time-lbl');
    if (lbl) lbl.textContent = currentTime.toFixed(2) + 's';
  }

  function renderTicks() {
    const row = $('tl-scrubber-row');
    if (!row) return;
    row.querySelectorAll('.tl-tick, .tl-tick-lbl').forEach(e => e.remove());
    const lw   = getLaneWidth();
    const step = duration <= 5 ? 0.5 : duration <= 15 ? 1 : duration <= 30 ? 2 : 5;
    for (let t = 0; t <= duration + 0.001; t += step) {
      const x  = 90 + (t / duration) * lw;
      const tk = $el('div', 'tl-tick', { left: x + 'px' });
      row.appendChild(tk);
      const lb = $el('div', 'tl-tick-lbl', { left: (x + 2) + 'px' });
      lb.textContent = t.toFixed(step < 1 ? 1 : 0) + 's';
      row.appendChild(lb);
    }
  }

  function render() {
    const tracksEl = $('tl-tracks');
    if (!tracksEl) return;
    renderTicks();
    updatePlayhead();
    updateTimeLbl();

    tracksEl.innerHTML = '';
    tracks.forEach((track, ti) => {
      const lw    = getLaneWidth();
      const toPct = time => (time / duration) * 100;

      // Track qatori
      const row = $el('div', 'tl-track');

      // Label
      const lbl = $el('div', 'tl-track-lbl');
      lbl.textContent = track.objName.length > 11 ? track.objName.slice(0,10) + '…' : track.objName;
      row.appendChild(lbl);

      // Lane (keyframlar joylashadigan joy)
      const lane = $el('div', 'tl-track-lane');

      // Lane click → seek
      lane.addEventListener('click', e => {
        const rect = lane.getBoundingClientRect();
        const raw  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        currentTime = raw * duration;
        updatePlayhead();
        updateTimeLbl();
        tracks.forEach(tr => interpolateTrack(tr, currentTime));
      });

      // Segmentlar (keyframlar orasidagi rang)
      track.keyframes.forEach((kf, ki) => {
        if (ki < track.keyframes.length - 1) {
          const nxt = track.keyframes[ki+1];
          const seg = $el('div', `tl-segment ease-${kf.ease || 'smooth'}`);
          seg.style.left  = toPct(kf.time) + '%';
          seg.style.width = (toPct(nxt.time) - toPct(kf.time)) + '%';
          lane.appendChild(seg);
        }
      });

      // Keyframe elementlari
      track.keyframes.forEach((kf, ki) => {
        const isVis = kf.vis !== undefined && kf.pos === undefined;
        const isSnd = kf.sound !== undefined;
        let kfEl;

        if (isSnd) {
          kfEl = $el('div', 'tl-kf-snd');
        } else if (isVis) {
          kfEl = $el('div', `tl-kf-vis ${kf.vis ? 'vis-on' : 'vis-off'}`);
        } else {
          kfEl = $el('div', `tl-kf ease-${kf.ease || 'smooth'}`);
        }

        kfEl.style.left = toPct(kf.time) + '%';

        // Tanlangan KF belgisi
        if (selectedKf && selectedKf.trackIdx === ti && selectedKf.kfIdx === ki) {
          kfEl.classList.add('selected');
        }

        // Click → tanlash + popup
        kfEl.addEventListener('click', e => {
          e.stopPropagation();
          selectedKf = { trackIdx: ti, kfIdx: ki };
          showKfPopup(ti, ki, e);
          render();
        });

        // Drag (keyframni siljitish)
        setupKfDrag(kfEl, ti, ki);
        lane.appendChild(kfEl);
      });

      row.appendChild(lane);
      tracksEl.appendChild(row);
    });
  }

  // ── KEYFRAME POPUP ─────────────────────────────────────────
  function showKfPopup(ti, ki, e) {
    const kf     = tracks[ti]?.keyframes[ki];
    const popup  = $('tl-kf-popup');
    const sndPop = $('tl-snd-popup');
    if (!kf || !popup) return;

    const isSnd = kf.sound !== undefined;
    const isVis = kf.vis !== undefined && kf.pos === undefined;

    if (isSnd && sndPop) {
      sndPop.style.display = 'block';
      sndPop.style.left    = Math.min(e.clientX, window.innerWidth - 200) + 'px';
      sndPop.style.top     = Math.min(e.clientY, window.innerHeight - 130) + 'px';
      popup.style.display  = 'none';
      return;
    }

    popup.style.display = 'block';
    popup.style.left    = Math.min(e.clientX, window.innerWidth  - 165) + 'px';
    popup.style.top     = Math.min(e.clientY, window.innerHeight - 130) + 'px';

    const easeEl = $('kfp-ease');    if (easeEl)   easeEl.value   = kf.ease    || 'smooth';
    const tangEl = $('kfp-tangent'); if (tangEl)   tangEl.value   = kf.tangent || 'auto';
    const visRow = $('kfp-vis-row'); if (visRow)   visRow.style.display = isVis ? 'flex' : 'none';
    const visEl  = $('kfp-vis');
    if (isVis && visEl) visEl.value = kf.vis ? '1' : '0';

    // Popupdan tashqari click → yopish
    setTimeout(() => {
      function close(ev) {
        if (!popup.contains(ev.target)) {
          popup.style.display = 'none';
          document.removeEventListener('click', close);
        }
      }
      document.addEventListener('click', close);
    }, 80);
  }

  // ── KF DRAG (sichqoncha bilan vaqtni o'zgartirish) ─────────
  function setupKfDrag(el, ti, ki) {
    let dragging = false, startX = 0, startTime = 0;

    el.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.stopPropagation();
      dragging  = true;
      startX    = e.clientX;
      startTime = tracks[ti]?.keyframes[ki]?.time ?? 0;
    });

    document.addEventListener('mousemove', e => {
      if (!dragging || !tracks[ti]) return;
      const dx   = e.clientX - startX;
      const dt   = (dx / getLaneWidth()) * duration;
      const newT = Math.max(0, Math.min(duration, startTime + dt));
      tracks[ti].keyframes[ki].time = Math.round(newT * 1000) / 1000;
      tracks[ti].keyframes.sort((a,b) => a.time - b.time);
      render();
    });

    document.addEventListener('mouseup', () => { if (dragging) { dragging = false; } });
  }

  // ── SCRUBBER DRAG ──────────────────────────────────────────
  function initScrubber() {
    const row = $('tl-scrubber-row');
    if (!row) return;
    let drag = false;

    function seek(e) {
      const rect = row.getBoundingClientRect();
      const rawX = e.clientX - rect.left - 90; // 90px = label kengligi
      currentTime = Math.max(0, Math.min(duration, (rawX / getLaneWidth()) * duration));
      updatePlayhead();
      updateTimeLbl();
      tracks.forEach(tr => interpolateTrack(tr, currentTime));
    }

    row.addEventListener('mousedown', e => { drag = true; seek(e); });
    document.addEventListener('mousemove', e => { if (drag) seek(e); });
    document.addEventListener('mouseup',   () => { drag = false; });
  }

  // ── PLAYBACK ───────────────────────────────────────────────
  function play() {
    if (isPlaying) return;
    isPlaying = true;
    lastTS    = null;
    const btn = $('tl-play-btn');
    if (btn) { btn.textContent = '⏸'; btn.classList.add('active'); }

    function step(ts) {
      if (!isPlaying) return;
      if (lastTS !== null) {
        const dt = (ts - lastTS) / 1000;
        currentTime = currentTime + dt;
        if (currentTime >= duration) currentTime = 0; // loop
      }
      lastTS = ts;
      updatePlayhead();
      updateTimeLbl();
      tracks.forEach(tr => interpolateTrack(tr, currentTime));
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  function stop() {
    isPlaying = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    lastTS = null;
    const btn = $('tl-play-btn');
    if (btn) { btn.textContent = '▶'; btn.classList.remove('active'); }
  }

  // ── CSS HEIGHT PATCHI (asosiy bug tuzatish) ────────────────
  // #timeline-panel height:160px edi → 132px bo'lishi kerak
  // (console-wrap 160px, panel-tabs 28px → content 132px)
  function patchCSS() {
    const styleEl = document.createElement('style');
    styleEl.id = 'tl-css-patch';
    styleEl.textContent = `
      #timeline-panel {
        height: calc(100% - 28px) !important;
        display: none;
        flex-direction: column;
        overflow: hidden;
      }
      #timeline-panel.tl-active {
        display: flex !important;
      }
    `;
    document.head.appendChild(styleEl);
  }

  // ── switchBottomTab TO'G'RILASH ─────────────────────────────
  // Asl funksiya timeline uchun display:flex ishlatmaydi
  function patchSwitchBottomTab() {
    window.switchBottomTab = function(tab, tabEl) {
      // Barcha panel elementlarini yashirish
      const panels = ['console-body', 'timeline-panel', 'physics-panel'];
      panels.forEach(id => {
        const el = $(id);
        if (el) {
          el.style.display = 'none';
          el.classList.remove('tl-active');
        }
      });
      // Script wrap (agar mavjud bo'lsa)
      const sw = $('script-wrap') || $('script-panel');
      if (sw) sw.style.display = 'none';

      // Tanlangan panelni ko'rsatish
      if (tab === 'timeline') {
        const tp = $('timeline-panel');
        if (tp) {
          // MUHIM: flex, block emas!
          tp.style.display = 'flex';
          tp.classList.add('tl-active');
          render(); // Timeline ochilganda qayta chizish
        }
      } else if (tab === 'console') {
        const cb = $('console-body');
        if (cb) cb.style.display = 'block';
      } else if (tab === 'physics') {
        const pp = $('physics-panel');
        if (pp) pp.style.display = 'block';
      } else if (tab === 'script') {
        const sp = $('script-wrap') || $('script-panel');
        if (sp) sp.style.display = 'flex';
      }

      // Tab tugmalarini yangilash
      document.querySelectorAll('#console-wrap .ptab, #console-wrap .panel-tabs .ptab')
        .forEach(t => t.classList.remove('active'));
      if (tabEl) tabEl.classList.add('active');
    };
  }

  // ── UMUMIY API FUNKSIYALAR (window.tl* ) ───────────────────

  function tlPlay() {
    isPlaying ? stop() : play();
  }

  function tlStop() {
    stop();
    currentTime = 0;
    tracks.forEach(tr => { if (tr.keyframes.length) interpolateTrack(tr, 0); });
    render();
    updateTimeLbl();
  }

  function tlAddKeyframe() {
    const obj = getSelectedObj();
    if (!obj) { clog('⚠ Avval obiekt tanlang (hierarchy\'dan)!', 'w'); return; }
    const track = getOrCreateTrack(obj);
    if (!track) return;
    const state = {
      time: Math.round(currentTime * 1000) / 1000,
      ease: globalEase,
      tangent: 'auto',
      ...captureObjState(obj)
    };
    // Bir xil vaqtda mavjud bo'lsa — yangilash
    const ex = track.keyframes.findIndex(k => Math.abs(k.time - state.time) < 0.005);
    if (ex >= 0) track.keyframes[ex] = state;
    else { track.keyframes.push(state); track.keyframes.sort((a,b) => a.time - b.time); }
    render();
    clog(`◆ KF qo'shildi: "${track.objName}" @ ${state.time.toFixed(2)}s`, 'ok');
  }

  function tlAddVisKeyframe() {
    const obj = getSelectedObj();
    if (!obj) { clog('⚠ Avval obiekt tanlang!', 'w'); return; }
    const track = getOrCreateTrack(obj);
    const state = {
      time: Math.round(currentTime * 1000) / 1000,
      vis: obj.visible ? 1 : 0,
      ease: globalEase
    };
    const ex = track.keyframes.findIndex(k =>
      Math.abs(k.time - state.time) < 0.005 && k.vis !== undefined && !k.pos);
    if (ex >= 0) track.keyframes[ex] = state;
    else { track.keyframes.push(state); track.keyframes.sort((a,b) => a.time - b.time); }
    render();
    clog(`👁 VIS KF: "${track.objName}" @ ${state.time.toFixed(2)}s — ${obj.visible ? 'ko\'rinadi' : 'yashirin'}`, 'ok');
  }

  function tlAddSoundKeyframe() {
    if (tracks.length === 0) { clog('⚠ Avval oddiy KF qo\'shing!', 'w'); return; }
    const sp = $('tl-snd-popup');
    if (sp) {
      sp.style.display = 'block';
      sp.style.left    = '220px';
      sp.style.top     = '100px';
    }
  }

  function tlDeleteKeyframe() {
    if (!selectedKf) { clog('⚠ KF tanlanmagan! Biror keyframeni bosing.', 'w'); return; }
    const { trackIdx: ti, kfIdx: ki } = selectedKf;
    const track = tracks[ti];
    if (!track) return;
    track.keyframes.splice(ki, 1);
    if (track.keyframes.length === 0) tracks.splice(ti, 1);
    selectedKf = null;
    render();
    clog('✕ Keyframe o\'chirildi', 'ok');
  }

  function tlDuplicateKeyframe() {
    if (!selectedKf) { clog('⚠ KF tanlanmagan!', 'w'); return; }
    const { trackIdx: ti, kfIdx: ki } = selectedKf;
    const track = tracks[ti];
    if (!track) return;
    const newKf = { ...track.keyframes[ki], time: Math.min(duration, track.keyframes[ki].time + 0.25) };
    track.keyframes.push(newKf);
    track.keyframes.sort((a,b) => a.time - b.time);
    selectedKf = { trackIdx: ti, kfIdx: track.keyframes.indexOf(newKf) };
    render();
    clog('⧉ Keyframe nusxalandi', 'ok');
  }

  function tlDuplicateTrack() {
    if (selectedKf === null) { clog('⚠ Track KF\'sini tanlang, keyin boshqa obyekt tanlang!', 'w'); return; }
    const obj = getSelectedObj();
    if (!obj) { clog('⚠ Nusxa olish uchun hierarchy\'dan obyekt tanlang!', 'w'); return; }
    const src = tracks[selectedKf.trackIdx];
    if (!src) return;
    const newTrack = {
      objId:     obj.userData?.id   || obj.uuid,
      objName:   obj.userData?.name || obj.name || 'Obiekt',
      keyframes: src.keyframes.map(k => ({ ...k }))
    };
    // Agar shu obyekt uchun track allaqachon bor bo'lsa, yangilash
    const ex = tracks.findIndex(t => t.objId === newTrack.objId);
    if (ex >= 0) tracks[ex] = newTrack; else tracks.push(newTrack);
    render();
    clog(`⧉ Track nusxalandi → "${newTrack.objName}"`, 'ok');
  }

  function tlToggleCutMode() {
    cutMode = !cutMode;
    const btn = $('tl-cut-btn');
    if (btn) btn.classList.toggle('active', cutMode);
    const cr = $('tl-cut-range');
    if (!cutMode) { cutAnchor = null; if (cr) cr.style.display = 'none'; }
    clog(cutMode ? '✂ Kesish rejimi YOQILDI — scrubberda diapazon belgilang' : '✂ Kesish rejimi o\'chirildi', 'ok');
  }

  function tlSetGlobalEase(val) {
    globalEase = val;
  }

  function tlSetDuration(sec) {
    const v = parseFloat(sec);
    if (isNaN(v) || v <= 0) return;
    duration = v;
    const inp = $('tl-dur-inp');
    if (inp) inp.value = duration;
    if (currentTime > duration) currentTime = duration;
    render();
  }

  function tlSetKfEase(val) {
    if (!selectedKf) return;
    const kf = tracks[selectedKf.trackIdx]?.keyframes[selectedKf.kfIdx];
    if (kf) { kf.ease = val; render(); }
  }

  function tlSetKfTangent(val) {
    if (!selectedKf) return;
    const kf = tracks[selectedKf.trackIdx]?.keyframes[selectedKf.kfIdx];
    if (kf) { kf.tangent = val; render(); }
  }

  function tlSetKfVis(val) {
    if (!selectedKf) return;
    const kf = tracks[selectedKf.trackIdx]?.keyframes[selectedKf.kfIdx];
    if (kf) { kf.vis = parseInt(val, 10); render(); }
  }

  function tlExportJSON() {
    if (tracks.length === 0) { clog('⚠ Timeline bo\'sh, eksport qilib bo\'lmaydi!', 'w'); return; }
    const blob = new Blob(
      [JSON.stringify({ version: 1, duration, tracks }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = 'apex3d_timeline.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    clog('⬇ Timeline JSON yuklandi', 'ok');
  }

  function tlImportJSON(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (typeof data.duration === 'number') duration = data.duration;
        if (Array.isArray(data.tracks))        tracks   = data.tracks;
        const inp = $('tl-dur-inp');
        if (inp) inp.value = duration;
        selectedKf = null;
        render();
        clog(`⬆ Timeline import qilindi (${tracks.length} track, ${duration}s)`, 'ok');
      } catch(err) {
        clog('✕ Import xatosi: ' + err.message, 'e');
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  }

  // ── INIT ───────────────────────────────────────────────────
  function init() {
    patchCSS();
    patchSwitchBottomTab();
    initScrubber();

    // Window'ga barcha funksiyalarni eksport qilish
    Object.assign(window, {
      tlPlay, tlStop,
      tlAddKeyframe, tlAddVisKeyframe, tlAddSoundKeyframe,
      tlDeleteKeyframe, tlDuplicateKeyframe, tlDuplicateTrack,
      tlToggleCutMode, tlSetGlobalEase, tlSetDuration,
      tlSetKfEase, tlSetKfTangent, tlSetKfVis,
      tlExportJSON, tlImportJSON
    });

    // Boshlang'ich render
    render();
    clog('⏱ Timeline tizimi ishga tushdi ✓', 'ok');
  }

  // DOM tayyor bo'lgandan keyin ishga tushirish
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM allaqachon tayyor (script defer/async holatida)
    setTimeout(init, 0);
  }

  // Tashqi API (window.TimelineSystem.xxx orqali kirish mumkin)
  return {
    get tracks()      { return tracks;      },
    get currentTime() { return currentTime; },
    get duration()    { return duration;    },
    get isPlaying()   { return isPlaying;   },
    render,
    interpolateAll: () => tracks.forEach(tr => interpolateTrack(tr, currentTime))
  };

})();
