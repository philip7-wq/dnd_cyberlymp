# iCHOOM Agent — Supabase SQL Setup

Führe den gesamten Inhalt von `db/agent-schema.sql` im **Supabase SQL Editor** aus (als einen Block, nicht schrittweise).

---

## Was jeder Block macht

| Block | Zweck |
|---|---|
| `agent_contacts` | Speichert Kontaktlisten pro Charakter (Player↔Player automatisch, Player↔NPC via Code) |
| `agent_npc_codes` | NPC-Zugangs-Codes im Format `NX-1234` — DM generiert, Spieler gibt ein |
| `agent_threads` | 1:1-Gesprächscontainer (kanonische a<b-Sortierung, damit jedes Paar nur einen Thread hat) |
| `agent_messages` | Einzelne Chat-Nachrichten innerhalb eines Threads |
| `agent_calls` | Anruf-Einträge mit Status: `ringing → answered / missed / declined / ended` |
| `agent_transfers` | EddieWire-Geldtransfers (`send`=sofort, `request`=pending→accepted) |
| **Trigger 1** `trg_agent_add_player_contacts` | Beim Anlegen eines neuen Charakters werden automatisch gegenseitige Kontakte erstellt |
| **Trigger 2** `trg_agent_bump_thread` | Aktualisiert `last_message_at` eines Threads bei neuer Nachricht |
| **Trigger 3** `trg_agent_apply_transfer` | Zieht/addiert `characters.cash` automatisch beim Transfer (INSERT oder `pending→accepted`) |
| **RPC** `agent_get_or_create_thread` | Gibt existierenden Thread zurück oder erstellt einen neuen für ein Paar |
| **SEED** | Befüllt Kontakte für alle bereits vorhandenen Charaktere nachträglich |
| **REALTIME** | Aktiviert Live-Updates auf allen `agent_*` Tabellen |

---

## Voraussetzungen & Warnungen

- **`characters.cash`** muss existieren — ist bereits vorhanden ✓
- **`npcs`** Tabelle muss Felder `id`, `name`, `image_url`, `role` haben — vorhanden ✓
- **Trigger 3** schreibt direkt auf `characters.cash` (bypass der `cash_log` Spalte). EddieWire-Transfers tauchen nicht im Cash-Log auf. Bei Bedarf manuell vom DM nachtragen oder den Trigger erweitern.
- Die SQL-Datei ist **idempotent** (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS`) — sie kann mehrfach ausgeführt werden ohne Fehler.
- Bestehende Datensätze in `characters` werden durch den SEED-Block mit gegenseitigen Kontakten befüllt. Bei vielen Charakteren kann das einen Moment dauern.
- Falls du eine Fehlermeldung bekommst wie *"publication supabase_realtime does not exist"*: Prüfe in Supabase unter **Database → Replication** ob Realtime aktiviert ist.

---

## Danach testen

1. **player.html** öffnen → iCHOOM-Bar erscheint unten mittig
2. Bar anklicken → Handy-UI fährt hoch mit Boot-Animation
3. **Contacts** → andere Spieler-Charaktere sind bereits gelistet
4. **EddieWire** → zeigt `characters.cash` des Charakters
5. **dm.html** → goldene DM-Bar erscheint unten, anklicken → NPC-Auswahl
6. DM wählt NPC, generiert Code → Spieler gibt Code in Contacts ein → NPC-Kontakt hinzugefügt
7. Spieler schickt Nachricht → DM sieht sie im Chrome Chat als dieser NPC, antwortet → Spieler empfängt
