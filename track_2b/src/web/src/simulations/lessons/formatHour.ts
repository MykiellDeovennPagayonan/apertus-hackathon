export function formatHour(hours: number) {
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
}
