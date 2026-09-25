# Photo Flow backend — API

All endpoints are under `api/` next to `index.html`. Needs PHP 7.2+ with `curl` and `fileinfo`.
The NAS is reached through File Station over Tailscale.

## Authentication
Every endpoint except `health.php` needs the header `X-PhotoFlow-Key: <app_key>`. A wrong or
missing key returns `401`.

Errors are always `{ "ok": false, "error": "<plain message>" }`.

---

## `GET api/health.php`
No key needed, and it never contacts the NAS. The app calls it on launch.
```json
{ "ok": true, "service": "photoflow", "configured": true, "keyValid": true, "pos": "connected" }
```
`keyValid` appears only when a key header was sent.

## `GET api/nas-test.php`
For IT. Logs in, checks that `base_path` exists, then logs out.

---

## `GET api/customers.php`

### `?view=today`
Today's bookings from the POS for all outlets, plus anyone photographed today but not booked.
Without a POS, it lists only who was photographed today, read from the audit log.

POS rows also carry:
- `branch`: the outlet of the appointment
- `status`: `booked` or `arrived`

`branches` at the top level lists the outlets that have bookings today; the phone filters on it.
```json
{ "ok": true, "pos": "not-connected", "date": "2026-09-14",
  "customers": [ { "id": "BM 6830", "name": "LIM SU ANN (JESSIE)", "phoneLast4": null, "time": null,
                   "lastVisit": null, "folder": "BM 6830 LIM SU ANN (JESSIE)", "before": 5, "after": 0,
                   "source": "photos" } ] }
```
`before` and `after` count the distinct angles saved today (0–5). `source` is `pos`, `nas`
(found from a folder name) or `photos` (from today's saves).

### `?view=search&q=<text>`
At least 2 characters. Returns up to 20 customers:
- **POS** (when connected): name, phone or ID.
- **NAS folder names**: an ID matches that exact ID (`BM 2756` never returns `BM 27560` or `GL 2756`).
  A bare number (`2756`) returns that number at every outlet. Any other text matches anywhere
  in the folder name.

### `?view=lookup&id=<membership id>`
```json
{ "ok": true, "id": "BM 6830", "status": "found", "folders": ["BM 6830 LIM SU ANN (JESSIE)"], "customer": { … } }
```
`status` is `found`, `none`, or `duplicate` (2+ folders). The walk-in screen calls this
**before** any photo is taken, so a mistyped ID shows someone else's folder instead of
silently saving into it.

## `GET api/reference.php?id=<membership id>`
Returns the customer's `_reference.jpg` as an image, used to recognise them.
- `404`: no reference photo or folder yet.
- `409`: duplicate folders.

---

## `POST api/upload.php`
`multipart/form-data`, one photo per request.

| Field | Rule |
|---|---|
| `customerId` | Membership ID, outlet code + number: `BM 4521` (also `BM4521`, `bm-4521`), or `SS2 4521`. A code ending in a digit needs the space or dash. |
| `customerName` | Used **only** when no folder exists yet. Uppercased, with characters illegal in folder names removed. |
| `phase` | `BEFORE` or `AFTER` |
| `angle` | `front`, `l45`, `lside`, `r45`, `rside`, or `extra` for a photo that isn't a face angle |
| `group` | **`extra` only.** 1–99. One number per label in a session: the five face angles are 1–5, so extras start at 6 — or at 1 when the visit has no face angles at all. |
| `seq` | **`extra` only.** 1–99, the photo's number within its group. |
| `label` | **`extra` only.** What the therapist typed (`hand`, `left knee`, `背部`). Uppercased, spaces become `-`, characters a file name can't carry are dropped, 20 characters max. Empty becomes `EXTRA`. |
| `session` | `hhmmss`. The same for all 5 photos of one session, and on retries. |
| `photo` | JPEG or PNG, up to `max_upload_mb`. Checked by its content. |
| `reference` | *Optional*, BEFORE + front only. A small JPEG (≤ 2 MB) saved as `_reference.jpg`. |
| `replace` | *Optional*, `1`. Overwrite this angle's file of this session. The app sends it only when a photo is retaken after it was already saved. |

**There is no path field.** The server finds the customer folder by **membership ID: outlet code
and number together**. Numbers are counted per outlet, so `BM 4521 …` and `GL 4521 …` are
different people, and `BM 45210` is a different number. Leading zeros don't matter.

| Folders in `base_path` for that membership ID | Result |
|---|---|
| exactly one | used as-is |
| none | created as `<ID> <CUSTOMER NAME>` |
| two or more | **nothing saved**, `409` |

File path: `<customer folder>/<yyyy-mm-dd>/<phase>/<n-ANGLE>_<session>.jpg`, dated by the server's clock.

**201**
```json
{ "ok": true, "result": "saved", "customerFolder": "BM 6830 LIM SU ANN (JESSIE)", "folderCreated": false,
  "folder": "/UR-GY Customer Data/New 5 Angle Photo/BM 6830 LIM SU ANN (JESSIE)/2026-09-14/BEFORE",
  "file": "1-FRONT_160630.jpg" }
```

| Status | Meaning |
|---|---|
| 400 | A field failed validation, or no folder exists and no name was sent |
| 401 | Device key not accepted |
| 409 | More than one folder for this ID. Merge them first. |
| 413 | Photo too big, or PHP's upload limit is too low |
| 415 | Not a JPEG or PNG |
| 502 | The NAS refused or couldn't be reached. The message says why. |
| 503 | `config.php` not found |

`customers.php?view=today` and `?view=lookup` also report `beforeExtra` / `afterExtra` (photos
that aren't face angles) and `groups` (this customer's labels today), plus `labels` — the
clinic's recently used labels, which the phone offers as one-tap buttons.

## Audit log
One JSON line per saved photo in `audit_dir`, one file per month (clinic time). Each line
includes `date`, `customerFolder`, `folderCreated` and `replaced`. `customers.php?view=today`
reads it back.
