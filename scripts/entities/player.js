// PLAYER CONTROLLER — O'yin rejimida FPS player
// ============================================================
let playerMesh   = null;
let playerVel    = new THREE.Vector3();
let playerOnGround = false;
let playerYaw    = 0;
const PLAYER_SPEED  = 6;
const PLAYER_JUMP   = 8;
const PLAYER_HEIGHT = 1.0;
const PLAYER_RADIUS = 0.4;

function createPlayer() {
  if (playerMesh) { scene.remove(playerMesh); playerMesh=null; }
  // Invisible capsule (visual indicator only in editor)
  const geo = new THREE.CylinderGeometry(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_HEIGHT*2, 12);
  const mat = new THREE.MeshStandardMaterial({
    color:0x00e5ff, roughness:0.3, metalness:0.1,
    transparent:true, opacity: isPlaying ? 0.0 : 0.3,
    wireframe: !isPlaying
  });
  playerMesh = new THREE.Mesh(geo, mat);
  playerMesh.castShadow = false;
  playerMesh.userData = {id:-1, name:'Player', isPlayer:true};
  // Start position: find spawn or use default
  const spawn = objects.find(o=>o.userData.isSpawn);
  if (spawn) playerMesh.position.copy(spawn.position).add(new THREE.Vector3(0,2,0));
  else playerMesh.position.set(0, PLAYER_HEIGHT+1, 5);
  scene.add(playerMesh);
  playerVel.set(0,0,0);
  playerYaw = Math.PI;
  log('🎮 Player tushdi — WASD:yur, Space:sakra, Mouse:bosh', 'lok');
}

function destroyPlayer() {
  if (playerMesh) { scene.remove(playerMesh); playerMesh=null; }
}

// ============================================================
// setPlayerObj — Inspector dan "Oyinchi Qil" bosganda
// ============================================================
window.setPlayerObj = function(obj) {
  // Zaminni oyinchi qilib bo'lmaydi
  if (obj && (obj.userData.type === 'Tekislik' || obj.userData.name === 'Zamin')) {
    log('⚠ Zaminni oyinchi qilib bo\'lmaydi! Boshqa ob\'ekt tanlang.', 'lw');
    return;
  }
  // Oldingi oyinchini tozalash
  objects.forEach(o => { o.userData.isPlayerObj = false; });
  if (obj) {
    obj.userData.isPlayerObj = true;
    log(`🎮 "${obj.userData.name}" — oyinchi qilindi. ▶ O'YNA bosing.`, 'lok');
  }
  updateInspector();
  updateHierarchy();
};

function _showNoPlayerModal() {
  document.getElementById('no-player-modal')?.remove();
  const m = document.createElement('div');
  m.id = 'no-player-modal';
  m.style.cssText = `
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    background:var(--panel);border:1px solid var(--accent3);border-radius:10px;
    padding:24px 28px;z-index:9999;min-width:340px;text-align:center;
    box-shadow:0 8px 48px rgba(0,0,0,.95);font-family:'Rajdhani',sans-serif;
  `;
  m.innerHTML = `
    <div style="font-size:28px;margin-bottom:8px">🎮</div>
    <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:var(--accent3);
      letter-spacing:2px;margin-bottom:12px">OYINCHI YO'Q</div>
    <div style="font-size:12px;color:var(--muted);line-height:1.7;margin-bottom:18px">
      Biror ob'ektni tanlang va<br>
      Inspector → <span style="color:#00e5ff">🎮 Oyinchi Qil</span> tugmasini bosing.<br><br>
      <span style="color:var(--text);font-size:11px">
        Kub, shar, mashina yoki GLB model —<br>
        istalgan ob'ektni oyinchi qilish mumkin.<br>
        Keyin VS orqali harakatlarni belgilang.
      </span>
    </div>
    <div style="display:flex;gap:8px;justify-content:center">
      <button onclick="document.getElementById('no-player-modal').remove()"
        style="background:rgba(0,229,255,.12);border:1px solid rgba(0,229,255,.4);
        color:#00e5ff;padding:7px 20px;border-radius:5px;font-family:'Rajdhani',sans-serif;
        font-size:13px;font-weight:700;cursor:pointer;letter-spacing:1px">Tushunarli</button>
    </div>
  `;
  document.body.appendChild(m);
  // 3s dan keyin o'zi yopilsin
  setTimeout(() => m?.remove(), 6000);
}

// ============================================================
// PlayerController — istalgan ob'ektni WASD bilan boshqarish
// ============================================================
const PlayerController = {
  obj: null,          // boshqarilayotgan ob'ekt
  vel: null,          // THREE.Vector3 tezlik
  camYaw: 0,
  camPitch: 0,
  camMode: 'fps',     // 'fps' | 'third'
  onGround: false,
  keys: {},
  _mouseBound: false,
  _vPressed: false,

  start(obj) {
    this.stop();
    this.obj = obj;
    // YXZ order: Y(kamera burish) avval, X/Z(animatsiya) keyin — qiyashmaslik uchun
    obj.rotation.order = 'YXZ';
    // Fizikani o'chir — PlayerController o'zi boshqaradi
    if (window.removeRapierBody) removeRapierBody(obj);
    this._physicsData = obj.userData.physics ? { ...obj.userData.physics } : null;
    this.vel = new THREE.Vector3();
    this.camYaw   = (playerSettings.camInitYaw ?? 180) * Math.PI / 180;
    this.camPitch = (playerSettings.camInitPitch ?? 0) * Math.PI / 180;
    this.camMode  = 'fps';
    this.onGround = false;
    this.keys     = {};
    this._vPressed = false;

    this._onKey = e => {
      if (!isPlaying) return;
      this.keys[e.code] = true;
      // Alt tugmasi: bodyRotate on/off
      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        e.preventDefault();
        playerSettings.bodyRotate = !playerSettings.bodyRotate;
        const state = playerSettings.bodyRotate ? 'YOQILDI' : 'OCHIRILDI';
        showGameMessage('🔄 Obyekt burilishi: ' + state, playerSettings.bodyRotate ? '#39ff14' : '#ff8844');
      }
      if (['Space','ShiftLeft','ShiftRight','KeyW','KeyA','KeyS','KeyD',
           'ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyV'].includes(e.code)) {
        e.preventDefault(); // sahifaning scrollini to'xtat, boshqa handlerlarga o'tkazamiz
      }
    };
    this._offKey = e => { this.keys[e.code] = false; };
    this._onMouse = e => {
      if (!isPlaying) return;
      // Pointer lock bo'lmasa ham canvas ustida bo'lsa ishlaydi
      if (!document.pointerLockElement && !this._mouseDown) return;
      const mx = e.movementX || 0;
      const my = e.movementY || 0;
      if (mx === 0 && my === 0) return;
      const s = camSensitivity * (this.camMode === 'fps'
        ? (playerSettings.cam1stRotateSpeed ?? 1.0)
        : (playerSettings.cam3rdRotateSpeed ?? 1.0));
      this.camYaw   -= mx * s;
      this.camPitch -= my * s;
      this.camPitch  = Math.max(-1.3, Math.min(1.3, this.camPitch));
    };
    this._onMouseDown = () => { this._mouseDown = true; };
    this._onMouseUp   = () => { this._mouseDown = false; };

    // Scroll kameraga tegmasin — play modeda wheel ni blokla
    this._onWheel = e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      // Animatsiyani shu yerdan trigger qilamiz
      if (window._triggerMouseAnim) {
        const dir = e.deltaY < 0 ? 'wheelup' : 'wheeldown';
        const other = e.deltaY < 0 ? 'wheeldown' : 'wheelup';
        if (window._stopKbAnim) window._stopKbAnim('🖱' + other);
        window._triggerMouseAnim(dir);
      }
    };
    const canvas = document.getElementById('three-canvas');
    if (canvas) canvas.addEventListener('wheel', this._onWheel, { passive: false, capture: true });

    document.addEventListener('keydown',   this._onKey,   { capture: true });
    document.addEventListener('keyup',     this._offKey,  { capture: true });
    document.addEventListener('mousemove',  this._onMouse);
    document.addEventListener('mousedown',  this._onMouseDown);
    document.addEventListener('mouseup',    this._onMouseUp);

    // Pointer lock — faqat foydalanuvchi bosganida
    const c = document.getElementById('three-canvas');
    if (c) {
      this._canvasClick = () => {
        if (isPlaying && document.pointerLockElement !== c) {
          c.requestPointerLock().catch(()=>{});
        }
      };
      c.addEventListener('click', this._canvasClick);
    }

    this._createHUD();
    window._playerControllerRef = this;
    log(`🎮 "${obj.userData.name}" boshqarilmoqda — WASD yur | Space sakra | V kamera | Esc to'xtat`, 'lok');
  },

  stop() {
    if (!this.obj) return;
    if (this._onKey)   document.removeEventListener('keydown',   this._onKey,   { capture: true });
    if (this._offKey)  document.removeEventListener('keyup',     this._offKey,  { capture: true });
    if (this._onMouse)     document.removeEventListener('mousemove',  this._onMouse);
    if (this._onMouseDown) document.removeEventListener('mousedown',  this._onMouseDown);
    if (this._onMouseUp)   document.removeEventListener('mouseup',    this._onMouseUp);
    const c = document.getElementById('three-canvas');
    if (c && this._canvasClick) c.removeEventListener('click', this._canvasClick);
    if (document.pointerLockElement) {
      document.exitPointerLock();
      // exitPointerLock keyin brauzer canvas ga click yuboradi — uni bloklash
      const c2 = document.getElementById('three-canvas');
      if (c2) {
        const blocker = e => { e.stopImmediatePropagation(); e.preventDefault(); };
        c2.addEventListener('click', blocker, { capture: true, once: true });
      }
    }
    // OrbitControls ni qaytarish
    if (window.orbitControls) {
      window.orbitControls.enabled = true;
      window.orbitControls.enableZoom = true;
    }
    if (window.controls) {
      window.controls.enabled = true;
      window.controls.enableZoom = true;
    }
    // Wheel blokni olib tashla
    const canvas = document.getElementById('three-canvas');
    if (canvas && this._onWheel) canvas.removeEventListener('wheel', this._onWheel, { capture: true });
    document.getElementById('pc-hud')?.remove();
    // Fizikani qayta yoq
    if (this.obj && this._physicsData && window.addPhysicsBody) {
      this.obj.userData.physics = this._physicsData;
      addPhysicsBody(this.obj, this._physicsData);
    }
    this.obj  = null;
    this.vel  = null;
    this.keys = {};
    window._playerControllerRef = null;
    camera.position.set(8, 6, 10);
    camera.lookAt(0, 0, 0);
  },


  _createHUD() {
    document.getElementById('pc-hud')?.remove();
    const hud = document.createElement('div');
    hud.id = 'pc-hud';
    hud.style.cssText = `
      position:fixed;bottom:16px;left:50%;transform:translateX(-50%);
      display:flex;gap:8px;z-index:8888;
      font-family:'Share Tech Mono',monospace;pointer-events:auto;
    `;
    hud.innerHTML = `
      <button id="pc-cam-btn" onclick="PlayerController.toggleCam()"
        style="background:rgba(0,0,0,.75);border:1px solid #00e5ff;color:#00e5ff;
        padding:5px 14px;border-radius:4px;font-size:11px;cursor:pointer;letter-spacing:1px">
        👁 1-SHAXS
      </button>
      <div style="background:rgba(0,0,0,.65);border:1px solid var(--border);color:var(--muted);
        padding:5px 12px;border-radius:4px;font-size:10px;line-height:1.5;pointer-events:none">
        WASD yur &nbsp;|&nbsp; Space sakra &nbsp;|&nbsp; V kamera &nbsp;|&nbsp; Shift tez
      </div>
    `;
    document.body.appendChild(hud);
  },

  toggleCam() {
    this.camMode = this.camMode === 'fps' ? 'third' : 'fps';
    const btn = document.getElementById('pc-cam-btn');
    if (btn) btn.textContent = this.camMode === 'fps' ? '👁 1-SHAXS' : '👥 3-SHAXS';
  },

  update(delta) {
    if (!this.obj || !isPlaying) return;
    const o = this.obj;
    const ps = playerSettings;
    const GRAV = -25, JUMP = 10;
    const K = fpsKeys;
    const bk = ps.keys;

    // Yo'nalish — standart: W=oldinga, S=orqaga, A=chapga, D=o'ngga
    const fwd   = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    const right = new THREE.Vector3( Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    const isSprint = K[bk.sprint] || K['ShiftRight'];
    const sprint   = isSprint ? ps.sprintMult : 1.0;

    let moving = false;
    const move = new THREE.Vector3();
    if (K[bk.forward])  { move.add(fwd);   moving = true; }
    if (K[bk.backward]) { move.sub(fwd);   moving = true; }
    if (K[bk.left])     { move.sub(right); moving = true; }
    if (K[bk.right])    { move.add(right); moving = true; }

    const targetSpeed = ps.speed * sprint;

    if (moving) {
      move.normalize();

      // ── Tezlashish rejimi ──────────────────────────────────
      let speedMult = 1;
      if (ps.accelMode === 'instant') {
        speedMult = 1;
        ps._accelT = ps.accelTime; // tayyor
        ps._waveT  = ps.waveDelay;
      } else if (ps.accelMode === 'easein') {
        // Sekin boshlanib tezlashadi
        ps._accelT = Math.min(ps._accelT + delta, ps.accelTime);
        const t = ps.accelTime > 0 ? ps._accelT / ps.accelTime : 1;
        speedMult = t * t; // kvadratik ease-in
      } else if (ps.accelMode === 'easeout') {
        // Tez boshlanib sekinlashadi
        ps._accelT = Math.min(ps._accelT + delta, ps.accelTime);
        const t = ps.accelTime > 0 ? ps._accelT / ps.accelTime : 1;
        speedMult = 1 - (1 - t) * (1 - t); // ease-out
      } else if (ps.accelMode === 'wave') {
        // Kutish, so'ng to'liq tezlik
        ps._waveT = Math.min(ps._waveT + delta, ps.waveDelay);
        const waited = ps.waveDelay > 0 ? ps._waveT / ps.waveDelay : 1;
        ps._accelT = Math.min(ps._accelT + delta, ps.accelTime);
        const t = ps.accelTime > 0 ? ps._accelT / ps.accelTime : 1;
        speedMult = waited * (t * t);
      }

      move.multiplyScalar(targetSpeed * speedMult);
      this.vel.x = move.x;
      this.vel.z = move.z;
      ps._wasMoving = true;
    } else {
      // To'xtaganda timerlarni reset
      if (ps._wasMoving) {
        ps._accelT  = 0;
        ps._waveT   = 0;
        ps._wasMoving = false;
      }
      this.vel.x *= 0.82;
      this.vel.z *= 0.82;
    }

    this.vel.y += GRAV * delta;
    const jumpNow = fpsKeys[bk.jump];
    if (jumpNow && !this._jumpHeld && this.onGround) {
      this.vel.y = JUMP;
      this.onGround = false;
      this._jumpCooldown = 0.15;
    }
    this._jumpHeld = jumpNow;
    if (this._jumpCooldown > 0) this._jumpCooldown -= delta;

    // V — kamera toggle
    if (K[bk.camToggle] && !this._vPressed) { this._vPressed = true; this.toggleCam(); }
    if (!K[bk.camToggle]) this._vPressed = false;

    o.position.x += this.vel.x * delta;
    o.position.z += this.vel.z * delta;
    o.position.y += this.vel.y * delta;

    // ── ZER (cheksiz zamin) ──────────────────────────────────
    const minY = o.scale.y * 0.5;
    if (o.position.y <= minY) {
      o.position.y = minY;
      this.vel.y = 0;
      if (!this._jumpCooldown || this._jumpCooldown <= 0) this.onGround = true;
    } else {
      this.onGround = false;
    }

    // ── OB'EKTLAR BILAN TO'QNASHUV ───────────────────────────
    objects.forEach(obj => {
      if (obj === o) return;
      if (!obj.parent) return;
      if (obj.userData.type === 'Tekislik') return;
      if (obj.userData.isPlayerObj) return;
      if (obj.parent && obj.parent.userData && obj.parent.userData._animProxy === obj) return; // proxy skip
      if (obj.userData._animProxy) return; // proxy owner skip collision with self proxy

      const pHW = o.scale.x * 0.5;
      const pHH = o.scale.y * 0.5;
      const pHD = o.scale.z * 0.5;
      const oHW = obj.scale.x * 0.5;
      const oHH = obj.scale.y * 0.5;
      const oHD = obj.scale.z * 0.5;

      const dx = o.position.x - obj.position.x;
      const dy = o.position.y - obj.position.y;
      const dz = o.position.z - obj.position.z;

      const overlapX = (pHW + oHW) - Math.abs(dx);
      const overlapY = (pHH + oHH) - Math.abs(dy);
      const overlapZ = (pHD + oHD) - Math.abs(dz);

      if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) return;

      // Gorizontal overlap (XZ tekisligida)
      const horizOverlap = Math.min(overlapX, overlapZ);

      // Ustiga chiqish: oyinchi blok tepasidan kelayotsa VA gorizontal overlap kichik bo'lsa
      if (dy > 0 && this.vel.y <= 0 && overlapY < pHH * 0.6) {
        o.position.y = obj.position.y + oHH + pHH;
        this.vel.y = 0;
        if (!this._jumpCooldown || this._jumpCooldown <= 0) this.onGround = true;
        return;
      }

      // Pastdan urilish
      if (dy < 0 && this.vel.y > 0 && overlapY < pHH * 0.6) {
        o.position.y = obj.position.y - oHH - pHH;
        this.vel.y = 0;
        return;
      }

      // Yon to'qnashuv (devorga urilish)
      if (overlapX < overlapZ) {
        o.position.x += dx > 0 ? overlapX : -overlapX;
        this.vel.x = 0;
      } else {
        o.position.z += dz > 0 ? overlapZ : -overlapZ;
        this.vel.z = 0;
      }
    });

    // Ob'ekt kamera bilan birga buriladi
    o.rotation.y = this.camYaw;

    // VS ga reference
    window._playerControllerRef = this;
    window._apexPlayerRef = { group: o, vel: this.vel, onGround: this.onGround,
      camMode: this.camMode, _vsAnim: this._vsAnim,
      glbMixer: o.userData._mixer || null,
      glbClips: o.userData._glbClips || {} };

    // ── KAMERA ──────────────────────────────────────────────
    const pos = o.position;
    // ps already declared above
    // Pitch chegarasi playerSettings dan
    const _pMin1 = (ps.cam1stPitchMin ?? -80) * Math.PI / 180;
    const _pMax1 = (ps.cam1stPitchMax ??  80) * Math.PI / 180;
    const _pMin3 = (ps.cam3rdPitchMin ?? -40) * Math.PI / 180;
    const _pMax3 = (ps.cam3rdPitchMax ??  60) * Math.PI / 180;
    if (this.camMode === 'fps') {
      this.camPitch = Math.max(_pMin1, Math.min(_pMax1, this.camPitch));
      const eyeH    = o.scale.y * 0.5 + 0.1 + (ps.cam1stOffsetY || 0);
      // Oyinchi yo'nalishiga ko'ra yon/oldi offset
      const cosY = Math.cos(this.camYaw), sinY = Math.sin(this.camYaw);
      const ox   = (ps.cam1stOffsetX || 0);
      const oz   = (ps.cam1stOffsetZ || 0);
      camera.position.set(
        pos.x + ox * cosY - oz * sinY,
        pos.y + eyeH,
        pos.z + ox * sinY + oz * cosY
      );
      camera.rotation.order = 'YXZ';
      camera.rotation.set(this.camPitch, this.camYaw, 0);
      // bodyRotate o'chirilgan — ob'ekt burilmaydi
    } else {
      this.camPitch = Math.max(_pMin3, Math.min(_pMax3, this.camPitch));
      const D  = ps.cam3rdDist   || 5;
      const H  = (ps.cam3rdHeight || 2) + o.scale.y * 0.3;
      const ox = ps.cam3rdOffsetX || 0;
      const cp = Math.cos(this.camPitch);
      // Kamera ob'ekt ORQASIDA: fwd=-sin/-cos, shuning uchun orqa=+sin/+cos
      const cx = pos.x + Math.sin(this.camYaw) * D * cp + ox;
      const cy = pos.y + H - Math.sin(this.camPitch) * D;
      const cz = pos.z + Math.cos(this.camYaw) * D * cp;
      camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.14);
      camera.lookAt(pos.x + ox * 0.5, pos.y + o.scale.y * 0.3, pos.z);
    }
  }
};
window.PlayerController = PlayerController;
let _wasOnGround  = true;
let _prevFallVel  = 0;

function updatePlayer(delta) {
  if (!isPlaying || !playerMesh || camMode !== 'fps') return;
  if (carInside) return; // Mashina ichida — player update o'chiriladi
  const gravity = -20 * delta;
  playerVel.y += gravity;

  // Movement
  const fwd   = new THREE.Vector3(-Math.sin(fpsYaw), 0, -Math.cos(fpsYaw));
  const right  = new THREE.Vector3( Math.cos(fpsYaw), 0, -Math.sin(fpsYaw));
  const isRun  = fpsKeys['ShiftLeft'] || fpsKeys['ShiftRight'];
  const spd    = PLAYER_SPEED * (isRun ? 1.7 : 1) * delta;
  const isMove = fpsKeys['KeyW']||fpsKeys['ArrowUp']||fpsKeys['KeyS']||fpsKeys['ArrowDown']||
                 fpsKeys['KeyA']||fpsKeys['ArrowLeft']||fpsKeys['KeyD']||fpsKeys['ArrowRight'];

  if (fpsKeys['KeyW']||fpsKeys['ArrowUp'])    playerVel.x+=fwd.x*spd*8,   playerVel.z+=fwd.z*spd*8;
  if (fpsKeys['KeyS']||fpsKeys['ArrowDown'])  playerVel.x-=fwd.x*spd*8,   playerVel.z-=fwd.z*spd*8;
  if (fpsKeys['KeyA']||fpsKeys['ArrowLeft'])  playerVel.x-=right.x*spd*8, playerVel.z-=right.z*spd*8;
  if (fpsKeys['KeyD']||fpsKeys['ArrowRight']) playerVel.x+=right.x*spd*8, playerVel.z+=right.z*spd*8;

  // ── SAKRASH ──────────────────────────────────────────────────
  if (fpsKeys['Space'] && playerOnGround) {
    playerVel.y = PLAYER_JUMP;
    playerOnGround = false;
    SoundSystem.play('jump', null, { volume: 0.65 });
  }

  // ── QADAM / YUGURISH OVOZI ───────────────────────────────────
  if (playerOnGround && isMove) {
    const stepInterval = isRun ? 0.27 : 0.46;
    _stepTimer += delta;
    if (_stepTimer >= stepInterval) {
      _stepTimer = 0;
      SoundSystem.play('step', null, { volume: isRun ? 0.5 : 0.32 });
    }
  } else if (!isMove) {
    _stepTimer = _stepTimer > 0.15 ? 0 : _stepTimer;
  }

  // Damping
  playerVel.x *= 0.82;
  playerVel.z *= 0.82;

  _prevFallVel = playerVel.y;

  // Move
  playerMesh.position.addScaledVector(playerVel, delta);

  // Ground collision
  const wasOnGround = playerOnGround;
  playerOnGround = false;
  if (playerMesh.position.y <= PLAYER_HEIGHT) {
    playerMesh.position.y = PLAYER_HEIGHT;

    // ── YERGA TUSHISH OVOZI ──────────────────────────────────
    if (!wasOnGround && _prevFallVel < -3) {
      const fallIntensity = Math.min(1, Math.abs(_prevFallVel) / 15);
      SoundSystem.play('land', null, { volume: 0.35 + fallIntensity * 0.55 });
    }

    playerVel.y = 0;
    playerOnGround = true;
    _stepTimer = _stepTimer > 0 ? _stepTimer : 0;
  }

  // Collision with physics objects — mass-based push
  objects.forEach(obj => {
    if (!obj.parent || obj === playerMesh) return;
    const pb = physBodies.find(b => b.mesh === obj);
    if (!pb || pb.isStatic) return;
    const dist = playerMesh.position.distanceTo(obj.position);
    const objR = (obj.scale.x + obj.scale.y + obj.scale.z) / 3 * 0.7;
    if (dist < PLAYER_RADIUS + objR && dist > 0.01) {
      const pushDir = obj.position.clone().sub(playerMesh.position).normalize();
      const overlap = PLAYER_RADIUS + objR - dist;

      // Massani hajmga qarab hisoblash — katta object = og'ir = qiyin siljiydi
      const volume = obj.scale.x * obj.scale.y * obj.scale.z;
      const mass = Math.max(0.5, volume * 2.5); // 0.5 dan kam bo'lmasin
      const pushForce = overlap * 10 / mass;

      pb.vel.addScaledVector(pushDir, pushForce * delta * 5);
      pb.vel.y += (0.8 / mass) * delta;
      pb.angVel.set(
        (Math.random()-.5) * (2 / mass),
        (Math.random()-.5) * (2 / mass),
        (Math.random()-.5) * (2 / mass)
      );
      // Oyinchi ham bir oz orqaga suradi (qaytma kuch)
      playerVel.addScaledVector(pushDir, -overlap * Math.min(1, 1/mass) * 3);
      playImpactSound(Math.min(1, pushForce / 10));
    }
  });

  // Boundary
  const B=22;
  if(playerMesh.position.x > B) {playerMesh.position.x=B; playerVel.x*=-0.3;}
  if(playerMesh.position.x <-B) {playerMesh.position.x=-B;playerVel.x*=-0.3;}
  if(playerMesh.position.z > B) {playerMesh.position.z=B; playerVel.z*=-0.3;}
  if(playerMesh.position.z <-B) {playerMesh.position.z=-B;playerVel.z*=-0.3;}

  // Camera follows player
  const eyeY = playerMesh.position.y + PLAYER_HEIGHT * 0.4;
  camera.position.set(playerMesh.position.x, eyeY, playerMesh.position.z);
  camera.rotation.order='YXZ';
  camera.rotation.y = fpsYaw;
  camera.rotation.x = fpsPitch;

  // Health death
  if (playerMesh.position.y < -15) {
    if (gameState.checkpoint) { SCRIPT_API.respawn(); log('💀 Tushib ketdi — respawn','lw'); }
    else { playerMesh.position.set(0,PLAYER_HEIGHT+1,5); playerVel.set(0,0,0); }
  }

}
