// ============================================================
//  MULTIPLAYER ADMIN — Host can customize other players
// ============================================================

const MultiplayerAdmin = {
  isHost: false, // Is current user the room creator?

  // Check if user is host
  checkHostStatus() {
    if (!MultiplayerSystem.connected || !MultiplayerSystem.roomId) return false;

    const roomRef = MultiplayerSystem.database.ref(`rooms/${MultiplayerSystem.roomId}`);

    roomRef.child('createdBy').once('value', (snapshot) => {
      const creatorId = snapshot.val();
      this.isHost = (creatorId === MultiplayerSystem.userId);

      if (this.isHost) {
        console.log('👑 You are the HOST of this room');
      }

      // Update UI to show host badge
      this.updateHostUI();
    });

    return this.isHost;
  },

  // Update UI to show host status
  updateHostUI() {
    const userListEl = document.getElementById('mp-user-list');
    if (!userListEl) return;

    if (this.isHost) {
      // Show host crown in user list
      const userCount = Object.keys(MultiplayerSystem.users).length;
      let html = `<div style="font-size:9px;color:var(--accent3);margin-bottom:5px">
        👑 <b>HOST</b> • ${userCount} foydalanuvchi
      </div>`;

      for (const [uid, user] of Object.entries(MultiplayerSystem.users)) {
        const isMe = uid === MultiplayerSystem.userId;
        const badge = user.isPlayer ? '🎮' : '✏️';
        const hostBadge = isMe ? ' 👑' : '';

        html += `<div style="padding:4px;font-size:10px;color:${user.color};background:rgba(255,255,255,0.03);border-radius:2px;margin-bottom:2px;display:flex;align-items:center;justify-content:space-between">
          <span>${badge} ${user.name} ${isMe ? '(Siz)' : ''}${hostBadge}</span>
          ${!isMe ? `<button onclick="mpAdminCustomize('${uid}')" style="background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.3);color:var(--accent);font-size:8px;padding:2px 6px;border-radius:2px;cursor:pointer">⚙️</button>` : ''}
        </div>`;
      }

      userListEl.innerHTML = html;
    }
  },

  // Show customization modal for a user's player
  showCustomizeModal(userId) {
    if (!this.isHost) {
      alert('⚠ Faqat host boshqalarni customize qila oladi!');
      return;
    }

    const user = MultiplayerSystem.users[userId];
    if (!user) return;

    // Find user's player object
    const playerObj = objects.find(o =>
      o.userData.isRemote &&
      o.userData.ownerUserId === userId
    );

    if (!playerObj) {
      alert('⚠ Bu foydalanuvchi hali obyekt yaratmagan.');
      return;
    }

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'admin-customize-modal';
    modal.className = 'ui-overlay';
    modal.innerHTML = `
      <div class="ui-modal" style="width:350px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="font-family:'Rajdhani',sans-serif;font-size:16px;font-weight:700;color:var(--accent)">
            👑 PLAYER CUSTOMIZE
          </div>
          <button onclick="mpAdminCloseModal()" style="background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer">✕</button>
        </div>

        <div style="padding:8px;background:rgba(0,229,255,0.08);border-radius:4px;margin-bottom:12px">
          <div style="font-size:11px;color:var(--text)">Player: <b>${user.name}</b></div>
          <div style="font-size:9px;color:var(--muted);margin-top:2px">Owner: ${userId}</div>
        </div>

        <div class="comp-block" style="padding:10px;border:1px solid var(--border);border-radius:4px;margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:8px">🎨 RANG</div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px">
            <button onclick="mpAdminSetColor('${userId}','#00e5ff')" style="background:#00e5ff;width:100%;height:32px;border:2px solid var(--border);border-radius:4px;cursor:pointer"></button>
            <button onclick="mpAdminSetColor('${userId}','#ff6b35')" style="background:#ff6b35;width:100%;height:32px;border:2px solid var(--border);border-radius:4px;cursor:pointer"></button>
            <button onclick="mpAdminSetColor('${userId}','#39ff14')" style="background:#39ff14;width:100%;height:32px;border:2px solid var(--border);border-radius:4px;cursor:pointer"></button>
            <button onclick="mpAdminSetColor('${userId}','#cc88ff')" style="background:#cc88ff;width:100%;height:32px;border:2px solid var(--border);border-radius:4px;cursor:pointer"></button>
            <button onclick="mpAdminSetColor('${userId}','#ffcc00')" style="background:#ffcc00;width:100%;height:32px;border:2px solid var(--border);border-radius:4px;cursor:pointer"></button>
            <button onclick="mpAdminSetColor('${userId}','#ff4444')" style="background:#ff4444;width:100%;height:32px;border:2px solid var(--border);border-radius:4px;cursor:pointer"></button>
            <button onclick="mpAdminSetColor('${userId}','#44ff88')" style="background:#44ff88;width:100%;height:32px;border:2px solid var(--border);border-radius:4px;cursor:pointer"></button>
            <button onclick="mpAdminSetColor('${userId}','#8844ff')" style="background:#8844ff;width:100%;height:32px;border:2px solid var(--border);border-radius:4px;cursor:pointer"></button>
            <button onclick="mpAdminSetColor('${userId}','#ffffff')" style="background:#ffffff;width:100%;height:32px;border:2px solid var(--border);border-radius:4px;cursor:pointer"></button>
            <button onclick="mpAdminSetColor('${userId}','#000000')" style="background:#000000;width:100%;height:32px;border:2px solid var(--border);border-radius:4px;cursor:pointer"></button>
          </div>
          <input type="color" id="admin-color-picker" style="width:100%;height:32px;border:1px solid var(--border);border-radius:4px;cursor:pointer;margin-top:6px" onchange="mpAdminSetColor('${userId}', this.value)">
        </div>

        <div class="comp-block" style="padding:10px;border:1px solid var(--border);border-radius:4px;margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:8px">📐 O'LCHAM</div>
          <div style="display:flex;gap:6px;align-items:center">
            <span style="font-size:10px;color:var(--muted);width:40px">Scale:</span>
            <input type="range" id="admin-scale-slider" min="0.5" max="3" step="0.1" value="1" style="flex:1;accent-color:var(--accent)" oninput="mpAdminSetScale('${userId}', parseFloat(this.value))">
            <span id="admin-scale-val" style="font-size:10px;color:var(--accent);width:40px;text-align:right">1.0</span>
          </div>
        </div>

        <div class="comp-block" style="padding:10px;border:1px solid var(--border);border-radius:4px">
          <div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:8px">🎭 MODEL</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
            <button onclick="mpAdminSetShape('${userId}','box')" class="action-btn" style="font-size:10px;padding:6px">📦 Kub</button>
            <button onclick="mpAdminSetShape('${userId}','sphere')" class="action-btn" style="font-size:10px;padding:6px">⚫ Shar</button>
            <button onclick="mpAdminSetShape('${userId}','cylinder')" class="action-btn" style="font-size:10px;padding:6px">🔵 Silindr</button>
            <button onclick="mpAdminSetShape('${userId}','cone')" class="action-btn" style="font-size:10px;padding:6px">🔺 Konus</button>
          </div>
        </div>

        <button onclick="mpAdminCloseModal()" class="del-btn" style="margin-top:12px">❌ Yopish</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Set current scale
    const scaleSlider = document.getElementById('admin-scale-slider');
    if (scaleSlider) {
      scaleSlider.value = playerObj.scale.x;
      document.getElementById('admin-scale-val').textContent = playerObj.scale.x.toFixed(1);
    }
  },

  // Apply color change
  setColor(userId, color) {
    const playerObj = objects.find(o =>
      o.userData.isRemote &&
      o.userData.ownerUserId === userId
    );

    if (playerObj && playerObj.material) {
      playerObj.material.color.set(color);

      // Sync to Firebase
      MultiplayerSystem.database.ref(
        `rooms/${MultiplayerSystem.roomId}/objects/${playerObj.uuid}/color`
      ).set(parseInt(color.replace('#', '0x')));

      console.log('🎨 Color changed for', userId);
    }
  },

  // Apply scale change
  setScale(userId, scale) {
    const playerObj = objects.find(o =>
      o.userData.isRemote &&
      o.userData.ownerUserId === userId
    );

    if (playerObj) {
      playerObj.scale.set(scale, scale, scale);

      // Update UI
      document.getElementById('admin-scale-val').textContent = scale.toFixed(1);

      // Sync to Firebase
      MultiplayerSystem.database.ref(
        `rooms/${MultiplayerSystem.roomId}/objects/${playerObj.uuid}/scale`
      ).set({ x: scale, y: scale, z: scale });

      console.log('📐 Scale changed for', userId, ':', scale);
    }
  },

  // Change shape
  setShape(userId, shape) {
    const playerObj = objects.find(o =>
      o.userData.isRemote &&
      o.userData.ownerUserId === userId
    );

    if (!playerObj) return;

    // Create new geometry
    let geometry;
    if (shape === 'box') geometry = new THREE.BoxGeometry(1, 1, 1);
    else if (shape === 'sphere') geometry = new THREE.SphereGeometry(0.5, 32, 32);
    else if (shape === 'cylinder') geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    else if (shape === 'cone') geometry = new THREE.ConeGeometry(0.5, 1, 32);

    // Replace geometry
    playerObj.geometry.dispose();
    playerObj.geometry = geometry;

    // Sync to Firebase
    MultiplayerSystem.database.ref(
      `rooms/${MultiplayerSystem.roomId}/objects/${playerObj.uuid}/type`
    ).set(geometry.type);

    console.log('🎭 Shape changed for', userId, ':', shape);
  }
};

// Global functions
window.mpAdminCustomize = (userId) => MultiplayerAdmin.showCustomizeModal(userId);
window.mpAdminCloseModal = () => {
  const modal = document.getElementById('admin-customize-modal');
  if (modal) modal.remove();
};
window.mpAdminSetColor = (userId, color) => MultiplayerAdmin.setColor(userId, color);
window.mpAdminSetScale = (userId, scale) => MultiplayerAdmin.setScale(userId, scale);
window.mpAdminSetShape = (userId, shape) => MultiplayerAdmin.setShape(userId, shape);

// Initialize
if (typeof window !== 'undefined') {
  window.MultiplayerAdmin = MultiplayerAdmin;
  console.log('✅ Multiplayer admin initialized');
}
