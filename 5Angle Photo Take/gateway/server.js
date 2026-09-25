'use strict';

/**
 * UR KLINIK PHOTO FLOW — NAS gateway
 *
 * Sits between the therapist's phone and the Synology volume.
 * The client NEVER sends a path: it sends customerId + phase + angle,
 * and this service derives the destination. That is both the security
 * boundary (no path traversal) and the product promise (the therapist
 * never chooses a folder), enforced structurally rather than by UI.
 *
 *   /data/RU-2756/2026-09-10/BEFORE/1-FRONT.jpg
 */

const express = require('express');
const multer  = require('multer');
const fsp     = require('fs/promises');
const path    = require('path');
const crypto  = require('crypto');

const DATA_DIR = process.env.DATA_DIR || '/data';
const APP_KEY  = process.env.APP_KEY  || '';
const PORT     = Number(process.env.PORT || 8080);
const MAX_MB   = Number(process.env.MAX_UPLOAD_MB || 12);

const INDEX_DIR  = path.join(DATA_DIR, '_index');
const AUDIT_DIR  = path.join(DATA_DIR, '_audit');
const CUSTOMERS  = path.join(INDEX_DIR, 'customers.json');

/* ----------------------------- validation ----------------------------- */

/* Whatever the POS issues. Deliberately loose on format, strict on safety:
   no dots and no separators, so an ID can never escape its parent folder. */
const CUSTOMER_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{2,23}$/;
const PHASES = new Set(['BEFORE', 'AFTER']);
const ANGLES = new Map([
  ['front', '1-FRONT'],
  ['l45',   '2-LEFT-45'],
  ['lside', '3-LEFT-SIDE'],
  ['r45',   '4-RIGHT-45'],
  ['rside', '5-RIGHT-SIDE'],
]);
const MIME = new Map([['image/jpeg', '.jpg'], ['image/png', '.png']]);

/* Date folder in the NAS's own timezone (set TZ in docker-compose). */
const dateFolder = () => new Date().toLocaleDateString('en-CA');

/* Resolve a destination and refuse anything that escapes DATA_DIR.
   Works for POSIX mounts and Windows UNC paths (\\NAS\Share\...). */
const ROOT = path.resolve(DATA_DIR);
function destDir(customerId, date, phase) {
  const dir = path.resolve(ROOT, customerId, date, phase);
  if (dir !== ROOT && !dir.startsWith(ROOT + path.sep)) {
    throw new Error('path escape');
  }
  return dir;
}

/* --------------------------- customer index --------------------------- */
/* Small JSON store. Swap for SQLite when the customer list outgrows it. */

let chain = Promise.resolve();
const serialize = fn => (chain = chain.then(fn, fn));

async function readCustomers() {
  try {
    return JSON.parse(await fsp.readFile(CUSTOMERS, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

async function writeCustomers(list) {
  await fsp.mkdir(INDEX_DIR, { recursive: true });
  const body = JSON.stringify(list, null, 2);
  const tmp  = CUSTOMERS + '.tmp';
  try {
    await fsp.writeFile(tmp, body);
    await fsp.rename(tmp, CUSTOMERS);        // atomic where the filesystem allows it
  } catch (e) {
    // SMB shares refuse rename-over-existing often enough to need this.
    await fsp.writeFile(CUSTOMERS, body);
    await fsp.unlink(tmp).catch(() => {});
  }
}

/* ------------------------------- audit ------------------------------- */

async function audit(entry) {
  await fsp.mkdir(AUDIT_DIR, { recursive: true });
  const file = path.join(AUDIT_DIR, `${dateFolder().slice(0, 7)}.jsonl`);
  await fsp.appendFile(file, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');
}

/* -------------------------------- app -------------------------------- */

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
});

/* Shared key, held on the clinic phones. Proportionate for a LAN-only
   service behind HTTPS; move to per-therapist tokens if that changes. */
function requireKey(req, res, next) {
  if (!APP_KEY) return res.status(500).json({ error: 'APP_KEY is not configured' });
  const given = Buffer.from(String(req.get('x-photoflow-key') || ''));
  const want  = Buffer.from(APP_KEY);
  const ok = given.length === want.length && crypto.timingSafeEqual(given, want);
  if (!ok) return res.status(401).json({ error: 'Bad or missing key' });
  next();
}

app.get('/api/health', (req, res) => res.json({ ok: true, date: dateFolder() }));

/* ---- customers ---- */

app.get('/api/customers', requireKey, async (req, res, next) => {
  try { res.json(await readCustomers()); } catch (e) { next(e); }
});

app.post('/api/customers', requireKey, upload.single('reference'), async (req, res, next) => {
  try {
    const customerId = String(req.body.customerId || '').trim();
    const name       = String(req.body.name || '').trim();
    const phone      = String(req.body.phone || '').replace(/\D/g, '');

    if (!name)                        return res.status(400).json({ error: 'name is required' });
    if (!CUSTOMER_ID.test(customerId)) return res.status(400).json({ error: 'Invalid customer ID' });
    if (req.file && !MIME.has(req.file.mimetype))
      return res.status(415).json({ error: 'photo must be JPEG or PNG' });

    const created = await serialize(async () => {
      const list = await readCustomers();
      if (list.some(c => c.id.toLowerCase() === customerId.toLowerCase())) return null;

      const rec = { id: customerId, name, phone: phone.slice(-4), createdAt: new Date().toISOString() };
      await fsp.mkdir(path.join(DATA_DIR, customerId), { recursive: true });
      /* A reference photo here is optional — normally it arrives as the front BEFORE shot. */
      if (req.file) {
        await fsp.writeFile(path.join(DATA_DIR, customerId, '_reference' + MIME.get(req.file.mimetype)),
                            req.file.buffer);
      }
      list.push(rec);
      await writeCustomers(list);
      return rec;
    });

    if (!created) return res.status(409).json({ error: 'That customer ID already exists' });

    await audit({ event: 'customer.created', customerId: created.id, therapist: req.get('x-therapist') || null });
    res.status(201).json(created);
  } catch (e) { next(e); }
});

/* ---- photos ---- */

app.post('/api/photos', requireKey, upload.single('photo'), async (req, res, next) => {
  try {
    const customerId = String(req.body.customerId || '').toUpperCase();
    const phase      = String(req.body.phase || '').toUpperCase();
    const angle      = String(req.body.angle || '').toLowerCase();
    const therapist  = req.get('x-therapist') || null;

    if (!CUSTOMER_ID.test(customerId)) return res.status(400).json({ error: 'Invalid customer ID' });
    if (!PHASES.has(phase))            return res.status(400).json({ error: 'phase must be BEFORE or AFTER' });
    if (!ANGLES.has(angle))            return res.status(400).json({ error: 'Unknown angle' });
    if (!req.file)                     return res.status(400).json({ error: 'photo is required' });
    if (!MIME.has(req.file.mimetype))  return res.status(415).json({ error: 'photo must be JPEG or PNG' });

    const date = dateFolder();
    const dir  = destDir(customerId, date, phase);
    const name = ANGLES.get(angle) + MIME.get(req.file.mimetype);
    const file = path.join(dir, name);
    const rel  = path.posix.join(customerId, date, phase, name);

    await fsp.mkdir(dir, { recursive: true });   // auto-creates customer + date + phase

    try {
      await fsp.writeFile(file, req.file.buffer, { flag: 'wx' });   // never clobber
    } catch (e) {
      if (e.code === 'EEXIST') {
        // A retry or a double tap. Safe to report success.
        return res.json({ ok: true, duplicate: true, path: rel, destination: 'Synology / ' + rel });
      }
      throw e;
    }

    /* The front BEFORE shot doubles as the reference image used to recognise this
       customer next visit, so it is refreshed on every treatment. */
    if (phase === 'BEFORE' && angle === 'front') {
      try {
        await fsp.writeFile(path.join(DATA_DIR, customerId, '_reference' + MIME.get(req.file.mimetype)),
                            req.file.buffer);
      } catch (e) { console.error('[photoflow] reference photo not updated:', e.message); }
    }

    await audit({ event: 'photo.saved', customerId, phase, angle, path: rel, bytes: req.file.size, therapist });
    res.status(201).json({ ok: true, duplicate: false, path: rel, destination: 'Synology / ' + rel });
  } catch (e) { next(e); }
});

/* ---- today's records, for the dashboard ---- */

app.get('/api/records/today', requireKey, async (req, res, next) => {
  try {
    const date = dateFolder();
    const list = await readCustomers();
    const out  = [];
    for (const c of list) {
      const count = async phase => {
        try {
          const files = await fsp.readdir(path.join(DATA_DIR, c.id, date, phase));
          return files.filter(f => /\.(jpg|png)$/i.test(f)).length;
        } catch { return 0; }
      };
      const before = await count('BEFORE');
      const after  = await count('AFTER');
      if (before || after) out.push({ id: c.id, name: c.name, before, after });
    }
    res.json({ date, records: out });
  } catch (e) { next(e); }
});

/* ---- static frontend, served from the same origin (so: no CORS) ---- */

app.use(express.static(path.join(__dirname, 'web'), { index: 'index.html' }));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'web', 'index.html'));
});

app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `Photo is larger than ${MAX_MB} MB` });
  console.error('[photoflow]', err);
  res.status(500).json({ error: 'Could not save to the NAS. The photo is still on the device — try again.' });
});

(async () => {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  app.listen(PORT, () => console.log(`[photoflow] listening on ${PORT}, writing to ${DATA_DIR}`));
})();
