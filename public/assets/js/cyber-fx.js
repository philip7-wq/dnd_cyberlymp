/* ============================================================
   cyber-fx.js — Animations-Helfer (Night-City HUD)
   Phase 0 — Fundament. Toggelt CSS-Klassen / nutzt WAAPI.
   KEINE Geschäftslogik — nur visuelles Feedback.
   Alle Helfer sind No-Ops bei prefers-reduced-motion: reduce.
   ============================================================ */

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Restartet eine einmalige CSS-Animation, indem die Klasse entfernt,
 * ein Reflow erzwungen und die Klasse neu gesetzt wird.
 * @param {Element} el
 * @param {string} cls
 */
function restartAnimation(el, cls) {
  el.classList.remove(cls);
  // Reflow erzwingen, damit die Animation erneut startet.
  void el.offsetWidth;
  el.classList.add(cls);
}

/**
 * Panel-Boot: kurzer Flicker + Glow-Hochfahren beim Erscheinen.
 * @param {Element} el
 */
export function bootFlicker(el) {
  if (reduceMotion || !el) return;
  restartAnimation(el, 'fx-boot');
  el.addEventListener('animationend', () => el.classList.remove('fx-boot'), { once: true });
}

/**
 * Glow-Pulse: langsamer Atem auf aktiven/Live-Elementen.
 * @param {Element} el
 * @param {boolean} on  true = einschalten, false = ausschalten
 */
export function glowPulse(el, on = true) {
  if (!el) return;
  if (reduceMotion) { el.classList.remove('fx-pulse'); return; }
  el.classList.toggle('fx-pulse', !!on);
}

/**
 * Glitch: nur bei Warnungen/kritischen Zuständen einsetzen.
 * @param {Element} el
 */
export function glitch(el) {
  if (reduceMotion || !el) return;
  restartAnimation(el, 'fx-glitch');
  el.addEventListener('animationend', () => el.classList.remove('fx-glitch'), { once: true });
}

/**
 * Montiert das globale Scanline-Overlay (idempotent).
 * @returns {HTMLElement} das Overlay-Element
 */
export function mountScanlines() {
  let overlay = document.querySelector('.cyber-scanlines');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'cyber-scanlines';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);
  }
  // Bei reduced-motion bleibt das Overlay statisch (CSS deaktiviert die Animation).
  return overlay;
}
