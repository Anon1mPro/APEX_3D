// ============================================================
// MASHINA YAQINLIGI — isPlaying bo'lsa doim ishlaydi
// (updatePlayer dan mustaqil, camMode farqi yo'q)
// ============================================================
function updateCarProximity() {
  if (!isPlaying || carInside) {
    // Mashina ichida bo'lsa yoki o'yin to'xtagan bo'lsa — promptni o'chir
    const p = document.getElementById('_car-enter-prompt');
    if (p) p.remove();
    _carPrev['_enterPrev'] = false;
    return;
  }

  // Oyinchi pozitsiyasini aniqlash
  // playerMesh bo'lsa undan, bo'lmasa kamera pozitsiyasidan foydalanamiz
  const refPos = playerMesh
    ? playerMesh.position
    : camera.position;

  // Eng yaqin mashinani topish
  let nearCar = null, nearCarDist = 999;
  objects.forEach(o => {
    if (o.userData.entityType !== 'car' && o.userData._entityMode !== 'vehicle') return;
    const cfg = window._getCarCfg ? window._getCarCfg(o) : null;
    const maxD = cfg ? cfg.enterDistance : 3.5;
    const d = refPos.distanceTo(o.position);
    if (d < maxD && d < nearCarDist) { nearCarDist = d; nearCar = o; }
  });

  let prompt = document.getElementById('_car-enter-prompt');

  if (nearCar) {
    // Prompt yaratish yoki yangilash
    if (!prompt) {
      prompt = document.createElement('div');
      prompt.id = '_car-enter-prompt';
      prompt.style.cssText = [
        'position:fixed',
        'bottom:130px',
        'left:50%',
        'transform:translateX(-50%)',
        'background:rgba(0,0,0,.82)',
        'border:1px solid rgba(0,180,255,.6)',
        'border-radius:8px',
        'padding:9px 22px',
        'font-family:\'Share Tech Mono\',monospace',
        'color:#00b4ff',
        'font-size:12px',
        'font-weight:700',
        'letter-spacing:1.5px',
        'pointer-events:none',
        'z-index:9995',
        'box-shadow:0 0 18px rgba(0,180,255,.25)',
        'white-space:nowrap',
      ].join(';');
      document.body.appendChild(prompt);
    }

    const cfg = window._getCarCfg ? window._getCarCfg(nearCar) : null;
    const enterKey = cfg ? _carKeyLabel(cfg.enterKey) : 'E';
    const carName = nearCar.userData.name || 'Mashina';
    prompt.innerHTML = `<span style="color:#fff;background:rgba(0,180,255,.25);padding:1px 8px;border-radius:4px;margin-right:8px">${enterKey}</span>${carName}ga kiring`;

    // Kirish tugmasi bosilganmi?
    const enterCode = (cfg && cfg.enterKey) ? cfg.enterKey : 'Enter';
    const pressed = fpsKeys[enterCode];
    if (pressed && !_carPrev['_enterPrev']) {
      tryEnterCar(nearCar);
    }
    _carPrev['_enterPrev'] = pressed;

  } else {
    // Hech qanday mashina yaqin emas — promptni o'chir
    if (prompt) { prompt.remove(); }
    _carPrev['_enterPrev'] = false;
  }
}

// Game HUD overlay
function buildGameHUD() {
  let hud = $('game-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'game-hud';
    hud.style.cssText='position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:20;display:none';
    hud.innerHTML=`
      <div style="position:absolute;top:12px;left:50%;transform:translateX(-50%);display:flex;gap:12px;align-items:center">
        <div style="background:rgba(0,0,0,.6);border:1px solid rgba(255,68,68,.25);border-radius:6px;padding:5px 10px;min-width:140px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:#ff6b6b">❤️ JON</span>
            <span id="game-health-num" style="font-family:'Share Tech Mono',monospace;font-size:10px;color:#ff6b6b">100</span>
          </div>
          <div style="background:rgba(0,0,0,.4);border-radius:3px;height:8px;overflow:hidden">
            <div id="game-health" style="height:100%;width:100%;background:linear-gradient(90deg,#ff4444,#ff8844);border-radius:3px;transition:width .3s"></div>
          </div>
        </div>
        <div style="background:rgba(0,0,0,.6);border:1px solid rgba(255,204,0,.4);border-radius:4px;padding:4px 10px;font-family:'Share Tech Mono',monospace;font-size:11px">
          🏆 <span id="game-score">0</span>
        </div>
      </div>
      <div id="game-message" style="position:absolute;top:50px;left:50%;transform:translateX(-50%);font-family:'Share Tech Mono',monospace;font-size:14px;font-weight:700;opacity:0;transition:opacity .3s;text-shadow:0 0 8px currentColor"></div>
    `;
    $('cvp').appendChild(hud);
  }
  return hud;
}

function _onPlayerDeath() {
  const msg = playerSettings.deathMessage || "Siz oldingiz!";
  showGameMessage(msg, '#ff4444');
  // O'yin to'xtamaydi, faqat xabar chiqadi — kerak bo'lsa stop qilish mumkin
  log('☠ Oyinchi oldi: ' + msg, 'le');
}
window._onPlayerDeath = _onPlayerDeath;

function updateGameHUD() {
  const hBar=$('game-health'), hNum=$('game-health-num'), sEl=$('game-score');
  const maxHp = playerSettings.maxHealth || 100;
  const hp    = Math.max(0, Math.min(maxHp, gameState.health));
  const pct   = (hp / maxHp * 100).toFixed(1);
  if(hBar) {
    hBar.style.width = pct + '%';
    // Rang: yashil → sariq → qizil
    const r = hp < maxHp*0.5 ? 255 : Math.round(255 * (2 - hp/maxHp*2));
    const g = hp > maxHp*0.5 ? 180 : Math.round(180 * (hp/maxHp*2));
    hBar.style.background = `linear-gradient(90deg, rgb(${r},${g},40), rgb(${Math.min(255,r+60)},${Math.min(g+40,200)},60))`;
  }
  if(hNum) hNum.textContent = Math.ceil(hp) + '/' + maxHp;
  if(sEl)  sEl.textContent  = gameState.score;
  // O'lim tekshiruvi
  if(hp <= 0 && gameState.health > 0) {
    gameState.health = 0;
    _onPlayerDeath();
  }
}

let _msgTimer = null;
function showGameMessage(msg, color) {
  const el=$('game-message'); if(!el) return;
  el.textContent=msg; el.style.color=color||'#fff'; el.style.opacity=1;
  clearTimeout(_msgTimer);
  _msgTimer=setTimeout(()=>{ if(el) el.style.opacity=0; },2000);
}

// Override play/stop to add player

