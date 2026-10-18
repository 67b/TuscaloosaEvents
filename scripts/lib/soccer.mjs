import { buildIso, cleanText, parseMonthDay, parseTime } from "./normalize.mjs";

export const SOCCER_URL = "https://rolltide.com/sports/womens-soccer/schedule";

// Read the server-rendered Sidearm cards rather than the site's client state.
export function parseSoccerSchedule(html) {
  const year = Number(html.match(/<title>(\d{4}) Soccer Schedule/i)?.[1]);
  if (!year) return [];
  const cards = html.split(/<div\b[^>]*data-test-id="s-game-card-standard__root"[^>]*>/i).slice(1);
  const events = [];
  for (const card of cards) {
    const location = field(card, "s-game-card-facility-and-location__standard-location-details");
    if (!/^Tuscaloosa\b/i.test(location)) continue;
    const opponent = field(card, "s-game-card-standard__header-team-opponent-link");
    const date = parseMonthDay(text(card), year);
    if (!opponent || !date) continue;
    const timeText = field(card, "s-game-card-standard__header-game-time");
    const time = /\bnoon\b/i.test(timeText) ? { hour: 12, minute: 0 } : parseTime(timeText);
    const start = buildIso({ ...date, ...(time || {}) });
    events.push({
      title: `Alabama Women's Soccer vs. ${opponent}`,
      source: "Alabama Athletics",
      sourceUrl: SOCCER_URL,
      start,
      end: new Date(Date.parse(start) + (time ? 2 : 24) * 3600000).toISOString(),
      allDay: !time,
      timeStatus: time ? "confirmed" : "unknown",
      venue: field(card, "s-game-card-facility-and-location__standard-facility-title") || "Alabama Soccer Stadium",
      address: "Tuscaloosa, AL",
      description: `Alabama women's soccer home match against ${opponent}. ${time ? "See the official schedule for match details." : "Start time has not been announced; check the official schedule."}`,
      category: "Sports",
      isVirtual: false
    });
  }
  return events;
}

function field(card, id) {
  const match = card.match(new RegExp(`<([a-z0-9]+)\\b[^>]*data-test-id="${id}"[^>]*>([\\s\\S]*?)<\\/\\1>`, "i"));
  return text(match?.[2] || "");
}

function text(html) {
  return cleanText(html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<[^>]*>/g, " "));
}
