// ============================================================
//  MULTIPLAYER PLAYER MODE — Object Control in Play Mode
// ============================================================

const MultiplayerPlayerMode = {
  controlledObject: null, // Local player's controlled object
  remotePlayerObjects: {}, // { userId: objId }

  // Make selected object playable (player mode)
  makeObjectPlayer() {
    if (!selectedObj) {
      alert('⚠ Avval obyekt tanlang!');
      return;
    }

    if (selectedObj.userData.isRemote) {
      alert('⚠ Boshqa foydalanuvchining obyektini boshqara olmaysiz!');
      return;
    }

    this.controlledObject = selectedObj;

    // Update Firebase
    if (MultiplayerSystem.connected && MultiplayerSystem.roomId) {
      const userRef = MultiplayerSystem.database.ref(
        `rooms/${MultiplayerSystem.roomId}/users/${MultiplayerSystem.userId}`
      );

      userRef.update({
        isPlayer: true,
        playerObjId: selectedObj.userData.id,
        timestamp: Date.now()
      });
    }

    // Enable player controls
    this.setupPlayerControls();

    console.log('🎮 Player mode activated for:', selectedObj.userData.name);
    alert(`✅ Player mode yoqildi!\n\nObyekt: ${selectedObj.userData.name}\n\nWASD - harakat\nSpace - sakrash`);
  },

  // Exit player mode back to editor
  exitPlayerMode() {
    this.controlledObject = null;

    // Update Firebase
    if (MultiplayerSystem.connected && MultiplayerSystem.roomId) {
      const userRef = MultiplayerSystem.database.ref(
        `rooms/${MultiplayerSystem.roomId}/users/${MultiplayerSystem.userId}`
      );

      userRef.update({
        isPlayer: false,
        playerObjId: null,
        timestamp: Date.now()
      });
    }

    console.log('✏️ Back to editor mode');
  },

  // Setup WASD controls for player object
  setupPlayerControls() {
    if (!this.controlledObject) return;

    // Add velocity userData if not exists
    if (!this.controlledObject.userData._velocity) {
      this.controlledObject.userData._velocity = { x: 0, y: 0, z: 0 };
    }
  },

  // Update player object (called in main loop)
  update(delta) {
    if (!this.controlledObject) return;

    const obj = this.controlledObject;
    const vel = obj.userData._velocity;
    const speed = 5;
    const jumpForce = 8;

    // WASD movement
    const keys = window.keys || {};
    vel.x = 0;
    vel.z = 0;

    if (keys['KeyW']) vel.z = -speed;
    if (keys['KeyS']) vel.z = speed;
    if (keys['KeyA']) vel.x = -speed;
    if (keys['KeyD']) vel.x = speed;

    // Jump
    if (keys['Space'] && obj.position.y <= 0.5) {
      vel.y = jumpForce;
    }

    // Gravity
    vel.y -= 20 * delta;

    // Apply velocity
    obj.position.x += vel.x * delta;
    obj.position.y += vel.y * delta;
    obj.position.z += vel.z * delta;

    // Ground collision
    if (obj.position.y < 0.5) {
      obj.position.y = 0.5;
      vel.y = 0;
    }

    // Camera follow
    if (camera) {
      camera.position.x = obj.position.x;
      camera.position.y = obj.position.y + 2;
      camera.position.z = obj.position.z + 5;
      camera.lookAt(obj.position);
    }

    // Sync to Firebase (throttled)
    if (!obj._syncTimer) {
      obj._syncTimer = Date.now();
    }

    if (Date.now() - obj._syncTimer > 100) {
      obj._syncTimer = Date.now();
      if (MultiplayerSystem.connected) {
        MultiplayerSystem.syncObject(obj);
      }
    }
  },

  // Attempt to control another user's object (creates copy)
  tryControlRemoteObject(obj) {
    if (!obj.userData.isRemote) {
      // Own object, just control it
      this.makeObjectPlayer();
      return;
    }

    // Remote object — ask to create copy
    const confirm = window.confirm(
      `Bu boshqa foydalanuvchining obyekti.\n\nNusxasini yaratib, uni boshqarasizmi?`
    );

    if (!confirm) return;

    // Clone object
    const clone = obj.clone();
    clone.uuid = THREE.MathUtils.generateUUID();
    clone.userData = { ...obj.userData };
    clone.userData.isRemote = false;
    clone.userData.name = obj.userData.name + ' (nusxa)';
    clone.userData.id = objects.length;
    clone.position.x += 2; // Offset to avoid overlap

    scene.add(clone);
    objects.push(clone);
    updateHierarchy();

    // Select and make player
    selectedObj = clone;
    updateInspector();
    this.makeObjectPlayer();

    console.log('📋 Remote object cloned and controlled:', clone.userData.name);
  }
};

// Add to window
if (typeof window !== 'undefined') {
  window.MultiplayerPlayerMode = MultiplayerPlayerMode;
  console.log('✅ Multiplayer player mode initialized');
}
