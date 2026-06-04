// ============================================================
// SCENE OBJECTS
// ============================================================
// objects array yuqorida e'lon qilingan (lights yonida)
let outlineMesh = null;

// ============================================================
// MULTI-SELECT — Shift+Click ko'p obyekt tanlash
// ============================================================
let multiSelected = new Set(); // Set<mesh>
let multiOutlines = [];        // [{mesh, outline}]

function addMultiOutline(obj) {
  if (!obj.geometry) return;
  // Outline — orqa yuz, ochiq ko'k
  const mat = new THREE.MeshBasicMaterial({color:0x44bbff, side:THREE.BackSide, transparent:true, opacity:0.55});
  const ol = new THREE.Mesh(obj.geometry.clone(), mat);
  ol.position.copy(obj.position);
  ol.rotation.copy(obj.rotation);
  ol.scale.copy(obj.scale).multiplyScalar(1.08);
  ol.__forObj = obj;
  ol.__isOutline = true;
  scene.add(ol);
  multiOutlines.push(ol);

  // Overlay — oldingi yuz, juda shaffof ko'k rangni beradi
  const matOverlay = new THREE.MeshBasicMaterial({color:0x66ccff, transparent:true, opacity:0.12, depthWrite:false});
  const ov = new THREE.Mesh(obj.geometry.clone(), matOverlay);
  ov.position.copy(obj.position);
  ov.rotation.copy(obj.rotation);
  ov.scale.copy(obj.scale);
  ov.__forObj = obj;
  ov.__isOverlay = true;
  scene.add(ov);
  multiOutlines.push(ov);
}

function clearMultiOutlines() {
  multiOutlines.forEach(ol => scene.remove(ol));
  multiOutlines = [];
}

function addToMultiSelect(obj) {
  if (multiSelected.has(obj)) {
    // Ikkinchi marta bosish = olib tashlash
    multiSelected.delete(obj);
    const idx = multiOutlines.findIndex(ol => ol.__forObj === obj);
    if (idx !== -1) { scene.remove(multiOutlines[idx]); multiOutlines.splice(idx, 1); }
  } else {
    multiSelected.add(obj);
    addMultiOutline(obj);
  }
  updateMultiSelectBar();
}

function clearMultiSelect() {
  clearMultiOutlines();
  multiSelected.clear();
  updateMultiSelectBar();
}

function updateMultiSelectBar() {
  let bar = document.getElementById('multi-sel-bar');
  if (multiSelected.size === 0) {
    if (bar) bar.remove();
    return;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'multi-sel-bar';
    bar.style.cssText = `
      position:fixed; bottom:56px; left:50%; transform:translateX(-50%);
      background:var(--panel); border:1px solid var(--accent2);
      border-radius:6px; padding:7px 12px; z-index:9998;
      display:flex; align-items:center; gap:8px;
      font-family:'Rajdhani',sans-serif; font-size:12px;
      box-shadow:0 4px 16px rgba(0,0,0,.7);
    `;
    document.body.appendChild(bar);
  }
  const names = [...multiSelected].map(o => o.userData.name || '?');
  bar.innerHTML = `
    <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent2)">
      ☑ ${multiSelected.size} ta tanlandi
    </span>
    <span style="font-size:10px;color:var(--muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${names.join(', ')}</span>
    <button onclick="multiDuplicate()" style="background:rgba(0,229,255,.1);border:1px solid rgba(0,229,255,.3);color:var(--accent);font-family:'Rajdhani',sans-serif;font-size:11px;font-weight:700;padding:3px 8px;border-radius:3px;cursor:pointer">⊕ Nusxa</button>
    <button onclick="multiDelete()" style="background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);color:var(--red);font-family:'Rajdhani',sans-serif;font-size:11px;font-weight:700;padding:3px 8px;border-radius:3px;cursor:pointer">✕ O'chir</button>
    <button onclick="multiGroup()" style="background:rgba(204,136,255,.1);border:1px solid rgba(204,136,255,.3);color:var(--accent4);font-family:'Rajdhani',sans-serif;font-size:11px;font-weight:700;padding:3px 8px;border-radius:3px;cursor:pointer">▣ Guruhlash (Ctrl+F)</button>
    <button onclick="clearMultiSelect()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:0 2px">✕</button>
  `;
}
// Alias — eski nom bilan chaqirilishidan himoya
window.updateMultiSelBar = updateMultiSelectBar;

function getCloneName(baseName) {
  const base = baseName.replace(/\s+nusxa\.\d+$/, '').replace(/\s+\(nusxa\)$/, '');
  let max = 0;
  objects.forEach(o => {
    const m = o.userData.name?.match(new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\s+nusxa\\.(\\d+)$'));
    if (m) max = Math.max(max, parseInt(m[1]));
  });
  return `${base} nusxa.${max + 1}`;
}

window.multiDuplicate = function() {
  if (!multiSelected.size) return;
  const clones = [];
  multiSelected.forEach(obj => {
    const clone = obj.clone();
    clone.position.x += 1.5;
    clone.userData = {...obj.userData, id:++objIdC, name:getCloneName(obj.userData.name)};
    scene.add(clone);
    objects.push(clone);
    addPhysicsBody(clone, {radius:0.5});
    clones.push(clone);
  });
  clearMultiSelect();
  clones.forEach(c => addToMultiSelect(c));
  updateHierarchy(); updateStats();
  log(`⊕ ${clones.length} ta nusxalandi`, 'lok');
};

window.multiDelete = function() {
  if (!multiSelected.size) return;
  let count = 0;
  multiSelected.forEach(obj => {
    if (obj.userData.isStatic) return;
    if (jellyObjects.has(obj)) jellyObjects.delete(obj);
    if (liquidObjects.has(obj)) { liquidObjects.get(obj)?.drops?.forEach(d=>scene.remove(d.mesh)); liquidObjects.delete(obj); }
    if (clothObjects.has(obj)) clothObjects.delete(obj);
    const parent = obj.parent;
    if (parent) parent.remove(obj); else scene.remove(obj);
    const pi = physBodies.findIndex(b=>b.mesh===obj);
    if (pi>-1) physBodies.splice(pi,1);
    const oi = objects.indexOf(obj);
    if (oi>-1) objects.splice(oi,1);
    if (outlineMesh) { scene.remove(outlineMesh); outlineMesh=null; }
    if (selectedObj === obj) { selectedObj = null; window.selectedObj = null; AppState.selectedObj = null; }
    count++;
  });
  clearMultiSelect();
  updateHierarchy(); updateInspector(); updateStats();
  log(`✕ ${count} ta o'chirildi`, 'lw');
};

window.multiGroup = function() {
  if (multiSelected.size < 2) { log('⚠ Kamida 2 ta obyekt tanlang', 'lw'); return; }

  // Papka (group) ni 0,0,0 da yaratamiz — attach() world pozitsiyani o'zi saqlaydi
  const group = new THREE.Group();
  group.position.set(0, 0, 0);
  group.userData = { id:++objIdC, name:'Guruh-'+objIdC, type:'group', isGroup:true, _isFolder:true };
  scene.add(group);
  objects.push(group);

  const count = multiSelected.size;
  multiSelected.forEach(obj => {
    // attach() — THREE.js world transform ni saqlab parent o'zgartiradi
    scene.attach ? scene.attach(obj) : null; // ensure world-space first
    group.attach(obj); // pozitsiya/rotatsiya/scale BUZILINMAYDI
    obj.userData.parentId = group.userData.id;
    // objects arraydan olib tashlash (endi group child i)
    const oi = objects.indexOf(obj);
    if (oi > -1) objects.splice(oi, 1);
    // physics body ni olib tashlash (group o'z physicsiga ega bo'ladi)
    const pi = physBodies.findIndex(b => b.mesh === obj);
    if (pi > -1) physBodies.splice(pi, 1);
  });

  clearMultiSelect();
  selectObject(group);
  updateHierarchy(); updateStats();
  log(`📁 "${group.userData.name}" papkasi yaratildi (${count} ta object)`, 'lok');
};

const PRIMITIVES = [
  {name:'Kub',        geo:()=>new THREE.BoxGeometry(1,1,1)},
  {name:'Sfera',      geo:()=>new THREE.SphereGeometry(0.6,32,16)},
  {name:'Silindr',    geo:()=>new THREE.CylinderGeometry(0.5,0.5,1.2,32)},
  {name:'Konus',      geo:()=>new THREE.ConeGeometry(0.6,1.2,32)},
  {name:'Uchburchak', geo:()=>new THREE.CylinderGeometry(0,0.7,1.2,3)},
  {name:'Torus',      geo:()=>new THREE.TorusGeometry(0.5,0.18,16,64)},
  {name:'Oktagedron', geo:()=>new THREE.OctahedronGeometry(0.7)},
  {name:'Ikosedron',  geo:()=>new THREE.IcosahedronGeometry(0.7,0)},
  {name:'Tekislik',   geo:()=>new THREE.PlaneGeometry(2,2)},
];

const TEXTURES = [
  {name:'Metall', rough:0.2, metal:0.9, col:0x88aacc},
  {name:'Tosh', rough:0.85, metal:0.0, col:0x556677},
  {name:'Plastik', rough:0.4, metal:0.1, col:0x44ddff},
  {name:'Oltin', rough:0.15, metal:1.0, col:0xffcc22},
  {name:'Yog\'och', rough:0.9, metal:0.0, col:0x886644},
  {name:'Shisha', rough:0.0, metal:0.0, col:0xaaddff},
];

function addObject(primIdx='random', texIdx=0, parentObj=null) {
  const idx = primIdx==='random' ? Math.floor(Math.random()*PRIMITIVES.length) : primIdx%PRIMITIVES.length;
  const prim = PRIMITIVES[idx];
  const tex = TEXTURES[texIdx%TEXTURES.length];
  const geo = prim.geo();
  const mat = new THREE.MeshStandardMaterial({
    color: tex.col,
    roughness: tex.rough,
    metalness: tex.metal,
    emissive: new THREE.Color(tex.col).multiplyScalar(0.03),
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  if (parentObj) {
    // Child: pozitsiya parent local space da
    mesh.position.set((Math.random()-.5)*1.5, (Math.random()-.5)*1.5, (Math.random()-.5)*1.5);
    parentObj.add(mesh);
  } else {
    mesh.position.set((Math.random()-.5)*4, 0.5, (Math.random()-.5)*4);
    scene.add(mesh);
  }

  mesh.userData = {
    id: ++objIdC,
    name: `${prim.name} ${objIdC}`,
    type: prim.name,
    texName: tex.name,
    physMode: 'solid',   // solid | jelly | liquid | breakable | cloth
    parentId: parentObj ? parentObj.userData.id : null,
    children: [],
  };
  if (parentObj) {
    parentObj.userData.children = parentObj.userData.children || [];
    parentObj.userData.children.push(mesh.userData.id);
  }

  objects.push(mesh);
  const r = prim.name==='Sfera' ? 0.6 : 0.5;
  addPhysicsBody(mesh, {radius:r, restitution:0.4+Math.random()*0.4});
  updateHierarchy();
  selectObject(mesh);
  updateStats();
  captureState(`${prim.name} qo'shildi`);
  log(`+ <span style="color:var(--accent)">${mesh.userData.name}</span>${parentObj?' → '+parentObj.userData.name:''} [${tex.name}]`, 'lok');
  return mesh;
}

// Ground
function initScene() {
  const gGeo = new THREE.PlaneGeometry(40,40);
  const gMat = new THREE.MeshStandardMaterial({color:0x0a0e16, roughness:0.95, metalness:0.05});
  const ground = new THREE.Mesh(gGeo, gMat);
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  ground.userData = {id:++objIdC, name:'Zamin', type:'Tekislik', isStatic:true};
  scene.add(ground);
  objects.push(ground);
  addPhysicsBody(ground, {isStatic:true});

  // Faqat bitta kub — ortada, yerda
  const cube = addObject(0, 0);
  cube.position.set(0, 0.5, 0);

  updateHierarchy();
  updateStats();
  log('🚀 APEX3D Engine v2.5 — tayyor!', 'lok');
log('⚡ Render: WebGL2 | Physics: Rapier WASM (yuklanmoqda...) | Format: glTF 2.0 + Draco + KTX2', 'lok');
  log('💡 Yorug\'lik | ✨ Zarrachalar | 🌊 Fizika | 💾 Saqlash — hammasi bor!', 'lg');
  log('WASD=harakat | RMB+Drag=kamera | Del=o\'chir | F=fokus', 'lw');
  // Capture initial state for undo
  captureState('Boshlang\'ich sahna');
}

// ============================================================
// SELECTION + OUTLINE
// ============================================================
function selectObject(obj) {
  if (outlineMesh) { scene.remove(outlineMesh); outlineMesh=null; }
  selectedObj = obj;
  window.selectedObj = obj; // keybindings.js va boshqa global kodlar uchun sync
  AppState.selectedObj = obj; // AppState sync
  selectedLight = null;
  updateHierarchy();
  updateInspector();
  // Script editor — har doim tanlangan obyektni set qil
  if (obj && obj.userData && obj.userData.id !== undefined) {
    scriptEditorId = obj.userData.id;
    const editor = $('script-editor');
    if (editor) {
      editor.value = obj.userData.script || getDefaultScript(obj.userData.id);
      scriptUpdateLines();
    }
    // Dropdown sync
    const sel = $('script-obj-select');
    if (sel) sel.value = String(obj.userData.id);
  }
  if (obj && obj.geometry) {
    const oMat = new THREE.MeshBasicMaterial({color:0x00e5ff, side:THREE.BackSide, transparent:true, opacity:0.35});
    outlineMesh = new THREE.Mesh(obj.geometry.clone(), oMat);
    outlineMesh.position.copy(obj.position);
    outlineMesh.rotation.copy(obj.rotation);
    outlineMesh.scale.copy(obj.scale).multiplyScalar(1.07);
    scene.add(outlineMesh);
  }
}
