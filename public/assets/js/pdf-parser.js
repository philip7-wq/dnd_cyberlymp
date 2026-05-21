// ============================================================
// PDF AcroForm parser — Cyberpunk RED character sheet
// Uses pdf-lib via ESM CDN for field extraction.
// Handles all 413 AcroForm fields per the CLAUDE.md field map.
// ============================================================

import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFStream,
  PDFRawStream,
  PDFArray,
} from 'https://esm.sh/pdf-lib@1.17.1';

const STAT_NAMES = ['INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'MOVE', 'BODY', 'EMP'];

/**
 * Main entry point.
 * @param {ArrayBuffer} arrayBuffer  Raw bytes of the PDF
 * @returns {{ character: object, imageBlob: Blob|null }}
 */
export async function parsePDF(arrayBuffer) {
  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  const form = pdfDoc.getForm();

  const raw = extractRawFields(form);
  const imageBlob = extractCharacterImage(form, pdfDoc);

  return {
    character: mapToCharacter(raw),
    imageBlob,
  };
}

// ── Raw field extraction ─────────────────────────────────────

function extractRawFields(form) {
  const fields = {};
  for (const field of form.getFields()) {
    const name = field.getName();
    try {
      const ctor = field.constructor.name;
      if (ctor === 'PDFTextField') {
        fields[name] = field.getText() ?? '';
      } else if (ctor === 'PDFCheckBox') {
        fields[name] = field.isChecked();
      } else if (ctor === 'PDFDropdown' || ctor === 'PDFOptionList') {
        const sel = field.getSelected();
        fields[name] = Array.isArray(sel) ? (sel[0] ?? '') : (sel ?? '');
      } else if (ctor === 'PDFRadioGroup') {
        fields[name] = field.getSelected() ?? '';
      } else if (ctor === 'PDFButton') {
        // Pushbutton — value handled separately (image extraction)
        fields[name] = null;
      }
    } catch {
      fields[name] = null;
    }
  }
  return fields;
}

// ── Character image extraction ───────────────────────────────

/**
 * Extracts the embedded bitmap from the "Character Image" pushbutton's
 * normal-appearance XObject.  Returns a Blob or null.
 */
function extractCharacterImage(form, pdfDoc) {
  try {
    const field = form.getFields().find(f => f.getName() === 'Character Image');
    if (!field) return null;

    const acroField = field.acroField;
    const ap = acroField.lookup(PDFName.of('AP'));
    if (!(ap instanceof PDFDict)) return null;

    // /N — normal appearance (may be a reference or inline stream)
    const nRef = ap.get(PDFName.of('N'));
    if (!nRef) return null;
    const n = pdfDoc.context.lookup(nRef);
    if (!n) return null;

    // n is a form XObject; its dict holds Resources → XObject → image
    const nDict = (n instanceof PDFStream || n instanceof PDFRawStream) ? n.dict : n;
    if (!(nDict instanceof PDFDict)) return null;

    const resources = nDict.lookup(PDFName.of('Resources'));
    if (!(resources instanceof PDFDict)) return null;

    const xObjDict = resources.lookup(PDFName.of('XObject'));
    if (!(xObjDict instanceof PDFDict)) return null;

    for (const [, ref] of xObjDict.entries()) {
      const obj = pdfDoc.context.lookup(ref);
      if (!obj) continue;

      const dict = (obj instanceof PDFStream || obj instanceof PDFRawStream) ? obj.dict : null;
      if (!dict) continue;

      const subtype = dict.lookup(PDFName.of('Subtype'));
      if (!subtype || subtype.encodedName !== '/Image') continue;

      const rawBytes = (obj instanceof PDFRawStream)
        ? obj.contents
        : (obj instanceof PDFStream ? obj.contents : null);
      if (!rawBytes || rawBytes.length === 0) continue;

      const filterEntry = dict.lookup(PDFName.of('Filter'));
      const filterName  = filterEntry?.encodedName ?? filterEntry?.toString() ?? '';
      const mimeType    = filterName.includes('DCT') ? 'image/jpeg' : 'image/png';

      return new Blob([rawBytes], { type: mimeType });
    }
  } catch (e) {
    console.warn('[pdf-parser] Character image extraction failed:', e);
  }
  return null;
}

// ── Field-to-character mapping ───────────────────────────────

function int(v)  { return parseInt(v, 10) || 0; }
function str(v)  { return (v ?? '').trim(); }

function mapToCharacter(f) {
  return {
    // Identity
    name:        str(f['Handle']) || str(f['Character Name']) || 'Unnamed',
    handle:      str(f['Handle']),
    role:        str(f['Role']),
    player_name: '',   // not on the standard sheet; user fills in via form

    // Stats
    stats: {
      INT:  int(f['INT']),
      REF:  int(f['REF']),
      DEX:  int(f['DEX']),
      TECH: int(f['TECH']),
      COOL: int(f['COOL']),
      WILL: int(f['WILL']),
      MOVE: int(f['MOVE']),
      BODY: int(f['BODY']),
      EMP:  int(f['EMP']),
      EMP_MAX: int(f['EMP MAX']),
    },

    // HP / resources
    current_hp:                    int(f['Current HP']),
    max_hp:                        int(f['Max HP']),
    current_humanity:              int(f['Current Humanity']),
    max_humanity:                  int(f['EMP MAX']) * 10 || int(f['EMP']) * 10,
    current_luck:                  int(f['LUCK CURRENT']),
    max_luck:                      int(f['LUCK MAX']),
    seriously_wounded_threshold:   int(f['Seriously Wounded Threshhold']),
    death_save:                    int(f['Death Save']),
    cash:                          int(f['Cash']),
    improvement_points:            int(f['Total IP']),
    reputation:                    int(f['Reputation']),

    // Sections
    skills:   extractSkills(f),
    weapons:  extractWeapons(f),
    armor:    extractArmor(f),
    gear:     extractGear(f),
    cyberware: extractCyberware(f),
    lifepath: extractLifepath(f),

    // Misc
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
        const skillName = key.slice(3, -(stat.length + 1)); // strip "LVL" prefix and " STAT" suffix
        if (skillName) {
          skills[skillName] = { lvl: int(val), stat };
        }
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

// Slot descriptors: [slotKey, fieldPrefix, maxItems]
const CYBERWARE_SLOTS = [
  ['rightEye',  'R Eye',  6],
  ['leftEye',   'L Eye',  6],
  ['rightArm',  'R Arm',  6],
  ['leftArm',   'L Arm',  6],
  ['rightLeg',  'R Leg',  6],
  ['leftLeg',   'L Leg',  6],
  ['audio',     'Audio',  6],
  ['neuralLink','Link',   10],
  ['internal',  'IC',     6],
  ['external',  'EC',     6],
  ['fashion',   'FW',     6],
  ['borgware',  'Borg',   6],
];

function extractCyberware(f) {
  const cyberware = {};
  for (const [key, prefix, max] of CYBERWARE_SLOTS) {
    const has = f[`${prefix} Box`] === true;
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
    friends: [1, 2, 3].map(i => str(f[`Friend ${i}`])).filter(Boolean),
    loveAffairs: [1, 2, 3].map(i => str(f[`Love Affair ${i}`])).filter(Boolean),
    enemies: {
      who:          [1, 2, 3].map(i => str(f[`Who ${i}`])).filter(Boolean),
      whatCausedIt: str(f['What Caused It']),
      throwAtYou:   str(f['Throw At You']),
      happen:       str(f['Happen']),
    },
  };
}
