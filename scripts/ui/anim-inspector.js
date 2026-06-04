function showAnimSelectPanel(obj) {
  const old = document.getElementById('anim-select-panel');
  if (old) old.remove();

  const clips   = obj.userData._clips   || [];
  const actions = obj.userData._actions || [];
  if (clips.length <= 1) return;

  const panel = document.createElement('div');
  panel.id = 'anim-select-panel';
  panel.style.cssText = `
    position:fixed; bottom:180px; left:50%; transform:translateX(-50%);
    background:var(--panel); border:1px solid var(--border);
    padding:8px 0; z-index:9998; min-width:240px; box-shadow:0 8px 24px rgba(0,0,0,.7);
  `;

  const header = document.createElement('div');
  header.classList.add('ui-panel-header');header.style.cssText='padding:4px 10px 6px;border-bottom:1px solid var(--border);margin-bottom:4px';
  header.innerHTML = `<span style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--accent);letter-spacing:2px">🎬 ANIMATSIYALAR (${clips.length})</span>
    <button onclick="document.getElementById('anim-select-panel').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px">✕</button>`;
  panel.appendChild(header);

  clips.forEach((clip, i) => {
    const row = document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:6px;padding:4px 10px';
    row.innerHTML = `
      <button id="anim-btn-${i}" style="background:${i===0?'rgba(0,229,255,0.12)':'none'};border:1px solid ${i===0?'var(--accent)':'var(--border)'};color:${i===0?'var(--accent)':'var(--muted)'};font-family:Share Tech Mono,monospace;font-size:9px;padding:2px 8px;cursor:pointer" onclick="switchAnim(${i})">▶</button>
      <span style="flex:1;font-family:Rajdhani,sans-serif;font-size:12px;color:var(--text)">${clip.name||'Anim '+i}</span>
      <span style="font-family:Share Tech Mono,monospace;font-size:9px;color:var(--muted)">${clip.duration.toFixed(2)}s</span>
    `;
    panel.appendChild(row);
  });


  document.body.appendChild(panel);
}

// Animatsiya almashtirish
window.switchAnim = function(idx) {
  if (!selectedObj) return;
  const actions = selectedObj.userData._actions;
  const active  = selectedObj.userData._activeAnim || 0;
  if (!actions || !actions[idx]) return;
  actions[active].fadeOut(0.25);
  actions[idx].reset().fadeIn(0.25).play();
  selectedObj.userData._activeAnim = idx;

  // UI update
  const clips = selectedObj.userData._clips || [];
  clips.forEach((_,i) => {
    const btn = document.getElementById('anim-btn-'+i);
    if (!btn) return;
    btn.style.background = i===idx?'rgba(0,229,255,0.12)':'none';
    btn.style.borderColor = i===idx?'var(--accent)':'var(--border)';
    btn.style.color = i===idx?'var(--accent)':'var(--muted)';
    btn.textContent = i===idx?'⏸':'▶';
  });
  log(`🎬 Animatsiya: ${clips[idx]?.name||idx}`, 'lok');
};

