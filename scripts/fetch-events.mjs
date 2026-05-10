import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import {
  addHours,
  buildIso,
  cleanText,
  dedupeAndSort,
  normalizeEvent,
  parseMonthDay,
  parseTime,
  TIMEZONE
} from "./lib/normalize.mjs";

const OUTPUT_PATH = new URL("../data/events.json", import.meta.url);
const execFileAsync = promisify(execFile);
const CURRENT_YEAR = new Date().getFullYear();
const SOURCE_URLS = {
  ua: "https://calendar.ua.edu/",
  visit: "https://visittuscaloosa.com/events/",
  patch: "https://patch.com/alabama/tuscaloosa/calendar",
  library: "https://www.tuscaloosa-library.org/events/",
  amphitheater: "https://www.mercedesbenzamphitheater.com/calendar/"
};

const WEATHER_POINT = "33.2098,-87.5692";

const fetchOptions = {
  headers: {
    "user-agent": "TuscaloosaEventsBot/1.0 (+https://github.com/)",
    "accept": "text/html,application/json,application/xml;q=0.9,*/*;q=0.8"
  }
};

const results = await Promise.allSettled([
  fetchUaEvents(),
  fetchVisitTuscaloosaEvents(),
  fetchPatchEvents(),
  fetchLibraryEvents(),
  fetchAmphitheaterEvents()
]);

const events = [];
const failures = [];

for (const result of results) {
  if (result.status === "fulfilled") {
    events.push(...result.value);
  } else {
    failures.push(result.reason?.message || String(result.reason));
  }
}

let normalized = dedupeAndSort(events.map(normalizeEvent).filter(Boolean))
  .filter((event) => new Date(event.start) >= startOfToday());

let weatherUpdatedAt = "";
try {
  const weatherByDate = await fetchTuscaloosaWeather();
  weatherUpdatedAt = new Date().toISOString();
  normalized = normalized.map((event) => ({
    ...event,
    weather: matchWeather(event, weatherByDate)
  })).map((event) => {
    if (!event.weather) {
      const { weather, ...rest } = event;
      return rest;
    }
    return event;
  });
} catch (error) {
  failures.push(`weather.gov forecast unavailable: ${error?.message || error}`);
}

const payload = {
  updatedAt: new Date().toISOString(),
  timezone: TIMEZONE,
  weatherSource: "https://api.weather.gov/",
  weatherUpdatedAt,
  sources: [
    "University of Alabama",
    "Visit Tuscaloosa",
    "Tuscaloosa Patch",
    "Tuscaloosa Public Library",
    "Mercedes-Benz Amphitheater"
  ],
  warnings: failures,
  events: normalized
};

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(`Wrote ${normalized.length} events to data/events.json`);
if (failures.length) {
  console.warn(`Completed with ${failures.length} source warning(s):`);
  for (const failure of failures) console.warn(`- ${failure}`);
}

async function fetchUaEvents() {
  const html = await fetchText(SOURCE_URLS.ua);
  const events = [];

  for (const block of extractJsonLd(html)) {
    const items = Array.isArray(block) ? block : [block];
    for (const item of items) {
      if (item?.["@type"] !== "Event" || !item.name || !item.startDate) continue;
      const location = item.location || {};
      const venue = typeof location === "string" ? location : location.name;
      const address = typeof location === "string" ? "" : flattenAddress(location.address);
      const allDay = !String(item.startDate).includes("T");

      events.push({
        title: item.name,
        source: "University of Alabama",
        sourceUrl: item.url || SOURCE_URLS.ua,
        start: item.startDate,
        end: item.endDate || (allDay ? addHours(`${item.startDate}T00:00:00-05:00`, 24) : addHours(item.startDate, 1)),
        allDay,
        venue,
        address,
        description: item.description || "University of Alabama event listed on the campus calendar.",
        category: "Campus",
        isVirtual: /virtual|online/i.test(`${venue} ${address}`)
      });
    }
  }

  if (events.length) return events;

  const cardPattern = /<div[^>]+class="[^"]*em-card[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi;
  for (const match of html.matchAll(cardPattern)) {
    const card = match[0];
    const title = cleanText(htmlToText(card.match(/class="[^"]*event-name[^"]*"[\s\S]*?<\/a>/i)?.[0] || ""));
    const start = card.match(/<em-local-time[^>]+start="([^"]+)"/i)?.[1];
    if (!title || !start) continue;

    const end = card.match(/<em-local-time[^>]+end="([^"]+)"/i)?.[1];
    const venue = cleanText(htmlToText(card.match(/em-card_event-text[\s\S]*?<\/p>/i)?.[0] || ""));
    events.push({
      title,
      source: "University of Alabama",
      sourceUrl: SOURCE_URLS.ua,
      start,
      end: end || addHours(start, 1),
      allDay: !String(start).includes("T"),
      venue: /share|interested|free|new/i.test(venue) ? "" : venue,
      address: /virtual/i.test(venue) ? "" : "Tuscaloosa, AL",
      description: "University of Alabama event listed on the campus calendar.",
      category: "Campus",
      isVirtual: /virtual/i.test(card)
    });
  }

  return events;
}

async function fetchVisitTuscaloosaEvents() {
  const html = await fetchText(SOURCE_URLS.visit);
  const articles = [...html.matchAll(/<article\b[^>]*class="[^"]*event-card[^"]*"[\s\S]*?<\/article>/gi)]
    .map((match) => match[0])
    .filter((article) => /class="event-date"/.test(article));
  const events = [];

  for (const article of articles) {
    const dateText = cleanText(htmlToText(article.match(/<div class="event-date">([\s\S]*?)<\/div>/i)?.[1] || ""));
    const dateParts = parseMonthDay(dateText, CURRENT_YEAR);
    if (!dateParts) continue;

    const titleLink = article.match(/<h3 class="post-title">[\s\S]*?<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const sourceUrl = titleLink?.[1] || SOURCE_URLS.visit;
    const title = cleanText(htmlToText(titleLink?.[2] || ""));
    const address = cleanText(htmlToText(article.match(/<address class="event-location">([\s\S]*?)<\/address>/i)?.[1] || ""));
    const detail = sourceUrl !== SOURCE_URLS.visit ? await safeFetchVisitDetail(sourceUrl) : null;
    const start = detail?.start || buildIso({ ...dateParts, hour: 18, minute: 0 });
    const end = detail?.end || addHours(start, 1);

    events.push({
      title,
      source: "Visit Tuscaloosa",
      sourceUrl,
      start,
      end,
      allDay: false,
      venue: detail?.venue || "",
      address: detail?.address || address,
      description: detail?.description || "Visitor-friendly event listed by Visit Tuscaloosa.",
      category: "Community",
      isVirtual: false
    });
  }

  return events;
}

async function safeFetchVisitDetail(url) {
  try {
    const html = await fetchText(url);
    const text = htmlToText(html);
    const titleMatch = text.match(/^(.+?)\nLocation:/m);
    const locationMatch = text.match(/Location:\s*(.+?)\nWhen:/s);
    const whenMatch = text.match(/When:\s*(.+?)\n(?:Phone:|Get Tickets|Get Directions|Visit Website|Description)/s);
    const descriptionMatch = text.match(/Description\s*\n(.+?)(?:\nMap\n|\nSignature Events|\nAll Events|$)/s);

    const location = cleanText(locationMatch?.[1] || "");
    const [venue, ...addressParts] = location.split(/\s+[–-]\s+/);
    const parsedWhen = parseVisitWhen(whenMatch?.[1] || "");

    return {
      title: cleanText(titleMatch?.[1] || ""),
      venue: cleanText(venue),
      address: cleanText(addressParts.join(" - ")),
      start: parsedWhen?.start,
      end: parsedWhen?.end,
      description: cleanText(descriptionMatch?.[1] || "")
    };
  } catch {
    return null;
  }
}

function parseVisitWhen(value) {
  const dateParts = parseMonthDay(value, CURRENT_YEAR);
  const time = parseTime(value);
  if (!dateParts || !time) return null;
  const start = buildIso({ ...dateParts, ...time });
  const endMatch = cleanText(value).match(/[–-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
  const endTime = endMatch ? parseTime(endMatch[1]) : null;
  return {
    start,
    end: endTime ? buildIso({ ...dateParts, ...endTime }) : addHours(start, 1)
  };
}

async function fetchPatchEvents() {
  const html = await fetchText(SOURCE_URLS.patch);
  const events = [];
  const sectionPattern = /<section class="styles_EventFeedSection__TCdEa">([\s\S]*?)(?=<\/section><section class="styles_EventFeedSection__TCdEa"|<\/section><\/section>)/gi;

  for (const match of html.matchAll(sectionPattern)) {
    const section = match[1];
    const dateText = cleanText(htmlToText(section.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1] || ""));
    const dateParts = parseMonthDay(dateText, CURRENT_YEAR);
    if (!dateParts) continue;

    const itemPattern = /<li\b[\s\S]*?<a href="([^"]+)"[\s\S]*?<strong>([\s\S]*?)<\/strong><\/a>\s*(?:<!-- -->)?\s*([^<]+)<p>([\s\S]*?)<\/p>[\s\S]*?<\/li>/gi;
    for (const item of section.matchAll(itemPattern)) {
      const title = cleanText(htmlToText(item[2]));
      const time = parseTime(item[3]);
      if (!title || !time) continue;

      const start = buildIso({ ...dateParts, ...time });
      const location = cleanText(htmlToText(item[4]));
      events.push({
        title,
        source: "Tuscaloosa Patch",
        sourceUrl: new URL(item[1], "https://patch.com").toString(),
        start,
        end: addHours(start, 1),
        allDay: false,
        venue: location.split(",")[0],
        address: location,
        description: "Local event listed on Patch's Tuscaloosa calendar.",
        category: "Community",
        isVirtual: false
      });
    }
  }

  return events;
}

async function fetchLibraryEvents() {
  const html = await fetchText(SOURCE_URLS.library);
  const events = [];

  for (const block of extractJsonLd(html)) {
    const candidates = Array.isArray(block?.["@graph"]) ? block["@graph"] : Array.isArray(block) ? block : [block];

    for (const item of candidates) {
      if (item?.["@type"] !== "Event" || !item.name || !item.startDate) continue;

      const location = item.location || {};
      const venue = typeof location === "string" ? location : location.name;
      const address = typeof location === "string" ? "" : flattenAddress(location.address);
      const allDay = isAllDayEvent(item.startDate, item.endDate);

      events.push({
        title: item.name,
        source: "Tuscaloosa Public Library",
        sourceUrl: item.url || SOURCE_URLS.library,
        start: item.startDate,
        end: item.endDate || (allDay ? addHours(item.startDate, 24) : addHours(item.startDate, 1)),
        allDay,
        venue,
        address,
        description: cleanText(htmlToText(item.description || "")) || "Tuscaloosa Public Library event.",
        category: "Library",
        isVirtual: /online|virtual/i.test(`${venue} ${address} ${item.eventAttendanceMode || ""}`)
      });
    }
  }

  return events;
}

async function fetchAmphitheaterEvents() {
  const feedUrl = "https://www.mercedesbenzamphitheater.com/?plugin=all-in-one-event-calendar&controller=ai1ec_exporter_controller&action=export_events&no_html=true";
  const ics = await fetchText(feedUrl);
  const events = [];

  for (const vevent of parseIcsEvents(ics)) {
    const title = vevent.SUMMARY;
    const start = parseIcsDate(vevent.DTSTART);
    if (!title || !start) continue;

    events.push({
      title,
      source: "Mercedes-Benz Amphitheater",
      sourceUrl: vevent.URL || SOURCE_URLS.amphitheater,
      start,
      end: parseIcsDate(vevent.DTEND) || addHours(start, 3),
      allDay: /^\d{8}$/.test(vevent.DTSTART || ""),
      venue: "Mercedes-Benz Amphitheater",
      address: "2710 Jack Warner Pkwy, Tuscaloosa, AL 35401",
      description: cleanText(htmlToText(vevent.DESCRIPTION || "")) || "Event listed by Mercedes-Benz Amphitheater.",
      category: "Music",
      isVirtual: false
    });
  }

  return events;
}

async function fetchTuscaloosaWeather() {
  const pointResponse = await fetch(`https://api.weather.gov/points/${WEATHER_POINT}`, {
    headers: {
      "user-agent": fetchOptions.headers["user-agent"],
      "accept": "application/geo+json,application/json"
    }
  });
  if (!pointResponse.ok) throw new Error(`points endpoint returned ${pointResponse.status}`);

  const point = await pointResponse.json();
  const forecastUrl = point.properties?.forecast;
  if (!forecastUrl) throw new Error("points endpoint did not include a forecast URL");

  const forecastResponse = await fetch(forecastUrl, {
    headers: {
      "user-agent": fetchOptions.headers["user-agent"],
      "accept": "application/geo+json,application/json"
    }
  });
  if (!forecastResponse.ok) throw new Error(`forecast endpoint returned ${forecastResponse.status}`);

  const forecast = await forecastResponse.json();
  const periods = forecast.properties?.periods || [];
  const byDate = new Map();

  for (const period of periods) {
    const date = period.startTime?.slice(0, 10);
    if (!date) continue;

    const bucket = byDate.get(date) || {};
    const normalizedPeriod = {
      temperature: period.temperature,
      temperatureUnit: period.temperatureUnit || "F",
      precipitationChance: period.probabilityOfPrecipitation?.value ?? null,
      periodName: period.name
    };

    if (period.isDaytime) {
      bucket.day = normalizedPeriod;
    } else {
      bucket.night = normalizedPeriod;
    }
    byDate.set(date, bucket);
  }

  return byDate;
}

async function fetchText(url) {
  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.text();
  } catch (error) {
    if (!shouldUseCurlFallback(error)) throw error;
    return fetchTextWithCurl(url);
  }
}

function textLines(html) {
  return htmlToText(html).split("\n").map(cleanText).filter(Boolean);
}

function extractJsonLd(html) {
  const blocks = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      blocks.push(JSON.parse(cleanText(match[1])));
    } catch {
      // Ignore malformed structured data from third-party embeds.
    }
  }
  return blocks;
}

async function fetchTextWithCurl(url) {
  const { stdout } = await execFileAsync("curl", [
    "-L",
    "--fail",
    "--silent",
    "--show-error",
    "--user-agent",
    fetchOptions.headers["user-agent"],
    url
  ], {
    maxBuffer: 10 * 1024 * 1024
  });

  return stdout;
}

function shouldUseCurlFallback(error) {
  const message = String(error?.message || error?.cause?.message || error);
  return /certificate|unable to verify|fetch failed/i.test(message);
}

function flattenAddress(address) {
  if (!address) return "";
  if (typeof address === "string") return cleanText(address);
  return cleanText([
    address.streetAddress,
    address.addressLocality,
    address.addressRegion,
    address.postalCode
  ].filter(Boolean).join(", "));
}

function isAllDayEvent(start, end) {
  if (!start) return false;
  if (!String(start).includes("T")) return true;
  return /T00:00:00/.test(String(start)) && /T23:59:59/.test(String(end || ""));
}

function matchWeather(event, weatherByDate) {
  const date = event.start.slice(0, 10);
  const hour = Number(event.start.slice(11, 13));
  const bucket = weatherByDate.get(date);
  if (!bucket) return null;

  const forecast = hour >= 18 ? bucket.night || bucket.day : bucket.day || bucket.night;
  if (!forecast) return null;

  return {
    forecastDate: date,
    temperature: forecast.temperature,
    temperatureUnit: forecast.temperatureUnit,
    precipitationChance: forecast.precipitationChance,
    periodName: forecast.periodName
  };
}

function parseIcsEvents(ics) {
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  return blocks.map((block) => {
    const event = {};
    for (const rawLine of block.split(/\r?\n/)) {
      const separator = rawLine.indexOf(":");
      if (separator < 0) continue;
      const key = rawLine.slice(0, separator).split(";")[0];
      const value = rawLine.slice(separator + 1);
      if (!event[key]) event[key] = unescapeIcs(value);
    }
    return event;
  });
}

function parseIcsDate(value) {
  if (!value) return "";
  const dateOnly = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T00:00:00-05:00`;

  const dateTime = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?/);
  if (!dateTime) return "";
  return `${dateTime[1]}-${dateTime[2]}-${dateTime[3]}T${dateTime[4]}:${dateTime[5]}:00-05:00`;
}

function unescapeIcs(value) {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(?:h1|h2|h3|h4|p|li|div|section|article|br)>/gi, "\n")
    .replace(/<h3[^>]*>/gi, "\n### ")
    .replace(/<h4[^>]*>/gi, "\n#### ")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function extractLinks(html, baseUrl) {
  const links = [];
  const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const href = match[1].startsWith("http") ? match[1] : new URL(match[1], baseUrl).toString();
    links.push({ href, text: cleanText(htmlToText(match[2])) });
  }
  return links;
}

function findBestLink(links, title) {
  const normalizedTitle = normalizeForMatch(title);
  return links.find((link) => normalizeForMatch(link.text) === normalizedTitle)?.href
    || links.find((link) => normalizeForMatch(link.href).includes(normalizedTitle.slice(0, 24)))?.href;
}

function normalizeForMatch(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
