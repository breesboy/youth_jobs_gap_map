import { PageHeader, Panel } from "@/components/ui";
import { COMPONENT_LABELS, getMeta } from "@/lib/data";

const SOURCES = [
  ["Rwanda Population and Housing Census 2022 (public microdata)", "District counts of youth, education, activity status, occupation and sector of work"],
  ["Rwanda Labour Force Survey 2025", "Youth unemployment rate by district (the census has no unemployment variable)"],
  ["Rwanda Labour Force Survey 2024 and 2025", "Sector employment growth at province level"],
  ["EICV7 poverty profile", "District poverty rate, shown as context only"],
  ["RTB accredited TVET school lists", "Accredited trades per district"],
  ["NST2 (2024 to 2029)", "Priority sectors and the jobs target"],
  ["District boundaries (geoBoundaries, ADM2)", "Map"],
];

const LIMITS = [
  "The score measures observed mismatch. It does not predict jobs.",
  "A graduate in an elementary job may be temporarily placed, so education mismatch is an indicator, not proof.",
  "RTB lists may be out of date, and accredited trades show what is offered, not enrolment or graduates.",
  "The trade-to-sector mapping and the score weights are assumptions; the sensitivity check shows how much they matter.",
  "Census and survey sector codes follow ISIC sections, so agro-processing (food manufacturing) cannot be separated from manufacturing, and agriculture here means farming, forestry and fishing.",
  "Sector growth is measured at province level and applied to districts through their census sector mix, so it is an approximation locally.",
  "Idle youth and unemployment overlap because the unemployed are counted in both.",
  "The census public file has no unemployment or subsistence-farming variable: unemployment comes from the Labour Force Survey 2025 (a smaller district sample), and low-quality work uses agricultural and elementary occupations as a proxy.",
  "Graduates are people holding an O-level certificate or higher; the census records certificates, not whether the job matches the field of study.",
];

export default function Methodology() {
  const meta = getMeta();
  const s = meta.sensitivity;
  return (
    <>
      <PageHeader title="Methodology" subtitle="How the gap score and priority sectors are built, what the data can and cannot say, and how AI was used." />
      {meta.data_status === "synthetic" && (
        <p className="rounded-2xl bg-orangesoft p-4 text-sm text-orange">
          This build uses synthetic test data to demonstrate the pipeline. The method below is exactly what runs on
          the NISR data.
        </p>
      )}

      <Panel title="Gap score"><div className="space-y-2 text-[15px] leading-relaxed text-muted [&_strong]:text-ink [&_code]:rounded [&_code]:bg-surface2 [&_code]:px-1 [&_ul]:list-disc [&_ul]:pl-5">
        <p>
          Youth are {meta.youth_definition}. For each district four components are computed from weighted census
          records, scaled to 0 to 1 across the 30 districts (min-max), then averaged with equal weights and multiplied
          by 100.
        </p>
        <ul className="mt-2 list-disc pl-5">
          {meta.components.map((c) => (
            <li key={c}>
              <strong>{COMPONENT_LABELS[c].label}:</strong> {COMPONENT_LABELS[c].help}.
            </li>
          ))}
        </ul>
      </div></Panel>

      <Panel title="Sensitivity check"><div className="space-y-2 text-[15px] leading-relaxed text-muted [&_strong]:text-ink [&_code]:rounded [&_code]:bg-surface2 [&_code]:px-1 [&_ul]:list-disc [&_ul]:pl-5">
        <p>
          Weights were redrawn {s.draws.toLocaleString()} times at random (seed {s.seed}). Median Spearman rank
          correlation with the equal-weight ranking is {s.median_spearman} (minimum {s.min_spearman}; 5th percentile{" "}
          {s.p5_spearman}). On average {(s.mean_top5_overlap * 100).toFixed(0)}% of the top 5 districts stay in the top
          5. Result: the ranking {s.ranking_holds ? "holds" : "does not hold"} under changed weights.
        </p>
        <p className="mt-2">Dropping one component at a time (Spearman versus baseline):</p>
        <ul className="mt-1 list-disc pl-5">
          {Object.entries(s.drop_one_spearman).map(([k, v]) => (
            <li key={k}>
              Without {COMPONENT_LABELS[k].label.toLowerCase()}: {v}
            </li>
          ))}
        </ul>
      </div></Panel>

      <Panel title="Training supply and priority sectors"><div className="space-y-2 text-[15px] leading-relaxed text-muted [&_strong]:text-ink [&_code]:rounded [&_code]:bg-surface2 [&_code]:px-1 [&_ul]:list-disc [&_ul]:pl-5">
        <p>
          Accredited, de-duplicated RTB trades are mapped to NST2 sectors with a published table (
          <code>data/reference/trade_sector_map.csv</code>). Within each district, sectors are ranked by the average of
          three factors, each scaled 0 to 1: NST2 fit (priority sector or not), local growth (province sector growth
          between the two labour force surveys multiplied by the district's census sector share), and local training
          gap (work share minus training share, floored at zero). Factors are scaled to the district's largest
          off-farm value. Agriculture is shown but not ranked, because it holds most jobs in nearly every district
          and would top every list. The top three off-farm sectors are shown with all factors.
        </p>
      </div></Panel>

      <Panel title="Data rules"><div className="space-y-2 text-[15px] leading-relaxed text-muted [&_strong]:text-ink [&_code]:rounded [&_code]:bg-surface2 [&_code]:px-1 [&_ul]:list-disc [&_ul]:pl-5">
        <ul className="list-disc pl-5">
          <li>Census used wherever it holds the variable, because it covers everyone and holds at district level.</li>
          <li>
            Surveys are used only where the census has no equivalent: district youth unemployment (one survey year) and
            province sector growth. Two survey years are never compared within a district.
          </li>
          <li>
            Confidence flags appear when a district has fewer than {meta.flag_thresholds.min_youth_sample} youth records,
            fewer than {meta.flag_thresholds.min_graduate_sample} employed graduates, fewer than{" "}
            {meta.flag_thresholds.min_trades_listed} listed trades, or growth based on thin survey cells.
          </li>
        </ul>
      </div></Panel>

      <Panel title="Sources"><div className="space-y-2 text-[15px] leading-relaxed text-muted [&_strong]:text-ink [&_code]:rounded [&_code]:bg-surface2 [&_code]:px-1 [&_ul]:list-disc [&_ul]:pl-5">
        <table className="w-full text-sm text-ink">
          <tbody>
            {SOURCES.map(([a, b]) => (
              <tr key={a} className="border-t border-line align-top">
                <td className="py-2 pr-3 font-medium">{a}</td>
                <td className="py-2">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></Panel>

      <Panel title="Limitations"><div className="space-y-2 text-[15px] leading-relaxed text-muted [&_strong]:text-ink [&_code]:rounded [&_code]:bg-surface2 [&_code]:px-1 [&_ul]:list-disc [&_ul]:pl-5">
        <ul className="list-disc pl-5">
          {LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div></Panel>

      <Panel title="AI-use disclosure"><div className="space-y-2 text-[15px] leading-relaxed text-muted [&_strong]:text-ink [&_code]:rounded [&_code]:bg-surface2 [&_code]:px-1 [&_ul]:list-disc [&_ul]:pl-5">
        <p>
          The authors used Claude (Anthropic) to help plan the project and to write and review parts of the pipeline
          and web application code. The authors reviewed, tested and are responsible for all code, method choices and
          results. Full detail is in <code>docs/ai_disclosure.md</code>.
        </p>
      </div></Panel>
    </>
  );
}
