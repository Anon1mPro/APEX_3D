function showModelOrientPanel(obj) {
  const old = document.getElementById('model-orient-panel');
  if (old) old.remove();

  const panel = document.createElement('div');
  panel.id = 'model-orient-panel';
  panel.style.cssText = `
    position:fixed; bottom:80px; right:16px; transform:none;
    background:var(--panel); border:1px solid var(--border); border-radius:6px;
    padding:12px 14px; z-index:9999; box-shadow:0 8px 24px rgba(0,0,0,.7);
    font-family:'Rajdhani',sans-serif; width:280px;
    display:flex; flex-direction:column; gap:5px;
    max-height:80vh; overflow-y:auto;
  `;

  const glb = obj.children.find(c=>c.name==='__glb_model__');
  const curOY  = glb ? parseFloat((glb.position.y).toFixed(3)) : 0;
  const curOX  = glb ? parseFloat((glb.position.x).toFixed(3)) : 0;
  const curOZ  = glb ? parseFloat((glb.position.z).toFixed(3)) : 0;
  const curRX  = glb ? Math.round(glb.rotation.x * 180/Math.PI) : 0;
  const curRY  = glb ? Math.round(glb.rotation.y * 180/Math.PI) : 0;
  const curRZ  = glb ? Math.round(glb.rotation.z * 180/Math.PI) : 0;
  const curSC  = glb ? parseFloat(glb.scale.x.toFixed(2)) : 1;
  const ud = obj.userData;
  const clampOn = ud._glbClampY !== undefined;

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent2);letter-spacing:1px">📦 MODEL SOZLASH</span>
      <button onclick="document.getElementById('model-orient-panel').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;line-height:1">✕</button>
    </div>

    <!-- AYLANTIRISH -->
    <div style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin:2px 0 1px">🔄 Aylantirish</div>
    ${[['X','rx',curRX],['Y','ry',curRY],['Z','rz',curRZ]].map(([ax,id,v])=>`
    <div style="display:flex;gap:6px;align-items:center">
      <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);width:14px">${ax}</span>
      <input type="range" min="-180" max="180" value="${v}" style="flex:1" id="mop-r${ax.toLowerCase()}"
        oninput="orientModel('r${ax.toLowerCase()}',this.value);document.getElementById('mop-r${ax.toLowerCase()}-v').textContent=Math.round(this.value)+'°'">
      <span id="mop-r${ax.toLowerCase()}-v" style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent);width:34px;text-align:right">${v}°</span>
      <input type="number" value="${v}" step="1" style="width:42px;background:var(--bg);border:1px solid var(--border);color:var(--text);font-size:9px;padding:2px 4px;border-radius:2px;text-align:right"
        oninput="orientModel('r${ax.toLowerCase()}',this.value);const sl=document.getElementById('mop-r${ax.toLowerCase()}');if(sl)sl.value=this.value;document.getElementById('mop-r${ax.toLowerCase()}-v').textContent=Math.round(this.value)+'°'">
    </div>`).join('')}

    <!-- OFFSET (TEPA/PAST/CHAP/O'NG) -->
    <div style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin:4px 0 1px">📍 Offset (ob'ekt ichida joylashuv)</div>
    ${[
      ['⬆⬇ Tepa/Past (Y)','oy',curOY,-5,5,0.05],
      ['⬅➡ Chap/O\'ng (X)','ox',curOX,-5,5,0.05],
      ['↙↗ Oldi/Orqa (Z)','oz',curOZ,-5,5,0.05],
    ].map(([lbl,id,v,mn,mx,st])=>`
    <div style="display:flex;gap:6px;align-items:center">
      <span style="font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--muted);width:96px;line-height:1.2">${lbl}</span>
      <input type="range" min="${mn}" max="${mx}" step="${st}" value="${v}" style="flex:1" id="mop-${id}"
        oninput="orientModel('${id}',this.value);document.getElementById('mop-${id}-v').textContent=parseFloat(this.value).toFixed(2)">
      <span id="mop-${id}-v" style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent);width:32px;text-align:right">${v.toFixed(2)}</span>
    </div>`).join('')}

    <!-- O'LCHAM -->
    <div style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin:4px 0 1px">📐 O'lcham</div>
    <div style="display:flex;gap:6px;align-items:center">
      <input type="range" min="0.01" max="10" step="0.01" value="${curSC}" style="flex:1" id="mop-sc"
        oninput="orientModel('sc',this.value);document.getElementById('mop-sc-v').textContent=parseFloat(this.value).toFixed(2)+'x';document.getElementById('mop-sc-n').value=parseFloat(this.value).toFixed(2)">
      <span id="mop-sc-v" style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent);width:34px;text-align:right">${curSC}x</span>
      <input type="number" id="mop-sc-n" value="${curSC}" step="0.1" min="0.01" style="width:48px;background:var(--bg);border:1px solid var(--border);color:var(--text);font-size:9px;padding:2px 4px;border-radius:2px;text-align:right"
        oninput="orientModel('sc',this.value);const sl=document.getElementById('mop-sc');if(sl&&this.value>0&&this.value<=10)sl.value=this.value;document.getElementById('mop-sc-v').textContent=parseFloat(this.value).toFixed(2)+'x'">
    </div>

    <!-- Y CHEGARASI (CLAMP) -->
    <div style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin:4px 0 1px">🔒 Y chegarasi (model yuqoriga/pastga chiqmasin)</div>
    <div style="display:flex;gap:4px;align-items:center;margin-bottom:2px">
      <label style="font-size:9px;color:var(--muted);display:flex;align-items:center;gap:4px;cursor:pointer">
        <input type="checkbox" id="mop-clamp-on" ${ud._glbClampY!==undefined?'checked':''} onchange="toggleGlbClamp(this.checked)">
        Yoqish
      </label>
    </div>
    <div id="mop-clamp-fields" style="display:${ud._glbClampY!==undefined?'flex':'none'};flex-direction:column;gap:3px">
      <div style="display:flex;gap:6px;align-items:center">
        <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);width:60px">Min Y</span>
        <input type="number" id="mop-cmin" step="0.1" value="${ud._glbClampY?.min??-2}" style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);font-size:9px;padding:2px 6px;border-radius:2px"
          oninput="updateGlbClamp()">
        <span style="font-size:9px;color:var(--muted)">m</span>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);width:60px">Max Y</span>
        <input type="number" id="mop-cmax" step="0.1" value="${ud._glbClampY?.max??2}" style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);font-size:9px;padding:2px 6px;border-radius:2px"
          oninput="updateGlbClamp()">
        <span style="font-size:9px;color:var(--muted)">m</span>
      </div>
    </div>

    <!-- PRESET ROTATSIYALAR -->
    <div style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin:4px 0 1px">⚡ Tez presetlar</div>
    <div style="display:flex;gap:3px;flex-wrap:wrap">
      ${[
        ['Reset','0,0,0'],['X-90°','-90,0,0'],['X+90°','90,0,0'],
        ['Y+90°','0,90,0'],['Y+180°','0,180,0'],['Y-90°','0,-90,0'],
        ['Z+90°','0,0,90'],['Z-90°','0,0,-90'],
      ].map(([lbl,args])=>`
      <button onclick="orientPreset(${args})" style="flex:1;min-width:48px;background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:8px;padding:3px 4px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">${lbl}</button>
      `).join('')}
    </div>

    <button onclick="document.getElementById('model-orient-panel').remove()"
      style="width:100%;background:rgba(0,229,255,.08);border:1px solid rgba(0,229,255,.3);color:var(--accent);font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;padding:5px;border-radius:3px;cursor:pointer;margin-top:4px">
      ✅ Tayyor
    </button>
  `;

  document.body.appendChild(panel);
}

window.orientModel = function(axis, val) {
  if (!selectedObj) return;
  const glb = selectedObj.children.find(c=>c.name==='__glb_model__');
  if (!glb) return;
  const v = parseFloat(val);
  const deg = v * Math.PI / 180;
  if      (axis==='rx') glb.rotation.x = deg;
  else if (axis==='ry') glb.rotation.y = deg;
  else if (axis==='rz') glb.rotation.z = deg;
  else if (axis==='sc') glb.scale.setScalar(v);
  else if (axis==='oy') glb.position.y = v;
  else if (axis==='ox') glb.position.x = v;
  else if (axis==='oz') glb.position.z = v;
  // Clamp ni apply qil
  applyGlbClamp(glb, selectedObj.userData);
};

window.toggleGlbClamp = function(on) {
  if (!selectedObj) return;
  const ud = selectedObj.userData;
  const fields = document.getElementById('mop-clamp-fields');
  if (on) {
    ud._glbClampY = { min: -2, max: 2 };
    if (fields) fields.style.display = 'flex';
  } else {
    delete ud._glbClampY;
    if (fields) fields.style.display = 'none';
  }
};

window.updateGlbClamp = function() {
  if (!selectedObj) return;
  const ud = selectedObj.userData;
  const minEl = document.getElementById('mop-cmin');
  const maxEl = document.getElementById('mop-cmax');
  if (!minEl || !maxEl) return;
  ud._glbClampY = { min: parseFloat(minEl.value)||0, max: parseFloat(maxEl.value)||0 };
  const glb = selectedObj.children.find(c=>c.name==='__glb_model__');
  if (glb) applyGlbClamp(glb, ud);
};

function applyGlbClamp(glb, ud) {
  if (!ud._glbClampY) return;
  glb.position.y = Math.max(ud._glbClampY.min, Math.min(ud._glbClampY.max, glb.position.y));
  // Slider ni ham yangilaymiz
  const sl = document.getElementById('mop-oy');
  const vl = document.getElementById('mop-oy-v');
  if (sl) sl.value = glb.position.y;
  if (vl) vl.textContent = glb.position.y.toFixed(2);
}

window.orientPreset = function(rx, ry, rz) {
  if (!selectedObj) return;
  const glb = selectedObj.children.find(c=>c.name==='__glb_model__');
  if (!glb) return;
  glb.rotation.set(rx*Math.PI/180, ry*Math.PI/180, rz*Math.PI/180);
  // Slayderlarni ham yangilaymiz
  const rxEl=$('mop-rx'), ryEl=$('mop-ry'), rzEl=$('mop-rz');
  if(rxEl){rxEl.value=rx; $('mop-rx-v').textContent=rx+'°';}
  if(ryEl){ryEl.value=ry; $('mop-ry-v').textContent=ry+'°';}
  if(rzEl){rzEl.value=rz; $('mop-rz-v').textContent=rz+'°';}
};
