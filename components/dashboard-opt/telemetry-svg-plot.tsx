"use client";

import React, { useMemo, useState } from "react";
import type { WorkbookTelemetry } from "@/app/fleet-data";
import { formatDate, formatDateTime, formatDecimal, formatInt, formatTime, formatVibration } from "./formatters";

type Point = WorkbookTelemetry;

interface TelemetryPlotProps {
  points: Point[];
  field: keyof Point;
  color?: string;
  large?: boolean;
  showBand?: boolean;
  showAverageLine?: boolean;
  unit?: string;
  digits?: number;
  sharedHoveredIdx?: number | null;
  onHoverChange?: (idx: number | null) => void;
}

export function TelemetrySvgPlot({
  points,
  field,
  color = "#257b68",
  large = false,
  showBand = false,
  showAverageLine = true,
  unit = "",
  digits = 0,
  sharedHoveredIdx,
  onHoverChange,
}: TelemetryPlotProps) {
  const [internalHoveredIdx, setInternalHoveredIdx] = useState<number | null>(null);
  const hoveredIdx = sharedHoveredIdx !== undefined ? sharedHoveredIdx : internalHoveredIdx;

  const setHovered = (idx: number | null) => {
    if (onHoverChange) onHoverChange(idx);
    else setInternalHoveredIdx(idx);
  };

  const values = useMemo(
    () => points.map((p) => Number(p[field]) || 0),
    [points, field],
  );

  const averageValue = useMemo(() => {
    if (!values.length) return null;
    const sum = values.reduce((acc, v) => acc + v, 0);
    return sum / values.length;
  }, [values]);

  const isDense = points.length > 50;

  const { dataMin, dataMax, range } = useMemo(() => {
    if (!values.length) return { dataMin: 0, dataMax: 1, range: 1 };
    const minVal = field === "Energie" ? Math.min(...values) : 0;
    const maxVal = Math.max(...values);
    const r = Math.max(0.0001, maxVal - minVal);
    return { dataMin: minVal, dataMax: maxVal, range: r };
  }, [values, field]);

  // Dimensions
  const viewBoxWidth = 600;
  const viewBoxHeight = large ? 260 : 200;
  const left = 50;
  const right = 588;
  const top = 16;
  const bottom = viewBoxHeight - 44;
  const plotWidth = right - left;
  const plotHeight = bottom - top;

  const formatVal = (v: number) => {
    if (field === "Vibratii") return `${formatVibration(v)} G`;
    if (digits === 0) return `${formatInt(v)} ${unit}`.trim();
    return `${formatDecimal(v, digits)} ${unit}`.trim();
  };

  // Coordonate X pentru fiecare punct
  const step = points.length > 1 ? plotWidth / (points.length - 1) : plotWidth;
  const getX = (idx: number) => left + idx * step;
  const getY = (val: number) => bottom - ((val - dataMin) / range) * plotHeight;

  // Polyline path pentru cazul dens (> 50 puncte)
  const linePath = useMemo(() => {
    if (!isDense || points.length === 0) return "";
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(Number(p[field]) || 0).toFixed(1)}`)
      .join(" ");
  }, [isDense, points, field, dataMin, range, step]);

  // Area path sub linie
  const areaPath = useMemo(() => {
    if (!linePath || points.length === 0) return "";
    const lastX = getX(points.length - 1).toFixed(1);
    const firstX = getX(0).toFixed(1);
    return `${linePath} L ${lastX} ${bottom} L ${firstX} ${bottom} Z`;
  }, [linePath, points.length, bottom, step]);

  const activePoint = hoveredIdx != null ? points[hoveredIdx] : null;
  const activeValue = activePoint ? Number(activePoint[field]) : null;

  // Calcul indici pentru etichetele axei X
  const tickIndices = useMemo(() => {
    if (points.length <= 1) return [0];
    if (points.length <= 3) return points.map((_, i) => i);
    return [
      0,
      Math.floor(points.length * 0.33),
      Math.floor(points.length * 0.66),
      points.length - 1,
    ];
  }, [points.length]);

  return (
    <div className="flex flex-col w-full select-none">
      {/* Readout cu înălțime fixă pentru a preveni Cumulative Layout Shift */}
      <div
        className="h-7 px-2 flex items-center justify-between text-xs text-[#53605b] border-b border-[#edf0ee] bg-[#fafbfb] rounded-t font-mono mb-1 transition-colors"
        aria-live="polite"
      >
        {activePoint && activeValue != null ? (
          <>
            <span className="font-sans font-medium text-[#121a18]">
              {formatDateTime(activePoint.DataOra)}
            </span>
            <div className="flex items-center gap-2">
              {averageValue != null && (
                <span className="text-[10px] text-[#7a8682] font-mono hidden sm:inline">
                  (Medie: {formatVal(averageValue)})
                </span>
              )}
              <span className="font-semibold text-[#121a18] bg-white px-2 py-0.5 rounded border border-[#dce3df]">
                {formatVal(activeValue)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className="text-[#889591] font-sans text-[11px] italic">
              Treceți cu cursorul peste grafic pentru inspecție detaliată
            </span>
            {averageValue != null && (
              <span className="text-[10px] font-mono font-bold text-[#a06010] bg-[#fff9ee] px-1.5 py-0.5 border border-[#f5dfbe]">
                Medie: {formatVal(averageValue)}
              </span>
            )}
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full h-auto block overflow-visible"
        role="img"
        aria-label="Grafic de telemetrie"
        onMouseLeave={() => setHovered(null)}
      >
        {/* Grilă orizontală conform ISA-101 */}
        {[0, 0.5, 1].map((ratio) => {
          const yVal = bottom - ratio * plotHeight;
          const labelVal = dataMin + range * ratio;
          return (
            <g key={ratio}>
              <line
                x1={left}
                x2={right}
                y1={yVal}
                y2={yVal}
                stroke="#dce3df"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={left - 8}
                y={yVal + 4}
                textAnchor="end"
                fill="#65716d"
                fontSize="11"
                fontFamily="var(--font-geist-mono), monospace"
              >
                {digits === 0 ? formatInt(labelVal) : formatDecimal(labelVal, digits)}
              </text>
            </g>
          );
        })}

        {/* Linie Orizontală de Referință pentru Media Perioadei / Media Zilnică */}
        {showAverageLine && averageValue != null && range > 0.0001 && (
          <g pointerEvents="none">
            <line
              x1={left}
              x2={right}
              y1={getY(averageValue)}
              y2={getY(averageValue)}
              stroke="#bd861c"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              opacity="0.9"
            />
            <rect
              x={right - 122}
              y={Math.max(top + 2, Math.min(bottom - 16, getY(averageValue) - 13))}
              width={120}
              height={14}
              fill="#fff9ee"
              stroke="#f5dfbe"
              strokeWidth="1"
              rx="2"
            />
            <text
              x={right - 62}
              y={Math.max(top + 2, Math.min(bottom - 16, getY(averageValue) - 13)) + 10}
              textAnchor="middle"
              fill="#a06010"
              fontSize="9"
              fontWeight="bold"
              fontFamily="var(--font-geist-mono), monospace"
            >
              Medie: {formatVal(averageValue)}
            </text>
          </g>
        )}

        {/* Modul DENS (> 50 puncte): Linie frântă tehnică + arie discretă */}
        {isDense ? (
          <>
            {showBand && (
              <path
                d={areaPath}
                fill={color}
                opacity="0.09"
                pointerEvents="none"
              />
            )}
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
          </>
        ) : (
          /* Modul COLOANE (<= 50 puncte): Coloane înguste, spațiere fină, fără zona deschisă deasupra */
          points.map((point, i) => {
            const val = Number(point[field]) || 0;
            const barHeight = Math.max(3, ((val - dataMin) / range) * plotHeight);
            const barWidth = Math.min(6, Math.max(3, step * 0.62));
            const xPos = points.length === 1 ? (left + right) / 2 : getX(i);
            const isHovered = hoveredIdx === i;

            return (
              <g key={`${point.DataOra}-${i}`}>
                {/* Zona activă de click/hover pe toată înălțimea graficului */}
                <rect
                  x={xPos - Math.max(barWidth, step / 2)}
                  y={top}
                  width={Math.max(barWidth * 2, step)}
                  height={plotHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHovered(i)}
                />
                {/* O singură bară solidă (eliminată zona translucidă de deasupra) */}
                <rect
                  x={xPos - barWidth / 2}
                  y={bottom - barHeight}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  opacity={isHovered ? 1 : 0.82}
                  className="transition-opacity duration-150"
                  rx="1"
                />
              </g>
            );
          })
        )}

        {/* Indicator vertical de inspecție la hover (Crosshair) */}
        {hoveredIdx != null && isDense && (
          <g pointerEvents="none">
            <line
              x1={getX(hoveredIdx)}
              x2={getX(hoveredIdx)}
              y1={top}
              y2={bottom}
              stroke="#53605b"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
            <circle
              cx={getX(hoveredIdx)}
              cy={getY(Number(points[hoveredIdx][field]) || 0)}
              r="4.5"
              fill={color}
              stroke="#ffffff"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Căutare invizibilă pentru hover în mod dens */}
        {isDense &&
          points.map((_, i) => {
            const xStart = i === 0 ? left : getX(i) - step / 2;
            const w = i === 0 || i === points.length - 1 ? step / 2 : step;
            return (
              <rect
                key={i}
                x={xStart}
                y={top}
                width={w}
                height={plotHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHovered(i)}
              />
            );
          })}

        {/* Etichete Axa X (Data / Ora) */}
        {tickIndices.map((idx, pos) => {
          const pt = points[idx];
          if (!pt) return null;
          const xPos = points.length === 1 ? (left + right) / 2 : getX(idx);
          const anchor =
            pos === 0
              ? "start"
              : pos === tickIndices.length - 1
                ? "end"
                : "middle";
          return (
            <text
              key={idx}
              x={xPos}
              y={bottom + 18}
              textAnchor={anchor}
              fill="#65716d"
              fontSize="11"
              fontFamily="var(--font-geist-mono), monospace"
            >
              <tspan x={xPos}>
                {formatDate(pt.DataOra)}
              </tspan>
              <tspan x={xPos} dy="14">
                {formatTime(pt.DataOra)}
              </tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
}
