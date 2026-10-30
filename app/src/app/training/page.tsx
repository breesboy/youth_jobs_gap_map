import { TrainingTable } from "@/components/TrainingTable";
import { WorkVsTraining } from "@/components/charts";
import { PageHeader, Panel } from "@/components/ui";
import { getDistricts } from "@/lib/data";
import { weightedMean } from "@/lib/summary";

export default function TrainingPage() {
  const districts = getDistricts();
  const sectors = districts[0].training.by_sector.map((s) => s.sector);
  const chart = sectors.map((name, i) => ({
    name,
    work: weightedMean(districts, (d) => d.training.by_sector[i].work_share),
    training: weightedMean(districts, (d) => d.training.by_sector[i].training_share),
  }));
  const rows = districts.map((d) => {
    const gap = d.priority_sectors.filter((s) => s.rank !== null).sort((a, b) => b.training_gap - a.training_gap)[0];
    return {
      name: d.name,
      province: d.province,
      trades: d.training.total_trades,
      per10k: d.training.trades_per_10k_youth,
      bySector: d.training.by_sector.map((s) => s.trades),
      gap: gap.training_gap > 0 ? gap.sector : "None",
    };
  });

  return (
    <>
      <PageHeader
        title="Training supply"
        subtitle="Accredited trades from RTB lists, mapped to NST2 sectors, set against where young people work. Counts show what is offered, not how many students enrol."
      />
      <Panel title="Local work and training, all districts" note="Youth-weighted average of district shares. Where the amber bar is longer than the blue one, work outstrips training.">
        <WorkVsTraining data={chart} height={340} />
      </Panel>
      <TrainingTable rows={rows} sectors={sectors} />
    </>
  );
}
