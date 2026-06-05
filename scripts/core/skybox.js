// ============================================================
// SKYBOX SYSTEM
// ============================================================
let skyboxOn = false;
let skyMesh = null;
const SKIES = [
  {name:'Kosmik',top:0x000010,bot:0x050520,fog:0x000010},
  {name:'Qorong\'u',top:0x050810,bot:0x080c18,fog:0x050810},
  {name:'Tong',top:0x1a1a3a,bot:0x3a1a10,fog:0x1a1a3a},
  {name:'Okean',top:0x000820,bot:0x001828,fog:0x000820},
];
let skyIdx = 0;

window.toggleSkybox = function() {
  skyIdx = (skyIdx+1) % SKIES.length;
  const sky = SKIES[skyIdx];
  scene.background = new THREE.Color(sky.top);
  scene.fog = new THREE.FogExp2(sky.fog, 0.016);
  renderer.setClearColor(sky.top, 1);
  skyboxOn = true;

  // Add stars for cosmic
  if (skyIdx === 0) addStars();
  else removeStars();

  log(`🌌 Skybox: ${sky.name}`, 'lok');
};

let starsMesh = null;
function addStars() {
  if (starsMesh) return;
  const geo = new THREE.BufferGeometry();
  const pos = [];
  for (let i=0;i<2000;i++) {
    const r = 200 + Math.random()*100;
    const t = Math.random()*Math.PI*2, p = Math.random()*Math.PI;
    pos.push(r*Math.sin(p)*Math.cos(t), r*Math.cos(p), r*Math.sin(p)*Math.sin(t));
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  starsMesh = new THREE.Points(geo, new THREE.PointsMaterial({color:0xffffff,size:0.4,transparent:true,opacity:0.8}));
  scene.add(starsMesh);
}
function removeStars() {
  if (starsMesh) { scene.remove(starsMesh); starsMesh=null; }
}
