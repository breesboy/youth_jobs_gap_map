# Source archives

Compressed copies of the original source files used by the pipeline (one `.zip` per file).

| Archive | Contains | Source |
|---|---|---|
| `PHC5_Public_microdata.zip` | `PHC5_Public_microdata.dta` | NISR Population and Housing Census 2022, public microdata |
| `RW_LFS2024.zip` | `RW_LFS2024.dta` | NISR Labour Force Survey 2024 |
| `RW_LFS2025.zip` | `RW_LFS2025.csv` | NISR Labour Force Survey 2025 |
| `CS_EICV7_poverty_file.zip` | `CS_EICV7_poverty_file.dta` | NISR EICV7 poverty file |
| `Accredited_TVET_Schools_2020_2021_Final.zip` | `Accredited_TVET_Schools_2020_2021_Final.pdf` | RTB accredited TVET schools list |

Unpack them with `python pipeline/unpack_data.py`. The files are extracted to `data/raw/source/`, which Git ignores.
The data are NISR and RTB publications used under their terms of use.
