"use client";

import React, { useMemo, useState } from "react";
import {
  Banknote,
  Calculator,
  ChevronDown,
  ChevronUp,
  Coins,
  DollarSign,
  HelpCircle,
  PiggyBank,
  TrendingUp,
  Wind,
  Zap,
} from "lucide-react";
import type { WorkbookTelemetry, WorkbookUser } from "@/app/fleet-data";
import { formatDecimal, formatEnergy, formatInt } from "./formatters";

type Point = WorkbookTelemetry;

interface Turbine {
  id: string;
  locationId: number;
  location: string;
  owner: WorkbookUser;
}

interface RoiCalculatorProps {
  selectedTurbine: Turbine;
  turbines: Turbine[];
  records: Record<number, Point[]>;
  filteredPoints?: Point[];
}

export function RoiCalculator({
  selectedTurbine,
  turbines,
  records,
  filteredPoints = [],
}: RoiCalculatorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [currency, setCurrency] = useState<"RON" | "EUR">("RON");
  const [scope, setScope] = useState<"single" | "fleet">("single");

  // Rate de schimb de referință BNR
  const EUR_TO_RON = 5.0;

  // Valori configurabile implicite în RON
  const [turbineCostRon, setTurbineCostRon] = useState(24500); // 4.900 EUR
  const [otherCostsRon, setOtherCostsRon] = useState(3500); // 700 EUR
  const [pricePerKwhRon, setPricePerKwhRon] = useState(1.3); // 1.30 lei / kWh tarif plafonat

  // Conversie în funcție de moneda selectată
  const isRon = currency === "RON";
  const currencySymbol = isRon ? "RON" : "€";
  const currencyFactor = isRon ? 1 : 1 / EUR_TO_RON;

  const currentTurbineCost = turbineCostRon * currencyFactor;
  const currentOtherCosts = otherCostsRon * currencyFactor;
  const currentPricePerKwh = pricePerKwhRon * currencyFactor;

  // Energie totală cumulată în funcție de domeniu (turbina curentă vs toată flota)
  const totalKwh = useMemo(() => {
    if (scope === "single") {
      const pts = records[selectedTurbine.locationId] ?? [];
      const latest = pts[pts.length - 1];
      return Number(latest?.Energie) || 0;
    } else {
      // Suma pe toate cele 4 turbine din flotă
      return turbines.reduce((sum, t) => {
        const pts = records[t.locationId] ?? [];
        const latest = pts[pts.length - 1];
        return sum + (Number(latest?.Energie) || 0);
      }, 0);
    }
  }, [scope, records, selectedTurbine.locationId, turbines]);

  // Calcul rată medie zilnică de generare (kWh/zi)
  const dailyKwhAvg = useMemo(() => {
    const pts =
      scope === "single"
        ? (records[selectedTurbine.locationId] ?? [])
        : Object.values(records).flat();

    if (pts.length < 2) return 3.2; // Valoare tipică nominală de rezervă

    const sorted = [...pts].sort((a, b) => a.DataOra.localeCompare(b.DataOra));
    const firstTime = new Date(sorted[0].DataOra).getTime();
    const lastTime = new Date(sorted[sorted.length - 1].DataOra).getTime();
    const totalDays = Math.max(1, (lastTime - firstTime) / (1000 * 3600 * 24));

    const firstKwh = Number(sorted[0].Energie) || 0;
    const lastKwh = Number(sorted[sorted.length - 1].Energie) || 0;
    const deltaKwh = Math.max(0.1, lastKwh - firstKwh);

    return deltaKwh / totalDays;
  }, [records, selectedTurbine.locationId, scope]);

  // Calcule financiare de bază
  const multiplier = scope === "fleet" ? turbines.length : 1;
  const totalInvestment = (currentTurbineCost + currentOtherCosts) * multiplier;
  const revenueToDate = totalKwh * currentPricePerKwh;
  const remainingCost = Math.max(0, totalInvestment - revenueToDate);
  const paybackProgress = Math.min(100, (revenueToDate / (totalInvestment || 1)) * 100);

  // Proiecție anuală și amortizare
  const annualKwhEstimate = dailyKwhAvg * 365 * multiplier;
  const annualRevenueEstimate = annualKwhEstimate * currentPricePerKwh;
  const yearsToBreakEven =
    annualRevenueEstimate > 0 ? remainingCost / annualRevenueEstimate : 99;

  const breakEvenYears = Math.floor(yearsToBreakEven);
  const breakEvenMonths = Math.round((yearsToBreakEven - breakEvenYears) * 12);

  // Proiecție la 20 de ani (durata normată de funcționare a generatorului VAWT)
  const lifetime20Revenue = annualRevenueEstimate * 20 + revenueToDate;
  const lifetime20NetProfit = lifetime20Revenue - totalInvestment;
  const roi20Years = totalInvestment > 0 ? (lifetime20NetProfit / totalInvestment) * 100 : 0;

  return (
    <div className="bg-white border border-[#dce3df] p-5 shadow-2xs transition-colors select-none">
      {/* Antetul calculatorului cu etichetă de simulare */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#dce3df]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#edf6f2] text-[#257b68] border border-[#cbe3d7]">
            <Calculator size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#121a18] uppercase tracking-wider m-0">
                Calculator R.O.I. & Amortizare Investiție
              </h2>
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#fff8eb] text-[#a06010] border border-[#f5dfbe]">
                Mod Simulare Nelive
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#edf6f2] text-[#257b68] border border-[#cbe3d7]">
                Exclusiv Admin
              </span>
            </div>
            <p className="text-[11px] text-[#65716d] mt-0.5 m-0">
              Analiză de randament financiar, venituri din generare eoliană și orizont de recuperare a costurilor.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Comutator Monedă */}
          <div className="inline-flex border border-[#dce3df] bg-[#f0f4f2] p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCurrency("RON")}
              className={`px-2 py-0.5 cursor-pointer transition-colors ${
                currency === "RON"
                  ? "bg-white text-[#121a18] shadow-2xs font-bold"
                  : "text-[#65716d] hover:text-[#121a18]"
              }`}
            >
              RON (lei)
            </button>
            <button
              type="button"
              onClick={() => setCurrency("EUR")}
              className={`px-2 py-0.5 cursor-pointer transition-colors ${
                currency === "EUR"
                  ? "bg-white text-[#121a18] shadow-2xs font-bold"
                  : "text-[#65716d] hover:text-[#121a18]"
              }`}
            >
              EUR (€)
            </button>
          </div>

          {/* Comutator Domeniu: Turbina Curentă vs Flotă */}
          <div className="inline-flex border border-[#dce3df] bg-[#f0f4f2] p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setScope("single")}
              className={`px-2 py-0.5 cursor-pointer transition-colors ${
                scope === "single"
                  ? "bg-white text-[#121a18] shadow-2xs font-bold"
                  : "text-[#65716d] hover:text-[#121a18]"
              }`}
              title={`Calculează strict pentru ${selectedTurbine.id}`}
            >
              {selectedTurbine.id.replace("TURBINĂ ", "T")} ({selectedTurbine.location.split(",")[0]})
            </button>
            <button
              type="button"
              onClick={() => setScope("fleet")}
              className={`px-2 py-0.5 cursor-pointer transition-colors ${
                scope === "fleet"
                  ? "bg-white text-[#121a18] shadow-2xs font-bold"
                  : "text-[#65716d] hover:text-[#121a18]"
              }`}
              title="Calculează agregat pentru întreaga flotă de 4 turbine"
            >
              Toată Flota (4x)
            </button>
          </div>

          {/* Buton Pliere / Depliere */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-[#65716d] hover:text-[#121a18] border border-[#dce3df] bg-white transition-colors cursor-pointer ml-1"
            aria-label={isOpen ? "Restrânge calculatorul" : "Extinde calculatorul"}
          >
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-4 flex flex-col gap-4">
          {/* Panou 4 Carduri KPI Financiare Sintetice */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Card 1: Venit Generat până în Prezent */}
            <div className="p-3 bg-[#f8faf9] border border-[#dce3df] flex flex-col justify-between">
              <span className="text-[10px] font-bold text-[#65716d] uppercase tracking-wider flex items-center gap-1">
                <Coins size={13} className="text-[#257b68]" />
                Venit Produs până în prezent
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono tabular-nums text-[#257b68]">
                  {formatDecimal(revenueToDate, 2)}
                </span>
                <span className="text-xs font-semibold text-[#65716d]">{currencySymbol}</span>
              </div>
              <span className="text-[10px] text-[#7a8682] mt-0.5 font-mono">
                din {formatEnergy(totalKwh)} kWh generați
              </span>
            </div>

            {/* Card 2: Investiție Totală */}
            <div className="p-3 bg-[#f8faf9] border border-[#dce3df] flex flex-col justify-between">
              <span className="text-[10px] font-bold text-[#65716d] uppercase tracking-wider flex items-center gap-1">
                <PiggyBank size={13} className="text-[#53605b]" />
                Investiție Totală Estimată
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono tabular-nums text-[#121a18]">
                  {formatInt(totalInvestment)}
                </span>
                <span className="text-xs font-semibold text-[#65716d]">{currencySymbol}</span>
              </div>
              <span className="text-[10px] text-[#7a8682] mt-0.5">
                Turbină + racord + avize + montaj
              </span>
            </div>

            {/* Card 3: Progres Amortizare */}
            <div className="p-3 bg-[#f8faf9] border border-[#dce3df] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#65716d] uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp size={13} className="text-[#bd861c]" />
                  Amortizare Realizată
                </span>
                <span className="text-xs font-bold font-mono text-[#a06010]">
                  {formatDecimal(paybackProgress, 1)}%
                </span>
              </div>
              {/* Bară de progres */}
              <div className="w-full h-2 bg-[#e2e8e5] rounded-none overflow-hidden my-1.5">
                <div
                  className="h-full bg-[#257b68] transition-all duration-300"
                  style={{ width: `${Math.max(1, paybackProgress)}%` }}
                />
              </div>
              <span className="text-[10px] text-[#7a8682] truncate">
                Rămas: {formatInt(remainingCost)} {currencySymbol}
              </span>
            </div>

            {/* Card 4: Orizont Amortizare */}
            <div className="p-3 bg-[#f8faf9] border border-[#dce3df] flex flex-col justify-between">
              <span className="text-[10px] font-bold text-[#65716d] uppercase tracking-wider flex items-center gap-1">
                <Zap size={13} className="text-[#367396]" />
                Orizont Amortizare (Break-Even)
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-[#121a18]">
                  ~{breakEvenYears} ani {breakEvenMonths > 0 ? `${breakEvenMonths}l` : ""}
                </span>
              </div>
              <span className="text-[10px] text-[#7a8682] mt-0.5">
                la producția medie de {formatDecimal(dailyKwhAvg * multiplier, 1)} kWh/zi
              </span>
            </div>
          </div>

          {/* Formular Parametri Financiari Configurați de Administrator */}
          <div className="p-3.5 bg-[#fbfcfc] border border-[#dce3df] grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Input 1: Cost Turbină */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#121a18] flex items-center justify-between">
                <span>Cost Achiziție & Montaj Turbină</span>
                <span className="text-[10px] text-[#7a8682] font-mono">per unitate</span>
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min={1000}
                  max={500000}
                  step={500}
                  value={Math.round(currentTurbineCost)}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setTurbineCostRon(isRon ? val : val * EUR_TO_RON);
                  }}
                  className="h-9 px-3 w-full border border-[#cfd7d3] bg-white text-xs font-mono font-bold text-[#121a18] focus:outline-none focus:border-[#257b68]"
                />
                <span className="h-9 px-3 border border-l-0 border-[#cfd7d3] bg-[#edf0ee] text-xs font-bold text-[#53605b] flex items-center">
                  {currencySymbol}
                </span>
              </div>
              <span className="text-[10px] text-[#7a8682]">
                Echipament complet Urban Lentz 2 (stâlp, invertor, rotor)
              </span>
            </div>

            {/* Input 2: Alte Costuri */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#121a18] flex items-center justify-between">
                <span>Alte Costuri până în Prezent</span>
                <span className="text-[10px] text-[#7a8682] font-mono">mentenanță / racord</span>
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min={0}
                  max={200000}
                  step={250}
                  value={Math.round(currentOtherCosts)}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setOtherCostsRon(isRon ? val : val * EUR_TO_RON);
                  }}
                  className="h-9 px-3 w-full border border-[#cfd7d3] bg-white text-xs font-mono font-bold text-[#121a18] focus:outline-none focus:border-[#257b68]"
                />
                <span className="h-9 px-3 border border-l-0 border-[#cfd7d3] bg-[#edf0ee] text-xs font-bold text-[#53605b] flex items-center">
                  {currencySymbol}
                </span>
              </div>
              <span className="text-[10px] text-[#7a8682]">
                Autorizații, cablaje, acumulatori, manoperă tehnică
              </span>
            </div>

            {/* Input 3: Preț Energie per kWh */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#121a18] flex items-center justify-between">
                <span>Preț Energie Electrică</span>
                <span className="text-[10px] text-[#7a8682] font-mono">per kWh</span>
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min={0.1}
                  max={10}
                  step={0.05}
                  value={Number(currentPricePerKwh.toFixed(2))}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setPricePerKwhRon(isRon ? val : val * EUR_TO_RON);
                  }}
                  className="h-9 px-3 w-full border border-[#cfd7d3] bg-white text-xs font-mono font-bold text-[#121a18] focus:outline-none focus:border-[#257b68]"
                />
                <span className="h-9 px-2.5 border border-l-0 border-[#cfd7d3] bg-[#edf0ee] text-[11px] font-bold text-[#53605b] flex items-center whitespace-nowrap">
                  {currencySymbol}/kWh
                </span>
              </div>
              {/* Butoane rapide de preset tarifar românesc */}
              <div className="flex gap-1.5 mt-0.5">
                <button
                  type="button"
                  onClick={() => setPricePerKwhRon(0.8)}
                  className="px-1.5 py-0.5 text-[10px] font-semibold border border-[#cfd7d3] bg-white hover:bg-[#edf6f2] text-[#1e5842] cursor-pointer"
                >
                  0,80 (Prosumator)
                </button>
                <button
                  type="button"
                  onClick={() => setPricePerKwhRon(1.3)}
                  className="px-1.5 py-0.5 text-[10px] font-semibold border border-[#cfd7d3] bg-white hover:bg-[#edf6f2] text-[#1e5842] cursor-pointer"
                >
                  1,30 (Plafonat)
                </button>
                <button
                  type="button"
                  onClick={() => setPricePerKwhRon(1.6)}
                  className="px-1.5 py-0.5 text-[10px] font-semibold border border-[#cfd7d3] bg-white hover:bg-[#edf6f2] text-[#1e5842] cursor-pointer"
                >
                  1,60 (Piață liberă)
                </button>
              </div>
            </div>
          </div>

          {/* Proiecție Financiară pe Durata Normată de Viață (20 Ani) */}
          <div className="p-3 bg-[#f8faf9] border border-[#dce3df] text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[11px] text-[#121a18] uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={14} className="text-[#257b68]" />
                Proiecție Rentabilitate Netă pe Durata de Viață (20 Ani)
              </span>
              <span className="text-[10px] font-mono text-[#65716d]">
                Rata anuală estimată: {formatInt(annualRevenueEstimate)} {currencySymbol}/an
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-[#edf0ee]">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-[#7a8682]">Orizont 5 Ani</span>
                <span className="font-mono font-bold text-[#121a18]">
                  {formatInt(annualRevenueEstimate * 5)} {currencySymbol} generați
                </span>
                <span className="text-[10px] text-[#65716d]">
                  {paybackProgress >= 100 ? "Amortizare completă atinsă" : `Recuperare: ~${formatDecimal(Math.min(100, (annualRevenueEstimate * 5 / (totalInvestment || 1)) * 100), 0)}%`}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-[#7a8682]">Orizont 10 Ani</span>
                <span className="font-mono font-bold text-[#121a18]">
                  {formatInt(annualRevenueEstimate * 10)} {currencySymbol} generați
                </span>
                <span className="text-[10px] text-[#257b68] font-semibold">
                  Profit net: +{formatInt(Math.max(0, annualRevenueEstimate * 10 - totalInvestment))} {currencySymbol}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-[#7a8682]">Durată Completă (20 Ani)</span>
                <span className="font-mono font-bold text-[#257b68]">
                  +{formatInt(lifetime20NetProfit)} {currencySymbol} profit net
                </span>
                <span className="text-[10px] text-[#257b68] font-semibold">
                  R.O.I. Total: +{formatDecimal(roi20Years, 0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
