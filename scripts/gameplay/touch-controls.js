// ============================================================
// TOUCH / MOBILE CONTROLS (Play modeda)
// ============================================================
(function initTouchControls() {
  // HUD joystick (faqat play modeda ko'rinadi)
  const hud = document.createElement('div');
  hud.id = 'touch-hud';
  hud.style.cssText = `
    position:fixed;bottom:0;left:0;right:0;height:200px;
    pointer-events:none;z-index:7777;display:none;
  `;
  hud.innerHTML = `
    <div id="touch-joystick-zone" style="
      position:absolute;left:20px;bottom:20px;
      width:120px;height:120px;
      background:rgba(0,229,255,.08);border:2px solid rgba(0,229,255,.25);
      border-radius:50%;pointer-events:all;touch-action:none;
    ">
      <div id="touch-stick" style="
        position:absolute;width:44px;height:44px;
        background:rgba(0,229,255,.45);border:2px solid #00e5ff;
        border-radius:50%;top:50%;left:50%;
        transform:translate(-50%,-50%);
        pointer-events:none;transition:transform .05s;
      "></div>
    </div>
    <div id="touch-jump-btn" style="
      position:absolute;right:30px;bottom:40px;
      width:70px;height:70px;
      background:rgba(57,255,20,.15);border:2px solid rgba(57,255,20,.5);
      border-radius:50%;pointer-events:all;touch-action:none;
      display:flex;align-items:center;justify-content:center;
      font-size:22px;
    ">⬆</div>
  `;
  document.body.appendChild(hud);

  const zone  = document.getElementById('touch-joystick-zone');
  const stick = document.getElementById('touch-stick');
  const jumpBtn = document.getElementById('touch-jump-btn');
  const R = 38; // max radius
  let joyTouch = null, joyOrigin = {x:0,y:0};
  let joyVec = {x:0,y:0};

  zone.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const rect = zone.getBoundingClientRect();
    joyOrigin = {x: rect.left+rect.width/2, y: rect.top+rect.height/2};
    joyTouch = t.identifier;
  }, {passive:false});

  zone.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier !== joyTouch) continue;
      const dx = t.clientX - joyOrigin.x;
      const dy = t.clientY - joyOrigin.y;
      const dist = Math.min(Math.sqrt(dx*dx+dy*dy), R);
      const ang = Math.atan2(dy, dx);
      joyVec.x = Math.cos(ang) * dist / R;
      joyVec.y = Math.sin(ang) * dist / R;
      stick.style.transform = `translate(calc(-50% + ${Math.cos(ang)*dist}px), calc(-50% + ${Math.sin(ang)*dist}px))`;
    }
  }, {passive:false});

  const endJoy = () => {
    joyTouch = null; joyVec.x = 0; joyVec.y = 0;
    stick.style.transform = 'translate(-50%,-50%)';
  };
  zone.addEventListener('touchend', endJoy);
  zone.addEventListener('touchcancel', endJoy);

  jumpBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    if (PlayerController.obj) { PlayerController.keys['Space'] = true; }
  }, {passive:false});
  jumpBtn.addEventListener('touchend', () => {
    if (PlayerController.obj) { PlayerController.keys['Space'] = false; }
  });

  // Touch → PlayerController keys injection (animate loop dan oldin)
  const _touchTick = () => {
    requestAnimationFrame(_touchTick);
    if (!isPlaying || !PlayerController.obj) return;
    PlayerController.keys['KeyW'] = joyVec.y < -0.3;
    PlayerController.keys['KeyS'] = joyVec.y >  0.3;
    PlayerController.keys['KeyA'] = joyVec.x < -0.3;
    PlayerController.keys['KeyD'] = joyVec.x >  0.3;
  };
  requestAnimationFrame(_touchTick);

  // Touch look (swipe on canvas)
  let lookTouch = null, lookLast = {x:0,y:0};
  canvas.addEventListener('touchstart', e => {
    if (!isPlaying || !PlayerController.obj) return;
    for (const t of e.changedTouches) {
      const rect = zone.getBoundingClientRect();
      if (t.clientX < rect.right + 20) continue; // joystick zonasi emas
      lookTouch = t.identifier;
      lookLast = {x:t.clientX, y:t.clientY};
    }
  }, {passive:true});
  canvas.addEventListener('touchmove', e => {
    if (!isPlaying || !PlayerController.obj || lookTouch===null) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== lookTouch) continue;
      const dx = t.clientX - lookLast.x;
      const dy = t.clientY - lookLast.y;
      PlayerController.camYaw   -= dx * camSensitivity * 2;
      PlayerController.camPitch -= dy * camSensitivity * 2;
      PlayerController.camPitch  = Math.max(-1.3, Math.min(1.3, PlayerController.camPitch));
      lookLast = {x:t.clientX, y:t.clientY};
    }
  }, {passive:true});
  canvas.addEventListener('touchend', e => {
    for (const t of e.changedTouches) if (t.identifier===lookTouch) lookTouch=null;
  });

  // Play modeda touch HUD ko'rsatish/yashirish
  const _origPlayBtn = $('play-btn').onclick;
  // Hook: isPlaying o'zgarganda touch HUD toggle
  const checkTouchHUD = () => {
    const isMobile = navigator.maxTouchPoints > 0;
    hud.style.display = (isPlaying && isMobile) ? 'block' : 'none';
  };
  const observer = new MutationObserver(checkTouchHUD);
  observer.observe($('play-btn'), {attributes:true, attributeFilter:['class']});
})();
