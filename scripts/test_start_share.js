// Smoke test for the title/START screen and the SHARE/DOWNLOAD QR panel.
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

  // ---- start screen shown first, nav/hud-stats hidden on it ----
  if (!$("screen-start") || $("screen-start").hidden) fail("start screen should be visible on a fresh load");
  else ok("start screen visible on fresh load");
  if (!$("screen-boot").hidden) fail("boot screen should stay hidden until BEGIN is tapped");
  else ok("boot screen correctly hidden behind the start screen");
  if (!$("hud-stats").hidden) fail("hud stats should stay hidden on the start screen");
  if (!$("nav-bar").hidden) fail("nav bar should stay hidden on the start screen");

  // ---- tapping BEGIN with no saved birthdate goes to the origin-lock (boot) screen ----
  $("btn-start-begin").click();
  if ($("screen-boot").hidden) fail("boot screen should show after tapping BEGIN with no saved birthdate");
  else ok("BEGIN correctly routes a first-time user to the origin-lock screen");
  if (!$("screen-start").hidden) fail("start screen should hide once boot screen shows");

  // ---- complete origin lock, then simulate a relaunch: BEGIN should skip straight home ----
  const input = $("input-birthdate");
  input.value = "1990-06-15";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  $("btn-confirm-birthdate").click();
  await new Promise((r) => setTimeout(r, 20));
  if ($("screen-home").hidden) fail("home screen should show after locking origin");

  // reload the app in the same window (same localStorage) to simulate a relaunch
  window.BBP_showScreen("screen-start");
  if ($("screen-start").hidden) fail("manually showing the start screen should work for this relaunch simulation");
  $("btn-start-begin").click();
  await new Promise((r) => setTimeout(r, 20));
  if (!$("screen-boot").hidden) fail("returning user (birthdate already saved) should NOT be sent back to the origin-lock screen");
  if ($("screen-home").hidden) fail("returning user should land on home after tapping BEGIN again");
  else ok("returning user with a saved birthdate skips origin-lock and goes straight home via BEGIN");

  // ---- SHARE / DOWNLOAD panel: QR renders, starts collapsed ----
  const qrBox = $("share-qr-box");
  if (!qrBox.hidden) fail("share QR box should start collapsed");
  else ok("share QR box starts collapsed");
  const svg = doc.querySelector("#share-qr-code svg");
  if (!svg) fail("a QR SVG should be pre-rendered into #share-qr-code even while the box is collapsed");
  else ok("QR code SVG rendered into the share panel");
  const rects = doc.querySelectorAll("#share-qr-code svg path, #share-qr-code svg rect");
  if (rects.length === 0) fail("QR SVG should contain drawn modules (path/rect elements)");
  else ok("QR SVG contains drawn modules");

  const linkText = $("share-qr-link").textContent;
  if (!/^https:\/\/.+\.github\.io\/balikbayan-protocol\/download\.html$/.test(linkText)) {
    fail("share link should point at the GitHub Pages download page, got: " + linkText);
  } else ok("share link correctly points at the download page: " + linkText);

  // ---- toggling the SHARE / DOWNLOAD button shows/hides the QR box ----
  $("btn-show-share").click();
  if (qrBox.hidden) fail("share QR box should show after clicking SHARE / DOWNLOAD");
  else ok("share QR box shown after clicking SHARE / DOWNLOAD");
  $("btn-show-share").click();
  if (!qrBox.hidden) fail("share QR box should re-hide on a second click");
  else ok("share QR box re-hides on a second click");

  // ---- copy-link button doesn't throw even without a real clipboard API ----
  $("btn-show-share").click();
  let threw = false;
  try { $("btn-copy-share-link").click(); } catch (e) { threw = true; console.error(e); }
  if (threw) fail("clicking COPY LINK should not throw even when navigator.clipboard is unavailable");
  else ok("COPY LINK click handled without throwing");

  console.log(process.exitCode === 1 ? "\n=== SOME CHECKS FAILED ===" : "\n=== ALL CHECKS PASSED ===");
  window.close();
  process.exit(process.exitCode || 0);
}

run().catch((e) => { console.error("Uncaught error:", e); process.exit(1); });
