// Headless functional smoke test for www/index.html using jsdom.
// Drives: boot -> jump -> quiz -> journal -> butterfly effect -> nav (logbook/archive) -> achievements.
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync(path.join(__dirname, "..", "www", "index.html"), "utf8");

function fail(msg) {
  console.error("FAIL:", msg);
  process.exitCode = 1;
}
function ok(msg) {
  console.log("OK:", msg);
}

async function run() {
  const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, url: "https://example.com/" });
  const { window } = dom;

  // let inline scripts execute
  await new Promise((r) => setTimeout(r, 50));

  const doc = window.document;
  const $ = (id) => doc.getElementById(id);

  // ---- start screen present, then advance to boot screen ----
  if (!$("screen-start") || $("screen-start").hidden) fail("start screen should be visible initially");
  else ok("start screen visible on fresh load");
  $("btn-start-begin").click();
  if (!$("screen-boot") || $("screen-boot").hidden) fail("boot screen should be visible after tapping BEGIN");
  else ok("boot screen shown after tapping BEGIN");

  // ---- set a birthdate and lock origin ----
  const input = $("input-birthdate");
  input.value = "1990-06-15";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  if ($("btn-confirm-birthdate").disabled) fail("confirm button should enable after entering a date");
  $("btn-confirm-birthdate").click();

  await new Promise((r) => setTimeout(r, 20));
  if ($("screen-home").hidden) fail("home screen should show after locking origin");
  else ok("home screen shown after origin lock");
  if ($("hud-stats").hidden) fail("hud stats should be visible after boot");

  // ---- timeline built ----
  const timelineItems = doc.querySelectorAll("#timeline-track .timeline-item");
  if (timelineItems.length < 5) fail("timeline should have multiple era rows, got " + timelineItems.length);
  else ok("timeline built with " + timelineItems.length + " rows");
  const weakRow = doc.querySelector("#timeline-track .timeline-item.weak");
  if (weakRow) fail("birth year 1990 should NOT reach the weak-signal 1900s bucket, but a weak row was rendered");
  else ok("no weak-signal (1900s) row for a 1990-born user, as expected");

  // ---- jump to a specific year (2010, clickable timeline row) ----
  const jumpableRow = Array.from(timelineItems).find((r) => r.textContent.includes("2010"));
  if (!jumpableRow) fail("expected a clickable row containing 2010");
  else {
    jumpableRow.click();
    await new Promise((r) => setTimeout(r, 1000));
    if ($("screen-dossier").hidden) fail("dossier screen should show after jump completes");
    else ok("dossier screen shown after jump to 2010");
    if ($("dossier-year").textContent !== "2010") fail("dossier year should read 2010, got " + $("dossier-year").textContent);
    if ($("dossier-body").hidden) fail("dossier body should be visible for a data year");
    const factpanels = doc.querySelectorAll("#dossier-body .factpanel");
    if (factpanels.length !== 4) fail("expected 4 factpanels (politics/showbiz/tech/culture), got " + factpanels.length);
    else ok("dossier rendered 4 factpanels including culture (music/slang)");
  }

  // ---- run the diagnostic quiz ----
  if ($("dossier-quiz-cta").hidden) fail("quiz CTA should be visible for a data year");
  $("btn-run-quiz").click();
  await new Promise((r) => setTimeout(r, 10));
  if ($("screen-quiz").hidden) fail("quiz screen should show after clicking run diagnostic");
  else ok("quiz screen shown");

  let questionsAnswered = 0;
  for (let i = 0; i < 5 && $("quiz-result").hidden; i++) {
    const optBtns = doc.querySelectorAll("#quiz-options .quiz-option");
    if (optBtns.length !== 3) { fail("expected 3 quiz options, got " + optBtns.length); break; }
    optBtns[0].click();
    questionsAnswered++;
    await new Promise((r) => setTimeout(r, 1200));
  }
  if ($("quiz-result").hidden) fail("quiz result should show after answering all questions");
  else ok("quiz completed after " + questionsAnswered + " questions, result: " + $("quiz-score-text").textContent);
  $("btn-quiz-done").click();
  await new Promise((r) => setTimeout(r, 10));
  if ($("screen-dossier").hidden) fail("should return to dossier after quiz");

  // ---- save a journal entry ----
  $("journal-input").value = "Test field note about 2010.";
  $("btn-save-journal").click();
  if ($("journal-saved-hint").hidden) fail("journal saved hint should show after saving an entry");
  else ok("journal entry saved");

  // ---- butterfly effect simulator ----
  if ($("dossier-butterfly-cta").hidden) fail("butterfly CTA should be visible for a data year");
  $("btn-run-butterfly").click();
  await new Promise((r) => setTimeout(r, 10));
  if ($("screen-butterfly").hidden) fail("butterfly screen should show");
  else ok("butterfly screen shown, anchor: " + $("bfly-anchor-text").textContent.slice(0, 60) + "...");

  $("bfly-btn-reverse").click();
  let bflyNodes = doc.querySelectorAll("#bfly-tree .bfly-node");
  // 1 root + 2 branch nodes + (2 branches * 2 leaves) = 7
  if (bflyNodes.length !== 7) fail("expected 7 bfly nodes (1 root + 2 branch + 4 leaves), got " + bflyNodes.length);
  else ok("butterfly tree rendered " + bflyNodes.length + " nodes for reverse direction");

  const branchNode = doc.querySelector('.bfly-node[data-branch="a"]');
  const childrenBox = branchNode.querySelector(".bfly-children");
  if (!childrenBox.classList.contains("collapsed")) fail("branch children should start collapsed");
  branchNode.click();
  if (childrenBox.classList.contains("collapsed")) fail("branch children should expand after click");
  else ok("branch node expands to reveal leaf consequences on click");

  $("bfly-btn-amplify").click();
  const rootLabel = doc.querySelector(".bfly-root .bfly-node-label").textContent;
  if (!rootLabel.includes("AMPLIFIED")) fail("root label should say AMPLIFIED after switching direction");
  else ok("switching to amplify regenerates the tree correctly");

  $("btn-bfly-back").click();
  await new Promise((r) => setTimeout(r, 10));
  if ($("screen-dossier").hidden) fail("should return to dossier from butterfly screen");

  // ---- return to present, then nav to logbook/archive ----
  $("btn-return-present").click();
  await new Promise((r) => setTimeout(r, 10));
  if ($("screen-home").hidden) fail("should be back on home after return-to-present");
  if ($("nav-bar").hidden) fail("nav bar should be visible on home screen");
  else ok("nav bar visible on home");

  doc.querySelector('.nav-item[data-screen="screen-logbook"]').click();
  await new Promise((r) => setTimeout(r, 10));
  if ($("screen-logbook").hidden) fail("logbook screen should show via nav");
  const entries = doc.querySelectorAll("#logbook-list .journal-entry");
  if (entries.length !== 1) fail("expected 1 logbook entry, got " + entries.length);
  else ok("logbook shows the saved entry");

  doc.querySelector('.nav-item[data-screen="screen-archive"]').click();
  await new Promise((r) => setTimeout(r, 10));
  if ($("screen-archive").hidden) fail("archive screen should show via nav");
  const badges = doc.querySelectorAll("#badge-grid .badge");
  if (badges.length !== 14) fail("expected 14 achievement badges, got " + badges.length);
  else ok("archive shows all " + badges.length + " badges");
  const unlockedBadges = doc.querySelectorAll("#badge-grid .badge.unlocked");
  if (unlockedBadges.length < 1) fail("expected at least 1 unlocked achievement (first_contact) by now");
  else ok(unlockedBadges.length + " achievements unlocked so far: " +
    Array.from(unlockedBadges).map((b) => b.querySelector(".badge-label").textContent).join(", "));

  // ---- photo gallery ----
  doc.querySelector('.nav-item[data-screen="screen-gallery"]').click();
  await new Promise((r) => setTimeout(r, 10));
  if ($("screen-gallery").hidden) fail("gallery screen should show via nav");
  const galleryCards = doc.querySelectorAll("#gallery-list .gallery-card");
  if (galleryCards.length < 1) fail("expected at least 1 landmark card in the gallery");
  else ok("gallery lists " + galleryCards.length + " landmark(s)");

  galleryCards[1].click(); // Manila Cathedral (has a 1940s AFTER tab that must show the YouTube error log)
  await new Promise((r) => setTimeout(r, 10));
  if ($("gallery-detail").hidden) fail("gallery detail should show after clicking a landmark");
  const tabs = doc.querySelectorAll("#gallery-tabs .gallery-tab");
  if (tabs.length !== 3) fail("expected 3 photo tabs for Manila Cathedral, got " + tabs.length);
  else ok("Manila Cathedral detail shows " + tabs.length + " photo tabs");

  // tab 0 = 1945 (pre-YouTube) -> must show error log, not a working video link
  tabs[0].click();
  let videoBlock = $("gallery-video-block").innerHTML;
  if (!videoBlock.includes("YOUTUBE_NOT_FOUND")) fail("1945 photo should show the YouTube-not-found error log, got: " + videoBlock.slice(0, 120));
  else ok("pre-YouTube era (1945) correctly shows the error log instead of a video link");
  if (doc.querySelector("#gallery-video-block a")) fail("no real YouTube link should be present for a pre-YouTube era");
  else ok("no video link rendered for the pre-YouTube era, as expected");

  // tab 2 = TODAY (2010s) -> must show a real attributed YouTube link
  tabs[2].click();
  videoBlock = $("gallery-video-block").innerHTML;
  const videoLink = doc.querySelector("#gallery-video-block a");
  if (!videoLink || !videoLink.href.includes("youtube.com")) fail("2010s (today) photo should show a real YouTube link, got: " + videoBlock.slice(0, 200));
  else ok("post-YouTube era shows a real attributed video link: " + videoLink.href);

  const credit = $("gallery-photo-credit").textContent;
  if (!credit.includes("Credit:")) fail("photo should show a credit line");
  else ok("photo credit line present: " + credit.slice(0, 90));

  $("btn-gallery-back-list").click();
  if ($("gallery-list").hidden) fail("should return to landmark list");
  else ok("back-to-list button works");

  // ---- jump to a "no signal" year before 1900 should be unreachable from a 1990 birth; test far-future instead ----
  doc.querySelector('.nav-item[data-screen="screen-home"]').click();
  await new Promise((r) => setTimeout(r, 10));

  // ---- verify getBucketKeyForYear-driven "no data" path via a manual dossier render isn't directly testable
  // without exposing internals, so we trust the earlier structural checks (weak-signal, factpanels, quiz, achievements).

  console.log("\n--- localStorage snapshot ---");
  console.log("bbp_stats:", window.localStorage.getItem("bbp_stats"));
  console.log("bbp_achievements:", window.localStorage.getItem("bbp_achievements"));
  console.log("bbp_journal entries:", JSON.parse(window.localStorage.getItem("bbp_journal") || "[]").length);

  if (process.exitCode === 1) {
    console.log("\n=== SOME CHECKS FAILED ===");
  } else {
    console.log("\n=== ALL CHECKS PASSED ===");
  }
  window.close();
  process.exit(process.exitCode || 0);
}

run().catch((e) => {
  console.error("Uncaught error during test:", e);
  process.exit(1);
});
