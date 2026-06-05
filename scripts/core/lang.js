// TIL TANLASH
const LANGS = {
  uz: { label:'🇺🇿 O\'zbek',  map:{ 'IERARXIYA':'IERARXIYA','ASSETLAR':'ASSETLAR','INSPEKTOR':'INSPEKTOR','O\'YNA':'O\'YNA','Saqla':'Saqla','Yuklash':'Yuklash','Bekor':'Bekor','Editor':'Editor' } },
  ru: { label:'🇷🇺 Русский', map:{ 'IERARXIYA':'ИЕРАРХИЯ','ASSETLAR':'АКТИВЫ','INSPEKTOR':'ИНСПЕКТОР','O\'YNA':'ИГРАТЬ','Saqla':'Сохранить','Yuklash':'Загрузить','Bekor':'Отмена','Editor':'Редактор' } },
  en: { label:'🇬🇧 English',  map:{ 'IERARXIYA':'HIERARCHY','ASSETLAR':'ASSETS','INSPEKTOR':'INSPECTOR','O\'YNA':'PLAY','Saqla':'Save','Yuklash':'Load','Bekor':'Cancel','Editor':'Editor' } },
};
let currentLang = localStorage.getItem('apex_lang') || 'uz';

window.showLangMenu = function(btn) {
  const old = document.getElementById('lang-menu-popup');
  if (old) { old.remove(); return; }
  const popup = document.createElement('div');
  popup.id = 'lang-menu-popup';
  const rect = btn.getBoundingClientRect();
  popup.style.cssText = `position:fixed;top:${rect.bottom+4}px;left:${rect.left}px;background:var(--panel2);border:1px solid var(--border);border-radius:4px;padding:3px 0;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,.6);font-family:'Share Tech Mono',monospace;min-width:140px`;
  Object.entries(LANGS).forEach(([code, lang]) => {
    const item = document.createElement('div');
    item.style.cssText = `padding:6px 14px;cursor:pointer;font-size:11px;color:${currentLang===code?'var(--accent)':'var(--text)'};display:flex;align-items:center;gap:6px`;
    item.textContent = lang.label + (currentLang===code?' ✓':'');
    item.onmouseenter = () => item.style.background = 'var(--hover)';
    item.onmouseleave = () => item.style.background = '';
    item.onclick = () => { applyLang(code); popup.remove(); };
    popup.appendChild(item);
  });
  document.body.appendChild(popup);
  setTimeout(() => document.addEventListener('click', () => popup.remove(), {once:true}), 50);
};

function applyLang(code) {
  currentLang = code;
  localStorage.setItem('apex_lang', code);
  const map = LANGS[code].map;
  // Tab labels
  document.querySelectorAll('.ptab, .tab-lbl, [data-lang]').forEach(el => {
    const orig = el.dataset.origText || el.textContent.trim();
    el.dataset.origText = orig;
    el.textContent = map[orig] || orig;
  });
  // Sidebar headers
  document.querySelectorAll('.panel-title, .side-title').forEach(el => {
    const orig = el.dataset.origText || el.textContent.trim();
    el.dataset.origText = orig;
    el.textContent = map[orig] || orig;
  });
  log(`🌐 Til: ${LANGS[code].label}`, 'lok');
}


function log(msg, type='lg') {
  const t = new Date().toLocaleTimeString('uz',{hour12:false});
  const d = document.createElement('div');
  d.className = type;
  d.innerHTML = `<span class="lt">[${t}]</span>${msg}`;
  consoleEl.appendChild(d);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}
