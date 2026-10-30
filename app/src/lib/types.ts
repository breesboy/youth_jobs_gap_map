export type Component = { value: number; scaled: number; contribution: number };

export type SectorScore = {
  sector: string;
  score: number;
  fit: number;
  growth: number;
  training_gap: number;
  work_share: number;
  training_share: number;
  province_growth: number;
  rank: number | null;
  top: boolean;
};

export type TrainingSector = {
  sector: string;
  trades: number;
  training_share: number;
  work_share: number;
};

export type District = {
  name: string;
  province: string;
  rank: number;
  rank_range: [number, number];
  gap_score: number;
  components: Record<string, Component>;
  youth_population: number;
  sample_records: number;
  poverty_rate: number | null;
  education: Record<string, number>;
  activity: Record<string, number>;
  occupation: Record<string, number>;
  training: { total_trades: number; trades_per_10k_youth: number; by_sector: TrainingSector[] };
  priority_sectors: SectorScore[];
  top_sectors: string[];
  flags: string[];
};

export type Meta = {
  data_status: "synthetic" | "nisr";
  youth_definition: string;
  components: string[];
  weights: Record<string, number>;
  seed: number;
  districts: number;
  total_youth_population: number;
  sensitivity: {
    draws: number;
    seed: number;
    median_spearman: number;
    min_spearman: number;
    p5_spearman: number;
    mean_top5_overlap: number;
    drop_one_spearman: Record<string, number>;
    ranking_holds: boolean;
  };
  cleaning: Record<string, Record<string, unknown>>;
  flag_thresholds: Record<string, number>;
};
