export const TIMEZONE = "America/Chicago";
export const TZ_OFFSET = "-05:00";

export function normalizeEvent(input) {
  const title = cleanText(input.title);
  const start = normalizeDate(input.start);
  if (!title || !start) return null;

  const allDay = Boolean(input.allDay);
  let end = normalizeDate(input.end) || defaultEnd(start, allDay);
  if (new Date(end) < new Date(start)) {
    end = defaultEnd(start, allDay);
  }
  const source = cleanText(input.source) || "Unknown Source";
  const venue = cleanText(input.venue);
  const address = cleanText(input.address);
  const timeStatus = normalizeTimeStatus(input.timeStatus);
  const description = formatDescriptionWithAgeGuidance(input.description, input.recommendedAges);

  return {
    id: input.id || makeEventId(source, title, start, venue || address),
    title,
    source,
    sourceUrl: input.sourceUrl || "",
    start,
    end,
    allDay,
    timeStatus,
    venue,
    address,
    description,
    category: cleanText(input.category) || "Community",
    isVirtual: Boolean(input.isVirtual || /virtual|online/i.test(`${venue} ${address}`))
  };
}

export function dedupeAndSort(events) {
  const seen = new Map();
  for (const event of events.filter(Boolean)) {
    const key = [
      event.title.toLowerCase().replace(/[^a-z0-9]+/g, ""),
      event.start.slice(0, 16),
      `${event.venue} ${event.address}`.toLowerCase().replace(/[^a-z0-9]+/g, "")
    ].join("|");

    const existing = seen.get(key);
    if (!existing || scoreEvent(event) > scoreEvent(existing)) {
      seen.set(key, event);
    }
  }

  return [...seen.values()].sort((a, b) => {
    const byDate = new Date(a.start) - new Date(b.start);
    if (byDate !== 0) return byDate;
    return a.title.localeCompare(b.title);
  });
}

export function validateEvents(events) {
  const errors = [];
  const ids = new Set();

  events.forEach((event, index) => {
    for (const key of ["id", "title", "source", "sourceUrl", "start", "end"]) {
      if (!event[key]) errors.push(`events[${index}] is missing ${key}`);
    }

    if (ids.has(event.id)) errors.push(`duplicate id: ${event.id}`);
    ids.add(event.id);

    const start = new Date(event.start);
    const end = new Date(event.end);
    if (Number.isNaN(start.valueOf())) errors.push(`invalid start for ${event.id}`);
    if (Number.isNaN(end.valueOf())) errors.push(`invalid end for ${event.id}`);
    if (!Number.isNaN(start.valueOf()) && !Number.isNaN(end.valueOf()) && end < start) {
      errors.push(`end before start for ${event.id}`);
    }

    if (!["confirmed", "inferred", "unknown"].includes(event.timeStatus)) {
      errors.push(`invalid timeStatus for ${event.id}`);
    }

    if (event.timeStatus === "unknown" && !event.allDay) {
      errors.push(`unknown timeStatus must be allDay for ${event.id}`);
    }

    if (index > 0 && new Date(events[index - 1].start) > start) {
      errors.push(`events are not sorted at ${event.id}`);
    }
  });

  return errors;
}

function formatDescriptionWithAgeGuidance(description, recommendedAges) {
  const cleanedDescription = cleanText(description);
  const ageGuidance = cleanText(recommendedAges) || extractAgeGuidance(cleanedDescription);
  if (!ageGuidance) return truncate(cleanedDescription, 240);

  const prefix = `Recommended ages: ${ageGuidance}.`;
  if (cleanedDescription.toLowerCase().startsWith(prefix.toLowerCase())) {
    return truncate(cleanedDescription, 240);
  }

  return truncate([prefix, cleanedDescription].filter(Boolean).join(" "), 240);
}

function extractAgeGuidance(value) {
  const text = cleanText(value);
  if (!text) return "";

  if (/\ball\s+ages\b/i.test(text)) return "All ages";
  if (/\badults?\s+only\b/i.test(text)) return "Adults only";

  const ageRange = text.match(/\bages?\s+(\d{1,2})\s*(?:-|–|—|to|through)\s*(\d{1,2})\b/i);
  if (ageRange) return `Ages ${ageRange[1]}–${ageRange[2]}`;

  const childrenAgeRange = text.match(/\b(?:children|kids|toddlers|preschoolers)\s+ages?\s+(\d{1,2})\s*(?:-|–|—|to|through)\s*(\d{1,2})\b/i);
  if (childrenAgeRange) return `Ages ${childrenAgeRange[1]}–${childrenAgeRange[2]}`;

  const agePlus = text.match(/\bages?\s+(\d{1,2})\s*(?:\+|and\s+(?:up|older)|or\s+older)\b/i);
  if (agePlus) return `Ages ${agePlus[1]}+`;

  const ageMinimum = text.match(/\b(?:adults?|teens?)\s+(\d{1,2})\s*(?:\+|and\s+(?:up|older)|or\s+older)\b/i);
  if (ageMinimum) return `Ages ${ageMinimum[1]}+`;

  return "";
}

function normalizeTimeStatus(value) {
  const status = cleanText(value).toLowerCase();
  return ["confirmed", "inferred", "unknown"].includes(status) ? status : "confirmed";
}

export function makeEventId(source, title, start, place = "") {
  return [source, title, start.slice(0, 10), place]
    .join(" ")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export function cleanText(value) {
  return decodeEntities(String(value ?? ""))
    .replace(/\s+/g, " ")
    .trim();
}

export function parseMonthDay(value, fallbackYear = new Date().getFullYear()) {
  const cleaned = cleanText(value).replace(/\b(mon|tue|wed|thu|fri|sat|sun),?\s+/i, "");
  const match = cleaned.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})\b/i);
  if (!match) return null;
  const month = monthIndex(match[1]);
  const day = Number(match[2]);
  return { year: fallbackYear, month, day };
}

export function parseTime(value) {
  const match = cleanText(value).match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?=\W|$)/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3].replaceAll(".", "").toLowerCase();
  if (meridiem === "pm" && hour !== 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return { hour, minute };
}

export function buildIso({ year, month, day, hour = 0, minute = 0 }) {
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00${TZ_OFFSET}`;
}

export function addHours(iso, hours) {
  const date = new Date(iso);
  date.setHours(date.getHours() + hours);
  return toLocalIso(date);
}

function normalizeDate(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return `${value}T00:00:00${TZ_OFFSET}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  if (String(value).includes("T") && /[+-]\d{2}:\d{2}|Z$/.test(String(value))) {
    return String(value);
  }
  return toLocalIso(date);
}

function defaultEnd(start, allDay) {
  if (allDay) {
    const date = new Date(start);
    date.setDate(date.getDate() + 1);
    return toLocalIso(date);
  }
  return addHours(start, 1);
}

function toLocalIso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00${TZ_OFFSET}`;
}

function scoreEvent(event) {
  return [event.description, event.venue, event.address, event.sourceUrl]
    .filter(Boolean)
    .join(" ")
    .length;
}

function truncate(value, max) {
  if (!value || value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}...`;
}

function monthIndex(name) {
  return ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
    .findIndex((month) => name.toLowerCase().startsWith(month));
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/&hellip;/g, "...");
}
