// ============================================================
// ANIMAL AI SYSTEM
// ============================================================
function updateAnimals(delta) {
  if (!isPlaying) return;
  objects.forEach(o=>{
    if(o.userData.entityType!=='animal') return;
    const ud=o.userData;
    ud._idleTimer=(ud._idleTimer||0)+delta;

    const distToPlayer = playerMesh ? o.position.distanceTo(playerMesh.position) : 999;

    // State machine
    if (distToPlayer < 5) {
      ud.aiState='follow';
    } else if (distToPlayer > 8) {
      ud.aiState = ud._idleTimer > 4 ? 'patrol' : ud.aiState||'idle';
    }

    if (ud.aiState==='follow' && playerMesh) {
      // Oyinchi tomon yur
      const dir=playerMesh.position.clone().sub(o.position);
      dir.y=0;
      const dist=dir.length();
      if(dist>1.2){
        dir.normalize();
        o.position.addScaledVector(dir,delta*1.8);
        o.rotation.y=Math.atan2(dir.x,dir.z);
        // Leg animation
        o.children.forEach((ch,i)=>{
          if(i<4) ch.position.y=-0.35+Math.sin(Date.now()*0.006+i*1.5)*0.07;
        });
      }
    } else if (ud.aiState==='patrol') {
      // Random patrol
      if(!ud._patrolTarget||o.position.distanceTo(ud._patrolTarget)<0.5||ud._idleTimer>5){
        ud._idleTimer=0;
        ud._patrolTarget=new THREE.Vector3((Math.random()-.5)*12,0,(Math.random()-.5)*12);
        ud.aiState='walking';
      }
    } else if (ud.aiState==='walking' && ud._patrolTarget) {
      const dir=ud._patrolTarget.clone().sub(o.position); dir.y=0;
      const dist=dir.length();
      if(dist>0.5){
        dir.normalize();
        o.position.addScaledVector(dir,delta*1.2);
        o.rotation.y=Math.atan2(dir.x,dir.z);
      } else { ud.aiState='idle'; ud._idleTimer=0; }
    } else {
      // Idle: tail wag
      o.children.forEach(ch=>{
        if(ch.position.z>0.4) ch.rotation.z=Math.sin(Date.now()*0.003)*0.3;
      });
    }
    // Ground
    if(o.position.y>0.35) o.position.y-=9.8*delta;
    if(o.position.y<0.35) o.position.y=0.35;
  });
}

// ============================================================
// GLB/GLTF IMPORT — enhanced with model library
// ============================================================
window.assetImportGLB = function() {
  const inp=document.createElement('input');
  inp.type='file'; inp.accept='.glb,.gltf';
  inp.multiple=true;
  inp.onchange=e=>{
    Array.from(e.target.files).forEach(file=>{
      const url=URL.createObjectURL(file);
      const name=file.name.replace(/\.(glb|gltf)$/i,'');
      loadGLBToLibrary(url,name);
    });
  };
  inp.click();
};

function loadGLBToLibrary(url, name) {
  if(!THREE.GLTFLoader){ log('❌ GLTFLoader tayyor emas','le'); return; }
  log('📂 Yuklanmoqda: '+name,'lw');
  // ArrayBuffer saqlaymiz — assetSpawnModel har safar qayta parse qiladi
  // (clone() SkinnedMesh skeleton bog'lanishini buzadi, shuning uchun re-parse kerak)
  fetch(url).then(r=>r.arrayBuffer()).then(buffer=>{
    const loader=getGLTFLoader();
    loader.parse(buffer, '', gltf=>{
      const modelData={name, url, buffer, scene:gltf.scene, animations:gltf.animations||[]};
      loadedModels.push(modelData);
      renderModelLibrary();
      log('✅ Model yuklandi: '+name+(gltf.animations.length?' ('+gltf.animations.length+' animatsiya)':''),'lok');
    }, err=>{
      log('❌ Parse xatosi: '+name+' — '+(err.message||err),'le');
    });
  }).catch(()=>{ log('❌ Fayl o\'qilmadi: '+name,'le'); });
}

function renderModelLibrary() {
  const list=$('asset-model-list'); if(!list) return;
  list.innerHTML='';
  loadedModels.forEach((m,idx)=>{
    const row=document.createElement('div');
    row.className='asset-model-item';
    row.innerHTML=`
      <span style="font-size:14px">📦</span>
      <span class="ami-name" title="${m.name}">${m.name}</span>
      ${m.animations.length?`<span style="font-size:9px;color:var(--accent4);font-family:'Share Tech Mono',monospace">${m.animations.length}🎬</span>`:''}
      <button class="ami-spawn" onclick="assetSpawnModel(${idx})">+ Sahna</button>
    `;
    list.appendChild(row);
  });
}

window.assetSpawnModel = function(idx) {
  const m=loadedModels[idx]; if(!m) return;
  if(!m.buffer){ log('❌ Model buffer topilmadi, qayta yuklang','le'); return; }
  if(!THREE.GLTFLoader){ log('❌ GLTFLoader tayyor emas','le'); return; }

  // ─── MUHIM: clone() ishlatmaymiz! ───────────────────────────
  // THREE.js da SkinnedMesh.clone() skeleton bone bog'lanishlarini
  // (skinIndex/skinWeight) yangi bone-larga re-bind qilmaydi.
  // Shuning uchun har safar buffer dan qayta parse qilamiz.
  const loader=getGLTFLoader();
  loader.parse(m.buffer, '', gltf=>{
    const clone=gltf.scene;           // fresh parse — skeleton to'liq

    // Auto scale
    const box=new THREE.Box3().setFromObject(clone);
    const size=box.getSize(new THREE.Vector3());
    const maxDim=Math.max(size.x,size.y,size.z);
    if(maxDim>5) clone.scale.setScalar(5/maxDim);
    else if(maxDim<0.3) clone.scale.setScalar(0.5/maxDim);

    // Wrapper group (selectable)
    const wrapper=new THREE.Group();
    wrapper.add(clone);

    // Invisible bbox for raycasting
    const box2=new THREE.Box3().setFromObject(clone);
    const sz=box2.getSize(new THREE.Vector3());
    const bboxMesh=new THREE.Mesh(
      new THREE.BoxGeometry(sz.x,sz.y,sz.z),
      new THREE.MeshBasicMaterial({visible:false,transparent:true,opacity:0})
    );
    bboxMesh.position.copy(box2.getCenter(new THREE.Vector3()));
    wrapper.add(bboxMesh);

    wrapper.userData={id:++objIdC,name:m.name,type:'GLB',isGLB:true,
      hasAnimations:gltf.animations.length>0};
    wrapper.position.set((Math.random()-.5)*6,0,(Math.random()-.5)*6);

    // Shadows + bone detect
    let hasBones=false;
    wrapper.traverse(ch=>{
      if(ch.isMesh||ch.isSkinnedMesh){ch.castShadow=true;ch.receiveShadow=true;}
      if(ch.isSkinnedMesh) hasBones=true;
    });

    // ─── Skeleton Helper (ko'rsatish/yashirish uchun) ──────────
    if(hasBones){
      const skelH=new THREE.SkeletonHelper(clone);
      skelH.name='__skel_helper__';
      skelH.visible=false;
      wrapper.add(skelH);
      wrapper.userData._skelHelper=skelH;
    }

    scene.add(wrapper);
    objects.push(wrapper);

    // Animation mixer
    if(gltf.animations.length>0){
      const mixer=new THREE.AnimationMixer(clone);
      // Barcha clip-larni ro'yxatga olamiz
      const actions=gltf.animations.map(clip=>{
        const a=mixer.clipAction(clip);
        a.loop=THREE.LoopRepeat;
        return a;
      });
      actions[0].play();   // birinchi anim avtomatik
      wrapper.userData._mixer=mixer;
      wrapper.userData._action=actions[0];
      wrapper.userData._clips=gltf.animations;
      wrapper.userData._actions=actions;
      wrapper.userData._activeAnim=0;
      wrapper.userData.animationName=gltf.animations[0].name;
      log('🎬 Animatsiya: '+gltf.animations[0].name,'lok');
      if(gltf.animations.length>1) showAnimSelectPanel(wrapper);
    }

    addPhysicsBody(wrapper,{isStatic:false,radius:Math.max(sz.x,sz.z)/2});
    updateHierarchy(); selectObject(wrapper); updateStats();
    log('📦 '+m.name+' sahnaga qo\'shildi','lok');
  }, err=>{
    log('❌ Model spawn xatosi: '+(err.message||err),'le');
  });
};

