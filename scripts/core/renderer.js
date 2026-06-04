// ============================================================
// RENDERER SETUP — WebGPU detection → WebGL2
// ============================================================
const canvas = $('three-canvas');
const cvp = $('cvp');

let renderer;
let renderBackend = 'WebGL2';

// ─── Bir marta, sinxron yaratamiz ───────────────────────────
renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
  context: (() => {
    try { return canvas.getContext('webgl2', { antialias: true, powerPreference: 'high-performance' }); }
    catch(e) { return null; }
  })()
});

renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x080b12, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// ─── Version-aware API: r128 va undan yuqori versiyalar uchun ─
// r155+ da outputEncoding → outputColorSpace, physicallyCorrectLights → useLegacyLights
if ('outputColorSpace' in renderer) {
  // Three.js r155+
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.useLegacyLights  = false;
} else {
  // Three.js r128–r154
  renderer.outputEncoding       = THREE.sRGBEncoding;
  renderer.physicallyCorrectLights = true;
}
// fog-weather.js va pbr-hdr.js ichidagi tex.encoding ham shu pattern bilan yozilsin

// ─── Async: faqat GPU ma'lumoti va WebGPU tekshiruvi ────────
async function initRendererInfo() {
  // WebGPU mavjudligini tekshirish (kelajak uchun log)
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        renderBackend = 'WebGPU (via WebGL2)';
        log('⚡ WebGPU aniqlandi — WebGL2 backend (Three.js r128 compat)', 'lok');
      }
    } catch(e) {}
  }

  // WebGL2 GPU ma'lumoti
  const gl = canvas.getContext('webgl2');
  if (gl) {
    renderBackend = renderBackend === 'WebGPU (via WebGL2)' ? renderBackend : 'WebGL 2.0';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      const gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      log(`🖥 Renderer: ${renderBackend} | GPU: ${gpu}`, 'lok');
    } else {
      log(`🖥 Renderer: ${renderBackend}`, 'lok');
    }
  } else {
    renderBackend = 'WebGL 1.0';
    log('⚠ WebGL2 mavjud emas — WebGL1 ishlatilmoqda', 'lw');
  }

  const fbk = document.getElementById('render-backend-lbl');
  if (fbk) fbk.textContent = renderBackend;
}

initRendererInfo();
