// ============================================================
// APEX3D — Timeline System  v2  (keyframe fix + I key)
// Tuzatilgan:
//   1. getSelectedObj() — barcha mumkin nomlar tekshiriladi
//   2. Hierarchy DOM dan fallback (data-id orqali)
//   3. "I" klavishi → keyframe qo'shish
//   4. #timeline-panel height bug tuzatildi
//   5. switchBottomTab display:flex tuzatildi
// ============================================================

const TimelineSystem = (() => {
  'use strict';

  // ── STATE ──────────────────────────────────────────────────
  let tracks      = [];
  let duration    = 5;
  let currentTime = 0;
  let isPlaying   = false;
  let rafId       = null;
  let lastTS      = null;
  let selectedKf  = null; // {trackIdx, kfIdx}
  let globalEase  = 'smooth';
  let cutMode     = false;

  // ── DOM HELPER ─────────────────────────────────────────────
  const $   = (id) => document.getElementById(id);
  const $el = (tag, cls, style) => {
    const e = document.createElement(tag);
    if (cls)   e.className = cls;
    if (style) Object.assign(e.style, style);
    return e;
  };

  // ── CONSOLE LOG ────────────────────────────────────────────
  function clog(msg, type = '') {
    const body = $('console-body');
    if (!body) { console.log('[TL]', msg); return; }
    const row = $el('div', type==='w'?'lw':type==='e'?'le':type==='ok'?'lok':'lg');
    const ts  = $el('span', 'lt');
    ts.textContent = new Date().toLocaleTimeString('uz');
    row.appendChild(ts);
    row.appendChild(document.createTextNode(msg));
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }

  // ── EASING ─────────────────────────────────────────────────
  const easings = {
    linear:  t => t,
    smooth:  t => t < .5 ? 2*t*t : -1+(4-2*t)*t,
    bounce:  t => {
      if (t < 1/2.75)  return 7.5625*t*t;
      if (t < 2/2.75)  { t-=1.5/2.75;   return 7.5625*t*t+.75; }
      if (t < 2.5/2.75){ t-=2.25/2.75;  return 7.5625*t*t+.9375; }
      t-=2.625/2.75;   return 7.5625*t*t+.984375;
    },
    elastic: t => t===0||t===1 ? t : Math.pow(2,-10*t)*Math.sin((t*10-.75)*2*Math.PI/3)+1,
    back:    t => { const c=1.70158+1; return 1+c*Math.pow(t-1,3)+(c-1)*Math.pow(t-1,2); }
  };

  const lerpV3 = (a,b,t) => ({
    x: a.x+(b.x-a.x)*t, y: a.y+(b.y-a.y)*t, z: a.z+(b.z-a.z)*t
  });

  // ── TANLANGAN OBYEKTNI TOPISH ──────────────────────────────
  // Bu funksiya APEX3D engine'ning qaysi o'zgaruvchidan foydalanishini
  // avtomatik aniqlaydi.
  function getSelectedObj() {

    // 1. Keng tarqalgan nomlar ro'yxati
    const directCandidates = [
      window.sel,
      window.selectedObject,
      window.selectedObj,
      window.selObj,
      window._sel,
      window.curObj,
      window.activeObj,
      window.currentObject,
      window.pickedObject,
      window.APEX && window.APEX.sel,
      window.APEX && window.APEX.selected,
      window.Editor && window.Editor.sel,
      window.Editor && window.Editor.selected,
      window.EditorState && window.EditorState.selected,
      window.EditorCore && window.EditorCore.selected,
      window.HierarchyManager && window.HierarchyManager.selected,
      window.inspector && window.inspector.target,
    ];

    for (const c of directCandidates) {
      if (c && (c.isObject3D || (c.position && c.rotation))) return c;
    }

    // 2. Hierarchy DOM fallback — .h-item.sel elementidan ID olish
    const hierSel = document.querySelector('.h-item.sel, .h-item.selected');
    if (hierSel) {
      // data-id, data-uuid, id atributini sinab ko'ramiz
      const id =
        hierSel.dataset?.id   ||
        hierSel.dataset?.uuid ||
        hierSel.dataset?.objId ||
        hierSel.getAttribute('data-id') ||
        hierSel.getAttribute('data-uuid') ||
        hierSel.getAttribute('data-obj-id');

      if (id) {
        const found = getObjById(id);
        if (found) return found;
      }

      // 3. Hierarchy item nomidan scene'da qidirish
      const nameEl = hierSel.querySelector('.h-name');
      const name   = nameEl ? nameEl.textContent.trim() : null;
      if (name && window.scene) {
        let found = null;
        window.scene.traverse(o => {
          if (!found && (o.name === name || o.userData?.name === name)) found = o;
        });
        if (found) return found;
      }
    }

    // 4. Debug: window'da qanday three.js ob'ektlar bor ekanini ko'rish
    // (birinchi marta chaqirilganda faqat)
    if (!getSelectedObj._debugged) {
      getSelectedObj._debugged = true;
      const foundVars = [];
      for (const k in window) {
        try {
          const v = window[k];
          if (v && (v.isObject3D || (v.position?.isVector3 && v.rotation?.isEuler))) {
            foundVars.push(k);
          }
        } catch(e) {}
      }
      if (foundVars.length > 0) {
        clog(`⚠ Keyframe: tanlangan ob'ekt topilmadi. Bu nomlardagi ob'ektlar mavjud: ${foundVars.slice(0,5).join(', ')}`, 'w');
      } else {
        clog('⚠ Keyframe: hierarchy\'dan ob\'ekt tanlang!', 'w');
      }
    }

    return null;
  }

  function getObjById(id) {
    if (!id) return null;
    if (window.sceneObjects) {
      const found = window.sceneObjects.find(o =>
        (o.userData?.id || o.userData?.uuid || o.uuid) === id
      );
      if (found) return found;
    }
    if (window.scene) {
      let found = null;
      window.scene.traverse(o => {
        if (!found && (o.userData?.id===id || o.userData?.uuid===id || o.uuid===id)) found=o;
      });
      return found;
    }
    return null;
  }

  function getOrCreateTrack(obj) {
    const id   = obj.userData?.id || obj.userData?.uuid || obj.uuid;
    const name = obj.userData?.name || obj.name || 'Obyekt';
    let track  = tracks.find(t => t.objId === id);
    if (!track) { track = { objId: id, objName: name, keyframes: [] }; tracks.push(track); }
    return track;
  }

  function captureState(obj) {
    return {
      pos:   { x: obj.position.x,   y: obj.position.y,   z: obj.position.z   },
      rot:   { x: obj.rotation.x,   y: obj.rotation.y,   z: obj.rotation.z   },
      scale: { x: obj.scale.x,      y: obj.scale.y,      z: obj.scale.z      }
    };
  }

  function applyState(obj, kf) {
    if (!obj || !kf) return;
    if (kf.pos)              obj.position.set(kf.pos.x,   kf.pos.y,   kf.pos.z);
    if (kf.rot)              obj.rotation.set(kf.rot.x,   kf.rot.y,   kf.rot.z);
    if (kf.scale)            obj.scale.set(kf.scale.x,    kf.scale.y, kf.scale.z);
    if (kf.vis !== undefined) obj.visible = !!kf.vis;
  }

  function interpolateTrack(track, t) {
    const kfs = track?.keyframes;
    if (!kfs?.length) return;
    const obj = getObjById(track.objId);
    if (!obj) return;

    if (t <= kfs[0].time)            { applyState(obj, kfs[0]); return; }
    if (t >= kfs[kfs.length-1].time) { applyState(obj, kfs[kfs.length-1]); return; }

    for (let i = 0; i < kfs.length-1; i++) {
      const a = kfs[i], b = kfs[i+1];
      if (t >= a.time && t <= b.time) {
        const raw   = (t - a.time) / (b.time - a.time);
        const alpha = (easings[b.ease||globalEase]||easings.smooth)(Math.max(0,Math.min(1,raw)));
        const out   = {};
        if (a.pos   && b.pos)   out.pos   = lerpV3(a.pos,   b.pos,   alpha);
        if (a.rot   && b.rot)   out.rot   = lerpV3(a.rot,   b.rot,   alpha);
        if (a.scale && b.scale) out.scale = lerpV3(a.scale, b.scale, alpha);
        if (a.vis !== undefined) out.vis  = alpha < 0.5 ? a.vis : b.vis;
        applyState(obj, out);
        return;
      }
    }
  }

  // ── RENDER ─────────────────────────────────────────────────
  function laneW() {
    const el = $('tl-tracks');
    return Math.max(80, (el ? el.offsetWidth : 300) - 90);
  }

  function updatePlayhead() {
    const ph = $('tl-playhead');
    if (ph) ph.style.left = (90 + (currentTime/duration)*laneW()) + 'px';
  }

  function updateTimeLbl() {
    const l = $('tl-time-lbl');
    if (l) l.textContent = currentTime.toFixed(2)+'s';
  }

  function render() {
    const tracksEl = $('tl-tracks');
    if (!tracksEl) return;

    // Ticks
    const row = $('tl-scrubber-row');
    if (row) {
      row.querySelectorAll('.tl-tick,.tl-tick-lbl').forEach(e=>e.remove());
      const lw   = laneW();
      const step = duration<=5 ? 0.5 : duration<=15 ? 1 : duration<=30 ? 2 : 5;
      for (let t=0; t<=duration+.001; t+=step) {
        const x  = 90+(t/duration)*lw;
        const tk = $el('div','tl-tick',{left:x+'px'});
        row.appendChild(tk);
        const lb = $el('div','tl-tick-lbl',{left:(x+2)+'px'});
        lb.textContent = t.toFixed(step<1?1:0)+'s';
        row.appendChild(lb);
      }
    }

    updatePlayhead();
    updateTimeLbl();

    tracksEl.innerHTML = '';
    tracks.forEach((track, ti) => {
      const pct  = t => (t/duration)*100+'%';
      const trow = $el('div','tl-track');

      // Label
      const lbl = $el('div','tl-track-lbl');
      lbl.textContent = track.objName.length>11 ? track.objName.slice(0,10)+'…' : track.objName;
      lbl.title = track.objName;
      trow.appendChild(lbl);

      // Lane
      const lane = $el('div','tl-track-lane');
      lane.addEventListener('click', e => {
        const r   = lane.getBoundingClientRect();
        const raw = Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
        currentTime = raw*duration;
        updatePlayhead(); updateTimeLbl();
        tracks.forEach(tr=>interpolateTrack(tr,currentTime));
      });

      // Segmentlar
      track.keyframes.forEach((kf,ki) => {
        if (ki < track.keyframes.length-1) {
          const nxt = track.keyframes[ki+1];
          const seg = $el('div',`tl-segment ease-${kf.ease||'smooth'}`);
          seg.style.left  = pct(kf.time);
          seg.style.width = (((nxt.time-kf.time)/duration)*100)+'%';
          lane.appendChild(seg);
        }
      });

      // Keyframe diamond/circle elementlari
      track.keyframes.forEach((kf,ki) => {
        const isSnd = kf.sound !== undefined;
        const isVis = kf.vis   !== undefined && kf.pos === undefined;
        const kfEl  = $el('div',
          isSnd ? 'tl-kf-snd' :
          isVis ? `tl-kf-vis ${kf.vis?'vis-on':'vis-off'}` :
                  `tl-kf ease-${kf.ease||'smooth'}`
        );
        kfEl.style.left = pct(kf.time);
        if (selectedKf?.trackIdx===ti && selectedKf?.kfIdx===ki) kfEl.classList.add('selected');

        kfEl.addEventListener('click', e => {
          e.stopPropagation();
          selectedKf = {trackIdx:ti, kfIdx:ki};
          showKfPopup(ti,ki,e);
          render();
        });
        setupKfDrag(kfEl,ti,ki);
        lane.appendChild(kfEl);
      });

      trow.appendChild(lane);
      tracksEl.appendChild(trow);
    });
  }

  // ── KF POPUP ───────────────────────────────────────────────
  function showKfPopup(ti,ki,e) {
    const kf     = tracks[ti]?.keyframes[ki];
    const popup  = $('tl-kf-popup');
    if (!kf || !popup) return;
    const isVis  = kf.vis !== undefined && kf.pos === undefined;
    const isSnd  = kf.sound !== undefined;

    if (isSnd) {
      const sp = $('tl-snd-popup');
      if (sp) { sp.style.display='block'; sp.style.left=e.clientX+'px'; sp.style.top=e.clientY+'px'; }
      popup.style.display='none'; return;
    }

    popup.style.display='block';
    popup.style.left = Math.min(e.clientX, window.innerWidth -170)+'px';
    popup.style.top  = Math.min(e.clientY, window.innerHeight-130)+'px';

    const easeEl=$('kfp-ease');    if(easeEl) easeEl.value = kf.ease    ||'smooth';
    const tangEl=$('kfp-tangent'); if(tangEl) tangEl.value = kf.tangent ||'auto';
    const visRow=$('kfp-vis-row'); if(visRow) visRow.style.display = isVis?'flex':'none';
    const visEl =$('kfp-vis');     if(isVis&&visEl) visEl.value = kf.vis?'1':'0';

    setTimeout(()=>{
      function close(ev){ if(!popup.contains(ev.target)){ popup.style.display='none'; document.removeEventListener('click',close); } }
      document.addEventListener('click', close);
    }, 80);
  }

  // ── KF DRAG ────────────────────────────────────────────────
  function setupKfDrag(el,ti,ki) {
    let drag=false, sx=0, st=0;
    el.addEventListener('mousedown', e => {
      if(e.button!==0) return;
      e.stopPropagation();
      drag=true; sx=e.clientX; st=tracks[ti]?.keyframes[ki]?.time??0;
    });
    document.addEventListener('mousemove', e => {
      if(!drag||!tracks[ti]) return;
      const dt   = ((e.clientX-sx)/laneW())*duration;
      const newT = Math.max(0,Math.min(duration, st+dt));
      tracks[ti].keyframes[ki].time = Math.round(newT*1000)/1000;
      tracks[ti].keyframes.sort((a,b)=>a.time-b.time);
      render();
    });
    document.addEventListener('mouseup', ()=>{ drag=false; });
  }

  // ── SCRUBBER DRAG ──────────────────────────────────────────
  function initScrubber() {
    const row = $('tl-scrubber-row');
    if (!row) return;
    let drag = false;
    function seek(e) {
      const rect = row.getBoundingClientRect();
      currentTime = Math.max(0, Math.min(duration, ((e.clientX-rect.left-90)/laneW())*duration));
      updatePlayhead(); updateTimeLbl();
      tracks.forEach(tr=>interpolateTrack(tr,currentTime));
    }
    row.addEventListener('mousedown',  e=>{ drag=true; seek(e); });
    document.addEventListener('mousemove', e=>{ if(drag) seek(e); });
    document.addEventListener('mouseup',   ()=>{ drag=false; });
  }

  // ── KEYBOARD SHORTCUT — "I" TUGMASI ────────────────────────
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      // Input/textarea ichida ishlamamasin
      const tag = e.target.tagName;
      if (tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||e.target.isContentEditable) return;

      // I → Keyframe qo'shish
      if (e.code === 'KeyI' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        tlAddKeyframe();
        return;
      }

      // Shift+I → Visibility keyframe
      if (e.code === 'KeyI' && e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        tlAddVisKeyframe();
        return;
      }

      // Delete → tanlangan KF o'chirish (timeline ochiq bo'lsa)
      if ((e.code==='Delete'||e.code==='Backspace') && selectedKf !== null) {
        const tlPanel = $('timeline-panel');
        if (tlPanel && tlPanel.style.display !== 'none') {
          e.preventDefault();
          tlDeleteKeyframe();
        }
      }
    });
  }

  // ── PLAYBACK ───────────────────────────────────────────────
  function play() {
    if (isPlaying) return;
    isPlaying = true; lastTS = null;
    const btn = $('tl-play-btn');
    if (btn) { btn.textContent='⏸'; btn.classList.add('active'); }
    function step(ts) {
      if (!isPlaying) return;
      if (lastTS !== null) {
        currentTime += (ts-lastTS)/1000;
        if (currentTime >= duration) currentTime = 0;
      }
      lastTS = ts;
      updatePlayhead(); updateTimeLbl();
      tracks.forEach(tr=>interpolateTrack(tr,currentTime));
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  function stop() {
    isPlaying = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId=null; }
    lastTS = null;
    const btn = $('tl-play-btn');
    if (btn) { btn.textContent='▶'; btn.classList.remove('active'); }
  }

  // ── CSS HEIGHT PATCHI ──────────────────────────────────────
  // Bug: #timeline-panel height:160px edi, 132px bo'lishi kerak
  function patchCSS() {
    if ($('tl-css-patch')) return;
    const s = document.createElement('style');
    s.id = 'tl-css-patch';
    s.textContent = `
      #timeline-panel {
        height: calc(100% - 28px) !important;
        display: none !important;
        flex-direction: column;
        overflow: hidden;
      }
      #timeline-panel.tl-visible {
        display: flex !important;
      }
    `;
    document.head.appendChild(s);
  }

  // ── switchBottomTab TO'G'RILASH ─────────────────────────────
  function patchSwitchBottomTab() {
    window.switchBottomTab = function(tab, tabEl) {
      // Barcha contentlarni yashirish
      ['console-body','timeline-panel','physics-panel'].forEach(id => {
        const el = $(id);
        if (!el) return;
        el.style.display = 'none';
        el.classList.remove('tl-visible');
      });
      const sw = $('script-wrap') || $('script-panel');
      if (sw) sw.style.display = 'none';

      // Kerakli panelni ochish
      if (tab === 'timeline') {
        const tp = $('timeline-panel');
        if (tp) {
          tp.style.display = 'flex';     // MUHIM: flex, block emas!
          tp.classList.add('tl-visible');
          render();
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

      // Tab buttonlarini yangilash
      document.querySelectorAll('#console-wrap .ptab').forEach(t => t.classList.remove('active'));
      if (tabEl) tabEl.classList.add('active');
    };
  }

  // ── PUBLIC API ─────────────────────────────────────────────

  function tlPlay() { isPlaying ? stop() : play(); }

  function tlStop() {
    stop();
    currentTime = 0;
    tracks.forEach(tr => { if(tr.keyframes.length) interpolateTrack(tr,0); });
    render(); updateTimeLbl();
  }

  function tlAddKeyframe() {
    // debug flagni tozalash (har safar yangi urinish bo'lganda xabar ko'rsatsin)
    getSelectedObj._debugged = false;

    const obj = getSelectedObj();
    if (!obj) return; // xabar allaqachon clog ichida chiqadi

    const track = getOrCreateTrack(obj);
    const state = {
      time: Math.round(currentTime*1000)/1000,
      ease: globalEase, tangent:'auto',
      ...captureState(obj)
    };
    const ex = track.keyframes.findIndex(k => Math.abs(k.time-state.time) < 0.005);
    if (ex >= 0) { track.keyframes[ex] = state; }
    else { track.keyframes.push(state); track.keyframes.sort((a,b)=>a.time-b.time); }

    render();
    clog(`◆ KF qo'shildi: "${track.objName}"  t=${state.time.toFixed(2)}s  [I tugmasi ham ishlaydi]`, 'ok');
  }

  function tlAddVisKeyframe() {
    const obj = getSelectedObj();
    if (!obj) return;
    const track = getOrCreateTrack(obj);
    const state = { time: Math.round(currentTime*1000)/1000, vis: obj.visible?1:0, ease: globalEase };
    const ex = track.keyframes.findIndex(k => Math.abs(k.time-state.time)<0.005 && k.vis!==undefined && !k.pos);
    if (ex>=0) track.keyframes[ex]=state;
    else { track.keyframes.push(state); track.keyframes.sort((a,b)=>a.time-b.time); }
    render();
    clog(`👁 VIS KF: "${track.objName}"  t=${state.time.toFixed(2)}s  [${obj.visible?'ko\'rinadi':'yashirin'}]`, 'ok');
  }

  function tlAddSoundKeyframe() {
    if (!tracks.length) { clog('⚠ Avval oddiy KF qo\'shing!','w'); return; }
    const sp = $('tl-snd-popup');
    if (sp) { sp.style.display='block'; sp.style.left='220px'; sp.style.top='100px'; }
  }

  function tlDeleteKeyframe() {
    if (!selectedKf) { clog('⚠ Biror keyframeni bosib tanlang!','w'); return; }
    const { trackIdx:ti, kfIdx:ki } = selectedKf;
    const track = tracks[ti];
    if (!track) return;
    track.keyframes.splice(ki,1);
    if (!track.keyframes.length) tracks.splice(ti,1);
    selectedKf = null;
    render();
    clog('✕ Keyframe o\'chirildi','ok');
  }

  function tlDuplicateKeyframe() {
    if (!selectedKf) { clog('⚠ KF tanlanmagan!','w'); return; }
    const {trackIdx:ti, kfIdx:ki} = selectedKf;
    const track = tracks[ti];
    if (!track) return;
    const newKf = {...track.keyframes[ki], time: Math.min(duration, track.keyframes[ki].time+0.25)};
    track.keyframes.push(newKf);
    track.keyframes.sort((a,b)=>a.time-b.time);
    selectedKf = {trackIdx:ti, kfIdx:track.keyframes.indexOf(newKf)};
    render();
    clog('⧉ Keyframe nusxalandi','ok');
  }

  function tlDuplicateTrack() {
    if (selectedKf===null) { clog('⚠ Track KF\'ini tanlang!','w'); return; }
    const obj = getSelectedObj();
    if (!obj) return;
    const src = tracks[selectedKf.trackIdx];
    if (!src) return;
    const newTrack = {
      objId:     obj.userData?.id || obj.uuid,
      objName:   obj.userData?.name || obj.name || 'Obyekt',
      keyframes: src.keyframes.map(k=>({...k}))
    };
    const ex = tracks.findIndex(t=>t.objId===newTrack.objId);
    if (ex>=0) tracks[ex]=newTrack; else tracks.push(newTrack);
    render();
    clog(`⧉ Track nusxalandi → "${newTrack.objName}"`, 'ok');
  }

  function tlToggleCutMode() {
    cutMode = !cutMode;
    const btn = $('tl-cut-btn');
    if (btn) btn.classList.toggle('active', cutMode);
    if (!cutMode) { const cr=$('tl-cut-range'); if(cr) cr.style.display='none'; }
    clog(cutMode ? '✂ Kesish rejimi YOQILDI' : '✂ Kesish rejimi o\'chirildi', 'ok');
  }

  function tlSetGlobalEase(val) { globalEase = val; }

  function tlSetDuration(sec) {
    const v = parseFloat(sec);
    if (isNaN(v)||v<=0) return;
    duration = v;
    const inp = $('tl-dur-inp');
    if (inp) inp.value = duration;
    if (currentTime > duration) currentTime = duration;
    render();
  }

  function tlSetKfEase(val) {
    if (!selectedKf) return;
    const kf = tracks[selectedKf.trackIdx]?.keyframes[selectedKf.kfIdx];
    if (kf) { kf.ease=val; render(); }
  }

  function tlSetKfTangent(val) {
    if (!selectedKf) return;
    const kf = tracks[selectedKf.trackIdx]?.keyframes[selectedKf.kfIdx];
    if (kf) { kf.tangent=val; render(); }
  }

  function tlSetKfVis(val) {
    if (!selectedKf) return;
    const kf = tracks[selectedKf.trackIdx]?.keyframes[selectedKf.kfIdx];
    if (kf) { kf.vis=parseInt(val,10); render(); }
  }

  function tlExportJSON() {
    if (!tracks.length) { clog('⚠ Timeline bo\'sh!','w'); return; }
    const blob = new Blob([JSON.stringify({version:1,duration,tracks},null,2)],{type:'application/json'});
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'),{href:url,download:'apex3d_timeline.json'});
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    clog('⬇ Timeline JSON yuklandi','ok');
  }

  function tlImportJSON(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (typeof data.duration==='number') duration = data.duration;
        if (Array.isArray(data.tracks))      tracks   = data.tracks;
        const inp = $('tl-dur-inp');
        if (inp) inp.value = duration;
        selectedKf = null;
        render();
        clog(`⬆ Import: ${tracks.length} track, ${duration}s`, 'ok');
      } catch(err) { clog('✕ Import xatosi: '+err.message,'e'); }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  }

  // ── INIT ───────────────────────────────────────────────────
  function init() {
    patchCSS();
    patchSwitchBottomTab();
    initScrubber();
    initKeyboardShortcuts();

    Object.assign(window, {
      tlPlay, tlStop,
      tlAddKeyframe, tlAddVisKeyframe, tlAddSoundKeyframe,
      tlDeleteKeyframe, tlDuplicateKeyframe, tlDuplicateTrack,
      tlToggleCutMode, tlSetGlobalEase, tlSetDuration,
      tlSetKfEase, tlSetKfTangent, tlSetKfVis,
      tlExportJSON, tlImportJSON
    });

    render();
    clog('⏱ Timeline v2 ishga tushdi  |  I = KF qo\'shish  |  Shift+I = VIS KF  |  Del = KF o\'chirish', 'ok');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

  return {
    get tracks()      { return tracks;      },
    get currentTime() { return currentTime; },
    get duration()    { return duration;    },
    get isPlaying()   { return isPlaying;   },
    render,
    getSelectedObj,
    setVar(name, obj) {
      // Manual integration: TimelineSystem.setVar('sel', window.sel)
      window[name] = obj;
    }
  };
})();
