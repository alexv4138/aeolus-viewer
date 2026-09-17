"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, Gauge, ListFilter, TrendingUp, X } from "lucide-react";
import type { WorkbookTelemetry } from "@/app/fleet-data";
import {
  formatDate,
  formatDateTime,
  formatDecimal,
  formatInt,
  formatVibration,
} from "./formatters";
import { TelemetrySvgPlot } from "./telemetry-svg-plot";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type Point = WorkbookTelemetry;

interface ChartAnalysisModalProps {
  label: string;
  field: keyof Point;
  color?: string;
  unit?: string;
  digits?: number;
  turbineName: string;
  turbineLocation: string;
  points: Point[];
  showBand: boolean;
  onClose: () => void;
  onExportExcel: () => void;
}

export function ChartAnalysisModal({
  label,
  field,
  color = "#257b68",
  unit = "",
  digits = 0,
  turbineName,
  turbineLocation,
  points,
  showBand,
  onClose,
  onExportExcel,
}: ChartAnalysisModalProps) {
  const [viewMode, setViewMode] = useState<"horizontal" | "vertical" | "powerCurve">("horizontal");
  const [hoveredScatterPoint, setHoveredScatterPoint] = useState<Point | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const exportViewRef = useRef<HTMLDivElement>(null);

  // Închidere cu Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const values = useMemo(
    () => points.map((p) => Number(p[field]) || 0),
    [points, field],
  );

  const stats = useMemo(() => {
    if (!values.length) return { min: 0, avg: 0, max: 0 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    return { min, avg, max };
  }, [values]);

  const formatVal = (v: number) => {
    if (field === "Vibratii") return `${formatVibration(v)} G`;
    if (digits === 0) return `${formatInt(v)} ${unit}`.trim();
    return `${formatDecimal(v, digits)} ${unit}`.trim();
  };

  const viewLabels = {
    horizontal: "Orizontal",
    vertical: "Jurnal vertical",
    powerCurve: "Curbă Putere P(v)",
  } as const;

  const waitForPaint = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  function drawPdfHeader(doc: jsPDF, title: string) {
    const margin = 12;
    doc.setTextColor(18, 26, 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`${label} · ${title}`, margin, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(83, 96, 91);
    doc.text(`${turbineName} · ${turbineLocation}`, margin, 18);
    doc.text(`${formatDateTime(points[0].DataOra)} – ${formatDateTime(points.at(-1)!.DataOra)} · ${points.length} citiri`, margin, 23);
  }

  function addVerticalViewToPdf(doc: jsPDF, addPage: boolean) {
    const pageHeight = 297;
    const firstRowY = 39;
    const rowHeight = 5;
    const rowsPerPage = Math.floor((pageHeight - firstRowY - 12) / rowHeight);
    const range = stats.max - stats.min || 1;

    for (let page = 0; page * rowsPerPage < points.length; page += 1) {
      if (addPage || page > 0) doc.addPage();
      drawPdfHeader(doc, viewLabels.vertical);
      doc.setDrawColor(220, 227, 223);
      doc.line(12, 31, 198, 31);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(101, 113, 109);
      doc.text("DATA & ORA", 14, 35);
      doc.text("VALOARE", 52, 35);
      doc.text("BARA RELATIVĂ", 68, 35);

      const slice = points.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
      slice.forEach((point, index) => {
        const value = Number(point[field]) || 0;
        const pct = stats.max > stats.min
          ? Math.max(2, Math.min(100, ((value - stats.min) / range) * 100))
          : 50;
        const y = firstRowY + index * rowHeight;

        doc.setFillColor(240, 244, 242);
        doc.rect(68, y - 3.1, 130, 3.4, "F");
        const rgb = color.replace("#", "").match(/.{2}/g)?.map((hex) => parseInt(hex, 16)) ?? [37, 123, 104];
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.rect(68, y - 3.1, Math.max(2, (130 * pct) / 100), 3.4, "F");

        doc.setFont("courier", "normal");
        doc.setFontSize(6.4);
        doc.setTextColor(83, 96, 91);
        doc.text(formatDateTime(point.DataOra), 14, y - 0.5);
        doc.setFont("courier", "bold");
        doc.setTextColor(18, 26, 24);
        doc.text(formatVal(value), 64, y - 0.5, { align: "right" });
      });
    }
  }

  async function addRenderedViewToPdf(doc: jsPDF, title: string, addPage: boolean) {
    const node = exportViewRef.current;
    if (!node) return;
    await waitForPaint();
    const canvas = await html2canvas(node, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });
    if (addPage) doc.addPage();
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 12;
    const imageWidth = pageWidth - margin * 2;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    const pageImageHeight = pageHeight - 38;

    for (let offset = 0, page = 0; offset < imageHeight; offset += pageImageHeight, page += 1) {
      if (page > 0) doc.addPage();
      drawPdfHeader(doc, title);
      doc.addImage(canvas.toDataURL("image/png"), "PNG", margin, 29 - offset, imageWidth, imageHeight);
    }
  }

  async function exportCurrentViewPdf() {
    if (!points.length || isExporting) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      if (viewMode === "vertical") {
        addVerticalViewToPdf(doc, false);
      } else {
        await addRenderedViewToPdf(doc, viewLabels[viewMode], false);
      }
      doc.save(`${label.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-${viewMode}.pdf`);
    } finally {
      setIsExporting(false);
    }
  }

  async function exportAllViewsPdf() {
    if (!points.length || isExporting) return;
    const initialMode = viewMode;
    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      for (const [index, mode] of (["horizontal", "vertical", "powerCurve"] as const).entries()) {
        setViewMode(mode);
        await waitForPaint();
        if (mode === "vertical") {
          addVerticalViewToPdf(doc, index > 0);
        } else {
          await addRenderedViewToPdf(doc, viewLabels[mode], index > 0);
        }
      }
      doc.save(`grafice-${turbineName.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    } finally {
      setViewMode(initialMode);
      setIsExporting(false);
    }
  }

  // Coordonate pentru Curba de Putere P(v)
  const powerCurveData = useMemo(() => {
    const maxWind = 14; // m/s
    const maxPower = 600; // W
    const left = 55;
    const right = 580;
    const top = 20;
    const bottom = 270;
    const w = right - left;
    const h = bottom - top;

    const xForWind = (v: number) => left + (Math.min(maxWind, Math.max(0, v)) / maxWind) * w;
    const yForPower = (p: number) => bottom - (Math.min(maxPower, Math.max(0, p)) / maxPower) * h;

    // Curba nominală a fabricii pentru Urban Lentz 2
    let nominalPath = "";
    for (let v = 0; v <= maxWind; v += 0.25) {
      let p = 0;
      if (v >= 2.0 && v < 8.5) {
        // Creștere cubică până la turația nominală
        p = Math.min(maxPower, 0.5 * 1.225 * 2.5 * 0.31 * Math.pow(v, 3));
      } else if (v >= 8.5 && v <= 13.5) {
        p = maxPower; // Plafonare la putere nominală
      } else if (v > 13.5) {
        p = 0; // Frână declanșată
      }
      const x = xForWind(v);
      const y = yForPower(p);
      nominalPath += `${v === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
    }

    return { maxWind, maxPower, left, right, top, bottom, w, h, xForWind, yForPower, nominalPath };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-5xl max-h-[94vh] flex flex-col border border-[#cfd7d3] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Antet pe un singur rând conform cerințelor IDEAS.md */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[#dce3df] bg-[#fcfdfe]">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[10px] font-bold text-[#65716d] uppercase tracking-wider block">
                Analiză extinsă · {turbineName}
              </span>
              <h2 className="text-lg font-bold text-[#121a18] tracking-tight m-0">
                {label}
              </h2>
            </div>

            {/* Comutator moduri avansate de analiză */}
            <div className="inline-flex rounded-none border border-[#dce3df] bg-[#f0f4f2] p-0.5 ml-3">
              <button
                type="button"
                onClick={() => setViewMode("horizontal")}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                  viewMode === "horizontal"
                    ? "bg-white text-[#121a18] shadow-xs"
                    : "text-[#53605b] hover:text-[#121a18]"
                }`}
              >
                <TrendingUp size={13} />
                Orizontal
              </button>
              <button
                type="button"
                onClick={() => setViewMode("vertical")}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                  viewMode === "vertical"
                    ? "bg-white text-[#121a18] shadow-xs"
                    : "text-[#53605b] hover:text-[#121a18]"
                }`}
              >
                <ListFilter size={13} />
                Jurnal Vertical
              </button>
              <button
                type="button"
                onClick={() => setViewMode("powerCurve")}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                  viewMode === "powerCurve"
                    ? "bg-white text-[#121a18] shadow-xs"
                    : "text-[#53605b] hover:text-[#121a18]"
                }`}
              >
                <Gauge size={13} />
                Curbă Putere P(v)
              </button>
            </div>
          </div>

          {/* Butoane acțiune grupate pe același rând */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCurrentViewPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#257b68] hover:bg-[#1f6656] disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Download size={13} />
              Exportă PDF · A4
            </button>
            <button
              type="button"
              onClick={exportAllViewsPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#1f6656] hover:bg-[#185244] disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Download size={13} />
              Toate variantele PDF
            </button>
            <button
              type="button"
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#121a18] bg-[#edf3f0] hover:bg-[#dfebe6] border border-[#dce3df] transition-colors cursor-pointer"
            >
              <FileSpreadsheet size={13} />
              Exportă Excel
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#53605b] hover:text-[#121a18] hover:bg-[#f0f4f2] transition-colors cursor-pointer border border-transparent"
              aria-label="Închide"
            >
              <X size={15} />
              Închide
            </button>
          </div>
        </div>

        {/* Bară sintetică de KPI statistici pentru selecția curentă */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#edf0ee] bg-[#f8faf9] border-b border-[#dce3df] px-4 py-2 text-xs">
          <div className="flex items-baseline gap-2 px-2">
            <span className="text-[#65716d] text-[11px]">Minim:</span>
            <strong className="font-mono font-bold text-[#121a18]">
              {formatVal(stats.min)}
            </strong>
          </div>
          <div className="flex items-baseline gap-2 px-2">
            <span className="text-[#65716d] text-[11px]">Medie:</span>
            <strong className="font-mono font-bold text-[#121a18]">
              {formatVal(stats.avg)}
            </strong>
          </div>
          <div className="flex items-baseline gap-2 px-2">
            <span className="text-[#65716d] text-[11px]">Maxim:</span>
            <strong className="font-mono font-bold text-[#121a18]">
              {formatVal(stats.max)}
            </strong>
          </div>
          <div className="flex items-baseline gap-2 px-2">
            <span className="text-[#65716d] text-[11px]">Eșantioane:</span>
            <strong className="font-mono font-bold text-[#121a18]">
              {points.length} citiri
            </strong>
            <span className="text-[10px] text-[#8e9c98] truncate">
              {turbineLocation}
            </span>
          </div>
        </div>

        {/* Conținut modal */}
        <div ref={exportViewRef} className="p-5 overflow-y-auto flex-1 bg-white">
          {points.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#65716d]">
              Nu există citiri pentru intervalul selectat.
            </div>
          ) : viewMode === "horizontal" ? (
            <div className="flex flex-col gap-2">
              <TelemetrySvgPlot
                points={points}
                field={field}
                color={color}
                unit={unit}
                digits={digits}
                showBand={showBand}
                large
              />
              <div className="flex justify-between text-[11px] text-[#7a8682] pt-2 border-t border-[#edf0ee]">
                <span>Start: {formatDateTime(points[0].DataOra)}</span>
                <span>
                  {points.length > 50
                    ? "Linie frântă tehnică continuă (>50 puncte)"
                    : "Coloane înguste de precizie (≤50 puncte)"}
                </span>
                <span>Sfârșit: {formatDateTime(points[points.length - 1].DataOra)}</span>
              </div>
            </div>
          ) : viewMode === "vertical" ? (
            /* Jurnal vertical dens cu spațiu micșorat */
            <div data-pdf-scroll className="flex flex-col max-h-[62vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-[140px_100px_1fr] text-[10px] font-bold text-[#65716d] uppercase tracking-wider pb-2 border-b border-[#dce3df] sticky top-0 bg-white z-10">
                <span>Data & Ora</span>
                <span className="text-right pr-4">Valoare</span>
                <span>Bara relativă</span>
              </div>
              {points.map((pt, i) => {
                const val = Number(pt[field]) || 0;
                const pct =
                  stats.max > stats.min
                    ? Math.max(2, Math.min(100, ((val - stats.min) / (stats.max - stats.min)) * 100))
                    : 50;

                return (
                  <div
                    key={`${pt.DataOra}-${i}`}
                    className="grid grid-cols-[140px_100px_1fr] items-center py-1 border-b border-[#edf0ee] hover:bg-[#f8faf9] text-xs transition-colors"
                  >
                    <span className="font-mono text-[11px] text-[#53605b]">
                      {formatDateTime(pt.DataOra)}
                    </span>
                    <span className="font-mono font-bold text-[#121a18] text-right pr-4">
                      {formatVal(val)}
                    </span>
                    <div className="w-full bg-[#f0f4f2] h-3.5 flex items-center">
                      <div
                        className="h-full transition-all duration-200"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Curba de Putere P(v): Scatter empiric vs Curba Nominală Urban Lentz 2 */
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between text-xs text-[#53605b] pb-2 border-b border-[#edf0ee]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-bold text-[#121a18]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#bd861c]" />
                    Puncte Telemetrice Reale (Scatter)
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-[#257b68]">
                    <span className="w-5 h-0.5 bg-[#257b68] inline-block" />
                    Curbă Nominală Fabricație (IEC 61400-12)
                  </span>
                </div>
                <span className="text-[11px] text-[#7a8682] font-mono">
                  {hoveredScatterPoint
                    ? `${formatDateTime(hoveredScatterPoint.DataOra)} · Vânt: ${formatDecimal(hoveredScatterPoint.VitVant, 1)} m/s · Putere: ${formatInt(hoveredScatterPoint.Putere)} W`
                    : "Treceți cu cursorul peste punctele de scatter pentru date specifice"}
                </span>
              </div>

              <svg viewBox="0 0 600 310" className="w-full h-auto block select-none">
                {/* Linii orizontale de grilă pentru Putere (0, 150, 300, 450, 600 W) */}
                {[0, 150, 300, 450, 600].map((p) => {
                  const y = powerCurveData.yForPower(p);
                  return (
                    <g key={p}>
                      <line
                        x1={powerCurveData.left}
                        x2={powerCurveData.right}
                        y1={y}
                        y2={y}
                        stroke="#e8eeeb"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={powerCurveData.left - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        fill="#7a8682"
                        fontSize="10"
                        fontFamily="var(--font-geist-mono)"
                      >
                        {p} W
                      </text>
                    </g>
                  );
                })}

                {/* Linii verticale de grilă pentru Viteza Vântului (0, 2, 4, 6, 8, 10, 12, 14 m/s) */}
                {[0, 2, 4, 6, 8, 10, 12, 14].map((v) => {
                  const x = powerCurveData.xForWind(v);
                  return (
                    <g key={v}>
                      <line
                        x1={x}
                        x2={x}
                        y1={powerCurveData.top}
                        y2={powerCurveData.bottom}
                        stroke="#e8eeeb"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={x}
                        y={powerCurveData.bottom + 16}
                        textAnchor="middle"
                        fill="#7a8682"
                        fontSize="10"
                        fontFamily="var(--font-geist-mono)"
                      >
                        {v} m/s
                      </text>
                    </g>
                  );
                })}

                {/* Curba nominală a turbinei Urban Lentz 2 */}
                <path
                  d={powerCurveData.nominalPath}
                  fill="none"
                  stroke="#257b68"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Punctele de telemetrie empirică */}
                {points.map((pt, i) => {
                  const x = powerCurveData.xForWind(Number(pt.VitVant) || 0);
                  const y = powerCurveData.yForPower(Number(pt.Putere) || 0);
                  const isHovered = hoveredScatterPoint === pt;

                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={isHovered ? "5" : "2.8"}
                      fill={isHovered ? "#257b68" : "#bd861c"}
                      opacity={isHovered ? 1 : 0.45}
                      stroke={isHovered ? "#ffffff" : "transparent"}
                      strokeWidth="1.5"
                      className="cursor-pointer transition-all duration-100"
                      onMouseEnter={() => setHoveredScatterPoint(pt)}
                    />
                  );
                })}
              </svg>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] p-3 bg-[#f8faf9] border border-[#edf0ee] text-[#53605b]">
                <div>
                  <strong className="text-[#121a18] block">Zona 1 (Vânt sub 2.0 m/s)</strong>
                  <span>Turație sub turația utilă de cuplare (cut-in).</span>
                </div>
                <div>
                  <strong className="text-[#121a18] block">Zona 2 (2.0 – 8.5 m/s)</strong>
                  <span>Regim optim de conversie aerodinamică (P ∝ v³).</span>
                </div>
                <div>
                  <strong className="text-[#121a18] block">Zona 3 (8.5 – 13.5 m/s)</strong>
                  <span>Limitare electronică la puterea nominală de 600 W.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
