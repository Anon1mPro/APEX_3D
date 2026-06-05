// ───────────────────────────────────────────────────────────────────
// 3. ASSET IMPORTER — OBJ+MTL, Drag-drop, Asset library
// ───────────────────────────────────────────────────────────────────
const AssetImporter = {
  library: [],   // [{name, url, type, thumbnail}]

  importOBJ() {
    if (!THREE.OBJLoader) {
      log('⚠ OBJLoader mavjud emas. GLB/GLTF format ishlating.', 'lw');
      return;
    }
    const inp = document.createElement('input');
    inp.type='file'; inp.accept='.obj';
    inp.onchange = e => {
      const file = e.target.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const obj = new THREE.OBJLoader().parse(ev.target.result);
        this._addModel(obj, file.name);
      };
      reader.readAsText(file);
    };
    inp.click();
  },

  importFBX() {
    if (!THREE.FBXLoader) {
      log('⚠ FBXLoader mavjud emas. GLB/GLTF format ishlating.', 'lw');
      return;
    }
    const inp = document.createElement('input');
    inp.type='file'; inp.accept='.fbx';
    inp.onchange = e => {
      const file = e.target.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const model = new THREE.FBXLoader().parse(ev.target.result, '');
        this._addModel(model, file.name);
        if (model.animations?.length) {
          const mixer = new THREE.AnimationMixer(model);
          mixer.clipAction(model.animations[0]).play();
          model.userData._mixer = mixer;
        }
      };
      reader.readAsArrayBuffer(file);
    };
    inp.click();
  },

  importMultipleGLB() {
    const inp = document.createElement('input');
    inp.type='file'; inp.accept='.glb,.gltf'; inp.multiple=true;
    inp.onchange = e => {
      const files = [...e.target.files];
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = ev => {
          if (!THREE.GLTFLoader) return;
          getGLTFLoader().parse(ev.target.result,'', gltf=>{
            this._addModel(gltf.scene, file.name, gltf.animations);
          });
        };
        reader.readAsArrayBuffer(file);
      });
    };
    inp.click();
  },

  _addModel(model, filename, animations) {
    const name = filename.replace(/\.(glb|gltf|obj|fbx)$/i,'');
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x,size.y,size.z);
    if (maxDim>0.01) model.scale.setScalar(3/maxDim);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center.multiplyScalar(3/maxDim));
    model.traverse(ch=>{ if(ch.isMesh){ch.castShadow=ch.receiveShadow=true;} });

    const group = new THREE.Group();
    const id = ++objIdC;
    group.userData = {id, name, type:'GLB', isGLB:true};
    group.add(model);
    scene.add(group); objects.push(group);
    addPhysicsBody(group,{isStatic:true});

    if (animations?.length) {
      const mixer = new THREE.AnimationMixer(model);
      animations.forEach((clip,i)=>{ if(i===0) mixer.clipAction(clip).play(); });
      group.userData._mixer = mixer;
      group.userData._clips = animations;
    }

    // Add to library
    this.library.push({name, type:'GLB', obj:group});
    selectObject(group);
    updateHierarchy(); updateStats();
    log(`📦 Yuklandi: ${name}`, 'lok');
  },

  enableDragDrop() {
    const cv = document.getElementById('c');
    if (!cv) return;
    cv.addEventListener('dragover', e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';});
    cv.addEventListener('drop', e=>{
      e.preventDefault();
      const files = [...e.dataTransfer.files];
      files.forEach(file=>{
        const ext = file.name.split('.').pop().toLowerCase();
        const reader = new FileReader();
        if (ext==='glb'||ext==='gltf') {
          reader.onload=ev=>{
            if(!THREE.GLTFLoader){log('❌ GLTFLoader yo\'q','le');return;}
            getGLTFLoader().parse(ev.target.result,'',gltf=>{
              this._addModel(gltf.scene,file.name,gltf.animations);
            });
          };
          reader.readAsArrayBuffer(file);
        } else if (ext==='obj') {
          reader.onload=ev=>{ if(THREE.OBJLoader) this._addModel(new THREE.OBJLoader().parse(ev.target.result),file.name); };
          reader.readAsText(file);
        } else if (['png','jpg','jpeg','webp'].includes(ext)) {
          new THREE.TextureLoader().load(URL.createObjectURL(file), tex=>{
            if(selectedObj?.material){selectedObj.material.map=tex;selectedObj.material.needsUpdate=true;log(`🖼 Texture: ${file.name}`,'lok');}
          });
        }
        log(`📂 Drag-drop: ${file.name}`, 'lok');
      });
    });
    log('📂 Drag-drop yoqildi — faylni canvas ga tashlang', 'lok');
  },

  showLibrary() {
    const old = document.getElementById('asset-lib-panel');
    if (old) { old.remove(); return; }
    const panel = document.createElement('div');
    panel.id = 'asset-lib-panel';
    panel.classList.add('ui-modal-scroll');
    panel.style.cssText='border:1px solid var(--accent3);min-width:360px';
    const libRows = this.library.map((a,i)=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)">
        <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--text)">📦 ${a.name} <span style="color:var(--muted)">[${a.type}]</span></span>
        <div style="display:flex;gap:4px">
          <button onclick="selectObject(AssetImporter.library[${i}].obj)" style="${_smBtn('var(--accent3)')}">Tanlash</button>
          <button onclick="AssetImporter.library.splice(${i},1);AssetImporter.showLibrary()" style="${_smBtn('#ff5555')}">✕</button>
        </div>
      </div>`).join('');

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--accent3);letter-spacing:2px">📦 ASSET KUTUBXONA</span>
        <button onclick="document.getElementById('asset-lib-panel').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:20px;padding:0 4px">✕</button>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap">
        <button onclick="AssetImporter.importMultipleGLB()" style="${_smBtn2()}">📂 GLB/GLTF</button>
        <button onclick="AssetImporter.importOBJ()" style="${_smBtn2()}">📂 OBJ</button>
        <button onclick="AssetImporter.importFBX()" style="${_smBtn2()}">📂 FBX</button>
        <button onclick="AssetImporter.enableDragDrop()" style="${_smBtn2()}">🖱 Drag-Drop</button>
      </div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent3);margin-bottom:6px">YUKLANGAN ASSETLAR (${this.library.length})</div>
      <div>${libRows||'<div style="font-size:9px;color:var(--muted);padding:8px">Hali hech narsa yuklanmagan</div>'}</div>
    `;
    document.body.appendChild(panel);
  }
};

AssetImporter.enableDragDrop();

(function() {
  const menu = document.getElementById('ham-menu');
  if (menu) {
    const btn = document.createElement('button');
    btn.className='ham-item';
    btn.onclick=()=>{ AssetImporter.showLibrary(); closeHamMenu(); };
    btn.textContent='📦 Assets';
    menu.appendChild(btn);
  }
})();

