// ============================================================
// SCREENSHOT
// ============================================================
window.takeScreenshot = function() {
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `apex3d_screenshot_${Date.now()}.png`;
  a.click();
  // Flash effect
  const fl = $('ss-flash');
  fl.style.animation = 'none';
  fl.offsetHeight; // reflow
  fl.style.animation = 'ssFlash 0.4s ease-out forwards';
  log('📸 Screenshot saqlandi!', 'lok');
};
