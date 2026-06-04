// ============================================================
//  INSPECTOR TAB SWITCHING
// ============================================================

function switchInspectorTab(tabName, tabEl) {
  // Remove active from all tabs
  document.querySelectorAll('#right-col .ptab').forEach(t => t.classList.remove('active'));

  // Add active to clicked tab
  if (tabEl) tabEl.classList.add('active');

  // Switch content
  if (tabName === 'inspector') {
    // Show normal inspector (if object selected, show its properties)
    if (selectedObj) {
      updateInspector();
    } else {
      document.getElementById('inspector-content').innerHTML = `
        <div style="padding:16px;font-size:11px;color:var(--muted);text-align:center;line-height:1.9">
          Obyektni tanlang<br><span style="font-size:9px;font-family:'Share Tech Mono',monospace">LMB: tanlash<br>F: fokus<br>Del: o'chirish</span>
        </div>
      `;
    }
  } else if (tabName === 'online') {
    // Show multiplayer panel
    showMultiplayerPanel();
  }
}

// Add to window
if (typeof window !== 'undefined') {
  window.switchInspectorTab = switchInspectorTab;
}
