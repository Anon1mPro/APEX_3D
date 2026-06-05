// ============================================================
// PIVOT POINT — Ob'ekt markazini o'zgartirish
// ============================================================
const pivotMap = new Map(); // mesh -> pivot offset Vector3

window.showPivotPanel = function() {
  if (!selectedObj) { log('⚠ Avval obyekt tanlang', 'lw'); return; }
  const old = document.getElementById('pivot-panel');
  if (old) { old.remove(); return; }

  const o = selectedObj;
  const pm = pivotMap.get(o) || new THREE.Vector3(0,0,0);

  const panel = document.createElement('div');
  panel.id = 'pivot-panel';
  panel.classList.add('ui-modal');
  panel.style.cssText='border:1px solid var(--accent4);min-width:300px';
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--accent4);letter-spacing:2px">◈ PIVOT POINT</span>
      <button onclick="document.getElementById('pivot-panel').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px">✕</button>
    </div>
    <div style="font-size:10px;color:var(--muted);margin-bottom:10px;line-height:1.6">
      Pivot — ob'ektning aylanish va ko'chirish markazi.<br>
      <span style="color:var(--accent3)">Masalan: eshik uchun — chap tomoni (0, 0, -0.5)</span>
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);width:30px">X</span>
      <input type="number" id="pvx" value="${pm.x.toFixed(3)}" step="0.1" style="flex:1;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:3px 6px;border-radius:2px;outline:none" oninput="previewPivot()">
      <input type="range" min="-2" max="2" step="0.05" value="${pm.x}" style="flex:2" oninput="$('pvx').value=parseFloat(this.value).toFixed(3);previewPivot()">
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);width:30px">Y</span>
      <input type="number" id="pvy" value="${pm.y.toFixed(3)}" step="0.1" style="flex:1;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:3px 6px;border-radius:2px;outline:none" oninput="previewPivot()">
      <input type="range" min="-2" max="2" step="0.05" value="${pm.y}" style="flex:2" oninput="$('pvy').value=parseFloat(this.value).toFixed(3);previewPivot()">
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:12px">
      <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);width:30px">Z</span>
      <input type="number" id="pvz" value="${pm.z.toFixed(3)}" step="0.1" style="flex:1;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:3px 6px;border-radius:2px;outline:none" oninput="previewPivot()">
      <input type="range" min="-2" max="2" step="0.05" value="${pm.z}" style="flex:2" oninput="$('pvz').value=parseFloat(this.value).toFixed(3);previewPivot()">
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">
      <button onclick="setPivotPreset(0,0,0)" style="flex:1;min-width:60px;background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:9px;padding:4px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace">Markaz</button>
      <button onclick="setPivotPreset(-0.5,0,0)" style="flex:1;min-width:60px;background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:9px;padding:4px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace">◁ Chap</button>
      <button onclick="setPivotPreset(0.5,0,0)" style="flex:1;min-width:60px;background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:9px;padding:4px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace">▷ O'ng</button>
      <button onclick="setPivotPreset(0,-0.5,0)" style="flex:1;min-width:60px;background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:9px;padding:4px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace">▽ Pastki</button>
      <button onclick="setPivotPreset(0,0.5,0)" style="flex:1;min-width:60px;background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:9px;padding:4px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace">△ Tepaki</button>
      <button onclick="setPivotPreset(0,0,-0.5)" style="flex:1;min-width:60px;background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:9px;padding:4px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace">◁ Old</button>
      <button onclick="setPivotPreset(0,0,0.5)" style="flex:1;min-width:60px;background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:9px;padding:4px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace">▷ Orqa</button>
    </div>
    <button onclick="applyPivot()" style="width:100%;background:rgba(204,136,255,.12);border:1px solid rgba(204,136,255,.4);color:var(--accent4);font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;padding:6px;border-radius:4px;cursor:pointer">✅ Qo'llash</button>
  `;
  document.body.appendChild(panel);
};

window.setPivotPreset = function(x,y,z) {
  if($('pvx')) {$('pvx').value=x;$('pvy').value=y;$('pvz').value=z;}
  // Update sliders too
  const inputs = document.querySelectorAll('#pivot-panel input[type=range]');
  if(inputs[0]) inputs[0].value=x;
  if(inputs[1]) inputs[1].value=y;
  if(inputs[2]) inputs[2].value=z;
  previewPivot();
};

window.previewPivot = function() {
  if (!selectedObj) return;
  // Show pivot marker
  let marker = scene.getObjectByName('__pivot_marker__');
  if (!marker) {
    marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.06,8,8),
      new THREE.MeshBasicMaterial({color:0xcc88ff, depthTest:false})
    );
    marker.name = '__pivot_marker__';
    marker.renderOrder = 999;
    scene.add(marker);
  }
  const x=parseFloat($('pvx')?.value)||0;
  const y=parseFloat($('pvy')?.value)||0;
  const z=parseFloat($('pvz')?.value)||0;
  const world = new THREE.Vector3(x,y,z).applyMatrix4(selectedObj.matrixWorld);
  marker.position.copy(world);
};

window.applyPivot = function() {
  if (!selectedObj) return;
  const x=parseFloat($('pvx')?.value)||0;
  const y=parseFloat($('pvy')?.value)||0;
  const z=parseFloat($('pvz')?.value)||0;
  const offset = new THREE.Vector3(x,y,z);
  pivotMap.set(selectedObj, offset);

  // Geometry ni offset bilan ko'chir
  if (selectedObj.geometry) {
    selectedObj.geometry = selectedObj.geometry.clone();
    selectedObj.geometry.translate(-x,-y,-z);
    selectedObj.geometry.computeBoundingBox();
    selectedObj.geometry.computeBoundingSphere();
    // Kompensatsiya: mesh pozitsiyasini saqlab qolish
    selectedObj.position.x += x;
    selectedObj.position.y += y;
    selectedObj.position.z += z;
    if(outlineMesh) { outlineMesh.position.copy(selectedObj.position); }
  }

  // Marker olib tashlash
  const marker = scene.getObjectByName('__pivot_marker__');
  if(marker) scene.remove(marker);

  document.getElementById('pivot-panel')?.remove();
  log(`◈ Pivot o'zgartirildi: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`, 'lok');
  updateInspector();
};
