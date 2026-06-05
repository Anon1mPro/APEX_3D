// KEYBOARD SHORTCUTS
document.addEventListener('keydown', e=>{
  if (e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA') return;

  // ── PLAY MODE — faqat F5/Esc ishlaydi, WASD ni PlayerController ga o'tkazamiz ──
  if (isPlaying) {
    if (e.key === 'F5') { e.preventDefault(); $('play-btn')?.click(); return; }
    if (e.key === 'Escape') { $('play-btn')?.click(); return; }
    // Boshqa barcha tugmalar PlayerController._onKey ga o'tsin (stopImmediatePropagation YO'Q!)
    return;
  }

  // ── EDIT MODE (ob'ektga yopishgan holat) ──────────────────
  if (editMode.active) {
    editModeKeyDown(e);
    return;
  }

  // FPS rejimda — faqat Escape ishlaydi
  if (camMode==='fps') {
    if (e.key==='Escape') { setCamMode('orbit'); document.exitPointerLock?.(); }
    return;
  }

  // Quyidagilar faqat ORBIT/normal rejimda ishlaydi:
  if (e.key==='Delete'||e.key==='Backspace') {
    if (multiSelected.size > 0) window.multiDelete?.();
    else window.deleteSel?.();
  }
  if ((e.key==='f'||e.key==='F') && !e.ctrlKey && selectedObj) {
    enterEditMode();
  }
  if (e.ctrlKey && (e.key==='d'||e.key==='D')) {
    e.preventDefault();
    if (multiSelected.size > 1) window.multiDuplicate?.();
    else window.duplicateSel?.();
  }
  if (e.ctrlKey && (e.key==='f'||e.key==='F')) {
    e.preventDefault();
    if (multiSelected.size > 1) window.multiGroup?.();
    else if (selectedObj) log('⚠ Ctrl+F: kamida 2 ta obyektni Shift+click bilan tanlang', 'lw');
  }
  if (e.ctrlKey && (e.key==='s'||e.key==='S')) { e.preventDefault(); window.saveScene?.(); }
  if (e.ctrlKey && (e.key==='z'||e.key==='Z') && !e.shiftKey) { e.preventDefault(); window.undo?.(); }
  if (e.ctrlKey && (e.key==='y'||e.key==='Y' || (e.key==='z'&&e.shiftKey))) { e.preventDefault(); window.redo?.(); }
  if (e.ctrlKey && (e.key==='p'||e.key==='P')) { e.preventDefault(); window.takeScreenshot?.(); }
  // F5 — O'yna/To'xtat
  if (e.key==='F5') { e.preventDefault(); $('play-btn')?.click(); }
  // F11 — Fullscreen
  if (e.key==='F11') { e.preventDefault(); window.toggleFullscreen?.(); }
  // C — Collider viz toggle
  if (!e.ctrlKey && (e.key==='c'||e.key==='C') && !isPlaying) { window.toggleColliderVis?.(); }
  // G — Grid snap toggle
  if (!e.ctrlKey && (e.key==='g'||e.key==='G') && !isPlaying) { EditorTools.toggleSnap(); }
  if (!e.ctrlKey) {
    // Editor modeda gizmo shortcuts: 1=select 2=move 3=rotate 4=scale
    if (e.key==='1') setGizmoMode('select');
    if (e.key==='2') setGizmoMode('move');
    if (e.key==='3') setGizmoMode('rotate');
    if (e.key==='4') setGizmoMode('scale');
    // I — Timeline keyframe qo'shish
    if (e.key==='i'||e.key==='I') {
      window.tlAddKeyframe?.();
    }
    if (e.code==='Space') e.preventDefault();
  }
});
