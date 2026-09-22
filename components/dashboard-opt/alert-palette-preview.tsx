"use client";

import React, { useState } from "react";
import { CircleHelp, X } from "lucide-react";
import { ALERT_PALETTES, type AlertPaletteId } from "./alert-palette";
import type { AlertSeverity } from "./alert-demo";

const levels: AlertSeverity[] = ["critical", "high", "medium", "low", "info"];

export function AlertPalettePreview({ value, onChange }: { value: AlertPaletteId; onChange: (value: AlertPaletteId) => void }) {
  const [open, setOpen] = useState(false);
  return <span className="relative inline-flex">
    <button type="button" aria-label="Previzualizează variantele de culori" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[#65716d] hover:bg-[#f0f4f2] hover:text-[#17211d]"><CircleHelp size={13} /></button>
    {open && <span role="dialog" aria-label="Variante de culori pentru alerte" className="absolute right-0 top-7 z-40 block w-64 border border-[#dce3df] bg-white p-3 text-left shadow-xl">
      <span className="flex items-center justify-between gap-2"><strong className="text-[11px] text-[#17211d]">Previzualizare culori</strong><button type="button" aria-label="Închide previzualizarea" onClick={() => setOpen(false)} className="text-[#65716d]"><X size={13} /></button></span>
      <span className="mt-1 block text-[9px] leading-snug text-[#65716d]">Alege o variantă pentru toată secțiunea de alerte și legendă.</span>
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
