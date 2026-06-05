// ============================================================
// PHYSICS SYSTEM (simple)
// ============================================================
let physicsEnabled = true;
// ============================================================
// RAPIER PHYSICS SYSTEM — WASM based real physics
// ============================================================
const physBodies = [];
let rapierWorld = null;
let rapierBodies = new Map(); // mesh -> {rigidBody, collider}
let _rapierInitDone = false;

// Rapier tayyor bo'lganda world yaratish
function initRapierWorld() {
  if (!window.RAPIER || _rapierInitDone) return;
  _rapierInitDone = true;
  const R = window.RAPIER;
  rapierWorld = new R.World({ x: 0, y: -9.81, z: 0 });

  // Yerga static collider qo'shish
  const groundDesc = R.RigidBodyDesc.fixed().setTranslation(0, 0, 0);
  const groundBody = rapierWorld.createRigidBody(groundDesc);
  const groundCollider = rapierWorld.createCollider(
    R.ColliderDesc.cuboid(100, 0.01, 100), groundBody
  );

  log('⚡ Rapier Physics v0.11 — WASM initialized', 'lok');

  // Mavjud physBodies ni Rapier ga ko'chirish
  physBodies.forEach(b => _addRapierBody(b));
}

function _addRapierBody(b) {
  if (!rapierWorld || !window.RAPIER) return;
  const R = window.RAPIER;
  const pos = b.mesh.position;

  let rbDesc;
  if (b.isStatic) {
    rbDesc = R.RigidBodyDesc.fixed();
  } else {
    rbDesc = R.RigidBodyDesc.dynamic()
      .setLinearDamping(0.05)
      .setAngularDamping(0.3);
  }
  rbDesc.setTranslation(pos.x, pos.y, pos.z);
  const rb = rapierWorld.createRigidBody(rbDesc);

  // Collider shape
  let col;
  const box = new THREE.Box3().setFromObject(b.mesh);
  const sz = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  if (b.shape === 'sphere') {
    col = rapierWorld.createCollider(R.ColliderDesc.ball(b.radius || 0.5).setRestitution(b.restitution||0.5).setFriction(b.friction||0.8), rb);
  } else if (b.shape === 'cylinder') {
    col = rapierWorld.createCollider(R.ColliderDesc.cylinder(sz.y||0.5, sz.x||0.5).setRestitution(b.restitution||0.3).setFriction(b.friction||0.8), rb);
  } else {
    // Default: cuboid
    col = rapierWorld.createCollider(
      R.ColliderDesc.cuboid(Math.max(sz.x,0.1), Math.max(sz.y,0.1), Math.max(sz.z,0.1))
        .setRestitution(b.restitution||0.5).setFriction(b.friction||0.8),
      rb
    );
  }

  rapierBodies.set(b.mesh, {rigidBody: rb, collider: col, legacy: b});
}

function addPhysicsBody(mesh, opts={}) {
  const body = {
    mesh,
    vel: new THREE.Vector3(0,0,0),
    angVel: new THREE.Vector3(0,(Math.random()-.5)*0.5,0),
    mass: opts.mass || 1,
    restitution: opts.restitution || 0.5,
    friction: opts.friction || 0.8,
    isStatic: opts.isStatic || false,
    radius: opts.radius || 0.5,
    shape: opts.shape || 'cuboid',
  };
  physBodies.push(body);

  // Rapier tayyor bo'lsa — darhol qo'shish
  if (rapierWorld) _addRapierBody(body);

  return body;
}

function removeRapierBody(mesh) {
  // physBodies dan har doim o'chir — Rapier yuklanmagan bo'lsa ham
  const idx = physBodies.findIndex(b => b.mesh === mesh);
  if (idx !== -1) physBodies.splice(idx, 1);

  // Rapier dan o'chir
  if (rapierWorld) {
    const rb = rapierBodies.get(mesh);
    if (rb) {
      try { rapierWorld.removeCollider(rb.collider, false); } catch(e) {}
      try { rapierWorld.removeRigidBody(rb.rigidBody); } catch(e) {}
    }
  }
  rapierBodies.delete(mesh);
}

function updatePhysics(delta) {
  if (!physicsEnabled || !isPlaying) return;

  // Rapier step
  if (rapierWorld && _rapierInitDone) {
    rapierWorld.step();

    // Rapier pozitsiyalarini Three.js meshlariga ko'chirish
    rapierBodies.forEach(({rigidBody, legacy}, mesh) => {
      if (legacy.isStatic || !mesh.parent) return;
      if (mesh === activeCar) return;
      if (window.PlayerController && window.PlayerController.obj === mesh) return; // oyinchiga tegma
      const t = rigidBody.translation();
      const r = rigidBody.rotation();
      mesh.position.set(t.x, t.y, t.z);
      mesh.quaternion.set(r.x, r.y, r.z, r.w);
    });

    // Rapier body velocity sync (legacy vel array uchun)
    physBodies.forEach(b => {
      if (b.isStatic) return;
      const rb = rapierBodies.get(b.mesh);
      if (!rb) return;
      const lv = rb.rigidBody.linvel();
      b.vel.set(lv.x, lv.y, lv.z);
    });

    return; // Rapier ishlamoqda — legacy skip
  }

  // Fallback: legacy JS physics (Rapier yuklanmaguncha)
  const gravity = -9.8 * delta;
  physBodies.forEach(b => {
    if (b.isStatic || !b.mesh.parent) return;
    if (b.mesh === activeCar) return;
    if (window.PlayerController && window.PlayerController.obj === b.mesh) return; // oyinchiga tegma
    b.vel.y += gravity;
    b.mesh.position.addScaledVector(b.vel, delta);
    b.mesh.rotation.x += b.angVel.x * delta;
    b.mesh.rotation.z += b.angVel.z * delta;
    if (b.mesh.position.y <= b.radius) {
      b.mesh.position.y = b.radius;
      b.vel.y *= -b.restitution;
      b.vel.x *= b.friction;
      b.vel.z *= b.friction;
      b.angVel.multiplyScalar(0.95);
    }
    ['x','z'].forEach(a=>{
      if (Math.abs(b.mesh.position[a]) > 18) {
        b.vel[a] *= -0.7;
        b.mesh.position[a] = Math.sign(b.mesh.position[a])*18;
      }
    });
  });
}

// Rapier WASM tayyor bo'lganda ulash
window.addEventListener('rapier-ready', () => {
  initRapierWorld();
});
// Agar allaqachon tayyor bo'lsa
if (window._rapierReady) initRapierWorld();

// Vel ga force qo'shish (Rapier + legacy)
function applyForceToMesh(mesh, forceVec) {
  const rb = rapierBodies.get(mesh);
  if (rb && !rb.legacy.isStatic) {
    rb.rigidBody.applyImpulse({x:forceVec.x, y:forceVec.y, z:forceVec.z}, true);
  } else {
    const b = physBodies.find(b=>b.mesh===mesh);
    if (b) b.vel.add(forceVec);
  }
}

// Mass, restitution, friction update (Rapier)
function updateRapierColliderProps(mesh, props={}) {
  const rb = rapierBodies.get(mesh);
  if (!rb) return;
  if (props.restitution !== undefined) rb.collider.setRestitution(props.restitution);
  if (props.friction    !== undefined) rb.collider.setFriction(props.friction);
  if (props.mass        !== undefined && !rb.legacy.isStatic) {
    rb.rigidBody.setAdditionalMass(props.mass, true);
  }
}

function physSyncUI() {
  const s = $('phys-s');
  const btn = $('phys-toggle');
  if (s) { s.textContent = physicsEnabled ? 'ON' : 'OFF'; s.style.color = physicsEnabled ? 'var(--accent3)' : 'var(--red)'; }
  if (btn) { btn.style.color = physicsEnabled ? 'var(--accent3)' : 'var(--red)'; btn.style.opacity = '1'; btn.style.display = ''; }
}

window.togglePhysics = function() {
  physicsEnabled = !physicsEnabled;
  physSyncUI();
  log(`🌊 Fizika: ${physicsEnabled?'yoqildi':'o\'chirildi'}`, physicsEnabled?'lok':'lw');
};
