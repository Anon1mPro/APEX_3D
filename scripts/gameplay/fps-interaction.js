// ============================================================
// FPS INTERACTION — Ko'tarish / Aylantirish / Tashlash
// ============================================================
let fpsHeldObj   = null;   // ushlab turilgan mesh
let fpsHoldDist  = 3.5;    // kameradan uzoqligi
let fpsHoldAngle = 0;      // scroll bilan aylanish burchagi

function fpsGetAimed() {
  // Ekran markazidan ray chiqar
  const rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(0,0), camera);
  const meshList = objects.filter(o=>!o.userData.isStatic && o.isMesh);
  const hits = rc.intersectObjects(meshList, true);
  return hits.length > 0 && hits[0].distance < 6 ? hits[0].object : null;
}

function fpsUpdateHeld() {
  if (!fpsHeldObj) return;
  // Position object in front of camera at holdDist
  const dir = new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(0, fpsYaw, 0,'YXZ'));
  const targetPos = camera.position.clone().addScaledVector(dir, fpsHoldDist);
  targetPos.y = Math.max(0.3, targetPos.y + Math.sin(fpsPitch)*fpsHoldDist*0.5);
  // Smooth follow
  fpsHeldObj.position.lerp(targetPos, 0.18);
  // Rotate with scroll angle
  fpsHeldObj.rotation.y = fpsHoldAngle;
  // Sync outline
  if (outlineMesh) {
    outlineMesh.position.copy(fpsHeldObj.position);
    outlineMesh.rotation.copy(fpsHeldObj.rotation);
    outlineMesh.scale.copy(fpsHeldObj.scale).multiplyScalar(1.07);
  }
  // Sync phys body
  const pb = physBodies.find(b=>b.mesh===fpsHeldObj);
  if (pb) { pb.vel.set(0,0,0); pb.angVel.set(0,0,0); pb.isStatic=true; }
}

// FPS — LMB: ko'tarish
canvas.addEventListener('click', e=>{
  if (camMode !== 'fps') return;
  if (carInside) return; // avto ichida grab o'chirilgan
  e.stopPropagation();
  if (fpsHeldObj) return; // already holding
  const aimed = fpsGetAimed();
  if (aimed && aimed.userData.name) {
    fpsHeldObj = aimed;
    fpsHoldAngle = aimed.rotation.y;
    selectObject(aimed);
    const $hint = $('fps-held-lbl');
    if ($hint) { $hint.textContent = '📦 '+aimed.userData.name; $hint.style.display='block'; }
    const $grab = $('fps-grab-hint');
    if ($grab) $grab.textContent = 'Scroll: Aylandir | RMB: Tashlash';
    log(`🖐 ${aimed.userData.name} ko'tarildi`, 'lok');
  }
});

// FPS — Scroll: aylantirish
canvas.addEventListener('wheel', e=>{
  if (camMode === 'fps') {
    if (fpsHeldObj) {
      e.preventDefault();
      fpsHoldAngle += e.deltaY * 0.003;
    }
    return;
  }
  // Orbit zoom (existing)
  spherical.radius = Math.max(2, Math.min(60, spherical.radius+e.deltaY*0.025));
  updateCamera();
}, {passive:false});

// FPS — RMB: tashlash
canvas.addEventListener('mousedown', e=>{
  if (camMode === 'fps' && e.button === 2 && fpsHeldObj) {
    e.preventDefault();
    // Throw in look direction
    const dir = new THREE.Vector3(-Math.sin(fpsYaw)*Math.cos(fpsPitch), Math.sin(fpsPitch)*0.8, -Math.cos(fpsYaw)*Math.cos(fpsPitch));
    const pb = physBodies.find(b=>b.mesh===fpsHeldObj);
    if (pb) {
      pb.isStatic = false;
      pb.vel.copy(dir).multiplyScalar(10 + Math.random()*3);
      pb.angVel.set((Math.random()-.5)*4,(Math.random()-.5)*4,(Math.random()-.5)*4);
    }
    playImpactSound(0.5);
    log(`🚀 ${fpsHeldObj.userData.name} tashlandi!`, 'lw');
    fpsHeldObj = null;
    const $hint = $('fps-held-lbl');
    if ($hint) $hint.style.display='none';
    const $grab = $('fps-grab-hint');
    if ($grab) $grab.textContent = 'LMB: Ko\'tar | Scroll: Aylandir | RMB: Tashlash';
  }
});

// FPS hints are already handled inside setCamMode below (patched inline)

// ============================================================
// INIT
// ============================================================

// ============================================================