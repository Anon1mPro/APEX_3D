// ============================================================
// INSPECTOR
// ============================================================
// ============================================================
// PARTICLE INSPECTOR — To'liq zarracha boshqarish paneli
// ============================================================
function buildParticleInspector(ps) {
  const ic = $('inspector-content');
  const col = '#'+ps.mesh.material.color.getHexString();
  const p = ps.mesh.position;

  const modeLabels = {
    up:'⬆ Yuqoriga', down:'⬇ Pastga', explode:'💥 Portlash', implode:'🌑 Ichiga',
    vortex:'🌀 Vortex', tornado:'🌪 Tornado', orbit:'⭕ Orbit', random:'🎲 Tasodifiy',
    camera_attract:'📷 Kamera tortadi', camera_repel:'📷 Kamera itaradi'
  };

  ic.innerHTML = `
    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:rgba(255,150,0,.15);border-color:rgba(255,150,0,.4);color:#ffaa44">✨</span>${ps.name}</div>
      <div class="fr"><span class="fl">Zarra soni</span><span style="font-size:10px;color:var(--accent);font-family:'Share Tech Mono',monospace">${ps.count}</span></div>
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag">POS</span>Pozitsiya</div>
      <div class="xyzr">
        <div><input class="xi" id="psx" value="${p.x.toFixed(2)}" oninput="applyPsPos()"><div class="xl" style="color:#ff5555">X</div></div>
        <div><input class="xi" id="psy" value="${p.y.toFixed(2)}" oninput="applyPsPos()"><div class="xl" style="color:#55ff55">Y</div></div>
        <div><input class="xi" id="psz" value="${p.z.toFixed(2)}" oninput="applyPsPos()"><div class="xl" style="color:#5588ff">Z</div></div>
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:rgba(255,150,0,.15);border-color:rgba(255,150,0,.4);color:#ffaa44">HARAKAT</span>Yo'nalish & Kuch</div>

      <div class="fr" style="margin-bottom:4px"><span class="fl">Rejim</span>
        <select id="ps-mode" onchange="applyPsMode()" style="flex:1;font-family:'Share Tech Mono',monospace;font-size:9px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:3px 5px;border-radius:2px;outline:none">
          ${Object.entries(modeLabels).map(([k,v])=>`<option value="${k}" ${ps.mode===k?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>

      <div class="fr">
        <span class="fl">Teskari</span>
        <label class="tgl"><input type="checkbox" id="ps-rev" ${ps.reversed?'checked':''} onchange="applyPsMode()"><div class="tgl-track"></div><div class="tgl-thumb"></div></label>
      </div>

      <div class="fr"><span class="fl">Tezlik</span>
        <input type="range" min="0.005" max="0.3" step="0.005" value="${ps.speed}" id="ps-speed" style="flex:1" oninput="applyPsParam()">
        <span id="ps-speed-v" style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:34px">${ps.speed.toFixed(3)}</span>
      </div>
      <div class="fr"><span class="fl">Tarqalish</span>
        <input type="range" min="0" max="0.3" step="0.005" value="${ps.spread}" id="ps-spread" style="flex:1" oninput="applyPsParam()">
        <span id="ps-spread-v" style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:34px">${ps.spread.toFixed(3)}</span>
      </div>
      <div class="fr"><span class="fl">Tortish</span>
        <input type="range" min="-0.01" max="0.01" step="0.0005" value="${ps.gravity}" id="ps-grav" style="flex:1" oninput="applyPsParam()">
        <span id="ps-grav-v" style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px">${ps.gravity.toFixed(4)}</span>
      </div>
      <div class="fr"><span class="fl">Turbulens</span>
        <input type="range" min="0" max="0.02" step="0.001" value="${ps.turbulence}" id="ps-turb" style="flex:1" oninput="applyPsParam()">
        <span id="ps-turb-v" style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:34px">${ps.turbulence.toFixed(3)}</span>
      </div>
      <div class="fr"><span class="fl">Vortex tez.</span>
        <input type="range" min="0.1" max="5" step="0.1" value="${ps.vortexSpeed}" id="ps-vspd" style="flex:1" oninput="applyPsParam()">
        <span id="ps-vspd-v" style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:34px">${ps.vortexSpeed.toFixed(1)}</span>
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:rgba(0,200,255,.1);border-color:rgba(0,200,255,.4);color:#00ccff">📷</span>Kamera Kuchi</div>
      <div style="font-size:9px;color:var(--muted);margin-bottom:5px;font-family:'Share Tech Mono',monospace">+ tortadi | − itaradi | 0 ta'sir yo'q</div>
      <div class="fr"><span class="fl">Kuch</span>
        <input type="range" min="-0.5" max="0.5" step="0.01" value="${ps.camForce}" id="ps-cam" style="flex:1" oninput="applyPsParam()">
        <span id="ps-cam-v" style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:34px">${ps.camForce.toFixed(2)}</span>
      </div>
      <div style="display:flex;gap:4px;margin-top:4px">
        <button onclick="setPsCamForce(0.2)" style="flex:1;background:rgba(0,200,255,.08);border:1px solid rgba(0,200,255,.25);color:#00ccff;font-size:10px;padding:3px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace">📷→ Tortish</button>
        <button onclick="setPsCamForce(0)" style="flex:1;background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:10px;padding:3px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace">○ Yo'q</button>
        <button onclick="setPsCamForce(-0.2)" style="flex:1;background:rgba(255,100,100,.08);border:1px solid rgba(255,100,100,.25);color:#ff6666;font-size:10px;padding:3px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace">📷← Itarish</button>
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag">KO'R</span>Ko'rinish</div>
      <div class="fr"><span class="fl">Rang</span>
        <input type="color" value="${col}" style="width:24px;height:20px;border:1px solid var(--border);border-radius:2px;cursor:pointer;background:none" oninput="applyPsColor(this.value)">
      </div>
      <div class="fr"><span class="fl">Hajm</span>
        <input type="range" min="0.01" max="0.5" step="0.005" value="${ps.mesh.material.size}" id="ps-sz" style="flex:1" oninput="applyPsParam()">
        <span id="ps-sz-v" style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:34px">${ps.mesh.material.size.toFixed(3)}</span>
      </div>
      <div class="fr"><span class="fl">Shaffoflik</span>
        <input type="range" min="0.1" max="1" step="0.05" value="${ps.mesh.material.opacity}" id="ps-op" style="flex:1" oninput="applyPsParam()">
        <span id="ps-op-v" style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:34px">${ps.mesh.material.opacity.toFixed(2)}</span>
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag">TEZKOR</span>Presetlar</div>
      <div style="display:flex;flex-wrap:wrap;gap:3px">
        <button onclick="applyPsPreset('fire')"    style="flex:1;min-width:70px;${_psBtnStyle('#ff6600')}">🔥 Olov</button>
        <button onclick="applyPsPreset('snow')"    style="flex:1;min-width:70px;${_psBtnStyle('#aaddff')}">❄️ Qor</button>
        <button onclick="applyPsPreset('vortex')"  style="flex:1;min-width:70px;${_psBtnStyle('#cc88ff')}">🌀 Vortex</button>
        <button onclick="applyPsPreset('tornado')" style="flex:1;min-width:70px;${_psBtnStyle('#aaddff')}">🌪 Tornado</button>
        <button onclick="applyPsPreset('orbit')"   style="flex:1;min-width:70px;${_psBtnStyle('#ffee00')}">⭕ Orbit</button>
        <button onclick="applyPsPreset('explode')" style="flex:1;min-width:70px;${_psBtnStyle('#ff4400')}">💥 Portlash</button>
        <button onclick="applyPsPreset('implode')" style="flex:1;min-width:70px;${_psBtnStyle('#8866ff')}">🌑 Ichiga</button>
        <button onclick="applyPsPreset('attract')" style="flex:1;min-width:70px;${_psBtnStyle('#00ccff')}">📷 Cam+</button>
        <button onclick="applyPsPreset('repel')"   style="flex:1;min-width:70px;${_psBtnStyle('#ff5566')}">📷 Cam−</button>
      </div>
    </div>

    <div class="comp-block">
      <button class="action-btn del-btn" onclick="deletePsSelected()">✕ Zarrachalarni o'chir</button>
    </div>
  `;
}

function _psBtnStyle(c) {
  return `background:rgba(0,0,0,.2);border:1px solid ${c}44;color:${c};font-size:9px;padding:4px 2px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace`;
}

window.applyPsPos = function() {
  const ps = particleSystems.find(p=>p.mesh===selectedObj); if(!ps) return;
  ps.mesh.position.set(
    parseFloat($('psx')?.value)||0,
    parseFloat($('psy')?.value)||0,
    parseFloat($('psz')?.value)||0
  );
};

window.applyPsMode = function() {
  const ps = particleSystems.find(p=>p.mesh===selectedObj); if(!ps) return;
  ps.mode = $('ps-mode')?.value || 'up';
  ps.reversed = !!$('ps-rev')?.checked;
  // Velocitylarni qayta hisoblash
  ps.pos.fill(0);
  for(let i=0;i<ps.count;i++){ps.life[i]=Math.random();}
  _psInitVel(ps);
};

window.applyPsParam = function() {
  const ps = particleSystems.find(p=>p.mesh===selectedObj); if(!ps) return;
  const get = (id,def) => { const el=$( id); return el ? parseFloat(el.value) : def; };
  const setV = (id,v) => { const el=$(id+'-v'); if(el) el.textContent=v; };

  ps.speed    = get('ps-speed',  ps.speed);    setV('ps-speed',  ps.speed.toFixed(3));
  ps.spread   = get('ps-spread', ps.spread);   setV('ps-spread', ps.spread.toFixed(3));
  ps.gravity  = get('ps-grav',   ps.gravity);  setV('ps-grav',   ps.gravity.toFixed(4));
  ps.turbulence = get('ps-turb', ps.turbulence); setV('ps-turb', ps.turbulence.toFixed(3));
  ps.vortexSpeed = get('ps-vspd',ps.vortexSpeed); setV('ps-vspd',ps.vortexSpeed.toFixed(1));
  ps.camForce = get('ps-cam',    ps.camForce); setV('ps-cam',   ps.camForce.toFixed(2));
  const sz    = get('ps-sz', ps.mesh.material.size); setV('ps-sz', sz.toFixed(3));
  ps.mesh.material.size = sz;
  const op    = get('ps-op', ps.mesh.material.opacity); setV('ps-op', op.toFixed(2));
  ps.mesh.material.opacity = op;
  ps.mesh.material.needsUpdate = true;
};

window.applyPsColor = function(hex) {
  const ps = particleSystems.find(p=>p.mesh===selectedObj); if(!ps) return;
  ps.mesh.material.color.set(hex);
};

window.setPsCamForce = function(v) {
  const ps = particleSystems.find(p=>p.mesh===selectedObj); if(!ps) return;
  ps.camForce = v;
  const sl = $('ps-cam'); if(sl) sl.value = v;
  const lb = $('ps-cam-v'); if(lb) lb.textContent = v.toFixed(2);
};

window.applyPsPreset = function(preset) {
  const ps = particleSystems.find(p=>p.mesh===selectedObj); if(!ps) return;
  const P = {
    fire:    {mode:'up',      speed:0.06, spread:0.04, gravity:-0.001, turbulence:0.003, camForce:0, color:0xff4400, size:0.10, reversed:false},
    snow:    {mode:'down',    speed:0.02, spread:0.12, gravity: 0.001, turbulence:0.001, camForce:0, color:0xccddff, size:0.06, reversed:false},
    vortex:  {mode:'vortex',  speed:0.06, spread:0.06, gravity:0,      turbulence:0.002, camForce:0, color:0xcc88ff, size:0.08, reversed:false, vortexSpeed:1.5},
    tornado: {mode:'tornado', speed:0.05, spread:0.05, gravity:0,      turbulence:0.003, camForce:0, color:0xaaddff, size:0.07, reversed:false, vortexSpeed:2.0},
    orbit:   {mode:'orbit',   speed:0.06, spread:0.04, gravity:0,      turbulence:0.001, camForce:0, color:0xffee00, size:0.08, reversed:false, vortexSpeed:1.0},
    explode: {mode:'explode', speed:0.12, spread:0.1,  gravity:0,      turbulence:0.002, camForce:0, color:0xff8800, size:0.10, reversed:false},
    implode: {mode:'implode', speed:0.08, spread:0.08, gravity:0,      turbulence:0.002, camForce:0, color:0x8866ff, size:0.08, reversed:false},
    attract: {mode:'up',      speed:0.04, spread:0.06, gravity:0,      turbulence:0.002, camForce:0.2, color:0x00ccff, size:0.08, reversed:false},
    repel:   {mode:'up',      speed:0.04, spread:0.06, gravity:0,      turbulence:0.002, camForce:-0.2, color:0xff5566, size:0.08, reversed:false},
  };
  const cfg = P[preset]; if(!cfg) return;
  Object.assign(ps, cfg);
  ps.mesh.material.color.set(cfg.color);
  ps.mesh.material.size = cfg.size;
  ps.mesh.material.needsUpdate = true;
  _psInitVel(ps);
  buildParticleInspector(ps);
  log(`✨ Preset: ${preset}`, 'lok');
};

window.deletePsSelected = function() {
  const ps = particleSystems.find(p=>p.mesh===selectedObj); if(!ps) return;
  if(ps.mesh.parent) ps.mesh.parent.remove(ps.mesh); else scene.remove(ps.mesh);
  particleSystems.splice(particleSystems.indexOf(ps),1);
  selectedObj = null;
  updateHierarchy(); updateInspector(); updateStats();
  log(`✨ ${ps.name} o'chirildi`, 'lw');
};

