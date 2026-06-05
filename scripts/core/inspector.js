// ============================================================
// INSPECTOR (core) — updateInspector + material/transform/PBR
// Ajratilgan modullar:
//   scripts/ui/particle-inspector.js   — zarrachalar paneli
//   scripts/ui/model-orient-inspector.js — model orient paneli
//   scripts/ui/anim-inspector.js       — animatsiya paneli
// ============================================================
function updateInspector() {
  const ic = $('inspector-content');
  if (!selectedObj) { ic.innerHTML='<div style="padding:16px;font-size:11px;color:var(--muted);text-align:center">Tanlang</div>'; return; }
  // Camera object — alohida inspector
  if (selectedObj.userData && selectedObj.userData.isCamera) { buildCamObjInspector(selectedObj); return; }
  // Particle system — alohida inspector
  const ps = particleSystems.find(p => p.mesh === selectedObj);
  if (ps) { buildParticleInspector(ps); return; }
  const o = selectedObj;
  const p=o.position, r=o.rotation, s=o.scale;
  const col = o.material ? '#'+o.material.color.getHexString() : '#888888';
  const pb = physBodies.find(b=>b.mesh===o);

  ic.innerHTML=`
    <div class="comp-block">
      <div class="comp-title"><span class="tag">OBY</span>${o.userData.name}</div>
      <div class="fr"><span class="fl">Nom</span><input id="obj-name-inp" value="${o.userData.name}" style="flex:1;font-family:'Share Tech Mono',monospace;font-size:10px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:2px 5px;border-radius:2px;outline:none" oninput="window._renameObj(this.value)"></div>
      <div class="fr"><span class="fl">Tur</span><span style="font-size:10px;color:var(--accent);font-family:'Share Tech Mono',monospace">${o.userData.type||'Mesh'}</span></div>
      ${o.userData.texName?`<div class="fr"><span class="fl">Tekstura</span><span style="font-size:10px;color:var(--accent2);font-family:'Share Tech Mono',monospace">${o.userData.texName}</span></div>`:''}
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag">TRS</span>Transform</div>
      <div class="fl" style="margin-bottom:3px">Pozitsiya</div>
      <div class="xyzr">
        <div><input class="xi" id="px" value="${p.x.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#ff5555">X</div></div>
        <div><input class="xi" id="py" value="${p.y.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#55ff55">Y</div></div>
        <div><input class="xi" id="pz" value="${p.z.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#5588ff;">Z</div></div>
      </div>
      <div class="fl" style="margin:6px 0 3px">O'lchov</div>
      <div class="xyzr">
        <div><input class="xi" id="sx" value="${s.x.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#ff5555">X</div></div>
        <div><input class="xi" id="sy" value="${s.y.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#55ff55">Y</div></div>
        <div><input class="xi" id="sz" value="${s.z.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#5588ff">Z</div></div>
      </div>
    </div>

    ${(()=>{
      // Asosiy material yoki birinchi child material
      let mat = o.material;
      if(!mat) o.traverse(ch=>{ if(!mat && ch.isMesh && ch.material) mat=Array.isArray(ch.material)?ch.material[0]:ch.material; });
      if(!mat) return '';
      const opacity = mat.opacity??1;
      const roughness = mat.roughness??0.5;
      const metalness = mat.metalness??0;
      const matCol = '#'+(mat.color?.getHexString()||'888888');
      return `
    <div class="comp-block">
      <div class="comp-title"><span class="tag tag2">MAT</span>Material</div>
      <div class="fr"><span class="fl">Rang</span><input type="color" id="mc" value="${matCol}" oninput="applyM()" style="width:22px;height:20px;border:1px solid var(--border);border-radius:2px;cursor:pointer;background:none"></div>
      <div class="fr"><span class="fl">Emissiv</span><input type="color" id="mem" value="#${mat.emissive?.getHexString?.()||'000000'}" oninput="applyM()" style="width:22px;height:20px;border:1px solid var(--border);border-radius:2px;cursor:pointer;background:none"> <input type="range" min="0" max="3" step="0.05" value="${mat.emissiveIntensity||0}" id="memi" style="flex:1" oninput="applyM()"></div>
      <div class="fr"><span class="fl">Qo'pol</span><input type="range" min="0" max="1" step="0.05" value="${roughness}" style="flex:1" id="mr" oninput="applyM()"><span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right" id="mr-v">${roughness.toFixed(2)}</span></div>
      <div class="fr"><span class="fl">Metal</span><input type="range" min="0" max="1" step="0.05" value="${metalness}" style="flex:1" id="mm" oninput="applyM()"><span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right" id="mm-v">${metalness.toFixed(2)}</span></div>
      <div class="fr"><span class="fl">Shaffof</span>
        <input type="range" min="0" max="1" step="0.01" value="${opacity}" style="flex:1" id="mop" oninput="applyM()">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right" id="mop-v">${opacity.toFixed(2)}</span>
      </div>
      <div class="fr" style="flex-wrap:wrap;gap:3px;margin-top:4px">
        <button onclick="applyTransparency(0)" style="background:rgba(0,229,255,.08);border:1px solid rgba(0,229,255,.2);color:var(--accent);font-size:9px;padding:2px 6px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">Solid</button>
        <button onclick="applyTransparency(0.5)" style="background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:9px;padding:2px 6px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">50%</button>
        <button onclick="applyTransparency(0.2)" style="background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:9px;padding:2px 6px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">20%</button>
        <button onclick="applyTransparency(0)" style="background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:9px;padding:2px 6px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">Ko'rinmas</button>
      </div>
      <div class="fr" style="flex-wrap:wrap;gap:3px">
        ${TEXTURES.map((t,i)=>`<button onclick="applyTexPreset(${i})" style="background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);font-size:9px;padding:2px 5px;border-radius:2px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:600">${t.name}</button>`).join('')}
      </div>
      <div style="margin-top:5px;display:flex;flex-direction:column;gap:4px">
        <button class="action-btn" onclick="replaceWithGLB()" style="font-size:10px;background:rgba(255,107,53,.08);border-color:rgba(255,107,53,.3);color:var(--accent2)">📦 Model qo'shish (GLB/GLTF)</button>
        <button class="action-btn" onclick="uploadTexture()" style="font-size:10px">🖼 Tekstura yuklash</button>
      </div>
    </div>

    <div class="comp-block" id="pbr-maps-block">
      <div class="comp-title"><span class="tag tag2">PBR</span>Texture Maps</div>

      ${[
        ['map',           'diffuseMap',   '🖼',  'Diffuse / Albedo Map',       mat.map],
        ['normalMap',     'normalMap',    '🗺',  'Normal Map',                 mat.normalMap],
        ['roughnessMap',  'roughnessTex', '⚙',  'Roughness Map',              mat.roughnessMap],
        ['metalnessMap',  'metalnessTex', '🔩',  'Metalness Map',              mat.metalnessMap],
        ['aoMap',         'aoMap',        '🎨',  'AO (Ambient Occlusion)',     mat.aoMap],
        ['emissiveMap',   'emissiveMap',  '💡',  'Emissive Map',               mat.emissiveMap],
      ].map(([slot, id, ico, label, hasMap]) => `
      <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px">
        <span style="font-size:10px;width:10px;text-align:center;flex-shrink:0">${ico}</span>
        <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:${hasMap?'var(--accent3)':'var(--muted)'};flex:1">${label}</span>
        <button onclick="window._pbrLoadMap('${slot}')" style="background:rgba(0,229,255,.07);border:1px solid rgba(0,229,255,.2);color:var(--accent);font-size:9px;padding:1px 6px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">${hasMap?'↺ Yangi':'+ Yukla'}</button>
        ${hasMap?`<button onclick="window._pbrRemoveMap('${slot}')" style="background:rgba(255,68,68,.07);border:1px solid rgba(255,68,68,.2);color:var(--red);font-size:9px;padding:1px 5px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace">✕</button>`:''}
      </div>`).join('')}

      ${mat.aoMap ? `
      <div class="fr" style="margin-top:2px"><span class="fl">AO Kuch</span>
        <input type="range" min="0" max="3" step="0.05" value="${mat.aoMapIntensity??1}" style="flex:1"
          oninput="if(selectedObj&&selectedObj.material){selectedObj.material.aoMapIntensity=parseFloat(this.value);this.nextSibling.textContent=parseFloat(this.value).toFixed(2)}">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right">${(mat.aoMapIntensity??1).toFixed(2)}</span>
      </div>` : ''}

      ${mat.normalMap ? `
      <div class="fr" style="margin-top:2px"><span class="fl">Normal Scale</span>
        <input type="range" min="0" max="5" step="0.1" value="${mat.normalScale?.x??1}" style="flex:1"
          oninput="if(selectedObj&&selectedObj.material&&selectedObj.material.normalScale){const v=parseFloat(this.value);selectedObj.material.normalScale.set(v,v);this.nextSibling.textContent=v.toFixed(1)}">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right">${(mat.normalScale?.x??1).toFixed(1)}</span>
      </div>` : ''}

      <div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent2);margin:8px 0 4px;letter-spacing:1px">UV TILING & OFFSET</div>
      <div class="fr"><span class="fl" style="font-size:9px">Repeat X</span>
        <input type="number" min="0.1" step="0.1" value="${mat.map?.repeat?.x??1}" style="width:52px;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;padding:2px 4px;border-radius:2px;outline:none"
          oninput="window._pbrSetUV('repeatX',parseFloat(this.value)||1)">
        <span class="fl" style="font-size:9px;margin-left:6px">Y</span>
        <input type="number" min="0.1" step="0.1" value="${mat.map?.repeat?.y??1}" style="width:52px;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;padding:2px 4px;border-radius:2px;outline:none"
          oninput="window._pbrSetUV('repeatY',parseFloat(this.value)||1)">
      </div>
      <div class="fr" style="margin-top:3px"><span class="fl" style="font-size:9px">Offset X</span>
        <input type="number" step="0.05" value="${mat.map?.offset?.x??0}" style="width:52px;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;padding:2px 4px;border-radius:2px;outline:none"
          oninput="window._pbrSetUV('offsetX',parseFloat(this.value)||0)">
        <span class="fl" style="font-size:9px;margin-left:6px">Y</span>
        <input type="number" step="0.05" value="${mat.map?.offset?.y??0}" style="width:52px;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:10px;padding:2px 4px;border-radius:2px;outline:none"
          oninput="window._pbrSetUV('offsetY',parseFloat(this.value)||0)">
      </div>
      <div class="fr" style="margin-top:3px"><span class="fl" style="font-size:9px">Rotation</span>
        <input type="range" min="0" max="6.28" step="0.01" value="${mat.map?.rotation??0}" style="flex:1"
          oninput="window._pbrSetUV('rotation',parseFloat(this.value));this.nextSibling.textContent=(parseFloat(this.value)*57.3).toFixed(0)+'°'">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:34px;text-align:right">${((mat.map?.rotation??0)*57.3).toFixed(0)}°</span>
      </div>
      <button onclick="window._pbrSetUV('reset')" style="margin-top:5px;width:100%;background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--muted);font-family:'Rajdhani',sans-serif;font-size:10px;font-weight:700;padding:4px;border-radius:3px;cursor:pointer">↺ UV Reset</button>
    </div>`;
    })()} 
    ${pb && !pb.isStatic?`
    <div class="comp-block">
      <div class="comp-title"><span class="tag tag3">PHY</span>Fizika <span style="font-size:8px;color:${rapierWorld?'var(--accent3)':'var(--accent2)'};font-family:'Share Tech Mono',monospace;margin-left:4px">${rapierWorld?'⚡ Rapier':'⚙ Legacy'}</span></div>
      <div class="toggle-row"><span style="font-size:10px;color:var(--muted)">Aktiv</span>
        <label class="tgl"><input type="checkbox" checked onchange="
          const active=this.checked;
          if(multiSelected.size>0){
            multiSelected.forEach(obj=>{
              const pb2=physBodies.find(b=>b.mesh===obj);
              if(pb2){pb2.isStatic=!active;if(active){pb2.mesh.userData.isStatic=false;}else{pb2.mesh.userData.isStatic=true;}}
            });
          } else {
            getSelectedPb()&&(getSelectedPb().isStatic=!active);
          }
          updateHierarchy();
        "><div class="tgl-track"></div><div class="tgl-thumb"></div></label>
      </div>
      <div class="fr"><span class="fl">Massa</span>
        <input class="fv" value="${pb.mass.toFixed(1)}" oninput="
          const b=getSelectedPb(); if(!b)return;
          b.mass=parseFloat(this.value)||1;
          updateRapierColliderProps(b.mesh,{mass:b.mass});
        ">
      </div>
      <div class="fr"><span class="fl">Sakrash</span>
        <input type="range" min="0" max="1" step="0.05" value="${pb.restitution}" style="flex:1"
          oninput="const b=getSelectedPb();if(!b)return;b.restitution=parseFloat(this.value);updateRapierColliderProps(b.mesh,{restitution:b.restitution})">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:28px">${pb.restitution.toFixed(2)}</span>
      </div>
      <div class="fr"><span class="fl">Ishqalanish</span>
        <input type="range" min="0" max="1" step="0.05" value="${pb.friction||0.8}" style="flex:1"
          oninput="const b=getSelectedPb();if(!b)return;b.friction=parseFloat(this.value);updateRapierColliderProps(b.mesh,{friction:b.friction})">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:28px">${(pb.friction||0.8).toFixed(2)}</span>
      </div>
      <div class="fr"><span class="fl">Collider</span>
        <select onchange="const b=getSelectedPb();if(!b)return;b.shape=this.value;if(rapierBodies.has(b.mesh)){removeRapierBody(b.mesh);_addRapierBody(b);}" style="flex:1;font-family:'Share Tech Mono',monospace;font-size:9px;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:3px;border-radius:2px;outline:none">
          <option value="cuboid" ${(pb.shape||'cuboid')==='cuboid'?'selected':''}>📦 Cuboid</option>
          <option value="sphere" ${pb.shape==='sphere'?'selected':''}>🔮 Sphere</option>
          <option value="cylinder" ${pb.shape==='cylinder'?'selected':''}>🥫 Cylinder</option>
        </select>
      </div>
      ${rapierWorld?`<div style="font-size:9px;color:var(--accent3);font-family:'Share Tech Mono',monospace;padding:3px 5px;background:rgba(57,255,20,.06);border-radius:2px;margin-top:2px">
        ⚡ Rapier: vel=(${(pb.vel.x||0).toFixed(1)},${(pb.vel.y||0).toFixed(1)},${(pb.vel.z||0).toFixed(1)})
      </div>`:''}
      <button class="action-btn" onclick="launchObj()" style="margin-top:4px">🚀 Uloqtir!</button>
    </div>`:''}

    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:rgba(57,255,20,.12);color:var(--accent3)">PLAYER</span>Oyinchi / Qurol / Avto</div>
      ${(o.userData.type === 'Tekislik' || o.userData.name === 'Zamin') ? `
      <div style="font-size:9px;color:var(--red);font-family:'Share Tech Mono',monospace;padding:4px 0">
        ⛔ Zamin oyinchi bo'la olmaydi
      </div>` : `

      <!-- 3 ASOSIY TUGMA -->
      <div style="display:flex;gap:4px;margin-bottom:6px">

        <!-- OYINCHI -->
        <button onclick="setPlayerObj(selectedObj)"
          style="flex:1;padding:5px 4px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700;border:1px solid;
          ${o.userData.isPlayerObj
            ? 'background:rgba(57,255,20,.18);border-color:rgba(57,255,20,.6);color:#39ff14;box-shadow:0 0 8px rgba(57,255,20,.3)'
            : 'background:rgba(57,255,20,.05);border-color:rgba(57,255,20,.2);color:#39ff14'}">
          🎮<br><span style="font-size:8px">${o.userData.isPlayerObj?'AKTIV':'Oyinchi'}</span>
        </button>

        <!-- AVTOMOBIL -->
        <button onclick="setEntityMode(selectedObj,'vehicle')"
          style="flex:1;padding:5px 4px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700;border:1px solid;
          ${o.userData._entityMode==='vehicle'
            ? 'background:rgba(0,180,255,.18);border-color:rgba(0,180,255,.6);color:#00b4ff;box-shadow:0 0 8px rgba(0,180,255,.3)'
            : 'background:rgba(0,180,255,.05);border-color:rgba(0,180,255,.2);color:#00b4ff'}">
          🚗<br><span style="font-size:8px">${o.userData._entityMode==='vehicle'?'AKTIV':'Avto'}</span>
        </button>
      </div>

      <!-- AKTIV HOLAT BELGISI VA O'CHIRISH -->
      ${o.userData.isPlayerObj ? `
      <button class="action-btn" onclick="setPlayerObj(null)"
        style="background:rgba(255,68,68,.07);border-color:rgba(255,68,68,.25);color:var(--red);font-size:9px;margin-bottom:4px">
        ✕ Oyinchini olib tashlash
      </button>
      <!-- 🎬 KAMERA PREVIEW + SOZLAMALAR — Oyinchi uchun -->
      <div style="border:1px solid rgba(57,255,20,.2);border-radius:5px;padding:7px 8px;background:rgba(57,255,20,.03);margin-bottom:6px">
        <div style="font-size:8px;color:var(--accent3);font-family:'Share Tech Mono',monospace;margin-bottom:7px;letter-spacing:1px">🎥 KAMERA SOZLAMALARI</div>

        <!-- Ruxsat toggle -->
        <div style="display:flex;gap:4px;margin-bottom:7px">
          <button onclick="_psCamSet('camAllow1st',!playerSettings.camAllow1st);if(!playerSettings.camAllow1st&&playerSettings.camMode==='fps')_psCamSet('camMode','third');updateInspector()"
            style="flex:1;padding:5px 3px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;
            border:1px solid ${playerSettings.camAllow1st?'var(--accent)':'var(--red)'};
            background:${playerSettings.camAllow1st?'rgba(0,229,255,.1)':'rgba(255,68,68,.1)'};
            color:${playerSettings.camAllow1st?'var(--accent)':'var(--red)'}">
            👁 1-shaxs<br><span style="font-size:8px">${playerSettings.camAllow1st?'✓ Yoqiq':'✗ O\' chiq'}</span>
          </button>
          <button onclick="_psCamSet('camAllow3rd',!playerSettings.camAllow3rd);if(!playerSettings.camAllow3rd&&playerSettings.camMode==='third')_psCamSet('camMode','fps');updateInspector()"
            style="flex:1;padding:5px 3px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;
            border:1px solid ${playerSettings.camAllow3rd?'var(--accent)':'var(--red)'};
            background:${playerSettings.camAllow3rd?'rgba(0,229,255,.1)':'rgba(255,68,68,.1)'};
            color:${playerSettings.camAllow3rd?'var(--accent)':'var(--red)'}">
            👥 3-shaxs<br><span style="font-size:8px">${playerSettings.camAllow3rd?'✓ Yoqiq':'✗ O\' chiq'}</span>
          </button>
        </div>

        <!-- Boshlang'ich rejim -->
        <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:4px">Boshlang'ich rejim:</div>
        <div style="display:flex;gap:4px;margin-bottom:8px">
          <button onclick="_psCamSet('camMode','fps');updateInspector()"
            style="flex:1;padding:5px 3px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;
            border:1px solid ${playerSettings.camMode==='fps'?'var(--accent)':'var(--border)'};
            background:${playerSettings.camMode==='fps'?'rgba(0,229,255,.12)':'none'};
            color:${playerSettings.camMode==='fps'?'var(--accent)':'var(--muted)'};
            opacity:${playerSettings.camAllow1st===false?'0.35':'1'}">
            👁 1-shaxs
          </button>
          <button onclick="_psCamSet('camMode','third');updateInspector()"
            style="flex:1;padding:5px 3px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;
            border:1px solid ${playerSettings.camMode==='third'?'var(--accent)':'var(--border)'};
            background:${playerSettings.camMode==='third'?'rgba(0,229,255,.12)':'none'};
            color:${playerSettings.camMode==='third'?'var(--accent)':'var(--muted)'};
            opacity:${playerSettings.camAllow3rd===false?'0.35':'1'}">
            👥 3-shaxs
          </button>
        </div>

        ${playerSettings.camAllow1st ? `
        <!-- 1-shaxs sozlamalari -->
        <div style="background:rgba(0,229,255,.04);border:1px solid rgba(0,229,255,.12);border-radius:4px;padding:6px;margin-bottom:6px">
          <div style="font-size:8px;color:var(--accent);font-family:'Share Tech Mono',monospace;margin-bottom:5px">👁 1-SHAXS SOZLAMALARI</div>
          <div style="font-size:8px;color:var(--accent);font-family:'Share Tech Mono',monospace;margin-bottom:4px;margin-top:2px">📐 Boshlang'ich burchak:</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">↔ Yaw (°)</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="0" max="360" step="1" value="${playerSettings.camInitYaw??180}" style="flex:1"
                oninput="_psCamSet('camInitYaw',parseFloat(this.value));this.nextSibling.textContent=this.value+'°'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.camInitYaw??180}°</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">↕ Pitch (°)</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="-80" max="80" step="1" value="${playerSettings.camInitPitch??0}" style="flex:1"
                oninput="_psCamSet('camInitPitch',parseFloat(this.value));this.nextSibling.textContent=this.value+'°'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.camInitPitch??0}°</span>
            </div>
          </div>
          <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:3px">Kamera ofseti:</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">↔ Yon (X)</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="-2" max="2" step="0.05" value="${playerSettings.cam1stOffsetX}" style="flex:1"
                oninput="_psCamSet('cam1stOffsetX',parseFloat(this.value));this.nextSibling.textContent=this.value+'m'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam1stOffsetX}m</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">↕ Balandlik (Y)</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="-1" max="3" step="0.05" value="${playerSettings.cam1stOffsetY}" style="flex:1"
                oninput="_psCamSet('cam1stOffsetY',parseFloat(this.value));this.nextSibling.textContent=this.value+'m'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam1stOffsetY}m</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">↔ Oldi/orqa (Z)</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="-2" max="2" step="0.05" value="${playerSettings.cam1stOffsetZ}" style="flex:1"
                oninput="_psCamSet('cam1stOffsetZ',parseFloat(this.value));this.nextSibling.textContent=this.value+'m'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam1stOffsetZ}m</span>
            </div>
          </div>
          <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin:5px 0 3px">🔄 Aylanish tezligi:</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">🖱 Sezgirlik</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="0.1" max="3.0" step="0.05" value="${playerSettings.cam1stRotateSpeed}" style="flex:1"
                oninput="_psCamSet('cam1stRotateSpeed',parseFloat(this.value));this.nextSibling.textContent=parseFloat(this.value).toFixed(2)+'x'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam1stRotateSpeed.toFixed(2)}x</span>
            </div>
          </div>
          <div style="font-size:8px;color:var(--accent);font-family:'Share Tech Mono',monospace;margin:5px 0 3px">🔄 Aylanish tezligi:</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">🖱 Sezgirlik</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="0.1" max="3.0" step="0.05" value="${playerSettings.cam1stRotateSpeed}" style="flex:1"
                oninput="_psCamSet('cam1stRotateSpeed',parseFloat(this.value));this.nextSibling.textContent=parseFloat(this.value).toFixed(2)+'x'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${(playerSettings.cam1stRotateSpeed||1).toFixed(2)}x</span>
            </div>
          </div>
          <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin:5px 0 3px">Vertikal chegara (daraja):</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">⬆ Tepaga max</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="10" max="89" step="1" value="${playerSettings.cam1stPitchMax}" style="flex:1"
                oninput="_psCamSet('cam1stPitchMax',parseInt(this.value));this.nextSibling.textContent=this.value+'°'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam1stPitchMax}°</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">⬇ Pastga max</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="-89" max="-10" step="1" value="${playerSettings.cam1stPitchMin}" style="flex:1"
                oninput="_psCamSet('cam1stPitchMin',parseInt(this.value));this.nextSibling.textContent=this.value+'°'">
              <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam1stPitchMin}°</span>
            </div>
          </div>
        </div>` : ''}

        ${playerSettings.camAllow3rd ? `
        <!-- 3-shaxs sozlamalari -->
        <div style="background:rgba(204,136,255,.04);border:1px solid rgba(204,136,255,.12);border-radius:4px;padding:6px;margin-bottom:6px">
          <div style="font-size:8px;color:var(--accent4);font-family:'Share Tech Mono',monospace;margin-bottom:5px">👥 3-SHAXS SOZLAMALARI</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">📏 Masofa</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="2" max="20" step="0.5" value="${playerSettings.cam3rdDist}" style="flex:1"
                oninput="_psCamSet('cam3rdDist',parseFloat(this.value));this.nextSibling.textContent=this.value+'m'">
              <span style="font-size:9px;color:var(--accent4);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam3rdDist}m</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">↕ Balandlik</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="0" max="10" step="0.5" value="${playerSettings.cam3rdHeight}" style="flex:1"
                oninput="_psCamSet('cam3rdHeight',parseFloat(this.value));this.nextSibling.textContent=this.value+'m'">
              <span style="font-size:9px;color:var(--accent4);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam3rdHeight}m</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">↔ Yon siljish</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="-5" max="5" step="0.1" value="${playerSettings.cam3rdOffsetX}" style="flex:1"
                oninput="_psCamSet('cam3rdOffsetX',parseFloat(this.value));this.nextSibling.textContent=this.value+'m'">
              <span style="font-size:9px;color:var(--accent4);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam3rdOffsetX}m</span>
            </div>
          </div>
          <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin:5px 0 3px">🔄 Aylanish tezligi:</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">🖱 Sezgirlik</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="0.1" max="3.0" step="0.05" value="${playerSettings.cam3rdRotateSpeed}" style="flex:1"
                oninput="_psCamSet('cam3rdRotateSpeed',parseFloat(this.value));this.nextSibling.textContent=parseFloat(this.value).toFixed(2)+'x'">
              <span style="font-size:9px;color:var(--accent4);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam3rdRotateSpeed.toFixed(2)}x</span>
            </div>
          </div>
          <div style="font-size:8px;color:var(--accent4);font-family:'Share Tech Mono',monospace;margin:5px 0 3px">🔄 Aylanish tezligi:</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">🖱 Sezgirlik</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="0.1" max="3.0" step="0.05" value="${playerSettings.cam3rdRotateSpeed}" style="flex:1"
                oninput="_psCamSet('cam3rdRotateSpeed',parseFloat(this.value));this.nextSibling.textContent=parseFloat(this.value).toFixed(2)+'x'">
              <span style="font-size:9px;color:var(--accent4);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${(playerSettings.cam3rdRotateSpeed||1).toFixed(2)}x</span>
            </div>
          </div>
          <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin:5px 0 3px">Vertikal chegara (daraja):</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">⬆ Tepaga max</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="5" max="80" step="1" value="${playerSettings.cam3rdPitchMax}" style="flex:1"
                oninput="_psCamSet('cam3rdPitchMax',parseInt(this.value));this.nextSibling.textContent=this.value+'°'">
              <span style="font-size:9px;color:var(--accent4);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam3rdPitchMax}°</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">⬇ Pastga max</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="-80" max="-5" step="1" value="${playerSettings.cam3rdPitchMin}" style="flex:1"
                oninput="_psCamSet('cam3rdPitchMin',parseInt(this.value));this.nextSibling.textContent=this.value+'°'">
              <span style="font-size:9px;color:var(--accent4);font-family:'Share Tech Mono',monospace;min-width:38px;text-align:right">${playerSettings.cam3rdPitchMin}°</span>
            </div>
          </div>
        </div>` : ''}

        <!-- ❤️ Jon sozlamalari -->
        <div style="border-top:1px solid rgba(255,68,68,.15);padding-top:6px;margin-top:2px;margin-bottom:6px">
          <div style="font-size:8px;color:#ff6b6b;font-family:'Share Tech Mono',monospace;margin-bottom:5px">❤️ Jon sozlamalari:</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">💊 Max jon</span>
            <div style="flex:1;display:flex;align-items:center;gap:4px">
              <input type="range" min="1" max="1000" step="1" value="${playerSettings.maxHealth??100}" style="flex:1"
                oninput="_psCamSet('maxHealth',parseInt(this.value));this.nextSibling.textContent=this.value+'hp'">
              <span style="font-size:9px;color:#ff6b6b;font-family:'Share Tech Mono',monospace;min-width:42px;text-align:right">${playerSettings.maxHealth??100}hp</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);min-width:80px;flex-shrink:0">☠ O'lim xabari</span>
            <input type="text" value="${playerSettings.deathMessage??'Siz oldingiz!'}"
              style="flex:1;background:var(--panel2);border:1px solid var(--border);color:var(--text);font-family:'Share Tech Mono',monospace;font-size:9px;padding:3px 5px;border-radius:3px"
              oninput="_psCamSet('deathMessage',this.value)">
          </div>
        </div>

        <!-- 🔄 Ob'ekt burilishi -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:5px 6px;background:rgba(57,255,20,.04);border:1px solid rgba(57,255,20,.15);border-radius:4px">
          <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--muted);flex:1">🔄 Ob'ekt burilishi <span style="color:rgba(255,255,255,.3)">(Alt)</span></span>
          <button onclick="_psCamSet('bodyRotate',!playerSettings.bodyRotate);updateInspector()"
            style="padding:3px 10px;border-radius:3px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:9px;font-weight:700;
            background:${playerSettings.bodyRotate!==false?'rgba(57,255,20,.2)':'rgba(255,255,255,.05)'};
            border:1px solid ${playerSettings.bodyRotate!==false?'#39ff14':'rgba(255,255,255,.2)'};
            color:${playerSettings.bodyRotate!==false?'#39ff14':'var(--muted)'}">
            ${playerSettings.bodyRotate!==false?'✅ YOQIQ':'⬜ OCHIQ'}
          </button>
        </div>

        <!-- 🎬 Kamera Tekshir tugmalari -->
        <div style="border-top:1px solid rgba(57,255,20,.15);padding-top:6px;margin-top:2px">
          <div style="font-size:8px;color:var(--accent);font-family:'Share Tech Mono',monospace;margin-bottom:5px;letter-spacing:1px">🎬 KAMERA TEKSHIR — oyna ochmasdan</div>
          <div style="display:flex;gap:5px">
            <button onclick="window._camPreview.start('player','1st')"
              style="flex:1;padding:7px 4px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700;
              background:rgba(0,229,255,.12);border:1px solid rgba(0,229,255,.4);color:var(--accent)">
              👁 1-shaxs<br><span style="font-size:8px;opacity:.75;font-weight:400">Tekshir</span>
            </button>
            <button onclick="window._camPreview.start('player','3rd')"
              style="flex:1;padding:7px 4px;border-radius:4px;cursor:pointer;font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700;
              background:rgba(204,136,255,.12);border:1px solid rgba(204,136,255,.4);color:var(--accent4)">
              👥 3-shaxs<br><span style="font-size:8px;opacity:.75;font-weight:400">Tekshir</span>
            </button>
          </div>
          <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-top:5px;line-height:1.5">
            🖱 Bosing → canvas ustida sichqoncha tortib kamera buriladi
          </div>
        </div>
      </div>` : ''}
      ${o.userData._entityMode ? `
      <button class="action-btn" onclick="setEntityMode(selectedObj,null)"
        style="background:rgba(255,68,68,.07);border-color:rgba(255,68,68,.25);color:var(--red);font-size:9px;margin-bottom:4px">
        ✕ Entity rejimini olib tashlash
      </button>` : ''}

      <!-- GLB UCHUN OLDI/ORQA BELGILASH -->
      ${(o.userData.isGLB || o.userData.isGLTF) && (o.userData.isPlayerObj || o.userData._entityMode) ? `
      <div style="border:1px solid rgba(255,200,0,.2);border-radius:4px;padding:6px 8px;background:rgba(255,200,0,.04);margin-bottom:6px">
        <div style="font-size:9px;color:#ffcc00;font-family:'Share Tech Mono',monospace;margin-bottom:5px">🧭 Model yo'nalishi (OLDI qaysi tomon?)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;width:120px;margin:0 auto">
          <div></div>
          <button onclick="setModelFacing(selectedObj,0)" style="${_facingBtn(o.userData._facingY,0)}">⬆<br><span style="font-size:7px">+Z</span></button>
          <div></div>
          <button onclick="setModelFacing(selectedObj,270)" style="${_facingBtn(o.userData._facingY,270)}">⬅<br><span style="font-size:7px">-X</span></button>
          <div style="display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--muted)">👾</div>
          <button onclick="setModelFacing(selectedObj,90)" style="${_facingBtn(o.userData._facingY,90)}">➡<br><span style="font-size:7px">+X</span></button>
          <div></div>
          <button onclick="setModelFacing(selectedObj,180)" style="${_facingBtn(o.userData._facingY,180)}">⬇<br><span style="font-size:7px">-Z</span></button>
          <div></div>
        </div>
        <div style="font-size:8px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-top:4px;text-align:center">
          Joriy: ${o.userData._facingY!==undefined ? ['⬆+Z','➡+X','⬇-Z','⬅-X'][o.userData._facingY/90]||'??' : 'Belgilanmagan'}
        </div>
      </div>` : ''}

      <div style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-top:2px;line-height:1.5">
        ${o.userData.isPlayerObj ? '▶ O\'YNA → WASD yuring, SPACE sakra' :
          o.userData._entityMode==='vehicle' ? '🚗 Avto — keyingi updateda minish' :
          'Tanlang → ▶ O\'YNA → WASD bilan yuring'}
      </div>`}

      <div style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px">

        <!-- TEZLIK -->
        <div class="fr" style="margin-bottom:4px">
          <span class="fl" style="width:72px;font-size:9px;color:var(--muted)">🚶 Tezlik</span>
          <input type="range" min="1" max="20" step="0.5" value="${playerSettings.speed}" style="flex:1"
            oninput="playerSettings.speed=parseFloat(this.value);this.nextSibling.textContent=this.value">
          <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right">${playerSettings.speed}</span>
        </div>

        <!-- SPRINT TEZLIGI -->
        <div class="fr" style="margin-bottom:4px">
          <span class="fl" style="width:72px;font-size:9px;color:var(--muted)">⚡ Sprint ×</span>
          <input type="range" min="1" max="5" step="0.1" value="${playerSettings.sprintMult}" style="flex:1"
            oninput="playerSettings.sprintMult=parseFloat(this.value);this.nextSibling.textContent=parseFloat(this.value).toFixed(1)+'x'">
          <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right">${playerSettings.sprintMult.toFixed(1)}x</span>
        </div>

        <!-- TO'LQIN (ACCEL) REJIMI -->
        <div style="margin-bottom:6px">
          <div style="font-size:9px;color:var(--muted);margin-bottom:3px">🌊 Tezlashish rejimi</div>
          <div style="display:flex;gap:3px;flex-wrap:wrap">
            ${['instant','easein','easeout','wave'].map(m => `
            <button onclick="playerSettings.accelMode='${m}';updateInspector()"
              style="flex:1;min-width:48px;font-size:8px;padding:3px 4px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace;
              background:${playerSettings.accelMode===m?'rgba(0,229,255,.2)':'rgba(255,255,255,.05)'};
              border:1px solid ${playerSettings.accelMode===m?'var(--accent)':'var(--border)'};
              color:${playerSettings.accelMode===m?'var(--accent)':'var(--muted)'}">
              ${{instant:'⚡ Darhol',easein:'📈 Sekin→Tez',easeout:'📉 Tez→Sekin',wave:'🌊 Kutish'}[m]}
            </button>`).join('')}
          </div>
          ${playerSettings.accelMode !== 'instant' ? `
          <div class="fr" style="margin-top:4px">
            <span class="fl" style="width:72px;font-size:9px;color:var(--muted)">${playerSettings.accelMode==='wave'?'⏳ Kutish':'⏱ Vaqt (s)'}</span>
            <input type="range" min="0" max="3" step="0.1"
              value="${playerSettings.accelMode==='wave'?playerSettings.waveDelay:playerSettings.accelTime}" style="flex:1"
              oninput="playerSettings.${playerSettings.accelMode==='wave'?'waveDelay':'accelTime'}=parseFloat(this.value);this.nextSibling.textContent=this.value+'s'">
            <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right">
              ${(playerSettings.accelMode==='wave'?playerSettings.waveDelay:playerSettings.accelTime).toFixed(1)}s
            </span>
          </div>` : ''}
          ${playerSettings.accelMode === 'wave' ? `
          <div class="fr" style="margin-top:3px">
            <span class="fl" style="width:72px;font-size:9px;color:var(--muted)">⏱ Tezlashish</span>
            <input type="range" min="0" max="3" step="0.1" value="${playerSettings.accelTime}" style="flex:1"
              oninput="playerSettings.accelTime=parseFloat(this.value);this.nextSibling.textContent=this.value+'s'">
            <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:28px;text-align:right">${playerSettings.accelTime.toFixed(1)}s</span>
          </div>` : ''}
        </div>

        <!-- TUGMA BIRIKTIRISHLAR -->
        <div>
          <div style="font-size:9px;color:var(--muted);margin-bottom:4px">⌨ Tugmalar</div>
          <div id="player-keybinds" style="display:flex;flex-direction:column;gap:2px">
            ${[
              ['forward','⬆ Oldinga'],['backward','⬇ Orqaga'],
              ['left','⬅ Chapga'],['right','➡ O\'ngga'],
              ['jump','⬆ Sakra'],['sprint','🏃 Sprint'],
            ].map(([action,label])=>{
              const kCode = playerSettings.keys[action];
              const animD = (window._kbAnimations||{})[kCode]||{};
              return `
            <div class="fr" style="gap:4px;align-items:center;margin-bottom:2px">
              <span style="flex:1;font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace">${label}</span>
              ${animD.animName
                ? `<span style="font-size:7px;color:#ffaa44;max-width:44px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" onclick="openBigKeyboard()">🎬${animD.animName}</span>`
                : `<label style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:20px;height:18px;border-radius:2px;border:1px dashed rgba(255,170,68,.3);color:rgba(255,170,68,.5);font-size:10px;flex-shrink:0">📁<input type="file" accept=".glb,.fbx,.json,image/*" style="display:none" onchange="window._addKeyAnim(event,'${action}','${kCode}')"></label>`
              }
              <button id="kb-${action}" onclick="startRebind('${action}')"
                style="font-size:9px;padding:2px 8px;border-radius:2px;cursor:pointer;font-family:'Share Tech Mono',monospace;min-width:60px;text-align:center;
                background:${playerSettings._rebinding===action?'rgba(255,107,53,.25)':'rgba(0,229,255,.08)'};
                border:1px solid ${playerSettings._rebinding===action?'var(--accent2)':'rgba(0,229,255,.3)'};
                color:${playerSettings._rebinding===action?'var(--accent2)':'var(--accent)'}">${playerSettings._rebinding===action?'[ bosing ]':_keyLabel(playerSettings.keys[action])}
              </button>
            </div>`;
            }).join('')}
          </div>

          <!-- MINI KLAVIATURA (bosib kattalashtirish) -->
          <div id="mini-keyboard" style="margin-top:8px;user-select:none;cursor:pointer"
               onclick="openBigKeyboard()">
            ${_buildMiniKeyboard()}
          </div>
        </div>

        <!-- KAMERA SEZGIRLIGI -->
        <div class="fr" style="margin-top:6px;border-top:1px solid var(--border);padding-top:6px">
          <span class="fl" style="width:72px;font-size:9px;color:var(--muted)">🖱 Sezgirlik</span>
          <input type="range" min="0.0005" max="0.006" step="0.0001" value="${camSensitivity}" style="flex:1"
            oninput="camSensitivity=parseFloat(this.value);this.nextSibling.textContent=(this.value*500).toFixed(1)+'%'">
          <span style="font-size:9px;color:var(--accent);font-family:'Share Tech Mono',monospace;min-width:36px;text-align:right">
            ${(camSensitivity*500).toFixed(1)}%
          </span>
        </div>



        <div class="fr" style="margin-top:3px">
          <span class="fl" style="width:72px;font-size:9px;color:var(--muted)">🔲 Collider</span>
          <button onclick="toggleColliderVis()" style="flex:1;background:rgba(${colliderVis?'57,255,20':'255,255,255'},.07);border:1px solid rgba(${colliderVis?'57,255,20':'255,255,255'},.2);color:${colliderVis?'var(--accent3)':'var(--muted)'};font-family:'Share Tech Mono',monospace;font-size:9px;padding:2px 6px;border-radius:2px;cursor:pointer">
            ${colliderVis?'Yashir':'Ko\'rsat'} (C)
          </button>
        </div>
      </div>
    </div>



    ${(o.userData.entityType === 'car' || o.userData._entityMode === 'vehicle') ? _buildCarInspector(o) : ''}

    <div class="comp-block">
      <div class="comp-title"><span class="tag tag2">QO'SH</span>Ichiga qo'shish</div>
      <button class="action-btn" onclick="addParticlesToObj()" style="background:rgba(255,150,0,.07);border-color:rgba(255,150,0,.3);color:#ffaa44">✨ Zarrachalar qo'sh</button>
      <button class="action-btn" onclick="addLightToObj()" style="background:rgba(255,255,100,.07);border-color:rgba(255,255,100,.3);color:#ffee66">💡 Yorug'lik qo'sh</button>
    </div>
    <div class="comp-block">
      <button class="action-btn" onclick="addChildToSelected()">📦 Ichiga obyekt qo'sh</button>
      <button class="action-btn" onclick="duplicateSel()">⊕ Nusxalash</button>
      <button class="action-btn" onclick="showPivotPanel()" style="background:rgba(204,136,255,.08);border-color:rgba(204,136,255,.3);color:var(--accent4)">◈ Pivot Markaz</button>
      <button class="action-btn" onclick="prefabSaveSelected()" style="background:rgba(255,204,0,.08);border-color:rgba(255,204,0,.3);color:#ffcc00">⭐ Prefab saqlash</button>
      ${!o.userData.isStatic?`<button class="action-btn del-btn" onclick="deleteSel()">✕ O'chirish</button>`:''}
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag tag4">PHY-MOD</span>Fizika Rejimi</div>
      <div class="deform-grid">
        <button class="deform-btn ${(o.userData.physMode||'solid')==='solid'?'active-mode':''}" onclick="setPhysMode('solid')">🧱 Qattiq</button>
        <button class="deform-btn ${o.userData.physMode==='jelly'?'active-mode':''}" onclick="setPhysMode('jelly')">🟢 Jele</button>
        <button class="deform-btn ${o.userData.physMode==='liquid'?'active-mode':''}" onclick="setPhysMode('liquid')">🔵 Suyuqlik</button>
        <button class="deform-btn ${o.userData.physMode==='breakable'?'active-mode':''}" onclick="setPhysMode('breakable')">💥 Sinuvchi</button>
        <button class="deform-btn ${o.userData.physMode==='cloth'?'active-mode':''}" onclick="setPhysMode('cloth')">🟣 Mato</button>
        <button class="deform-btn" onclick="setPhysMode('solid');resetDeform()">↺ Reset</button>
      </div>
    </div>

    <div class="comp-block">
      <div class="comp-title"><span class="tag tag2">DEFORM</span>Shakl o'zgartirish</div>
      <div class="deform-grid">
        <button class="deform-btn" onclick="deformOp('squish')">⬇ Ezish</button>
        <button class="deform-btn" onclick="deformOp('stretch')">↕ Cho'zish</button>
        <button class="deform-btn" onclick="deformOp('twist')">🌀 Burish</button>
        <button class="deform-btn" onclick="deformOp('inflate')">🎈 Shishirish</button>
        <button class="deform-btn" onclick="deformOp('shear')">◱ Qiyshitish</button>
        <button class="deform-btn" onclick="deformOp('break')">💢 Sindirish</button>
      </div>
      <div class="fr" style="margin-top:4px">
        <span class="fl">Kuch</span>
        <input type="range" min="0.1" max="3" step="0.05" value="1" id="deform-str" style="flex:1">
        <span style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;min-width:22px" id="deform-str-v">1.0</span>
      </div>
    </div>
  `;
  // Live deform strength label
  setTimeout(()=>{
    const ds=$('deform-str');
    if(ds) ds.oninput=function(){if($('deform-str-v'))$('deform-str-v').textContent=parseFloat(this.value).toFixed(1)};
  },0);
}

window.getSelectedPb = function() {
  if (!selectedObj) return null;
  return physBodies.find(b=>b.mesh===selectedObj)||null;
};

window._renameObj = function(name) {
  if (!selectedObj || !name.trim()) return;
  selectedObj.userData.name = name;
  // Update timeline track name too
  const id = selectedObj.userData.id;
  if (window.tlTracks && tlTracks[id]) tlTracks[id].name = name;
  updateHierarchy();
};

window.applyT = function() {
  if (!selectedObj) return;
  const o = selectedObj;
  o.position.set(parseFloat($('px')?.value)||0, parseFloat($('py')?.value)||0, parseFloat($('pz')?.value)||0);
  o.scale.set(parseFloat($('sx')?.value)||1, parseFloat($('sy')?.value)||1, parseFloat($('sz')?.value)||1);
  if (outlineMesh) { outlineMesh.position.copy(o.position); outlineMesh.scale.copy(o.scale).multiplyScalar(1.07); }
};

window.applyM = function() {
  if (!selectedObj && !multiSelected.size) return;
  const c=$('mc')?.value, r=$('mr')?.value, m=$('mm')?.value;
  const em=$('mem')?.value, emi=$('memi')?.value;
  const op=$('mop')?.value;
  const opf = op!=null ? parseFloat(op) : null;

  const applyToMat = mat => {
    if (!mat) return;
    if(c) mat.color?.set(c);
    if(r) mat.roughness=parseFloat(r);
    if(m) mat.metalness=parseFloat(m);
    if(em && mat.emissive) mat.emissive.set(em);
    if(emi) mat.emissiveIntensity=parseFloat(emi);
    if(opf!=null) {
      mat.opacity=opf;
      mat.transparent=opf<0.999;
      mat.depthWrite=opf>0.5;
      mat.needsUpdate=true;
    }
  };

  const applyToObj = obj => {
    applyToMat(obj.material);
    obj.traverse(ch=>{
      if(ch!==obj && ch.isMesh && ch.material) {
        if(Array.isArray(ch.material)) ch.material.forEach(applyToMat);
        else applyToMat(ch.material);
      }
    });
  };

  // Agar multi-select yoki group/pack tanlangan bo'lsa — hammasiga qo'lla
  const targets = multiSelected.size > 0
    ? [...multiSelected]
    : [selectedObj];

  targets.forEach(obj => {
    applyToObj(obj);
    // Agar group/pack (papka) bo'lsa — barcha child objectlarga ham
    if (obj.userData.isGroup || obj.userData._isFolder || obj.isGroup) {
      obj.traverse(ch => { if(ch !== obj && (ch.isMesh||ch.isGroup)) applyToObj(ch); });
    }
  });

  if(opf!=null) {
    const v=$('mop-v'); if(v) v.textContent=opf.toFixed(2);
  }
  // roughness/metalness label yangilash
  const mrv=$('mr-v'); if(mrv&&$('mr')) mrv.textContent=parseFloat($('mr').value).toFixed(2);
  const mmv=$('mm-v'); if(mmv&&$('mm')) mmv.textContent=parseFloat($('mm').value).toFixed(2);
};

// ── PBR Texture Map loader ──────────────────────────────────────
window._pbrLoadMap = function(slot) {
  const obj = selectedObj; if(!obj) return;
  let mat = obj.material;
  if(!mat) obj.traverse(ch=>{ if(!mat&&ch.isMesh&&ch.material) mat=Array.isArray(ch.material)?ch.material[0]:ch.material; });
  if(!mat) return;
  const inp = document.createElement('input');
  inp.type='file'; inp.accept='image/*';
  inp.onchange = e => {
    const f = e.target.files[0]; if(!f) return;
    const url = URL.createObjectURL(f);
    new THREE.TextureLoader().load(url, tex => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      // Mavjud map repeat/offset ni saqlab qo'yamiz
      if(mat.map) { tex.repeat.copy(mat.map.repeat); tex.offset.copy(mat.map.offset); tex.rotation=mat.map.rotation; }
      if(slot==='map')          { mat.map=tex; mat.needsUpdate=true; }
      else if(slot==='normalMap')    { mat.normalMap=tex; mat.normalScale=mat.normalScale||new THREE.Vector2(1,1); mat.needsUpdate=true; }
      else if(slot==='roughnessMap') { mat.roughnessMap=tex; mat.needsUpdate=true; }
      else if(slot==='metalnessMap') { mat.metalnessMap=tex; mat.needsUpdate=true; }
      else if(slot==='aoMap')        { mat.aoMap=tex; mat.aoMapIntensity=mat.aoMapIntensity??1; mat.needsUpdate=true;
        // aoMap uchun uv2 kerak
        if(obj.geometry&&!obj.geometry.attributes.uv2) obj.geometry.setAttribute('uv2', obj.geometry.attributes.uv);
      }
      else if(slot==='emissiveMap')  { mat.emissiveMap=tex; if(!mat.emissive||mat.emissive.r+mat.emissive.g+mat.emissive.b===0) mat.emissive=new THREE.Color(0xffffff); mat.emissiveIntensity=mat.emissiveIntensity||1; mat.needsUpdate=true; }
      log(`🗺 ${slot}: ${f.name} → ${obj.userData.name}`, 'lok');
      updateInspector();
    });
  };
  inp.click();
};

window._pbrRemoveMap = function(slot) {
  const obj = selectedObj; if(!obj) return;
  let mat = obj.material;
  if(!mat) obj.traverse(ch=>{ if(!mat&&ch.isMesh&&ch.material) mat=Array.isArray(ch.material)?ch.material[0]:ch.material; });
  if(!mat) return;
  if(mat[slot]) { mat[slot].dispose(); mat[slot]=null; mat.needsUpdate=true; }
  log(`🗑 ${slot} o'chirildi`, 'lok');
  updateInspector();
};

window._pbrSetUV = function(prop, val) {
  const obj = selectedObj; if(!obj) return;
  let mat = obj.material;
  if(!mat) obj.traverse(ch=>{ if(!mat&&ch.isMesh&&ch.material) mat=Array.isArray(ch.material)?ch.material[0]:ch.material; });
  if(!mat) return;
  const slots = ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap'];
  if(prop==='reset') {
    slots.forEach(s=>{ if(mat[s]) { mat[s].repeat.set(1,1); mat[s].offset.set(0,0); mat[s].rotation=0; mat[s].needsUpdate=true; } });
    updateInspector(); return;
  }
  slots.forEach(s=>{ if(!mat[s]) return;
    if(prop==='repeatX') mat[s].repeat.x=val;
    else if(prop==='repeatY') mat[s].repeat.y=val;
    else if(prop==='offsetX') mat[s].offset.x=val;
    else if(prop==='offsetY') mat[s].offset.y=val;
    else if(prop==='rotation') mat[s].rotation=val;
    mat[s].needsUpdate=true;
  });
};

window.applyTransparency = function(opacity) {
  if(!selectedObj) return;
  const el = $('mop'); if(el) el.value=opacity;
  const vl = $('mop-v'); if(vl) vl.textContent=opacity.toFixed(2);
  const applyToMat = mat=>{
    if(!mat) return;
    mat.opacity=opacity;
    mat.transparent=opacity<0.999;
    mat.depthWrite=opacity>0.5;
    mat.needsUpdate=true;
  };
  applyToMat(selectedObj.material);
  selectedObj.traverse(ch=>{
    if(ch!==selectedObj && ch.isMesh){
      if(Array.isArray(ch.material)) ch.material.forEach(applyToMat);
      else applyToMat(ch.material);
    }
  });
  log(`👁 Shaffoflik: ${opacity===0?'Ko\'rinmas':opacity===1?'Solid':(opacity*100|0)+'%'}`, 'lok');
};

window.applyTexPreset = function(i) {
  if (!selectedObj?.material) return;
  const t = TEXTURES[i];
  selectedObj.material.color.set(t.col);
  selectedObj.material.roughness = t.rough;
  selectedObj.material.metalness = t.metal;
  selectedObj.userData.texName = t.name;
  captureState('Tekstura preset');
  updateInspector();
  log(`🎨 Tekstura: ${t.name}`, 'lok');
};

// ── MODEL REPLACE — entity ning standart shakli o'rniga GLB qo'yish ──
window.replaceWithGLB = function() {
  if (!selectedObj) { log('⚠ Avval obyekt tanlang', 'lw'); return; }
  const target = selectedObj;

  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.glb,.gltf';
  inp.onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.(glb|gltf)$/i, '');

    // GLTFLoader
    if (!THREE.GLTFLoader) { log('❌ GLTFLoader yuklanmadi', 'le'); return; }
    const loader = getGLTFLoader();
    log('📦 Model yuklanmoqda: ' + name, 'lw');

    loader.load(url, gltf => {
      const modelScene = gltf.scene;

      // ── Auto scale ──
      const box = new THREE.Box3().setFromObject(modelScene);
      const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray());
      const entityType = target.userData.entityType;
      const targetSize = entityType==='car'?3.5:entityType==='animal'?1.2:(entityType==='npc'||entityType==='player')?1.8:2;
      if (maxDim > 0.01) modelScene.scale.setScalar(targetSize / maxDim);

      // ── Eski children olib tashla ──
      [...target.children].forEach(ch => target.remove(ch));
      if (target.material) { target.material.visible=false; target.material.needsUpdate=true; }

      // ── Shadow + raycast off ──
      modelScene.name = '__glb_model__';
      let hasBones = false;
      modelScene.traverse(ch => {
        if (ch.isMesh || ch.isSkinnedMesh) {
          ch.castShadow=true; ch.receiveShadow=true; ch.raycast=()=>{};
        }
        if (ch.isSkinnedMesh) hasBones = true;
      });
      target.add(modelScene);

      // ── Skeleton helper ──
      if (hasBones) {
        // Eski skeleton helper olib tashla
        const oldSkel = target.getObjectByName('__skel_helper__');
        if (oldSkel) target.remove(oldSkel);
        const skelHelper = new THREE.SkeletonHelper(modelScene);
        skelHelper.name = '__skel_helper__';
        skelHelper.visible = false;
        target.add(skelHelper);
        target.userData._skelHelper = skelHelper;
      }

      // ── AnimationMixer — BARCHA animatsiyalar ──
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(modelScene);
        const clips  = gltf.animations;
        const actions = clips.map(clip => {
          const a = mixer.clipAction(clip);
          a.loop = THREE.LoopRepeat;
          return a;
        });

        // Birinchi animatsiyani o'ynash
        actions[0].play();
        target.userData._mixer    = mixer;
        target.userData._clips    = clips;
        target.userData._actions  = actions;
        target.userData._activeAnim = 0;

        log(`🎬 ${clips.length} ta animatsiya: ${clips.map(c=>c.name).join(', ')}`, 'lok');

        // Agar bir nechta animatsiya bo'lsa — tanlash paneli
        if (clips.length > 1) showAnimSelectPanel(target);
      }

      target.userData._hasGLB  = true;
      target.userData._glbName = name;
      URL.revokeObjectURL(url);

      log(`✅ ${name} yuklandi${hasBones?'':''}`, 'lok');
      showModelOrientPanel(target);
      updateInspector();

    }, xhr => {
      if (xhr.total) log('⏳ ' + (xhr.loaded/1024|0) + 'KB / ' + (xhr.total/1024|0) + 'KB', 'lg');
    }, err => {
      log('❌ Yuklash xatosi: ' + (err.message||err), 'le');
      URL.revokeObjectURL(url);
    });
  };
  inp.click();
};


window.uploadTexture = function() {
  if (!selectedObj?.material) return;
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target.result; // data:image/...;base64,...
      const url = URL.createObjectURL(file);
      const tex = new THREE.TextureLoader().load(url, () => {
        selectedObj.material.map = tex;
        selectedObj.material.needsUpdate = true;
        // Texture ma'lumotini saqlash (ZIP export uchun)
        selectedObj.userData.textureBase64 = base64;
        selectedObj.userData.textureName = file.name;
        log(`🖼 Tekstura: ${file.name}`, 'lok');
      });
    };
    reader.readAsDataURL(file);
  };
  inp.click();
};

window.launchObj = function() {
  const pb = physBodies.find(b=>b.mesh===selectedObj);
  if (!pb) return;
  pb.vel.set((Math.random()-.5)*8, 6+Math.random()*4, (Math.random()-.5)*8);
  pb.angVel.set((Math.random()-.5)*3,(Math.random()-.5)*3,(Math.random()-.5)*3);
  // Jelly bounce trigger
  if (selectedObj.userData.physMode==='jelly') {
    const jd = jellyObjects.get(selectedObj);
    if (jd) jd.amp = 0.35;
  }
  playImpactSound(0.8);
  log(`🚀 ${selectedObj.userData.name} uloqtirildi!`, 'lok');
};

window.duplicateSel = function() {
  if (!selectedObj) return;
  const clone = selectedObj.clone();
  clone.position.x += 1.5;
  clone.userData = {...selectedObj.userData, id:++objIdC, name:getCloneName(selectedObj.userData.name)};
  scene.add(clone);
  objects.push(clone);
  addPhysicsBody(clone, {radius:0.5});
  selectObject(clone);
  updateHierarchy();
  updateStats();
  log(`Nusxalandi: ${clone.userData.name}`, 'lok');
};

window.deleteSel = function() {
  if (!selectedObj || selectedObj.userData.isStatic) { log('Statik obyekt o\'chirilmaydi', 'lw'); return; }
  const name = selectedObj.userData.name;
  const o = selectedObj;
  // Cleanup special physics
  if (jellyObjects.has(o)) jellyObjects.delete(o);
  if (liquidObjects.has(o)) { liquidObjects.get(o)?.drops?.forEach(d=>scene.remove(d.mesh)); liquidObjects.delete(o); }
  if (clothObjects.has(o)) clothObjects.delete(o);
  // Remove from scene (and its children follow)
  const parent = o.parent;
  if (parent) parent.remove(o); else scene.remove(o);
  const pi = physBodies.findIndex(b=>b.mesh===o);
  if (pi>-1) physBodies.splice(pi,1);
  objects.splice(objects.indexOf(o),1);
  if (outlineMesh) { scene.remove(outlineMesh); outlineMesh=null; }
  selectedObj=null;
  updateHierarchy(); updateInspector(); updateStats();
  captureState(`O'chirildi: ${name}`);
  log(`O'chirildi: ${name}`, 'lw');
};

// ── Animatsiya tanlash paneli (bir nechta anim bo'lsa) ──
