import type { AlertSeverity } from "./alert-demo";

export type AlertPaletteId = "contrast" | "soft" | "blue";
export type SeverityColors = Record<AlertSeverity, { label: string; color: string; soft: string }>;

export const ALERT_PALETTES: Record<AlertPaletteId, { name: string; colors: SeverityColors }> = {
  contrast: {
    name: "A · Contrast clar",
    colors: {
      critical: { label: "CRITIC", color: "#D00000", soft: "#FFF3F2" },
      high: { label: "RIDICAT", color: "#F57C00", soft: "#FFF2E4" },
      medium: { label: "MEDIU", color: "#A88700", soft: "#FFF6C9" },
      low: { label: "SCĂZUT", color: "#89634D", soft: "#F3EAE3" },
      info: { label: "INFO", color: "#2878A5", soft: "#EAF4F9" },
    },
  },
  soft: {
    name: "B · Tonuri mai blânde",
    colors: {
      critical: { label: "CRITIC", color: "#C62828", soft: "#FBEFED" },
      high: { label: "RIDICAT", color: "#D96B16", soft: "#FAEFE6" },
      medium: { label: "MEDIU", color: "#A18418", soft: "#F8F1D2" },
      low: { label: "SCĂZUT", color: "#826650", soft: "#F1EBE6" },
      info: { label: "INFO", color: "#356C8A", soft: "#EAF1F5" },
    },
  },
  blue: {
    name: "C · Accent albastru",
    colors: {
      critical: { label: "CRITIC", color: "#D00000", soft: "#FFF3F2" },
      high: { label: "RIDICAT", color: "#F57C00", soft: "#FFF2E4" },
      medium: { label: "MEDIU", color: "#A88700", soft: "#FFF6C9" },
      low: { label: "SCĂZUT", color: "#89634D", soft: "#F3EAE3" },
      info: { label: "INFO", color: "#075FB5", soft: "#E8F2FF" },
    },
  },
};

export const NORMAL_STATE_COLOR = "#257b68";
