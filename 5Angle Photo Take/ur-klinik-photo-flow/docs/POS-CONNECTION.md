# POS connection — 33crm (union.33crm.com)

**Status: connected.** Built from TK's two exports and tested against their real formats. The
live login is tested on the server during the test run.

| Export | Link (token in `config.php`) | Used for |
|---|---|---|
| Customer table | `api/api_Table_getDataV2.aspx?tablename=CustomerXBI1` (JSON, ~22 MB) | Who each customer is: **membership number**, name, phone |
| Appointment report | `apiv2/API_GetData.aspx?reportname=Report_AppointmentList` (CSV, ~43 MB) | Who is coming today, at which outlet, at what time |

## How they fit together

- **Membership number** (`membershipno`, e.g. `GL-1560`) names the photo folder (`GL 1560 …`).
  It is counted **per outlet**: `GL-1560` and `BM-1560` are different people. 9,314 numbers in
  the table are used at more than one outlet. The app always uses outlet and number together.
- **`id`** in the table is one running number across all outlets. The report's **`customerID`**
  is that `id`. It is how a booking is linked to the customer's membership number.
- Every refresh checks this link: today's appointment names are compared with the table. If
  most don't match, the refresh stops and the app keeps the previous data, instead of showing
  customers under the wrong membership numbers.

## What is kept

From the table: membership number, name, phone number. **IC number, date of birth, address,
email and everything else are dropped while reading** and never stored.

The phone sees name, membership ID, outlet, time, status and the **last 4 digits** of the
phone number. Search can match the full phone number, but only on the server.

Left out on purpose:
- 46 customers whose membership number isn't `letters + number` (e.g. `HQ-STAFF 12`)
- 39 membership numbers used by two customers

Neither group can be picked from a list; they can still be found by NAS folder or entered as a
walk-in.

## Questions for TK

1. **A POS login just for Photo Flow?** The server shouldn't depend on a staff member's login.
2. **Can the exports be filtered?** For example, appointments for one date, or customers
   changed since a date. Today the server downloads ~65 MB every 10–15 minutes.
3. **Is `customerID` in the appointment report the `id` in CustomerXBI1?** The app assumes so
   and checks it on every refresh. Please confirm.
4. **39 membership numbers are shared by two customers** (e.g. `BM-0123` and `BM-123`). Should
   they be cleaned up in the POS?
5. **Any rate limit** on these links?

## For a developer

- Driver: `app/api/lib/pos/UnionCrmPos.php`. Cache refresh: `app/api/lib/pos-refresh.php`.
- The interface (`lib/Pos.php`) has three methods: `today`, `search`, `find`. Another POS would
  be another driver file.
- If the POS is down, phones use the last copy from today. With no copy at all, they fall back
  to the NAS folder names.
- Tests: `tools/test/` (fake NAS + fake 33crm). Run `setup.sh`, start the three servers, then
  `python3 test_api.py`.
