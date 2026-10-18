import test from "node:test";
import assert from "node:assert/strict";
import { parseSoccerSchedule } from "../scripts/lib/soccer.mjs";
import { parseVisitDetail } from "../scripts/fetch-events.mjs";
import { normalizeEvent, validateEvents } from "../scripts/lib/normalize.mjs";

const field = (tag, id, value) => `<${tag} data-test-id="${id}">${value}</${tag}>`;
function card(opponent, location, time) {
  return `<div data-test-id="s-game-card-standard__root">${field("a", "s-game-card-standard__header-team-opponent-link", opponent)}${field("span", "s-game-card-facility-and-location__standard-location-details", location)}<span>Oct 18 (Sun)</span>${field("p", "s-game-card-standard__header-game-time", `<span>${time}</span>`)}</div>`;
}
const schedule = (cards) => `<title>2026 Soccer Schedule - Alabama Athletics</title>${cards}`;

test("soccer includes Tuscaloosa matches and excludes away and neutral sites", () => {
  const events = parseSoccerSchedule(schedule(card("#2 Vanderbilt", "Tuscaloosa, Ala.", "6 p.m. CT") + card("LSU", "Baton Rouge, La.", "7 p.m. CT") + card("SEC Tournament", "Pensacola, Fla.", "TBA")));
  assert.equal(events.length, 1);
  assert.equal(events[0].title, "Alabama Women's Soccer vs. #2 Vanderbilt");
  assert.equal(events[0].start, "2026-10-18T18:00:00-05:00");
  assert.equal(Date.parse(events[0].end) - Date.parse(events[0].start), 7200000);
  assert.deepEqual(validateEvents(events.map(normalizeEvent)), []);
});

for (const time of ["12 p.m. CT", "Noon"]) {
  test(`soccer parses ${time}`, () => {
    assert.match(parseSoccerSchedule(schedule(card("Georgia", "Tuscaloosa, Ala.", time)))[0].start, /T12:00:00/);
  });
}

test("unannounced matches retain the date and unknown-time status", () => {
  const event = parseSoccerSchedule(schedule(card("Georgia", "Tuscaloosa, Ala.", "TBA")))[0];
  assert.equal(event.allDay, true);
  assert.equal(event.timeStatus, "unknown");
  assert.match(event.start, /T00:00:00/);
  assert.deepEqual(validateEvents([normalizeEvent(event)]), []);
});

test("soccer does not guess a season from the current year", () => {
  assert.deepEqual(parseSoccerSchedule(card("Georgia", "Tuscaloosa, Ala.", "TBA")), []);
});

test("Visit detail parser supplies featured and calendar event details", () => {
  const detail = parseVisitDetail(`<h1>Tuscaloosa Oktoberfest</h1><div>Location: Government Plaza – 618 Almon Ave., Tuscaloosa, AL</div><div>When: Oct 3 at 10:00am - 4:00pm</div><div>Phone: 2053919200</div><h4>Description</h4><p>German culture and family fun.</p><div>Map</div>`);
  assert.equal(detail.title, "Tuscaloosa Oktoberfest");
  assert.equal(detail.venue, "Government Plaza");
  assert.match(detail.start, /-10-03T10:00:00/);
  assert.match(detail.end, /-10-03T16:00:00/);
  assert.equal(detail.timeStatus, "confirmed");
  assert.equal(detail.description, "German culture and family fun.");
});
