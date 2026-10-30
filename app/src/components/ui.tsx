import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Panel({
  title,
  note,
  action,
  children,
  className = "",
}: {
  title?: string;
  note?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>}
            {note && <p className="mt-1 text-[13px] leading-snug text-muted">{note}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, detail, icon }: { label: string; value: ReactNode; detail?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between text-[13px] font-medium text-muted">
        <span>{label}</span>
        {icon && <span className="text-faint">{icon}</span>}
      </div>
      <p className="mt-3 text-[32px] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
      {detail && <p className="mt-2 text-[13px] text-muted">{detail}</p>}
    </div>
  );
}

const TONES = {
  neutral: "bg-surface2 text-muted",
  accent: "bg-accentsoft text-accent",
  green: "bg-greensoft text-green",
  orange: "bg-orangesoft text-orange",
  red: "bg-redsoft text-red",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Meter({ value, max = 1, label, text, tone = "accent" }: { value: number; max?: number; label: string; text: string; tone?: "accent" | "orange" }) {
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr_4rem] items-center gap-3 text-[13px] max-sm:grid-cols-[1fr_4rem] max-sm:gap-x-3 max-sm:gap-y-1">
      <span className="text-muted max-sm:col-span-2">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-surface2" role="img" aria-label={`${label}: ${text}`}>
        <div
          className="h-full rounded-full transition-[width] duration-200"
          style={{ width: `${width}%`, background: tone === "accent" ? "var(--accent)" : "var(--chart-4)" }}
        />
      </div>
      <span className="text-right font-medium tabular-nums">{text}</span>
    </div>
  );
}

export function scoreTone(score: number): "red" | "orange" | "green" {
  return score >= 60 ? "red" : score >= 40 ? "orange" : "green";
}
