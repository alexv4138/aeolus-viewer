import type { AlertSeverity } from "./alert-demo";

export type AlertPaletteId = "contrast" | "soft";
export type SeverityColors = Record<AlertSeverity, { label: string; color: string; soft: string }>;

export const ALERT_PALETTES: Record<AlertPaletteId, { name: string; colors: SeverityColors }> = {
  contrast: {
    name: "A · Contrast clar",
    colors: {
      critical: { label: "CRITIC", color: "#B42318", soft: "#FDECEA" },
      high: { label: "RIDICAT", color: "#E85D04", soft: "#FFF0E5" },
      medium: { label: "MEDIU", color: "#A66B00", soft: "#FFF6D8" },
      low: { label: "SCĂZUT", color: "#89634D", soft: "#F3EAE3" },
      info: { label: "INFO", color: "#2878A5", soft: "#EAF4F9" },
    },
  },
  soft: {
    name: "B · Tonuri mai blânde",
    colors: {
      critical: { label: "CRITIC", color: "#A8322A", soft: "#F8ECEA" },
      high: { label: "RIDICAT", color: "#C65A16", soft: "#FAEEE6" },
      medium: { label: "MEDIU", color: "#927000", soft: "#F7F1DD" },
      low: { label: "SCĂZUT", color: "#826650", soft: "#F1EBE6" },
      info: { label: "INFO", color: "#356C8A", soft: "#EAF1F5" },
    },
  },
};

export const NORMAL_STATE_COLOR = "#257b68";
