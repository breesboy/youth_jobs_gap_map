# Cleaning log

Every run writes counts for each rule to `data/processed/meta.json` under `cleaning`.

## Census (`pipeline/clean_census.py`)
- Text fields trimmed; district names title-cased; education, activity, occupation and sex lower-cased.
- Rows dropped: unknown district; age missing or outside 16 to 30; missing or non-positive weight; unknown activity.
- Education outside the allowed levels set to missing (kept in the file, excluded from education shares).
- Occupation and sector are set to missing for anyone not employed. An employed person with an invalid or missing
  occupation or sector stays in the employed count but is excluded from the denominators that need that variable.
- All rates use the census weight.

## Labour force surveys (`pipeline/clean_surveys.py`)
- Rows dropped: unknown province or sector, non-positive employment.
- Exactly two years required. Growth = employed in later year / employed in earlier year - 1, by province and sector.
- Cells with fewer than 50 observations in either year are marked thin.

## RTB lists (`pipeline/clean_training.py`)
- Rows dropped: unknown district; not accredited; duplicate district, school and trade.
- Trade names trimmed, lower-cased, whitespace collapsed, then mapped to sectors. Unmapped trades are listed in
  `meta.json` and excluded.

## RTB PDF extraction (`pipeline/extract_rtb.py`)
- The accredited trades column of the 2020/21 list is read by text position; each school block is found from the row
  borders of the S/N column. Non-accredited and provisional columns are ignored.
- 331 schools are read. District names with typos in the PDF are matched approximately ("Ntagatare", "NYAMAGA BE").
- Trade names are matched against a fixed vocabulary of RTB trade names (`TRADE_PATTERNS`), with typos handled; a school's
  trade counts once however many levels it is accredited for. Levels are not used.
- 16 schools share a table block with a neighbour (serials 84 to 87, 185, 186, 192, 193, 249, 250, 263, 264, 313, 314,
  320, 321). Their trades are split at the midpoint between the two serial numbers, so a trade near the boundary may be
  assigned to the wrong neighbour. Neighbours are in the same district except at a district boundary.
- A few rare trades are not matched (graphic design, sculpture, ceramics, soft skills) and are left out.

## EICV7 poverty
District poverty rate = population-weighted mean of the household poverty headcount (`pov_jan`) using `pop_wt`.

## Variable mapping from NISR files (`pipeline/prepare_nisr_inputs.py`)
Census 2022 public microdata (`PHC5_Public_microdata_2022`), youth = `p04` 16 to 30, weight = `Pop_weight`:
- district: `ml02` (codes 11 to 57).
- activity: employed if `p48a` (occupation) is present; else student if `p29` = 2 (currently attending); else neither.
  The census has no unemployed or inactive variable, so those cannot be separated.
- education (profile only): `p30a` 1 to 2 none, 3 to 4 primary, 5 to 6 secondary, 7 tertiary; never attended (`p29` = 3) none.
- graduate: `p31` certificate 4 to 15 (O-level or higher) = 1; 1, 2, 3, 16 or never attended = 0; otherwise missing.
- occupation: `p48a` ISCO major group 1 to 3 professional_technical, 4 to 5 services_sales, 6 agricultural, 7 to 8
  craft_trades, 9 elementary; 99 (not stated) missing.
- sector: `p47a` ISIC section: 1 agriculture, 2 mining, 3 manufacturing, 6 construction, 7 trade, 8 transport,
  9 tourism and hospitality, 10 ICT, all others public and other services; 22 (not stated) missing.
- Assumption to confirm on the portal: the code lists for `p47a` and `p48a` are the label sets `econ_deriv8` (22 codes)
  and `econ_deriv10` (1 to 9, 99). Values seen in the data are consistent with this.

Labour Force Survey 2024 and 2025: `province`, `code_dis`, `weight2` (annual weight), `A04` (age), `status1`
(1 employed, 2 unemployed, 3 out of labour force), `indd03` (ISIC section, mapped as above), `LFS_year`. The 2024 file
holds numeric codes and the 2025 file holds text labels; the converter accepts both.
- Sector growth: weighted employed (all ages 16+) by province and sector, 2025 versus 2024.
- Youth unemployment: 2025 only, ages 16 to 30, weighted, by district.
