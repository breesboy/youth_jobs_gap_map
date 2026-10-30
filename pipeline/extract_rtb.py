import argparse
import difflib
import re
from collections import Counter
from pathlib import Path

import pandas as pd
import pdfplumber

from config import RAW_DIR
from reference import load_districts

LEVEL_TOKEN = re.compile(r"^(\d(,\d)*|[IVX]+(,[IVX]+)*|L\d)$")
SERIAL_COLUMN_MAX_X = 60
SCHOOL_COLUMN = (62, 200)
DISTRICT_COLUMN = (200, 282)
TRADE_COLUMN_START = 325

TRADE_PATTERNS = [
    ("auto electricity", r"auto(?:mobile)? electricity"),
    ("auto transmission", r"auto(?:mobile)? transmission|transmission"),
    ("automotive engine", r"auto(?:mobile|motive)? engine|moto(?:r)? vehic\w+|automotive mechanics?|automobile body|mechanics"),
    ("domestic electricity", r"domestic electric\w*"),
    ("industrial electricity", r"industrial electricity"),
    ("electricity", r"electricity"),
    ("masonry", r"masonry"),
    ("carpentry", r"carpentry|capentry"),
    ("plumbing", r"plumbing"),
    ("civil construction", r"civil construction"),
    ("road construction", r"road construction"),
    ("land surveying", r"surveying"),
    ("painting and decoration", r"painting and decoration|painting decoration"),
    ("interior design", r"interior design"),
    ("solar energy", r"solar energy"),
    ("hydropower energy", r"hydro ?power energy"),
    ("tailoring", r"tailoring|tailrong|tairoling"),
    ("knitting", r"knitting"),
    ("handcraft", r"hand ?craft"),
    ("wickerwork", r"wickerwork"),
    ("leather craft", r"leather (?:craft\w*|work\w*|crafer)|rather craft"),
    ("welding", r"welding|fitting"),
    ("production technology", r"production and manufacturing|production technology|manufacturing"),
    ("control systems", r"control systems?"),
    ("culinary arts", r"culinary"),
    ("food and beverage", r"food and b[ae]v\w*"),
    ("house keeping", r"house ?keeping"),
    ("front office", r"front office"),
    ("tourism", r"tourism"),
    ("food processing", r"food processing"),
    ("crop production", r"crop production"),
    ("animal health", r"animal health"),
    ("forestry", r"forestry"),
    ("irrigation technology", r"irrigation technology"),
    ("agribusiness", r"agri ?business"),
    ("agri-mechanization", r"agri mevhanization|agri mechani[sz]ation"),
    ("computer applications", r"computer applications?"),
    ("computer system technology", r"computer systems?"),
    ("computer literacy", r"computer literacy"),
    ("software development", r"software (?:development|engineering)"),
    ("networking", r"networking|network"),
    ("multimedia", r"multi ?media|multmediia"),
    ("telecommunication", r"telecommunication"),
    ("electronics", r"electronics?"),
    ("accounting", r"account\w*"),
    ("business services", r"bus\w* services"),
    ("office management", r"office management"),
    ("customs and tax", r"customs and tax"),
    ("hairdressing", r"hair ?dres\w*"),
    ("beauty", r"beauty"),
    ("music", r"music"),
    ("football", r"football"),
    ("driving", r"driving"),
]
IGNORED_WORDS = {
    "and", "level", "technology", "system", "systems", "services", "service", "the", "of", "for",
    "iii", "iv", "v", "l", "none", "operations", "work",
}


def _row_boundaries(page):
    tops = sorted(
        r["top"]
        for r in page.rects
        if 36 <= r["x0"] <= 37.5 and 33 < r["x1"] - r["x0"] < 34.5 and r["height"] < 1.0
    )
    merged = []
    for top in tops:
        if not merged or top - merged[-1] > 1.5:
            merged.append(top)
    return merged


def _normalise(text):
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9 ]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _match_district(words, names):
    texts = [w["text"].strip(",.") for w in words]
    candidates = list(texts) + [a + b for a, b in zip(texts, texts[1:])]
    lowered = {n.lower(): n for n in names}
    best = None
    for candidate in candidates:
        hit = difflib.get_close_matches(candidate.lower(), list(lowered), n=1, cutoff=0.8)
        if hit:
            best = lowered[hit[0]]
            break
    return best


def _segments(inside, top, bottom):
    serial_words = sorted(
        (w for w in inside if w["x0"] < SERIAL_COLUMN_MAX_X and re.fullmatch(r"\d{1,3}", w["text"])),
        key=lambda w: w["top"],
    )
    if not serial_words:
        return [(top, bottom, None)]
    centres = [(w["top"] + w["bottom"]) / 2 for w in serial_words]
    cuts = [top] + [(a + b) / 2 for a, b in zip(centres, centres[1:])] + [bottom]
    parts = [(lo, hi, int(w["text"])) for (lo, hi), w in zip(zip(cuts, cuts[1:]), serial_words)]
    if len(parts) > 1:
        parts[0] = (top, parts[0][1], parts[0][2])
    return parts


def read_schools(path, district_names):
    schools, current = [], None
    with pdfplumber.open(path) as pdf:
        for number, page in enumerate(pdf.pages, start=1):
            words = page.extract_words(x_tolerance=2, y_tolerance=2)
            bounds = _row_boundaries(page)
            level_x = sorted(w["x0"] for w in words if LEVEL_TOKEN.match(w["text"]) and 400 < w["x0"] < 560)
            level_left = level_x[len(level_x) // 10] - 2 if level_x else 465
            edges = [0.0] + bounds + [float(page.height)]
            for top, bottom in zip(edges, edges[1:]):
                segment = [w for w in words if top <= (w["top"] + w["bottom"]) / 2 < bottom]
                if any(w["text"] == "S/N" for w in segment):
                    continue
                shared = len([w for w in segment if w["x0"] < SERIAL_COLUMN_MAX_X and re.fullmatch(r"\d{1,3}", w["text"])]) > 1
                for low, high, serial in _segments(segment, top, bottom):
                    inside = [w for w in segment if low <= (w["top"] + w["bottom"]) / 2 < high or (serial is None)]
                    if serial is not None:
                        current = {
                            "serial": serial, "page": number, "school": [], "district": None, "lines": [],
                            "shared_block": shared,
                        }
                        schools.append(current)
                    if current is None:
                        continue
                    inside.sort(key=lambda w: (round(w["top"]), w["x0"]))
                    name = " ".join(w["text"] for w in inside if SCHOOL_COLUMN[0] <= w["x0"] < SCHOOL_COLUMN[1])
                    if name:
                        current["school"].append(name)
                    if not current["district"]:
                        band = [w for w in inside if DISTRICT_COLUMN[0] <= w["x0"] < DISTRICT_COLUMN[1]]
                        current["district"] = _match_district(band, district_names)
                    lines = {}
                    for w in inside:
                        if TRADE_COLUMN_START <= w["x0"] < level_left:
                            lines.setdefault(round(w["top"]), []).append(w["text"])
                    current["lines"].extend(" ".join(lines[k]) for k in sorted(lines))
    return schools


def fill_districts(schools, districts):
    known = set(districts)
    order = sorted(districts)
    for school in schools:
        if school["district"] not in known:
            school["district"] = None
    unresolved = []
    for index, school in enumerate(schools):
        if school["district"]:
            continue
        before = next((s["district"] for s in reversed(schools[:index]) if s["district"]), None)
        after = next((s["district"] for s in schools[index + 1 :] if s["district"]), None)
        if before and before == after:
            school["district"] = before
            continue
        low = order.index(before) + 1 if before else 0
        high = order.index(after) if after else len(order)
        between = order[low:high]
        if len(between) == 1:
            school["district"] = between[0]
        else:
            unresolved.append((school["serial"], before, after))
    return unresolved


def trades_of(school):
    text = _normalise(" ".join(school["lines"]))
    found = []
    for canonical, pattern in TRADE_PATTERNS:
        if re.search(pattern, text):
            found.append(canonical)
            text = re.sub(pattern, " ", text)
    leftover = [w for w in text.split() if w not in IGNORED_WORDS and not re.fullmatch(r"l?\d+|[ivx]+", w)]
    return found, leftover


def extract(path, out_path):
    districts = list(load_districts()["district"])
    schools = read_schools(path, districts)
    unresolved = fill_districts(schools, districts)
    rows, leftovers = [], Counter()
    for school in schools:
        found, leftover = trades_of(school)
        leftovers.update(leftover)
        for trade in found:
            rows.append(
                {
                    "district": school["district"],
                    "school": " ".join(school["school"]).strip() or f"School {school['serial']}",
                    "trade": trade,
                    "level": "",
                    "accredited": "yes",
                }
            )
    table = pd.DataFrame(rows)
    table.to_csv(out_path, index=False)
    serials = [s["serial"] for s in schools]
    print(f"{len(schools)} schools read (serial numbers {min(serials)} to {max(serials)}); {len(table)} school-trade rows")
    print("Missing serial numbers:", sorted(set(range(1, max(serials) + 1)) - set(serials)) or "none")
    print("Districts with schools:", table["district"].nunique(), "of 30; without:", sorted(set(districts) - set(table["district"])) or "none")
    print("Districts that could not be resolved:", unresolved or "none")
    print("Schools sharing a block with a neighbour (trades split by estimate):", [s["serial"] for s in schools if s["shared_block"]])
    print("Unmatched words (check these):", leftovers.most_common(25))
    return table


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract accredited trades per school from the RTB accredited TVET schools PDF")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--out", type=Path, default=RAW_DIR / "rtb_trades.csv")
    arguments = parser.parse_args()
    arguments.out.parent.mkdir(parents=True, exist_ok=True)
    extract(arguments.pdf, arguments.out)
