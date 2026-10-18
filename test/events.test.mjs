import test from "node:test";
import assert from "node:assert/strict";
import { parseVisitDetail } from "../scripts/fetch-events.mjs";

test("Visit detail parser supplies featured and calendar event details", () => {
  const detail = parseVisitDetail(`<h1>Tuscaloosa Oktoberfest</h1><div>Location: Government Plaza – 618 Almon Ave., Tuscaloosa, AL</div><div>When: Oct 3 at 10:00am - 4:00pm</div><div>Phone: 2053919200</div><h4>Description</h4><p>German culture and family fun.</p><div>Map</div>`);
  assert.equal(detail.title, "Tuscaloosa Oktoberfest");
  assert.equal(detail.venue, "Government Plaza");
  assert.match(detail.start, /-10-03T10:00:00/);
  assert.match(detail.end, /-10-03T16:00:00/);
  assert.equal(detail.timeStatus, "confirmed");
  assert.equal(detail.description, "German culture and family fun.");
});
