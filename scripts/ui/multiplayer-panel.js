// ============================================================
//  MULTIPLAYER PANEL — Inspector ichida Online menyu
// ============================================================

function showMultiplayerPanel() {
  const mp = MultiplayerSystem;

  // Load saved credentials
  const savedCreds = MultiplayerStorage.loadCredentials();
  const apiKeyVal = savedCreds ? savedCreds.apiKey : '';
  const dbUrlVal = savedCreds ? savedCreds.dbUrl : '';

  // Load saved rooms
  const myRooms = MultiplayerStorage.getRooms();

  const html = `
    <div style="padding:10px">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
        <span style="font-size:16px">🌐</span>
        <span style="font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;color:var(--accent)">ONLINE MULTIPLAYER</span>
      </div>

      <!-- Connection Status -->
      <div id="mp-status" style="padding:6px;background:rgba(255,107,53,0.1);border:1px solid rgba(255,107,53,0.3);border-radius:3px;margin-bottom:10px;font-size:10px;color:#ff6b35">
        ⚠ Ulanmagan
      </div>

      <!-- Firebase Config -->
      <div id="mp-config-section">
        <div class="comp-title" style="margin-bottom:6px">
          <span>🔑 FIREBASE KONFIGURATSIYA</span>
        </div>

        <div class="fr">
          <div class="fl">API Key</div>
          <input type="text" class="fv" id="mp-api-key" placeholder="AIzaSy..." style="flex:1" value="${apiKeyVal}">
        </div>

        <div class="fr">
          <div class="fl">Database</div>
          <input type="text" class="fv" id="mp-db-url" placeholder="https://...firebaseio.com" style="flex:1" value="${dbUrlVal}">
        </div>

        <div style="display:flex;gap:4px;margin-top:6px">
          <button class="action-btn" onclick="mpConnect()" style="flex:1">
            🔗 Connect
          </button>
          ${savedCreds ? `<button onclick="mpClearCredentials()" style="background:none;border:1px solid var(--border);color:var(--muted);font-size:11px;padding:4px 8px;border-radius:3px;cursor:pointer" title="Ma'lumotlarni o'chirish">🗑</button>` : ''}
        </div>

        <div style="font-size:8px;color:var(--muted);margin-top:6px;line-height:1.6;padding:6px;background:rgba(0,0,0,0.2);border-radius:3px">
          Firebase Console'dan Realtime Database yarating va bu ma'lumotlarni kiriting.
          <a href="https://console.firebase.google.com" target="_blank" style="color:var(--accent)">console.firebase.google.com</a>
        </div>
      </div>

      <!-- My Rooms Section -->
      ${myRooms.length > 0 ? `
      <div id="mp-my-rooms-section" style="margin-top:12px">
        <div class="comp-title" style="margin-bottom:6px">
          <span>📂 MY ROOMS</span>
          <button onclick="mpClearMyRooms()" style="margin-left:auto;background:none;border:1px solid var(--border);color:var(--muted);font-size:8px;padding:2px 6px;border-radius:2px;cursor:pointer" title="Hammasini o'chirish">🗑 Tozalash</button>
        </div>
        <div style="max-height:150px;overflow-y:auto">
          ${myRooms.map(room => `
            <div class="asset-lib-item" style="margin-bottom:3px;display:flex;align-items:center;gap:6px;justify-content:space-between">
              <div style="flex:1;min-width:0">
                <div style="font-size:10px;color:var(--text);font-family:'Share Tech Mono',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${room.roomId}</div>
                <div style="font-size:8px;color:var(--muted)">${room.password ? '🔒 Parolli' : '🔓 Parolsiz'} • ${new Date(room.lastUsed).toLocaleDateString()}</div>
              </div>
              <button onclick="mpQuickJoin('${room.roomId}', '${room.password || ''}')" style="background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.3);color:var(--accent);font-size:9px;padding:3px 8px;border-radius:2px;cursor:pointer;white-space:nowrap">Join</button>
              <button onclick="mpDeleteRoom('${room.roomId}')" style="background:none;border:1px solid var(--border);color:var(--red);font-size:9px;padding:3px 6px;border-radius:2px;cursor:pointer">✕</button>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Room Section (hidden until connected) -->
      <div id="mp-room-section" style="display:none">
        <div class="comp-title" style="margin-bottom:6px;margin-top:12px">
          <span>🚪 ROOM BOSHQARISH</span>
        </div>

        <div id="mp-room-info" style="padding:6px;background:rgba(57,255,20,0.08);border:1px solid rgba(57,255,20,0.3);border-radius:3px;margin-bottom:8px;font-size:9px;color:var(--accent3);cursor:pointer;user-select:text" title="Bosib nusxalash" onclick="mpCopyRoomId()">
          Roomga qo'shilmagan
        </div>

        <div style="display:flex;gap:4px;margin-bottom:8px">
          <button class="action-btn" onclick="mpCreateRoomPrompt()" style="flex:1;font-size:11px;padding:6px">
            ➕ Room Yaratish
          </button>
          <button class="action-btn" onclick="mpJoinRoomPrompt()" style="flex:1;font-size:11px;padding:6px;background:rgba(204,136,255,0.08);border-color:rgba(204,136,255,0.2);color:var(--accent4)">
            🔗 Qo'shilish
          </button>
        </div>

        <button class="del-btn" onclick="mpLeaveRoom()" id="mp-leave-btn" style="display:none">
          👋 Roomdan Chiqish
        </button>

        <!-- User List -->
        <div id="mp-user-list-container" style="display:none;margin-top:10px">
          <div class="comp-title" style="margin-bottom:6px">
            <span>👥 FOYDALANUVCHILAR</span>
          </div>
          <div id="mp-user-list"></div>
        </div>

        <!-- Player Mode Toggle -->
        <div id="mp-player-section" style="display:none;margin-top:12px">
          <div class="comp-title" style="margin-bottom:6px">
            <span>🎮 PLAYER MODE</span>
          </div>

          <div style="background:rgba(0,229,255,0.05);padding:8px;border-radius:4px;border:1px solid rgba(0,229,255,0.15)">
            <div style="font-size:9px;color:var(--muted);margin-bottom:6px;line-height:1.6">
              Player modega o'tsangiz, boshqa foydalanuvchilar sizni 3D sahnada ko'radi. Obyektni tanlang va Player qiling.
            </div>
            <button class="action-btn" onclick="mpTogglePlayerMode()" id="mp-player-toggle-btn">
              🎮 Become Player
            </button>
          </div>
        </div>

        <!-- Download Scene -->
        <div id="mp-download-section" style="display:none;margin-top:12px">
          <div class="comp-title" style="margin-bottom:6px">
            <span>💾 EXPORT</span>
          </div>
          <button class="action-btn" onclick="mpDownloadScene()" style="background:rgba(255,204,0,0.08);border-color:rgba(255,204,0,0.3);color:#ffcc00">
            ⬇ Sahnani Yuklab Olish
          </button>
        </div>
      </div>

      <!-- Disconnect Button (shown when connected) -->
      <button class="del-btn" onclick="mpDisconnect()" id="mp-disconnect-btn" style="display:none;margin-top:12px">
        🔌 Disconnect
      </button>
    </div>
  `;

  // Replace inspector content
  const inspectorContent = document.getElementById('inspector-content');
  inspectorContent.innerHTML = html;

  // Update status if already connected
  if (mp.connected) {
    mpUpdateUI();
  }
}

// Connect to Firebase
async function mpConnect() {
  const apiKey = document.getElementById('mp-api-key').value.trim();
  const dbUrl = document.getElementById('mp-db-url').value.trim();

  if (!apiKey || !dbUrl) {
    alert('⚠ API Key va Database URL kiriting!');
    return;
  }

  const statusEl = document.getElementById('mp-status');
  statusEl.innerHTML = '⏳ Ulanmoqda...';
  statusEl.style.background = 'rgba(255,204,0,0.1)';
  statusEl.style.borderColor = 'rgba(255,204,0,0.3)';
  statusEl.style.color = '#ffcc00';

  const success = await MultiplayerSystem.connect(apiKey, dbUrl);

  if (success) {
    // Save credentials to localStorage
    MultiplayerStorage.saveCredentials(apiKey, dbUrl);

    statusEl.innerHTML = '✅ Ulandi!';
    statusEl.style.background = 'rgba(57,255,20,0.1)';
    statusEl.style.borderColor = 'rgba(57,255,20,0.3)';
    statusEl.style.color = 'var(--accent3)';

    // Show room section
    document.getElementById('mp-config-section').style.display = 'none';
    const myRoomsSection = document.getElementById('mp-my-rooms-section');
    if (myRoomsSection) myRoomsSection.style.display = 'none';
    document.getElementById('mp-room-section').style.display = 'block';
    document.getElementById('mp-disconnect-btn').style.display = 'block';

    console.log('✅ Multiplayer connected');
  } else {
    statusEl.innerHTML = '❌ Ulanish xatosi!';
    statusEl.style.background = 'rgba(255,68,68,0.1)';
    statusEl.style.borderColor = 'rgba(255,68,68,0.3)';
    statusEl.style.color = 'var(--red)';
  }
}

// Clear saved credentials
function mpClearCredentials() {
  if (!confirm('Firebase ma\'lumotlarini o\'chirish?')) return;

  MultiplayerStorage.clearCredentials();
  document.getElementById('mp-api-key').value = '';
  document.getElementById('mp-db-url').value = '';

  // Refresh panel
  showMultiplayerPanel();
}

// Quick join from My Rooms
async function mpQuickJoin(roomId, password) {
  // Connect first if not connected
  if (!MultiplayerSystem.connected) {
    const creds = MultiplayerStorage.loadCredentials();
    if (!creds) {
      alert('⚠ Avval Firebase\'ga ulaning!');
      return;
    }

    await MultiplayerSystem.connect(creds.apiKey, creds.dbUrl);

    // Show room section
    document.getElementById('mp-config-section').style.display = 'none';
    const myRoomsSection = document.getElementById('mp-my-rooms-section');
    if (myRoomsSection) myRoomsSection.style.display = 'none';
    document.getElementById('mp-room-section').style.display = 'block';
    document.getElementById('mp-disconnect-btn').style.display = 'block';
  }

  // Join room
  await MultiplayerSystem.joinRoom(roomId, password || null);
  mpUpdateUI();
}

// Delete room from My Rooms
function mpDeleteRoom(roomId) {
  if (!confirm(`Room "${roomId}" ni o'chirish?`)) return;

  MultiplayerStorage.removeRoom(roomId);

  // Refresh panel
  showMultiplayerPanel();
}

// Clear all My Rooms
function mpClearMyRooms() {
  if (!confirm('Barcha saqlangan roomlarni o\'chirish?')) return;

  MultiplayerStorage.clearRooms();

  // Refresh panel
  showMultiplayerPanel();
}

// Disconnect
function mpDisconnect() {
  if (!confirm('Firebase\'dan uzilishni xohlaysizmi?')) return;

  MultiplayerSystem.disconnect();

  // Reset UI
  document.getElementById('mp-config-section').style.display = 'block';
  document.getElementById('mp-room-section').style.display = 'none';
  document.getElementById('mp-disconnect-btn').style.display = 'none';

  const statusEl = document.getElementById('mp-status');
  statusEl.innerHTML = '⚠ Ulanmagan';
  statusEl.style.background = 'rgba(255,107,53,0.1)';
  statusEl.style.borderColor = 'rgba(255,107,53,0.3)';
  statusEl.style.color = '#ff6b35';

  console.log('🔌 Disconnected');
}

// Create new room with custom ID and password
async function mpCreateRoomPrompt() {
  const customId = prompt('Room ID kiriting (bo\'sh qoldiring = avtomatik):\n\nMasalan: MyRoom, Game123, va h.k.');

  let roomId;
  if (customId && customId.trim()) {
    // Use custom ID
    roomId = customId.trim().replace(/[^a-zA-Z0-9_-]/g, ''); // Clean ID
    if (!roomId) {
      alert('⚠ Noto\'g\'ri ID! Faqat harflar, raqamlar, _ va - ishlatiladi.');
      return;
    }
  }

  // Ask for password (optional)
  const password = prompt('Room paroli (ixtiyoriy, bo\'sh qoldirsa parolsiz):');

  // Create room
  const finalRoomId = await MultiplayerSystem.joinRoom(roomId, password?.trim() || null);

  if (finalRoomId) {
    // Save to My Rooms
    MultiplayerStorage.saveRoom(finalRoomId, password?.trim() || null);

    mpUpdateUI();

    // Show success message with copy option
    const msg = password
      ? `✅ Room yaratildi!\n\nRoom ID: ${finalRoomId}\nParol: ${password}\n\nBu ma'lumotlarni boshqalarga ulashing.`
      : `✅ Room yaratildi!\n\nRoom ID: ${finalRoomId}\n\nBu ID ni boshqalarga ulashing.`;

    alert(msg);

    // Auto copy to clipboard
    mpCopyRoomId();
  }
}

// Copy room ID to clipboard
function mpCopyRoomId() {
  if (!MultiplayerSystem.roomId) {
    alert('⚠ Avval roomga qo\'shiling!');
    return;
  }

  const roomId = MultiplayerSystem.roomId;
  const password = MultiplayerSystem.roomPassword || '';

  const textToCopy = password
    ? `Room ID: ${roomId}\nParol: ${password}`
    : `Room ID: ${roomId}`;

  // Copy to clipboard
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      // Show toast notification
      const toast = document.createElement('div');
      toast.style.cssText = `
        position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
        background:var(--accent3); color:#000; padding:8px 16px;
        border-radius:4px; font-family:'Rajdhani',sans-serif;
        font-size:12px; font-weight:700; z-index:99999;
        box-shadow:0 4px 12px rgba(0,0,0,0.5);
        animation: fadeInOut 2s forwards;
      `;
      toast.textContent = '✓ Nusxalandi!';
      document.body.appendChild(toast);

      setTimeout(() => toast.remove(), 2000);
    }).catch(() => {
      // Fallback
      prompt('Room ID (Ctrl+C bilan nusxalang):', textToCopy);
    });
  } else {
    // Old browser fallback
    prompt('Room ID (Ctrl+C bilan nusxalang):', textToCopy);
  }
}

// Join existing room with password
async function mpJoinRoomPrompt() {
  const roomId = prompt('Room ID kiriting:');

  if (!roomId || !roomId.trim()) {
    return;
  }

  // Ask for password if room is protected
  const password = prompt('Parol (agar parolsiz bo\'lsa, bo\'sh qoldiring):');

  const success = await MultiplayerSystem.joinRoom(roomId.trim(), password?.trim() || null);

  if (success) {
    // Save to My Rooms
    MultiplayerStorage.saveRoom(roomId.trim(), password?.trim() || null);
    mpUpdateUI();
  }
}

// Leave room
function mpLeaveRoom() {
  if (!confirm('Roomdan chiqishni xohlaysizmi?')) return;

  MultiplayerSystem.leaveRoom();
  mpUpdateUI();
}

// Toggle player mode
function mpTogglePlayerMode() {
  if (!MultiplayerPlayerMode.controlledObject) {
    // Enter player mode
    MultiplayerPlayerMode.makeObjectPlayer();
  } else {
    // Exit player mode
    MultiplayerPlayerMode.exitPlayerMode();
  }

  const btn = document.getElementById('mp-player-toggle-btn');
  if (MultiplayerPlayerMode.controlledObject) {
    btn.textContent = '✏️ Back to Editor';
    btn.style.background = 'rgba(255,107,53,0.1)';
    btn.style.borderColor = 'rgba(255,107,53,0.3)';
    btn.style.color = 'var(--accent2)';
  } else {
    btn.textContent = '🎮 Become Player';
    btn.style.background = 'rgba(0,229,255,0.08)';
    btn.style.borderColor = 'rgba(0,229,255,0.2)';
    btn.style.color = 'var(--accent)';
  }
}

// Download scene
function mpDownloadScene() {
  MultiplayerSystem.downloadScene();
  alert('💾 Sahna yuklab olindi!');
}

// Update UI state
function mpUpdateUI() {
  const mp = MultiplayerSystem;

  // Room info
  const infoEl = document.getElementById('mp-room-info');
  if (mp.roomId) {
    const passwordInfo = mp.roomPassword ? ` 🔒 Parol: ${mp.roomPassword}` : ' 🔓 Parolsiz';
    infoEl.innerHTML = `🔗 Room ID: <b style="color:var(--accent3)">${mp.roomId}</b>${passwordInfo}<br><span style="font-size:8px;color:var(--muted)">▲ Bosib nusxalash</span>`;
    infoEl.style.display = 'block';
    document.getElementById('mp-leave-btn').style.display = 'block';
    document.getElementById('mp-user-list-container').style.display = 'block';
    document.getElementById('mp-player-section').style.display = 'block';
    document.getElementById('mp-download-section').style.display = 'block';
  } else {
    infoEl.innerHTML = 'Roomga qo\'shilmagan';
    infoEl.style.display = 'block';
    document.getElementById('mp-leave-btn').style.display = 'none';
    document.getElementById('mp-user-list-container').style.display = 'none';
    document.getElementById('mp-player-section').style.display = 'none';
    document.getElementById('mp-download-section').style.display = 'none';
  }
}

// Add to window
if (typeof window !== 'undefined') {
  window.showMultiplayerPanel = showMultiplayerPanel;
  window.mpConnect = mpConnect;
  window.mpDisconnect = mpDisconnect;
  window.mpClearCredentials = mpClearCredentials;
  window.mpCreateRoomPrompt = mpCreateRoomPrompt;
  window.mpJoinRoomPrompt = mpJoinRoomPrompt;
  window.mpQuickJoin = mpQuickJoin;
  window.mpDeleteRoom = mpDeleteRoom;
  window.mpClearMyRooms = mpClearMyRooms;
  window.mpLeaveRoom = mpLeaveRoom;
  window.mpTogglePlayerMode = mpTogglePlayerMode;
  window.mpDownloadScene = mpDownloadScene;
  window.mpUpdateUI = mpUpdateUI;
  window.mpCopyRoomId = mpCopyRoomId;

  // Add CSS animation for toast
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
      10% { opacity: 1; transform: translateX(-50%) translateY(0); }
      90% { opacity: 1; transform: translateX(-50%) translateY(0); }
      100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    }
  `;
  document.head.appendChild(style);
}
