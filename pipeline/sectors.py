import numpy as np
import pandas as pd

from config import TOP_SECTORS, UNRANKED_SECTORS


def training_supply(trades, core, sectors):
    counts = (
        trades.groupby(["district", "sector"]).size().unstack(fill_value=0).reindex(columns=sectors, fill_value=0)
    )
    counts = counts.reindex(core.index, fill_value=0)
    totals = counts.sum(axis=1)
    shares = counts.div(totals.where(totals > 0), axis=0).fillna(0.0)
    per_10k = totals / core["youth_population"] * 10_000
    return counts, shares, per_10k


def _scale_by_row_max(frame, ranked):
    peak = frame[ranked].max(axis=1).replace(0, np.nan)
    return frame.div(peak, axis=0).fillna(0.0).clip(upper=1.0)


def priority_sectors(sector_mix, training_shares, growth, provinces, sectors_ref):
    sectors = list(sectors_ref["sector"])
    fit = sectors_ref.set_index("sector")["nst2_priority"].astype(float).reindex(sectors)

    growth_wide = growth.pivot(index="province", columns="sector", values="growth").reindex(columns=sectors)
    district_growth = growth_wide.reindex(provinces.reindex(sector_mix.index).to_numpy())
    district_growth.index = sector_mix.index

    growth_contribution = (sector_mix * district_growth).clip(lower=0)
    training_gap = (sector_mix - training_shares).clip(lower=0)

    ranked = [s for s in sectors if s not in UNRANKED_SECTORS]
    growth_factor = _scale_by_row_max(growth_contribution, ranked)
    gap_factor = _scale_by_row_max(training_gap, ranked)
    fit_factor = pd.DataFrame([fit.to_numpy()] * len(sector_mix), index=sector_mix.index, columns=sectors)

    score = (fit_factor + growth_factor + gap_factor) / 3 * 100

    result = {}
    for district in sector_mix.index:
        rows = [
            {
                "sector": sector,
                "score": float(score.loc[district, sector]),
                "fit": float(fit_factor.loc[district, sector]),
                "growth": float(growth_factor.loc[district, sector]),
                "training_gap": float(gap_factor.loc[district, sector]),
                "work_share": float(sector_mix.loc[district, sector]),
                "training_share": float(training_shares.loc[district, sector]),
                "province_growth": float(district_growth.loc[district, sector]),
            }
            for sector in sectors
        ]
        rows.sort(key=lambda r: (-r["score"], r["sector"]))
        position = 0
        for row in rows:
            if row["sector"] in UNRANKED_SECTORS:
                row["rank"], row["top"] = None, False
                continue
            position += 1
            row["rank"] = position
            row["top"] = position <= TOP_SECTORS
        rows.sort(key=lambda r: (r["rank"] is None, r["rank"] or 0))
        result[district] = rows
    return result
