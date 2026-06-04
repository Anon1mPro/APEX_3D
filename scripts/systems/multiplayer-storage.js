// ============================================================
//  MULTIPLAYER STORAGE — LocalStorage for API & Rooms
// ============================================================

const MultiplayerStorage = {
  STORAGE_KEY_API: 'apex_firebase_api',
  STORAGE_KEY_DB: 'apex_firebase_db',
  STORAGE_KEY_ROOMS: 'apex_my_rooms',

  // Save Firebase credentials
  saveCredentials(apiKey, dbUrl) {
    try {
      localStorage.setItem(this.STORAGE_KEY_API, apiKey);
      localStorage.setItem(this.STORAGE_KEY_DB, dbUrl);
      console.log('✅ Firebase credentials saved');
    } catch (err) {
      console.warn('⚠ Could not save credentials:', err);
    }
  },

  // Load Firebase credentials
  loadCredentials() {
    try {
      const apiKey = localStorage.getItem(this.STORAGE_KEY_API);
      const dbUrl = localStorage.getItem(this.STORAGE_KEY_DB);

      if (apiKey && dbUrl) {
        return { apiKey, dbUrl };
      }
    } catch (err) {
      console.warn('⚠ Could not load credentials:', err);
    }

    return null;
  },

  // Clear credentials
  clearCredentials() {
    try {
      localStorage.removeItem(this.STORAGE_KEY_API);
      localStorage.removeItem(this.STORAGE_KEY_DB);
      console.log('🗑 Firebase credentials cleared');
    } catch (err) {
      console.warn('⚠ Could not clear credentials:', err);
    }
  },

  // Save room to "My Rooms"
  saveRoom(roomId, password = null) {
    try {
      const rooms = this.getRooms();

      // Check if already exists
      const existing = rooms.find(r => r.roomId === roomId);
      if (existing) {
        existing.password = password;
        existing.lastUsed = Date.now();
      } else {
        rooms.push({
          roomId,
          password,
          createdAt: Date.now(),
          lastUsed: Date.now()
        });
      }

      // Sort by last used
      rooms.sort((a, b) => b.lastUsed - a.lastUsed);

      localStorage.setItem(this.STORAGE_KEY_ROOMS, JSON.stringify(rooms));
      console.log('✅ Room saved:', roomId);
    } catch (err) {
      console.warn('⚠ Could not save room:', err);
    }
  },

  // Get all saved rooms
  getRooms() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_ROOMS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (err) {
      console.warn('⚠ Could not load rooms:', err);
    }

    return [];
  },

  // Remove room from "My Rooms"
  removeRoom(roomId) {
    try {
      const rooms = this.getRooms();
      const filtered = rooms.filter(r => r.roomId !== roomId);
      localStorage.setItem(this.STORAGE_KEY_ROOMS, JSON.stringify(filtered));
      console.log('🗑 Room removed:', roomId);
    } catch (err) {
      console.warn('⚠ Could not remove room:', err);
    }
  },

  // Clear all rooms
  clearRooms() {
    try {
      localStorage.removeItem(this.STORAGE_KEY_ROOMS);
      console.log('🗑 All rooms cleared');
    } catch (err) {
      console.warn('⚠ Could not clear rooms:', err);
    }
  }
};

// Add to window
if (typeof window !== 'undefined') {
  window.MultiplayerStorage = MultiplayerStorage;
  console.log('✅ Multiplayer storage initialized');
}
