// ============================================================
// COL RESIZER SYSTEM
// ============================================================
(function initResizers() {
  function makeResizer(resizerId, targetColId, side) {
    const handle = $(resizerId);
    if (!handle) return;
    let startX, startW, col;
    handle.addEventListener('mousedown', e => {
      col = $(targetColId);
      startX = e.clientX;
      startW = col.offsetWidth;
      handle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      function onMove(ev) {
        const dx = side==='left' ? ev.clientX-startX : startX-ev.clientX;
        const newW = Math.max(0, startW + dx);
        if (newW < 30) {
          col.classList.add('collapsed');
          col.style.width = '0px';
        } else {
          col.classList.remove('collapsed');
          col.style.width = newW + 'px';
        }
        // Force canvas resize
        if (typeof resize === 'function') resize();
      }
      function onUp() {
        handle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      e.preventDefault();
    });
  }
  makeResizer('left-resizer',  'left-col',  'left');
  makeResizer('right-resizer', 'right-col', 'right');

  // Console vertical resize
  const ch = $('console-resize-handle');
  if (ch) {
    let startY, startH;
    ch.addEventListener('mousedown', e => {
      const cw = $('console-wrap');
      startY = e.clientY; startH = cw.offsetHeight;
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      function onMove(ev) {
        const dy = startY - ev.clientY;
        const newH = Math.max(28, Math.min(400, startH + dy));
        cw.style.height = newH + 'px';
      }
      function onUp() {
        document.body.style.cursor=''; document.body.style.userSelect='';
        document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp);
      }
      document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp);
      e.preventDefault();
    });
  }
})();
