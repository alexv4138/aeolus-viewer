// Formatare consecventă conform standardului de precizie tehnică Urban Lentz 2

export function formatInt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "0";
  return Math.round(value).toLocaleString("ro-RO", {
    maximumFractionDigits: 0,
  });
}

export function formatDecimal(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "0,0";
  return value.toLocaleString("ro-RO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatEnergy(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "0";
  const num = Number(value);
  if (num < 10) {
    return num.toLocaleString("ro-RO", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }
  return Math.round(num).toLocaleString("ro-RO", {
    maximumFractionDigits: 0,
  });
}

export function formatVibration(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "0,00";
  return Number(value).toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatTime(value: string | number | Date): string {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function formatDate(value: string | number | Date): string {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatDateTime(value: string | number | Date): string {
  return `${formatDate(value)} · ${formatTime(value)}`;
}
