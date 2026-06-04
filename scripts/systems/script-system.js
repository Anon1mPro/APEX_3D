// ============================================================
// SCRIPT SYSTEM — Obyektlarga JS script yozish
// ============================================================
const objectScripts   = {};  // objId -> { code, fn, onCreate, onUpdate, onCollide, onPlayerEnter }
const scriptErrors    = {};  // objId -> last error
let   scriptEditorId  = null;

// Script API — o'yin ichida ishlatish mumkin bo'lgan funksiyalar
const SCRIPT_API = {
  getById: id => objects.find(o => o.userData.id == id) || null,
  distanceTo: (a, b) => {
    const tb = b || (isPlaying && playerMesh ? playerMesh : null);
    if (!a || !tb) return Infinity;
    return a.position.distanceTo(tb.position);
  },
  pushPlayer: (force, dir) => {
    if (!playerVel) return;
    const d = dir || new THREE.Vector3(0,1,0);
    playerVel.addScaledVector(d.normalize(), force||5);
  },
  spawnParticles: (obj, opts) => {
    if (!obj) return;
    createParticleSystem({
      color: opts?.color||0xffaa00, speed:0.08, size:0.1,
      count:80, pos: obj.position.clone(),
      ...(opts||{})
    });
  },
  playSound: (soundOrFreq, durOrVol) => {
    if (typeof soundOrFreq === 'string') {
      // Named sound: playSound('boom') yoki playSound('coin', 0.8)
      SoundSystem.play(soundOrFreq, null, { volume: durOrVol ?? 1 });
    } else {
      // Legacy: playSound(440, 0.3) — chastotali signal
      if (!audioCtx) { audioCtx = new (window.AudioContext||window.webkitAudioContext)(); audioEnabled=true; }
      const o2=audioCtx.createOscillator(), g2=audioCtx.createGain();
      o2.frequency.value=soundOrFreq||440; o2.type='sine';
      g2.gain.setValueAtTime(0.2,audioCtx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+(durOrVol||0.3));
      o2.connect(g2); g2.connect(audioCtx.destination);
      o2.start(); o2.stop(audioCtx.currentTime+(durOrVol||0.3));
    }
  },
  addScore: n => {
    gameState.score = (gameState.score||0) + (n||1);
    const el = $('game-score'); if(el) el.textContent = 'Score: '+gameState.score;
    log(`🏆 Score +${n||1} = ${gameState.score}`, 'lok');
  },
  addHealth: n => {
    gameState.health = Math.min(100,(gameState.health||100) + (n||10));
    updateGameHUD();
  },
  addMessage: (msg, color) => {
    showGameMessage(msg, color||'#fff');
  },
  checkpoint: (obj) => {
    gameState.checkpoint = obj ? obj.position.clone() : null;
    showGameMessage('✅ Checkpoint!', '#39ff14');
    log('✅ Checkpoint saqlandi', 'lok');
  },
  respawn: () => {
    if (gameState.checkpoint && playerMesh) {
      playerMesh.position.copy(gameState.checkpoint);
      if(playerVel) playerVel.set(0,0,0);
    }
  },
  destroyObj: obj => {
    if (!obj) return;
    SCRIPT_API.spawnParticles(obj, {color:0xff4400,count:60});
    SCRIPT_API.playSound(200,0.2);
    scene.remove(obj);
    const i=objects.indexOf(obj); if(i>-1) objects.splice(i,1);
    const pi=physBodies.findIndex(b=>b.mesh===obj); if(pi>-1) physBodies.splice(pi,1);
    updateStats(); updateHierarchy();
  },
};

window.gameState = {
  score: 0, health: playerSettings.maxHealth || 100, checkpoint: null,
  vars: {}, // custom vars for user scripts
};

// Build script sandbox function
function scriptCompile(code, objId) {
  try {
    const fn = new Function(
      'self','time','delta','player','scene','THREE','api','state','log','Math','console',
      `"use strict";
const getById = api.getById;
const distanceTo = (other) => api.distanceTo(self, other);
const pushPlayer = api.pushPlayer;
const spawnParticles = (opts) => api.spawnParticles(self, opts);
const playSound = api.playSound;
const addScore = api.addScore;
const addHealth = api.addHealth;
const addMessage = api.addMessage;
const checkpoint = () => api.checkpoint(self);
const respawn = api.respawn;
const destroyThis = () => api.destroyObj(self);
const playerPos = player ? player.position : null;
const playerDist = () => api.distanceTo(self, player);
const this_ = self;
${code}`
    );
    objectScripts[objId] = { code, fn, active:true, errCount:0 };
    delete scriptErrors[objId];
    log(`⚡ Script compiled: obj#${objId}`, 'lok');
    return true;
  } catch(e) {
    scriptErrors[objId] = e.message;
    log(`❌ Script xato (obj#${objId}): ${e.message}`, 'le');
    return false;
  }
}

function scriptRunAll(delta) {
  if (!isPlaying) return;
  const pm = playerMesh || null;

  // Oyinchi spawn objectining skriptini ham ishlatamiz
  const playerSpawnObj = objects.find(o=>o.userData.entityType==='player');
  if (playerSpawnObj && pm) {
    const psc = objectScripts[playerSpawnObj.userData.id];
    if (psc && psc.active && psc.fn) {
      try {
        psc.fn(pm, playTime, delta, pm, scene, THREE, SCRIPT_API, gameState,
          msg=>log('[player] '+msg,'lg'), Math, console);
      } catch(e) { /* silent */ }
    }
  }

  Object.entries(objectScripts).forEach(([id, sc]) => {
    if (!sc.active || !sc.fn) return;
    const obj = objects.find(o => String(o.userData.id) === String(id));
    if (!obj || !obj.parent) return;
    // Player spawn objecti yuqorida ishlatildi
    if (obj.userData.entityType==='player') return;
    try {
      sc.fn(
        obj, playTime, delta,
        pm, scene, THREE,
        SCRIPT_API, gameState,
        (msg) => log(`[#${id}] ${msg}`, 'lg'),
        Math, console
      );
      sc.errCount = 0;
    } catch(e) {
      sc.errCount = (sc.errCount||0)+1;
      if (sc.errCount <= 2) log(`❌ Script #${id}: ${e.message}`, 'le');
      if (sc.errCount > 5) { sc.active=false; log(`⚠ Script #${id} o'chirildi`, 'lw'); }
    }
  });
}

// Collision detection for scripts
function scriptCheckCollisions() {
  if (!isPlaying || !playerMesh) return;
  const pp = playerMesh.position;
  objects.forEach(obj => {
    if (!obj.parent || obj === playerMesh) return;
    const sc = objectScripts[obj.userData.id];
    if (!sc || !sc.active) return;
    const dist = pp.distanceTo(obj.position);
    const threshold = (obj.scale.x + obj.scale.y + obj.scale.z) / 3 * 0.9;
    if (dist < threshold + 0.6) {
      // player is near/touching this object
      if (!obj.userData._playerNear) {
        obj.userData._playerNear = true;
        // Run onPlayerEnter if defined in code
        const enterCode = sc.code.match(/\/\/\s*onPlayerEnter\s*\n([\s\S]*?)(?=\/\/\s*on\w+|\s*$)/);
        if (enterCode) {
          try {
            new Function('self','player','api','state','log','Math',
              `const addScore=api.addScore,addHealth=api.addHealth,addMessage=api.addMessage,checkpoint=()=>api.checkpoint(self),destroyThis=()=>api.destroyObj(self),spawnParticles=(o)=>api.spawnParticles(self,o),playSound=api.playSound,pushPlayer=api.pushPlayer;\n`+enterCode[1]
            )(obj, playerMesh, SCRIPT_API, gameState, msg=>log(`[obj#${obj.userData.id}] ${msg}`,'lg'), Math);
          } catch(e) { log('❌ onPlayerEnter: '+e.message,'le'); }
        }
      }
    } else {
      obj.userData._playerNear = false;
    }
  });
}

// UI Functions
window.scriptSelectObj = function(id) {
  scriptEditorId = id || null;
  const editor = $('script-editor');
  if (!editor) return;
  if (!id) { editor.value=''; scriptUpdateLines(); return; }
  editor.value = objectScripts[id]?.code || getDefaultScript(parseInt(id));
  scriptUpdateLines();
};

window.scriptRun = function() {
  const editor = $('script-editor');
  if (!scriptEditorId) {
    log('⚠ Avval ierarxiyadan obyekt tanlang', 'lw');
    return;
  }
  if (!editor) return;
  const code = editor.value.trim();
  if (!code || code.startsWith('//')) {
    log('⚠ Script bo\'sh yoki faqat commentdan iborat', 'lw');
    return;
  }
  const ok = scriptCompile(code, scriptEditorId);
  if (ok) {
    const obj = objects.find(o => String(o.userData.id) === String(scriptEditorId));
    if (obj) {
      obj.userData.script = code;
      log(`⚡ Script saqlandi: ${obj.userData.name || '#'+scriptEditorId}`, 'lok');
    }
    // Script tab da run bosilsa play mode da ishlaydi — eslatma
    if (!isPlaying) log('ℹ Script o\'yin rejimida (▶ O\'YNA) ishlaydi', 'lw');
  }
};

window.scriptClear = function() {
  const editor = $('script-editor');
  if (editor) { editor.value=''; scriptUpdateLines(); }
  if (scriptEditorId) {
    delete objectScripts[scriptEditorId];
    const obj = objects.find(o=>o.userData.id==scriptEditorId);
    if (obj) delete obj.userData.script;
  }
};

window.scriptInsert = function(text) {
  const editor = $('script-editor');
  if (!editor) return;
  const s=editor.selectionStart, e2=editor.selectionEnd;
  editor.value = editor.value.slice(0,s)+text+editor.value.slice(e2);
  editor.selectionStart = editor.selectionEnd = s+text.length;
  editor.focus(); scriptUpdateLines();
};

window.scriptInsertTemplate = function() {
  const templates = [
    {name:'Yig\'ish (collectible)', code:`// Oyinchi yaqin kelganda yig'iladi
if (playerDist() < 1.2 && self.visible) {
  self.visible = false;
  addScore(10);
  spawnParticles({color:0xffcc00, count:50});
  playSound(880, 0.2);
  addMessage('+10 ball!', '#ffcc00');
}`},
    {name:'Checkpoint', code:`// Checkpoint
if (playerDist() < 1.5 && !state.vars['cp_'+self.userData.id]) {
  state.vars['cp_'+self.userData.id] = true;
  checkpoint();
  self.material.color.set(0x39ff14);
  playSound(660, 0.3);
}`},
    {name:'Devor (itarish)', code:`// Oyinchini itaradi
if (playerDist() < 1.2) {
  const dir = player.position.clone().sub(self.position).normalize();
  pushPlayer(dir.multiplyScalar(6));
}`},
    {name:'Aylanuvchi platforma', code:`// Aylanuvchi platforma
self.rotation.y += delta * 0.8;
self.position.y = self.userData._baseY = (self.userData._baseY||self.position.y);
self.position.y = self.userData._baseY + Math.sin(time * 1.5) * 0.5;`},
    {name:'Dushman (health kamaytiradi)', code:`// Dushman: yaqin kelsa zarar
if (playerDist() < 1.3) {
  if (!self.userData._lastHit || time - self.userData._lastHit > 1) {
    self.userData._lastHit = time;
    addHealth(-10);
    addMessage('-10 HP!', '#ff4444');
    playSound(150, 0.3);
  }
}
// Ko'z o'ngda aylana
self.rotation.y += delta * 1.5;`},
    {name:'Portlovchi quti', code:`// Portlovchi: bosish bilan portlaydi
if (playerDist() < 1.5) {
  spawnParticles({color:0xff6600, count:120});
  playSound(120, 0.5);
  addHealth(-20);
  addMessage('BOOM! -20 HP', '#ff4400');
  destroyThis();
}`},
  ];
  const m = document.createElement('div');
  m.classList.add('ui-popup');
m.style.cssText='min-width:220px;bottom:80px;left:50%';
  templates.forEach(t=>{
    const b=document.createElement('button');
    b.textContent=t.name;
    b.classList.add('ui-menu-item');
    b.onmouseover=()=>b.style.background='var(--hover)';
    b.onmouseout=()=>b.style.background='none';
    b.onclick=()=>{
      const editor=$('script-editor');
      if(editor){ editor.value=t.code; scriptUpdateLines(); }
      document.body.removeChild(m);
    };
    m.appendChild(b);
  });
  document.body.appendChild(m);
  setTimeout(()=>document.addEventListener('click',function rm(){if(m.parentNode)m.parentNode.removeChild(m);document.removeEventListener('click',rm)},100));
};

window.scriptUpdateLines = function() {
  const editor = $('script-editor');
  const linesEl = $('script-lines');
  if (!editor || !linesEl) return;
  const lines = editor.value.split('\n').length;
  linesEl.innerHTML = Array.from({length:lines},(_,i)=>`<div>${i+1}</div>`).join('');
  linesEl.scrollTop = editor.scrollTop;
};

window.scriptRefreshSelect = function() {
  const sel = $('script-obj-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Obyekt tanlang —</option>';
  objects.forEach(o => {
    if (o.userData.isStatic) return;
    const opt = document.createElement('option');
    opt.value = String(o.userData.id);
    opt.textContent = `${o.userData.isCamera?'🎥':'#'+o.userData.id} ${o.userData.name}${o.userData.script?'⚡':''}`;
    if (String(scriptEditorId) === String(o.userData.id)) opt.selected = true;
    sel.appendChild(opt);
  });
  // Auto-select current selectedObj
  if (selectedObj && selectedObj.userData.id !== undefined) {
    scriptEditorId = selectedObj.userData.id;
    sel.value = String(scriptEditorId);
  }
};

function getDefaultScript(objId) {
  return `// Obyekt #${objId} uchun script
// Har kadrda chaqiriladi (onUpdate)
// self = bu obyekt | player = oyinchi | time = o'yin vaqti | delta = kadr vaqti

// Misol: aylanish
// self.rotation.y += delta * 1.0;

// Misol: oyinchi yaqin kelganda
// if (playerDist() < 2) {
//   addScore(1);
//   self.material.emissive.setHex(0x223344);
// }
`;
}


// Sync scroll between editor and line numbers
$('script-editor')?.addEventListener('scroll', () => {
  const linesEl = $('script-lines');
  if (linesEl) linesEl.scrollTop = $('script-editor').scrollTop;
});
// Tab key in editor
$('script-editor')?.addEventListener('keydown', e => {
  if (e.key==='Tab') {
    e.preventDefault();
    const s=e.target.selectionStart, en=e.target.selectionEnd;
    e.target.value=e.target.value.slice(0,s)+'  '+e.target.value.slice(en);
    e.target.selectionStart=e.target.selectionEnd=s+2;
    scriptUpdateLines();
  }
});

// ============================================================