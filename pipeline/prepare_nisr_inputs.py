import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from config import RAW_DIR, YOUTH_MAX_AGE, YOUTH_MIN_AGE

DISTRICT_CODES = {
    11: "Nyarugenge", 12: "Gasabo", 13: "Kicukiro",
    21: "Nyanza", 22: "Gisagara", 23: "Nyaruguru", 24: "Huye", 25: "Nyamagabe", 26: "Ruhango",
    27: "Muhanga", 28: "Kamonyi",
    31: "Karongi", 32: "Rutsiro", 33: "Rubavu", 34: "Nyabihu", 35: "Ngororero", 36: "Rusizi",
    37: "Nyamasheke",
    41: "Rulindo", 42: "Gakenke", 43: "Musanze", 44: "Burera", 45: "Gicumbi",
    51: "Rwamagana", 52: "Nyagatare", 53: "Gatsibo", 54: "Kayonza", 55: "Kirehe", 56: "Ngoma",
    57: "Bugesera",
}
PROVINCE_CODES = {1: "Kigali", 2: "Southern", 3: "Western", 4: "Northern", 5: "Eastern"}
PROVINCE_KEYWORDS = {"kigali": "Kigali", "south": "Southern", "west": "Western", "north": "Northern", "east": "Eastern"}

SECTOR_BY_ISIC_CODE = {
    1: "Agriculture & agro-processing",
    2: "Mining",
    3: "Manufacturing",
    6: "Construction",
    7: "Trade & retail",
    8: "Transport & logistics",
    9: "Tourism & hospitality",
    10: "ICT",
}
OTHER_SERVICES = "Public & other services"
ISIC_TEXT_RULES = [
    ("agriculture", 1),
    ("mining", 2),
    ("manufacturing", 3),
    ("construction", 6),
    ("whole sale", 7),
    ("wholesale", 7),
    ("transportation", 8),
    ("accommodation", 9),
    ("information and communication", 10),
]
OCCUPATION_BY_ISCO = {
    1: "professional_technical",
    2: "professional_technical",
    3: "professional_technical",
    4: "services_sales",
    5: "services_sales",
    6: "agricultural",
    7: "craft_trades",
    8: "craft_trades",
    9: "elementary",
}
EDUCATION_BY_LEVEL = {1: "none", 2: "none", 3: "primary", 4: "primary", 5: "secondary", 6: "secondary", 7: "tertiary"}
GRADUATE_CERTIFICATES = range(4, 16)
NO_CERTIFICATE_CODES = (1, 2, 3, 16)
STATUS_BY_CODE = {1: "employed", 2: "unemployed", 3: "out"}
CHUNK_ROWS = 200_000


def _column_names(path):
    if path.suffix.lower() == ".dta":
        with pd.read_stata(path, iterator=True, convert_categoricals=False) as reader:
            return list(reader.variable_labels())
    return list(pd.read_csv(path, nrows=0).columns)


def _resolve(path, wanted):
    available = {name.lower(): name for name in _column_names(path)}
    missing = [w for w in wanted if w.lower() not in available]
    if missing:
        raise ValueError(f"{path.name} lacks expected columns: {missing}")
    return {w.lower(): available[w.lower()] for w in wanted}


def _chunks(path, wanted):
    lookup = _resolve(path, wanted)
    actual = list(lookup.values())
    rename = {v: k for k, v in lookup.items()}
    if path.suffix.lower() == ".dta":
        reader = pd.read_stata(path, columns=actual, convert_categoricals=False, chunksize=CHUNK_ROWS)
    else:
        reader = pd.read_csv(path, usecols=actual, chunksize=CHUNK_ROWS, low_memory=False)
    for chunk in reader:
        yield chunk.rename(columns=rename)


def _sector_from_isic_code(code):
    if pd.isna(code):
        return np.nan
    code = int(code)
    if code in SECTOR_BY_ISIC_CODE:
        return SECTOR_BY_ISIC_CODE[code]
    return np.nan if code >= 22 else OTHER_SERVICES


def _sector_from_text(text):
    if not isinstance(text, str) or not text.strip():
        return np.nan
    cleaned = text.replace("_", " ").strip().lower()
    if cleaned in ("not stated", "not known"):
        return np.nan
    for keyword, code in ISIC_TEXT_RULES:
        if keyword in cleaned:
            return SECTOR_BY_ISIC_CODE[code]
    return OTHER_SERVICES


def _sector(series):
    numeric = pd.to_numeric(series, errors="coerce")
    from_code = numeric.map(_sector_from_isic_code)
    from_text = series.where(numeric.isna()).map(_sector_from_text)
    return from_code.where(numeric.notna(), from_text)


def _district(series):
    numeric = pd.to_numeric(series, errors="coerce")
    text = series.where(numeric.isna()).astype("string").str.strip().str.title()
    return numeric.map(DISTRICT_CODES).where(numeric.notna(), text)


def _province(series):
    def from_text(value):
        if not isinstance(value, str):
            return np.nan
        lowered = value.lower()
        return next((name for key, name in PROVINCE_KEYWORDS.items() if key in lowered), np.nan)

    numeric = pd.to_numeric(series, errors="coerce")
    return numeric.map(PROVINCE_CODES).where(numeric.notna(), series.where(numeric.isna()).map(from_text))


def _status(series):
    def from_text(value):
        if not isinstance(value, str):
            return np.nan
        lowered = value.strip().lower()
        if lowered == "employed":
            return "employed"
        if lowered == "unemployed":
            return "unemployed"
        return "out" if lowered else np.nan

    numeric = pd.to_numeric(series, errors="coerce")
    return numeric.map(STATUS_BY_CODE).where(numeric.notna(), series.where(numeric.isna()).map(from_text))


def _census_people(df):
    employed = df["p48a"].notna()
    student = df["p29"].eq(2)
    never_attended = df["p29"].eq(3)

    education = df["p30a"].map(EDUCATION_BY_LEVEL)
    education = education.where(~(df["p30a"].isna() & never_attended), "none")

    graduate = pd.Series(np.nan, index=df.index)
    graduate[df["p31"].isin(list(GRADUATE_CERTIFICATES))] = 1
    graduate[df["p31"].isin(NO_CERTIFICATE_CODES) | (df["p31"].isna() & never_attended)] = 0

    return pd.DataFrame(
        {
            "district": df["ml02"].map(DISTRICT_CODES),
            "age": df["p04"],
            "sex": df["p03"].map({1: "male", 2: "female"}),
            "education": education,
            "activity": np.where(employed, "employed", np.where(student, "student", "neither")),
            "occupation": df["p48a"].map(OCCUPATION_BY_ISCO),
            "sector": df["p47a"].map(_sector_from_isic_code),
            "graduate": graduate,
            "weight": df["pop_weight"],
        }
    )


def _census_files(path):
    if path.is_dir():
        return sorted(p for p in path.iterdir() if p.suffix.lower() in (".dta", ".csv"))
    return [path]


def convert_census(path, out_dir):
    wanted = ["ml02", "p03", "p04", "p29", "p30a", "p31", "p47a", "p48a", "Pop_weight"]
    people, total_weight, total_rows, used = [], 0.0, 0, 0
    for file in _census_files(path):
        try:
            _resolve(file, wanted)
        except ValueError as error:
            print(f"Skipped {file.name}: {error}")
            continue
        rows = 0
        for chunk in _chunks(file, wanted):
            total_weight += float(chunk["pop_weight"].sum())
            rows += len(chunk)
            youth = chunk[chunk["p04"].between(YOUTH_MIN_AGE, YOUTH_MAX_AGE)]
            people.append(_census_people(youth))
        total_rows += rows
        used += 1
        print(f"Read {file.name}: {rows:,} records")
    if not people:
        raise ValueError(f"No census file with the required columns found in {path}")
    frame = pd.concat(people, ignore_index=True)
    frame.to_csv(out_dir / "census_persons.csv", index=False)
    print(f"Census: {used} file(s), {total_rows:,} records, weighted population {total_weight:,.0f} (compare with NISR's published total)")
    print(f"Census: {len(frame):,} youth records written, weighted youth {frame['weight'].sum():,.0f}")
    print(f"Census: districts found {frame['district'].nunique()} of 30; employed share {frame['activity'].eq('employed').mean():.1%}")


def _lfs_people(path):
    wanted = ["province", "code_dis", "weight2", "A04", "status1", "indd03", "LFS_year"]
    parts = []
    for chunk in _chunks(path, wanted):
        parts.append(
            pd.DataFrame(
                {
                    "year": pd.to_numeric(chunk["lfs_year"], errors="coerce"),
                    "province": _province(chunk["province"]),
                    "district": _district(chunk["code_dis"]),
                    "age": pd.to_numeric(chunk["a04"], errors="coerce"),
                    "status": _status(chunk["status1"]),
                    "sector": _sector(chunk["indd03"]),
                    "weight": pd.to_numeric(chunk["weight2"], errors="coerce"),
                }
            )
        )
    return pd.concat(parts, ignore_index=True)


def convert_lfs(path_a, path_b, out_dir):
    people = {path: _lfs_people(path) for path in (path_a, path_b)}
    employment = []
    for path, frame in people.items():
        working = frame[frame["status"].eq("employed") & frame["sector"].notna() & frame["province"].notna()]
        grouped = working.groupby(["year", "province", "sector"]).agg(
            employed=("weight", "sum"), n_obs=("weight", "size")
        )
        employment.append(grouped.reset_index())
        print(f"LFS {path.name}: {len(frame):,} records, years {sorted(frame['year'].dropna().unique().astype(int))}")
    pd.concat(employment, ignore_index=True)[["province", "sector", "year", "employed", "n_obs"]].to_csv(
        out_dir / "lfs_employment.csv", index=False
    )

    latest = max(people.values(), key=lambda f: f["year"].max())
    youth = latest[
        latest["age"].between(YOUTH_MIN_AGE, YOUTH_MAX_AGE) & latest["status"].isin(["employed", "unemployed"])
    ]
    rows = []
    for district, g in youth.groupby("district"):
        weighted = g.groupby("status")["weight"].sum()
        employed, unemployed = weighted.get("employed", 0.0), weighted.get("unemployed", 0.0)
        rows.append(
            {
                "district": district,
                "unemployment_rate": unemployed / (employed + unemployed),
                "n_labour_force": len(g),
            }
        )
    table = pd.DataFrame(rows)
    table.to_csv(out_dir / "youth_unemployment.csv", index=False)
    print(f"LFS unemployment: {len(table)} districts, smallest labour-force sample {int(table['n_labour_force'].min())}")


def convert_eicv7(path, out_dir):
    households = pd.read_stata(path, columns=["district", "pov_jan", "pop_wt"], convert_categoricals=False)
    households["district"] = households["district"].map(DISTRICT_CODES)
    rate = households.groupby("district").apply(
        lambda g: np.average(g["pov_jan"], weights=g["pop_wt"]) / 100, include_groups=False
    )
    national = np.average(households["pov_jan"], weights=households["pop_wt"]) / 100
    rate.rename("poverty_rate").round(4).reset_index().to_csv(out_dir / "eicv7_poverty.csv", index=False)
    print(f"EICV7: {len(rate)} districts, national poverty rate {national:.1%} (NISR reports 27.4%)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert NISR census and LFS files into the pipeline's raw CSVs")
    parser.add_argument("--census", type=Path, required=True, help="census .dta file or folder of .dta files")
    parser.add_argument("--lfs-earlier", type=Path, required=True, help="Labour Force Survey 2024")
    parser.add_argument("--lfs-later", type=Path, required=True, help="Labour Force Survey 2025")
    parser.add_argument("--eicv7", type=Path, help="EICV7 poverty .dta file (optional)")
    parser.add_argument("--out", type=Path, default=RAW_DIR)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    convert_census(args.census, args.out)
    convert_lfs(args.lfs_earlier, args.lfs_later, args.out)
    if args.eicv7:
        convert_eicv7(args.eicv7, args.out)
    print(f"Written to {args.out}. Still needed: rtb_trades.csv (and optionally eicv7_poverty.csv).")
