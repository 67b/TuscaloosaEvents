import { readFile } from "node:fs/promises";
import { validateEvents } from "./lib/normalize.mjs";
import { createIcs } from "./lib/calendar.mjs";

const payload = JSON.parse(await readFile(new URL("../data/events.json", import.meta.url), "utf8"));
const jsPayload = await readFile(new URL("../data/events.js", import.meta.url), "utf8");
const events = Array.isArray(payload.events) ? payload.events : [];
const errors = validateEvents(events);

if (!payload.updatedAt) errors.push("missing updatedAt");
if (!payload.timezone) errors.push("missing timezone");
if (!Array.isArray(payload.sources) || payload.sources.length === 0) errors.push("missing sources");
if (!jsPayload.startsWith("window.TUSCALOOSA_EVENTS_DATA = ")) errors.push("data/events.js is missing the fallback assignment");
if (!jsPayload.includes(payload.updatedAt)) errors.push("data/events.js does not match data/events.json");

if (events[0]) {
  const ics = createIcs(events[0]);
  for (const marker of ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "SUMMARY:", "DTSTART", "END:VEVENT"]) {
    if (!ics.includes(marker)) errors.push(`sample ICS missing ${marker}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${events.length} event${events.length === 1 ? "" : "s"}.`);
