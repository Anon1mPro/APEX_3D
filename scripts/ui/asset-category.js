// ============================================================
// ASSET CATEGORY SYSTEM
// ============================================================
const loadedModels = [];

window.assetShowCat = function(cat, btn) {
  document.querySelectorAll('.asset-cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['primitives','entities','blocks','functional','prefabs','models'].forEach(c => {
    const el = $('asset-cat-' + c);
    if (el) el.style.display = c === cat ? '' : 'none';
  });
  if (cat === 'prefabs') prefabRenderList();
};

// ============================================================
// MUHIT BLOKLARI (Scene Blocks)
// ============================================================
window.spawnSceneBlock = function(type) {
  const cfg = {
    platform: {
      name: 'Platforma', color: 0x334466, emissive: 0x001133, emissiveI: 0.1,
      geo: () => new THREE.BoxGeometry(4, 0.3, 4),
      yOff: 0.15, desc: 'platform'
    },
    wall: {
      name: 'Devor', color: 0x445566, emissive: 0x112233, emissiveI: 0.05,
      geo: () => new THREE.BoxGeometry(4, 3, 0.3),
      yOff: 1.5, desc: 'wall'
    },
    stair: {
      name: 'Zina', color: 0x556677, emissive: 0x112233, emissiveI: 0.05,
      geo: null, // custom — 3 ta step
      custom: true, yOff: 0, desc: 'stair'
    },
    bridge: {
      name: 'Ko\'prik', color: 0x553322, emissive: 0x221100, emissiveI: 0.05,
      geo: () => new THREE.BoxGeometry(1.5, 0.2, 8),
      yOff: 0.1, desc: 'bridge'
    },
    pillar: {
      name: 'Ustun', color: 0x667788, emissive: 0x223344, emissiveI: 0.05,
      geo: () => new THREE.CylinderGeometry(0.35, 0.4, 3.5, 10),
      yOff: 1.75, desc: 'pillar'
    },
    ramp: {
      name: 'Rampa', color: 0x334422, emissive: 0x112200, emissiveI: 0.05,
      geo: () => new THREE.BoxGeometry(3, 0.2, 4),
      rotation: [-Math.PI/8, 0, 0], yOff: 0.5, desc: 'ramp'
    },
    barrier: {
      name: 'To\'siq', color: 0x663322, emissive: 0x441100, emissiveI: 0.1,
      geo: () => new THREE.BoxGeometry(3, 1.2, 0.25),
      yOff: 0.6, desc: 'barrier'
    },
    ground: {
      name: 'Maydon', color: 0x224433, emissive: 0x112211, emissiveI: 0.03,
      geo: () => new THREE.BoxGeometry(10, 0.2, 10),
      yOff: 0.1, desc: 'ground'
    },
    crate: {
      name: 'Yashik', color: 0x8b6914, emissive: 0x442200, emissiveI: 0.05,
      geo: () => new THREE.BoxGeometry(0.9, 0.9, 0.9),
      yOff: 0.45, physDynamic: true, desc: 'crate'
    },
    barrel: {
      name: 'Bochka', color: 0x994422, emissive: 0x441100, emissiveI: 0.08,
      geo: () => new THREE.CylinderGeometry(0.35, 0.35, 0.9, 12),
      yOff: 0.45, physDynamic: true, desc: 'barrel'
    },
  };

  const c = cfg[type];
  if (!c) return;

  // Kamera oldiga joylash
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  const spawnPos = camera.position.clone().addScaledVector(camDir, 5);
  spawnPos.y = c.yOff;

  let mesh;

  if (type === 'stair') {
    // 3 ta pog'onali zina group
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.8, metalness: 0.1 });
    for (let i = 0; i < 3; i++) {
      const stepGeo = new THREE.BoxGeometry(2, 0.3, 0.6);
      const step = new THREE.Mesh(stepGeo, mat);
      step.position.set(0, i * 0.3, -i * 0.6);
      step.castShadow = step.receiveShadow = true;
      step.raycast = () => {};
      group.add(step);
    }
    // Pickable proxy
    const proxyGeo = new THREE.BoxGeometry(2, 0.9, 1.8);
    const proxyMat = new THREE.MeshStandardMaterial({ color: 0x556677, transparent: true, opacity: 0 });
    mesh = new THREE.Mesh(proxyGeo, proxyMat);
    mesh.add(group);
    group.position.set(0, -0.45, 0);
    mesh.position.copy(spawnPos);
    mesh.position.y = 0.45;
  } else {
    const geo = c.geo();
    const mat = new THREE.MeshStandardMaterial({
      color: c.color,
      emissive: c.emissive,
      emissiveIntensity: c.emissiveI,
      roughness: 0.75,
      metalness: 0.15
    });
    mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(spawnPos);
    if (c.rotation) mesh.rotation.set(...c.rotation);
  }

  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData = {
    id: ++objIdC,
    name: c.name + '_' + (objects.filter(o => o.userData?._blockType === type).length + 1),
    _blockType: type,
    _type: 'block',
    physicsMode: c.physDynamic ? 'dynamic' : 'solid',
    visible: true
  };
  mesh.name = mesh.userData.name;

  scene.add(mesh);
  objects.push(mesh);
  if (c.physDynamic) addPhysicsBody(mesh, { isStatic: false });
  captureState('block:' + type);
  updateHierarchy();
  selectObject(mesh);
  updateStats();
  log(`🧱 ${c.name} qo'shildi`, 'lok');
};
