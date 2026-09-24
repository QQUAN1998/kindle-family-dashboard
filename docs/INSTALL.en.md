# Kindle Family Dashboard: installation

These commands target Windows PowerShell. The Node build works elsewhere, but the USB installer currently expects a Windows drive root. Read the supported-device and security notes in the [README](../README.md) first.

## 1. Prerequisites

- A jailbroken 600 x 800 Kindle with working stock bookshelf, KPM, FBInk, KOReader LuaJIT, USB storage and Wi-Fi. Other devices need adaptation.
- Correct Kindle system time and timezone. The clock on the dashboard is drawn locally from that time.
- A dedicated Tencent CloudBase environment with Cloud Functions, Cloud Database, Cloud Storage and Static Hosting. Create a `kd_dashboard` database collection. Note the environment ID, the HTTPS static-hosting origin and the public HTTPS HTTP-function host.
- Node.js 24, Git, tar and the CloudBase CLI on the computer. The cloud function targets Nodejs20.19.

`API_URL` below must be your own public HTTPS URL ending in `/kd-api`. `SITE_ORIGIN` is the hosting origin without `/kd-dashboard`.

## 2. Build and create private local configuration

```powershell
git clone https://github.com/QQUAN1998/kindle-family-dashboard.git
cd kindle-family-dashboard
npm ci
npm run check
node scripts/generate-secrets.js
node scripts/configure-cloudbase.js YOUR_ENV_ID https://YOUR_API_HOST/kd-api https://YOUR_HOSTING_HOST
```

The scripts create ignored local files: `.env.local`, `cloudbaserc.json`, `work/deployment-secrets.json`, and `work/deploy-config.json`. They do not print secrets. Never publish a zip of your entire configured working directory.

## 3. Deploy the API and phone editor

```powershell
npx --yes -p @cloudbase/cli tcb login
npm run build
npm run prepare:function
npx --yes -p @cloudbase/cli tcb fn deploy kd_api --httpFn --path /kd-api --force --dir functions/kd_api --install-dependency false
npx --yes -p @cloudbase/cli tcb hosting deploy dist/site /kd-dashboard --verify
```

If your CloudBase HTTP-function URL differs from the value supplied above, rerun `configure-cloudbase.js`, `npm run build`, and the hosting deployment. Verify `API_URL/health` in a browser. The editor is at `https://YOUR_HOSTING_HOST/kd-dashboard/`.

## 4. Initialize the two accounts

Choose two different four-digit PINs. Enter them interactively so they are not written into command history:

```powershell
$env:KD_PIN1 = Read-Host 'First PIN'
$env:KD_PIN2 = Read-Host 'Second PIN'
node scripts/bootstrap-production.js https://YOUR_API_HOST/kd-api
node scripts/validate-production.js https://YOUR_API_HOST/kd-api
Remove-Item Env:KD_PIN1, Env:KD_PIN2
```

Bootstrap runs once. Validation checks both logins, city search, two almanac days and the 600 x 800 PNG, and saves a private snapshot under ignored `work/`. Open the editor on a phone, log in as each user, and change the city, family name, blackboard or countdowns. The browser preview reflects saved and edited state.

## 5. Build your device-specific package and install

```powershell
npm run build
node scripts/generate-kindle-config.js https://YOUR_API_HOST/kd-api
```

The private `dist/kindle-dashboard_1.0.0_kindlehf.kpkg` and `dist/kindle-package/kindle-dashboard/config/dashboard.conf` contain your device token. **Do not upload or redistribute them.**

Connect the Kindle over USB. Confirm its drive contains `kmc/kpm/kpm.db`, `libkh/bin/fbink`, and `koreader/luajit`. If it is drive `E:`:

```powershell
node scripts/install-kpm-usb.js E:\
```

The installer backs up the KPM database to `kmc/kpm/kpm.before-kindle-dashboard.db`, copies the package and KUAL shortcut, and registers the KPM entry. It assumes the tested KPM database schema; stop on a schema error instead of editing the database manually. Safely eject the Kindle. Launch `KindleDashboard` from the bookshelf scriptlet or use the KUAL shortcut. The on-screen Refresh button requests a new snapshot; Return to Bookshelf should return to the stock Kindle home.

## Operation and troubleshooting

- Sync is near-real-time, not instant: the default device poll is five minutes; press Refresh for an immediate request. Server weather is cached for 30 minutes. The local clock updates each minute.
- Wrong clock: correct the Kindle's system time and timezone in its native settings; the cloud does not set device time.
- Missing weather: choose a city from the search results, then check CloudBase access to Open-Meteo and Kindle Wi-Fi.
- Blank screen or failed launch: inspect `kindle-dashboard/state/dashboard.log`, KPM, FBInk and KOReader LuaJIT. Do not publish logs containing full request URLs.
- To read books, press Return to Bookshelf or use KUAL. Existing books and firmware are not replaced.
- For source updates, rerun checks, redeploy the API and site, regenerate the private `.kpkg` and reinstall over USB. Preserve your own ignored local secret files.
