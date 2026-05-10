import { readFile } from "node:fs/promises";
import { validateEvents } from "./lib/normalize.mjs";
import { createIcs } from "./lib/calendar.mjs";

const payload = JSON.parse(await readFile(new URL("../data/events.json", import.meta.url), "utf8"));
const jsPayload = await readFile(new URL("../data/events.js", import.meta.url), "utf8");
const events = Array.isArray(payload.events) ? payload.events : [];
const errors = validateEvents(events);

if (!payload.updatedAt) errors.push("missing updatedAt");
if (!payload.timezone) errors.push("missing timezone");
if (!payload.weatherSource) errors.push("missing weatherSource");
if (!Array.isArray(payload.sources) || payload.sources.length === 0) errors.push("missing sources");
if (!jsPayload.startsWith("window.TUSCALOOSA_EVENTS_DATA = ")) errors.push("data/events.js is missing the fallback assignment");
if (!jsPayload.includes(payload.updatedAt)) errors.push("data/events.js does not match data/events.json");

for (const event of events) {
  if (!event.weather) continue;
  if (!event.weather.forecastDate) errors.push(`weather missing forecastDate for ${event.id}`);
  if (typeof event.weather.temperature !== "number") errors.push(`weather missing numeric temperature for ${event.id}`);
  if (!event.weather.temperatureUnit) errors.push(`weather missing temperatureUnit for ${event.id}`);
  if (
    event.weather.precipitationChance !== null
    && typeof event.weather.precipitationChance !== "number"
  ) {
    errors.push(`weather precipitationChance must be numeric or null for ${event.id}`);
  }
}

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
