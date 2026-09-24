"use client";

import React, { useMemo } from "react";
import { Activity, Bolt, Gauge, Thermometer, Vibrate, Zap, type LucideIcon } from "lucide-react";
import type { WorkbookTelemetry } from "@/app/fleet-data";
import {
  formatDecimal,
  formatEnergy,
  formatInt,
  formatVibration,
} from "./formatters";

type Point = WorkbookTelemetry;

interface TurbineKpiGridProps {
  latest: Point;
  points?: Point[];
}

interface MicroSparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

function MicroSparkline({
  data,
  color = "#257b68",
  width = 56,
  height = 18,
}: MicroSparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(0.0001, max - min);

  const padX = 2;
  const padY = 2;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const pts = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * plotW;
    const y = padY + plotH - ((v - min) / range) * plotH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lastX = (padX + plotW).toFixed(1);
  const lastY = (padY + plotH - ((data[data.length - 1] - min) / range) * plotH).toFixed(1);

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible shrink-0 select-none opacity-85 hover:opacity-100 transition-opacity"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts.join(" ")}
      />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  );
}

function getTrend(data: number[], digits = 0) {
  if (!data || data.length < 2) return null;
  const first = data[0];
  const last = data[data.length - 1];
  const diff = last - first;

  // Dacă variația este insesizabilă
  if (Math.abs(diff) < 0.001) {
    return { arrow: "→", label: "stab.", color: "text-[#7a8682]" };
  }

  const isUp = diff > 0;
  const sign = isUp ? "+" : "";
  const valStr =
    digits === 0 ? `${sign}${Math.round(diff)}` : `${sign}${formatDecimal(diff, digits)}`;

  return {
    arrow: isUp ? "↗" : "↘",
    label: valStr,
    color: isUp ? "text-[#257b68]" : "text-[#b04334]",
  };
}

interface KpiCardProps {
  label: string;
  icon: LucideIcon;
  value: string;
  unit: string;
  safe?: boolean;
  warn?: boolean;
  critical?: boolean;
  sparkData?: number[];
  sparkColor?: string;
  digits?: number;
}

function KpiCard({
  label,
  icon: Icon,
  value,
  unit,
  safe,
  warn,
  critical,
  sparkData,
  sparkColor = "#257b68",
  digits = 0,
}: KpiCardProps) {
  const trend = useMemo(() => {
    return sparkData ? getTrend(sparkData, digits) : null;
  }, [sparkData, digits]);

  return (
    <div className="flex flex-col justify-between p-3.5 bg-white border border-[#dce3df] hover:border-[#b5c2bd] transition-colors shadow-2xs min-w-0">
      <div className="flex items-center justify-between gap-1 mb-1.5 min-w-0">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#65716d] uppercase tracking-wider leading-tight">
          <Icon size={14} aria-hidden="true" /> {label}
        </span>
        {safe && (
          <span className="text-[9px] font-semibold text-[#257b68] bg-[#edf6f2] px-1.5 py-0.5 border border-[#cbe3d7] shrink-0">
            Normal
          </span>
        )}
        {warn && (
          <span className="text-[9px] font-semibold text-[#c97a22] bg-[#fdf6ec] px-1.5 py-0.5 border border-[#f5dfbe] shrink-0">
            Atenție
          </span>
        )}
        {critical && (
          <span className="text-[9px] font-semibold text-[#c93b2b] bg-[#fdeeee] px-1.5 py-0.5 border border-[#f8c4c4] shrink-0">
            Critic
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-1 min-w-0">
        <div className="flex items-baseline gap-1 shrink-0">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#121a18] font-mono tabular-nums whitespace-nowrap">
            {value}
          </span>
          <span className="text-xs font-medium text-[#7a8682]">{unit}</span>
        </div>

        {sparkData && sparkData.length > 1 && (
          <div className="flex flex-col items-end shrink-0 pl-1">
            <MicroSparkline data={sparkData} color={sparkColor} width={48} height={18} />
            {trend && (
              <span
                className={`text-[9px] font-mono font-bold leading-none mt-0.5 flex items-center gap-0.5 whitespace-nowrap ${trend.color}`}
                title={`Tendință pe interval: ${trend.label}`}
              >
                <span>{trend.arrow}</span>
                <span>{trend.label}</span>
              </span>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

export function TurbineKpiGrid({ latest, points = [] }: TurbineKpiGridProps) {
  const isVibeHigh = Number(latest.Vibratii) > 0.8;
  const isTempHigh = Number(latest.TempInfas) > 65;

  // Ultimele 24 puncte pentru micro-sparklines
  const recentPoints = useMemo(() => {
    return points.slice(-24);
  }, [points]);

  const extractSeries = (field: keyof Point) => {
    return recentPoints.map((p) => Number(p[field]) || 0);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full">
      <KpiCard
        label="Turație rotor"
        icon={Gauge}
        value={formatInt(latest.Turatie)}
        unit="RPM"
        sparkData={extractSeries("Turatie")}
        sparkColor="#1e6b5a"
      />
      <KpiCard
        label="Voltaj generator"
        icon={Zap}
        value={formatInt(latest.Voltaj)}
        unit="V"
        sparkData={extractSeries("Voltaj")}
        sparkColor="#367396"
      />
      <KpiCard
        label="Amperaj"
        icon={Activity}
        value={formatDecimal(latest.Amperaj, 1)}
        unit="A"
        sparkData={extractSeries("Amperaj")}
        sparkColor="#2e8571"
        digits={1}
      />
      <KpiCard
        label="Putere instantanee"
        icon={Bolt}
        value={formatInt(latest.Putere)}
        unit="W"
        sparkData={extractSeries("Putere")}
        sparkColor="#bd861c"
      />
      <KpiCard
        label="Energie cumulată"
        icon={Bolt}
        value={formatEnergy(latest.Energie)}
        unit="kWh"
        sparkData={extractSeries("Energie")}
        sparkColor="#167bb8"
        digits={1}
      />
      <KpiCard
        label="Vibrație mecanică"
        icon={Vibrate}
        value={formatVibration(latest.Vibratii)}
        unit="G"
        safe={!isVibeHigh}
        warn={isVibeHigh}
        sparkData={extractSeries("Vibratii")}
        sparkColor={isVibeHigh ? "#c97a22" : "#257b68"}
        digits={2}
      />
      <KpiCard
        label="Cuplu mecanic"
        icon={Gauge}
        value={formatInt(latest.CupluMec)}
        unit="Nm"
        sparkData={extractSeries("CupluMec")}
        sparkColor="#687b74"
      />
      <KpiCard
        label="Temp. generator"
        icon={Thermometer}
        value={formatInt(latest.TempInfas)}
        unit="°C"
        warn={isTempHigh}
        safe={!isTempHigh}
        sparkData={extractSeries("TempInfas")}
        sparkColor={isTempHigh ? "#c93b2b" : "#257b68"}
      />
    </div>
  );
}
