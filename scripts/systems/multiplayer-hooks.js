// ============================================================
//  MULTIPLAYER HOOKS — Auto-sync objects to Firebase
// ============================================================

// Hook into addObject function
const _originalAddObject = window.addObject;
if (_originalAddObject) {
  window.addObject = function(...args) {
    const result = _originalAddObject.apply(this, args);

    // Sync to Firebase after object is added
    if (window.MultiplayerSystem && MultiplayerSystem.connected && MultiplayerSystem.roomId) {
      // Get the last added object
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
    // Check if object is room-owned (can't delete)
    if (obj && obj.userData.isRoomOwned) {
      alert('⚠ Room obyektini o\'chirish mumkin emas!\n\nBu obyekt barcha foydalanuvchilar uchun.');
      return;
    }

    // Check if object is locked by another user
    if (window.MultiplayerSystem && MultiplayerSystem.isObjectLocked(obj.uuid)) {
      alert('⚠ Bu obyekt boshqa foydalanuvchi tomonidan tahrilanmoqda!\n\nKeyinroq urinib ko\'ring.');
      return;
    }

    // Remove from Firebase before deleting locally
    if (window.MultiplayerSystem && MultiplayerSystem.connected && MultiplayerSystem.roomId) {
      if (obj && !obj.userData.isRemote && !obj.userData.isRoomOwned) {
        MultiplayerSystem.removeObject(obj.uuid);
        MultiplayerSystem.unlockObject(obj.uuid);
        console.log('📤 Object removed from Firebase:', obj.userData.name);
      }
    }

    return _originalDeleteObject.apply(this, arguments);
  };
}

// Throttle function for sync updates
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

// Track object changes in main loop
let _lastObjectStates = new Map();
let _lockedObjects = new Set(); // Objects currently locked by this user
let _syncQueue = new Map(); // Pending syncs with timestamps

function trackObjectChanges() {
  if (!window.MultiplayerSystem || !MultiplayerSystem.connected || !MultiplayerSystem.roomId) {
    return;
  }

  objects.forEach(obj => {
    // Skip remote objects (owned by others)
    if (obj.userData.isRemote) return;

    // Skip invalid objects (no ID means it's not a user-created object)
    if (obj.userData.id === undefined) return;

    const uuid = obj.uuid;

    // Check if being edited (selected)
    const isBeingEdited = (selectedObj && selectedObj.uuid === uuid);

    // Lock/unlock based on selection
    if (isBeingEdited && !_lockedObjects.has(uuid)) {
      // Lock object
      MultiplayerSystem.lockObject(uuid);
      _lockedObjects.add(uuid);
      console.log(' Object locked:', obj.userData.name);
    } else if (!isBeingEdited && _lockedObjects.has(uuid)) {
      // Unlock object
      MultiplayerSystem.unlockObject(uuid);
      _lockedObjects.delete(uuid);
      console.log('🔓 Object unlocked:', obj.userData.name);
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
      color: obj.material?.color ? obj.material.color.getHex() : 0,
      visible: obj.visible
    };

    const stateStr = JSON.stringify(currentState);
    const lastState = _lastObjectStates.get(uuid);

    // If state changed, queue sync to Firebase
    if (lastState !== stateStr) {
      _lastObjectStates.set(uuid, stateStr);

      // Add to sync queue with timestamp
      const now = Date.now();
      const queueEntry = _syncQueue.get(uuid);

      if (!queueEntry) {
        // First change - schedule sync after 150ms
        _syncQueue.set(uuid, { timestamp: now, scheduled: false });

        setTimeout(() => {
          const entry = _syncQueue.get(uuid);
          if (entry) {
            MultiplayerSystem.syncObject(obj);
            _syncQueue.delete(uuid);
          }
        }, 150);
      } else {
        // Update timestamp (extend delay)
        queueEntry.timestamp = now;
      }
    }
  });
}

// Add visual indicator for locked objects
function renderLockedIndicators() {
  if (!window.MultiplayerSystem || !MultiplayerSystem.connected) return;

  objects.forEach(obj => {
    // Skip invalid objects
    if (obj.userData.id === undefined) return;

    const isLocked = MultiplayerSystem.isObjectLocked(obj.uuid);

    // Add or remove lock indicator
    if (isLocked && !obj._lockIndicator) {
      // Create lock icon mesh
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ff6b35';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(' ', 32, 50);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.5, 0.5, 1);
      sprite.position.y = 2;
      obj.add(sprite);
      obj._lockIndicator = sprite;
    } else if (!isLocked && obj._lockIndicator) {
      // Remove lock indicator
      obj.remove(obj._lockIndicator);
      obj._lockIndicator = null;
    }
  });
}

// Add to window
if (typeof window !== 'undefined') {
  window.trackObjectChanges = trackObjectChanges;
  window.renderLockedIndicators = renderLockedIndicators;

  // Call trackObjectChanges in main loop (we'll inject it into main-loop.js via console or patch)
  console.log('✅ Multiplayer hooks initialized');
}
