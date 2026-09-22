"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  LockKeyhole,
  LogOut,
  Moon,
  Plus,
  ShieldCheck,
  StickyNote,
  Sun,
  UserRound,
  Wind,
} from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx-js-style";

import {
  workbookUsers,
  type WorkbookTelemetry,
  type WorkbookUser,
} from "../fleet-data";
import styles from "./optimized.module.css";
import {
  formatDate,
  formatDateTime,
  formatDecimal,
  formatEnergy,
  formatInt,
  formatTime,
  formatVibration,
} from "@/components/dashboard-opt/formatters";
import { TelemetrySvgPlot } from "@/components/dashboard-opt/telemetry-svg-plot";
import { TimeRangeToolbar } from "@/components/dashboard-opt/time-range-toolbar";
import { TurbineKpiGrid } from "@/components/dashboard-opt/turbine-kpi-grid";
import { WeatherColumn } from "@/components/dashboard-opt/weather-column";
import { AlarmColumn } from "@/components/dashboard-opt/alarm-column";
import { getDemoAlertHistory, type AlertItem } from "@/components/dashboard-opt/alert-demo";
import { ChartAnalysisModal } from "@/components/dashboard-opt/chart-analysis-modal";
import { FleetOverviewTable } from "@/components/dashboard-opt/fleet-overview-table";
import { RoiCalculator } from "@/components/dashboard-opt/roi-calculator";
import { RomaniaFleetMap } from "@/components/dashboard-opt/romania-fleet-map";
import { VersionSwitcher } from "@/components/dashboard-opt/version-switcher";
import { WindRose } from "@/components/dashboard-opt/wind-rose";

type Point = WorkbookTelemetry;
type SessionUser = WorkbookUser & { master: boolean };
type TurbineNote = {
  id: string;
  locationId: number;
  authorUsername: string;
  authorName: string;
  body: string;
  createdAt: number;
};
type Turbine = {
  id: string;
  locationId: number;
  location: string;
  owner: WorkbookUser;
};

const users = workbookUsers;
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

export default function OptimizedDashboardPage() {
  // Autentificare
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [current, setCurrent] = useState<SessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Telemetrie și stare
  const [selectedLocationId, setSelectedLocationId] = useState(
    turbines[0]?.locationId ?? 1,
  );
  const [records, setRecords] = useState(initialRecords);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Notițe
  const [notes, setNotes] = useState<TurbineNote[]>([]);
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteError, setNoteError] = useState("");

  // Filtrare timp
  const [hoursWindow, setHoursWindow] = useState(24);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showRangeBand, setShowRangeBand] = useState(false);

  // Sincronizare crosshair între grafice
  const [sharedHoveredIdx, setSharedHoveredIdx] = useState<number | null>(null);

  // Mod SCADA Întunecat (ISO 11064)
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Mod afișare flotă dispecerat
  const [fleetViewMode, setFleetViewMode] = useState<"both" | "map" | "table">("both");

  // Modal analiză extinsă
  const [activeModal, setActiveModal] = useState<{
    label: string;
    field: keyof Point;
    color: string;
    unit: string;
    digits: number;
  } | null>(null);

  // Verificare sesiune la montare
  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ user: SessionUser }>) : Promise.reject()))
      .then((data) => {
        if (data?.user) {
          setCurrent(data.user);
          setSelectedLocationId(
            data.user.master ? turbines[0]?.locationId ?? 1 : data.user.locationId,
          );
        }
      })
      .catch(() => setCurrent(null))
      .finally(() => setAuthChecked(true));
  }, []);

  // Încărcare telemetrie
  useEffect(() => {
    fetch("/telemetry.json", { cache: "force-cache" })
      .then((res) => (res.ok ? (res.json() as Promise<Point[]>) : Promise.reject()))
      .then((telemetry) => {
        const grouped = Object.fromEntries(
          turbines.map((t) => [
            t.locationId,
            telemetry
              .filter((p) => p.IDLocatie === t.locationId)
              .sort((a, b) => a.DataOra.localeCompare(b.DataOra)),
          ]),
        ) as Record<number, Point[]>;
        setRecords(grouped);

        const latestPt = telemetry.reduce<Point | null>(
          (latest, pt) =>
            !latest || pt.DataOra > latest.DataOra ? pt : latest,
          null,
        );
        if (latestPt) setLastUpdate(new Date(latestPt.DataOra));
      })
      .catch(() => undefined);
  }, []);

  const selectedTurbine =
    turbines.find((t) => t.locationId === selectedLocationId) ?? turbines[0];

  // Încărcare notițe pentru turbina selectată
  useEffect(() => {
    if (!current || !selectedLocationId) return;
    setNotesLoading(true);
    setNoteError("");
    fetch(`/api/notes?locationId=${selectedLocationId}`, { cache: "no-store" })
      .then((res) => (res.json() as Promise<{ error?: string; notes: TurbineNote[] }>))
      .then((body) => {
        if (body.error) throw new Error(body.error);
        setNotes(body.notes || []);
      })
      .catch((err) => setNoteError(err.message || "Eroare la încărcarea notițelor"))
      .finally(() => setNotesLoading(false));
  }, [current, selectedLocationId]);

  // Autentificare handler
  async function handleLogin(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { error?: string; user?: SessionUser };
      if (!res.ok || !data.user) {
        throw new Error(data.error || "Autentificare eșuată");
      }
      setCurrent(data.user);
      setSelectedLocationId(
        data.user.master ? turbines[0]?.locationId ?? 1 : data.user.locationId,
      );
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Autentificare eșuată");
    }
  }

  // Deconectare handler
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setCurrent(null);
    setNotes([]);
  }

  // Salvare notă
  async function handleSaveNote(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setNoteError("");
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: selectedLocationId,
          body: noteText.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string; note?: TurbineNote };
      if (!res.ok || !data.note) throw new Error(data.error || "Nu am putut salva nota.");
      setNotes((prev) => [data.note!, ...prev]);
      setNoteText("");
    } catch (err: unknown) {
      setNoteError(err instanceof Error ? err.message : "Eroare la salvare.");
    }
  }

  // Puncte filtrate pentru turbina curentă
  const allPoints = useMemo(() => {
    return [...(records[selectedTurbine.locationId] ?? [])].sort(
      (a, b) => new Date(a.DataOra).getTime() - new Date(b.DataOra).getTime(),
    );
  }, [records, selectedTurbine.locationId]);

  const availableFrom = allPoints[0]?.DataOra.slice(0, 10) ?? "";
  const availableTo = allPoints.at(-1)?.DataOra.slice(0, 10) ?? "";

  const filteredPoints = useMemo(() => {
    if (!allPoints.length) return [];
    const isCustom = Boolean(fromDate || toDate);

    if (isCustom) {
      return allPoints.filter(
        (p) =>
          (!fromDate || p.DataOra.slice(0, 10) >= fromDate) &&
          (!toDate || p.DataOra.slice(0, 10) <= toDate),
      );
    }

    if (hoursWindow <= 0) return allPoints;

    const latestTime = Date.parse(allPoints[allPoints.length - 1].DataOra);
    const cutoff = latestTime - hoursWindow * 3600 * 1000;
    return allPoints.filter((p) => Date.parse(p.DataOra) >= cutoff);
  }, [allPoints, fromDate, toDate, hoursWindow]);

  const latest = allPoints[allPoints.length - 1] ?? defaultPoint;

  // Alertele detectate din telemetrie rămân distincte de istoricul demonstrativ.
  const telemetryAlerts = useMemo<AlertItem[]>(() => {
    const occurredAt = latest.DataOra;
    const list: AlertItem[] = [];
    if (Number(latest.Turatie) > 120) list.push({ code: "LIVE-001", occurredAt, status: "active", severity: "critical", parameter: "Supraturație rotor", text: `Turația a atins ${formatInt(latest.Turatie)} RPM.`, action: "Activare frână și inspecție mecanică.", icon: "overspeed" });
    if (Number(latest.Vibratii) > 0.8) list.push({ code: "LIVE-003", occurredAt, status: "active", severity: "high", parameter: "Vibrații mecanice ridicate", text: `Vibrații de ${formatVibration(latest.Vibratii)} G pe axul generatorului.`, action: "Verificare echilibrare rotor și rulmenți.", icon: "vibration" });
    if (Number(latest.TempInfas) > 65) list.push({ code: "LIVE-018", occurredAt, status: "active", severity: "high", parameter: "Temperatură generator ridicată", text: `Temperatura generatorului este ${formatInt(latest.TempInfas)} °C.`, action: "Reducere putere și verificare ventilație.", icon: "temperature" });
    if (Number(latest.Voltaj) > 0 && Number(latest.Voltaj) < 24) list.push({ code: "LIVE-006", occurredAt, status: "active", severity: "critical", parameter: "Tensiune scăzută", text: `Tensiunea raportată este ${formatDecimal(latest.Voltaj, 1)} V.`, action: "Verificare alimentare și convertor.", icon: "voltage" });
    return list;
  }, [latest]);

  // Catalog demonstrativ reutilizat pentru fiecare turbină în beta.
  const alerts = useMemo(
    () => [...telemetryAlerts, ...getDemoAlertHistory(latest)].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)),
    [latest, telemetryAlerts],
  );
  // Export PDF A4
  function exportPdf(
    title: string,
    field: keyof Point,
    colorHex: string,
    unit = "",
  ) {
    if (!filteredPoints.length) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Antet Raport
    doc.setFillColor(37, 123, 104);
    doc.rect(0, 0, 210, 16, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("SISTEM MONITORIZARE URBAN LENTZ 2 · RAPORT TELEMETRIE", 14, 11);

    doc.setTextColor(18, 26, 24);
    doc.setFontSize(16);
    doc.text(title, 14, 28);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(101, 113, 109);
    doc.text(
      `Turbină: ${selectedTurbine.id} · Locație: ${selectedTurbine.location}`,
      14,
      35,
    );
    doc.text(
      `Generat la: ${new Date().toLocaleString("ro-RO")} | Interval: ${formatDateTime(filteredPoints[0].DataOra)} – ${formatDateTime(filteredPoints[filteredPoints.length - 1].DataOra)}`,
      14,
      40,
    );

    // Tabel date sumare
    const vals = filteredPoints.map((p) => Number(p[field]) || 0);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const avgVal = vals.reduce((a, b) => a + b, 0) / vals.length;

    doc.setDrawColor(220, 227, 223);
    doc.setFillColor(248, 250, 249);
    doc.rect(14, 46, 182, 14, "FD");

    doc.setTextColor(18, 26, 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(
      `Minim: ${formatDecimal(minVal, 1)} ${unit}    |    Medie: ${formatDecimal(avgVal, 1)} ${unit}    |    Maxim: ${formatDecimal(maxVal, 1)} ${unit}    |    Eșantioane: ${filteredPoints.length}`,
      18,
      55,
    );

    // Tabel de citiri recente
    doc.setFontSize(10);
    doc.text("Jurnalul ultimelor citiri înregistrate:", 14, 70);

    let startY = 76;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Nr.", 14, startY);
    doc.text("Data & Ora", 25, startY);
    doc.text(`Valoare (${unit})`, 75, startY);
    doc.text("Vânt (m/s)", 110, startY);
    doc.text("Turație (RPM)", 140, startY);
    doc.text("Stare", 175, startY);
    doc.line(14, startY + 2, 196, startY + 2);

    doc.setFont("helvetica", "normal");
    const sample = filteredPoints.slice(-30).reverse();
    sample.forEach((pt, i) => {
      startY += 6;
      if (startY > 275) return;
      doc.text(String(i + 1), 14, startY);
      doc.text(formatDateTime(pt.DataOra), 25, startY);
      doc.text(formatDecimal(Number(pt[field]), 1), 75, startY);
      doc.text(formatDecimal(pt.VitVant, 1), 110, startY);
      doc.text(formatInt(pt.Turatie), 140, startY);
      doc.text(pt.Alarma ? "Avertisment" : "Normal", 175, startY);
    });

    // Subsol
    doc.setFontSize(8);
    doc.setTextColor(130, 140, 137);
    doc.text("© 2026 Urban Lentz 2 · Document tehnic generat automat", 14, 288);

    doc.save(
      `raport-${selectedTurbine.id.toLowerCase().replace(/\s+/g, "-")}-${field.toLowerCase()}.pdf`,
    );
  }

  // Export Excel XLSX
  function exportExcel() {
    if (!filteredPoints.length) return;

    const dataRows = filteredPoints.map((p) => ({
      Turbină: selectedTurbine.id,
      Locație: selectedTurbine.location,
      "Data & Ora": formatDateTime(p.DataOra),
      "Viteză Vânt (m/s)": formatDecimal(p.VitVant, 1),
      "Direcție Vânt": p.DirectieVant,
      "Turație (RPM)": formatInt(p.Turatie),
      "Putere (W)": formatInt(p.Putere),
      "Voltaj (V)": formatInt(p.Voltaj),
      "Amperaj (A)": formatDecimal(p.Amperaj, 1),
      "Energie (kWh)": formatEnergy(p.Energie),
      "Vibrații (G)": formatVibration(p.Vibratii),
      "Cuplu Mecanic (Nm)": formatInt(p.CupluMec),
      "Temp. Generator (°C)": formatInt(p.TempInfas),
      "Temp. Aer (°C)": formatDecimal(p.TempC, 1),
      "Presiune (hPa)": formatInt(p.PresAtm),
      "Umiditate (%)": formatInt(p.Umiditate),
      "Radiație Solară (W/m²)": formatInt(p.RadSolara),
      Alarmă: p.Alarma ? "Activă" : "Fără alarme",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Telemetrie");

    XLSX.writeFile(
      workbook,
      `telemetrie-${selectedTurbine.id.toLowerCase().replace(/\s+/g, "-")}.xlsx`,
    );
  }

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f7f9f8] text-xs font-mono text-[#65716d]">
        Inițializare conexiune securizată Urban Lentz 2…
      </div>
    );
  }

  // Ecran de autentificare dacă utilizatorul nu este conectat
  if (!current) {
    return (
      <main className={styles.loginPage}>
        <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-[#dce3df]">
          <div className="flex items-center gap-3">
            <Wind className="text-[#257b68]" size={26} />
            <span className="font-bold tracking-tight text-base text-[#121a18]">
              SISTEM MONITORIZARE URBAN LENTZ 2
            </span>
          </div>
          <VersionSwitcher currentVersion="optimized" />
        </header>

        <div className="flex items-center justify-center p-4">
          <div className={styles.loginCard}>
            {/* Vizual Turbină */}
            <div className={styles.loginVisual}>
              <video autoPlay loop muted playsInline preload="auto">
                <source src="/turbine-loop-back.mp4" type="video/mp4" />
              </video>
              <div className="absolute bottom-4 left-5 text-[10px] font-bold tracking-widest text-[#7a8682] uppercase">
                Urban Lentz 2 · Eolian Urban
              </div>
            </div>

            {/* Formular de autentificare */}
            <div className="p-8 sm:p-12 flex flex-col justify-center max-w-md w-full mx-auto">
              <span className="text-[10px] font-bold tracking-widest text-[#257b68] uppercase mb-1">
                Acces Securizat HMI
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-[#121a18] mb-2">
                Bine ați venit!
              </h1>
              <p className="text-xs text-[#65716d] leading-relaxed mb-6">
                Accesați sistemul de telemetrie și supraveghere pentru turbinele eoliene urbane.
              </p>

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#121a18]">
                  <span>Nume utilizator</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="bogdan@rolix.ro sau dragospreda@yahoo.com"
                    autoComplete="username"
                    required
                    className="h-10 px-3 border border-[#cfd7d3] bg-white text-xs focus:outline-none focus:border-[#257b68]"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#121a18]">
                  <span>Parolă</span>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Introdu parola"
                      autoComplete="current-password"
                      required
                      className="h-10 px-3 pr-10 w-full border border-[#cfd7d3] bg-white text-xs focus:outline-none focus:border-[#257b68]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 text-[#7a8682] hover:text-[#121a18] p-1 cursor-pointer"
                      aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                {loginError && (
                  <div className="flex items-center gap-2 p-2.5 bg-[#fdeeee] border border-[#f8c4c4] text-[#a42b1d] text-xs">
                    <CircleAlert size={14} className="shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="h-11 mt-2 flex items-center justify-between px-4 bg-[#257b68] hover:bg-[#1e6656] text-white text-xs font-bold tracking-wide uppercase transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <LockKeyhole size={15} />
                    Logare în Sistem
                  </span>
                  <ChevronRight size={16} />
                </button>

                {/* Butoane rapide de testare pentru ușurința utilizatorului */}
                <div className="mt-4 pt-4 border-t border-[#edf0ee] flex flex-col gap-1.5 text-[11px] text-[#65716d]">
                  <span className="font-semibold text-[10px] uppercase tracking-wider text-[#7a8682]">
                    Autentificare rapidă demonstrație:
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUsername("dragospreda@yahoo.com");
                        setPassword("123");
                      }}
                      className="px-2.5 py-1 text-[11px] bg-[#f0f4f2] hover:bg-[#e2ece7] border border-[#dce3df] text-[#1e5842] font-semibold cursor-pointer"
                    >
                      Admin (Dragoș Preda)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUsername("bogdan@rolix.ro");
                        setPassword("1234");
                      }}
                      className="px-2.5 py-1 text-[11px] bg-[#f0f4f2] hover:bg-[#e2ece7] border border-[#dce3df] text-[#1e5842] font-semibold cursor-pointer"
                    >
                      Operator (Bogdan Duran)
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#7a8682] mt-4">
                  <ShieldCheck size={14} className="text-[#257b68]" />
                  <span>Sistem securizat. Criptare PBKDF2 D1.</span>
                </div>
              </form>
            </div>
          </div>
        </div>

        <footer className="text-center py-3 text-xs text-[#8e9c98] border-t border-[#dce3df] bg-white">
          © 2026 Urban Lentz 2 · Sistem de monitorizare turbine
        </footer>
      </main>
    );
  }

  // Tabloul de bord autentificat
  return (
    <main className={`${styles.optRoot} ${isDarkMode ? styles.scadaDark : ""}`}>
      {/* Video fundal cu turbina verticală (izolat, pointer-events none) */}
      <div className={styles.backdropVideo} aria-hidden="true">
        <video autoPlay loop muted playsInline preload="auto">
          <source src="/turbine-loop-back.mp4" type="video/mp4" />
        </video>
      </div>

      <div className={styles.contentContainer}>
        {/* Antetul superior */}
        <header className={styles.topbar}>
          <div className={styles.brandGroup}>
            <div className={styles.brandLogo}>
              <Wind className="text-[#257b68]" size={22} />
              <span>URBAN LENTZ 2</span>
            </div>
            <span className="text-[#c5d0cc]">/</span>
            <span className={styles.eyebrow}>Centru Operațional Telemetrie</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Comutator versiune Original vs Optimizat */}
            <VersionSwitcher currentVersion="optimized" />

            {/* Comutator Mod SCADA Întunecat (ISO 11064) */}
            <button
              type="button"
              onClick={() => setIsDarkMode((prev) => !prev)}
              title={isDarkMode ? "Comută la Modul Standard Zi" : "Comută la Modul SCADA Noapte (ISO 11064)"}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#53605b] hover:text-[#121a18] border border-[#dce3df] bg-white transition-colors cursor-pointer"
            >
              {isDarkMode ? <Sun size={14} className="text-[#dca034]" /> : <Moon size={14} className="text-[#367396]" />}
              <span className="hidden sm:inline">{isDarkMode ? "Mod Zi" : "SCADA Noapte"}</span>
            </button>

            {/* Indicator LIVE */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#edf6f2] border border-[#bfe2d1] text-[11px] font-bold text-[#257b68] font-mono">
              <span className="w-2 h-2 rounded-full bg-[#257b68] animate-pulse" />
              LIVE
            </div>

            {/* Ceas EET */}
            <span className="font-mono text-xs text-[#53605b] hidden sm:inline">
              {formatDateTime(lastUpdate)} EET
            </span>

            {/* Buton Deconectare */}
            <button
              type="button"
              onClick={handleLogout}
              title="Deconectare"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#53605b] hover:text-[#c93b2b] hover:bg-[#fdeeee] border border-[#dce3df] transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span className="hidden md:inline">Ieșire</span>
            </button>
          </div>
        </header>

        {/* Bară de identitate protejată împotriva suprapunerii (flex-wrap garantat) */}
        <section className={styles.identityBar}>
          <div className={styles.identityItem}>
            <span className={styles.identityLabel}>Autentificat</span>
            <strong className={styles.identityValue}>{current.name}</strong>
            <span className={styles.identitySub}>{current.username}</span>
          </div>

          <div className={styles.identityItem}>
            <span className={styles.identityLabel}>Rol & Locație</span>
            <strong className={styles.identityValue}>
              {current.master ? "Control Rețea (Administrator)" : selectedTurbine.location}
            </strong>
            <span className={styles.identitySub}>
              {current.master
                ? `${turbines.length} turbine conectate în flotă`
                : `Contact: ${current.phone}`}
            </span>
          </div>

          {/* Notițe buton */}
          <div className="flex flex-col gap-1 min-w-[200px] max-w-xs">
            <span className={styles.identityLabel}>Jurnal Notițe Mentenanță</span>
            <button
              type="button"
              onClick={() => setNotesOpen(!notesOpen)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#257b68] hover:text-[#1e5842] transition-colors cursor-pointer"
            >
              <StickyNote size={14} />
              <span>{notes.length ? `${notes.length} notițe înregistrate` : "Adaugă notă nouă"}</span>
              <Plus size={13} className="ml-0.5" />
            </button>
            <span className="text-[11px] text-[#7a8682] truncate">
              {notesLoading ? "Se încarcă…" : notes[0]?.body ?? "Nicio notă pentru această turbină"}
            </span>
          </div>

          {/* Selector de turbină (dacă e administrator) fără coliziune */}
          {current.master && (
            <div className="flex flex-col gap-1">
              <label htmlFor="turbine-select" className={styles.identityLabel}>
                Selectează Turbina Activă
              </label>
              <select
                id="turbine-select"
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(Number(e.target.value))}
                className="h-8 px-2.5 text-xs font-bold border border-[#aab5b0] bg-white text-[#121a18] focus:outline-none focus:border-[#257b68]"
              >
                {turbines.map((t) => (
                  <option key={t.locationId} value={t.locationId}>
                    {t.id} · {t.location}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#edf6f2] border border-[#cbe3d7] text-xs font-bold text-[#257b68]">
            <CheckCircle2 size={15} />
            <span>Sistem Operațional</span>
          </div>
        </section>

        {/* Panoul pliabil de notițe */}
        {notesOpen && (
          <section className={styles.notesPanel} aria-label="Notițele turbinei">
            <form onSubmit={handleSaveNote} className="flex flex-col gap-2">
              <label
                htmlFor="turbine-note"
                className="text-xs font-bold text-[#121a18] uppercase tracking-wide"
              >
                Notă nouă de intervenție / observație ({selectedTurbine.id})
              </label>
              <textarea
                id="turbine-note"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Exemplu: Verificat lagăr superior la 15:30. Zgomot mecanic absent..."
                className="w-full p-2.5 text-xs border border-[#cfd7d3] bg-white focus:outline-none focus:border-[#257b68]"
              />
              <div className="flex items-center justify-between">
                {noteError && (
                  <span className="text-xs text-[#c93b2b]">{noteError}</span>
                )}
                <button
                  type="submit"
                  disabled={!noteText.trim()}
                  className="ml-auto px-4 py-1.5 text-xs font-bold text-white bg-[#257b68] hover:bg-[#1e5842] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Salvează nota
                </button>
              </div>
            </form>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 border-l border-[#edf0ee] pl-4">
              <span className="text-[10px] font-bold text-[#7a8682] uppercase tracking-wider">
                Istoric Notițe Înregistrate
              </span>
              {notes.length === 0 ? (
                <span className="text-xs text-[#8e9c98] italic">
                  Nicio notă înregistrată pentru această locație.
                </span>
              ) : (
                notes.map((n) => (
                  <article
                    key={n.id}
                    className="p-2 bg-[#f8faf9] border border-[#edf0ee] text-xs flex flex-col gap-0.5"
                  >
                    <p className="m-0 text-[#121a18]">{n.body}</p>
                    <span className="text-[10px] text-[#7a8682] mt-1 font-mono">
                      {n.authorName} · {formatDateTime(n.createdAt)}
                    </span>
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {/* Grila SCADA de operațiuni pe 3 coloane */}
        <section className={styles.operationsGrid}>
          {/* Coloana 1: Condiții Meteo de Mediu & Roza Vânturilor */}
          <aside className="flex flex-col gap-4">
            <WeatherColumn latest={latest} />
            <WindRose
              points={filteredPoints}
              currentDirection={latest.DirectieVant}
              currentSpeed={Number(latest.VitVant) || 0}
            />
          </aside>

          {/* Coloana 2: Parametri Telemetrie & Grafice */}
          <div className="flex flex-col gap-4 min-w-0">
            {/* Grila celor 8 KPI principali cu micro-sparklines și tendințe dinamice */}
            <TurbineKpiGrid latest={latest} points={filteredPoints} />

            {/* Bara de control a timpului */}
            <TimeRangeToolbar
              hoursWindow={hoursWindow}
              onSelectHours={(h) => {
                setHoursWindow(h);
                setFromDate("");
                setToDate("");
              }}
              fromDate={fromDate}
              toDate={toDate}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
              availableFrom={availableFrom}
              availableTo={availableTo}
              totalPointsCount={allPoints.length}
              filteredPointsCount={filteredPoints.length}
              showBand={showRangeBand}
              onToggleBand={setShowRangeBand}
              onReset={() => {
                setHoursWindow(24);
                setFromDate("");
                setToDate("");
              }}
            />

            {/* Grilă grafice principale: Putere & Viteză cu crosshair sincronizat */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Grafic Putere */}
              <div
                role="button"
                tabIndex={0}
                className={styles.chartCard}
                onClick={() =>
                  setActiveModal({
                    label: "PUTERE ACTIVĂ / W",
                    field: "Putere",
                    color: "#bd861c",
                    unit: "W",
                    digits: 0,
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setActiveModal({
                      label: "PUTERE ACTIVĂ / W",
                      field: "Putere",
                      color: "#bd861c",
                      unit: "W",
                      digits: 0,
                    });
                  }
                }}
              >
                <div className={styles.chartHeader}>
                  <div>
                    <strong className={styles.chartTitle}>PUTERE ACTIVĂ / W</strong>
                    <span className="text-[11px] text-[#7a8682] ml-2 font-mono">
                      {filteredPoints.length} citiri
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportPdf("PUTERE ACTIVĂ / W", "Putere", "#bd861c", "W");
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-[#1e5842] bg-[#edf6f2] hover:bg-[#d8ece2] border border-[#cbe3d7] transition-colors cursor-pointer"
                    >
                      <Download size={11} /> PDF
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportExcel();
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-[#53605b] bg-[#f0f4f2] hover:bg-[#e2ece7] border border-[#dce3df] transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet size={11} /> Excel
                    </button>
                  </div>
                </div>
                <TelemetrySvgPlot
                  points={filteredPoints}
                  field="Putere"
                  color="#bd861c"
                  unit="W"
                  digits={0}
                  showBand={showRangeBand}
                  alerts={alerts}
                  sharedHoveredIdx={sharedHoveredIdx}
                  onHoverChange={setSharedHoveredIdx}
                />
              </div>

              {/* Grafic Viteză Vânt */}
              <div
                role="button"
                tabIndex={0}
                className={styles.chartCard}
                onClick={() =>
                  setActiveModal({
                    label: "VITEZĂ VÂNT / m/s",
                    field: "VitVant",
                    color: "#257b68",
                    unit: "m/s",
                    digits: 1,
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setActiveModal({
                      label: "VITEZĂ VÂNT / m/s",
                      field: "VitVant",
                      color: "#257b68",
                      unit: "m/s",
                      digits: 1,
                    });
                  }
                }}
              >
                <div className={styles.chartHeader}>
                  <div>
                    <strong className={styles.chartTitle}>VITEZĂ VÂNT / m/s</strong>
                    <span className="text-[11px] text-[#7a8682] ml-2 font-mono">
                      {filteredPoints.length} citiri
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportPdf("VITEZĂ VÂNT / m/s", "VitVant", "#257b68", "m/s");
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-[#1e5842] bg-[#edf6f2] hover:bg-[#d8ece2] border border-[#cbe3d7] transition-colors cursor-pointer"
                    >
                      <Download size={11} /> PDF
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportExcel();
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-[#53605b] bg-[#f0f4f2] hover:bg-[#e2ece7] border border-[#dce3df] transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet size={11} /> Excel
                    </button>
                  </div>
                </div>
                <TelemetrySvgPlot
                  points={filteredPoints}
                  field="VitVant"
                  color="#257b68"
                  unit="m/s"
                  digits={1}
                  showBand={showRangeBand}
                  alerts={alerts}
                  sharedHoveredIdx={sharedHoveredIdx}
                  onHoverChange={setSharedHoveredIdx}
                />
              </div>
            </div>

            {/* Grafic Energie Cumulată pe toată lățimea */}
            <div
              role="button"
              tabIndex={0}
              className={styles.chartCard}
              onClick={() =>
                setActiveModal({
                  label: "ENERGIE CUMULATĂ / kWh",
                  field: "Energie",
                  color: "#167bb8",
                  unit: "kWh",
                  digits: 1,
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setActiveModal({
                    label: "ENERGIE CUMULATĂ / kWh",
                    field: "Energie",
                    color: "#167bb8",
                    unit: "kWh",
                    digits: 1,
                  });
                }
              }}
            >
              <div className={styles.chartHeader}>
                <div>
                  <strong className={styles.chartTitle}>ENERGIE CUMULATĂ / kWh</strong>
                  <span className="text-[11px] text-[#7a8682] ml-2 font-mono">
                    Progresie integrată pe interval
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportPdf("ENERGIE CUMULATĂ / kWh", "Energie", "#167bb8", "kWh");
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-[#1e5842] bg-[#edf6f2] hover:bg-[#d8ece2] border border-[#cbe3d7] transition-colors cursor-pointer"
                  >
                    <Download size={11} /> PDF
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportExcel();
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-[#53605b] bg-[#f0f4f2] hover:bg-[#e2ece7] border border-[#dce3df] transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet size={11} /> Excel
                  </button>
                </div>
              </div>
              <TelemetrySvgPlot
                points={filteredPoints}
                field="Energie"
                color="#167bb8"
                unit="kWh"
                digits={1}
                showBand={showRangeBand}
                alerts={alerts}
                sharedHoveredIdx={sharedHoveredIdx}
                onHoverChange={setSharedHoveredIdx}
              />
            </div>
          </div>

          {/* Coloana 3: Stare & Alarme conform ISA-18.2 */}
          <aside className="flex flex-col gap-4">
            <AlarmColumn latest={latest} alerts={alerts} turbineName={selectedTurbine.id} turbineLocation={selectedTurbine.location} />
          </aside>
        </section>

        {/* Secțiunea Financiară & Dispecerat Flotă pentru Administrator */}
        {current.master && (
          <>
            {/* Calculator R.O.I. & Amortizare Investiție (Simulare Nelive) */}
            <section className="mt-6">
              <RoiCalculator
                selectedTurbine={selectedTurbine}
                turbines={turbines}
                records={records}
                filteredPoints={filteredPoints}
              />
            </section>

            <section className="mt-6 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#dce3df]">
                <div>
                  <span className="text-[10px] font-bold text-[#65716d] uppercase tracking-wider block">
                    Dispecerat Național SCADA
                  </span>
                <h2 className="text-base font-bold text-[#121a18] tracking-tight m-0">
                  Topologie Flotă România & Parametri Agregați
                </h2>
              </div>

              <div className="inline-flex rounded-none border border-[#dce3df] bg-[#f0f4f2] p-0.5">
                <button
                  type="button"
                  onClick={() => setFleetViewMode("both")}
                  className={`px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                    fleetViewMode === "both"
                      ? "bg-white text-[#121a18] shadow-2xs font-bold"
                      : "text-[#53605b] hover:text-[#121a18]"
                  }`}
                >
                  Panou Integrat (Hartă + Tabel)
                </button>
                <button
                  type="button"
                  onClick={() => setFleetViewMode("map")}
                  className={`px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                    fleetViewMode === "map"
                      ? "bg-white text-[#121a18] shadow-2xs font-bold"
                      : "text-[#53605b] hover:text-[#121a18]"
                  }`}
                >
                  Harta României
                </button>
                <button
                  type="button"
                  onClick={() => setFleetViewMode("table")}
                  className={`px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                    fleetViewMode === "table"
                      ? "bg-white text-[#121a18] shadow-2xs font-bold"
                      : "text-[#53605b] hover:text-[#121a18]"
                  }`}
                >
                  Tabel Parametri
                </button>
              </div>
            </div>

            {(fleetViewMode === "both" || fleetViewMode === "map") && (
              <RomaniaFleetMap
                turbines={turbines}
                selectedLocationId={selectedLocationId}
                onSelectLocation={setSelectedLocationId}
                records={records}
              />
            )}

            {(fleetViewMode === "both" || fleetViewMode === "table") && (
              <FleetOverviewTable
                turbines={turbines}
                selectedLocationId={selectedLocationId}
                onSelectLocation={setSelectedLocationId}
                records={records}
              />
            )}
          </section>
        </>
      )}

        {/* Subsol tehnic discret */}
        <footer className="mt-8 pt-4 border-t border-[#dce3df] flex flex-wrap items-center justify-between gap-4 text-xs text-[#7a8682]">
          <div className="flex items-center gap-4">
            <span>Import telemetrie: cadență uniformizată</span>
            <span className="flex items-center gap-1">
              <Activity size={13} className="text-[#257b68]" />
              Istoric indexat D1 & SQLite
            </span>
          </div>
          <div>© 2026 Urban Lentz 2 · Monitorizare Turbine Eoliene Urbane</div>
        </footer>
      </div>

      {/* Modal Analiză Extinsă (dacă este deschis) */}
      {activeModal && (
        <ChartAnalysisModal
          label={activeModal.label}
          field={activeModal.field}
          color={activeModal.color}
          unit={activeModal.unit}
          digits={activeModal.digits}
          turbineName={selectedTurbine.id}
          turbineLocation={selectedTurbine.location}
          points={filteredPoints}
          showBand={showRangeBand}
          alerts={alerts}
          onClose={() => setActiveModal(null)}
          onExportExcel={exportExcel}
        />
      )}
    </main>
  );
}

