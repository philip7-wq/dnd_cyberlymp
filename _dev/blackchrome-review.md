# REVIEW — Black-Chrome vor dem Seed

> Reine Anzeige-/Abnahme-Doku. Stand: `db/black_chrome_items.json` (137 Items, ungeseedet).
> Basis: `_dev/blackchrome-mapping-concept.md`. **Nichts geändert, nichts geseedet.**

---

# TEIL 1 — Die 12 Multi-Mode-Waffen

Jede ist mit `_problem` markiert. Gemappt ist immer der **Primärmodus**; alle Alternativmodi stehen im `notes`-Text. Spalte „⚠" = empfohlene bewusste Entscheidung.

### Nahkampf / Exotic (4)

| Waffe | Primär (cat) | dmg | rof | skill | price | ⚠ |
|---|---|---|---|---|---|---|
| **SlamDance FangFist** | Melee Weapon | 2d6 | 2 | Melee | 1000 (V Exp) | ok |
| **The Pursuit Security Bouncer** | Melee Weapon | 2d6 | 2 | Melee | 500 (Exp) | ⚠ Stun-Baton + Microwaver — 2d6 ist Roh-Schaden, Stun-Effekt nur in notes |
| **Kendachi Mono-Star** | Exotic Weapon | 2d6 | 2 | `Melee/Athletics` | 500 (Exp) | ⚠ skill als Slash-String |
| **Utility Tomahawk** | Exotic Weapon | 3d6 | 2 | `Melee/Athletics` | 100 (Prem) | ⚠ skill als Slash-String |

- **FangFist** notes: *„Excellent Quality; im Zug der Blade-Deployment wie Very Heavy Melee Weapon."*
- **Bouncer** notes: *„Kombi aus Stun Baton und Microwaver; braucht Battery Pack."*
- **Mono-Star** notes: *„Halves SP when thrown; kann zweite Critical Injury verursachen."*
- **Tomahawk** notes: *„Halves SP when thrown."*

### Fernkampf (8)

| Waffe | dmg | rof | ammo | mag | skill | price | ⚠ |
|---|---|---|---|---|---|---|---|
| **Eagletech Survivalist** | 4d6 | 1 | — | — | Archery | 500 | ⚠ ammo/mag leer (Quelle `—/10 (Rifle)`); Bogen+Gewehr-Kombi |
| **KTech TechHammer** | 5d6 | 1 | Slug | 4 | Shoulder Arms | 1000 | ok (Rocket-Modus in notes) |
| **Militech Fox Dual Ammo Pistol** | 3d6 | 2 | H Pistol | 10 | Handgun | 1000 | ok (2. Magazin in notes) |
| **Militech Mastiff SMG** | 2d6 | 1 | M Pistol | 30 | Handgun | 1000 | ⚠ rof=1 wirkt niedrig für SMG; Autofire x3 nur in notes |
| **ModFire 10X** | 3d6 | 2 | **—** | 8 | **`Handgun or Shoulder Arms`** | 1000 | ⚠ ammo leer (kein Klammer-Token in Quelle) + skill kein Einzelwert |
| **Sanroo Hello Cutie Ultra-K8** | 4d6 | 1 | VH Pistol | 30 | Handgun | 5000 | ok |
| **Sternmeyer M-04 Variable Assault** | 5d6 | 1 | Rifle | 20 | Shoulder Arms | 500 | ok (Grenade-Modus in notes) |
| **Tommyknocker** | 4d6 | 1 | VH Pistol | 8 | Handgun | 1000 | ⚠ hands=`Special` (String, nicht 1/2) |

Volle notes:
- **Eagletech Survivalist:** *„Combination; Sniping Scope; kann Non-Basic Ammo laden."*
- **KTech TechHammer:** *„Shotgun Shell; lädt Slugs/Shells/Smart Rockets; Smart Rockets brauchen keinen Targeting Scope."*
- **Militech Fox:** *„Kann Non-Basic Ammo; zwei Ammo-Typen parallel, je einer pro Magazin."*
- **Militech Mastiff SMG:** *„Combination; Autofire x3; Suppressive Fire; Shotgun Shells."*
- **ModFire 10X:** *„Umbau zwischen Heavy Pistol, SMG und Assault Rifle in 1 Minute; Autofire x3/x4 und Suppressive Fire in SMG/AR."*
- **Sanroo Hello Cutie:** *„Excellent Quality; Action zum Wechsel zwischen Very Heavy Pistol und Heavy SMG; Autofire x3/Suppressive Fire als SMG; +2 Wardrobe & Style; Anime-Sounds."*
- **Sternmeyer M-04:** *„Poor Quality Combination; Autofire x4; Suppressive Fire; Jam betrifft beide Modi; Non-Basic Grenades möglich."*
- **Tommyknocker:** *„Combination; Poor Quality Shotgun; Shotgun Shells; mit 2 Händen oder BODY 10+, sonst Risiko Waffe zu verlieren."*

**Entscheidungen TEIL 1** (Default = so lassen):
- **F-1:** `Melee/Athletics`-Slash-Skill bei Mono-Star & Tomahawk → auf `Athletics` (Wurf) vereinheitlichen?
- **F-2:** `ModFire 10X` & `Eagletech Survivalist` haben **leeres `ammo`** (Quelle ohne Klammer-Token) → manuell `H Pistol` bzw. `Arrow` setzen?
- **F-3:** `ModFire 10X` `weapon_skill` `"Handgun or Shoulder Arms"` → auf Primär `Handgun` kürzen?
- **F-4:** `Tommyknocker` `hands:"Special"` → so lassen (Detail in notes) oder auf `2` setzen?

---

# TEIL 2 — Die 16 Cyberfinger-Items

Alle: `subcategory = "Cyberfinger"`, `install = "Mall"`, Trigger-Notiz **„Requires Modular Finger Cyberhand."** korrekt gesetzt.

| Cyberfinger | humanity_loss | Trigger |
|---|---|---|
| Airhypo | 3 (1d6) | ✓ Requires Modular Finger Cyberhand. |
| Ballpoint | 0 (N/A) | ✓ |
| Bullet Storage | 3 (1d6) | ✓ |
| Dartgun | 7 (2d6) | ✓ |
| Flashlight | 3 (1d6) | ✓ |
| Homing Tracer | 3 (1d6) | ✓ |
| Laser Pointer | 3 (1d6) | ✓ |
| Lighter | 3 (1d6) | ✓ |
| **Lockpick** | **2 (1d6/2)** | ✓ |
| **Microphone** | **2 (1d6/2)** | ✓ |
| **Mini Air Supply** | **2 (1d6/2)** | ✓ |
| One Shot Special | 7 (2d6) | ✓ |
| Spray Paint | 3 (1d6) | ✓ |
| Squirt | 3 (1d6) | ✓ |
| Standard | 0 (N/A) | ✓ |
| Wirecutter/Scissor | 3 (1d6) | ✓ |

**Hinweise/Fragen TEIL 2:**
- **C-1:** 3 Finger haben `humanity_loss = "2 (1d6/2)"` (Würfel halbieren). Der **Max-Wert 2 stimmt** fürs Gating; aber `rollHumanityLoss` ignoriert das `/2` beim Würfeln. → später Roller-Regex erweitern **oder** jetzt auf `"2 (1d6)"` runden? (kosmetisch, kein Gate-Fehler)
- **C-2:** Subcategory `"Cyberfinger"` ist im Live-Modell **unbekannt** → `getItemSlots` fällt auf `internal` zurück (kein Fehlgate, belegt aber internen Slot). Echtes Hard-Gate „Cyberhand muss da sein" kommt erst mit **D3** (Code). OK so als Zwischenstand?
- **C-3:** Bei manchen Fingern steht der Hinweis **doppelt** (deutsch im Quelltext + englischer Trigger), z.B. Airhypo: *„…braucht Modular Finger Cyberhand. Requires Modular Finger Cyberhand."* → so lassen (englischer Teil ist der maschinenlesbare Gate-Trigger) oder deutschen Halbsatz entfernen?

---

# TEIL 3 — Rest-Fahrplan bis „Feature fertig"

Reihenfolge mit Abhängigkeiten. **D** = Daten-Auftrag, **C** = Code-Auftrag.

### Phase A — Daten live bringen
| # | Schritt | Datei(en) | Typ | Risiko | Abhängigkeit |
|---|---|---|---|---|---|
| **A1** | *(optional)* TEIL-1/2-Korrekturen (F-1…F-4, C-1) einpflegen | `generate_black_chrome.py` → regeneriert `db/black_chrome_items.json` | D | niedrig | — / **vor A2** |
| **A2** | **Seed** `npm run seed:blackchrome` → 137 `upsert(onConflict:id)` in `items`-Tabelle | `db/seed_black_chrome.js` | D | **mittel** (DB-Schreib) | blockiert-durch: `.env` SERVICE_ROLE_KEY; A1 falls Korrekturen |
| **A3** | Sichtprüfung im Shop (Kategorien, Gating, Humanity-Preview) | — (Browser) | — | niedrig | blockiert-durch: A2 |

**Zu A2 im Detail:**
- **Voraussetzung:** `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL` in `.env` (bypassed RLS). **⚠ Q-PRÜFEN:** `.gitignore` muss `.env` ausschließen — bitte bestätigen, dass `.env` nicht eingecheckt ist.
- **Was passiert:** 137 Zeilen werden ge-`upsert`et (Non-Core-Felder → `extra`, inkl. `nightmarket:true`). Bestehende 581 unberührt.
- **Idempotenz/Rollback:** Re-Run überschreibt dieselben ids (kein Duplikat). Rollback = `DELETE FROM items WHERE extra->>'nightmarket' = 'true'` (sauber isolierbar dank Flag).
- *kann-parallel:* B1, E1, E2 brauchen A2 **nicht**.

### Phase B — Gating-Feinschliff (Shop)
| # | Schritt | Datei | Typ | Risiko | Abhängigkeit |
|---|---|---|---|---|---|
| **B1 (D7)** | `ROLE_HIGHLIGHTS` um Black-Chrome-Namen erweitern (Liste je Rolle im Konzept §2b: u.a. Solo→Neo-Soviet Cyberarm/Reflex Co-Processor/Kendachi Mono-Katana, Netrunner→Integrated Cyberdeck Upgrade/Budget Chipware Socket, Tech→Modular Finger Cyberhand/Cyberfingers, Medtech→Trauma Response Nanomatrix, Nomad→Nomad Rocker/RacerBracer …) | `public/shop.html` ~120 | C | niedrig | kann-parallel zu allem |
| **B2 (D3)** | Cyberfinger-Hard-Gate: `getFoundationalBlock`/`getGates` um Cyberhand-Prereq erweitern (analog Neural-Link-Sonderfall) + ggf. eigener Cyberhand-Slot | `public/shop.html` ~290/373 | C | mittel | kann-parallel; greift erst nach A2 sichtbar |

### Phase C — Inventar-Korrektheit (Voraussetzung für „Item bei BM-Annahme")
| # | Schritt | Datei | Typ | Risiko | Abhängigkeit |
|---|---|---|---|---|---|
| **C1** | **grantItem Cyberware-Array/Slot-Bug fixen** (Report §6): `grantItem` schreibt Cyberware als flaches Array statt Slot-Objekt `{slot:[…]}` → auf Slot-Struktur wie in `shop.html` umstellen | `public/dm.html` ~3248 | C | **mittel-hoch** (Datenstruktur-Konsistenz) | **blockiert D-Phase** |
| **C2 (D4)** | Ammo-Snapshot + Multi-Mode: `buildSnapshot` so erweitern, dass Magazin/Ammo/Autofire aus `item.ammo`/`extra.magazine` gefüllt werden (statt nur `weapon_ammo_mapping[name]`) | `public/shop.html` ~783 (+ `dm.html` nutzt dieselbe Logik) | C | mittel | kann-parallel zu C1 |

### Phase D — DM-Schwarzmarkt-Listen-Picker
| # | Schritt | Datei | Typ | Risiko | Abhängigkeit |
|---|---|---|---|---|---|
| **D1** | DM-Offer: Freitext-`bmOfferItem` durch **Listen-Picker** ersetzen (Muster `renderDmItemsGrid`/`getItems`, gefiltert auf `extra.nightmarket===true`); Auswahl füllt `item_name`+Listenpreis, Custom-Preis bleibt überschreibbar; `offer` um `item_id` erweitern | `public/dm.html` ~3439/3592 | C | mittel | blockiert-durch: A2 (Daten müssen live sein) |
| **D2** | Bei BM-Annahme **Item ins Inventar** (`grantItem`/`buildSnapshot`-Wiederverwendung) statt nur Cash-Abzug | `public/player.html` ~4129 | C | mittel | **blockiert-durch: C1** (+ C2 für Waffen) |

### Phase E — Schema/Hausaufgaben (jederzeit, unabhängig)
| # | Schritt | Datei | Typ | Risiko | Abhängigkeit |
|---|---|---|---|---|---|
| **E1 (Q-B)** | `blackmarket_state jsonb` in Schema nachtragen (`ALTER TABLE characters ADD COLUMN IF NOT EXISTS blackmarket_state jsonb;`) — aktuell nur ad-hoc in Supabase, fehlt im Repo | `db/schema.sql` | D/SQL | niedrig | kann-parallel |
| **E2 (Q-A)** | items.json-Master klären: `db/items.json` (+147 B) vs. `public/.../items.json` — welche ist Wahrheit; ggf. angleichen | `db/items.json` / `public/assets/data/items.json` | D | niedrig | kann-parallel |

### Kritischer Pfad
```
A1(opt) → A2 → D1
C1 → D2        (C1 MUSS vor D2)
C2 → D2        (für Waffen-Items)
B1, B2, E1, E2 = jederzeit parallel
```
**Reihenfolge-Empfehlung:** A1(opt)→**A2** zuerst (schaltet Shop frei), dann **C1** (Bug, blockiert D2), parallel B1; danach D1→D2; B2/C2/E1/E2 nach Bedarf.

---

## Offene Fragen vor dem Weitermachen
- **TEIL 1:** F-1…F-4 (v.a. leere `ammo`-Felder bei ModFire/Eagletech — F-2).
- **TEIL 2:** C-1 (HL `1d6/2` runden?) und C-3 (Doppel-Hinweis entfernen?).
- **Q-PRÜFEN:** Ist `.env` in `.gitignore` (vor A2)?
