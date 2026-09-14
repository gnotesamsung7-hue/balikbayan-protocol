// Edge-case smoke test: a birth year old enough to reach the fragmentary 1900s archive bucket.
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

  const input = $("input-birthdate");
  input.value = "1905-03-01";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  $("btn-confirm-birthdate").click();
  await new Promise((r) => setTimeout(r, 20));

  const weakRow = doc.querySelector("#timeline-track .timeline-item.weak");
  if (!weakRow) fail("expected a weak-signal row for a 1905 birth year");
  else ok("weak-signal row present: " + weakRow.textContent.replace(/\s+/g, " ").trim());

  weakRow.click();
  await new Promise((r) => setTimeout(r, 1000));
  if ($("screen-dossier").hidden) fail("dossier should show after jumping into the 1900s bucket");
  if (!$("dossier-year").textContent) fail("dossier year missing");
  else ok("jumped to year " + $("dossier-year").textContent);
  if (!$("dossier-era-label").textContent.includes("FRAGMENTARY")) fail("era label should flag SIGNAL: FRAGMENTARY, got: " + $("dossier-era-label").textContent);
  else ok("era label correctly flags fragmentary signal: " + $("dossier-era-label").textContent);
  if (!$("dossier-era-label").classList.contains("weak-signal")) fail("era label should carry weak-signal styling class");
  else ok("weak-signal CSS class applied");

  const unlocked = JSON.parse(window.localStorage.getItem("bbp_achievements") || "[]");
  if (!unlocked.includes("deep_signal")) fail("deep_signal achievement should unlock after visiting 1900s, unlocked=" + JSON.stringify(unlocked));
  else ok("deep_signal achievement unlocked: " + JSON.stringify(unlocked));

  // now test a truly out-of-range year (before 1900) is unreachable via timeline but the render function handles it gracefully.
  // Simulate by checking the "no signal" uncharted block exists only if birth < 1900 (it's not, since birth=1905), so confirm absence:
  const nodataRow = doc.querySelector("#timeline-track .timeline-item.nodata");
  if (nodataRow) fail("birth year 1905 should not produce an uncharted/no-data row (min year is 1900), found one");
  else ok("no stray 'uncharted era' row for a 1905 birth year, as expected");

  console.log(process.exitCode === 1 ? "\n=== SOME CHECKS FAILED ===" : "\n=== ALL CHECKS PASSED ===");
  window.close();
  process.exit(process.exitCode || 0);
}

run().catch((e) => { console.error("Uncaught error:", e); process.exit(1); });
