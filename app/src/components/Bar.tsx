export function Bar({ label, value, text, max = 1 }: { label: string; value: number; text: string; max?: number }) {
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="grid grid-cols-[9rem_1fr_4.5rem] items-center gap-3 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <div className="h-3 rounded bg-slate-200" role="img" aria-label={`${label}: ${text}`}>
        <div className="h-3 rounded bg-[var(--accent)]" style={{ width: `${width}%` }} />
      </div>
      <span className="text-right tabular-nums">{text}</span>
    </div>
  );
}

export function Card({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-[var(--card)] p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {note && <p className="mt-1 text-sm text-[var(--muted)]">{note}</p>}
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  );
}
