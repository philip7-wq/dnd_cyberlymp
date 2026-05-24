# Weapon Range System — Setup Instructions

## No SQL Required

This feature uses no new database tables or columns. All data is:

- **Client-side only**: DV tables, range brackets, and zone colors are constants in `weapon-utils.js`
- **LocalStorage**: Cross-tab range sync uses the browser's `localStorage` key `map-range-sync`

---

## localStorage Key Schema

When a player measures a distance on the map, the following is written:

```json
{
  "character_id": "uuid-of-player-character",
  "distanceM": 14.3,
  "bracketIdx": 2,
  "dv": 15,
  "weaponName": "SMG",
  "ts": 1716000000000
}
```

- **`character_id`**: UUID from the `characters` table — used to filter in `player.html`
- **`bracketIdx`**: 0–7 (index into `RANGE_BRACKETS = [6, 12, 25, 50, 100, 200, 400, 800]`)
- **`dv`**: DV at that distance for the selected weapon (or `null` if out of range)
- **`ts`**: Unix timestamp in milliseconds — entries older than 60s are ignored by `player.html`

---

## Smoke Test Checklist

1. **DV Table (8 brackets)**: Open map in browser console → `getDV('pistol', 200)` → `30`; `getDV('shotgun', 300)` → `null` (N/A zone)

2. **Range Rings**: Player selects a weapon from the dropdown → click "👁 Zonen" → colored concentric rings appear around own token, with DV labels per zone. N/A zones show as dashed. Click again to hide.

3. **Measure Line**: Activate measure tool, drag across map → zone-colored dashed line with arrowhead + pill label `"14.3m · DV 15"`. Color changes with distance zone.

4. **Weapon Card**: Player selects weapon → card shows: name, damage dice (gold), ammo · ROF · hands, magazine bar with reload button, action toggle buttons.

5. **DV Info Box**: With weapon selected + measurement active → blue info bar appears: `"14.3m · 13–25m · DV: 15"`. Also visible in attack panel.

6. **Attack Roll Flow**:
   - Click "🎲 Angriff würfeln" → result shows d10 + stats vs DV, CRITICAL SUCCESS badge on nat 10
   - On hit → Step 2 (Schadenswurf) appears
   - Click "💀 Schaden würfeln" → dice result, deducts 1 ammo (10 if autofire)
   - Step 3 appears → enter enemy SP → `"12 − 8 SP = 4 HP · SP sinkt auf 7"` → "✅ Schaden anwenden" → HP updates in Supabase
   - "↺ Neuer Angriff" resets to Step 1

7. **Autofire**: Select autofire-capable weapon (SMG/Assault Rifle) → click "🔫 Autofire" → toggle says "🔫 Autofire AN" → attack roll → damage multiplied by min(margin, 3 for SMG / 4 for AR) → two max-die rolls → "⚠ CRITICAL INJURY!" toast

8. **Shotgun Cone (Visual Only)**: Select shotgun → click "🎯 Kegel" → orange cone appears following mouse cursor over map. No damage dialog. Click "🎯 Kegel AUS" → cone disappears.

9. **Distance Sync**: Player measures distance on map → open `player.html?id=...` in another browser tab → click "📡 Aus Map" → distance + DV + weapon name appear instantly. Moving map measurement → player.html auto-updates via `storage` event.
