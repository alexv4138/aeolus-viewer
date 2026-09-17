"use client";

import { useMemo, useState } from "react";
import type { WorkbookTelemetry } from "@/app/fleet-data";
import { formatDateTime, formatDecimal, formatInt } from "@/components/dashboard-opt/formatters";

type Point = WorkbookTelemetry;

export type ChartSpec = {
  label: string;
  field: keyof Point;
  color: string;
  unit: string;
  digits?: number;
};

type Sample = { point: Point; time: number; value: number; min: number; max: number; count: number };

type Props = {
  points: Point[];
  chart: ChartSpec;
  showRange?: boolean;
  compact?: boolean;
  sharedHover?: number | null;
  onSharedHover?: (index: number | null) => void;
  onActivate?: () => void;
};

const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function valueLabel(value: number, chart: ChartSpec) {
  return chart.digits ? `${formatDecimal(value, chart.digits)} ${chart.unit}` : `${formatInt(value)} ${chart.unit}`;
}

/** Caps visual density while retaining source precision for exports. */
function bucketSamples(points: Point[], chart: ChartSpec, maxSamples = 120): Sample[] {
  if (!points.length) return [];
  const timed = points
    .map((point) => ({ point, time: Date.parse(point.DataOra), value: number(point[chart.field]) }))
    .filter((sample) => Number.isFinite(sample.time));
  if (timed.length <= maxSamples) return timed.map((sample) => ({ ...sample, min: sample.value, max: sample.value, count: 1 }));
  const start = timed[0].time;
  const end = timed.at(-1)!.time;
  const width = Math.max(1, (end - start) / maxSamples);
  const groups = Array.from({ length: maxSamples }, () => [] as typeof timed);
  timed.forEach((sample) => groups[Math.min(maxSamples - 1, Math.floor((sample.time - start) / width))].push(sample));
  return groups.filter(Boolean).filter((group) => group.length).map((group) => {
    const values = group.map((sample) => sample.value);
    const last = group.at(-1)!;
    const value = chart.field === "Energie" ? last.value : values.reduce((sum, item) => sum + item, 0) / values.length;
    return { ...last, value, min: Math.min(...values), max: Math.max(...values), count: group.length };
  });
}

export function TelemetryChart({ points, chart, showRange = false, compact = false, sharedHover, onSharedHover, onActivate }: Props) {
  const [ownHover, setOwnHover] = useState<number | null>(null);
  const samples = useMemo(() => bucketSamples(points, chart), [points, chart]);
  const hovered = sharedHover === undefined ? ownHover : sharedHover;
  const height = compact ? 180 : 250;
  const left = 52;
  const right = 590;
  const top = 18;
  const bottom = height - 38;
  const active = hovered === null ? undefined : samples[hovered];
  const { min, max, start, end } = useMemo(() => {
    const extremes = samples.flatMap((sample) => showRange ? [sample.min, sample.max] : [sample.value]);
    const low = chart.field === "Energie" ? Math.min(...extremes) : Math.min(0, ...extremes);
    const high = Math.max(...extremes, low + 0.0001);
    return { min: low, max: high, start: samples[0]?.time ?? 0, end: samples.at(-1)?.time ?? 1 };
  }, [samples, showRange, chart.field]);
  const span = Math.max(1, end - start);
  const range = Math.max(0.0001, max - min);
  const x = (sample: Sample) => left + ((sample.time - start) / span) * (right - left);
  const y = (value: number) => bottom - ((value - min) / range) * (bottom - top);
  const line = samples.map((sample, index) => `${index ? "L" : "M"}${x(sample).toFixed(1)},${y(sample.value).toFixed(1)}`).join(" ");
  const setHover = (index: number | null) => { if (onSharedHover) onSharedHover(index); else setOwnHover(index); };
  const nearest = (clientX: number, element: SVGSVGElement) => {
    if (!samples.length) return null;
    const bounds = element.getBoundingClientRect();
    const targetTime = start + Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width)) * span;
    return samples.reduce((closest, sample, index) => Math.abs(sample.time - targetTime) < Math.abs(samples[closest].time - targetTime) ? index : closest, 0);
  };

  if (!samples.length) return <div className="grid min-h-44 place-items-center border border-dashed border-[#cbd6d1] text-sm text-[#56635e]">Nu există citiri pentru intervalul selectat.</div>;

  return <div className="w-full">
    <div className="mb-2 flex min-h-7 items-center justify-between gap-3 text-xs text-[#56635e]" aria-live="polite">
      <span>{active ? formatDateTime(active.point.DataOra) : `${samples.length} puncte afișate din ${points.length} citiri`}</span>
      <strong className="tabular-nums text-[#17201d]">{active ? valueLabel(active.value, chart) : `${valueLabel(min, chart)} – ${valueLabel(max, chart)}`}</strong>
    </div>
    <svg
      viewBox={`0 0 600 ${height}`}
      className="block w-full touch-none"
      role={onActivate ? "button" : "img"}
      tabIndex={onActivate ? 0 : undefined}
      aria-label={`${chart.label}. ${samples.length} puncte vizibile. ${onActivate ? "Apasă Enter pentru analiză completă." : ""}`}
      onPointerMove={(event) => setHover(nearest(event.clientX, event.currentTarget))}
      onPointerLeave={() => setHover(null)}
      onClick={onActivate}
      onKeyDown={(event) => { if (onActivate && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onActivate(); } }}
    >
      {[0, 0.5, 1].map((ratio) => {
        const value = min + range * ratio;
        const position = y(value);
        return <g key={ratio}><line x1={left} x2={right} y1={position} y2={position} stroke="#dce3df" strokeDasharray="3 3" /><text x={left - 8} y={position + 4} textAnchor="end" fontSize="11" fill="#65716d">{chart.digits ? formatDecimal(value, chart.digits) : formatInt(value)}</text></g>;
      })}
      {showRange && samples.map((sample, index) => sample.count > 1 && <line key={`range-${index}`} x1={x(sample)} x2={x(sample)} y1={y(sample.min)} y2={y(sample.max)} stroke={chart.color} strokeWidth="3" opacity="0.2" />)}
      <path d={line} fill="none" stroke={chart.color} strokeWidth={compact ? 2.5 : 3} strokeLinecap="round" strokeLinejoin="round" />
      {active && <><line x1={x(active)} x2={x(active)} y1={top} y2={bottom} stroke={chart.color} strokeDasharray="3 3" opacity="0.55" /><circle cx={x(active)} cy={y(active.value)} r="4" fill="#fff" stroke={chart.color} strokeWidth="2" /></>}
      {[0, 0.5, 1].map((ratio) => {
        const time = start + span * ratio;
        return <text key={ratio} x={left + (right - left) * ratio} y={height - 10} textAnchor={ratio === 0 ? "start" : ratio === 1 ? "end" : "middle"} fontSize="10" fill="#65716d">{new Date(time).toLocaleString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</text>;
      })}
    </svg>
    {showRange && <p className="mt-1 text-xs text-[#65716d]">Banda arată minimul–maximul doar în intervalele agregate; exportul păstrează toate citirile.</p>}
  </div>;
}
