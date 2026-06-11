# REPORT — Shop- & Nightmarket-Item-Update (BESTANDSAUFNAHME, keine Änderung)

> Reiner Analyse-Report. Es wurde **nichts** geändert. Alle Aussagen aus Code/Daten verifiziert.
> Quelldateien gelesen: `public/shop.html`, `public/player.html`, `public/dm.html`,
> `public/assets/js/supabase.js`, `db/seed_items.js`, `db/schema.sql`,
> `public/assets/data/items.json`, sowie `data-import/*`.

---

## ⚡ Wichtigste Erkenntnis vorab

**`data-import/??cyberpunk_red_shoplist_complete.json` ist BYTE-IDENTISCH mit der Live-Datei
`public/assets/data/items.json`** (gleiche md5 `3060cdc4…`, gleiche 417732 Bytes, `diff` = IDENTICAL).
→ Die 581 „neuen" Shop-Items sind **schon da**. Ein Import davon ist ein **No-Op** (0 neu, 581 Duplikat).
Die einzig wirklich neuen Daten sind die **168 Black-Chrome/Nightmarket-Einträge**.

> ⚠️ `db/items.json` weicht minimal ab (md5 `35efba13…`, +147 Bytes) — vermutlich eine leicht
> neuere/editierte Fassung. **OFFENE FRAGE Q-A:** Welche der drei ist die „Wahrheit"?

---

## 1. DATENMODELL — wie lädt der Shop Items?

| Konsument | Quelle | Funktion |
|---|---|---|
| **shop.html** (Item-Grid) | **Supabase-Tabelle `items`** | `getItems(SHOP_CATEGORIES)` → [supabase.js:49](public/assets/js/supabase.js#L49) |
| **dm.html** (Items-Modal „🎁 Geben", Room-Items, Combat) | **Supabase `items`** | `getItems([])` an 4 Stellen ([dm.html:1377](public/dm.html#L1377), [1535](public/dm.html#L1535), [2726](public/dm.html#L2726), [3168](public/dm.html#L3168)) |
| **player.html** | **`items.json` (Datei)** — aber **NUR für Skill-IP-Kosten**, NICHT für den Shop | `fetch('./assets/data/items.json')` [player.html:552](public/player.html#L552) |

**Klarstellung zur Frage:** Der **Shop rendert NICHT aus `items.json`**, sondern aus der **Supabase
`items`-Tabelle**. `items.json` ist die **Seed-Quelle** (`db/seed_items.js` liest `db/items.json` →
Tabelle). player.html lädt `items.json` ausschließlich, um IP-Kosten von Skill-Upgrades nachzuschlagen
([player.html:431–460](public/player.html#L431)). Die Supabase-Tabelle ist also **die produktive
Quelle, kein Fallback**. items.json ist weder „ungenutzt" noch Shop-Fallback — es hat einen anderen Zweck.

**Wo shop.html rendert:** [shop.html:570 `renderGrid()`](public/shop.html#L570) (gruppiert nach
`subcategory`, baut Cards via `getGates()`), Detail-Panel [shop.html:644 `openDetail()`](public/shop.html#L644),
Kauf [shop.html:877 `buyItem()`](public/shop.html#L877). Munition ist Sonderfall: eigener Renderer
`renderAmmoGrid()` aus `ammunition.json` (nicht aus der items-Tabelle).

> **Konsequenz für jeden Import:** Neue Items müssen in die **Supabase `items`-Tabelle** (per `seed`
> oder SQL-Insert), damit Shop **und** DM sie sehen. items.json/db/items.json aktuell zu halten ist
> nur für die Reproduzierbarkeit des Seeds + die Skill-Kosten wichtig.

---

## 2. ITEM-SCHEMA LIVE

**Tabelle `items` Spalten** (aus `getItems`-SELECT + `seed_items.js`):
`id, name, category, subcategory, price, price_options, currency, price_category, raw_cost,
damage, rof, hands, ammo, notes, source` + **`extra` (jsonb)**.

**Mapping-Regel** ([seed_items.js:29–58](db/seed_items.js#L29)): Die 15 „core keys" werden zu
Spalten; **alles andere wandert in `extra`** (null-Werte werden verworfen). In `items.json` liegen
die Felder **flach** (top-level); in der DB liegen Zusatzfelder **unter `extra`**. shop.html liest
sie konsequent als `item.extra.xxx` (Variable `x = item.extra`).

**Feld-Inventar (581 Items, top-level in items.json):**
Immer vorhanden (581/581): `id, name, category, subcategory, price, price_options, currency,
price_category, raw_cost, damage, rof, hands, ammo, notes, source`.
Häufige `extra`-Felder: `install`(96), `humanity_loss`(96), `fashion_style`(90), `clothing_slot`(90),
`stat`(66), `ip_cost_by_next_level`(66), `required_moto_rank`(33), `rez`(30), `program_class`(27),
`weapon_skill`(24), `magazine`(20), `sp`(9), `armor_penalty`(9) u.v.m.

**Kategorien (29):** Cyberware 96, Fashion 90, Skill Upgrade 66, Gear 53, Service/Entertainment 33,
Program 27, Vehicle Upgrade 19, **Night Market Goods 18**, Security Defense 18, Exotic Weapon 14,
NET Architecture 14, Nomad Vehicle Access 14, Ammunition 13, … Ranged Weapon 11, Armor 9, Melee Weapon 4.
**Nur 10 Kategorien sind im Shop sichtbar** (`SHOP_CATEGORIES` [shop.html:163](public/shop.html#L163)).

**Beispiele je Typ:**
- **Weapon (Ranged):** `{damage:"2d6", rof:2, hands:1, ammo:"M Pistol", price:50, price_category:"Costly", extra:{weapon_skill:"Handgun", magazine:"12", concealable:true}}`
- **Armor:** `{price:20, price_category:"Everyday", extra:{sp:"4", armor_penalty:"None"}}`
- **Cyberware:** `{subcategory:"Fashionware", price:100, extra:{install:"Mall", humanity_loss:"0 (N/A)"}}`
- **Gear:** `{price:100, notes:"…"}` (keine extra-Felder)
- **Ammunition:** Shop nutzt **nicht** diese Items, sondern `ammunition.json` (separates Modell).

---

## 3. GATING-MODELL (kritisch) — welche Felder tragen was?

Gesamte Gating-Logik: `getGates(item)` [shop.html:373](public/shop.html#L373). Alle Schlösser
basieren auf `item.category`, `item.subcategory`, `item.notes` und `item.extra.*` — **es gibt KEIN
explizites „role"-, „level"- oder „prereq"-Feld am Item.** Alles wird abgeleitet:

| Gate | Wie bestimmt | Getragen von (Item-Feld) |
|---|---|---|
| **Rollen-Empfehlung** (⭐) | Hardcodierte Namensliste `ROLE_HIGHLIGHTS` [shop.html:120](public/shop.html#L120) je Rolle; `isRoleHighlight()` macht Substring-Match gegen **`item.name`** | **`name`** (kein eigenes Feld) |
| **Level/Rank-Sperre** | Nur für Nomad-Vehicles: `extra.required_moto_rank` vs. `char.role_ability_rank` (+ `char.role === 'Nomad'`) [shop.html:382](public/shop.html#L382) | **`extra.required_moto_rank`** (33 Items) |
| **Voraussetzung / Foundational** (Cyberware braucht anderes Cyberware) | `getFoundationalBlock()` [shop.html:290](public/shop.html#L290): liest **`subcategory`** (z.B. „Cybereye Option") + **`notes`** (z.B. „Requires Neural Link") und prüft `char.cyberware[slot]` | **`subcategory` + `notes`** |
| **Slot-Zuordnung & -Limit** | `CYBERWARE_SLOT_MAP`/`getItemSlots()` aus **`subcategory`** (+ `notes`/`name` zur Feindifferenzierung); Limits `SLOT_MAXES`; Slot-Kosten aus **`notes`** („takes N Option Slot") | **`subcategory` + `notes` + `name`** |
| **Humanity-Gate** (Cyberware) | `extra.humanity_loss` (z.B. `"7 (2d6)"`) → `parseMaxHumanityLoss()` vs. `char.current_humanity` | **`extra.humanity_loss`** |
| **Critical-Injury-Block** | `getInjuryBlock()` [shop.html:326](public/shop.html#L326): `subcategory`/`notes` → betroffenes Körperteil vs. `char.critical_injuries` | **`subcategory` + `notes`** |
| **Cash-Gate** | `char.cash >= item.price` | **`price`** |
| **Munition** | `AMMO_DATA.weapon_ammo_mapping[item.name]` aus `ammunition.json` (Key = **`item.name`**); setzt `magazine_max`, `loaded_ammo`, `is_autofire` im Waffen-Snapshot [shop.html:783](public/shop.html#L783) | **`name`** (Match gegen ammunition.json), Anzeige `extra.magazine` |

**Fazit Q3:** Die tragenden Felder sind **`name` (Rolle+Ammo), `subcategory` + `notes` (Cyberware-
Prereq/Slot/Injury), `extra.required_moto_rank` (Rank), `extra.humanity_loss` (Humanity), `price` (Cash).**
Besonders fragil: **`subcategory` und `notes` sind die Hauptträger der Cyberware-Mechanik** und müssen
exakt die bestehenden Strings treffen (z.B. „Cybereye Option", „Requires Neural Link", „takes 2 Option Slots").

---

## 4. CROSS-REFERENCE shoplist (581) ↔ items.json

- **shoplist_complete.json ist byte-identisch mit items.json** → **581 Duplikat, 0 neu, 0 Konflikt.**
  Es gibt nichts zu importieren; die Frage „verlieren neue Einträge Gating-Felder?" ist hier **gegenstandslos**,
  weil es keine neuen Einträge gibt.
- Gating-Feld-Abdeckung im Bestand (zur Referenz für künftige Importe): `required_moto_rank` 33,
  `humanity_loss` 96, `install` 96, `subcategory` 581/581.
- **db/items.json ≠ public-Version** (147 Bytes Differenz) → siehe Q-A.

> Die eigentliche „Verlust"-Gefahr (fehlende Gating-Felder) betrifft **nur** den Black-Chrome-Import → Punkt 5.

---

## 5. BLACK-CHROME / NIGHTMARKET-MAPPING

**Quelle:** `data-import/black_chrome_nightmarket_liste.json` — **168 Einträge**, **0 Namens-Überlappung**
mit dem Bestand (alle genuin neu). Schema je Eintrag:
`category, name, company, cost, book_page, description_stats_de` (+ bei Cyberware/Frames `type, install, HL,
internal_install, internal_HL`; bei Armor `armor_type, SP, armor_penalty, appearance_of`; bei Vehicles
`vehicle_type, nomad_access, SDP, seats, combat_speed, narrative_speed`; bei Waffen `damage, ROF, hands,
concealed, skill, magazine`).

**Black-Chrome-Kategorien (12):** Firearms 29, Land Vehicles 23, General Goods & Gear 21, Cyberware 20,
Cyberfingers 16, Fashion & Armor 16, Melee Weapons 15, Air Vehicles 8, Explosive Weapons 8, Apps 5,
Linear Frames 4, Thrown Weapons 3.

### 5a. Kategorie-Mapping → Shop-Kategorien
| Black-Chrome | → Live-Kategorie | Anmerkung |
|---|---|---|
| Firearms | **Ranged Weapon** | `skill` → `extra.weapon_skill`; `magazine`→`extra.magazine` |
| Melee Weapons | **Melee Weapon** | |
| Thrown Weapons | **Exotic Weapon** (oder Melee) | `skill:"Melee/Athletics"` — OFFEN |
| Explosive Weapons | **Exotic Weapon** / Ammunition? | Grenades = eher Ammo-/Wurf-Logik — OFFEN |
| Cyberware, Cyberfingers, Linear Frames | **Cyberware** | ⚠ Subcategory-Problem, s.u. |
| Fashion & Armor | **Armor** (hat SP) bzw. **Fashion** | `armor_type/SP/armor_penalty` → Armor-Snapshot |
| General Goods & Gear | **Gear** | |
| Apps | **Gear** oder **Program** | Agent-Apps — OFFEN |
| Land/Air Vehicles | **Nomad Vehicle Access**? | anderes Datenmodell (SDP/seats/speed) — passt schlecht in Shop-Schema |

### 5b. Feld-Parsing
- **`cost` String → `price` + `price_category`:** Format `"1,000eb (V Expensive)"`.
  `price = parseInt(cost.replace(/[.,]/g,''))`; Klammer-Token → `price_category`.
  **Vokabel-Abgleich:** Live nutzt `"Very Expensive"`, Black-Chrome schreibt **`"V Expensive"`** →
  **muss gemappt werden**. Übrige Tokens (`Premium, Expensive, Luxury, Super Luxury, Everyday, Costly,
  Cheap`) stimmen mit dem Live-Vokabular überein. (Verteilung: Premium 41, V Expensive 36, Super Luxury 31,
  Expensive 34, Luxury 14, Everyday 5, Costly 4, Cheap 3.)
- **`HL` → `extra.humanity_loss`:** Format `"14 (4d6)"` passt **exakt** zum bestehenden
  `parseMaxHumanityLoss`/`rollHumanityLoss`-Parser. ✅ (36 von 168 haben HL.)
- **`install` → `extra.install`:** Werte `Mall/Clinic/Hospital` decken sich mit dem Bestand. ✅
- **`description_stats_de` → `notes`:** direkt. ⚠ ABER siehe 5c.
- **Fehlt komplett:** `id`, `subcategory`, numerischer `price`, `currency`, `source` (es gibt nur
  `book_page`). → müssen **generiert** werden (`id` z.B. aus slug(name); `source:{page:book_page}`).

### 5c. ⚠ GATING-VERLUST-RISIKO (die Kernfrage)
Beim Black-Chrome-Import gehen folgende Gates verloren, weil die Quelle die tragenden Felder nicht hat:

1. **Cyberware-Subcategory fehlt** → `getItemSlots`/`getFoundationalBlock`/`getInjuryBlock` greifen nicht
   richtig. Black-Chrome liefert nur `type` (z.B. „Borgware", „Cyberfinger"), **nicht** die feingranularen
   Shop-Subcategories („Cybereye Option", „Neuralware / Chipware" …). Folge: Items landen im Default-Slot
   `internal`, **Foundational-Prereqs (z.B. „braucht Cyberhand/Neural Link") werden NICHT erzwungen**.
   → Cyberfingers brauchen lt. Beschreibung eine „Modular Finger Cyberhand" — das ist im aktuellen
   Gating-Modell **nicht abbildbar ohne manuelle Subcategory/Notes-Pflege**.
2. **Rollen-Empfehlung (⭐):** funktioniert automatisch nur, wenn der `name` zufällig in `ROLE_HIGHLIGHTS`
   vorkommt — bei Black-Chrome-Markennamen (z.B. „Arasaka Weeping Reaver Katana") **praktisch nie**.
   Kein Verlust bestehender Gates, aber **keine** automatische Empfehlung.
3. **Munitions-Verknüpfung:** `weapon_ammo_mapping` in `ammunition.json` kennt nur generische Waffennamen.
   Black-Chrome-Firearms (Markennamen) matchen **nicht** → Magazin/Autofire-Verknüpfung fehlt, außer man
   pflegt das Mapping nach **oder** mappt den Snapshot über `type`/`skill` statt `name`.
4. **`notes` ist auf Deutsch** (`description_stats_de`) — Bestand ist Englisch. Inkonsistenz; zudem trägt
   `notes` im Bestand maschinell geparste Trigger-Strings („takes N Option Slot", „Requires Neural Link"),
   die in den deutschen Texten fehlen → Slot-/Prereq-Logik bekommt keine Signale.

### 5d. Wo sollten Nightmarket-Items liegen?
**Empfehlung:** **Gleiche `items`-Tabelle, mit Flag** `extra.nightmarket = true` (+ optional
`extra.company`, `extra.book_page`). Gründe: Shop-Renderer, DM-Items-Modal, `buildSnapshot`, Gating und
Realtime funktionieren dann **ohne Doppel-Infrastruktur**. Der Black-Chrome-List-Picker des DM (Punkt 6)
filtert einfach `getItems()` auf `extra.nightmarket === true`. Eine eigene Kategorie `"Black Chrome"`
(oder `price_category`-Reuse) hält sie zusätzlich aus dem normalen Shop heraus, falls gewünscht.
**„Aus Nightmarket gekauft → als Black Chrome getaggt"** am saubersten: beim Snapshot in `buildSnapshot`
ein `black_chrome:true`/`source:'nightmarket'`-Feld mitschreiben → Inventar/Anzeige kann es markieren.

---

## 6. DM-ANGEBOTS-FLOW — Ist-Zustand & nötige Änderungen

### Ist-Zustand (Black-Market-Modal)
- **Zustand** lebt in `characters.blackmarket_state` (jsonb) und wird per Realtime synchronisiert.
  ⚠ **Diese Spalte steht NICHT in `db/schema.sql`** — sie ist nur in dm.html/player.html referenziert
  und wurde offenbar manuell in Supabase angelegt (Code fängt Fehler `42703` ab: „SQL-Migration noch
  nicht ausgeführt?"). **OFFENE FRAGE Q-B:** Migration nachziehen/dokumentieren.
- **DM** ([dm.html:3592 `bmSendOffer`](public/dm.html#L3592)): **3 Freitext-Inputs** —
  `bmOfferItem` (Name), `bmOfferPrice` (Zahl), `bmOfferNotes` ([dm.html:3441](public/dm.html#L3441)).
  Baut `offer = {item_name, price, notes}` und schreibt `blackmarket_state.status='offered'` für alle
  gewählten Spieler.
- **Player** ([player.html:4066 `bmUpdate`](public/player.html#L4066)): liest `state.offer`, zeigt
  Tür-Animation + Offer-Card; Buttons Akzeptieren/Verhandeln/Ablehnen.
  `bmAccept()` [player.html:4129](public/player.html#L4129): **zieht nur Cash ab** (`patchCash`), setzt
  `status='accepted', paid:true`. **Das Item wird NICHT ins Inventar geschrieben** — es ist reiner
  Geldtransfer + Notiz. (Verhandlung: `bmNegSend` → DM `bmAcceptNeg`/`bmDeclineNeg` → `bmAutoDeduct`.)

### Vorhandener Baustein, der wiederverwendet werden kann ✅
**dm.html hat bereits einen vollwertigen Item-Picker:** `setupDmItemsModal` + `renderDmItemsGrid`
([dm.html:3148/3220](public/dm.html#L3148)) mit Such-/Kategorie-Filter über `getItems([])`, plus
`grantItem(item)` [dm.html:3248](public/dm.html#L3248) das via `routeItem`/`buildSnapshot` ein Item
**ins Charakter-Inventar schreibt** (Waffe/Armor/Gear/Cyberware).
→ Genau dieser Mechanismus ist die Vorlage für „DM wählt Black-Chrome-Item aus Liste".

> ⚠ **Bug-Hinweis (für später):** `grantItem` schreibt Cyberware als **flaches Array**
> (`patch.cyberware = [...c.cyberware, snapshot]`, [dm.html:3257](public/dm.html#L3257)), während shop.html
> die **Slot-Objekt-Struktur** `{slot:[…]}` erwartet. Inkonsistenz, die ein Black-Chrome-Grant erben würde.

### Was nötig wäre (für „aus Liste wählen + Listenpreis/Custom")
1. **Daten:** Black-Chrome-Items in `items`-Tabelle mit `extra.nightmarket=true` (Punkt 5d).
2. **DM-UI (dm.html, BM-Step 3):** Freitext-`bmOfferItem` ersetzen/ergänzen durch einen **List-Picker**
   (Wiederverwendung von `renderDmItemsGrid`-Muster, gefiltert auf `nightmarket`). Auswahl füllt
   `item_name` + `price` (Listenpreis) automatisch; **Custom-Preis-Override** bleibt als Zahlenfeld.
   `offer`-Objekt um `item_id` (und ggf. `snapshot`) erweitern.
3. **Player (player.html `bmAccept`):** optional erweitern, sodass bei Annahme **das Item tatsächlich
   ins Inventar wandert** (analog `grantItem`/`buildSnapshot`) — derzeit nur Cash. Sonst muss der DM
   das Item separat über das Items-Modal „geben".
4. **Realtime:** unverändert über `blackmarket_state` (kein neuer Channel nötig). Nur das `offer`-Schema
   wächst um `item_id`/Tag.

---

## 7. OFFENE FRAGEN / EMPFEHLUNGEN für Philip

| # | Entscheidungspunkt | Empfehlung |
|---|---|---|
| **Q-A** | Welche items.json ist „die Wahrheit"? `public/…/items.json` == shoplist (alt), `db/items.json` ist +147B neuer. | **db/items.json** als Seed-Master behandeln, public-Kopie daraus regenerieren; shoplist_complete.json ist redundant → archivieren. |
| **Q-B** | `blackmarket_state` fehlt in `schema.sql`. | Migration `ALTER TABLE characters ADD COLUMN IF NOT EXISTS blackmarket_state jsonb;` nachziehen + dokumentieren. |
| **Q-1** | Shoplist-Import: nötig? | **Nein** — identisch mit Live-Daten. Nur Black-Chrome (168) importieren. |
| **Q-2** | Black-Chrome-Storage | **Eine `items`-Tabelle + `extra.nightmarket=true`** (kein separates File/Tabelle). |
| **Q-3** | Vehicles/Frames (Land/Air/Linear) ins Shop-Schema? | Datenmodell passt schlecht (SDP/seats/speed). **Empfehlung:** als `Gear`/`Nomad Vehicle Access` mit Roh-Stats in `notes`/`extra`, **kein** eigenes Combat-Modell jetzt. |
| **Q-4** | Black-Chrome-Cyberware-Gating (Subcategory/Prereq) | Für die ~36 Cyberware/Cyberfingers **manuell `subcategory` + Trigger-`notes` pflegen** (sonst kein Slot-/Prereq-Gating). Aufwand pro Item klein, aber nötig. |
| **Q-5** | `notes` Sprache | Black-Chrome ist Deutsch, Bestand Englisch. **Empfehlung:** Deutsch belassen (Spieler-UI ist deutsch), aber **maschinelle Trigger-Strings** (z.B. „takes 2 Option Slots", „Requires Neural Link") **zusätzlich** ergänzen, wo Gating nötig ist. |
| **Q-6** | DM-Offer: Custom-Preis behalten? | **Ja** — List-Pick füllt Listenpreis vor, Zahlenfeld bleibt überschreibbar (beste UX). |
| **Q-7** | Bei BM-Annahme Item ins Inventar? | **Ja empfehlenswert** (sonst manuelles Nachgeben). `grantItem`-Logik wiederverwenden — vorher den Cyberware-Array/Slot-Bug (Punkt 6) klären. |
| **Q-8** | Ammo-Mapping für Black-Chrome-Firearms | Entweder `ammunition.json`-`weapon_ammo_mapping` um Markenwaffen erweitern **oder** Snapshot-Mapping auf `type`/`skill` statt exaktem `name` umstellen. |

---

## Verifikation der Befunde (read-only, reproduzierbar)
- `md5 public/assets/data/items.json` == `md5 data-import/??cyberpunk_red_shoplist_complete.json` (`3060cdc4…`).
- `getItems` → `from('items')` (Supabase), nicht aus Datei: [supabase.js:49](public/assets/js/supabase.js#L49).
- Gating ausschließlich in `getGates` + Helfern: [shop.html:230–410](public/shop.html#L230).
- BM-Offer Freitext: [dm.html:3441](public/dm.html#L3441) / [dm.html:3592](public/dm.html#L3592);
  Player liest `state.offer`, Cash-Patch ohne Inventar: [player.html:4129](public/player.html#L4129).
- Wiederverwendbarer Item-Picker + `grantItem`: [dm.html:3148](public/dm.html#L3148) / [dm.html:3248](public/dm.html#L3248).

> **Es wurde nichts geändert.** Nächster Schritt = Entscheidungen Q-A…Q-8, dann separater Implementierungs-Auftrag.
