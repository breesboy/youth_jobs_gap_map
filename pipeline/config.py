from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
SAMPLE_DIR = ROOT / "data" / "sample"
REFERENCE_DIR = ROOT / "data" / "reference"
PROCESSED_DIR = ROOT / "data" / "processed"
APP_DATA_DIR = ROOT / "app" / "public" / "data"

SEED = 42
YOUTH_MIN_AGE = 16
YOUTH_MAX_AGE = 30

COMPONENTS = ["idle_youth", "unemployment", "low_quality_work", "education_mismatch"]
EQUAL_WEIGHTS = {name: 1 / len(COMPONENTS) for name in COMPONENTS}

EDUCATION_LEVELS = ["none", "primary", "secondary", "tertiary"]
ACTIVITY_STATUSES = ["employed", "student", "neither"]
OCCUPATIONS = [
    "professional_technical",
    "services_sales",
    "craft_trades",
    "elementary",
    "agricultural",
]
LOW_QUALITY_OCCUPATIONS = ["agricultural", "elementary"]

MIN_YOUTH_SAMPLE = 300
MIN_GRADUATE_SAMPLE = 40
MIN_TRADES_LISTED = 3
MIN_SURVEY_CELL = 50
MIN_LABOUR_FORCE_SAMPLE = 150

TOP_SECTORS = 3
UNRANKED_SECTORS = ["Agriculture & agro-processing"]
SENSITIVITY_DRAWS = 2000
STABLE_SPEARMAN = 0.9
