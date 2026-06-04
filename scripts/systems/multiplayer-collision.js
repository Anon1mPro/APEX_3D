// ============================================================
//  MULTIPLAYER COLLISION v2 — To'liq tuzatilgan
//
//  Tuzatilganlar:
//  1. applyPushVelocities — PlayerMode.update'ga bog'liq emas,
//     o'zining requestAnimationFrame loop'ida ishlaydi
//  2. getAABB — geometry yo'q bo'lsa crash bo'lmaydi (safe)
//  3. Remote user o'z obyektini surganda local collision qayta
//     tekshiriladi (onObjectChanged hook orqali)
//  4. ownerUserId o'zgartirilmaydi — faqat position update
//  5. MultiplayerSmooth bilan konflikt yo'q — pushVelocities
//     faol bo'lganda smooth interpolation o'chiriladi
// ============================================================

const MultiplayerCollision = (() => {
  'use strict';

  const CFG = {
    pushForce:       5,     // Itarish kuchi
    pushDecay:       0.82,  // Ishqalanish (har frameda)
    minPushSpeed:    0.005, // To'xtash chegarasi
    collisionMargin: 0.04,
    syncDelay:       60,    // ms — Firebase throttle
  };

  // uuid → { vx, vy, vz, lastSync }
  const pushVelocities = {};

  let _rafRunning = false;
  let _lastTime   = null;

  // ── SAFE AABB ──────────────────────────────────────────────
  // THREE.Box3.setFromObject geometry bo'lmasa empty box beradi —
  // intersectsBox false qaytaradi, crash bo'lmaydi.
  function getAABB(obj) {
    try {
      return new THREE.Box3().setFromObject(obj);
    } catch (e) {
      // Fallback: position atrofida 1x1x1 box
      const p = obj.position;
      return new THREE.Box3(
        new THREE.Vector3(p.x - 0.5, p.y - 0.5, p.z - 0.5),
        new THREE.Vector3(p.x + 0.5, p.y + 0.5, p.z + 0.5)
      );
    }
  }

  // ── PENETRATION ────────────────────────────────────────────
  function getPenetration(boxA, boxB) {
    if (!boxA.intersectsBox(boxB)) return null;

    const acx = (boxA.max.x + boxA.min.x) / 2;
    const acy = (boxA.max.y + boxA.min.y) / 2;
    const acz = (boxA.max.z + boxA.min.z) / 2;
    const bcx = (boxB.max.x + boxB.min.x) / 2;
    const bcy = (boxB.max.y + boxB.min.y) / 2;
    const bcz = (boxB.max.z + boxB.min.z) / 2;

    const ox = (boxA.max.x - boxA.min.x) / 2 + (boxB.max.x - boxB.min.x) / 2 - Math.abs(acx - bcx);
    const oy = (boxA.max.y - boxA.min.y) / 2 + (boxB.max.y - boxB.min.y) / 2 - Math.abs(acy - bcy);
    const oz = (boxA.max.z - boxA.min.z) / 2 + (boxB.max.z - boxB.min.z) / 2 - Math.abs(acz - bcz);

    let nx = 0, ny = 0, nz = 0, depth = 0;
    if (ox <= oy && ox <= oz) {
      depth = ox + CFG.collisionMargin;
      nx = acx < bcx ? -1 : 1;
    } else if (oz <= ox && oz <= oy) {
      depth = oz + CFG.collisionMargin;
      nz = acz < bcz ? -1 : 1;
    } else {
      depth = oy + CFG.collisionMargin;
      ny = acy < bcy ? -1 : 1;
    }
    return { nx, ny, nz, depth };
  }

  // ── COLLISION CHECK ────────────────────────────────────────
  function checkAndPush(playerObj, delta) {
    if (!playerObj || !window.objects) return;

    const playerBox  = getAABB(playerObj);
    const vel        = playerObj.userData._velocity || { x: 0, y: 0, z: 0 };
    const playerSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);

    objects.forEach(obj => {
      if (obj.uuid === playerObj.uuid) return;
      if (obj.userData.isRoomOwned)    return;  // Yer — o'tkazib yubor

      const objBox = getAABB(obj);
      const pen    = getPenetration(playerBox, objBox);
      if (!pen) return;

      // Player'ni orqaga surish (response)
      playerObj.position.x -= pen.nx * pen.depth * 0.35;
      playerObj.position.y -= pen.ny * pen.depth * 0.35;
      playerObj.position.z -= pen.nz * pen.depth * 0.35;
      playerObj.updateMatrix();

      // Obyektga push velocity berish
      const uuid = obj.uuid;
      if (!pushVelocities[uuid]) {
        pushVelocities[uuid] = { vx: 0, vy: 0, vz: 0, lastSync: 0 };
      }
      const pv = pushVelocities[uuid];
      const fm = Math.max(0.4, Math.min(2.0, playerSpeed / 2.5));

      pv.vx += pen.nx * CFG.pushForce * fm;
      pv.vy += pen.ny * CFG.pushForce * fm * 0.3;
      pv.vz += pen.nz * CFG.pushForce * fm;

      // MultiplayerSmooth — bu obyekt uchun interpolationni to'xtatish
      // (push velocity ishlayotgan vaqtda smooth interferensiyasi bo'ladi)
      if (window.MultiplayerSmooth && MultiplayerSmooth.remoteStates[uuid]) {
        // Target'ni current bilan tenglashtirish — interpolatsiya sakramaydi
        const st = MultiplayerSmooth.remoteStates[uuid];
        st.target.position = { ...st.current.position };
      }

      flashObject(obj);

      // RAF loop'ni ishga tushirish (agar hali ishlamayotgan bo'lsa)
      startRAFLoop();
    });
  }

  // ── RAF LOOP — PlayerMode'dan MUSTAQIL ────────────────────
  // Bu loop har doim ishlaydi (player mode bo'lmasa ham),
  // chunki boshqa user tomonidan itarilgan obyektlar ham
  // shu loop orqali harakatlantiriladi.
  function startRAFLoop() {
    if (_rafRunning) return;
    _rafRunning = true;
    _lastTime   = performance.now();
    requestAnimationFrame(rafStep);
  }

  function rafStep(now) {
    if (Object.keys(pushVelocities).length === 0) {
      // Hech narsa itarilmayapti — to'xtatish
      _rafRunning = false;
      _lastTime   = null;
      return;
    }

    const delta = Math.min((now - (_lastTime || now)) / 1000, 0.1); // max 100ms cap
    _lastTime   = now;

    applyPushVelocities(delta);

    requestAnimationFrame(rafStep);
  }

  // ── APPLY PUSH VELOCITIES ──────────────────────────────────
  function applyPushVelocities(delta) {
    const toDelete = [];
    const nowMs    = Date.now();

    for (const uuid in pushVelocities) {
      const pv    = pushVelocities[uuid];
      const speed = Math.sqrt(pv.vx * pv.vx + pv.vy * pv.vy + pv.vz * pv.vz);

      if (speed < CFG.minPushSpeed) {
        toDelete.push(uuid);
        continue;
      }

      const obj = (window.objects || []).find(o => o.uuid === uuid);
      if (!obj) { toDelete.push(uuid); continue; }

      // Pozitsiyani yangilash
      obj.position.x += pv.vx * delta;
      obj.position.y += pv.vy * delta;
      obj.position.z += pv.vz * delta;
      obj.updateMatrix();
      obj.matrixWorldNeedsUpdate = true;

      // Yer chegarasi — obyektning pastki qismi
      const halfH = 0.5; // taxminiy
      if (obj.position.y < halfH) {
        obj.position.y = halfH;
        pv.vy = 0;
      }

      // Ishqalanish
      pv.vx *= CFG.pushDecay;
      pv.vy *= CFG.pushDecay;
      pv.vz *= CFG.pushDecay;

      // Firebase sync (throttled)
      if (nowMs - pv.lastSync > CFG.syncDelay) {
        pv.lastSync = nowMs;
        syncPushedObject(obj);
      }
    }

    toDelete.forEach(uuid => {
      const obj = (window.objects || []).find(o => o.uuid === uuid);
      if (obj) syncPushedObject(obj); // oxirgi pozitsiya
      delete pushVelocities[uuid];
    });
  }

  // ── FIREBASE SYNC ──────────────────────────────────────────
  // ownerUserId O'ZGARTIRILMAYDI — faqat position
  // Bu muhim: agar o'zgartirilsa, onObjectChanged local user uchun
  // skip qilinmaydi va infinite loop bo'ladi
  function syncPushedObject(obj) {
    if (!window.MultiplayerSystem) return;
    if (!MultiplayerSystem.connected || !MultiplayerSystem.roomId) return;
    const db = MultiplayerSystem.database;
    if (!db) return;

    db.ref(`rooms/${MultiplayerSystem.roomId}/objects/${obj.uuid}`)
      .update({
        position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
        timestamp: Date.now()
        // ownerUserId — qoldiramiz (o'zgartirmaymiz!)
      });
  }

  // ── REMOTE CHANGE HOOK ─────────────────────────────────────
  // Boshqa user o'z obyektini surganda (Firebase'dan kelgan o'zgarish)
  // local collision qayta tekshiriladi.
  // MultiplayerSystem.onObjectChanged() ni patch qilamiz.
  function patchOnObjectChanged() {
    if (!window.MultiplayerSystem) {
      setTimeout(patchOnObjectChanged, 400);
      return;
    }

    const _orig = MultiplayerSystem.onObjectChanged.bind(MultiplayerSystem);
    MultiplayerSystem.onObjectChanged = function(uuid, data) {
      _orig(uuid, data);

      // Agar local player mode faol bo'lsa — remote change keyin
      // collision'ni qayta tekshiramiz (keyingi frameda)
      if (window.MultiplayerPlayerMode && MultiplayerPlayerMode.controlledObject) {
        const playerObj = MultiplayerPlayerMode.controlledObject;
        // Bir frame kechiktirib (smooth update tugagandan keyin)
        requestAnimationFrame(() => {
          checkAndPush(playerObj, 0.016);
          startRAFLoop();
        });
      }
    };

    console.log('✅ MultiplayerCollision: onObjectChanged patched');
  }

  // ── PLAYER MODE PATCH ─────────────────────────────────────
  // PlayerMode.update() da faqat checkAndPush qo'shiladi.
  // applyPushVelocities endi alohida RAF loop'da ishlaydi.
  function patchPlayerModeUpdate() {
    if (!window.MultiplayerPlayerMode) {
      setTimeout(patchPlayerModeUpdate, 400);
      return;
    }

    const _orig = MultiplayerPlayerMode.update.bind(MultiplayerPlayerMode);
    MultiplayerPlayerMode.update = function(delta) {
      _orig(delta);

      const playerObj = this.controlledObject;
      if (!playerObj) return;

      checkAndPush(playerObj, delta);
      // applyPushVelocities — RAF loop'da, bu yerda chaqirilmaydi
    };

    console.log('✅ MultiplayerCollision: PlayerMode.update patched');
  }

  // ── FLASH EFFECT ───────────────────────────────────────────
  function flashObject(obj) {
    if (obj._flashing) return;
    obj._flashing = true;
    const mat = obj.material;
    if (!mat || !mat.color) { obj._flashing = false; return; }
    const orig = mat.color.getHex();
    mat.color.setHex(0xffffff);
    setTimeout(() => { mat.color.setHex(orig); obj._flashing = false; }, 70);
  }

  // ── INIT ───────────────────────────────────────────────────
  function init() {
    patchPlayerModeUpdate();
    patchOnObjectChanged();
    console.log('✅ MultiplayerCollision v2 ready  |  pushForce=' + CFG.pushForce);
  }

  init();

  return {
    setForce(v)  { CFG.pushForce = v; },
    setDecay(v)  { CFG.pushDecay = v; },
    getConfig()  { return { ...CFG }; },
    checkAndPush,
    applyPushVelocities,
    syncPushedObject,
    getPushVelocities() { return pushVelocities; },
    clearAll() {
      Object.keys(pushVelocities).forEach(k => delete pushVelocities[k]);
    }
  };
})();

if (typeof window !== 'undefined') {
  window.MultiplayerCollision = MultiplayerCollision;
}