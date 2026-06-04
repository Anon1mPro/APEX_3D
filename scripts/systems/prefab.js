// ============================================================
// PREFAB TIZIMI — saqlash, yuklash, spawn
// ============================================================
const PrefabSystem = {
  _key: 'apex3d_prefabs',

  load() {
    try { return JSON.parse(localStorage.getItem(this._key) || '[]'); }
    catch { return []; }
  },

  save(list) {
    try { localStorage.setItem(this._key, JSON.stringify(list)); }
    catch { log('⚠ Prefab saqlashda xato (xotira to\'la bo\'lishi mumkin)', 'lw'); }
  },

  _serializeObj(obj) {
    const mat = obj.material;
    const data = {
      name: obj.userData.name || 'Object',
      type: obj.userData.type || 'Mesh',
      px: obj.position.x, py: obj.position.y, pz: obj.position.z,
      rx: obj.rotation.x, ry: obj.rotation.y, rz: obj.rotation.z,
      sx: obj.scale.x,    sy: obj.scale.y,    sz: obj.scale.z,
      physMode: obj.userData.physMode || 'solid',
      isGroup: obj.isGroup || !!obj.userData.isGroup || !!obj.userData._isFolder,
      script: obj.userData.script || '',
      material: mat ? {
        color:    '#' + (mat.color     ? mat.color.getHexString()     : '88aacc'),
        emissive: '#' + (mat.emissive  ? mat.emissive.getHexString()  : '000000'),
        roughness: mat.roughness ?? 0.5,
        metalness: mat.metalness ?? 0.3,
        opacity:   mat.opacity   ?? 1.0,
        transparent: mat.transparent ?? false,
        emissiveIntensity: mat.emissiveIntensity ?? 0,
      } : null,
      children: [],
    };
    if (obj.children) {
      obj.children.forEach(ch => {
        if ((ch.isMesh || ch.isGroup) && ch.userData && ch.userData.id) {
          data.children.push(this._serializeObj(ch));
        }
      });
    }
    return data;
  },

  saveFromSelected() {
    const obj = selectedObj;
    if (!obj || !obj.userData || !obj.userData.id) { log('⚠ Avval objectni tanlang', 'lw'); return; }
    const name = prompt('Prefab nomi:', obj.userData.name || 'Prefab');
    if (!name) return;
    const list = this.load();
    const prefab = {
      id: Date.now(),
      name,
      icon: (obj.userData.isGroup || obj.isGroup || obj.userData._isFolder) ? '📦'
          : obj.userData.type==='Tekislik' ? '⬜'
          : obj.userData.physMode==='jelly' ? '🟢'
          : obj.userData.physMode==='liquid' ? '🔵'
          : '🧱',
      created: new Date().toLocaleDateString(),
      data: this._serializeObj(obj),
    };
    list.push(prefab);
    this.save(list);
    prefabRenderList();
    log(`⭐ "${name}" prefab sifatida saqlandi`, 'lok');
  },

  _spawnNode(nodeData, parentObj) {
    let mesh;
    if (nodeData.isGroup || nodeData.children?.length > 0) {
      mesh = new THREE.Group();
    } else {
      const geoMap = {
        'Kub': ()=>new THREE.BoxGeometry(1,1,1),
        'BoxGeometry': ()=>new THREE.BoxGeometry(1,1,1),
        'Sfera': ()=>new THREE.SphereGeometry(0.5,16,16),
        'Silindr': ()=>new THREE.CylinderGeometry(0.5,0.5,1,16),
        'Konus': ()=>new THREE.ConeGeometry(0.5,1,16),
        'Tekislik': ()=>new THREE.PlaneGeometry(2,2),
        'Torus': ()=>new THREE.TorusGeometry(0.5,0.2,12,36),
      };
      const geoFn = geoMap[nodeData.type] || geoMap['Kub'];
      const m = nodeData.material || {};
      const mat = new THREE.MeshStandardMaterial({
        color: m.color || '#88aacc',
        roughness: m.roughness ?? 0.5,
        metalness: m.metalness ?? 0.3,
        opacity:   m.opacity   ?? 1.0,
        transparent: m.transparent ?? false,
        emissiveIntensity: m.emissiveIntensity ?? 0,
      });
      if (m.emissive) mat.emissive.set(m.emissive);
      mesh = new THREE.Mesh(geoFn(), mat);
      mesh.castShadow = true; mesh.receiveShadow = true;
    }
    mesh.position.set(nodeData.px||0, nodeData.py||0, nodeData.pz||0);
    mesh.rotation.set(nodeData.rx||0, nodeData.ry||0, nodeData.rz||0);
    mesh.scale.set(nodeData.sx||1, nodeData.sy||1, nodeData.sz||1);
    mesh.userData = {
      id: ++objIdC,
      name: nodeData.name,
      type: nodeData.type,
      physMode: nodeData.physMode || 'solid',
      script: nodeData.script || '',
      isGroup: nodeData.isGroup,
      parentId: parentObj ? parentObj.userData.id : null,
    };
    if (parentObj) parentObj.add(mesh);
    else { scene.add(mesh); objects.push(mesh); }
    if (nodeData.children) nodeData.children.forEach(ch => this._spawnNode(ch, mesh));
    return mesh;
  },

  spawn(id) {
    const prefab = this.load().find(p => p.id === id);
    if (!prefab) return;
    const root = this._spawnNode(prefab.data, null);
    root.position.set(
      camera.position.x + Math.sin(camera.rotation.y) * -4,
      0,
      camera.position.z + Math.cos(camera.rotation.y) * -4
    );
    addPhysicsBody(root, { isStatic: false, radius: 0.6 });
    selectObject(root); updateHierarchy(); updateStats();
    log(`⭐ "${prefab.name}" prefab sahnaga qo'shildi`, 'lok');
  },

  delete(id) {
    if (!confirm('Bu prefabni o\'chirasizmi?')) return;
    const list = this.load().filter(p => p.id !== id);
    this.save(list);
    prefabRenderList();
    log('🗑 Prefab o\'chirildi', 'lw');
  },

  exportOne(id) {
    const prefab = this.load().find(p => p.id === id);
    if (!prefab) return;
    const blob = new Blob([JSON.stringify(prefab, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = prefab.name.replace(/\s+/g,'_')+'.prefab.json'; a.click();
    log(`📤 "${prefab.name}" eksport qilindi`, 'lok');
  },

  import() {
    const inp = document.createElement('input');
    inp.type='file'; inp.accept='.json';
    inp.onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const prefab = JSON.parse(ev.target.result);
          if (!prefab.data || !prefab.name) throw new Error('Noto\'g\'ri format');
          prefab.id = Date.now();
          const list = this.load(); list.push(prefab); this.save(list);
          prefabRenderList();
          log(`📥 "${prefab.name}" import qilindi`, 'lok');
        } catch(err) { log('❌ Prefab import xatosi: '+err.message,'le'); }
      };
      reader.readAsText(file);
    };
    inp.click();
  },
};

window.prefabSaveSelected = () => PrefabSystem.saveFromSelected();
window.prefabImport       = () => PrefabSystem.import();

function prefabRenderList() {
  const container = $('prefab-list'); if (!container) return;
  const list = PrefabSystem.load();
  if (!list.length) {
    container.innerHTML = `<div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);padding:12px;text-align:center;line-height:1.8">Hali prefab yo'q.<br>Objectni tanlang → 💾 Prefab saqlash</div>`;
    return;
  }
  container.innerHTML = '';
  list.forEach(p => {
    const item = document.createElement('div');
    item.classList.add('asset-lib-item');
    item.onmouseenter = () => item.style.borderColor = '#ffcc00';
    item.onmouseleave = () => item.style.borderColor = 'var(--border)';
    item.innerHTML = `
      <span style="font-size:18px;flex-shrink:0">${p.icon||'🧱'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
        <div style="font-size:8px;color:var(--muted)">${p.created||''} · ${p.data?.children?.length||0} bola</div>
      </div>
      <div style="display:flex;gap:2px;flex-shrink:0">
        <button title="Sahnaga qo'sh" onclick="PrefabSystem.spawn(${p.id});event.stopPropagation()" style="background:rgba(255,204,0,.12);border:1px solid rgba(255,204,0,.35);color:#ffcc00;font-size:11px;padding:2px 6px;border-radius:2px;cursor:pointer;font-weight:700">+</button>
        <button title="JSON eksport" onclick="PrefabSystem.exportOne(${p.id});event.stopPropagation()" style="background:none;border:1px solid var(--border);color:var(--muted);font-size:10px;padding:2px 5px;border-radius:2px;cursor:pointer">↑</button>
        <button title="O'chirish" onclick="PrefabSystem.delete(${p.id});event.stopPropagation()" style="background:none;border:1px solid var(--border);color:var(--muted);font-size:10px;padding:2px 5px;border-radius:2px;cursor:pointer">✕</button>
      </div>`;
    item.onclick = () => PrefabSystem.spawn(p.id);
    container.appendChild(item);
  });
}

// ============================================================
// ANIMATE LOOP additions — car + animal + GLB mixer
// ============================================================
const _entityAnimMixers=[]; // tracked externally via objects

initScene();
animate();
log('Ctrl+S=saqlash | Ctrl+D=nusxa | F=fokus | Del=o\'chir | Ctrl+Z=undo | Ctrl+Y=redo', 'lw');
log('📦 GLB/GLTF import: yuqoridagi Import tugmasi yoki viewport ga tashlang', 'lok');
log('🎯 Gizmo: Q=tanlash W=ko\'chirish E=aylantirish R=o\'lcham | Ctrl+P=screenshot', 'lok');
