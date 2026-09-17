"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, X } from "lucide-react";
import type { WorkbookTelemetry } from "@/app/fleet-data";
import { formatDateTime, formatDecimal, formatInt } from "@/components/dashboard-opt/formatters";
import { TelemetryChart, type ChartSpec } from "./telemetry-chart";

type Props = {
  chart: ChartSpec;
  points: WorkbookTelemetry[];
  turbineName: string;
  turbineLocation: string;
  showRange: boolean;
  onClose: () => void;
  onExportExcel: () => void;
  onExportPdf: (svg: SVGSVGElement | null) => void;
};

export function ChartDialog({ chart, points, turbineName, turbineLocation, showRange, onClose, onExportExcel, onExportPdf }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const chartSvgRef = useRef<SVGSVGElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const [view, setView] = useState<"chart" | "table">("chart");

  useEffect(() => {
    restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => { window.removeEventListener("keydown", handleKey); restoreFocus.current?.focus(); };
  }, [onClose]);

  const format = (value: unknown) => chart.digits ? `${formatDecimal(Number(value) || 0, chart.digits)} ${chart.unit}` : `${formatInt(Number(value) || 0)} ${chart.unit}`;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#17201d]/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="chart-dialog-title" className="flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl outline-none">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d7e0dc] p-4 sm:px-5">
        <div><h2 id="chart-dialog-title" className="m-0 text-lg font-bold text-[#17201d]">{chart.label}</h2><p className="mt-1 text-sm text-[#56635e]">{turbineName} · {turbineLocation}</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => onExportPdf(chartSvgRef.current)} className="inline-flex items-center gap-1 border border-[#257b68] px-3 py-2 text-sm font-semibold text-[#1f6656]"><Download size={15} /> PDF</button><button type="button" onClick={onExportExcel} className="inline-flex items-center gap-1 border border-[#cbd6d1] px-3 py-2 text-sm font-semibold text-[#38463f]"><FileSpreadsheet size={15} /> Excel complet</button><button type="button" onClick={onClose} className="inline-flex items-center gap-1 border border-[#cbd6d1] px-3 py-2 text-sm font-semibold text-[#38463f]"><X size={15} /> Închide</button></div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0ee] px-4 py-3 sm:px-5"><div className="flex gap-2" role="group" aria-label="Tip analiză"><button type="button" onClick={() => setView("chart")} className={`border px-3 py-1.5 text-sm ${view === "chart" ? "border-[#257b68] bg-[#257b68] text-white" : "border-[#cbd6d1] text-[#56635e]"}`}>Grafic</button><button type="button" onClick={() => setView("table")} className={`border px-3 py-1.5 text-sm ${view === "table" ? "border-[#257b68] bg-[#257b68] text-white" : "border-[#cbd6d1] text-[#56635e]"}`}>Tabel de citiri</button></div><span className="text-xs text-[#65716d]">{points.length} citiri · date originale neagregate</span></div>
      <div className="min-h-0 overflow-auto p-4 sm:p-5">
        {view === "chart" ? <TelemetryChart svgRef={chartSvgRef} points={points} chart={chart} showRange={showRange} /> : <table className="w-full border-collapse text-left text-sm"><thead className="sticky top-0 bg-white text-xs uppercase text-[#65716d]"><tr><th className="border-b p-2">Data și ora</th><th className="border-b p-2 text-right">Valoare</th></tr></thead><tbody>{points.map((point, index) => <tr key={`${point.DataOra}-${index}`}><td className="border-b border-[#edf0ee] p-2">{formatDateTime(point.DataOra)}</td><td className="border-b border-[#edf0ee] p-2 text-right tabular-nums">{format(point[chart.field])}</td></tr>)}</tbody></table>}
      </div>
    </section>
  </div>;
}
