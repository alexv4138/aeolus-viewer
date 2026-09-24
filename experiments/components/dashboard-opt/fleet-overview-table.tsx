"use client";

import React from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import type { WorkbookTelemetry, WorkbookUser } from "@/app/fleet-data";
import { formatDecimal, formatInt } from "./formatters";

type Point = WorkbookTelemetry;

interface Turbine {
  id: string;
  locationId: number;
  location: string;
  owner: WorkbookUser;
}

interface FleetOverviewTableProps {
  turbines: Turbine[];
  selectedLocationId: number;
  onSelectLocation: (id: number) => void;
  records: Record<number, Point[]>;
}

export function FleetOverviewTable({
  turbines,
  selectedLocationId,
  onSelectLocation,
  records,
}: FleetOverviewTableProps) {
  return (
    <div className="bg-white border border-[#dce3df] p-5 shadow-2xs">
      <div className="flex items-center justify-between pb-3 border-b border-[#dce3df] mb-3">
        <div>
          <span className="text-[10px] font-bold text-[#65716d] uppercase tracking-wider block">
            Supraveghere Rețea
          </span>
          <h2 className="text-base font-bold text-[#121a18] tracking-tight m-0">
            Starea Flotei de Turbine
          </h2>
        </div>
        <span className="text-xs text-[#7a8682]">
          {turbines.length} unități monitorizate activ
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#dce3df] bg-[#f8faf9] text-[10px] font-bold text-[#65716d] uppercase tracking-wider">
              <th className="py-2.5 px-3">Turbină & Operator</th>
              <th className="py-2.5 px-3">Locație geografică</th>
              <th className="py-2.5 px-3 text-right">Putere instant</th>
              <th className="py-2.5 px-3 text-right">Viteză vânt</th>
              <th className="py-2.5 px-3 text-center">Alerte active</th>
              <th className="py-2.5 px-3 text-right">Stare operațională</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0ee]">
            {turbines.map((turb) => {
              const pts = records[turb.locationId] ?? [];
              const latest = pts[pts.length - 1];
              const isSelected = turb.locationId === selectedLocationId;
              const hasAlarm = Boolean(latest?.Alarma);

              return (
                <tr
                  key={turb.id}
                  onClick={() => onSelectLocation(turb.locationId)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#edf6f2] font-medium"
                      : "hover:bg-[#f8faf9]"
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isSelected ? "bg-[#257b68]" : "bg-[#aab5b0]"
                        }`}
                      />
                      <div>
                        <strong className="text-[#121a18] font-bold block">
                          {turb.id}
                        </strong>
                        <span className="text-[11px] text-[#65716d]">
                          {turb.owner.name}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-[#53605b] max-w-xs truncate">
                    {turb.location}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#121a18]">
                    {latest ? `${formatInt(latest.Putere)} W` : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#53605b]">
                    {latest ? `${formatDecimal(latest.VitVant, 1)} m/s` : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {hasAlarm ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#c93b2b] bg-[#fdeeee] px-2 py-0.5 border border-[#f8c4c4]">
                        <ShieldAlert size={12} />
                        Alertă activă
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#257b68]">
                        <CheckCircle2 size={12} />
                        Fără alerte
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 text-[11px] font-semibold ${
                        hasAlarm
                          ? "bg-[#fdf6ec] text-[#c97a22] border border-[#f5dfbe]"
                          : "bg-[#edf6f2] text-[#257b68] border border-[#cbe3d7]"
                      }`}
                    >
                      {hasAlarm ? "Verifică" : "Operațională"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
