import {
  Activity, AudioLines, BatteryWarning, Bird, CircuitBoard, CloudHail, CloudLightning,
  Flame, Gauge, Network, PowerOff, ScanLine, ShieldAlert, Sun, ThermometerSun,
  Vibrate, Wind, Wrench, Zap, type LucideIcon,
} from "lucide-react";
import type { AlertIconName } from "./alert-demo";

// One authoritative icon map shared by the dashboard, history and chart overlays.
export const ALERT_ICON_COMPONENTS: Record<AlertIconName, LucideIcon> = {
  overspeed: Gauge,
  temperature: ThermometerSun,
  vibration: Vibrate,
  voltage: Zap,
  current: Activity,
  storm: CloudLightning,
  hail: CloudHail,
  seismic: Activity,
  bird: Bird,
  fire: Flame,
  brake: ShieldAlert,
  network: Network,
  solar: Sun,
  pressure: Gauge,
  sensor: ScanLine,
  sound: AudioLines,
  battery: BatteryWarning,
  estop: PowerOff,
  torque: Wrench,
  circuit: CircuitBoard,
};
