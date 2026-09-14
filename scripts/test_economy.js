// Smoke test for: fuel price / peso-dollar economic snapshot, the Wikipedia "verify the record"
// source link, and the POV morning-briefing rewrite (typical-day narrative + suggestion).
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
  input.value = "1975-01-01";
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

  // 1) 1970s: has a fuel note (1973/1979 oil crisis) with a real source link, and an fx note with a Wikipedia source.
  jumpTo("1978-05-14");
  await new Promise((r) => setTimeout(r, 1000));
  if ($("dossier-economy").hidden) fail("economic snapshot panel should show for a data year");
  else ok("economic snapshot shown");
  if (!$("economy-fuel-text").textContent.includes("oil shocks")) fail("1970s fuel note should mention the oil shocks, got: " + $("economy-fuel-text").textContent.slice(0, 80));
  else ok("1970s fuel note present: " + $("economy-fuel-text").textContent.slice(0, 90) + "...");
  const fuelSourceLink = doc.querySelector("#economy-fuel-source a");
  if (!fuelSourceLink || !fuelSourceLink.href.includes("rappler.com")) fail("1970s fuel source should link to the Rappler oil-crisis explainer, got: " + $("economy-fuel-source").innerHTML);
  else ok("1970s fuel source link present: " + fuelSourceLink.href);
  const fxSourceLink = doc.querySelector("#economy-fx-source a");
  if (!fxSourceLink || !fxSourceLink.href.includes("wikipedia.org/wiki/Philippine_peso")) fail("fx source should link to the Wikipedia Philippine peso article, got: " + $("economy-fx-source").innerHTML);
  else ok("fx source links to Wikipedia: " + fxSourceLink.href);

  // 2) The "verify the record" Wikipedia link should appear among the factpanels.
  const wikiLink = doc.querySelector("#wikipedia-source a");
  if (!wikiLink || !wikiLink.href.includes("en.wikipedia.org/wiki/Martial_law_under_Ferdinand_Marcos")) fail("expected a Wikipedia verify link for the 1970s (Martial law), got: " + (wikiLink && wikiLink.href));
  else ok("Wikipedia verify-the-record link present: " + wikiLink.href);

  // 3) Morning briefing should read as second-person POV, name the actual weekday, and include a suggestion.
  const atmosphere = $("morning-atmosphere").textContent;
  if (!atmosphere.toLowerCase().includes("you step outside")) fail("morning briefing should be POV ('you step outside...'), got: " + atmosphere);
  else ok("morning briefing is POV: " + atmosphere.slice(0, 90) + "...");
  if (!atmosphere.includes("Sunday")) fail("morning briefing should name the real weekday for 1978-05-14 (a Sunday), got: " + atmosphere);
  else ok("morning briefing correctly names the actual weekday: Sunday");
  const suggestion = $("morning-suggestion").textContent;
  if (!suggestion.startsWith("What you could do today:")) fail("morning briefing should include a 'what you could do today' suggestion, got: " + suggestion);
  else ok("morning briefing suggestion present: " + suggestion.slice(0, 90) + "...");

  // 4) 2000s bucket: fuel note should cite the real 2008 price swing (₱60 -> ₱31 per liter).
  doc.querySelector("#btn-jump-again").click();
  await new Promise((r) => setTimeout(r, 10));
  jumpTo("2008-09-01");
  await new Promise((r) => setTimeout(r, 1000));
  const fuelText2000s = $("economy-fuel-text").textContent;
  if (!fuelText2000s.includes("60") || !fuelText2000s.includes("31")) fail("2000s fuel note should cite the 2008 ₱60->₱31 swing, got: " + fuelText2000s);
  else ok("2000s fuel note cites the real 2008 price swing: " + fuelText2000s.slice(0, 100) + "...");

  // 5) 2026 bucket: exact-date energy-emergency headline, plus fuel/fx notes reflecting the real 2026 crisis.
  doc.querySelector("#btn-jump-again").click();
  await new Promise((r) => setTimeout(r, 10));
  jumpTo("2026-03-24");
  await new Promise((r) => setTimeout(r, 1000));
  if ($("dossier-headline").hidden || !$("headline-text").textContent.includes("ENERGY EMERGENCY")) fail("expected the national energy emergency headline on 2026-03-24, got: " + $("headline-text").textContent);
  else ok("2026-03-24 shows the real national energy emergency headline: " + $("headline-text").textContent);
  const fuelText2026 = $("economy-fuel-text").textContent;
  if (!fuelText2026.includes("Hormuz")) fail("2026 fuel note should mention the Strait of Hormuz closure, got: " + fuelText2026);
  else ok("2026 fuel note mentions the real Strait of Hormuz crisis: " + fuelText2026.slice(0, 100) + "...");

  console.log(process.exitCode === 1 ? "\n=== SOME CHECKS FAILED ===" : "\n=== ALL CHECKS PASSED ===");
  window.close();
  process.exit(process.exitCode || 0);
}

run().catch((e) => { console.error("Uncaught error:", e); process.exit(1); });
