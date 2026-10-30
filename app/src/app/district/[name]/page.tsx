import Link from "next/link";
import { ChevronLeft, TriangleAlert } from "lucide-react";
import { Donut, WorkVsTraining } from "@/components/charts";
import { Badge, Meter, PageHeader, Panel, Stat, scoreTone } from "@/components/ui";
import { ACTIVITY_LABELS, COMPONENT_LABELS, OCCUPATION_LABELS, getDistricts, getMeta, num, pct } from "@/lib/data";

export function generateStaticParams() {
  return getDistricts().map((d) => ({ name: d.name }));
}

export default async function DistrictPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const districts = getDistricts();
  const d = districts.find((x) => x.name === decodeURIComponent(name))!;
  const meta = getMeta();
  const top = d.priority_sectors.filter((s) => s.top);
  const activity = Object.entries(d.activity).map(([k, v]) => ({ name: ACTIVITY_LABELS[k] ?? k, value: v }));
  const chart = d.training.by_sector.map((s) => ({ name: s.sector, work: s.work_share, training: s.training_share }));

  return (
    <>
      <Link href="/districts/" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
        <ChevronLeft size={16} /> All districts
      </Link>
      <PageHeader
        title={d.name}
        subtitle={
          <>
            {d.province} Province · {num(d.youth_population)} youth ({meta.youth_definition})
            {d.poverty_rate !== null && <> · poverty rate {pct(d.poverty_rate)} (context only, not in the score)</>}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Gap score" value={d.gap_score.toFixed(1)} detail={<Badge tone={scoreTone(d.gap_score)}>{scoreTone(d.gap_score) === "red" ? "High gap" : scoreTone(d.gap_score) === "orange" ? "Moderate gap" : "Lower gap"}</Badge>} />
        <Stat label="Rank" value={`${d.rank} of ${districts.length}`} detail={`Ranges ${d.rank_range[0]} to ${d.rank_range[1]} under other weights`} />
        <Stat label="Accredited trades" value={d.training.total_trades} detail={`${d.training.trades_per_10k_youth.toFixed(1)} per 10,000 youth`} />
        <Stat label="Top priority sector" value={<span className="text-[22px] leading-tight">{top[0]?.sector}</span>} detail="Among off-farm sectors" />
      </div>

      {d.flags.length > 0 && (
        <div className="flex gap-3 rounded-2xl bg-orangesoft p-4 text-sm text-orange">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Confidence flags</p>
            <ul className="mt-1 list-disc pl-5">
              {d.flags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Score breakdown" note="Each component is scaled 0 to 1 across districts, then weighted equally. Points add up to the gap score.">
          <div className="space-y-5">
            {meta.components.map((c) => (
              <div key={c} className="space-y-1.5">
                <Meter label={COMPONENT_LABELS[c].label} value={d.components[c].contribution} max={100 / meta.components.length} text={`${d.components[c].contribution.toFixed(1)}`} />
                <p className="text-xs text-muted">
                  {COMPONENT_LABELS[c].help}: <span className="font-medium text-ink">{pct(d.components[c].value)}</span>
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Priority sectors" note="Average of three factors, each 0 to 100: fit with NST2, local growth and local training gap. Ranked among off-farm sectors.">
          <ol className="space-y-3">
            {top.map((s) => (
              <li key={s.sector} className="rounded-xl border border-line p-4">
                <p className="flex items-center justify-between font-semibold">
                  <span>
                    {s.rank}. {s.sector}
                  </span>
                  <Badge tone="accent">{s.score.toFixed(0)}</Badge>
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  NST2 priority: {s.fit === 1 ? "yes" : "no"} · growth factor {s.growth.toFixed(2)} (province growth {pct(s.province_growth)}) · training gap factor {s.training_gap.toFixed(2)}
                </p>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="What youth are doing" note="Activity status of youth in the district.">
          <Donut data={activity} />
          <p className="mb-2 mt-4 text-[13px] font-medium text-muted">Highest education level attended</p>
          <div className="space-y-2.5">
            {Object.entries(d.education).map(([k, v]) => (
              <Meter key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={v} text={pct(v)} />
            ))}
          </div>
        </Panel>

        <Panel title="Where employed youth work" note="Share of employed youth by occupation type.">
          <div className="space-y-3">
            {Object.entries(d.occupation).map(([k, v]) => (
              <Meter key={k} label={OCCUPATION_LABELS[k] ?? k} value={v} text={pct(v)} />
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Training supply versus local work"
        note="Work share is the sector's share of employed youth. Training share is the sector's share of the district's accredited trades. Counts show what is offered, not enrolment."
      >
        <WorkVsTraining data={chart} />
      </Panel>

      <Panel title={`All sector scores for ${d.name}`} note="Agriculture is listed but not ranked: it holds most jobs in nearly every district and would top every list.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Sector</th>
                <th className="py-2 pr-3 text-right font-medium">Score</th>
                <th className="py-2 pr-3 text-right font-medium">Fit</th>
                <th className="py-2 pr-3 text-right font-medium">Growth</th>
                <th className="py-2 text-right font-medium">Training gap</th>
              </tr>
            </thead>
            <tbody>
              {d.priority_sectors.map((s) => (
                <tr key={s.sector} className="border-b border-line last:border-0">
                  <td className="py-2.5 pr-3 text-muted">{s.rank ?? "–"}</td>
                  <td className="py-2.5 pr-3">{s.sector}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{s.rank === null ? "not ranked" : s.score.toFixed(0)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{s.fit.toFixed(0)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{s.growth.toFixed(2)}</td>
                  <td className="py-2.5 text-right tabular-nums">{s.training_gap.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
