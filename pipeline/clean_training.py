import pandas as pd

REQUIRED_COLUMNS = ["district", "school", "trade", "level", "accredited"]


def load_training(path):
    frame = pd.read_csv(path)
    missing = [c for c in REQUIRED_COLUMNS if c not in frame.columns]
    if missing:
        raise ValueError(f"{path} is missing columns: {missing}")
    return frame[REQUIRED_COLUMNS]


def clean_training(frame, districts, trade_map):
    report = {"rows_in": int(len(frame))}
    frame = frame.copy()
    for column in ["district", "school", "trade", "accredited"]:
        frame[column] = frame[column].astype("string").str.strip()
    frame["district"] = frame["district"].str.title()
    frame["trade"] = frame["trade"].str.lower().str.replace(r"\s+", " ", regex=True)
    frame["accredited"] = frame["accredited"].str.lower()

    known = frame["district"].isin(districts)
    report["dropped_unknown_district"] = int((~known).sum())
    frame = frame[known]

    accredited = frame["accredited"].isin(["yes", "y", "true", "1"])
    report["dropped_not_accredited"] = int((~accredited).sum())
    frame = frame[accredited]

    before = len(frame)
    frame = frame.drop_duplicates(subset=["district", "school", "trade"])
    report["dropped_duplicates"] = int(before - len(frame))

    frame = frame.merge(trade_map, on="trade", how="left")
    unmapped = frame[frame["sector"].isna()]
    report["unmapped_rows"] = int(len(unmapped))
    report["unmapped_trades"] = sorted(unmapped["trade"].unique().tolist())
    frame = frame[frame["sector"].notna()]

    report["rows_out"] = int(len(frame))
    return frame.reset_index(drop=True), report
