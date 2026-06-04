// ============================================================
//  MULTIPLAYER SMOOTH INTERPOLATION — Client-side Prediction
// ============================================================

const MultiplayerSmooth = {
  // Remote object interpolation data
  remoteStates: {}, // { uuid: { current, target, lastUpdate } }

  // Interpolation settings
  interpolationSpeed: 8, // Higher = faster catch-up
  positionThreshold: 0.01, // Min distance to interpolate
  rotationThreshold: 0.01,

  // Update target state for remote object
  updateRemoteTarget(uuid, data) {
    if (!this.remoteStates[uuid]) {
      this.remoteStates[uuid] = {
        current: {
          position: { x: data.position.x, y: data.position.y, z: data.position.z },
          rotation: { x: data.rotation.x, y: data.rotation.y, z: data.rotation.z },
          scale: { x: data.scale.x, y: data.scale.y, z: data.scale.z }
        },
        target: {
          position: { x: data.position.x, y: data.position.y, z: data.position.z },
          rotation: { x: data.rotation.x, y: data.rotation.y, z: data.rotation.z },
          scale: { x: data.scale.x, y: data.scale.y, z: data.scale.z }
        },
        lastUpdate: Date.now()
      };
    } else {
      // Update target, keep current for smooth interpolation
      const state = this.remoteStates[uuid];
      state.target.position = { x: data.position.x, y: data.position.y, z: data.position.z };
      state.target.rotation = { x: data.rotation.x, y: data.rotation.y, z: data.rotation.z };
      state.target.scale = { x: data.scale.x, y: data.scale.y, z: data.scale.z };
      state.lastUpdate = Date.now();
    }
  },

  // Lerp helper
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  // Smooth interpolate remote objects
  interpolate(delta) {
    objects.forEach(obj => {
      // Only interpolate remote objects
      if (!obj.userData.isRemote) return;

      const uuid = obj.uuid;
      const state = this.remoteStates[uuid];

      if (!state) return;

      const speed = this.interpolationSpeed * delta;

      // Interpolate position
      const posDist = Math.sqrt(
        Math.pow(state.target.position.x - state.current.position.x, 2) +
        Math.pow(state.target.position.y - state.current.position.y, 2) +
        Math.pow(state.target.position.z - state.current.position.z, 2)
      );

      if (posDist > this.positionThreshold) {
        state.current.position.x = this.lerp(state.current.position.x, state.target.position.x, speed);
        state.current.position.y = this.lerp(state.current.position.y, state.target.position.y, speed);
        state.current.position.z = this.lerp(state.current.position.z, state.target.position.z, speed);

        obj.position.set(
          state.current.position.x,
          state.current.position.y,
          state.current.position.z
        );
      }

      // Interpolate rotation
      const rotDist = Math.sqrt(
        Math.pow(state.target.rotation.x - state.current.rotation.x, 2) +
        Math.pow(state.target.rotation.y - state.current.rotation.y, 2) +
        Math.pow(state.target.rotation.z - state.current.rotation.z, 2)
      );

      if (rotDist > this.rotationThreshold) {
        state.current.rotation.x = this.lerp(state.current.rotation.x, state.target.rotation.x, speed);
        state.current.rotation.y = this.lerp(state.current.rotation.y, state.target.rotation.y, speed);
        state.current.rotation.z = this.lerp(state.current.rotation.z, state.target.rotation.z, speed);

        obj.rotation.set(
          state.current.rotation.x,
          state.current.rotation.y,
          state.current.rotation.z
        );
      }

      // Interpolate scale
      state.current.scale.x = this.lerp(state.current.scale.x, state.target.scale.x, speed);
      state.current.scale.y = this.lerp(state.current.scale.y, state.target.scale.y, speed);
      state.current.scale.z = this.lerp(state.current.scale.z, state.target.scale.z, speed);

      obj.scale.set(
        state.current.scale.x,
        state.current.scale.y,
        state.current.scale.z
      );
    });
  },

  // Clean up removed objects
  cleanup() {
    const existingUuids = new Set(objects.map(o => o.uuid));

    for (const uuid in this.remoteStates) {
      if (!existingUuids.has(uuid)) {
        delete this.remoteStates[uuid];
      }
    }
  }
};

// Add to window
if (typeof window !== 'undefined') {
  window.MultiplayerSmooth = MultiplayerSmooth;
  console.log('✅ Multiplayer smooth interpolation initialized');
}
