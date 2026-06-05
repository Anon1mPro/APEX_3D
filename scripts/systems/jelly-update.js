// ============================================================
// BOTTOM TAB SWITCHER
// ============================================================
window.switchBottomTab = function(tab, el) {
  document.querySelectorAll('#console-wrap .ptab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  $('console-body').style.display    = tab==='console'  ? 'block' : 'none';
  $('timeline-panel').style.display  = tab==='timeline' ? 'flex'  : 'none';
  $('physics-panel') && ($('physics-panel').style.display = tab==='physics' ? 'block' : 'none');
  $('script-panel').style.display    = tab==='script'   ? 'flex'  : 'none';
  const cp = $('camera-panel');
  if (cp) cp.style.display = tab==='camera' ? 'flex' : 'none';
  if (tab==='timeline') tlRender();
  if (tab==='script')   scriptRefreshSelect();
  if (tab==='camera')   { camUpdateLiveInfo?.(); camRenderPathTrack?.(); camRenderSavedList?.(); camRefreshFixedTargets?.(); }
};
