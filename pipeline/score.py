import numpy as np
import pandas as pd

from config import COMPONENTS, EQUAL_WEIGHTS, SEED, SENSITIVITY_DRAWS, STABLE_SPEARMAN


def minmax(series):
    spread = series.max() - series.min()
    if spread == 0:
        return series * 0.0
    return (series - series.min()) / spread


def scale_components(core):
    return core[COMPONENTS].apply(minmax)


def gap_scores(scaled, weights=None):
    weights = weights or EQUAL_WEIGHTS
    vector = np.array([weights[c] for c in COMPONENTS], dtype=float)
    vector = vector / vector.sum()
    contributions = scaled[COMPONENTS] * vector * 100
    score = contributions.sum(axis=1)
    return score, contributions


def ranks_from_scores(score):
    return score.rank(ascending=False, method="min").astype(int)


def _rank_matrix(score_matrix):
    order = (-score_matrix).argsort(axis=0).argsort(axis=0)
    return order + 1


def _spearman_to_base(rank_matrix, base_ranks):
    base = base_ranks - base_ranks.mean()
    centred = rank_matrix - rank_matrix.mean(axis=0)
    numerator = (centred * base[:, None]).sum(axis=0)
    denominator = np.sqrt((centred**2).sum(axis=0) * (base**2).sum())
    return numerator / denominator


def sensitivity(scaled, base_score, seed=SEED, draws=SENSITIVITY_DRAWS):
    rng = np.random.default_rng(seed)
    matrix = scaled[COMPONENTS].to_numpy()
    base_ranks = ranks_from_scores(base_score).to_numpy().astype(float)

    weight_draws = rng.dirichlet(np.ones(len(COMPONENTS)), size=draws)
    ranks = _rank_matrix(matrix @ weight_draws.T * 100).astype(float)
    spearman = _spearman_to_base(ranks, base_ranks)

    top_n = 5
    base_top = set(np.argsort(base_ranks)[:top_n])
    overlap = [len(base_top & set(np.argsort(ranks[:, k])[:top_n])) / top_n for k in range(draws)]

    drop_one = {}
    for index, name in enumerate(COMPONENTS):
        weights = np.ones(len(COMPONENTS))
        weights[index] = 0
        weights = weights / weights.sum()
        drop_ranks = _rank_matrix((matrix @ weights * 100)[:, None]).astype(float)
        drop_one[name] = float(_spearman_to_base(drop_ranks, base_ranks)[0])

    low, high = np.percentile(ranks, [5, 95], axis=1)
    rank_range = pd.DataFrame(
        {"rank_low": low.astype(int), "rank_high": high.astype(int)}, index=scaled.index
    )

    median = float(np.median(spearman))
    summary = {
        "draws": draws,
        "seed": seed,
        "median_spearman": round(median, 4),
        "min_spearman": round(float(spearman.min()), 4),
        "p5_spearman": round(float(np.percentile(spearman, 5)), 4),
        "mean_top5_overlap": round(float(np.mean(overlap)), 4),
        "drop_one_spearman": {k: round(v, 4) for k, v in drop_one.items()},
        "ranking_holds": bool(median >= STABLE_SPEARMAN),
    }
    return summary, rank_range
