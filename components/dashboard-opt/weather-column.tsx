"use client";

import React from "react";
import {
  ArrowUpRight,
  Compass,
  Droplets,
  Gauge,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import type { WorkbookTelemetry } from "@/app/fleet-data";
import { formatDecimal, formatInt } from "./formatters";

type Point = WorkbookTelemetry;

interface WeatherColumnProps {
  latest: Point;
}

interface WeatherItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  sublabel?: string;
  highlight?: boolean;
}

function WeatherItem({
  icon,
  label,
  value,
  unit,
  sublabel,
  highlight = false,
}: WeatherItemProps) {
  return (
    <div
      className={`flex items-start gap-3 py-3 border-b border-[#edf0ee] last:border-b-0 transition-colors ${
        highlight ? "bg-[#f5faf8] -mx-2 px-2 border-l-2 border-l-[#257b68]" : ""
      }`}
    >
      <div className="p-1.5 bg-[#f0f4f2] text-[#2d403a] rounded-none shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-[11px] font-semibold text-[#65716d] uppercase tracking-wide">
          {label}
        </span>
        <div className="flex items-baseline gap-1 mt-0.5">
          <strong className="text-xl font-bold tracking-tight text-[#121a18] font-mono tabular-nums">
            {value}
          </strong>
          {unit && (
            <span className="text-xs font-medium text-[#7a8682]">{unit}</span>
          )}
        </div>
        {sublabel && (
          <span className="text-[10px] text-[#8e9c98] mt-0.5">{sublabel}</span>
        )}
      </div>
    </div>
  );
}

export function WeatherColumn({ latest }: WeatherColumnProps) {
  const windVal = Number(latest.VitVant) || 0;
  const windState =
    windVal < 2.5
      ? "Vânt slab (sub turație utilă)"
      : windVal < 10
        ? "Regim optim de generare"
        : "Vânt intens (regim supravegheat)";

  return (
    <div className="bg-white border border-[#dce3df] p-4 flex flex-col shadow-2xs">
      <div className="flex items-center justify-between pb-3 border-b border-[#dce3df] mb-2">
        <h3 className="text-[11px] font-bold text-[#65716d] uppercase tracking-wider flex items-center gap-1.5">
          <Compass size={14} className="text-[#257b68]" />
          Condiții de Mediu
        </h3>
        <span className="text-[10px] text-[#8e9c98] font-mono">Senzori stație</span>
      </div>

      <div className="flex flex-col">
        {/* Viteza vântului este parametrul cheie - evidențiat subtil */}
        <WeatherItem
          icon={<Wind size={18} />}
          label="Viteza vântului"
          value={formatDecimal(latest.VitVant, 1)}
          unit="m/s"
          sublabel={windState}
          highlight
        />
        <WeatherItem
          icon={<ArrowUpRight size={18} />}
          label="Direcția vântului"
          value={latest.DirectieVant || "—"}
          unit=""
          sublabel="Orientare anemometru"
        />
        <WeatherItem
          icon={<Thermometer size={18} />}
          label="Temperatura aerului"
          value={formatDecimal(latest.TempC, 1)}
          unit="°C"
        />
        <WeatherItem
          icon={<Gauge size={18} />}
          label="Presiune atmosferică"
          value={formatInt(latest.PresAtm)}
          unit="hPa"
        />
        <WeatherItem
          icon={<Droplets size={18} />}
          label="Umiditate relativă"
          value={formatInt(latest.Umiditate)}
          unit="%"
        />
        <WeatherItem
          icon={<Sun size={18} />}
          label="Radiație solară"
          value={formatInt(latest.RadSolara)}
          unit="W/m²"
        />
      </div>
    </div>
  );
}
