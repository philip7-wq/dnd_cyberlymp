#!/usr/bin/env python3
"""
Generate db/black_chrome_items.json from data-import/black_chrome_nightmarket_liste.json
following REPORT-shop-nightmarket-analyse.md + the approved mapping concept.

- Scope: 137 items (excludes the 31 Land/Air Vehicles — decision D5).
- Output shape == items.json items[] (flat fields). seed maps non-core keys → extra automatically.
- No DB / no network. Pure file generation.
"""
import json, re, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC  = os.path.join(HERE, "black_chrome_nightmarket_liste.json")
OUT  = os.path.join(ROOT, "db", "black_chrome_items.json")
LIVE = os.path.join(ROOT, "public", "assets", "data", "items.json")

# ── price_category normalization (§1b) ────────────────────────────────────────
PC_FIX = {"V Expensive": "Very Expensive"}

# ── category mapping (§1a) ────────────────────────────────────────────────────
CAT_MAP = {
    "Firearms":             "Ranged Weapon",
    "Melee Weapons":        "Melee Weapon",
    "Thrown Weapons":       "Exotic Weapon",
    "Explosive Weapons":    "Exotic Weapon",
    "Cyberware":            "Cyberware",
    "Cyberfingers":         "Cyberware",
    "Linear Frames":        "Cyberware",
    "Fashion & Armor":      "Armor",        # SP="—" → Gear (handled below)
    "General Goods & Gear": "Gear",
    "Apps":                 "Gear",
}
VEHICLE_CATS = {"Land Vehicles", "Air Vehicles"}  # D5: excluded

CAT_SLUG = {
    "Ranged Weapon": "ranged-weapon", "Melee Weapon": "melee-weapon",
    "Exotic Weapon": "exotic-weapon", "Cyberware": "cyberware",
    "Armor": "armor", "Gear": "gear", "Fashion": "fashion",
}

# ── hand-curated Cyberware subcategory + trigger notes (§2a) ──────────────────
CW_SUB = {
    "Borgware Hardened Shielding":                 ("Borgware", None),
    "Budget Chipware Socket":                      ("Neuralware / Chipware", "Requires Neural Link."),
    "Discount Cyberaudio Suite":                   ("Cyberaudio Suite / Option", None),
    "Dynalar Modular Finger Enthusiast Cyberhand": ("Cyberarm / Cyberarm Option", None),
    "Explicit Memory Stimulator":                  ("Neuralware / Chipware", "Requires Chipware Socket."),
    "Extra-Jointed Cyberlimb Upgrade":             ("Cyberarm/Cyberleg/Cyberlimb Option", None),
    "Flashbulb":                                   ("Cyberarm Option", None),
    "Hardened Cybereye Casing":                    ("Cybereye Option", None),
    "Heuristic Health Monitor":                    ("Fashionware", None),
    "Integrated Cyberdeck Upgrade":                ("Cyberarm Option", None),
    "Internal Body Cyberware Hardened Shielding":  ("Internal Cyberware", None),
    "Modular Finger Cyberhand":                    ("Cyberarm / Cyberarm Option", None),
    "Neo-Soviet Cyberarm":                         ("Cyberarm / Cyberarm Option", None),
    "Popup Net Launcher":                          ("Cyberarm Option", None),
    "Popup Shotgun":                               ("Cyberarm Option", None),
    "RacerBracer":                                 ("Internal Cyberware", None),
    "Reflex Co-Processor":                         ("Neuralware / Chipware", "Requires Neural Link."),
    "Reinforced Cyberlimb Upgrade":                ("Cyberarm/Cyberleg/Cyberlimb Option", None),
    "Sponsored Cybereye":                          ("Cybereye / Cybereye Option", None),
    "Trauma Response Nanomatrix":                  ("Internal Cyberware", None),
}
# Linear Frames (§3): internal-install Borgware; the External "N/A" one → External Cyberware
FRAME_SUB = {
    "EL-F4-NT Linear Frame": ("External Cyberware", "0 (N/A)"),
}
# Melee fluids/coatings → Gear (not a weapon)
MELEE_AS_GEAR = {"Arasaka Acid", "Arasaka Fire", "Arasaka Wound Salt"}

# Hand-curated weapon field overrides (A1 review decisions; all alt-modes stay in notes)
WEAPON_OVERRIDE = {
    "Kendachi Mono-Star":     {"weapon_skill": "Melee"},                       # F-1
    "Utility Tomahawk":       {"weapon_skill": "Melee"},                       # F-1
    "ModFire 10X":            {"ammo": "H Pistol", "weapon_skill": "Handgun"}, # F-2 + F-3
    "Eagletech Survivalist":  {"ammo": "Arrow"},                               # F-2
    "Tommyknocker":           {"hands": "2"},                                  # F-4
}

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def parse_cost(cost):
    """'1,000eb (V Expensive)' → (1000, 'Very Expensive')"""
    m = re.match(r"^([\d,\.]+)eb\s*\(([^)]+)\)\s*$", cost.strip())
    if not m:
        return None, None
    price = int(re.sub(r"[.,]", "", m.group(1)))
    pc = m.group(2).strip()
    return price, PC_FIX.get(pc, pc)

def first(s):
    """primary mode of a 'a/b/c' multi-field"""
    return str(s).split("/")[0].strip() if s not in (None, "") else None

def is_multi(*vals):
    return any(isinstance(v, str) and "/" in v for v in vals)

def ammo_from_magazine(mag):
    """'25 (Rifle)' → (magazine_number, ammo_token)"""
    if not mag:
        return None, None
    prim = first(mag)
    n = re.match(r"\s*(\d+)", prim or "")
    tok = re.search(r"\(([^)]+)\)", prim or "")
    return (n.group(1) if n else None), (tok.group(1).strip() if tok else None)

def clean(v):
    return None if v in (None, "", "—", "N/A") else v

def append_note(notes, trigger):
    notes = (notes or "").strip()
    if trigger and trigger not in notes:
        notes = (notes + " " + trigger).strip()
    return notes or None

def source_of(it):
    bp = it.get("book_page")
    try:
        return {"page": int(str(bp).strip()), "book": "Black Chrome"}
    except (ValueError, TypeError):
        return {"page": bp, "book": "Black Chrome"}

def base(it, category, subcategory=None):
    price, pc = parse_cost(it["cost"])
    out = {
        "id": slug(CAT_SLUG[category] + "-" + it["name"]),
        "name": it["name"], "category": category, "subcategory": subcategory,
        "price": price, "price_options": [price] if price is not None else [],
        "currency": "eb", "price_category": pc, "raw_cost": it["cost"],
        "damage": None, "rof": None, "hands": None, "ammo": None,
        "notes": clean(it.get("description_stats_de")), "source": source_of(it),
        "nightmarket": True,
    }
    if it.get("company"):
        out["company"] = it["company"]
    if it.get("type"):
        out["bc_type"] = it["type"]
    return out

def map_weapon(it, category):
    o = base(it, category)
    o["damage"] = clean(first(it.get("damage")))
    rof = first(it.get("ROF"))
    o["rof"] = int(rof) if rof and rof.isdigit() else (rof or None)
    o["hands"] = clean(first(it.get("hands"))) or (clean(it.get("hands")))
    if it.get("skill"):
        o["weapon_skill"] = first(it["skill"]) if category == "Ranged Weapon" else it["skill"]
    elif category == "Melee Weapon":
        o["weapon_skill"] = "Melee"
    magnum, ammotok = ammo_from_magazine(it.get("magazine"))
    if magnum:
        o["magazine"] = magnum
    if ammotok:
        o["ammo"] = ammotok
    conc = it.get("concealed")
    if conc in ("Yes", "No"):
        o["concealable"] = (conc == "Yes")
    if is_multi(it.get("skill"), it.get("damage"), it.get("magazine"), it.get("hands")):
        o["_problem"] = "multi-mode: Primärmodus gemappt, Details in notes"
    o.update(WEAPON_OVERRIDE.get(it["name"], {}))  # A1 manual field overrides
    return o

def map_cyberware(it, sub, hl_override=None):
    o = base(it, "Cyberware", sub)
    if clean(it.get("install")):
        o["install"] = it["install"]
    hl = hl_override or it.get("HL")
    if clean(hl):
        o["humanity_loss"] = hl
    trig = CW_SUB.get(it["name"], (None, None))[1]
    o["notes"] = append_note(o["notes"], trig)
    return o

def map_armor(it):
    sp = clean(it.get("SP"))
    if sp is None:  # no SP → not armor → Gear (§3)
        return map_gear(it, note_armor_type=it.get("armor_type"))
    o = base(it, "Armor")
    o["sp"] = sp
    pen = clean(it.get("armor_penalty"))
    if pen:
        o["armor_penalty"] = pen
    if clean(it.get("appearance_of")):
        o["appearance_of"] = it["appearance_of"]
    if clean(it.get("armor_type")):
        o["notes"] = append_note(o["notes"], it["armor_type"] + ".")
    return o

def map_gear(it, is_app=False, note_armor_type=None):
    o = base(it, "Gear")
    if is_app:
        o["app"] = True
    if note_armor_type and clean(note_armor_type):
        o["notes"] = append_note(o["notes"], note_armor_type + ".")
    return o

def convert(it):
    cat = it["category"]
    if cat in VEHICLE_CATS:
        return None
    if cat == "Firearms":
        return map_weapon(it, "Ranged Weapon")
    if cat == "Melee Weapons":
        if it["name"] in MELEE_AS_GEAR or it.get("type") == "Weeping Reaver Fluid":
            return map_gear(it)
        return map_weapon(it, "Melee Weapon")
    if cat == "Thrown Weapons":
        return map_weapon(it, "Exotic Weapon")
    if cat == "Explosive Weapons":
        return map_weapon(it, "Exotic Weapon")
    if cat == "Cyberware":
        sub = CW_SUB.get(it["name"], (None, None))[0]
        if sub is None:
            sys.exit(f"UNMAPPED cyberware subcategory: {it['name']!r}")
        return map_cyberware(it, sub)
    if cat == "Cyberfingers":
        o = map_cyberware(it, "Cyberfinger")
        # C-3: redundanten deutschen Prereq-Halbsatz entfernen, EN-Trigger behalten
        notes = o["notes"] or ""
        notes = re.sub(r"[;,]\s*braucht Modular Finger Cyberhand\.?", ".", notes, flags=re.I)
        notes = re.sub(r"\bbraucht Modular Finger Cyberhand\.?", "", notes, flags=re.I).strip()
        o["notes"] = append_note(notes, "Requires Modular Finger Cyberhand.")
        # C-1: halbierte Würfel-HL runden ("2 (1d6/2)" → "2 (1d6)")
        if o.get("humanity_loss"):
            o["humanity_loss"] = re.sub(r"\((\d+d\d+)/2\)", r"(\1)", o["humanity_loss"])
        return o
    if cat == "Linear Frames":
        sub, hl = FRAME_SUB.get(it["name"], ("Borgware", it.get("internal_HL")))
        inst = it.get("internal_install")
        o = base(it, "Cyberware", sub)
        if clean(inst):
            o["install"] = inst
        if clean(hl):
            o["humanity_loss"] = hl
        return o
    if cat == "Fashion & Armor":
        return map_armor(it)
    if cat == "General Goods & Gear":
        return map_gear(it)
    if cat == "Apps":
        return map_gear(it, is_app=True)
    sys.exit(f"UNKNOWN category: {cat!r}")

def main():
    src = json.load(open(SRC, encoding="utf-8"))
    items, dropped = [], 0
    for it in src:
        row = convert(it)
        if row is None:
            dropped += 1
            continue
        # strip null core fields the live schema keeps null? keep parity with items.json (nulls allowed)
        items.append(row)

    # validation
    ids = [r["id"] for r in items]
    assert len(ids) == len(set(ids)), "DUPLICATE ids within black-chrome!"
    live = json.load(open(LIVE, encoding="utf-8"))["items"]
    live_ids = {i["id"] for i in live}
    coll = sorted(set(ids) & live_ids)
    assert not coll, f"ID COLLISION with live items: {coll}"
    KNOWN_PC = {"Cheap","Everyday","Costly","Premium","Expensive","Very Expensive","Luxury","Super Luxury"}
    bad_pc = sorted({r["price_category"] for r in items if r["price_category"] not in KNOWN_PC})
    assert not bad_pc, f"Unknown price_category tokens: {bad_pc}"

    out = {
        "title": "Cyberpunk RED — Black Chrome / Night Market Items",
        "source_file": "data-import/black_chrome_nightmarket_liste.json",
        "scope": "Black Chrome book. Vehicles (Land/Air) excluded (decision D5).",
        "schema_note": "Flat fields; non-core keys map to items.extra on seed. nightmarket=true on all.",
        "total_entries": len(items),
        "items": items,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    from collections import Counter
    print(f"✓ wrote {len(items)} items (dropped {dropped} vehicles) → {OUT}")
    print("  categories:", dict(Counter(r["category"] for r in items)))
    print("  0 id collisions, price_category tokens OK")

if __name__ == "__main__":
    main()
