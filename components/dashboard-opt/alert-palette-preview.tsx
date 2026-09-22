"use client";

import React, { useState } from "react";
import { CircleHelp, X } from "lucide-react";
import { ALERT_PALETTES, type AlertPaletteId } from "./alert-palette";
import { ALERT_CATALOG, type AlertSeverity } from "./alert-demo";
import { AlertIcon } from "./alert-history-modal";

const levels: AlertSeverity[] = ["critical", "high", "medium", "low", "info"];

export function AlertPalettePreview({ value, onChange }: { value: AlertPaletteId; onChange: (value: AlertPaletteId) => void }) {
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState("ERR-001");
  const selectedAlert = ALERT_CATALOG.find((alert) => alert.code === selectedCode) ?? ALERT_CATALOG[0];
  const selectedStyle = ALERT_PALETTES[value].colors[selectedAlert.severity];
  return <span className="relative inline-flex">
    <button type="button" aria-label="Previzualizează variantele de culori" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[#65716d] hover:bg-[#f0f4f2] hover:text-[#17211d]"><CircleHelp size={13} /></button>
    {open && <span role="dialog" aria-label="Variante de culori pentru alerte" className="absolute right-0 top-7 z-40 block w-64 border border-[#dce3df] bg-white p-3 text-left shadow-xl">
      <span className="flex items-center justify-between gap-2"><strong className="text-[11px] text-[#17211d]">Previzualizare culori</strong><button type="button" aria-label="Închide previzualizarea" onClick={() => setOpen(false)} className="text-[#65716d]"><X size={13} /></button></span>
      <span className="mt-1 block text-[9px] leading-snug text-[#65716d]">Alege o variantă pentru toată secțiunea de alerte și legendă.</span>
      <label className="mt-2 block text-[9px] font-bold uppercase tracking-wide text-[#65716d]">Alege o alertă pentru testare
        <select value={selectedCode} onChange={(event) => setSelectedCode(event.target.value)} className="mt-1 block w-full border border-[#dce3df] bg-white px-2 py-1.5 text-[10px] font-medium normal-case tracking-normal text-[#28332f]">
          {ALERT_CATALOG.map((alert) => <option key={alert.code} value={alert.code}>{alert.code} · {alert.parameter}</option>)}
        </select>
      </label>
      <span className="mt-2 flex items-center gap-2 border px-2 py-1.5" style={{ color: selectedStyle.color, backgroundColor: selectedStyle.soft, borderColor: selectedStyle.color }}>
        <AlertIcon name={selectedAlert.icon} size={14} />
        <span className="min-w-0"><strong className="block truncate text-[10px]">{selectedAlert.parameter}</strong><span className="block text-[8px] font-bold tracking-wide">{selectedStyle.label}</span></span>
      </span>
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
