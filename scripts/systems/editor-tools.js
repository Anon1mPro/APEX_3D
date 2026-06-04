// ───────────────────────────────────────────────────────────────────
// 4. EDITOR TOOLS — Snap, Align, Measure, Camera Bookmarks
// ───────────────────────────────────────────────────────────────────
const EditorTools = {
  snapEnabled: false,
  snapGrid: 0.5,
  snapRot: 15,       // degrees
  measurePoints: [],
  camBookmarks: {},

  toggleSnap() {
    this.snapEnabled = !this.snapEnabled;
    log(`🧲 Snap: ${this.snapEnabled?'ON ('+this.snapGrid+'m)':'OFF'}`, this.snapEnabled?'lok':'lw');
    const btn = document.getElementById('snap-toggle-btn');
    if (btn) {
      btn.style.background = this.snapEnabled?'rgba(57,255,20,.15)':'';
      btn.style.borderColor = this.snapEnabled?'var(--accent3)':'var(--border)';
      btn.style.color       = this.snapEnabled?'var(--accent3)':'var(--muted)';
      btn.textContent = `🧲 Snap ${this.snapEnabled?'ON':'OFF'}`;
    }
    // Topbar indikator
    const sv = document.getElementById('snap-status-v');
    const sl = document.getElementById('snap-status-lbl');
    const si = document.getElementById('snap-size-input');
    if (sv) { sv.textContent = this.snapEnabled ? this.snapGrid.toFixed(1)+'m' : 'OFF'; sv.style.color = this.snapEnabled ? 'var(--accent3)' : 'var(--muted)'; }
    if (sl) sl.style.color = this.snapEnabled ? 'var(--accent3)' : 'var(--muted)';
    if (si) { si.style.display = this.snapEnabled ? 'inline-block' : 'none'; si.value = this.snapGrid; }
  },

  snapValue(v) {
    if (!this.snapEnabled) return v;
    return Math.round(v/this.snapGrid)*this.snapGrid;
  },

  alignSelected(axis, mode) {
    if (!selectedObj) return;
    const v = mode==='zero' ? 0 : mode==='center' ?
      (() => { const b=new THREE.Box3().setFromObject(selectedObj); return -b.getCenter(new THREE.Vector3())[axis]; })()
      : selectedObj.position[axis];
    selectedObj.position[axis] = v;
    if(outlineMesh) outlineMesh.position.copy(selectedObj.position);
    updateInspector();
    log(`⬛ Align ${axis.toUpperCase()}=${v.toFixed(2)}`, 'lok');
  },

  alignMulti(axis) {
    if (multiSelected.size<2) { log('⚠ Kamida 2 ta tanlang','lw'); return; }
    const objs = [...multiSelected];
    const avg = objs.reduce((s,o)=>s+o.position[axis],0)/objs.length;
    objs.forEach(o=>{ o.position[axis]=avg; });
    log(`⬛ Align ${axis.toUpperCase()} = ${avg.toFixed(2)}`, 'lok');
  },

  distribute(axis) {
    if (multiSelected.size<3) { log('⚠ Kamida 3 ta tanlang','lw'); return; }
    const objs = [...multiSelected].sort((a,b)=>a.position[axis]-b.position[axis]);
    const min = objs[0].position[axis], max=objs[objs.length-1].position[axis];
    const step = (max-min)/(objs.length-1);
    objs.forEach((o,i)=>{ o.position[axis]=min+step*i; });
    log(`⬛ Distribute ${axis.toUpperCase()}`, 'lok');
  },

  startMeasure() {
    this.measurePoints=[];
    log('📏 O\'lchash: sahnaga 2 ta nuqta bosing (Shift+Click)', 'lw');
    this._measuring=true;
  },

  saveCamBookmark(name) {
    if (!name) name = prompt('Bookmark nomi:','Cam '+(Object.keys(this.camBookmarks).length+1));
    if (!name) return;
    this.camBookmarks[name] = {
      theta: spherical.theta,
      phi: spherical.phi,
      radius: spherical.radius,
      target: orbitTarget.clone()
    };
    log(`📷 Kamera saqlandi: "${name}"`, 'lok');
    this.showPanel();
  },

  gotoCamBookmark(name) {
    const b = this.camBookmarks[name]; if(!b) return;
    spherical.theta  = b.theta;
    spherical.phi    = b.phi;
    spherical.radius = b.radius;
    orbitTarget.copy(b.target);
    updateCamera();
    log(`📷 Kamera: "${name}"`, 'lok');
  },

  showPanel() {
    const old = document.getElementById('editor-tools-panel');
    if (old) { old.remove(); return; }
    const panel = document.createElement('div');
    panel.id = 'editor-tools-panel';
    panel.classList.add('ui-modal-scroll');
    panel.style.cssText='border:1px solid var(--accent);min-width:380px';

    const bmRows = Object.keys(this.camBookmarks).map(n=>
      `<div style="display:flex;align-items:center;justify-content:space-between;padding:3px 0">
        <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text)">📷 ${n}</span>
        <div style="display:flex;gap:4px">
          <button onclick="EditorTools.gotoCamBookmark('${n}')" style="${_smBtn('var(--accent)')}">Git</button>
          <button onclick="delete EditorTools.camBookmarks['${n}'];EditorTools.showPanel()" style="${_smBtn('#ff5555')}">✕</button>
        </div>
      </div>`).join('');

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--accent);letter-spacing:2px">🔧 EDITOR TOOLS</span>
        <button onclick="document.getElementById('editor-tools-panel').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:20px;padding:0 4px">✕</button>
      </div>

      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent);margin-bottom:4px">🧲 SNAP</div>
      <div style="display:flex;gap:4px;margin-bottom:4px;align-items:center">
        <button id="snap-toggle-btn" onclick="EditorTools.toggleSnap()" style="flex:1;${_smBtn2()};${this.snapEnabled?'background:rgba(57,255,20,.15);border-color:var(--accent3);color:var(--accent3)':''}">
          🧲 Snap ${this.snapEnabled?'ON':'OFF'}
        </button>
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px">
        <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);width:80px">Grid (m)</span>
        <input type="range" min="0.1" max="5" step="0.1" value="${this.snapGrid}" style="flex:1"
          oninput="EditorTools.snapGrid=parseFloat(this.value);this.nextSibling.textContent=parseFloat(this.value).toFixed(1)+'m'">
        <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent);min-width:34px">${this.snapGrid.toFixed(1)}m</span>
      </div>

      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent);margin-bottom:4px">⬛ TEKISLASH (Align)</div>
      <div style="display:flex;gap:4px;margin-bottom:4px;flex-wrap:wrap">
        <button onclick="EditorTools.alignSelected('x','zero')" style="${_smBtn('var(--accent)')}">X=0</button>
        <button onclick="EditorTools.alignSelected('y','zero')" style="${_smBtn('var(--accent)')}">Y=0</button>
        <button onclick="EditorTools.alignSelected('z','zero')" style="${_smBtn('var(--accent)')}">Z=0</button>
        <button onclick="EditorTools.alignMulti('x')" style="${_smBtn('var(--accent2)')}">X align</button>
        <button onclick="EditorTools.alignMulti('y')" style="${_smBtn('var(--accent2)')}">Y align</button>
        <button onclick="EditorTools.alignMulti('z')" style="${_smBtn('var(--accent2)')}">Z align</button>
        <button onclick="EditorTools.distribute('x')" style="${_smBtn('var(--accent4)')}">X taqsim</button>
        <button onclick="EditorTools.distribute('z')" style="${_smBtn('var(--accent4)')}">Z taqsim</button>
      </div>

      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent);margin-bottom:4px;margin-top:8px">📷 KAMERA BOOKMARK</div>
      <button onclick="EditorTools.saveCamBookmark()" style="width:100%;${_smBtn2()};margin-bottom:4px">+ Hozirgi holatni saqlash</button>
      <div>${bmRows||'<div style="font-size:9px;color:var(--muted);padding:4px">Hali yo\'q</div>'}</div>

      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent);margin-top:8px;margin-bottom:4px">📏 O'LCHASH</div>
      <button onclick="EditorTools.startMeasure()" style="width:100%;${_smBtn2()}">📏 2 nuqta o'rtasini o'lchash</button>
    `;
    document.body.appendChild(panel);
  }
};

// Snap ni position o'zgartirishga ulash
const _origApplyPos = window.applyPos;
window.applyPos = function() {
  if (EditorTools.snapEnabled && selectedObj) {
    ['x','y','z'].forEach(a=>{
      const el = $(a==='x'?'px':a==='y'?'py':'pz');
      if (el) el.value = EditorTools.snapValue(parseFloat(el.value)||0).toFixed(2);
    });
  }
  if (_origApplyPos) _origApplyPos();
};

(function() {
  const menu = document.getElementById('ham-menu');
  if (menu) {
    const btn = document.createElement('button');
    btn.className='ham-item';
    btn.onclick=()=>{ EditorTools.showPanel(); closeHamMenu(); };
    btn.textContent='🔧 Editor';
    menu.appendChild(btn);
  }
})();

