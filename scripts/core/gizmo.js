// ============================================================
// TRANSFORM GIZMO (Move / Rotate / Scale axes)
// ============================================================
let gizmoMode = 'select'; // select | move | rotate | scale
let gizmoDragging = null; // null | 'x' | 'y' | 'z'
let gizmoDragStart = {mx:0, my:0};
let gizmoDragStartVal = new THREE.Vector3();

function setGizmoMode(mode) {
  gizmoMode = mode;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  const ids = {select:'tool-select', move:'tool-move', rotate:'tool-rotate', scale:'tool-scale'};
  $(ids[mode])?.classList.add('active');
  const labels = {select:'SEL', move:'MOVE', rotate:'ROT', scale:'SCL'};
  $('gizmo-lbl').textContent = 'GIZMO:' + (labels[mode]||mode.toUpperCase());
  updateGizmo();
}

['select','move','rotate','scale'].forEach(t=>{
  $(('tool-'+t))?.addEventListener('click', function(){
    setGizmoMode(t);
  });
});

function worldToScreen(vec3) {
  const v = vec3.clone().project(camera);
  const rect = cvp.getBoundingClientRect();
  return {
    x: (v.x + 1) / 2 * rect.width,
    y: (-v.y + 1) / 2 * rect.height
  };
}

// Gizmo uchun active target (object yoki light)
function gizmoTarget() {
  if (selectedObj) return { pos: selectedObj.position, isLight: false };
  if (selectedLight) return { pos: selectedLight.light.position, isLight: true, entry: selectedLight };
  return null;
}

function updateGizmo() {
  const axes = ['x','y','z'];

  // Hide rotate rings always first, then show if needed
  ['x','y','z'].forEach(a => $('rot-ring-'+a).style.display = 'none');

  const tgt = gizmoTarget();
  // PlayerController aktiv bo'lsa yoki play modeda gizmoni yashir
  // Faqat FPS kamera rejimida (editor) yashir — PlayerController rejimida emas
  const hideDueToFPS = camMode === 'fps' && !PlayerController.obj && !isPlaying;
  if (!tgt || gizmoMode === 'select' || hideDueToFPS || isPlaying) {
    axes.forEach(a => $('gizmo-'+a).style.display = 'none');
    return;
  }
  // Light uchun scale mode ishlamaydi
  if (tgt.isLight && gizmoMode === 'scale') {
    axes.forEach(a => $('gizmo-'+a).style.display = 'none');
    return;
  }

  // ── ROTATE MODE: show 3 ellipse rings ──────────────────────
  if (gizmoMode === 'rotate') {
    // Light uchun rotate — faqat sun/headlight da ishlaydi, gizmo orqali rotX/rotY o'zgartiradi
    if (tgt.isLight) {
      const lt = tgt.entry;
      if (lt.type !== 'sun' && lt.type !== 'headlight') {
        axes.forEach(a => $('gizmo-'+a).style.display = 'none');
        return;
      }
    }
    axes.forEach(a => $('gizmo-'+a).style.display = 'none');

    const origin = tgt.pos.clone();
    const os = worldToScreen(origin);

    // Project a 3D circle onto screen correctly:
    // Sample N points, find the true ellipse parameters via SVG transform
    // We keep cx,cy fixed at screen center of object,
    // and derive rx,ry,angle by projecting 3 key points on the circle.
    function projectRing(perpA, perpB, r) {
      // Sample points to find screen bounding extents accurately
      const N = 64;
      const pts = [];
      for (let i = 0; i < N; i++) {
        const t = (i / N) * Math.PI * 2;
        const world = origin.clone()
          .addScaledVector(perpA, Math.cos(t) * r)
          .addScaledVector(perpB, Math.sin(t) * r);
        pts.push(worldToScreen(world));
      }
      // Find bounding box
      let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
      pts.forEach(p=>{
        if(p.x<minX)minX=p.x; if(p.x>maxX)maxX=p.x;
        if(p.y<minY)minY=p.y; if(p.y>maxY)maxY=p.y;
      });
      const cx=(minX+maxX)/2, cy=(minY+maxY)/2;
      const rx=(maxX-minX)/2, ry=(maxY-minY)/2;
      // Label at topmost point
      let topPt=pts[0];
      pts.forEach(p=>{ if(p.y<topPt.y) topPt=p; });
      return {cx, cy, rx: Math.max(6,rx), ry: Math.max(3,ry), labelX:topPt.x, labelY:topPt.y-8};
    }

    // Halqa radiusi: ekranda har doim ~70px bo'lsin
    // world_size = screen_px * (2 * tan(fov/2) * distance) / screen_height
    const fovRad = camera.fov * Math.PI / 180;
    const dist = spherical.radius;
    const screenPx = 70; // ekranda necha pixel
    const wr = screenPx * 2 * Math.tan(fovRad/2) * dist / canvas.clientHeight;

    // Y-axis ring (gorizontal) — ko'k — perp: X, Z
    const ey = projectRing(new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,1), wr);
    // X-axis ring (vertikal) — yashil — perp: Y, Z
    const ex = projectRing(new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,1), wr * 1.12);
    // Z-axis ring — sariq — perp: X, Y
    const ez = projectRing(new THREE.Vector3(1,0,0), new THREE.Vector3(0,1,0), wr * 1.24);

    // Helper to apply ellipse + optional transform
    function applyEllipse(axisId, e) {
      const el  = $('rot-'+axisId+'-ellipse');
      const hit = $('rot-'+axisId+'-hit');
      const lbl = $('rot-'+axisId+'-lbl');
      const grp = $('rot-ring-'+axisId);
      if (!grp) return;
      grp.style.display = '';
      [el, hit].forEach(elem => {
        if (!elem) return;
        elem.setAttribute('cx', e.cx);
        elem.setAttribute('cy', e.cy);
        elem.setAttribute('rx', e.rx);
        elem.setAttribute('ry', e.ry);
        // Remove old transform
        elem.removeAttribute('transform');
      });
      if (lbl) {
        lbl.setAttribute('x', e.labelX + 4);
        lbl.setAttribute('y', e.labelY);
      }
    }

    applyEllipse('y', ey);
    applyEllipse('x', ex);
    applyEllipse('z', ez);

    return; // don't draw arrow lines in rotate mode
  }

  // ── MOVE / SCALE MODE: show arrow axes ────────────────────
  const origin = tgt.pos.clone();
  const length = Math.max(1.8, spherical.radius * 0.13);
  const dirs = {
    x: new THREE.Vector3(1,0,0),
    y: new THREE.Vector3(0,1,0),
    z: new THREE.Vector3(0,0,1),
  };
  axes.forEach(a => {
    const tip = origin.clone().addScaledVector(dirs[a], length);
    const os = worldToScreen(origin);
    const ts = worldToScreen(tip);
    const line = $('g'+a+'-line');
    const lbl = $('g'+a+'-lbl');
    const hit = $('g'+a+'-hit');
    const grp = $('gizmo-'+a);
    grp.style.display = '';
    line.setAttribute('x1', os.x); line.setAttribute('y1', os.y);
    line.setAttribute('x2', ts.x); line.setAttribute('y2', ts.y);
    lbl.setAttribute('x', ts.x + 4); lbl.setAttribute('y', ts.y + 4);
    const dx = ts.x - os.x, dy = ts.y - os.y;
    hit.setAttribute('x', Math.min(os.x, ts.x) - 7);
    hit.setAttribute('y', Math.min(os.y, ts.y) - 7);
    hit.setAttribute('width', Math.abs(dx) + 14);
    hit.setAttribute('height', Math.abs(dy) + 14);
  });
}

// Gizmo drag events
['x','y','z'].forEach(axis => {
  const grp = $('gizmo-'+axis);
  grp.addEventListener('mousedown', e => {
    const tgt = gizmoTarget();
    if (!tgt || gizmoMode === 'select') return;
    e.stopPropagation();
    gizmoDragging = axis;
    gizmoDragStart = {mx: e.clientX, my: e.clientY};
    gizmoDragStartVal.copy(tgt.pos);
    captureState('Transform');
    grp.classList.add('drag');
    document.body.style.cursor = axis === 'y' ? 'ns-resize' : 'ew-resize';
  });
});

// Rotate ring drag events
['x','y','z'].forEach(axis => {
  const grp = $('rot-ring-'+axis);
  if (!grp) return;
  grp.addEventListener('mousedown', e => {
    const tgt = gizmoTarget();
    if (!tgt) return;
    e.stopPropagation();
    gizmoDragging = axis;
    gizmoDragStart = {mx: e.clientX, my: e.clientY};
    if (tgt.isLight && tgt.entry) {
      // Light uchun rotX/rotY boshlanish qiymati
      gizmoDragStartVal.set(tgt.entry.rotX||0, tgt.entry.rotY||0, 0);
    } else if (selectedObj) {
      gizmoDragStartVal.set(selectedObj.rotation.x, selectedObj.rotation.y, selectedObj.rotation.z);
    }
    captureState('Rotate');
    grp.style.opacity = '0.7';
    document.body.style.cursor = axis === 'y' ? 'ew-resize' : axis === 'x' ? 'ns-resize' : 'nesw-resize';
  });
});

document.addEventListener('mousemove', e => {
  if (!gizmoDragging) return;
  const tgt = gizmoTarget();
  if (!tgt) return;

  const dx = e.clientX - gizmoDragStart.mx;
  const dy = e.clientY - gizmoDragStart.my;
  const rect = cvp.getBoundingClientRect();
  const sens = spherical.radius / rect.width * 2.5;

  if (gizmoMode === 'move') {
    if (tgt.isLight) {
      // Light siljitish
      const l = tgt.entry;
      if (gizmoDragging === 'x') l.light.position.x = EditorTools.snapValue(gizmoDragStartVal.x + dx * sens);
      if (gizmoDragging === 'y') l.light.position.y = EditorTools.snapValue(gizmoDragStartVal.y - dy * sens);
      if (gizmoDragging === 'z') l.light.position.z = EditorTools.snapValue(gizmoDragStartVal.z + dx * sens);
      // Marker ham siljitamiz
      if (l.marker) l.marker.position.copy(l.light.position);
      if (l.helper) l.helper.update?.();
      // Inspector pozitsiyasini yangilaymiz
      if ($('lpx')) {
        $('lpx').value = l.light.position.x.toFixed(2);
        $('lpy').value = l.light.position.y.toFixed(2);
        $('lpz').value = l.light.position.z.toFixed(2);
      }
    } else {
      const o = selectedObj;
      if (gizmoDragging === 'x') o.position.x = EditorTools.snapValue(gizmoDragStartVal.x + dx * sens);
      if (gizmoDragging === 'y') o.position.y = EditorTools.snapValue(gizmoDragStartVal.y - dy * sens);
      if (gizmoDragging === 'z') o.position.z = EditorTools.snapValue(gizmoDragStartVal.z + dx * sens);
      if (outlineMesh) outlineMesh.position.copy(o.position);
      if ($('px')) { $('px').value=o.position.x.toFixed(2); $('py').value=o.position.y.toFixed(2); $('pz').value=o.position.z.toFixed(2); }
    }
  } else if (gizmoMode === 'rotate') {
    const speed = 0.015;
    if (tgt.isLight && tgt.entry) {
      // Sun / Headlight uchun rotX/rotY burchagini o'zgartirish
      const l = tgt.entry;
      if (gizmoDragging === 'y') l.rotY = gizmoDragStartVal.y + dx * speed * 60; // 60 = deg sensitivity
      if (gizmoDragging === 'x') l.rotX = Math.max(-89, Math.min(89, gizmoDragStartVal.x - dy * speed * 60));
      if (gizmoDragging === 'z') l.rotY = gizmoDragStartVal.y + dx * speed * 60;
      applyLightRotation(l);
      // Inspector slayderlarini yangilaymiz
      if ($('sl-rx-v')) $('sl-rx-v').textContent = (l.rotX||0).toFixed(0)+'°';
      if ($('sl-ry-v')) $('sl-ry-v').textContent = (l.rotY||0).toFixed(0)+'°';
    } else if (selectedObj) {
      if (gizmoDragging === 'x') selectedObj.rotation.x = gizmoDragStartVal.x + dx * speed;
      if (gizmoDragging === 'y') selectedObj.rotation.y = gizmoDragStartVal.y + dx * speed;
      if (gizmoDragging === 'z') selectedObj.rotation.z = gizmoDragStartVal.z + dy * speed;
      if (outlineMesh) outlineMesh.rotation.copy(selectedObj.rotation);
    }
  } else if (gizmoMode === 'scale') {
    if (!selectedObj) return;
    const factor = 1 + dx * 0.005;
    if (gizmoDragging === 'x') selectedObj.scale.x = Math.max(0.01, gizmoDragStartVal.x * factor);
    if (gizmoDragging === 'y') selectedObj.scale.y = Math.max(0.01, gizmoDragStartVal.y * (1 - dy * 0.005));
    if (gizmoDragging === 'z') selectedObj.scale.z = Math.max(0.01, gizmoDragStartVal.z * factor);
    if (outlineMesh) outlineMesh.scale.copy(selectedObj.scale).multiplyScalar(1.07);
    if ($('sx')) { $('sx').value=selectedObj.scale.x.toFixed(2); $('sy').value=selectedObj.scale.y.toFixed(2); $('sz').value=selectedObj.scale.z.toFixed(2); }
  }
});

document.addEventListener('mouseup', e => {
  if (gizmoDragging) {
    ['x','y','z'].forEach(a => {
      $('gizmo-'+a).classList.remove('drag');
      const rr = $('rot-ring-'+a); if(rr) rr.style.opacity='';
    });
    document.body.style.cursor = '';
    gizmoDragging = null;
  }
});
