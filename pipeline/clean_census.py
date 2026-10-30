import numpy as np
import pandas as pd

from config import (
    ACTIVITY_STATUSES,
    EDUCATION_LEVELS,
    LOW_QUALITY_OCCUPATIONS,
    OCCUPATIONS,
    YOUTH_MAX_AGE,
    YOUTH_MIN_AGE,
)

REQUIRED_COLUMNS = [
    "district",
    "age",
    "sex",
    "education",
    "activity",
    "occupation",
    "sector",
    "graduate",
    "weight",
]


def load_census(path):
    frame = pd.read_csv(path)
    missing = [c for c in REQUIRED_COLUMNS if c not in frame.columns]
    if missing:
        raise ValueError(f"{path} is missing columns: {missing}")
    return frame[REQUIRED_COLUMNS]


def clean_census(frame, districts, sectors):
    report = {"rows_in": int(len(frame))}
    frame = frame.copy()

    for column in ["district", "education", "activity", "occupation", "sector", "sex"]:
        frame[column] = frame[column].astype("string").str.strip()
    frame["district"] = frame["district"].str.title()
    for column in ["education", "activity", "occupation", "sex"]:
        frame[column] = frame[column].str.lower()
    frame["age"] = pd.to_numeric(frame["age"], errors="coerce")
    frame["weight"] = pd.to_numeric(frame["weight"], errors="coerce")
    frame["graduate"] = pd.to_numeric(frame["graduate"], errors="coerce")

    def keep(mask, label):
        nonlocal frame
        report[label] = int((~mask).sum())
        frame = frame[mask]

    keep(frame["district"].isin(districts), "dropped_unknown_district")
    keep(frame["age"].between(YOUTH_MIN_AGE, YOUTH_MAX_AGE), "dropped_not_youth_or_missing_age")
    keep(frame["weight"].gt(0), "dropped_missing_or_nonpositive_weight")
    keep(frame["activity"].isin(ACTIVITY_STATUSES), "dropped_unknown_activity")

    employed = frame["activity"].eq("employed")
    frame.loc[~employed, ["occupation", "sector"]] = pd.NA

    bad_graduate = ~frame["graduate"].isin([0, 1])
    report["graduate_set_to_missing"] = int(bad_graduate.sum())
    frame.loc[bad_graduate, "graduate"] = np.nan

    valid = {
        "education": (EDUCATION_LEVELS, frame["activity"].notna()),
        "occupation": (OCCUPATIONS, employed),
        "sector": (sectors, employed),
    }
    for column, (allowed, applies) in valid.items():
        bad = applies & ~frame[column].isin(allowed)
        report[f"{column}_set_to_missing"] = int(bad.sum())
        frame.loc[bad, column] = pd.NA

    report["rows_out"] = int(len(frame))
    return frame.reset_index(drop=True), report


def _shares(group, column, categories):
    known = group[group[column].notna()]
    total = known["weight"].sum()
    by_category = known.groupby(column)["weight"].sum().reindex(categories, fill_value=0.0)
    return by_category / total if total > 0 else by_category * np.nan


def aggregate_census(frame, districts, sectors):
    core, education, activity, occupation, mix = [], {}, {}, {}, {}

    for district in districts:
        g = frame[frame["district"] == district]
        w = g["weight"]
        employed = g["activity"].eq("employed")
        known_job = employed & g["occupation"].notna()
        graduate = known_job & g["graduate"].eq(1)

        youth_population = w.sum()
        core.append(
            {
                "district": district,
                "youth_population": youth_population,
                "n_youth": len(g),
                "n_employed": int(employed.sum()),
                "n_graduates_employed": int(graduate.sum()),
                "idle_youth": w[g["activity"].eq("neither")].sum() / youth_population,
                "low_quality_work": w[known_job & g["occupation"].isin(LOW_QUALITY_OCCUPATIONS)].sum()
                / w[known_job].sum(),
                "education_mismatch": w[graduate & g["occupation"].eq("elementary")].sum() / w[graduate].sum(),
            }
        )
        education[district] = _shares(g, "education", EDUCATION_LEVELS)
        activity[district] = _shares(g, "activity", ACTIVITY_STATUSES)
        occupation[district] = _shares(g, "occupation", OCCUPATIONS)
        mix[district] = _shares(g, "sector", sectors)

    return {
        "core": pd.DataFrame(core).set_index("district"),
        "education": pd.DataFrame(education).T,
        "activity": pd.DataFrame(activity).T,
        "occupation": pd.DataFrame(occupation).T,
        "sector_mix": pd.DataFrame(mix).T,
    }
