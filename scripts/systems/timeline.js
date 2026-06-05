// ============================================================
// APEX3D — Timeline System  v2.1  (object reference fix)
// Tuzatilgan:
//   1. Track'da objRef — to'g'ridan object referensini saqlash
//   2. getOrCreateTrack — id undefined bo'lsa ham ishlaydi
//   3. interpolateTrack — objRef ustunlik qiladi, id fallback
//   4. captureState — position/rotation clone qilinadi (reference bug yo'q)
//   5. applyState — matrixWorldNeedsUpdate majburiy yangilanadi
//   6. Qolgan barcha funksiyalar o'zgarmadi
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
  let selectedKf  = null;
  let globalEase  = 'smooth';
  let cutMode     = false;
  let loopMode    = false;

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
  function getSelectedObj() {
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

    const hierSel = document.querySelector('.h-item.sel, .h-item.selected');
    if (hierSel) {
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

  // ── FIX 1: Track'da objRef saqlash ─────────────────────────
  // Eski kod faqat objId (string) saqlar edi — keyin scene'dan
  // topib bo'lmasdi. Endi to'g'ridan reference ham saqlanadi.
  function getOrCreateTrack(obj) {
    // FIX: id undefined bo'lsa fallback sifatida obj.uuid ishlatamiz.
    //      Three.js har bir Object3D'ga avtomatik uuid beradi.
    const id = obj.userData?.id || obj.userData?.uuid || obj.uuid || ('obj_' + Math.random().toString(36).slice(2));

    // Agar userData.id yo'q bo'lsa — uuid'ni userData'ga yozib qo'yamiz
    // (keyingi qidiruvlar uchun)
    if (!obj.userData) obj.userData = {};
    if (!obj.userData.id && !obj.userData.uuid) {
      obj.userData._tlId = obj.userData._tlId || obj.uuid;
    }

    const name = obj.userData?.name || obj.name || 'Obyekt';

    let track = tracks.find(t => t.objId === id || t.objRef === obj);
    if (!track) {
      track = {
        objId:   id,
        objName: name,
        objRef:  obj,   // ← FIX: to'g'ridan referens!
        keyframes: []
      };
      tracks.push(track);
    } else {
      // Mavjud track'ga ham referensni yangilab qo'yamiz
      track.objRef = obj;
    }
    return track;
  }

  // ── FIX 2: captureState — clone qilish (reference bug) ─────
  // Eski kod: pos: obj.position  →  BU XATO!
  //   position object'i keyframega reference sifatida saqlanadi.
  //   Object harakat qilganda keyframe ham o'zgarib ketadi!
  // Yangi kod: barcha qiymatlar number sifatida nusxalanadi (allaqachon to'g'ri edi,
  //   lekin {x,y,z} spread bilan aniqroq qilindi).
  function captureState(obj) {
    return {
      pos:   { x: obj.position.x,   y: obj.position.y,   z: obj.position.z   },
      rot:   { x: obj.rotation.x,   y: obj.rotation.y,   z: obj.rotation.z   },
      scale: { x: obj.scale.x,      y: obj.scale.y,      z: obj.scale.z      }
    };
  }

  // ── FIX 3: applyState — matrixWorldNeedsUpdate ─────────────
  // Three.js ba'zan matrix'ni avtomatik yangilamaydi.
  // position.set() chaqirilgandan keyin majburiy flag qo'yish kerak.
  function applyState(obj, kf) {
    if (!obj || !kf) return;
    if (kf.pos)   obj.position.set(kf.pos.x,   kf.pos.y,   kf.pos.z);
    if (kf.rot)   obj.rotation.set(kf.rot.x,   kf.rot.y,   kf.rot.z);
    if (kf.scale) obj.scale.set(kf.scale.x,    kf.scale.y, kf.scale.z);
    if (kf.vis !== undefined) obj.visible = !!kf.vis;

    // FIX: matrix'ni majburiy yangilash
    obj.updateMatrix();
    obj.matrixWorldNeedsUpdate = true;
  }

  // ── FIX 4: interpolateTrack — objRef ustunlik qiladi ───────
  // Eski kod faqat getObjById(track.objId) qilardi.
  // Agar id undefined yoki noto'g'ri bo'lsa → obj = null → harakat yo'q!
  // Yangi kod: avval track.objRef ni tekshiradi (to'g'ri reference),
  //            keyin id orqali qidiradi (fallback).
  function interpolateTrack(track, t) {
    const kfs = track?.keyframes;
    if (!kfs?.length) return;

    const obj = track.objRef || getObjById(track.objId);
    if (!obj) {
      if (!track._warnedMissing) {
        track._warnedMissing = true;
        clog(`⚠ Track "${track.objName}" — object topilmadi (objId: ${track.objId})`, 'w');
      }
      return;
    }

    // Per-track loop: t ni keyframe oralig'iga wraplash
    const trackStart = kfs[0].time;
    const trackEnd   = kfs[kfs.length-1].time;
    const trackLen   = trackEnd - trackStart;
    let localT = t;
    if (track.loop && trackLen > 0 && t > trackStart) {
      localT = trackStart + ((t - trackStart) % trackLen);
    }

    if (localT <= trackStart) { applyState(obj, kfs[0]); return; }
    if (localT >= trackEnd)   { applyState(obj, kfs[kfs.length-1]); return; }

    for (let i = 0; i < kfs.length-1; i++) {
      const a = kfs[i], b = kfs[i+1];
      if (localT >= a.time && localT <= b.time) {
        const raw   = (localT - a.time) / (b.time - a.time);
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

      const lbl = $el('div','tl-track-lbl');
      lbl.textContent = track.objName.length>11 ? track.objName.slice(0,10)+'…' : track.objName;
      lbl.title = track.objName;

      // Loop tugmasi — label'dan OLDIN (track nomi chap tomonida)
      const loopBtn = $el('button', 'tl-track-loop-btn' + (track.loop ? ' active' : ''));
      loopBtn.textContent = '🔁';
      loopBtn.title = 'Loop';
      loopBtn.addEventListener('click', e => {
        e.stopPropagation();
        track.loop = !track.loop;
        loopBtn.classList.toggle('active', track.loop);
        clog(`🔁 "${track.objName}" loop: ${track.loop ? 'YOQILDI' : 'O\'chirildi'}`, 'ok');
      });
      trow.appendChild(loopBtn);
      trow.appendChild(lbl);

      const lane = $el('div','tl-track-lane');
      lane.addEventListener('click', e => {
        const r   = lane.getBoundingClientRect();
        const raw = Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
        currentTime = raw*duration;
        updatePlayhead(); updateTimeLbl();
        tracks.forEach(tr=>interpolateTrack(tr,currentTime));
      });

      track.keyframes.forEach((kf,ki) => {
        if (ki < track.keyframes.length-1) {
          const nxt = track.keyframes[ki+1];
          const seg = $el('div',`tl-segment ease-${kf.ease||'smooth'}`);
          seg.style.left  = pct(kf.time);
          seg.style.width = (((nxt.time-kf.time)/duration)*100)+'%';
          lane.appendChild(seg);
        }
      });

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

  // ── KEYBOARD SHORTCUT ───────────────────────────────────────
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      const tag = e.target.tagName;
      if (tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||e.target.isContentEditable) return;

      if (e.code === 'KeyI' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        tlAddKeyframe();
        return;
      }
      if (e.code === 'KeyI' && e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        tlAddVisKeyframe();
        return;
      }
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
        if (currentTime >= duration) {
          if (loopMode) {
            currentTime = currentTime % duration; // silliq loop
          } else {
            currentTime = duration;
            stop();
            updatePlayhead(); updateTimeLbl();
            tracks.forEach(tr=>interpolateTrack(tr,currentTime));
            return; // RAF to'xtaydi
          }
        }
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

  // ── CSS PATCH ──────────────────────────────────────────────
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
      #tl-loop-btn {
        background: transparent;
        border: 1px solid #444;
        border-radius: 4px;
        color: #aaa;
        cursor: pointer;
        font-size: 13px;
        padding: 2px 7px;
        margin-left: 4px;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        user-select: none;
      }
      #tl-loop-btn:hover {
        background: #2a2a2a;
        color: #fff;
        border-color: #666;
      }
      #tl-loop-btn.active {
        background: #1a4a6e;
        border-color: #3a8fc7;
        color: #7dd3f8;
      }
      /* Per-track loop tugmasi — track nomi oldida */
      .tl-track-loop-btn {
        flex-shrink: 0;
        background: transparent;
        border: 1px solid #444;
        border-radius: 3px;
        color: #555;
        cursor: pointer;
        font-size: 10px;
        line-height: 1;
        padding: 1px 4px;
        margin-right: 3px;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        user-select: none;
      }
      .tl-track-loop-btn:hover {
        background: #222;
        color: #aaa;
        border-color: #666;
      }
      .tl-track-loop-btn.active {
        background: #1a4a6e;
        border-color: #3a8fc7;
        color: #7dd3f8;
      }
    `;
    document.head.appendChild(s);
  }

  // ── switchBottomTab ─────────────────────────────────────────
  function patchSwitchBottomTab() {
    window.switchBottomTab = function(tab, tabEl) {
      ['console-body','timeline-panel','physics-panel'].forEach(id => {
        const el = $(id);
        if (!el) return;
        el.style.display = 'none';
        el.classList.remove('tl-visible');
      });
      const sw = $('script-wrap') || $('script-panel');
      if (sw) sw.style.display = 'none';

      if (tab === 'timeline') {
        const tp = $('timeline-panel');
        if (tp) {
          tp.style.display = 'flex';
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
    getSelectedObj._debugged = false;
    const obj = getSelectedObj();
    if (!obj) return;

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
    clog(`◆ KF qo'shildi: "${track.objName}"  t=${state.time.toFixed(2)}s`, 'ok');
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
    clog(`👁 VIS KF: "${track.objName}"  t=${state.time.toFixed(2)}s`, 'ok');
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
      objRef:    obj,   // FIX: reference ham saqlanadi
      keyframes: src.keyframes.map(k=>({...k}))
    };
    const ex = tracks.findIndex(t=>t.objId===newTrack.objId || t.objRef===obj);
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

  function tlToggleLoop() {
    loopMode = !loopMode;
    const btn = $('tl-loop-btn');
    if (btn) btn.classList.toggle('active', loopMode);
    clog(loopMode ? '🔁 Loop YOQILDI' : '🔁 Loop o\'chirildi', 'ok');
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
    // Export'da objRef ni o'chirib yuboramiz (JSON.stringify circular reference chiqaradi)
    const exportData = {
      version: 1,
      duration,
      tracks: tracks.map(t => ({
        objId:     t.objId,
        objName:   t.objName,
        keyframes: t.keyframes
      }))
    };
    const blob = new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'});
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
        if (Array.isArray(data.tracks)) {
          // Import'da objRef ni scene'dan tiklashga harakat qilamiz
          tracks = data.tracks.map(t => ({
            ...t,
            objRef: getObjById(t.objId) || null
          }));
        }
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
      tlToggleCutMode, tlToggleLoop, tlSetGlobalEase, tlSetDuration,
      tlSetKfEase, tlSetKfTangent, tlSetKfVis,
      tlExportJSON, tlImportJSON
    });

    render();
    clog('⏱ Timeline v2.1 ishga tushdi  |  I = KF qo\'shish  |  Shift+I = VIS KF  |  Del = KF o\'chirish', 'ok');

    // ── Loop tugmasini qo'shish ────────────────────────────────
    // tl-play-btn yoniga avtomatik inject qilinadi
    if (!$('tl-loop-btn')) {
      const playBtn = $('tl-play-btn');
      if (playBtn) {
        const loopBtn = document.createElement('button');
        loopBtn.id        = 'tl-loop-btn';
        loopBtn.title     = 'Loop (qayta-qayta ijro)';
        loopBtn.textContent = '🔁';
        loopBtn.onclick   = tlToggleLoop;
        playBtn.insertAdjacentElement('afterend', loopBtn);
      }
    }
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
    get loopMode()    { return loopMode;    },
    render,
    getSelectedObj,
    setVar(name, obj) {
      window[name] = obj;
    }
  };
})();