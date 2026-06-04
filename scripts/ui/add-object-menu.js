// ============================================================
// ADD OBJECT MENU
// ============================================================
$('add-obj-btn').onclick = function() {
  const m = document.createElement('div');
  m.classList.add('ui-popup');
m.style.cssText='min-width:160px;display:grid;grid-template-columns:1fr 1fr';
  const rect = this.getBoundingClientRect();
  m.style.left=rect.left+'px';
  m.style.top=(rect.top-320)+'px';
  // Camera option
  const camBtn=document.createElement('button');
  camBtn.textContent='🎥 Kamera';
  camBtn.style.cssText='grid-column:1/-1;background:rgba(204,136,255,.08);border:none;border-bottom:1px solid var(--border);color:var(--accent4);padding:7px 12px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;text-align:left';
  camBtn.onclick=()=>{addCameraObject();document.body.removeChild(m)};
  m.appendChild(camBtn);
  PRIMITIVES.forEach((p,i)=>{
    const b=document.createElement('button');
    b.textContent=p.name;
    b.classList.add('ui-menu-item');b.style.padding='7px 12px';
    b.onmouseover=()=>b.style.background='var(--hover)';
    b.onmouseout=()=>b.style.background='none';
    b.onclick=()=>{addObject(i,Math.floor(Math.random()*TEXTURES.length));document.body.removeChild(m)};
    m.appendChild(b);
  });
  document.body.appendChild(m);
  setTimeout(()=>document.addEventListener('click',function rm(){if(m.parentNode)m.parentNode.removeChild(m);document.removeEventListener('click',rm)},100));
};

// ASSETS TAB
// Primitives grid
const assetGrid = $('asset-cat-primitives') || $('asset-grid');
PRIMITIVES.forEach((p,i)=>{
  const a=document.createElement('div');
  a.className='asset-item';
  const icons=['⬛','⚫','🔵','🔺','🔻','⭕','💎','✨','⬜'];
  a.innerHTML=`<span class="ai">${icons[i]||'▪'}</span>${p.name}`;
  a.onclick=()=>addObject(i,Math.floor(Math.random()*TEXTURES.length));
  assetGrid.appendChild(a);
});

// Camera asset — primitives ga qo'shamiz
(function() {
  const ag = $('asset-cat-primitives') || $('asset-grid');
  if (!ag) return;
  const camItem = document.createElement('div');
  camItem.className = 'asset-item';
  camItem.innerHTML = '<span class="ai">🎥</span>Kamera';
  camItem.style.borderColor = 'rgba(204,136,255,.3)';
  camItem.style.color = 'var(--accent4)';
  camItem.onclick = () => addCameraObject();
  ag.appendChild(camItem);
})();

window.switchLeftTab = function(tab, el) {
  document.querySelectorAll('#left-col .ptab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  $('tab-hier').style.display   = tab==='hier'   ? 'flex' : 'none';
  $('tab-assets').style.display = tab==='assets' ? 'flex' : 'none';
};
