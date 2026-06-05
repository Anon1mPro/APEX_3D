// ============================================================
// STATS
// ============================================================
function updateStats() {
  $('obj-s').textContent = objects.length + particleSystems.length;
  let tris=0;
  objects.forEach(o=>{
    if(o.geometry?.index) tris+=o.geometry.index.count/3;
    else if(o.geometry?.attributes?.position) tris+=o.geometry.attributes.position.count/3;
  });
  $('poly-s').textContent = Math.round(tris);
  $('obj-d').textContent = objects.length;
  $('tri-d').textContent = Math.round(tris);
}

// ============================================================
// FULLSCREEN
// ============================================================
window.toggleFullscreen = function() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    el.requestFullscreen().catch(()=>{});
    $('fullscreen-btn').textContent = '⛶ Windowed';
    log('⛶ To\'liq ekran yoqildi', 'lok');
  } else {
    document.exitFullscreen();
    $('fullscreen-btn').textContent = '⛶ Fullscreen';
    log('⛶ Oyna rejimiga qaytildi', 'lw');
  }
};
document.addEventListener('fullscreenchange', ()=>{
  if (!document.fullscreenElement) $('fullscreen-btn').textContent = '⛶ Fullscreen';
});
