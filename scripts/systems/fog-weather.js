// ============================================================
// BACKGROUND IMAGE — Fon rasm yuklash va yorug'ligini sozlash
// ============================================================
let bgTexture = null;
let bgExposure = 1.0;
let bgBrightness = 1.0;

// ============================================================
// TUMAN (FOG) TIZIMI
// ============================================================
// ═══════════════════════════════════════════════════════════
// REAL TUMAN + YOMG'IR TIZIMI
// ═══════════════════════════════════════════════════════════

// ── YOMG'IR ──────────────────────────────────────────────
const RainSystem = {
  active: false,
  points: null,
  geo: null,
  mat: null,
  splashParticles: null,
  splashGeo: null,
  COUNT: 12000,
  AREA: 40,
  HEIGHT: 28,
  _cfg: { intensity: 0.6, speed: 18, wind: 0.3, size: 0.07, opacity: 0.55, color: '#aaccdd' },

  init() {
    this.geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.COUNT * 3);
    const vel = new Float32Array(this.COUNT);
    for (let i = 0; i < this.COUNT; i++) {
      pos[i*3]   = (Math.random()-0.5)*this.AREA;
      pos[i*3+1] = Math.random()*this.HEIGHT - 4;
      pos[i*3+2] = (Math.random()-0.5)*this.AREA;
      vel[i] = 0.7 + Math.random()*0.6;
    }
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute('vel', new THREE.BufferAttribute(vel, 1));

    this.mat = new THREE.PointsMaterial({
      color: new THREE.Color(this._cfg.color),
      size: this._cfg.size,
      transparent: true,
      opacity: this._cfg.opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geo, this.mat);
    this.points.name = '__rain__';
    this.points.frustumCulled = false;

    // Splash geo
    this.splashGeo = new THREE.BufferGeometry();
    const sp = new Float32Array(400*3);
    this.splashGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const splashMat = new THREE.PointsMaterial({
      color: 0x88aacc, size:0.12, transparent:true, opacity:0.4,
      depthWrite:false, blending:THREE.AdditiveBlending
    });
    this.splashParticles = new THREE.Points(this.splashGeo, splashMat);
    this.splashParticles.name = '__splash__';
    this.splashParticles.frustumCulled = false;
  },

  start() {
    if (!this.geo) this.init();
    if (!this.active) {
      scene.add(this.points);
      scene.add(this.splashParticles);
      this.active = true;
    }
  },

  stop() {
    if (this.points) scene.remove(this.points);
    if (this.splashParticles) scene.remove(this.splashParticles);
    this.active = false;
  },

  update(delta) {
    if (!this.active || !this.geo) return;
    const cfg = this._cfg;
    const pos = this.geo.attributes.position.array;
    const vel = this.geo.attributes.vel.array;
    const sp  = this.splashGeo.attributes.position.array;
    const dt  = Math.min(delta, 0.05);
    const dropSpeed = cfg.speed * cfg.intensity;
    const windX = cfg.wind * 3;
    const camX = camera.position.x;
    const camZ = camera.position.z;

    let si = 0;
    for (let i = 0; i < this.COUNT; i++) {
      const ix = i*3, iy = ix+1, iz = ix+2;
      pos[iy] -= dropSpeed * vel[i] * dt;
      pos[ix] += windX * dt;

      // Splash effect on hit ground
      if (pos[iy] < 0.05) {
        if (si < 400) {
          sp[si*3]   = pos[ix] + (Math.random()-0.5)*0.3;
          sp[si*3+1] = 0.1;
          sp[si*3+2] = pos[iz] + (Math.random()-0.5)*0.3;
          si++;
        }
        // reset drop near camera
        pos[ix] = camX + (Math.random()-0.5)*this.AREA;
        pos[iy] = this.HEIGHT;
        pos[iz] = camZ + (Math.random()-0.5)*this.AREA;
      }
      // Keep around camera
      if (Math.abs(pos[ix]-camX) > this.AREA/2) pos[ix] = camX + (Math.random()-0.5)*this.AREA;
      if (Math.abs(pos[iz]-camZ) > this.AREA/2) pos[iz] = camZ + (Math.random()-0.5)*this.AREA;
    }

    for (let k=si*3; k<400*3; k++) sp[k]=0;
    this.geo.attributes.position.needsUpdate = true;
    this.splashGeo.attributes.position.needsUpdate = true;

    // Sync opacity/color
    this.mat.opacity = cfg.opacity * cfg.intensity;
    this.mat.color.set(cfg.color);
    this.mat.size = cfg.size;
  },

  setConfig(key, val) {
    this._cfg[key] = val;
    if (key === 'intensity' && val === 0) this.stop();
    else if (key === 'intensity' && val > 0 && !this.active) this.start();
  }
};

// Animate loop ga ulash
const _origAnimate5 = window._rainHooked;
if (!_origAnimate5) {
  window._rainHooked = true;
  const _rOrigRAF = window.requestAnimationFrame.bind(window);
}

// ── TUMAN PANEL ──────────────────────────────────────────
window.showFogPanel = function() {
  const old = document.getElementById('fog-panel');
  if (old) { old.remove(); return; }

  const fog = scene.fog;
  const isOn   = !!fog;
  const isExp  = fog instanceof THREE.FogExp2;
  const color  = fog ? '#'+fog.color.getHexString() : '#8aabb8';
  const near   = (!isExp && fog) ? fog.near   : 5;
  const far    = (!isExp && fog) ? fog.far    : 50;
  const dens   = (isExp  && fog) ? fog.density : 0.035;
  const rc     = RainSystem._cfg;

  const p = document.createElement('div');
  p.id = 'fog-panel';
  p.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    background:var(--panel);border:1px solid var(--border);border-radius:10px;
    padding:0;z-index:9999;box-shadow:0 12px 40px rgba(0,0,0,.85);
    width:310px;font-family:'Share Tech Mono',monospace;overflow:hidden`;

  p.innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(0,50,80,.6),rgba(10,20,40,.8));padding:12px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)">
      <span style="font-size:12px;color:var(--accent3);letter-spacing:2px">🌫 ATMOSFERA</span>
      <button onclick="document.getElementById('fog-panel').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;line-height:1">✕</button>
    </div>

    <div style="padding:14px;display:flex;flex-direction:column;gap:12px">

      <!-- TUMAN TURI -->
      <div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-bottom:6px">TUMAN TURI</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px">
          ${['off','linear','exp'].map(t=>`
          <button onclick="fogSetType('${t}')" style="padding:6px 4px;border-radius:4px;cursor:pointer;font-size:10px;border:1px solid ${(!isOn&&t==='off')||(isOn&&!isExp&&t==='linear')||(isExp&&t==='exp')?'var(--accent)':'var(--border)'};background:${(!isOn&&t==='off')||(isOn&&!isExp&&t==='linear')||(isExp&&t==='exp')?'rgba(0,229,255,.12)':'none'};color:${(!isOn&&t==='off')||(isOn&&!isExp&&t==='linear')||(isExp&&t==='exp')?'var(--accent)':'var(--muted)'}">${t==='off'?'⊘ O\'chiq':t==='linear'?'↔ Chiziqli':'∿ Eksponent'}</button>`).join('')}
        </div>
      </div>

      <!-- RANG -->
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:9px;color:var(--muted);width:55px">Rang</span>
        <input type="color" id="fog-color" value="${color}" oninput="fogUpdate();document.getElementById('fog-color-lbl').textContent=this.value"
          style="width:32px;height:24px;border:1px solid var(--border);background:none;cursor:pointer;border-radius:3px;padding:1px">
        <span id="fog-color-lbl" style="font-size:9px;color:var(--muted);flex:1">${color}</span>
      </div>

      <!-- CHIZIQLI PARAMETRLAR -->
      <div id="fog-linear-controls" style="${isOn&&!isExp?'':'display:none'};display:flex;flex-direction:column;gap:7px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:9px;color:var(--muted);width:55px">Yaqin</span>
          <input type="range" id="fog-near" min="0" max="80" step="0.5" value="${near}" oninput="fogUpdate();fogLbl('fog-near-lbl',this.value,'m')" style="flex:1;accent-color:var(--accent)">
          <span id="fog-near-lbl" style="font-size:9px;color:var(--accent3);width:36px;text-align:right">${near}m</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:9px;color:var(--muted);width:55px">Uzoq</span>
          <input type="range" id="fog-far" min="5" max="300" step="1" value="${far}" oninput="fogUpdate();fogLbl('fog-far-lbl',this.value,'m')" style="flex:1;accent-color:var(--accent)">
          <span id="fog-far-lbl" style="font-size:9px;color:var(--accent3);width:36px;text-align:right">${far}m</span>
        </div>
      </div>

      <!-- EKSPONENT ZICHLIK -->
      <div id="fog-exp-controls" style="${isExp?'':'display:none'}">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:9px;color:var(--muted);width:55px">Zichlik</span>
          <input type="range" id="fog-density" min="0.001" max="0.18" step="0.001" value="${dens}" oninput="fogUpdate();fogLbl('fog-dens-lbl',parseFloat(this.value).toFixed(3),'')" style="flex:1;accent-color:var(--accent)">
          <span id="fog-dens-lbl" style="font-size:9px;color:var(--accent3);width:40px;text-align:right">${dens.toFixed(3)}</span>
        </div>
      </div>

      <!-- PRESETLAR -->
      <div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-bottom:6px">TUMAN PRESETLARI</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
          <button onclick="fogPreset('morning')" style="padding:5px;border:1px solid var(--border);background:none;color:var(--muted);font-size:9px;border-radius:3px;cursor:pointer;text-align:left;padding:6px 8px">🌅 Ertalab</button>
          <button onclick="fogPreset('light')"   style="padding:5px;border:1px solid var(--border);background:none;color:var(--muted);font-size:9px;border-radius:3px;cursor:pointer;text-align:left;padding:6px 8px">☁ Yengil</button>
          <button onclick="fogPreset('heavy')"   style="padding:5px;border:1px solid var(--border);background:none;color:var(--muted);font-size:9px;border-radius:3px;cursor:pointer;text-align:left;padding:6px 8px">🌫 Qalin</button>
          <button onclick="fogPreset('night')"   style="padding:5px;border:1px solid var(--border);background:none;color:var(--muted);font-size:9px;border-radius:3px;cursor:pointer;text-align:left;padding:6px 8px">🌙 Kecha</button>
          <button onclick="fogPreset('storm')"   style="padding:5px;border:1px solid var(--border);background:none;color:var(--muted);font-size:9px;border-radius:3px;cursor:pointer;text-align:left;padding:6px 8px">⛈ Bo'ron</button>
          <button onclick="fogPreset('desert')"  style="padding:5px;border:1px solid var(--border);background:none;color:var(--muted);font-size:9px;border-radius:3px;cursor:pointer;text-align:left;padding:6px 8px">🏜 Cho'l</button>
        </div>
      </div>

      <!-- AJRATGICH -->
      <div style="height:1px;background:var(--border);margin:2px 0"></div>

      <!-- YOMG'IR -->
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:10px;color:var(--accent3);letter-spacing:1.5px">🌧 YOMG'IR</span>
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
            <span style="font-size:9px;color:var(--muted)">${RainSystem.active?'Yoniq':'O\'chiq'}</span>
            <div id="rain-toggle" onclick="rainToggle()" style="width:32px;height:16px;border-radius:8px;background:${RainSystem.active?'var(--accent)':'var(--border)'};cursor:pointer;position:relative;transition:background .2s">
              <div style="position:absolute;top:2px;${RainSystem.active?'right:2px':'left:2px'};width:12px;height:12px;border-radius:50%;background:#fff;transition:all .2s"></div>
            </div>
          </label>
        </div>

        <div style="display:flex;flex-direction:column;gap:7px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:9px;color:var(--muted);width:55px">Intensivlik</span>
            <input type="range" id="rain-intensity" min="0.1" max="1" step="0.05" value="${rc.intensity}" oninput="rainCfg('intensity',parseFloat(this.value));fogLbl('rain-int-lbl',Math.round(this.value*100),'%')" style="flex:1;accent-color:#44aaff">
            <span id="rain-int-lbl" style="font-size:9px;color:#44aaff;width:36px;text-align:right">${Math.round(rc.intensity*100)}%</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:9px;color:var(--muted);width:55px">Tezlik</span>
            <input type="range" id="rain-speed" min="4" max="40" step="1" value="${rc.speed}" oninput="rainCfg('speed',parseFloat(this.value));fogLbl('rain-spd-lbl',this.value,'')" style="flex:1;accent-color:#44aaff">
            <span id="rain-spd-lbl" style="font-size:9px;color:#44aaff;width:36px;text-align:right">${rc.speed}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:9px;color:var(--muted);width:55px">Shamol</span>
            <input type="range" id="rain-wind" min="0" max="1" step="0.05" value="${rc.wind}" oninput="rainCfg('wind',parseFloat(this.value));fogLbl('rain-wind-lbl',Math.round(this.value*100),'%')" style="flex:1;accent-color:#44aaff">
            <span id="rain-wind-lbl" style="font-size:9px;color:#44aaff;width:36px;text-align:right">${Math.round(rc.wind*100)}%</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:9px;color:var(--muted);width:55px">Tomchi</span>
            <input type="range" id="rain-size" min="0.03" max="0.18" step="0.01" value="${rc.size}" oninput="rainCfg('size',parseFloat(this.value));fogLbl('rain-sz-lbl',parseFloat(this.value).toFixed(2),'')" style="flex:1;accent-color:#44aaff">
            <span id="rain-sz-lbl" style="font-size:9px;color:#44aaff;width:36px;text-align:right">${rc.size.toFixed(2)}</span>
          </div>
        </div>

        <!-- Yomg'ir presetlari -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-top:8px">
          <button onclick="rainPreset('drizzle')" style="padding:5px 4px;border:1px solid var(--border);background:none;color:var(--muted);font-size:9px;border-radius:3px;cursor:pointer">💧 Shim</button>
          <button onclick="rainPreset('rain')"    style="padding:5px 4px;border:1px solid var(--border);background:none;color:var(--muted);font-size:9px;border-radius:3px;cursor:pointer">🌧 Yomg'ir</button>
          <button onclick="rainPreset('storm')"   style="padding:5px 4px;border:1px solid var(--border);background:none;color:var(--muted);font-size:9px;border-radius:3px;cursor:pointer">⛈ Bo'ron</button>
        </div>
      </div>

    </div>`;

  document.body.appendChild(p);
  makeDraggable(p);
  setTimeout(() => document.addEventListener('keydown', function esc(e) {
    if (e.key==='Escape') { p.remove(); document.removeEventListener('keydown', esc); }
  }), 100);
};

// Drag support for fog panel
function makeDraggable(el) {
  const header = el.querySelector('div');
  if (!header) return;
  let ox=0, oy=0, mx=0, my=0;
  header.style.cursor='move';
  header.onmousedown = function(e) {
    e.preventDefault();
    mx=e.clientX; my=e.clientY;
    document.onmouseup = () => { document.onmousemove=null; document.onmouseup=null; };
    document.onmousemove = function(e) {
      ox=mx-e.clientX; oy=my-e.clientY; mx=e.clientX; my=e.clientY;
      el.style.top=(el.offsetTop-oy)+'px'; el.style.left=(el.offsetLeft-ox)+'px';
      el.style.transform='none';
    };
  };
}

window.fogLbl = (id,v,suf) => { const el=document.getElementById(id); if(el) el.textContent=v+suf; };

window.fogSetType = function(type) {
  const color = document.getElementById('fog-color')?.value || '#8aabb8';
  if (type==='off')     { scene.fog = null; }
  else if (type==='linear') { scene.fog = new THREE.Fog(color, 8, 60); }
  else if (type==='exp')    { scene.fog = new THREE.FogExp2(color, 0.035); }
  const p = document.getElementById('fog-panel');
  if (p) { p.remove(); showFogPanel(); }
  log(`🌫 Tuman: ${type==='off'?'O\'chiq':type==='linear'?'Chiziqli':'Eksponent'}`, 'lok');
};

window.fogUpdate = function() {
  if (!scene.fog) return;
  const color   = document.getElementById('fog-color')?.value   || '#8aabb8';
  const near    = parseFloat(document.getElementById('fog-near')?.value    || 8);
  const far     = parseFloat(document.getElementById('fog-far')?.value     || 60);
  const density = parseFloat(document.getElementById('fog-density')?.value || 0.035);
  scene.fog.color.set(color);
  if (scene.fog instanceof THREE.Fog)     { scene.fog.near = near; scene.fog.far = far; }
  if (scene.fog instanceof THREE.FogExp2) { scene.fog.density = density; }
};

window.fogPreset = function(name) {
  const presets = {
    morning: { type:'exp',    color:'#c8d4c0', density:0.022 },
    light:   { type:'linear', color:'#c0d0dc', near:20, far:90,  density:0.018 },
    heavy:   { type:'exp',    color:'#7a8a94', density:0.055 },
    night:   { type:'exp',    color:'#060810', density:0.055 },
    storm:   { type:'exp',    color:'#3a4550', density:0.07  },
    desert:  { type:'exp',    color:'#c8aa78', density:0.028 },
  };
  const pr = presets[name]; if (!pr) return;
  if (pr.type==='linear') scene.fog = new THREE.Fog(pr.color, pr.near||8, pr.far||60);
  else                    scene.fog = new THREE.FogExp2(pr.color, pr.density);
  // Storm bilan yomg'ir ham yoqilsin
  if (name === 'storm') { RainSystem.start(); rainPreset('storm'); }
  const p = document.getElementById('fog-panel');
  if (p) { p.remove(); showFogPanel(); }
  log(`🌫 Preset: ${name}`, 'lok');
};

// ── YOMG'IR BOSHQARUVI ──
window.rainToggle = function() {
  if (RainSystem.active) RainSystem.stop();
  else RainSystem.start();
  const p = document.getElementById('fog-panel');
  if (p) { p.remove(); showFogPanel(); }
};

window.rainCfg = function(key, val) {
  RainSystem.setConfig(key, val);
};

window.rainPreset = function(name) {
  const presets = {
    drizzle: { intensity:0.25, speed:10, wind:0.15, size:0.045, opacity:0.35, color:'#aaccdd' },
    rain:    { intensity:0.6,  speed:18, wind:0.3,  size:0.07,  opacity:0.55, color:'#88aacc' },
    storm:   { intensity:1.0,  speed:32, wind:0.75, size:0.09,  opacity:0.7,  color:'#6688aa' },
  };
  const pr = presets[name]; if (!pr) return;
  Object.assign(RainSystem._cfg, pr);
  RainSystem.start();
  // Slayderlarni yangilash
  ['intensity','speed','wind','size'].forEach(k => {
    const el = document.getElementById('rain-'+k);
    if (el) { el.value = pr[k]; }
  });
  fogLbl('rain-int-lbl',  Math.round(pr.intensity*100),'%');
  fogLbl('rain-spd-lbl',  pr.speed, '');
  fogLbl('rain-wind-lbl', Math.round(pr.wind*100),'%');
  fogLbl('rain-sz-lbl',   pr.size.toFixed(2),'');
  log(`🌧 Yomg'ir: ${name}`, 'lok');
};

window.fogSetType = window.fogSetType;  // keep ref

window.setBgImage = function() {
  const old = document.getElementById('bg-image-panel');
  if (old) { old.remove(); return; }
  const panel = document.createElement('div');
  panel.id = 'bg-image-panel';
  panel.classList.add('ui-modal');
  panel.style.cssText='border:1px solid var(--accent);min-width:320px';
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--accent);letter-spacing:2px">🖼 FON RASM</span>
      <button onclick="document.getElementById('bg-image-panel').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:20px;line-height:1;padding:0 4px">✕</button>
    </div>
    <button onclick="loadBgImageFile()" style="width:100%;background:rgba(0,229,255,.07);border:1px dashed rgba(0,229,255,.3);color:var(--accent);font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;padding:10px;border-radius:4px;cursor:pointer;margin-bottom:10px">
      📂 Rasm yuklash (JPG/PNG/WebP)
    </button>
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);width:72px">Yorug'liq</span>
      <input type="range" id="bg-exp" min="0.1" max="5" step="0.05" value="${bgExposure}" style="flex:1"
        oninput="bgExposure=parseFloat(this.value);applyBgSettings();this.nextSibling.textContent=parseFloat(this.value).toFixed(2)+'x'">
      <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent);min-width:38px">${bgExposure.toFixed(2)}x</span>
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);width:72px">Tona map.</span>
      <select id="bg-tone" style="flex:1;font-family:'Share Tech Mono',monospace;font-size:9px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:3px 6px;border-radius:2px;outline:none" onchange="applyBgSettings()">
        <option value="acesfilmic" selected>ACESFilmic</option>
        <option value="linear">Linear</option>
        <option value="reinhard">Reinhard</option>
        <option value="none">Yo'q</option>
      </select>
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px">
      <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);width:72px">Fon rang</span>
      <input type="color" id="bg-color" value="#080b12" style="width:28px;height:22px;border:1px solid var(--border);border-radius:2px;cursor:pointer;background:none" onchange="clearBgImage(this.value)">
      <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted)">yoki rasm yuklang</span>
    </div>
    <div style="display:flex;gap:4px">
      <button onclick="clearBgImage(null);document.getElementById('bg-image-panel').remove()" style="flex:1;background:rgba(255,68,68,.08);border:1px solid rgba(255,68,68,.25);color:var(--red);font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;padding:5px;border-radius:3px;cursor:pointer">✕ Rasmni o'chir</button>
      <button onclick="document.getElementById('bg-image-panel').remove()" style="flex:1;background:rgba(0,229,255,.08);border:1px solid rgba(0,229,255,.25);color:var(--accent);font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;padding:5px;border-radius:3px;cursor:pointer">✅ Yopish</button>
    </div>
  `;
  document.body.appendChild(panel);
};

window.loadBgImageFile = function() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = e => {
    const file = e.target.files[0]; if(!file) return;
    const url = URL.createObjectURL(file);
    new THREE.TextureLoader().load(url, tex => {
      bgTexture = tex;
      // Version-aware: r155+ → colorSpace, r128 → encoding
      if ('colorSpace' in bgTexture) bgTexture.colorSpace = THREE.SRGBColorSpace;
      else bgTexture.encoding = THREE.sRGBEncoding;
      scene.background = bgTexture;
      applyBgSettings();
      log(`🖼 Fon rasm: ${file.name}`, 'lok');
      // Update exposure slider value
      const expEl = document.getElementById('bg-exp');
      if(expEl) { bgExposure=parseFloat(expEl.value); }
    });
  };
  inp.click();
};

window.applyBgSettings = function() {
  const toneEl = document.getElementById('bg-tone');
  const toneVal = toneEl ? toneEl.value : 'acesfilmic';
  renderer.toneMapping = toneVal==='acesfilmic' ? THREE.ACESFilmicToneMapping
                        : toneVal==='reinhard'  ? THREE.ReinhardToneMapping
                        : toneVal==='linear'    ? THREE.LinearToneMapping
                        : THREE.NoToneMapping;
  renderer.toneMappingExposure = bgExposure;
  if(bgTexture) scene.background = bgTexture;
};

window.clearBgImage = function(hex) {
  bgTexture = null;
  if(hex) {
    scene.background = new THREE.Color(hex);
    renderer.setClearColor(new THREE.Color(hex), 1);
  } else {
    scene.background = null;
    renderer.setClearColor(0x080b12, 1);
  }
};
