// ============================================================
// LIGHTS SYSTEM
// ============================================================

// ─── Markaziy holat ob'ekti — global o'zgaruvchilar o'rniga ─
const AppState = {
  // Sahna ob'ektlari
  objects:        [],
  selectedObj:    null,
  selectedLight:  null,
  objIdC:         0,
  particleSystems:[],
  psIdC:          0,
  // Chiroqlar
  lights:         [],
  lightIdC:       0,
};

// Eski kod bilan moslik uchun alias'lar (qisqa muddatli shim)
// Keyinchalik barcha joyda AppState.xxx ishlatilsin
let lights         = AppState.lights;
let lightIdC       = AppState.lightIdC;
let objects        = AppState.objects;
let selectedObj    = AppState.selectedObj;
let selectedLight  = AppState.selectedLight;
let objIdC         = AppState.objIdC;
let particleSystems= AppState.particleSystems;
let psIdC = 0;

function createLight(type='point', opts={}) {
  let light, helper;
  const col = opts.color || 0x88aaff;
  const intensity = opts.intensity || 1;
  const pos = opts.pos || new THREE.Vector3(0,5,0);

  if (type === 'ambient') {
    light = new THREE.AmbientLight(col, intensity);
  } else if (type === 'directional') {
    light = new THREE.DirectionalLight(col, intensity);
    light.position.copy(pos);
    light.castShadow = true;
    light.shadow.mapSize.set(1024,1024);
    helper = null; // DirectionalLightHelper olib tashlandi
  } else if (type === 'point') {
    light = new THREE.PointLight(col, intensity, opts.distance||20);
    light.position.copy(pos);
    light.castShadow = true;
    helper = new THREE.PointLightHelper(light, 0.3, col);
  } else if (type === 'spot') {
    light = new THREE.SpotLight(col, intensity);
    light.position.copy(pos);
    light.castShadow = true;
    light.angle = opts.angle || Math.PI/6;
    light.penumbra = 0.3;
    helper = new THREE.SpotLightHelper(light);
  }

  // Parent object ga biriktirish yoki scene ga qo'shish
  const container = opts.parent || null;
  if (container) {
    container.add(light);
    if (helper) scene.add(helper); // helperlar har doim scene da
  } else {
    scene.add(light);
    if (helper) scene.add(helper);
  }

  const lid = ++lightIdC;
  const entry = {id:lid, type, light, helper, name:`${type[0].toUpperCase()+type.slice(1)} ${lid}`, parent:container};
  lights.push(entry);
  if (typeof updateHierarchy === "function") updateHierarchy();
  log(`💡 ${entry.name} qo'shildi${container?' → '+container.userData?.name:''}`, 'lok');
  return entry;
}

// Default lights
createLight('ambient', {color:0x334488, intensity:0.9});
const sun = createLight('directional', {color:0xfff0dd, intensity:2.5, pos:new THREE.Vector3(10,15,8)});
const fill = createLight('point', {color:0x4466ff, intensity:1.8, distance:35, pos:new THREE.Vector3(-8,3,-6)});

window.addLight = function() {
  const types = [
    ['☀️ Sun (Quyosh)','sun'],
    ['🔦 Headlight (Fanar)','headlight'],
    ['Point 💡','point'],
    ['Spot 🔦','spot'],
    ['Directional ☀','directional'],
  ];
  const m = document.createElement('div');
  m.classList.add('ui-popup');
m.style.cssText='min-width:170px;top:60px;left:50%';
  types.forEach(([label,type])=>{
    const b = document.createElement('button');
    b.textContent = label;
    b.classList.add('ui-menu-item');
    b.onmouseover=()=>b.style.background='var(--hover)';
    b.onmouseout=()=>b.style.background='none';
    b.onclick=()=>{
      if (type==='sun') {
        createSunLight({pos:new THREE.Vector3(10,15,8)});
      } else if (type==='headlight') {
        createHeadlight({pos:new THREE.Vector3(0,2,0)});
      } else {
        const pos=new THREE.Vector3((Math.random()-.5)*8,3+Math.random()*4,(Math.random()-.5)*8);
        const col=[0xff4488,0x44ffaa,0xffaa00,0x88aaff][Math.floor(Math.random()*4)];
        createLight(type,{color:col,intensity:1.5,pos});
      }
      document.body.removeChild(m);
      if (typeof updateHierarchy === "function") updateHierarchy();
    };
    m.appendChild(b);
  });
  document.body.appendChild(m);
  setTimeout(()=>document.addEventListener('click',function rm(){if(m.parentNode)m.parentNode.removeChild(m);document.removeEventListener('click',rm)},100));
};

// ────────────────────────────────────────────────────────────────
// SUN LIGHT — quyoshday keng maydon directional, rotatsiya bilan
// ────────────────────────────────────────────────────────────────
function createSunLight(opts={}) {
  const col = opts.color || 0xfff5cc;
  const intensity = opts.intensity || 6;
  const pos = opts.pos || new THREE.Vector3(10,15,8);
  const parent = opts.parent || null;

  const light = new THREE.DirectionalLight(col, intensity);
  light.position.copy(pos);
  light.castShadow = true;
  light.shadow.mapSize.set(2048,2048);
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = 200;
  light.shadow.camera.left = -30;
  light.shadow.camera.right = 30;
  light.shadow.camera.top = 30;
  light.shadow.camera.bottom = -30;

  // Tekis to'rtburchak marker
  const sunGeo = new THREE.PlaneGeometry(0.8, 0.8);
  const sunMat = new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0.85, side:THREE.DoubleSide});
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunMesh.name = '__sun_marker__';
  sunMesh.position.copy(pos);

  const helper = null; // DirectionalLightHelper olib tashlandi

  const container = parent;
  if(container){ container.add(light); container.add(sunMesh); scene.add(helper); }
  else { scene.add(light); scene.add(sunMesh); scene.add(helper); }

  const lid = ++lightIdC;
  const entry = {
    id:lid, type:'sun', light, helper,
    marker:sunMesh,
    name:`Sun ${lid}`,
    parent:container,
    rotX: Math.atan2(pos.y, Math.sqrt(pos.x*pos.x+pos.z*pos.z)) * 180/Math.PI,
    rotY: Math.atan2(pos.x, pos.z) * 180/Math.PI,
  };
  lights.push(entry);
  if (typeof updateHierarchy === "function") updateHierarchy();
  log(`☀️ Sun yorug'lik qo'shildi (${intensity} intensiv, soya: 2K)`, 'lok');
  return entry;
}

// ────────────────────────────────────────────────────────────────
// HEADLIGHT — mashina farasi / fonar, rotatsiya bilan
// ────────────────────────────────────────────────────────────────
function createHeadlight(opts={}) {
  const col = opts.color || 0xffffff;
  const intensity = opts.intensity || 8;
  const pos = opts.pos || new THREE.Vector3(0,1,0);
  const parent = opts.parent || null;

  const light = new THREE.SpotLight(col, intensity);
  light.position.copy(pos);
  light.angle = opts.angle || Math.PI/10; // tor konusli
  light.penumbra = 0.15;
  light.distance = opts.distance || 30;
  light.castShadow = true;
  light.shadow.mapSize.set(1024,1024);

  // Target
  light.target.position.set(pos.x, pos.y, pos.z - 5);

  // Fanar korpus marker
  const fGeo = new THREE.CylinderGeometry(0.08,0.18,0.3,10);
  const fMat = new THREE.MeshBasicMaterial({color:0xaaddff,transparent:true,opacity:0.9});
  const fMarker = new THREE.Mesh(fGeo,fMat);
  fMarker.rotation.x = Math.PI/2;
  fMarker.name = '__headlight_marker__';

  // Lens glow disc
  const lGeo = new THREE.CircleGeometry(0.18,16);
  const lMat = new THREE.MeshBasicMaterial({color:0xeef8ff,transparent:true,opacity:0.85,side:THREE.DoubleSide});
  const lens = new THREE.Mesh(lGeo,lMat);
  lens.position.z = -0.16;
  fMarker.add(lens);
  fMarker.position.copy(pos);

  const helper = new THREE.SpotLightHelper(light);

  const container = parent;
  if(container){
    container.add(light); container.add(light.target); container.add(fMarker); scene.add(helper);
  } else {
    scene.add(light); scene.add(light.target); scene.add(fMarker); scene.add(helper);
  }

  const lid = ++lightIdC;
  const entry = {
    id:lid, type:'headlight', light, helper,
    marker:fMarker,
    name:`Headlight ${lid}`,
    parent:container,
    rotX:0, rotY:0,
  };
  lights.push(entry);
  if (typeof updateHierarchy === "function") updateHierarchy();
  log(`🔦 Headlight (fanar) qo'shildi`, 'lok');
  return entry;
}

// Sun / Headlight yo'nalishini rotatsiyadan hisoblash
function applyLightRotation(entry) {
  const rx = (entry.rotX||0) * Math.PI/180;
  const ry = (entry.rotY||0) * Math.PI/180;
  const r = 18; // radius
  const dir = new THREE.Vector3(
    r * Math.sin(ry) * Math.cos(rx),
    r * Math.sin(rx),
    r * Math.cos(ry) * Math.cos(rx)
  );
  const base = entry.parent ? new THREE.Vector3(0,0,0) : new THREE.Vector3(0,0,0);

  if (entry.type==='sun') {
    entry.light.position.copy(dir);
    if (entry.marker) entry.marker.position.copy(dir);
    if (entry.helper) entry.helper.update();
  } else if (entry.type==='headlight') {
    // target yo'nalishi
    const pos = entry.light.position.clone();
    const targetDir = new THREE.Vector3(
      Math.sin(ry)*Math.cos(rx),
      Math.sin(rx),
      -Math.cos(ry)*Math.cos(rx)
    );
    entry.light.target.position.copy(pos.clone().add(targetDir.multiplyScalar(10)));
    entry.light.target.updateMatrixWorld();
    // Marker rotation
    if (entry.marker) {
      entry.marker.rotation.x = rx;
      entry.marker.rotation.y = ry;
    }
    if (entry.helper) entry.helper.update();
  }
}
