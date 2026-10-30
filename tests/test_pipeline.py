import pandas as pd

from build_district_tables import run
from config import COMPONENTS


def test_pipeline_outputs(tmp_path):
    result = run("sample", out_dir=tmp_path, app_dir=None)
    records = result["records"]
    assert len(records) == 30
    assert all(0 <= r["gap_score"] <= 100 for r in records)
    assert sorted(r["rank"] for r in records) == list(range(1, 31))
    for r in records:
        assert len(r["top_sectors"]) == 3
        assert abs(sum(c["contribution"] for c in r["components"].values()) - r["gap_score"]) < 0.05
        assert abs(sum(r["education"].values()) - 1) < 0.01


def test_rebuild_is_deterministic(tmp_path):
    first = run("sample", out_dir=tmp_path / "a", app_dir=None)["flat"]
    second = run("sample", out_dir=tmp_path / "b", app_dir=None)["flat"]
    pd.testing.assert_frame_equal(first, second)


def test_components_scaled_extremes(tmp_path):
    flat = run("sample", out_dir=tmp_path, app_dir=None)["flat"]
    assert set(COMPONENTS) <= set(flat.columns)
