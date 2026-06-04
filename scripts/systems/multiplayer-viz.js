// ============================================================
//  MULTIPLAYER USER VISUALIZATION — Cursors & Selection Outlines
// ============================================================

const MultiplayerViz = {
  userCursors: {}, // { userId: mesh }
  userOutlines: {}, // { userId: { objUuid, outline } }

  // Initialize
  init() {
    console.log('✅ Multiplayer visualization initialized');
  },

  // Create or update user cursor in 3D space
  updateUserCursor(userId, position, color) {
    let cursor = this.userCursors[userId];

    if (!cursor) {
      // Create new cursor
      const geometry = new THREE.SphereGeometry(0.15, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: color || 0x00e5ff,
        transparent: true,
        opacity: 0.8
      });
      cursor = new THREE.Mesh(geometry, material);
      cursor.userData.isUserCursor = true;
      cursor.userData.userId = userId;

      // Add glow ring
      const ringGeo = new THREE.RingGeometry(0.2, 0.25, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: color || 0x00e5ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      cursor.add(ring);
      cursor._ring = ring;

      scene.add(cursor);
      this.userCursors[userId] = cursor;
    }

    // Update position
    if (position) {
      cursor.position.set(position.x, position.y, position.z);
    }

    // Animate ring
    if (cursor._ring) {
      cursor._ring.rotation.z += 0.02;
      cursor._ring.scale.set(
        1 + Math.sin(Date.now() * 0.003) * 0.2,
        1 + Math.sin(Date.now() * 0.003) * 0.2,
        1
      );
    }
  },

  // Remove user cursor
  removeUserCursor(userId) {
    const cursor = this.userCursors[userId];
    if (cursor) {
      scene.remove(cursor);
      delete this.userCursors[userId];
    }
  },

  // Show outline on object selected by another user
  showUserSelection(userId, objUuid, color) {
    // Remove previous outline for this user
    this.removeUserSelection(userId);

    // Find object
    const obj = objects.find(o => o.uuid === objUuid);
    if (!obj || !obj.geometry) return;

    // Create outline
    const outlineMat = new THREE.MeshBasicMaterial({
      color: color || 0x00e5ff,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.4
    });

    const outline = new THREE.Mesh(obj.geometry.clone(), outlineMat);
    outline.position.copy(obj.position);
    outline.rotation.copy(obj.rotation);
    outline.scale.copy(obj.scale).multiplyScalar(1.1);
    outline.userData.isUserOutline = true;
    outline.userData.userId = userId;
    outline.userData.targetObj = obj;

    scene.add(outline);
    this.userOutlines[userId] = { objUuid, outline };
  },

  // Remove user selection outline
  removeUserSelection(userId) {
    const data = this.userOutlines[userId];
    if (data) {
      scene.remove(data.outline);
      delete this.userOutlines[userId];
    }
  },

  // Update all user outlines (sync with objects)
  updateOutlines() {
    for (const userId in this.userOutlines) {
      const data = this.userOutlines[userId];
      const obj = data.outline.userData.targetObj;

      if (obj) {
        data.outline.position.copy(obj.position);
        data.outline.rotation.copy(obj.rotation);
        data.outline.scale.copy(obj.scale).multiplyScalar(1.1);

        // Pulse effect
        const pulse = 1.1 + Math.sin(Date.now() * 0.004) * 0.02;
        data.outline.scale.multiplyScalar(pulse);
      }
    }
  },

  // Create player avatar (when user is in player mode)
  createPlayerAvatar(userId, position, color, name) {
    let avatar = this.userCursors[userId];

    // Remove cursor if exists
    if (avatar && !avatar.userData.isPlayerAvatar) {
      this.removeUserCursor(userId);
      avatar = null;
    }

    if (!avatar) {
      // Create player capsule
      const geometry = new THREE.CapsuleGeometry(0.3, 1.2, 4, 8);
      const material = new THREE.MeshStandardMaterial({
        color: color || 0x00e5ff,
        emissive: color || 0x00e5ff,
        emissiveIntensity: 0.3
      });
      avatar = new THREE.Mesh(geometry, material);
      avatar.userData.isPlayerAvatar = true;
      avatar.userData.userId = userId;

      // Add name label (sprite)
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color || '#00e5ff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(name || 'Player', 128, 40);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(1, 0.25, 1);
      sprite.position.y = 1.5;
      avatar.add(sprite);
      avatar._nameSprite = sprite;

      scene.add(avatar);
      this.userCursors[userId] = avatar;
    }

    // Update position
    if (position) {
      avatar.position.set(position.x, position.y, position.z);
    }

    // Make sprite always face camera
    if (avatar._nameSprite) {
      avatar._nameSprite.lookAt(camera.position);
    }
  },

  // Update all (called in main loop)
  update() {
    this.updateOutlines();

    // Update cursors (pulse animation)
    for (const userId in this.userCursors) {
      const cursor = this.userCursors[userId];

      // If player avatar, make name sprite face camera
      if (cursor.userData.isPlayerAvatar && cursor._nameSprite) {
        cursor._nameSprite.lookAt(camera.position);
      }
    }
  },

  // Clear all
  clearAll() {
    // Remove cursors
    for (const userId in this.userCursors) {
      this.removeUserCursor(userId);
    }

    // Remove outlines
    for (const userId in this.userOutlines) {
      this.removeUserSelection(userId);
    }
  }
};

// Initialize
if (typeof window !== 'undefined') {
  window.MultiplayerViz = MultiplayerViz;
  MultiplayerViz.init();
}
