# Raw source data

Raw NISR records are not committed. Download them with a free account from the NISR microdata portal
(https://microdata.statistics.gov.rw), log in, open the dataset and use "Get Microdata". Read NISR's terms of use
before redistributing anything.

| Source | Portal entry | Used for |
|---|---|---|
| Rwanda Population and Housing Census 2022, `PHC5_Public_microdata_2022` | catalog 109 | `census_persons.csv` |
| Rwanda Labour Force Survey 2024 | catalog 114 | `lfs_employment.csv` |
| Rwanda Labour Force Survey 2025, `RW_LFS2025` | catalog 125 | `lfs_employment.csv` |
| EICV7 Poverty Profile (district poverty, Annex B) | statistics.gov.rw publications | `eicv7_poverty.csv` |
| RTB accredited TVET schools list | rtb.gov.rw publications | `rtb_trades.csv` |

## Step 1: convert the NISR files

```
python pipeline/prepare_nisr_inputs.py --census "PHC5_Public_microdata.dta" --lfs-earlier "RW_LFS2024.dta" --lfs-later "RW_LFS2025.csv"
```
This writes `census_persons.csv`, `lfs_employment.csv` and `youth_unemployment.csv` to `data/raw/` and prints the
weighted population, which should be close to NISR's published census total. The variable mapping is in
`docs/cleaning_log.md`.

## Step 2: RTB trades and EICV7 poverty
```
python pipeline/extract_rtb.py "Accredited_TVET_Schools_2020_2021_Final.pdf"
python pipeline/prepare_nisr_inputs.py ... --eicv7 "CS_EICV7_poverty_file.dta"
```
`extract_rtb.py` writes `rtb_trades.csv` (`district, school, trade, level, accredited`, one row per school and
accredited trade) and prints diagnostics. EICV7 district poverty is the population-weighted mean of `pov_jan` by
district (`eicv7_poverty.csv`, 0 to 1); the national rate should print as 27.4%.

## Step 3: rebuild

```
python pipeline/build_district_tables.py
```

## Format of the files in `data/raw/`

`census_persons.csv`: `district, age, sex, education, activity, occupation, sector, graduate, weight`
(activity: employed, student, neither; graduate: 1 or 0).
`lfs_employment.csv`: `province, sector, year, employed, n_obs` (two years).
`youth_unemployment.csv`: `district, unemployment_rate, n_labour_force`.

## Test without NISR data

`python pipeline/build_district_tables.py --source sample` runs on synthetic data from `data/sample/`. Output is
labelled synthetic in the app.
