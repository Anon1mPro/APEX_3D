// ============================================================
// PHYSICS MODES — jele, suyuqlik, sinuvchi, mato
// ============================================================
const jellyObjects = new Map();   // mesh -> {origPositions, phase}
const liquidObjects = new Map();  // mesh -> {drops:[]}
const clothObjects = new Map();   // mesh -> {verts, vel}
const breakQueue = [];            // meshes to break this frame

window.setPhysMode = function(mode) {
  if (!selectedObj && !multiSelected.size) return;

  // Targets: multi yoki group ichidagi childlar yoki yagona obyekt
  let targets = [];
  if (multiSelected.size > 0) {
    multiSelected.forEach(o => {
      targets.push(o);
      if (o.userData.isGroup || o.userData._isFolder || o.isGroup) {
        o.traverse(ch => { if(ch!==o && (ch.isMesh||ch.isGroup) && ch.userData?.id) targets.push(ch); });
      }
    });
  } else {
    targets.push(selectedObj);
    if (selectedObj.userData.isGroup || selectedObj.userData._isFolder || selectedObj.isGroup) {
      selectedObj.traverse(ch => { if(ch!==selectedObj && (ch.isMesh||ch.isGroup) && ch.userData?.id) targets.push(ch); });
    }
  }

  targets.forEach(o => {
    if (!o || !o.userData) return;
    const prev = o.userData.physMode || 'solid';
    if (prev === 'jelly') jellyObjects.delete(o);
    if (prev === 'liquid') { liquidObjects.get(o)?.drops?.forEach(d=>scene.remove(d.mesh)); liquidObjects.delete(o); }
    if (prev === 'cloth') clothObjects.delete(o);
    o.userData.physMode = mode;

  if (mode === 'jelly') {
    // Store original vertex positions
    const posAttr = o.geometry.attributes.position;
    const orig = new Float32Array(posAttr.array);
    jellyObjects.set(o, { orig, phase: Math.random()*Math.PI*2, amp: 0 });
    o.material.color.set(0x44ff88);
    o.material.roughness = 0.1;
    o.material.metalness = 0.0;
    o.material.transparent = true;
    o.material.opacity = 0.82;
    o.material.needsUpdate = true;
    log(`🟢 ${o.userData.name} → Jele rejimi`, 'lok');
  }
  else if (mode === 'liquid') {
    o.material.color.set(0x1166ff);
    o.material.roughness = 0.0;
    o.material.metalness = 0.1;
    o.material.transparent = true;
    o.material.opacity = 0.55;
    o.material.needsUpdate = true;
    // Create liquid drop particles
    const drops = [];
    for (let i=0;i<12;i++) {
      const dg = new THREE.SphereGeometry(0.06+Math.random()*0.07, 8, 8);
      const dm = new THREE.MeshStandardMaterial({color:0x3388ff, transparent:true, opacity:0.7+Math.random()*0.25, roughness:0, metalness:0.15});
      const dp = new THREE.Mesh(dg, dm);
      dp.position.copy(o.position).add(new THREE.Vector3((Math.random()-.5)*.6, -0.3-Math.random()*.5, (Math.random()-.5)*.6));
      scene.add(dp);
      drops.push({mesh:dp, vel:new THREE.Vector3((Math.random()-.5)*.02, -0.01-Math.random()*.02, (Math.random()-.5)*.02), life:Math.random()});
    }
    liquidObjects.set(o, {drops});
    log(`🔵 ${o.userData.name} → Suyuqlik rejimi`, 'lok');
  }
  else if (mode === 'breakable') {
    o.material.color.set(0xff6644);
    o.material.roughness = 0.8;
    o.material.metalness = 0.0;
    o.material.needsUpdate = true;
    // Add crack wireframe overlay
    const wg = o.geometry.clone();
    const wm = new THREE.MeshBasicMaterial({color:0xff2200, wireframe:true, transparent:true, opacity:0.25});
    const crack = new THREE.Mesh(wg, wm);
    crack.scale.copy(o.scale).multiplyScalar(1.02);
    o.add(crack);
    o.userData._crackMesh = crack;
    log(`💥 ${o.userData.name} → Sinuvchi rejimi`, 'lok');
  }
  else if (mode === 'cloth') {
    o.material.color.set(0xcc88ff);
    o.material.roughness = 0.95;
    o.material.metalness = 0.0;
    o.material.side = THREE.DoubleSide;
    o.material.needsUpdate = true;
    // Store verts for cloth sim
    const posAttr = o.geometry.attributes.position;
    const verts = [];
    for (let i=0;i<posAttr.count;i++) {
      verts.push({
        x: posAttr.getX(i), y: posAttr.getY(i), z: posAttr.getZ(i),
        ox: posAttr.getX(i), oy: posAttr.getY(i), oz: posAttr.getZ(i),
        vx:0, vy:0, vz:0, pinned: posAttr.getY(i) > 0.4
      });
    }
    clothObjects.set(o, {verts});
    log(`🟣 ${o.userData.name} → Mato rejimi`, 'lok');
  }
  else {
    // solid — restore
    if (o.material) {
      o.material.transparent = false; o.material.opacity = 1;
      o.material.color.set(0x88aacc); o.material.roughness = 0.5; o.material.metalness = 0.3;
      o.material.side = THREE.FrontSide;
      o.material.needsUpdate = true;
    }
    if (o.userData._crackMesh) { o.remove(o.userData._crackMesh); delete o.userData._crackMesh; }
    log(`🧱 ${o.userData.name} → Qattiq rejimi`, 'lok');
  }
  }); // targets.forEach end
  updateHierarchy();
  updateInspector();
};
