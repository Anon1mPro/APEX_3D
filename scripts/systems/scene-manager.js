// 1. SCENE SYSTEM — Multi-scene, Layers, Prefabs
// ───────────────────────────────────────────────────────────────────
const SceneManager = {
  scenes: {},          // {name: {objects:[], lights:[], particles:[]}}
  currentScene: 'Main',
  layers: {0:'Default', 1:'Background', 2:'UI', 3:'Effects', 4:'Collision'},
  prefabs: {},

  newScene(name) {
    if (!name) { name = prompt('Yangi sahna nomi:'); if (!name) return; }
    this.scenes[name] = { objects: [], lights: [], particles: [] };
    log(`🎬 Yangi sahna: "${name}"`, 'lok');
    this.showPanel();
  },

  saveCurrentScene() {
    const snap = {
      objects: objects.filter(o=>!o.userData.isStatic).map(o=>({
        name:o.userData.name, type:o.userData.type,
        pos:o.position.toArray(), rot:[o.rotation.x,o.rotation.y,o.rotation.z],
        scale:o.scale.toArray(), color:o.material?'#'+o.material.color.getHexString():null,
        roughness:o.material?.roughness, metalness:o.material?.metalness,
        emissive:o.material?.emissive?.getHexString(),
        emissiveIntensity:o.material?.emissiveIntensity,
        layer:o.userData.layer||0, script:o.userData.script||null,
        tags:o.userData.tags||[]
      })),
      lights: lights.map(l=>({
        type:l.type, name:l.name,
        color:'#'+l.light.color.getHexString(),
        intensity:l.light.intensity,
        pos:l.light.position?.toArray()||[0,5,0],
        distance:l.light.distance||0
      })),
      sky: { top:'#0a0e16' }
    };
    this.scenes[this.currentScene] = snap;
    log(`💾 Sahna saqlandi: "${this.currentScene}"`, 'lok');
  },

  savePrefab(name) {
    if (!selectedObj) { log('⚠ Avval obyekt tanlang', 'lw'); return; }
    if (!name) name = prompt('Prefab nomi:', selectedObj.userData.name);
    if (!name) return;
    this.prefabs[name] = {
      type: selectedObj.userData.type,
      color: selectedObj.material ? '#'+selectedObj.material.color.getHexString() : '#888888',
      roughness: selectedObj.material?.roughness || 0.5,
      metalness: selectedObj.material?.metalness || 0,
      scale: selectedObj.scale.toArray(),
      script: selectedObj.userData.script || null,
      tags: selectedObj.userData.tags || []
    };
    log(`📦 Prefab saqlandi: "${name}"`, 'lok');
    this.showPanel();
  },

  spawnPrefab(name) {
    const p = this.prefabs[name]; if (!p) return;
    const primDef = PRIMITIVES.find(pr=>pr.name===p.type) || PRIMITIVES[0];
    const mat = new THREE.MeshStandardMaterial({
      color:p.color||0x888888, roughness:p.roughness??0.5, metalness:p.metalness??0
    });
    const mesh = new THREE.Mesh(primDef.geo(), mat);
    mesh.castShadow = mesh.receiveShadow = true;
    const id = ++objIdC;
    mesh.userData = { id, name:name+' ('+id+')', type:p.type, tags:p.tags||[], script:p.script };
    mesh.scale.fromArray(p.scale||[1,1,1]);
    mesh.position.set((Math.random()-.5)*4, 1, (Math.random()-.5)*4);
    scene.add(mesh); objects.push(mesh);
    addPhysicsBody(mesh);
    if (p.script) scriptCompile(p.script, id);
    selectObject(mesh);
    updateHierarchy(); updateStats();
    log(`📦 Prefab spawn: "${name}"`, 'lok');
  },

  setLayer(obj, layerId) {
    if (!obj) return;
    obj.userData.layer = layerId;
    obj.layers.set(layerId);
    log(`🗂 Layer: "${obj.userData.name}" → ${this.layers[layerId]||layerId}`, 'lok');
  },

  showPanel() {
    const old = document.getElementById('scene-manager-panel');
    if (old) { old.remove(); return; }
    const panel = document.createElement('div');
    panel.id = 'scene-manager-panel';
    panel.classList.add('ui-modal-scroll');
    panel.style.cssText='border:1px solid var(--accent4);min-width:380px';

    const prefabRows = Object.keys(this.prefabs).map(n =>
      `<div style="display:flex;align-items:center;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)">
        <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text)">📦 ${n}</span>
        <div style="display:flex;gap:4px">
          <button onclick="SceneManager.spawnPrefab('${n}')" style="${_smBtn('var(--accent)')}">+ Spawn</button>
          <button onclick="delete SceneManager.prefabs['${n}'];SceneManager.showPanel()" style="${_smBtn('#ff5555')}">✕</button>
        </div>
      </div>`).join('');

    const layerRows = Object.entries(this.layers).map(([id,name])=>
      `<div style="display:flex;align-items:center;gap:8px;padding:3px 0">
        <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);width:18px">${id}</span>
        <span style="font-size:11px;color:var(--text);flex:1">${name}</span>
        <button onclick="SceneManager.setLayer(selectedObj,${id})" style="${_smBtn('var(--accent3)')}">Qo'y</button>
      </div>`).join('');

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--accent4);letter-spacing:2px">🎬 SCENE MANAGER</span>
        <button onclick="document.getElementById('scene-manager-panel').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:20px;padding:0 4px">✕</button>
      </div>
      <div style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:8px">Joriy: <span style="color:var(--accent4)">${this.currentScene}</span></div>

      <div style="display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap">
        <button onclick="SceneManager.newScene()" style="${_smBtn2()}">＋ Yangi sahna</button>
        <button onclick="SceneManager.saveCurrentScene()" style="${_smBtn2()}">💾 Sahna saqlash</button>
        <button onclick="SceneManager.savePrefab()" style="${_smBtn2()}">📦 Prefab saqlash</button>
      </div>

      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent4);margin-bottom:4px">PREFABLAR</div>
      <div style="min-height:30px;margin-bottom:10px">${prefabRows||'<div style="font-size:9px;color:var(--muted);padding:6px">Hech narsa yo\'q</div>'}</div>

      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent4);margin-bottom:4px">LAYERLAR</div>
      <div style="margin-bottom:8px">${layerRows}</div>
    `;
    document.body.appendChild(panel);
  }
};

function _smBtn(c) {
  return `background:rgba(0,0,0,.3);border:1px solid ${c}55;color:${c};font-family:'Share Tech Mono',monospace;font-size:9px;padding:3px 8px;border-radius:2px;cursor:pointer`;
}
function _smBtn2() {
  return `flex:1;background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--text);font-family:'Rajdhani',sans-serif;font-weight:700;font-size:11px;padding:5px;border-radius:3px;cursor:pointer`;
}

window.openSceneManager = () => SceneManager.showPanel();

// Topbarga Scene Manager tugmasi
(function() {
  const menu = document.getElementById('ham-menu');
  if (menu) {
    const btn = document.createElement('button');
    btn.className = 'ham-item';
    btn.onclick = () => { SceneManager.showPanel(); closeHamMenu(); };
    btn.textContent = '🎬 Sahnalar';
    menu.appendChild(btn);
  }
})();

