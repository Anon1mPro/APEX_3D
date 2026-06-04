// ============================================================
// TUGMA BIRIKTIRISHLAR (Keybinding) helpers
// ============================================================
function _keyLabel(code) {
  if (!code) return '---';
  const map = {
    'KeyW':'W','KeyA':'A','KeyS':'S','KeyD':'D','KeyQ':'Q','KeyE':'E',
    'KeyR':'R','KeyF':'F','KeyG':'G','KeyH':'H','KeyI':'I','KeyJ':'J',
    'KeyK':'K','KeyL':'L','KeyZ':'Z','KeyX':'X','KeyC':'C','KeyV':'V',
    'KeyB':'B','KeyN':'N','KeyM':'M','KeyP':'P','KeyO':'O','KeyT':'T',
    'KeyU':'U','KeyY':'Y',
    'Space':'SPACE','ShiftLeft':'SHIFT L','ShiftRight':'SHIFT R',
    'ControlLeft':'CTRL L','ControlRight':'CTRL R',
    'AltLeft':'ALT L','AltRight':'ALT R',
    'ArrowUp':'↑','ArrowDown':'↓','ArrowLeft':'←','ArrowRight':'→',
    'Digit1':'1','Digit2':'2','Digit3':'3','Digit4':'4','Digit5':'5',
    'Digit6':'6','Digit7':'7','Digit8':'8','Digit9':'9','Digit0':'0',
    'Enter':'ENTER','Backspace':'BKSP','Tab':'TAB','Escape':'ESC',
    'CapsLock':'CAPS',
  };
  return map[code] || code.replace('Key','').replace('Digit','');
}

function _buildMiniKeyboard() {
  const boundCodes = new Set(Object.values(playerSettings.keys));
  const rows = [
    ['Escape','','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0'],
    ['Tab','KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP'],
    ['CapsLock','KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','Enter'],
    ['ShiftLeft','KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','ShiftRight'],
    ['ControlLeft','AltLeft','Space','AltRight','ArrowLeft','ArrowDown','ArrowUp','ArrowRight'],
  ];
  const labels = {
    'Escape':'Esc','Tab':'Tab','CapsLock':'Caps','ShiftLeft':'Shift','ShiftRight':'Shift',
    'ControlLeft':'Ctrl','AltLeft':'Alt','AltRight':'Alt','Enter':'↵','Space':'SPACE',
    'ArrowLeft':'←','ArrowRight':'→','ArrowUp':'↑','ArrowDown':'↓',
    'Digit1':'1','Digit2':'2','Digit3':'3','Digit4':'4','Digit5':'5',
    'Digit6':'6','Digit7':'7','Digit8':'8','Digit9':'9','Digit0':'0',
  };
  const actionColors = {
    forward:'#00e5ff',backward:'#00e5ff',left:'#00e5ff',right:'#00e5ff',
    jump:'#39ff14',sprint:'#ffaa44',camToggle:'#cc88ff',
  };
  const codeToAction = {};
  Object.entries(playerSettings.keys).forEach(([a,c]) => { codeToAction[c] = a; });

  // Mini klaviatura endi kliklanadi - hint ko'rsatamiz
  let html = '<div style="font-family:Share Tech Mono,monospace;font-size:7px;line-height:1;position:relative">';
  rows.forEach(row => {
    html += '<div style="display:flex;gap:2px;margin-bottom:2px;justify-content:center">';
    row.forEach(code => {
      if (!code) { html += '<div style="width:6px"></div>'; return; }
      const lbl = labels[code] || code.replace('Key','').replace('Digit','');
      const isWide = ['Space','ShiftLeft','ShiftRight','CapsLock','Enter','Tab','CapsLock','ControlLeft','AltLeft','AltRight'].includes(code);
      const action = codeToAction[code];
      const animData = (window._kbAnimations||{})[code]||{};
      const hasAnim = !!animData.animName;
      const hasAlt = !!animData.altKey;
      const isBlocked = !!animData.blocked;
      const color = action ? (actionColors[action]||'#00e5ff') : null;

      let style = `padding:2px ${isWide?'6px':'3px'};min-width:${isWide?'auto':'14px'};`;
      if (action) {
        style += `background:rgba(0,0,0,.6);border:1px solid ${color};color:${color};box-shadow:0 0 5px ${color}44;font-weight:700;`;
      } else if (hasAnim) {
        style += `background:rgba(255,170,68,.08);border:1px solid rgba(255,170,68,.4);color:#ffaa44;`;
      } else if (isBlocked) {
        style += `background:rgba(255,68,68,.06);border:1px dashed rgba(255,68,68,.3);color:#ff444455;`;
      } else {
        style += `background:rgba(255,255,255,.04);border:1px solid #2a3040;color:#445;`;
      }
      style += 'border-radius:2px;text-align:center;position:relative;';

      const dots = (hasAlt?'<span style="position:absolute;top:1px;right:1px;width:3px;height:3px;border-radius:50%;background:#cc88ff"></span>':'') +
                   (hasAnim?'<span style="position:absolute;top:1px;left:1px;width:3px;height:3px;border-radius:50%;background:#ffaa44"></span>':'');
      html += `<div style="${style}">${lbl}${dots}</div>`;
    });
    html += '</div>';
  });
  html += '<div style="text-align:center;margin-top:3px;font-size:7px;color:rgba(0,229,255,.3);letter-spacing:1px">▶ BOSIB KATTALASHTIRISH</div>';
  html += '</div>';
  return html;
}

window.startRebind = function(action) {
  if (playerSettings._rebinding === action) {
    playerSettings._rebinding = null;
    updateInspector();
    return;
  }
  playerSettings._rebinding = action;
  updateInspector();
  const handler = e => {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.code === 'Escape') {
      playerSettings._rebinding = null;
      updateInspector();
      document.removeEventListener('keydown', handler, { capture: true });
      return;
    }
    playerSettings.keys[action] = e.code;
    playerSettings._rebinding = null;
    document.removeEventListener('keydown', handler, { capture: true });
    updateInspector();
    log(`⌨ ${action} → ${_keyLabel(e.code)}`, 'lok');
  };
  document.addEventListener('keydown', handler, { capture: true });
};

// ============================================================
// GLOBAL STATE
// ============================================================
window._kbAnimations = window._kbAnimations || {}; // { KeyCode: { animName, altKey, blocked } }
window._mouseAnimEvents = window._mouseAnimEvents || {
  click:'', dblclick:'', presshold:'', wheelup:'', wheeldown:'',
  dirUp:'', dirDown:'', dirLeft:'', dirRight:''
};

// ============================================================
// KATTA KLAVIATURA MODAL
// ============================================================
window.openBigKeyboard = function() {
  if (document.getElementById('bkm-overlay')) {
    document.getElementById('bkm-overlay').remove();
    return;
  }

  // CSS inject
  if (!document.getElementById('bkm-style')) {
    const s = document.createElement('style');
    s.id = 'bkm-style';
    s.textContent = `
      #bkm-overlay { position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px); }
      @keyframes bkmIn { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
      @keyframes bkmKeyPress { 0%{transform:scale(1)} 35%{transform:scale(.84);filter:brightness(2)} 100%{transform:scale(1)} }
      #bkm-panel { background:#0b1020;border:1px solid rgba(0,229,255,.2);border-radius:12px;padding:20px 22px 18px;width:720px;max-width:96vw;max-height:90vh;overflow-y:auto;box-shadow:0 0 80px rgba(0,229,255,.1);animation:bkmIn .2s ease;font-family:'Share Tech Mono',monospace;color:#c0cde0; }
      .bkm-key { display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:38px;padding:0 8px;background:rgba(255,255,255,.04);border:1px solid #232d3f;border-radius:5px;font-family:'Share Tech Mono',monospace;font-size:9px;color:#3a4a60;cursor:pointer;transition:all .12s;position:relative;user-select:none;box-sizing:border-box; }
      .bkm-key:hover { border-color:rgba(0,229,255,.4);color:#00e5ff88; }
      .bkm-key.is-action { font-weight:700; }
      .bkm-key.is-anim { border-color:rgba(255,170,68,.5);color:#ffaa44;background:rgba(255,170,68,.06); }
      .bkm-key.is-blocked { opacity:.35;border-style:dashed; }
      .bkm-key.is-alt { border-bottom:2px solid #cc88ff44; }
      .bkm-key.pressing { animation:bkmKeyPress .2s ease; }
      .bkm-kdot { position:absolute;width:4px;height:4px;border-radius:50%; }
      .bkm-tab { padding:5px 14px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:10px;border:1px solid #232d3f;background:none;color:#3a4a60;transition:all .15s; }
      .bkm-tab.on { border-color:#00e5ff;color:#00e5ff;background:rgba(0,229,255,.08); }
      .bkm-inp { width:100%;background:#080d18;border:1px solid #232d3f;color:#c0cde0;font-family:'Share Tech Mono',monospace;font-size:10px;padding:5px 8px;border-radius:4px;outline:none;box-sizing:border-box; }
      .bkm-inp:focus { border-color:#00e5ff55; }
      .bkm-btn { padding:5px 12px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:10px;border:1px solid;transition:all .12s; }
      #bkm-popup { position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:100001;background:#0b1020;border:1px solid rgba(0,229,255,.3);border-radius:8px;padding:18px 20px;min-width:300px;box-shadow:0 0 50px rgba(0,229,255,.15);animation:bkmIn .15s ease; }
    `;
    document.head.appendChild(s);
  }

  const overlay = document.createElement('div');
  overlay.id = 'bkm-overlay';

  const panel = document.createElement('div');
  panel.id = 'bkm-panel';

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  overlay.addEventListener('mousedown', e => { if (e.target === overlay) overlay.remove(); });

  _bkmRender(panel, 0);
};

function _bkmRender(panel, tab) {
  panel.innerHTML = '';

  // Header
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px';
  hdr.innerHTML = `
    <div>
      <div style="font-size:13px;font-weight:700;color:#00e5ff;letter-spacing:2px">⌨ KLAVIATURA MUHARRIRI</div>
      <div style="font-size:8px;color:#3a4a60;margin-top:2px">Klavishga bosing → animatsiya / alt-tugma / bloklash</div>
    </div>
    <button onclick="document.getElementById('bkm-overlay').remove()" style="background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);color:#ff4444;border-radius:4px;padding:4px 12px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:12px">✕</button>
  `;
  panel.appendChild(hdr);

  // Tabs
  const tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;gap:6px;margin-bottom:16px';
  [['⌨ Klavishlar',0],['🖱 Sichqoncha',1]].forEach(([lbl,i]) => {
    const b = document.createElement('button');
    b.className = 'bkm-tab' + (tab===i?' on':'');
    b.textContent = lbl;
    b.onclick = () => _bkmRender(panel, i);
    tabBar.appendChild(b);
  });
  panel.appendChild(tabBar);

  if (tab === 0) {
    _bkmRenderKeys(panel);
  } else {
    _bkmRenderMouse(panel);
  }
}

function _bkmRenderKeys(panel) {
  const rows = [
    ['Escape','','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0','Backspace'],
    ['Tab','KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP'],
    ['CapsLock','KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','Enter'],
    ['ShiftLeft','KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','ShiftRight'],
    ['ControlLeft','AltLeft','Space','AltRight','ArrowLeft','ArrowDown','ArrowUp','ArrowRight'],
  ];
  const labels = {
    'Escape':'Esc','Tab':'Tab','CapsLock':'Caps','ShiftLeft':'Shift L','ShiftRight':'Shift R',
    'ControlLeft':'Ctrl','AltLeft':'Alt','AltRight':'Alt','Enter':'↵','Space':'SPACE','Backspace':'⌫',
    'ArrowLeft':'←','ArrowRight':'→','ArrowUp':'↑','ArrowDown':'↓',
    'Digit1':'1','Digit2':'2','Digit3':'3','Digit4':'4','Digit5':'5',
    'Digit6':'6','Digit7':'7','Digit8':'8','Digit9':'9','Digit0':'0',
  };
  const wideKeys = new Set(['Space','ShiftLeft','ShiftRight','CapsLock','Enter','Tab','ControlLeft','AltLeft','AltRight','Backspace']);
  const actionColors = { forward:'#00e5ff',backward:'#00e5ff',left:'#00e5ff',right:'#00e5ff',jump:'#39ff14',sprint:'#ffaa44',camToggle:'#cc88ff' };
  const codeToAction = {};
  Object.entries(playerSettings.keys).forEach(([a,c]) => { codeToAction[c] = a; });

  const kbWrap = document.createElement('div');
  kbWrap.style.cssText = 'display:flex;flex-direction:column;gap:5px;margin-bottom:14px';

  rows.forEach(row => {
    const rowDiv = document.createElement('div');
    rowDiv.style.cssText = 'display:flex;gap:4px;justify-content:center';
    row.forEach(code => {
      if (!code) { const sp=document.createElement('div');sp.style.width='12px';rowDiv.appendChild(sp);return; }
      const lbl = labels[code] || code.replace('Key','').replace('Digit','');
      const action = codeToAction[code];
      const anim = (window._kbAnimations[code]||{});
      const color = action ? (actionColors[action]||'#00e5ff') : null;
      const isWide = wideKeys.has(code);

      const key = document.createElement('div');
      key.className = 'bkm-key' +
        (action?' is-action':'') +
        (anim.animName&&!action?' is-anim':'') +
        (anim.blocked?' is-blocked':'') +
        (anim.altKey&&!action?' is-alt':'');
      if (isWide) key.style.minWidth = code==='Space'?'130px': code==='Backspace'||code==='ShiftLeft'||code==='ShiftRight'?'68px':'58px';
      if (color) { key.style.borderColor=color; key.style.color=color; key.style.background='rgba(0,0,0,.7)'; key.style.boxShadow=`0 0 6px ${color}44`; }
      key.textContent = lbl;

      // Dots
      if (anim.altKey) { const d=document.createElement('span');d.className='bkm-kdot';d.style.cssText='top:2px;right:2px;background:#cc88ff';key.appendChild(d); }
      if (anim.animName) { const d=document.createElement('span');d.className='bkm-kdot';d.style.cssText='top:2px;left:2px;background:#ffaa44';key.appendChild(d); }

      key.title = `[${lbl}]${action?' → '+action:''}${anim.animName?' | 🎬'+anim.animName:''}${anim.altKey?' | Alt:'+_keyLabel(anim.altKey):''}${anim.blocked?' | 🚫BLOKLANGAN':''}`;

      key.onmousedown = () => { key.classList.add('pressing'); setTimeout(()=>key.classList.remove('pressing'),220); };
      key.onclick = () => _bkmOpenKeyPopup(code, lbl, action, () => { const p=document.getElementById('bkm-panel');if(p){const t=p._tab||0;_bkmRender(p,t);} });
      rowDiv.appendChild(key);
    });
    kbWrap.appendChild(rowDiv);
  });
  panel.appendChild(kbWrap);

  // Legend
  const legend = document.createElement('div');
  legend.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;font-size:8px;color:#3a4a60;border-top:1px solid #1a2535;padding-top:10px;margin-top:4px';
  legend.innerHTML = `<span style="color:#00e5ff">■ Harakat tugmasi</span><span style="color:#ffaa44">■ Animatsiyali</span><span style="color:#cc88ff">■ Alternativ</span><span style="color:#39ff14">■ Sakrash</span><span>■ Bloklangan</span>`;
  panel.appendChild(legend);

  panel._tab = 0;
}

function _bkmRenderMouse(panel) {
  panel._tab = 1;
  const ev = window._mouseAnimEvents;
  const mj = window._mouseAnimJsons = window._mouseAnimJsons || {};

  const d = document.createElement('div');
  d.innerHTML = `
    <div style="font-size:10px;color:#00e5ff;margin-bottom:14px;letter-spacing:1px">🖱 SICHQONCHA HODISALARI</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
      ${[
        ['click','🖱 Oddiy Click','1 marta bosish'],
        ['dblclick','👆 Double Click','2 marta tez bosish'],
        ['presshold','⏳ Bosib ushlab turish','500ms bosib turish'],
        ['wheelup','🔼 Yuqoriga','Scroll yuqoriga'],
        ['wheeldown','🔽 Pastga','Scroll pastga'],
      ].map(([id,lbl,desc])=>`
        <div style="background:rgba(255,255,255,.02);border:1px solid #1a2535;border-radius:6px;padding:10px">
          <div style="font-size:10px;color:#c0cde0;margin-bottom:3px">${lbl}</div>
          <div style="font-size:8px;color:#3a4a60;margin-bottom:8px">${desc}</div>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:7px 10px;border-radius:5px;background:${mj[id]?'rgba(57,255,20,.08)':'rgba(255,170,68,.06)'};border:1px solid ${mj[id]?'rgba(57,255,20,.3)':'rgba(255,170,68,.25)'};transition:all .15s">
            <span style="font-size:13px">${mj[id]?'✅':'📁'}</span>
            <span style="font-size:9px;color:${mj[id]?'#39ff14':'#ffaa44'};font-family:'Share Tech Mono',monospace">
              ${mj[id]?`<b>${ev[id]||'yuklandi'}</b>`:'Fayl yuklash'}
            </span>
            <input type="file" accept=".json" style="display:none" onchange="
              const f=this.files[0];if(!f)return;
              const nm=f.name.replace(/\\.\\w+$/,'');
              window._mouseAnimEvents['${id}']=nm;
              window._mouseAnimJsons=window._mouseAnimJsons||{};
              const r=new FileReader();
              r.onload=function(e){
                try{
                  window._mouseAnimJsons['${id}']=JSON.parse(e.target.result);
                  if(window.log)log('📁 Mouse anim yuklandi: '+nm+' → ${id}','lok');
                  const lbl=this.closest('label');
                  if(lbl){lbl.style.background='rgba(57,255,20,.08)';lbl.style.borderColor='rgba(57,255,20,.3)';lbl.querySelector('span:last-of-type').innerHTML='<b>'+nm+'</b>';lbl.querySelector('span:first-of-type').textContent='✅';}
                }catch(ex){if(window.log)log('⚠ JSON xato: '+ex.message,'lw');}
              }.bind(this);
              r.readAsText(f);
            ">
          </label>
          ${mj[id]?`<button onclick="delete window._mouseAnimJsons['${id}'];delete window._mouseAnimEvents['${id}'];_bkmRender(this.closest('#bkm-panel'),1)" style="margin-top:5px;width:100%;padding:3px;background:rgba(255,68,68,.08);border:1px solid rgba(255,68,68,.2);border-radius:4px;color:#ff4444;font-size:8px;cursor:pointer">✕ O'chirish</button>`:''}
        </div>
      `).join('')}
    </div>

    <div style="background:rgba(0,229,255,.03);border:1px solid rgba(0,229,255,.12);border-radius:8px;padding:14px;margin-bottom:12px">
      <div style="font-size:10px;color:#00e5ff;margin-bottom:5px;letter-spacing:1px">🖱 SICHQONCHA YO'NALISH ANIMATSIYASI</div>
      <div style="font-size:8px;color:#3a4a60;margin-bottom:12px">Sichqoncha o'sha tomonga harakatlanса — animatsiya trigger bo'ladi</div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:auto auto auto;gap:6px;width:186px;margin:0 auto 12px">
        <div></div>
        ${(()=>{const id='dirUp',lbl='⬆',icon='🟦';const loaded=!!mj[id];return '<label style="cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px;border-radius:6px;background:'+(loaded?'rgba(57,255,20,.1)':'rgba(255,255,255,.03)')+';border:1px solid '+(loaded?'rgba(57,255,20,.4)':'rgba(0,229,255,.15)')+';gap:3px"><div style="font-size:18px">'+icon+'</div><div style="font-size:14px">'+lbl+'</div><div style="font-size:7px;color:'+(loaded?'#39ff14':'#3a4a60')+'">'+(loaded?(ev[id]||'✓'):'fayl yoq')+'</div><input type=\'file\' accept=\'.json\' style=\'display:none\' onchange=\'const f=this.files[0];if(!f)return;const nm=f.name.replace(/\\.\\w+$/,"");window._mouseAnimEvents["'+id+'"]=nm;window._mouseAnimJsons=window._mouseAnimJsons||{};const r=new FileReader();r.onload=function(ev){try{window._mouseAnimJsons["'+id+'"]=JSON.parse(ev.target.result);if(window.log)log("📁 '+id+': "+nm,"lok");_bkmRender(document.getElementById("bkm-panel"),1);}catch(ex){}};r.readAsText(f);\'>'+( loaded ? '<button onclick=\'event.preventDefault();delete window._mouseAnimJsons["'+id+'"];delete window._mouseAnimEvents["'+id+'"];_bkmRender(document.getElementById("bkm-panel"),1)\' style=\'margin-top:3px;padding:2px 6px;background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);border-radius:3px;color:#ff6666;font-size:7px;cursor:pointer\'>✕</button>' : '' )+'</label>';})()}
        <div></div>
        ${(()=>{const id='dirLeft',lbl='⬅',icon='🟦';const loaded=!!mj[id];return '<label style="cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px;border-radius:6px;background:'+(loaded?'rgba(57,255,20,.1)':'rgba(255,255,255,.03)')+';border:1px solid '+(loaded?'rgba(57,255,20,.4)':'rgba(0,229,255,.15)')+';gap:3px"><div style="font-size:18px">'+icon+'</div><div style="font-size:14px">'+lbl+'</div><div style="font-size:7px;color:'+(loaded?'#39ff14':'#3a4a60')+'">'+(loaded?(ev[id]||'✓'):'fayl yoq')+'</div><input type=\'file\' accept=\'.json\' style=\'display:none\' onchange=\'const f=this.files[0];if(!f)return;const nm=f.name.replace(/\\.\\w+$/,"");window._mouseAnimEvents["'+id+'"]=nm;window._mouseAnimJsons=window._mouseAnimJsons||{};const r=new FileReader();r.onload=function(ev){try{window._mouseAnimJsons["'+id+'"]=JSON.parse(ev.target.result);if(window.log)log("📁 '+id+': "+nm,"lok");_bkmRender(document.getElementById("bkm-panel"),1);}catch(ex){}};r.readAsText(f);\'>'+( loaded ? '<button onclick=\'event.preventDefault();delete window._mouseAnimJsons["'+id+'"];delete window._mouseAnimEvents["'+id+'"];_bkmRender(document.getElementById("bkm-panel"),1)\' style=\'margin-top:3px;padding:2px 6px;background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);border-radius:3px;color:#ff6666;font-size:7px;cursor:pointer\'>✕</button>' : '' )+'</label>';})()}
        <div style="display:flex;align-items:center;justify-content:center;font-size:20px;opacity:.4">🖱</div>
        ${(()=>{const id='dirRight',lbl='➡',icon='🟦';const loaded=!!mj[id];return '<label style="cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px;border-radius:6px;background:'+(loaded?'rgba(57,255,20,.1)':'rgba(255,255,255,.03)')+';border:1px solid '+(loaded?'rgba(57,255,20,.4)':'rgba(0,229,255,.15)')+';gap:3px"><div style="font-size:18px">'+icon+'</div><div style="font-size:14px">'+lbl+'</div><div style="font-size:7px;color:'+(loaded?'#39ff14':'#3a4a60')+'">'+(loaded?(ev[id]||'✓'):'fayl yoq')+'</div><input type=\'file\' accept=\'.json\' style=\'display:none\' onchange=\'const f=this.files[0];if(!f)return;const nm=f.name.replace(/\\.\\w+$/,"");window._mouseAnimEvents["'+id+'"]=nm;window._mouseAnimJsons=window._mouseAnimJsons||{};const r=new FileReader();r.onload=function(ev){try{window._mouseAnimJsons["'+id+'"]=JSON.parse(ev.target.result);if(window.log)log("📁 '+id+': "+nm,"lok");_bkmRender(document.getElementById("bkm-panel"),1);}catch(ex){}};r.readAsText(f);\'>'+( loaded ? '<button onclick=\'event.preventDefault();delete window._mouseAnimJsons["'+id+'"];delete window._mouseAnimEvents["'+id+'"];_bkmRender(document.getElementById("bkm-panel"),1)\' style=\'margin-top:3px;padding:2px 6px;background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);border-radius:3px;color:#ff6666;font-size:7px;cursor:pointer\'>✕</button>' : '' )+'</label>';})()}
        <div></div>
        ${(()=>{const id='dirDown',lbl='⬇',icon='🟦';const loaded=!!mj[id];return '<label style="cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px;border-radius:6px;background:'+(loaded?'rgba(57,255,20,.1)':'rgba(255,255,255,.03)')+';border:1px solid '+(loaded?'rgba(57,255,20,.4)':'rgba(0,229,255,.15)')+';gap:3px"><div style="font-size:18px">'+icon+'</div><div style="font-size:14px">'+lbl+'</div><div style="font-size:7px;color:'+(loaded?'#39ff14':'#3a4a60')+'">'+(loaded?(ev[id]||'✓'):'fayl yoq')+'</div><input type=\'file\' accept=\'.json\' style=\'display:none\' onchange=\'const f=this.files[0];if(!f)return;const nm=f.name.replace(/\\.\\w+$/,"");window._mouseAnimEvents["'+id+'"]=nm;window._mouseAnimJsons=window._mouseAnimJsons||{};const r=new FileReader();r.onload=function(ev){try{window._mouseAnimJsons["'+id+'"]=JSON.parse(ev.target.result);if(window.log)log("📁 '+id+': "+nm,"lok");_bkmRender(document.getElementById("bkm-panel"),1);}catch(ex){}};r.readAsText(f);\'>'+( loaded ? '<button onclick=\'event.preventDefault();delete window._mouseAnimJsons["'+id+'"];delete window._mouseAnimEvents["'+id+'"];_bkmRender(document.getElementById("bkm-panel"),1)\' style=\'margin-top:3px;padding:2px 6px;background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);border-radius:3px;color:#ff6666;font-size:7px;cursor:pointer\'>✕</button>' : '' )+'</label>';})()}
        <div></div>
      </div>

      ${(()=>{
        const dirs=['dirUp','dirDown','dirLeft','dirRight'];
        const loaded=dirs.filter(d=>mj[d]);
        if(!loaded.length) return '';
        const mm=window._mouseAnimModes=window._mouseAnimModes||{};
        return loaded.map(id=>{
          const m=mm[id]||{mode:'loop',time:3};
          const lbl={dirUp:'⬆ Tepaga',dirDown:'⬇ Pastga',dirLeft:'⬅ Chapga',dirRight:'➡ Ongga'}[id];
          const btnStyle=(active,color)=>'flex:1;padding:4px;border-radius:4px;font-size:8px;cursor:pointer;border:1px solid '+(active?color:'#1a2535')+';background:'+(active?'rgba('+{loop:'0,229,255',hold:'255,170,68',time:'204,136,255'}[m.mode]+',.15)':'rgba(255,255,255,.02)')+';color:'+(active?color:'#5a6a80');
          return '<div style="margin-bottom:6px;background:rgba(255,255,255,.02);border:1px solid #1a2535;border-radius:6px;padding:8px">'
            +'<div style="font-size:9px;color:#c0cde0;margin-bottom:5px">'+lbl+' — <b style=\'color:#ffaa44\'>'+(ev[id]||'')+'</b></div>'
            +'<div style="display:flex;gap:4px">'
            +'<button onclick=\'(window._mouseAnimModes=window._mouseAnimModes||{})["'+id+'"]={mode:"loop",time:((window._mouseAnimModes||{})["'+id+'"]||{}).time||3};_bkmRender(document.getElementById("bkm-panel"),1)\' style=\''+btnStyle(m.mode==="loop","#00e5ff")+'\'>🔄 Loop</button>'
            +'<button onclick=\'(window._mouseAnimModes=window._mouseAnimModes||{})["'+id+'"]={mode:"hold",time:((window._mouseAnimModes||{})["'+id+'"]||{}).time||3};_bkmRender(document.getElementById("bkm-panel"),1)\' style=\''+btnStyle(m.mode==="hold","#ffaa44")+'\'>⏸ Qotib</button>'
            +'<button onclick=\'(window._mouseAnimModes=window._mouseAnimModes||{})["'+id+'"]={mode:"time",time:((window._mouseAnimModes||{})["'+id+'"]||{}).time||3};_bkmRender(document.getElementById("bkm-panel"),1)\' style=\''+btnStyle(m.mode==="time","#cc88ff")+'\'>⏱ Vaqt</button>'
            +'</div>'
            +(m.mode==='time'?'<div style="display:flex;align-items:center;gap:6px;margin-top:5px"><span style="font-size:8px;color:#c0cde0">Sekund:</span><input type="number" min="0.1" max="60" step="0.1" value="'+(m.time||3)+'" onchange=\'(window._mouseAnimModes=window._mouseAnimModes||{})["'+id+'"]={mode:"time",time:+this.value}\' style=\'width:50px;padding:3px;background:#0a0e16;border:1px solid #1a2535;border-radius:4px;color:#c0cde0;font-size:9px\'></div>':'')
            +'</div>';
        }).join('');
      })()}
    </div>
    <div style="font-size:8px;color:#3a4a60;line-height:1.7">
      💡 📁 tugmasini bosib JSON animatsiya faylini yuklang<br>
      ✅ — fayl yuklangan, hodisa ishga tushganda animatsiya boshlanadi
    </div>
  `;
  panel.appendChild(d);
}

function _bkmOpenKeyPopup(code, lbl, boundAction, onSave) {
  const old = document.getElementById('bkm-popup');
  if (old) old.remove();

  const anim = window._kbAnimations[code] || {};
  const popup = document.createElement('div');
  popup.id = 'bkm-popup';
  popup.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="font-size:11px;color:#00e5ff;font-weight:700">[ ${lbl} ] ${boundAction?'<span style="color:#ffaa44;font-size:9px">→ '+boundAction+'</span>':''}</div>
      <button onclick="document.getElementById('bkm-popup').remove()" style="background:none;border:none;color:#3a4a60;cursor:pointer;font-size:14px">✕</button>
    </div>

    <div style="font-size:9px;color:#3a4a60;margin-bottom:4px">🎬 Animatsiya nomi (GLB clip nomi):</div>
    <div style="display:flex;gap:6px;margin-bottom:12px;align-items:center">
      <input id="bkm-aname" class="bkm-inp" placeholder="masalan: walk, run, jump..." value="${anim.animName||''}" style="font-size:10px">
      <label style="cursor:pointer;flex-shrink:0;padding:6px 8px;border-radius:4px;background:rgba(255,170,68,.1);border:1px solid rgba(255,170,68,.3);color:#ffaa44;font-size:9px;white-space:nowrap;font-family:'Share Tech Mono',monospace">
        📁 Fayl
        <input type="file" accept=".json,.glb,.fbx" style="display:none" onchange="
          const f=this.files[0];if(!f)return;
          const nm=f.name.replace(/\.\w+$/,'');
          document.getElementById('bkm-aname').value=nm;
          if(!window._kbAnimations['${code}'])window._kbAnimations['${code}']={};
          window._kbAnimations['${code}'].animName=nm;
          if(f.name.toLowerCase().endsWith('.json')){
            const reader=new FileReader();
            reader.onload=ev=>{
              try{
                const json=JSON.parse(ev.target.result);
                window._kbAnimations['${code}'].animJson=json;
                if(window.log)log('📁 JSON yuklandi: '+nm,'lok');
              }catch(e){if(window.log)log('⚠ JSON parse xato: '+e.message,'lw');}
            };
            reader.readAsText(f);
          } else {
            window._kbAnimations['${code}'].animFile=URL.createObjectURL(f);
          }
        ">
      </label>
    </div>

    <div style="font-size:9px;color:#3a4a60;margin-bottom:4px">⌨ Alternativ klavish (bu ham xuddi [ ${lbl} ] kabi ishlaydi):</div>
    <div style="display:flex;gap:6px;margin-bottom:12px;align-items:center">
      <input id="bkm-altkey" class="bkm-inp" placeholder="masalan: ArrowUp" value="${anim.altKey||''}" style="font-size:10px;color:#cc88ff">
      <button id="bkm-catch-btn" style="flex-shrink:0;padding:6px 8px;border-radius:4px;background:rgba(204,136,255,.1);border:1px solid rgba(204,136,255,.3);color:#cc88ff;font-size:9px;cursor:pointer;font-family:'Share Tech Mono',monospace;white-space:nowrap">🎯 Tutish</button>
    </div>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:8px 10px;background:rgba(255,68,68,.04);border:1px solid rgba(255,68,68,.12);border-radius:5px">
      <input type="checkbox" id="bkm-blocked" ${anim.blocked?'checked':''} style="width:15px;height:15px;cursor:pointer;accent-color:#ff4444">
      <div>
        <div style="font-size:9px;color:#c0cde0">🚫 Bu klavishni bloklash</div>
        <div style="font-size:8px;color:#3a4a60">O'yinda bu tugma hech qanday harakatni ishlatmaydi</div>
      </div>
    </div>

    <div style="display:flex;gap:6px">
      <button id="bkm-save-btn" class="bkm-btn" style="flex:1;background:rgba(0,229,255,.12);border-color:rgba(0,229,255,.4);color:#00e5ff;font-weight:700">✅ Saqlash</button>
      <button id="bkm-clear-btn" class="bkm-btn" style="background:rgba(255,68,68,.08);border-color:rgba(255,68,68,.3);color:#ff4444">🗑 Tozala</button>
    </div>
  `;
  document.body.appendChild(popup);

  // Alternativ tugma tutish
  document.getElementById('bkm-catch-btn').onclick = () => {
    const inp = document.getElementById('bkm-altkey');
    const btn = document.getElementById('bkm-catch-btn');
    inp.value = '[ bosing... ]';
    inp.style.color = '#ffaa44';
    btn.textContent = '⏳';
    const h = e => {
      e.preventDefault(); e.stopImmediatePropagation();
      inp.value = e.code;
      inp.style.color = '#cc88ff';
      btn.textContent = '🎯 Tutish';
      document.removeEventListener('keydown', h, { capture: true });
    };
    document.addEventListener('keydown', h, { capture: true });
  };

  // Saqlash
  document.getElementById('bkm-save-btn').onclick = () => {
    const animName = document.getElementById('bkm-aname').value.trim();
    const altKey = document.getElementById('bkm-altkey').value.trim();
    const blocked = document.getElementById('bkm-blocked').checked;
    if (!window._kbAnimations[code]) window._kbAnimations[code] = {};
    window._kbAnimations[code].animName = animName;
    window._kbAnimations[code].altKey = (altKey && altKey !== '[ bosing... ]') ? altKey : '';
    window._kbAnimations[code].blocked = blocked;
    // animFile ni saqlab qolish (fayl yuklangan bo'lsa o'chirmaylik)
    // (animFile file input onchange da allaqachon o'rnatilgan)
    popup.remove();
    onSave();
    if (animName && window.log) log(`⌨ [${lbl}] → 🎬 ${animName}`, 'lok');
  };

  // Tozalash
  document.getElementById('bkm-clear-btn').onclick = () => {
    delete window._kbAnimations[code];
    popup.remove();
    onSave();
  };

  // Tashqari bosish
  const closeOut = e => { if (!popup.contains(e.target)) { popup.remove(); document.removeEventListener('mousedown', closeOut); } };
  setTimeout(() => document.addEventListener('mousedown', closeOut), 100);
}

// ============================================================
// KEYBOARD EVENT → ANIMATION TRIGGER
// ============================================================
document.addEventListener('keydown', e => {
  const anims = window._kbAnimations || {};
  const PLAYER_KEYS = ['Space','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyV'];

  // 1. Bloklash tekshiruvi — harakat tugmalari hech qachon bloklanmaydi
  if (anims[e.code] && anims[e.code].blocked && !PLAYER_KEYS.includes(e.code)) {
    e.stopImmediatePropagation();
    return;
  }

  // 2. Animatsiya ishga tushirish (faqat birinchi bosishda, repeat bo'lsa o'tkazib yuborish)
  if (anims[e.code] && anims[e.code].animName && !e.repeat) {
    _triggerObjAnim(anims[e.code].animName, e.code);
  }

  // 3. Alternativ tugma - har bir kodga boshqa kodning harakatini bajar
  Object.entries(anims).forEach(([origCode, data]) => {
    if (!data.altKey) return;
    if (e.code === data.altKey) {
      const action = Object.entries(playerSettings.keys).find(([,c]) => c === origCode);
      if (action) {
        if (window.PlayerController && window.PlayerController.keys) {
          window.PlayerController.keys[origCode] = true;
        }
        if (window._playerKeysDown) window._playerKeysDown.add(action[0]);
        // fpsKeys ga ham yoz — harakat shu yerdan o'qiladi
        if (window.fpsKeys) fpsKeys[origCode] = true;
      }
      if (data.animName && !e.repeat) _triggerObjAnim(data.animName, origCode);
    }
  });
}, true);

document.addEventListener('keyup', e => {
  const anims = window._kbAnimations || {};
  const code = e.code;

  // Tugma qo'yilganda — bog'liq animatsiyani to'xtat
  if (anims[code] && anims[code].animName) _stopKbAnim(code);
  if (window._kbActiveAnims && window._kbActiveAnims[code]) _stopKbAnim(code);

  // Alt klavish
  Object.entries(anims).forEach(([origCode, data]) => {
    if (!data.altKey || code !== data.altKey) return;
    const action = Object.entries(playerSettings.keys).find(([,c]) => c === origCode);
    if (action) {
      if (window.PlayerController?.keys) window.PlayerController.keys[origCode] = false;
      if (window._playerKeysDown) window._playerKeysDown.delete(action[0]);
      if (window.fpsKeys) fpsKeys[origCode] = false;
    }
    if (data.animName) _stopKbAnim(origCode);
  });
}, true);

// Aktiv KB animatsiyalarini saqlash (loop uchun)
window._kbActiveAnims = window._kbActiveAnims || {}; // keyCode -> { rafId, stop }

function _stopKbAnim(keyCode) {
  const existing = window._kbActiveAnims[keyCode];
  if (existing) { existing.stop(); delete window._kbActiveAnims[keyCode]; }
}
window._stopKbAnim = _stopKbAnim;

function _triggerObjAnim(animName, sourceCode) {
  // Play modeda har doim PlayerController ob'ektini ol
  let obj = (window.PlayerController && window.PlayerController.obj)
         || window.selectedObj
         || null;

  // Agar hech nima tanlanmagan bo'lsa, sahnadan birinchi non-static ob'ektni ol
  if (!obj && window.objects && window.objects.length) {
    obj = window.objects.find(o => !o.userData.isStatic && o.visible) || window.objects[0];
  }

  if (!obj) {
    if (window.log) log('⚠ Animatsiya: ob\'ekt tanlanmagan', 'lw');
    return;
  }

  // 1. GLB mixer da clip qidirish
  const mixer = obj.userData._mixer;
  const clips = obj.userData._clips || [];
  if (mixer && clips.length) {
    const clip = clips.find(c => c.name.toLowerCase() === animName.toLowerCase())
              || clips.find(c => c.name.toLowerCase().includes(animName.toLowerCase()));
    if (clip) {
      const actions = obj.userData._actions || [];
      actions.forEach(a => { if (a.isRunning && a.isRunning()) a.fadeOut(0.35); });
      const act = mixer.clipAction(clip);
      act.reset().fadeIn(0.35).play();
      if (window.log) log(`🎬 [${_keyLabel(sourceCode)}] → GLB: ${clip.name}`, 'lok');
      return;
    }
  }

  // 2. animJson (APEX JSON allaqachon parse qilingan) yoki animFile bor bo'lsa
  const animData = window._kbAnimations[sourceCode] || {};
  if (animData.animJson) {
    _playApexJsonData(obj, animData.animJson, animName, sourceCode);
    return;
  }
  if (animData.animFile) {
    // GLB yoki boshqa fayl — URL ishlatish (local server kerak bo'lsa)
    if (window.log) log('⚠ animFile fetch file:// da ishlamaydi. JSON fayl yuklang.', 'lw');
    return;
  }

  // 3. tlTracks dan ob'ektning o'z keyframe larini ishlatish
  //    (timeline da keyframe qo'yilgan bo'lsa)
  if (window.tlTracks) {
    const objId = obj.userData.id;
    const track = window.tlTracks[objId];
    if (track && track.keyframes && track.keyframes.length >= 2) {
      _playTrackAnim(obj, track.keyframes, sourceCode, animName);
      return;
    }
    // Nomi bo'yicha boshqa ob'ekt trackini qidirish
    const namedTrack = Object.values(window.tlTracks).find(tr =>
      tr.name && tr.name.toLowerCase() === animName.toLowerCase() &&
      tr.keyframes && tr.keyframes.length >= 2
    );
    if (namedTrack) {
      _playTrackAnim(obj, namedTrack.keyframes, sourceCode, animName);
      return;
    }
  }

  // 4. Fallback: scale bounce
  if (window.log) log(`🎬 [${_keyLabel(sourceCode)}] → fallback bounce (animFile yo'q, tlTrack yo'q)`, 'lok');
  _stopKbAnim(sourceCode);
  const sy = obj.scale.y;
  let t = 0;
  let rafId;
  const step = () => {
    t += 0.1;
    obj.scale.y = sy + Math.sin(t * 8) * 0.07 * Math.max(0, 1 - t);
    if (t < 1.2) { rafId = requestAnimationFrame(step); }
    else { obj.scale.y = sy; delete window._kbActiveAnims[sourceCode]; }
  };
  rafId = requestAnimationFrame(step);
  window._kbActiveAnims[sourceCode] = { stop: () => { cancelAnimationFrame(rafId); obj.scale.y = sy; } };
}

// tlTracks keyframe laridan loop animatsiya o'ynash
function _playTrackAnim(obj, kfs, sourceCode, animName) {
  _stopKbAnim(sourceCode);
  _runKfLoop(obj, kfs, animName, sourceCode);
}

// APEX JSON ob'ektidan (allaqachon parse qilingan) keyframe animatsiyasini o'ynash
function _playApexJsonData(obj, json, animName, sourceCode, once = false) {
  _stopKbAnim(sourceCode);

  let track = null;
  if (json.objects) {
    const found = json.objects.find(o =>
      o.name && o.name.toLowerCase() === animName.toLowerCase() && o.track && o.track.keyframes && o.track.keyframes.length > 1
    ) || json.objects.find(o => o.track && o.track.keyframes && o.track.keyframes.length > 1);
    if (found) track = found.track;
  } else if (json.track) {
    track = json.track;
  }

  if (!track || !track.keyframes || track.keyframes.length < 2) {
    if (window.log) log(`⚠ [${animName}] JSON da keyframe topilmadi`, 'lw');
    return;
  }

  // px/py/pz ni olib tashla — faqat rotation va scale ishlatiladi
  const kfs = track.keyframes.map(kf => ({
    t: kf.t,
    rx: kf.rx ?? 0, ry: kf.ry ?? 0, rz: kf.rz ?? 0,
    sx: kf.sx ?? 1, sy: kf.sy ?? 1, sz: kf.sz ?? 1,
    ease: kf.ease, tangent: kf.tangent
  }));

  _runKfLoop(obj, kfs, animName, sourceCode, once);
}

function _runKfLoop(obj, kfs, animName, sourceCode, once = false) {
  const span = kfs[kfs.length-1].t - kfs[0].t;
  if (span <= 0) { if (window.log) log('⚠ Keyframe span = 0', 'lw'); return; }

  if (window.log) log(`🎬 [${_keyLabel(sourceCode)}] → ${animName} (${kfs.length} KF, ${span.toFixed(2)}s, loop)`, 'lok');

  // PlayerController tekshiruvi — bir marta boshida
  const isPlayerCtrl = !!(window.PlayerController && window.PlayerController.obj === obj);

  const origRot = obj.rotation.clone();
  const origSca = obj.scale.clone();
  const origPos = obj.position.clone();
  // Animatsiya bazasi: keyframe t=0 qiymatlari (joriy holatdan emas)
  const kf0 = kfs[0];
  const baseRx = kf0.rx !== undefined ? kf0.rx : origRot.x;
  const baseRy = kf0.ry !== undefined ? kf0.ry : origRot.y;
  const baseRz = kf0.rz !== undefined ? kf0.rz : origRot.z;
  const baseSx = kf0.sx !== undefined ? kf0.sx : origSca.x;
  const baseSy = kf0.sy !== undefined ? kf0.sy : origSca.y;
  const baseSz = kf0.sz !== undefined ? kf0.sz : origSca.z;
  // Pastki chegara = animatsiya boshlanishidagi Y - scaleY/2
  // Bu chegara animatsiya davomida o'zgarmaydi
  const bottomY = obj.position.y - obj.scale.y * 0.5;

  // Silliqlik parametrlari
  const FADE_IN_DUR  = 0.35; // boshlanish uchun sekund
  const FADE_OUT_DUR = 0.35; // to'xtash uchun sekund

  function ease(t) { return t * t * (3 - 2 * t); }
  // Cubic ease-in-out — yanada silliqroq
  function easeInOut(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
  function interp(a, b, t, prop) {
    const alpha = b.t === a.t ? 1 : Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));
    return a[prop] + (b[prop] - a[prop]) * ease(alpha);
  }

  let startTime = null;
  let rafId;
  let stopped = false;
  // Fade-out holati
  let fadeOutStart = null;
  let fadeOutFrom  = null; // to'xtatilgan paytdagi qiymatlar

  function frame(now) {
    if (stopped) return;
    if (!startTime) startTime = now;
    const elapsed = (now - startTime) / 1000;

    // --- Fade-out rejimi ---
    if (fadeOutStart !== null) {
      const ft = Math.min(1, (now - fadeOutStart) / (FADE_OUT_DUR * 1000));
      const blend = 1 - easeInOut(ft);
      const isPC = window.PlayerController && window.PlayerController.obj === obj;
      obj.rotation.x = origRot.x + (fadeOutFrom.rx - origRot.x) * blend;
      if (!isPC) obj.rotation.y = origRot.y + (fadeOutFrom.ry - origRot.y) * blend;
      obj.rotation.z = origRot.z + (fadeOutFrom.rz - origRot.z) * blend;
      const blendSy = origSca.y + (fadeOutFrom.sy - origSca.y) * blend;
      obj.scale.set(
        origSca.x + (fadeOutFrom.sx - origSca.x) * blend,
        blendSy,
        origSca.z + (fadeOutFrom.sz - origSca.z) * blend
      );
      if (!isPC) obj.position.y = bottomY + blendSy * 0.5;
      if (ft < 1) { rafId = requestAnimationFrame(frame); }
      else {
        if (!isPC) {
          obj.rotation.copy(origRot);
          obj.scale.copy(origSca);
          obj.position.y = origPos.y;
        } else {
          obj.rotation.x = origRot.x;
          obj.rotation.z = origRot.z;
          obj.scale.copy(origSca);
        }
      }
      return;
    }

    // --- Animatsiya frame ---
    // once=true bo'lsa — bir marta tugagach to'xtat
    if (once && elapsed >= span) {
      stopped = true;
      // Faqat rotation ni reset — position va scale ga tegma
      const isPC = window.PlayerController && window.PlayerController.obj === obj;
      obj.rotation.x = baseRx;
      obj.rotation.z = baseRz;
      if (!isPC) obj.rotation.y = baseRy;
      delete window._kbActiveAnims[sourceCode];
      return;
    }
    const lt = kfs[0].t + (elapsed % span);

    let a = kfs[0], b = kfs[kfs.length-1];
    for (let i = 0; i < kfs.length - 1; i++) {
      if (lt >= kfs[i].t && lt <= kfs[i+1].t) { a = kfs[i]; b = kfs[i+1]; break; }
    }

    const tRx = interp(a,b,lt,'rx'), tRy = interp(a,b,lt,'ry'), tRz = interp(a,b,lt,'rz');
    const tSx = interp(a,b,lt,'sx') || origSca.x;
    const tSy = interp(a,b,lt,'sy') || origSca.y;
    const tSz = interp(a,b,lt,'sz') || origSca.z;

    // --- Fade-in blend ---
    // PlayerController uchun fade-in yo'q — darhol boshlansin
    const fadeBlend = isPlayerCtrl ? 1 : (elapsed < FADE_IN_DUR ? easeInOut(elapsed / FADE_IN_DUR) : 1);

    if (isPlayerCtrl) {
      obj.rotation.x = baseRx + (tRx - baseRx) * fadeBlend;
      obj.rotation.z = baseRz + (tRz - baseRz) * fadeBlend;
    } else {
      obj.rotation.x = baseRx + (tRx - baseRx) * fadeBlend;
      if (!obj.parent?.userData?._animProxy) obj.rotation.y = baseRy + (tRy - baseRy) * fadeBlend;
      obj.rotation.z = baseRz + (tRz - baseRz) * fadeBlend;
      const blendSy = baseSy + (tSy - baseSy) * fadeBlend;
      obj.scale.set(
        baseSx + (tSx - baseSx) * fadeBlend,
        blendSy,
        baseSz + (tSz - baseSz) * fadeBlend
      );
      obj.position.y = bottomY + blendSy * 0.5;
    }

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);
  window._kbActiveAnims[sourceCode] = {
    stop: () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(rafId);
      obj.rotation.x = baseRx;
      obj.rotation.z = baseRz;
    }
  };
}

// APEX JSON fayldan keyframe animatsiyasini o'ynash (loop)
function _playApexJsonAnim(obj, fileUrl, animName, sourceCode) {
  // Oldingi animatsiyani to'xtat
  _stopKbAnim(sourceCode);

  fetch(fileUrl)
    .then(r => r.json())
    .then(json => {
      // JSON ichida ob'ekt track ni topish (nomi yoki birinchi track)
      let track = null;
      if (json.objects) {
        // animName bilan mos ob'ektni qidirish, yo'qsa birinchi track li ob'ektni ol
        const found = json.objects.find(o =>
          o.name && o.name.toLowerCase() === animName.toLowerCase() && o.track && o.track.keyframes && o.track.keyframes.length > 1
        ) || json.objects.find(o => o.track && o.track.keyframes && o.track.keyframes.length > 1);
        if (found) track = found.track;
      } else if (json.track) {
        track = json.track;
      }

      if (!track || !track.keyframes || track.keyframes.length < 2) {
        if (window.log) log(`⚠ [${animName}] JSON da keyframe topilmadi`, 'lw');
        return;
      }

      const kfs = track.keyframes;
      const duration = (json.duration || kfs[kfs.length-1].t || 1);
      const span = kfs[kfs.length-1].t - kfs[0].t;

      if (window.log) log(`🎬 [${_keyLabel(sourceCode)}] → APEX JSON: ${animName} (${kfs.length} KF, ${span.toFixed(2)}s, loop)`, 'lok');

      const origRot = obj.rotation.clone();
      const origSca = obj.scale.clone();
      const origPos = obj.position.clone();
      // Animatsiya bazasi: kf[0] qiymatlari
      const kf0 = kfs[0];
      const baseRx = kf0.rx !== undefined ? kf0.rx : origRot.x;
      const baseRy = kf0.ry !== undefined ? kf0.ry : origRot.y;
      const baseRz = kf0.rz !== undefined ? kf0.rz : origRot.z;
      const baseSx = kf0.sx !== undefined ? kf0.sx : origSca.x;
      const baseSy = kf0.sy !== undefined ? kf0.sy : origSca.y;
      const baseSz = kf0.sz !== undefined ? kf0.sz : origSca.z;
      // Pastki chegara sabit — ob'ekt zaminga kirmasin
      const bottomY = obj.position.y - obj.scale.y * 0.5;

      // Silliqlik parametrlari
      const FADE_IN_DUR  = 0.35;
      const FADE_OUT_DUR = 0.35;

      function easeSmooth(t) { return t * t * (3 - 2 * t); }
      function easeInOut(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
      function interp(a, b, t, prop) {
        const alpha = b.t === a.t ? 1 : Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));
        return a[prop] + (b[prop] - a[prop]) * easeSmooth(alpha);
      }

      let startTime = null;
      let rafId;
      let stopped = false;
      let fadeOutStart = null;
      let fadeOutFrom  = null;

      function frame(now) {
        if (stopped) return;
        if (!startTime) startTime = now;
        const elapsed = (now - startTime) / 1000;

        // --- Fade-out rejimi ---
        if (fadeOutStart !== null) {
          const ft = Math.min(1, (now - fadeOutStart) / (FADE_OUT_DUR * 1000));
          const blend = 1 - easeInOut(ft);
          const isPC = window.PlayerController && window.PlayerController.obj === obj;
          obj.rotation.x = origRot.x + (fadeOutFrom.rx - origRot.x) * blend;
          if (!isPC) obj.rotation.y = origRot.y + (fadeOutFrom.ry - origRot.y) * blend;
          obj.rotation.z = origRot.z + (fadeOutFrom.rz - origRot.z) * blend;
          const blendSy = origSca.y + (fadeOutFrom.sy - origSca.y) * blend;
          obj.scale.set(
            origSca.x + (fadeOutFrom.sx - origSca.x) * blend,
            blendSy,
            origSca.z + (fadeOutFrom.sz - origSca.z) * blend
          );
          if (!isPC) obj.position.y = bottomY + blendSy * 0.5;
          if (ft < 1) { rafId = requestAnimationFrame(frame); }
          else {
            if (!isPC) { obj.rotation.copy(origRot); obj.position.y = origPos.y; }
            else { obj.rotation.x = origRot.x; obj.rotation.z = origRot.z; }
            obj.scale.copy(origSca);
          }
          return;
        }

        const lt = kfs[0].t + (span > 0 ? (elapsed % span) : 0);

        let a = kfs[0], b = kfs[kfs.length-1];
        for (let i = 0; i < kfs.length - 1; i++) {
          if (lt >= kfs[i].t && lt <= kfs[i+1].t) { a = kfs[i]; b = kfs[i+1]; break; }
        }

        const tRx = interp(a,b,lt,'rx'), tRy = interp(a,b,lt,'ry'), tRz = interp(a,b,lt,'rz');
        const tSx = interp(a,b,lt,'sx') || origSca.x;
        const tSy = interp(a,b,lt,'sy') || origSca.y;
        const tSz = interp(a,b,lt,'sz') || origSca.z;

        // --- Fade-in blend ---
        const isPlayerCtrl = window.PlayerController && window.PlayerController.obj === obj;
        const fadeBlend = isPlayerCtrl ? 1 : (elapsed < FADE_IN_DUR ? easeInOut(elapsed / FADE_IN_DUR) : 1);

        if (isPlayerCtrl) {
          obj.rotation.x = baseRx + (tRx - baseRx) * fadeBlend;
          obj.rotation.z = baseRz + (tRz - baseRz) * fadeBlend;
        } else {
          obj.rotation.x = baseRx + (tRx - baseRx) * fadeBlend;
          obj.rotation.y = baseRy + (tRy - baseRy) * fadeBlend;
          obj.rotation.z = baseRz + (tRz - baseRz) * fadeBlend;
          const blendSy = baseSy + (tSy - baseSy) * fadeBlend;
          obj.scale.set(
            baseSx + (tSx - baseSx) * fadeBlend,
            blendSy,
            baseSz + (tSz - baseSz) * fadeBlend
          );
          obj.position.y = bottomY + blendSy * 0.5;
        }

        rafId = requestAnimationFrame(frame);
      }

      rafId = requestAnimationFrame(frame);
      window._kbActiveAnims[sourceCode] = {
        stop: () => {
          if (stopped) return;
          stopped = true;
          cancelAnimationFrame(rafId);
          obj.rotation.x = baseRx;
          obj.rotation.z = baseRz;
        }
      };
    })
    .catch(err => {
      if (window.log) log(`⚠ JSON yuklashda xato: ${err.message}`, 'lw');
    });
}

// ============================================================
// SICHQONCHA HODISALARI (click / dblclick / hold / scroll)
// ============================================================
function _triggerMouseAnim(eventId) {
  const animName = (window._mouseAnimEvents || {})[eventId];
  if (!animName) return;
  // click, dblclick, wheel — bir martalik (loop emas)
  const once = (eventId === 'click' || eventId === 'dblclick' || eventId === 'wheelup' || eventId === 'wheeldown');
  const json = (window._mouseAnimJsons || {})[eventId];
  const obj = (window.PlayerController && window.PlayerController.obj)
            || window.selectedObj
            || (window.objects && window.objects.find(o => !o.userData.isStatic && o.visible))
            || null;
  if (!obj) return;
  if (json) {
    if (json.animFile) {
      _playApexJsonAnim(obj, json.animFile, animName, '🖱' + eventId);
    } else {
      _playApexJsonData(obj, json, animName, '🖱' + eventId, once);
    }
  } else {
    _triggerObjAnim(animName, '🖱' + eventId);
  }
}
window._triggerMouseAnim = _triggerMouseAnim;

(function _initMouseEvents() {
  // Canvas tayyor bo'lguncha kuting
  function init() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) { setTimeout(init, 800); return; }

    let pressTimer = null;

    canvas.addEventListener('click', () => _triggerMouseAnim('click'));
    canvas.addEventListener('dblclick', () => _triggerMouseAnim('dblclick'));

    canvas.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      pressTimer = setTimeout(() => _triggerMouseAnim('presshold'), 500);
    });
    canvas.addEventListener('mouseup', () => {
      clearTimeout(pressTimer);
      _stopKbAnim('🖱presshold');
    });
    canvas.addEventListener('mouseleave', () => {
      clearTimeout(pressTimer);
      _stopKbAnim('🖱presshold');
    });

    canvas.addEventListener('wheel', e => {
      if (!window.isPlaying) return;
      const dir = e.deltaY < 0 ? 'wheelup' : 'wheeldown';
      const other = e.deltaY < 0 ? 'wheeldown' : 'wheelup';
      _stopKbAnim('🖱' + other);
      _triggerMouseAnim(dir);
    }, { passive: true });
  }
  init();
})();

// ============================================================
// SICHQONCHA YO'NALISH ANIMATSIYASI
// ============================================================
// Sichqoncha harakati yo'nalishiga qarab animatsiya trigger qiladi
(function _initMouseDirAnim() {
  let _accX = 0, _accY = 0;
  let _dirCooldown = false;
  const THRESHOLD = 80; // to'plangan harakat — shu qadar bo'lganda trigger
  const COOLDOWN  = 500; // ms

  function init() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) { setTimeout(init, 800); return; }

    canvas.addEventListener('mousemove', e => {
      if (!window.isPlaying) return;

      // movementX/Y — pointer lock yoki oddiy harakat
      const mx = e.movementX || 0;
      const my = e.movementY || 0;
      if (mx === 0 && my === 0) return;

      // Cooldown paytida ham to'planadi — kamera normal ishlaydi
      if (_dirCooldown) return;

      _accX += mx;
      _accY += my;

      if (Math.abs(_accX) < THRESHOLD && Math.abs(_accY) < THRESHOLD) return;

      let dirId;
      if (Math.abs(_accY) > Math.abs(_accX)) {
        dirId = _accY < 0 ? 'dirUp' : 'dirDown';
      } else {
        dirId = _accX < 0 ? 'dirLeft' : 'dirRight';
      }

      _accX = 0; _accY = 0;

      const animJson = (window._mouseAnimJsons || {})[dirId];
      const animName = (window._mouseAnimEvents || {})[dirId];
      if (!animJson && !animName) return;

      // Barcha yo'nalish timerlarini bekor qil
      ['dirUp','dirDown','dirLeft','dirRight'].forEach(d => {
        if (d !== dirId) _cancelDirTimer(d);
      });

      _triggerDirAnim(dirId);
      _dirCooldown = true;
      setTimeout(() => { _dirCooldown = false; }, COOLDOWN);
    });
  }
  init();
})();

function _triggerDirAnim(dirId) {
  const animName = (window._mouseAnimEvents || {})[dirId];
  if (!animName) return;
  const obj = (window.PlayerController && window.PlayerController.obj)
            || window.selectedObj
            || (window.objects && window.objects.find(o => !o.userData.isStatic && o.visible))
            || null;
  if (!obj) return;
  const json = (window._mouseAnimJsons || {})[dirId];
  if (!json) { _triggerObjAnim(animName, '🖱' + dirId); return; }

  const modes = window._mouseAnimModes || {};
  const m = modes[dirId] || { mode: 'loop', time: 3 };
  const sourceCode = '🖱' + dirId;

  // Avvalgi animatsiyani to'xtat
  _stopKbAnim(sourceCode);

  if (m.mode === 'loop') {
    // 1-rejim: loop — doim qaytarib turadi
    _playApexJsonData(obj, json, animName, sourceCode, false);

  } else if (m.mode === 'hold') {
    // 2-rejim: bir marta ishlaydi, oxirida qotib qoladi
    // Boshqa yo'nalish yoki tugma bosilganda to'xtaydi
    _playApexJsonData(obj, json, animName, sourceCode, true);
    // Qotib qolish uchun oxirgi frame ni saqlab qolamiz — stop qilmaymiz

  } else if (m.mode === 'time') {
    // 3-rejim: N sekund loop, keyin oxirgi frameda qotib qoladi
    _playApexJsonData(obj, json, animName, sourceCode, false);
    const sec = (m.time || 3) * 1000;
    const timer = setTimeout(() => {
      // Loop to'xtatiladi, qotib qoladi
      const active = window._kbActiveAnims && window._kbActiveAnims[sourceCode];
      if (active) active.stop();
      delete window._kbActiveAnims[sourceCode];
    }, sec);
    // Timer ni saqla — boshqa yo'nalishga o'tganda bekor qilinsin
    window._dirAnimTimers = window._dirAnimTimers || {};
    if (window._dirAnimTimers[sourceCode]) clearTimeout(window._dirAnimTimers[sourceCode]);
    window._dirAnimTimers[sourceCode] = timer;
  }

  if (window.log) log(`🖱 ${dirId} [${m.mode}] → ${animName}`, 'lok');
}

// Boshqa yo'nalishga o'tilganda oldingi timer bekor qilinsin
function _cancelDirTimer(dirId) {
  const sourceCode = '🖱' + dirId;
  if (window._dirAnimTimers && window._dirAnimTimers[sourceCode]) {
    clearTimeout(window._dirAnimTimers[sourceCode]);
    delete window._dirAnimTimers[sourceCode];
  }
}

window._triggerMouseAnim = _triggerMouseAnim;

(function _initMouseEvents() {
  // Canvas tayyor bo'lguncha kuting
  function init() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) { setTimeout(init, 800); return; }

    let pressTimer = null;

    canvas.addEventListener('click', () => _triggerMouseAnim('click'));
    canvas.addEventListener('dblclick', () => _triggerMouseAnim('dblclick'));

    canvas.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      pressTimer = setTimeout(() => _triggerMouseAnim('presshold'), 500);
    });
    canvas.addEventListener('mouseup', () => {
      clearTimeout(pressTimer);
      _stopKbAnim('🖱presshold');
    });
    canvas.addEventListener('mouseleave', () => {
      clearTimeout(pressTimer);
      _stopKbAnim('🖱presshold');
    });

    canvas.addEventListener('wheel', e => {
      if (!window.isPlaying) return;
      const dir = e.deltaY < 0 ? 'wheelup' : 'wheeldown';
      const other = e.deltaY < 0 ? 'wheeldown' : 'wheelup';
      _stopKbAnim('🖱' + other);
      _triggerMouseAnim(dir);
    }, { passive: true });
  }
  init();
})();

// ============================================================
// O'RTA TUGMA → 4 YO'NALISH MENUSI
// ============================================================
(function _initMiddleMouseMenu() {
  function init() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) { setTimeout(init, 800); return; }

    canvas.addEventListener('mousedown', e => {
      if (e.button !== 1) return;
      e.preventDefault();
      _showDirMenu(e.clientX, e.clientY);
    });
  }
  init();
})();

function _showDirMenu(cx, cy) {
  // Eski menuni yop
  const old = document.getElementById('dir-menu-wrap');
  if (old) { old.remove(); return; }

  // CSS inject
  if (!document.getElementById('dir-menu-style')) {
    const s = document.createElement('style');
    s.id = 'dir-menu-style';
    s.textContent = `
      @keyframes dirIn { from{opacity:0;transform:translate(-50%,-50%) scale(.7)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
      .dir-btn {
        position:fixed; transform:translate(-50%,-50%);
        width:50px; height:50px; border-radius:10px;
        background:rgba(5,12,25,.92); border:1px solid rgba(0,229,255,.25);
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        cursor:pointer; z-index:99997; font-size:18px; gap:2px;
        box-shadow:0 4px 20px rgba(0,0,0,.6);
        animation:dirIn .15s ease; pointer-events:auto;
        transition:background .12s, border-color .12s, transform .12s;
        font-family:'Share Tech Mono',monospace;
      }
      .dir-btn:hover { background:rgba(0,229,255,.15); border-color:rgba(0,229,255,.7); transform:translate(-50%,-50%) scale(1.14); }
      .dir-btn span { font-size:7px; color:#3a4a60; }
      .dir-btn:hover span { color:#00e5ff88; }
      #dir-center {
        position:fixed; transform:translate(-50%,-50%);
        width:20px; height:20px; border-radius:50%;
        background:rgba(0,229,255,.15); border:2px solid rgba(0,229,255,.5);
        z-index:99997; pointer-events:none;
        box-shadow:0 0 16px rgba(0,229,255,.3);
        animation:dirIn .12s ease;
      }
    `;
    document.head.appendChild(s);
  }

  const wrap = document.createElement('div');
  wrap.id = 'dir-menu-wrap';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:99996;pointer-events:none';
  document.body.appendChild(wrap);

  // Markaziy doira
  const center = document.createElement('div');
  center.id = 'dir-center';
  center.style.left = cx + 'px';
  center.style.top = cy + 'px';
  wrap.appendChild(center);

  const R = 90; // masofa
  const dirs = [
    { id:'dirUp',    icon:'⬆', lbl:'Tepaga', dx:0,  dy:-R },
    { id:'dirDown',  icon:'⬇', lbl:'Pastga', dx:0,  dy:+R },
    { id:'dirLeft',  icon:'⬅', lbl:'Chapga', dx:-R, dy:0  },
    { id:'dirRight', icon:'➡', lbl:"O'ngga", dx:+R, dy:0  },
  ];

  const btnEls = [];
  dirs.forEach(dir => {
    const btn = document.createElement('div');
    btn.className = 'dir-btn';
    btn.style.left = (cx + dir.dx) + 'px';
    btn.style.top  = (cy + dir.dy) + 'px';
    btn.style.pointerEvents = 'auto';

    const animName = (window._mouseAnimEvents || {})[dir.id] || '';
    btn.innerHTML = `${dir.icon}<span>${animName || dir.lbl}</span>`;

    btn.addEventListener('mouseenter', () => btn.style.borderColor = 'rgba(0,229,255,.7)');
    btn.addEventListener('mouseleave', () => btn.style.borderColor = 'rgba(0,229,255,.25)');
    btn.addEventListener('click', e => {
      e.stopPropagation();
      _execDirAnim(dir.id, animName, dir.lbl);
      wrap.remove();
    });
    wrap.appendChild(btn);
    btnEls.push(btn);
  });

  // Yopish
  const close = e => {
    if (e.button === 1 || e.type === 'keydown') { wrap.remove(); document.removeEventListener('mouseup', close); document.removeEventListener('keydown', close); return; }
    if (!btnEls.some(b => b.contains(e.target))) {
      wrap.remove(); document.removeEventListener('mouseup', close); document.removeEventListener('keydown', close);
    }
  };
  setTimeout(() => {
    document.addEventListener('mouseup', close);
    document.addEventListener('keydown', close);
  }, 50);
}

function _execDirAnim(dirId, animName, fallbackLabel) {
  const obj = window.selectedObj;
  if (!obj) { if(window.log) log('⚠ Avval obyekt tanlang', 'lw'); return; }

  // GLB animatsiya qidirish
  if (animName) {
    const mixer = obj.userData._mixer;
    const clips = obj.userData._clips || [];
    if (mixer && clips.length) {
      const clip = clips.find(c => c.name.toLowerCase() === animName.toLowerCase())
                || clips.find(c => c.name.toLowerCase().includes(animName.toLowerCase()));
      if (clip) {
        (obj.userData._actions||[]).forEach(a => { try{a.fadeOut(0.35);}catch(e){} });
        const act = mixer.clipAction(clip);
        act.reset().fadeIn(0.35).play();
        if(window.log) log(`🎯 ${fallbackLabel} → 🎬 ${clip.name}`, 'lok');
        return;
      }
    }
  }

  // Fallback tween animatsiya
  const startRY = obj.rotation.y, startRX = obj.rotation.x;
  const deltaY = dirId==='dirLeft'?-0.5 : dirId==='dirRight'?0.5 : 0;
  const deltaX = dirId==='dirUp'?-0.3 : dirId==='dirDown'?0.3 : 0;
  const dur = 380, t0 = Date.now();

  function ease(t){ return t<.5?2*t*t:-1+(4-2*t)*t; }

  function goThere() {
    const t = Math.min(1,(Date.now()-t0)/dur);
    obj.rotation.y = startRY + deltaY * ease(t);
    obj.rotation.x = startRX + deltaX * ease(t);
    if(t<1) requestAnimationFrame(goThere);
    else {
      const t1 = Date.now();
      function goBack() {
        const t2 = Math.min(1,(Date.now()-t1)/dur);
        obj.rotation.y = startRY + deltaY * (1-ease(t2));
        obj.rotation.x = startRX + deltaX * (1-ease(t2));
        if(t2<1) requestAnimationFrame(goBack);
        else { obj.rotation.y = startRY; obj.rotation.x = startRX; }
      }
      requestAnimationFrame(goBack);
    }
  }
  requestAnimationFrame(goThere);
  if(window.log) log(`🎯 ${fallbackLabel} animatsiya (fallback)`, 'lok');
}

// Inspector uchun helper (fayl input onchange)
window._addKeyAnim = function(event, action, keyCode) {
  const f = event.target.files[0];
  if (!f) return;
  const nm = f.name.replace(/\.\w+$/, '');
  if (!window._kbAnimations) window._kbAnimations = {};
  if (!window._kbAnimations[keyCode]) window._kbAnimations[keyCode] = {};
  window._kbAnimations[keyCode].animName = nm;
  if (window.log) log('🎬 ' + action + ' → ' + nm, 'lok');
  if (window.updateInspector) updateInspector();
};
