// ============================================================
// EDIT MODE — F bosilganda ob'ektga "yopishib" klaviatura bilan boshqarish
// ============================================================
const editMode = {
  active: false,
  keys: {},
};

// HUD elementini yaratish
(function buildEditHUD() {
  const hud = document.createElement('div');
  hud.id = 'edit-mode-hud';
  hud.style.cssText = `
    position:fixed; top:44px; left:50%; transform:translateX(-50%);
    background:rgba(0,0,0,0.75); border:1px solid var(--accent);
    color:var(--accent); font-family:'Share Tech Mono',monospace;
    font-size:10px; padding:5px 16px; border-radius:3px;
    pointer-events:none; display:none; z-index:9998;
    letter-spacing:1px; text-align:center; line-height:1.7;
    white-space:nowrap;
  `;
  document.body.appendChild(hud);
})();

function editModeHudText() {
  const m = gizmoMode;
  if (m === 'select') return '⬛ SELECT — 1:Select  2:Move  3:Rotate  4:Scale  F/Esc:chiq';
  if (m === 'move')   return '✛ MOVE — WASD:harakat  Q:pastga  E:tepaga  Shift:tez  Space:sekin  1/2/3/4:rejim  F/Esc:chiq';
  if (m === 'rotate') return '↻ ROTATE — WASD:aylantir  1/2/3/4:rejim  F/Esc:chiq';
  if (m === 'scale')  return '⊞ SCALE — WASD:kattalashtir  1/2/3/4:rejim  F/Esc:chiq';
  return 'EDIT MODE — 1:Select 2:Move 3:Rotate 4:Scale  F/Esc:chiq';
}

function enterEditMode() {
  if (!selectedObj) return;
  if (editMode.active) { exitEditMode(); return; }
  editMode.active = true;
  editMode.keys = {};

  // Kamera ob'ektga yaqinlashadi
  orbitTarget.copy(selectedObj.position);
  spherical.radius = Math.max(4, spherical.radius * 0.7);
  updateCamera();

  const hud = $('edit-mode-hud');
  if (hud) { hud.textContent = editModeHudText(); hud.style.display = 'block'; }
  log(`✏ Edit mode: <span style="color:var(--accent)">${selectedObj.userData.name}</span> — F yoki Esc: chiqish`, 'lok');
}

function exitEditMode() {
  editMode.active = false;
  editMode.keys = {};
  const hud = $('edit-mode-hud');
  if (hud) hud.style.display = 'none';
  log('✏ Edit mode — chiqildi', 'lw');
}

function editModeKeyDown(e) {
  const k = e.code;
  if (k === 'Escape' || k === 'KeyF') { exitEditMode(); e.preventDefault(); return; }
  if (['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ShiftLeft','ShiftRight','Space'].includes(k)) {
    editMode.keys[k] = true;
    e.preventDefault();
  }
  // Gizmo mode switch inside edit mode
  if (k === 'Digit1') { setGizmoMode('select'); const h=$('edit-mode-hud'); if(h) h.textContent=editModeHudText(); }
  if (k === 'Digit2') { setGizmoMode('move');   const h=$('edit-mode-hud'); if(h) h.textContent=editModeHudText(); }
  if (k === 'Digit3') { setGizmoMode('rotate'); const h=$('edit-mode-hud'); if(h) h.textContent=editModeHudText(); }
  if (k === 'Digit4') { setGizmoMode('scale');  const h=$('edit-mode-hud'); if(h) h.textContent=editModeHudText(); }
}

document.addEventListener('keyup', e => {
  delete editMode.keys[e.code];
});

function updateEditMode(delta) {
  if (!editMode.active || !selectedObj) return;
  const k = editMode.keys;
  const shift = k['ShiftLeft'] || k['ShiftRight'];
  const space  = k['Space'];
  const baseSpeed = shift ? 6 : space ? 0.5 : 2;

  const m = gizmoMode;

  if (m === 'move') {
    const speed = baseSpeed * delta;
    // Kamera yo'nalishi bo'yicha harakat (horizontal)
    const fwd   = new THREE.Vector3(-Math.sin(spherical.theta), 0, -Math.cos(spherical.theta)).normalize();
    const right  = new THREE.Vector3(Math.cos(spherical.theta), 0, -Math.sin(spherical.theta)).normalize();
    if (k['KeyW']) selectedObj.position.addScaledVector(fwd,   speed);
    if (k['KeyS']) selectedObj.position.addScaledVector(fwd,  -speed);
    if (k['KeyA']) selectedObj.position.addScaledVector(right, -speed);
    if (k['KeyD']) selectedObj.position.addScaledVector(right,  speed);
    if (k['KeyQ']) selectedObj.position.y -= speed;
    if (k['KeyE']) selectedObj.position.y += speed;
    // Outline va inspektor sinxi
    if (outlineMesh) outlineMesh.position.copy(selectedObj.position);
    if ($('px')) { $('px').value=selectedObj.position.x.toFixed(2); $('py').value=selectedObj.position.y.toFixed(2); $('pz').value=selectedObj.position.z.toFixed(2); }
    // Kamera orbitTarget ham ob'ekt bilan yuradi
    orbitTarget.copy(selectedObj.position);
    updateCamera();

  } else if (m === 'rotate') {
    const speed = 1.5 * delta;
    if (k['KeyA']) selectedObj.rotation.y -= speed;
    if (k['KeyD']) selectedObj.rotation.y += speed;
    if (k['KeyW']) selectedObj.rotation.x -= speed;
    if (k['KeyS']) selectedObj.rotation.x += speed;
    if (k['KeyQ']) selectedObj.rotation.z -= speed;
    if (k['KeyE']) selectedObj.rotation.z += speed;
    if (outlineMesh) outlineMesh.rotation.copy(selectedObj.rotation);

  } else if (m === 'scale') {
    const speed = 1.5 * delta;
    if (k['KeyW'] || k['KeyD']) { selectedObj.scale.multiplyScalar(1 + speed); }
    if (k['KeyS'] || k['KeyA']) { selectedObj.scale.multiplyScalar(Math.max(0.01, 1 - speed)); }
    if (k['KeyQ']) { const f=1-speed; selectedObj.scale.set(selectedObj.scale.x*f, selectedObj.scale.y, selectedObj.scale.z); }
    if (k['KeyE']) { const f=1+speed; selectedObj.scale.set(selectedObj.scale.x*f, selectedObj.scale.y, selectedObj.scale.z); }
    if (outlineMesh) outlineMesh.scale.copy(selectedObj.scale).multiplyScalar(1.07);
    if ($('sx')) { $('sx').value=selectedObj.scale.x.toFixed(2); $('sy').value=selectedObj.scale.y.toFixed(2); $('sz').value=selectedObj.scale.z.toFixed(2); }
  }
}
