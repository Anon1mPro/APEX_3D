// RAYCASTER
const raycaster = new THREE.Raycaster();
const mouse2 = new THREE.Vector2();
canvas.addEventListener('click', e=>{
  if (isOrbiting || camMode==='fps') return;
  const rect=canvas.getBoundingClientRect();
  mouse2.x=((e.clientX-rect.left)/rect.width)*2-1;
  mouse2.y=-((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(mouse2,camera);

  // Avval light markerlarini tekshiramiz
  const lightMarkers = lights.filter(l=>l.marker).map(l=>l.marker);
  const lhits = raycaster.intersectObjects(lightMarkers, true);
  if (lhits.length > 0) {
    const hitMarker = lhits[0].object;
    const entry = lights.find(l=>l.marker===hitMarker || (l.marker && l.marker.children.includes(hitMarker)));
    if (entry) {
      clearMultiSelect();
      selectLight(entry);
      return;
    }
  }

  const hits=raycaster.intersectObjects([...objects], true);
  if (hits.length>0) {
    let hit = hits[0].object;
    while (hit.parent && !objects.includes(hit)) hit = hit.parent;

    if (e.shiftKey) {
      // SHIFT+CLICK — multi-select
      // Avvalgi yagona tanlovni ham multi ga qo'shish
      if (selectedObj && !multiSelected.has(selectedObj)) {
        addToMultiSelect(selectedObj);
        if (outlineMesh) { scene.remove(outlineMesh); outlineMesh=null; }
        selectedObj = null;
      }
      addToMultiSelect(hit);
      updateHierarchy();
    } else {
      // Oddiy click — multi-selectni tozalab yagona tanlash
      clearMultiSelect();
      selectObject(hit);
    }
  } else {
    if (!e.shiftKey) {
      clearMultiSelect();
      if(outlineMesh){scene.remove(outlineMesh);outlineMesh=null;}
      selectedObj=null; selectedLight=null; updateHierarchy(); updateInspector();
      updateGizmo();
    }
  }
});
