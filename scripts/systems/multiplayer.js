// ============================================================
//  MULTIPLAYER SYSTEM — Firebase Real-time Collaborative Editor
// ============================================================

const MultiplayerSystem = {
  // Firebase config
  firebaseApp: null,
  database: null,
  roomId: null,
  roomPassword: null, // Room password
  userId: null,
  connected: false,
  isPlayerMode: false,

  // Users in current room
  users: {}, // { userId: { name, color, position, selectedObj, isPlayer, playerObjId } }

  // Lock system — one user per object
  lockedObjects: {}, // { objUuid: userId }

  // Local state
  localColor: null,

  // Init
  init() {
    this.userId = 'user_' + Math.random().toString(36).substr(2, 9);
    this.localColor = this.getRandomColor();
    console.log('✅ Multiplayer system initialized. User ID:', this.userId);
  },

  // Connect to Firebase
  async connect(apiKey, databaseURL) {
    if (this.connected) {
      console.warn('⚠ Already connected');
      return true;
    }

    try {
      // Load Firebase SDK dynamically
      if (!window.firebase) {
        await this.loadFirebaseSDK();
      }

      const firebaseConfig = {
        apiKey: apiKey,
        databaseURL: databaseURL
      };

      // Check if app already exists
      try {
        this.firebaseApp = firebase.app('apex-multiplayer');
        console.log('✅ Using existing Firebase app');
      } catch (e) {
        // App doesn't exist, create new one
        this.firebaseApp = firebase.initializeApp(firebaseConfig, 'apex-multiplayer');
        console.log('✅ Created new Firebase app');
      }

      this.database = firebase.database(this.firebaseApp);

      this.connected = true;
      console.log('✅ Firebase connected:', databaseURL);

      return true;
    } catch (err) {
      console.error('❌ Firebase connection failed:', err);
      alert('Firebase bog\'lanishda xato: ' + err.message);
      return false;
    }
  },

  // Load Firebase SDK
  async loadFirebaseSDK() {
    return new Promise((resolve, reject) => {
      if (window.firebase) { resolve(); return; }

      const script1 = document.createElement('script');
      script1.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
      script1.onload = () => {
        const script2 = document.createElement('script');
        script2.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js';
        script2.onload = resolve;
        script2.onerror = reject;
        document.head.appendChild(script2);
      };
      script1.onerror = reject;
      document.head.appendChild(script1);
    });
  },

  // Disconnect
  disconnect() {
    if (!this.connected) return;

    if (this.roomId) {
      this.leaveRoom();
    }

    if (this.firebaseApp) {
      this.firebaseApp.delete();
      this.firebaseApp = null;
      this.database = null;
    }

    this.connected = false;
    console.log('🔌 Firebase disconnected');
  },

  // Create or join room
  async joinRoom(roomId = null, password = null) {
    if (!this.connected) {
      alert('Avval Firebase\'ga ulaning!');
      return;
    }

    // Generate room ID if not provided
    if (!roomId) {
      roomId = 'room_' + Math.random().toString(36).substr(2, 8).toUpperCase();
    }

    // Check if room exists and validate password
    const roomRef = this.database.ref(`rooms/${roomId}`);
    const roomSnapshot = await roomRef.once('value');
    const roomData = roomSnapshot.val();

    if (roomData) {
      // Room exists - check password
      if (roomData.password) {
        if (password !== roomData.password) {
          alert('❌ Noto\'g\'ri parol!');
          return null;
        }
      }
    } else {
      // New room - set password if provided and create initial ground
      if (password) {
        await roomRef.child('password').set(password);
      }
      await roomRef.child('createdAt').set(Date.now());
      await roomRef.child('createdBy').set(this.userId);

      // Create initial ground object (shared, owned by room)
      const groundData = {
        name: 'Zamin',
        type: 'BoxGeometry',
        position: { x: 0, y: -0.5, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 50, y: 1, z: 50 },
        color: 0x4a5568,
        visible: true,
        ownerUserId: 'room', // Room-owned, not user-owned
        timestamp: Date.now()
      };

      // Use fixed UUID 'ground' so it's not duplicated
      await roomRef.child('objects/ground').set(groundData);
      console.log('✅ Initial ground created with fixed UUID');
    }

    this.roomId = roomId;
    this.roomPassword = password;

    // Join room in Firebase
    const userRef = this.database.ref(`rooms/${roomId}/users/${this.userId}`);

    // Set user data
    await userRef.set({
      name: 'User ' + this.userId.substr(-4),
      color: this.localColor,
      position: { x: 0, y: 0, z: 0 },
      selectedObj: null,
      isPlayer: false,
      playerObjId: null,
      timestamp: Date.now()
    });

    // Listen to room updates
    this.listenToRoom();

    // On disconnect — remove user
    userRef.onDisconnect().remove();

    console.log('✅ Joined room:', roomId);
    this.showRoomInfo();

    return roomId;
  },

  // Leave room
  leaveRoom() {
    if (!this.roomId) return;

    const userRef = this.database.ref(`rooms/${this.roomId}/users/${this.userId}`);
    userRef.remove();

    // Stop listening
    this.database.ref(`rooms/${this.roomId}`).off();

    this.roomId = null;
    this.users = {};
    console.log('👋 Left room');
  },

  // Listen to room changes
  listenToRoom() {
    const roomRef = this.database.ref(`rooms/${this.roomId}`);

    // Listen to users
    roomRef.child('users').on('value', (snapshot) => {
      const newUsers = snapshot.val() || {};

      // Check for removed users
      const oldUserIds = Object.keys(this.users);
      const newUserIds = Object.keys(newUsers);

      oldUserIds.forEach(oldUserId => {
        if (!newUserIds.includes(oldUserId) && oldUserId !== this.userId) {
          // User left - remove their objects
          console.log('👋 User left:', oldUserId);
          this.removeUserObjects(oldUserId);
        }
      });

      this.users = newUsers;
      this.updateUserList();
      this.renderOtherUsers();
    });

    // Listen to objects
    roomRef.child('objects').on('child_added', (snapshot) => {
      this.onObjectAdded(snapshot.key, snapshot.val());
    });

    roomRef.child('objects').on('child_changed', (snapshot) => {
      this.onObjectChanged(snapshot.key, snapshot.val());
    });

    roomRef.child('objects').on('child_removed', (snapshot) => {
      this.onObjectRemoved(snapshot.key);
    });

    // Listen to locks
    roomRef.child('locks').on('value', (snapshot) => {
      this.lockedObjects = snapshot.val() || {};
    });
  },

  // Remove all objects belonging to a user
  removeUserObjects(userId) {
    // Don't remove room-owned objects
    if (userId === 'room') return;

    const userObjects = objects.filter(o =>
      o.userData.ownerUserId === userId &&
      o.userData.ownerUserId !== 'room'
    );

    userObjects.forEach(obj => {
      scene.remove(obj);
      const idx = objects.indexOf(obj);
      if (idx !== -1) objects.splice(idx, 1);

      // Clean up interpolation state
      if (window.MultiplayerSmooth && MultiplayerSmooth.remoteStates[obj.uuid]) {
        delete MultiplayerSmooth.remoteStates[obj.uuid];
      }

      console.log('🗑 Removed object from disconnected user:', obj.userData.name);
    });

    if (userObjects.length > 0) {
      updateHierarchy();
      if (selectedObj && userObjects.includes(selectedObj)) {
        selectedObj = null;
        updateInspector();
      }
    }
  },

  // Sync local object to Firebase
  syncObject(obj) {
    if (!this.connected || !this.roomId) return;

    const objRef = this.database.ref(`rooms/${this.roomId}/objects/${obj.uuid}`);

    objRef.set({
      name: obj.userData.name || 'Object',
      type: obj.geometry?.type || 'Mesh',
      position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
      rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
      scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
      color: obj.material?.color ? obj.material.color.getHex() : 0xffffff,
      visible: obj.visible,
      ownerUserId: this.userId,
      timestamp: Date.now()
    });
  },

  // Remove object from Firebase
  removeObject(uuid) {
    if (!this.connected || !this.roomId) return;
    this.database.ref(`rooms/${this.roomId}/objects/${uuid}`).remove();
  },

  // Object added by another user
  onObjectAdded(uuid, data) {
    // Skip own objects
    if (data.ownerUserId === this.userId) return;

    // Check if object already exists locally (avoid duplicates)
    const existing = objects.find(o => o.uuid === uuid);
    if (existing) {
      console.log('⚠ Object already exists, skipping:', uuid);
      return;
    }

    // Create object based on type
    let geometry;
    if (data.type.includes('Box')) geometry = new THREE.BoxGeometry(1, 1, 1);
    else if (data.type.includes('Sphere')) geometry = new THREE.SphereGeometry(0.5, 32, 32);
    else if (data.type.includes('Cylinder')) geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    else geometry = new THREE.BoxGeometry(1, 1, 1); // Default

    const material = new THREE.MeshStandardMaterial({ color: data.color || 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(data.position.x, data.position.y, data.position.z);
    mesh.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
    mesh.scale.set(data.scale.x, data.scale.y, data.scale.z);
    mesh.visible = data.visible;

    // Use Firebase key as UUID (important for 'ground' to have fixed UUID)
    mesh.uuid = uuid;

    mesh.userData = {
      name: data.name,
      id: objects.length,
      isRemote: data.ownerUserId !== 'room', // Room objects are not "remote"
      isRoomOwned: data.ownerUserId === 'room', // Mark room-owned objects
      ownerUserId: data.ownerUserId
    };

    scene.add(mesh);
    objects.push(mesh);

    // Initialize smooth interpolation state (only for user objects)
    if (window.MultiplayerSmooth && data.ownerUserId !== 'room') {
      MultiplayerSmooth.updateRemoteTarget(uuid, data);
    }

    updateHierarchy();
    console.log('➕ Object added:', data.name, '(UUID:', uuid, ', Owner:', data.ownerUserId + ')');
  },

  // Object changed by another user
  onObjectChanged(uuid, data) {
    if (data.ownerUserId === this.userId) return; // Skip own changes

    const obj = objects.find(o => o.uuid === uuid);
    if (!obj) return;

    // Use smooth interpolation instead of direct set
    if (window.MultiplayerSmooth) {
      MultiplayerSmooth.updateRemoteTarget(uuid, data);
    } else {
      // Fallback: direct update (laggy)
      obj.position.set(data.position.x, data.position.y, data.position.z);
      obj.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
      obj.scale.set(data.scale.x, data.scale.y, data.scale.z);
    }

    obj.visible = data.visible;

    if (obj.material && obj.material.color) {
      obj.material.color.setHex(data.color);
    }

    if (selectedObj && selectedObj.uuid === uuid) {
      updateInspector();
    }
  },

  // Object removed by another user
  onObjectRemoved(uuid) {
    const obj = objects.find(o => o.uuid === uuid);
    if (!obj) return;

    scene.remove(obj);
    const idx = objects.indexOf(obj);
    if (idx !== -1) objects.splice(idx, 1);

    if (selectedObj && selectedObj.uuid === uuid) {
      selectedObj = null;
      updateInspector();
    }

    updateHierarchy();
    console.log('➖ Remote object removed');
  },

  // Lock object (for editing)
  lockObject(uuid) {
    if (!this.connected || !this.roomId) return;

    const lockRef = this.database.ref(`rooms/${this.roomId}/locks/${uuid}`);
    lockRef.set(this.userId);
  },

  // Unlock object
  unlockObject(uuid) {
    if (!this.connected || !this.roomId) return;

    const lockRef = this.database.ref(`rooms/${this.roomId}/locks/${uuid}`);
    lockRef.remove();
  },

  // Check if object is locked by another user
  isObjectLocked(uuid) {
    const lockUserId = this.lockedObjects[uuid];
    return lockUserId && lockUserId !== this.userId;
  },

  // Toggle player mode
  togglePlayerMode() {
    this.isPlayerMode = !this.isPlayerMode;

    if (this.connected && this.roomId) {
      const userRef = this.database.ref(`rooms/${this.roomId}/users/${this.userId}`);
      userRef.update({ isPlayer: this.isPlayerMode });
    }

    console.log('🎮 Player mode:', this.isPlayerMode ? 'ON' : 'OFF');
  },

  // Update user list UI
  updateUserList() {
    const userListEl = document.getElementById('mp-user-list');
    if (!userListEl) return;

    // Check if current user is host and update UI accordingly
    if (window.MultiplayerAdmin) {
      MultiplayerAdmin.checkHostStatus();
      // Admin will update UI
    } else {
      // Default UI (non-admin)
      const userCount = Object.keys(this.users).length;
      let html = `<div style="font-size:9px;color:var(--muted);margin-bottom:5px">${userCount} foydalanuvchi</div>`;

      for (const [uid, user] of Object.entries(this.users)) {
        const isMe = uid === this.userId;
        const badge = user.isPlayer ? '🎮' : '✏️';
        html += `<div style="padding:4px;font-size:10px;color:${user.color};background:rgba(255,255,255,0.03);border-radius:2px;margin-bottom:2px">
          ${badge} ${user.name} ${isMe ? '(Siz)' : ''}
        </div>`;
      }

      userListEl.innerHTML = html;
    }
  },

  // Render other users' cursors/selections
  renderOtherUsers() {
    if (!window.MultiplayerViz) return;

    for (const [uid, user] of Object.entries(this.users)) {
      if (uid === this.userId) continue; // Skip self

      // Show cursor or player avatar
      if (user.isPlayer && user.playerObjId) {
        // Player mode — find player object and show avatar there
        const playerObj = objects.find(o => o.userData.id === user.playerObjId);
        if (playerObj) {
          MultiplayerViz.createPlayerAvatar(uid, playerObj.position, user.color, user.name);
        }
      } else if (user.position) {
        // Editor mode — show cursor
        MultiplayerViz.updateUserCursor(uid, user.position, user.color);
      }

      // Show selected object outline
      if (user.selectedObj) {
        MultiplayerViz.showUserSelection(uid, user.selectedObj, user.color);
      } else {
        MultiplayerViz.removeUserSelection(uid);
      }
    }

    // Remove cursors for users who left
    Object.keys(MultiplayerViz.userCursors).forEach(uid => {
      if (!this.users[uid]) {
        MultiplayerViz.removeUserCursor(uid);
      }
    });
  },

  // Show room info
  showRoomInfo() {
    const infoEl = document.getElementById('mp-room-info');
    if (infoEl) {
      infoEl.innerHTML = `<div style="color:var(--accent3);font-size:10px">
        🔗 Room ID: <b>${this.roomId}</b>
      </div>`;
    }
  },

  // Random color generator
  getRandomColor() {
    const colors = ['#00e5ff', '#ff6b35', '#39ff14', '#cc88ff', '#ffcc00', '#ff4444', '#44ff88'];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  // Download current scene
  downloadScene() {
    const sceneData = {
      roomId: this.roomId,
      timestamp: Date.now(),
      objects: objects.map(o => ({
        name: o.userData.name,
        type: o.geometry?.type,
        position: { x: o.position.x, y: o.position.y, z: o.position.z },
        rotation: { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z },
        scale: { x: o.scale.x, y: o.scale.y, z: o.scale.z },
        color: o.material?.color ? o.material.color.getHex() : 0xffffff,
        visible: o.visible
      }))
    };

    const json = JSON.stringify(sceneData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `apex_multiplayer_${this.roomId}_${Date.now()}.json`;
    a.click();

    console.log('💾 Scene downloaded');
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  window.MultiplayerSystem = MultiplayerSystem;
  MultiplayerSystem.init();
}
