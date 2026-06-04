// ============================================================
// TOOLS
// ============================================================
['select','move','rotate','scale'].forEach(t=>{
  $('tool-'+t)?.addEventListener('click',function(){
    document.querySelectorAll('.tool-btn').forEach(b=>b.classList.remove('active'));
    this.classList.add('active');
  });
});

// ============================================================
// RESIZE
// ============================================================
function resize() {
  const w=cvp.clientWidth,h=cvp.clientHeight;
  renderer.setSize(w,h);
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(cvp);
resize();
