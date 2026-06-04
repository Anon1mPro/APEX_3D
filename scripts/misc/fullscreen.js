// ============================================================
// COLLIDER VIZUALIZATSIYASI
// ============================================================
let colliderVis = false;
const colliderHelpers = [];

window.toggleColliderVis = function() {
  colliderVis = !colliderVis;
  // Eskilarni tozalash
  colliderHelpers.forEach(h => scene.remove(h));
  colliderHelpers.length = 0;
  if (colliderVis) {
    physBodies.forEach(b => {
      if (!b.mesh || !b.mesh.parent) return;
      const s = b.mesh.scale;
      const geo = new THREE.BoxGeometry(s.x, s.y, s.z);
      const mat = new THREE.MeshBasicMaterial({
        color: b.isStatic ? 0x44ff44 : 0xff4444,
        wireframe: true, transparent: true, opacity: 0.6
      });
      const h = new THREE.Mesh(geo, mat);
      h.__colliderFor = b.mesh;
      scene.add(h);
      colliderHelpers.push(h);
    });
    log(`🔲 Collider viz: ${colliderHelpers.length} ta (yashil=statik, qizil=dinamik)`, 'lok');
  } else {
    log('🔲 Collider viz o\'chirildi', 'lw');
  }
};

// Collider helperlarni har kadrda mesh bilan sinxronlash
(function() {
  const _origAnimate2 = window.animate;
  if (typeof requestAnimationFrame !== 'undefined') {
    const syncColliders = () => {
      requestAnimationFrame(syncColliders);
      if (!colliderVis) return;
      colliderHelpers.forEach(h => {
        if (!h.__colliderFor || !h.__colliderFor.parent) return;
        h.position.copy(h.__colliderFor.position);
        h.rotation.copy(h.__colliderFor.rotation);
      });
    };
    requestAnimationFrame(syncColliders);
  }
})();
