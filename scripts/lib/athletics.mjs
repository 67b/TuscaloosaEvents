import { cleanText, parseTime } from "./normalize.mjs";

// Alabama combines men's and women's swimming and track on shared schedules.
export const ATHLETICS_SCHEDULES = [
  ["football", "Football", "Saban Field at Bryant-Denny Stadium"],
  ["mens-basketball", "Men's Basketball", "Coleman Coliseum"],
  ["womens-basketball", "Women's Basketball", "Coleman Coliseum"],
  ["baseball", "Baseball", "Sewell-Thomas Stadium"],
  ["softball", "Softball", "Rhoads Stadium"],
  ["womens-gymnastics", "Gymnastics", "Coleman Coliseum"],
  ["womens-volleyball", "Volleyball", "Foster Auditorium"],
  ["womens-soccer", "Women's Soccer", "Alabama Soccer Stadium"],
  ["mens-tennis", "Men's Tennis", ""],
  ["womens-tennis", "Women's Tennis", ""],
  ["mens-golf", "Men's Golf", ""],
  ["womens-golf", "Women's Golf", ""],
  ["swimming-and-diving", "Swimming & Diving", "Alabama Aquatic Center"],
  ["womens-rowing", "Rowing", ""],
  ["xctrack", "Track & Field / Cross Country", ""]
].map(([slug, name, venue]) => ({ slug, name, venue, url: `https://rolltide.com/sports/${slug}/schedule` }));

export function parseAthleticsSchedule(html, sport) {
  // Sidearm's Nuxt payload stores object properties as indices into one array.
  // Read only the schedule's game list, excluding sidebar/related game data.
  const json = html.match(/<script\b[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  const data = json ? JSON.parse(json) : null;
  if (!Array.isArray(data)) throw new Error(`${sport.name}: schedule data unavailable`);
  const read = (index) => Number.isInteger(index) && index >= 0 ? data[index] : null;
  const schedule = data.find((item) => item && !Array.isArray(item) &&
    typeof item === "object" && "games" in item && "season" in item && "sport" in item);
  const games = read(schedule?.games);
  if (!Array.isArray(games)) throw new Error(`${sport.name}: schedule game list unavailable`);

  const events = [];
  for (const index of games) {
    const game = read(index);
    if (!game || !/^Tuscaloosa\b/i.test(read(game.location) || "") || read(game.location_indicator) === "A") continue;
    const status = `${read(game.game_state_display) || ""} ${read(game.noplay_text) || ""}`;
    if (/cancel|postpon|no contest/i.test(status)) continue;
    const opponent = read(game.opponent);
    const name = cleanText(read(game.event_name) || [read(opponent?.prefix), read(opponent?.title)].filter(Boolean).join(" "));
    const date = String(read(game.date) || "").slice(0, 10);
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const timeText = cleanText(read(game.time));
    const time = read(game.tbd) ? null : /\bnoon\b/i.test(timeText)
      ? { hour: 12, minute: 0 } : parseTime(timeText);
    const allDay = !time;
    const start = centralIso(date, time);
    const lastDate = String(read(game.enddate) || date).slice(0, 10);
    const end = allDay
      ? centralIso(nextDate(lastDate))
      : new Date(Date.parse(centralIso(lastDate, time)) + 2 * 3600000).toISOString();
    const facility = read(game.facility);
    events.push({
      id: `alabama-athletics-${sport.slug}-${read(game.id)}`,
      title: `Alabama ${sport.name}: ${name}`,
      source: "Alabama Athletics",
      sourceUrl: sport.url,
      start,
      end,
      allDay,
      timeStatus: time || /^all day$/i.test(timeText) ? "confirmed" : "unknown",
      venue: cleanText(read(facility?.title)) || sport.venue,
      address: "Tuscaloosa, AL",
      description: `Alabama ${sport.name} in Tuscaloosa. ${time ? "See the official schedule for event details; end time is estimated." : /^all day$/i.test(timeText) ? "Listed as an all-day event on the official schedule." : "Start time has not been announced; check the official schedule."}`,
      category: "Sports",
      isVirtual: false
    });
  }
  return events;
}

// Dates in the schedule are local wall-clock dates; honor CST as well as CDT.
function centralIso(date, time = null) {
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", timeZoneName: "shortOffset"
  }).formatToParts(new Date(`${date}T12:00:00Z`)).find((part) => part.type === "timeZoneName").value;
  const hour = String(time?.hour || 0).padStart(2, "0");
  const minute = String(time?.minute || 0).padStart(2, "0");
  return `${date}T${hour}:${minute}:00${offset === "GMT-5" ? "-05:00" : "-06:00"}`;
}

function nextDate(date) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
}
