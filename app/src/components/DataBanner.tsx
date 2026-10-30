import { getMeta } from "@/lib/data";

export function DataBanner() {
  if (getMeta().data_status !== "synthetic") return null;
  return (
    <div className="border-b border-amber-300 bg-[var(--warn-bg)] px-4 py-2 text-center text-sm text-[var(--warn-ink)]">
      Demonstration build: every figure shown is synthetic test data, not NISR results. It is replaced when the
      pipeline is run on the NISR datasets.
    </div>
  );
}
