"use client";

import React from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { WorkbookTelemetry } from "@/app/fleet-data";
import { formatInt, formatVibration } from "./formatters";

type Point = WorkbookTelemetry;

export type AlertItem = {
  time: string;
  severity: "info" | "warning" | "critical";
  parameter: string;
  text: string;
};

interface AlarmColumnProps {
  latest: Point;
  alerts: AlertItem[];
}

export function AlarmColumn({ latest, alerts }: AlarmColumnProps) {
  const isAlarm = Boolean(latest.Alarma);
  const isTempHigh = Number(latest.TempInfas) > 65;
  const isVibeHigh = Number(latest.Vibratii) > 0.8;
  const isOverspeed = Number(latest.Turatie) > 120;

  const isOperational = !isAlarm && !isOverspeed && !isVibeHigh;

  return (
    <div className="bg-white border border-[#dce3df] p-4 flex flex-col shadow-2xs">
      <div className="flex items-center justify-between pb-3 border-b border-[#dce3df] mb-3">
        <h3 className="text-[11px] font-bold text-[#65716d] uppercase tracking-wider flex items-center gap-1.5">
          <Bell size={14} className={isOperational ? "text-[#257b68]" : "text-[#c97a22]"} />
          Stare & Alarme
        </h3>
        <span className="text-[10px] text-[#8e9c98] font-mono">ISA-18.2</span>
      </div>

      {/* Bloc principal stare turbină */}
      <div
        className={`p-3.5 border flex items-center gap-3 mb-3.5 ${
          isOperational
            ? "bg-[#edf6f2] border-[#bfe2d1] text-[#1e5842]"
            : isOverspeed
              ? "bg-[#fdeeee] border-[#f8c4c4] text-[#a42b1d]"
              : "bg-[#fdf6ec] border-[#f5dfbe] text-[#9b5811]"
        }`}
      >
        {isOperational ? (
          <ShieldCheck size={32} className="text-[#257b68] shrink-0" />
        ) : isOverspeed ? (
          <AlertOctagon size={32} className="text-[#c93b2b] shrink-0" />
        ) : (
          <AlertTriangle size={32} className="text-[#c97a22] shrink-0" />
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
            Stare turbină
          </span>
          <strong className="text-base font-extrabold tracking-tight">
            {isOperational ? "OPERAȚIONALĂ" : isOverspeed ? "OPRIRE CRITICĂ" : "AVERTISMENT"}
          </strong>
          <span className="text-[10px] opacity-75 mt-0.5">
            {isOperational
              ? "Toate sistemele în parametri nominali"
              : isOverspeed
                ? "Frână aerodinamică declanșată"
                : "Se recomandă inspecție vizuală"}
          </span>
        </div>
      </div>

      {/* Limite de siguranță monitorizate */}
      <div className="flex flex-col gap-2 py-2 border-y border-[#edf0ee] text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[#53605b]">Protecție supraturație:</span>
          <span
            className={`font-semibold px-1.5 py-0.5 text-[11px] ${
              !isOverspeed
                ? "text-[#257b68] bg-[#edf6f2]"
                : "text-[#c93b2b] bg-[#fdeeee]"
            }`}
          >
            {!isOverspeed ? "OK (< 120 RPM)" : "DEPĂȘIRE"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[#53605b]">Temperatura generator:</span>
          <span
            className={`font-mono font-semibold px-1.5 py-0.5 text-[11px] ${
              !isTempHigh
                ? "text-[#257b68] bg-[#edf6f2]"
                : "text-[#c97a22] bg-[#fdf6ec]"
            }`}
          >
            {formatInt(latest.TempInfas)} °C
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[#53605b]">Vibrații structură:</span>
          <span
            className={`font-mono font-semibold px-1.5 py-0.5 text-[11px] ${
              !isVibeHigh
                ? "text-[#257b68] bg-[#edf6f2]"
                : "text-[#c93b2b] bg-[#fdeeee]"
            }`}
          >
            {formatVibration(latest.Vibratii)} G
          </span>
        </div>
      </div>

      {/* Jurnal alarme */}
      <div className="flex flex-col mt-3.5">
        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#edf0ee]">
          <span className="text-[10px] font-bold text-[#65716d] uppercase tracking-wider">
            Jurnal evenimente
          </span>
          <span className="text-[10px] text-[#8e9c98] font-mono">
            {alerts.length} recente
          </span>
        </div>

        <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 p-2.5 bg-[#f8faf9] text-[#65716d] text-xs">
              <CheckCircle2 size={15} className="text-[#257b68]" />
              <span>Nicio alarmă activă în sistem.</span>
            </div>
          ) : (
            alerts.map((alert, idx) => {
              const isCrit = alert.severity === "critical";
              const isWarn = alert.severity === "warning";

              return (
                <div
                  key={`${alert.time}-${idx}`}
                  className={`p-2.5 border text-xs flex flex-col gap-1 transition-all ${
                    isCrit
                      ? "bg-[#fdeeee] border-[#f8c4c4]"
                      : isWarn
                        ? "bg-[#fdf6ec] border-[#f5dfbe]"
                        : "bg-[#f4f7f9] border-[#dbe4eb]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 flex items-center gap-1 ${
                        isCrit
                          ? "bg-[#c93b2b] text-white"
                          : isWarn
                            ? "bg-[#c97a22] text-white"
                            : "bg-[#587387] text-white"
                      }`}
                    >
                      {isCrit ? (
                        <AlertOctagon size={10} />
                      ) : isWarn ? (
                        <AlertTriangle size={10} />
                      ) : (
                        <Info size={10} />
                      )}
                      {alert.severity === "critical"
                        ? "CRITIC"
                        : alert.severity === "warning"
                          ? "AVERTISMENT"
                          : "INFO"}
                    </span>
                    <span className="font-mono text-[10px] text-[#65716d]">
                      {alert.time}
                    </span>
                  </div>
                  <strong className="text-[#121a18] font-semibold text-[11px] mt-0.5">
                    {alert.parameter}
                  </strong>
                  <p className="text-[11px] text-[#53605b] leading-tight m-0">
                    {alert.text}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
