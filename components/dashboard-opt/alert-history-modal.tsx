"use client";

import React, { useMemo, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Bird,
  CircleAlert,
  CloudLightning,
  Flame,
  Gauge,
  Network,
  ShieldAlert,
  ThermometerSun,
  Vibrate,
  X,
  Zap,
} from "lucide-react";
import type { AlertIconName, AlertItem, AlertRule, AlertSeverity } from "./alert-demo";
import { severityRank } from "./alert-demo";
import { formatDate, formatDateTime } from "./formatters";

const severityStyle: Record<AlertSeverity, { label: string; color: string; soft: string }> = {
  info: { label: "INFO", color: "#587387", soft: "#f4f7f9" },
  low: { label: "SCĂZUT", color: "#63766d", soft: "#f1f5f2" },
  medium: { label: "MEDIU", color: "#b87919", soft: "#fff7e9" },
  high: { label: "RIDICAT", color: "#c76522", soft: "#fff0e9" },
  critical: { label: "CRITIC", color: "#bd3a2b", soft: "#fdeeee" },
};

export function AlertIcon({ name, size = 14 }: { name: AlertIconName; size?: number }) {
  const Icon = {
    overspeed: Gauge,
    temperature: ThermometerSun,
    vibration: Vibrate,
    voltage: Zap,
    current: Zap,
    storm: CloudLightning,
    hail: CloudLightning,
    seismic: CircleAlert,
    bird: Bird,
    fire: Flame,
    brake: ShieldAlert,
    network: Network,
  }[name];
  return <Icon size={size} />;
}

function dateKey(iso: string) {
  return iso.slice(0, 10);
}

function monthGrid(referenceIso: string) {
  const date = new Date(`${dateKey(referenceIso)}T12:00:00`);
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return current.toISOString().slice(0, 10);
  });
}

interface AlertHistoryModalProps {
  alerts: AlertItem[];
  turbineName: string;
  turbineLocation: string;
  selectedRule: AlertRule | null;
  onClose: () => void;
}

export function AlertHistoryModal({ alerts, turbineName, turbineLocation, selectedRule, onClose }: AlertHistoryModalProps) {
  const initialDate = alerts[0] ? dateKey(alerts[0].occurredAt) : "";
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const selectedEvents = useMemo(
    () => alerts.filter((alert) => dateKey(alert.occurredAt) === selectedDate),
    [alerts, selectedDate],
  );
  const calendarDays = useMemo(() => monthGrid(alerts[0]?.occurredAt ?? new Date().toISOString()), [alerts]);
  const referenceDate = new Date(`${dateKey(alerts[0]?.occurredAt ?? new Date().toISOString())}T12:00:00`);
  const monthTitle = new Intl.DateTimeFormat("ro-RO", { month: "long", year: "numeric" }).format(referenceDate);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[1px]" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white border border-[#dce3df] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-3 px-5 py-4 bg-[#fcfdfd] border-b border-[#dce3df]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#65716d]">Jurnal evenimente · {turbineName}</span>
            <h2 className="m-0 text-xl font-bold text-[#121a18]">{selectedRule ? selectedRule.parameter : "Istoric alerte și urgențe"}</h2>
            <p className="m-0 mt-1 text-xs text-[#65716d]">{turbineLocation} · ultimele 7 zile demo · {alerts.length} evenimente</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-[#53605b] border border-[#dce3df] hover:bg-[#f0f4f2]">
            <X size={14} /> Închide
          </button>
        </div>

        {selectedRule && (() => {
          const style = severityStyle[selectedRule.severity];
          const current = alerts.find((alert) => alert.code === selectedRule.code);
          return <section className="mx-5 mt-4 border p-4" style={{ borderColor: style.color, backgroundColor: style.soft }}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-2">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-[#121a18]"><AlertIcon name={selectedRule.icon} size={17} /> {selectedRule.code} · {selectedRule.parameter}</span>
              <span className="px-2 py-1 text-[10px] font-extrabold" style={{ color: style.color, backgroundColor: "#ffffff" }}>SEVERITATE: {style.label}</span>
            </div>
            <dl className="mt-3 grid gap-x-5 gap-y-3 text-xs sm:grid-cols-2">
              <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#65716d]">Descriere / cauză posibilă</dt><dd className="m-0 mt-1 text-[#28332f]">{selectedRule.description}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#65716d]">Acțiune automată / recomandată</dt><dd className="m-0 mt-1 text-[#28332f]">{selectedRule.action}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#65716d]">Alerte & notificări recomandate</dt><dd className="m-0 mt-1 text-[#28332f]">{selectedRule.notifications}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-wide text-[#65716d]">Stare demo</dt><dd className="m-0 mt-1 text-[#28332f]">{current ? `Eveniment în jurnal · ${formatDateTime(current.occurredAt)}` : "Monitorizat · fără eveniment demo în interval"}</dd></div>
            </dl>
          </section>;
        })()}

        <div className="grid gap-5 p-5 lg:grid-cols-[1.05fr_1fr]">
          <section className="border border-[#dce3df] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="m-0 text-sm font-bold text-[#121a18] capitalize">{monthTitle}</h3>
              <span className="text-[10px] text-[#65716d]">culoarea = severitatea maximă</span>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[10px] font-bold text-[#8e9c98]">
              {["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dayEvents = alerts.filter((alert) => dateKey(alert.occurredAt) === day);
                const maximum = dayEvents.reduce<AlertItem | null>((mostSevere, alert) => !mostSevere || severityRank[alert.severity] > severityRank[mostSevere.severity] ? alert : mostSevere, null);
                const inMonth = day.slice(5, 7) === dateKey(referenceDate.toISOString()).slice(5, 7);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => dayEvents.length && setSelectedDate(day)}
                    disabled={!dayEvents.length}
                    className={`min-h-16 border p-1.5 text-left transition-colors ${selectedDate === day ? "ring-2 ring-[#257b68] ring-inset" : ""} ${dayEvents.length ? "cursor-pointer hover:brightness-95" : "cursor-default"}`}
                    style={{ backgroundColor: maximum ? severityStyle[maximum.severity].soft : "#fbfcfc", borderColor: maximum ? severityStyle[maximum.severity].color : "#edf0ee", opacity: inMonth ? 1 : 0.35 }}
                  >
                    <span className="block text-[10px] text-[#53605b]">{Number(day.slice(8, 10))}</span>
                    {dayEvents.length > 0 && maximum && (
                      <span className="mt-1 flex items-center gap-0.5" style={{ color: severityStyle[maximum.severity].color }}>
                        {dayEvents.slice(0, 3).map((alert) => <AlertIcon key={alert.code + alert.occurredAt} name={alert.icon} size={12} />)}
                        {dayEvents.length > 3 && <small className="ml-0.5 text-[10px] font-bold">+{dayEvents.length - 3}</small>}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border border-[#dce3df] p-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#edf0ee]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#65716d]">Orele zilei selectate</span>
                <h3 className="m-0 mt-0.5 text-sm font-bold text-[#121a18]">{selectedDate ? formatDate(selectedDate) : "Nicio dată"}</h3>
              </div>
              <span className="text-[10px] font-mono text-[#65716d]">{selectedEvents.length} evenimente</span>
            </div>
            <div className="mt-3 space-y-2">
              {selectedEvents.length ? selectedEvents.map((alert) => {
                const style = severityStyle[alert.severity];
                return (
                  <article key={`${alert.code}-${alert.occurredAt}`} className="border-l-4 border border-[#edf0ee] p-3" style={{ borderLeftColor: style.color }}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: style.color }}><AlertIcon name={alert.icon} size={13} /> {style.label} · {alert.code}</span>
                      <time className="text-[10px] font-mono text-[#65716d]">{alert.occurredAt.slice(11, 16)}</time>
                    </div>
                    <strong className="block mt-1 text-xs text-[#121a18]">{alert.parameter}</strong>
                    <p className="m-0 mt-1 text-[11px] leading-snug text-[#53605b]">{alert.text}</p>
                    <p className="m-0 mt-2 text-[10px] font-medium text-[#45504c]">Acțiune: {alert.action}</p>
                  </article>
                );
              }) : <p className="py-8 text-center text-xs text-[#65716d]">Nu există evenimente în această zi.</p>}
            </div>
          </section>
        </div>

        <section className="px-5 pb-5">
          <div className="flex items-end justify-between gap-3 mb-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#65716d]">Registru demonstrativ · ultimele zile</span>
              <h3 className="m-0 mt-0.5 text-sm font-bold text-[#121a18]">Tabel evenimente și urgențe</h3>
            </div>
            <span className="text-[10px] text-[#65716d]">Date de simulare, comune tuturor turbinelor</span>
          </div>
          <div className="overflow-x-auto border border-[#dce3df]">
            <table className="w-full min-w-[760px] border-collapse text-left text-[11px]">
              <thead className="bg-[#f4f7f6] text-[10px] uppercase tracking-wide text-[#65716d]">
                <tr><th className="px-3 py-2">Data / ora</th><th className="px-3 py-2">Turbina</th><th className="px-3 py-2">Eveniment</th><th className="px-3 py-2">Severitate</th><th className="px-3 py-2">Cod</th><th className="px-3 py-2">Acțiune recomandată</th></tr>
              </thead>
              <tbody>
                {alerts.map((alert) => {
                  const style = severityStyle[alert.severity];
                  return <tr key={`table-${alert.code}-${alert.occurredAt}`} className="border-t border-[#edf0ee] hover:bg-[#fafcfb]">
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[#53605b]">{formatDateTime(alert.occurredAt)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-[#53605b]">{turbineName}</td>
                    <td className="px-3 py-2"><span className="inline-flex items-center gap-1.5 font-semibold text-[#121a18]"><AlertIcon name={alert.icon} size={13} />{alert.parameter}</span><span className="block mt-0.5 text-[#65716d]">{alert.text}</span></td>
                    <td className="whitespace-nowrap px-3 py-2"><span className="px-1.5 py-1 text-[9px] font-bold" style={{ color: style.color, backgroundColor: style.soft }}>{style.label}</span></td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[#53605b]">{alert.code}</td>
                    <td className="px-3 py-2 text-[#53605b]">{alert.action}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
