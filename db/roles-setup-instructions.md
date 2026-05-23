# Rollen-Interface V2 — Supabase SQL Setup

Führe den gesamten Inhalt von `db/roles-schema.sql` im **Supabase SQL Editor** aus (als einen Block).

---

## Was jeder Block macht

| Block | Zweck |
|---|---|
| `role_inventory` | Generische Inventar-Tabelle — Drugs, Programs, Contacts, Vehicles, Team Members, Fans, etc. |
| `role_actions` | Log jeder Rollen-Aktion (Würfe, Calls, Haggle, Backup) — Realtime-fähig |
| **GRANTS** | Gibt `anon` + `authenticated` Lese-/Schreibzugriff (kein RLS nötig) |
| **REALTIME** | Aktiviert Live-Updates auf `role_inventory` + `role_actions` |

---

## Grants (falls Berechtigungsfehler)

Falls du nach dem Ausführen `permission denied for table role_inventory` o.ä. siehst:

```sql
grant all on role_inventory to anon, authenticated;
grant all on role_actions    to anon, authenticated;
```

---

## Danach testen

1. `player.html?id=<medtech-char>` → Rollen-Tab zeigt Pharma Lab + Specialties
2. Speedheal brauen → DV 13 Medical Tech Check, heilt BODY+WILL HP (nicht pauschal 5)
3. `player.html?id=<lawman-char>` → Backup-Call Button; 1d10 ≤ Rank = Erfolg + 1d6 Rounds
4. `player.html?id=<solo-char>` → Combat Awareness Punkt-Verteilung (2/4/6/8/10 + 3/6/9)
5. `player.html?id=<rockerboy-char>` → Würfelbutton: Rank+1d10 vs DV 8/10/12 (kein COOL/Skill)
