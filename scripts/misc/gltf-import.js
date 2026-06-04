// ============================================================
// GLTF / GLB IMPORT (using THREE.js r128 built-in loader)
// ============================================================
function loadGLTFData(arrayBuffer, filename) {
  if (!THREE.GLTFLoader) { log('❌ GLTFLoader tayyor emas — internetni tekshiring', 'le'); return; }
  const loader = getGLTFLoader();
  loader.parse(arrayBuffer, '', gltf => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray());
    if (maxDim > 0) model.scale.setScalar(3 / maxDim);
    const center = box.getCenter(new THREE.Vector3()).multiplyScalar(model.scale.x);
    model.position.sub(center); model.position.y = 0;

    // Shadows + SkinnedMesh detect
    let hasBones = false;
    model.traverse(c => {
      if(c.isMesh||c.isSkinnedMesh){ c.castShadow=true; c.receiveShadow=true; }
      if(c.isSkinnedMesh) hasBones = true;
    });

    const modelName = filename.replace(/\.(glb|gltf)$/i,'') || ('Model '+objIdC);
    model.userData = {id:++objIdC, name:modelName, type:'GLB', isGLB:true, _glbBuffer:arrayBuffer};

    // loadedModels ga qo'shish (agar yo'q bo'lsa) — saqlash uchun kerak
    if (!loadedModels.find(lm => lm.name === modelName)) {
      loadedModels.push({name:modelName, buffer:arrayBuffer, scene:gltf.scene, animations:gltf.animations||[], url:''});
    }
    scene.add(model); objects.push(model);

    // ─── Skeleton Helper ────────────────────────────────────────
    if (hasBones) {
      const skelH = new THREE.SkeletonHelper(model);
      skelH.visible = false;
      scene.add(skelH);
      model.userData._skelHelper = skelH;
    }

    addPhysicsBody(model, {isStatic:true});
    selectObject(model); updateHierarchy(); updateStats();
    captureState('GLTF import');
    log('📦 Model yuklandi: '+model.userData.name, 'lok');
    const dd=$('gltf-drop'); if(dd) dd.style.display='none';

    // Animatsiya
    if(gltf.animations&&gltf.animations.length>0){
      const mixer=new THREE.AnimationMixer(model);
      const actions=gltf.animations.map(clip=>{
        const a=mixer.clipAction(clip);
        a.loop=THREE.LoopRepeat;
        return a;
      });
      actions[0].play();
      model.userData._mixer=mixer;
      model.userData._clips=gltf.animations;
      model.userData._actions=actions;
      model.userData._activeAnim=0;
      log('🎬 '+gltf.animations.length+' ta animatsiya: '+gltf.animations.map(c=>c.name).join(', '),'lok');
      if(gltf.animations.length>1) showAnimSelectPanel(model);
    }
  }, err => log('❌ GLTF xato: '+(err.message||err), 'le'));
}

window.importGLTF = function() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.glb,.gltf';
  inp.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    log(`📦 Yuklanmoqda: ${file.name}...`, 'lw');
    const reader = new FileReader();
    reader.onload = ev => loadGLTFData(ev.target.result, file.name);
    reader.readAsArrayBuffer(file);
  };
  inp.click();
};

// Drag & drop GLTF onto viewport
const dropZone = $('gltf-drop');
cvp.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.style.display = 'flex';
});
cvp.addEventListener('dragleave', e => {
  if (!cvp.contains(e.relatedTarget)) dropZone.style.display = 'none';
});
cvp.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.style.display = 'none';
  const file = [...e.dataTransfer.files].find(f => /\.(glb|gltf)$/i.test(f.name));
  if (!file) { log('⚠ Faqat .glb/.gltf fayl tashlang', 'lw'); return; }
  log(`📦 Yuklanmoqda: ${file.name}...`, 'lw');
  const reader = new FileReader();
  reader.onload = ev => loadGLTFData(ev.target.result, file.name);
  reader.readAsArrayBuffer(file);
});

// ============================================================
// NESTED OBJECTS — child qo'shish
// ============================================================
window.addChildToSelected = function() {
  if (!selectedObj) { log('⚠ Avval obyekt tanlang', 'lw'); return; }
  if (selectedObj.userData.isStatic) { log('⚠ Statik obyektga child qo\'shib bo\'lmaydi', 'lw'); return; }
  // Open primitive picker
  const m = document.createElement('div');
  m.classList.add('ui-popup');
m.style.cssText='min-width:160px;display:grid;grid-template-columns:1fr 1fr;top:50%;left:50%;transform:translate(-50%,-50%)';
  const title = document.createElement('div');
  title.style.cssText='grid-column:1/-1;padding:5px 12px;font-size:10px;color:var(--muted);font-weight:700;letter-spacing:1px;border-bottom:1px solid var(--border);margin-bottom:4px';
  title.textContent='📦 '+selectedObj.userData.name+' ichiga:';
  m.appendChild(title);
  PRIMITIVES.forEach((p,i)=>{
    const b=document.createElement('button');
    b.textContent=p.name;
    b.classList.add('ui-menu-item');b.style.padding='7px 12px';
    b.onmouseover=()=>b.style.background='var(--hover)';
    b.onmouseout=()=>b.style.background='none';
    b.onclick=()=>{
      addObject(i, Math.floor(Math.random()*TEXTURES.length), selectedObj);
      document.body.removeChild(m);
    };
    m.appendChild(b);
  });
  document.body.appendChild(m);
  setTimeout(()=>document.addEventListener('click',function rm(ev){if(!m.contains(ev.target)){if(m.parentNode)m.parentNode.removeChild(m);document.removeEventListener('click',rm)}},100));
};
