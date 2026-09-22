"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  Bell,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import type { WorkbookTelemetry } from "@/app/fleet-data";
import type { AlertItem, AlertSeverity } from "./alert-demo";
import { severityRank } from "./alert-demo";
import { AlertHistoryModal, AlertIcon } from "./alert-history-modal";
import { formatInt, formatVibration } from "./formatters";

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
  const [flashEnabled, setFlashEnabled] = useState(false);
  const activeAlert = alerts.find((alert) => alert.isDemoActive) ?? alerts[0];
  const recentAlerts = alerts.slice(0, 3);
  const isTempHigh = Number(latest.TempInfas) > 65;
  const isVibeHigh = Number(latest.Vibratii) > 0.8;
  const isOverspeed = Number(latest.Turatie) > 120;
  const isOperational = !isOverspeed && !isVibeHigh;

  useEffect(() => {
    setFlashEnabled(cookieValue(FLASH_COOKIE) !== "off");
  }, []);

  const externalEvents = useMemo(() => [
    { label: "Furtună", icon: "storm" as const },
    { label: "Grindină", icon: "hail" as const },
    { label: "Seism", icon: "seismic" as const },
    { label: "Impact pasăre", icon: "bird" as const },
    { label: "Supracurent", icon: "current" as const },
    { label: "Incendiu", icon: "fire" as const },
  ].map((event) => ({ ...event, alert: alerts.find((item) => item.icon === event.icon || (event.icon === "current" && item.code === "ERR-005")) })), [alerts]);

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
          <span className="text-[10px] text-[#8e9c98] font-mono">ISA-18.2</span>
        </div>

        <div className="p-3.5 border flex items-center gap-3 mb-3.5 bg-[#edf6f2] border-[#bfe2d1] text-[#1e5842]">
          <ShieldCheck size={32} className="text-[#257b68] shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Stare turbină</span>
            <strong className="text-base font-extrabold tracking-tight">{isOperational ? "OPERAȚIONALĂ" : "AVERTISMENT"}</strong>
            <span className="text-[10px] opacity-75 mt-0.5">{isOperational ? "Parametri de telemetrie în interval nominal" : "Se recomandă inspecție vizuală"}</span>
          </div>
        </div>

        {activeAlert && (
          <div className={`mb-3 border p-3 ${flashEnabled ? "animate-[pulse_2.6s_ease-in-out_infinite]" : ""}`} style={{ backgroundColor: severityMeta[activeAlert.severity].background, borderColor: severityMeta[activeAlert.severity].color }}>
            <button type="button" onClick={() => setIsHistoryOpen(true)} className="w-full text-left cursor-pointer">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: severityMeta[activeAlert.severity].color }}>
                <AlertOctagon size={13} /> Alertă demo activă · {severityMeta[activeAlert.severity].label}
              </span>
              <strong className="mt-1 flex items-center gap-1.5 text-xs text-[#121a18]"><AlertIcon name={activeAlert.icon} size={14} /> {activeAlert.code} · {activeAlert.parameter}</strong>
              <span className="mt-1 block text-[10px] text-[#53605b]">Scenariu demonstrativ — deschide jurnalul pentru detalii.</span>
            </button>
            <button type="button" onClick={toggleFlash} className="mt-2 text-[10px] font-bold underline underline-offset-2" style={{ color: severityMeta[activeAlert.severity].color }}>
              {flashEnabled ? "Opriți alerta (varianta demo)" : "Afișați flash (varianta demo)"}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2 py-2 border-y border-[#edf0ee] text-xs">
          <div className="flex items-center justify-between"><span className="text-[#53605b]">Protecție supraturație:</span><span className="font-semibold px-1.5 py-0.5 text-[11px] text-[#257b68] bg-[#edf6f2]">{!isOverspeed ? "OK (< 120 RPM)" : "DEPĂȘIRE"}</span></div>
          <div className="flex items-center justify-between"><span className="text-[#53605b]">Temperatura generator:</span><span className={`font-mono font-semibold px-1.5 py-0.5 text-[11px] ${isTempHigh ? "text-[#c76522] bg-[#fff0e9]" : "text-[#257b68] bg-[#edf6f2]"}`}>{formatInt(latest.TempInfas)} °C</span></div>
          <div className="flex items-center justify-between"><span className="text-[#53605b]">Vibrații structură:</span><span className={`font-mono font-semibold px-1.5 py-0.5 text-[11px] ${isVibeHigh ? "text-[#bd3a2b] bg-[#fdeeee]" : "text-[#257b68] bg-[#edf6f2]"}`}>{formatVibration(latest.Vibratii)} G</span></div>
        </div>

        <div className="flex flex-col mt-3.5">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#edf0ee]"><span className="text-[10px] font-bold text-[#65716d] uppercase tracking-wider">Jurnal evenimente</span><button type="button" onClick={() => setIsHistoryOpen(true)} className="text-[10px] font-mono text-[#257b68] hover:underline">Vezi istoric · {alerts.length}</button></div>
          <div className="flex flex-col gap-2">
            {recentAlerts.map((alert) => {
              const meta = severityMeta[alert.severity];
              return <button type="button" key={`${alert.code}-${alert.occurredAt}`} onClick={() => setIsHistoryOpen(true)} className="p-2.5 border text-left hover:brightness-95 transition-colors" style={{ backgroundColor: meta.background, borderColor: meta.color }}>
                <span className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase" style={{ color: meta.color }}><AlertIcon name={alert.icon} size={11} /> {meta.label} · {alert.code}</span><time className="font-mono text-[9px] text-[#65716d]">{alert.occurredAt.slice(5, 10).split("-").reverse().join(".")} · {alert.occurredAt.slice(11, 16)}</time></span>
                <strong className="mt-1 block text-[11px] text-[#121a18]">{alert.parameter}</strong>
              </button>;
            })}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#edf0ee]">
          <div className="flex items-center justify-between mb-2"><span className="text-[10px] font-bold text-[#65716d] uppercase tracking-wider">Monitorizare evenimente</span><span className="text-[10px] text-[#8e9c98]">demo</span></div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            {externalEvents.map(({ icon, label, alert }) => {
              const meta = alert ? severityMeta[alert.severity] : undefined;
              return <button type="button" onClick={() => setIsHistoryOpen(true)} key={label} className="flex items-center gap-1.5 px-2 py-2 text-left" style={{ color: meta?.color ?? "#53605b", backgroundColor: meta?.background ?? "#f8faf9" }}><AlertIcon name={icon} size={13} /><span className="min-w-0"><strong className="block font-semibold truncate">{label}</strong><span className="block text-[9px] opacity-80">{alert ? meta?.label : "Fără alertă"}</span></span></button>;
            })}
          </div>
        </div>
      </div>
      {isHistoryOpen && <AlertHistoryModal alerts={alerts} turbineName={turbineName} turbineLocation={turbineLocation} onClose={() => setIsHistoryOpen(false)} />}
    </>
  );
}
