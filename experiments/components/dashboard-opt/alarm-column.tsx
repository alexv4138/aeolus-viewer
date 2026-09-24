"use client";

import React, { useEffect, useState } from "react";
import {
  AlertOctagon,
  Bell,
} from "lucide-react";
import type { WorkbookTelemetry } from "@/app/fleet-data";
import type { AlertItem } from "./alert-demo";
import { ALERT_CATALOG, severityRank, type AlertSeverity } from "./alert-demo";
import { AlertHistoryModal, AlertIcon } from "./alert-history-modal";
import { AlertLegendModal } from "./alert-legend-modal";
import { AlertPalettePreview } from "./alert-palette-preview";
import { ALERT_PALETTES, NORMAL_STATE_COLOR, type AlertPaletteId } from "./alert-palette";
import { TurbineStateIcon } from "./turbine-state-icon";

type Point = WorkbookTelemetry;
export type { AlertItem } from "./alert-demo";

interface AlarmColumnProps {
  latest: Point;
  alerts: AlertItem[];
  turbineName: string;
  turbineLocation: string;
}

const FLASH_COOKIE = "urban_lentz_demo_alert_flash";

function cookieValue(name: string) {
  return document.cookie.split("; ").find((entry) => entry.startsWith(`${name}=`))?.split("=")[1];
}

export function AlarmColumn({ latest, alerts, turbineName, turbineLocation }: AlarmColumnProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [paletteId, setPaletteId] = useState<AlertPaletteId>("contrast");
  const [flashEnabled, setFlashEnabled] = useState(false);
  const severityMeta = ALERT_PALETTES[paletteId].colors;
  const activeAlerts = alerts.filter((alert) => alert.status === "active").sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
  const activeAlert = activeAlerts[0];
  const hasDemoActiveAlert = activeAlerts.some((alert) => alert.isDemoActive);
  const latestResolved = alerts.find((alert) => alert.status === "resolved" && Date.parse(latest.DataOra) - Date.parse(alert.occurredAt) <= 48 * 60 * 60 * 1000);
  const glanceAlert = activeAlert ?? latestResolved;
  const recentAlerts = alerts.slice(0, 8);
  const severityLevels: AlertSeverity[] = ["critical", "high", "medium", "low", "info"];
  const state = activeAlerts.some((alert) => alert.severity === "critical") ? "NEFUNCȚIONAL" : activeAlerts.some((alert) => severityRank[alert.severity] >= severityRank.medium) ? "ÎNCETINIT" : "NOMINAL";
  const statusColor = state === "NEFUNCȚIONAL" ? severityMeta.critical.color : state === "ÎNCETINIT" ? severityMeta.high.color : NORMAL_STATE_COLOR;
  const emergencyColor = activeAlert ? severityMeta[activeAlert.severity].color : latestResolved ? "#647078" : NORMAL_STATE_COLOR;
  const emergencyText = activeAlerts.length > 1 ? `${activeAlerts.length} urgențe active` : activeAlert ? activeAlert.parameter : latestResolved ? `Rezolvată recent: ${latestResolved.parameter}` : "Totul OK";

  useEffect(() => {
    setFlashEnabled(cookieValue(FLASH_COOKIE) !== "off");
  }, []);

  const toggleFlash = () => {
    const next = !flashEnabled;
    setFlashEnabled(next);
    document.cookie = `${FLASH_COOKIE}=${next ? "on" : "off"}; Max-Age=31536000; Path=/; SameSite=Lax`;
  };

  return (
    <>
      <div className="bg-white border border-[#dce3df] p-4 flex flex-col shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#dce3df] mb-3">
          <h3 className="text-[11px] font-bold text-[#65716d] uppercase tracking-wider flex items-center gap-1.5">
            <Bell size={14} className="text-[#257b68]" /> Stare & Alarme
          </h3>
          <div className="flex items-center gap-2"><span className="text-[10px] text-[#8e9c98] font-mono">ISA-18.2</span><AlertPalettePreview value={paletteId} onChange={setPaletteId} /></div>
        </div>

        <div className={`mb-2 border p-2.5 ${hasDemoActiveAlert && flashEnabled ? "animate-[pulse_2.6s_ease-in-out_infinite]" : ""}`} style={{ borderColor: emergencyColor, backgroundColor: activeAlert ? severityMeta[activeAlert.severity].soft : "#f7faf9" }}>
          <div className="flex items-start gap-2 border-b border-black/10 pb-2">
            <TurbineStateIcon state={state} color={statusColor} />
            <span className="min-w-0"><span className="block text-[9px] font-bold uppercase tracking-wide text-[#65716d]">Stare turbină</span><strong className="text-xs" style={{ color: statusColor }}>{state}</strong></span>
          </div>
          <button type="button" onClick={() => setIsHistoryOpen(true)} className="mt-2 flex w-full items-start gap-2 text-left">
            {activeAlert ? <AlertIcon name={activeAlert.icon} size={17} /> : <AlertOctagon size={17} />}
            <span className="min-w-0"><span className="block text-[9px] font-bold uppercase tracking-wide text-[#65716d]">Urgențe</span><strong className="block text-[11px] leading-snug" style={{ color: emergencyColor }}>{emergencyText}</strong>{glanceAlert?.reading && <span className="mt-1 block text-[9px] font-mono font-semibold text-[#28332f]">Valoare: {glanceAlert.reading}</span>}{activeAlerts.length > 1 && <span className="mt-0.5 block text-[9px] text-[#53605b]">{activeAlerts.slice(1).map((alert) => `${alert.parameter}${alert.reading ? ` (${alert.reading})` : ""}`).join(" · ")}</span>}{glanceAlert && <span className="mt-1 block text-[9px] leading-snug text-[#53605b]"><strong>Acțiune recomandată:</strong> {glanceAlert.action}</span>}</span>
          </button>
          {hasDemoActiveAlert && <button type="button" onClick={toggleFlash} className="mt-2 text-[9px] font-semibold underline underline-offset-2" style={{ color: emergencyColor }}>{flashEnabled ? "Opriți flash-ul (demo)" : "Afișați flash (demo)"}</button>}
        </div>

        <div className="flex flex-col mt-3.5">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#edf0ee]"><span className="text-[10px] font-bold text-[#65716d] uppercase tracking-wider">Jurnal evenimente</span><button type="button" onClick={() => setIsHistoryOpen(true)} className="text-[10px] font-mono text-[#257b68] hover:underline">Vezi istoric · {alerts.length}</button></div>
          <div className="flex flex-col gap-2">
            {recentAlerts.map((alert) => {
              const meta = severityMeta[alert.severity];
              return <button type="button" key={`${alert.code}-${alert.occurredAt}`} onClick={() => setIsHistoryOpen(true)} className="p-2.5 border text-left hover:brightness-95 transition-colors" style={{ backgroundColor: meta.soft, borderColor: meta.color }}>
                <span className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase" style={{ color: meta.color }}><AlertIcon name={alert.icon} size={11} /> {meta.label} · {alert.code}</span><time className="font-mono text-[9px] text-[#65716d]">{alert.occurredAt.slice(5, 10).split("-").reverse().join(".")} · {alert.occurredAt.slice(11, 16)}</time></span>
                <strong className="mt-1 block text-[11px] text-[#121a18]">{alert.parameter}</strong>{alert.reading && <span className="mt-0.5 block text-[9px] font-mono font-semibold" style={{ color: meta.color }}>{alert.reading}</span>}<span className="mt-0.5 block text-[9px] text-[#65716d]">{alert.status === "active" ? "Activă" : "Rezolvată"}</span>
              </button>;
            })}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#edf0ee]">
          <button type="button" onClick={() => setIsLegendOpen(true)} className="w-full text-left hover:opacity-80" aria-label="Deschide legenda completă a erorilor">
            <span className="block text-[10px] font-bold text-[#65716d] uppercase tracking-wider">Legendă evenimente</span>
            <span className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1.5">
              {severityLevels.map((level) => {
                const meta = severityMeta[level];
                return <span key={level} className="inline-flex items-center gap-1.5 text-[9px] font-bold" style={{ color: meta.color }}><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />{meta.label}</span>;
              })}
            </span>
            <span className="mt-2 block text-[9px] text-[#65716d]">Click pentru legenda completă a erorilor</span>
          </button>
        </div>
      </div>
      {isHistoryOpen && <AlertHistoryModal alerts={alerts} turbineName={turbineName} turbineLocation={turbineLocation} paletteId={paletteId} onClose={() => setIsHistoryOpen(false)} />}
      {isLegendOpen && <AlertLegendModal paletteId={paletteId} onClose={() => setIsLegendOpen(false)} />}
    </>
  );
}
