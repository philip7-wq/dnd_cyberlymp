# KONZEPT — Black-Chrome → items-Schema Mapping (SPEZIFIKATION, kein Import)

> Reines Mapping-Konzept zur Freigabe. **Kein** DB-Insert, **kein** Code ausgeführt, **nichts** geändert.
> Basis: `REPORT-shop-nightmarket-analyse.md`. Quelle: `data-import/black_chrome_nightmarket_liste.json`
> (168 Items, 0 Namensüberlappung mit Bestand, 0 id-Kollision, alle cost-Strings standardkonform).
> Ziel: Supabase `items`-Tabelle, jedes Item `extra.nightmarket = true`, voll gegatet.
> **Scope (entschieden):** Erster Import = **137 Items** (168 − 31 Vehicles). Vehicles + ROLE_HIGHLIGHTS
> + Cyberfinger-Hard-Gate + Ammo-Snapshot sind separate Folge-Aufträge.
> **Empfohlener Output-Ort nach Freigabe:** `_dev/blackchrome-mapping-concept.md` (+ generiertes
> `db/black_chrome_items.json`).

---

## A. Verifizierte Eckdaten (aus den Daten gezogen)

- **id-Schema Bestand:** `{category-slug}-{subcategory-slug?}-{name-slug}`, lowercase, alles
  Nicht-`[a-z0-9]` → `-`, getrimmt. Beispiele: `ranged-weapon-medium-pistol`,
  `cyberware-fashionware-biomonitor`. → 0 Kollisionen mit generierten Black-Chrome-ids.
- **Live Cyberware-Subcategory-Vokabel (13 Werte):** `Internal Cyberware`, `Neuralware / Chipware`,
  `Cyberarm/Cyberleg/Cyberlimb Option`, `Cyberarm Option`, `Fashionware`, `Cybereye / Cybereye Option`,
  `Cyberaudio Option`, `Cybereye Option`, `Cyberleg/Cyberlimb Option`, `Cyberaudio Suite / Option`,
  `Borgware`, `External Cyberware`, `Cyberarm / Cyberarm Option`.
- **Trigger-String-Konvention im Bestand (von `getFoundationalBlock`/`getSlotCost` gelesen):**
  `"Requires Neural Link."`, `"Requires Chipware Socket."`, `"takes N Option Slots"` (engl., Punkt am Ende).
- **`FOUNDATIONAL_REQ` kennt nur:** `Cybereye Option`→`Cybereye`, `Cyberarm Option`→`Cyberarm`,
  `Cyberleg/Cyberlimb Option`→`Cyberleg`, `Cyberaudio Option`→`Cyberaudio Suite` (Match per **exaktem
  Namen**). Neuralware-Sonderfall: Substring `"Requires Neural Link"` in notes → prüft `neuralLink`-Slot.
- **Ammo-Mapping** (`ammunition.json.weapon_ammo_mapping`) hat nur **generische** Waffennamen
  (`Medium Pistol`, `Assault Rifle` …) → Markenwaffen matchen **nicht** per Name. ABER: das
  Black-Chrome-`magazine`-Feld trägt den Ammo-Typ in Klammern (`"25 (Rifle)"`, `"8 (VH Pistol)"`).

---

## 1. FELD-MAPPING-TABELLE  (Black-Chrome → items-Schema)

| Black-Chrome-Feld | items-Ziel | Regel |
|---|---|---|
| `name` | `name` | 1:1 |
| `category` | `category` + `subcategory` | Kategorie-Mapping → §1a; Cyberware-Subcategory → §2a (gating-kritisch) |
| `cost` `"1,000eb (V Expensive)"` | `price` (int) + `price_category` + `currency` + `raw_cost` | `price = parseInt(cost.replace(/[.,]/g,''))` → `1000`; Klammer-Token → `price_category` via §1b-Vokabel; `currency="eb"`; `raw_cost = cost` (Original behalten) |
| `HL` `"14 (4d6)"` | `extra.humanity_loss` | **Format identisch zum Bestand** → 1:1 übernehmen. `parseMaxHumanityLoss`/`rollHumanityLoss` parsen es bereits (`"0 (N/A)"`→0, `"2 (1d6/2)"` → Klammer `1d6/2`, OPEN: Halbierung, s. §3) |
| `install` | `extra.install` | Werte `Mall/Clinic/Hospital/—` → bei `—` weglassen (null). Deckt sich mit Bestand |
| `type` | (nur Hilfsfeld → Subcategory-Entscheidung) + `extra.bc_type` (Audit) | treibt §2a; Rohwert optional in `extra` zur Nachvollziehbarkeit |
| `company` | `extra.company` | neu, rein informativ |
| `book_page` | `source` = `{page: <int>, book: "Black Chrome"}` | Bestand nutzt `source.page`; Buch kennzeichnen, da nicht Core |
| `description_stats_de` | `notes` | **Deutsch belassen** + Trigger-Strings ergänzen (§2a/§2c) |
| `damage`,`ROF`,`hands` (Waffen) | `damage`,`rof`(int),`hands`(string) | Multi-Mode (`"5d6/8d6"`) → §3 |
| `skill` (Waffen) | `extra.weapon_skill` | Multi-Skill (`"Handgun/Shoulder Arms"`) → §3 |
| `magazine` (Waffen) | `extra.magazine` (Zahl) + `ammo` (Klammer-Token) | `"25 (Rifle)"` → `magazine:"25"`, `ammo:"Rifle"`; Ammo-Typ-Ableitung §2d |
| `concealed` | `extra.concealable` (bool) | `"Yes"→true`, `"No"→false` |
| `armor_type`,`SP`,`armor_penalty`,`appearance_of` | `subcategory`/`notes`, `extra.sp`, `extra.armor_penalty`, `extra.appearance_of` | `SP="—"` → **kein Armor**, s. §3 |
| `vehicle_type`,`nomad_access`,`SDP`,`seats`,`combat_speed`,`narrative_speed` | `extra.*` (roh) | Vehicles → §3 (Sonderfall) |
| — | `extra.nightmarket = true` | **immer** gesetzt (Filterflag für DM-Picker) |
| — | `id` | generiert: `slug(category-slug + "-" + name)` → §1c |

### 1a. Kategorie-Mapping (Black-Chrome → Shop-`category`)
| Black-Chrome `category` | → `category` | Anmerkung |
|---|---|---|
| Firearms | `Ranged Weapon` | `skill`→weapon_skill; Ammo aus `magazine` |
| Melee Weapons | `Melee Weapon` | weapon_skill=`Melee` (Default); „Weeping Reaver Fluid" → **Gear** (§3) |
| Thrown Weapons | `Exotic Weapon` | skill `Melee/Athletics` |
| Explosive Weapons | `Exotic Weapon` *(Grenades evtl. Ammunition)* | §3 OPEN |
| Cyberware, Cyberfingers, Linear Frames | `Cyberware` | Subcategory §2a; Frames=Borgware-intern |
| Fashion & Armor | `Armor` *(falls SP)* / `Fashion` *(SP="—")* | §3 |
| General Goods & Gear | `Gear` | trivial |
| Apps | `Gear` *(empfohlen)* | nicht `Program` (das erwartet rez/atk/def) — §7-D1 |
| Land Vehicles, Air Vehicles | `Nomad Vehicle Access` *(oder defer)* | §3 OPEN |

### 1b. price_category Vokabel-Mapping
`Cheap, Everyday, Costly, Premium, Expensive, Luxury, Super Luxury` → **unverändert** (matchen Bestand).
**Nur korrigieren:** `V Expensive` → **`Very Expensive`**.
(Verteilung der 168: Premium 41, V Expensive 36, Super Luxury 31, Expensive 34, Luxury 14, Everyday 5,
Costly 4, Cheap 3.) Treibt auch `priceTierClass()`-CSS — Token muss zum bekannten Set passen.

### 1c. id-Generierung (kollisionsfrei, idempotent)
`id = slug( <category-slug> + "-" + <name> )`, z.B.
`Modular Finger Cyberhand` (Cyberware) → `cyberware-modular-finger-cyberhand`;
`GunMart Special` (Firearms) → `ranged-weapon-gunmart-special`.
→ Verifiziert: **0 Kollisionen** mit den bestehenden 581 ids. Upsert `onConflict:id` macht Re-Runs idempotent.
**Subcategory NICHT in die id** aufnehmen (vermeidet id-Bruch, falls Subcategory später korrigiert wird).

---

## 2. GATING-AUFBEREITUNG pro Item-Typ

### 2a. Cyberware-Subcategory (gating-kritisch — Slot/Prereq/Injury hängen daran)
Regel: `type` → Basis-Subcategory; **Foundational-Stück** (volle Cyberarm/Cybereye/Cyberaudio-Suite/
Cyberhand) nutzt die `"X / X Option"`-Variante (damit es selbst als Foundation zählt), **Add-on** nutzt
`"X Option"`. Konkrete Zuordnung der 20 Cyberware (+ Trigger-Notes):

| Black-Chrome Item | type | → subcategory | notes-Trigger ergänzen |
|---|---|---|---|
| Borgware Hardened Shielding | Borgware | `Borgware` | — |
| Budget Chipware Socket | Neuralware | `Neuralware / Chipware` | `Requires Neural Link.` |
| Discount Cyberaudio Suite | Cyberaudio | `Cyberaudio Suite / Option` | *(Foundation selbst)* |
| Dynalar Modular Finger Enthusiast Cyberhand | Borgware/Cyberarm | `Cyberarm / Cyberarm Option` | *(Foundation)* |
| Explicit Memory Stimulator | Chipware | `Neuralware / Chipware` | `Requires Chipware Socket.` |
| Extra-Jointed Cyberlimb Upgrade | Cyberlimb | `Cyberarm/Cyberleg/Cyberlimb Option` | — |
| Flashbulb | Cyberarm | `Cyberarm Option` | — *(braucht Cyberarm via FOUNDATIONAL_REQ)* |
| Hardened Cybereye Casing | Cybereye | `Cybereye Option` | — |
| Heuristic Health Monitor | Fashionware | `Fashionware` | — |
| Integrated Cyberdeck Upgrade | Cyberarm | `Cyberarm Option` | — |
| Internal Body Cyberware Hardened Shielding | Internal Body CW | `Internal Cyberware` | — |
| Modular Finger Cyberhand | Cyberarm | `Cyberarm / Cyberarm Option` | *(Foundation für Cyberfingers — §2c)* |
| Neo-Soviet Cyberarm | Cyberarm | `Cyberarm / Cyberarm Option` | *(volle Cyberarm = Foundation)* |
| Popup Net Launcher | Cyberarm | `Cyberarm Option` | — |
| Popup Shotgun | Cyberarm | `Cyberarm Option` | — |
| RacerBracer | Internal Body CW | `Internal Cyberware` | — |
| Reflex Co-Processor | Neuralware | `Neuralware / Chipware` | `Requires Neural Link.` |
| Reinforced Cyberlimb Upgrade | Cyberlimb | `Cyberarm/Cyberleg/Cyberlimb Option` | — |
| Sponsored Cybereye | Cybereye | `Cybereye / Cybereye Option` | *(volle Cybereye = Foundation)* |
| Trauma Response Nanomatrix | Internal Body CW | `Internal Cyberware` | — |

`extra.humanity_loss` = `HL`-Wert 1:1. Slot-Auslastung/`getSlotCost` greift automatisch, sobald
Subcategory stimmt; falls ein Item >1 Option-Slot braucht, `"takes N Option Slots"` in notes ergänzen
(in der Quelle nicht vorhanden → muss bei Bedarf manuell, OPEN §7-D2).

> ⚠ **Type→Subcategory-Basisregel als Tabelle** (für die übrigen/zukünftigen):
> Borgware→`Borgware` · Neuralware→`Neuralware / Chipware` · Chipware→`Neuralware / Chipware` ·
> Cyberaudio→`Cyberaudio Option` *(Suite→`Cyberaudio Suite / Option`)* · Cyberlimb→`Cyberarm/Cyberleg/Cyberlimb Option` ·
> Cyberarm→`Cyberarm Option` *(volle Arm/Hand→`Cyberarm / Cyberarm Option`)* ·
> Cybereye→`Cybereye Option` *(volle Eye→`Cybereye / Cybereye Option`)* · Fashionware→`Fashionware` ·
> „Internal Body Cyberware"→`Internal Cyberware`. **Die Foundation-vs-Option-Unterscheidung braucht
> menschliche Prüfung** (oben für alle 20 bereits getroffen).

### 2b. Rollen-Empfehlung (⭐) — Vorschlagsliste (NICHT automatisch)
`isRoleHighlight` macht Substring-Match von `ROLE_HIGHLIGHTS[role]` gegen `item.name`. Markenkrams matcht
nie automatisch → **Vorschlag zur Aufnahme in `ROLE_HIGHLIGHTS` (shop.html:120, eigener Code-Auftrag):**

| Rolle | Black-Chrome-Namen (Vorschlag) |
|---|---|
| **Solo** | Neo-Soviet Cyberarm, Reflex Co-Processor, Kendachi Mono-Katana, Arasaka Weeping Reaver Katana, Militech Perseus, Tactical Smart Armor |
| **Netrunner** | Integrated Cyberdeck Upgrade, Budget Chipware Socket, Lotos Netsuit |
| **Tech** | Modular Finger Cyberhand, *(Cyberfingers allgemein)*, MechaMan Smart Glove, KTech TechHammer |
| **Medtech** | Trauma Response Nanomatrix, Heuristic Health Monitor, Trauma Team MedScan |
| **Lawman** | NCPD Crime Database, Hades Multipurpose Assault Shotgun, Pursuit Security Inc. Crowd Buster, Fire Brand Bunker Gear |
| **Nomad** | Nomad Rocker, RacerBracer, Street Viper Riding Suit, Masetto AirRider |
| **Media** | Sponsored Cybereye, Microphone Cyberfinger, Ziggurat City Database |
| **Exec/Fixer** | Corporate Island, Executive Armor, 4Tify |
| **Rockerboy** | Superchrome® Glam Rifle, Flashbulb |

> Hinweis: Aufnahme in `ROLE_HIGHLIGHTS` ist eine **shop.html-Code-Änderung** (separater Auftrag),
> bewusst keine Daten-Eigenschaft am Item.

### 2c. Cyberfingers (16) — Prereq-Sonderfall
Alle `install:"Mall"`, HL meist `3 (1d6)`, semantisch „brauchen eine **Modular Finger Cyberhand**".
Im Live-Gating-Modell existiert **kein Cyberfinger-Slot** und `FOUNDATIONAL_REQ` kennt keine Cyberhand.
**Empfehlung (Daten-only, ohne Fehlgate):**
- `subcategory = "Cyberfinger"` (neuer Wert) → `getItemSlots` fällt auf `['internal']` zurück (kein
  Falsch-Block; belegt internal-Slot). Alternativ `"Cyberarm Option"` — **verworfen**, weil
  `FOUNDATIONAL_REQ` dann exakt einen Namen `"Cyberarm"` verlangt, den niemand hat → würde **alle**
  fälschlich sperren.
- `notes` + `"Requires Modular Finger Cyberhand."` (Soft-Hinweis).
- `extra.humanity_loss = HL` 1:1.
> **OPEN §7-D3:** Echtes Hard-Gate (Cyberhand muss vorhanden sein) + eigener Cyberhand-Slot erfordert
> eine kleine `getFoundationalBlock`-Erweiterung analog zum Neural-Link-Sonderfall → eigener Code-Auftrag.

### 2d. Munition/Waffen-Verknüpfung
- **Ammo-Typ ohne Name-Match ableiten** aus dem `magazine`-Klammer-Token:
  `H Pistol|M Pistol|VH Pistol → pistol`; `Rifle → rifle`; `Slug|Shells → shotgun`; `Rocket → rocket`;
  `Grenade → grenade`; `Rocks` (Nomad Rocker) → exotisch (kein Standard-Ammo, §3).
  → Setze `ammo` = Klammer-Token (Bestands-Konvention: z.B. `"M Pistol"`), `extra.magazine` = Zahl.
- shop.html `buildSnapshot` zieht `magazine_max/loaded_ammo/is_autofire` aktuell aus
  `weapon_ammo_mapping[item.name]` → matcht Markennamen **nicht**. **OPEN §7-D4:** entweder Snapshot
  zusätzlich aus `item.ammo`/`extra.magazine` füllen, oder `weapon_ammo_mapping` erweitern. Daten liefern
  die nötigen Felder bereits; nur die Snapshot-Logik (Code) muss sie nutzen — eigener Auftrag.

### 2e. Armor / Humanity / Rank
- **Armor:** `extra.sp = SP` (int), `extra.armor_penalty = armor_penalty` (`"None"`→null, `"-4 REF/DEX/MOVE"`
  → `parseInt` = `-4`, Volltext in notes), `extra.appearance_of`. Multi-Slot `"(Body & Head)"` → §3.
- **Humanity:** bereits über `extra.humanity_loss` (§2a), Parser vorhanden.
- **Rank:** Black-Chrome hat **kein** `required_moto_rank` → kein Rank-Gate (korrekt; nur Bestands-Nomad-
  Vehicles nutzen das). Vehicles tragen `nomad_access` — **anderes Konzept**, nicht als Rank-Gate mappen.

---

## 3. PROBLEMFÄLLE-LISTE (mit Empfehlung je Fall)

| Fall | Items | Empfehlung |
|---|---|---|
| **Multi-Mode-Waffen** (skill/damage/magazine mit `/`) | ModFire 10X, KTech TechHammer, Sternmeyer M-04, Militech Mastiff SMG, Tommyknocker, Sanroo Hello Cutie, Militech Fox, Eagletech Survivalist, „The Pursuit Security Bouncer" (Melee/Pistol) | **Primärmodus** in `damage/extra.weapon_skill/ammo/magazine`, **alle Modi** ausführlich in `notes`. Inline-Damage-Roller parst `"5d6/8d6"` nicht → Primärwert sauber halten |
| **Coatings/Fluids, keine Waffen** | Arasaka Acid / Fire / Wound Salt (type „Weeping Reaver Fluid"), TR-4 Detonator Fluid | → **Gear**, nicht Melee/Exotic. `damage:"—"`→null |
| **Explosives/Grenades** | Explosive Weapons (8): `dmg 6d6`, type „Explosive"/„Grenade Ammunition" | „Grenade Ammunition" → evtl. zur Wurf-/Ammo-Logik; „Explosive" (Sprengladung) → **Exotic Weapon** oder **Gear** mit notes. **OPEN-leicht:** vorerst `Exotic Weapon`, da Schaden vorhanden |
| **Fashion ohne SP** | Masetto Holo-Wear, MechaMan Smart Glove (`SP="—"`) | → **Fashion**/**Gear**, NICHT Armor (sonst `sp:0`-Artefakt) |
| **Multi-Slot-Armor** `"(Body & Head)"` | Fire Brand Bunker Gear, Lotos Netsuit, Tactical Smart Armor, MechaMan Helmet (Head), Montage (Body or Head) | Armor-Snapshot ist **single-slot** (UI wählt head/body/shield). Empfehlung: als **Body** mappen, Mehrfachabdeckung in notes; oder DM gibt manuell beide Slots. OPEN-leicht |
| **Vehicles** (Land 23 / Air 8) | anderes Modell (SDP/seats/speed, kein price-Tier-Gating) | **Defer** oder `Nomad Vehicle Access` mit Roh-Stats in `extra`/`notes`, **kein** Combat-Modell. §7-D5 |
| **Linear Frames** (4) | Exoskelette, `internal_HL` 14(4d6), eins „N/A" | → **Cyberware / `Borgware`**, `install:"Hospital"`, `humanity_loss=internal_HL`. „EL-F4-NT" (External, N/A) → `External Cyberware`, HL=0 |
| **Apps** (5) | Agent-Software | → **Gear** (`extra.app=true`); **nicht** Program (Schema-Mismatch). §7-D1 |
| **HL-Halbierung** `"2 (1d6/2)"` | einige Cyberfingers | `parseMaxHumanityLoss` liest „2"; `rollHumanityLoss` würfelt `1d6/2` → der vorhandene Regex matcht `\d+d\d+` **ohne** `/2`. Vorberechneter Max=2 stimmt; gewürfelter Wert evtl. unhalbiert. **OPEN-leicht:** Roller-Regex später um `/N` erweitern, oder HL fix auf `"2 (1d6)"` runden |

---

## 4. WIE DER IMPORT TECHNISCH LIEFE  (Beschreibung, nicht ausführen)

1. **Generierte Quelle:** Neue Datei `db/black_chrome_items.json` im **gleichen Format wie `items.json`**
   (`{ items: [ … ] }`), Felder **flach** (top-level). Nicht-Core-Keys (`humanity_loss`, `install`,
   `weapon_skill`, `magazine`, `sp`, `armor_penalty`, `appearance_of`, `company`, `book_page` als
   `source`, `nightmarket:true`, `bc_type`) wandern beim Seed **automatisch** in `extra`
   (`seed_items.js:29–58` verwirft null, packt Rest in `extra`). → **kein** Schemawechsel nötig.
2. **Seed:** `seed_items.js` klonen/parametrisieren zu `seed_black_chrome.js` (oder Pfad-Argument), das
   `db/black_chrome_items.json` liest und mit `upsert({onConflict:'id'})` schreibt. **Idempotent** →
   Re-Run überschreibt statt zu duplizieren. 581-Master bleibt unangetastet.
3. **Konsistenz items.json-Master ↔ DB:** Black-Chrome **separat** halten (`db/black_chrome_items.json`),
   nicht in `db/items.json` mergen → der 581-Block bleibt sauber reproduzierbar, Black-Chrome unabhängig
   re-seedbar. `public/assets/data/items.json` (von player.html nur für Skill-IP genutzt) braucht die
   Black-Chrome-Items **nicht** → unverändert lassen. *(Alternative: in Master mergen — §7-D6.)*
4. **Sichtbarkeit:** Shop zeigt sie automatisch, sobald `category` in `SHOP_CATEGORIES` liegt
   (Ranged/Melee/Exotic Weapon, Armor, Cyberware, Gear, Fashion). DM-Picker filtert per
   `extra.nightmarket===true`.
5. **Kein Massen-Risiko:** Vor Insert ein Trockenlauf-Skript, das id-Kollisionen gegen die Live-Tabelle
   prüft (erwartet 0) und price_category-Tokens validiert.

---

## 5. STICHPROBE — 8 vollständig gemappte Items (Ziel-`items.json`-Schema, flach)

```jsonc
// 1) CYBERWARE — Foundation + Slot + Humanity
{
  "id": "cyberware-modular-finger-cyberhand",
  "name": "Modular Finger Cyberhand", "category": "Cyberware",
  "subcategory": "Cyberarm / Cyberarm Option",
  "price": 1000, "price_category": "Very Expensive", "currency": "eb",
  "raw_cost": "1,000eb (V Expensive)", "source": { "page": 24, "book": "Black Chrome" },
  "notes": "Cyberhand mit austauschbaren Fingern; Basis für Cyberfinger-Implantate.",
  "install": "Hospital", "humanity_loss": "3 (1d6)",
  "bc_type": "Cyberarm", "company": "Dynalar", "nightmarket": true
}
// 2) CYBERWARE-OPTION — Prereq via Trigger-String + Humanity
{
  "id": "cyberware-reflex-co-processor",
  "name": "Reflex Co-Processor", "category": "Cyberware",
  "subcategory": "Neuralware / Chipware",
  "price": 5000, "price_category": "Luxury", "currency": "eb",
  "raw_cost": "5,000eb (Luxury)", "source": { "page": 16, "book": "Black Chrome" },
  "notes": "Neuralware-Co-Prozessor für schnellere Reflexe. Requires Neural Link.",
  "install": "Hospital", "humanity_loss": "14 (4d6)",
  "bc_type": "Neuralware", "company": "Various", "nightmarket": true
}
// 3) CYBERFINGER — Soft-Prereq, Default-Slot (kein Fehlgate)
{
  "id": "cyberware-airhypo-cyberfinger",
  "name": "Airhypo Cyberfinger", "category": "Cyberware", "subcategory": "Cyberfinger",
  "price": 100, "price_category": "Premium", "currency": "eb",
  "raw_cost": "100eb (Premium)", "source": { "page": 24, "book": "Black Chrome" },
  "notes": "Verstecktes Airhypo im Finger. Requires Modular Finger Cyberhand.",
  "install": "Mall", "humanity_loss": "3 (1d6)",
  "bc_type": "Cyberfinger", "company": "Dynalar", "nightmarket": true
}
// 4) FIREARM — Ammo aus magazine-Token abgeleitet
{
  "id": "ranged-weapon-militech-perseus",
  "name": "Militech Perseus", "category": "Ranged Weapon",
  "price": 1000, "price_category": "Very Expensive", "currency": "eb",
  "raw_cost": "1,000eb (V Expensive)", "source": { "page": 102, "book": "Black Chrome" },
  "damage": "4d6", "rof": 1, "hands": "1", "ammo": "VH Pistol",
  "notes": "Excellent Quality Very Heavy Pistol.",
  "weapon_skill": "Handgun", "magazine": "11", "concealable": false,
  "company": "Militech", "nightmarket": true
}
// 5) ARMOR — SP + Penalty + appearance_of
{
  "id": "armor-tactical-smart-armor",
  "name": "Tactical Smart Armor", "category": "Armor",
  "price": 1000, "price_category": "Very Expensive", "currency": "eb",
  "raw_cost": "1,000eb (V Expensive)", "source": { "page": 35, "book": "Black Chrome" },
  "notes": "Medium Armorjack (Body & Head). Deckt zwei Slots ab.",
  "sp": "12", "armor_penalty": "-2 REF/DEX/MOVE",
  "appearance_of": null, "nightmarket": true
}
// 6) APP → Gear
{
  "id": "gear-trauma-team-medscan",
  "name": "Trauma Team MedScan", "category": "Gear",
  "price": 20, "price_category": "Everyday", "currency": "eb",
  "raw_cost": "20eb (Everyday)", "source": { "page": 12, "book": "Black Chrome" },
  "notes": "Agent-App: medizinischer Scan / Trauma-Team-Anbindung.",
  "app": true, "company": "Trauma Team", "nightmarket": true
}
// 7) GENERAL GOODS → Gear
{
  "id": "gear-chipvault-by-secsystems",
  "name": "ChipVault by SecSystems", "category": "Gear",
  "price": 100, "price_category": "Premium", "currency": "eb",
  "raw_cost": "100eb (Premium)", "source": { "page": 44, "book": "Black Chrome" },
  "notes": "Transportiert Chips sicher, ohne sie zu beschädigen.",
  "company": "SecSystems", "nightmarket": true
}
// 8) PROBLEMFALL — Multi-Mode-Waffe (Primärmodus + notes)
{
  "id": "ranged-weapon-modfire-10x",
  "name": "ModFire 10X", "category": "Ranged Weapon",
  "price": 500, "price_category": "Expensive", "currency": "eb",
  "raw_cost": "500eb (Expensive)", "source": { "page": 102, "book": "Black Chrome" },
  "damage": "3d6", "rof": 2, "hands": "1", "ammo": "H Pistol",
  "notes": "Wandelbar: Pistol 3d6 (8 H Pistol, 1H) / SMG 2d6 Autofire (30 M Pistol, 1H) / Rifle 5d6 (25 Rifle, 2H). Skill je Modus Handgun oder Shoulder Arms.",
  "weapon_skill": "Handgun", "magazine": "8",
  "_problem": "multi-mode: Primärmodus Pistol gemappt", "nightmarket": true
}
```
*(In der DB landen alle Nicht-Core-Keys automatisch unter `extra`. `_problem` ist ein optionaler
Audit-Marker, der vor dem Seed entfernt oder ebenfalls nach `extra` geschrieben werden kann.)*

---

## 6. OFFENE ENTSCHEIDUNGSPUNKTE (vor Massen-Mapping zu klären)

| # | Frage | Mein Vorschlag |
|---|---|---|
| **D1** | Apps → `Gear` oder `Program`? | **Gear** (`extra.app=true`) — Program-Schema (rez/atk/def) passt nicht |
| **D2** | Multi-Slot-Cyberware (`takes N Option Slots`) — manuell pflegen? | Nur wo Regelwerk es sagt; Default 1 Slot. Quelle hat die Info nicht → manuell, klein |
| **D3** ✅ | Cyberfinger-Hard-Gate (Cyberhand-Pflicht) jetzt oder später? | **ENTSCHIEDEN: Soft-Notes jetzt** (Subcategory `Cyberfinger`, kein Fehlgate). Hard-Gate später als `getFoundationalBlock`-Code-Tweak |
| **D4** | Ammo-on-Buy für Markenwaffen: Snapshot-Logik anpassen oder Mapping erweitern? | Snapshot aus `item.ammo`/`extra.magazine` füllen (robuster) — Code-Auftrag |
| **D5** ✅ | Vehicles (31) jetzt importieren? | **ENTSCHIEDEN: Weglassen** — erster Import = **137 Items** (168 − 31 Vehicles); Vehicles eigener Auftrag |
| **D6** ✅ | Black-Chrome separat (`db/black_chrome_items.json`) oder in Master mergen? | **ENTSCHIEDEN: Separat** (`db/black_chrome_items.json` + `seed_black_chrome.js`, idempotent) |
| **D7** | `ROLE_HIGHLIGHTS`-Erweiterung (§2b) Teil dieses Imports? | **Nein** — separater shop.html-Code-Auftrag; Vorschlagsliste liegt bereit |
| **D8** | „V Expensive"→„Very Expensive" hart normalisieren? | **Ja**, beim Generieren (sonst CSS-Tier + Bestands-Konsistenz brechen) |

---

## 7. Verifikation des Konzepts (read-only, reproduzierbar)
- 168 Items, 0 Namens-/id-Kollision, alle cost-Strings `^[\d,\.]+eb \(…\)$` (geprüft).
- Live-Cyberware-Subcategory-Vokabel + Trigger-Konvention aus `items.json` + `shop.html:290–356`.
- `seed_items.js:29–58` mappt flat→`extra` automatisch → generiertes JSON braucht kein neues Schema.
- Ammo-Ableitung deckt sich mit `ammunition.json`-Typen (pistol/rifle/shotgun/rocket/grenade).

> **Nichts geändert.** Nächster Schritt: D1–D8 entscheiden → dann generiere ich
> `db/black_chrome_items.json` + ggf. `seed_black_chrome.js` (separater Auftrag, mit Trockenlauf).
