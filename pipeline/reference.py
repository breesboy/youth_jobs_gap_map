import pandas as pd

from config import REFERENCE_DIR


def load_districts():
    return pd.read_csv(REFERENCE_DIR / "district_province.csv")


def load_sectors():
    return pd.read_csv(REFERENCE_DIR / "sectors.csv")


def load_trade_map():
    table = pd.read_csv(REFERENCE_DIR / "trade_sector_map.csv")
    table["trade"] = table["trade"].str.strip().str.lower()
    return table
