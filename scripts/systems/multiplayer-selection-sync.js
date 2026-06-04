// ============================================================
//  MULTIPLAYER SELECTION SYNC
// ============================================================

// Hook into object selection to sync to Firebase
let _lastSelectedUuid = null;

function syncSelectedObject() {
  if (!window.MultiplayerSystem || !MultiplayerSystem.connected || !MultiplayerSystem.roomId) {
    return;
  }

  const currentUuid = selectedObj ? selectedObj.uuid : null;

  // Only update if selection changed
  if (currentUuid !== _lastSelectedUuid) {
    _lastSelectedUuid = currentUuid;

    const userRef = MultiplayerSystem.database.ref(
      `rooms/${MultiplayerSystem.roomId}/users/${MultiplayerSystem.userId}`
    );

    userRef.update({
      selectedObj: currentUuid,
      timestamp: Date.now()
    });
  }
}

// Hook into updateInspector to sync selection
const _originalUpdateInspector = window.updateInspector;
if (_originalUpdateInspector) {
  window.updateInspector = function() {
    const result = _originalUpdateInspector.apply(this, arguments);

    // Sync selection to Firebase
    syncSelectedObject();

    return result;
  };
}

// Sync camera position periodically (for cursor visualization)
let _lastCameraSyncTime = 0;

function syncCameraPosition() {
  if (!window.MultiplayerSystem || !MultiplayerSystem.connected || !MultiplayerSystem.roomId) {
    return;
  }

  const now = Date.now();

  // Throttle: update every 500ms
  if (now - _lastCameraSyncTime < 500) return;
  _lastCameraSyncTime = now;

  const userRef = MultiplayerSystem.database.ref(
    `rooms/${MultiplayerSystem.roomId}/users/${MultiplayerSystem.userId}`
  );

  // Use camera or player position
  let pos = camera.position;

  if (MultiplayerSystem.isPlayerMode && window.player && player.mesh) {
    pos = player.mesh.position;
  }

  userRef.update({
    position: {
      x: parseFloat(pos.x.toFixed(2)),
      y: parseFloat(pos.y.toFixed(2)),
      z: parseFloat(pos.z.toFixed(2))
    }
  });
}

// Add to main loop via interval
setInterval(syncCameraPosition, 500);

console.log('✅ Multiplayer selection sync initialized');
