// Smoke test for the daily headline / trending ticker feature.
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

  $("btn-start-begin").click();
  const input = $("input-birthdate");
  input.value = "1980-01-01";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  $("btn-confirm-birthdate").click();
  await new Promise((r) => setTimeout(r, 20));

  function jumpTo(dateStr) {
    const slider = $("jump-slider");
    const ms = Date.UTC(...dateStr.split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
    slider.value = String(ms);
    slider.dispatchEvent(new window.Event("input", { bubbles: true }));
    $("btn-engage").click();
  }

  // 1) Exact real historical date: 1986-02-25 (EDSA / Marcos flees) -- pre-Inquirer.net launch (Oct 1997)
  jumpTo("1986-02-25");
  await new Promise((r) => setTimeout(r, 1000));
  if ($("dossier-headline").hidden) fail("headline panel should show for an exact historical date match");
  else ok("headline shown for 1986-02-25: " + $("headline-text").textContent);
  if ($("dossier-headline").classList.contains("observance")) fail("exact date match should NOT use the observance style");
  if (!$("headline-text").textContent.includes("MARCOS FLEES")) fail("wrong headline for 1986-02-25, got: " + $("headline-text").textContent);
  if ($("dossier-ticker").hidden) fail("ambient ticker should also be visible");
  else ok("ambient ticker visible: " + $("ticker-content").textContent.slice(0, 80) + "...");
  let inquirerBlock = $("headline-inquirer").innerHTML;
  if (!inquirerBlock.includes("INQUIRER_NET_NOT_FOUND")) fail("1986 (pre-launch) should show the INQUIRER.net error log, got: " + inquirerBlock.slice(0, 160));
  else ok("pre-Inquirer.net-launch date correctly shows the error log instead of a source link");
  if (doc.querySelector("#headline-inquirer a")) fail("no real Inquirer.net link should be present for a pre-1997 date");
  else ok("no Inquirer.net link rendered for the pre-launch date, as expected");

  // 1b) Morning briefing / pulse / anachronist's warning should also render for a data year
  if ($("dossier-morning").hidden) fail("morning briefing panel should show for a data year");
  else ok("morning briefing shown: " + $("morning-headline").textContent);
  if ($("dossier-pulse").hidden) fail("the pulse panel should show for a data year");
  else ok("the pulse shown, political current: " + $("pulse-political").textContent.slice(0, 60) + "...");
  if ($("dossier-anachronism").hidden) fail("anachronist's warning panel should show for a data year");
  else ok("anachronist's warning shown: " + $("anachronism-text").textContent.slice(0, 60) + "...");

  // 2) Recurring observance, no exact-event match: 2005-06-12 (Independence Day, not in HISTORICAL_DATES) -- post-launch
  doc.querySelector("#btn-jump-again").click();
  await new Promise((r) => setTimeout(r, 10));
  jumpTo("2005-06-12");
  await new Promise((r) => setTimeout(r, 1000));
  if ($("dossier-headline").hidden) fail("headline panel should show for a recurring observance");
  else ok("headline shown for 2005-06-12: " + $("headline-text").textContent);
  if (!$("dossier-headline").classList.contains("observance")) fail("recurring observance should use the observance style");
  else ok("observance styling applied correctly");
  if ($("headline-text").textContent !== "INDEPENDENCE DAY") fail("expected INDEPENDENCE DAY headline, got: " + $("headline-text").textContent);
  const inquirerLink = doc.querySelector("#headline-inquirer a");
  if (!inquirerLink || !inquirerLink.href.includes("inquirer.net")) fail("2005 Independence Day (post-launch) should show a real Inquirer.net link, got: " + $("headline-inquirer").innerHTML.slice(0, 200));
  else ok("post-launch recurring observance shows a real Inquirer.net source link: " + inquirerLink.href);
  const inquirerMeta = doc.querySelector("#headline-inquirer .headline-source-meta");
  if (!inquirerMeta || !inquirerMeta.textContent.includes("Inquirer")) fail("Inquirer.net attribution line should mention Inquirer.net/byline");
  else ok("Inquirer.net attribution line present: " + inquirerMeta.textContent.slice(0, 90));

  // 3) An ordinary day with no match at all: 1980-05-14
  doc.querySelector("#btn-jump-again").click();
  await new Promise((r) => setTimeout(r, 10));
  jumpTo("1980-05-14");
  await new Promise((r) => setTimeout(r, 1000));
  if (!$("dossier-headline").hidden) fail("headline panel should be hidden for an ordinary day with no match, got: " + $("headline-text").textContent);
  else ok("no headline shown for an ordinary day, as expected");
  if ($("dossier-ticker").hidden) fail("ambient ticker should still show on an ordinary day (engagement fallback)");
  else ok("ambient ticker still shows on an ordinary day: " + $("ticker-content").textContent.slice(0, 80) + "...");
  if ($("dossier-morning").hidden) fail("morning briefing should still show on an ordinary day");
  else ok("morning briefing still shows on an ordinary day: " + $("morning-headline").textContent);

  // 4) front_page achievement should have unlocked from the exact-date hit
  const unlocked = JSON.parse(window.localStorage.getItem("bbp_achievements") || "[]");
  if (!unlocked.includes("front_page")) fail("front_page achievement should be unlocked, got: " + JSON.stringify(unlocked));
  else ok("front_page achievement unlocked: " + JSON.stringify(unlocked));

  console.log(process.exitCode === 1 ? "\n=== SOME CHECKS FAILED ===" : "\n=== ALL CHECKS PASSED ===");
  window.close();
  process.exit(process.exitCode || 0);
}

run().catch((e) => { console.error("Uncaught error:", e); process.exit(1); });
