"use client";

import React, { useState } from "react";
import { Compass, MapPin, Navigation, Radio, Wind } from "lucide-react";
import type { WorkbookTelemetry, WorkbookUser } from "@/app/fleet-data";
import { formatDecimal, formatInt } from "./formatters";
import { ROMANIA_COUNTIES, ROMANIA_VIEWBOX } from "./romania-map-data";

type Point = WorkbookTelemetry;

interface Turbine {
  id: string;
  locationId: number;
  location: string;
  owner: WorkbookUser;
}

interface RomaniaFleetMapProps {
  turbines: Turbine[];
  selectedLocationId: number;
  onSelectLocation: (id: number) => void;
  records: Record<number, Point[]>;
}

// Coordonate cartografice exacte calibrate pe proiecția județelor României (viewBox 0 0 613 433)
const SITES_GEO: Record<
  number,
  {
    name: string;
    county: string;
    countyId: string;
    x: number;
    y: number;
    badgeDx: number;
    badgeDy: number;
  }
> = {
  1: {
    name: "Fundeni",
    county: "Călărași",
    countyId: "ro-cl",
    x: 405,
    y: 365,
    badgeDx: -98,
    badgeDy: -14,
  },
  2: {
    name: "Frânceni",
    county: "Constanța",
    countyId: "ro-ct",
    x: 505,
    y: 370,
    badgeDx: -30,
    badgeDy: -40,
  },
  3: {
    name: "Bușteni",
    county: "Prahova",
    countyId: "ro-ph",
    x: 355,
    y: 275,
    badgeDx: 14,
    badgeDy: -16,
  },
  4: {
    name: "Feldioara",
    county: "Sibiu",
    countyId: "ro-sb",
    x: 270,
    y: 225,
    badgeDx: -98,
    badgeDy: -20,
  },
};

// Conversie direcție vânt în grade (N = 0°, E = 90°, S = 180°, V = 270°)
const DIR_TO_DEG: Record<string, number> = {
  N: 0,
  NNE: 22.5,
  NE: 45,
  ENE: 67.5,
  E: 90,
  ESE: 112.5,
  SE: 135,
  SSE: 157.5,
  S: 180,
  SSV: 202.5,
  SV: 225,
  VSV: 247.5,
  V: 270,
  VNV: 292.5,
  NV: 315,
  NNV: 337.5,
};

export function RomaniaFleetMap({
  turbines,
  selectedLocationId,
  onSelectLocation,
  records,
}: RomaniaFleetMapProps) {
  const [hoveredLocationId, setHoveredLocationId] = useState<number | null>(null);

  // Set de județe gazdă ale flotei de turbine
  const hostCountyIds = new Set(Object.values(SITES_GEO).map((s) => s.countyId));
  const activeGeo = SITES_GEO[selectedLocationId];

  return (
    <div className="bg-white border border-[#dce3df] p-5 shadow-2xs select-none">
      {/*Antet tehnic SCADA */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#dce3df] mb-3 gap-2">
        <div>
          <span className="text-[10px] font-bold text-[#65716d] uppercase tracking-wider block">
            Topologie Geografică & Rețea Dispecerat
          </span>
          <h2 className="text-base font-bold text-[#121a18] tracking-tight m-0 flex items-center gap-1.5">
            <MapPin size={16} className="text-[#257b68]" />
            Amplasare Flotă & Vectori Live de Vânt · România
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] font-mono text-[#257b68] bg-[#f0f8f5] px-2 py-0.5 border border-[#d2e8de]">
            <Radio size={12} className="animate-pulse" /> Rețea Activă (4 Situri)
          </span>
        </div>
      </div>

      {/*Cadru Canvas Hartă */}
      <div className="relative w-full overflow-hidden bg-[#fafcfb] border border-[#edf0ee] p-2 flex items-center justify-center map-canvas">
        <svg
          viewBox="0 0 635 440"
          className="w-full max-w-5xl h-auto block overflow-visible"
        >
          <defs>
            {/*Model caroiaj cartezian milimetric */}
            <pattern
              id="scadaGridPattern"
              width="25"
              height="25"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 25 0 L 0 0 0 25"
                fill="none"
                stroke="#edf3f0"
                strokeWidth="0.5"
              />
            </pattern>

            {/*Zonă Marea Neagră cu valuri stilizate */}
            <pattern
              id="blackSeaPattern"
              width="16"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 0 4 Q 4 1, 8 4 T 16 4"
                fill="none"
                stroke="#cbe0eb"
                strokeWidth="0.8"
                opacity="0.6"
              />
            </pattern>
          </defs>

          {/*Grilă de fundal */}
          <rect
            x="0"
            y="0"
            width="635"
            height="440"
            fill="url(#scadaGridPattern)"
          />

          {/*Marea Neagră (fond și zonă costieră) */}
          <rect
            x="545"
            y="260"
            width="90"
            height="180"
            fill="#eaf4f9"
            className="map-sea"
            opacity="0.75"
          />
          <rect
            x="545"
            y="260"
            width="90"
            height="180"
            fill="url(#blackSeaPattern)"
          />
          <text
            x="590"
            y="350"
            fill="#6d95ab"
            fontSize="9"
            fontWeight="bold"
            fontFamily="var(--font-geist-mono), monospace"
            textAnchor="middle"
            letterSpacing="2"
          >
            MAREA NEAGRĂ
          </text>

          {/*Țări vecine indicate subtil pentru orientare clară */}
          <text
            x="35"
            y="130"
            fill="#a6b5af"
            fontSize="9"
            fontWeight="bold"
            fontFamily="var(--font-geist-mono), monospace"
            letterSpacing="1.5"
          >
            UNGARIA
          </text>
          <text
            x="240"
            y="25"
            fill="#a6b5af"
            fontSize="9"
            fontWeight="bold"
            fontFamily="var(--font-geist-mono), monospace"
            letterSpacing="1.5"
          >
            UCRAINA
          </text>
          <text
            x="510"
            y="110"
            fill="#a6b5af"
            fontSize="9"
            fontWeight="bold"
            fontFamily="var(--font-geist-mono), monospace"
            letterSpacing="1.5"
          >
            R. MOLDOVA
          </text>
          <text
            x="55"
            y="355"
            fill="#a6b5af"
            fontSize="9"
            fontWeight="bold"
            fontFamily="var(--font-geist-mono), monospace"
            letterSpacing="1.5"
          >
            SERBIA
          </text>
          <text
            x="330"
            y="428"
            fill="#a6b5af"
            fontSize="9"
            fontWeight="bold"
            fontFamily="var(--font-geist-mono), monospace"
            letterSpacing="1.5"
          >
            BULGARIA
          </text>

          {/*Traseul Dunării (granița sudică) */}
          <path
            d="M 175 390 Q 230 380 290 405 T 390 405 T 450 395 T 520 385 L 545 350"
            fill="none"
            stroke="#9ec6dc"
            strokeWidth="1.8"
            strokeDasharray="4 2"
            opacity="0.85"
          />

          {/*Randare oficială a tuturor celor 42 de județe din România */}
          <g id="romania-counties" className="transition-all duration-200">
            {ROMANIA_COUNTIES.map((county) => {
              const isHost = hostCountyIds.has(county.id);
              const isActiveCounty = activeGeo?.countyId === county.id;

              let fill = "#edf3f0";
              let stroke = "#cbd8d3";
              let strokeWidth = "0.75";

              if (isActiveCounty) {
                fill = "#d4ece0";
                stroke = "#257b68";
                strokeWidth = "1.5";
              } else if (isHost) {
                fill = "#e0ede6";
                stroke = "#9abeb0";
                strokeWidth = "1";
              }

              return (
                <path
                  key={county.id}
                  id={county.id}
                  d={county.path}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                  className={`transition-colors duration-150 map-county ${
                    isHost ? "map-county-host" : ""
                  } ${isActiveCounty ? "map-county-active" : ""}`}
                >
                  <title>{county.name}</title>
                </path>
              );
            })}
          </g>

          {/*Rețea WAN / Mesh SCADA între cele 4 turbine */}
          <polyline
            points="270,225 355,275 405,365 505,370"
            fill="none"
            stroke="#257b68"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            opacity="0.4"
          />

          {/*Trandafirul Vânturilor / Busolă Tehnică Nord */}
          <g transform="translate(585, 45)">
            <circle
              cx="0"
              cy="0"
              r="18"
              fill="#ffffff"
              stroke="#cfd7d3"
              strokeWidth="1"
            />
            {/*Linii cadran */}
            <line x1="0" y1="-14" x2="0" y2="14" stroke="#e0e6e3" strokeWidth="0.8" />
            <line x1="-14" y1="0" x2="14" y2="0" stroke="#e0e6e3" strokeWidth="0.8" />
            {/*Săgeată Nord */}
            <polygon points="0,-13 -4,-1 0,-4" fill="#c93b2b" />
            <polygon points="0,-13 4,-1 0,-4" fill="#8f2317" />
            {/*Săgeată Sud */}
            <polygon points="0,13 -4,1 0,4" fill="#7a8682" />
            <polygon points="0,13 4,1 0,4" fill="#53605b" />
            <text
              x="0"
              y="-17"
              fill="#121a18"
              fontSize="8"
              fontWeight="bold"
              fontFamily="var(--font-geist-mono)"
              textAnchor="middle"
            >
              N
            </text>
          </g>

          {/*Scară Cartografică tehnică */}
          <g transform="translate(35, 415)">
            <line x1="0" y1="0" x2="60" y2="0" stroke="#65716d" strokeWidth="1.5" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="#65716d" strokeWidth="1" />
            <line x1="30" y1="-2" x2="30" y2="2" stroke="#65716d" strokeWidth="0.8" />
            <line x1="60" y1="-3" x2="60" y2="3" stroke="#65716d" strokeWidth="1" />
            <text
              x="0"
              y="-5"
              fill="#65716d"
              fontSize="7.5"
              fontFamily="var(--font-geist-mono)"
            >
              0
            </text>
            <text
              x="60"
              y="-5"
              fill="#65716d"
              fontSize="7.5"
              fontFamily="var(--font-geist-mono)"
              textAnchor="end"
            >
              100 km
            </text>
          </g>

          {/*Randare Situri Flotă & Vectori Live de Vânt */}
          {/*Randare Situri Flotă & Vectori Live de Vânt */}
          {[...turbines]
            .sort((a, b) => {
              if (a.locationId === hoveredLocationId) return 1;
              if (b.locationId === hoveredLocationId) return -1;
              if (a.locationId === selectedLocationId) return 1;
              if (b.locationId === selectedLocationId) return -1;
              return 0;
            })
            .map((turb) => {
            const geo =
              SITES_GEO[turb.locationId] ?? {
                name: turb.id,
                county: "",
                countyId: "",
                x: 300,
                y: 200,
                badgeDx: 14,
                badgeDy: -28,
              };
            const isSelected = turb.locationId === selectedLocationId;
            const isHovered = turb.locationId === hoveredLocationId;
            const pts = records[turb.locationId] ?? [];
            const latest = pts[pts.length - 1];
            const hasAlarm = Boolean(latest?.Alarma);
            const windDir = latest?.DirectieVant || "VSV";
            const windSpeed = Number(latest?.VitVant) || 0;
            const power = Number(latest?.Putere) || 0;
            const angle = DIR_TO_DEG[windDir] ?? 247.5;

            return (
              <g
                key={turb.id}
                className="cursor-pointer transition-all group"
                onClick={() => onSelectLocation(turb.locationId)}
                onMouseEnter={() => setHoveredLocationId(turb.locationId)}
                onMouseLeave={() => setHoveredLocationId(null)}
              >
                {/*
                  Radar pulse pentru turbina activă.
                  NOTĂ CRITICĂ: Utilizăm animație nativă SVG pe atributul 'r' și 'opacity' (fără CSS scale/transform),
                  eliminând complet salturile eratice pe ecran!
                */}
                {isSelected && (
                  <g pointerEvents="none">
                    <circle
                      cx={geo.x}
                      cy={geo.y}
                      r="8"
                      fill="none"
                      stroke="#257b68"
                      strokeWidth="2"
                    >
                      <animate
                        attributeName="r"
                        values="8;24"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.75;0"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle
                      cx={geo.x}
                      cy={geo.y}
                      r="16"
                      fill="none"
                      stroke="#257b68"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.35"
                    />
                  </g>
                )}

                {/*Disc exterior pin */}
                <circle
                  cx={geo.x}
                  cy={geo.y}
                  r={isSelected ? "9" : "7"}
                  fill={hasAlarm ? "#c93b2b" : isSelected ? "#257b68" : "#ffffff"}
                  stroke={hasAlarm ? "#c93b2b" : "#257b68"}
                  strokeWidth={isSelected ? "3" : "2"}
                  className="transition-all duration-200"
                />

                {/*Disc interior */}
                <circle
                  cx={geo.x}
                  cy={geo.y}
                  r={isSelected ? "3.5" : "2.5"}
                  fill={isSelected ? "#ffffff" : "#257b68"}
                />

                {/*Săgeată vector vânt live, rotită conform direcției instantanee */}
                <g transform={`translate(${geo.x}, ${geo.y}) rotate(${angle})`}>
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2={-16 - Math.min(10, windSpeed)}
                    stroke={isSelected ? "#bd861c" : "#257b68"}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <polygon
                    points={`0,${-20 - Math.min(10, windSpeed)} -3,${
                      -14 - Math.min(10, windSpeed)
                    } 3,${-14 - Math.min(10, windSpeed)}`}
                    fill={isSelected ? "#bd861c" : "#257b68"}
                  />
                </g>

                {/*Ecuson tehnic de date compact cu blur discret și mărire la hover */}
                <foreignObject
                  x={geo.x + geo.badgeDx}
                  y={geo.y + geo.badgeDy}
                  width="170"
                  height="65"
                  className="overflow-visible pointer-events-auto"
                >
                  <div
                    className={`inline-flex flex-col rounded-[3px] border transition-all duration-200 ease-out select-none backdrop-blur-[6px] cursor-pointer ${
                      isSelected
                        ? "border-[#257b68] ring-1 ring-[#257b68]/40 bg-white/80 dark:bg-[#141d20]/85 shadow-sm"
                        : "border-[#cfd7d3]/85 dark:border-[#2a3c42]/85 bg-white/70 dark:bg-[#141d20]/75 hover:border-[#257b68]"
                    } ${
                      isHovered
                        ? "scale-125 z-50 py-1 px-2 bg-white/95 dark:bg-[#141d20]/95 shadow-lg -translate-y-1"
                        : "scale-100 py-[2px] px-1.5"
                    }`}
                    style={{
                      transformOrigin: geo.badgeDx < 0 ? "right center" : "left center",
                    }}
                  >
                    <div className="flex items-center gap-1 leading-none">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${
                          hasAlarm
                            ? "bg-[#c93b2b]"
                            : isSelected
                            ? "bg-[#257b68]"
                            : "bg-[#9bbcb0]"
                        }`}
                      />
                      <span className="font-bold text-[8px] text-[#121a18] dark:text-[#e5f0ed] tracking-tight whitespace-nowrap">
                        {geo.name} ({turb.id.replace("TURBINĂ ", "T")})
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 font-mono text-[7.5px] text-[#53605b] dark:text-[#9ab0aa] mt-0.5 leading-none whitespace-nowrap">
                      <span className="font-bold text-[#121a18] dark:text-[#e5f0ed]">
                        {formatInt(power)}W
                      </span>
                      <span className="text-[#8e9c98]">·</span>
                      <span className="font-semibold text-[#257b68]">
                        {formatDecimal(windSpeed, 1)}m/s
                      </span>
                      <span className="text-[#8e9c98]">·</span>
                      <span className="text-[#bd861c] font-semibold text-[7px]">
                        {windDir}
                      </span>
                    </div>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>

      {/*Bară de legendă & comenzi */}
      <div className="flex flex-wrap items-center justify-between text-xs text-[#7a8682] pt-3 mt-1 gap-2 border-t border-[#edf0ee]">
        <span>
          Click pe oricare dintre cele 4 situri pentru a comuta telemetria live.
        </span>
        <div className="flex items-center gap-4 text-[11px] font-mono text-[#53605b]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#257b68]" />
            Turbină Activă
          </span>
          <span className="flex items-center gap-1 text-[#257b68]">
            <Wind size={13} /> Săgeți Orientate după Vânt
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 border-t border-dashed border-[#257b68]" />
            Backbone SCADA
          </span>
        </div>
      </div>
    </div>
  );
}
