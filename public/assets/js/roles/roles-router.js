// ============================================================
// ROLES — Router
// Mounts the right role interface into the Rollen tab
// ============================================================

import { ROLE_META } from './roles-core.js';

const ROLE_MODULES = {
  solo:      () => import('./solo.js'),
  netrunner: () => import('./netrunner.js'),
  tech:      () => import('./tech.js'),
  medtech:   () => import('./medtech.js'),
  media:     () => import('./media.js'),
  exec:      () => import('./exec.js'),
  lawman:    () => import('./lawman.js'),
  fixer:     () => import('./fixer.js'),
  nomad:     () => import('./nomad.js'),
  rockerboy: () => import('./rockerboy.js'),
};

/**
 * Mount the role interface for the given character.
 * @param {HTMLElement} container  — the container in the Rollen tab
 * @param {Object} character       — character row from `characters` table
 *   Expected fields: id, role (string, lowercase). Optional: role_rank
 */
export async function mountRoleInterface(container, character) {
  if (!container) return;
  container.innerHTML = '';

  if (!character || !character.id) {
    container.innerHTML = `<div class="role-empty"><div class="role-empty-glyph">⌬</div>Kein Charakter geladen.</div>`;
    return;
  }

  const roleKey = (character.role || '').toLowerCase().trim();
  if (!roleKey || !ROLE_META[roleKey]) {
    container.innerHTML = `
      <div class="role-empty">
        <div class="role-empty-glyph">⌬</div>
        <div>Keine Rolle zugewiesen.</div>
        <div style="margin-top:8px; font-size:11px;">
          Verfügbar: ${Object.keys(ROLE_META).join(' · ')}
        </div>
      </div>`;
    return;
  }

  // Apply role theme
  const panel = document.createElement('div');
  panel.className = `role-panel role-theme-${roleKey}`;
  container.appendChild(panel);

  // Loading state
  panel.innerHTML = `<div class="role-empty">Lade ${ROLE_META[roleKey].name}…</div>`;

  try {
    const mod = await ROLE_MODULES[roleKey]();
    panel.innerHTML = '';
    await mod.mount(panel, character);
  } catch (err) {
    console.error('Role mount failed:', err);
    panel.innerHTML = `<div class="role-empty">Fehler beim Laden: ${err.message}</div>`;
  }
}
