// ============================================================
// App-Shell Sidebar — rein optisches Klapp-/Off-Canvas-Modul
// ------------------------------------------------------------
// Operiert NUR auf vorhandenem Markup (<aside class="cyber-sidebar">).
// Erfindet keine Nav-Items, ruft keine DB/Logik. Verdrahtet:
//  - Desktop: Collapse-Toggle (voll ↔ Icon-Rail), Zustand in localStorage
//  - Mobile:  Burger + Off-Canvas-Overlay, schließt bei Auswahl / Klick außerhalb
// ============================================================

const COLLAPSE_KEY = 'lzrv_sidebar_collapsed';
const MOBILE_MQ = '(max-width: 768px)';

export function initSidebar() {
  const sidebar = document.querySelector('.cyber-sidebar');
  if (!sidebar || sidebar.dataset.shellInit) return;
  sidebar.dataset.shellInit = '1';

  document.body.classList.add('has-cyber-sidebar');

  // ── Desktop Collapse-Zustand aus localStorage ──────────────
  if (localStorage.getItem(COLLAPSE_KEY) === '1') {
    document.body.classList.add('sidebar-collapsed');
  }
  _syncToggleIcon();

  const toggle = sidebar.querySelector('.cyber-sidebar-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const collapsed = document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
      _syncToggleIcon();
    });
  }

  // ── Mobile: Burger + Overlay ───────────────────────────────
  const burger = document.createElement('button');
  burger.className = 'cyber-burger';
  burger.type = 'button';
  burger.setAttribute('aria-label', 'Navigation öffnen');
  burger.innerHTML = '☰';
  document.body.appendChild(burger);

  const overlay = document.createElement('div');
  overlay.className = 'cyber-sidebar-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(overlay);

  const openMobile  = () => document.body.classList.add('sidebar-open');
  const closeMobile = () => document.body.classList.remove('sidebar-open');

  burger.addEventListener('click', () => {
    document.body.classList.contains('sidebar-open') ? closeMobile() : openMobile();
  });
  overlay.addEventListener('click', closeMobile);

  // Auf Mobile bei Item-Auswahl schließen (Links + Buttons)
  const mq = window.matchMedia(MOBILE_MQ);
  sidebar.addEventListener('click', (e) => {
    if (!mq.matches) return;
    if (e.target.closest('.cyber-nav-item')) closeMobile();
  });

  // Beim Wechsel zurück auf Desktop Off-Canvas-Zustand zurücksetzen
  mq.addEventListener?.('change', (ev) => { if (!ev.matches) closeMobile(); });

  // Aktiven Link anhand des aktuellen Pfads markieren (rein optisch)
  _markActive(sidebar);
}

function _syncToggleIcon() {
  const toggle = document.querySelector('.cyber-sidebar .cyber-sidebar-toggle');
  if (!toggle) return;
  const collapsed = document.body.classList.contains('sidebar-collapsed');
  toggle.innerHTML = collapsed ? '»' : '«';
  toggle.setAttribute('aria-label', collapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen');
}

function _markActive(sidebar) {
  const here = location.pathname.split('/').pop() || 'index.html';
  sidebar.querySelectorAll('a.cyber-nav-item[href]').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (!href || href === '#') return;
    const target = href.split('?')[0].split('/').pop();
    if (target && target === here) a.classList.add('is-active');
  });
}
