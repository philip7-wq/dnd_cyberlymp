# Map System Update — Supabase Setup Instructions

Run the following SQL blocks in the **Supabase SQL Editor** (Database → SQL Editor → New Query).

---

## Block 1 — Add `death_state` to characters

```sql
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS death_state boolean DEFAULT false;
```

**Verify:** Go to Table Editor → characters → Schema and confirm `death_state` column exists with type `boolean`.

---

## Block 2 — Create `roll_requests` table

```sql
CREATE TABLE IF NOT EXISTS roll_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id     uuid REFERENCES characters(id) ON DELETE CASCADE,
  damage_formula   text NOT NULL,
  damage_source    text NOT NULL,
  effect_description text,
  roll_result      int,
  resolved         boolean DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

GRANT ALL ON roll_requests TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE roll_requests;
```

**Verify:** Table Editor → roll_requests should appear with the listed columns.

---

## Block 3 — Create `saved_maps` table

```sql
CREATE TABLE IF NOT EXISTS saved_maps (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL DEFAULT 'Neue Karte',
  thumbnail_url text,
  map_data     jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

GRANT ALL ON saved_maps TO anon, authenticated;
```

**Verify:** Table Editor → saved_maps should appear.

---

## Smoke Test Checklist

1. **Grid (DM-only)**: Open map as DM → grid size slider visible in topbar. Open map as player → slider NOT visible. DM changes size → player's grid updates.

2. **Vehicle sizes**: DM adds Aerozep token → token renders as 4×6 grid cells. Add Motorrad → 1×2. Right-click vehicle → "📐 Größe ändern" appears in context menu.

3. **Death system**: Right-click a character token as DM → "☠ Tod / Beleben" appears. Click it → token shows grey overlay + red X + "TOT". In another tab (player), confirm red banner "☠ DU BIST TOT — SPECTATOR MODE" appears at top.

4. **Player self-roll**: DM places AoE on player token, rolls damage, clicks Anwenden → player sees "⚠ SCHADEN ERHALTEN!" modal. Player clicks Würfeln → dice animation → Bestätigen → HP updates on both DM dashboard and player sheet.

5. **Combat bar**: Start combat in dm.html. Open map.html as DM → horizontal bar appears above canvas with combatant cards. Active combatant card has gold border. Drag cards to reorder. Click "▶ Nächster" → next card gets gold border on all connected clients.

6. **Map save/load**: DM sidebar shows "KARTEN" section. Click "+ Neu" → name prompt → saves snapshot. DM reloads page → dropdown shows saved map. Click "📂 Laden" → all tokens and background load on all clients. Ctrl+S saves current state.
