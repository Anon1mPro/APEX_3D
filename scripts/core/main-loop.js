let frameCount=0, fpsTimer=0;

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  fpsTimer+=delta; frameCount++;
  if (fpsTimer>=0.5) {
    const fps=Math.round(frameCount/fpsTimer);
    $('fps-d').textContent=fps; $('fps-s').textContent=fps;
    frameCount=0; fpsTimer=0;
  }
  if (isPlaying) {
    playTime+=delta;
    $('time-d').textContent=playTime.toFixed(2)+'s';
  }

  // Physics
  updatePhysics(delta);

  // Special physics (jelly, liquid, cloth)
  updateSpecialPhysics(delta);

  // Particles
  updateParticles(delta);

  // FPS camera
  updateFPS(delta);

  // RMB+WASD: kamera erkin yurishi
  updateRmbCameraMove(delta);

  // Edit mode (F + WASD ob'ekt boshqarish)
  updateEditMode(delta);

  // Timeline animation
  tlUpdate(delta);

  // Player controller (FPS play mode)
  updatePlayer(delta);

  // PlayerController (istalgan ob'ektni boshqarish)
  PlayerController.update(delta);

  // Eshik animatsiyasi (VS open_door / close_door)
  objects.forEach(obj => {
    if (!obj.userData._doorAxis) return;
    const axis = '_door_r' + obj.userData._doorAxis.toUpperCase();
    const target = obj.userData._doorTarget || 0;
    const spd = obj.userData._doorSpeed || 1.5;
    const curR = obj.rotation[obj.userData._doorAxis] || 0;
    const diff = target - curR;
    if (Math.abs(diff) > 0.005) {
      obj.rotation[obj.userData._doorAxis] += diff * spd * delta * 3;
    } else {
      obj.rotation[obj.userData._doorAxis] = target;
    }
  });

  // Car controller
  updateCar(delta);

  // Mashina yaqinligi + kirish promti (har doim ishlaydi)
  updateCarProximity();

  // Animal AI
  updateAnimals(delta);



  // GLB animation mixers (barcha ob'ektlar uchun)
  objects.forEach(o=>{
    if(o.userData && o.userData._mixer) o.userData._mixer.update(delta);
  });
  camModuleUpdate(delta);

  // Script system
  scriptRunAll(delta);
  scriptCheckCollisions();

  // Curve editor redraw (playhead harakati uchun)
  if (ceObjId && $('curve-editor-panel')?.style.display !== 'none') {
    ceDrawCanvas();
  }

  // Update outline
  if (outlineMesh && selectedObj) {
    outlineMesh.position.copy(selectedObj.position);
    outlineMesh.rotation.copy(selectedObj.rotation);
    outlineMesh.scale.copy(selectedObj.scale).multiplyScalar(1.07 + (isPlaying?Math.sin(playTime*4)*0.01:0));
  }
  // Multi-select outlines sync
  multiOutlines.forEach(ol => {
    if (ol.__forObj) {
      ol.position.copy(ol.__forObj.position);
      ol.rotation.copy(ol.__forObj.rotation);
      ol.scale.copy(ol.__forObj.scale).multiplyScalar(ol.__isOutline ? 1.08 : 1.0);
    }
  });

  // Camera object aktiv bo'lsa: mesh yashirin, real kamera kuzatadi
  objects.forEach(o => {
    if (o.userData && o.userData.isCamera && o.userData._isActive && !camPathPlaying) {
      o.visible = false;
      camera.position.copy(o.position);
      camera.rotation.set(o.rotation.x, o.rotation.y, o.rotation.z);
      camera.fov = o.userData.fov || 60;
      camera.updateProjectionMatrix();
    }
  });

  // Update gizmo
  updateGizmo();

  // Orbit fill light in play mode
  if (isPlaying && fill) {
    fill.light.position.x = Math.sin(playTime*0.4)*10;
    fill.light.position.z = Math.cos(playTime*0.4)*10;
    if (fill.helper) fill.helper.update();
  }

  // Rain system update
  RainSystem.update(delta);

  // Multiplayer object sync tracking
  if (typeof trackObjectChanges === 'function') {
    trackObjectChanges();
  }

  // Multiplayer smooth interpolation (remote objects)
  if (typeof MultiplayerSmooth !== 'undefined') {
    MultiplayerSmooth.interpolate(delta);
  }

  // Multiplayer lock indicators
  if (typeof renderLockedIndicators === 'function') {
    renderLockedIndicators();
  }

  // Multiplayer user visualization
  if (typeof MultiplayerViz !== 'undefined') {
    MultiplayerViz.update();
  }

  // Multiplayer player mode update
  if (typeof MultiplayerPlayerMode !== 'undefined') {
    MultiplayerPlayerMode.update(delta);
  }

  renderer.render(scene, camera);
}
