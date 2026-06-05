// ============================================================
// PARTICLE SYSTEM
// ============================================================
// particleSystems yuqorida e'lon qilingan

function createParticleSystem(opts={}) {
  const count = opts.count || 400;
  const geo = new THREE.BufferGeometry();
  const pos    = new Float32Array(count*3);
  const vel    = new Float32Array(count*3);
  const life   = new Float32Array(count);
  const maxLife= new Float32Array(count);

  for (let i=0;i<count;i++) {
    pos[i*3]   = (Math.random()-.5)*2;
    pos[i*3+1] = 0;
    pos[i*3+2] = (Math.random()-.5)*2;
    life[i]    = Math.random();
    maxLife[i] = 1 + Math.random()*2;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const col = opts.color || 0x00e5ff;
  const mat = new THREE.PointsMaterial({
    color:col, size:opts.size||0.09,
    transparent:true, opacity:0.88,
    blending:THREE.AdditiveBlending, depthWrite:false
  });
  const mesh = new THREE.Points(geo, mat);
  mesh.position.copy(opts.pos || new THREE.Vector3(0,1,0));

  // Attach to parent if given
  if (opts.parent) {
    opts.parent.add(mesh);
    mesh.position.set(0, opts.parentOffset||0.5, 0);
  } else {
    scene.add(mesh);
  }

  const id = ++psIdC;
  const ps = {
    id, mesh, geo, pos, vel, life, maxLife, count,
    name: opts.name || `Zarrachalar ${id}`,
    type: 'particles',
    // Force settings
    mode:     opts.mode     || 'up',      // up|down|explode|implode|vortex|tornado|orbit|random|camera_attract|camera_repel
    speed:    opts.speed    || 0.06,
    spread:   opts.spread   || 0.05,
    gravity:  opts.gravity  || 0,
    turbulence: opts.turbulence || 0.002,
    camForce: opts.camForce || 0,         // camera attract/repel strength
    reversed: opts.reversed || false,
    vortexSpeed: opts.vortexSpeed || 1.0,
    parent: opts.parent || null,
  };
  ps.userData = {id, name:ps.name, type:'Zarrachalar'};
  mesh.userData = ps.userData;

  // Init velocities based on mode
  _psInitVel(ps);

  particleSystems.push(ps);
  updateHierarchy();
  log(`✨ ${ps.name} yaratildi (${count} zarra)`, 'lok');
  return ps;
}

function _psInitVel(ps) {
  const {pos, vel, count, mode, speed, spread, reversed} = ps;
  const dir = reversed ? -1 : 1;
  for (let i=0; i<count; i++) {
    const a = Math.random()*Math.PI*2;
    const r = Math.random()*spread;
    switch(mode) {
      case 'up':
        vel[i*3]   = (Math.random()-.5)*spread;
        vel[i*3+1] = dir*(0.02+Math.random()*speed);
        vel[i*3+2] = (Math.random()-.5)*spread;
        break;
      case 'down':
        vel[i*3]   = (Math.random()-.5)*spread;
        vel[i*3+1] = -dir*(0.02+Math.random()*speed);
        vel[i*3+2] = (Math.random()-.5)*spread;
        break;
      case 'explode':
        vel[i*3]   = dir*(Math.random()-.5)*speed*2;
        vel[i*3+1] = dir*(Math.random()-.5)*speed*2;
        vel[i*3+2] = dir*(Math.random()-.5)*speed*2;
        break;
      case 'implode':
        vel[i*3]   = -dir*(Math.random()-.5)*speed*2;
        vel[i*3+1] = -dir*(Math.random()-.5)*speed*2;
        vel[i*3+2] = -dir*(Math.random()-.5)*speed*2;
        break;
      case 'vortex':
      case 'tornado':
        vel[i*3]   = dir*Math.cos(a)*speed;
        vel[i*3+1] = dir*(0.01+Math.random()*speed*0.5);
        vel[i*3+2] = dir*Math.sin(a)*speed;
        break;
      case 'orbit':
        vel[i*3]   = dir*Math.cos(a)*speed;
        vel[i*3+1] = 0;
        vel[i*3+2] = dir*Math.sin(a)*speed;
        break;
      case 'random':
      default:
        vel[i*3]   = (Math.random()-.5)*speed;
        vel[i*3+1] = (Math.random()-.5)*speed;
        vel[i*3+2] = (Math.random()-.5)*speed;
    }
  }
}

window.addParticles = function(parentObj) {
  const parent = parentObj || (selectedObj && !selectedObj.userData?.type?.includes('Zarrachalar') ? selectedObj : null);

  const options = [
    {name:'Olov 🔥',    color:0xff4400, speed:0.06, size:0.10, count:400, spread:0.04, mode:'up',     gravity:-0.001},
    {name:'Sehrli ✨',  color:0x88aaff, speed:0.04, size:0.07, count:300, spread:0.08, mode:'up'},
    {name:'Qor ❄️',     color:0xccddff, speed:0.02, size:0.06, count:500, spread:0.12, mode:'down',   gravity:0.001},
    {name:'Neon 💫',    color:0x00ffaa, speed:0.05, size:0.08, count:350, spread:0.05, mode:'up'},
    {name:'Portlash 💥',color:0xff8800, speed:0.12, size:0.12, count:500, spread:0.1,  mode:'explode'},
    {name:'Vortex 🌀',  color:0xcc88ff, speed:0.06, size:0.08, count:400, spread:0.06, mode:'vortex'},
    {name:'Tornado 🌪', color:0xaaddff, speed:0.05, size:0.07, count:600, spread:0.05, mode:'tornado'},
    {name:'Orbit ⭕',   color:0xffee00, speed:0.06, size:0.08, count:300, spread:0.04, mode:'orbit'},
    {name:'Tomon →',    color:0xff6688, speed:0.07, size:0.08, count:300, spread:0.03, mode:'explode'},
  ];

  const m = document.createElement('div');
  m.classList.add('ui-popup');
m.style.cssText='min-width:180px;top:60px;left:50%;transform:translateX(-50%)';

  if (parent) {
    const lbl = document.createElement('div');
    lbl.classList.add('ui-section-label');
    lbl.textContent = `+ "${parent.userData?.name}" ichiga`;
    m.appendChild(lbl);
  }

  options.forEach(o=>{
    const b = document.createElement('button');
    b.textContent = o.name;
    b.classList.add('ui-menu-item');
    b.onmouseover=()=>b.style.background='var(--hover)';
    b.onmouseout=()=>b.style.background='none';
    b.onclick=()=>{
      const pos = parent ? new THREE.Vector3(0,0,0) : new THREE.Vector3((Math.random()-.5)*6,0,(Math.random()-.5)*6);
      createParticleSystem({...o, pos, parent: parent||null});
      if (m.parentNode) m.parentNode.removeChild(m);
    };
    m.appendChild(b);
  });
  document.body.appendChild(m);
  setTimeout(()=>document.addEventListener('click',function rm(ev){if(!m.contains(ev.target)){if(m.parentNode)m.parentNode.removeChild(m);document.removeEventListener('click',rm)}},100));
};

// Add particles/light to selected object
window.addParticlesToObj = function() {
  if (!selectedObj) { log('⚠ Avval obyekt tanlang','lw'); return; }
  addParticles(selectedObj);
};

window.addLightToObj = function() {
  if (!selectedObj) { log('⚠ Avval obyekt tanlang','lw'); return; }
  const m = document.createElement('div');
  m.classList.add('ui-popup');
m.style.cssText='min-width:200px;top:50%;left:50%;transform:translate(-50%,-50%)';
  const lbl = document.createElement('div');
  lbl.classList.add('ui-section-label');
  lbl.textContent = `💡 "${selectedObj.userData?.name}" ichiga yorug'lik`;
  m.appendChild(lbl);

  [
    ['☀️ Sun — Quyosh nuri','sun'],
    ['🔦 Headlight — Fanar/Fara','headlight'],
    ['Point 💡 — Shar nur','point'],
    ['Spot 🔦 — Konusli nur','spot'],
    ['Directional ☀ — Parallel','directional'],
  ].forEach(([name,type])=>{
    const b = document.createElement('button');
    b.textContent = name;
    b.classList.add('ui-menu-item');
    b.onmouseover=()=>b.style.background='var(--hover)';
    b.onmouseout=()=>b.style.background='none';
    b.onclick=()=>{
      if (type==='sun') {
        createSunLight({pos:new THREE.Vector3(0,3,0), parent:selectedObj});
      } else if (type==='headlight') {
        createHeadlight({pos:new THREE.Vector3(0,0.3,0.5), parent:selectedObj});
      } else {
        const lDef={point:{color:0xffffff,intensity:3,distance:10},spot:{color:0xffffff,intensity:5,distance:15},directional:{color:0xfff0dd,intensity:2}};
        const cfg=lDef[type];
        createLight(type,{...cfg,pos:new THREE.Vector3(0,0.5,0),parent:selectedObj});
      }
      log(`💡 "${selectedObj.userData.name}" ichiga ${type} yorug'lik qo'shildi`, 'lok');
      if(m.parentNode) m.parentNode.removeChild(m);
    };
    m.appendChild(b);
  });
  document.body.appendChild(m);
  setTimeout(()=>document.addEventListener('click',function rm(ev){if(!m.contains(ev.target)){if(m.parentNode)m.parentNode.removeChild(m);document.removeEventListener('click',rm)}},100));
};

// Bir marta ajratilgan — GC bosimini kamaytiradi
const _psEmitterWorld = new THREE.Vector3();
const _psWPos        = new THREE.Vector3();

function updateParticles(delta) {
  particleSystems.forEach(ps=>{
    const pos = ps.geo.attributes.position.array;
    const vel = ps.vel;
    const camPos = camera.position;

    // World position of emitter — har ps uchun bir marta, reuse
    ps.mesh.getWorldPosition(_psEmitterWorld);
    const ewx = _psEmitterWorld.x, ewy = _psEmitterWorld.y, ewz = _psEmitterWorld.z;
    const hasCamForce = ps.camForce !== 0;

    for (let i=0; i<ps.count; i++) {
      const i3 = i*3;
      const px = pos[i3], py = pos[i3+1], pz = pos[i3+2];

      // Life
      ps.life[i] += delta / ps.maxLife[i];
      if (ps.life[i] >= 1) {
        ps.life[i] = 0;
        pos[i3]   = (Math.random()-.5)*0.5;
        pos[i3+1] = 0;
        pos[i3+2] = (Math.random()-.5)*0.5;
        _psResetVel(ps, i);
        continue;
      }

      // Turbulence
      if (ps.turbulence > 0) {
        vel[i3]   += (Math.random()-.5)*ps.turbulence;
        vel[i3+1] += (Math.random()-.5)*ps.turbulence;
        vel[i3+2] += (Math.random()-.5)*ps.turbulence;
      }

      // Gravity
      vel[i3+1] -= ps.gravity;

      // Vortex spin — particles spiral around Y axis
      if (ps.mode==='vortex'||ps.mode==='tornado') {
        const len = Math.sqrt(px*px+pz*pz)||0.001;
        const spinX = -pz/len * ps.vortexSpeed * delta;
        const spinZ =  px/len * ps.vortexSpeed * delta;
        vel[i3]   += spinX*0.15;
        vel[i3+2] += spinZ*0.15;
        if (ps.mode==='tornado') {
          vel[i3]   -= px*0.05*delta;
          vel[i3+2] -= pz*0.05*delta;
          vel[i3+1] += ps.speed*delta*2;
        }
        if (Math.sqrt(px*px+pz*pz) > 2) { vel[i3]*=0.97; vel[i3+2]*=0.97; }
      }

      // Orbit — circular motion
      if (ps.mode==='orbit') {
        const len = Math.sqrt(px*px+pz*pz)||0.001;
        vel[i3]   += -pz/len * ps.vortexSpeed * delta * 0.3;
        vel[i3+2] +=  px/len * ps.vortexSpeed * delta * 0.3;
        vel[i3]   -= px*0.02*delta;
        vel[i3+2] -= pz*0.02*delta;
      }

      // Camera force — object yaratmasdan sof arifmetika
      if (hasCamForce) {
        const wx = px + ewx, wy = py + ewy, wz = pz + ewz;
        const dx = camPos.x - wx;
        const dy = camPos.y - wy;
        const dz = camPos.z - wz;
        const dist = Math.sqrt(dx*dx+dy*dy+dz*dz)||1;
        const f = ps.camForce / (dist*dist);
        vel[i3]   += dx/dist * f * delta;
        vel[i3+1] += dy/dist * f * delta;
        vel[i3+2] += dz/dist * f * delta;
      }

      // Implode pull back to center
      if (ps.mode==='implode') {
        vel[i3]   -= px*0.04*delta;
        vel[i3+1] -= py*0.04*delta;
        vel[i3+2] -= pz*0.04*delta;
      }

      pos[i3]   += vel[i3];
      pos[i3+1] += vel[i3+1];
      pos[i3+2] += vel[i3+2];

      // Speed limit
      const vx=vel[i3], vy=vel[i3+1], vz=vel[i3+2];
      const vlen = Math.sqrt(vx*vx+vy*vy+vz*vz);
      if (vlen > 0.3) { const inv=0.3/vlen; vel[i3]*=inv; vel[i3+1]*=inv; vel[i3+2]*=inv; }
    }
    ps.geo.attributes.position.needsUpdate = true;
  });
}

function _psResetVel(ps, i) {
  const a = Math.random()*Math.PI*2;
  const dir = ps.reversed ? -1 : 1;
  const sp = ps.speed, spr = ps.spread;
  switch(ps.mode) {
    case 'up':    ps.vel[i*3]=(Math.random()-.5)*spr; ps.vel[i*3+1]=dir*(0.02+Math.random()*sp); ps.vel[i*3+2]=(Math.random()-.5)*spr; break;
    case 'down':  ps.vel[i*3]=(Math.random()-.5)*spr; ps.vel[i*3+1]=-dir*(0.02+Math.random()*sp); ps.vel[i*3+2]=(Math.random()-.5)*spr; break;
    case 'explode': ps.vel[i*3]=dir*(Math.random()-.5)*sp*2; ps.vel[i*3+1]=dir*(Math.random()-.5)*sp*2; ps.vel[i*3+2]=dir*(Math.random()-.5)*sp*2; break;
    case 'vortex': case 'tornado': ps.vel[i*3]=dir*Math.cos(a)*sp; ps.vel[i*3+1]=dir*(0.01+Math.random()*sp*0.5); ps.vel[i*3+2]=dir*Math.sin(a)*sp; break;
    case 'orbit':  ps.vel[i*3]=dir*Math.cos(a)*sp; ps.vel[i*3+1]=0; ps.vel[i*3+2]=dir*Math.sin(a)*sp; break;
    default:       ps.vel[i*3]=(Math.random()-.5)*sp; ps.vel[i*3+1]=(Math.random()-.5)*sp; ps.vel[i*3+2]=(Math.random()-.5)*sp;
  }
}
