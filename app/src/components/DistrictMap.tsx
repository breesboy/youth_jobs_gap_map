"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type MapItem = {
  name: string;
  d: string;
  score: number;
  rank: number;
  province: string;
  topSectors: string[];
};

const fill = (score: number, min: number, max: number) => {
  const t = max === min ? 0 : (score - min) / (max - min);
  return `color-mix(in srgb, var(--accent) ${Math.round(18 + t * 82)}%, var(--map-low))`;
};

export function DistrictMap({ items, width, height }: { items: MapItem[]; width: number; height: number }) {
  const router = useRouter();
  const [active, setActive] = useState<MapItem | null>(null);
  const scores = items.map((i) => i.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const go = (name: string) => router.push(`/district/${name}/`);

  return (
    <div>
      <div className="min-h-[4.25rem] text-sm" aria-live="polite">
        {active ? (
          <>
            <p className="text-[15px] font-semibold">
              {active.name} <span className="font-normal text-muted">· {active.province}</span>
            </p>
            <p className="text-muted">
              Gap score <strong className="text-ink">{active.score.toFixed(1)}</strong> · rank {active.rank} of {items.length}
            </p>
            <p className="text-muted">Priority: {active.topSectors.join(", ")}</p>
          </>
        ) : (
          <p className="text-muted">Hover or focus a district for details. Select one to open its profile.</p>
        )}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto h-auto w-full max-w-md"
        role="group"
        aria-label="Map of Rwanda districts coloured by gap score"
      >
        {items.map((item) => (
          <path
            key={item.name}
            d={item.d}
            style={{ fill: fill(item.score, min, max), transition: "opacity 150ms" }}
            stroke={active?.name === item.name ? "var(--ink)" : "var(--surface)"}
            strokeWidth={active?.name === item.name ? 2 : 1}
            opacity={active && active.name !== item.name ? 0.6 : 1}
            tabIndex={0}
            role="link"
            aria-label={`${item.name}, gap score ${item.score.toFixed(1)}, rank ${item.rank}`}
            className="cursor-pointer"
            onMouseEnter={() => setActive(item)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(item)}
            onBlur={() => setActive(null)}
            onClick={() => go(item.name)}
            onKeyDown={(e) => e.key === "Enter" && go(item.name)}
          />
        ))}
      </svg>
      <div className="mx-auto mt-3 flex max-w-xs items-center gap-2 text-xs text-muted">
        <span className="tabular-nums">{min.toFixed(0)}</span>
        <div
          className="h-1.5 flex-1 rounded-full"
          style={{ background: `linear-gradient(to right, ${fill(min, min, max)}, ${fill(max, min, max)})` }}
        />
        <span className="tabular-nums">{max.toFixed(0)}</span>
        <span>gap score</span>
      </div>
    </div>
  );
}
