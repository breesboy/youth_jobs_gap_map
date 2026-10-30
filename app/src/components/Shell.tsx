"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BarChart3, Bell, BookOpen, GraduationCap, LayoutDashboard, ListOrdered, Menu, Monitor, Moon, Search, Sun, X, MapPin } from "lucide-react";

export type ShellDistrict = { name: string; province: string; rank: number; score: number; flags: string[] };

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/districts/", label: "Districts", icon: ListOrdered },
  { href: "/training/", label: "Training supply", icon: GraduationCap },
  { href: "/methodology/", label: "Methodology", icon: BookOpen },
];

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function useOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const down = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [ref, onClose, active]);
}

function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme") as Theme | null;
      if (saved) setTheme(saved);
    } catch {}
  }, []);
  const choose = (t: Theme) => {
    setTheme(t);
    try {
      localStorage.setItem("theme", t);
    } catch {}
    applyTheme(t);
  };
  useEffect(() => {
    if (theme !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, [theme]);
  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "system", label: "Match system", icon: Monitor },
    { value: "dark", label: "Dark", icon: Moon },
  ];
  return (
    <div role="radiogroup" aria-label="Theme" className="flex rounded-full bg-surface2 p-0.5">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => choose(value)}
          className={`grid h-8 w-8 place-items-center rounded-full transition-colors duration-150 ${
            theme === value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}

function SearchBox({ districts }: { districts: ShellDistrict[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutside(box, close, open);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? districts.filter((d) => d.name.toLowerCase().includes(q) || d.province.toLowerCase().includes(q)) : districts.slice(0, 6);
    return list.slice(0, 8);
  }, [query, districts]);

  const go = (d: ShellDistrict) => {
    setOpen(false);
    setQuery("");
    input.current?.blur();
    router.push(`/district/${d.name}/`);
  };

  return (
    <div ref={box} className="relative w-full max-w-sm">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
      <input
        ref={input}
        value={query}
        role="combobox"
        aria-expanded={open}
        aria-controls="search-results"
        aria-label="Search districts"
        placeholder="Search districts"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setIndex(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndex((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && results[index]) go(results[index]);
        }}
        className="h-9 w-full min-w-0 rounded-full bg-surface2 pl-9 pr-3 sm:pr-14 text-sm outline-none transition-shadow duration-150 placeholder:text-faint focus:shadow-[0_0_0_2px_var(--accent)]"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 py-0.5 text-[11px] text-faint sm:block">
        Ctrl K
      </kbd>
      {open && (
        <ul id="search-results" role="listbox" className="card fade-in absolute left-0 right-0 top-11 z-40 overflow-hidden p-1.5">
          {results.length === 0 && <li className="px-3 py-3 text-sm text-muted">No district matches “{query}”.</li>}
          {results.map((d, i) => (
            <li key={d.name} role="option" aria-selected={i === index}>
              <button
                onMouseEnter={() => setIndex(i)}
                onClick={() => go(d)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${i === index ? "bg-accentsoft" : ""}`}
              >
                <span className="flex items-center gap-2">
                  <MapPin size={14} className="text-faint" />
                  {d.name}
                  <span className="text-xs text-muted">{d.province}</span>
                </span>
                <span className="text-xs tabular-nums text-muted">#{d.rank}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Notes({ districts }: { districts: ShellDistrict[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutside(ref, close, open);
  const flagged = districts.filter((d) => d.flags.length > 0);
  return (
    <div ref={ref} className="relative">
      <button
        aria-label={`Data notes, ${flagged.length} districts flagged`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-9 w-9 place-items-center rounded-full text-muted transition-colors duration-150 hover:bg-surface2 hover:text-ink"
      >
        <Bell size={18} />
        {flagged.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red" />}
      </button>
      {open && (
        <div className="card fade-in absolute right-0 top-11 z-40 w-[min(22rem,calc(100vw-2rem))] p-2">
          <p className="px-3 pb-1 pt-2 text-sm font-semibold">Data notes</p>
          <p className="px-3 pb-2 text-xs text-muted">Districts whose figures rest on small samples or incomplete lists.</p>
          <ul className="max-h-80 overflow-y-auto">
            {flagged.length === 0 && <li className="px-3 py-3 text-sm text-muted">No districts are flagged.</li>}
            {flagged.map((d) => (
              <li key={d.name}>
                <Link
                  href={`/district/${d.name}/`}
                  onClick={close}
                  className="block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface2"
                >
                  <span className="font-medium">{d.name}</span>
                  <span className="mt-0.5 block text-xs text-muted">{d.flags[0]}</span>
                  {d.flags.length > 1 && <span className="text-xs text-faint">+{d.flags.length - 1} more</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function titleFor(pathname: string) {
  if (pathname.startsWith("/district/")) return { title: decodeURIComponent(pathname.split("/")[2] ?? ""), crumb: "Districts" };
  const match = NAV.find((n) => n.href === pathname || (n.href !== "/" && pathname.startsWith(n.href)));
  return { title: match?.label ?? "Overview", crumb: "Youth Jobs Gap Map" };
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-accent text-white">
        <BarChart3 size={17} />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight">Youth Jobs Gap</span>
        <span className="block text-[11px] text-muted">Rwanda · 30 districts</span>
      </span>
    </Link>
  );
}

export function Shell({ districts, status, children }: { districts: ShellDistrict[]; status: "nisr" | "synthetic"; children: ReactNode }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const { title, crumb } = titleFor(pathname);

  useEffect(() => setMenu(false), [pathname]);

  const nav = (
    <nav aria-label="Main" className="mt-6 space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href) || (href === "/districts/" && pathname.startsWith("/district/"));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] font-medium transition-colors duration-150 ${
              active ? "bg-accentsoft text-accent" : "text-muted hover:bg-surface2 hover:text-ink"
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-auto rounded-xl bg-surface2 p-3 text-xs leading-relaxed text-muted">
      <p className="font-medium text-ink">{status === "nisr" ? "NISR data" : "Demonstration data"}</p>
      <p className="mt-0.5">
        {status === "nisr"
          ? "Census 2022, Labour Force Survey, EICV7 and RTB lists."
          : "Synthetic figures for testing. Not NISR results."}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface/80 p-4 backdrop-blur lg:flex">
        <Brand />
        {nav}
        {footer}
      </aside>

      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setMenu(false)} />
          <div className="fade-in absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface p-4">
            <div className="flex items-center justify-between">
              <Brand />
              <button aria-label="Close menu" onClick={() => setMenu(false)} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface2">
                <X size={18} />
              </button>
            </div>
            {nav}
            <div className="mt-6 flex items-center justify-between px-3 text-sm text-muted">
              Theme
              <ThemeSwitch />
            </div>
            {footer}
          </div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/80 px-4 py-3 backdrop-blur sm:px-8">
          <button aria-label="Open menu" onClick={() => setMenu(true)} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface2 lg:hidden">
            <Menu size={20} />
          </button>
          <div className="hidden min-w-0 md:block">
            <p className="truncate text-xs text-muted">{crumb}</p>
            <p className="truncate text-[15px] font-semibold leading-tight">{title}</p>
          </div>
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2 md:flex-none">
            <SearchBox districts={districts} />
            <Notes districts={districts} />
            <div className="hidden sm:block">
              <ThemeSwitch />
            </div>
          </div>
        </header>
        {status === "synthetic" && (
          <p className="bg-orangesoft px-4 py-2 text-center text-sm text-orange">
            Demonstration build: every figure is synthetic test data, not NISR results.
          </p>
        )}
        <main className="fade-in mx-auto max-w-[1180px] space-y-6 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
        <footer className="mx-auto max-w-[1180px] px-4 pb-10 text-xs leading-relaxed text-faint sm:px-8">
          Built for the NISR competition. Scores measure observed mismatch; they do not predict jobs. See Methodology
          for sources, assumptions and the AI-use disclosure.
        </footer>
      </div>
    </div>
  );
}
