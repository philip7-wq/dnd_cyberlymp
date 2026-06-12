// ============================================================
//  item-slots.js — gemeinsame Item-/Slot-Helfer
//  Kanonische Quelle für routeItem / CYBERWARE_SLOT_MAP /
//  getItemSlots / getSlotCost / buildSnapshot. Früher in shop.html,
//  player.html und dm.html dupliziert (Phase 11b dedup). shop war
//  die reichste Variante → hier übernommen.
// ============================================================

export function routeItem(item) {
  if (['Ranged Weapon','Melee Weapon','Exotic Weapon'].includes(item.category)) return 'weapons';
  if (item.category === 'Armor')     return 'armor';
  if (item.category === 'Cyberware') return 'cyberware';
  return 'gear';
}

// ── Cyberware slot mapping ────────────────────────────────────
export const CYBERWARE_SLOT_MAP = {
  'Fashionware':                     ['fashionware'],
  'Neuralware / Chipware':           ['neuralLink'],
  'Chipware':                        ['neuralLink'],
  'Neuralware':                      ['neuralLink'],
  'Cybereye / Cybereye Option':      ['rightCybereye','leftCybereye'],
  'Cybereye Option':                 ['rightCybereye','leftCybereye'],
  'Cyberaudio Suite / Option':       ['cyberaudio'],
  'Cyberaudio Option':               ['cyberaudio'],
  'Internal Cyberware':              ['internal'],
  'External Cyberware':              ['external'],
  'Cyberarm / Cyberarm Option':      ['rightCyberarm','leftCyberarm'],
  'Cyberarm Option':                 ['rightCyberarm','leftCyberarm'],
  'Cyberarm/Cyberleg/Cyberlimb Option':['rightCyberarm','leftCyberarm','rightCyberleg','leftCyberleg'],
  'Cyberleg/Cyberlimb Option':       ['rightCyberleg','leftCyberleg'],
  'Borgware':                        ['borgware'],
};

// ── Slot-Bestimmung (korrekte Slots je nach Item-Name + Notes) ─
export function getItemSlots(item) {
  const sub = item.subcategory || '';
  const base = CYBERWARE_SLOT_MAP[sub] || ['internal'];
  if (sub !== 'Cyberarm/Cyberleg/Cyberlimb Option') return base;

  // Kombinierte Subcategory: anhand von Name und Notes spezifizieren
  const notes = item.notes || '';
  if (item.name === 'Cyberleg' || notes.startsWith('Cyberleg Option') || notes.toLowerCase().startsWith('replacement leg'))
    return ['rightCyberleg','leftCyberleg'];
  if (notes.startsWith('Cyberarm Option'))
    return ['rightCyberarm','leftCyberarm'];
  return base; // genuines Cyberlimb-Option (Wolvers etc.) → alle Gliedmaßen
}

// ── Slot-Kosten eines Items (aus notes) ───────────────────────
export function getSlotCost(item) {
  const m = (item.notes || '').match(/takes (\d+) Option Slot/i);
  return m ? parseInt(m[1]) : 1;
}

// ── Snapshot-Form fürs Inventar (route-abhängig) ──────────────
// ammoData = ammunition.json (für Waffen-Magazine); optional —
// fehlt es (z. B. dm.html), bleiben die Magazinfelder null/false
// und werden vom Spieler-Sheet lazy via migrateWeaponsMagazines geheilt.
export function buildSnapshot(item, ammoData) {
  const x = item.extra || {};
  switch (routeItem(item)) {
    case 'weapons': {
      const mapping = ammoData?.weapon_ammo_mapping?.[item.name];
      return {
        name: item.name, damage: item.damage || null, ammo: item.ammo || null,
        rof: item.rof || null, notes: item.notes || null,
        price: item.price, raw_cost: item.raw_cost, category: item.category,
        magazine_max:  mapping?.magazine  ?? null,
        ammo_current:  mapping?.magazine  ?? null,
        loaded_ammo:   mapping ? 'basic' : null,
        is_autofire:   mapping?.autofire  ?? false,
      };
    }
    case 'armor':
      return { name: item.name, category: item.category,
               sp: parseInt(x.sp) || 0,
               penalty: (x.armor_penalty && x.armor_penalty !== 'None') ? parseInt(x.armor_penalty) || 0 : 0,
               notes: item.notes || null, price: item.price, raw_cost: item.raw_cost };
    case 'cyberware':
      return { name: item.name, category: item.category, notes: item.notes || null,
               install: x.install || null, humanity_loss: x.humanity_loss || null,
               price: item.price, raw_cost: item.raw_cost, subcategory: item.subcategory || null,
               slotCost: getSlotCost(item) };
    default:
      return { name: item.name, category: item.category, notes: item.notes || null,
               price: item.price, raw_cost: item.raw_cost };
  }
}
