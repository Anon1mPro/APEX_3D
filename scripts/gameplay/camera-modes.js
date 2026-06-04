// ============================================================
// CAMERA MODES
// ============================================================
let camMode = 'orbit'; // orbit | fps | top | front
let spherical = {theta:0.7, phi:0.6, radius:16};
let orbitTarget = new THREE.Vector3(0,0,0);
let isOrbiting = false;
let orbitStart = {x:0,y:0};

// FPS state
let fpsKeys = {};
let fpsVel = new THREE.Vector3();
let fpsYaw=0, fpsPitch=0;
let carCamYaw=0, carCamPitch=0; // 1st person mashina kamerasi
const fpsSpeed = 8;

function setCamMode(mode) {
  camMode = mode;
  const modeNames = {orbit:'Perspektiv',fps:'FPS',top:'Yuqoridan',front:'Oldidan'};
  const modeName = modeNames[mode] || mode;
  const camLbl = $('cam-lbl');
  const camModeLbl = $('cam-mode-lbl');
  const modeOv = $('mode-ov');
  if (camLbl) camLbl.textContent = mode.toUpperCase();
  if (camModeLbl) camModeLbl.textContent = modeName;
  if (modeOv) modeOv.innerHTML = mode==='fps'
    ? (carInside
        ? 'AVTO REJIM: WASD=haydash | Mouse=kamera | E=chiqish'
        : 'FPS REJIM: WASD=harakat | Mouse=qarash | Esc=chiqish')
    : 'CAM: '+modeName+'<br>RMB+Sichq: Aylantir | RMB+WASD: Yur<br>Q/E: Pastga/Tepaga | Shift: Tez | Space: Sekin';
  const ch = $('crosshair');
  if (ch) ch.style.display = mode==='fps'?'block':'none';

  // FPS hints — faqat oyinchi FPS da (avto ichida emas)
  const hint = $('fps-grab-hint');
  const held = $('fps-held-lbl');
  if (mode==='fps' && !carInside) {
    if (hint) hint.style.display='block';
    if (ch) ch.textContent='+';
  } else {
    if (hint) hint.style.display='none';
    if (held) held.style.display='none';
    if (typeof fpsHeldObj !== 'undefined' && fpsHeldObj) {
      const _pb = physBodies.find(b=>b.mesh===fpsHeldObj);
      if (_pb) _pb.isStatic=false;
      fpsHeldObj=null;
    }
  }

  if (mode==='orbit') {
    spherical={theta:0.7,phi:0.6,radius:16};
    camera.fov=60; camera.updateProjectionMatrix();
    updateCamera();
  } else if (mode==='top') {
    spherical={theta:0,phi:0.01,radius:22}; updateCamera();
  } else if (mode==='front') {
    spherical={theta:0,phi:Math.PI/2,radius:16}; updateCamera();
  } else if (mode==='fps') {
    camera.position.set(0,1.7,5);
    camera.rotation.set(0,Math.PI,0);
    fpsYaw=Math.PI; fpsPitch=0;
    log('👁 FPS rejim — WASD:harakat, Mouse:bosh, Esc:chiqish', 'lw');
  }
}

$('view-p').onclick = ()=>setCamMode('orbit');
$('view-t').onclick = ()=>setCamMode('top');
$('view-f').onclick = ()=>setCamMode('front');

function updateCamera() {
  if (camMode==='fps') return;
  camera.position.set(
    orbitTarget.x + spherical.radius*Math.sin(spherical.phi)*Math.sin(spherical.theta),
    orbitTarget.y + spherical.radius*Math.cos(spherical.phi),
    orbitTarget.z + spherical.radius*Math.sin(spherical.phi)*Math.cos(spherical.theta)
  );
  camera.lookAt(orbitTarget);
}

// ORBIT CONTROLS — RMB ushlab sichqoncha = kamera aylantirish, WASD = kamera yurish
document.addEventListener('mousemove', e=>{
  // Mashina kamerasi — AVVAL tekshiramiz
  if (carInside && document.pointerLockElement) {
    fpsYaw -= e.movementX * camSensitivity;
    const _acfg = activeCar ? (window._getCarCfg?.(activeCar) || {}) : {};
    const _camIs1st = (_acfg.camAllow3rd === false && _acfg.camAllow1st !== false)
                   || (!(_acfg.camAllow1st === false) && !(_acfg.camAllow3rd === false) && _acfg.camMode === '1st');
    const _pitchMin = _camIs1st
      ? ((_acfg.cam1stPitchMin ?? -60) * Math.PI / 180)
      : ((_acfg.cam3rdPitchMin ?? -40) * Math.PI / 180);
    const _pitchMax = _camIs1st
      ? ((_acfg.cam1stPitchMax ?? 60) * Math.PI / 180)
      : ((_acfg.cam3rdPitchMax ?? 60) * Math.PI / 180);
    fpsPitch = Math.max(_pitchMin, Math.min(_pitchMax, fpsPitch - e.movementY * camSensitivity));
    return;
  }
  if (camMode==='fps') {
    fpsYaw -= e.movementX*camSensitivity;
    fpsPitch = Math.max(-1.3, Math.min(1.3, fpsPitch - e.movementY*camSensitivity));
    camera.rotation.order='YXZ';
    camera.rotation.y=fpsYaw;
    camera.rotation.x=fpsPitch;
    return;
  }
  if (!isOrbiting) return;
  spherical.theta -= (e.clientX-orbitStart.x)*0.005;
  spherical.phi = Math.max(0.05, Math.min(Math.PI-0.05, spherical.phi+(e.clientY-orbitStart.y)*0.005));
  orbitStart={x:e.clientX,y:e.clientY};
  updateCamera();
});
canvas.addEventListener('contextmenu', e=>e.preventDefault());

// Mashina 1-shaxs rejimida canvas bosish → pointer lock
canvas.addEventListener('click', () => {
  if (document.pointerLockElement) return;
  if (carInside) { canvas.requestPointerLock(); return; }
  const ccfg = activeCar && (window._getCarCfg?.(activeCar));
  if (ccfg?.camMode === '1st') canvas.requestPointerLock();
});

// FPS pointer lock
$('cam-fps-btn').onclick = function() {
  if (camMode==='fps') { setCamMode('orbit'); document.exitPointerLock?.(); }
  else { setCamMode('fps'); canvas.requestPointerLock?.(); }
};
document.addEventListener('pointerlockchange', ()=>{
  if (!document.pointerLockElement && camMode==='fps' && !carInside) setCamMode('orbit');
});

document.addEventListener('keydown', e=>{ 
  fpsKeys[e.code]=true;
  if (camMode==='fps' && (e.code==='Space'||e.code==='ShiftLeft'||e.code==='ShiftRight')) e.preventDefault();
  // RMB ushlab kamera yurayotganda Space/Shift scroll oldini olish
  if (rmbHeld && ['Space','ShiftLeft','ShiftRight'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup', e=>{ fpsKeys[e.code]=false; });

function updateFPS(delta) {
  if (PlayerController.obj) return;
  if (camMode !== 'fps') return;
  if (carInside) return; // Mashina ichida — FPS harakat o'chiriladi
  const speed = fpsSpeed * delta;
  const fwd = new THREE.Vector3(-Math.sin(fpsYaw),0,-Math.cos(fpsYaw));
  const right = new THREE.Vector3(Math.cos(fpsYaw),0,-Math.sin(fpsYaw));
  if (fpsKeys['KeyW']||fpsKeys['ArrowUp']) camera.position.addScaledVector(fwd, speed);
  if (fpsKeys['KeyS']||fpsKeys['ArrowDown']) camera.position.addScaledVector(fwd,-speed);
  if (fpsKeys['KeyA']||fpsKeys['ArrowLeft']) camera.position.addScaledVector(right,-speed);
  if (fpsKeys['KeyD']||fpsKeys['ArrowRight']) camera.position.addScaledVector(right, speed);
  if (fpsKeys['Space']) camera.position.y += speed;
  if (fpsKeys['ShiftLeft']) camera.position.y -= speed;
  camera.position.y = Math.max(0.5, camera.position.y);
}
