// ============================================================
// GLTF LOADER FACTORY — Draco + KTX2 compression support
// ============================================================
function createGLTFLoader() {
  if (!THREE.GLTFLoader) { log('❌ GLTFLoader mavjud emas','le'); return null; }
  const loader = new THREE.GLTFLoader();

  // Draco decoder — Draco siqilgan GLB larni ochish
  try {
    if (typeof THREE.DRACOLoader !== 'undefined') {
      const draco = new THREE.DRACOLoader();
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      draco.setDecoderConfig({ type: 'wasm' });
      loader.setDRACOLoader(draco);
      log('✅ Draco WASM decoder tayyor', 'lok');
    }
  } catch(e) { log('⚠ Draco: '+e.message,'lw'); }

  // KTX2 / Basis textures
  try {
    if (typeof THREE.KTX2Loader !== 'undefined') {
      const ktx2 = new THREE.KTX2Loader();
      ktx2.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/basis/');
      ktx2.detectSupport(renderer);
      loader.setKTX2Loader(ktx2);
      log('✅ KTX2/Basis texture decoder tayyor', 'lok');
    }
  } catch(e) {}

  return loader;
}

let _gltfLoader = null;
function getGLTFLoader() {
  if (!_gltfLoader) _gltfLoader = createGLTFLoader();
  return _gltfLoader || (THREE.GLTFLoader ? new THREE.GLTFLoader() : null);
}

// Fayl o'lcham va format info
window.getCompressionInfo = function(ab) {
  const mb = (ab.byteLength/1024/1024).toFixed(2);
  return { sizeMB: mb };
};

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x080b12, 0.016);

const camera = new THREE.PerspectiveCamera(60,1,0.1,1000);
camera.position.set(8,6,10);
camera.lookAt(0,0,0);

// GRID
const gridH = new THREE.GridHelper(40,40,0x1e2530,0x141820);
scene.add(gridH);
