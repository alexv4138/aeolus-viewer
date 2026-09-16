"use client";

import React, { useMemo, useState } from "react";
import { Compass, Info } from "lucide-react";
import type { WorkbookTelemetry } from "@/app/fleet-data";
import { formatDecimal, formatEnergy, formatInt } from "./formatters";

type Point = WorkbookTelemetry;

interface WindRoseProps {
  points: Point[];
  currentDirection?: string;
  currentSpeed?: number;
}

// Cele 16 sectoare cardinale românești și unghiul lor central față de Nord (0°)
const SECTORS: { code: string; label: string; deg: number }[] = [
  { code: "N", label: "Nord", deg: 0 },
  { code: "NNE", label: "Nord-Nord-Est", deg: 22.5 },
  { code: "NE", label: "Nord-Est", deg: 45 },
  { code: "ENE", label: "Est-Nord-Est", deg: 67.5 },
  { code: "E", label: "Est", deg: 90 },
  { code: "ESE", label: "Est-Sud-Est", deg: 112.5 },
  { code: "SE", label: "Sud-Est", deg: 135 },
  { code: "SSE", label: "Sud-Sud-Est", deg: 157.5 },
  { code: "S", label: "Sud", deg: 180 },
  { code: "SSV", label: "Sud-Sud-Vest", deg: 202.5 },
  { code: "SV", label: "Sud-Vest", deg: 225 },
  { code: "VSV", label: "Vest-Sud-Vest", deg: 247.5 },
  { code: "V", label: "Vest", deg: 270 },
  { code: "VNV", label: "Vest-Nord-Vest", deg: 292.5 },
  { code: "NV", label: "Nord-Vest", deg: 315 },
  { code: "NNV", label: "Nord-Nord-Vest", deg: 337.5 },
];

export function WindRose({ points, currentDirection = "VSV", currentSpeed = 0 }: WindRoseProps) {
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [metricType, setMetricType] = useState<"frequency" | "energy">("frequency");

  // Agregare pe sectoare
  const sectorStats = useMemo(() => {
    const map: Record<string, { count: number; totalSpeed: number; totalEnergy: number; maxSpeed: number }> = {};
    SECTORS.forEach((s) => {
      map[s.code] = { count: 0, totalSpeed: 0, totalEnergy: 0, maxSpeed: 0 };
    });

    let totalPoints = 0;
    let totalAllEnergy = 0;

    points.forEach((p) => {
      const dir = (p.DirectieVant || "").toUpperCase().trim();
      const speed = Number(p.VitVant) || 0;
      const energy = Number(p.Energie) || 0;

      // Mapare direcție
      const match = SECTORS.find((s) => s.code === dir) || SECTORS.find((s) => dir.startsWith(s.code));
      if (match) {
        map[match.code].count += 1;
        map[match.code].totalSpeed += speed;
        map[match.code].totalEnergy += energy;
        map[match.code].maxSpeed = Math.max(map[match.code].maxSpeed, speed);
        totalPoints += 1;
        totalAllEnergy += energy;
      }
    });

    const maxCount = Math.max(1, ...Object.values(map).map((v) => v.count));
    const maxEnergy = Math.max(1, ...Object.values(map).map((v) => v.totalEnergy));

    return { map, maxCount, maxEnergy, totalPoints, totalAllEnergy };
  }, [points]);

  // Geometrie SVG
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 100;
  const innerRadius = 24;

  const activeStat = activeSector ? sectorStats.map[activeSector] : null;
  const activeDef = activeSector ? SECTORS.find((s) => s.code === activeSector) : null;

  return (
    <div className="flex flex-col bg-white border border-[#dce3df] p-4 shadow-2xs">
      <div className="flex items-center justify-between pb-2 border-b border-[#edf0ee] mb-3">
        <div className="flex items-center gap-1.5">
          <Compass size={15} className="text-[#257b68]" />
          <h4 className="text-[11px] font-bold text-[#65716d] uppercase tracking-wider m-0">
            Roza Vânturilor Polară
          </h4>
        </div>

        {/* Comutator: Frecvență apariție vs. Energie generată */}
        <div className="inline-flex rounded-none border border-[#dce3df] bg-[#f0f4f2] p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => setMetricType("frequency")}
            className={`px-2 py-0.5 font-semibold transition-colors cursor-pointer ${
              metricType === "frequency" ? "bg-white text-[#121a18] shadow-xs" : "text-[#53605b]"
            }`}
          >
            Frecvență
          </button>
          <button
            type="button"
            onClick={() => setMetricType("energy")}
            className={`px-2 py-0.5 font-semibold transition-colors cursor-pointer ${
              metricType === "energy" ? "bg-white text-[#121a18] shadow-xs" : "text-[#53605b]"
            }`}
          >
            Energie
          </button>
        </div>
      </div>

      <div className="relative flex justify-center items-center my-1 select-none">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full max-w-[240px] h-auto overflow-visible"
          onMouseLeave={() => setActiveSector(null)}
        >
          {/* Inele concentrice de ghidaj (25%, 50%, 75%, 100%) */}
          {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
            const r = innerRadius + (maxRadius - innerRadius) * ratio;
            return (
              <circle
                key={ratio}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="#e8eeeb"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            );
          })}

          {/* Linii radiale pentru cele 8 direcții principale */}
          {SECTORS.filter((_, idx) => idx % 2 === 0).map((sec) => {
            const rad = ((sec.deg - 90) * Math.PI) / 180;
            const x2 = cx + maxRadius * Math.cos(rad);
            const y2 = cy + maxRadius * Math.sin(rad);
            return (
              <line
                key={sec.code}
                x1={cx}
                x2={x2}
                y1={cy}
                y2={y2}
                stroke="#e8eeeb"
                strokeWidth="1"
              />
            );
          })}

          {/* Petale polare pentru cele 16 direcții */}
          {SECTORS.map((sec) => {
            const stat = sectorStats.map[sec.code];
            const ratio =
              metricType === "frequency"
                ? stat.count / sectorStats.maxCount
                : stat.totalEnergy / (sectorStats.maxEnergy || 1);

            const petalRadius = innerRadius + (maxRadius - innerRadius) * Math.max(0.04, ratio);
            const halfAngle = 11.25 * 0.88; // lățime petală cu spațiere fină
            const startAngle = sec.deg - halfAngle;
            const endAngle = sec.deg + halfAngle;

            const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
            const x1 = cx + petalRadius * Math.cos(toRad(startAngle));
            const y1 = cy + petalRadius * Math.sin(toRad(startAngle));
            const x2 = cx + petalRadius * Math.cos(toRad(endAngle));
            const y2 = cy + petalRadius * Math.sin(toRad(endAngle));
            const x3 = cx + innerRadius * Math.cos(toRad(endAngle));
            const y3 = cy + innerRadius * Math.sin(toRad(endAngle));
            const x4 = cx + innerRadius * Math.cos(toRad(startAngle));
            const y4 = cy + innerRadius * Math.sin(toRad(startAngle));

            const pathData = `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${petalRadius.toFixed(1)} ${petalRadius.toFixed(1)} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${innerRadius} ${innerRadius} 0 0 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z`;

            const isHovered = activeSector === sec.code;
            const isLiveDir = currentDirection.toUpperCase().trim() === sec.code;

            const color =
              metricType === "energy"
                ? isHovered
                  ? "#167bb8"
                  : isLiveDir
                    ? "#257b68"
                    : "#64a4ca"
                : isHovered
                  ? "#257b68"
                  : isLiveDir
                    ? "#bd861c"
                    : "#639a8c";

            return (
              <path
                key={sec.code}
                d={pathData}
                fill={color}
                opacity={isHovered ? 1 : isLiveDir ? 0.95 : 0.72}
                stroke={isHovered ? "#121a18" : isLiveDir ? "#257b68" : "#ffffff"}
                strokeWidth={isHovered || isLiveDir ? "1.5" : "0.5"}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setActiveSector(sec.code)}
              />
            );
          })}

          {/* Centru busolă cu direcția live */}
          <circle cx={cx} cy={cy} r={innerRadius - 2} fill="#ffffff" stroke="#dce3df" strokeWidth="1.5" />
          <text
            x={cx}
            y={cy + 3.5}
            textAnchor="middle"
            fill="#121a18"
            fontSize="10"
            fontFamily="var(--font-geist-mono), monospace"
            fontWeight="bold"
          >
            {currentDirection}
          </text>

          {/* Etichete cardinale N, E, S, V */}
          <text x={cx} y={cy - maxRadius - 6} textAnchor="middle" fill="#65716d" fontSize="10" fontWeight="bold">N</text>
          <text x={cx + maxRadius + 8} y={cy + 3.5} textAnchor="start" fill="#65716d" fontSize="10" fontWeight="bold">E</text>
          <text x={cx} y={cy + maxRadius + 14} textAnchor="middle" fill="#65716d" fontSize="10" fontWeight="bold">S</text>
          <text x={cx - maxRadius - 8} y={cy + 3.5} textAnchor="end" fill="#65716d" fontSize="10" fontWeight="bold">V</text>
        </svg>
      </div>

      {/* Readout sector la hover */}
      <div className="mt-2 pt-2 border-t border-[#edf0ee] text-[11px] min-h-[42px] flex items-center justify-between font-mono">
        {activeDef && activeStat ? (
          <>
            <div>
              <strong className="text-[#121a18] font-sans block text-xs">
                {activeDef.code} · {activeDef.label}
              </strong>
              <span className="text-[#7a8682]">
                {activeStat.count} citiri (
                {sectorStats.totalPoints > 0
                  ? formatDecimal((activeStat.count / sectorStats.totalPoints) * 100, 1)
                  : 0}
                %)
              </span>
            </div>
            <div className="text-right">
              <span className="text-[#121a18] font-bold block">
                {activeStat.count > 0 ? formatDecimal(activeStat.totalSpeed / activeStat.count, 1) : "0,0"} m/s med
              </span>
              <span className="text-[#257b68]">
                {formatEnergy(activeStat.totalEnergy)} kWh
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-[#7a8682] text-[10px] italic font-sans">
            <Info size={12} className="text-[#257b68] shrink-0" />
            <span>Treceți cu cursorul peste petale pentru distribuția pe direcții</span>
          </div>
        )}
      </div>
    </div>
  );
}
