// ============================================================
//  MULTIPLAYER HOOKS — Auto-sync + Collision ruxsati
//  O'zgarishlar:
//   - isObjectLocked tekshiruvi collision'ga to'sqinlik qilmaydi
//   - syncPushedObject remote obyektlarni ham sync qila oladi
//   - trackObjectChanges push velocity'larni hisobga oladi
// ============================================================

// Hook into addObject function
const _originalAddObject = window.addObject;
if (_originalAddObject) {
  window.addObject = function(...args) {
    const result = _originalAddObject.apply(this, args);

    if (window.MultiplayerSystem && MultiplayerSystem.connected && MultiplayerSystem.roomId) {
      const lastObj = objects[objects.length - 1];
      if (lastObj && !lastObj.userData.isRemote && lastObj.userData.id !== undefined) {
        setTimeout(() => {
          MultiplayerSystem.syncObject(lastObj);
          console.log('📤 Object synced to Firebase:', lastObj.userData.name);
        }, 100);
      }
    }

    return result;
  };
}

// Hook into object deletion
const _originalDeleteObject = window.deleteObject;
if (_originalDeleteObject) {
  window.deleteObject = function(obj) {
    if (obj && obj.userData.isRoomOwned) {
      alert('⚠ Room obyektini o\'chirish mumkin emas!');
      return;
    }

    // Collision bilan itarilayotgan obyektni o'chirish mumkin
    // (faqat boshqa foydalanuvchi TAHRIRLAYOTGAN bo'lsa bloklash)
    if (window.MultiplayerSystem && MultiplayerSystem.isObjectLocked(obj.uuid)) {
      // Collision'dan kelib chiqadigan o'chirish emas — foydalanuvchi
      // qo'lda o'chirmoqchi, shuning uchun bloklash to'g'ri
      alert('⚠ Bu obyekt boshqa foydalanuvchi tomonidan tahrilanmoqda!');
      return;
    }

    if (window.MultiplayerSystem && MultiplayerSystem.connected && MultiplayerSystem.roomId) {
      if (obj && !obj.userData.isRoomOwned) {
        MultiplayerSystem.removeObject(obj.uuid);
        MultiplayerSystem.unlockObject(obj.uuid);
      }
    }

    return _originalDeleteObject.apply(this, arguments);
  };
}

// Throttle helper
function throttle(func, delay) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(this, args);
    }
  };
}

let _lastObjectStates = new Map();
let _lockedObjects    = new Set();
let _syncQueue        = new Map();

function trackObjectChanges() {
  if (!window.MultiplayerSystem || !MultiplayerSystem.connected || !MultiplayerSystem.roomId) return;

  objects.forEach(obj => {
    if (obj.userData.isRemote) return;
    if (obj.userData.id === undefined) return;

    const uuid = obj.uuid;
    const isBeingEdited = (selectedObj && selectedObj.uuid === uuid);

    // Lock/unlock — faqat qo'lda tahrirlash uchun
    // Collision push'i lock qo'ymaydi (MultiplayerCollision o'zi sync qiladi)
    const isBeingPushed = window.MultiplayerCollision &&
      !!MultiplayerCollision.getPushVelocities()[uuid];

    if (isBeingEdited && !isBeingPushed && !_lockedObjects.has(uuid)) {
      MultiplayerSystem.lockObject(uuid);
      _lockedObjects.add(uuid);
    } else if (!isBeingEdited && !isBeingPushed && _lockedObjects.has(uuid)) {
      MultiplayerSystem.unlockObject(uuid);
      _lockedObjects.delete(uuid);
    }

    const currentState = {
      px: obj.position.x.toFixed(3),
      py: obj.position.y.toFixed(3),
      pz: obj.position.z.toFixed(3),
      rx: obj.rotation.x.toFixed(3),
      ry: obj.rotation.y.toFixed(3),
      rz: obj.rotation.z.toFixed(3),
      sx: obj.scale.x.toFixed(3),
      sy: obj.scale.y.toFixed(3),
      sz: obj.scale.z.toFixed(3),
      color:   obj.material?.color ? obj.material.color.getHex() : 0,
      visible: obj.visible
    };

    const stateStr  = JSON.stringify(currentState);
    const lastState = _lastObjectStates.get(uuid);

    if (lastState !== stateStr) {
      _lastObjectStates.set(uuid, stateStr);

      const now = Date.now();
      const queueEntry = _syncQueue.get(uuid);

      if (!queueEntry) {
        _syncQueue.set(uuid, { timestamp: now });
        setTimeout(() => {
          if (_syncQueue.get(uuid)) {
            MultiplayerSystem.syncObject(obj);
            _syncQueue.delete(uuid);
          }
        }, 150);
      } else {
        queueEntry.timestamp = now;
      }
    }
  });
}

// Lock indicator (teginish mumkin — sariq rang, tahrirlash — to'q sariq)
function renderLockedIndicators() {
  if (!window.MultiplayerSystem || !MultiplayerSystem.connected) return;

  objects.forEach(obj => {
    if (obj.userData.id === undefined) return;

    const isLocked   = MultiplayerSystem.isObjectLocked(obj.uuid);
    const isPushed   = window.MultiplayerCollision &&
                       !!MultiplayerCollision.getPushVelocities()[obj.uuid];

    // Indicator rang:
    //  🔒 sariq  — boshqa user tahrirlayapti
    //  💥 moviy  — collision bilan itarilayapti
    const indicatorColor = isPushed ? '#00e5ff' : '#ff6b35';
    const indicatorText  = isPushed ? '💥' : '🔒';
    const showIndicator  = isLocked || isPushed;

    if (showIndicator && !obj._lockIndicator) {
      const canvas = document.createElement('canvas');
      canvas.width  = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = indicatorColor;
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(indicatorText, 32, 48);

      const texture  = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture });
      const sprite   = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.5, 0.5, 1);
      sprite.position.y = 2;
      obj.add(sprite);
      obj._lockIndicator = sprite;
    } else if (!showIndicator && obj._lockIndicator) {
      obj.remove(obj._lockIndicator);
      obj._lockIndicator = null;
    } else if (showIndicator && obj._lockIndicator) {
      // Rangni yangilash
      const ctx = obj._lockIndicator.material.map.image.getContext?.('2d');
      // Canvas redraw — texture refresh
      // (sodda yechim: yangilash uchun indicator'ni qayta yaratamiz)
      obj.remove(obj._lockIndicator);
      obj._lockIndicator = null;
    }
  });
}

if (typeof window !== 'undefined') {
  window.trackObjectChanges   = trackObjectChanges;
  window.renderLockedIndicators = renderLockedIndicators;
  console.log('✅ Multiplayer hooks initialized (collision-aware)');
}