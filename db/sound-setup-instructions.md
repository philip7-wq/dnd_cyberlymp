# Sound Management System — Supabase Setup

Führe den gesamten Inhalt von `db/sound-schema.sql` im **Supabase SQL Editor** aus (als einen Block).

---

## Was jeder Block macht

| Block | Zweck |
|---|---|
| `sound_library` | Metadata für hochgeladene Audio-Dateien (Name, URL, Kategorie, Dauer) |
| `sound_buttons` | DM-konfigurierte Trigger-Buttons (Name, Sound-Ref, Farbe, Hotkey) |
| **GRANTS** | Gibt `anon` + `authenticated` Lese-/Schreibzugriff |

---

## Storage Bucket erstellen

1. Supabase Dashboard → **Storage** → **New bucket**
2. Name: `sounds`
3. **Public bucket**: ON (Spieler müssen die URLs direkt laden können)
4. Save

---

## Grants (falls Berechtigungsfehler)

Falls du nach dem Ausführen `permission denied for table sound_library` o.ä. siehst:

```sql
grant all on sound_library to anon, authenticated;
grant all on sound_buttons  to anon, authenticated;
```

---

## Danach testen

1. `dm.html` → Sound-Tab (🔊 SOUND) sichtbar
2. Audio-Datei hochladen → erscheint in der Library-Liste
3. Button erstellen → erscheint im Launchpad (One-Shot) oder als Strip (Ambiente/Music)
4. Button klicken → `player.html` Lautsprecher-Icon leuchtet, Ton hörbar
5. Ambiente-Toggle → loopt, LED dauerhaft an
6. Zweiten Music-Track starten → vorheriger stoppt automatisch
7. Stop All → alle Töne stoppen, alle LEDs aus
