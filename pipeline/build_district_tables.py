import argparse
import json
import shutil
import sys
from pathlib import Path

import numpy as np
import pandas as pd

from clean_census import aggregate_census, clean_census, load_census
from clean_surveys import build_poverty, build_sector_growth, build_unemployment, load_survey_inputs
from clean_training import clean_training, load_training
from config import (
    APP_DATA_DIR,
    COMPONENTS,
    EDUCATION_LEVELS,
    EQUAL_WEIGHTS,
    MIN_GRADUATE_SAMPLE,
    MIN_LABOUR_FORCE_SAMPLE,
    MIN_TRADES_LISTED,
    MIN_YOUTH_SAMPLE,
    OCCUPATIONS,
    PROCESSED_DIR,
    RAW_DIR,
    REFERENCE_DIR,
    SAMPLE_DIR,
    SEED,
    YOUTH_MAX_AGE,
    YOUTH_MIN_AGE,
    ACTIVITY_STATUSES,
)
from make_sample_data import generate
from reference import load_districts, load_sectors, load_trade_map
from score import gap_scores, ranks_from_scores, scale_components, sensitivity
from sectors import priority_sectors, training_supply

INPUT_FILES = ["census_persons.csv", "lfs_employment.csv", "youth_unemployment.csv", "rtb_trades.csv"]


def _round(value, digits=4):
    return round(float(value), digits)


def _flags(core_row, trades_total, thin_sectors):
    flags = []
    if core_row["n_youth"] < MIN_YOUTH_SAMPLE:
        flags.append(f"Small youth sample ({int(core_row['n_youth'])} records): estimates are less reliable.")
    if core_row["n_labour_force"] < MIN_LABOUR_FORCE_SAMPLE:
        flags.append(
            f"Unemployment rests on {int(core_row['n_labour_force'])} youth in the labour force survey: less reliable."
        )
    if core_row["n_graduates_employed"] < MIN_GRADUATE_SAMPLE:
        flags.append(
            f"Few employed graduates ({int(core_row['n_graduates_employed'])}): the education mismatch component is thin."
        )
    if trades_total < MIN_TRADES_LISTED:
        flags.append(f"Only {int(trades_total)} accredited trades listed: training supply may be incomplete.")
    if thin_sectors:
        flags.append(f"Sector growth rests on thin survey cells for: {', '.join(thin_sectors)}.")
    return flags


def _source_dir(source, input_dir=None):
    if input_dir is not None:
        return Path(input_dir)
    if source == "sample":
        if not all((SAMPLE_DIR / f).exists() for f in INPUT_FILES):
            generate(SAMPLE_DIR)
        return SAMPLE_DIR
    missing = [f for f in INPUT_FILES if not (RAW_DIR / f).exists()]
    if missing:
        sys.exit(
            f"Missing input files in {RAW_DIR}: {missing}\n"
            "See data/raw/README.md for the expected files, or run with --source sample to test the pipeline "
            "on synthetic data."
        )
    return RAW_DIR


def run(source="raw", out_dir=PROCESSED_DIR, app_dir=APP_DATA_DIR, input_dir=None):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    src = _source_dir(source, input_dir)

    district_ref = load_districts()
    sector_ref = load_sectors()
    trade_map = load_trade_map()
    districts = list(district_ref["district"])
    sectors = list(sector_ref["sector"])
    province_of = district_ref.set_index("district")["province"]

    census, census_report = clean_census(load_census(src / "census_persons.csv"), districts, sectors)
    tables = aggregate_census(census, districts, sectors)
    core = tables["core"]
    lfs, unemployment_raw, poverty_raw = load_survey_inputs(src)
    growth, survey_report = build_sector_growth(lfs, list(province_of.unique()), sectors)
    unemployment = build_unemployment(unemployment_raw, districts)
    core["unemployment"] = unemployment["unemployment_rate"]
    core["n_labour_force"] = unemployment["n_labour_force"]
    poverty = build_poverty(poverty_raw, districts)
    if core[COMPONENTS].isna().any().any():
        bad = core[core[COMPONENTS].isna().any(axis=1)].index.tolist()
        raise ValueError(f"Gap components could not be computed for: {bad}")


    trades, training_report = clean_training(load_training(src / "rtb_trades.csv"), districts, trade_map)
    counts, shares, per_10k = training_supply(trades, core, sectors)

    scaled = scale_components(core)
    score, contributions = gap_scores(scaled)
    ranks = ranks_from_scores(score)
    sens_summary, rank_range = sensitivity(scaled, score)
    priorities = priority_sectors(tables["sector_mix"], shares, growth, province_of, sector_ref)

    thin_cells = set(map(tuple, growth.loc[growth["thin"], ["province", "sector"]].to_numpy()))

    records = []
    for district in districts:
        row = core.loc[district]
        total_trades = int(counts.loc[district].sum())
        top = [s for s in priorities[district] if s["top"]]
        top_names = [s["sector"] for s in top]
        records.append(
            {
                "name": district,
                "province": province_of[district],
                "rank": int(ranks[district]),
                "rank_range": [int(rank_range.loc[district, "rank_low"]), int(rank_range.loc[district, "rank_high"])],
                "gap_score": _round(score[district], 2),
                "components": {
                    c: {
                        "value": _round(row[c]),
                        "scaled": _round(scaled.loc[district, c]),
                        "contribution": _round(contributions.loc[district, c], 2),
                    }
                    for c in COMPONENTS
                },
                "youth_population": int(round(row["youth_population"])),
                "sample_records": int(row["n_youth"]),
                "poverty_rate": _round(poverty[district]) if district in poverty.index else None,
                "education": {k: _round(v) for k, v in tables["education"].loc[district].items()},
                "activity": {k: _round(v) for k, v in tables["activity"].loc[district].items()},
                "occupation": {k: _round(v) for k, v in tables["occupation"].loc[district].items()},
                "training": {
                    "total_trades": total_trades,
                    "trades_per_10k_youth": _round(per_10k[district], 2),
                    "by_sector": [
                        {
                            "sector": s,
                            "trades": int(counts.loc[district, s]),
                            "training_share": _round(shares.loc[district, s]),
                            "work_share": _round(tables["sector_mix"].loc[district, s]),
                        }
                        for s in sectors
                    ],
                },
                "priority_sectors": [
                    {k: (_round(v) if isinstance(v, float) else v) for k, v in s.items()} for s in priorities[district]
                ],
                "top_sectors": [s["sector"] for s in top],
                "flags": _flags(
                    row, total_trades, [s for s in top_names if (province_of[district], s) in thin_cells]
                ),
            }
        )
    records.sort(key=lambda r: r["rank"])

    meta = {
        "data_status": "synthetic" if source == "sample" and input_dir is None else "nisr",
        "source_dir": str(src.relative_to(src.parents[1])),
        "youth_definition": f"ages {YOUTH_MIN_AGE} to {YOUTH_MAX_AGE}",
        "components": COMPONENTS,
        "weights": EQUAL_WEIGHTS,
        "seed": SEED,
        "districts": len(records),
        "total_youth_population": int(sum(r["youth_population"] for r in records)),
        "sensitivity": sens_summary,
        "cleaning": {"census": census_report, "surveys": survey_report, "training": training_report},
        "flag_thresholds": {
            "min_youth_sample": MIN_YOUTH_SAMPLE,
            "min_graduate_sample": MIN_GRADUATE_SAMPLE,
            "min_trades_listed": MIN_TRADES_LISTED,
        },
    }

    flat = pd.DataFrame(
        [
            {
                "district": r["name"],
                "province": r["province"],
                "rank": r["rank"],
                "gap_score": r["gap_score"],
                **{c: r["components"][c]["value"] for c in COMPONENTS},
                "youth_population": r["youth_population"],
                "poverty_rate": r["poverty_rate"],
                "top_sectors": "; ".join(r["top_sectors"]),
                "flags": " | ".join(r["flags"]),
            }
            for r in records
        ]
    )
    flat.to_csv(out_dir / "district_scores.csv", index=False)
    pd.DataFrame(
        [
            {"district": r["name"], **t}
            for r in records
            for t in r["training"]["by_sector"]
        ]
    ).to_csv(out_dir / "training_supply.csv", index=False)
    pd.DataFrame(
        [{"district": r["name"], **s} for r in records for s in r["priority_sectors"]]
    ).to_csv(out_dir / "priority_sectors.csv", index=False)
    growth.to_csv(out_dir / "sector_growth.csv", index=False)
    trade_map.to_csv(out_dir / "trade_sector_map_used.csv", index=False)

    for name, payload in (("districts.json", records), ("meta.json", meta)):
        (out_dir / name).write_text(json.dumps(payload, indent=1))

    check_lines = print_checks(flat, meta)
    (out_dir / "checks.txt").write_text("\n".join(check_lines) + "\n")

    if app_dir is not None:
        app_dir = Path(app_dir)
        app_dir.mkdir(parents=True, exist_ok=True)
        for name in ("districts.json", "meta.json"):
            shutil.copy(out_dir / name, app_dir / name)
        shutil.copy(REFERENCE_DIR / "districts.geojson", app_dir / "districts.geojson")

    return {"records": records, "meta": meta, "flat": flat}


def print_checks(flat, meta):
    lines = [f"Data status: {meta['data_status']}", f"{'District':<12}{'Youth':>10}{'Score':>8}{'Rank':>6}"]
    for row in flat.sort_values("district").itertuples():
        lines.append(f"{row.district:<12}{row.youth_population:>10,}{row.gap_score:>8.2f}{row.rank:>6}")
    lines.append(f"{'TOTAL':<12}{int(flat['youth_population'].sum()):>10,}")
    sens = meta["sensitivity"]
    lines.append(
        f"Sensitivity: median Spearman {sens['median_spearman']}, min {sens['min_spearman']}, "
        f"ranking holds: {sens['ranking_holds']}"
    )
    for line in lines:
        print(line)
    return lines


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rebuild all district tables from source files")
    parser.add_argument("--source", choices=["raw", "sample"], default="raw")
    parser.add_argument("--input-dir", help="read the input CSVs from this folder instead of data/raw or data/sample")
    parser.add_argument("--no-app-copy", action="store_true")
    arguments = parser.parse_args()
    run(arguments.source, app_dir=None if arguments.no_app_copy else APP_DATA_DIR, input_dir=arguments.input_dir)
