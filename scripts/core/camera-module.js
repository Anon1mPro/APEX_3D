// ============================================================
// CAMERA MODULE — v3
// ============================================================

// ── MODE SWITCH ───────────────────────────────────────────────
window.camSetMode = function(mode) {
  camCurrentMode = mode;
  // Update buttons
  ['orbit','fps','third','fixed','cinematic'].forEach(m => {
    const b = $('cammod-'+m);
    if(b) b.classList.toggle('active', m===mode);
  });
  // Show/hide settings panels
  const s = ['third','fixed','cine'];
  s.forEach(k => { const el=$('cam-'+k+'-settings'); if(el) el.style.display='none'; });
  if (mode==='third')     { $('cam-third-settings').style.display='block'; camRefreshFixedTargets(); }
  if (mode==='fixed')     { $('cam-fixed-settings').style.display='block'; camRefreshFixedTargets(); }
  if (mode==='cinematic') { $('cam-cine-settings').style.display='block'; }

  const lbl = $('cam-info-lbl');
  if(lbl) lbl.textContent = mode.toUpperCase();

  // Also sync setCamMode for orbit/fps
  if (mode==='orbit') setCamMode('orbit');
  else if (mode==='fps') { setCamMode('fps'); canvas.requestPointerLock?.(); }

  log('🎥 Kamera: ' + mode, 'lok');
};

// ── FOV & CLIP ────────────────────────────────────────────────
window.camSetFov = function(v) {
  camera.fov = +v;
  camera.updateProjectionMatrix();
  const el=$('cam-fov-val'); if(el) el.textContent = v+'°';
};
window.camSetClip = function() {
  const n = parseFloat($('cam-near')?.value)||0.1;
  const f = parseFloat($('cam-far')?.value)||1000;
  camera.near=n; camera.far=f; camera.updateProjectionMatrix();
};

// ── FIXED CAM ─────────────────────────────────────────────────
window.camFixedUpdate = function() {
  if (camCurrentMode!=='fixed') return;
  const x=parseFloat($('fcx')?.value)||0;
  const y=parseFloat($('fcy')?.value)||5;
  const z=parseFloat($('fcz')?.value)||8;
  camera.position.set(x,y,z);
  const target = camFixedTarget ? objects.find(o=>o.userData.id==camFixedTarget) : null;
  camera.lookAt(target ? target.position : new THREE.Vector3(0,0,0));
};
window.camFixedSetHere = function() {
  const p = camera.position;
  const fx=$('fcx'),fy=$('fcy'),fz=$('fcz');
  if(fx) fx.value=p.x.toFixed(2);
  if(fy) fy.value=p.y.toFixed(2);
  if(fz) fz.value=p.z.toFixed(2);
  log('📌 Fixed cam pozitsiya saqlandi', 'lok');
};
function camRefreshFixedTargets() {
  ['cam-fixed-target','cam-cine-lookat'].forEach(id => {
    const sel=$(id); if(!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">'+( id==='cam-fixed-target'?'Markaz':'Yo\'nalish')+'</option>';
    if (id==='cam-cine-lookat') sel.innerHTML += '<option value="origin">Markaz (0,0,0)</option>';
    objects.forEach(o => {
      if(o.userData.isStatic) return;
      const opt=document.createElement('option');
      opt.value=o.userData.id; opt.textContent='#'+o.userData.id+' '+o.userData.name;
      if(o.userData.id==cur) opt.selected=true;
      sel.appendChild(opt);
    });
  });
}

// ── CINEMATIC PATH ────────────────────────────────────────────
window.camAddKeyframe = function() {
  const kf = {
    t: camPathPlaying ? camPathTime : camPathKFs.length * (camPathDuration / Math.max(1, camPathKFs.length+1)),
    pos: camera.position.clone(),
    rot: { x:camera.rotation.x, y:camera.rotation.y, z:camera.rotation.z },
  };
  // Replace if same time
  const ei = camPathKFs.findIndex(k=>Math.abs(k.t-kf.t)<0.1);
  if(ei>=0) camPathKFs[ei]=kf; else { camPathKFs.push(kf); camPathKFs.sort((a,b)=>a.t-b.t); }
  camRenderPathTrack();
  // Also add to timeline as camera track
  log('🎥◆ Kamera KF @ '+kf.t.toFixed(2)+'s (pos '+kf.pos.x.toFixed(1)+','+kf.pos.y.toFixed(1)+','+kf.pos.z.toFixed(1)+')', 'lok');
};

window.camClearKeyframes = function() {
  camPathKFs = []; camPathTime=0; camPathPlaying=false;
  const pb=$('cam-path-play-btn'); if(pb) pb.textContent='▶ Path';
  camRenderPathTrack();
  log('🎥 Kamera yo\'li tozalandi', 'lw');
};

window.camPlayPath = function() {
  if (camPathKFs.length < 2) { log('⚠ Kamida 2 ta KF kerak', 'lw'); return; }
  camPathPlaying = !camPathPlaying;
  if (camPathPlaying) { camPathTime=0; camCurrentMode='cinematic'; }
  const pb=$('cam-path-play-btn'); if(pb) pb.textContent = camPathPlaying ? '⏸ Path' : '▶ Path';
  log('🎬 Cinematic path ' + (camPathPlaying?'boshlandi':'to\'xtatildi'), 'lok');
};

window.camPathTrackClick = function(e) {
  const track=$('cam-path-track'); if(!track) return;
  const rect=track.getBoundingClientRect();
  camPathTime = ((e.clientX-rect.left)/rect.width) * camPathDuration;
  camApplyPath(camPathTime);
  camRenderPathTrack();
};

function camRenderPathTrack() {
  const track=$('cam-path-track'); if(!track) return;
  // Remove old KF dots
  track.querySelectorAll('.cam-kf').forEach(e=>e.remove());
  const W=track.clientWidth||300;
  camPathKFs.forEach((kf,ki) => {
    const dot=document.createElement('div');
    dot.className='cam-kf';
    dot.style.left=(kf.t/camPathDuration*100)+'%';
    dot.title='KF '+ki+' @ '+kf.t.toFixed(2)+'s';
    dot.onclick=e=>{e.stopPropagation();camPathTime=kf.t;camApplyPath(kf.t);camRenderPathTrack();};
    dot.onmousedown=e=>{
      e.stopPropagation();
      const startX=e.clientX, startT=kf.t;
      const mv=ev=>{const r=track.getBoundingClientRect();kf.t=Math.max(0,Math.min(camPathDuration,startT+(ev.clientX-startX)/r.width*camPathDuration));camPathKFs.sort((a,b)=>a.t-b.t);camRenderPathTrack();};
      const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up)};
      document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);
    };
    track.appendChild(dot);
  });
  const ph=$('cam-path-playhead');
  if(ph) ph.style.left=(camPathTime/camPathDuration*100)+'%';
}

function camApplyPath(t) {
  if(camPathKFs.length===0) return;
  if(camPathKFs.length===1) {
    camera.position.copy(camPathKFs[0].pos);
    camera.rotation.set(camPathKFs[0].rot.x,camPathKFs[0].rot.y,camPathKFs[0].rot.z);
    return;
  }
  let a=camPathKFs[0], b=camPathKFs[camPathKFs.length-1];
  for(let i=0;i<camPathKFs.length-1;i++){if(t>=camPathKFs[i].t&&t<=camPathKFs[i+1].t){a=camPathKFs[i];b=camPathKFs[i+1];break;}}
  const alpha=b.t===a.t?1:Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t)));
  const ease=alpha*alpha*(3-2*alpha);
  camera.position.lerpVectors(a.pos,b.pos,ease);
  camera.rotation.order='YXZ';

  // LookAt override
  const lookat=$('cam-cine-lookat')?.value;
  if(lookat==='origin') { camera.lookAt(0,0,0); }
  else if(lookat&&lookat!=='') {
    const tgt=objects.find(o=>o.userData.id==lookat);
    if(tgt) camera.lookAt(tgt.position);
  } else {
    const lerp=(x,y,f)=>x+(y-x)*f;
    camera.rotation.x=lerp(a.rot.x,b.rot.x,ease);
    camera.rotation.y=lerp(a.rot.y,b.rot.y,ease);
    camera.rotation.z=lerp(a.rot.z,b.rot.z,ease);
  }
}

// ── SAVE / LOAD POSITION ─────────────────────────────────────
window.camSavePos = function() {
  const pos = camera.position.clone();
  const rot = {x:camera.rotation.x,y:camera.rotation.y,z:camera.rotation.z};
  const entry = {pos,rot,name:'Pozitsiya '+(camSavedPositions.length+1)};
  camSavedPositions.push(entry);
  camRenderSavedList();
  log('💾 Kamera pozitsiyasi saqlandi #'+camSavedPositions.length, 'lok');
};
window.camLoadPos = function(idx) {
  const i = idx !== undefined ? idx : camSavedPositions.length-1;
  const e=camSavedPositions[i]; if(!e) return;
  camera.position.copy(e.pos);
  camera.rotation.set(e.rot.x,e.rot.y,e.rot.z);
  log('↩ Kamera yüklendi: '+e.name, 'lok');
};
function camRenderSavedList() {
  const el=$('cam-saved-list'); if(!el) return;
  if(!camSavedPositions.length){el.textContent='—';return;}
  el.innerHTML='';
  camSavedPositions.forEach((e,i)=>{
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:4px;margin:2px 0';
    row.innerHTML=`<span style="flex:1;cursor:pointer;color:var(--accent)" onclick="camLoadPos(${i})">${e.name}</span><span style="cursor:pointer;color:var(--red);font-size:10px" onclick="camSavedPositions.splice(${i},1);camRenderSavedList()">✕</span>`;
    el.appendChild(row);
  });
}

// ── 3RD PERSON UPDATE ─────────────────────────────────────────
function camUpdateThird(delta) {
  if(!playerMesh) return;
  const target = playerMesh.position.clone().add(new THREE.Vector3(0,camThirdHeight,0));
  const offset = new THREE.Vector3(
    -Math.sin(fpsYaw)*camThirdDist,
    camThirdHeight,
    -Math.cos(fpsYaw)*camThirdDist
  );
  const desired = playerMesh.position.clone().add(offset);
  const lf = Math.min(1, delta * camThirdSmooth);
  camThirdPos.lerp(desired, lf);
  camera.position.copy(camThirdPos);
  camera.lookAt(target);
}

// ── SHAKE ─────────────────────────────────────────────────────
window.camShakeBurst = function() { camShakeDecay=1.0; log('💥 Camera shake!','lw'); };
function camApplyShake() {
  if(camShakeAmt<=0 && camShakeDecay<=0) return;
  const amt = Math.max(camShakeAmt, camShakeDecay) * 0.08;
  camera.position.x += (Math.random()-.5)*amt;
  camera.position.y += (Math.random()-.5)*amt;
  camera.position.z += (Math.random()-.5)*amt;
  if(camShakeDecay>0) camShakeDecay=Math.max(0,camShakeDecay-0.04);
}

// ── SCREENSHOT ────────────────────────────────────────────────
window.camScreenshot = function() {
  renderer.render(scene,camera);
  const fmt = $('ss-format')?.value||'png';
  const wTarget = parseInt($('ss-width')?.value)||1280;
  const ratio = wTarget / renderer.domElement.width;
  // Render at higher res
  const origW=renderer.domElement.width, origH=renderer.domElement.height;
  renderer.setSize(wTarget, Math.round(origH*ratio));
  camera.aspect=wTarget/(origH*ratio); camera.updateProjectionMatrix();
  renderer.render(scene,camera);
  const url=renderer.domElement.toDataURL('image/'+fmt, fmt==='jpeg'?0.95:undefined);
  // Restore
  renderer.setSize(origW,origH); camera.aspect=origW/origH; camera.updateProjectionMatrix();
  const a=document.createElement('a');
  a.href=url; a.download='apex3d_shot_'+Date.now()+'.'+fmt; a.click();
  // Flash
  const fl=$('ss-flash');
  if(fl){fl.style.opacity=0.7;fl.style.transition='opacity .4s';setTimeout(()=>fl.style.opacity=0,50);}
  log('📸 Screenshot: '+wTarget+'px ('+fmt.toUpperCase()+')', 'lok');
};

window.camAddToTimeline = function() {
  log('🎥 Timeline kamera animatsiyasi: KF qo\'shing (◆ KF), keyin ▶ Path bilan ijro eting','lw');
};

// ── LIVE INFO UPDATE ─────────────────────────────────────────
function camUpdateLiveInfo() {
  const el=$('cam-live-info'); if(!el) return;
  const p=camera.position, r=camera.rotation;
  el.innerHTML=`X: <b style="color:var(--accent)">${p.x.toFixed(2)}</b><br>Y: <b style="color:var(--accent)">${p.y.toFixed(2)}</b><br>Z: <b style="color:var(--accent)">${p.z.toFixed(2)}</b><br>RX: <b style="color:var(--accent2)">${(r.x*180/Math.PI).toFixed(1)}°</b><br>RY: <b style="color:var(--accent2)">${(r.y*180/Math.PI).toFixed(1)}°</b><br>FOV: <b style="color:var(--accent4)">${camera.fov}°</b>`;
}

// ── MAIN UPDATE (called from animate loop) ────────────────────
function camModuleUpdate(delta) {
  // Cinematic path playback
  if(camPathPlaying && camPathKFs.length>=2) {
    camPathTime += delta * camCineSpeed;
    const loop=$('cam-cine-loop')?.checked;
    if(camPathTime>=camPathDuration) {
      if(loop) camPathTime=0;
      else { camPathTime=camPathDuration; camPathPlaying=false; $('cam-path-play-btn').textContent='▶ Path'; }
    }
    camApplyPath(camPathTime);
    const ph=$('cam-path-playhead');
    if(ph) ph.style.left=(camPathTime/camPathDuration*100)+'%';
  }

  // 3rd person
  if(camCurrentMode==='third' && isPlaying) camUpdateThird(delta);

  // Fixed cam (track target if set)
  if(camCurrentMode==='fixed') {
    const tgt = camFixedTarget ? objects.find(o=>o.userData.id==camFixedTarget) : null;
    if(tgt) camera.lookAt(tgt.position);
  }

  // Shake
  camApplyShake();

  // Live info (every 0.1s)
  camLiveTimer=(camLiveTimer||0)+delta;
  if(camLiveTimer>0.1) { camLiveTimer=0; camUpdateLiveInfo(); }
}

// ── switchBottomTab integration ───────────────────────────────

// ============================================================


// ═══════════════════════════════════════════════════════════════════
//  APEX3D — 6 TA ASOSIY SISTEMA
//  1. Scene System  2. PBR/HDR  3. Asset Importer
//  4. Editor Tools  5. Physics Constraints  6. Visual Scripting
// ═══════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────