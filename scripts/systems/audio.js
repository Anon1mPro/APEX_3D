// ============================================================
// AUDIO SYSTEM
// ============================================================
let audioCtx = null, audioEnabled = false;
const audioSources = {};

window.toggleAudio = function() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    audioEnabled = true;
    SoundSystem.init();
    log('🔊 Audio tizim yoqildi (PositionalAudio)', 'lok');
    startAmbientAudio();
  } else if (audioEnabled) {
    audioCtx.suspend();
    audioEnabled = false;
    log('🔇 Audio o\'chirildi', 'lw');
  } else {
    audioCtx.resume();
    audioEnabled = true;
    log('🔊 Audio yoqildi', 'lok');
  }
};

function startAmbientAudio() {
  if (!audioCtx) return;
  // Ambient engine hum
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  osc.frequency.value = 60;
  osc.type = 'sawtooth';
  filter.type = 'lowpass';
  filter.frequency.value = 200;
  gain.gain.value = 0.04;
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  audioSources.hum = {osc, gain};
}

// ════════════════════════════════════════════════════════════════
// SPATIAL SOUND SYSTEM  —  THREE.PositionalAudio + AudioLoader
// ════════════════════════════════════════════════════════════════
const SoundSystem = {
  listener : null,
  library  : {},      // name → {buffer, volume, loop, type, refDist, rolloff}
  _music   : null,
  _musicName: null,
  _ready   : false,

  // ── init ────────────────────────────────────────────────────
  init() {
    if (this._ready) return;
    if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    audioEnabled = true;
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    this._generateBuiltins();
    this._ready = true;
    log('🔊 SoundSystem tayyor (PositionalAudio)', 'lok');
  },

  _ensure() { if (!this._ready) this.init(); if (audioCtx.state==='suspended') audioCtx.resume(); },

  // ── buffer builder ──────────────────────────────────────────
  _buf(secs, fn) {
    const sr = audioCtx.sampleRate;
    const b  = audioCtx.createBuffer(1, Math.ceil(sr*secs), sr);
    fn(b.getChannelData(0), sr);
    return b;
  },

  _reg(name, buffer, opts={}) {
    this.library[name] = { buffer, volume:opts.volume??0.7, loop:opts.loop||false,
      type:opts.type||'sfx', refDist:opts.refDist||5, rolloff:opts.rolloff||2 };
  },

  // ── procedural sound bank ────────────────────────────────────
  _generateBuiltins() {
    const B = (s,f) => this._buf(s,f);

    // IMPACT — to'qnashuv
    this._reg('impact', B(0.4,(d,sr)=>{
      for(let i=0;i<d.length;i++){const t=i/sr,e=Math.exp(-t*18);
        d[i]=((Math.random()*2-1)*0.6+Math.sin(6.28*60*t)*0.5)*e;}
    }), {volume:0.75, refDist:6});

    // BOOM — portlash
    this._reg('boom', B(1.2,(d,sr)=>{
      for(let i=0;i<d.length;i++){const t=i/sr;
        const bass=Math.sin(6.28*(40-t*8)*t)*0.55;
        const noise=(Math.random()*2-1)*Math.exp(-t*4)*0.85;
        d[i]=(noise+bass)*Math.exp(-t*2.5);}
    }), {volume:1.0, refDist:12});

    // WHOOSH — shamol/tezlik
    this._reg('whoosh', B(0.45,(d,sr)=>{
      for(let i=0;i<d.length;i++){const t=i/sr,p=t/0.45;
        const e=Math.sin(Math.PI*p)*0.8;
        const f=400+p*1200;
        d[i]=(Math.sin(6.28*f*t)*0.25+(Math.random()*2-1)*0.35)*e;}
    }), {volume:0.6});

    // CLICK — UI bosilish
    this._reg('click', B(0.07,(d,sr)=>{
      for(let i=0;i<d.length;i++){const t=i/sr;
        d[i]=Math.sin(6.28*1400*t)*Math.exp(-t*70)*0.55;}
    }), {volume:0.45});

    // BEEP — signal
    this._reg('beep', B(0.22,(d,sr)=>{
      for(let i=0;i<d.length;i++){const t=i/sr;
        const e=t<0.18?1:Math.exp(-(t-0.18)*35);
        d[i]=Math.sin(6.28*880*t)*0.38*e;}
    }), {volume:0.5});

    // COIN — terim/yig'ish
    this._reg('coin', B(0.42,(d,sr)=>{
      const n=[523,659,784];
      for(let i=0;i<d.length;i++){const t=i/sr;
        const ni=Math.min(2,Math.floor(t/0.12));
        const lt=t-ni*0.12;
        d[i]=Math.sin(6.28*n[ni]*t)*Math.exp(-lt*10)*0.42;}
    }), {volume:0.8});

    // JUMP — sakrash
    this._reg('jump', B(0.28,(d,sr)=>{
      for(let i=0;i<d.length;i++){const t=i/sr;
        d[i]=Math.sin(6.28*(180+t*900)*t)*Math.exp(-t*7)*0.42;}
    }), {volume:0.65});

    // LAND — yerga tushish
    this._reg('land', B(0.25,(d,sr)=>{
      for(let i=0;i<d.length;i++){const t=i/sr;
        d[i]=((Math.random()*2-1)*0.7+Math.sin(6.28*45*t)*0.4)*Math.exp(-t*28);}
    }), {volume:0.7, refDist:4});

    // HURT — zarar
    this._reg('hurt', B(0.38,(d,sr)=>{
      for(let i=0;i<d.length;i++){const t=i/sr;
        const f=380-t*160;
        d[i]=(Math.sin(6.28*f*t)*0.5+(Math.random()*2-1)*0.18)*Math.exp(-t*9);}
    }), {volume:0.8});

    // POWERUP — kuchaytirish
    this._reg('powerup', B(0.65,(d,sr)=>{
      const n=[261,329,392,523,659,784];
      for(let i=0;i<d.length;i++){const t=i/sr;
        const ni=Math.min(5,Math.floor(t/0.09));
        const lt=t-ni*0.09;
        d[i]=Math.sin(6.28*n[ni]*t)*Math.exp(-lt*14)*0.38;}
    }), {volume:0.85});

    // SHOOT — otish
    this._reg('shoot', B(0.28,(d,sr)=>{
      for(let i=0;i<d.length;i++){const t=i/sr;
        const f=700-t*380;
        d[i]=(Math.sin(6.28*f*t)*0.5+(Math.random()*2-1)*0.1)*Math.exp(-t*13);}
    }), {volume:0.7, refDist:8});

    // STEP — qadam
    this._reg('step', B(0.14,(d,sr)=>{
      for(let i=0;i<d.length;i++){const t=i/sr;
        d[i]=((Math.random()*2-1)*0.8+Math.sin(6.28*90*t)*0.2)*Math.exp(-t*35);}
    }), {volume:0.38, refDist:3});

    // DOOR — eshik
    this._reg('door', B(0.9,(d,sr)=>{
      for(let i=0;i<d.length;i++){const t=i/sr;
        const creak=Math.sin(6.28*(200+Math.sin(6.28*1.5*t)*80)*t)*0.3;
        const noise=(Math.random()*2-1)*0.15;
        d[i]=(creak+noise)*Math.exp(-t*2.5);}
    }), {volume:0.6, refDist:6});

    // EXPLOSION — katta portlash
    this._reg('explosion', B(1.8,(d,sr)=>{
      for(let i=0;i<d.length;i++){const t=i/sr;
        const sub=Math.sin(6.28*30*t)*Math.exp(-t*3)*0.7;
        const crack=(Math.random()*2-1)*Math.exp(-t*6)*0.9;
        const rumble=Math.sin(6.28*55*t)*Math.exp(-t*1.5)*0.4;
        d[i]=(sub+crack+rumble)*0.8;}
    }), {volume:1.0, refDist:15});

    // ── Ambient ────────────────────────────────────────────────
    // WIND — shamol
    this._reg('wind', B(3.5,(d,sr)=>{
      let p=0;
      for(let i=0;i<d.length;i++){const t=i/sr;
        const n=Math.random()*2-1;
        p=p*0.978+n*0.022;
        const mod=0.5+0.5*Math.sin(6.28*0.25*t+Math.sin(6.28*0.07*t)*3);
        d[i]=p*2.5*mod*0.28;}
    }), {volume:0.3, loop:true, type:'ambient', refDist:999, rolloff:0});

    // RAIN — yomg'ir
    this._reg('rain', B(2.2,(d,sr)=>{
      let s1=0,s2=0,s3=0;
      for(let i=0;i<d.length;i++){const n=Math.random()*2-1;
        s1=s1*0.95+n*0.05; s2=s2*0.80+n*0.20; s3=s3*0.99+n*0.01;
        d[i]=(s1*0.25+s2*0.55+s3*0.2)*0.52;}
    }), {volume:0.38, loop:true, type:'ambient', refDist:999, rolloff:0});

    // FIRE — olov
    this._reg('fire', B(2.8,(d,sr)=>{
      let p=0;
      for(let i=0;i<d.length;i++){const t=i/sr;
        const n=Math.random()*2-1;
        p=p*0.96+n*0.04;
        const crackle=Math.random()<0.003?(Math.random()*2-1)*0.9:0;
        d[i]=(p*3+crackle)*0.35*(0.8+0.2*Math.sin(6.28*0.4*t));}
    }), {volume:0.45, loop:true, type:'ambient', refDist:6});

    // WATER — suv
    this._reg('water', B(3.0,(d,sr)=>{
      let p1=0,p2=0;
      for(let i=0;i<d.length;i++){const t=i/sr;
        const n=Math.random()*2-1;
        p1=p1*0.92+n*0.08; p2=p2*0.98+n*0.02;
        const bubble=Math.random()<0.008?Math.sin(6.28*(300+Math.random()*200)*t)*0.5:0;
        d[i]=(p1*0.5+p2*0.3+bubble)*0.4*(0.7+0.3*Math.sin(6.28*0.15*t));}
    }), {volume:0.4, loop:true, type:'ambient', refDist:8});
  },

  // ── play ────────────────────────────────────────────────────
  play(name, obj=null, opts={}) {
    this._ensure();
    const def = this.library[name];
    if (!def) { log(`⚠ Sound '${name}' topilmadi. Mavjud: ${Object.keys(this.library).join(', ')}`, 'lw'); return null; }

    const vol    = opts.volume  !== undefined ? opts.volume  : def.volume;
    const loop   = opts.loop    !== undefined ? opts.loop    : def.loop;
    const refD   = opts.refDist !== undefined ? opts.refDist : def.refDist;
    const rollof = opts.rolloff !== undefined ? opts.rolloff : def.rolloff;

    if (obj) {
      // ── THREE.PositionalAudio ─
      const pa = new THREE.PositionalAudio(this.listener);
      pa.setBuffer(def.buffer);
      pa.setRefDistance(refD);
      pa.setRolloffFactor(rollof);
      pa.setVolume(Math.min(1, vol));
      pa.setLoop(loop);
      obj.add(pa);
      pa.play();
      if (!loop) {
        const ms = (def.buffer.duration + 0.6) * 1000;
        const rm = () => { try { obj.remove(pa); } catch(e){} };
        pa.onEnded = rm;
        setTimeout(rm, ms);
      }
      return pa;
    } else {
      // ── THREE.Audio (global, non-positional) ─
      const ga = new THREE.Audio(this.listener);
      ga.setBuffer(def.buffer);
      ga.setVolume(Math.min(1, vol));
      ga.setLoop(loop);
      ga.play();
      return ga;
    }
  },

  // ── stop active positional sound on obj ─────────────────────
  stop(name, obj=null) {
    if (obj) {
      obj.children.filter(c=>c.isPositionalAudio).forEach(pa=>{
        try { pa.stop(); obj.remove(pa); } catch(e){}
      });
    }
  },

  // ── ambient attached to object ──────────────────────────────
  attachAmbient(obj, name, opts={}) {
    if (!obj) return;
    // Stop existing ambient
    if (obj.userData._ambientAudio) {
      try { obj.userData._ambientAudio.stop(); } catch(e){}
      try { obj.remove(obj.userData._ambientAudio); } catch(e){}
      delete obj.userData._ambientAudio;
      delete obj.userData._ambientSound;
    }
    if (!name || name==='off') { updateHierarchy(); return; }
    const pa = this.play(name, obj, { loop:true, ...opts });
    if (pa) { obj.userData._ambientAudio=pa; obj.userData._ambientSound=name; }
    updateHierarchy();
  },

  // ── background music ────────────────────────────────────────
  setMusic(name, opts={}) {
    this.stopMusic();
    if (!name) return;
    this._ensure();
    const def = this.library[name];
    if (!def) { log(`⚠ Music '${name}' topilmadi`, 'lw'); return; }
    this._music = new THREE.Audio(this.listener);
    this._music.setBuffer(def.buffer);
    this._music.setVolume(opts.volume ?? 0.3);
    this._music.setLoop(true);
    this._music.play();
    this._musicName = name;
    log(`🎵 Musiqa: '${name}' boshlandi`, 'lok');
  },
  stopMusic() {
    if (this._music) { try{ this._music.stop(); }catch(e){} this._music=null; this._musicName=null; }
  },

  // ── load from URL ────────────────────────────────────────────
  load(name, url, opts={}) {
    this._ensure();
    const loader = new THREE.AudioLoader();
    loader.load(url,
      buf => { this._reg(name, buf, opts); log(`🔊 '${name}' yuklandi`, 'lok'); updateSoundPanel(); },
      undefined,
      err => log(`❌ '${name}' yuklanmadi: ${err}`, 'le')
    );
  },

  // ── panel UI ─────────────────────────────────────────────────
  showPanel() {
    const old = document.getElementById('sound-panel');
    if (old) { old.remove(); return; }
    this._ensure();

    const p = document.createElement('div');
    p.id = 'sound-panel';
    p.classList.add('ui-modal-scroll');
    p.style.cssText = 'border:1px solid var(--accent3);min-width:370px;max-height:82vh;padding:0';

    const sfxList  = Object.entries(this.library).filter(([,d])=>d.type==='sfx');
    const ambList  = Object.entries(this.library).filter(([,d])=>d.type==='ambient');
    const selObj   = window.selectedObj;
    const ambSound = selObj?.userData?._ambientSound || '';

    p.innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(0,40,60,.7),rgba(10,20,40,.9));padding:11px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);cursor:move">
      <span style="font-size:11px;color:var(--accent3);letter-spacing:2px">🔊 OVOZ TIZIMI</span>
      <div style="display:flex;gap:6px;align-items:center">
        <span style="font-size:9px;color:var(--muted)">${Object.keys(this.library).length} ta ovoz</span>
        <button onclick="document.getElementById('sound-panel').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px">✕</button>
      </div>
    </div>
    <div style="padding:12px 14px;display:flex;flex-direction:column;gap:14px">

      <!-- MUSIQA -->
      <div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-bottom:7px">🎵 MUSIQA</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
          ${[...sfxList,...ambList].map(([n,d])=>`
          <button onclick="SoundSystem.setMusic('${n}')" title="${n}"
            style="padding:4px 8px;border:1px solid ${this._musicName===n?'var(--accent3)':'var(--border)'};background:${this._musicName===n?'rgba(57,255,20,.1)':'none'};color:${this._musicName===n?'var(--accent3)':'var(--muted)'};font-size:9px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace">
            ${n}</button>`).join('')}
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span style="font-size:9px;color:var(--muted);width:50px">Ovoz</span>
          <input type="range" min="0" max="1" step="0.05" value="${this._music?.getVolume()??0.3}"
            oninput="if(SoundSystem._music)SoundSystem._music.setVolume(parseFloat(this.value))"
            style="flex:1;accent-color:var(--accent3)">
          ${this._music?`<button onclick="SoundSystem.stopMusic();soundPanelRefresh()" style="padding:3px 8px;border:1px solid var(--red);background:none;color:var(--red);font-size:9px;border-radius:3px;cursor:pointer">⏹ To'xtat</button>`:'<span style="font-size:9px;color:var(--muted)">O\'chiq</span>'}
        </div>
      </div>

      <div style="height:1px;background:var(--border)"></div>

      <!-- SFX KUTUBXONA -->
      <div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-bottom:7px">🎯 SFX — O'YINCHI SKRIPTIDA: <span style="color:var(--accent)">playSound('boom')</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
          ${sfxList.map(([n,d])=>`
          <div style="display:flex;align-items:center;gap:4px;background:var(--panel2);border:1px solid var(--border);border-radius:4px;padding:4px 7px">
            <button onclick="SoundSystem.play('${n}',null,{})" title="Tinglash"
              style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:11px;padding:0;flex-shrink:0">▶</button>
            <span style="font-size:9px;font-family:'Share Tech Mono',monospace;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n}</span>
            <input type="range" min="0" max="1" step="0.05" value="${d.volume}"
              oninput="SoundSystem.library['${n}'].volume=parseFloat(this.value)"
              style="width:40px;accent-color:var(--accent);flex-shrink:0">
          </div>`).join('')}
        </div>
      </div>

      <div style="height:1px;background:var(--border)"></div>

      <!-- AMBIENT -->
      <div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-bottom:7px">🌍 AMBIENT — OBYEKTGA BIRIKTIRISH</div>
        ${selObj ? `
        <div style="font-size:9px;color:var(--accent);margin-bottom:7px">📦 ${selObj.userData.name}</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px">
          <button onclick="SoundSystem.attachAmbient(selectedObj,'off');soundPanelRefresh()"
            style="padding:5px 8px;border:1px solid ${!ambSound?'var(--accent)':'var(--border)'};background:${!ambSound?'rgba(0,229,255,.1)':'none'};color:${!ambSound?'var(--accent)':'var(--muted)'};font-size:9px;border-radius:3px;cursor:pointer">⊘ O'chiq</button>
          ${ambList.map(([n,d])=>`
          <button onclick="SoundSystem.attachAmbient(selectedObj,'${n}');soundPanelRefresh()"
            style="padding:5px 8px;border:1px solid ${ambSound===n?'var(--accent3)':'var(--border)'};background:${ambSound===n?'rgba(57,255,20,.1)':'none'};color:${ambSound===n?'var(--accent3)':'var(--muted)'};font-size:9px;border-radius:3px;cursor:pointer">
            ${n==='wind'?'💨':n==='rain'?'🌧':n==='fire'?'🔥':'💧'} ${n}</button>`).join('')}
        </div>
        ${ambSound?`<div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:9px;color:var(--muted);width:50px">Ovoz</span>
          <input type="range" min="0" max="1" step="0.05" value="${selObj.userData._ambientAudio?.getVolume()??0.4}"
            oninput="if(selectedObj?.userData?._ambientAudio)selectedObj.userData._ambientAudio.setVolume(parseFloat(this.value))"
            style="flex:1;accent-color:var(--accent3)">
        </div>`:''}
        ` : '<div style="font-size:9px;color:var(--muted);padding:6px;text-align:center">Obyekt tanlang (ierarxiyadan)</div>'}
      </div>

      <div style="height:1px;background:var(--border)"></div>

      <!-- FAYL YUKLASH -->
      <div>
        <div style="font-size:8px;color:var(--muted);letter-spacing:1.5px;margin-bottom:7px">📁 OVOZ FAYLI YUKLASH</div>
        <div style="display:flex;gap:6px">
          <input id="snd-name-inp" placeholder="nom (masalan: boom2)" style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;padding:5px 7px;border-radius:3px;outline:none">
          <label style="padding:5px 10px;border:1px solid var(--accent);border-radius:3px;cursor:pointer;font-size:10px;color:var(--accent);white-space:nowrap">
            📂 Fayl
            <input type="file" accept="audio/*" style="display:none" onchange="soundLoadFile(this)">
          </label>
        </div>
        <div style="font-size:8px;color:var(--muted);margin-top:5px">MP3, WAV, OGG qo'llab-quvvatlanadi</div>
      </div>
    </div>`;

    document.body.appendChild(p);
    makeDraggable(p);
  }
};

window.soundPanelRefresh = () => {
  const p = document.getElementById('sound-panel');
  if (p) { p.remove(); SoundSystem.showPanel(); }
};

window.updateSoundPanel = window.soundPanelRefresh;

window.soundLoadFile = function(input) {
  const file = input.files[0]; if (!file) return;
  const name = document.getElementById('snd-name-inp')?.value.trim() || file.name.replace(/\.[^.]+$/,'');
  const reader = new FileReader();
  reader.onload = e => {
    SoundSystem._ensure();
    audioCtx.decodeAudioData(e.target.result, buf => {
      SoundSystem._reg(name, buf, { type:'sfx', volume:0.8 });
      log(`🔊 '${name}' yuklandi (${Math.round(buf.duration*10)/10}s)`, 'lok');
      soundPanelRefresh();
    }, err => log(`❌ Fayl dekod xatosi: ${err}`, 'le'));
  };
  reader.readAsArrayBuffer(file);
};

// ── playImpactSound → SoundSystem bilan (positional) ──────────
function playImpactSound(intensity=1, obj=null) {
  if (!audioEnabled) return;
  const name = intensity > 1.5 ? 'boom' : 'impact';
  const vol  = Math.min(1, 0.3 + intensity * 0.4);
  if (obj) SoundSystem.play(name, obj, { volume:vol });
  else     SoundSystem.play(name, null, { volume:vol * 0.6 });
}
