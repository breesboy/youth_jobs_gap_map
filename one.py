import json
import sys
from pathlib import Path

import pandas as pd

path = Path(sys.argv[1])
if path.suffix.lower() == ".dta":
    reader = pd.read_stata(path, iterator=True, convert_categoricals=False)
    sample = reader.read(1000)
    labels = reader.variable_labels()
    pd.DataFrame({"name": list(labels), "label": list(labels.values())}).to_csv(
        f"{path.stem}_variables.csv", index=False
    )
    value_labels = {
        var: {str(code): str(text) for code, text in codes.items()}
        for var, codes in reader.value_labels().items()
    }
    Path(f"{path.stem}_value_labels.json").write_text(
        json.dumps(value_labels, indent=1, ensure_ascii=False), encoding="utf-8"
    )
else:
    sample = pd.read_csv(path, nrows=1000, low_memory=False)
    pd.DataFrame({"name": sample.columns}).to_csv(f"{path.stem}_variables.csv", index=False)

sample.to_csv(f"{path.stem}_sample.csv", index=False)
print("done", len(sample.columns), "variables")