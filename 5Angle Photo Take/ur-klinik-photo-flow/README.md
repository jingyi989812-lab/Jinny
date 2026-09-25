# UR Klinik — Photo Flow

**Status: complete and tested against stand-ins. Ready for IT to deploy and for a real test run.**

Therapists photograph a customer's face from 5 angles, before and after treatment, on the
clinic iPhones. The app:
1. Finds the customer: today's bookings from the POS, or search.
2. Shows their reference photo so the therapist can confirm it's them.
3. Saves the photos into that customer's folder on the Synology.

Nobody browses Synology by hand.

```
UR-GY Customer Data / New 5 Angle Photo /
  BM 6830 LIM SU ANN (JESSIE) /
    _reference.jpg
    2026-09-15 / BEFORE / 1-FRONT_160630.jpg … 5-RIGHT-SIDE_160630.jpg
               / AFTER  / (same five)
```

## What's in here

| Folder | What it is |
|---|---|
| `app/` | **Copy this to the web server.** The clinic build of the phone app, plus its PHP backend. |
| `config/config.example.php` | Template for NAS and POS credentials. Goes **outside** the web folder. |
| `docs/FOR-ERIC.md` | **IT: start here.** Deploy steps, tests, troubleshooting. |
| `docs/TEST-RUN.md` | Checklist for the first real test at an outlet. |
| `docs/POS-CONNECTION.md` | How the 33crm POS is used, and the open questions for TK. |
| `docs/api.md` | Endpoint reference. |
| `source/` | For developers: the editable app source and the build tool. Not needed on the server. |

## Safeguards

- **Folders are found by membership ID** (outlet code + number, e.g. `GL 1560`), never by name.
  Names differ between POS and NAS (nicknames, spellings). Numbers repeat across outlets, so
  the outlet code always counts.
- **Before any photo is taken**, the confirm screen shows which folder the photos will go to.
  If the customer has two folders, it refuses to continue.
- **A walk-in ID that already exists** shows that customer's folder and photo first, so a
  typo can't file photos under someone else.
- The clinic build **never shows sample customers and never pretends to save**. With no
  connection, it says so.
- **Retries never duplicate photos.** A retake replaces only that photo.
- **The phone never sends a folder path.** The server builds every path itself.
- **Each phone needs a device key.** NAS and POS credentials live only on the server,
  outside the website folder.

## Tested

- **78 automated checks** on the PHP backend against a stand-in Synology and a stand-in 33crm.
- **Full sessions** in the clinic build at iPhone size: POS list, outlet filter, confirm,
  5 + 5 photos at full resolution, a failure and retry, a retake, duplicates, no-wifi mode.
- **The POS driver on the real 33crm export:** 480k rows in 0.7 seconds.

**Not yet tested:** the real NAS, the real POS login, IIS and the iPhone 6. That's `docs/TEST-RUN.md`.
