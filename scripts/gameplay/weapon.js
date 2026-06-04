// ============================================================
// QUROL KONFIGURATSIYASI
// ============================================================


// ============================================================
// 🚗 CAR INSPECTOR — Mashina konfiguratsiyasi
// ============================================================
const _defaultCarCfg = () => ({
  // Asosiy
  mass: 1200,           // kg
  driveType: 'rear',    // 'front' | 'rear' | 'awd'
  // Tezlik
  maxSpeed: 120,        // km/h
  minSpeed: 0,
  gears: 6,
  accel: 12,
  brake: 18,
  friction: 0.88,
  // Minish
  enterKey: 'Enter',
  enterDistance: 3.5,   // metr
  exitKey: 'Enter',
  // Haydash tugmalari
  gasKey: 'KeyW',
  brakeKey: 'KeyS',
  leftKey: 'KeyA',
  rightKey: 'KeyD',
  handbrakeKey: 'Space',
  nitroKey: 'KeyF',
  headlightKey: 'KeyL',
  // Nitro
  nitroBoost: 2.2,
  nitroDuration: 8,     // soniya
  nitroCooldown: 15,    // soniya
  // Rejimlar
  driftMode: false,
  sportMode: false,
  driftKey: 'KeyC',
  sportKey: 'KeyV',
  driftAmount: 0.6,   // 0=grip, 1=to'liq toyish
  // Fara
  headlightOn: false,
  // Kamera
  camMode: '3rd',       // '1st' | '3rd'
  camAllow1st: true,    // 1-shaxs rejimiga ruxsat
  camAllow3rd: true,    // 3-shaxs rejimiga ruxsat
  camSwitchKey: 'KeyV', // rejim almashtirish tugmasi
  camOffsetX: 0,        // yon
  camOffsetY: 1.2,      // balandlik
  camOffsetZ: 0.3,      // oldi-orqa (1st: oldinga, 3rd: ortga)
  cam1stPitchMin: -60,  // 1st: pastga maksimal burchak (daraja)
  cam1stPitchMax: 60,   // 1st: tepaga maksimal burchak (daraja)
  cam3rdDist: 6,        // 3rd person masofasi
  cam3rdHeight: 3,      // 3rd person balandligi
  cam3rdPitchMin: -40,  // 3rd: pastga maksimal burchak (daraja)
  cam3rdPitchMax: 60,   // 3rd: tepaga maksimal burchak (daraja)
  camInitYaw:   180,   // boshlangich yaw burchagi (daraja)
  camInitPitch: 0,     // boshlangich pitch burchagi (daraja)
});

function _getCarCfg(o) {
  if (!o.userData._carCfg) o.userData._carCfg = _defaultCarCfg();
  return o.userData._carCfg;
}
window._getCarCfg = _getCarCfg;

function _carCfgSet(key, val) {
  const o = selectedObj; if (!o) return;
  const c = _getCarCfg(o);
  c[key] = val;
  // Preview aktiv bo'lsa real vaqtda yangilansin
  if (window._camPreview && window._camPreview.active && window._camPreview.entity === 'car') {
    if (key === 'camInitYaw')   window._camPreview.yaw   = val * Math.PI / 180;
    if (key === 'camInitPitch') window._camPreview.pitch = val * Math.PI / 180;
    window._camPreview._updateCamera();
  }
}
window._carCfgSet = _carCfgSet;

// Key label helper (reuse from playerSettings if available)
function _carKeyLabel(code) {
  if (!code) return '---';
  const map = {
    KeyW:'W',KeyA:'A',KeyS:'S',KeyD:'D',KeyE:'E',KeyF:'F',
    KeyQ:'Q',KeyR:'R',KeyT:'T',KeyG:'G',KeyH:'H',KeyC:'C',
    KeyV:'V',KeyB:'B',KeyN:'N',KeyZ:'Z',KeyX:'X',
    Space:'SPC',ShiftLeft:'SHFT',ControlLeft:'CTRL',AltLeft:'ALT',
    ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',
    Digit1:'1',Digit2:'2',Digit3:'3',Digit4:'4',
    KeyI:'I',KeyO:'O',KeyP:'P',KeyJ:'J',KeyK:'K',KeyL:'L',
  };
  return map[code] || code.replace('Key','').replace('Digit','');
}

let _carRebinding = null;

function startCarRebind(action) {
  const o = selectedObj; if (!o) return;
  _carRebinding = action;
  updateInspector();
  const onKey = (e) => {
    e.preventDefault();
    _getCarCfg(o)[action] = e.code;
    _carRebinding = null;
    document.removeEventListener('keydown', onKey);
    updateInspector();
    log(`🚗 "${action}" → ${e.code}`, 'lok');
  };
  document.addEventListener('keydown', onKey);
}
window.startCarRebind = startCarRebind;

function _buildCarInspector(o) {
  const c = _getCarCfg(o);
  const B = (color) => `background:${color}18;border:1px solid ${color}44;color:${color};font-family:'Share Tech Mono',monospace;font-size:8px;padding:3px 7px;border-radius:3px;cursor:pointer`;
  const row = (label, content) => `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
      <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">${label}</span>
      <div style="flex:1">${content}</div>
    </div>`;
  const slider = (key, min, max, step, val, unit='') => `
    <div style="display:flex;align-items:center;gap:4px">
      <input type="range" min="${min}" max="${max}" step="${step}" value="${val}" style="flex:1"
        oninput="_carCfgSet('${key}',${step<1?'parseFloat':'parseInt'}(this.value));this.nextSibling.textContent=this.value+'${unit}'">
      <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${val}${unit}</span>
    </div>`;
  const keyBtn = (action) => `
    <button onclick="startCarRebind('${action}')"
      style="font-size:9px;padding:2px 8px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace;min-width:48px;text-align:center;
      background:${_carRebinding===action?'rgba(255,107,53,.25)':'rgba(0,180,255,.08)'};
      border:1px solid ${_carRebinding===action?'var(--accent2)':'rgba(0,180,255,.4)'};
      color:${_carRebinding===action?'var(--accent2)':'#00b4ff'}">
      ${_carRebinding===action?'[ bosing ]':_carKeyLabel(c[action])}
    </button>`;

  return `<div class="comp-block" style="border-color:rgba(0,180,255,.35);background:rgba(0,180,255,.04)">
    <div class="comp-title" style="color:#00b4ff">
      <span class="tag" style="background:rgba(0,180,255,.15);color:#00b4ff">🚗</span>Mashina Konfiguratsiyasi
    </div>

    <!-- ── QAYSI QISMI TORTSIN ── -->
    <div style="margin-bottom:8px">
      <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:4px;letter-spacing:1px">⚙ HAYDOVCHI G'ILDIRAKLAR</div>
      <div style="display:flex;gap:3px">
        ${[['front','⬆ Oldi'],['rear','⬇ Orqa'],['awd','⬆⬇ To\'liq']].map(([m,lbl])=>`
        <button onclick="_carCfgSet('driveType','${m}');updateInspector()"
          style="flex:1;padding:5px 3px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:8px;font-weight:700;
          background:${c.driveType===m?'rgba(0,180,255,.25)':'rgba(255,255,255,.04)'};
          border:1px solid ${c.driveType===m?'#00b4ff':'rgba(255,255,255,.1)'};
          color:${c.driveType===m?'#00b4ff':'var(--muted)'}">
          ${lbl}
        </button>`).join('')}
      </div>
    </div>

    <!-- ── MASSA ── -->
    ${row('⚖ Massa (kg)', slider('mass',200,5000,50,c.mass,'kg'))}

    <!-- ── TEZLIK ── -->
    <div style="border-top:1px solid rgba(0,180,255,.15);padding-top:6px;margin-bottom:6px">
      <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:5px;letter-spacing:1px">🏎 TEZLIK</div>
      ${row('🔼 Maks tezlik', slider('maxSpeed',20,400,5,c.maxSpeed,' km/h'))}
      ${row('🔽 Min tezlik', slider('minSpeed',0,20,1,c.minSpeed,' km/h'))}
      ${row('⚡ Tezlashish', slider('accel',2,40,0.5,c.accel,''))}
      ${row('🛑 Tormoz kuchi', slider('brake',2,60,0.5,c.brake,''))}
      ${row('🔄 Ishqalanish', slider('friction',0.5,1,0.01,c.friction,''))}
    </div>

    <!-- ── SKOROST ── -->
    <div style="border-top:1px solid rgba(0,180,255,.15);padding-top:6px;margin-bottom:6px">
      <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:5px;letter-spacing:1px">🔢 SKOROSTLAR SONI</div>
      <div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:4px">
        ${[1,2,3,4,5,6,7,8,9,10].map(n=>`
        <button onclick="_carCfgSet('gears',${n});updateInspector()"
          style="${B(c.gears===n?'#00b4ff':'#445')};padding:3px 7px;min-width:26px">
          ${n}
        </button>`).join('')}
      </div>
      <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace">Joriy: ${c.gears} ta skorost | Q/E bilan almashtirish</div>
    </div>

    <!-- ── NITRO ── -->
    <div style="border-top:1px solid rgba(57,255,20,.2);padding-top:6px;margin-bottom:6px;background:rgba(57,255,20,.02);border-radius:4px;padding:8px">
      <div style="font-size:8px;color:var(--accent3);font-family:'Share Tech Mono',monospace;margin-bottom:5px;letter-spacing:1px">⚡ NITRO TIZIMI</div>
      ${row('💥 Kuch berish', slider('nitroBoost',1.1,5,0.1,c.nitroBoost,'x'))}
      ${row('⏱ Ishlash (s)', slider('nitroDuration',1,60,1,c.nitroDuration,'s'))}
      ${row('⏳ Qayta (s)', slider('nitroCooldown',1,120,1,c.nitroCooldown,'s'))}
    </div>

    <!-- ── REJIMLAR ── -->
    <div style="border-top:1px solid rgba(204,136,255,.2);padding-top:6px;margin-bottom:6px">
      <div style="font-size:8px;color:var(--accent4);font-family:'Share Tech Mono',monospace;margin-bottom:5px;letter-spacing:1px">🎮 HAYDASH REJIMLARI</div>
      <div style="display:flex;gap:4px;margin-bottom:6px">
        <div style="flex:1;border:1px solid ${c.driftMode?'rgba(204,136,255,.5)':'rgba(255,255,255,.1)'};border-radius:4px;padding:6px;background:${c.driftMode?'rgba(204,136,255,.1)':'rgba(255,255,255,.02)'}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:9px;color:${c.driftMode?'var(--accent4)':'var(--muted)'};font-family:'Share Tech Mono',monospace;font-weight:700">🌀 DRIFT</span>
            <label class="tgl"><input type="checkbox" ${c.driftMode?'checked':''} onchange="_carCfgSet('driftMode',this.checked);updateInspector()"><div class="tgl-track"></div><div class="tgl-thumb"></div></label>
          </div>
          <div style="display:flex;align-items:center;gap:4px">
            <span style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace">Tugma:</span>
            ${keyBtn('driftKey')}
          </div>
          <div style="display:flex;align-items:center;gap:4px;margin-top:5px">
            <span style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;white-space:nowrap">Toyish:</span>
            <input type="range" min="0" max="1" step="0.05" value="${c.driftAmount??0.6}"
              oninput="_carCfgSet('driftAmount',parseFloat(this.value));this.nextElementSibling.textContent=Math.round(this.value*100)+'%'"
              style="flex:1;accent-color:var(--accent4)">
            <span style="font-size:8px;color:var(--accent4);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right">${Math.round((c.driftAmount??0.6)*100)}%</span>
          </div>
        </div>
        <div style="flex:1;border:1px solid ${c.sportMode?'rgba(255,200,0,.5)':'rgba(255,255,255,.1)'};border-radius:4px;padding:6px;background:${c.sportMode?'rgba(255,200,0,.08)':'rgba(255,255,255,.02)'}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:9px;color:${c.sportMode?'#ffcc00':'var(--muted)'};font-family:'Share Tech Mono',monospace;font-weight:700">🏁 SPORT</span>
            <label class="tgl"><input type="checkbox" ${c.sportMode?'checked':''} onchange="_carCfgSet('sportMode',this.checked);updateInspector()"><div class="tgl-track"></div><div class="tgl-thumb"></div></label>
          </div>
          <div style="display:flex;align-items:center;gap:4px">
            <span style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace">Tugma:</span>
            ${keyBtn('sportKey')}
          </div>
        </div>
      </div>
    </div>

    <!-- ── HAYDASH TUGMALARI ── -->
    <div style="border-top:1px solid rgba(0,180,255,.15);padding-top:6px;margin-bottom:6px">
      <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:5px;letter-spacing:1px">⌨ HAYDASH TUGMALARI</div>
      ${[
        ['gasKey','⬆ Gaz (oldinga)'],
        ['brakeKey','⬇ Tormoz/orqaga'],
        ['leftKey','⬅ Chapga'],
        ['rightKey','➡ O\'ngga'],
        ['handbrakeKey','🛑 Qo\'l tormoz'],
        ['nitroKey','⚡ Nitro'],
        ['headlightKey','💡 Fara'],
      ].map(([action,label])=>`
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="flex:1;font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">${label}</span>
        ${keyBtn(action)}
      </div>`).join('')}
    </div>

    <!-- ── MASHINAGA KIRISH ── -->
    <div style="border-top:1px solid rgba(0,180,255,.15);padding-top:6px;margin-bottom:6px">
      <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:5px;letter-spacing:1px">🚪 MASHINAGA KIRISH</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="flex:1;font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">🔑 Kirish tugmasi</span>
        ${keyBtn('enterKey')}
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="flex:1;font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">🚪 Chiqish tugmasi</span>
        ${keyBtn('exitKey')}
      </div>
      ${row('📏 Kirish masofasi', slider('enterDistance',1,10,0.5,c.enterDistance,'m'))}
      <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;background:rgba(0,180,255,.06);border-radius:3px;padding:4px 6px;margin-top:2px">
        💡 Oyinchi ${c.enterDistance}m yaqinlashganda "${_carKeyLabel(c.enterKey)}" tugmasi ko'rinadi
      </div>
    </div>

    <!-- ── KAMERA ── -->
    <div style="border-top:1px solid rgba(0,229,255,.15);padding-top:6px;margin-bottom:6px">
      <div style="font-size:8px;color:var(--accent);font-family:'Share Tech Mono',monospace;margin-bottom:6px;letter-spacing:1px">🎥 KAMERA SOZLAMALARI</div>

      <!-- Ruxsat tugmalari -->
      <div style="display:flex;gap:4px;margin-bottom:6px">
        <button onclick="_carCfgSet('camAllow1st',!(_getCarCfg(selectedObj).camAllow1st));if(!_getCarCfg(selectedObj).camAllow1st&&_getCarCfg(selectedObj).camMode==='1st')_carCfgSet('camMode','3rd');updateInspector()"
          style="flex:1;padding:5px 3px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;border:1px solid ${c.camAllow1st!==false?'var(--accent)':'var(--red)'};background:${c.camAllow1st!==false?'rgba(0,229,255,.1)':'rgba(255,68,68,.1)'};color:${c.camAllow1st!==false?'var(--accent)':'var(--red)'}">
          👁 1-shaxs<br><span style="font-size:8px">${c.camAllow1st!==false?'✓ Yoqiq':'✗ O\'chiq'}</span>
        </button>
        <button onclick="_carCfgSet('camAllow3rd',!(_getCarCfg(selectedObj).camAllow3rd));if(!_getCarCfg(selectedObj).camAllow3rd&&_getCarCfg(selectedObj).camMode==='3rd')_carCfgSet('camMode','1st');updateInspector()"
          style="flex:1;padding:5px 3px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;border:1px solid ${c.camAllow3rd!==false?'var(--accent)':'var(--red)'};background:${c.camAllow3rd!==false?'rgba(0,229,255,.1)':'rgba(255,68,68,.1)'};color:${c.camAllow3rd!==false?'var(--accent)':'var(--red)'}">
          🎥 3-shaxs<br><span style="font-size:8px">${c.camAllow3rd!==false?'✓ Yoqiq':'✗ O\'chiq'}</span>
        </button>
      </div>

      <!-- Boshlang'ich rejim -->
      <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:4px">Boshlang'ich rejim:</div>
      <div style="display:flex;gap:4px;margin-bottom:8px">
        <button onclick="_carCfgSet('camMode','1st');updateInspector()"
          style="flex:1;padding:5px 3px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;border:1px solid ${c.camMode==='1st'?'var(--accent)':'var(--border)'};background:${c.camMode==='1st'?'rgba(0,229,255,.12)':'none'};color:${c.camMode==='1st'?'var(--accent)':'var(--muted)'};opacity:${c.camAllow1st===false?'0.35':'1'}">
          👁 1-shaxs
        </button>
        <button onclick="_carCfgSet('camMode','3rd');updateInspector()"
          style="flex:1;padding:5px 3px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;border:1px solid ${c.camMode==='3rd'?'var(--accent)':'var(--border)'};background:${c.camMode==='3rd'?'rgba(0,229,255,.12)':'none'};color:${c.camMode==='3rd'?'var(--accent)':'var(--muted)'};opacity:${c.camAllow3rd===false?'0.35':'1'}">
          🎥 3-shaxs
        </button>
      </div>

      <!-- Rejim almashtirish tugmasi (ikkisi ham yoqiq bo'lsa) -->
      ${(c.camAllow1st!==false && c.camAllow3rd!==false) ? `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="flex:1;font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">🔄 Almashtirish tugmasi</span>
        ${keyBtn('camSwitchKey')}
      </div>` : `
      <div style="font-size:8px;color:var(--accent2);font-family:'Share Tech Mono',monospace;background:rgba(255,107,53,.06);border-radius:3px;padding:4px 6px;margin-bottom:6px">
        ⚠ Faqat ${c.camAllow1st!==false?'1-shaxs':'3-shaxs'} rejimi aktiv
      </div>`}

      <!-- 1-shaxs sozlamalari -->
      ${c.camAllow1st!==false ? `
      <div style="background:rgba(0,229,255,.04);border:1px solid rgba(0,229,255,.12);border-radius:4px;padding:6px;margin-bottom:5px">
        <div style="font-size:8px;color:var(--accent);font-family:'Share Tech Mono',monospace;margin-bottom:5px">👁 1-SHAXS SOZLAMALARI</div>
        <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:4px">Kamera ofseti:</div>
        <div style="font-size:8px;color:var(--accent);font-family:'Share Tech Mono',monospace;margin-bottom:4px">📐 Boshlang'ich burchak:</div>
        ${row('↔ Yaw (°)',   slider('camInitYaw',   0, 360, 1, c.camInitYaw??180,  '°'))}
        ${row('↕ Pitch (°)', slider('camInitPitch',-80, 80,  1, c.camInitPitch??0, '°'))}
        ${row('↔ Yon (X)',    slider('camOffsetX',  -2, 2,  0.05, c.camOffsetX,  'm'))}
        ${row('↕ Balandlik',  slider('camOffsetY',   0, 4,  0.05, c.camOffsetY,  'm'))}
        ${row('↔ Oldi/orqa',  slider('camOffsetZ',  -2, 2,  0.05, c.camOffsetZ,  'm'))}
        <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin:5px 0 3px">Vertikal chegara (daraja):</div>
        ${row('⬆ Tepaga max', slider('cam1stPitchMax', 10, 89, 1, c.cam1stPitchMax??60, '°'))}
        ${row('⬇ Pastga max', slider('cam1stPitchMin',-89,-10, 1, c.cam1stPitchMin??-60,'°'))}
      </div>` : ''}

      <!-- 3-shaxs sozlamalari -->
      ${c.camAllow3rd!==false ? `
      <div style="background:rgba(204,136,255,.04);border:1px solid rgba(204,136,255,.12);border-radius:4px;padding:6px;margin-bottom:5px">
        <div style="font-size:8px;color:var(--accent4);font-family:'Share Tech Mono',monospace;margin-bottom:5px">🎥 3-SHAXS SOZLAMALARI</div>
        <div style="font-size:8px;color:var(--accent4);font-family:'Share Tech Mono',monospace;margin-bottom:4px">📐 Boshlang'ich burchak:</div>
        ${row('↔ Yaw (°)',   slider('camInitYaw',   0, 360, 1, c.camInitYaw??180,  '°'))}
        ${row('↕ Pitch (°)', slider('camInitPitch',-80, 80,  1, c.camInitPitch??0, '°'))}
        ${row('📏 Masofa',     slider('cam3rdDist',    2, 20,  0.5, c.cam3rdDist,   'm'))}
        ${row('↕ Balandlik',  slider('cam3rdHeight',   0, 10,  0.5, c.cam3rdHeight, 'm'))}
        <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin:5px 0 3px">Vertikal chegara (daraja):</div>
        ${row('⬆ Tepaga max', slider('cam3rdPitchMax', 5, 80, 1, c.cam3rdPitchMax??60,  '°'))}
        ${row('⬇ Pastga max', slider('cam3rdPitchMin',-80,-5, 1, c.cam3rdPitchMin??-40, '°'))}
      </div>` : ''}

      <!-- OYNA OCHMASDAN KAMERA TEKSHIR -->
      <div style="border-top:1px solid rgba(0,229,255,.12);padding-top:6px;margin-top:2px">
        <div style="font-size:8px;color:var(--accent);font-family:'Share Tech Mono',monospace;margin-bottom:5px;letter-spacing:1px">🎬 OYNA OCHMASDAN KAMERA TEKSHIR</div>
        <div style="display:flex;gap:4px;margin-bottom:5px">
          ${c.camAllow1st!==false ? `
          <button onclick="window._camPreview.start('car','1st')"
            style="flex:1;padding:5px 3px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;
            background:rgba(0,229,255,.1);border:1px solid rgba(0,229,255,.35);color:var(--accent)" 
            onmouseover="this.style.background='rgba(0,229,255,.2)'" onmouseout="this.style.background='rgba(0,229,255,.1)'">
            👁 1-shaxs<br><span style="font-size:7px;opacity:.7">Tekshir</span>
          </button>` : ''}
          ${c.camAllow3rd!==false ? `
          <button onclick="window._camPreview.start('car','3rd')"
            style="flex:1;padding:5px 3px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;
            background:rgba(204,136,255,.1);border:1px solid rgba(204,136,255,.35);color:var(--accent4)"
            onmouseover="this.style.background='rgba(204,136,255,.2)'" onmouseout="this.style.background='rgba(204,136,255,.1)'">
            🎥 3-shaxs<br><span style="font-size:7px;opacity:.7">Tekshir</span>
          </button>` : ''}
        </div>
        <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;line-height:1.5;background:rgba(0,0,0,.2);border-radius:3px;padding:3px 6px">
          💡 Tugmani bosib sichqoncha bilan kamerani erkin burish mumkin
        </div>
      </div>
    </div>

    <!-- STATUS BAR -->
    <div style="background:rgba(0,0,0,.3);border-radius:4px;padding:6px 8px;font-family:'Share Tech Mono',monospace;font-size:8px;color:var(--muted);border:1px solid rgba(0,180,255,.15)">
      ⚙ ${c.driveType==='front'?'Oldi':c.driveType==='rear'?'Orqa':'To\'liq'} haydash ·
      🏎 Maks ${c.maxSpeed}km/h · ⚖ ${c.mass}kg ·
      🔢 ${c.gears}-pog'ona ·
      ⚡ Nitro: ${c.nitroDuration}s / ${c.nitroCooldown}s kutish
    </div>
  </div>`;
}
window._buildCarInspector = _buildCarInspector;


// ── ENTITY MODE (Qurol / Avtomobil) ─────────────────────────
window.setEntityMode = function(obj, mode) {
  if (!obj) return;
  obj.userData._entityMode = mode || undefined;

  // Eski strelkani o'chir
  const oldArrow = obj.getObjectByName('__vehicle_arrow__');
  if (oldArrow) obj.remove(oldArrow);

  if (mode === 'vehicle') {
    // Oldi strelkasi — -Z yo'nalishi (THREE.js standart oldi)
    const dir    = new THREE.Vector3(0, 0, -1);
    const origin = new THREE.Vector3(0, 0, 0);
    const box    = new THREE.Box3().setFromObject(obj);
    const size   = new THREE.Vector3();
    box.getSize(size);
    const len = Math.max(size.x, size.y, size.z) * 0.75;

    const arrow = new THREE.ArrowHelper(dir, origin, len, 0x00ffcc, len * 0.35, len * 0.2);
    arrow.name = '__vehicle_arrow__';

    // Strelka ozgina yuqorida tursin (ob'ekt markazidan)
    arrow.position.y = size.y * 0.5 + 0.05;

    obj.add(arrow);
    log(`🚗 Avtomobil — "${obj.userData.name}" belgilandi. 🔷 Ko'k-yashil strelka = OLDI`, 'lok');
  } else if (mode) {
    obj.userData.isPlayerObj = false;
    log(`Entity — "${obj.userData.name}" belgilandi.`, 'lok');
  } else {
    log(`✕ "${obj.userData.name}" entity rejimi olib tashlandi`, 'lw');
  }
  updateInspector(); updateHierarchy();
};

window.setModelFacing = function(obj, angleY) {
  if (!obj) return;
  obj.userData._facingY = angleY;
  const glb = obj.children.find(c => c.name === '__glb_model__');
  if (glb) glb.rotation.y = angleY * Math.PI / 180;
  log(`🧭 "${obj.userData.name}" oldi yo'nalishi: ${angleY}°`, 'lok');
  updateInspector();
};

function _facingBtn(cur, val) {
  const active = cur === val;
  return `font-size:10px;padding:4px;border-radius:3px;cursor:pointer;width:100%;
    background:${active?'rgba(255,200,0,.25)':'rgba(255,255,255,.04)'};
    border:1px solid ${active?'rgba(255,200,0,.7)':'rgba(255,255,255,.1)'};
    color:${active?'#ffcc00':'#556'};font-family:'Share Tech Mono',monospace;
    ${active?'box-shadow:0 0 6px rgba(255,200,0,.3)':''}`;
}
