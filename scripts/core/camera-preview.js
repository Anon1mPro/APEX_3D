// ============================================================
//  KAMERA PREVIEW — Inspector ichidan oyna ochmasdan tekshirish
// ============================================================
window._camPreview = {
  active: false,
  mode: null,      // '1st' | '3rd'
  entity: null,    // 'player' | 'car'
  yaw: Math.PI,
  pitch: 0,
  dragging: false,
  lastX: 0, lastY: 0,
  _savedCamPos: null,
  _savedCamRot: null,

  start(entity, mode) {
    if (!selectedObj) { log('⚠ Avval obyekt tanlang!', 'lw'); return; }
    if (isPlaying) { log('⚠ O\'yin rejimida preview mavjud emas — avval to\'xtating.', 'lw'); return; }

    // Joriy kamera holatini saqlash
    this._savedCamPos = camera.position.clone();
    this._savedCamRot = { x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z };

    this.active = true;
    this.mode   = mode;
    this.entity = entity;
    if (entity === 'car' && selectedObj) {
      const _cc = window._getCarCfg ? window._getCarCfg(selectedObj) : null;
      this.yaw   = ((_cc?.camInitYaw)   ?? 180) * Math.PI / 180;
      this.pitch = ((_cc?.camInitPitch) ?? 0)   * Math.PI / 180;
    } else {
      this.yaw   = (playerSettings.camInitYaw   ?? 180) * Math.PI / 180;
      this.pitch = (playerSettings.camInitPitch ?? 0)   * Math.PI / 180;
    }

    // Orbit controls o'chirish
    if (window.orbitControls) window.orbitControls.enabled = false;
    if (window.controls)      window.controls.enabled      = false;

    this._setupEvents();
    this._updateCamera();
    this._showOverlay();

    log('🎬 Kamera preview: ' + (entity==='car'?'🚗 Avto':'🎮 Oyinchi') + ' — ' + (mode==='1st'?'1-shaxs':'3-shaxs') + ' | Sichqoncha bilan burishingiz mumkin', 'lok');
  },

  stop() {
    if (!this.active) return;
    this.active   = false;
    this.dragging = false;

    this._removeEvents();
    document.getElementById('cam-preview-overlay')?.remove();

    // Orbit controls qaytarish
    if (window.orbitControls) window.orbitControls.enabled = true;
    if (window.controls)      window.controls.enabled      = true;

    // Kamera holatini tiklash
    if (this._savedCamPos) camera.position.copy(this._savedCamPos);
    if (this._savedCamRot) {
      camera.rotation.order = 'YXZ';
      camera.rotation.set(this._savedCamRot.x, this._savedCamRot.y, this._savedCamRot.z);
    }
    camera.lookAt(selectedObj ? selectedObj.position : new THREE.Vector3(0,0,0));

    log('🎬 Kamera preview yopildi', 'lok');
  },

  _setupEvents() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) return;

    this._onMouseDown = e => {
      if (!this.active || e.button !== 0) return;
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      canvas.style.cursor = 'grabbing';
    };
    this._onMouseMove = e => {
      if (!this.active || !this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      const sens = 0.004;
      this.yaw   -= dx * sens;
      this.pitch -= dy * sens;
      // Pitch chegarasi
      const o = selectedObj;
      if (this.mode === '1st' && o) {
        const cfg = this.entity==='car' ? _getCarCfg(o) : null;
        const pMin = cfg ? (cfg.cam1stPitchMin ?? -60) * Math.PI/180 : -1.3;
        const pMax = cfg ? (cfg.cam1stPitchMax ??  60) * Math.PI/180 :  1.3;
        this.pitch = Math.max(pMin, Math.min(pMax, this.pitch));
      } else {
        const cfg = this.entity==='car' ? _getCarCfg(o) : null;
        const pMin = cfg ? (cfg.cam3rdPitchMin ?? -40) * Math.PI/180 : -1.2;
        const pMax = cfg ? (cfg.cam3rdPitchMax ??  60) * Math.PI/180 :  1.2;
        this.pitch = Math.max(pMin, Math.min(pMax, this.pitch));
      }
      this._updateCamera();
      // Overlay'dagi burchak ma'lumotini yangilash
      const angEl = document.getElementById('cpv-angle');
      if (angEl) angEl.textContent =
        'Yaw:' + (this.yaw * 180/Math.PI).toFixed(0) + '°  Pitch:' + (this.pitch * 180/Math.PI).toFixed(0) + '°';
    };
    this._onMouseUp = () => {
      this.dragging = false;
      if (canvas) canvas.style.cursor = 'crosshair';
    };

    // Slider o'zgarganda kamerani yangilash (car cfg sliders)
    this._onInput = () => {
      if (this.active) setTimeout(() => this._updateCamera(), 10);
    };

    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup',   this._onMouseUp);
    document.getElementById('inspector-content')?.addEventListener('input', this._onInput);
  },

  _removeEvents() {
    const canvas = document.getElementById('three-canvas');
    if (canvas) {
      canvas.removeEventListener('mousedown', this._onMouseDown);
      canvas.style.cursor = '';
    }
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup',   this._onMouseUp);
    document.getElementById('inspector-content')?.removeEventListener('input', this._onInput);
  },

  _updateCamera() {
    if (!selectedObj) return;
    const o   = selectedObj;
    const pos = o.position;

    if (this.mode === '1st') {
      // ── 1-SHAXS ──────────────────────────────────────────
      let ex = pos.x, ey, ez = pos.z;
      if (this.entity === 'car') {
        const c = _getCarCfg(o);
        const cosY = Math.cos(o.rotation.y), sinY = Math.sin(o.rotation.y);
        ex = pos.x + (c.camOffsetX||0) * cosY - (c.camOffsetZ||0.3) * sinY;
        ey = pos.y + (c.camOffsetY||1.2);
        ez = pos.z + (c.camOffsetX||0) * sinY + (c.camOffsetZ||0.3) * cosY;
        // Pitch chegarasi
        const pMin = (c.cam1stPitchMin ?? -60) * Math.PI/180;
        const pMax = (c.cam1stPitchMax ??  60) * Math.PI/180;
        this.pitch = Math.max(pMin, Math.min(pMax, this.pitch));
      } else {
        const ps = playerSettings;
        const cosY = Math.cos(this.yaw), sinY = Math.sin(this.yaw);
        const ox = ps.cam1stOffsetX || 0, oz = ps.cam1stOffsetZ || 0;
        ex = pos.x + ox * cosY - oz * sinY;
        ey = pos.y + o.scale.y * 0.5 + 0.1 + (ps.cam1stOffsetY || 0);
        ez = pos.z + ox * sinY + oz * cosY;
        const pMin = (ps.cam1stPitchMin ?? -80) * Math.PI/180;
        const pMax = (ps.cam1stPitchMax ??  80) * Math.PI/180;
        this.pitch = Math.max(pMin, Math.min(pMax, this.pitch));
      }
      camera.position.set(ex, ey, ez);
      camera.rotation.order = 'YXZ';
      camera.rotation.set(this.pitch, this.yaw, 0);

    } else {
      // ── 3-SHAXS ──────────────────────────────────────────
      let dist, height, lookY, ox3 = 0;
      if (this.entity === 'car') {
        const c = _getCarCfg(o);
        dist   = c.cam3rdDist   || 6;
        height = c.cam3rdHeight || 3;
        lookY  = pos.y + 0.5;
        const pMin = (c.cam3rdPitchMin ?? -40) * Math.PI/180;
        const pMax = (c.cam3rdPitchMax ??  60) * Math.PI/180;
        this.pitch = Math.max(pMin, Math.min(pMax, this.pitch));
      } else {
        const ps = playerSettings;
        dist   = ps.cam3rdDist   || 5;
        height = (ps.cam3rdHeight || 2) + o.scale.y * 0.3;
        ox3    = ps.cam3rdOffsetX || 0;
        lookY  = pos.y + o.scale.y * 0.3;
        const pMin = (ps.cam3rdPitchMin ?? -40) * Math.PI/180;
        const pMax = (ps.cam3rdPitchMax ??  60) * Math.PI/180;
        this.pitch = Math.max(pMin, Math.min(pMax, this.pitch));
      }
      const cosPitch = Math.cos(this.pitch);
      const cx = pos.x + Math.sin(this.yaw) * dist * cosPitch + ox3;
      const cy = pos.y + height - Math.sin(this.pitch) * dist;
      const cz = pos.z + Math.cos(this.yaw) * dist * cosPitch;
      camera.position.set(cx, cy, cz);
      camera.lookAt(pos.x + ox3 * 0.5, lookY, pos.z);
    }
  },

  _showOverlay() {
    document.getElementById('cam-preview-overlay')?.remove();
    const ov  = document.createElement('div');
    ov.id     = 'cam-preview-overlay';
    const mLabel  = this.mode   === '1st' ? '👁 1-SHAXS' : '👥 3-SHAXS';
    const eLabel  = this.entity === 'car' ? '🚗 AVTO'    : '🎮 OYINCHI';
    const mColor  = this.mode   === '1st' ? 'var(--accent)' : 'var(--accent4)';
    const bColor  = this.mode   === '1st' ? 'rgba(0,229,255,.3)' : 'rgba(204,136,255,.3)';

    ov.style.cssText = `
      position:fixed;top:46px;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,.88);border:1px solid ${mColor};color:${mColor};
      font-family:'Share Tech Mono',monospace;font-size:11px;
      padding:6px 14px;border-radius:5px;z-index:9998;
      display:flex;align-items:center;gap:10px;
      box-shadow:0 0 18px ${bColor};pointer-events:auto;white-space:nowrap;
    `;
    ov.innerHTML = `
      <span style="color:var(--accent3);letter-spacing:1px">🎬 PREVIEW</span>
      <span style="color:var(--muted)">${eLabel}</span>
      <span style="font-weight:700">${mLabel}</span>
      <span id="cpv-angle" style="color:var(--muted);font-size:9px">Yaw:180°  Pitch:0°</span>
      <span style="color:var(--muted);font-size:9px">|</span>
      <span style="color:var(--muted);font-size:9px">🖱 Bosib suring = burish</span>
      <button onclick="window._camPreview.stop()"
        style="background:rgba(255,68,68,.15);border:1px solid rgba(255,68,68,.5);
        color:#ff6666;font-family:'Share Tech Mono',monospace;font-size:10px;
        padding:3px 10px;border-radius:3px;cursor:pointer;margin-left:4px;
        transition:background .15s" onmouseover="this.style.background='rgba(255,68,68,.3)'"
        onmouseout="this.style.background='rgba(255,68,68,.15)'">
        ✕ Yopish
      </button>
    `;
    document.body.appendChild(ov);
  }
};

// Preview animate loop hook — preview aktiv bo'lganda har frame yangilaydi
(function patchAnimateForPreview() {
  const _origAnimate = window.animate;
  if (typeof _origAnimate === 'function') {
    // animate allaqachon mavjud, uni patch qilamiz
  }
  // Sodda yondashuv: rAF orqali alohida loop
  function previewLoop() {
    requestAnimationFrame(previewLoop);
    if (window._camPreview && window._camPreview.active && !window._camPreview.dragging) {
      // Har frame tekshirish — agar inspector sliderlar o'zgarsa ham ishlaydi
    }
  }
  requestAnimationFrame(previewLoop);
})();

// ── Brauzer yopilishidan oldin ogohlantirish ──────────────────────
let _sceneModified = false;
// Har qanday o'zgarishda flagni yoqamiz
(function() {
  const _markDirty = () => { _sceneModified = true; };
  // Obyekt qo'shish/o'chirish/siljitish — updateHierarchy va applyT orqali ushlaymiz
  const _origUpdateHierarchy = window.updateHierarchy;
  window.updateHierarchy = function() { _markDirty(); return _origUpdateHierarchy?.apply(this, arguments); };
  const _origApplyT = window.applyT;
  window.applyT = function() { _markDirty(); return _origApplyT?.apply(this, arguments); };
  const _origApplyM = window.applyM;
  window.applyM = function() { _markDirty(); return _origApplyM?.apply(this, arguments); };
  // Saqlanganda flagni o'chiramiz
  const _origSaveScene = window.saveScene;
  window.saveScene = async function() {
    const result = await _origSaveScene?.apply(this, arguments);
    _sceneModified = false;
    return result;
  };
})();

window.addEventListener('beforeunload', e => {
  if (!_sceneModified) return;
  const msg = 'Sahnada saqlanmagan o\'zgarishlar bor. Chiqishdan oldin saqlaysizmi?';
  e.preventDefault();
  e.returnValue = msg;
  return msg;
});

