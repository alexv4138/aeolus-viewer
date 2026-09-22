"use client";

import React, { useState } from "react";
import { CircleHelp, X, AlertTriangle } from "lucide-react";
import { ALERT_PALETTES, NORMAL_STATE_COLOR, type AlertPaletteId } from "./alert-palette";
import { ALERT_CATALOG, DEMO_ALERT_READINGS, type AlertSeverity } from "./alert-demo";
import { AlertIcon } from "./alert-history-modal";
import { TurbineStateIcon, type TurbineState } from "./turbine-state-icon";

const levels: AlertSeverity[] = ["critical", "high", "medium", "low", "info"];

export function AlertPalettePreview({ value, onChange }: { value: AlertPaletteId; onChange: (value: AlertPaletteId) => void }) {
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState("ERR-001");
  const selectedAlert = ALERT_CATALOG.find((alert) => alert.code === selectedCode) ?? ALERT_CATALOG[0];
  const colors = ALERT_PALETTES[value].colors;
  const alertStyle = colors[selectedAlert.severity];
  const turbineState: TurbineState = selectedAlert.severity === "critical" ? "NEFUNCȚIONAL" : ["high", "medium"].includes(selectedAlert.severity) ? "ÎNCETINIT" : "NOMINAL";
  const stateColor = turbineState === "NEFUNCȚIONAL" ? colors.critical.color : turbineState === "ÎNCETINIT" ? colors.high.color : NORMAL_STATE_COLOR;

  return <span className="relative inline-flex">
    <button type="button" aria-label="Previzualizează variantele de culori" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[#65716d] hover:bg-[#f0f4f2] hover:text-[#17211d]"><CircleHelp size={13} /></button>
    {open && <span role="dialog" aria-label="Previzualizare completă stare și urgențe" className="absolute right-0 top-7 z-40 block w-[min(310px,calc(100vw-40px))] border border-[#dce3df] bg-white p-3 text-left shadow-xl">
      <span className="flex items-center justify-between gap-2"><strong className="text-[11px] text-[#17211d]">Previzualizare stare și urgențe</strong><button type="button" aria-label="Închide previzualizarea" onClick={() => setOpen(false)} className="text-[#65716d]"><X size={13} /></button></span>
      <span className="mt-1 block text-[9px] leading-snug text-[#65716d]">Alege o alertă demo; previzualizarea nu schimbă starea turbinei.</span>
      <label className="mt-2 block text-[9px] font-bold uppercase tracking-wide text-[#65716d]">Alertă demonstrativă
        <select value={selectedCode} onChange={(event) => setSelectedCode(event.target.value)} className="mt-1 block w-full border border-[#dce3df] bg-white px-2 py-1.5 text-[10px] font-medium normal-case tracking-normal text-[#28332f]">
          {ALERT_CATALOG.map((alert) => {
            const severity = colors[alert.severity];
            const marker = alert.severity === "critical" ? "🟥" : alert.severity === "high" ? "🟠" : alert.severity === "medium" ? "🟡" : alert.severity === "low" ? "🟤" : "🔵";
            return <option key={alert.code} value={alert.code} style={{ color: severity.color }}>{marker} {severity.label} · {alert.code} · {alert.parameter}</option>;
          })}
        </select>
      </label>
      <span className="mt-2 block border p-2.5" style={{ borderColor: alertStyle.color, backgroundColor: alertStyle.soft }}>
        <span className="flex items-start gap-2 border-b border-black/10 pb-2"><TurbineStateIcon state={turbineState} color={stateColor} /><span><span className="block text-[9px] font-bold uppercase tracking-wide text-[#65716d]">Stare turbină</span><strong className="text-[11px]" style={{ color: stateColor }}>{turbineState}</strong></span></span>
        <span className="mt-2 flex items-start gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: alertStyle.color }} /><span className="min-w-0"><span className="block text-[9px] font-bold uppercase tracking-wide text-[#65716d]">Urgență · demo</span><strong className="block text-[10px] leading-snug" style={{ color: alertStyle.color }}>{selectedAlert.parameter}</strong><span className="mt-1 inline-flex items-center gap-1 text-[8px] font-bold uppercase" style={{ color: alertStyle.color }}><AlertIcon name={selectedAlert.icon} size={10} />{alertStyle.label} · {selectedAlert.code}</span></span></span>
        <span className="ml-6 mt-1 block text-[9px] font-mono font-semibold text-[#28332f]">Valoare detectată: {DEMO_ALERT_READINGS[selectedAlert.code] ?? "—"}</span>
        <span className="ml-6 mt-1 block text-[9px] leading-snug text-[#53605b]"><strong>Acțiune recomandată:</strong> {selectedAlert.action}</span>
        <span aria-hidden="true" className="mt-2 block text-[9px] font-semibold underline underline-offset-2" style={{ color: alertStyle.color }}>Opriți flash-ul (demo)</span>
      </span>
      <span className="mt-1 block text-[8px] text-[#65716d]">Previzualizare izolată · nu afectează alertele active.</span>
      {(Object.keys(ALERT_PALETTES) as AlertPaletteId[]).map((id) => {
        const palette = ALERT_PALETTES[id];
        return <button type="button" key={id} onClick={() => onChange(id)} className={`mt-2 block w-full border p-2 text-left ${value === id ? "ring-1 ring-inset ring-[#53605b]" : "border-[#dce3df]"}`} style={{ borderColor: value === id ? "#8e9c98" : undefined }}>
          <span className="flex items-center justify-between"><strong className="text-[10px] text-[#28332f]">{palette.name}</strong>{value === id && <span className="text-[8px] font-bold uppercase text-[#65716d]">Activă</span>}</span>
          <span className="mt-1.5 flex gap-1">{levels.map((level) => <i key={level} title={palette.colors[level].label} className="h-3 flex-1" style={{ backgroundColor: palette.colors[level].color }} />)}</span>
          <span className="mt-1 flex justify-between text-[8px] text-[#65716d]"><span>Critic</span><span>Ridicat</span><span>Mediu</span><span>Scăzut</span><span>Info</span></span>
        </button>;
      })}
    </span>}
  </span>;
}
