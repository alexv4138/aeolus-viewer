"use client";

import { useState } from "react";
import { CircleHelp, X } from "lucide-react";

// Self-contained visual guide. It never writes to, or changes, turbine status.
const examples = [
  { label: "Nominal", state: "NOMINAL", emergency: "Totul OK", color: "#257b68" },
  { label: "Încetinit", state: "ÎNCETINIT", emergency: "Supratensiune activă", color: "#c76522" },
  { label: "Nefuncțional", state: "NEFUNCȚIONAL", emergency: "2 urgențe active", color: "#bd3a2b" },
  { label: "Rezolvată", state: "NOMINAL", emergency: "Urgență recentă rezolvată", color: "#587387" },
];

export function StateDemoPreview() {
  const [open, setOpen] = useState(false);
  const [example, setExample] = useState(0);

  return <span className="relative inline-flex">
    <button type="button" aria-label="Vezi exemple de stare (demo)" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex items-center justify-center text-[#65716d] hover:text-[#121a18]"><CircleHelp size={13} /></button>
    {open && <span role="dialog" aria-label="Exemple de stare" className="absolute right-0 top-5 z-30 block w-56 border border-[#dce3df] bg-white p-3 text-left shadow-lg">
      <span className="flex items-center justify-between gap-2"><strong className="text-[11px] text-[#121a18]">Previzualizare demo</strong><button type="button" aria-label="Închide previzualizarea" onClick={() => setOpen(false)}><X size={12} /></button></span>
      <span className="mt-1 block text-[10px] leading-snug text-[#65716d]">Exemple vizuale independente. Nu schimbă alertele turbinei.</span>
      <span className="mt-2 block border-l-2 pl-2 text-[11px] font-bold" style={{ borderColor: examples[example].color, color: examples[example].color }}>{examples[example].state} · {examples[example].emergency}</span>
      <span className="mt-2 grid grid-cols-2 gap-1">{examples.map((item, index) => <button type="button" key={index} onClick={() => setExample(index)} className={`border px-1 py-1 text-[9px] text-[#53605b] ${example === index ? "border-[#257b68] bg-[#edf6f2]" : "border-[#dce3df]"}`}>{item.label}</button>)}</span>
    </span>}
  </span>;
}
