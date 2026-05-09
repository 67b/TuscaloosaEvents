export function escapeIcs(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function foldIcsLine(line) {
  if (line.length <= 73) return line;
  const lines = [];
  let rest = line;
  while (rest.length > 73) {
    lines.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  lines.push(rest);
  return lines.join("\r\n");
}

export function toUtcStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function toDateValue(date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

export function createIcs(event) {
  const uid = `${event.id}@tuscaloosa-events`;
  const location = [event.venue, event.address].filter(Boolean).join(" - ");
  const description = [event.description, event.sourceUrl].filter(Boolean).join("\n\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tuscaloosa Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(uid)}`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(location)}`
  ];

  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${event.start.slice(0, 10).replaceAll("-", "")}`);
    const end = event.end ? new Date(event.end) : addDays(new Date(`${event.start.slice(0, 10)}T00:00:00`), 1);
    lines.push(`DTEND;VALUE=DATE:${toDateValue(end)}`);
  } else {
    lines.push(`DTSTART:${toUtcStamp(new Date(event.start))}`);
    if (event.end) lines.push(`DTEND:${toUtcStamp(new Date(event.end))}`);
  }

  if (event.sourceUrl) lines.push(`URL:${escapeIcs(event.sourceUrl)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n");
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
