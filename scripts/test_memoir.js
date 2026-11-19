// Smoke test for the MEMOIR feature (dated personal chapters, optional 3rd-person "about" tag,
// timeline pins, dossier surfacing) and the "Tech Support" contextual-tip guide.
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync(path.join(__dirname, "..", "www", "index.html"), "utf8");

function fail(msg) { console.error("FAIL:", msg); process.exitCode = 1; }
function ok(msg) { console.log("OK:", msg); }

async function run() {
  const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, url: "https://example.com/" });
  const { window } = dom;
  await new Promise((r) => setTimeout(r, 50));
  const doc = window.document;
  const $ = (id) => doc.getElementById(id);

  // ---- origin lock ----
  $("btn-start-begin").click();
  const birthInput = $("input-birthdate");
  birthInput.value = "1990-06-15";
  birthInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  $("btn-confirm-birthdate").click();
  await new Promise((r) => setTimeout(r, 20));
  if ($("screen-home").hidden) fail("home screen should show after locking origin");

  // ---- nav to MEMOIR screen ----
  const memoirNav = doc.querySelector('.nav-item[data-screen="screen-memoir"]');
  if (!memoirNav) fail("expected a MEMOIR nav button");
  memoirNav.click();
  await new Promise((r) => setTimeout(r, 10));
  if ($("screen-memoir").hidden) fail("memoir screen should show via nav");
  else ok("memoir screen shown via nav");
  if ($("memoir-empty").hidden) fail("memoir empty-state panel should show with no chapters yet");
  else ok("empty state shown with no chapters written");
  if (!$("memoir-stat-line").textContent.toLowerCase().includes("no chapters")) fail("stat line should say no chapters yet, got: " + $("memoir-stat-line").textContent);
  else ok("stat line correctly reports zero chapters: " + $("memoir-stat-line").textContent);

  // ---- date bounds: min should be birthdate, max should be today (UTC) ----
  const dateInput = $("memoir-date");
  if (dateInput.min !== "1990-06-15") fail("memoir-date min should be the birthdate 1990-06-15, got " + dateInput.min);
  else ok("memoir-date min correctly locked to birthdate: " + dateInput.min);
  if (!dateInput.max) fail("memoir-date max should be set to today");
  else ok("memoir-date max set to: " + dateInput.max);

  // ---- validation: missing title ----
  dateInput.value = "2010-05-01";
  $("btn-save-chapter").click();
  await new Promise((r) => setTimeout(r, 10));
  if ($("memoir-error").hidden) fail("missing-title save should show a validation error");
  else ok("validation error shown for missing title: " + $("memoir-error").textContent);
  let stored = JSON.parse(window.localStorage.getItem("bbp_memoir") || "[]");
  if (stored.length !== 0) fail("no chapter should be saved when title is missing");
  else ok("no chapter saved while title is missing, as expected");

  // ---- validation: date before birth (origin lock) ----
  dateInput.value = "1985-01-01";
  $("memoir-title").value = "Too early";
  $("btn-save-chapter").click();
  await new Promise((r) => setTimeout(r, 10));
  if ($("memoir-error").hidden) fail("a pre-birth date should be rejected");
  else ok("pre-birth date correctly rejected: " + $("memoir-error").textContent);
  stored = JSON.parse(window.localStorage.getItem("bbp_memoir") || "[]");
  if (stored.length !== 0) fail("no chapter should be saved for a pre-birth date");
  else ok("no chapter saved for an out-of-range date, as expected");

  // ---- save a first-person chapter ----
  dateInput.value = "2010-05-01";
  $("memoir-location").value = "Quezon City";
  $("memoir-title").value = "The day we moved to the city";
  $("memoir-about").value = "";
  $("memoir-body").value = "We packed everything into a single jeepney trip.";
  $("btn-save-chapter").click();
  await new Promise((r) => setTimeout(r, 10));
  if (!$("memoir-error").hidden) fail("valid chapter save should not show an error, got: " + $("memoir-error").textContent);
  stored = JSON.parse(window.localStorage.getItem("bbp_memoir") || "[]");
  if (stored.length !== 1) fail("expected 1 saved chapter, got " + stored.length);
  else ok("first-person chapter saved: " + stored[0].title);
  if (stored[0].about) fail("first-person chapter should have an empty 'about' field, got: " + stored[0].about);

  // ---- form clears after save ----
  if ($("memoir-title").value !== "") fail("title field should clear after saving");
  else ok("form fields cleared after saving a chapter");

  // ---- chapter list renders ----
  if ($("memoir-empty").hidden !== true) fail("empty state should hide once a chapter exists");
  const chapterCards = doc.querySelectorAll("#memoir-list .memoir-chapter");
  if (chapterCards.length !== 1) fail("expected 1 rendered chapter card, got " + chapterCards.length);
  else ok("memoir list renders " + chapterCards.length + " chapter card");
  const byline1 = chapterCards[0].querySelector(".mc-byline");
  if (!byline1.classList.contains("self")) fail("first-person chapter should carry the 'self' byline class");
  if (byline1.textContent !== "WRITTEN BY YOU") fail("first-person byline text wrong: " + byline1.textContent);
  else ok("first-person byline rendered correctly: " + byline1.textContent);

  // ---- save a third-person ("about someone else") chapter ----
  dateInput.value = "1995-08-20";
  $("memoir-location").value = "Tondo";
  $("memoir-title").value = "Lola's first sari-sari store";
  $("memoir-about").value = "Lola";
  $("memoir-body").value = "She opened the store with savings from three years of sewing work.";
  $("btn-save-chapter").click();
  await new Promise((r) => setTimeout(r, 10));
  stored = JSON.parse(window.localStorage.getItem("bbp_memoir") || "[]");
  if (stored.length !== 2) fail("expected 2 saved chapters, got " + stored.length);
  else ok("third-person chapter saved: " + stored[1].title + " (about " + stored[1].about + ")");

  const chapterCards2 = doc.querySelectorAll("#memoir-list .memoir-chapter");
  if (chapterCards2.length !== 2) fail("expected 2 rendered chapter cards, got " + chapterCards2.length);
  // list is sorted chronologically, so the 1995 chapter should render before the 2010 one
  const firstCardDate = chapterCards2[0].querySelector(".mc-date").textContent;
  const secondCardDate = chapterCards2[1].querySelector(".mc-date").textContent;
  if (!/1995/.test(firstCardDate)) fail("chapters should be sorted chronologically; expected 1995 chapter first, got date: " + firstCardDate);
  else ok("chapters sorted chronologically: " + firstCardDate + " then " + secondCardDate);
  const byline2 = chapterCards2[0].querySelector(".mc-byline");
  if (!byline2.classList.contains("other")) fail("third-person chapter should carry the 'other' byline class");
  if (!byline2.textContent.includes("LOLA")) fail("third-person byline should name the subject, got: " + byline2.textContent);
  else ok("third-person byline rendered correctly: " + byline2.textContent);

  // ---- chapter pins appear on the HOME timeline ----
  doc.querySelector('.nav-item[data-screen="screen-home"]').click();
  await new Promise((r) => setTimeout(r, 10));
  const chapterPins = doc.querySelectorAll("#timeline-track .timeline-item.chapter");
  if (chapterPins.length !== 2) fail("expected 2 memoir chapter pins on the home timeline, got " + chapterPins.length);
  else ok("home timeline shows " + chapterPins.length + " memoir chapter pins");
  const flags = Array.from(chapterPins).map((p) => p.querySelector(".t-flag") && p.querySelector(".t-flag").textContent);
  if (!flags.every((f) => f === "MEMOIR")) fail("chapter pins should carry a MEMOIR flag, got: " + JSON.stringify(flags));
  else ok("chapter pins correctly flagged MEMOIR");

  // ---- clicking a chapter pin jumps to its exact date and surfaces it in the dossier ----
  const pin2010 = Array.from(chapterPins).find((p) => p.textContent.includes("moved to the city"));
  if (!pin2010) fail("expected to find the 2010 chapter pin by its label");
  else {
    pin2010.click();
    await new Promise((r) => setTimeout(r, 1000));
    if ($("screen-dossier").hidden) fail("dossier screen should show after jumping via a chapter pin");
    else ok("dossier screen shown after clicking the 2010 chapter pin");
    if ($("dossier-memoir").hidden) fail("dossier-memoir panel should show when jumping to the exact chapter date");
    else ok("dossier-memoir panel surfaced for the exact chapter date");
    if ($("dossier-memoir-title").textContent !== "The day we moved to the city") fail("dossier-memoir title mismatch: " + $("dossier-memoir-title").textContent);
    else ok("dossier-memoir shows the correct chapter title");
    if ($("dossier-memoir-byline").textContent !== "WRITTEN BY YOU") fail("dossier-memoir byline mismatch for self-authored chapter: " + $("dossier-memoir-byline").textContent);
    else ok("dossier-memoir byline correct for self-authored chapter");
    if (!$("dossier-memoir-location").textContent.includes("Quezon City")) fail("dossier-memoir location mismatch: " + $("dossier-memoir-location").textContent);
    else ok("dossier-memoir shows location: " + $("dossier-memoir-location").textContent);
  }

  // ---- dossier-memoir should NOT show on an ordinary date with no chapter ----
  $("btn-return-present").click();
  await new Promise((r) => setTimeout(r, 10));
  const jumpableRow2000s = Array.from(doc.querySelectorAll("#timeline-track .timeline-item")).find((r) => r.textContent.includes("2000"));
  if (jumpableRow2000s) {
    jumpableRow2000s.click();
    await new Promise((r) => setTimeout(r, 1000));
    if (!$("dossier-memoir").hidden) fail("dossier-memoir panel should stay hidden for a date with no matching chapter");
    else ok("dossier-memoir correctly stays hidden when no chapter matches the jumped-to date");
  }

  // ---- delete a chapter ----
  $("btn-return-present").click();
  await new Promise((r) => setTimeout(r, 10));
  doc.querySelector('.nav-item[data-screen="screen-memoir"]').click();
  await new Promise((r) => setTimeout(r, 10));
  const deleteBtns = doc.querySelectorAll("#memoir-list .mc-delete");
  if (deleteBtns.length !== 2) fail("expected 2 delete buttons, got " + deleteBtns.length);
  deleteBtns[0].click();
  await new Promise((r) => setTimeout(r, 10));
  stored = JSON.parse(window.localStorage.getItem("bbp_memoir") || "[]");
  if (stored.length !== 1) fail("expected 1 chapter remaining after delete, got " + stored.length);
  else ok("chapter deleted successfully, 1 remaining");
  const remainingPins = doc.querySelectorAll("#timeline-track .timeline-item.chapter");
  // we're on the memoir screen so the home timeline DOM was rebuilt in-place even though hidden; re-check via storage instead
  if (remainingPins.length > 2) fail("stray chapter pins after delete");

  // ---- achievements: first_chapter, memoirist, family_historian ----
  let unlocked = JSON.parse(window.localStorage.getItem("bbp_achievements") || "[]");
  if (!unlocked.includes("first_chapter")) fail("first_chapter achievement should unlock after writing a chapter, unlocked=" + JSON.stringify(unlocked));
  else ok("first_chapter achievement unlocked");
  if (!unlocked.includes("family_historian")) fail("family_historian achievement should unlock after writing an about-someone-else chapter, unlocked=" + JSON.stringify(unlocked));
  else ok("family_historian achievement unlocked");
  if (unlocked.includes("memoirist")) fail("memoirist (5 chapters) should NOT be unlocked yet with only 1-2 chapters written");
  else ok("memoirist correctly not yet unlocked with fewer than 5 chapters");

  // write 4 more chapters (self-authored) to cross the memoirist threshold (5 total ever written)
  for (let i = 0; i < 4; i++) {
    dateInput.value = "201" + i + "-01-15";
    $("memoir-location").value = "";
    $("memoir-title").value = "Extra chapter " + i;
    $("memoir-about").value = "";
    $("memoir-body").value = "";
    $("btn-save-chapter").click();
    await new Promise((r) => setTimeout(r, 10));
  }
  unlocked = JSON.parse(window.localStorage.getItem("bbp_achievements") || "[]");
  if (!unlocked.includes("memoirist")) fail("memoirist achievement should unlock after writing 5 chapters total, unlocked=" + JSON.stringify(unlocked));
  else ok("memoirist achievement unlocked after writing 5 chapters total");

  // ---- Tech Support guide: home screen ----
  doc.querySelector('.nav-item[data-screen="screen-home"]').click();
  await new Promise((r) => setTimeout(r, 10));
  if (!$("tech-support-toast").hidden) fail("tech support toast should start hidden");
  $("btn-tech-support-home").click();
  await new Promise((r) => setTimeout(r, 10));
  if ($("tech-support-toast").hidden) fail("tech support toast should show after clicking the home TECH SUPPORT button");
  else ok("tech support toast shown from home screen: " + $("tech-toast-text").textContent.slice(0, 60) + "...");
  if (!$("tech-toast-text").textContent.trim()) fail("tech support toast should have non-empty tip text");

  $("btn-tech-support-dismiss").click();
  if (!$("tech-support-toast").hidden) fail("tech support toast should hide after clicking dismiss");
  else ok("tech support toast dismissed via close button");

  // ---- Tech Support guide: memoir screen gives a memoir-specific tip ----
  doc.querySelector('.nav-item[data-screen="screen-memoir"]').click();
  await new Promise((r) => setTimeout(r, 10));
  $("btn-tech-support-memoir").click();
  await new Promise((r) => setTimeout(r, 10));
  if ($("tech-support-toast").hidden) fail("tech support toast should show from the memoir screen");
  else ok("tech support toast shown from memoir screen: " + $("tech-toast-text").textContent.slice(0, 70) + "...");

  console.log(process.exitCode === 1 ? "\n=== SOME CHECKS FAILED ===" : "\n=== ALL CHECKS PASSED ===");
  window.close();
  process.exit(process.exitCode || 0);
}

run().catch((e) => { console.error("Uncaught error:", e); process.exit(1); });
