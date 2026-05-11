const state = {
  events: [],
  filtered: [],
  query: ""
};

const els = {
  search: document.querySelector("#searchInput"),
  count: document.querySelector("#eventCount"),
  updated: document.querySelector("#lastUpdated"),
  list: document.querySelector("#eventList"),
  empty: document.querySelector("#emptyState")
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric"
});

const compactDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric"
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short"
});

init();

async function init() {
  bindControls();

  try {
    const payload = await loadEvents();
    state.events = Array.isArray(payload.events) ? payload.events : [];
    state.filtered = state.events;
    renderMeta(payload);
    applyFilters();
  } catch (error) {
    els.count.textContent = "Unable to load events.";
    els.updated.textContent = "";
    els.list.innerHTML = "";
    els.empty.hidden = false;
    els.empty.querySelector("p").textContent = "Refresh this page or check data/events.json.";
    console.error(error);
  }
}

async function loadEvents() {
  const response = await fetch("./data/events.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load events (${response.status})`);
  }
  return response.json();
}

function bindControls() {
  els.search.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    applyFilters();
  });
}

function renderMeta(payload) {
  const updated = payload.updatedAt ? new Date(payload.updatedAt) : null;
  els.updated.textContent = updated && !Number.isNaN(updated.valueOf())
    ? `Updated ${compactDateFormatter.format(updated)}`
    : "";
}

function applyFilters() {
  const now = new Date();

  state.filtered = state.events.filter((event) => {
    const start = new Date(event.start);
    if (Number.isNaN(start.valueOf()) || start < startOfToday(now)) return false;
    if (!matchesQuery(event, state.query)) return false;
    return true;
  });

  renderEvents(state.filtered);
}

function matchesQuery(event, query) {
  if (!query) return true;
  const haystack = [
    event.title,
    event.source,
    event.venue,
    event.address,
    event.description,
    event.category
  ].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(query);
}

function renderEvents(events) {
  els.count.textContent = `${events.length} upcoming ${events.length === 1 ? "event" : "events"}`;
  els.empty.hidden = events.length > 0;
  els.list.innerHTML = "";

  const groups = groupByDate(events);
  for (const [dateKey, dayEvents] of groups) {
    const group = document.createElement("article");
    group.className = "date-group";

    const heading = document.createElement("h2");
    heading.className = "date-heading";
    heading.textContent = dateFormatter.format(new Date(`${dateKey}T12:00:00`));
    group.append(heading);

    const grid = document.createElement("div");
    grid.className = "event-grid";
    for (const event of dayEvents) {
      grid.append(renderCard(event));
    }

    group.append(grid);
    els.list.append(group);
  }
}

function groupByDate(events) {
  const groups = new Map();
  for (const event of events) {
    const key = event.start.slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  return groups;
}

function renderCard(event) {
  const card = document.createElement("section");
  card.className = "event-card";

  const top = document.createElement("div");
  top.className = "event-card__top";

  const meta = document.createElement("div");
  meta.className = "event-meta";
  meta.append(pill(event.source, "pill pill--source"));
  if (event.category) meta.append(pill(event.category, "pill"));
  if (event.isVirtual) meta.append(pill("Virtual", "pill"));
  top.append(meta);

  const title = document.createElement("h2");
  title.textContent = event.title;
  top.append(title);
  card.append(top);

  const time = document.createElement("p");
  time.className = "event-time";
  time.textContent = formatEventTime(event);
  card.append(time);

  if (event.weather) {
    const weather = document.createElement("p");
    weather.className = "event-weather";
    weather.textContent = formatWeather(event.weather);
    card.append(weather);
  }

  const place = document.createElement("p");
  place.className = "event-place";
  place.textContent = formatPlace(event);
  card.append(place);

  if (event.description) {
    const description = document.createElement("p");
    description.className = "event-description";
    description.textContent = event.description;
    card.append(description);
  }

  const actions = document.createElement("div");
  actions.className = "event-actions";

  const calendarButton = document.createElement("button");
  calendarButton.className = "button button--primary";
  calendarButton.type = "button";
  calendarButton.textContent = "Add to Calendar";
  calendarButton.addEventListener("click", () => downloadCalendar(event));
  actions.append(calendarButton);

  if (event.sourceUrl) {
    const sourceLink = document.createElement("a");
    sourceLink.className = "button button--secondary";
    sourceLink.href = event.sourceUrl;
    sourceLink.target = "_blank";
    sourceLink.rel = "noopener";
    sourceLink.textContent = "View Source";
    actions.append(sourceLink);
  }

  card.append(actions);
  return card;
}

function formatWeather(weather) {
  const temperature = typeof weather.temperature === "number"
    ? `${weather.temperature}°${weather.temperatureUnit || "F"}`
    : "Temp unavailable";
  const rain = typeof weather.precipitationChance === "number"
    ? `${weather.precipitationChance}% rain`
    : "rain chance unavailable";
  return `${temperature} · ${rain}`;
}

function pill(text, className) {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

function formatEventTime(event) {
  if (event.timeStatus === "unknown") return "Check event for actual time";
  if (event.allDay) return "All day";

  const start = new Date(event.start);
  const end = event.end ? new Date(event.end) : null;
  if (!end || Number.isNaN(end.valueOf())) return timeFormatter.format(start);

  const sameDay = event.start.slice(0, 10) === event.end.slice(0, 10);
  if (sameDay) return `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;

  return `${timeFormatter.format(start)} - ${dateFormatter.format(end)} ${timeFormatter.format(end)}`;
}

function formatPlace(event) {
  if (event.isVirtual) return event.venue || "Virtual event";
  return [event.venue, event.address].filter(Boolean).join(" - ") || "Location TBA";
}

function downloadCalendar(event) {
  const ics = createIcs(event);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(event.title)}.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function createIcs(event) {
  const uid = `${event.id || slugify(event.title)}@tuscaloosa-events`;
  const location = formatPlace(event);
  const description = [event.description, event.sourceUrl].filter(Boolean).join("\\n\\n");
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
    if (event.end) {
      lines.push(`DTEND:${toUtcStamp(new Date(event.end))}`);
    }
  }

  if (event.sourceUrl) lines.push(`URL:${escapeIcs(event.sourceUrl)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n");
}

function escapeIcs(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replace(/\r?\n/g, "\\n");
}

function foldIcsLine(line) {
  if (line.length <= 73) return line;
  const chunks = [];
  let rest = line;
  while (rest.length > 73) {
    chunks.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  chunks.push(rest);
  return chunks.join("\r\n");
}

function toUtcStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function toDateValue(date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function slugify(value) {
  return String(value || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "event";
}

function startOfToday(now) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
