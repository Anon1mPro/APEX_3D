// ============================================================
// SAVE / LOAD SCENE
// ============================================================
window.saveScene = async function() {
  if (typeof JSZip === 'undefined') {
    log('❌ JSZip yuklanmagan, oddiy JSON saqlash...', 'lw');
    // Fallback: oddiy JSON
    const fallback = { version:4, objects: objects.map(o=>({
      name:o.userData.name, type:o.userData.type,
      position:{x:o.position.x,y:o.position.y,z:o.position.z},
      rotation:{x:o.rotation.x,y:o.rotation.y,z:o.rotation.z},
      scale:{x:o.scale.x,y:o.scale.y,z:o.scale.z},
      color:o.material?'#'+o.material.color.getHexString():null,
      roughness:o.material?.roughness, metalness:o.material?.metalness,
      script:o.userData.script||null,
    }))};
    const b=new Blob([JSON.stringify(fallback,null,2)],{type:'application/json'});
    const u=URL.createObjectURL(b);
    const a=document.createElement('a'); a.href=u; a.download='apex-file.json'; a.click();
    URL.revokeObjectURL(u);
    return;
  }

  log('📦 ZIP tayyorlanmoqda...', 'lw');
  const zip = new JSZip();

  // ── 1. MODEL fayllarni models/ papkaga qo'shish ─────────────
  // Ikki manbadan olamiz:
  //   a) loadedModels (Assets panel orqali import qilinganlar)
  //   b) objects ichidagi isGLB modellari (to'g'ridan-to'g'ri import/drag-drop)
  const modelFileMap = {}; // name -> 'models/xxx.glb'
  const addedModels  = new Set();

  // a) Asset library dan
  for (const m of loadedModels) {
    if (!m.buffer || addedModels.has(m.name)) continue;
    const safeName = m.name.replace(/[^a-zA-Z0-9_\-]/g,'_') + '.glb';
    zip.folder('models').file(safeName, m.buffer);
    modelFileMap[m.name] = 'models/' + safeName;
    addedModels.add(m.name);
  }

  // b) To'g'ridan-to'g'ri import (drag-drop / importGLTF) — _glbBuffer saqlanadi
  for (const o of objects) {
    if ((!o.userData.isGLB && !o.userData.isGLTF) || addedModels.has(o.userData.name)) continue;
    const buf = o.userData._glbBuffer;
    if (!buf) continue;
    const safeName = o.userData.name.replace(/[^a-zA-Z0-9_\-]/g,'_') + '.glb';
    zip.folder('models').file(safeName, buf);
    modelFileMap[o.userData.name] = 'models/' + safeName;
    addedModels.add(o.userData.name);
  }

  // ── 2. Sahnaning har bir obyekti uchun texture faylini textures/ papkaga ──
  const textureFileMap = {}; // objId -> 'textures/xxx'

  for (const o of objects) {
    // Mesh yoki ichidagi Mesh larni tekshiramiz (GLB wrapper uchun)
    const candidates = [o];
    o.traverse(ch => { if (ch !== o && ch.userData?.textureBase64) candidates.push(ch); });

    const b64   = o.userData.textureBase64;
    const tname = o.userData.textureName;
    if (!b64 || !tname) continue;
    const safeTex = 'tex_' + o.userData.id + '_' + tname.replace(/[^a-zA-Z0-9_\-\.]/g,'_');
    const commaIdx = b64.indexOf(',');
    const base64Data = commaIdx >= 0 ? b64.substring(commaIdx+1) : b64;
    zip.folder('textures').file(safeTex, base64Data, {base64: true});
    textureFileMap[o.userData.id] = 'textures/' + safeTex;
  }

  // ── 3. Timeline (tlTracks) ma'lumotlarini yig'ish ────────────
  const timelineData = {
    duration: typeof tlDuration !== 'undefined' ? tlDuration : 5,
    tracks: Object.entries(typeof tlTracks !== 'undefined' ? tlTracks : {}).map(([id, tr]) => ({
      objId:       parseInt(id),
      objName:     tr.name,
      keyframes:   tr.keyframes    || [],
      visKeyframes:tr.visKeyframes || [],
    }))
  };

  // ── 4. apex-file.json yaratish ───────────────────────────────
  const sceneData = {
    version: 5,
    exportDate: new Date().toISOString(),
    objects: objects.map(o => ({
      name:        o.userData.name,
      type:        o.userData.type,
      isStatic:    o.userData.isStatic   || false,
      isEntity:    o.userData.isEntity   || false,
      entityType:  o.userData.entityType || null,
      isCamera:    o.userData.isCamera   || false,
      isGLB:       (o.userData.isGLB || o.userData.isGLTF) || false,
      glbFile:     (o.userData.isGLB || o.userData.isGLTF)
                     ? (modelFileMap[o.userData.name] || null)
                     : null,
      isPlayerObj: o.userData.isPlayerObj || false,
      position:    {x:o.position.x, y:o.position.y, z:o.position.z},
      rotation:    {x:o.rotation.x, y:o.rotation.y, z:o.rotation.z},
      scale:       {x:o.scale.x,    y:o.scale.y,    z:o.scale.z},
      color:       o.material ? '#'+o.material.color.getHexString() : null,
      roughness:   o.material?.roughness,
      metalness:   o.material?.metalness,
      textureFile: textureFileMap[o.userData.id] || null,
      script:      o.userData.script || null,
    })),
    models:   Object.entries(modelFileMap).map(([name,file])=>({name,file})),
    timeline: timelineData,
  };

  zip.file('apex-file.json', JSON.stringify(sceneData, null, 2));

  // ── 5. ZIP ni yuklab olish ───────────────────────────────────
  try {
    const blob = await zip.generateAsync({type:'blob', compression:'DEFLATE', compressionOptions:{level:6}});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'apex-file.zip'; a.click();
    URL.revokeObjectURL(url);
    const modelCount = Object.keys(modelFileMap).length;
    const texCount   = Object.keys(textureFileMap).length;
    const tlCount    = timelineData.tracks.length;
    log(`💾 Saqlandi → apex-file.zip: apex-file.json + ${modelCount} model + ${texCount} texture + ${tlCount} timeline track`, 'lok');
  } catch(err) {
    log('❌ ZIP xatosi: ' + err.message, 'le');
  }
};

window.loadScene = function(jsonData) {
  const doLoad = async (data, zipObj) => {
    try {
      [...objects].forEach(o=>{ if(!o.userData.isStatic){scene.remove(o);objects.splice(objects.indexOf(o),1);} });
      const physToRemove=[...physBodies.filter(b=>!b.isStatic)];
      physToRemove.forEach(b=>{const i=physBodies.indexOf(b);if(i>-1)physBodies.splice(i,1);});

      // ZIP ichidagi modellarni oldindan yuklab olamiz
      const zipModels = {}; // filename -> ArrayBuffer
      if (zipObj && data.models) {
        for (const m of data.models) {
          try {
            const buf = await zipObj.file(m.file)?.async('arraybuffer');
            if (buf) zipModels[m.file] = {buffer: buf, name: m.name};
          } catch(e) { log('⚠ Model o\'qilmadi: '+m.file,'lw'); }
        }
        // loadedModels ga qo'shish (agar yo'q bo'lsa)
        for (const [file, md] of Object.entries(zipModels)) {
          if (!loadedModels.find(lm=>lm.name===md.name)) {
            const loader = getGLTFLoader();
            await new Promise(res=>{
              loader.parse(md.buffer,'',gltf=>{
                loadedModels.push({name:md.name,buffer:md.buffer,scene:gltf.scene,animations:gltf.animations||[],url:''});
                res();
              },()=>res());
            });
          }
        }
        renderModelLibrary();
      }

      for (const od of data.objects) {
        if (od.isStatic) continue;

        // GLB modellar
        if (od.isGLB && od.glbFile && zipObj) {
          const glbBuf = zipModels[od.glbFile]?.buffer;
          if (glbBuf && THREE.GLTFLoader) {
            const loader = getGLTFLoader();
            await new Promise(res=>{
              loader.parse(glbBuf,'',gltf=>{
                const clone = gltf.scene;
                const wrapper=new THREE.Group();
                wrapper.add(clone);
                const box2=new THREE.Box3().setFromObject(clone);
                const sz=box2.getSize(new THREE.Vector3());
                const bboxMesh=new THREE.Mesh(new THREE.BoxGeometry(sz.x,sz.y,sz.z),new THREE.MeshBasicMaterial({visible:false,transparent:true,opacity:0}));
                bboxMesh.position.copy(box2.getCenter(new THREE.Vector3()));
                wrapper.add(bboxMesh);
                const newId=++objIdC;
                wrapper.userData={id:newId,name:od.name,type:'GLB',isGLB:true,isPlayerObj:od.isPlayerObj||false};
                wrapper.position.set(od.position.x,od.position.y,od.position.z);
                wrapper.rotation.set(od.rotation.x,od.rotation.y,od.rotation.z);
                // Saqlangan scale ni ishlatish (auto-normalize YO'Q)
                if (od.scale) wrapper.scale.set(od.scale.x,od.scale.y,od.scale.z);
                else {
                  // Faqat eski fayllar uchun normalize
                  const maxDim=Math.max(sz.x,sz.y,sz.z);
                  if(maxDim>5) wrapper.scale.setScalar(5/maxDim);
                  else if(maxDim<0.3) wrapper.scale.setScalar(0.5/maxDim);
                }
                wrapper.traverse(ch=>{if(ch.isMesh||ch.isSkinnedMesh){ch.castShadow=true;ch.receiveShadow=true;}});
                scene.add(wrapper); objects.push(wrapper);
                res();
              },()=>res());
            });
            continue;
          }
        }

        let primIdx = PRIMITIVES.findIndex(p=>p.name===od.type);
        if (primIdx<0) { log(`⚠ Noma'lum tur (${od.type}), Kub bilan almashtirildi: ${od.name}`,'lw'); primIdx=0; }
        const geo = PRIMITIVES[primIdx].geo();
        const mat = new THREE.MeshStandardMaterial({color:od.color||0x888888,roughness:od.roughness??0.5,metalness:od.metalness??0});
        const mesh = new THREE.Mesh(geo,mat);
        mesh.castShadow=true; mesh.receiveShadow=true;
        mesh.position.set(od.position.x,od.position.y,od.position.z);
        mesh.rotation.set(od.rotation.x,od.rotation.y,od.rotation.z);
        mesh.scale.set(od.scale.x,od.scale.y,od.scale.z);
        const newId = ++objIdC;
        mesh.userData={id:newId, name:od.name, type:od.type, script:od.script||null, isPlayerObj:od.isPlayerObj||false};

        // Texture yuklash (ZIP ichidan)
        if (od.textureFile && zipObj) {
          try {
            const imgData = await zipObj.file(od.textureFile)?.async('base64');
            if (imgData) {
              const ext = od.textureFile.split('.').pop().toLowerCase();
              const mime = ext==='png'?'image/png':ext==='jpg'||ext==='jpeg'?'image/jpeg':'image/png';
              const dataUrl = `data:${mime};base64,${imgData}`;
              const tex = new THREE.TextureLoader().load(dataUrl);
              mat.map = tex; mat.needsUpdate = true;
              mesh.userData.textureBase64 = dataUrl;
              mesh.userData.textureName = od.textureFile.split('/').pop();
            }
          } catch(e) { log('⚠ Texture o\'qilmadi: '+od.textureFile,'lw'); }
        }

        if (od.script) { scriptCompile(od.script, newId); mesh.userData.script = od.script; }
        scene.add(mesh); objects.push(mesh);
        addPhysicsBody(mesh);
      }
      updateHierarchy(); updateStats();
      log(`📂 Sahna yuklandi: ${data.objects?.length||0} obyekt`, 'lok');

      // ── Timeline (tlTracks) tiklash ──────────────────────────
      if (data.timeline?.tracks?.length && typeof tlTracks !== 'undefined') {
        Object.keys(tlTracks).forEach(k => delete tlTracks[k]);
        if (typeof tlDuration !== 'undefined' && data.timeline.duration)
          tlDuration = data.timeline.duration;
        let tlLoaded = 0;
        for (const t of data.timeline.tracks) {
          // Nomi bo'yicha moslaymiz (ID yuklashda o'zgarishi mumkin)
          const obj = objects.find(o => o.userData.name === t.objName);
          if (!obj) continue;
          tlTracks[obj.userData.id] = {
            name:         t.objName,
            objRef:       obj,
            keyframes:    t.keyframes    || [],
            visKeyframes: t.visKeyframes || [],
          };
          tlLoaded++;
        }
        if (tlLoaded > 0) {
          log(`⏱ Timeline tiklandi: ${tlLoaded} track`, 'lok');
          if (typeof tlRender === 'function') tlRender();
        }
      }
    } catch(err) { log('❌ Yuklash xatosi: '+err.message,'le'); }
  };

  if (jsonData) { doLoad(jsonData, null); return; }

  const inp = document.createElement('input');
  inp.type='file'; inp.accept='.json,.zip';
  inp.onchange = async e=>{
    const file = e.target.files[0]; if (!file) return;

    if (file.name.endsWith('.zip')) {
      // ZIP fayl yuklash
      if (typeof JSZip === 'undefined') { log('❌ JSZip yuklanmagan','le'); return; }
      try {
        const buf = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(buf);
        // apex-file.json (yangi format) yoki scene.json (eski format) ni qidirish
        const jsonFile = zip.file('apex-file.json') || zip.file('scene.json');
        if (!jsonFile) { log('❌ ZIP ichida apex-file.json topilmadi','le'); return; }
        const jsonText = await jsonFile.async('string');
        const data = JSON.parse(jsonText);
        log('📦 ZIP yuklandi, sahna tiklanmoqda...','lw');
        await doLoad(data, zip);
      } catch(err) { log('❌ ZIP xatosi: '+err.message,'le'); }
    } else {
      // Oddiy JSON
      const reader = new FileReader();
      reader.onload = ev=>{ try { doLoad(JSON.parse(ev.target.result), null); } catch(err) { log('❌ JSON xatosi: '+err.message,'le'); } };
      reader.readAsText(file);
    }
  };
  inp.click();
};
