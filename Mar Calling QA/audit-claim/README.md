# Mystery Shopper (MS) Claim Audit

Working folder for keying and checking MS claims each month.

## Before starting
Drop the latest **`MS MASTER LIST.xlsx`** into `inbox/`. It is not on this Mac yet;
last seen as an upload in the claude.ai chat "MS CLAIM" (6 Sep 2026).
Updated files go to `output/`. Neither folder is ever shared or committed —
they hold IC numbers, phone numbers and bank details.

## What a submission looks like
The user pastes blocks like:

```
MS <OUTLET> RM 399            ← the shopper's visit claim
1. Name  2. IC  3. Bank  4. Account

Referral <shopper name> RM 30  ← referral bonus for whoever referred them
Name / HP / Bank Acc / Bank name
```

Outlet shorthand seen so far: `SS2` = SS2, `BM` = BUKIT MERTAJAM.

## How to key it in (rules agreed in the Sep 2026 session)
1. Write into the current month tab, named like `SEPT 2026`.
   Columns: **No · Outlet · Name · IC · Phone · Amount**.
2. **Skip bank name and account number.** The sheet has no columns for them.
3. **Phone:** look it up in the `MS MASTER LIST` tab if it wasn't supplied.
4. **Referrals:** check the phone against past month tabs. If the person
   was already recorded, reuse the IC from that earlier record.
5. Only `MS MASTER LIST` and the current month tab stay visible. Hide
   every other tab; never delete them.
6. The `MS MASTER LIST` tab uses an older format (a 2021–22 assignment and
   turn-up log). Read it for lookups, but don't write claim rows to it.
7. After writing, re-open the file to check the rows, then report a
   summary table and the month's total.

## Audit checks (from the MS programme / agreement)
- The shopper pays on the day, then claims.
- They must send the **invoice + Google Form feedback** to QA the **day
  after** the visit (agreement clause 3.2). Flag late or missing ones.
- Claim cap: RM399 package; up to **RM499** if the doctor recommended the
  ProLight add-on. The referral bonus is RM30.
- Flag duplicates: the same IC or phone claiming twice in one month, or a
  referrer who is also the shopper.

## Reference
- Programme rules and agreement text:
  `~/Downloads/Archived Claude Data/ur-mystery-shopper/content/programme.js`
- Past chat: `~/Downloads/Archived Claude Data/claude-export-2026-09-18/conversations.json` → "MS CLAIM"

## The full claim sequence (as shown by the user, 21 Sep 2026)
The user works in the Google Sheet **MS MASTER LIST**, which has two tabs in play:

1. **`MS MASTER LIST` tab** — the turn-up log.
   Col A = QA staff · **B = referrer** (highlighted yellow once done) · C = day ·
   D = date (C/D cyan once done) · E = time · F = outlet ·
   **G = mystery shopper** (highlighted orange once done) · H = shopper IC ·
   J = shopper phone · **K = amount claimed**.
   After the shopper turns up *and* submits the report, fill K and apply the highlights.
2. **`MYSTERY SHOPPER CLAIM FORM` tab** — the payout form sent to Finance.
   Header block: Staff Name = LAO HONG HONG (CATHERINE), Asst. QA Manager, QA, RHB Bank HQ.
   Columns: No · COMPANY · Outlet · Mystery Shopper Name (as per IC) · Mystery Shopper IC No ·
   Mystery Shopper Email Address / Phone No · Amount · Purpose · Remarks.
   Two rows per shopper, in this order: the shopper at **RM399** (`Mystery shopper`),
   then the referrer at **RM30** (`Mystery referral`). Rows sit under a yellow
   `NOT YET SUBMIT` banner until submitted.
3. **WhatsApp to Catherine** — bank details, one block per shopper:
   ```
   MS <OUTLET ABBR> RM399
   Name: / IC: / Bank: / Account:

   Referral <shopper name> RM30
   Name: / IC: / HP: / Bank Acc: / Bank name:
   ```
   **Always put `RM30` on the referral header line** — the user corrected this on
   21 Sep 2026; Catherine needs the amount on both lines, not just the shopper's.
   Outlet abbreviations seen: `GL` = GREENLANE, `RU` = RAJA UDA, `BM` = BUKIT MERTAJAM.

### Outlet → company (legal entity) on the claim form
| Outlet | Company |
|---|---|
| SS2 | URSKIN PJ SDN BHD |
| BUKIT MERTAJAM, GREENLANE, KELAWAI | UR CLINIC SDN BHD |
| SUTERA UTAMA | URSKIN SOUTHERN SDN BHD |
| RAJA UDA | UR CLINIC SDN. BHD. (confirmed from receipt RUREC0926-194) |
| CHERAS LEISURE MALL | **URSKIN CENTRAL SDN BHD** (confirmed from receipt CLREC0926-270) |

### Where the shopper details come from
`~/Downloads/MYSTERY SHOPPER application (NEW).xlsx`, tab **`Form responses 2`**:
Timestamp · Email · NAME (AS PER IC) · IC NO · PHONE NO · Appointment Month ·
Outlets · REFERRAL 介绍人名字 · REFERRAL CONTACT NO. Look the referrer up by their
own application row to get their IC. **Bank details are NOT in this file** — the
shopper WhatsApps them in, and the referrer's bank details must be asked for separately.

### Reimbursement eligibility (criteria given 21 Sep 2026)
Read the shopper's receipt and match one of five scenarios:

| # | Receipt shows | Result |
|---|---|---|
| 1 | 1st Trial **+** any package | ✅ reimburse |
| 2 | No 1st Trial, package = GG / GGP / any Laser / BB + Oxy | ✅ reimburse |
| 3 | 1st Trial, no package | ✅ reimburse |
| 4 | RM0 — FOC treatment | ❌ not eligible |
| 5 | No 1st Trial + injectable package **without** Oxy | ❌ not eligible |

**Amount:** RM399 standard. **RM499 only for the RM499 GG PRO TRIAL package**, not for
any receipt that merely contains a ProLight item (ruling given 21 Sep 2026 on
Tung Soo Wei's RM526 receipt, which included ProLight inside an RM198 URAP PRO trial
and was still paid at RM399).

**Referral is always RM30**, and it is paid regardless — the referrer gets RM30 even
where the criteria would be in question for the shopper.

Receipts are PDFs named like `RUREC0926-194.pdf` (RU = Raja Uda, CL = Cheras Leisure).
`pdftotext` is not installed on this Mac; use `pypdf` to read them.

## Step 4 — file the paid claims on Synology Drive
After Catherine transfers, the proof goes to
`Synology Drive → UR-HQ2 QA → QA (HOD) → 1. QA _ → 4. Mystery Shopper →
MS CLAIMS (FINANCE) → <year> → <MONTH YEAR> → <PERSON NAME>`.

- **One folder per person paid**, named in CAPS as per IC (e.g. `BEH LEE HIANG`,
  `NEOH CHENG WAH`). Referrers get their own folder too.
- A **shopper's** folder holds the receipt PDF (`BMREC0926-097.pdf`,
  `GLREC0926-184.pdf`, …) **plus** the transfer-slip screenshot.
- A **referrer's** folder holds only the RM30 transfer-slip screenshot — no receipt.
- Someone paid twice in a month (shopper *and* referrer) gets both slips in their
  one folder.
- If the person already has a folder that month, drop the file into the existing
  folder — don't drag a second folder in, Synology will prompt to merge.

Staging: build the folders in `~/Documents/MS CLAIMS UPLOAD - <MONTH YEAR>/`,
drop the slips in, then drag the person folders into the month folder on the Drive.
