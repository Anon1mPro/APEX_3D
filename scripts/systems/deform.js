// ============================================================
// JELLY / LIQUID / CLOTH UPDATE (in animate loop)
// ============================================================
function updateSpecialPhysics(delta) {
  // JELLY
  jellyObjects.forEach((jd, o) => {
    if (!o.parent) { jellyObjects.delete(o); return; }
    jd.phase += delta * 5;
    // Decay amplitude
    jd.amp = Math.max(0, jd.amp - delta * 0.4);
    const pos = o.geometry.attributes.position;
    const orig = jd.orig;
    const A = 0.04 + jd.amp;
    for (let i=0; i<pos.count; i++) {
      const ox=orig[i*3], oy=orig[i*3+1], oz=orig[i*3+2];
      const dist = Math.sqrt(ox*ox+oy*oy+oz*oz);
      const wave = Math.sin(jd.phase + dist*3.5) * A;
      pos.setXYZ(i,
        ox + ox*wave*0.4,
        oy + oy*wave*0.5,
        oz + oz*wave*0.4
      );
    }
    pos.needsUpdate = true;
    o.geometry.computeVertexNormals();
  });

  // LIQUID drops
  liquidObjects.forEach((ld, o) => {
    if (!o.parent) { ld.drops.forEach(d=>scene.remove(d.mesh)); liquidObjects.delete(o); return; }
    ld.drops.forEach(d => {
      d.vel.y -= delta * 0.05;
      d.mesh.position.addScaledVector(d.vel, 1);
      d.life += delta * 0.3;
      if (d.life > 1 || d.mesh.position.y < 0) {
        // Reset drop to object surface
        d.mesh.position.copy(o.position).add(new THREE.Vector3((Math.random()-.5)*.5,(Math.random()-.5)*.3,(Math.random()-.5)*.5));
        d.vel.set((Math.random()-.5)*.025, -0.008-Math.random()*.02, (Math.random()-.5)*.025);
        d.life = 0;
      }
    });
  });

  // CLOTH
  clothObjects.forEach((cd, o) => {
    if (!o.parent) { clothObjects.delete(o); return; }
    const posAttr = o.geometry.attributes.position;
    const wind = Math.sin(Date.now()*0.001)*0.002;
    cd.verts.forEach((v,i) => {
      if (v.pinned) return;
      v.vy -= 0.003; // gravity
      v.vx += wind;
      v.vx *= 0.98; v.vy *= 0.98; v.vz *= 0.98;
      v.x += v.vx; v.y += v.vy; v.z += v.vz;
      if (v.y < -1.5) { v.y = -1.5; v.vy *= -0.2; }
      posAttr.setXYZ(i, v.x, v.y, v.z);
    });
    posAttr.needsUpdate = true;
    o.geometry.computeVertexNormals();
  });
}
