
// ============================================================
//  APEX3D ENGINE v2 — Full Featured
// ============================================================
const $ = id => document.getElementById(id);
const consoleEl = $('console-body');

// ============================================================
// UNDO / REDO SYSTEM
// ============================================================
const undoStack = [];
const redoStack = [];
const MAX_UNDO = 50;

function captureState(label='') {
  const snap = {
    label,
    objects: objects.map(o => ({
      uuid: o.uuid,
      pos: o.position.clone(),
      rot: o.rotation.clone(),
      sca: o.scale.clone(),
      color: o.material ? o.material.color.clone() : null,
      roughness: o.material?.roughness,
      metalness: o.material?.metalness,
      emissiveHex: o.material?.emissive ? o.material.emissive.getHex() : 0,
      opacity: o.material?.opacity ?? 1,
      transparent: o.material?.transparent ?? false,
    }))
  };
  undoStack.push(snap);
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack.length = 0;
}

function applySnapshot(snap) {
  snap.objects.forEach(s => {
    const obj = objects.find(o => o.uuid === s.uuid);
    if (!obj) return;
    obj.position.copy(s.pos);
    obj.rotation.copy(s.rot);
    obj.scale.copy(s.sca);
    if (obj.material && s.color) {
      obj.material.color.copy(s.color);
      obj.material.roughness = s.roughness;
      obj.material.metalness = s.metalness;
      if (obj.material.emissive) obj.material.emissive.setHex(s.emissiveHex);
      obj.material.opacity = s.opacity;
      obj.material.transparent = s.transparent;
      obj.material.needsUpdate = true;
    }
  });
  if (selectedObj) updateInspector();
  updateHierarchy();
}

function showUndoToast(msg) {
  const t = $('undo-toast');
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._tmr);
  t._tmr = setTimeout(() => t.style.opacity = '0', 1400);
}

window.undo = function() {
  if (undoStack.length < 2) { showUndoToast('⚠ Bekor qilinadigan narsa yo\'q'); return; }
  const cur = undoStack.pop();
  redoStack.push(cur);
  const prev = undoStack[undoStack.length - 1];
  applySnapshot(prev);
  showUndoToast('↩ Bekor qilindi: ' + (cur.label || 'amal'));
};

window.redo = function() {
  if (!redoStack.length) { showUndoToast('⚠ Qayta qilinadigan narsa yo\'q'); return; }
  const next = redoStack.pop();
  undoStack.push(next);
  applySnapshot(next);
  showUndoToast('↪ Qaytarildi: ' + (next.label || 'amal'));
};

