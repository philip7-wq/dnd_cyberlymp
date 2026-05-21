// ============================================================
// PDF AcroForm parser — Cyberpunk RED character sheet
// Uses PDF.js (Mozilla) via ESM CDN — reads Widget annotations
// directly instead of pdf-lib's form abstraction which misses
// many real-world PDFs.
// ============================================================

import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@3.11.174';

// Worker must be same version; CDN serves the CJS build for workers
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

const STAT_NAMES = ['INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'MOVE', 'BODY', 'EMP'];

/**
 * Main entry point.
 * @param {ArrayBuffer} arrayBuffer
 * @returns {{ character: object, imageBlob: Blob|null, _raw: object }}
 */
export async function parsePDF(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const raw = await collectAnnotations(pdf);

  console.log('[pdf-parser] raw fields:', raw);

  return {
    character: mapToCharacter(raw),
    imageBlob: null,   // manual portrait upload is the primary path
    _raw: raw,
  };
}

// ── Annotation collection (all pages) ───────────────────────

async function collectAnnotations(pdf) {
  const raw = {};

  for (let p = 1; p <= pdf.numPages; p++) {
    const page  = await pdf.getPage(p);
    const annots = await page.getAnnotations();

    for (const ann of annots) {
      if (ann.subtype !== 'Widget') continue;

      const name = ann.fieldName;
      if (!name) continue;

      const value = readAnnotValue(ann);

      // Keep first non-empty value when a logical field spans pages
      if (name in raw) {
        if (value !== null && value !== '' && value !== false) raw[name] = value;
      } else {
        raw[name] = value;
      }
    }
  }

  return raw;
}

function readAnnotValue(ann) {
  switch (ann.fieldType) {
    case 'Tx':
      return ann.fieldValue ?? '';

    case 'Btn':
      if (ann.checkBox) {
        // checked when fieldValue is not 'Off' / empty
        const v = ann.fieldValue;
        return v != null && v !== 'Off' && v !== '';
      }
      if (ann.radioButton) return ann.fieldValue ?? '';
      return null;   // pushbutton (e.g. Character Image)

    case 'Ch':
      return Array.isArray(ann.fieldValue)
        ? (ann.fieldValue[0] ?? '')
        : (ann.fieldValue ?? '');

    default:
      return ann.fieldValue ?? null;
  }
}

// ── Field → character schema mapping ────────────────────────

const int = v  => parseInt(v, 10) || 0;
const str = v  => String(v ?? '').trim();

function mapToCharacter(f) {
  return {
    name:        str(f['Handle']) || str(f['Character Name']) || '',
    handle:      str(f['Handle']),
    role:        str(f['Role']),
    player_name: '',

    stats: {
      INT:     int(f['INT']),
      REF:     int(f['REF']),
      DEX:     int(f['DEX']),
      TECH:    int(f['TECH']),
      COOL:    int(f['COOL']),
      WILL:    int(f['WILL']),
      MOVE:    int(f['MOVE']),
      BODY:    int(f['BODY']),
      EMP:     int(f['EMP']),
      EMP_MAX: int(f['EMP MAX']),
    },

    current_hp:                  int(f['Current HP']),
    max_hp:                      int(f['Max HP']),
    current_humanity:            int(f['Current Humanity']),
    max_humanity:                (int(f['EMP MAX']) || int(f['EMP'])) * 10,
    current_luck:                int(f['LUCK CURRENT']),
    max_luck:                    int(f['LUCK MAX']),
    seriously_wounded_threshold: int(f['Seriously Wounded Threshhold']),
    death_save:                  int(f['Death Save']),
    cash:                        int(f['Cash']),
    improvement_points:          int(f['Total IP']),
    reputation:                  int(f['Reputation']),

    skills:    extractSkills(f),
    weapons:   extractWeapons(f),
    armor:     extractArmor(f),
    gear:      extractGear(f),
    cyberware: extractCyberware(f),
    lifepath:  extractLifepath(f),

    notes: str(f['Notes']),
  };
}

// ── Skills ───────────────────────────────────────────────────

function extractSkills(f) {
  const skills = {};
  for (const [key, val] of Object.entries(f)) {
    if (!key.startsWith('LVL')) continue;
    for (const stat of STAT_NAMES) {
      if (key.endsWith(' ' + stat)) {
        const skillName = key.slice(3, -(stat.length + 1));
        if (skillName) skills[skillName] = { lvl: int(val), stat };
        break;
      }
    }
  }
  return skills;
}

// ── Weapons ──────────────────────────────────────────────────

function extractWeapons(f) {
  const weapons = [];
  for (let i = 1; i <= 6; i++) {
    const name = str(f[`WEAPONRow${i}`]);
    if (!name) continue;
    weapons.push({
      name,
      damage: str(f[`DMGRow${i}`]),
      ammo:   str(f[`AMMORow${i}`]),
      rof:    str(f[`ROFRow${i}`]),
      notes:  str(f[`NOTESRow${i}`]),
    });
  }
  return weapons;
}

// ── Armor ────────────────────────────────────────────────────

function extractArmor(f) {
  return {
    head:   { name: str(f['Head Armor']), sp: int(f['SPHead']),   penalty: int(f['PENALTYHead']) },
    body:   { name: str(f['Body Armor']), sp: int(f['SPBody']),   penalty: int(f['PENALTYBody']) },
    shield: { name: str(f['Shield']),     sp: int(f['SPShield']), penalty: int(f['PENALTYShield']) },
  };
}

// ── Gear ─────────────────────────────────────────────────────

function extractGear(f) {
  const gear = [];
  for (let i = 1; i <= 18; i++) {
    const name = str(f[`Gear ${i}`]);
    if (!name) continue;
    gear.push({ name, notes: str(f[`Gear Notes ${i}`]) });
  }
  return gear;
}

// ── Cyberware ────────────────────────────────────────────────

const CYBERWARE_SLOTS = [
  ['rightEye',   'R Eye',  6],
  ['leftEye',    'L Eye',  6],
  ['rightArm',   'R Arm',  6],
  ['leftArm',    'L Arm',  6],
  ['rightLeg',   'R Leg',  6],
  ['leftLeg',    'L Leg',  6],
  ['audio',      'Audio',  6],
  ['neuralLink', 'Link',   10],
  ['internal',   'IC',     6],
  ['external',   'EC',     6],
  ['fashion',    'FW',     6],
  ['borgware',   'Borg',   6],
];

function extractCyberware(f) {
  const cyberware = {};
  for (const [key, prefix, max] of CYBERWARE_SLOTS) {
    const has   = f[`${prefix} Box`] === true;
    const slots = [];
    for (let i = 1; i <= max; i++) {
      const option = str(f[`${prefix} ${i}`]);
      const data   = str(f[`${prefix}Data ${i}`]);
      if (option || data) slots.push({ option, data });
    }
    if (has || slots.length) cyberware[key] = { has, slots };
  }
  return cyberware;
}

// ── Lifepath ─────────────────────────────────────────────────

function extractLifepath(f) {
  return {
    culturalOrigins: str(f['Cultural Origins']),
    personality:     str(f['Personality']),
    familyCrisis:    str(f['Family Crisis']),
    lifeGoals:       str(f['Life Goals']),
    roleAbility:     str(f['Role Ability']),
    roleAbilityRank: int(f['Role Ability Rank']),
    aliases:         str(f['Aliases']),
    housing:         str(f['Housing']),
    lifestyle:       str(f['Lifestyle']),
    friends:     [1, 2, 3].map(i => str(f[`Friend ${i}`])).filter(Boolean),
    loveAffairs: [1, 2, 3].map(i => str(f[`Love Affair ${i}`])).filter(Boolean),
    enemies: {
      who:          [1, 2, 3].map(i => str(f[`Who ${i}`])).filter(Boolean),
      whatCausedIt: str(f['What Caused It']),
      throwAtYou:   str(f['Throw At You']),
      happen:       str(f['Happen']),
    },
  };
}
