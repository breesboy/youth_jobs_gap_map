# Youth Jobs Gap Map

A web application that measures the youth jobs and skills mismatch in each of Rwanda's 30 districts, compares it
with local accredited training, and suggests priority sectors aligned with NST2.

> Status: the pipeline and app are complete and tested on synthetic data. Figures become NISR results once the
> pipeline is run on the NISR datasets listed in `data/raw/README.md`. The app shows a banner while data is synthetic.

## What the app shows
- National map of 30 districts coloured by gap score (0 to 100), with a ranked table.
- District page: score breakdown, youth profile, training supply versus local work, top 3 priority sectors with the
  factors behind them, and confidence flags.
- Training supply page: accredited trades per district and sector.
- Methodology page: formulas, sources, sensitivity check, limitations, AI-use disclosure.

## How to use it
Click a district on the map or in the table. Rank, score components and sector reasoning are shown on its page.

## Data used
Census 2022 public microdata, Labour Force Surveys 2024 and 2025, EICV7 poverty profile, RTB accredited TVET lists,
NST2, geoBoundaries district boundaries. Details and file formats: `data/raw/README.md`.

## Rebuild the numbers
Python 3.13.

```
pip install -r requirements.txt
python pipeline/prepare_nisr_inputs.py --census <census folder> --lfs-earlier <lfs2024> --lfs-later <lfs2025> --eicv7 <eicv7.dta>
python pipeline/extract_rtb.py <RTB accredited schools PDF>   # writes data/raw/rtb_trades.csv
python pipeline/build_district_tables.py            # reads data/raw/, writes data/processed/ and app/public/data/
python pipeline/build_district_tables.py --source sample   # synthetic test data
python -m pytest tests
```
The run prints youth population and score per district; the same figures are in `data/processed/checks.txt` and on
the app's district pages. Random seed is fixed (42), so reruns give identical output.

## Run the app
```
cd app
npm install
npm run build     # static export to app/out
npx serve out
```
Node 22. The app is a static site, deployable on Vercel with root directory `app`.

## Repository layout
`pipeline/` rebuild code · `data/reference/` trade-to-sector map, sectors, boundaries · `data/processed/` district
tables · `app/` web app · `docs/` methodology, cleaning log, AI disclosure · `demo/` screen recording.

## Declaration
This work is our own. All sources are acknowledged in `docs/methodology.md`. AI use is disclosed in
`docs/ai_disclosure.md`.
