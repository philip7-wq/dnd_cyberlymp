# Map Update Part 3 — Setup Instructions

## DB Migration Required

Run the following in the Supabase SQL Editor:

```sql
ALTER TABLE maps ADD COLUMN IF NOT EXISTS groups_json jsonb DEFAULT '{}';
```

This adds the `groups_json` column used to store group-to-color mappings for token border colors.

---

## No Other Schema Changes

All other Map Update Part 3 features (vehicle images, performance, token colors, snap measurement, weapon pills, ammo selector) are client-side only.

---

## Features Overview

### 1. Custom Vehicle Token Images
- Upload an image when creating a custom vehicle token in the DM panel
- Image is stored in Supabase Storage (`npc-images` bucket, same as NPC portraits)
- Rendered immediately on the map, filling the vehicle's grid rectangle

### 2. Weapon Panel — Pill Buttons
- The old dropdown `<select>` is replaced with pill buttons (one per equipped weapon)
- Clicking a pill selects the weapon; clicking the active pill deselects it
- DM sees no weapon panel (player-only feature)

### 3. Ammo Type Selection
- Under the selected weapon card, a dropdown shows available ammo types
- Populated from `assets/data/ammunition.json` (same source as player.html)
- Only shows ammo types present in the player's `char.ammo_inventory`
- Switching ammo persists to Supabase via `patchCharacter()`
- Damage effects of special ammo (AP, hollow point) are applied in the attack flow (Part 4)

### 4. Range Rings Performance
- Range rings now render to an offscreen canvas and are cached
- Cache invalidates when: token position, zoom level, pan, weapon type, or canvas size changes
- mousemove handler uses `requestAnimationFrame` throttle — redraws at most once per frame

### 5. Token Border Color System

| Token type | Color |
|---|---|
| Own character (CHAR_ID match) | Gold `#FFD700`, thick (3px) |
| Other player characters | Gold `#FFD700`, normal (2px) |
| NPC in a group | Group color (from `groups_json`) |
| NPC without group | `token.borderColor` or default red `#FF2D2D` |
| Vehicle / Custom token | `token.color` |

DM can right-click any non-player token to:
- **🎨 Farbe setzen** — set a custom `borderColor` for the token, or apply a color to all tokens in a group
- **👥 Gruppe** — assign the token to a named group

Group colors are stored in `maps.groups_json` and synced to all clients via Supabase Realtime.

### 6. Measurement Snap to Token Center
- Clicking near a token while using the measure tool snaps to its exact center
- Snap radius: token radius + 12px (in world units)
- The source and target tokens are stored as `S.measureSourceToken` / `S.measureTargetToken`
- Snapped tokens get a dashed accent ring in the zone color of the current measurement
- These fields are used by the attack flow (Part 4) to auto-identify the target

---

## Smoke Test Checklist

1. **Vehicle image**: DM adds custom vehicle with image upload → image fills vehicle rectangle immediately
2. **Range rings performance**: Enable range zones → move mouse rapidly / zoom → no frame drops
3. **Own token**: Player opens map → their token has a gold thick ring; other player chars have gold thin ring
4. **NPC color**: DM right-clicks NPC → "Farbe setzen" → enter hex → color applies and persists after refresh
5. **Group color**: DM assigns two NPCs to group "Boss" → sets color on one → both update → visible to all clients
6. **Snap measure**: Player selects measure tool → clicks near a token → line starts from exact center; clicks near target → snaps + target gets dashed ring
7. **Weapon pills**: Player panel shows equipped weapon names as pills → click selects (card appears) → click again deselects
8. **Ammo**: Select weapon with ammo → ammo dropdown appears → switch to special ammo → persists after reload
