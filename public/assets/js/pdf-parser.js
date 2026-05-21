// ============================================================
// PDF AcroForm parser — Cyberpunk RED character sheet
// Uses pdf-lib direct getField(name) lookup (works where
// getFields() iteration fails on this PDF's structure).
// ============================================================

import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup }
  from 'https://esm.sh/pdf-lib@1.17.1';

/**
 * @param {ArrayBuffer} arrayBuffer
 * @returns {{ character: object, imageBlob: Blob|null, _raw: object }}
 */
export async function parsePDF(arrayBuffer) {
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const form   = pdfDoc.getForm();

  const raw = collectFields(form);

  const fieldCount = Object.keys(raw).length;
  console.log(`[pdf-parser] ${fieldCount} fields read`);
  if (fieldCount > 0) {
    console.log('[pdf-parser] raw fields (JSON):', JSON.stringify(raw, null, 2));
  } else {
    console.warn('[pdf-parser] No fields could be read — check field names');
  }

  return {
    character: mapToCharacter(raw),
    imageBlob: null,
    _raw: raw,
  };
}

// ── Field accessor ────────────────────────────────────────────

function getVal(form, name) {
  try {
    const field = form.getField(name);
    if (field instanceof PDFTextField)  return field.getText() ?? '';
    if (field instanceof PDFCheckBox)   return field.isChecked();
    if (field instanceof PDFDropdown)   return field.getSelected()[0] ?? '';
    if (field instanceof PDFRadioGroup) return field.getSelected() ?? '';
    return '';
  } catch {
    return '';
  }
}

// ── Enumerate all known field names ──────────────────────────

const STAT_FIELDS = ['INT','REF','DEX','TECH','COOL','WILL','MOVE','BODY','EMP','EMP MAX'];

const HP_FIELDS = [
  'Current HP','Max HP','Current Humanity',
  'LUCK CURRENT','LUCK MAX',
  'Death Save','Seriously Wounded Threshhold',
];

const IDENTITY_FIELDS = [
  'Handle','Role','Aliases','Role Ability','Role Ability Rank',
];

const RESOURCE_FIELDS = [
  'Cash','Ammo','Reputation','Total IP','Current IP',
  'Housing','Rent','Lifestyle',
];

const LIFEPATH_FIELDS = [
  'Cultural Origins','Personality','Family Crisis','Life Goals',
  'Friend 1','Friend 2','Friend 3',
  'Love Affair 1','Love Affair 2','Love Affair 3',
  'Who 1','Who 2','Who 3',
  'What Caused It','Throw At You','Happen',
];

const ARMOR_FIELDS = [
  'Head Armor','SPHead','PENALTYHead',
  'Body Armor','SPBody','PENALTYBody',
  'Shield','SPShield','PENALTYShield',
];

// All Cyberpunk RED skills: [fieldBaseName, stat]
const ALL_SKILLS = [
  // Awareness
  ['Concentration','WILL'],['Conceal/Reveal Object','INT'],['Lip Reading','INT'],
  ['Perception','INT'],['Tracking','INT'],
  // Body
  ['Athletics','DEX'],['Contortionist','DEX'],['Dance','DEX'],['Endurance','WILL'],
  ['Resist Torture/Drugs','WILL'],['Stealth','DEX'],
  // Control
  ['Drive Land Vehicle','REF'],['Pilot Air Vehicle','REF'],['Pilot Sea Vehicle','REF'],
  ['Riding','REF'],
  // Education
  ['Accounting','INT'],['Animal Handling','INT'],['Bureaucracy','INT'],
  ['Business','INT'],['Composition','INT'],['Criminology','INT'],
  ['Cryptography','INT'],['Deduction','INT'],['Education','INT'],
  ['Gamble','INT'],['Language (Streetslang)','INT'],['Language (2nd)','INT'],
  ['Language (3rd)','INT'],['Library Search','INT'],['Local Expert (Home)','INT'],
  ['Local Expert (2)','INT'],['Paramedic','INT'],['Pharmacology','INT'],
  ['Photography','INT'],['Science (Biology)','INT'],['Science (Chemistry)','INT'],
  ['Science (Math)','INT'],['Science (Physics)','INT'],['Science (2nd)','INT'],
  ['Tactics','INT'],['Wilderness Survival','INT'],['Zoology','INT'],
  // Fighting
  ['Brawling','DEX'],['Evasion','DEX'],['Martial Arts','DEX'],['Melee Weapon','DEX'],
  // Performance
  ['Acting','COOL'],['Play Instrument','TECH'],
  // Ranged Weapon
  ['Archery','REF'],['Autofire','REF'],['Handgun','REF'],['Heavy Weapons','REF'],
  ['Shoulder Arms','REF'],
  // Social
  ['Bribery','COOL'],['Conversation','EMP'],['Human Perception','EMP'],
  ['Interrogation','COOL'],['Persuasion','COOL'],['Personal Grooming','COOL'],
  ['Streetwise','COOL'],['Trading','COOL'],['Wardrobe & Style','COOL'],
  // Technique
  ['Air Vehicle Tech','TECH'],['Basic Tech','TECH'],['Cybertech','TECH'],
  ['Demolitions','TECH'],['Electronics/Security Tech','TECH'],['First Aid','TECH'],
  ['Forgery','TECH'],['Land Vehicle Tech','TECH'],['Paint/Draw/Sculpt','TECH'],
  ['Pickpocket','TECH'],['Sea Vehicle Tech','TECH'],['Weaponstech','TECH'],
];

// ── Collect all fields into raw object ───────────────────────

function collectFields(form) {
  const raw = {};

  const readList = (names) => {
    for (const n of names) raw[n] = getVal(form, n);
  };

  readList(STAT_FIELDS);
  readList(HP_FIELDS);
  readList(IDENTITY_FIELDS);
  readList(RESOURCE_FIELDS);
  readList(LIFEPATH_FIELDS);
  readList(ARMOR_FIELDS);

  // Skills
  for (const [name, stat] of ALL_SKILLS) {
    raw[`LVL${name} ${stat}`] = getVal(form, `LVL${name} ${stat}`);
  }

  return raw;
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
    weapons:   [],
    armor:     extractArmor(f),
    gear:      [],
    cyberware: {},
    lifepath:  extractLifepath(f),

    notes: str(f['Notes']),
  };
}

// ── Skills ───────────────────────────────────────────────────

function extractSkills(f) {
  const skills = {};
  for (const [name, stat] of ALL_SKILLS) {
    const key = `LVL${name} ${stat}`;
    const lvl = int(f[key]);
    if (lvl || key in f) skills[name] = { lvl, stat };
  }
  return skills;
}

// ── Armor ────────────────────────────────────────────────────

function extractArmor(f) {
  return {
    head:   { name: str(f['Head Armor']), sp: int(f['SPHead']),   penalty: int(f['PENALTYHead']) },
    body:   { name: str(f['Body Armor']), sp: int(f['SPBody']),   penalty: int(f['PENALTYBody']) },
    shield: { name: str(f['Shield']),     sp: int(f['SPShield']), penalty: int(f['PENALTYShield']) },
  };
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
