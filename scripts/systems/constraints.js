// ───────────────────────────────────────────────────────────────────
// 5. PHYSICS CONSTRAINTS — Hinge, Spring, Fixed, Distance joints
// ───────────────────────────────────────────────────────────────────
const PhysicsConstraints = {
  joints: [],   // [{type, bodyA, bodyB, params, helper}]
  jIdC: 0,

  addHinge(objA, objB) {
    objA = objA||selectedObj;
    if (!objA) { log('⚠ Birinchi obyektni tanlang','lw'); return; }
    if (!objB) {
      log('⚠ Hinge: ikkinchi obyektni tanlang (Shift+click), keyin qaytadan bosing','lw');
      PhysicsConstraints._pendingA = objA;
      return;
    }
    const id = ++this.jIdC;
    const joint = {
      id, type:'hinge',
      bodyA: objA, bodyB: objB,
      pivot: objA.position.clone().lerp(objB.position, 0.5),
      axis: new THREE.Vector3(0,1,0),
      stiffness: 1.0, damping: 0.1
    };
    this.joints.push(joint);
    this._addHelper(joint);
    log(`🔩 Hinge joint #${id}: "${objA.userData.name}" ↔ "${objB.userData.name}"`, 'lok');
    this._pendingA = null;
    this.showPanel();
  },

  addSpring(objA, objB) {
    objA = objA||selectedObj;
    if (!objA||!objB) { log('⚠ Kamida 2 ta obyekt tanlang','lw'); return; }
    const restLen = objA.position.distanceTo(objB.position);
    const id = ++this.jIdC;
    const joint = {id, type:'spring', bodyA:objA, bodyB:objB, restLength:restLen, stiffness:8, damping:0.5};
    this.joints.push(joint);
    this._addHelper(joint);
    log(`🌀 Spring #${id}: "${objA.userData.name}" ↔ "${objB.userData.name}" (rest=${restLen.toFixed(2)})`, 'lok');
    this.showPanel();
  },

  addFixed(objA, objB) {
    objA = objA||selectedObj;
    if (!objA||!objB) { log('⚠ 2 ta obyekt kerak','lw'); return; }
    const offset = objB.position.clone().sub(objA.position);
    const id = ++this.jIdC;
    const joint = {id, type:'fixed', bodyA:objA, bodyB:objB, offset};
    this.joints.push(joint);
    log(`🔒 Fixed #${id}: "${objA.userData.name}" → "${objB.userData.name}"`, 'lok');
    this.showPanel();
  },

  addDistance(objA, objB) {
    objA = objA||selectedObj;
    if (!objA||!objB) { log('⚠ 2 ta obyekt kerak','lw'); return; }
    const d = objA.position.distanceTo(objB.position);
    const id = ++this.jIdC;
    const joint = {id, type:'distance', bodyA:objA, bodyB:objB, distance:d};
    this.joints.push(joint);
    this._addHelper(joint);
    log(`📏 Distance #${id}: ${d.toFixed(2)}m oraliq`, 'lok');
    this.showPanel();
  },

  _addHelper(joint) {
    const mat = new THREE.LineBasicMaterial({
      color: joint.type==='spring'?0x00ff88:joint.type==='hinge'?0xff8800:0xaaaaaa,
      transparent:true, opacity:0.6
    });
    const geo = new THREE.BufferGeometry().setFromPoints([
      joint.bodyA.position, joint.bodyB?.position||joint.bodyA.position
    ]);
    joint._helper = new THREE.Line(geo, mat);
    joint._helper.userData.isHelper = true;
    scene.add(joint._helper);
  },

  update(delta) {
    this.joints.forEach(j=>{
      if (!j.bodyA||!j.bodyB) return;
      const pA = j.bodyA.position, pB = j.bodyB.position;

      // Update helper line
      if (j._helper) {
        const pts = j._helper.geometry.attributes.position;
        pts.setXYZ(0, pA.x,pA.y,pA.z);
        pts.setXYZ(1, pB.x,pB.y,pB.z);
        pts.needsUpdate=true;
      }

      // Apply forces
      if (j.type==='spring') {
        const diff = new THREE.Vector3().subVectors(pB,pA);
        const dist = diff.length();
        const force = (dist - j.restLength) * j.stiffness * delta;
        const dir = diff.normalize();
        const bA = physBodies.find(b=>b.mesh===j.bodyA);
        const bB = physBodies.find(b=>b.mesh===j.bodyB);
        if (bA&&!bA.isStatic) bA.vel.addScaledVector(dir,  force);
        if (bB&&!bB.isStatic) bB.vel.addScaledVector(dir, -force);
      }

      if (j.type==='distance') {
        const diff = new THREE.Vector3().subVectors(pB,pA);
        const dist = diff.length();
        if (dist > j.distance) {
          const excess = (dist-j.distance)*0.5;
          const dir = diff.normalize();
          const bA = physBodies.find(b=>b.mesh===j.bodyA);
          const bB = physBodies.find(b=>b.mesh===j.bodyB);
          if (bA&&!bA.isStatic) bA.mesh.position.addScaledVector(dir, excess);
          if (bB&&!bB.isStatic) bB.mesh.position.addScaledVector(dir,-excess);
        }
      }

      if (j.type==='fixed') {
        if (!j.bodyA.userData.isStatic) return;
        j.bodyB.position.copy(j.bodyA.position).add(j.offset);
      }
    });
  },

  removeJoint(id) {
    const idx = this.joints.findIndex(j=>j.id===id);
    if (idx<0) return;
    const j = this.joints[idx];
    if (j._helper) scene.remove(j._helper);
    this.joints.splice(idx,1);
    log(`🗑 Joint #${id} o'chirildi`,'lw');
    this.showPanel();
  },

  showPanel() {
    const old = document.getElementById('physics-constraints-panel');
    if (old) { old.remove(); }

    // Get 2nd selected from multiSelected
    const multiArr = [...multiSelected];
    const objB = multiArr.find(o=>o!==selectedObj) || multiArr[0];
    const canJoin = selectedObj && objB && selectedObj!==objB;

    const panel = document.createElement('div');
    panel.id='physics-constraints-panel';
    panel.classList.add('ui-modal-scroll');
    panel.style.cssText='border:1px solid var(--accent3);min-width:360px';

    const jointRows = this.joints.map(j=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)">
        <span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text)">
          ${j.type==='spring'?'🌀':j.type==='hinge'?'🔩':j.type==='fixed'?'🔒':'📏'} #${j.id}
          <span style="color:var(--muted)">${j.bodyA?.userData?.name||'?'} ↔ ${j.bodyB?.userData?.name||'?'}</span>
        </span>
        <button onclick="PhysicsConstraints.removeJoint(${j.id})" style="${_smBtn('#ff5555')}">✕</button>
      </div>`).join('');

    panel.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--accent3);letter-spacing:2px">🔩 PHYSICS JOINTS</span>
        <button onclick="document.getElementById('physics-constraints-panel').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:20px;padding:0 4px">✕</button>
      </div>
      <div style="font-size:9px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-bottom:8px;line-height:1.8">
        Ierarxiyada <b style="color:var(--accent)">Shift+click</b> bilan 2 ta obyekt tanlang, keyin joint qo'shing.<br>
        <span id="jnt-sel-info" style="color:var(--accent3)">
          ${canJoin
            ? `✓ <span style="color:var(--accent)">${selectedObj?.userData?.name}</span> ↔ <span style="color:var(--accent)">${objB?.userData?.name}</span>`
            : selectedObj
              ? `⚠ Ikkinchi obyektni <b>Shift+click</b> bilan tanlang`
              : `⚠ Birinchi obyektni tanlang`
          }
        </span>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px">
        <button onclick="PhysicsConstraints._addFromPanel('hinge')"    style="flex:1;min-width:70px;${_smBtn2()}">🔩 Hinge</button>
        <button onclick="PhysicsConstraints._addFromPanel('spring')"   style="flex:1;min-width:70px;${_smBtn2()}">🌀 Spring</button>
        <button onclick="PhysicsConstraints._addFromPanel('fixed')"    style="flex:1;min-width:70px;${_smBtn2()}">🔒 Fixed</button>
        <button onclick="PhysicsConstraints._addFromPanel('distance')" style="flex:1;min-width:70px;${_smBtn2()}">📏 Distance</button>
      </div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:10px;color:var(--accent3);margin-bottom:4px">AKTIV JOINTLAR (${this.joints.length})</div>
      ${jointRows||'<div style="font-size:9px;color:var(--muted);padding:6px">Hali joint yo\'q</div>'}
    `;
    document.body.appendChild(panel);
  },

  _addFromPanel(type) {
    const objA = selectedObj;
    if (!objA) { log('⚠ Birinchi obyektni tanlang', 'lw'); return; }
    const objB = [...multiSelected].find(o => o !== objA);
    if (!objB) { log('⚠ Ierarxiyada Shift+click bilan ikkinchi obyektni tanlang', 'lw'); return; }
    if      (type==='hinge')    this.addHinge(objA, objB);
    else if (type==='spring')   this.addSpring(objA, objB);
    else if (type==='fixed')    this.addFixed(objA, objB);
    else if (type==='distance') this.addDistance(objA, objB);
  }
};

// Physics constraints topbar
(function() {
  const menu = document.getElementById('ham-menu');
  if (menu) {
    const btn = document.createElement('button');
    btn.className='ham-item';
    btn.onclick=()=>{ PhysicsConstraints.showPanel(); closeHamMenu(); };
    btn.textContent='🔩 Joints';
    menu.appendChild(btn);
  }
})();

log('🚀 Barcha sistemalar yuklandi: Scene | PBR/HDR | Assets | Editor | Physics Joints', 'lok');
