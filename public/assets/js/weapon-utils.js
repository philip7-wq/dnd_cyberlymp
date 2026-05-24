// Weapon range & DV utilities — shared between map.html and player.html

// Brackets in meters: [6, 12, 25, 50, 100, 200, 400, 800]
export const DV_TABLE = {
  pistol:           [13, 15, 20, 25, 30,   30,   null, null],
  smg:              [15, 13, 15, 20, 25,   25,   30,   null],
  shotgun:          [13, 15, 20, 25, 30,   35,   null, null],
  assault_rifle:    [17, 16, 15, 13, 15,   20,   25,   30  ],
  sniper_rifle:     [30, 25, 25, 20, 15,   16,   17,   20  ],
  bow:              [15, 13, 15, 17, 20,   22,   null, null],
  grenade_launcher: [16, 15, 15, 17, 20,   22,   25,   null],
  rocket_launcher:  [17, 16, 15, 15, 20,   20,   25,   30  ],
};

export const RANGE_BRACKETS = [6, 12, 25, 50, 100, 200, 400, 800];

export const BRACKET_LABELS = [
  '0–6m', '7–12m', '13–25m', '26–50m',
  '51–100m', '101–200m', '201–400m', '401–800m',
];

export const WEAPON_TYPE_MAP = [
  { keys: ['sniper'],                               type: 'sniper_rifle'     },
  { keys: ['assault rifle', 'assault_rifle'],       type: 'assault_rifle'    },
  { keys: ['smg', 'submachine'],                    type: 'smg'              },
  { keys: ['shotgun'],                              type: 'shotgun'          },
  { keys: ['bow', 'crossbow'],                      type: 'bow'              },
  { keys: ['grenade launcher', 'grenade_launcher'], type: 'grenade_launcher' },
  { keys: ['rocket launcher', 'rocket_launcher'],   type: 'rocket_launcher'  },
];

export function guessWeaponDvType(ammo = '', name = '') {
  const n = (name + ' ' + ammo).toLowerCase();
  for (const { keys, type } of WEAPON_TYPE_MAP) {
    if (keys.some(k => n.includes(k))) return type;
  }
  return 'pistol';
}

// Returns the DV for a weapon type at a given distance in meters.
// Returns null if the weapon cannot reach that distance.
export function getDV(wtype, distM) {
  const dvs = DV_TABLE[wtype] || DV_TABLE.pistol;
  for (let i = 0; i < RANGE_BRACKETS.length; i++) {
    if (distM <= RANGE_BRACKETS[i]) return dvs[i];
  }
  return dvs[dvs.length - 1];
}

export function getRangeBracketIndex(distM) {
  for (let i = 0; i < RANGE_BRACKETS.length; i++) {
    if (distM <= RANGE_BRACKETS[i]) return i;
  }
  return RANGE_BRACKETS.length - 1;
}
