// FUNCTIONAL BLOCKS SPAWN SYSTEM
// ============================================================
window.spawnFunctionalBlock = function(type) {
  const cfgMap = {
    checkpoint: {
      name: 'Checkpoint',
      color: 0x39ff14,
      emissive: 0x39ff14,
      emissiveIntensity: 0.55,
      geo: [1.2, 0.15, 1.2],
      icon: '🚩',
      script: `// 🚩 CHECKPOINT SCRIPTI
if (!self.userData._cpActive) self.userData._cpActive = false;
// Oyinchi yaqinlashganda checkpointni faollashtirish
const player = scene.getObjectByName && scene.children.find(o=>o.userData&&o.userData._type==='player');
if (player) {
  const dx = player.position.x - self.position.x;
  const dz = player.position.z - self.position.z;
  const dist = Math.sqrt(dx*dx+dz*dz);
  if (dist < 2.0 && !self.userData._cpActive) {
    self.userData._cpActive = true;
    self.userData._spawnPos = {x: self.position.x, y: self.position.y + 2, z: self.position.z};
    // Checkpoint rangi yangilanadi
    if (self.material) {
      self.material.emissiveIntensity = 1.2;
      self.material.color.setHex(0xffffff);
    }
    console.log('✅ Checkpoint faollashdi!');
  }
}`,
      physicsMode: 'solid',
      tag: 'checkpoint'
    },
    spawnblock: {
      name: 'SpawnBlock',
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.45,
      geo: [1.0, 0.12, 1.0],
      icon: '📍',
      script: `// 📍 SPAWN BLOCK SCRIPTI
// Bu nuqta oyinchi tug'ilish joyi
if (!self.userData._spawnSet) {
  self.userData._spawnSet = true;
  self.userData._spawnPos = {x: self.position.x, y: self.position.y + 1.5, z: self.position.z};
  console.log('📍 SpawnBlock belgilandi:', self.position);
}
// Pulsating glow effect
if (self.material) {
  self.material.emissiveIntensity = 0.3 + Math.sin(time * 2.5) * 0.25;
}`,
      physicsMode: 'solid',
      tag: 'spawnblock'
    },
    damageblock: {
      name: 'DamageBlock',
      color: 0xff4444,
      emissive: 0xff2200,
      emissiveIntensity: 0.6,
      geo: [1.5, 0.2, 1.5],
      icon: '💥',
      script: `// 💥 DAMAGE BLOCK SCRIPTI
if (!self.userData._dmgAmount) self.userData._dmgAmount = 25;
if (!self.userData._dmgCooldown) self.userData._dmgCooldown = 0;
self.userData._dmgCooldown -= delta;
// Oyinchi tekkanini tekshirish
const player = scene.children.find(o=>o.userData&&o.userData._type==='player');
if (player && self.userData._dmgCooldown <= 0) {
  const dx = player.position.x - self.position.x;
  const dy = player.position.y - self.position.y;
  const dz = player.position.z - self.position.z;
  const dist = Math.sqrt(dx*dx+dy*dy+dz*dz);
  if (dist < 1.6) {
    if (player.userData._hp === undefined) player.userData._hp = 100;
    player.userData._hp -= self.userData._dmgAmount;
    self.userData._dmgCooldown = 0.8; // 0.8 soniya kutish
    console.log('💥 Zarar berildi! HP:', player.userData._hp);
    if (player.userData._hp <= 0) console.log('💀 OYINCHI HALOK!');
  }
}
// Pulsating red glow
if (self.material) {
  self.material.emissiveIntensity = 0.4 + Math.abs(Math.sin(time * 4)) * 0.6;
}`,
      physicsMode: 'solid',
      tag: 'damageblock'
    },
    teleportblock: {
      name: 'TeleportBlock',
      color: 0xcc88ff,
      emissive: 0xaa44ff,
      emissiveIntensity: 0.55,
      geo: [1.2, 0.15, 1.2],
      icon: '🌀',
      script: `// 🌀 TELEPORT BLOCK SCRIPTI
// userData._targetPos = {x, y, z}  — shu yerga ko'chiradi
if (!self.userData._teleportCooldown) self.userData._teleportCooldown = 0;
if (!self.userData._targetPos) self.userData._targetPos = {x: 0, y: 3, z: 0};
self.userData._teleportCooldown -= delta;
const player = scene.children.find(o=>o.userData&&o.userData._type==='player');
if (player && self.userData._teleportCooldown <= 0) {
  const dx = player.position.x - self.position.x;
  const dz = player.position.z - self.position.z;
  const dist = Math.sqrt(dx*dx+dz*dz);
  if (dist < 1.4) {
    const tp = self.userData._targetPos;
    player.position.set(tp.x, tp.y, tp.z);
    self.userData._teleportCooldown = 1.5;
    console.log('🌀 Teleportatsiya:', tp.x, tp.y, tp.z);
  }
}
// Spinning color effect
if (self.material) {
  self.material.emissiveIntensity = 0.35 + Math.sin(time * 3) * 0.3;
}`,
      physicsMode: 'solid',
      tag: 'teleportblock'
    }
  };

  const cfg = cfgMap[type];
  if (!cfg) return;

  // THREE.js mesh yaratish
  const geo = new THREE.BoxGeometry(...cfg.geo);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color,
    emissive: cfg.emissive,
    emissiveIntensity: cfg.emissiveIntensity,
    transparent: true,
    opacity: 0.82,
    roughness: 0.3,
    metalness: 0.4
  });
  const mesh = new THREE.Mesh(geo, mat);

  // Kamera oldiga joylash
  const camPos = camera.position;
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  mesh.position.set(
    camPos.x + camDir.x * 5,
    camPos.y + camDir.y * 5 - 1,
    camPos.z + camDir.z * 5
  );
  mesh.position.y = Math.max(0.1, mesh.position.y);

  // userData
  mesh.userData = {
    name: cfg.name + '_' + (objects.filter(o=>o.userData&&o.userData._funcType===type).length+1),
    _funcType: type,
    _tag: cfg.tag,
    physicsMode: cfg.physicsMode,
    script: cfg.script,
    visible: true,
    _type: 'functional'
  };
  mesh.name = mesh.userData.name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  scene.add(mesh);
  objects.push(mesh);
  captureState('functional:' + type);
  updateHierarchy();
  selectObject(mesh);
  clog(`${cfg.icon} ${cfg.name} qo'shildi`, 'ok');
};


const entityScripts = {
  player: `// 🧍 OYINCHI SCRIPTI — har kadrda ishlaydi
// self = oyinchi mesh | time = o'yin vaqti | delta = kadr vaqti
// BOSHQARUV: WASD yurish, Space sakrash, Mouse qarash
// Bu yerda custom logika yozing — asosiy harakat engine da bor

// ── HP tizimi ──
if (self.userData._hp === undefined) self.userData._hp = 100;
if (self.userData._stamina === undefined) self.userData._stamina = 100;

// ── Yugurish (Shift bosib turganda) ──
// playerSpeed ni o'zgartirish mumkin emas (hozircha)
// lekin vel ga ta'sir qilish mumkin:
// if (fpsKeys['ShiftLeft']) { /* sprint */ }

// ── Sog'liqni to'ldirish ──
if (self.userData._hp < 100 && playerOnGround) {
  self.userData._hp = Math.min(100, self.userData._hp + delta * 2);
}

// ── HP ni HUD ga chiqarish ──
const hEl = document.getElementById('game-health');
if (hEl) hEl.textContent = Math.round(self.userData._hp);

// ── Tushib ketsa qayta tug'ilish ──
if (self.position.y < -20) {
  respawn();
  addMessage('💀 Tushib ketdi!', '#ff4444');
  self.userData._hp -= 10;
}`,

  car: `// 🚗 MASHINA — avtomatik haydash tizimi bor
// WASD: haydash | Space: tormoz | E: chiqish/kirish
// Custom logika:

// Misol: tezlikni cheklash
// if (carSpeed > 30) carBrake = true;

// Misol: yoqilg'i
if (!self.userData._fuel) self.userData._fuel = 100;
if (self.userData._moving) {
  self.userData._fuel -= delta * 2;
  if (self.userData._fuel <= 0) { self.userData._fuel = 0; addMessage('⛽ Yoqilg\\'i tugadi!','#ff4444'); }
}`,

  animal: `// 🐕 HAYVON — AI patrol tizimi bor
// Avtomatik: idle → patrol → follow (oyinchi yaqin kelsa)
// Custom logika:

// Misol: qo'rqish
if (playerDist() < 1.5) {
  // Oyinchidan qoch
  const away = self.position.clone().sub(player.position).normalize();
  self.position.addScaledVector(away, delta * 3);
}`,

  item: `// ⭐ BUYUM — trigger/collectible
// Oyinchi tekkanda ishlaydi

if (playerDist() < 1.2 && self.visible) {
  self.visible = false;
  addScore(10);
  spawnParticles({color:0xffcc00, count:40});
  playSound(880, 0.2);
  addMessage('+10 ⭐', '#ffcc00');
}

// Suzib turish animatsiyasi
self.position.y = (self.userData._baseY||self.position.y) + Math.sin(time*2)*0.15;
self.userData._baseY = self.userData._baseY || self.position.y;
self.rotation.y += delta * 1.5;`,

  npc: `// 🤖 NPC — dialog/quest
// Oyinchi yaqin kelsa muloqot
if (!self.userData._talked) {
  if (playerDist() < 2) {
    self.userData._talked = true;
    addMessage('Salom, sayohatchi! 👋', '#88ffaa');
    playSound(440, 0.3);
    setTimeout(()=>{ if(self.userData) self.userData._talked=false; }, 5000);
  }
}
// NPC oyinchiga qaraydi
if (playerDist() < 8 && player) {
  const dir = player.position.clone().sub(self.position);
  dir.y = 0;
  if (dir.length() > 0.1) self.rotation.y = Math.atan2(dir.x, dir.z);
}`,
};

// Entity default scripts (for script editor)

window.assetSpawnEntity = function(type) {
  let mesh, name, color, script;

  if (type === 'player') {
    // Player spawn point marker
    const geo = new THREE.CylinderGeometry(0.4,0.4,1.8,12);
    const mat = new THREE.MeshStandardMaterial({color:0x00e5ff,roughness:0.3,wireframe:false,transparent:true,opacity:0.7});
    mesh = new THREE.Mesh(geo, mat);
    // Arrow up indicator
    const arrowGeo = new THREE.ConeGeometry(0.2,0.4,8);
    const arrowMat = new THREE.MeshStandardMaterial({color:0x00e5ff});
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.position.y = 1.2; arrow.raycast=()=>{};
    mesh.add(arrow);
    name='Oyinchi'; color=0x00e5ff;
    mesh.userData = {id:++objIdC, name, type:'Player', isEntity:true, entityType:'player', isSpawn:true};
    mesh.userData.script = entityScripts.player;
    mesh.position.set(0, 0.9, 3);
    log('🧍 Oyinchi spawn nuqtasi qo\'shildi — ▶ O\'YNA bosilganda shu yerdan boshlanadi', 'lok');

  } else if (type === 'car') {
    // Car body
    const bodyGeo = new THREE.BoxGeometry(1.8,0.6,3.5);
    const bodyMat = new THREE.MeshStandardMaterial({color:0xff4444,roughness:0.3,metalness:0.5});
    mesh = new THREE.Mesh(bodyGeo, bodyMat);
    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.4,0.55,1.8);
    const cabin = new THREE.Mesh(cabinGeo, new THREE.MeshStandardMaterial({color:0xcc2222,roughness:0.4,metalness:0.3}));
    cabin.position.set(0,0.55,-0.1); cabin.raycast=()=>{}; mesh.add(cabin);
    // Wheels x4
    const wGeo = new THREE.CylinderGeometry(0.35,0.35,0.25,16);
    const wMat = new THREE.MeshStandardMaterial({color:0x222222,roughness:0.8});
    [[-0.95,-.25,1.2],[0.95,-.25,1.2],[-0.95,-.25,-1.2],[0.95,-.25,-1.2]].forEach((pos,wi)=>{
      const w = new THREE.Mesh(wGeo,wMat);
      w.rotation.z=Math.PI/2; w.position.set(...pos);
      w.userData._wheelIdx=wi; w.raycast=()=>{};
      mesh.add(w);
    });
    name='Mashina'; color=0xff4444;
    mesh.userData = {id:++objIdC, name, type:'Mashina', isEntity:true, entityType:'car',
      speed:0, steer:0, gear:1, fuel:100};
    mesh.userData.script = entityScripts.car;
    mesh.position.set(0,0.6,0);
    log('🚗 Mashina qo\'shildi — ▶ O\'YNA + E: kirish, WASD: haydash', 'lok');

  } else if (type === 'animal') {
    // Animal body
    const bodyGeo = new THREE.BoxGeometry(0.5,0.45,0.8);
    const bodyMat = new THREE.MeshStandardMaterial({color:0xaa7744,roughness:0.9});
    mesh = new THREE.Mesh(bodyGeo, bodyMat);
    // Head
    const headGeo = new THREE.BoxGeometry(0.35,0.35,0.35);
    const head = new THREE.Mesh(headGeo,new THREE.MeshStandardMaterial({color:0x996633,roughness:0.9}));
    head.position.set(0,0.2,-0.5); head.raycast=()=>{}; mesh.add(head);
    // Legs x4
    const legGeo=new THREE.BoxGeometry(0.1,0.3,0.1);
    const legMat=new THREE.MeshStandardMaterial({color:0x885533,roughness:0.9});
    [[-0.18,-0.35,0.25],[0.18,-0.35,0.25],[-0.18,-0.35,-0.25],[0.18,-0.35,-0.25]].forEach(pos=>{
      const leg=new THREE.Mesh(legGeo,legMat); leg.position.set(...pos); leg.raycast=()=>{}; mesh.add(leg);
    });
    // Tail
    const tailGeo=new THREE.CylinderGeometry(0.04,0.02,0.3,6);
    const tail=new THREE.Mesh(tailGeo,legMat); tail.position.set(0,0.1,0.45); tail.rotation.x=0.5; tail.raycast=()=>{}; mesh.add(tail);
    name='Hayvon'; color=0xaa7744;
    mesh.userData={id:++objIdC,name,type:'Hayvon',isEntity:true,entityType:'animal',
      aiState:'idle', aiTarget:null, patrolPoints:[], _patrolIdx:0, _idleTimer:0};
    mesh.userData.script=entityScripts.animal;
    mesh.position.set(3,0.35,0);
    log('🐕 Hayvon qo\'shildi — AI: idle/patrol/follow', 'lok');

  } else if (type === 'item') {
    const geo=new THREE.OctahedronGeometry(0.35);
    const mat=new THREE.MeshStandardMaterial({color:0xffcc00,roughness:0.1,metalness:0.8,emissive:new THREE.Color(0xffcc00).multiplyScalar(0.2)});
    mesh=new THREE.Mesh(geo,mat);
    name='Buyum'; color=0xffcc00;
    mesh.userData={id:++objIdC,name,type:'Buyum',isEntity:true,entityType:'item',_baseY:0.5};
    mesh.userData.script=entityScripts.item;
    mesh.position.set((Math.random()-.5)*6,0.5,(Math.random()-.5)*6);
    log('⭐ Buyum qo\'shildi — yig\'ish skripti tayyor', 'lok');

  } else if (type === 'npc') {
    // NPC: cylinder body + sphere head
    const bodyGeo=new THREE.CylinderGeometry(0.25,0.3,1.0,10);
    const bodyMat=new THREE.MeshStandardMaterial({color:0x4488ff,roughness:0.5,metalness:0.1});
    mesh=new THREE.Mesh(bodyGeo,bodyMat);
    const headGeo=new THREE.SphereGeometry(0.22,12,8);
    const head=new THREE.Mesh(headGeo,new THREE.MeshStandardMaterial({color:0xffcc99,roughness:0.7}));
    head.position.y=0.68; head.raycast=()=>{}; mesh.add(head);
    // Eyes
    [[-0.08,0.05,-0.2],[0.08,0.05,-0.2]].forEach(pos=>{
      const eye=new THREE.Mesh(new THREE.SphereGeometry(0.04,6,4),new THREE.MeshStandardMaterial({color:0x111111}));
      eye.position.set(...pos); eye.raycast=()=>{}; head.add(eye);
    });
    name='NPC'; color=0x4488ff;
    mesh.userData={id:++objIdC,name,type:'NPC',isEntity:true,entityType:'npc'};
    mesh.userData.script=entityScripts.npc;
    mesh.position.set(-3,0.5,0);
    log('🤖 NPC qo\'shildi — dialog skripti tayyor', 'lok');

  } else if (type === 'camera') {
    addCameraObject(); return;
  }

  if (!mesh) return;
  mesh.castShadow=true; mesh.receiveShadow=true;
  scene.add(mesh); objects.push(mesh);
  addPhysicsBody(mesh,{isStatic: type==='item'||type==='npc', radius:0.5});
  updateHierarchy(); selectObject(mesh); updateStats();
};

// ============================================================
// YANGI FUNKSIONAL BLOKLARNI cfgMap ga qo'shimcha
// ============================================================
const _extraFuncBlocks = {
  winzone: {
    name: 'WinZone',
    color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 0.5,
    geo: [2, 0.15, 2], icon: '🏆',
    script: `// 🏆 WIN ZONE SCRIPTI
if (!self.userData._winTriggered) self.userData._winTriggered = false;
const player = scene.children.find(o=>o.userData&&o.userData._type==='player');
if (player && !self.userData._winTriggered) {
  const dx = player.position.x - self.position.x;
  const dz = player.position.z - self.position.z;
  if (Math.sqrt(dx*dx+dz*dz) < 2.2) {
    self.userData._winTriggered = true;
    addMessage('🏆 G\'ALABA! Tabriklаymiz!', '#ffcc00');
    playSound(880, 0.5); playSound(1100, 0.4); playSound(1320, 0.3);
    console.log('🏆 WIN!');
  }
}
if (self.material) self.material.emissiveIntensity = 0.4 + Math.abs(Math.sin(time*2))*0.5;`,
    physicsMode: 'solid', tag: 'winzone'
  },
  killzone: {
    name: 'KillZone',
    color: 0xff2222, emissive: 0xdd0000, emissiveIntensity: 0.7,
    geo: [3, 0.1, 3], icon: '☠️',
    script: `// ☠️ KILL ZONE SCRIPTI
if (!self.userData._kzCooldown) self.userData._kzCooldown = 0;
self.userData._kzCooldown -= delta;
const player = scene.children.find(o=>o.userData&&o.userData._type==='player');
if (player && self.userData._kzCooldown <= 0) {
  const dx = player.position.x - self.position.x;
  const dz = player.position.z - self.position.z;
  if (Math.sqrt(dx*dx+dz*dz) < 2.5) {
    self.userData._kzCooldown = 2;
    if (player.userData._hp !== undefined) player.userData._hp = 0;
    addMessage('☠️ Halok!', '#ff2222');
    respawn();
  }
}
if (self.material) self.material.emissiveIntensity = 0.5 + Math.abs(Math.sin(time*5))*0.6;`,
    physicsMode: 'solid', tag: 'killzone'
  },
  speedboost: {
    name: 'SpeedBoost',
    color: 0x39ff14, emissive: 0x22dd00, emissiveIntensity: 0.6,
    geo: [1.2, 0.1, 1.2], icon: '⚡',
    script: `// ⚡ SPEED BOOST SCRIPTI
if (!self.userData._sbCooldown) self.userData._sbCooldown = 0;
self.userData._sbCooldown -= delta;
const player = scene.children.find(o=>o.userData&&o.userData._type==='player');
if (player && self.userData._sbCooldown <= 0) {
  const dx = player.position.x - self.position.x;
  const dz = player.position.z - self.position.z;
  if (Math.sqrt(dx*dx+dz*dz) < 1.5) {
    self.userData._sbCooldown = 3;
    if (typeof playerSpeed !== 'undefined') playerSpeed = (playerSpeed||5) * 2;
    setTimeout(()=>{ if(typeof playerSpeed!=='undefined') playerSpeed = playerSpeed/2; }, 3000);
    addMessage('⚡ Tezlik oshdi! 3 soniya', '#39ff14');
    playSound(660, 0.3);
  }
}
if (self.material) self.material.emissiveIntensity = 0.4 + Math.sin(time*6)*0.4;`,
    physicsMode: 'solid', tag: 'speedboost'
  },
  coin: {
    name: 'Tanga',
    color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 0.4,
    geo: [0.5, 0.08, 0.5], icon: '🪙',
    script: `// 🪙 TANGA SCRIPTI
if (!self.userData._collected) self.userData._collected = false;
if (!self.userData._baseY) self.userData._baseY = self.position.y;
// Suzib turish + aylanish
self.position.y = self.userData._baseY + Math.sin(time*3)*0.15;
self.rotation.y += delta * 2.5;
// Yig'ish
const player = scene.children.find(o=>o.userData&&o.userData._type==='player');
if (player && !self.userData._collected && self.visible) {
  const dx = player.position.x - self.position.x;
  const dy = player.position.y - self.position.y;
  const dz = player.position.z - self.position.z;
  if (Math.sqrt(dx*dx+dy*dy+dz*dz) < 1.2) {
    self.userData._collected = true;
    self.visible = false;
    addScore(10);
    addMessage('+10 🪙', '#ffcc00');
    playSound(880, 0.2);
  }
}`,
    physicsMode: 'solid', tag: 'coin'
  },
  movingplatform: {
    name: 'MovingPlatform',
    color: 0x0088ff, emissive: 0x0044cc, emissiveIntensity: 0.35,
    geo: [3, 0.25, 3], icon: '↔️',
    script: `// ↔️ HARAKATLANUVCHI PLATFORMA
if (!self.userData._mpInit) {
  self.userData._mpInit = true;
  self.userData._mpOrigin = self.position.clone();
  self.userData._mpRange = 4;
  self.userData._mpSpeed = 1.5;
}
const o = self.userData._mpOrigin;
self.position.x = o.x + Math.sin(time * self.userData._mpSpeed) * self.userData._mpRange;
if (self.material) self.material.emissiveIntensity = 0.2 + Math.abs(Math.sin(time*2))*0.2;`,
    physicsMode: 'solid', tag: 'movingplatform'
  },
  jumppad: {
    name: 'JumpPad',
    color: 0xff6b35, emissive: 0xff4400, emissiveIntensity: 0.55,
    geo: [1.5, 0.12, 1.5], icon: '🟠',
    script: `// 🟠 JUMP PAD SCRIPTI
if (!self.userData._jpCooldown) self.userData._jpCooldown = 0;
self.userData._jpCooldown -= delta;
const player = scene.children.find(o=>o.userData&&o.userData._type==='player');
if (player && self.userData._jpCooldown <= 0) {
  const dx = player.position.x - self.position.x;
  const dz = player.position.z - self.position.z;
  if (Math.sqrt(dx*dx+dz*dz) < 1.8) {
    self.userData._jpCooldown = 1;
    if (typeof playerVelocityY !== 'undefined') playerVelocityY = 18;
    else player.position.y += 0.5;
    addMessage('🟠 Hop!', '#ff6b35');
    playSound(440, 0.2); playSound(660, 0.15);
  }
}
if (self.material) self.material.emissiveIntensity = 0.3 + Math.abs(Math.sin(time*4))*0.5;`,
    physicsMode: 'solid', tag: 'jumppad'
  },
};

// Asl spawnFunctionalBlock ni kengaytirish
const _origSpawnFB = window.spawnFunctionalBlock;
window.spawnFunctionalBlock = function(type) {
  // Avval asl cfgMap ni tekshir
  _origSpawnFB && _origSpawnFB(type);
  if (!_extraFuncBlocks[type]) return;

  const cfg = _extraFuncBlocks[type];
  const geo = new THREE.BoxGeometry(...cfg.geo);
  const mat = new THREE.MeshStandardMaterial({
    color: cfg.color, emissive: cfg.emissive,
    emissiveIntensity: cfg.emissiveIntensity,
    transparent: true, opacity: 0.82,
    roughness: 0.3, metalness: 0.4
  });
  const mesh = new THREE.Mesh(geo, mat);

  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  mesh.position.set(
    camera.position.x + camDir.x * 5,
    Math.max(0.1, camera.position.y + camDir.y * 5 - 1),
    camera.position.z + camDir.z * 5
  );

  mesh.userData = {
    name: cfg.name + '_' + (objects.filter(o=>o.userData&&o.userData._funcType===type).length+1),
    _funcType: type, _tag: cfg.tag,
    physicsMode: cfg.physicsMode,
    script: cfg.script, visible: true, _type: 'functional'
  };
  mesh.name = mesh.userData.name;
  mesh.castShadow = mesh.receiveShadow = true;

  scene.add(mesh); objects.push(mesh);
  captureState('functional:' + type);
  updateHierarchy(); selectObject(mesh);
  log(`${cfg.icon} ${cfg.name} qo'shildi`, 'lok');
};
