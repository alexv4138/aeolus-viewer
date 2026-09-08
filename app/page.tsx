"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleAlert,
  Droplets,
  Download,
  Eye,
  EyeOff,
  Gauge,
  LockKeyhole,
  LogOut,
  Mouse,
  ShieldCheck,
  Thermometer,
  UserRound,
  Wind,
  Zap,
} from "lucide-react";
import {
  workbookUsers,
  type WorkbookTelemetry,
  type WorkbookUser,
} from "./fleet-data";

type Point = WorkbookTelemetry;
type SessionUser = WorkbookUser & { master: boolean };
type Turbine = {
  id: string;
  locationId: number;
  location: string;
  owner: WorkbookUser;
};
type Alert = {
  time: string;
  severity: "info" | "warning" | "critical";
  parameter: string;
  text: string;
};

const fallbackMaster: WorkbookUser = {
  locationId: 0,
  location: "Control rețea",
  role: 1,
  username: "supervisor",
  password: "northstar-26",
  name: "Elena Marin",
  phone: "",
};
const users = workbookUsers.length ? workbookUsers : [fallbackMaster];
const masterAccount = users.find((user) => user.role === 1) ?? fallbackMaster;
const operatorAccounts = users.filter((user) => user.role !== 1);
const turbines: Turbine[] = operatorAccounts.map((owner) => ({
  id: `TURBINĂ ${String(owner.locationId).padStart(2, "0")}`,
  locationId: owner.locationId,
  location: owner.location,
  owner,
}));

const defaultPoint: Point = {
  IDLocatie: 0,
  DataOra: new Date().toISOString(),
  TempC: 0,
  PresAtm: 0,
  Umiditate: 0,
  VitVant: 0,
  DirectieVant: "—",
  RadSolara: 0,
  Turatie: 0,
  Voltaj: 0,
  Amperaj: 0,
  Putere: 0,
  Energie: 0,
  Vibratii: 0,
  CupluMec: 0,
  TempInfas: 0,
  Alarma: 0,
};
const initialRecords = Object.fromEntries(
  turbines.map((turbine) => [turbine.locationId, []]),
) as Record<number, Point[]>;
function format(value: number, digits = 1) {
  return value.toLocaleString("ro-RO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(
    "ro-RO",
    { day: "2-digit", month: "short", year: "numeric" },
  );
}
function formatDateTime(value: string) {
  return `${formatDate(value)} · ${formatTime(value)}`;
}
function formatCsvDateTime(value: string) {
  const date = value.slice(0, 10).split("-").reverse().join(".");
  const time = value.slice(11, 16);
  return `${date} ${time}`;
}
function formatCsvNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? numeric.toLocaleString("ro-RO", {
        useGrouping: false,
        maximumFractionDigits: 6,
      })
    : "";
}
function formatXlsxInteger(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? String(Math.round(numeric)) : "";
}

function nextPoint(point: Point, locationId: number): Point {
  const wind = Math.max(
    1.1,
    Math.min(14, point.VitVant + (Math.random() - 0.45) * 0.5),
  );
  const power = Math.max(
    12,
    point.Putere + (wind - point.VitVant) * 24 + (Math.random() - 0.45) * 7,
  );
  return {
    ...point,
    IDLocatie: locationId,
    DataOra: new Date(new Date(point.DataOra).getTime() + 20_000).toISOString(),
    TempC: Number((point.TempC + (Math.random() - 0.47) * 0.22).toFixed(1)),
    PresAtm: Number((point.PresAtm + (Math.random() - 0.5) * 0.4).toFixed(1)),
    Umiditate: Number(
      Math.max(
        35,
        Math.min(94, point.Umiditate + (Math.random() - 0.5) * 0.8),
      ).toFixed(1),
    ),
    VitVant: Number(wind.toFixed(2)),
    RadSolara: Number(
      Math.max(0, point.RadSolara + (Math.random() - 0.5) * 6).toFixed(2),
    ),
    Turatie: Number(
      Math.max(
        0,
        point.Turatie + (wind - point.VitVant) * 13 + (Math.random() - 0.5) * 3,
      ).toFixed(2),
    ),
    Voltaj: Number((point.Voltaj + (Math.random() - 0.5) * 0.9).toFixed(2)),
    Amperaj: Number(
      Math.max(0.1, point.Amperaj + (power - point.Putere) / 50).toFixed(2),
    ),
    Putere: Number(power.toFixed(3)),
    Energie: Number((point.Energie + power / 3600).toFixed(6)),
    Vibratii: Number(
      Math.max(0.01, point.Vibratii + (Math.random() - 0.5) * 0.012).toFixed(3),
    ),
    CupluMec: Number(
      (point.CupluMec + (Math.random() - 0.5) * 0.45).toFixed(2),
    ),
    TempInfas: Number(
      (point.TempInfas + (Math.random() - 0.5) * 0.18).toFixed(2),
    ),
    Alarma: wind > 12.5 ? 1 : 0,
  };
}

function MiniBars({ points, field, color = "#18201e" }: {
  points: Point[]; field: keyof Point; color?: string; large?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const maximumBars = 24;
  const bucketCount = Math.min(maximumBars, points.length);
  const buckets = Array.from(
    { length: bucketCount },
    (_, index) => {
      const startIndex = Math.floor(index * points.length / bucketCount);
      const endIndex = Math.floor((index + 1) * points.length / bucketCount);
      const bucketPoints = points.slice(startIndex, endIndex);
      const values = bucketPoints.map((point) => Number(point[field]));
      return {
        start: bucketPoints[0],
        end: bucketPoints.at(-1)!,
        min: Math.min(...values),
        max: Math.max(...values),
        compressed: bucketPoints.length > 1,
      };
    },
  );
  const dataMin = field === "Energie" ? Math.min(...buckets.map((bucket) => bucket.min)) : 0;
  const dataMax = Math.max(...buckets.map((bucket) => bucket.max));
  const range = Math.max(0.000001, dataMax - dataMin);
  const left = 52, width = 536, top = 12, height = 168;
  const step = width / Math.max(1, buckets.length);
  const selected = active === null ? null : buckets[active];
  const ticks = [...new Set([0, Math.floor((buckets.length - 1) / 3), Math.floor(2 * (buckets.length - 1) / 3), buckets.length - 1])].filter(i => i >= 0);
  const compressed = points.length > maximumBars;
  const millisecondsPerBar = points.length > 1
    ? (new Date(points.at(-1)!.DataOra).getTime() - new Date(points[0].DataOra).getTime()) / bucketCount
    : 0;
  const axisDigits = range < 0.1 ? 3 : range < 1 ? 2 : 1;
  const approximateHours = Math.max(1, Math.round(millisecondsPerBar / 3_600_000));
  const approximateDays = Math.max(1, Math.round(millisecondsPerBar / 86_400_000));
  const intervalLabel = !compressed
    ? "fiecare citire"
    : millisecondsPerBar < 86_400_000
      ? `grupe de aproximativ ${approximateHours} ${approximateHours === 1 ? "oră" : "ore"}`
      : `grupe de aproximativ ${approximateDays} ${approximateDays === 1 ? "zi" : "zile"}`;
  return (
    <div className="telemetry-chart">
      <div className="chart-readout" aria-live="polite">
        {selected
          ? selected.compressed
            ? `${formatDateTime(selected.start.DataOra)} – ${formatDateTime(selected.end.DataOra)} · min ${format(selected.min)} · max ${format(selected.max)}`
            : `${formatDateTime(selected.start.DataOra)} · ${format(selected.max)}`
          : `${intervalLabel} · atinge o bară pentru interval și valori`}
      </div>
      <svg viewBox="0 0 600 228" className="telemetry-plot" role="img" aria-label="Grafic de telemetrie">
        {[0, 0.5, 1].map(ratio => <g key={ratio}>
          <line x1={left} x2={588} y1={top + height * (1 - ratio)} y2={top + height * (1 - ratio)} stroke="#dde4e1" />
          <text x={44} y={top + height * (1 - ratio) + 4} textAnchor="end" fill="#63706b" fontSize="12">{format(dataMin + range * ratio, axisDigits)}</text>
        </g>)}
        {buckets.map((bucket, i) => {
          const minHeight = Math.max(2, (bucket.min - dataMin) / range * height);
          const maxHeight = Math.max(minHeight, (bucket.max - dataMin) / range * height);
          const dayStart = i > 0 && new Date(bucket.start.DataOra).toDateString() !== new Date(buckets[i - 1].start.DataOra).toDateString();
          return <g key={`${bucket.start.DataOra}-${i}`} onMouseEnter={() => setActive(i)} onClick={event => { event.stopPropagation(); setActive(i); }}>
            <rect x={left + i * step} y={top} width={step} height={height} fill="transparent" />
            {dayStart && <line x1={left + i * step} x2={left + i * step} y1={top} y2={top + height} stroke={color} strokeOpacity="0.3" strokeDasharray="3 3" />}
            {bucket.compressed && <rect x={left + i * step + step * 0.12} y={top + height - maxHeight} width={step * 0.76} height={maxHeight} fill={color} opacity="0.28" />}
            <rect x={left + i * step + step * 0.12} y={top + height - minHeight} width={step * 0.76} height={minHeight} fill={color} opacity={active === i ? 1 : 0.78} />
            <title>{bucket.compressed ? `${formatDateTime(bucket.start.DataOra)} – ${formatDateTime(bucket.end.DataOra)}: min ${format(bucket.min)}, max ${format(bucket.max)}` : `${formatDateTime(bucket.start.DataOra)}: ${format(bucket.max)}`}</title>
          </g>;
        })}
        {ticks.map((i, n) => {
          const date = new Date(buckets[i].start.DataOra);
          return <text key={i} x={left + i * step + step / 2} y={201} textAnchor={n === 0 ? "start" : n === ticks.length - 1 ? "end" : "middle"} fill="#63706b" fontSize="12">
            <tspan>{date.toLocaleDateString("ro-RO", {day: "2-digit", month: "short"})}</tspan>
            <tspan x={left + i * step + step / 2} dy="17">{date.toLocaleTimeString("ro-RO", {hour: "2-digit", minute: "2-digit"})}</tspan>
          </text>;
        })}
      </svg>
      <div className="chart-detail-hint">{intervalLabel}{compressed ? " · zona deschisă = maxim, zona închisă = minim" : ""} · deschide pentru toate citirile →</div>
    </div>
  );
}

function PopupBars({
  points,
  field,
  color = "#18201e",
}: {
  points: Point[];
  field: keyof Point;
  color?: string;
}) {
  const buckets = buildPopupBuckets(points, field);
  const minimum = field === "Energie" ? Math.min(...buckets.map((bucket) => bucket.min)) : 0;
  const maximum = Math.max(...buckets.map((bucket) => bucket.max));
  const range = Math.max(0.000001, maximum - minimum);
  return (
    <div className="popup-bars">
      {buckets.map((bucket, index) => {
        const previousBucket = buckets[index - 1];
        const startsDay =
          index === 0 ||
          new Date(bucket.start.DataOra).toDateString() !==
            new Date(previousBucket.start.DataOra).toDateString();
        const period = bucket.start.DataOra === bucket.end.DataOra
          ? formatDateTime(bucket.start.DataOra)
          : `${formatDateTime(bucket.start.DataOra)}–${formatDateTime(bucket.end.DataOra)}`;
        return (
          <div
            className={`popup-bar-row ${startsDay ? "day-start" : ""}`}
            key={`${bucket.start.DataOra}-${index}`}
          >
            <span className="popup-bar-label">
              <b>{period}</b>
              <strong>{bucket.min === bucket.max ? format(bucket.max) : `${format(bucket.min)}–${format(bucket.max)}`}</strong>
            </span>
            <span className="popup-bar-track">
              <i
                style={{
                  width: `${Math.max(1, ((bucket.max - minimum) / range) * 100)}%`,
                  maxWidth: "100%",
                  backgroundColor: color,
                }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function buildPopupBuckets(points: Point[], field: keyof Point) {
  const bucketSize = Math.max(1, Math.ceil(points.length / 160));
  return Array.from(
    { length: Math.ceil(points.length / bucketSize) },
    (_, index) => {
      const group = points.slice(index * bucketSize, (index + 1) * bucketSize);
      const values = group.map((point) => Number(point[field]));
      return {
        start: group[0],
        end: group[group.length - 1],
        min: Math.min(...values),
        max: Math.max(...values),
      };
    },
  );
}
function Metric({
  icon,
  label,
  value,
  unit,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  tone: string;
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span className="metric-icon">{icon}</span>
      <div>
        <span>{label}</span>
        <strong>
          {value} <em>{unit}</em>
        </strong>
      </div>
    </div>
  );
}
function KeyStat({
  label,
  value,
  unit,
  safe,
}: {
  label: string;
  value: string;
  unit: string;
  safe?: boolean;
}) {
  return (
    <div className="key-stat">
      <span>{label}</span>
      <strong>
        {value} <em>{unit}</em>
      </strong>
      {safe && <small>Normal</small>}
    </div>
  );
}
function ChartPanel({
  label,
  sublabel,
  points,
  field,
  color,
  wide,
  onOpen,
}: {
  label: string;
  sublabel: string;
  points: Point[];
  field: keyof Point;
  color?: string;
  wide?: boolean;
  onOpen?: () => void;
}) {
  if (!points.length)
    return (
      <section className={`chart-panel chart-empty ${wide ? "wide" : ""}`}>
        <div className="chart-title">
          <strong>{label}</strong>
          <span>0 citiri</span>
        </div>
        <p>Nu există citiri pentru intervalul ales.</p>
      </section>
    );
  const values = points.map((point) => Number(point[field]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (
    <button
      type="button"
      className={`chart-panel ${wide ? "wide" : ""}`}
      onClick={onOpen}
    >
      <div className="chart-title">
        <strong>{label}</strong>
        <span>{sublabel}</span>
      </div>
      <MiniBars points={points} field={field} color={color} />
      <div className="chart-axis">
        <span>{formatDateTime(points[0].DataOra)}</span>
        <span>
          {points.length} citiri · min {format(min)} · max {format(max)}
        </span>
        <span>{formatDateTime(points.at(-1)!.DataOra)}</span>
      </div>
    </button>
  );
}

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [current, setCurrent] = useState<SessionUser | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState(
    turbines[0]?.locationId ?? 0,
  );
  const [error, setError] = useState("");
  const [records, setRecords] = useState(initialRecords);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  useEffect(() => {
    const saved = window.localStorage.getItem("urban-lentz-session");
    if (saved) {
      const account = users.find((user) => user.username === saved);
      if (account) {
        setCurrent({
          ...account,
          master: account.username === masterAccount.username,
        });
        setSelectedLocationId(
          account.locationId || turbines[0]?.locationId || 0,
        );
      }
    }
  }, []);
  useEffect(() => {
    fetch("/telemetry.json", { cache: "force-cache" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((telemetry: Point[]) => {
        const grouped = Object.fromEntries(
          turbines.map((turbine) => [
            turbine.locationId,
            telemetry
              .filter((point) => point.IDLocatie === turbine.locationId)
              .sort((a, b) => a.DataOra.localeCompare(b.DataOra)),
          ]),
        ) as Record<number, Point[]>;
        setRecords(grouped);
        setDataLoaded(true);
      })
      .catch(() => setDataLoaded(true));
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetch("/api/telemetry", { method: "POST" });
      setRecords((previous) =>
        Object.fromEntries(
          turbines.map((turbine) => {
            const history = previous[turbine.locationId] ?? [];
            return [
              turbine.locationId,
              history.length
                ? [...history, nextPoint(history.at(-1)!, turbine.locationId)]
                : history,
            ];
          }),
        ),
      );
      setLastUpdate(new Date());
    }, 20000);
    return () => window.clearInterval(timer);
  }, []);
  const selectedTurbine =
    turbines.find((turbine) => turbine.locationId === selectedLocationId) ??
    turbines[0];
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [hoursWindow, setHoursWindow] = useState(24);
  const [popup, setPopup] = useState<{
    label: string;
    field: keyof Point;
    color?: string;
  } | null>(null);
  const allPoints = [...(records[selectedTurbine?.locationId] ?? [])].sort(
    (a, b) => new Date(a.DataOra).getTime() - new Date(b.DataOra).getTime(),
  );
  const availableFrom = allPoints[0]?.DataOra.slice(0, 10) ?? "";
  const availableTo = allPoints.at(-1)?.DataOra.slice(0, 10) ?? "";
  const validRange = !fromDate || !toDate || fromDate <= toDate;
  const dateRangePoints = validRange
    ? allPoints.filter(
        (point) =>
          (!fromDate || point.DataOra.slice(0, 10) >= fromDate) &&
          (!toDate || point.DataOra.slice(0, 10) <= toDate),
      )
    : [];
  const isManualRange = Boolean(fromDate || toDate);
  const latestPointTime = Date.parse(dateRangePoints.at(-1)?.DataOra ?? "");
  const points =
    isManualRange || !Number.isFinite(latestPointTime)
      ? dateRangePoints
      : dateRangePoints.filter(
          (point) =>
            Date.parse(point.DataOra) >=
            latestPointTime - hoursWindow * 60 * 60 * 1000,
        );
  const chartPeriodLabel = isManualRange
    ? "Interval selectat"
    : `Ultimele ${hoursWindow} h`;
  const latest = allPoints.at(-1) ?? defaultPoint;
  const popupValues = popup
    ? points.map((point) => Number(point[popup.field]))
    : [];
  const popupMin = popupValues.length ? Math.min(...popupValues) : 0;
  const popupMax = popupValues.length ? Math.max(...popupValues) : 0;
  function exportData() {
    if (!points.length) return;
    const rows = [
      [
        "Turbină",
        "Locație",
        "ID locație",
        "Data/Ora",
        "Temperatură aer",
        "Presiune atmosferică",
        "Umiditate",
        "Viteză vânt",
        "Direcție vânt",
        "Radiație solară",
        "Turație",
        "Voltaj",
        "Amperaj",
        "Putere",
        "Energie",
        "Vibrații",
        "Cuplu mecanic",
        "Temperatura generator",
        "Alarmă",
      ],
      ...points.map((p) => [
        selectedTurbine.id,
        selectedTurbine.location,
        p.IDLocatie,
        formatCsvDateTime(p.DataOra),
        formatCsvNumber(p.TempC),
        formatCsvNumber(p.PresAtm),
        formatCsvNumber(p.Umiditate),
        formatCsvNumber(p.VitVant),
        p.DirectieVant,
        formatCsvNumber(p.RadSolara),
        formatCsvNumber(p.Turatie),
        formatCsvNumber(p.Voltaj),
        formatCsvNumber(p.Amperaj),
        formatCsvNumber(p.Putere),
        formatCsvNumber(p.Energie),
        formatCsvNumber(p.Vibratii),
        formatCsvNumber(p.CupluMec),
        formatCsvNumber(p.TempInfas),
        p.Alarma ? "Da" : "Nu",
      ]),
    ];
    // Keep numeric cells unquoted so Excel recognises them as numbers and
    // applies its normal right alignment (including comma decimals).
    const numericColumns = new Set([
      2, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17,
    ]);
    const csvCell = (value: unknown, column: number, header: boolean) => {
      const text = String(value ?? "");
      if (!header && numericColumns.has(column) && text !== "") return text;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const csv =
      "\uFEFFsep=;\r\n" +
      rows
        .map((row, rowIndex) =>
          row.map((value, column) => csvCell(value, column, rowIndex === 0)).join(";"),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `telemetrie-${selectedTurbine.id.toLowerCase().replaceAll(" ", "-")}-${fromDate || availableFrom}-${toDate || availableTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function exportXlsx() {
    if (!points.length) return;
    const XLSX = await import("xlsx-js-style");
    const headers = [
      "Turbină", "Locație", "ID locație", "Data/Ora", "Temperatură aer",
      "Presiune atmosferică", "Umiditate", "Viteză vânt", "Direcție vânt",
      "Radiație solară", "Turație", "Voltaj", "Amperaj", "Putere", "Energie",
      "Vibrații", "Cuplu mecanic", "Temperatura generator", "Alarmă",
    ];
    const data = [
      headers,
      ...points.map((p) => [
        selectedTurbine.id,
        selectedTurbine.location,
        formatXlsxInteger(p.IDLocatie),
        formatCsvDateTime(p.DataOra),
        formatXlsxInteger(p.TempC), formatXlsxInteger(p.PresAtm),
        formatXlsxInteger(p.Umiditate), formatXlsxInteger(p.VitVant),
        p.DirectieVant,
        formatXlsxInteger(p.RadSolara), formatXlsxInteger(p.Turatie),
        formatXlsxInteger(p.Voltaj), formatXlsxInteger(p.Amperaj),
        formatXlsxInteger(p.Putere), formatXlsxInteger(p.Energie),
        formatXlsxInteger(p.Vibratii), formatXlsxInteger(p.CupluMec),
        formatXlsxInteger(p.TempInfas),
        p.Alarma ? "Da" : "Nu",
      ]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    const numericColumns = [2, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    for (let row = 0; row < data.length; row += 1) {
      for (let column = 0; column < headers.length; column += 1) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
        if (cell) {
          if (row > 0 && numericColumns.includes(column)) {
            // Export whole values while preserving the right-aligned layout.
            cell.t = "s";
            delete cell.z;
          }
          cell.s = { alignment: { horizontal: "right" } };
        }
      }
    }
    sheet["!cols"] = headers.map((header, index) => ({
      wch: Math.min(24, Math.max(12, header.length + (index === 3 ? 5 : 2))),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Telemetrie");
    XLSX.writeFile(
      workbook,
      `telemetrie-${selectedTurbine.id.toLowerCase().replaceAll(" ", "-")}-${fromDate || availableFrom}-${toDate || availableTo}.xlsx`,
      { cellStyles: true },
    );
  }
  async function exportChartPdf() {
    if (!popup || !points.length) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const buckets = buildPopupBuckets(points, popup.field);
    const minimum = popup.field === "Energie"
      ? Math.min(...buckets.map((bucket) => bucket.min))
      : 0;
    const maximum = Math.max(...buckets.map((bucket) => bucket.max));
    const range = Math.max(0.000001, maximum - minimum);
    const rowsPerPage = 39;
    const pageWidth = 210;
    const margin = 12;
    const labelWidth = 86;
    const trackX = margin + labelWidth;
    const trackWidth = pageWidth - margin - trackX;
    const rowHeight = 6.15;
    const plain = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const hex = (popup.color ?? "#18201e").replace("#", "");
    const rgb = hex.length === 6
      ? [Number.parseInt(hex.slice(0, 2), 16), Number.parseInt(hex.slice(2, 4), 16), Number.parseInt(hex.slice(4, 6), 16)] as const
      : [24, 32, 30] as const;

    for (let pageStart = 0; pageStart < buckets.length; pageStart += rowsPerPage) {
      if (pageStart > 0) doc.addPage("a4", "portrait");
      doc.setTextColor(20, 27, 25);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(plain(popup.label), margin, 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(86, 100, 95);
      doc.text(plain(selectedTurbine.location), margin, 18);
      doc.text(
        plain(`${formatDateTime(points[0].DataOra)} - ${formatDateTime(points.at(-1)!.DataOra)}`),
        margin,
        22,
      );
      doc.text(`Min: ${format(popupMin)}   Max: ${format(popupMax)}`, pageWidth - margin, 22, { align: "right" });

      buckets.slice(pageStart, pageStart + rowsPerPage).forEach((bucket, pageIndex) => {
        const globalIndex = pageStart + pageIndex;
        const previous = buckets[globalIndex - 1];
        const startsDay = globalIndex === 0 ||
          new Date(bucket.start.DataOra).toDateString() !== new Date(previous.start.DataOra).toDateString();
        const period = bucket.start.DataOra === bucket.end.DataOra
          ? formatDateTime(bucket.start.DataOra)
          : `${formatDateTime(bucket.start.DataOra)}-${formatDateTime(bucket.end.DataOra)}`;
        const value = bucket.min === bucket.max
          ? format(bucket.max)
          : `${format(bucket.min)}-${format(bucket.max)}`;
        const y = 29 + pageIndex * rowHeight;

        if (startsDay) {
          doc.setDrawColor(37, 123, 104);
          doc.setLineWidth(0.45);
          doc.line(margin, y - 3.2, pageWidth - margin, y - 3.2);
        }
        doc.setFontSize(6.8);
        doc.setTextColor(startsDay ? 37 : 74, startsDay ? 123 : 86, startsDay ? 104 : 81);
        doc.text(plain(`${period}  ${value}`), margin, y, { maxWidth: labelWidth - 2 });
        doc.setFillColor(236, 240, 238);
        doc.rect(trackX, y - 2.4, trackWidth, 2.7, "F");
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        const width = Math.max(0.7, ((bucket.max - minimum) / range) * trackWidth);
        doc.rect(trackX, y - 2.4, Math.min(trackWidth, width), 2.7, "F");
      });
      doc.setFontSize(7);
      doc.setTextColor(120, 128, 124);
      doc.text(
        `Urban Lentz 2 - pagina ${Math.floor(pageStart / rowsPerPage) + 1}/${Math.ceil(buckets.length / rowsPerPage)}`,
        pageWidth / 2,
        290,
        { align: "center" },
      );
    }
    doc.save(`grafic-${selectedTurbine.id.toLowerCase().replaceAll(" ", "-")}-${String(popup.field).toLowerCase()}.pdf`);
  }
  const selectedAlerts: Alert[] = latest.Alarma
    ? [
        {
          time: formatTime(latest.DataOra),
          severity: "warning",
          parameter: "Viteza vântului",
          text: "Depășește pragul configurat",
        },
      ]
    : [
        {
          time: formatTime(lastUpdate.toISOString()),
          severity: "info",
          parameter: "Sistem",
          text: dataLoaded
            ? "Fără alarme active"
            : "Se încarcă istoricul importat",
        },
      ];
  const isOperational = latest.Alarma === 0;
  function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const account = users.find(
      (user) =>
        user.username.toLowerCase() === username.trim().toLowerCase() &&
        user.password === password,
    );
    if (!account) {
      setError("Verifică numele de utilizator și parola.");
      return;
    }
    const master = account.username === masterAccount.username;
    setCurrent({ ...account, master });
    window.localStorage.setItem("urban-lentz-session", account.username);
    const assigned =
      turbines.find((turbine) => turbine.locationId === account.locationId) ??
      turbines[0];
    setSelectedLocationId(assigned?.locationId ?? 0);
    setError("");
  }
  if (!current)
    return (
      <main className="login-page">
        <header className="login-topbar">
          <div className="brand">
            <Wind size={30} strokeWidth={1.35} />
            <strong>SISTEM MONITORIZARE URBAN LENTZ 2</strong>
          </div>
          <div className="login-clock">
            DATA/ORA: {lastUpdate.toLocaleDateString("ro-RO")}{" "}
            {lastUpdate.toLocaleTimeString("ro-RO", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            EET
          </div>
        </header>
        <div className="login-content">
          <section className="login-visual" aria-hidden="true">
            <video autoPlay loop muted playsInline preload="auto">
              <source src="/turbine-loop-back.mp4" type="video/mp4" />
            </video>
            <span>URBAN LENTZ 2</span>
          </section>
          <section className="login-panel">
            <form onSubmit={signIn}>
              <p className="eyebrow">ACCES SECURIZAT</p>
              <h1>BINE AI VENIT!</h1>
              <p className="login-lede">
                Accesează sistemul de monitorizare pentru turbinele eoliene
                urbane.
              </p>
              <div className="login-rule" />
              <label>
                Nume utilizator
                <span className="input-wrap">
                  <UserRound size={18} />
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    placeholder="Introdu nume utilizator"
                  />
                </span>
              </label>
              <label>
                Parolă
                <span className="input-wrap">
                  <LockKeyhole size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="Introdu parola"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((show) => !show)}
                    aria-label={
                      showPassword ? "Ascunde parola" : "Arată parola"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>
              {error && (
                <p className="form-error">
                  <CircleAlert size={15} />
                  {error}
                </p>
              )}
              <button type="submit" className="solid-button">
                <LockKeyhole size={17} />
                LOGARE <ChevronRight size={17} />
              </button>
              <p className="login-security">
                <ShieldCheck size={17} />
                Sistem securizat. Toate drepturile rezervate.
              </p>
            </form>
          </section>
        </div>
        <footer className="login-footer">
          © 2026 Urban Lentz 2 · Sistem de monitorizare turbine
        </footer>
        {popup && (
          <div
            className="chart-modal"
            role="dialog"
            onClick={() => setPopup(null)}
          >
            <div
              className="chart-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="chart-modal-close"
                onClick={() => setPopup(null)}
              >
                Închide
              </button>
              <h2>{popup.label}</h2>
              <p>
                {selectedTurbine.location} ·{" "}
                {points.length
                  ? `${formatDateTime(points[0].DataOra)} – ${formatDateTime(points.at(-1)!.DataOra)}`
                  : "Nu există citiri"}
              </p>
              <div className="chart-modal-meta">
                <span>{points.length} citiri</span>
                <span>Minim: {format(popupMin)}</span>
                <span>Maxim: {format(popupMax)}</span>
              </div>
              <MiniBars
                points={points}
                field={popup.field}
                color={popup.color}
                large
              />
            </div>
          </div>
        )}
      </main>
    );
  const title = current.master ? "Prezentare flotă" : selectedTurbine.id;
  return (
    <main className="app-shell">
      <div className="turbine-backdrop" aria-hidden="true">
        <video autoPlay loop muted playsInline preload="auto">
          <source src="/turbine-loop-back.mp4" type="video/mp4" />
        </video>
      </div>
      <header className="topbar">
        <div>
          <p className="eyebrow">URBAN LENTZ 2 / OPERAȚIUNI</p>
          <h1>{title}</h1>
        </div>
        <div className="header-meta">
          <span>
            <i className="live-dot" />
            LIVE
          </span>
          <span>
            {lastUpdate.toLocaleDateString("ro-RO")}{" "}
            {lastUpdate.toLocaleTimeString("ro-RO", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            EET
          </span>
          <button
            onClick={() => {
              window.localStorage.removeItem("urban-lentz-session");
              setCurrent(null);
            }}
            title="Deconectare"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <div className="identity-row">
        <div>
          <span className="section-label">AUTENTIFICAT</span>
          <strong>{current.name}</strong>
          <span>{current.username}</span>
        </div>
        <div>
          <span className="section-label">LOCAȚIE</span>
          <strong>
            {current.master ? "Control rețea" : selectedTurbine.location}
          </strong>
          <span>
            {current.master
              ? `${turbines.length} turbine conectate`
              : `Telefon: ${current.phone}`}
          </span>
        </div>
        <div className="system-ok">
          <Check size={16} />
          <span>Sistem operațional</span>
        </div>
      </div>
      <section className="operations-grid">
        <aside className="weather-column">
          <p className="section-label">VREME</p>
          <Metric
            tone="temperature"
            icon={<Thermometer />}
            label="Temperatura aerului"
            value={format(latest.TempC)}
            unit="°C"
          />
          <Metric
            tone="pressure"
            icon={<Gauge />}
            label="Presiune atmosferică"
            value={format(latest.PresAtm)}
            unit="hPa"
          />
          <Metric
            tone="humidity"
            icon={<Droplets />}
            label="Umiditate"
            value={format(latest.Umiditate)}
            unit="%"
          />
          <Metric
            tone="wind"
            icon={<Wind />}
            label="Viteza vântului"
            value={format(latest.VitVant)}
            unit="m/s"
          />
          <Metric
            tone="direction"
            icon={<ArrowUpRight />}
            label="Direcția vântului"
            value={latest.DirectieVant}
            unit=""
          />
          <Metric
            tone="solar"
            icon={<Zap />}
            label="Radiație solară"
            value={format(latest.RadSolara)}
            unit="W/m²"
          />
        </aside>
        <section className="main-column">
          <div className="parameter-head">
            <div className="parameter-tools">
              <p className="section-label">PARAMETRII TURBINEI</p>
              {current.master && (
                <label className="turbine-picker">
                  <span>SELECTEAZĂ TURBINA</span>
                  <select
                    value={selectedLocationId}
                    onChange={(event) =>
                      setSelectedLocationId(Number(event.target.value))
                    }
                  >
                    {turbines.map((turbine) => (
                      <option
                        key={turbine.locationId}
                        value={turbine.locationId}
                      >
                        {turbine.id} · {turbine.location}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <span className="unit-note">
              Ciclu curent • actualizare în 20 s
            </span>
          </div>
          <div className="parameter-overview">
            <div className="parameter-grid parameter-grid-full">
              <KeyStat
                label="Turație"
                value={format(latest.Turatie)}
                unit="RPM"
              />
              <KeyStat label="Voltaj" value={format(latest.Voltaj)} unit="V" />
              <KeyStat
                label="Amperaj"
                value={format(latest.Amperaj)}
                unit="A"
              />
              <KeyStat label="Putere" value={format(latest.Putere)} unit="W" />
              <KeyStat
                label="Energie"
                value={format(latest.Energie, 3)}
                unit="kWh"
              />
              <KeyStat
                label="Vibrație"
                value={format(latest.Vibratii, 2)}
                unit="G"
                safe
              />
              <KeyStat
                label="Cuplu mecanic"
                value={format(latest.CupluMec)}
                unit="Nm"
              />
              <KeyStat
                label="Temperatura generator"
                value={format(latest.TempInfas)}
                unit="°C"
              />
            </div>
          </div>
          <div className="range-toolbar">
            <div className="range-inputs">
              <label>
                De la{" "}
                <input
                  type="date"
                  min={availableFrom}
                  max={toDate || availableTo}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </label>
              <label>
                Până la{" "}
                <input
                  type="date"
                  min={fromDate || availableFrom}
                  max={availableTo}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </label>
            </div>
            <div className="hours-window">
              <span className="mouse-icon" aria-hidden="true">
                <Mouse />
                <i />
              </span>
              <label htmlFor="hours-window">
                <span>ULTIMELE</span>
                <strong>{hoursWindow} h</strong>
              </label>
              <input
                id="hours-window"
                type="range"
                min="1"
                max="24"
                value={hoursWindow}
                aria-label="Ultimele ore afișate în grafice"
                onChange={(event) => {
                  setHoursWindow(Number(event.target.value));
                  setFromDate("");
                  setToDate("");
                }}
              />
            </div>
            <div className="range-summary">
              <strong>Interval disponibil</strong>
              <span>
                {availableFrom
                  ? `${formatDate(availableFrom)} – ${formatDate(availableTo)} · ${allPoints.length} citiri`
                  : "Nu există citiri"}
              </span>
              <small>
                {allPoints.length
                  ? "Citiri importate din tabel + actualizări demonstrative"
                  : "Se încarcă citirile importate din tabel"}
              </small>
            </div>
            <button
              type="button"
              onClick={exportXlsx}
              disabled={!points.length}
            >
              Exportă XLSX pentru Excel
            </button>
            <button
              type="button"
              className="range-reset"
              disabled={!fromDate && !toDate}
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
            >
              Resetează
            </button>
          </div>
          <div className="chart-grid">
            <ChartPanel
              label="PUTERE / W"
              sublabel={chartPeriodLabel}
              points={points}
              field="Putere"
              color="#bd861c"
              onOpen={() =>
                setPopup({
                  label: "PUTERE / W",
                  field: "Putere",
                  color: "#bd861c",
                })
              }
            />
            <ChartPanel
              label="VÂNT / m/s"
              sublabel={chartPeriodLabel}
              points={points}
              field="VitVant"
              color="#257b68"
              onOpen={() =>
                setPopup({
                  label: "VÂNT / m/s",
                  field: "VitVant",
                  color: "#257b68",
                })
              }
            />
          </div>
          <ChartPanel
            label="ENERGIE / kWh"
            sublabel={`Cumulativ · ${chartPeriodLabel.toLowerCase()}`}
            points={points}
            field="Energie"
            color="#167bb8"
            wide
            onOpen={() =>
              setPopup({
                label: "ENERGIE / kWh",
                field: "Energie",
                color: "#167bb8",
              })
            }
          />
        </section>
        <aside className="alarm-column">
          <p className="section-label">STARE ȘI ALARME</p>
          <div className="status-block">
            <ShieldCheck size={32} />
            <div>
              <span>Stare turbină</span>
              <strong>{isOperational ? "OPERAȚIONALĂ" : "AVERTISMENT"}</strong>
            </div>
          </div>
          <div className="limit-row">
            <span>Protecție supraturație</span>
            <b className={isOperational ? "ok" : "warn"}>
              {isOperational ? "OK" : "VERIFICĂ"}
            </b>
          </div>
          <div className="limit-row">
            <span>Temperatura generator</span>
            <b className="warn">{format(latest.TempInfas)} °C</b>
          </div>
          <div className="alarm-list">
            <div className="list-title">
              <span>JURNAL ALARME</span>
              <span>{selectedAlerts.length} recentă</span>
            </div>
            {selectedAlerts.map((alert) => (
              <div
                className="alarm-item"
                key={`${alert.time}-${alert.parameter}`}
              >
                <div>
                  <span className={`severity ${alert.severity}`}>
                    {alert.severity === "warning"
                      ? "avertisment"
                      : alert.severity === "critical"
                        ? "critic"
                        : "info"}
                  </span>
                  <span>{alert.time}</span>
                </div>
                <strong>{alert.parameter}</strong>
                <p>{alert.text}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
      {current.master && (
        <section className="fleet-section">
          <div className="fleet-heading">
            <div>
              <p className="section-label">PANOU PRINCIPAL</p>
              <h2>Starea flotei</h2>
            </div>
            <span>
              Date importate din TabelDateTurbine.xlsx; actualizare la 20 s.
            </span>
          </div>
          <div className="fleet-table">
            <div className="fleet-row table-head">
              <span>Turbină</span>
              <span>Putere</span>
              <span>Vânt</span>
              <span>Alerte</span>
              <span>Stare</span>
            </div>
            {turbines.map((turbine) => {
              const point = records[turbine.locationId].at(-1) ?? {
                ...defaultPoint,
                IDLocatie: turbine.locationId,
              };
              return (
                <button
                  className="fleet-row fleet-row-button"
                  onClick={() => setSelectedLocationId(turbine.locationId)}
                  key={turbine.id}
                >
                  <span>
                    <strong>{turbine.id}</strong>
                    <small>{turbine.location}</small>
                  </span>
                  <span>{format(point.Putere)} W</span>
                  <span>{format(point.VitVant)} m/s</span>
                  <span className={point.Alarma ? "critical-text" : ""}>
                    {point.Alarma ? "Avertisment" : "Fără alerte"}
                  </span>
                  <span>
                    <i className="live-dot" />
                    {point.Alarma ? "Verifică" : "Operațională"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
      <footer>
        <span>Import telemetrie: ciclu de 20 de secunde</span>
        <span>
          <Activity size={14} /> Istoric permanent indexat
        </span>
        <span>© 2026 Urban Lentz 2</span>
      </footer>
      {popup && (
        <div
          className="chart-modal"
          role="dialog"
          onClick={() => setPopup(null)}
        >
          <div
            className="chart-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="chart-modal-actions">
              <button className="chart-pdf-export" onClick={exportChartPdf}>
                <Download size={15} /> Exportă grafic PDF · A4
              </button>
              <button
                className="chart-modal-close"
                onClick={() => setPopup(null)}
              >
                Închide
              </button>
            </div>
            <h2>{popup.label}</h2>
            <p>
              {selectedTurbine.location} ·{" "}
              {points.length
                ? `${formatDateTime(points[0].DataOra)} – ${formatDateTime(points.at(-1)!.DataOra)}`
                : "Nu există citiri"}
            </p>
            <div className="chart-modal-meta">
              <span>{points.length} citiri</span>
              <span>Minim: {format(popupMin)}</span>
              <span>Maxim: {format(popupMax)}</span>
            </div>
            <div className="popup-range-toolbar">
              <label>
                De la
                <input
                  type="date"
                  min={availableFrom}
                  max={toDate || availableTo}
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                />
              </label>
              <label>
                Până la
                <input
                  type="date"
                  min={fromDate || availableFrom}
                  max={availableTo}
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </label>
              <label className="popup-hours" htmlFor="popup-hours-window">
                <span>
                  Ultimele <strong>{hoursWindow} h</strong>
                </span>
                <input
                  id="popup-hours-window"
                  type="range"
                  min="1"
                  max="24"
                  value={hoursWindow}
                  onChange={(event) => {
                    setHoursWindow(Number(event.target.value));
                    setFromDate("");
                    setToDate("");
                  }}
                />
              </label>
            </div>
            <PopupBars
              points={points}
              field={popup.field}
              color={popup.color}
            />
          </div>
        </div>
      )}
    </main>
  );
}
