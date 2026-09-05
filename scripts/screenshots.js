// Generates Play Store phone screenshots by driving the actual app HTML
// (the same file the Android WebView loads) in headless Chromium.
const path = require("path");
const { chromium } = require("playwright");

const OUT_DIR = path.join(__dirname, "..", "assets", "screenshots");
const INDEX = "file://" + path.join(__dirname, "..", "www", "index.html");

(async () => {
  const fs = require("fs");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
    headless: true,
  });
  // Emulate a real phone's logical (CSS) viewport + pixel density, so layout
  // matches how it actually looks on a device, rather than a huge desktop-ish
  // canvas. Produces a realistic ~1080x2343 output image.
  const page = await browser.newPage({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2.75,
  });
  await page.goto(INDEX, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);

  // 1. Boot screen with a plausible birthdate already chosen
  await page.fill("#input-birthdate", "1998-05-14");
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT_DIR, "1-origin-lock.png") });

  // 2. Home screen: greeting + life timeline + jump control
  await page.click("#btn-confirm-birthdate");
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT_DIR, "2-home-timeline.png") });

  // 3. Dossier for a nostalgic era, reached via the timeline itself
  await page.click('.timeline-item:has-text("TEXT MESSAGING BOOM")');
  await page.waitForTimeout(1100);
  await page.screenshot({ path: path.join(OUT_DIR, "3-dossier-1998.png") });

  // 4. A present-day jump for contrast
  await page.evaluate(() => {
    window.BBP_showScreen("screen-home");
    var slider = document.getElementById("jump-slider");
    slider.value = slider.max;
    slider.dispatchEvent(new Event("input"));
  });
  await page.waitForTimeout(150);
  await page.click("#btn-engage");
  await page.waitForTimeout(1100);
  await page.screenshot({ path: path.join(OUT_DIR, "4-dossier-present.png") });

  // 5. Forced log-off screen (session timeout), for variety
  await page.evaluate(() => window.BBP_showScreen("screen-timeout"));
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT_DIR, "5-timeout.png") });

  await browser.close();
  console.log("done");
})();
