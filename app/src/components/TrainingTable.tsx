"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

type Row = { name: string; province: string; trades: number; per10k: number; bySector: number[]; gap: string };
type Key = "name" | "trades" | "per10k";

export function TrainingTable({ rows, sectors }: { rows: Row[]; sectors: string[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "per10k", dir: 1 });

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.gap.toLowerCase().includes(q))
      .sort((a, b) => (a[sort.key] < b[sort.key] ? -1 : a[sort.key] > b[sort.key] ? 1 : 0) * sort.dir);
  }, [rows, query, sort]);

  const Head = ({ k, label, right }: { k: Key; label: string; right?: boolean }) => (
    <th scope="col" aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={`px-3 py-3 font-medium ${right ? "text-right" : "text-left"}`}>
      <button onClick={() => setSort((s) => (s.key === k ? { key: k, dir: s.dir === 1 ? -1 : 1 } : { key: k, dir: 1 }))} className={`inline-flex items-center gap-1 hover:text-ink ${sort.key === k ? "text-ink" : ""}`}>
        {label}
        {sort.key === k && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight">Districts by training supply</h2>
          <p className="text-[13px] text-muted">Sorted from least to most training per 10,000 youth by default.</p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter districts"
          placeholder="Filter by district or sector"
          className="h-9 w-full rounded-full bg-surface2 px-4 text-sm outline-none placeholder:text-faint focus:shadow-[0_0_0_2px_var(--accent)] sm:w-64"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted">
            <tr className="border-b border-line">
              <Head k="name" label="District" />
              <Head k="trades" label="Trades" right />
              <Head k="per10k" label="Per 10k youth" right />
              {sectors.map((s) => (
                <th key={s} scope="col" className="px-3 py-3 text-right font-medium" title={s}>
                  {s.split(/[ &]/)[0]}
                </th>
              ))}
              <th scope="col" className="px-3 py-3 text-left font-medium">Largest gap</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.name} className="border-b border-line last:border-0 hover:bg-surface2/60">
                <td className="px-3 py-3">
                  <Link href={`/district/${r.name}/`} className="font-medium hover:text-accent">
                    {r.name}
                  </Link>
                  <span className="block text-xs text-muted">{r.province}</span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{r.trades}</td>
                <td className="px-3 py-3 text-right tabular-nums">{r.per10k.toFixed(1)}</td>
                {r.bySector.map((n, i) => (
                  <td key={i} className="px-3 py-3 text-right tabular-nums text-muted">
                    {n}
                  </td>
                ))}
                <td className="px-3 py-3">{r.gap}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="px-4 py-12 text-center text-sm text-muted">No districts match “{query}”.</p>}
      </div>
    </div>
  );
}
