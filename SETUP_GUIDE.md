# Balikbayan Protocol — from this folder to the Play Store

This project is a complete Android app (Capacitor-wrapped web app) for **Balikbayan Protocol**. Everything is generated except three things only you can do: create the GitHub repo, pay Google's one-time developer fee, and click submit. This guide walks through all of it, in order.

Read the whole "Before you start" section once, then follow the numbered steps.

## Before you start

**Why GitHub Actions, not a local build.** Building this app requires downloading Android's SDK and build tools from Google's servers. The environment that generated this project has that network path blocked by policy, so the build has to happen somewhere with normal internet access — GitHub's free build servers (GitHub Actions) do this automatically the moment you push the code. You don't install Android Studio or anything else locally to get a working app file.

**The keystore is the one irreplaceable thing here.** Inside `signing/` there's a `balikbayan-release.keystore` file and a `KEYSTORE_CREDENTIALS.txt` file. Every future update to this app on the Play Store must be signed with that same key. If you lose it, you cannot update the app anymore — ever — under this listing. Back up that whole `signing/` folder somewhere durable (password manager, encrypted drive) before doing anything else. It is deliberately excluded from git (see `.gitignore`) so it never ends up in a public repo.

**Costs involved.** GitHub is free for this. Google Play requires a one-time $25 registration fee for a developer account, paid directly to Google.

---

## 1. Create the GitHub repository

Go to [github.com/new](https://github.com/new) and create a new repository — any name, public or private both work fine (private is safer for a personal project; Actions works the same either way). Don't initialize it with a README, since this folder already has one.

## 2. Push this project to it

From a terminal, inside this folder:

```bash
git init
git add -A
git commit -m "Initial commit: Balikbayan Protocol Android project"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

(`signing/` will not be included — that's intentional, see above.)

## 3. Add your signing secrets to the repo

Open `signing/KEYSTORE_CREDENTIALS.txt` — it has four values you'll copy into GitHub.

In your new repo: **Settings → Secrets and variables → Actions → New repository secret**, and add these four, one at a time:

| Secret name | Value |
|---|---|
| `RELEASE_KEYSTORE_BASE64` | contents of `signing/balikbayan-release.keystore.base64.txt` (the whole long string) |
| `RELEASE_STORE_PASSWORD` | the store password from `KEYSTORE_CREDENTIALS.txt` |
| `RELEASE_KEY_ALIAS` | `balikbayan` |
| `RELEASE_KEY_PASSWORD` | the key password from `KEYSTORE_CREDENTIALS.txt` (same value as the store password — that's normal, see the note in that file) |

## 4. Run the build

Pushing to `main` already triggers it (from step 2). To re-run it any time — after the secrets are in place, or after a future change — go to your repo's **Actions** tab → **Build Android app** → **Run workflow**.

Once it finishes (a few minutes), open that run and scroll to **Artifacts** at the bottom:

- **balikbayan-protocol-debug-apk** — installable right away, for testing on your own phone. Not accepted by the Play Store.
- **balikbayan-protocol-release-aab** — only appears once the four secrets from step 3 are set. This `.aab` is the file you upload to Play Console.

## 5. Test the debug APK on a real phone first

Download `app-debug.apk` from the Actions artifact, transfer it to an Android phone, and open it (you'll need to allow "install unknown apps" for whichever app you use to open it — Files, Chrome, etc., depending on your phone). Confirm the birthdate flow, timeline, jumps, counter, and reset all work as expected before you bother with Play Console.

## 6. Put the privacy policy online (required by Play Console)

A draft is already written at `docs/index.html`. Before publishing it:

1. Open `docs/index.html` and replace `[add your contact email here before publishing]` with an email address you're comfortable listing publicly.
2. In your repo: **Settings → Pages → Source: Deploy from a branch → Branch: `main`, folder: `/docs` → Save.**
3. Wait a minute, then your privacy policy is live at `https://<your-username>.github.io/<your-repo>/`. That's the URL Play Console will ask for.

## 7. Register a Google Play Developer account

Go to [play.google.com/console/signup](https://play.google.com/console/signup), pay the one-time $25 fee, and complete identity verification. New accounts can take anywhere from a few hours to a few days to verify — do this step early so it's not what's blocking you at the end.

## 8. Create the app in Play Console

**All apps → Create app.** App name: `Balikbayan Protocol`. Default language: English (or Filipino, your call). App type: App. Free. Answer the declarations (none of them apply unusually to this app — no ads, no in-app purchases, no user-generated content).

## 9. Fill in the store listing

Everything you need is drafted for you:

- **Listing copy** (short description, full description, category suggestion) — `PLAY_STORE_LISTING.md`.
- **App icon** — `assets/icon-512.png` (512×512).
- **Feature graphic** — `assets/feature-graphic.png` (1024×500).
- **Phone screenshots** — `assets/screenshots/` (five PNGs, already at a standard phone resolution). Upload at least two; all five is fine.
- **Privacy policy URL** — from step 6.

## 10. Complete the remaining Play Console sections

These are Play Console forms, not files — but here's what to expect so nothing catches you off guard:

- **Content rating questionnaire** — answer honestly; this app has no violence, no user-generated content, no gambling, no in-app purchases, so it should land on "Everyone."
- **Data safety form** — this app collects nothing and sends nothing off-device (see the privacy policy for the full explanation), so every question should be answered "No data collected."
- **Target audience** — this isn't a kids' app; pick an adult/general audience.
- **App access** — no login exists, so mark it as fully accessible without special access.

## 11. Upload the release bundle and roll out

**Production → Create new release**, upload `app-release.aab` from step 4, fill in release notes ("Initial release"), and follow Play Console's prompts through to **Review release → Start rollout**.

New apps and new developer accounts often go through a review that takes anywhere from a few hours to a few days the first time. Subsequent updates are usually faster.

**If Play Console warns about the target API level:** Google raises its minimum required "target API level" roughly once a year. This project currently targets API 34 (Android 14), the stable, well-tested default for the Android tooling version this project uses. If the upload screen says it needs a higher one by the time you submit, bump `targetSdkVersion` and `compileSdkVersion` in `android/variables.gradle` to the number it asks for, commit, and re-run the workflow — Play Console's own message will tell you the exact number required.

---

## Updating the app later

Bump `versionCode` and `versionName` in `android/app/build.gradle`, commit, push to `main` (or re-run the workflow manually), download the new `app-release.aab` from Actions, and upload it as a new release in Play Console — same signing secrets, same listing, no need to repeat steps 7–10.

## Project layout

```
www/                   the actual app (HTML/CSS/JS) — edit this to change app behavior
android/                the generated native Android project
assets/                 icon, feature graphic, screenshots (source + Play Store—ready)
scripts/                the Python/Node scripts that generated the icon and screenshots
signing/                your release keystore — back this up, never commit it
docs/                   the privacy policy, served via GitHub Pages
.github/workflows/      the GitHub Actions build pipeline
PLAY_STORE_LISTING.md   ready-to-paste store listing copy
```
