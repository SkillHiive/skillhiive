// Timer formatting and parsing
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatDurationShort(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDurationCompact(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function parseDuration(input: string): number | null {
  // Parse formats like "1h 30m", "90m", "1.5h", "5400s"
  const trimmed = input.trim().toLowerCase();
  
  // Hours and minutes
  const hmMatch = trimmed.match(/^(\d+)h\s*(\d*)m?$/);
  if (hmMatch) {
    const hours = parseInt(hmMatch[1] ?? "0", 10);
    const minutes = parseInt(hmMatch[2] ?? "0", 10);
    return hours * 3600 + minutes * 60;
  }
  
  // Minutes only
  const mMatch = trimmed.match(/^(\d+)m$/);
  if (mMatch) {
    return parseInt(mMatch[1] ?? "0", 10) * 60;
  }
  
  // Hours only (decimal)
  const hMatch = trimmed.match(/^(\d+(?:\.\d+)?)h$/);
  if (hMatch) {
    return Math.round(parseFloat(hMatch[1] ?? "0") * 3600);
  }
  
  // Seconds
  const sMatch = trimmed.match(/^(\d+)s$/);
  if (sMatch) {
    return parseInt(sMatch[1] ?? "0", 10);
  }
  
  // Plain number (assume minutes)
  const numMatch = trimmed.match(/^(\d+)$/);
  if (numMatch) {
    return parseInt(numMatch[1] ?? "0", 10) * 60;
  }
  
  return null;
}

export function secondsToHMS(seconds: number): { hours: number; minutes: number; seconds: number } {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return { hours, minutes, seconds: secs };
}

export function getTimeRemaining(targetDate: Date | string | number): {
  total: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const target = targetDate instanceof Date ? targetDate : new Date(targetDate);
  const now = new Date();
  const diff = Math.max(0, target.getTime() - now.getTime());
  const total = Math.floor(diff / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { total, hours, minutes, seconds };
}