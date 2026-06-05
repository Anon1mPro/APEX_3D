// ============================================================
// CAMERA OBJECTS — Sahnaga kamera qo'shish
// ============================================================
let camObjIdC = 0;

function addCameraObject() {
  const camGeo = new THREE.BoxGeometry(0.45, 0.32, 0.55);
  const camMat = new THREE.MeshStandardMaterial({
    color:0xcc88ff, roughness:0.3, metalness:0.6,
    emissive:new THREE.Color(0xcc88ff).multiplyScalar(0.08)
  });
  const mesh = new THREE.Mesh(camGeo, camMat);
  mesh.castShadow = true;

  // Kichik frustum — faqat vizual ko'rsatkich
  const frustumPts = [
    // old quad (kichik)
    -0.18,-0.12,-0.28,  0.18,-0.12,-0.28,
     0.18,-0.12,-0.28,  0.18, 0.12,-0.28,
     0.18, 0.12,-0.28, -0.18, 0.12,-0.28,
    -0.18, 0.12,-0.28, -0.18,-0.12,-0.28,
    // body dan old quad ga 4 chiziq
    -0.22,-0.16,-0.27, -0.18,-0.12,-0.28,
     0.22,-0.16,-0.27,  0.18,-0.12,-0.28,
     0.22, 0.16,-0.27,  0.18, 0.12,-0.28,
    -0.22, 0.16,-0.27, -0.18, 0.12,-0.28,
  ];
  const frustGeo = new THREE.BufferGeometry();
  frustGeo.setAttribute('position', new THREE.Float32BufferAttribute(frustumPts, 3));
  const frustLine = new THREE.LineSegments(frustGeo,
    new THREE.LineBasicMaterial({color:0xcc88ff, transparent:true, opacity:0.7}));
  frustLine.raycast = () => {};
  mesh.add(frustLine);

  mesh.userData = {
    id: 'cam_'+(++camObjIdC),
    name: 'Kamera '+camObjIdC,
    type: 'Kamera',
    isCamera: true,
    fov: 60, near: 0.1, far: 100,
    _isActive: false,
  };

  // Spawn at current camera position/rotation
  mesh.position.copy(camera.position);
  mesh.rotation.copy(camera.rotation);

  scene.add(mesh);
  objects.push(mesh);

  // Physics body — lightweight, no gravity
  addPhysicsBody(mesh, {isStatic:true, radius:0.4});

  updateHierarchy();
  selectObject(mesh);
  updateStats();
  log('🎥 '+mesh.userData.name+' qo\'shildi — siljitish uchun W/E/R gizmo', 'lok');
  return mesh;
}

function buildCamObjInspector(o) {
  const ic=$('inspector-content'); if(!ic) return;
  const p=o.position, isActive=o.userData._isActive;
  ic.innerHTML=`
    <div class="comp-block">
      <div class="comp-title">
        <span class="tag" style="background:rgba(204,136,255,.12);color:var(--accent4)">CAM</span>
        ${o.userData.name}
        ${isActive?'<span style="font-size:8px;background:rgba(204,136,255,.3);color:var(--accent4);padding:1px 5px;border-radius:2px;margin-left:3px">● AKTIV</span>':''}
      </div>
      <div class="fr"><span class="fl">FOV</span>
        <input type="range" min="10" max="120" value="${o.userData.fov||60}" style="flex:1" oninput="if(selectedObj)selectedObj.userData.fov=+this.value;this.nextSibling.textContent=this.value+'°'">
        <span class="cam-val">${o.userData.fov||60}°</span>
      </div>
      <div class="fr"><span class="fl">Near</span><input class="fv" value="${o.userData.near||0.1}" style="width:44px" oninput="if(selectedObj)selectedObj.userData.near=+this.value"></div>
      <div class="fr"><span class="fl">Far</span><input class="fv" value="${o.userData.far||100}" style="width:44px" oninput="if(selectedObj)selectedObj.userData.far=+this.value"></div>
    </div>
    <div class="comp-block">
      <div class="comp-title"><span class="tag">TRS</span>Pozitsiya</div>
      <div class="xyzr">
        <div><input class="xi" id="px" value="${p.x.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#ff5555">X</div></div>
        <div><input class="xi" id="py" value="${p.y.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#55ff55">Y</div></div>
        <div><input class="xi" id="pz" value="${p.z.toFixed(2)}" oninput="applyT()"><div class="xl" style="color:#5588ff">Z</div></div>
      </div>
    </div>
    <div class="comp-block">
      <div class="comp-title"><span class="tag" style="background:rgba(204,136,255,.12);color:var(--accent4)">ACT</span>Amallar</div>
      <button class="action-btn" style="background:${isActive?'rgba(204,136,255,.25)':'rgba(204,136,255,.08)'};border-color:rgba(204,136,255,.4);color:var(--accent4)" onclick="camObjActivate()">
        ${isActive?'⏹ Kamerani o\'chir':'🎥 Faollash (mesh = kamera)'}
      </button>
      <button class="action-btn" style="margin-top:3px" onclick="camObjCapture()">📍 Hozirgi pozitsiyani olish</button>
      <button class="action-btn" style="background:rgba(0,229,255,.06);border-color:rgba(0,229,255,.2);margin-top:3px" onclick="camObjAddKF()">◆ Timeline KF qo\'sh</button>
      <button class="action-btn" style="margin-top:3px" onclick="camObjScreenshot()">📸 Screenshot</button>
      <button class="action-btn del-btn" style="margin-top:3px" onclick="deleteSel()">✕ O\'chirish</button>
    </div>`;
}

window.camObjFov = function(v) {
  if(selectedObj) selectedObj.userData.fov=+v;
};
window.camObjActivate = function() {
  if(!selectedObj||!selectedObj.userData.isCamera) return;
  const wasActive = selectedObj.userData._isActive;
  // Deactivate all cameras first
  objects.forEach(o=>{ if(o.userData.isCamera){ o.userData._isActive=false; if(o.material) o.material.emissive.setScalar(0.05); } });

  if (!wasActive) {
    // Activate this one
    selectedObj.userData._isActive = true;
    if(selectedObj.material) selectedObj.material.emissive.set(0xcc88ff).multiplyScalar(0.3);
    // Mesh yashiriladi — kamera o'z tanasini ko'rmasin
    selectedObj.visible = false;
    // Snap real camera to this mesh right now
    camera.position.copy(selectedObj.position);
    camera.rotation.set(selectedObj.rotation.x, selectedObj.rotation.y, selectedObj.rotation.z);
    camera.fov = selectedObj.userData.fov || 60;
    camera.near = selectedObj.userData.near || 0.1;
    camera.far = selectedObj.userData.far || 100;
    camera.updateProjectionMatrix();
    camMode = 'fixed';
    log('🎥 '+selectedObj.userData.name+' AKTIV — mesh harakat qilsa kamera ham harakat qiladi','lok');
  } else {
    // Deactivate — mesh qayta ko'rinadi
    selectedObj.visible = true;
    if(selectedObj.material) selectedObj.material.emissive.setScalar(0.05);
    camMode = 'orbit';
    setCamMode('orbit');
    log('🎥 '+selectedObj.userData.name+' o\'chirildi — orbit rejimiga qaytildi','lw');
  }
  updateInspector();
};
window.camObjCapture = function() {
  if(!selectedObj||!selectedObj.userData.isCamera) return;
  selectedObj.position.copy(camera.position);
  selectedObj.rotation.copy(camera.rotation);
  selectedObj.userData.fov=camera.fov;
  selectedObj.userData.near=camera.near;
  selectedObj.userData.far=camera.far;
  updateInspector();
  log('📍 Pozitsiya olindi','lok');
};
window.camObjAddKF = function() {
  if(!selectedObj) return;
  tlAddKeyframe();
};
window.camObjScreenshot = function() {
  if(!selectedObj||!selectedObj.userData.isCamera) return;
  const savedPos=camera.position.clone(), savedFov=camera.fov;
  const savedRot={x:camera.rotation.x,y:camera.rotation.y,z:camera.rotation.z};
  camObjActivate();
  renderer.render(scene,camera);
  const url=renderer.domElement.toDataURL('image/png');
  const a=document.createElement('a');
  a.href=url; a.download='cam_'+camObjIdC+'.png'; a.click();
  camera.position.copy(savedPos);
  camera.rotation.set(savedRot.x,savedRot.y,savedRot.z);
  camera.fov=savedFov; camera.updateProjectionMatrix();
  log('📸 Screenshot ('+selectedObj.userData.name+')','lok');
};

// Patch updateInspector for camera objects

// Camera active track: apply position to real camera during timeline playback


function showKfPopup(mx,my,kf,isVis) {
  const pop=$('tl-kf-popup');
  if (!pop) return;
  const easeEl=$('kfp-ease'), tangentEl=$('kfp-tangent'), visEl=$('kfp-vis'), visRow=$('kfp-vis-row');
  if (isVis) {
    if (easeEl) easeEl.closest('.kfp-row').style.display='none';
    if (tangentEl) tangentEl.closest('.kfp-row').style.display='none';
    if (visRow) visRow.style.display='flex';
    if (visEl) visEl.value=String(kf.vis||0);
  } else {
    if (easeEl) { easeEl.closest('.kfp-row').style.display='flex'; easeEl.value=kf.ease||'smooth'; }
    if (tangentEl) { tangentEl.closest('.kfp-row').style.display='flex'; tangentEl.value=kf.tangent||'auto'; }
    if (visRow) visRow.style.display='none';
  }
  // Position popup near click
  const px=Math.min(mx, window.innerWidth-160);
  const py=Math.max(my-120, 60);
  pop.style.left=px+'px'; pop.style.top=py+'px'; pop.style.display='block';
}
document.addEventListener('click', e=>{
  const pop=$('tl-kf-popup');
  if (pop && !pop.contains(e.target) && !e.target.classList.contains('tl-kf') && !e.target.classList.contains('tl-kf-vis')) {
    pop.style.display='none';
  }
});

// ── EASING CURVE SVG POINTS ───────────────────────────────────
function tlEaseCurvePoints(ease, w) {
  const fn=EASINGS[ease]||EASINGS.smooth;
  const pts=[];
  const steps=16;
  for (let i=0;i<=steps;i++) {
    const t=i/steps;
    const y=fn(t);
    pts.push(`${(t*w).toFixed(1)},${(14-y*12).toFixed(1)}`);
  }
  return pts.join(' ');
}

function tlUpdate(delta) {
  if (typeof tlPlaying === 'undefined' || !tlPlaying) return;
  tlCurrent += delta;
  if (tlCurrent >= tlDuration) {
    // Agar hech bo'lmasa bitta track loop yoqilgan bo'lsa — cheksiz davom et
    const anyLoop = Object.values(tlTracks).some(tr => tr.loop);
    if (anyLoop) {
      // Loop yoqilgan track'lar tlApplyAll ichida o'z vaqtini loop qiladi
      // tlCurrent esa davom etaveradi (tlDuration dan oshib ketsa ham ishlaydi)
    } else {
      tlCurrent = tlDuration;
      tlPlaying = false;
      $('tl-play-btn').textContent = '▶';
      $('tl-play-btn').onclick = tlPlay;
    }
  }
  tlApplyAll(tlCurrent);
  const ph=$('tl-playhead');
  const lane=$('tl-scrubber-row');
  if (ph&&lane&&lane.clientWidth) ph.style.left=(Math.min(tlCurrent,tlDuration)/tlDuration*lane.clientWidth)+'px';
  const lbl=$('tl-time-lbl'); if(lbl) lbl.textContent=Math.min(tlCurrent,tlDuration).toFixed(2)+'s';
}
