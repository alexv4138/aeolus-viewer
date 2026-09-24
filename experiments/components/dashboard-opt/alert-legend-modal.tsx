"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, X } from "lucide-react";
import { ALERT_CATALOG, type AlertRule, type AlertSeverity } from "./alert-demo";
import { AlertIcon } from "./alert-history-modal";
import { ALERT_PALETTES, type AlertPaletteId } from "./alert-palette";

const SEVERITY_ORDER: AlertSeverity[] = ["critical", "high", "medium", "low", "info"];

function LegendCard({ rule, paletteId }: { rule: AlertRule; paletteId: AlertPaletteId }) {
  const severity = ALERT_PALETTES[paletteId].colors[rule.severity];
  return (
    <article className="grid gap-3 border border-[#dce3df] border-l-4 bg-white p-4 sm:grid-cols-[minmax(150px,0.8fr)_minmax(180px,1.35fr)_minmax(180px,1.35fr)_minmax(170px,1.2fr)]" style={{ borderLeftColor: severity.color }}>
      <div>
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center" style={{ color: severity.color, backgroundColor: severity.soft }}><AlertIcon name={rule.icon} size={16} /></span>
          <span className="min-w-0"><span className="block font-mono text-[10px] text-[#65716d]">{rule.code}</span><strong className="block text-xs leading-snug text-[#17211d]">{rule.parameter}</strong></span>
        </div>
        <span className="mt-2 inline-flex px-2 py-1 text-[9px] font-extrabold tracking-wide" style={{ color: severity.color, backgroundColor: severity.soft }}>{severity.label}</span>
      </div>
      <div><h3 className="m-0 text-[9px] font-bold uppercase tracking-wider text-[#65716d]">Descriere / cauză posibilă</h3><p className="m-0 mt-1.5 text-[11px] leading-relaxed text-[#38443f]">{rule.description}</p></div>
      <div><h3 className="m-0 text-[9px] font-bold uppercase tracking-wider text-[#65716d]">Acțiune automată / recomandată</h3><p className="m-0 mt-1.5 text-[11px] leading-relaxed text-[#38443f]">{rule.action}</p></div>
      <div><h3 className="m-0 text-[9px] font-bold uppercase tracking-wider text-[#65716d]">Alerte / notificări recomandate</h3><p className="m-0 mt-1.5 text-[11px] leading-relaxed text-[#38443f]">{rule.notifications}</p></div>
    </article>
  );
}

export function AlertLegendModal({ paletteId, onClose }: { paletteId: AlertPaletteId; onClose: () => void }) {
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | null>(null);
  const visibleRules = useMemo(() => ALERT_CATALOG
    .filter((rule) => selectedSeverity === null || rule.severity === selectedSeverity)
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || a.code.localeCompare(b.code, undefined, { numeric: true })), [selectedSeverity]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/55 p-3 pt-3 backdrop-blur-[1px] sm:p-6" role="dialog" aria-modal="true" aria-labelledby="alert-legend-title" onClick={onClose}>
      <section className="flex h-[92vh] w-full max-w-6xl shrink-0 flex-col overflow-hidden border border-[#dce3df] bg-[#f7f9f8] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-[#dce3df] bg-white px-5 py-4 sm:px-6">
          <div><span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#65716d]"><BookOpen size={13} /> Ghid de referință · {ALERT_CATALOG.length} tipuri</span><h2 id="alert-legend-title" className="m-0 mt-1 text-lg font-bold text-[#17211d] sm:text-xl">Legendă alerte și evenimente</h2><p className="m-0 mt-1 text-[11px] text-[#65716d]">Semnificația, severitatea și răspunsul recomandat pentru fiecare cod.</p></div>
          <button type="button" onClick={onClose} className="inline-flex shrink-0 items-center gap-1.5 border border-[#dce3df] bg-white px-3 py-2 text-xs font-semibold text-[#53605b] hover:bg-[#f0f4f2]"><X size={14} /> Închide</button>
        </header>
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#dce3df] bg-white px-5 py-3 sm:px-6">
          {SEVERITY_ORDER.map((level) => { const style = ALERT_PALETTES[paletteId].colors[level]; const count = ALERT_CATALOG.filter((rule) => rule.severity === level).length; const active = selectedSeverity === level; return <button type="button" key={level} aria-pressed={active} onClick={() => setSelectedSeverity(active ? null : level)} className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[9px] font-bold transition-shadow ${active ? "ring-2 ring-inset ring-current" : "hover:brightness-95"}`} style={{ color: style.color, backgroundColor: style.soft, borderColor: `${style.color}55` }}><i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.color }} />{style.label}<span className="font-mono opacity-70">{count}</span></button>; })}
          <span className="ml-auto text-[9px] text-[#65716d]">{selectedSeverity ? `${visibleRules.length} afișate · apasă din nou pentru toate` : `${visibleRules.length} tipuri · ordonate după severitate`}</span>
        </div>
        <div className="overflow-y-auto p-3 sm:p-5"><div className="space-y-2">{visibleRules.map((rule) => <LegendCard key={rule.code} rule={rule} paletteId={paletteId} />)}</div></div>
        <footer className="border-t border-[#dce3df] bg-white px-5 py-2 text-[9px] text-[#78847f] sm:px-6">Catalog demonstrativ pentru interfața beta. Notificările afișate nu trimit mesaje în afara aplicației.</footer>
      </section>
    </div>
  );
}
