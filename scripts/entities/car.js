// ============================================================
// ENHANCED CAR CONTROLLER (carCfg bilan)
// ============================================================
let activeCar = null;   // hozir haydayotgan mashina
let carInside = false;
// Legacy constants (carCfg bo'lmasa fallback)
const CAR_MAX_SPEED  = 18;
const CAR_ACCEL      = 12;
const CAR_BRAKE      = 18;
const CAR_STEER_MAX  = 0.7;
const CAR_STEER_SPD  = 3.5;  // Burilish sezgirligi oshirildi
const CAR_FRICTION   = 0.88;

// Nitro state
let _nitroActive = false;
let _nitroTimer = 0;      // qolgan ishlash vaqti
let _nitroCoolTimer = 0;  // cooldown timeri
// Gear state
let _currentGear = 1;  // 1=P, 2=R, 3=N, 4=1st, 5=2nd ...
let _manualGear  = true; // har doim manual

// Gear index yordamchi funksiyalari
function _gearLabel(idx) {
  if (idx <= 1) return 'P';
  if (idx === 2) return 'R';
  if (idx === 3) return 'N';
  return String(idx - 3); // 4→'1', 5→'2', ...
}
function _gearMaxIdx(g) { return 3 + (g || 6); } // P(1)+R(2)+N(3)+gears
// Mode state
let _driftActive = false;
let _sportActive = false;
// Headlight state
let _headlightOn = false;
// Key prev states
const _carPrev = {};

function updateCar(delta) {
  if (!isPlaying || !activeCar) return;
  const ud = activeCar.userData;
  const cfg = window._getCarCfg ? window._getCarCfg(activeCar) : null;

  ud.speed      = ud.speed      || 0;
  ud.steer      = ud.steer      || 0;
  ud.lateralVel = ud.lateralVel || 0;

  // --- Cfg values (fallback to constants) ---
  const maxSpeedMs = cfg ? (cfg.maxSpeed / 3.6) : CAR_MAX_SPEED;
  const accel     = cfg ? cfg.accel    : CAR_ACCEL;
  const brakeF    = cfg ? cfg.brake    : CAR_BRAKE;
  const friction  = cfg ? cfg.friction : CAR_FRICTION;
  const gears     = cfg ? cfg.gears    : 6;
  const driveType = cfg ? cfg.driveType : 'rear';

  // --- Key mapping from cfg ---
  const gasCode   = cfg ? cfg.gasKey      : 'KeyW';
  const brkCode   = cfg ? cfg.brakeKey    : 'KeyS';
  const lefCode   = cfg ? cfg.leftKey     : 'KeyA';
  const rgtCode   = cfg ? cfg.rightKey    : 'KeyD';
  const hbkCode   = cfg ? cfg.handbrakeKey: 'Space';
  const ntrCode   = cfg ? cfg.nitroKey    : 'KeyF';
  const hlCode    = cfg ? cfg.headlightKey: 'KeyL';
  const dftCode   = cfg ? cfg.driftKey    : 'KeyC';
  const sptCode   = cfg ? cfg.sportKey    : 'KeyV';
  const exitCode  = cfg ? cfg.exitKey     : 'Enter';

  const gas       = fpsKeys[gasCode]  ? 1 : 0;
  const brake     = fpsKeys[brkCode]  ? 1 : 0;
  const left      = fpsKeys[lefCode]  ? 1 : 0;
  const right     = fpsKeys[rgtCode]  ? 1 : 0;
  const handbrake = fpsKeys[hbkCode]  ? 1 : 0;

  // --- Gear system: Q ↓  E ↑ ---
  const maxGearIdx = _gearMaxIdx(gears);
  if (fpsKeys['KeyQ'] && !_carPrev['KeyQ']) {
    _currentGear = Math.max(1, _currentGear - 1);
    log(`🔢 ${_gearLabel(_currentGear)}`, 'lok');
  }
  if (fpsKeys['KeyE'] && !_carPrev['KeyE'] && exitCode !== 'KeyE') {
    _currentGear = Math.min(maxGearIdx, _currentGear + 1);
    log(`🔢 ${_gearLabel(_currentGear)}`, 'lok');
  }
  _carPrev['KeyQ'] = fpsKeys['KeyQ'];
  _carPrev['KeyE'] = fpsKeys['KeyE'];

  const speedKmh = Math.abs(ud.speed) * 3.6;

  // Gear ratio faqat haydash pog'onalari uchun
  const driveGear = _currentGear - 3; // ≤0 = P/R/N, 1..N = drive
  const gearRatio = driveGear > 0
    ? (0.5 + (driveGear / Math.max(gears, 1)) * 0.5)
    : 1.0;

  // --- Nitro ---
  if (cfg) {
    const nitroPress = fpsKeys[ntrCode] && !_carPrev[ntrCode];
    if (nitroPress && !_nitroActive && _nitroCoolTimer <= 0 && ud.fuel > 0) {
      _nitroActive = true;
      _nitroTimer = cfg.nitroDuration;
      log('⚡ NITRO!', 'lok');
    }
    if (_nitroActive) {
      _nitroTimer -= delta;
      if (_nitroTimer <= 0) { _nitroActive = false; _nitroCoolTimer = cfg.nitroCooldown; log('⚡ Nitro tugadi — '+cfg.nitroCooldown+'s kutish', 'lw'); }
    }
    if (!_nitroActive && _nitroCoolTimer > 0) { _nitroCoolTimer = Math.max(0, _nitroCoolTimer - delta); }
    _carPrev[ntrCode] = fpsKeys[ntrCode];
  }
  const nitroMult = (_nitroActive && cfg) ? cfg.nitroBoost : 1;

  // --- Drift & Sport mode toggle ---
  if (cfg) {
    if (fpsKeys[dftCode] && !_carPrev[dftCode]) { _driftActive = !_driftActive; log('🌀 Drift: '+(_driftActive?'ON':'OFF'), _driftActive?'lok':'lw'); }
    if (fpsKeys[sptCode] && !_carPrev[sptCode]) { _sportActive = !_sportActive; log('🏁 Sport: '+(_sportActive?'ON':'OFF'), _sportActive?'lok':'lw'); }
    _carPrev[dftCode] = fpsKeys[dftCode];
    _carPrev[sptCode] = fpsKeys[sptCode];
  }
  // Friksiya: per-second qiymati (frame-rate mustaqil)
  // Normal: ~2.5/s,  Sport: ~1.8/s (tezroq),  Drift: ~1.2/s (sust sekinlashadi)
  const frictionPerSec = _driftActive ? 1.2 : (_sportActive ? 1.8 : 2.5);
  const frictionFinal  = Math.exp(-frictionPerSec * 0.016); // ~60fps bazali

  // Sport: tezroq akselerasiya, max 30% oshadi
  // Drift: akselerasiya o'zgarmas — faqat grip kamayadi
  const accelFinal    = _sportActive ? accel * 1.3 : accel;
  const sportSpeedMul = _sportActive ? 1.25 : (_driftActive ? 1.0 : 1.0);
  const absMaxSpeedMs = maxSpeedMs * sportSpeedMul * nitroMult; // mutlaq cheklov

  // --- Headlight toggle ---
  if (cfg && fpsKeys[hlCode] && !_carPrev[hlCode]) {
    _headlightOn = !_headlightOn;
    // Toggle lights on car
    activeCar.traverse(ch => { if (ch.isLight) ch.visible = _headlightOn; });
    log('💡 Fara: '+(_headlightOn?'ON':'OFF'), 'lok');
  }
  _carPrev[hlCode] = cfg ? fpsKeys[hlCode] : false;

  // --- Physics — P / R / N / 1..N ---
  if (ud.fuel <= 0) {
    // Yoqilg'i yo'q — asta to'xtaydi
    ud.speed *= Math.pow(0.5, delta);

  } else if (_currentGear <= 1) {
    // P — to'liq tormoz
    ud.speed *= Math.pow(0.01, delta);

  } else if (_currentGear === 2) {
    // R — orqaga
    const revCap = maxSpeedMs * 0.35 * nitroMult;
    if (gas)   ud.speed = Math.max(-revCap, ud.speed - accelFinal * 0.7 * nitroMult * delta);
    if (brake) ud.speed = Math.min(0, ud.speed + brakeF * delta);
    if (!gas && !brake) ud.speed *= Math.pow(frictionFinal, delta / 0.016);
    ud.speed = Math.max(-revCap, Math.min(0, ud.speed));

  } else if (_currentGear === 3) {
    // N — neytral, asta sekinlashadi
    ud.speed *= Math.pow(frictionFinal, delta / 0.016);

  } else {
    // Drive gears (1..N)
    const gearSpeedCap = Math.min(absMaxSpeedMs,
      maxSpeedMs * sportSpeedMul * (driveGear / Math.max(gears, 1)) * nitroMult);
    const gearAccelMult = ((gears - driveGear + 1) / Math.max(gears, 1)) * 1.6 + 0.4;

    if (gas) {
      ud.speed = Math.min(gearSpeedCap, ud.speed + accelFinal * gearAccelMult * nitroMult * delta);
    } else if (!handbrake) {
      // Frame-rate mustaqil friksiya
      ud.speed *= Math.pow(frictionFinal, delta / 0.016);
    }
    if (brake)         ud.speed = Math.max(0, ud.speed - brakeF * delta * 1.5);
    if (!_driftActive && handbrake) ud.speed *= Math.max(0, 1 - delta * 9);
    // Mutlaq cheklov
    ud.speed = Math.max(0, Math.min(absMaxSpeedMs, ud.speed));
    if (ud.fuel !== undefined) ud.fuel = Math.max(0, ud.fuel - Math.abs(ud.speed) * delta * 0.3);
  }

  // --- Steering ---
  const steerMax = _driftActive ? CAR_STEER_MAX * 1.4 : CAR_STEER_MAX;
  const steerDir = right - left;
  ud.steer += steerDir * CAR_STEER_SPD * delta;
  ud.steer *= _driftActive ? 0.90 : 0.86;  // Burilish uzoqroq saqlanadi
  ud.steer  = Math.max(-steerMax, Math.min(steerMax, ud.steer));

  // --- Move & Rotate ---
  const driftAmt   = cfg ? (cfg.driftAmount ?? 0.6) : 0.6;
  const speedRatio = Math.min(1, Math.abs(ud.speed) / Math.max(0.5, maxSpeedMs));

  ud.lateralVel = ud.lateralVel || 0;

  if (Math.abs(ud.speed) > 0.05) {
    const turnFactor = 0.4 + speedRatio * 0.6;
    // Orqaga yurganda burilish teskari bo'lishi kerak
    const reverseSign = ud.speed < 0 ? -1 : 1;
    activeCar.rotation.y -= ud.steer * turnFactor * delta * 3.5 * reverseSign;

    if (_driftActive) {
      // Yon kuch: burilish + tezlik → yon siljish
      const lateralForce = ud.steer * Math.abs(ud.speed) * driftAmt * delta * 5 * reverseSign;
      ud.lateralVel += lateralForce;

      // SPACE bosilganda — orqa ko't chiqishi (rear kick)
      if (handbrake) {
        // Tezlik deyarli o'zgarmaydi
        ud.speed *= Math.max(0, 1 - delta * 2.5);
        // Steer yo'q bo'lsa lateral tezlikdan yo'nalish oladi
        const kickDir = ud.steer || (ud.lateralVel > 0 ? 0.3 : ud.lateralVel < 0 ? -0.3 : 0);
        const rearKick = Math.sign(kickDir) * Math.abs(ud.speed) * driftAmt * 0.55;
        ud.lateralVel += rearKick;
        // Mashina gavdasi orqaga buriladi
        activeCar.rotation.y -= kickDir * driftAmt * delta * 9;
      }

      // Drift burchagi: lateral tezlik bo'yicha gavda ham aylanadi
      if (Math.abs(ud.lateralVel) > 0.15) {
        const bodyAngle = ud.lateralVel / Math.max(1, Math.abs(ud.speed)) * driftAmt * delta * 3.5;
        activeCar.rotation.y += bodyAngle;
      }

      // Yon friksiya (drift da past — ko'proq toyish)
      const latDecay = Math.pow(0.3 + (1 - driftAmt) * 0.65, delta / 0.016);
      ud.lateralVel *= latDecay;
    } else {
      // Grip — yon tezlikni tez nolga tushir
      if (handbrake) ud.speed *= Math.max(0, 1 - delta * 9);
      ud.lateralVel *= Math.pow(0.02, delta / 0.016);
    }
  } else {
    ud.lateralVel *= 0.85;
  }

  // Yon tezlik chegarasi
  const maxLat = Math.abs(ud.speed) * driftAmt * 1.2;
  ud.lateralVel = Math.max(-maxLat, Math.min(maxLat, ud.lateralVel));

  // Harakat: oldinga + yon
  const fwd = new THREE.Vector3(-Math.sin(activeCar.rotation.y), 0, -Math.cos(activeCar.rotation.y));
  const rgt = new THREE.Vector3( Math.cos(activeCar.rotation.y), 0, -Math.sin(activeCar.rotation.y));
  activeCar.position.addScaledVector(fwd, ud.speed * delta);
  activeCar.position.addScaledVector(rgt, ud.lateralVel * delta);

  // --- Ground ---
  if (activeCar.position.y > 0.6) activeCar.position.y -= 9.8*delta;
  if (activeCar.position.y < 0.6)  activeCar.position.y = 0.6;

  // --- Rapier body ni sinxronlash (to'qnashuv ishlashi uchun) ---
  const _carRb = rapierBodies?.get(activeCar);
  if (_carRb) {
    const p = activeCar.position;
    _carRb.rigidBody.setTranslation({ x:p.x, y:p.y, z:p.z }, true);
    const q = activeCar.quaternion;
    _carRb.rigidBody.setRotation({ x:q.x, y:q.y, z:q.z, w:q.w }, true);
    _carRb.rigidBody.setLinvel({ x:0, y:0, z:0 }, false);
    _carRb.rigidBody.setAngvel({ x:0, y:0, z:0 }, false);
  }

  // --- Wheel spin ---
  activeCar.children.forEach(ch => {
    if (ch.userData._wheelIdx !== undefined) {
      ch.rotation.x += ud.speed * delta * 1.5;
      if (ch.userData._wheelIdx < 2) ch.rotation.y = ud.steer;
    }
  });

  ud._moving = Math.abs(ud.speed) > 0.5;
  ud._gear = _currentGear;
  ud._nitroActive = _nitroActive;
  ud._nitroCoolLeft = _nitroCoolTimer;

  // --- Camera ---
  const camCfg = cfg || {};
  const _allow1st = camCfg.camAllow1st !== false;
  const _allow3rd = camCfg.camAllow3rd !== false;
  // Agar faqat biri ruxsat bo'lsa — shu rejimda majburan
  const _effectiveCamMode = (!_allow3rd && _allow1st) ? '1st'
                          : (!_allow1st && _allow3rd) ? '3rd'
                          : (camCfg.camMode || '3rd');
  const camMode1st = carInside && _effectiveCamMode === '1st';

  if (camMode1st) {
    // 1-shaxs: kamera mashina ichida, fpsYaw/fpsPitch bilan buriladi
    const ox  = camCfg.camOffsetX ?? 0;
    const oy  = camCfg.camOffsetY ?? 1.2;
    const oz  = camCfg.camOffsetZ ?? 0.3;
    const sin = Math.sin(activeCar.rotation.y);
    const cos = Math.cos(activeCar.rotation.y);
    camera.position.set(
      activeCar.position.x + ox * cos - oz * sin,
      activeCar.position.y + oy,
      activeCar.position.z + ox * sin + oz * cos
    );
    // FPS mouse look — fpsYaw/fpsPitch allaqachon mousemove da yangilanadi
    camera.rotation.order = 'YXZ';
    camera.rotation.y = fpsYaw;
    camera.rotation.x = fpsPitch;
  } else {
    // 3-shaxs: fpsYaw/fpsPitch bilan sichqoncha kamerani aylantiradi
    const dist   = camCfg.cam3rdDist   ?? 6;
    const height = camCfg.cam3rdHeight ?? 3;
    const camX = activeCar.position.x + Math.sin(fpsYaw) * dist * Math.cos(fpsPitch);
    const camY = activeCar.position.y + height - Math.sin(fpsPitch) * dist;
    const camZ = activeCar.position.z + Math.cos(fpsYaw) * dist * Math.cos(fpsPitch);
    camera.position.lerp(new THREE.Vector3(camX, camY, camZ), delta * 5);
    camera.lookAt(activeCar.position.clone().add(new THREE.Vector3(0, 1, 0)));
  }

  // --- HUD overlay (tezlik, gear, nitro) ---
  _updateCarHUD(ud, cfg, maxSpeedMs);

  // _car-ptr-hint olib tashlandi
  document.getElementById('_car-ptr-hint')?.remove();

  // --- Chiqish ---
  if (fpsKeys[exitCode] && !_carPrev['_exit']) {
    if (document.pointerLockElement) document.exitPointerLock?.();
    document.getElementById('_car-ptr-hint')?.remove();
    if (playerMesh && activeCar) {
      const spawnDist = 2.2;
      const exitSin = Math.sin(activeCar.rotation.y);
      const exitCos = Math.cos(activeCar.rotation.y);
      playerMesh.position.set(
        activeCar.position.x - exitSin * spawnDist,
        PLAYER_HEIGHT,
        activeCar.position.z - exitCos * spawnDist
      );
      playerVel?.set(0, 0, 0);
      playerMesh.visible = true;
    }
    activeCar = null; carInside = false; _nitroActive = false;
    _currentGear = 3; _driftActive = false; _sportActive = false;
    setCamMode('fps'); // FPS modida qoladi — oyinchi yurishda davom etadi
    _driftActive=false; _sportActive=false;
    document.getElementById('_car-hud')?.remove();
    setCamMode('orbit');
    log('🚗 Mashinadan chiqdingiz','lw');
  }
  _carPrev['_exit'] = fpsKeys[exitCode];
  _carPrev['KeyQ'] = fpsKeys['KeyQ'];

  // Kamera rejimi almashtirish (V yoki camSwitchKey)
  const _swKey = cfg ? (cfg.camSwitchKey || 'KeyV') : 'KeyV';
  const _can1  = cfg ? cfg.camAllow1st !== false : true;
  const _can3  = cfg ? cfg.camAllow3rd !== false : true;
  if (fpsKeys[_swKey] && !_carPrev[_swKey] && _can1 && _can3) {
    const curMode = cfg ? (cfg.camMode || '3rd') : '3rd';
    const newMode = curMode === '1st' ? '3rd' : '1st';
    if (cfg) cfg.camMode = newMode;
    if (newMode === '1st') {
      // 1-shaxs ga o'tish: fpsYaw mashinaga mos
      fpsYaw = activeCar.rotation.y; fpsPitch = 0;
    } else {
      // 3-shaxs ga o'tish: kamera orqaga
      fpsYaw = activeCar.rotation.y + Math.PI; fpsPitch = -0.25;
    }
    log('🎥 ' + (newMode === '1st' ? '1-shaxs' : '3-shaxs') + ' kamera', 'lok');
  }
  _carPrev[_swKey] = fpsKeys[_swKey];
}

function _updateCarHUD(ud, cfg, maxSpeedMs) {
  let hud = document.getElementById('_car-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = '_car-hud';
    hud.style.cssText = `position:fixed;bottom:90px;right:18px;z-index:9990;
      background:rgba(0,0,0,.72);border:1px solid rgba(0,180,255,.35);border-radius:8px;
      padding:10px 14px;font-family:'Share Tech Mono',monospace;color:#00b4ff;
      min-width:180px;backdrop-filter:blur(4px);pointer-events:none;user-select:none`;
    document.body.appendChild(hud);
  }
  const kmh = Math.abs(ud.speed * 3.6).toFixed(0);
  const maxKmh = cfg ? cfg.maxSpeed : Math.round(maxSpeedMs*3.6);
  const gears    = cfg ? cfg.gears : 6;
  const gearLbl  = _gearLabel(_currentGear);
  const driveNum = _currentGear - 3;
  const gearColor = _currentGear <= 1 ? '#ff4444'   // P — qizil
                  : _currentGear === 2 ? '#ffaa00'  // R — sariq
                  : _currentGear === 3 ? '#888'      // N — kulrang
                  : '#00e5ff';                        // D — ko'k
  const nitroBar = cfg ? Math.max(0, (_nitroActive ? _nitroTimer/cfg.nitroDuration : (_nitroCoolTimer>0?0:1))) : 1;
  const nitroPct = Math.round(nitroBar*100);
  const driftStr = _driftActive?`<span style="color:#cc88ff"> 🌀DRIFT ${ud.lateralVel?Math.min(100,Math.round(Math.abs(ud.lateralVel)/Math.max(0.01,maxSpeedMs*(cfg?.driftAmount??0.6)*1.2)*100))+'%':''}</span>`:'';
  const sportStr = _sportActive?'<span style="color:#ffcc00"> 🏁SPORT</span>':'';
  const headStr  = _headlightOn?'<span style="color:#ffee66"> 💡</span>':'';

  hud.innerHTML = `
    <div style="font-size:28px;font-weight:700;color:#fff;letter-spacing:-1px;line-height:1">${kmh} <span style="font-size:10px;color:#00b4ff">km/h</span></div>
    <div style="font-size:9px;color:#445;margin:2px 0 4px">MAX: ${maxKmh} km/h</div>
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
      <span style="font-size:9px;color:var(--muted)">GEAR</span>
      <span style="font-size:20px;font-weight:900;color:${gearColor};min-width:22px;text-align:center">${gearLbl}</span>
      ${driveNum > 0 ? `<span style="font-size:8px;color:#334">/ ${gears}</span>` : ''}
    </div>
    <div style="margin-bottom:3px">
      <div style="font-size:8px;color:${_nitroActive?'#39ff14':(_nitroCoolTimer>0?'#ff4444':'#556')};margin-bottom:2px">
        ⚡ NITRO ${_nitroActive?'AKTIV':(_nitroCoolTimer>0?Math.ceil(_nitroCoolTimer)+'s kutish':'TAYYOR')}
      </div>
      <div style="background:#111;border-radius:2px;height:4px;overflow:hidden">
        <div style="height:100%;width:${nitroPct}%;background:${_nitroActive?'#39ff14':(_nitroCoolTimer>0?'#ff4444':'#00b4ff')};transition:width .1s"></div>
      </div>
    </div>
    <div style="font-size:9px;margin-top:3px">${driftStr}${sportStr}${headStr}</div>
    ${ud.fuel!==undefined?`<div style="font-size:8px;color:#445;margin-top:2px">⛽ ${Math.round(ud.fuel??100)}%</div>`:''}
  `;
}


function tryEnterCar(targetCar) {
  if (!isPlaying) return;
  const doEnter = (car) => {
    activeCar = car; carInside = true;
    _currentGear = 3; _nitroActive = false; _nitroCoolTimer = 0;
    _driftActive = false; _sportActive = false;
    // 1-shaxs rejimida FPS kamera modiga o'tamiz — sichqoncha avtomatik ishlaydi
    const ccfg = window._getCarCfg?.(car);
    const _eCamMode = ccfg ? (ccfg.camMode || '3rd') : '1st';
    fpsYaw   = car.rotation.y + (_eCamMode === '1st' ? 0 : Math.PI);
    fpsPitch = _eCamMode === '1st' ? 0 : -0.25;
    setCamMode('fps');
    const _eCv = document.getElementById('three-canvas') || canvas;
    if (_eCv) setTimeout(()=>{ _eCv.requestPointerLock?.(); }, 80);
    if (playerMesh) playerMesh.visible = false;
    log('🚗 ' + car.userData.name + ' ga kirdingiz', 'lok');
    SoundSystem.play('door', null, { volume: 0.5 });
  };

  if (targetCar) { doEnter(targetCar); return; }
  if (!playerMesh) return;
  let nearest = null, nearDist = 999;
  objects.forEach(o => {
    if (o.userData.entityType !== 'car' && o.userData._entityMode !== 'vehicle') return;
    const cfg = window._getCarCfg ? window._getCarCfg(o) : null;
    const maxDist = cfg ? cfg.enterDistance : 3.5;
    const d = playerMesh.position.distanceTo(o.position);
    if (d < maxDist && d < nearDist) { nearDist = d; nearest = o; }
  });
  if (nearest) doEnter(nearest);
}
