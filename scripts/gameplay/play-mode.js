// ============================================================
// PLAY MODE
// ============================================================
let isPlaying=false, playTime=0;
const savedStates=[];
let camSensitivity = 0.002;

// ── OYINCHI SOZLAMALARI ─────────────────────────────────────
const playerSettings = {
  speed:       7,
  sprintMult:  1.8,
  accelMode:   'instant',
  accelTime:   0.3,
  waveDelay:   0,
  keys: {
    forward:  'KeyW',
    backward: 'KeyS',
    left:     'KeyA',
    right:    'KeyD',
    jump:     'Space',
    sprint:   'ShiftLeft',
    camToggle:'KeyV',
  },
  _rebinding: null,
  _accelT: 0,
  _waveT:  0,
  _wasMoving: false,
  // ── KAMERA SOZLAMALARI ───────────────────────────
  camMode:        'fps',  // 'fps' | 'third'
  camAllow1st:    true,
  camAllow3rd:    true,
  cam1stOffsetX:  0,
  cam1stOffsetY:  0,
  cam1stOffsetZ:  0,
  cam1stPitchMin: -80,
  cam1stPitchMax:  80,
  cam3rdDist:     5,
  cam3rdHeight:   2,
  cam3rdOffsetX:  0,
  cam3rdPitchMin: -40,
  cam3rdPitchMax:  60,
  cam1stRotateSpeed: 1.0,
  cam3rdRotateSpeed: 1.0,
  camInitYaw:   0,
  camInitPitch: 0,
  maxHealth:    100,
  bodyRotate:   true,   // 1-shaxsda ob'ekt kamera bilan birga burilsin
  deathMessage: "Siz oldingiz!",
};

window._psCamSet = function(key, val) {
  playerSettings[key] = val;
  // O'yin paytida PlayerController camYaw/camPitch ni ham yangilash
  if (isPlaying && window.PlayerController && window.PlayerController.obj) {
    if (key === 'camInitYaw')   PlayerController.camYaw   = val * Math.PI / 180;
    if (key === 'camInitPitch') PlayerController.camPitch = val * Math.PI / 180;
  }
  if (window._camPreview && window._camPreview.active) {
    if (key === 'camInitYaw')   window._camPreview.yaw   = val * Math.PI / 180;
    if (key === 'camInitPitch') window._camPreview.pitch = val * Math.PI / 180;
    window._camPreview._updateCamera();
  }
};

// Play/Stop tugmalari olib tashlandi — funksiyalar saqlanadi
// O'YNA / TO'XTAT — faqat fizika yoqish va isPlaying flag
if($('play-btn')) $('play-btn').onclick = function() {
  if (!isPlaying) {
    // ── FPS kamera rejimidan chiqish (gizmo yo'qolishini oldini olish) ──
    if (camMode === 'fps') { setCamMode('orbit'); document.exitPointerLock?.(); }

    isPlaying = true; playTime = 0;
    window.isPlaying = true;
    document.body.classList.add('play-mode');
    // O'yin boshlananda vehicle strelkalarini yashir
    objects.forEach(o => { const a = o.getObjectByName('__vehicle_arrow__'); if(a) a.visible = false; });
    this.textContent = '⏸ PAUZA';
    this.classList.add('playing');
    savedStates.length = 0;
    objects.forEach(o => savedStates.push({
      pos: o.position.clone(), rot: o.rotation.clone(),
      sca: o.scale.clone(), vis: o.visible
    }));
    physBodies.forEach(b => { if(!b.isStatic){ b.vel.set(0,0,0); b.angVel.set(0,(Math.random()-.5)*0.3,0); } });

    // ── Barcha ob'ektlarda on_start ni ishga tushirish ───────
    objects.forEach(o => {
      const id = o.userData.id;
    });

    // ── isPlayerObj ob'ektni avtomatik boshqarishga olish ────
    const playerObj = objects.find(o => o.userData.isPlayerObj);
    const carObj    = objects.find(o => o.userData._entityMode === 'vehicle' || o.userData.entityType === 'car');
    if (playerObj) {
      PlayerController.start(playerObj);
    } else if (carObj) {
      activeCar = carObj; carInside = true;
      _nitroActive = false; _nitroCoolTimer = 0; _currentGear = 3;
      _driftActive = false; _sportActive = false;
      const cfg = window._getCarCfg ? window._getCarCfg(carObj) : null;
      const _sCamMode = cfg ? (cfg.camMode || '3rd') : '3rd';
      fpsYaw   = carObj.rotation.y + (_sCamMode === '1st' ? 0 : Math.PI);
      fpsPitch = _sCamMode === '1st' ? 0 : -0.25;
      setCamMode('fps');
      const _sCv = document.getElementById('three-canvas') || canvas;
      if (_sCv) setTimeout(()=>{ _sCv.requestPointerLock?.(); }, 80);
      log('🚗 ' + carObj.userData.name + ' — WASD:haydash | ' + (cfg?cfg.nitroKey:'F') + ':nitro | E:chiqish', 'lok');
    } else {
      _showNoPlayerModal();
    }

    log('▶ O\'yin boshlandi', 'lok');
  } else {
    // ── TO'XTATISH + Sahna tiklash ────────────────────────────
    isPlaying = false;
    window.isPlaying = false;
    activeCar = null; carInside = false;
    _nitroActive = false; _nitroCoolTimer = 0; _currentGear = 3;
    // O'yin to'xtaganda vehicle strelkalarini qayta ko'rsat
    objects.forEach(o => { const a = o.getObjectByName('__vehicle_arrow__'); if(a) a.visible = true; });
    document.getElementById('_car-prompt')?.remove();
    document.getElementById('_car-hud')?.remove();
    document.body.classList.remove('play-mode');
    this.textContent = '▶ O\'YNA';
    this.classList.remove('playing');

    // Pointer lock va kamera rejimini tiklash
    if (document.pointerLockElement) document.exitPointerLock?.();
    setCamMode('orbit');
    // Kamera pozitsiyasini tiklash
    spherical = { theta: 0.7, phi: 0.6, radius: 16 };
    orbitTarget.set(0, 0, 0);
    updateCamera?.();

    const prevSelected = selectedObj;
    PlayerController.stop();
    if (prevSelected && objects.includes(prevSelected)) {
      selectedObj = prevSelected;
    }
    physSyncUI();
    objects.forEach((o,i) => {
      if (savedStates[i]) {
        o.position.copy(savedStates[i].pos);
        o.rotation.copy(savedStates[i].rot);
        o.scale.copy(savedStates[i].sca);
        if (savedStates[i].vis !== undefined) o.visible = savedStates[i].vis;
      }
    });
    physBodies.forEach(b => { b.vel.set(0,0,0); b.angVel.set(0,0,0); });
    log('■ To\'xtatildi — sahna tiklandi', 'lw');
    setTimeout(() => { updateHierarchy(); updateInspector(); }, 50);
  }
};
