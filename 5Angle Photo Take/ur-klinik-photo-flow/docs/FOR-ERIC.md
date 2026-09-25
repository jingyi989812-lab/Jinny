# For Eric — deploying Photo Flow

The app is complete: iPhone app, NAS saving and POS (33crm) connection. It needs deploying and
a real test run. Everything below is on the Windows server that hosts `operation.urklinik.com`.

---

## Update of 25 Sep (later) — grid lines in TAKE PHOTO

**What happened:** the outlet turned on **Settings → Camera → Grid**, but the camera that
**TAKE PHOTO** opened still had no grid. That camera is a separate iOS screen that web pages
get; it ignores the Grid setting, and a web page can't draw on it.

**Fixed:** TAKE PHOTO now opens the app's **own camera screen**, with the 3×3 grid and the
face guide for the current angle drawn over the live picture. Big white button to shoot,
**Cancel** to go back. Nothing is drawn on the saved photo.

- The first time, Safari asks **"Allow camera?"** → **Allow**. If it was refused:
  **Settings → Safari → Camera → Allow** (or Ask).
- Needs HTTPS (we have it). Works in Safari on iOS 11+, and from the Home Screen icon on
  iOS 13.4+. On the old iPhone 6 (iOS 12) opened from the Home Screen icon, iOS doesn't allow
  it, so TAKE PHOTO opens the old iOS camera there (no grid). Opening the page in Safari
  instead of the icon gives the grid on that phone too.
- **"iPhone camera (no grid)"** on the camera screen opens the old iOS camera if ever needed.
- The in-app camera saves the camera's video-mode picture, which is smaller than a Camera-app
  photo (usually 1920×1440 up to 4032×3024 depending on the iPhone). The size shows under
  **Resolution** on the photo check screen. For full-size photos, the Camera app +
  **IMPORT FROM PHOTOS** still works exactly as before.
- Nothing to configure, no server change — only `app\index.html` changed.

**Also in this build — layout clean-up on every screen** (checked screen by screen at iPhone 6 size):
- The fake phone status bar (clock, signal, battery) drawn at the top of the app is gone on real
  phones — iOS already shows its own, so there were two clocks. On the dark screens the fake
  clock was also invisible. Buttons at the bottom now stay clear of the home bar on newer iPhones.
- The search boxes had a stray black box inside them; gone.
- Text blocks had extra hidden spacing (icon and text out of line, gaps under paragraphs); fixed.
- The × to remove an extra photo now sits on the photo's corner, not under it.
- Thumbnails of extra photos no longer touch each other.
- "NO PHOTO YET" no longer spills out of small avatars or runs into the REF tag.
- ID chip / appointment time / "Last visit" line up when they wrap to a second line.
- Sign-in: even spacing between Username and Password; title lines up with the page.
- Confirm screen: BEFORE / AFTER is fully visible without scrolling on an iPhone 6.
- Photo check screen: RETAKE / NEXT (or USE ANYWAY) are on screen without scrolling.
- The yellow and green main buttons have their pressed-down 3D edge back.
- Membership ID with an error now shows the red border it was meant to.

---

## 🔴 Update of 25 Sep — photos are never lost again

**What happened at the outlet:** the wifi dropped during a save, the app was closed, and the
photos were gone. A photo taken with **TAKE PHOTO** lives only inside the web page — iOS does
not put it in the camera roll — so closing the page lost them.

**Fixed:**
1. **Every photo is written to the phone's own storage the moment it is taken**, before any
   upload, and is only deleted once the NAS has confirmed it.
2. **If the save fails**, the screen now says the photos are safe on the phone, and offers
   TRY AGAIN NOW or LEAVE IT FOR LATER.
3. **They are sent automatically**: when the app opens, when the phone comes back online, and
   once a minute while the app is open. A survived-a-restart test is in the suite below.
4. **The home screen shows "N photos saved on this phone, waiting to be sent"**, tapping it
   opens a list per customer with SEND NOW / Delete.
5. Nothing to configure, and no server change — this is all in `app\index.html`.

Also in this build, from the outlet's feedback:
- **The reference photo on the confirm screen is no longer cut in half.** It was shown in a wide,
  short box, which cropped a portrait photo to the middle of the face. It now keeps its own
  portrait shape, and the empty space under it is gone. Square thumbnails elsewhere crop from
  the upper part of the photo, where faces are.
- **Grid lines on the angle guide** (the same 3×3 the iPhone camera draws), so the guide and the
  camera viewfinder agree. The lines that matter while shooting are the camera's own:
  **Settings → Camera → Grid**, on every clinic phone. Nothing is drawn on the saved photos.
- **Search inside Today's Customers** (name, membership ID or phone), shown when the list is
  longer than three.
- **"DONE FOR NOW — MAIN PAGE"** on the save screen, since the AFTER photos usually come an
  hour later.

**Still worth telling the therapists:** shooting in the **Camera app** and using **IMPORT FROM
PHOTOS** also keeps a copy in the camera roll. Belt and braces.

---

## Update of 24 Sep — your login system, photos beyond the five angles, one-screen layout

This package is **your `Jinny.zip` with our newer features merged in**, not a replacement.
Everything you built is kept: staff sign-in, the admin screens, per-outlet accounts, one NAS
per outlet, and the `pattern` fix.

**Added on top:**
1. **Photos that aren't face angles** — hand, leg, back, anything. The therapist types a label
   (any language, Chinese included) or taps one the clinic used before. They save as
   `6-LEFT-HAND-01_143020.jpg` beside `1-FRONT_…` … `5-RIGHT-SIDE_…`.
2. **Visits with no face angles at all** — `1-RIGHT-LEG-01_143020.jpg`.
3. **A BEFORE/AFTER switch** on the confirm screen, so a doctor asking for after-photos only is
   one tap, and a customer whose BEFORE is already done opens on AFTER.
4. **The AFTER session reminds** the therapist which labels the BEFORE session used.
5. **The app icon** for Add to Home Screen (`app\icons\`).
6. **Every screen fits an iPhone 6 (375 × 667) without scrolling** — measured screen by screen.
   ADMIN moved to a small button beside Dashboard so the home screen still fits.
7. **Nothing in `config.php` changes.** Deploy is: replace `app\`, keep your config.

**Two things found while merging:**
- **Utility styles were used but missing from the compiled CSS** — some from the new screens,
  some from your admin screens (`h-7`, `w-7`, `underline`, `p-2.5`, …). Anything using them
  rendered at the wrong size. Added.
- **`tools/test/` was still the old device-key suite**, so none of your sign-in or multi-outlet
  code was covered by it. It now runs two fake NASes (two outlets) and two accounts and checks:
  wrong password, made-up token, sign-out, staff blocked from another outlet's customers, admin
  allowed, each outlet's photos landing on its own NAS, and no password hash in any reply.
  **48 checks, all passing.**

---

## 🔴 Update of 18 Sep — do these first

1. **Delete `app\list-test.php` from the server now.** It is publicly reachable
   (`/Jinny/app/list-test.php` answers today), and it has the `testacc` NAS password written in
   it. Anyone who opens that URL makes the server log into the NAS. Then **change the `testacc`
   password**: it has now been in two files and a chat.
2. **Replace the whole `api\` folder** with this version, and update `config.php` (step 5:
   the `pos` section changed, and there is a new `cache_dir`). **Don't let phones save photos
   until this is done.** The version on the server matches folders by the number only. But
   membership numbers are counted **per outlet**: in TK's customer table, 9,314 numbers are
   used at more than one outlet. So `BM 1502`'s photos would go into a folder named
   `SS2 1502 …`, a different person. I reproduced this with the deployed files.
3. **Your `pattern` finding is in.** Thanks for `list-test.php`. The NAS client no longer sends
   `pattern`, as in your fix. Listing every folder on each photo would be slow, so the list is
   cached for 10 minutes (`folder_cache_minutes`). Before a photo is saved, the folder is
   re-checked on the NAS: a folder made, renamed or merged by hand in the meantime is still
   found, and never duplicated.
4. **TK's customer table is connected** (`CustomerXBI1`). Membership numbers now come from the
   POS, like `GL-1560`, instead of being guessed. Search also finds phone numbers. Only
   membership number, name and phone are kept; IC number, birthday and address are dropped
   while reading.

---

## ⚠️ Before anything: credentials

1. **NAS:** the `testacc` password in `test.php` was sent over WhatsApp. Change it, or disable
   `testacc` and use the `svc_photoflow` account from step 1.
2. **POS:** don't run the server on a person's POS login. If TK can't create a login just for
   Photo Flow, use one that stays working when staff change or leave. Anyone whose password
   has been shared in chats should change it.
3. The POS **token** is a secret too. It goes in `config.php` only — never in a file inside
   the website folder, and never in a chat.

---

## How it works

```
iPhone (Safari)  ──HTTPS──▶  operation.urklinik.com/Jinny/app/
                                 index.html   the app
                                 api/*.php    ──Tailscale──▶  Synology (File Station API)
                                              ──HTTPS──────▶  union.33crm.com (customer table + appointment report)
```

- **Folders are found by membership ID.** The phone sends an ID like `BM 4521` (from the POS
  `BM-4521`). The server finds the folder in `New 5 Angle Photo` whose name starts with
  **BM 4521** and uses it as it is, whatever the name part says. The outlet code counts:
  numbers repeat across outlets, so `GL 4521 …` is someone else.
  - Exactly one match: photos go there.
  - None: creates `<outlet> <number> <NAME>`, e.g. `BM 4521 LEE HUI WEN`.
  - Two or more: **nothing is saved** until they're merged.
  - `BM 4521` never matches `BM 45210` or `GL 4521`. Folders like `2023-01-18` are ignored.
- **Files:** `<customer folder>/<yyyy-mm-dd>/<BEFORE|AFTER>/1-FRONT_<hhmmss>.jpg` … `5-RIGHT-SIDE_…`,
  plus `_reference.jpg` (~80 KB), which the phone shows to recognise the customer next time.
- **POS:** the 33crm report has no date filter. It returns the whole appointment history
  (~43 MB). The server downloads it every 10–15 minutes into a 1.3 MB cache. Phones only
  read the cache.

---

## Deploy

**1. NAS service account.** Control Panel → User & Group → create `svc_photoflow`:
- Read/Write on `UR-GY Customer Data` only.
- Not an administrator.
- **2-step verification off.** API logins fail with it on.
- File Station application allowed.

**2. Tailscale.** The Windows server itself must be on the tailnet, because
`100.83.5.4` is a Tailscale address.

**3. PHP.** 7.2 or newer, with the `curl`, `fileinfo` and `mbstring` extensions (`php -m`).

**4. Copy `app/`** so you have `…\Jinny\app\index.html` and `…\Jinny\app\api\…`.

**5. Config, outside the website folder:**
```
C:\photoflow-config\config.php      ← copy of config\config.example.php, filled in
C:\photoflow-config\logs\           ← empty folder
C:\photoflow-config\pos-cache\      ← empty folder
```
Fill in:
- `app_key`: long and random. It's the password each phone uses.
- `nas.account` and `nas.password`.
- `pos.token`, `pos.username` and `pos.password`.

Give the IIS app pool:
- **read** on `C:\photoflow-config`
- **write** on `logs\` and `pos-cache\`

**6. Test from the server's command prompt:**
```bat
curl https://operation.urklinik.com/Jinny/app/api/health.php
```
Expect `"configured":true,"pos":"connected"`.

```bat
curl -H "X-PhotoFlow-Key: YOUR_APP_KEY" https://operation.urklinik.com/Jinny/app/api/nas-test.php
```
Expect `"ok":true` and "Base folder found".

```bat
cd C:\inetpub\wwwroot\Jinny\app\api\lib
php pos-refresh.php
```
Expect something like:
```
OK in 25.3s: 148 appointments today, 40456 customers.
Customer table: 40636 rows, 40456 usable. Left out: 46 with an unreadable membership number, 39 sharing one.
Today's appointments not found in the customer table: 0.
Names agree between appointment and customer table: 146 of 148 (99%).
```
**Send me this output.** Note how many seconds it took. The last line proves the two exports
join correctly. If most names disagree, it stops with an error and keeps the POS data out of
the app. Nothing is misfiled.

The customer table uses the same `token`. If TK gave the table a different token, put it in
`'customer_token'`.

```bat
curl -H "X-PhotoFlow-Key: YOUR_APP_KEY" "https://operation.urklinik.com/Jinny/app/api/customers.php?view=lookup&id=BM4521"
```
Replace `BM4521` with a real customer who has a folder. Expect `"status":"found"` with their
exact folder name and their POS name.

**7. Test an upload with a number nobody uses:**
```bat
curl -H "X-PhotoFlow-Key: YOUR_APP_KEY" -F "customerId=BM 99999" -F "customerName=Photo Flow Test" ^
  -F phase=BEFORE -F angle=front -F session=120000 -F "photo=@C:\path\to\any.jpg" ^
  https://operation.urklinik.com/Jinny/app/api/upload.php
```
- Expect `"folderCreated":true` and `New 5 Angle Photo\BM 99999 PHOTO FLOW TEST\<today>\BEFORE\1-FRONT_120000.jpg`.
- Run it again with `customerId=bm-99999` and another name. It must say `"folderCreated":false`
  and use the **same** folder.
- Run it with `customerId=GL 99999`. It must create a **separate** `GL 99999 …` folder:
  different outlet, different person.
- Delete the test folders afterwards.

**8. Scheduled task**, so phones never wait for the POS download.

Task Scheduler → Create Task:
- Run whether the user is logged on or not, as an account with write access to `pos-cache\`
- Trigger: daily at 09:30, repeat every **10 minutes** for 13 hours
- Action: `C:\path\to\php.exe`, argument `"C:\inetpub\wwwroot\Jinny\app\api\lib\pos-refresh.php"`

If the task stops, the website downloads the report itself when the cache is older than
15 minutes. That works if the download is quick (see step 6). If it takes more than about
60 seconds, IIS may cut it off, so keep the task running.

**9. Each iPhone.**
1. Open `https://operation.urklinik.com/Jinny/app/` in Safari.
2. Tap "Enter this phone's device key" and paste `app_key`.
3. In Today's Customers, tap the phone's **outlet**.
4. Share → Add to Home Screen.

---

## Troubleshooting

| What you see | Likely cause |
|---|---|
| `"configured":false` | `config.php` isn't at `C:\photoflow-config\config.php`, or the app pool can't read it. Or set `PHOTOFLOW_CONFIG` to its real path. |
| "Could not reach the NAS … Tailscale?" | The server isn't on the tailnet, or host/port is wrong |
| "Wrong NAS username or password (DSM code 400)" | NAS credentials in `config.php` |
| "…2-step verification on (DSM code 403)" | Turn 2FA off for the service account |
| "…blocked this server (DSM code 407)" | DSM auto-block: Control Panel → Security → unblock the server's IP |
| "Folder not found (DSM code 408)" | `base_path` doesn't match File Station exactly |
| "There are 2 folders for BM 6830 (…)" | Two folders have the same membership ID (same outlet code and number). Merge them, then save again. Working as intended. |
| A folder you just made or renamed doesn't show in **search** | Search uses the folder list cached for 10 minutes. Saving always re-checks the NAS. |
| "Only N of M … names match … customerID may not be…" | The two POS exports don't join as expected. The app keeps the previous POS data. Send me the pos-refresh output. |
| "The POS did not send the customer table" | Wrong token or table name. Try TK's table link in a browser. |
| "The POS refused the login (HTTP 401)" | POS username/password |
| "The POS did not send the appointment report" | Wrong token or report name |
| Today's Customers shows a POS error but search works | POS down or login changed. The app keeps working from the NAS folders. |
| "No photo arrived. The server upload limit…" | PHP limits: `api\.user.ini` raises them. PHP re-reads it every 5 minutes, or recycle the app pool. |
| HTTP 500.19 | IIS config section locked. Delete `api\web.config` — it only hides `lib\`. |
| Phone says "Couldn't load Photo Flow" | The phone can't reach `cdnjs.cloudflare.com` (React). Check the clinic wifi or firewall. |

---

## What has been tested

On PHP 8.5, against a stand-in Synology (which rejects `pattern`, like yours) and a stand-in
33crm that serves both exports in the real formats:
- **41 automated checks** in `tools/test/`, including:
  - `GL 1500` never goes into `BM 1500`'s folder
  - a folder made or renamed by hand after caching is still found
  - a wrong join between the exports is refused
  - IC numbers and addresses never reach the cache
- **The real customer table** (22 MB, 40,636 customers) read in 0.4 seconds with 28 MB of memory.
- The previously deployed version was run against the same stand-in. It filed `BM 1502` into
  `SS2 1502`'s folder. That is the bug fixed above.

**Not yet tested:** your real DSM, the real 33crm login, IIS, and the real iPhone 6.

## Questions

1. **What's inside existing customer folders today?** The app adds `<date>\BEFORE` and
   `<date>\AFTER`. If you already use another layout, tell me before rollout.
2. **Are NAS folders named with the POS membership number?** For example, a customer who is
   `GL-1560` in the POS should have a folder `GL 1560 …`. If some folders use another outlet's
   code or an old number, the app won't find them and will make a new folder. Search the NAS
   for a few customers you know and compare.
