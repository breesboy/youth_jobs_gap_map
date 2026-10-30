import type { District } from "./types";

export function weightedMean(districts: District[], pick: (d: District) => number) {
  const total = districts.reduce((s, d) => s + d.youth_population, 0);
  return districts.reduce((s, d) => s + pick(d) * d.youth_population, 0) / total;
}

export function nationalActivity(districts: District[]) {
  return Object.keys(districts[0].activity).map((key) => ({
    key,
    value: weightedMean(districts, (d) => d.activity[key] ?? 0),
  }));
}
