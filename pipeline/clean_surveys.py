import pandas as pd

from config import MIN_SURVEY_CELL


def load_survey_inputs(source_dir):
    lfs = pd.read_csv(source_dir / "lfs_employment.csv")
    unemployment = pd.read_csv(source_dir / "youth_unemployment.csv")
    poverty_path = source_dir / "eicv7_poverty.csv"
    poverty = pd.read_csv(poverty_path) if poverty_path.exists() else None
    return lfs, unemployment, poverty


def build_sector_growth(lfs, provinces, sectors):
    report = {"lfs_rows_in": int(len(lfs))}
    lfs = lfs.copy()
    lfs["province"] = lfs["province"].astype("string").str.strip().str.title()
    lfs["sector"] = lfs["sector"].astype("string").str.strip()
    lfs["year"] = pd.to_numeric(lfs["year"], errors="coerce")
    lfs["employed"] = pd.to_numeric(lfs["employed"], errors="coerce")
    lfs["n_obs"] = pd.to_numeric(lfs["n_obs"], errors="coerce")

    valid = lfs["province"].isin(provinces) & lfs["sector"].isin(sectors) & lfs["employed"].gt(0)
    report["lfs_rows_dropped"] = int((~valid).sum())
    lfs = lfs[valid]

    years = sorted(lfs["year"].dropna().unique())
    if len(years) != 2:
        raise ValueError(f"LFS input must hold exactly two years, found {years}")
    first, second = years

    wide_employed = lfs.pivot_table(index=["province", "sector"], columns="year", values="employed", aggfunc="sum")
    wide_n = lfs.pivot_table(index=["province", "sector"], columns="year", values="n_obs", aggfunc="sum")
    growth = pd.DataFrame(
        {
            "growth": wide_employed[second] / wide_employed[first] - 1,
            "n_obs": wide_n[[first, second]].min(axis=1),
        }
    )
    growth["thin"] = growth["n_obs"] < MIN_SURVEY_CELL
    report["growth_years"] = [int(first), int(second)]
    report["thin_growth_cells"] = int(growth["thin"].sum())
    return growth.reset_index(), report


def build_unemployment(frame, districts):
    frame = frame.copy()
    frame["district"] = frame["district"].astype("string").str.strip().str.title()
    frame = frame[frame["district"].isin(districts)].set_index("district")
    missing = [d for d in districts if d not in frame.index]
    if missing:
        raise ValueError(f"youth_unemployment.csv is missing districts: {missing}")
    return frame.loc[districts, ["unemployment_rate", "n_labour_force"]].astype(float)


def build_poverty(poverty, districts):
    if poverty is None:
        return pd.Series(dtype=float)
    poverty = poverty.copy()
    poverty["district"] = poverty["district"].astype("string").str.strip().str.title()
    poverty = poverty[poverty["district"].isin(districts)]
    return poverty.set_index("district")["poverty_rate"].astype(float)
