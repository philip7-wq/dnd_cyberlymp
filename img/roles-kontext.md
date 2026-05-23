# Rollen-Interfaces V2 — Cyberpunk RED Playbook-aligned

> **Was hat sich seit V1 geändert?** Die Werte (DVs, Brewing-Mechanik, Backup-Tiers, Programm-Stats etc.) sind jetzt **aus dem Core Rulebook entnommen**, nicht mehr aus meinem Cyberpunk-RED-Allgemeinwissen heuristisch geschätzt. Wenn ihr V1 schon eingebaut habt: alle 15 Dateien einfach komplett überschreiben.

## Die 10 Rollen + Class Ability + Signature UI (Playbook-Seitenzahlen)

| Rolle | Class Ability | Signature UI |
|---|---|---|
| **Solo** | Combat Awareness | Punkt-Verteilung mit exakten Kosten (pg. 146) |
| **Netrunner** | Interface | NET Crawl + Programs Loadout + alle Actions (pg. 147, 195-218) |
| **Tech** | Maker | 4 Specialty Tracker + DV/Time-Tabelle (pg. 147-149) |
| **Medtech** | Medicine | Pharma Lab brewt 5 echte Drugs + Specialty Tracker (pg. 149-150) |
| **Media** | Credibility | Rumor-Tabelle + Believability-Roll (pg. 151-153) |
| **Exec** | Teamwork | 5 Team Member Klassen + Loyalty 1-10 (pg. 153-157) |
| **Lawman** | Backup | 1d10 ≤ Rank + 6 Tiers mit Combat Numbers (pg. 158-159) |
| **Fixer** | Operator | Haggle COOL+Trading+Op vs same + Reach (pg. 159-161) |
| **Nomad** | Moto | Family Motorpool + Vehicle Upgrades (pg. 161-164) |
| **Rockerboy** | Charismatic Impact | Charismatic Impact + 1d10 (nur Rank!) (pg. 144-145) |

## Würfel-Mechanik (alle aus dem Playbook)

- Standard Check: `STAT + Skill + 1d10 + Modifier vs DV`
- Role-Ability-only Check (Charismatic Impact, NET Actions): `Role Ability Rank + 1d10 vs DV`
- Backup Call (Lawman): `1d10 ≤ Backup Rank` + `1d6` Rounds (6 = Tier+1)
- Loyalty Save (Exec): `1d6 < Team Member Loyalty`
- Believability (Media): `1d10 ≤ Threshold` (Threshold = Rank-spezifisch + Hard Evidence Bonus)
- Critical: nat 10 → reroll + addieren, nat 1 → reroll + subtrahieren
- Solo Fumble Recovery (4 CA-Punkte): negiert das Subtract bei nat 1

Implementiert in `roles-core.js`: `performCheck`, `performAbilityCheck`, `rollBackupCall`, `rollD6`.

## Datei-Struktur

```
db/
  roles-schema.sql              ← role_inventory + role_actions Tabellen
assets/css/
  roles.css                     ← Shared shell + per-role Accent-Themes
assets/js/roles/
  roles-core.js                 ← Dice, UI-Helpers, Supabase, Log-Widget
  roles-router.js               ← Erkennt character.role → mountet richtiges Modul
  solo.js                       ← Combat Awareness Punkt-Verteilung
  netrunner.js                  ← NET Crawl + Deck + Actions + Reference
  tech.js                       ← Workshop + Projects + Specialties
  medtech.js                    ← Pharma Lab + Patient + Surgery + Specialties
  media.js                      ← Credibility + Rumors + Publish + Archiv
  exec.js                       ← Team + Perks + Loyalty
  lawman.js                     ← Backup Call + Tier Reference + Authority
  fixer.js                      ← Operator + Haggle + Reach
  nomad.js                      ← Garage + Familie + Pack Tactics
  rockerboy.js                  ← Stage + Fans + Setlist
```

## Datenbank-Modell

**role_inventory** — generisch für alles was eine Rolle craftet/besitzt:
- `category`: `'drug' | 'program' | 'project' | 'invention' | 'contact' | 'vehicle' | 'team_member' | 'fan' | 'story' | 'intel' | 'architecture' | 'specialty'`
- `name`, `description`, `charges`, `max_charges`
- `meta` (JSONB): kategorie-spezifisch

**role_actions** — Log jeder Rollen-Aktion:
- `role_name`, `action`
- `target_type/_id/_name`
- `roll` (JSONB): full details
- `result_summary`

Beide Tabellen via Realtime → Log aktualisiert sich live.

## Erwartete Character-Felder
- `id` (uuid)
- `role` (lowercase: `'solo' | 'netrunner' | 'tech' | 'medtech' | 'media' | 'exec' | 'lawman' | 'fixer' | 'nomad' | 'rockerboy'`)
- `role_rank` (int, default 4 — Streetrat-Start per Playbook)

Falls eure Felder anders heißen (`class`, `archetype`, etc.): `roles-router.js` + `roles-core.js → buildHeader()` anpassen.

## Integration in player.html

```html
<link rel="stylesheet" href="/assets/css/roles.css">
<div id="role-tab-mount"></div>
<script type="module">
  import { mountRoleInterface } from '/assets/js/roles/roles-router.js';
  const character = window.currentCharacter;
  mountRoleInterface(document.getElementById('role-tab-mount'), character);
</script>
```

Bei Lazy-Loaded Tab: erst beim ersten Click mounten, nicht doppelt.

## Supabase-Import Pfad
Alle JS-Files importieren mit: `import { supabase } from '../supabase.js';`
Falls euer Pfad anders ist (siehe agent-Feature zum Vergleich): alle Imports konsistent anpassen.

## Wichtigste Playbook-Werte (alle als Konstanten in den Files)

### Medtech (medtech.js)
- **5 offizielle Pharmaceuticals**: Antibiotic, Rapidetox, Speedheal (heilt BODY+WILL HP, nicht 5!), Stim, Surge
- **Brewing**: DV13 Medical Tech Check, 200eb pro Batch, # Doses = aktueller Medical Tech Skill, 1h
- **Wichtig**: Non-Medtechs können Pharmaceuticals NICHT korrekt anwenden
- **Surgery**: 2 Surgery Skill Pts pro Specialty-Allocation (max 10 Punkte → Skill 20)

### Netrunner (netrunner.js)
- **NET Actions pro Turn**: Rank 1-3=2, 4-6=3, 7-9=4, 10=5
- **Alle Resolution**: Interface Rank + 1d10 vs DV (KEIN STAT/Skill!)
- **Programs**: Boosters (Eraser/See Ya/Speedy/Worm), Defenders (Armor/Flak/Shield), Attackers (Banhammer/Sword/DeckKRASH/Hellbolt/Nervescrub/Poison Flatline), Black ICE (Asp/Hellhound/Liche/Raven/Giant/Kraken)
- Starter-Set Button lädt Eraser/Shield/Sword/Banhammer

### Solo (solo.js)
- **Combat Awareness Punkt-Kosten** (exakt aus Playbook):
  - Damage Deflection: 2/4/6/8/10 Pts = −1/−2/−3/−4/−5 dmg
  - Fumble Recovery: 4 Pts (binary toggle)
  - Precision Attack: 3/6/9 Pts = +1/+2/+3 ATK
  - Initiative Reaction / Spot Weakness / Threat Detection: 1 Pt pro +1

### Tech (tech.js)
- **DV/Time pro Price-Category**:
  - Cheap/Everyday: DV 9, 1h
  - Costly: DV 13, 6h
  - Premium: DV 17, 1 day
  - Expensive: DV 21, 1 week
  - Very Expensive: DV 24, 2 weeks
  - Luxury: DV 29, 1 month
  - Super Luxury: DV 29, 1 month pro 10,000eb
- **Maker Rank-Up**: 2 Punkte in 2 verschiedene Specialties

### Media (media.js)
- **Rumor Tiers (Passive/Active DV)**: Vague 7/13, Typical 9/15, Substantial 11/17, Detailed 13/21
- **Believability Threshold**: Rank 1-2: 2/10, 3-4: 3/10, 5-6: 4/10, 7-8: 5/10, 9: 6/10, 10: 7/10
- **+1 Threshold** bei 1+ Hard Evidence, **+2** bei 4+

### Exec (exec.js)
- **5 Team Member Klassen**: Bodyguard, Covert Op, Driver, Netrunner, Technician
- **Starting Loyalty**: 1d6 + 1
- **Loyalty Save**: 1d6 < Loyalty = success
- **Perks**: Rank 1 Businesswear Suit, Rank 2 Corporate Conapt, Rank 7 Beaverville House
- **Loyalty Gains/Losses**: alle Werte exakt aus Playbook pg. 154

### Lawman (lawman.js)
- **Backup Tiers** (Combat Number / SP / HP / MOVE & BODY):
  - Rank 1-2: 8/7/20/4 — 4 Corporate Security (Heavy Pistols, Kevlar)
  - Rank 3-4: 10/7/25/5 — 4 Local Beat Cops (2 Compact Cars)
  - Rank 5-7: 14/13/35/4 — 2 County Mounties (HP Groundcar, Assault Rifles)
  - Rank 8: 16/15/50/6 — 1 Recovery Zone Marshal (Superbike, VHP+AR+GL, Flak)
  - Rank 9: 15/18/35/4 — 2 C-SWAT (AV-4, Rocket Launchers, Metalgear)
  - Rank 10: 14/11/35/6 — 2 National Law Enforcement (AV-4, Interpol/FBI/Netwatch)

### Fixer (fixer.js)
- **Reach pro Rank**: 1-2: Cheap/Everyday, 3-4: Expensive, 5-6: Night Market (Super Luxury), 7-8: Very Expensive, 9: Luxury + Midnight Market, 10: Super Luxury direkt
- **Haggle pro Rank**: 1-2: 10% besser, 3-4: buy 5 get 1 free, 5-6: +20% job pay, 7-8: 50%-jetzt-50%-Monat für Luxury+, 9: 20% besser, 10: doppelte pay für Dangerous Jobs
- **Haggle Roll**: COOL + Trading + Operator Rank + 1d10 vs Target's same

### Nomad (nomad.js)
- **Family Motorpool pro Rank**:
  - 1-4: Compact Groundcar, Gyrocopter, Jetski, Roadbike
  - 5-6: + Helicopter, HP Groundcar, Speedboat
  - 7-8: + AV-4, Cabin Cruiser, Superbike
  - 9-10: + Aerozep, AV-9, Super Groundcar, Yacht
- **Pro Rank-Up**: 1 neues Vehicle ODER 1 Upgrade auf bestehendes
- **Rank 10**: alle Vehicles gleichzeitig draußen
- **Destroyed Family Vehicle**: 1 Woche Repair + 500eb Fee
- **Moto Rank wird auto auf alle Drive/Pilot/Vehicle Tech Checks addiert**

### Rockerboy (rockerboy.js)
- **Roll**: Charismatic Impact Rank + 1d10 (KEIN STAT, KEIN Skill!)
- **DVs**: Single Fan DV8, Small Group ≤6 DV10, Huge Group DV12
- **Bei Fail**: 1 Woche kein Re-Try mit denselben Fans
- **Effects pro Rank** skalieren von "drink ordering" bis "private army"
- **Convert Non-Fans → Fans**: gleiche DVs (außer "actively dislikes" → auto fail)

## Was NICHT angefasst wird
- Bestehende Tabellen (characters, items, etc.)
- Keine npm-Pakete, kein Build-Step
- Stats/Combat/Map/Shop/Agent-Features bleiben unverändert
- Feature ist additiv — kann komplett raus ohne Bruch
