"use client";

import React, { useEffect, useState } from "react";
import {
  AlertOctagon,
  Bell,
  ShieldCheck,
} from "lucide-react";
import type { WorkbookTelemetry } from "@/app/fleet-data";
import type { AlertItem, AlertSeverity } from "./alert-demo";
import { ALERT_CATALOG, severityRank } from "./alert-demo";
import { AlertHistoryModal, AlertIcon } from "./alert-history-modal";
import { AlertLegendModal } from "./alert-legend-modal";
import { StateDemoPreview } from "./state-demo-preview";

type Point = WorkbookTelemetry;
export type { AlertItem } from "./alert-demo";

interface AlarmColumnProps {
  latest: Point;
  alerts: AlertItem[];
  turbineName: string;
  turbineLocation: string;
}

const severityMeta: Record<AlertSeverity, { label: string; color: string; background: string }> = {
  info: { label: "INFO", color: "#587387", background: "#f4f7f9" },
  low: { label: "SCĂZUT", color: "#63766d", background: "#f1f5f2" },
  medium: { label: "MEDIU", color: "#b87919", background: "#fff7e9" },
  high: { label: "RIDICAT", color: "#c76522", background: "#fff0e9" },
  critical: { label: "CRITIC", color: "#bd3a2b", background: "#fdeeee" },
};

const FLASH_COOKIE = "urban_lentz_demo_alert_flash";

function cookieValue(name: string) {
  return document.cookie.split("; ").find((entry) => entry.startsWith(`${name}=`))?.split("=")[1];
}

export function AlarmColumn({ latest, alerts, turbineName, turbineLocation }: AlarmColumnProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const activeAlerts = alerts.filter((alert) => alert.status === "active").sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
  const activeAlert = activeAlerts[0];
  const hasDemoActiveAlert = activeAlerts.some((alert) => alert.isDemoActive);
  const latestResolved = alerts.find((alert) => alert.status === "resolved" && Date.parse(latest.DataOra) - Date.parse(alert.occurredAt) <= 48 * 60 * 60 * 1000);
  const recentAlerts = alerts.slice(0, 3);
  const state = activeAlerts.some((alert) => alert.severity === "critical") ? "NEFUNCȚIONAL" : activeAlerts.some((alert) => severityRank[alert.severity] >= severityRank.medium) ? "ÎNCETINIT" : "NOMINAL";
  const statusColor = state === "NEFUNCȚIONAL" ? "#bd3a2b" : state === "ÎNCETINIT" ? "#c76522" : "#257b68";
  const emergencyColor = activeAlert ? severityMeta[activeAlert.severity].color : latestResolved ? "#587387" : "#257b68";
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
            <Bell size={14} className="text-[#257b68]" /> Stare & Alarme <StateDemoPreview />
          </h3>
          <span className="text-[10px] text-[#8e9c98] font-mono">ISA-18.2</span>
        </div>

        <div className={`mb-2 border p-2.5 ${hasDemoActiveAlert && flashEnabled ? "animate-[pulse_2.6s_ease-in-out_infinite]" : ""}`} style={{ borderColor: emergencyColor, backgroundColor: activeAlert ? severityMeta[activeAlert.severity].background : "#f7faf9" }}>
          <div className="flex items-start gap-2 border-b border-black/10 pb-2">
            <ShieldCheck size={17} className="mt-0.5 shrink-0" color={statusColor} />
            <span className="min-w-0"><span className="block text-[9px] font-bold uppercase tracking-wide text-[#65716d]">Stare turbină</span><strong className="text-xs" style={{ color: statusColor }}>{state}</strong></span>
          </div>
          <button type="button" onClick={() => setIsHistoryOpen(true)} className="mt-2 flex w-full items-start gap-2 text-left">
            {activeAlert ? <AlertIcon name={activeAlert.icon} size={17} /> : <AlertOctagon size={17} />}
            <span className="min-w-0"><span className="block text-[9px] font-bold uppercase tracking-wide text-[#65716d]">Urgențe</span><strong className="block text-[11px] leading-snug" style={{ color: emergencyColor }}>{emergencyText}</strong>{activeAlerts.length > 1 && <span className="mt-0.5 block text-[9px] text-[#53605b]">{activeAlerts.map((alert) => alert.parameter).join(" · ")}</span>}</span>
          </button>
          {hasDemoActiveAlert && <button type="button" onClick={toggleFlash} className="mt-2 text-[9px] font-semibold underline underline-offset-2" style={{ color: emergencyColor }}>{flashEnabled ? "Opriți flash-ul (demo)" : "Afișați flash (demo)"}</button>}
        </div>

        <div className="flex flex-col mt-3.5">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#edf0ee]"><span className="text-[10px] font-bold text-[#65716d] uppercase tracking-wider">Jurnal evenimente</span><button type="button" onClick={() => setIsHistoryOpen(true)} className="text-[10px] font-mono text-[#257b68] hover:underline">Vezi istoric · {alerts.length}</button></div>
          <div className="flex flex-col gap-2">
            {recentAlerts.map((alert) => {
              const meta = severityMeta[alert.severity];
              return <button type="button" key={`${alert.code}-${alert.occurredAt}`} onClick={() => setIsHistoryOpen(true)} className="p-2.5 border text-left hover:brightness-95 transition-colors" style={{ backgroundColor: meta.background, borderColor: meta.color }}>
                <span className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase" style={{ color: meta.color }}><AlertIcon name={alert.icon} size={11} /> {meta.label} · {alert.code}</span><time className="font-mono text-[9px] text-[#65716d]">{alert.occurredAt.slice(5, 10).split("-").reverse().join(".")} · {alert.occurredAt.slice(11, 16)}</time></span>
                <strong className="mt-1 block text-[11px] text-[#121a18]">{alert.parameter}</strong><span className="mt-0.5 block text-[9px] text-[#65716d]">{alert.status === "active" ? "Activă" : "Rezolvată"}</span>
              </button>;
            })}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#edf0ee]">
          <div className="flex items-center justify-between mb-2"><span className="text-[10px] font-bold text-[#65716d] uppercase tracking-wider">Monitorizare evenimente</span><span className="text-[10px] text-[#8e9c98]">{ALERT_CATALOG.length} tipuri · demo</span></div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            {ALERT_CATALOG.map((rule) => {
              const alert = alerts.find((item) => item.code === rule.code);
              const meta = severityMeta[rule.severity];
              return <button type="button" onClick={() => setIsLegendOpen(true)} key={rule.code} title={`${rule.code} · ${rule.parameter}`} className="flex min-h-12 items-center gap-1.5 border px-2 py-1.5 text-left transition-colors hover:brightness-[0.97]" style={{ color: meta.color, backgroundColor: meta.background, borderColor: `${meta.color}55` }}><AlertIcon name={rule.icon} size={14} /><span className="min-w-0"><strong className="block font-semibold truncate">{rule.parameter}</strong><span className="block text-[9px] opacity-80">{alert ? `${alert.status === "active" ? "Activă" : "Rezolvată"} · ${meta.label}` : `Fără alertă · ${meta.label}`}</span></span></button>;
            })}
          </div>
        </div>
      </div>
      {isHistoryOpen && <AlertHistoryModal alerts={alerts} turbineName={turbineName} turbineLocation={turbineLocation} onClose={() => setIsHistoryOpen(false)} />}
      {isLegendOpen && <AlertLegendModal onClose={() => setIsLegendOpen(false)} />}
    </>
  );
}
