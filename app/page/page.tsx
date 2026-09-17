"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock3, Download, Settings2, Wind } from "lucide-react";
import { TelemetrySvgPlot } from "@/components/dashboard-opt/telemetry-svg-plot";
import { formatDateTime, formatEnergy, formatInt } from "@/components/dashboard-opt/formatters";
import { workbookUsers, type WorkbookTelemetry } from "@/app/fleet-data";

const turbines = workbookUsers.filter((u) => u.role !== 1).map((u) => ({ id: u.locationId, name: `TURBINĂ ${String(u.locationId).padStart(2, "0")}`, location: u.location }));

export default function ClientDashboardPage() {
  const [telemetry, setTelemetry] = useState<WorkbookTelemetry[]>([]);
  const [selectedId, setSelectedId] = useState(1);
  const [range, setRange] = useState("24");

  useEffect(() => { fetch("/telemetry.json", { cache: "force-cache" }).then((r) => r.json()).then(setTelemetry).catch(() => setTelemetry([])); }, []);

  const turbine = turbines.find((t) => t.id === selectedId) ?? turbines[0];
  const points = useMemo(() => {
    const all = telemetry.filter((p) => p.IDLocatie === selectedId);
    if (!all.length || range === "all") return all;
    const cutoff = Date.parse(all[all.length - 1].DataOra) - Number(range) * 3600 * 1000;
    return all.filter((p) => Date.parse(p.DataOra) >= cutoff);
  }, [telemetry, selectedId, range]);
  const latest = points.at(-1) ?? telemetry.filter((p) => p.IDLocatie === selectedId).at(-1);
  const output = Number(latest?.Putere ?? 0);
  const wind = Number(latest?.VitVant ?? 0);
  const healthy = !latest?.Alarma && Number(latest?.Vibratii ?? 0) <= 0.8 && Number(latest?.Turatie ?? 0) <= 120;
  const waiting = output === 0 && wind < 2.5;
  const status = healthy ? (waiting ? "Sănătoasă · în așteptarea vântului" : "Sănătoasă · operațională") : "Necesită atenție";
  const statusText = waiting ? "Vântul este sub pragul configurat de pornire. Nu este necesară nicio acțiune." : healthy ? "Toate sistemele raportează valori în limitele normale." : "Verificați evenimentele active și planificați o inspecție.";
  const lastUpdate = latest ? formatDateTime(latest.DataOra) : "Fără date";

  return <main className="min-h-screen bg-[#f7f9f8] text-[#17201d]">
    <div className="mx-auto max-w-[1400px] px-5 py-5 md:px-10 md:py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d7e0dc] pb-5">
        <div><p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-[#687671]">Urban Lentz 2 · Monitorizare</p><h1 className="mt-2 text-2xl font-bold md:text-3xl">{turbine?.name ?? "Turbina"} · {turbine?.location ?? "Locație indisponibilă"}</h1><p className="mt-2 flex items-center gap-2 text-sm text-[#56635e]"><span className="h-2 w-2 rounded-full bg-[#257b68]" /> Conectată · actualizată {lastUpdate}</p></div>
        <label className="flex items-center gap-2 text-sm text-[#56635e]">Schimbă turbina <select value={selectedId} onChange={(e) => setSelectedId(Number(e.target.value))} className="border border-[#cbd6d1] bg-white px-3 py-2 text-[#17201d]">{turbines.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.location}</option>)}</select></label>
      </header>

      <section className={"mt-6 border p-5 md:p-6 " + (healthy ? "border-[#b9d3c7] bg-white" : "border-[#e3b9b5] bg-[#fffafa]")}><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-lg font-bold">{healthy ? <CheckCircle2 className="text-[#257b68]" size={22} /> : <AlertTriangle className="text-[#b23a2f]" size={22} />}{status}</div><p className="mt-2 max-w-2xl text-sm text-[#56635e]">{statusText}</p></div><span className="border border-[#d7e0dc] px-3 py-1 text-xs text-[#56635e]">{lastUpdate}</span></div></section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
        ["Putere acum", `${formatInt(output)} W`, "Producție instantanee"], ["Energie selectată", `${formatEnergy(points.reduce((sum, p) => sum + Number(p.Putere || 0), 0))} Wh`, `Ultimele ${range === "all" ? "date" : `${range} ore`}`], ["Vânt acum", `${formatInt(wind)} m/s`, "Condiție de pornire"], ["Probleme active", healthy ? "0" : "Verifică", healthy ? "Nicio acțiune necesară" : "Vezi evenimentele"],
      ].map(([label, value, sub]) => <div key={label} className="border border-[#d7e0dc] bg-white p-5"><p className="m-0 text-xs font-semibold uppercase tracking-wider text-[#687671]">{label}</p><strong className="mt-3 block text-2xl font-bold">{value}</strong><span className="mt-1 block text-sm text-[#687671]">{sub}</span></div>)}</section>

      <section className="mt-7 border border-[#d7e0dc] bg-white p-4 md:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="m-0 text-lg font-bold">Performanță · putere și vânt</h2><p className="mt-1 text-sm text-[#687671]">Aceeași axă temporală pentru a vedea relația dintre vânt și producție.</p></div><div className="flex items-center gap-2"><Clock3 size={16} className="text-[#687671]" />{["24", "168", "720", "all"].map((r) => <button key={r} onClick={() => setRange(r)} className={"border px-3 py-2 text-xs " + (range === r ? "border-[#257b68] bg-[#257b68] text-white" : "border-[#cbd6d1] bg-white text-[#56635e]")}>{r === "all" ? "Tot" : r === "24" ? "24 ore" : r === "168" ? "7 zile" : "30 zile"}</button>)}</div></div><div className="mt-6 grid gap-8 lg:grid-cols-2">{[["Putere / W", "Putere", "#c48d25"], ["Vânt / m/s", "VitVant", "#257b68"]].map(([title, field, color]) => <div key={field}><h3 className="m-0 text-sm font-bold uppercase tracking-wider">{title}</h3>{points.length ? <TelemetrySvgPlot points={points} field={field as keyof WorkbookTelemetry} color={color} showBand={false} showAverageLine={false} large /> : <div className="mt-4 border border-dashed p-8 text-sm text-[#687671]">Nu există date pentru intervalul ales.</div>}</div>)}</div></section>

      <section className="mt-7 grid gap-7 lg:grid-cols-[1.4fr_1fr]"><div className="border border-[#d7e0dc] bg-white p-5"><h2 className="m-0 text-lg font-bold">Evenimente recente</h2><div className="mt-4 border-l-2 border-[#d7e0dc] pl-4"><p className="m-0 text-sm font-semibold">{healthy ? "Sistem verificat" : "Atenție necesară"}</p><p className="mt-1 text-sm text-[#56635e]">{statusText}</p><time className="mt-2 block text-xs text-[#687671]">{lastUpdate}</time></div></div><div className="border border-[#d7e0dc] bg-white p-5"><h2 className="m-0 text-lg font-bold">Mentenanță</h2><p className="mt-3 text-sm text-[#56635e]">Adaugă observații pentru următoarea inspecție.</p><button className="mt-4 inline-flex items-center gap-2 border border-[#cbd6d1] px-3 py-2 text-sm"><Settings2 size={15} /> Adaugă notă</button></div></section>

      <details className="mt-7 border border-[#d7e0dc] bg-white"><summary className="flex cursor-pointer list-none items-center justify-between p-5 text-lg font-bold">Măsurători tehnice <ChevronDown size={18} /></summary><div className="grid gap-4 border-t border-[#edf0ee] p-5 sm:grid-cols-2 lg:grid-cols-4">{[["Turație", `${formatInt(latest?.Turatie)} RPM`],["Tensiune", `${formatInt(latest?.Voltaj)} V`],["Curent", `${formatInt(latest?.Amperaj)} A`],["Cuplu", `${formatInt(latest?.CupluMec)} Nm`],["Temperatură generator", `${formatInt(latest?.TempInfas)} °C`],["Vibrații", `${formatInt(latest?.Vibratii)} G`]].map(([l,v]) => <div key={l}><span className="block text-xs text-[#687671]">{l}</span><strong className="mt-1 block text-base">{v}</strong></div>)}</div></details>
    </div>
  </main>;
}
