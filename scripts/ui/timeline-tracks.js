    // --- Transform track ---
    if (hasKF) {
      const row=document.createElement('div'); row.className='tl-track';
      const lbl=document.createElement('div'); lbl.className='tl-track-lbl';
      lbl.style.cursor='pointer'; lbl.title='Egri chiziq muharrirni ochish';
      lbl.onclick=()=>ceOpen(id,'pos');

      // Loop tugmasi
      const loopBtn=document.createElement('button');
      loopBtn.textContent='🔄';
      loopBtn.title='Loop — animatsiya oxiriga yetganda avtomatik qayta boshlaydi';
      loopBtn.style.cssText=`background:${tr.loop?'rgba(57,255,20,.18)':'none'};border:1px solid ${tr.loop?'rgba(57,255,20,.5)':'var(--border)'};color:${tr.loop?'var(--accent3)':'var(--muted)'};font-size:9px;padding:0 3px;border-radius:2px;cursor:pointer;flex-shrink:0;line-height:14px;height:14px`;
      loopBtn.onclick=e=>{e.stopPropagation();tlToggleTrackLoop(id);};
      lbl.appendChild(loopBtn);

      const typeSpan=document.createElement('span');
      typeSpan.className='tl-track-type tl-track-type-pos';
      typeSpan.textContent='POS';
      lbl.appendChild(typeSpan);

      const nameSpan=document.createElement('span');
      nameSpan.style.cssText='color:var(--muted);overflow:hidden;text-overflow:ellipsis';
      nameSpan.textContent=tr.name;
      lbl.appendChild(nameSpan);
      row.appendChild(lbl);
      const lane=document.createElement('div'); lane.className='tl-track-lane';

      lane.onclick=e=>{
        if (e.target.classList.contains('tl-kf')) return;
        const rect=lane.getBoundingClientRect();
        tlCurrent=Math.max(0,Math.min(tlDuration,(e.clientX-rect.left)/rect.width*tlDuration));
        tlApplyAll(tlCurrent); tlRender();
        $('tl-kf-popup').style.display='none';
      };
      lane.ondblclick=e=>{
        if (e.target.classList.contains('tl-kf')) return;
        const rect=lane.getBoundingClientRect();
        tlCurrent=Math.max(0,Math.min(tlDuration,(e.clientX-rect.left)/rect.width*tlDuration));
        // Set selected obj to this track's obj
        const tObj = tr.objRef || objects.find(o=>o.userData.id==id);
        if (tObj) { selectObject(tObj); }
        tlAddKeyframe();
        tlRender();
        log('◆ KF qo\'shildi @ '+tlCurrent.toFixed(2)+'s (2x bosish)', 'lok');
      };

      // Segments with easing color
      for (let i=0;i<tr.keyframes.length-1;i++) {
        const seg=document.createElement('div');
        const ease=tr.keyframes[i].ease||'smooth';
        seg.className=`tl-segment ease-${ease}`;
        seg.style.left=(tr.keyframes[i].t/tlDuration*100)+'%';
        seg.style.width=((tr.keyframes[i+1].t-tr.keyframes[i].t)/tlDuration*100)+'%';
        // Draw easing curve SVG inside segment
        const sw=Math.max(10,(tr.keyframes[i+1].t-tr.keyframes[i].t)/tlDuration*W);
        seg.innerHTML=`<svg width="100%" height="14" style="position:absolute;top:0;left:0;pointer-events:none;opacity:.6"><polyline points="${tlEaseCurvePoints(ease,sw)}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
        lane.appendChild(seg);
      }

      // KF diamonds
      tr.keyframes.forEach((kf,ki)=>{
        const dot=document.createElement('div');
        const ease=kf.ease||'smooth';
        const isSel=tlSelKF&&!tlSelKF.isVis&&tlSelKF.objId==id&&tlSelKF.idx===ki;
        dot.className=`tl-kf ease-${ease}${isSel?' selected':''}`;
        dot.style.left=(kf.t/tlDuration*100)+'%';
        dot.title=`${tr.name} @ ${kf.t.toFixed(2)}s [${ease}]`;

        // Click → open popup
        dot.onclick=e=>{
          e.stopPropagation();
          tlSelKF={objId:id,idx:ki,isVis:false};
          tlCurrent=kf.t; tlApplyAll(tlCurrent); tlRender();
          showKfPopup(e.clientX,e.clientY,kf,false);
        };

        // Drag
        dot.onmousedown=e=>{
          e.stopPropagation();
          const startX=e.clientX, startT=kf.t;
          const onmove=ev=>{
            const lr=lane.getBoundingClientRect();
            kf.t=Math.max(0,Math.min(tlDuration,startT+(ev.clientX-startX)/lr.width*tlDuration));
            tr.keyframes.sort((a,b)=>a.t-b.t); tlRender();
          };
          const onup=()=>{document.removeEventListener('mousemove',onmove);document.removeEventListener('mouseup',onup)};
          document.addEventListener('mousemove',onmove); document.addEventListener('mouseup',onup);
        };
        lane.appendChild(dot);
      });
      row.appendChild(lane); tracksEl.appendChild(row);
    }

    // --- Visibility track ---
    if (hasVis) {
      const vrow=document.createElement('div'); vrow.className='tl-track';
      const vlbl=document.createElement('div'); vlbl.className='tl-track-lbl';
      vlbl.style.cursor='pointer'; vlbl.title='Egri chiziq muharrirni ochish';
      vlbl.onclick=()=>ceOpen(id,'vis');

      // Loop tugmasi (VIS)
      const vLoopBtn=document.createElement('button');
      vLoopBtn.textContent='🔄';
      vLoopBtn.title='Loop — animatsiya oxiriga yetganda avtomatik qayta boshlaydi';
      vLoopBtn.style.cssText=`background:${tr.loop?'rgba(57,255,20,.18)':'none'};border:1px solid ${tr.loop?'rgba(57,255,20,.5)':'var(--border)'};color:${tr.loop?'var(--accent3)':'var(--muted)'};font-size:9px;padding:0 3px;border-radius:2px;cursor:pointer;flex-shrink:0;line-height:14px;height:14px`;
      vLoopBtn.onclick=e=>{e.stopPropagation();tlToggleTrackLoop(id);};
      vlbl.appendChild(vLoopBtn);

      const vTypeSpan=document.createElement('span');
      vTypeSpan.className='tl-track-type tl-track-type-vis';
      vTypeSpan.textContent='VIS';
      vlbl.appendChild(vTypeSpan);

      const vNameSpan=document.createElement('span');
      vNameSpan.style.cssText='color:var(--muted);overflow:hidden;text-overflow:ellipsis';
      vNameSpan.textContent=tr.name;
      vlbl.appendChild(vNameSpan);
      vrow.appendChild(vlbl);
      const vlane=document.createElement('div'); vlane.className='tl-track-lane';

      // Visibility bar segments
      let lastX=0, lastVis=1;
      tr.visKeyframes.forEach((vk,vi)=>{
        const xPct=vk.t/tlDuration*100;
        if (lastVis===1 && xPct>lastX) {
          const bar=document.createElement('div');
          bar.style.cssText=`position:absolute;top:5px;bottom:5px;left:${lastX}%;width:${xPct-lastX}%;background:rgba(204,136,255,.18);border-top:1px solid var(--accent4);border-bottom:1px solid var(--accent4)`;
          vlane.appendChild(bar);
        }
        lastX=xPct; lastVis=vk.vis;
      });
      if (lastVis===1 && lastX<100) {
        const bar=document.createElement('div');
        bar.style.cssText=`position:absolute;top:5px;bottom:5px;left:${lastX}%;width:${100-lastX}%;background:rgba(204,136,255,.18);border-top:1px solid var(--accent4);border-bottom:1px solid var(--accent4)`;
        vlane.appendChild(bar);
      }

      vlane.onclick=e=>{
        if (e.target.classList.contains('tl-kf-vis')) return;
        const rect=vlane.getBoundingClientRect();
        tlCurrent=Math.max(0,Math.min(tlDuration,(e.clientX-rect.left)/rect.width*tlDuration));
        tlApplyAll(tlCurrent); tlRender();
        $('tl-kf-popup').style.display='none';
      };

      tr.visKeyframes.forEach((vk,vi)=>{
        const dot=document.createElement('div');
        const isSel=tlSelKF&&tlSelKF.isVis&&tlSelKF.objId==id&&tlSelKF.idx===vi;
        dot.className=`tl-kf-vis ${vk.vis?'vis-on':'vis-off'}${isSel?' selected':''}`;
        dot.style.left=(vk.t/tlDuration*100)+'%';
        dot.title=`${vk.vis?'Ko\'rinadi':'Ko\'rinmaydi'} @ ${vk.t.toFixed(2)}s`;
        dot.onclick=e=>{
          e.stopPropagation();
          tlSelKF={objId:id,idx:vi,isVis:true};
          tlCurrent=vk.t; tlApplyAll(tlCurrent); tlRender();
          showKfPopup(e.clientX,e.clientY,vk,true);
        };
        dot.onmousedown=e=>{
          e.stopPropagation();
          const startX=e.clientX, startT=vk.t;
          const onmove=ev=>{
            const lr=vlane.getBoundingClientRect();
            vk.t=Math.max(0,Math.min(tlDuration,startT+(ev.clientX-startX)/lr.width*tlDuration));
            tr.visKeyframes.sort((a,b)=>a.t-b.t); tlRender();
          };
          const onup=()=>{document.removeEventListener('mousemove',onmove);document.removeEventListener('mouseup',onup)};
          document.addEventListener('mousemove',onmove); document.addEventListener('mouseup',onup);
        };
        vlane.appendChild(dot);
      });
      vrow.appendChild(vlane); tracksEl.appendChild(vrow);
    }

    // --- Sound track ---
    const hasSnd = (tr.soundKeyframes||[]).length > 0;
    if (hasSnd) {
      const srow = document.createElement('div'); srow.className = 'tl-track';
      const slbl = document.createElement('div'); slbl.className = 'tl-track-lbl';

      const sTypeSpan = document.createElement('span');
      sTypeSpan.className = 'tl-track-type tl-track-type-snd';
      sTypeSpan.textContent = 'SND';
      slbl.appendChild(sTypeSpan);

      const sNameSpan = document.createElement('span');
      sNameSpan.style.cssText = 'color:var(--muted);overflow:hidden;text-overflow:ellipsis';
      sNameSpan.textContent = tr.name;
      slbl.appendChild(sNameSpan);
      srow.appendChild(slbl);

      const slane = document.createElement('div'); slane.className = 'tl-track-lane';

      // Click on lane → add sound KF here
      slane.onclick = e => {
        if (e.target.classList.contains('tl-kf-snd')) return;
        const rect = slane.getBoundingClientRect();
        tlCurrent = Math.max(0, Math.min(tlDuration, (e.clientX - rect.left) / rect.width * tlDuration));
        const tObj = tr.objRef || objects.find(o => o.userData.id == id);
        if (tObj) selectObject(tObj);
        tlAddSoundKeyframe();
      };

      // Sound KF markers
      (tr.soundKeyframes || []).forEach((skf, si) => {
        const dot = document.createElement('div');
        const isSel = _tlSelSndKF && _tlSelSndKF.objId == id && _tlSelSndKF.idx === si;
        dot.className = 'tl-kf-snd' + (isSel ? ' selected' : '');
        dot.style.left = (skf.t / tlDuration * 100) + '%';
        dot.title = `♪ ${skf.sound} vol:${skf.volume ?? 1} @ ${skf.t.toFixed(2)}s`;

        dot.onclick = e => {
          e.stopPropagation();
          _tlSelSndKF = { objId: id, idx: si };
          tlCurrent = skf.t; tlApplyAll(tlCurrent); tlRender();
          _tlFillSoundSelect();
          $('sp-sound').value  = skf.sound || 'impact';
          $('sp-volume').value = skf.volume ?? 1;
          $('sp-vol-lbl').textContent = (skf.volume ?? 1).toFixed(1);
          $('sp-spatial').checked = skf.spatial !== false;
          _tlShowSndPopup(e.clientX, e.clientY + 10);
        };

        dot.onmousedown = e => {
          e.stopPropagation();
          const startX = e.clientX, startT = skf.t;
          const onmove = ev => {
            const lr = slane.getBoundingClientRect();
            skf.t = Math.max(0, Math.min(tlDuration, startT + (ev.clientX - startX) / lr.width * tlDuration));
            tr.soundKeyframes.sort((a, b) => a.t - b.t); tlRender();
          };
          const onup = () => { document.removeEventListener('mousemove', onmove); document.removeEventListener('mouseup', onup); };
          document.addEventListener('mousemove', onmove); document.addEventListener('mouseup', onup);
        };
        slane.appendChild(dot);
      });
      srow.appendChild(slane); tracksEl.appendChild(srow);
    }


  // Scrubber drag
  scrubRow.ondblclick=e=>{
    if (!selectedObj) return;
    const rect=scrubRow.getBoundingClientRect();
    tlCurrent=Math.max(0,Math.min(tlDuration,(e.clientX-rect.left)/rect.width*tlDuration));
    tlAddKeyframe();
    log('◆ KF qo\'shildi @ '+tlCurrent.toFixed(2)+'s', 'lok');
  };
  scrubRow.onmousedown=e=>{
    tlScrubbing=true;
    $('tl-kf-popup').style.display='none';
    const move=ev=>{
      const rect=scrubRow.getBoundingClientRect();
      tlCurrent=Math.max(0,Math.min(tlDuration,(ev.clientX-rect.left)/rect.width*tlDuration));
      tlApplyAll(tlCurrent);
      const lbl=$('tl-time-lbl'); if(lbl) lbl.textContent=tlCurrent.toFixed(2)+'s';
      const ph2=$('tl-playhead'); if(ph2) ph2.style.left=(tlCurrent/tlDuration*(scrubRow.clientWidth||400))+'px';
    };
    const up=()=>{tlScrubbing=false;document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up)};
    document.addEventListener('mousemove',move); document.addEventListener('mouseup',up);
    move(e);
  };

// ── KF POPUP ──────────────────────────────────────────────────
