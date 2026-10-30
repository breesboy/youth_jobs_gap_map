import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import { getDistricts, getMeta } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: "Youth Jobs Gap Map",
  description: "District-level view of the youth jobs and skills mismatch in Rwanda.",
};

const themeScript = `try{var t=localStorage.getItem("theme")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const districts = getDistricts().map((d) => ({
    name: d.name,
    province: d.province,
    rank: d.rank,
    score: d.gap_score,
    flags: d.flags,
  }));
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Shell districts={districts} status={getMeta().data_status}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
