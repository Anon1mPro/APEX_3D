// ============================================================
// DEFORM OPERATIONS
// ============================================================
window.deformOp = function(op) {
  if (!selectedObj || !selectedObj.geometry) return;
  const str = parseFloat($('deform-str')?.value || 1);
  const geo = selectedObj.geometry;
  const pos = geo.attributes.position;

  // Jelly objects: bump amplitude
  if (selectedObj.userData.physMode === 'jelly') {
    const jd = jellyObjects.get(selectedObj);
    if (jd) { jd.amp = Math.min(0.4, (jd.amp||0) + 0.08 * str); }
  }

  if (op === 'squish') {
    selectedObj.scale.y = Math.max(0.05, selectedObj.scale.y - 0.15 * str);
    selectedObj.scale.x *= 1 + 0.06 * str;
    selectedObj.scale.z *= 1 + 0.06 * str;
  }
  else if (op === 'stretch') {
    selectedObj.scale.y *= 1 + 0.2 * str;
    selectedObj.scale.x = Math.max(0.05, selectedObj.scale.x - 0.05 * str);
    selectedObj.scale.z = Math.max(0.05, selectedObj.scale.z - 0.05 * str);
  }
  else if (op === 'inflate') {
    selectedObj.scale.multiplyScalar(1 + 0.12 * str);
  }
  else if (op === 'twist') {
    // Vertex-level twist
    for (let i=0; i<pos.count; i++) {
      const y = pos.getY(i);
      const angle = y * 0.8 * str;
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setX(i, x*Math.cos(angle) - z*Math.sin(angle));
      pos.setZ(i, x*Math.sin(angle) + z*Math.cos(angle));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }
  else if (op === 'shear') {
    for (let i=0; i<pos.count; i++) {
      pos.setX(i, pos.getX(i) + pos.getY(i) * 0.25 * str);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }
  else if (op === 'break') {
    breakObject(selectedObj, str);
    return;
  }
  if (outlineMesh) { outlineMesh.position.copy(selectedObj.position); outlineMesh.scale.copy(selectedObj.scale).multiplyScalar(1.07); }
  captureState('Deform: '+op);
  log(`✏ ${selectedObj.userData.name} → ${op} (kuch:${str.toFixed(1)})`, 'lok');
};

window.resetDeform = function() {
  if (!selectedObj) return;
  selectedObj.scale.set(1,1,1);
  // Rebuild geometry from scratch
  const idx = PRIMITIVES.findIndex(p=>p.name===selectedObj.userData.type);
  if (idx>=0) {
    selectedObj.geometry.dispose();
    selectedObj.geometry = PRIMITIVES[idx].geo();
  }
  captureState('Reset deform');
  log(`↺ ${selectedObj.userData.name} reset`, 'lw');
};

// ============================================================
// BREAK / SHATTER — fragments
// ============================================================
function breakObject(obj, str=1) {
  if (!obj || obj.userData.isStatic) return;
  const fragCount = 6 + Math.floor(str * 4);
  const baseSize = 0.22 * str;
  const fragMat = new THREE.MeshStandardMaterial({
    color: obj.material.color.clone(),
    roughness: 0.8, metalness: 0.1,
    emissive: obj.material.color.clone().multiplyScalar(0.1)
  });

  for (let i=0; i<fragCount; i++) {
    const s = baseSize * (0.5 + Math.random());
    const geo = Math.random() > 0.5
      ? new THREE.TetrahedronGeometry(s)
      : new THREE.BoxGeometry(s*0.8, s*0.6, s*0.7);
    const frag = new THREE.Mesh(geo, fragMat.clone());
    frag.position.copy(obj.position).add(new THREE.Vector3(
      (Math.random()-.5)*0.6, Math.random()*0.5, (Math.random()-.5)*0.6
    ));
    frag.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    frag.castShadow = true;
    frag.userData = {id:++objIdC, name:`Parchai ${objIdC}`, type:'Parchai', physMode:'solid', parentId:null, children:[]};
    scene.add(frag);
    objects.push(frag);
    const b = addPhysicsBody(frag, {radius:s, restitution:0.3+Math.random()*0.4});
    // Launch fragments outward
    b.vel.set((Math.random()-.5)*6*str, 2+Math.random()*4*str, (Math.random()-.5)*6*str);
    b.angVel.set((Math.random()-.5)*4,(Math.random()-.5)*4,(Math.random()-.5)*4);
  }
  // Remove original
  scene.remove(obj);
  if (outlineMesh) { scene.remove(outlineMesh); outlineMesh=null; }
  const pi = physBodies.findIndex(b=>b.mesh===obj);
  if (pi>-1) physBodies.splice(pi,1);
  objects.splice(objects.indexOf(obj),1);
  selectedObj = null;
  updateHierarchy(); updateInspector(); updateStats();
  playImpactSound(str);
  log(`💥 ${obj.userData.name} parchalandi! (${fragCount} parcha)`, 'lok');
}
