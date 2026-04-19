export function formatLocalDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function secondsUntil(iso: string): number {
  const delta = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
  return Math.max(0, delta);
}

export function formatCountdown(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}
