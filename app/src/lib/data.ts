import fs from "node:fs";
import path from "node:path";
import type { District, Meta } from "./types";

const dataDir = path.join(process.cwd(), "public", "data");

function readJson<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf-8")) as T;
}

export const getDistricts = () => readJson<District[]>("districts.json");
export const getMeta = () => readJson<Meta>("meta.json");
export const getGeo = () =>
  readJson<{ features: { properties: { name: string }; geometry: { type: string; coordinates: unknown } }[] }>(
    "districts.geojson",
  );

export const COMPONENT_LABELS: Record<string, { label: string; help: string }> = {
  idle_youth: { label: "Idle youth", help: "Share of youth neither working nor studying" },
  unemployment: { label: "Unemployment", help: "Youth unemployment rate (Labour Force Survey 2025)" },
  low_quality_work: { label: "Low-quality work", help: "Share of employed youth in agricultural or elementary occupations (census proxy for subsistence and low-quality work)" },
  education_mismatch: { label: "Education mismatch", help: "Share of employed secondary or tertiary graduates in elementary jobs" },
};

export const ACTIVITY_LABELS: Record<string, string> = {
  employed: "Employed",
  student: "Studying (not employed)",
  neither: "Neither working nor studying",
};

export const OCCUPATION_LABELS: Record<string, string> = {
  professional_technical: "Managers, professionals, technicians",
  services_sales: "Services, sales, clerical",
  craft_trades: "Craft, plant and machine operators",
  elementary: "Elementary occupations",
  agricultural: "Agricultural, forestry, fishery",
};

export { num, pct } from "./format";
