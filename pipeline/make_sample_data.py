import argparse

import numpy as np
import pandas as pd

from config import (
    EDUCATION_LEVELS,
    OCCUPATIONS,
    SAMPLE_DIR,
    SEED,
)
from reference import load_districts, load_sectors, load_trade_map

URBANITY = {
    "Gasabo": 0.9,
    "Kicukiro": 0.9,
    "Nyarugenge": 0.95,
    "Huye": 0.5,
    "Musanze": 0.5,
    "Rubavu": 0.5,
    "Rusizi": 0.45,
    "Rwamagana": 0.4,
    "Muhanga": 0.4,
    "Ngoma": 0.3,
    "Nyagatare": 0.3,
    "Karongi": 0.3,
}
SECTOR_GROWTH_MEAN = {
    "Agriculture & agro-processing": 0.01,
    "Manufacturing": 0.04,
    "ICT": 0.09,
    "Construction": 0.06,
    "Tourism & hospitality": 0.07,
    "Trade & retail": 0.03,
    "Transport & logistics": 0.04,
    "Mining": -0.01,
    "Public & other services": 0.02,
}
SECTOR_BASE_EMPLOYED = {
    "Agriculture & agro-processing": 800,
    "Manufacturing": 90,
    "ICT": 15,
    "Construction": 110,
    "Tourism & hospitality": 40,
    "Trade & retail": 160,
    "Transport & logistics": 70,
    "Mining": 20,
    "Public & other services": 120,
}
PROVINCE_SIZE = {"Kigali": 1.0, "Southern": 1.5, "Western": 1.4, "Northern": 1.1, "Eastern": 1.7}
EXTRA_TRADE = "industrial photography"


def _sector_weights(rng, urban, sectors):
    base = {
        "Agriculture & agro-processing": 1.2 * (1 - urban) + 0.2,
        "Manufacturing": 0.6,
        "ICT": 0.15 + 0.6 * urban,
        "Construction": 0.8,
        "Tourism & hospitality": 0.3 + 0.6 * urban,
        "Trade & retail": 1.0 + urban,
        "Transport & logistics": 0.5 + 0.3 * urban,
        "Mining": 0.15 * rng.integers(0, 3),
        "Public & other services": 0.6 + 0.4 * urban,
    }
    vector = np.array([base[s] * rng.uniform(0.6, 1.4) for s in sectors])
    return vector / vector.sum()


def _district_persons(rng, district, urban, sectors):
    n = int(rng.integers(220, 700))
    youth_population = int(60_000 + 220_000 * urban * rng.uniform(0.6, 1) + rng.integers(0, 90_000))

    in_range = rng.random(n) < 0.9
    age = np.where(in_range, rng.integers(16, 31, n), rng.integers(10, 46, n))
    sex = rng.choice(["female", "male"], n)

    edu_p = np.array([0.10 - 0.07 * urban, 0.52 - 0.34 * urban, 0.33 + 0.04 * urban, 0.05 + 0.30 * urban])
    education = rng.choice(EDUCATION_LEVELS, n, p=edu_p / edu_p.sum())

    employed_share = np.clip(0.45 + 0.30 * urban + rng.normal(0, 0.06), 0.2, 0.85)
    unemployed_share = np.clip(0.08 + 0.08 * urban + rng.normal(0, 0.03), 0.02, 0.25)
    mismatch_shock = rng.normal(0, 0.07)
    sector_weights = _sector_weights(rng, urban, sectors)

    activity, occupation, sector = [], [], []
    for index in range(n):
        student_p = 0.45 if age[index] <= 20 else 0.15 if age[index] <= 24 else 0.03
        if education[index] == "tertiary":
            student_p += 0.1
        draw = rng.random()
        if draw < student_p:
            status = "student"
        else:
            draw = rng.random()
            status = (
                "employed"
                if draw < employed_share
                else "unemployed"
                if draw < employed_share + unemployed_share
                else "inactive"
            )
        activity.append(status)

        if status != "employed":
            occupation.append(None)
            sector.append(None)
            continue

        edu = education[index]
        subsistence = np.clip(
            0.75 * (1 - urban) ** 1.3 * {"none": 1.2, "primary": 1.0, "secondary": 0.5, "tertiary": 0.15}[edu],
            0.0,
            0.9,
        )
        if edu in ("secondary", "tertiary"):
            elementary = np.clip(
                (0.08 + 0.15 * (1 - urban) + mismatch_shock) * (0.6 if edu == "tertiary" else 1.0), 0.02, 0.5
            )
        else:
            elementary = 0.12 + 0.1 * (1 - urban)
        rest = max(1 - subsistence - elementary, 0.05)
        professional = rest * (0.1 + 0.4 * (edu == "tertiary") + 0.15 * (edu == "secondary"))
        services = rest * 0.45
        craft = max(rest - professional - services, 0.0)
        probabilities = np.array([professional, services, craft, elementary, subsistence])
        job = rng.choice(OCCUPATIONS, p=probabilities / probabilities.sum())
        occupation.append(job)
        sector.append(
            "Agriculture & agro-processing" if job == "agricultural" else rng.choice(sectors, p=sector_weights)
        )

    frame = pd.DataFrame(
        {
            "district": district,
            "age": age,
            "sex": sex,
            "education": education,
            "activity": activity,
            "occupation": occupation,
            "sector": sector,
        }
    )
    youth = frame["age"].between(16, 30)
    youth_rows = youth.sum()
    labour_force = youth & frame["activity"].isin(["employed", "unemployed"])
    unemployment = {
        "district": district,
        "unemployment_rate": round(float((frame["activity"][labour_force] == "unemployed").mean()), 4),
        "n_labour_force": int(labour_force.sum()),
    }
    frame["activity"] = frame["activity"].replace({"unemployed": "neither", "inactive": "neither"})
    frame["graduate"] = frame["education"].isin(["secondary", "tertiary"]).astype(int)
    frame["weight"] = round(youth_population / youth_rows, 3)
    return frame, unemployment


def _census(rng, districts, sectors):
    results = [
        _district_persons(rng, row.district, URBANITY.get(row.district, rng.uniform(0.05, 0.25)), sectors)
        for row in districts.itertuples()
    ]
    census = pd.concat([frame for frame, _ in results], ignore_index=True)
    unemployment = pd.DataFrame([row for _, row in results])
    census.loc[rng.random(len(census)) < 0.01, "education"] = None
    employed = census["activity"].eq("employed")
    census.loc[employed & (rng.random(len(census)) < 0.006), "occupation"] = None
    messy = rng.random(len(census)) < 0.005
    census.loc[messy, "district"] = " " + census.loc[messy, "district"].str.lower() + " "
    return census, unemployment


def _lfs(rng, provinces, sectors):
    rows = []
    for province in provinces:
        for sector in sectors:
            first = SECTOR_BASE_EMPLOYED[sector] * PROVINCE_SIZE[province] * rng.uniform(0.7, 1.3)
            growth = SECTOR_GROWTH_MEAN[sector] + rng.normal(0, 0.03)
            for year, employed in ((2024, first), (2025, first * (1 + growth))):
                rows.append(
                    {
                        "province": province,
                        "sector": sector,
                        "year": year,
                        "employed": round(employed, 2),
                        "n_obs": int(employed * rng.uniform(0.6, 1.0)),
                    }
                )
    return pd.DataFrame(rows)


def _poverty(rng, districts):
    rows = [
        {
            "district": d,
            "poverty_rate": round(float(np.clip(0.58 - 0.42 * URBANITY.get(d, 0.15) + rng.normal(0, 0.04), 0.05, 0.8)), 3),
        }
        for d in districts
    ]
    return pd.DataFrame(rows)


def _training(rng, districts, trade_map):
    trades = list(trade_map["trade"]) + [EXTRA_TRADE]
    rows = []
    for district in districts:
        urban = URBANITY.get(district, 0.15)
        schools = int(2 + 12 * urban + rng.integers(0, 5))
        tilt = rng.dirichlet(np.ones(len(trades)) * 0.6)
        for index in range(schools):
            level = int(rng.choice([3, 4, 5]))
            chosen = rng.choice(trades, size=int(rng.integers(1, 5)), replace=False, p=tilt)
            for trade in chosen:
                rows.append(
                    {
                        "district": district,
                        "school": f"{district} TVET School {index + 1}",
                        "trade": trade,
                        "level": level,
                        "accredited": "yes" if rng.random() < 0.95 else "no",
                    }
                )
    frame = pd.DataFrame(rows)
    duplicates = frame.sample(frac=0.02, random_state=SEED)
    frame = pd.concat([frame, duplicates], ignore_index=True)
    messy = rng.random(len(frame)) < 0.03
    frame.loc[messy, "trade"] = frame.loc[messy, "trade"].str.title().radd("  ")
    return frame


def generate(out_dir=SAMPLE_DIR, seed=SEED):
    out_dir.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(seed)
    districts = load_districts()
    sectors = list(load_sectors()["sector"])
    trade_map = load_trade_map()

    census, unemployment = _census(rng, districts, sectors)
    census.to_csv(out_dir / "census_persons.csv", index=False)
    unemployment.to_csv(out_dir / "youth_unemployment.csv", index=False)
    _lfs(rng, sorted(districts["province"].unique()), sectors).to_csv(out_dir / "lfs_employment.csv", index=False)
    _poverty(rng, list(districts["district"])).to_csv(out_dir / "eicv7_poverty.csv", index=False)
    _training(rng, list(districts["district"]), trade_map).to_csv(out_dir / "rtb_trades.csv", index=False)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate SYNTHETIC sample inputs for testing the pipeline")
    parser.add_argument("--out", default=str(SAMPLE_DIR))
    args = parser.parse_args()
    from pathlib import Path

    generate(Path(args.out))
    print(f"Synthetic sample data written to {args.out}")
