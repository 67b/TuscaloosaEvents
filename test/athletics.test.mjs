import test from "node:test";
import assert from "node:assert/strict";
import { ATHLETICS_SCHEDULES, parseAthleticsSchedule } from "../scripts/lib/athletics.mjs";
import { normalizeEvent, validateEvents } from "../scripts/lib/normalize.mjs";

const sport = (slug) => ATHLETICS_SCHEDULES.find((item) => item.slug === slug);
function game(overrides = {}) {
  return { id: 123, date: "2026-10-18T18:00:00", enddate: null, time: "6 p.m. CT", tbd: false,
    location: "Tuscaloosa, Ala.", location_indicator: "H", game_state_display: "SCHEDULED",
    opponent: { prefix: "#2", title: "Vanderbilt" }, ...overrides };
}
// Encode the indexed JSON shape served in Sidearm's Nuxt script.
function page(games, unrelatedGames = []) {
  const data = [];
  function encode(value) {
    const index = data.length;
    data.push(null);
    data[index] = Array.isArray(value) ? value.map(encode) : value && typeof value === "object"
      ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, encode(child)])) : value;
    return index;
  }
  encode({ schedule: { season: "2026-27", sport: "test", games }, related: unrelatedGames });
  return `<script type="application/json" id="__NUXT_DATA__">${JSON.stringify(data)}</script>`;
}

test("registers all 15 official varsity schedule feeds", () => {
  assert.equal(ATHLETICS_SCHEDULES.length, 15);
  assert.equal(new Set(ATHLETICS_SCHEDULES.map((item) => item.url)).size, 15);
});

test("keeps local home games and hosted meets, excluding away, distant neutral and sidebar games", () => {
  const events = parseAthleticsSchedule(page([
    game(), game({ id: 124, location: "Knoxville, Tenn.", location_indicator: "A" }),
    game({ id: 125, location: "Birmingham, Ala.", location_indicator: "N" }),
    game({ id: 126, location_indicator: "N" }), game({ id: 127, location_indicator: "A" })
  ], [game({ id: 999 })]), sport("football"));
  assert.deepEqual(events.map((event) => event.id), ["alabama-athletics-football-123", "alabama-athletics-football-126"]);
  assert.match(events[0].title, /#2 Vanderbilt/);
  assert.equal(events[0].sourceUrl, sport("football").url);
});

test("preserves fall exhibitions and spring dates with Central daylight/standard time", () => {
  const events = parseAthleticsSchedule(page([
    game({ date: "2026-10-23T17:00:00", time: "5 p.m. CT" }),
    game({ id: 124, date: "2027-01-09T12:00:00", time: "Noon" }),
    game({ id: 125, date: "2027-03-19T19:30:00", time: "7:30 p.m. CT" })
  ]), sport("baseball"));
  assert.deepEqual(events.map((event) => event.start), ["2026-10-23T17:00:00-05:00", "2027-01-09T12:00:00-06:00", "2027-03-19T19:30:00-05:00"]);
  assert.deepEqual(validateEvents(events.map(normalizeEvent)), []);
});

for (const time of ["TBA", "TBD", "Flex", ""]) {
  test(`does not turn ${time || "blank"} into an announced midnight start`, () => {
    const [event] = parseAthleticsSchedule(page([game({ time })]), sport("football"));
    assert.equal(event.timeStatus, "unknown");
    assert.equal(event.allDay, true);
    assert.match(event.start, /T00:00:00/);
  });
}

test("multi-day meets include the final day and retain supplied facilities", () => {
  const [event] = parseAthleticsSchedule(page([game({ date: "2026-10-30T00:00:00", enddate: "2026-11-01T00:00:00", time: "", facility: { title: "Alabama Tennis Stadium" } })]), sport("mens-tennis"));
  assert.equal(event.start, "2026-10-30T00:00:00-05:00");
  assert.equal(event.end, "2026-11-02T00:00:00-06:00");
  assert.equal(event.venue, "Alabama Tennis Stadium");
});

test("doubleheader game IDs remain distinct", () => {
  const events = parseAthleticsSchedule(page([game(), game({ id: 124, time: "8 p.m. CT" })]), sport("softball"));
  assert.notEqual(events[0].id, events[1].id);
  assert.deepEqual(validateEvents(events.map(normalizeEvent)), []);
});

test("omits cancelled and postponed events", () => {
  assert.deepEqual(parseAthleticsSchedule(page([game({ game_state_display: "CANCELLED" }), game({ noplay_text: "Postponed" })]), sport("baseball")), []);
});

test("changed/missing source markup raises a warning instead of silently returning no games", () => {
  assert.throws(() => parseAthleticsSchedule("<html>Blocked</html>", sport("football")), /schedule data unavailable/);
  assert.deepEqual(parseAthleticsSchedule(page([]), sport("football")), []);
});
