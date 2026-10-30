import Link from "next/link";
import { ArrowRight, AlertTriangle, MapPinned, TrendingUp, Users } from "lucide-react";
import { DistrictMap, type MapItem } from "@/components/DistrictMap";
import { Donut, StackedScores, type StackRow } from "@/components/charts";
import { Badge, Meter, PageHeader, Panel, Stat } from "@/components/ui";
import { ACTIVITY_LABELS, COMPONENT_LABELS, getDistricts, getGeo, getMeta, num, pct } from "@/lib/data";
import { geometryPath, MAP_HEIGHT, MAP_WIDTH } from "@/lib/map";
import { nationalActivity, weightedMean } from "@/lib/summary";

export default function Overview() {
  const districts = getDistricts();
  const meta = getMeta();
  const byName = new Map(districts.map((d) => [d.name, d]));
  const items: MapItem[] = getGeo().features.map((f) => {
    const d = byName.get(f.properties.name)!;
    return { name: d.name, d: geometryPath(f.geometry), score: d.gap_score, rank: d.rank, province: d.province, topSectors: d.top_sectors };
  });

  const top = districts[0];
  const high = districts.filter((d) => d.gap_score >= 60).length;
  const idle = weightedMean(districts, (d) => d.activity.neither ?? 0);
  const flagged = districts.filter((d) => d.flags.length > 0);

  const stack: StackRow[] = districts.slice(0, 10).map((d) => ({
    name: d.name,
    ...Object.fromEntries(meta.components.map((c) => [c, d.components[c].contribution])),
  }));
  const keys = meta.components.map((c) => ({ key: c, label: COMPONENT_LABELS[c].label }));

  const activity = nationalActivity(districts).map((a) => ({ name: ACTIVITY_LABELS[a.key] ?? a.key, value: a.value }));

  const sectorCount = new Map<string, number>();
  districts.forEach((d) => d.top_sectors.slice(0, 1).forEach((s) => sectorCount.set(s, (sectorCount.get(s) ?? 0) + 1)));
  const sectors = [...sectorCount.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={`Where the youth jobs and skills gap is largest across Rwanda's ${districts.length} districts. Youth are ${meta.youth_definition}.`}
        actions={
          <Link
            href="/districts/"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-white transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98]"
          >
            Explore districts <ArrowRight size={16} />
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Youth covered" value={num(meta.total_youth_population)} detail="Census 2022, weighted" icon={<Users size={18} />} />
        <Stat label="Largest gap" value={top.name} detail={`${top.province} · score ${top.gap_score.toFixed(1)}`} icon={<TrendingUp size={18} />} />
        <Stat label="High-gap districts" value={`${high} of ${districts.length}`} detail="Gap score of 60 or more" icon={<MapPinned size={18} />} />
        <Stat label="Neither working nor studying" value={pct(idle)} detail="Share of youth, national" icon={<AlertTriangle size={18} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel title="Gap score by district" note="Darker means a larger gap." className="lg:col-span-2">
          <DistrictMap items={items} width={MAP_WIDTH} height={MAP_HEIGHT} />
        </Panel>
        <Panel title="Ten largest gaps" note="Points each component adds to the gap score." className="lg:col-span-3">
          <StackedScores data={stack} keys={keys} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="What youth are doing" note="National, weighted by district youth population.">
          <Donut data={activity} />
        </Panel>
        <Panel title="Leading priority sector" note="Districts by their top-ranked off-farm sector." className="lg:col-span-1">
          <div className="space-y-4">
            {sectors.map(([name, count]) => (
              <Meter key={name} label={name} value={count} max={districts.length} text={`${count}`} />
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">Agriculture is shown on each district page but not ranked, because it would lead everywhere.</p>
        </Panel>
        <Panel title="Data confidence" note="Districts with a flag rest on small samples or incomplete lists.">
          {flagged.length === 0 ? (
            <p className="text-sm text-muted">No districts are flagged.</p>
          ) : (
            <ul className="divide-y divide-line">
              {flagged.slice(0, 5).map((d) => (
                <li key={d.name}>
                  <Link href={`/district/${d.name}/`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-accent">
                    <span>{d.name}</span>
                    <Badge tone="orange">{d.flags.length} flag{d.flags.length > 1 ? "s" : ""}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {flagged.length > 5 && <p className="mt-2 text-xs text-muted">and {flagged.length - 5} more, listed under the bell icon.</p>}
          <p className="mt-3 text-xs text-muted">
            Ranking stability: median rank correlation {meta.sensitivity.median_spearman} across random weights.{" "}
            {meta.sensitivity.ranking_holds ? "The ranking holds." : "Middle ranks move with the weights; the extremes are steadier."}
          </p>
        </Panel>
      </div>
    </>
  );
}
