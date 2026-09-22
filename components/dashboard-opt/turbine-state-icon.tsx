import React from "react";
import { CircleCheck, Gauge, PowerOff } from "lucide-react";

export type TurbineState = "NOMINAL" | "ÎNCETINIT" | "NEFUNCȚIONAL";

export function TurbineStateIcon({ state, size = 17, color }: { state: TurbineState; size?: number; color: string }) {
  const Icon = state === "NOMINAL" ? CircleCheck : state === "ÎNCETINIT" ? Gauge : PowerOff;
  return <Icon size={size} className="mt-0.5 shrink-0" color={color} aria-hidden="true" />;
}
