export function formatEventDate(
  date: Date | string,
  timeZone: string = "Africa/Nairobi"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone,
    }).format(d);
  } catch {
    return d.toUTCString();
  }
}

export function formatEventTime(
  date: Date | string,
  timeZone: string = "Africa/Nairobi"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZoneName: "short",
      timeZone,
    }).format(d);
  } catch {
    return d.toISOString().slice(11, 16) + " UTC";
  }
}

export function formatEventDateTimeFull(
  date: Date | string,
  timeZone: string = "Africa/Nairobi"
): string {
  return `${formatEventDate(date, timeZone)} • ${formatEventTime(date, timeZone)} (${timeZone})`;
}
