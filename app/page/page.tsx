"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  FileSpreadsheet,
  Gauge,
  MapPin,
  Settings2,
  Wind,
} from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx-js-style";
import { TelemetrySvgPlot } from "@/components/dashboard-opt/telemetry-svg-plot";
import { ChartAnalysisModal } from "@/components/dashboard-opt/chart-analysis-modal";
import {
  formatDateTime,
  formatDecimal,
  formatEnergy,
  formatInt,
  formatVibration,
} from "@/components/dashboard-opt/formatters";
import { workbookUsers, type WorkbookTelemetry } from "@/app/fleet-data";

type Point = WorkbookTelemetry;
type Section = "overview" | "performance" | "maintenance" | "financial";
type ActiveChart = {
  label: string;
  field: keyof Point;
  color: string;
  unit: string;
  digits?: number;
};

const turbines = workbookUsers
  .filter((user) => user.role !== 1)
  .map((user) => ({
    id: user.locationId,
    name: `TURBINĂ ${String(user.locationId).padStart(2, "0")}`,
    location: user.location,
  }));

const ranges = [
  { label: "24 h", hours: 24 },
  { label: "7 zile", hours: 168 },
  { label: "30 zile", hours: 720 },
  { label: "Tot", hours: 0 },
];

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateOnly(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export default function ClientDashboardPage() {
  const [telemetry, setTelemetry] = useState<Point[]>([]);
  const [selectedId, setSelectedId] = useState(1);
  const [hoursWindow, setHoursWindow] = useState(24);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showBand, setShowBand] = useState(false);
  const [section, setSection] = useState<Section>("overview");
  const [activeChart, setActiveChart] = useState<ActiveChart | null>(null);
  const [sharedHoveredIdx, setSharedHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch("/telemetry.json", { cache: "force-cache" })
      .then((response) => (response.ok ? response.json() : []))
      .then((data: Point[]) => setTelemetry(Array.isArray(data) ? data : []))
      .catch(() => setTelemetry([]));
  }, []);

  const turbine = turbines.find((item) => item.id === selectedId) ?? turbines[0];
  const turbinePoints = useMemo(
    () => telemetry.filter((point) => point.IDLocatie === selectedId),
    [telemetry, selectedId],
  );
  const availableFrom = turbinePoints[0]?.DataOra ? dateOnly(turbinePoints[0].DataOra) : "";
  const availableTo = turbinePoints.at(-1)?.DataOra ? dateOnly(turbinePoints.at(-1)!.DataOra) : "";

  const points = useMemo(() => {
    if (!turbinePoints.length) return [];
    const latestTime = Date.parse(turbinePoints.at(-1)!.DataOra);
    const cutoff = hoursWindow > 0 ? latestTime - hoursWindow * 3_600_000 : -Infinity;
    return turbinePoints.filter((point) => {
      const time = Date.parse(point.DataOra);
      const afterFrom = !fromDate || time >= Date.parse(`${fromDate}T00:00:00`);
      const beforeTo = !toDate || time <= Date.parse(`${toDate}T23:59:59`);
      return time >= cutoff && afterFrom && beforeTo;
    });
  }, [turbinePoints, hoursWindow, fromDate, toDate]);

  const latest = points.at(-1) ?? turbinePoints.at(-1);
  const output = asNumber(latest?.Putere);
  const wind = asNumber(latest?.VitVant);
  const vibration = asNumber(latest?.Vibratii);
  const generatorTemp = asNumber(latest?.TempInfas);
  const hasAlarm = Boolean(latest?.Alarma) || vibration > 0.8 || generatorTemp > 65;
  const waitingForWind = !hasAlarm && output === 0 && wind < 2.5;
  const healthLabel = hasAlarm
    ? "Necesită atenție"
    : waitingForWind
      ? "Sănătoasă · așteaptă vânt"
      : "Sănătoasă · operațională";
  const healthText = hasAlarm
    ? "O valoare a depășit pragul de operare. Consultați evenimentele și programați o verificare."
    : waitingForWind
      ? "Vântul este sub pragul de pornire; turbina este disponibilă și nu necesită intervenție."
      : "Sistemele funcționează în limite normale la ultima citire importată.";
  const energyDelta = points.length > 1
    ? Math.max(0, asNumber(points.at(-1)?.Energie) - asNumber(points[0]?.Energie))
    : 0;
  const lastUpdate = latest ? formatDateTime(latest.DataOra) : "Fără date importate";

  const selectRange = (hours: number) => {
    setHoursWindow(hours);
    setFromDate("");
    setToDate("");
  };

  const exportExcel = () => {
    if (!points.length || !turbine) return;
    const rows = points.map((point) => ({
      Turbină: turbine.name,
      Locație: turbine.location,
      "Data și ora": formatDateTime(point.DataOra),
      "Putere (W)": Math.round(asNumber(point.Putere)),
      "Viteză vânt (m/s)": Math.round(asNumber(point.VitVant)),
      "Energie (kWh)": Math.round(asNumber(point.Energie)),
      "Turație (RPM)": Math.round(asNumber(point.Turatie)),
      "Voltaj (V)": Math.round(asNumber(point.Voltaj)),
      "Amperaj (A)": Math.round(asNumber(point.Amperaj)),
      "Vibrații (G)": Math.round(asNumber(point.Vibratii)),
      "Temperatură generator (°C)": Math.round(asNumber(point.TempInfas)),
      Alarmă: point.Alarma ? "Activă" : "Fără alarme",
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [18, 38, 22, 14, 18, 16, 16, 14, 16, 16, 26, 16].map((wch) => ({ wch }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Telemetrie");
    XLSX.writeFile(book, `telemetrie-${turbine.name.toLowerCase().replace(/\s+/g, "-")}.xlsx`);
  };

  const exportChartPdf = (chart: ActiveChart) => {
    if (!points.length || !turbine) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const values = points.map((point) => asNumber(point[chart.field]));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(0.0001, max - min);
    const left = 24;
    const right = 273;
    const top = 52;
    const bottom = 170;

    doc.setFillColor(37, 123, 104);
    doc.rect(0, 0, 297, 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("URBAN LENTZ 2 · RAPORT GRAFIC", 14, 11);
    doc.setTextColor(23, 32, 29);
    doc.setFontSize(16);
    doc.text(chart.label, 14, 29);
    doc.setFontSize(9);
    doc.setTextColor(86, 99, 94);
    doc.text(`${turbine.name} · ${turbine.location}`, 14, 36);
    doc.text(`${formatDateTime(points[0].DataOra)} – ${formatDateTime(points.at(-1)!.DataOra)} · ${points.length} citiri`, 14, 42);
    doc.setDrawColor(220, 227, 223);
    for (let index = 0; index <= 4; index += 1) {
      const y = bottom - ((bottom - top) * index) / 4;
      doc.line(left, y, right, y);
    }
    doc.setTextColor(101, 113, 109);
    doc.text(`${Math.round(min)} ${chart.unit}`, 5, bottom + 1);
    doc.text(`${Math.round(max)} ${chart.unit}`, 5, top + 1);
    const rgb = chart.color === "#bd861c" ? [189, 134, 28] : chart.color === "#167bb8" ? [22, 123, 184] : [37, 123, 104];
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    doc.setLineWidth(0.8);
    values.forEach((value, index) => {
      if (!index) return;
      const x = left + ((right - left) * index) / Math.max(values.length - 1, 1);
      const previousX = left + ((right - left) * (index - 1)) / Math.max(values.length - 1, 1);
      const y = bottom - ((value - min) / range) * (bottom - top);
      const previousY = bottom - ((values[index - 1] - min) / range) * (bottom - top);
      doc.line(previousX, previousY, x, y);
    });
    doc.setFontSize(8);
    doc.setTextColor(101, 113, 109);
    doc.text("Date telemetrice importate · Urban Lentz 2", 14, 190);
    doc.save(`grafic-${chart.field.toLowerCase()}-${turbine.name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  };

  const chartCards: ActiveChart[] = [
    { label: "PUTERE ACTIVĂ / W", field: "Putere", color: "#bd861c", unit: "W" },
    { label: "VITEZĂ VÂNT / m/s", field: "VitVant", color: "#257b68", unit: "m/s", digits: 1 },
    { label: "ENERGIE CUMULATĂ / kWh", field: "Energie", color: "#167bb8", unit: "kWh", digits: 1 },
  ];

  const ChartCard = ({ chart }: { chart: ActiveChart }) => (
    <article className={chart.field === "Energie" ? "border border-[#d7e0dc] bg-white p-4 lg:col-span-2" : "border border-[#d7e0dc] bg-white p-4"}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="m-0 text-sm font-bold tracking-wide text-[#17201d]">{chart.label}</h3>
          <p className="mt-1 text-xs text-[#687671]">{points.length} citiri în intervalul selectat</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportExcel} className="inline-flex items-center gap-1 border border-[#cbd6d1] px-2.5 py-1.5 text-xs font-semibold text-[#38463f] hover:bg-[#f3f6f4]"><FileSpreadsheet size={13} /> Excel</button>
          <button type="button" onClick={() => setActiveChart(chart)} className="inline-flex items-center gap-1 border border-[#257b68] bg-[#257b68] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1f6656]"><Download size={13} /> PDF / analiză</button>
        </div>
      </div>
      <button type="button" onClick={() => setActiveChart(chart)} className="block w-full cursor-zoom-in text-left focus:outline-none focus:ring-2 focus:ring-[#257b68] focus:ring-offset-2" aria-label={`Deschide analiza pentru ${chart.label}`}>
        {points.length ? <TelemetrySvgPlot points={points} field={chart.field} color={chart.color} unit={chart.unit} digits={chart.digits ?? 0} showBand={showBand} showAverageLine={false} sharedHoveredIdx={sharedHoveredIdx} onHoverChange={setSharedHoveredIdx} /> : <div className="border border-dashed border-[#cbd6d1] p-10 text-center text-sm text-[#687671]">Nu există date pentru intervalul ales.</div>}
      </button>
    </article>
  );

  return (
    <main className="min-h-screen bg-[#f7f9f8] text-[#17201d]">
      <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d7e0dc] pb-4">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-[#687671]">Urban Lentz 2 · centru operațional</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">Monitorizare turbină</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#56635e]"><span className="h-2 w-2 rounded-full bg-[#257b68]" /> Conectată · actualizată {lastUpdate}</div>
        </header>

        <section className="grid gap-4 border-b border-[#d7e0dc] py-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <div><span className="block text-xs font-semibold uppercase tracking-wider text-[#687671]">Turbina activă</span><strong className="mt-1 block text-base">{turbine?.name ?? "—"}</strong><span className="mt-1 flex items-center gap-1 text-sm text-[#56635e]"><MapPin size={14} />{turbine?.location ?? "Locație indisponibilă"}</span></div>
          <label className="text-sm text-[#56635e]"><span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#687671]">Schimbă turbina</span><select value={selectedId} onChange={(event) => setSelectedId(Number(event.target.value))} className="w-full border border-[#bfcac5] bg-white px-3 py-2 text-[#17201d]">{turbines.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.location}</option>)}</select></label>
          <nav className="flex flex-wrap border border-[#d7e0dc] bg-white" aria-label="Secțiuni dashboard">{([['overview', 'Prezentare'], ['performance', 'Performanță'], ['maintenance', 'Mentenanță'], ['financial', 'Financiar']] as [Section, string][]).map(([key, label]) => <button key={key} type="button" onClick={() => setSection(key)} className={`px-3 py-2 text-xs font-semibold ${section === key ? "bg-[#257b68] text-white" : "text-[#56635e] hover:bg-[#f3f6f4]"}`}>{label}</button>)}</nav>
        </section>

        <section className={`mt-5 border p-4 sm:p-5 ${hasAlarm ? "border-[#e3b9b5] bg-[#fffafa]" : "border-[#b9d3c7] bg-white"}`}>
          <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-lg font-bold">{hasAlarm ? <AlertTriangle className="text-[#b23a2f]" size={22} /> : <CheckCircle2 className="text-[#257b68]" size={22} />}{healthLabel}</div><p className="mt-2 max-w-3xl text-sm text-[#56635e]">{healthText}</p></div><span className="border border-[#d7e0dc] bg-[#f8faf9] px-3 py-2 text-xs text-[#56635e]">Ultima citire: {lastUpdate}</span></div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Putere acum", `${formatInt(output)} W`, "Producție instantanee"],
            ["Energie în interval", `${formatEnergy(energyDelta)} kWh`, "Creștere cumulată"],
            ["Vânt acum", `${formatDecimal(wind, 1)} m/s`, wind < 2.5 ? "Sub pragul de pornire" : "Regim de operare"],
            ["Probleme active", hasAlarm ? "1" : "0", hasAlarm ? "Necesită verificare" : "Nicio acțiune necesară"],
          ].map(([label, value, detail]) => <article key={label} className="border border-[#d7e0dc] bg-white p-4"><p className="m-0 text-xs font-semibold uppercase tracking-wider text-[#687671]">{label}</p><strong className="mt-2 block text-2xl tabular-nums">{value}</strong><span className="mt-1 block text-xs text-[#687671]">{detail}</span></article>)}
        </section>

        <section className="mt-4 border border-[#d7e0dc] bg-white p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#687671]"><Clock3 size={14} /> Interval</span>{ranges.map((item) => <button key={item.label} type="button" onClick={() => selectRange(item.hours)} className={`border px-3 py-1.5 text-xs font-semibold ${!fromDate && !toDate && hoursWindow === item.hours ? "border-[#257b68] bg-[#257b68] text-white" : "border-[#cbd6d1] text-[#56635e] hover:bg-[#f3f6f4]"}`}>{item.label}</button>)}</div><div className="flex flex-wrap items-center gap-2 text-xs text-[#56635e]"><label>De la <input type="date" value={fromDate} min={availableFrom} max={toDate || availableTo} onChange={(event) => setFromDate(event.target.value)} className="ml-1 border border-[#cbd6d1] px-2 py-1" /></label><label>Până la <input type="date" value={toDate} min={fromDate || availableFrom} max={availableTo} onChange={(event) => setToDate(event.target.value)} className="ml-1 border border-[#cbd6d1] px-2 py-1" /></label><label className="flex items-center gap-1"><input type="checkbox" checked={showBand} onChange={(event) => setShowBand(event.target.checked)} /> Bandă min–max</label></div></div>
        </section>

        {section === "overview" && <section className="mt-5 grid gap-4 xl:grid-cols-[250px_minmax(0,1fr)]"><aside className="space-y-4"><div className="border border-[#d7e0dc] bg-white p-4"><h2 className="m-0 text-sm font-bold">Condiții de mediu</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-[#687671]">Vânt</dt><dd className="m-0 mt-1 font-bold">{formatDecimal(wind, 1)} m/s</dd></div><div><dt className="text-xs text-[#687671]">Direcție</dt><dd className="m-0 mt-1 font-bold">{latest?.DirectieVant || "—"}</dd></div><div><dt className="text-xs text-[#687671]">Temperatură aer</dt><dd className="m-0 mt-1 font-bold">{formatInt(latest?.TempC)} °C</dd></div><div><dt className="text-xs text-[#687671]">Umiditate</dt><dd className="m-0 mt-1 font-bold">{formatInt(latest?.Umiditate)} %</dd></div></dl></div><div className="border border-[#d7e0dc] bg-white p-4"><h2 className="m-0 text-sm font-bold">Evenimente recente</h2><div className={`mt-3 border-l-2 pl-3 ${hasAlarm ? "border-[#b23a2f]" : "border-[#9aa6a1]"}`}><strong className="text-sm">{hasAlarm ? "Atenție necesară" : "Sistem verificat"}</strong><p className="mt-1 text-xs leading-relaxed text-[#56635e]">{healthText}</p><time className="mt-2 block text-xs text-[#687671]">{lastUpdate}</time></div></div></aside><div className="grid gap-4 lg:grid-cols-2">{chartCards.slice(0, 2).map((chart) => <ChartCard key={chart.field} chart={chart} />)}<ChartCard chart={chartCards[2]} /></div></section>}

        {section === "performance" && <section className="mt-5 grid gap-4 lg:grid-cols-2">{chartCards.map((chart) => <ChartCard key={chart.field} chart={chart} />)}</section>}

        {section === "maintenance" && <section className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]"><article className="border border-[#d7e0dc] bg-white p-5"><h2 className="m-0 text-lg font-bold">Jurnal de mentenanță</h2><p className="mt-2 text-sm text-[#56635e]">Observațiile și intervențiile apar aici pentru turbina selectată.</p><button type="button" className="mt-4 inline-flex items-center gap-2 border border-[#257b68] px-3 py-2 text-sm font-semibold text-[#1f6656] hover:bg-[#edf6f2]"><Settings2 size={15} /> Adaugă notă de mentenanță</button><div className="mt-5 border-t border-[#edf0ee] pt-4 text-sm text-[#687671]">Nu există intervenții programate în datele importate.</div></article><article className="border border-[#d7e0dc] bg-white p-5"><h2 className="m-0 text-lg font-bold">Verificare recomandată</h2><ul className="mt-3 space-y-3 text-sm text-[#56635e]"><li>• Verificați vizual instalația la următoarea vizită de rutină.</li><li>• Urmăriți vibrația și temperatura generatorului în intervalele lungi.</li><li>• Consultați graficul putere-vânt pentru abateri de performanță.</li></ul></article></section>}

        {section === "financial" && <section className="mt-5 grid gap-4 lg:grid-cols-3"><article className="border border-[#d7e0dc] bg-white p-5"><p className="m-0 text-xs font-semibold uppercase tracking-wider text-[#687671]">Energie cumulată</p><strong className="mt-3 block text-3xl">{formatEnergy(asNumber(latest?.Energie))} kWh</strong><p className="mt-2 text-sm text-[#56635e]">Valoare importată de contor.</p></article><article className="border border-[#d7e0dc] bg-white p-5"><p className="m-0 text-xs font-semibold uppercase tracking-wider text-[#687671]">Energie în interval</p><strong className="mt-3 block text-3xl">{formatEnergy(energyDelta)} kWh</strong><p className="mt-2 text-sm text-[#56635e]">Calculată din diferența contorului, fără simulări.</p></article><article className="border border-[#d7e0dc] bg-white p-5"><p className="m-0 text-xs font-semibold uppercase tracking-wider text-[#687671]">Venit estimat</p><strong className="mt-3 block text-xl">Necesită tarif configurat</strong><p className="mt-2 text-sm text-[#56635e]">Nu afișăm valori financiare inventate; adăugați tariful contractual pentru estimare.</p></article></section>}

        <details className="mt-5 border border-[#d7e0dc] bg-white"><summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-bold">Măsurători tehnice complete <ChevronDown size={18} /></summary><div className="grid gap-4 border-t border-[#edf0ee] p-4 sm:grid-cols-2 lg:grid-cols-4">{[["Turație", `${formatInt(latest?.Turatie)} RPM`], ["Tensiune generator", `${formatInt(latest?.Voltaj)} V`], ["Curent", `${formatInt(latest?.Amperaj)} A`], ["Cuplu mecanic", `${formatInt(latest?.CupluMec)} Nm`], ["Temperatură generator", `${formatInt(latest?.TempInfas)} °C`], ["Vibrații", `${formatVibration(asNumber(latest?.Vibratii))} G`], ["Presiune", `${formatInt(latest?.PresAtm)} hPa`], ["Radiație solară", `${formatInt(latest?.RadSolara)} W/m²`]].map(([label, value]) => <div key={label}><span className="text-xs text-[#687671]">{label}</span><strong className="mt-1 block text-base">{value}</strong></div>)}</div></details>
      </div>

      {activeChart && turbine && <ChartAnalysisModal label={activeChart.label} field={activeChart.field} color={activeChart.color} unit={activeChart.unit} digits={activeChart.digits ?? 0} turbineName={turbine.name} turbineLocation={turbine.location} points={points} showBand={showBand} onClose={() => setActiveChart(null)} onExportPdf={() => exportChartPdf(activeChart)} onExportExcel={exportExcel} />}
    </main>
  );
}
