"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock3, Download, FileSpreadsheet, LockKeyhole, MapPin, Wind } from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx-js-style";
import { workbookUsers, type WorkbookTelemetry } from "@/app/fleet-data";
import { formatDateTime, formatDecimal, formatEnergy, formatInt, formatVibration } from "@/components/dashboard-opt/formatters";
import { ChartDialog } from "@/components/client-alpha/chart-dialog";
import { TelemetryChart, type ChartSpec } from "@/components/client-alpha/telemetry-chart";
import { datasetLabel, getTurbineStatus, type DatasetState } from "@/components/client-alpha/telemetry-status";

type Point = WorkbookTelemetry;
type Section = "overview" | "performance" | "maintenance" | "financial";

const turbines = workbookUsers
  .filter((user) => user.role !== 1)
  .map((user) => ({ id: user.locationId, name: `TURBINĂ ${String(user.locationId).padStart(2, "0")}`, location: user.location }));

const ranges = [
  { label: "24 h", hours: 24 },
  { label: "7 zile", hours: 168 },
  { label: "30 zile", hours: 720 },
  { label: "Tot", hours: 0 },
] as const;

const chartCards: ChartSpec[] = [
  { label: "PUTERE ACTIVĂ", field: "Putere", color: "#bd8117", unit: "W", digits: 1 },
  { label: "VITEZĂ VÂNT", field: "VitVant", color: "#237d6d", unit: "m/s", digits: 1 },
  { label: "ENERGIE CUMULATĂ", field: "Energie", color: "#1e7cb8", unit: "kWh", digits: 2, cumulative: true },
];

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inputDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function statusTone(state: ReturnType<typeof getTurbineStatus>["state"]) {
  if (state === "fault") return "border-red-200 bg-red-50 text-red-800";
  if (state === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  if (state === "generating") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

type ChartCardProps = {
  chart: ChartSpec;
  points: Point[];
  showRange: boolean;
  onOpen: (chart: ChartSpec) => void;
  onExportPdf: (chart: ChartSpec) => void;
  onExportExcel: () => void;
};

function ChartCard({ chart, points, showRange, onOpen, onExportPdf, onExportExcel }: ChartCardProps) {
  return (
    <article className="min-w-0 border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="m-0 text-sm font-bold tracking-wide text-slate-800">{chart.label} <span className="font-normal text-slate-500">/ {chart.unit}</span></h2>
          <p className="m-0 mt-1 text-xs text-slate-500">{points.length ? `${points.length} citiri în interval` : "Fără citiri în interval"}</p>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => onExportPdf(chart)} className="inline-flex items-center gap-1 border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"><Download size={13} /> PDF</button>
          <button type="button" onClick={onExportExcel} className="inline-flex items-center gap-1 border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"><FileSpreadsheet size={13} /> Excel</button>
        </div>
      </div>
      <TelemetryChart chart={chart} points={points} showRange={showRange} onActivate={() => onOpen(chart)} />
    </article>
  );
}

export default function AlphaClientDashboardPage() {
  const [telemetry, setTelemetry] = useState<Point[]>([]);
  const [datasetState, setDatasetState] = useState<DatasetState>("loading");
  const [selectedId, setSelectedId] = useState(1);
  const [hoursWindow, setHoursWindow] = useState<number>(24);
  const [customRange, setCustomRange] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showRange, setShowRange] = useState(false);
  const [section, setSection] = useState<Section>("overview");
  const [activeChart, setActiveChart] = useState<ChartSpec | null>(null);

  useEffect(() => {
    let current = true;
    fetch("/telemetry.json", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("date indisponibile"))))
      .then((rows: Point[]) => {
        if (!current) return;
        setTelemetry(Array.isArray(rows) ? rows : []);
        setDatasetState(Array.isArray(rows) && rows.length ? "ready" : "unavailable");
      })
      .catch(() => current && setDatasetState("unavailable"));
    return () => { current = false; };
  }, []);

  const turbine = turbines.find((item) => item.id === selectedId) ?? turbines[0];
  const turbinePoints = useMemo(
    () => telemetry.filter((point) => point.IDLocatie === selectedId).sort((a, b) => new Date(a.DataOra).getTime() - new Date(b.DataOra).getTime()),
    [selectedId, telemetry],
  );
  const dataLimits = useMemo(() => ({ first: turbinePoints[0]?.DataOra, last: turbinePoints.at(-1)?.DataOra }), [turbinePoints]);
  const selectedPoints = useMemo(() => {
    if (!turbinePoints.length) return [];
    if (customRange) {
      const start = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : -Infinity;
      const end = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : Infinity;
      return turbinePoints.filter((point) => {
        const time = new Date(point.DataOra).getTime();
        return time >= start && time <= end;
      });
    }
    if (!hoursWindow) return turbinePoints;
    const end = new Date(turbinePoints.at(-1)?.DataOra ?? 0).getTime();
    const start = end - hoursWindow * 60 * 60 * 1000;
    return turbinePoints.filter((point) => new Date(point.DataOra).getTime() >= start);
  }, [customRange, fromDate, hoursWindow, toDate, turbinePoints]);
  const selectedLatest = selectedPoints.at(-1);
  const allLatest = telemetry.slice().sort((a, b) => new Date(a.DataOra).getTime() - new Date(b.DataOra).getTime()).at(-1);
  const status = getTurbineStatus(selectedLatest);
  const energyDelta = selectedPoints.length > 1 ? numberValue(selectedPoints.at(-1)?.Energie) - numberValue(selectedPoints[0]?.Energie) : 0;

  const setPreset = (hours: number) => {
    setCustomRange(false);
    setHoursWindow(hours);
    setFromDate("");
    setToDate("");
  };
  const setCustomDate = (kind: "from" | "to", value: string) => {
    setCustomRange(true);
    setHoursWindow(-1);
    if (kind === "from") setFromDate(value);
    else setToDate(value);
  };

  const exportExcel = () => {
    if (!turbine) return;
    const metadata = [
      ["Export telemetrie Urban Lentz 2"],
      ["Turbină", turbine.name],
      ["Locație", turbine.location],
      ["Interval selectat", selectedPoints.length ? `${formatDateTime(selectedPoints[0].DataOra)} – ${formatDateTime(selectedPoints.at(-1)?.DataOra ?? "")}` : "Fără citiri"],
      ["Fus orar", "Europe/Bucharest"],
      [],
    ];
    const rows = selectedPoints.map((point) => ({
      "Data / Ora": formatDateTime(point.DataOra), "Temperatură aer": point.TempC, "Presiune atmosferică": point.PresAtm,
      Umiditate: point.Umiditate, "Viteză vânt": point.VitVant, "Direcție vânt": point.DirectieVant, "Radiație solară": point.RadSolara,
      Turație: point.Turatie, Voltaj: point.Voltaj, Amperaj: point.Amperaj, Putere: point.Putere, Energie: point.Energie,
      Vibrații: point.Vibratii, "Cuplu mecanic": point.CupluMec, "Temperatură generator": point.TempInfas, Alarmă: point.Alarma ? "Da" : "Nu",
    }));
    const metaSheet = XLSX.utils.aoa_to_sheet(metadata);
    const dataSheet = XLSX.utils.json_to_sheet(rows);
    for (const key of Object.keys(dataSheet)) {
      const cell = dataSheet[key];
      if (key !== "!ref" && cell && typeof cell.v === "number") cell.z = "0.00";
    }
    dataSheet["!cols"] = Object.keys(rows[0] ?? { "Data / Ora": "" }).map(() => ({ wch: 20 }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, metaSheet, "Detalii export");
    XLSX.utils.book_append_sheet(book, dataSheet, "Telemetrie");
    XLSX.writeFile(book, `telemetrie-${turbine.name.replace(/\s+/g, "-").toLowerCase()}.xlsx`);
  };

  const exportChartPdf = (chart: ChartSpec) => {
    if (!turbine) return;
    const values = selectedPoints.map((point) => numberValue(point[chart.field]));
    const maximum = Math.max(...values, 1);
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    pdf.setFontSize(16);
    pdf.text(`${chart.label} / ${chart.unit}`, 15, 16);
    pdf.setFontSize(9);
    pdf.text(turbine.location, 15, 23);
    pdf.text(selectedPoints.length ? `${formatDateTime(selectedPoints[0].DataOra)} – ${formatDateTime(selectedPoints.at(-1)?.DataOra ?? "")}` : "Fără citiri", 15, 29);
    const startX = 18; const baseline = 180; const width = 175; const height = 115;
    pdf.setDrawColor(215, 225, 222); pdf.line(startX, baseline, startX + width, baseline);
    values.forEach((value, index) => {
      const x = startX + (index / Math.max(values.length - 1, 1)) * width;
      const y = baseline - (value / maximum) * height;
      pdf.setDrawColor(chart.color); pdf.setLineWidth(0.6);
      if (index) {
        const previous = values[index - 1];
        const previousX = startX + ((index - 1) / Math.max(values.length - 1, 1)) * width;
        const previousY = baseline - (previous / maximum) * height;
        pdf.line(previousX, previousY, x, y);
      }
    });
    pdf.setFontSize(8); pdf.setTextColor(80, 94, 90);
    pdf.text(`Minim: ${Math.min(...values).toFixed(chart.digits ?? 0)} · Maxim: ${Math.max(...values).toFixed(chart.digits ?? 0)} · ${values.length} citiri`, 15, 195);
    pdf.save(`${chart.label.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  };

  const latestForDisplay = selectedLatest;
  const cards = [
    ["Turație rotor", `${formatInt(latestForDisplay?.Turatie)} RPM`], ["Voltaj generator", `${formatDecimal(numberValue(latestForDisplay?.Voltaj), 1)} V`],
    ["Amperaj", `${formatDecimal(numberValue(latestForDisplay?.Amperaj), 1)} A`], ["Putere instantanee", `${formatDecimal(numberValue(latestForDisplay?.Putere), 1)} W`],
    ["Energie cumulată", `${formatEnergy(numberValue(latestForDisplay?.Energie))} kWh`], ["Vibrație mecanică", `${formatVibration(numberValue(latestForDisplay?.Vibratii))} G`],
    ["Cuplu mecanic", `${formatDecimal(numberValue(latestForDisplay?.CupluMec), 1)} Nm`], ["Temperatură generator", `${formatDecimal(numberValue(latestForDisplay?.TempInfas), 1)} °C`],
  ];

  return (
    <main className="min-h-screen bg-[#f7f9f8] text-slate-800">
      <div className="mx-auto max-w-[1540px] px-4 py-4 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div><p className="m-0 text-xs font-bold tracking-[0.16em] text-emerald-800">URBAN LENTZ 2 / CLIENT</p><h1 className="m-0 mt-1 text-xl font-bold">Panou de monitorizare turbină</h1></div>
          <span className="border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">{datasetState === "ready" && allLatest ? `Set beta static · ultima mostră ${formatDateTime(allLatest.DataOra)}` : datasetLabel(datasetState)}</span>
        </header>

        <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3" aria-label="Secțiuni panou">
          {([ ["overview", "Privire de ansamblu"], ["performance", "Performanță"], ["maintenance", "Mentenanță"], ["financial", "Financiar"] ] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setSection(id)} className={`border px-3 py-2 text-sm font-medium ${section === id ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{label}</button>)}
        </div>

        <section className="mt-4 grid gap-4 xl:grid-cols-[230px_minmax(0,1fr)_280px]">
          <aside className="border border-slate-200 bg-white p-4">
            <p className="m-0 text-xs font-bold uppercase tracking-wide text-slate-500">Condiții de mediu</p>
            <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
              {[ [Wind, "Viteză vânt", `${formatDecimal(numberValue(latestForDisplay?.VitVant), 1)} m/s`], [MapPin, "Direcția vântului", latestForDisplay?.DirectieVant || "—"], [Clock3, "Temperatura aerului", `${formatDecimal(numberValue(latestForDisplay?.TempC), 1)} °C`], [AlertTriangle, "Umiditate relativă", `${formatDecimal(numberValue(latestForDisplay?.Umiditate), 0)} %`] ].map(([Icon, label, value]) => { const IconComponent = Icon as typeof Wind; return <div key={label as string} className="flex gap-3"><IconComponent className="mt-1 text-slate-500" size={17} /><div><p className="m-0 text-xs text-slate-500">{label as string}</p><strong className="text-lg">{value as string}</strong></div></div>; })}
            </div>
          </aside>

          <div className="min-w-0">
            <section className="border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Selectează turbina activă<select value={selectedId} onChange={(event) => setSelectedId(Number(event.target.value))} className="mt-1 block min-w-[280px] max-w-full border border-slate-300 bg-white p-2 text-base font-normal text-slate-800">{turbines.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.location}</option>)}</select></label>
                <span className={`inline-flex items-center gap-2 border px-3 py-2 text-sm font-semibold ${statusTone(status.state)}`}>{status.state === "warning" || status.state === "fault" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}{status.title}</span>
              </div>
              <p className="mb-0 mt-2 text-sm text-slate-600">{status.detail}</p>
              {status.issues.length > 0 && <ul className="mb-0 mt-2 list-disc pl-5 text-sm text-amber-800">{status.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
              <div className="mt-4 grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="bg-white p-3"><p className="m-0 text-xs text-slate-500">{label}</p><strong className="mt-1 block text-xl">{value}</strong></div>)}</div>
            </section>

            <section className="mt-4 border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="m-0 text-xs font-bold uppercase tracking-wide text-slate-500">Interval</p><div className="mt-2 flex flex-wrap gap-1">{ranges.map((range) => <button key={range.label} type="button" onClick={() => setPreset(range.hours)} className={`border px-3 py-1.5 text-sm ${!customRange && hoursWindow === range.hours ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 text-slate-700"}`}>{range.label}</button>)}</div></div>
                <div className="flex flex-wrap gap-2"><label className="text-xs text-slate-600">De la<input type="date" value={fromDate} min={inputDate(dataLimits.first ?? "")} max={inputDate(dataLimits.last ?? "")} onChange={(event) => setCustomDate("from", event.target.value)} className="mt-1 block border border-slate-300 p-2 text-sm" /></label><label className="text-xs text-slate-600">Până la<input type="date" value={toDate} min={inputDate(dataLimits.first ?? "")} max={inputDate(dataLimits.last ?? "")} onChange={(event) => setCustomDate("to", event.target.value)} className="mt-1 block border border-slate-300 p-2 text-sm" /></label></div>
                <label className="flex items-center gap-2 border border-slate-300 px-3 py-2 text-sm"><input type="checkbox" checked={showRange} onChange={(event) => setShowRange(event.target.checked)} /> Interval min–max</label>
              </div>
              <p className="mb-0 mt-3 text-sm text-slate-600">{selectedPoints.length ? `${selectedPoints.length} citiri · ${formatDateTime(selectedPoints[0].DataOra)} – ${formatDateTime(selectedPoints.at(-1)?.DataOra ?? "")}` : "Nu există citiri pentru perioada selectată."}</p>
            </section>

            {section === "overview" && <section className="mt-4 grid gap-4 lg:grid-cols-2"><ChartCard chart={chartCards[0]} points={selectedPoints} showRange={showRange} onOpen={setActiveChart} onExportPdf={exportChartPdf} onExportExcel={exportExcel} /><ChartCard chart={chartCards[1]} points={selectedPoints} showRange={showRange} onOpen={setActiveChart} onExportPdf={exportChartPdf} onExportExcel={exportExcel} /><div className="lg:col-span-2"><ChartCard chart={chartCards[2]} points={selectedPoints} showRange={showRange} onOpen={setActiveChart} onExportPdf={exportChartPdf} onExportExcel={exportExcel} /></div></section>}
            {section === "performance" && <section className="mt-4 grid gap-4 lg:grid-cols-2">{chartCards.map((chart) => <ChartCard key={chart.field} chart={chart} points={selectedPoints} showRange={showRange} onOpen={setActiveChart} onExportPdf={exportChartPdf} onExportExcel={exportExcel} />)}</section>}
            {section === "maintenance" && <section className="mt-4 grid gap-4 lg:grid-cols-2"><article className="border border-slate-200 bg-white p-5"><h2 className="m-0 text-lg font-bold">Jurnal de mentenanță</h2><p className="mt-2 text-sm text-slate-600">Adăugarea și salvarea notițelor necesită spațiul tehnic autentificat.</p><button disabled type="button" className="inline-flex cursor-not-allowed items-center gap-2 border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-500"><LockKeyhole size={15} /> Adaugă notă (neautorizat)</button></article><article className="border border-slate-200 bg-white p-5"><h2 className="m-0 text-lg font-bold">Atenționări din setul de date</h2><p className="mt-2 text-sm text-slate-600">{status.issues.length ? status.issues.join(" · ") : "Nu există atenționări în citirea selectată."}</p></article></section>}
            {section === "financial" && <section className="mt-4 grid gap-4 sm:grid-cols-2"><article className="border border-slate-200 bg-white p-5"><p className="m-0 text-xs font-bold uppercase tracking-wide text-slate-500">Energie în interval</p><strong className="mt-2 block text-3xl">{formatEnergy(energyDelta)} kWh</strong><p className="mb-0 text-sm text-slate-600">Diferență a contorului în intervalul selectat.</p></article><article className="border border-slate-200 bg-white p-5"><p className="m-0 text-xs font-bold uppercase tracking-wide text-slate-500">Venit estimat</p><strong className="mt-2 block text-xl">Necesită tarif configurat</strong><p className="mb-0 text-sm text-slate-600">Nu sunt afișate estimări financiare fără tariful contractual.</p></article></section>}

            <details className="mt-4 border border-slate-200 bg-white"><summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-bold">Măsurători tehnice complete <ChevronDown size={17} /></summary><div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">{[["Presiune", `${formatDecimal(numberValue(latestForDisplay?.PresAtm), 1)} hPa`], ["Radiație solară", `${formatDecimal(numberValue(latestForDisplay?.RadSolara), 1)} W/m²`], ["Alarmă", latestForDisplay?.Alarma ? "Da" : "Nu"], ["Citire afișată", latestForDisplay ? formatDateTime(latestForDisplay.DataOra) : "—"]].map(([label, value]) => <div key={label}><span className="text-xs text-slate-500">{label}</span><strong className="mt-1 block">{value}</strong></div>)}</div></details>
          </div>

          <aside className="border border-slate-200 bg-white p-4"><p className="m-0 text-xs font-bold uppercase tracking-wide text-slate-500">Stare și alarme</p><div className={`mt-3 border p-3 ${statusTone(status.state)}`}><strong>{status.title}</strong><p className="mb-0 mt-1 text-sm font-normal">{status.detail}</p></div><div className="mt-4 border-t border-slate-200 pt-3"><p className="m-0 text-xs font-bold uppercase tracking-wide text-slate-500">Jurnal evenimente</p><p className="mb-0 mt-2 text-sm text-slate-600">{datasetState === "ready" ? "Afișează interpretarea ultimei citiri selectate, nu un flux live." : "Nu există date disponibile pentru interpretare."}</p></div></aside>
        </section>
      </div>
      {activeChart && turbine && <ChartDialog chart={activeChart} points={selectedPoints} turbineName={turbine.name} turbineLocation={turbine.location} showRange={showRange} onClose={() => setActiveChart(null)} onExportPdf={() => exportChartPdf(activeChart)} onExportExcel={exportExcel} />}
    </main>
  );
}
