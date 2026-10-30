# Methodology

**Youth**: ages 16 to 30.

**Gap score.** Four components per district from weighted census records:
1. Idle youth (census): share of youth neither employed nor currently studying.
2. Unemployment (Labour Force Survey 2025): unemployed / (employed + unemployed) among youth, by district.
3. Low-quality work (census): share of employed youth in agricultural (ISCO group 6) or elementary (group 9) occupations.
4. Education mismatch (census): share of employed graduates (O-level certificate or higher) in elementary occupations.

Each is min-max scaled to 0 to 1 across districts. Score = weighted average x 100, equal weights. EICV7 poverty is
shown beside the score and is not part of it.

**Sensitivity.** 2,000 Dirichlet-random weight vectors (seed 42). Reported: median, minimum and 5th percentile
Spearman correlation with the baseline ranking, mean top-5 overlap, per-district 5th to 95th percentile rank range,
and a drop-one-component test. Reported whether or not the ranking holds.

**Training supply.** RTB accredited trades, de-duplicated by district, school and trade, mapped to NST2 sectors with
`data/reference/trade_sector_map.csv`. Trades not in the table are reported as unmapped and excluded.

**Priority sectors.** Per district, each sector scores the mean of three factors scaled 0 to 1:
- Fit: 1 if an NST2 priority sector (agro-processing, manufacturing, ICT, construction, tourism), else 0.
- Growth: province sector employment growth between LFS 2024 and 2025, multiplied by the district's census sector
  share, floored at 0, divided by the district's maximum.
- Training gap: max(work share - training share, 0), divided by the district's maximum.
Factors are scaled to the district's largest off-farm value. Agriculture is shown but not ranked (it holds most jobs in
nearly every district and would top every list). The top 3 off-farm sectors are shown with all three factors.

**Data rules.** Census wherever it holds the variable; surveys only for district youth unemployment (2025) and province
sector growth; no comparison of survey years inside a district.

**Confidence flags.** Fewer than 300 youth records, fewer than 40 employed graduates, fewer than 3 listed trades, or
growth based on survey cells with fewer than 50 observations.

**Limitations.** See the methodology page of the app.

**Sources.** NISR PHC5 2022 public microdata; NISR Labour Force Survey 2024 and 2025; NISR EICV7 Poverty Profile;
RTB accredited TVET schools list; NST2; geoBoundaries (William and Mary geoLab) ADM2 for Rwanda.
