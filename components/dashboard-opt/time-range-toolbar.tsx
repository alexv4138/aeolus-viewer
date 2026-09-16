"use client";

import React from "react";
import { Clock, RotateCcw } from "lucide-react";
import { formatDate } from "./formatters";

interface TimeRangeToolbarProps {
  hoursWindow: number;
  onSelectHours: (hours: number) => void;
  fromDate: string;
  toDate: string;
  onFromDateChange: (val: string) => void;
  onToDateChange: (val: string) => void;
  availableFrom: string;
  availableTo: string;
  totalPointsCount: number;
  filteredPointsCount: number;
  showBand: boolean;
  onToggleBand: (val: boolean) => void;
  onReset: () => void;
}

const PRESETS = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "12h", hours: 12 },
  { label: "24h", hours: 24 },
  { label: "48h", hours: 48 },
  { label: "7z", hours: 168 },
  { label: "Tot", hours: 0 },
];

export function TimeRangeToolbar({
  hoursWindow,
  onSelectHours,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  availableFrom,
  availableTo,
  totalPointsCount,
  filteredPointsCount,
  showBand,
  onToggleBand,
  onReset,
}: TimeRangeToolbarProps) {
  const isCustomDate = Boolean(fromDate || toDate);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-[#dce3df] rounded-none text-xs text-[#121a18] shadow-xs">
      {/* Preseturi rapide de timp */}
      <div className="flex items-center gap-1">
        <span className="flex items-center gap-1 font-semibold text-[#65716d] uppercase tracking-wider text-[10px] mr-1">
          <Clock size={13} />
          Interval:
        </span>
        <div className="inline-flex rounded-none border border-[#dce3df] bg-[#fafbfb] p-0.5">
          {PRESETS.map((preset) => {
            const isActive = !isCustomDate && hoursWindow === preset.hours;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onSelectHours(preset.hours)}
                className={`px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#257b68] text-white shadow-xs"
                    : "text-[#53605b] hover:bg-[#edf3f0] hover:text-[#121a18]"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selectoare de dată personalizată */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-[11px] text-[#53605b]">
          <span>De la:</span>
          <input
            type="date"
            min={availableFrom}
            max={toDate || availableTo}
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
            className="px-2 py-1 text-xs border border-[#cfd7d3] bg-white text-[#121a18] focus:outline-none focus:border-[#257b68]"
          />
        </label>
        <label className="flex items-center gap-1 text-[11px] text-[#53605b]">
          <span>Până la:</span>
          <input
            type="date"
            min={fromDate || availableFrom}
            max={availableTo}
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
            className="px-2 py-1 text-xs border border-[#cfd7d3] bg-white text-[#121a18] focus:outline-none focus:border-[#257b68]"
          />
        </label>

        {isCustomDate && (
          <button
            type="button"
            onClick={onReset}
            title="Resetează la intervalul implicit"
            className="flex items-center gap-1 px-2 py-1 text-xs text-[#53605b] bg-[#f5f7f6] hover:bg-[#e4ece9] border border-[#dce3df] transition-colors cursor-pointer"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        )}
      </div>

      {/* Opțiuni suplimentare și indicator număr citiri */}
      <div className="flex items-center gap-4 ml-auto">
        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-[#45504c]">
          <input
            type="checkbox"
            checked={showBand}
            onChange={(e) => onToggleBand(e.target.checked)}
            className="rounded-none border-[#cfd7d3] text-[#257b68] focus:ring-0"
          />
          Bandă min–max
        </label>

        <div className="border-l border-[#dce3df] pl-3 text-[11px] text-[#65716d] font-mono">
          <strong>{filteredPointsCount}</strong>
          <span className="text-[#8e9c98]"> / {totalPointsCount} citiri</span>
          {availableFrom && (
            <span className="hidden xl:inline text-[#8e9c98] ml-2">
              ({formatDate(availableFrom)} – {formatDate(availableTo)})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
