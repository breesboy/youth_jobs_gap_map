"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, SearchX } from "lucide-react";
import { Badge, scoreTone } from "@/components/ui";
import type { District } from "@/lib/types";
import { num, pct } from "@/lib/format";

type SortKey = "rank" | "name" | "score" | "idle" | "unemployment" | "youth";
const PAGE = 10;

const value = (d: District, k: SortKey) =>
  k === "rank" ? d.rank : k === "name" ? d.name : k === "score" ? d.gap_score : k === "idle" ? d.components.idle_youth.value : k === "unemployment" ? d.components.unemployment.value : d.youth_population;

export function DistrictTable({ districts }: { districts: District[] }) {
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("All");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "rank", dir: 1 });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const provinces = useMemo(() => ["All", ...Array.from(new Set(districts.map((d) => d.province))).sort()], [districts]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return districts
      .filter((d) => (province === "All" || d.province === province) && (!flaggedOnly || d.flags.length > 0) && (!q || d.name.toLowerCase().includes(q) || d.top_sectors.some((s) => s.toLowerCase().includes(q))))
      .sort((a, b) => {
        const x = value(a, sort.key);
        const y = value(b, sort.key);
        return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
      });
  }, [districts, query, province, flaggedOnly, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * PAGE, current * PAGE + PAGE);
  const allVisibleSelected = visible.length > 0 && visible.every((d) => selected.has(d.name));

  const toggleSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "name" || key === "rank" ? 1 : -1 }));
    setPage(0);
  };
  const toggle = (name: string) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  const toggleAll = () =>
    setSelected((s) => {
      const next = new Set(s);
      visible.forEach((d) => (allVisibleSelected ? next.delete(d.name) : next.add(d.name)));
      return next;
    });

  const exportCsv = () => {
    const source = selected.size > 0 ? districts.filter((d) => selected.has(d.name)) : rows;
    const header = ["rank", "district", "province", "gap_score", "idle_youth", "unemployment", "low_quality_work", "education_mismatch", "youth_population", "top_sectors"];
    const lines = source.map((d) =>
      [d.rank, d.name, d.province, d.gap_score, d.components.idle_youth.value, d.components.unemployment.value, d.components.low_quality_work.value, d.components.education_mismatch.value, d.youth_population, `"${d.top_sectors.join("; ")}"`].join(","),
    );
    const url = URL.createObjectURL(new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "district_gap_scores.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const Head = ({ k, label, right }: { k: SortKey; label: string; right?: boolean }) => (
    <th scope="col" aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={`px-3 py-3 font-medium ${right ? "text-right" : "text-left"}`}>
      <button onClick={() => toggleSort(k)} className={`inline-flex items-center gap-1 rounded transition-colors hover:text-ink ${sort.key === k ? "text-ink" : ""}`}>
        {label}
        {sort.key === k && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          aria-label="Filter districts or sectors"
          placeholder="Filter by district or sector"
          className="h-9 min-w-0 flex-1 rounded-full bg-surface2 px-4 text-sm outline-none placeholder:text-faint focus:shadow-[0_0_0_2px_var(--accent)] sm:max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          Province
          <select
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              setPage(0);
            }}
            className="h-9 rounded-full bg-surface2 px-3 text-sm text-ink outline-none focus:shadow-[0_0_0_2px_var(--accent)]"
          >
            {provinces.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => {
              setFlaggedOnly(e.target.checked);
              setPage(0);
            }}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Flagged only
        </label>
        <button
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium transition-colors hover:bg-surface2 disabled:opacity-40"
        >
          <Download size={15} />
          {selected.size > 0 ? `Export ${selected.size} selected` : "Export CSV"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <caption className="sr-only">Districts ranked by youth jobs and skills gap score</caption>
          <thead className="text-xs uppercase tracking-wide text-muted">
            <tr className="border-b border-line">
              <th scope="col" className="w-10 px-3 py-3">
                <input type="checkbox" aria-label="Select all rows on this page" checked={allVisibleSelected} onChange={toggleAll} className="h-4 w-4 accent-[var(--accent)]" />
              </th>
              <Head k="rank" label="Rank" />
              <Head k="name" label="District" />
              <Head k="score" label="Gap score" />
              <Head k="idle" label="Idle youth" right />
              <Head k="unemployment" label="Unemployment" right />
              <Head k="youth" label="Youth" right />
              <th scope="col" className="px-3 py-3 text-left font-medium">Top sector</th>
              <th scope="col" className="px-3 py-3 text-left font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((d) => (
              <tr key={d.name} className={`border-b border-line last:border-0 transition-colors hover:bg-surface2/60 ${selected.has(d.name) ? "bg-accentsoft" : ""}`}>
                <td className="px-3 py-3">
                  <input type="checkbox" aria-label={`Select ${d.name}`} checked={selected.has(d.name)} onChange={() => toggle(d.name)} className="h-4 w-4 accent-[var(--accent)]" />
                </td>
                <td className="px-3 py-3 tabular-nums text-muted">{d.rank}</td>
                <td className="px-3 py-3">
                  <Link href={`/district/${d.name}/`} className="font-medium hover:text-accent">
                    {d.name}
                  </Link>
                  <span className="block text-xs text-muted">{d.province}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Badge tone={scoreTone(d.gap_score)}>{d.gap_score.toFixed(1)}</Badge>
                    <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-surface2 md:block">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${d.gap_score}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{pct(d.components.idle_youth.value)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{pct(d.components.unemployment.value)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{num(d.youth_population)}</td>
                <td className="px-3 py-3">{d.top_sectors[0]}</td>
                <td className="px-3 py-3">
                  {d.flags.length > 0 ? (
                    <span title={d.flags.join(" ")}>
                      <Badge tone="orange">{d.flags.length} flag{d.flags.length > 1 ? "s" : ""}</Badge>
                    </span>
                  ) : (
                    <Badge tone="green">OK</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <SearchX className="text-faint" size={28} />
            <p className="font-medium">No districts match these filters</p>
            <button
              onClick={() => {
                setQuery("");
                setProvince("All");
                setFlaggedOnly(false);
              }}
              className="text-sm text-accent hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
        <span>
          {rows.length === 0 ? "0 districts" : `${current * PAGE + 1}–${Math.min(rows.length, current * PAGE + PAGE)} of ${rows.length}`}
          {selected.size > 0 && ` · ${selected.size} selected`}
        </span>
        <div className="flex items-center gap-1">
          <button aria-label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)} className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-surface2 disabled:opacity-30">
            <ChevronLeft size={16} />
          </button>
          <span className="px-2 tabular-nums">
            {current + 1} / {pages}
          </span>
          <button aria-label="Next page" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-surface2 disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
