// ───────────────────────────────────────────────────────────────────
// 2. PBR / HDR ENVIRONMENT — IBL, HDRI, Normal/AO/Emissive maps
// ───────────────────────────────────────────────────────────────────
const PBRSystem = {
  envMap: null,
  envIntensity: 1.0,

  loadHDRI() {
    const inp = document.createElement('input');
    inp.type='file'; inp.accept='.hdr,.exr,.jpg,.jpeg,.png,.webp';
    inp.onchange = e => {
      const file = e.target.files[0]; if(!file) return;
      const url = URL.createObjectURL(file);
      const ext = file.name.split('.').pop().toLowerCase();

      if (ext==='hdr' || ext==='exr') {
        // Use RGBELoader if available, fallback to texture
        if (THREE.RGBELoader) {
          new THREE.RGBELoader().load(url, tex=>{
            tex.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = tex;
            scene.background = tex;
            PBRSystem.envMap = tex;
            renderer.toneMappingExposure = this.envIntensity;
            log(`🌅 HDRI yuklandi: ${file.name}`, 'lok');
          });
        } else {
          log('⚠ HDR: RGBELoader mavjud emas. JPG/PNG ishlatib ko\'ring.', 'lw');
        }
      } else {
        new THREE.TextureLoader().load(url, tex=>{
          tex.mapping = THREE.EquirectangularReflectionMapping;
          if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
          else tex.encoding = THREE.sRGBEncoding;
          scene.environment = tex;
          scene.background = tex;
          PBRSystem.envMap = tex;
          log(`🌅 Environment map: ${file.name}`, 'lok');
        });
      }
    };
    inp.click();
  },

  loadNormalMap(obj) {
    obj = obj || selectedObj; if(!obj||!obj.material) return;
    const inp = document.createElement('input');
    inp.type='file'; inp.accept='image/*';
    inp.onchange=e=>{
      const f=e.target.files[0]; if(!f) return;
      new THREE.TextureLoader().load(URL.createObjectURL(f), tex=>{
        obj.material.normalMap = tex;
        obj.material.normalScale.set(1,1);
        obj.material.needsUpdate = true;
        log(`🗺 Normal map: ${f.name} → ${obj.userData.name}`, 'lok');
      });
    };
    inp.click();
  },

  loadAOMap(obj) {
    obj = obj || selectedObj; if(!obj||!obj.material) return;
    const inp = document.createElement('input');
    inp.type='file'; inp.accept='image/*';
    inp.onchange=e=>{
      const f=e.target.files[0]; if(!f) return;
      new THREE.TextureLoader().load(URL.createObjectURL(f), tex=>{
        obj.material.aoMap = tex;
        obj.material.aoMapIntensity = 1.0;
        obj.material.needsUpdate = true;
        log(`🎨 AO map: ${f.name}`, 'lok');
      });
    };
    inp.click();
  },

  loadEmissiveMap(obj) {
    obj = obj || selectedObj; if(!obj||!obj.material) return;
    const inp = document.createElement('input');
    inp.type='file'; inp.accept='image/*';
    inp.onchange=e=>{
      const f=e.target.files[0]; if(!f) return;
      new THREE.TextureLoader().load(URL.createObjectURL(f), tex=>{
        obj.material.emissiveMap = tex;
        obj.material.emissive.set(0xffffff);
        obj.material.emissiveIntensity = 1.0;
        obj.material.needsUpdate = true;
        log(`💡 Emissive map: ${f.name}`, 'lok');
      });
    };
    inp.click();
  },

  loadRoughnessMetalnessMap(obj) {
    obj = obj || selectedObj; if(!obj||!obj.material) return;
    const inp = document.createElement('input');
    inp.type='file'; inp.accept='image/*';
    inp.onchange=e=>{
      const f=e.target.files[0]; if(!f) return;
      new THREE.TextureLoader().load(URL.createObjectURL(f), tex=>{
        obj.material.roughnessMap = tex;
        obj.material.metalnessMap = tex;
        obj.material.needsUpdate = true;
        log(`⚙ Roughness/Metalness map: ${f.name}`, 'lok');
      });
    };
    inp.click();
  },

  showPanel() {
    const old = document.getElementById('pbr-panel');
    if (old) { old.remove(); return; }
    const panel = document.createElement('div');
    panel.id = 'pbr-panel';
    panel.classList.add('ui-modal');
    panel.style.cssText='border:1px solid var(--accent2);min-width:340px';
    const obj = selectedObj;
    const matInfo = obj?.material ? `<span style="color:var(--accent3)">${obj.userData.name}</span>` : '<span style="color:var(--muted)">Obyekt tanlanmagan</span>';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--accent2);letter-spacing:2px">✨ PBR / HDR SISTEMA</span>
        <button onclick="document.getElementById('pbr-panel').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:20px;padding:0 4px">✕</button>
      </div>

      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent2);margin-bottom:6px">🌅 ENVIRONMENT</div>
      <button onclick="PBRSystem.loadHDRI()" style="width:100%;${_smBtn2()};margin-bottom:4px">📂 HDRI / Environment Rasm yuklash</button>
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px">
        <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);width:72px">Kuch</span>
        <input type="range" min="0" max="5" step="0.05" value="${this.envIntensity}" style="flex:1"
          oninput="PBRSystem.envIntensity=parseFloat(this.value);renderer.toneMappingExposure=parseFloat(this.value);this.nextSibling.textContent=parseFloat(this.value).toFixed(2)">
        <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent);min-width:34px">${this.envIntensity.toFixed(2)}</span>
      </div>
      <button onclick="scene.environment=null;scene.background=new THREE.Color(0x080b12);PBRSystem.envMap=null" style="width:100%;${_smBtn2()};margin-bottom:12px;color:#ff6666">🗑 Env o'chir</button>

      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent2);margin-bottom:4px">🗺 TEXTURE MAPS — ${matInfo}</div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <button onclick="PBRSystem.loadNormalMap()" style="${_smBtn2()}">🗺 Normal Map yuklash</button>
        <button onclick="PBRSystem.loadAOMap()" style="${_smBtn2()}">🎨 AO (Ambient Occlusion) Map</button>
        <button onclick="PBRSystem.loadRoughnessMetalnessMap()" style="${_smBtn2()}">⚙ Roughness / Metalness Map</button>
        <button onclick="PBRSystem.loadEmissiveMap()" style="${_smBtn2()}">💡 Emissive (Yorug'lik) Map</button>
      </div>

      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent2);margin:10px 0 4px">🔧 RENDERER</div>
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
        <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);width:80px">Tone Map</span>
        <select onchange="renderer.toneMapping=parseInt(this.value);renderer.toneMapping=renderer.toneMapping" style="flex:1;font-family:'Share Tech Mono',monospace;font-size:9px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:3px;border-radius:2px;outline:none">
          <option value="1">ACESFilmic</option>
          <option value="4">Cineon</option>
          <option value="3">Reinhard</option>
          <option value="0">Yo'q</option>
        </select>
      </div>
      <div style="display:flex;gap:4px;margin-top:4px">
        <button onclick="renderer.shadowMap.enabled=!renderer.shadowMap.enabled;log('Soya: '+renderer.shadowMap.enabled,'lok')" style="flex:1;${_smBtn2()}">🌑 Soya toggle</button>
        <button onclick="renderer.setPixelRatio(Math.min(window.devicePixelRatio*1.5,3));log('HiDPI On','lok')" style="flex:1;${_smBtn2()}">🔍 HiDPI</button>
      </div>
    `;
    document.body.appendChild(panel);
  }
};

// Topbarga PBR tugmasi
(function() {
  const menu = document.getElementById('ham-menu');
  if (menu) {
    const btn = document.createElement('button');
    btn.className = 'ham-item';
    btn.onclick = () => { PBRSystem.showPanel(); closeHamMenu(); };
    btn.textContent = '✨ PBR/HDR';
    menu.appendChild(btn);
  }
})();

