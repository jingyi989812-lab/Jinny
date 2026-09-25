function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;

/* ============================== MOCK DATA ============================== */

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = n => String(n).padStart(2, '0');
/* Local date, worked out each time: toISOString() is UTC, which in Malaysia is still
   yesterday until 8am — and a phone left open overnight must not keep yesterday's date. */
const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const prettyDate = iso => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]} ${MON[+m[2] - 1]} ${m[1]}` : iso || '';
};
const prettyToday = () => prettyDate(isoToday());
const clock = () => new Date().toLocaleTimeString('en-GB', {
  hour: '2-digit',
  minute: '2-digit'
});
const ANGLES = [{
  n: 1,
  key: 'front',
  short: 'FRONT',
  full: 'FRONT',
  off: 0,
  hint: 'Look straight at the camera'
}, {
  n: 2,
  key: 'l45',
  short: 'L 45',
  full: 'LEFT 45°',
  off: -0.38,
  hint: 'Turn head slightly to the left'
}, {
  n: 3,
  key: 'lside',
  short: 'L SIDE',
  full: 'LEFT SIDE',
  off: -0.8,
  hint: 'Keep turning left — full profile'
}, {
  n: 4,
  key: 'r45',
  short: 'R 45',
  full: 'RIGHT 45°',
  off: 0.38,
  hint: 'Back through centre, then slightly right'
}, {
  n: 5,
  key: 'rside',
  short: 'R SIDE',
  full: 'RIGHT SIDE',
  off: 0.8,
  hint: 'Keep turning right — full profile'
}];
const CUSTOMERS = [{
  id: 'BM 2756',
  name: 'Vera Chuah',
  seed: 0,
  time: '6:30 PM',
  phone: '4821',
  lastVisit: '12 Aug 2026',
  today: true
}, {
  id: 'BM 2811',
  name: 'Alan Tan',
  seed: 1,
  time: '6:45 PM',
  phone: '7130',
  lastVisit: '28 Jul 2026',
  today: true
}, {
  id: 'BM 2402',
  name: 'Jolene Pang',
  seed: 2,
  time: '2:00 PM',
  phone: '5514',
  lastVisit: '03 Aug 2026',
  today: true
}, {
  id: 'BM 2688',
  name: 'Nurul Aina',
  seed: 3,
  time: '2:40 PM',
  phone: '9042',
  lastVisit: '19 Aug 2026',
  today: true
}, {
  id: 'BM 2130',
  name: 'Kelvin Ooi',
  seed: 4,
  time: '3:15 PM',
  phone: '2287',
  lastVisit: '22 Jul 2026',
  today: true
}, {
  id: 'BM 2915',
  name: 'Melissa Tiong',
  seed: 5,
  time: '4:00 PM',
  phone: '6693',
  lastVisit: '30 Aug 2026',
  today: true
}, {
  id: 'BM 2077',
  name: 'Farah Idris',
  seed: 6,
  time: '4:45 PM',
  phone: '1178',
  lastVisit: '15 Aug 2026',
  today: true
}, {
  id: 'BM 2530',
  name: 'Damien Lau',
  seed: 7,
  time: '5:20 PM',
  phone: '3365',
  lastVisit: '06 Aug 2026',
  today: true
}, {
  id: 'BM 1180',
  name: 'Serene Kwok',
  seed: 8,
  time: '—',
  phone: '4409',
  lastVisit: '11 Jun 2026',
  today: false
}, {
  id: 'BM 1904',
  name: 'Isaac Chee',
  seed: 9,
  time: '—',
  phone: '8852',
  lastVisit: '02 May 2026',
  today: false
}, {
  id: 'BM 2244',
  name: 'Priya Ramesh',
  seed: 10,
  time: '—',
  phone: '7736',
  lastVisit: '24 Jun 2026',
  today: false
}, {
  id: 'BM 1342',
  name: 'Wong Mei Ling',
  seed: 11,
  time: '—',
  phone: '5028',
  lastVisit: '17 Apr 2026',
  today: false
}];

/* Membership IDs are an outlet code and the POS customer number: "BM 4521", "SS2 4521".
   Typed as "bm4521" or "BM-4521", it is still the same customer — so everything compares the
   canonical form, exactly as the server does. A code ending in a digit needs the space. */
function normalizeId(raw) {
  const m = String(raw || '').trim().toUpperCase().match(/^(?:([A-Z]{1,5}[0-9])[ -]|([A-Z]{1,6})[ -]?)([0-9]{1,8})$/);
  return m ? (m[1] || m[2]) + ' ' + m[3] : null;
}
/* The folder name a NEW customer gets. Existing customers keep whatever their folder is
   already called — the server finds it by ID. */
function folderLabel(c) {
  return c.id + ' ' + String(c.name || '').toUpperCase().replace(/[\\/:*?"<>|,\[\]]/g, '').replace(/\s+/g, ' ').trim();
}
const byId = id => {
  const n = normalizeId(id);
  return CUSTOMERS.find(c => c.id === n);
};

/* before / after progress for today's list + management dashboard */
const SEED_RECORDS = {
  'BM 2756': {
    before: false,
    after: false
  },
  'BM 2811': {
    before: true,
    after: false
  },
  'BM 2402': {
    before: true,
    after: true
  },
  'BM 2688': {
    before: true,
    after: true
  },
  'BM 2130': {
    before: true,
    after: true
  },
  'BM 2915': {
    before: true,
    after: true
  },
  'BM 2077': {
    before: true,
    after: true
  },
  'BM 2530': {
    before: true,
    after: true
  }
};
const statusOf = r => (r = r || {}).before && r.after ? 'Complete' : r.before || r.started ? 'In progress' : 'Ready';
/* What the server knows (or the sample progress, in demo) plus what this phone saved since. */
const recOf = (c, records) => {
  const a = c.live ? c.rec || {} : SEED_RECORDS[c.id] || {},
    b = records[c.id] || {};
  return {
    before: !!(a.before || b.before),
    after: !!(a.after || b.after),
    started: !!a.started
  };
};

/* ============================ REFERENCE PHOTO ============================ */
/* Illustrated stand-ins for real reference photos — no real faces in the prototype. */

const SKIN = ['#F2CBA6', '#E0B189', '#C8925F', '#A76D44', '#F6D9BE', '#8E5C39'];
const HAIR = ['#241D1A', '#4A3226', '#12100F', '#6B4A2E', '#3B2A20', '#5C4033'];
const CLOTH = ['#3B4A5A', '#7A6A58', '#4A5D4E', '#5C4A5E', '#2F3E46', '#6B5B4A'];
const BGS = [['#FCE7C3', '#F3D69C'], ['#E4EDE6', '#D2E0D7'], ['#F3E2D8', '#E6CFC1'], ['#E5E9F1', '#D3D9E7'], ['#F5E6EE', '#E7D2DF'], ['#EAF0E4', '#D8E4D0']];

/* Reference photos taken on this phone this session (small copies), keyed by membership ID. */
const REF_SRC = {};
function CustomerReferencePhoto({
  c,
  seed = 0,
  off = 0,
  className = '',
  radius = 18,
  muted = false,
  compact = false,
  short = false
}) {
  if (c && REF_SRC[c.id] && off === 0) {
    return /*#__PURE__*/React.createElement("img", {
      src: REF_SRC[c.id],
      alt: "",
      className: className,
      style: {
        borderRadius: radius,
        objectFit: 'cover',
        objectPosition: '50% 30%',
        display: 'block'
      }
    });
  }
  /* A real customer never gets an illustrated face: it could be mistaken for them. */
  if (c && c.live) return /*#__PURE__*/React.createElement(LiveReference, {
    c: c,
    className: className,
    radius: radius,
    compact: compact,
    short: short
  });
  if (c) seed = c.seed || 0;
  const s = seed % 6,
    s2 = (seed * 7 + 3) % 6,
    s3 = (seed * 5 + 1) % 6,
    style = seed % 5;
  const skin = SKIN[s],
    hair = HAIR[s2],
    cloth = CLOTH[s3],
    bg = BGS[seed * 3 % 6];
  const cx = 50 + off * 10,
    sq = 1 - Math.abs(off) * 0.3;
  const long = style === 0 || style === 4;
  const uid = 'p' + seed + String(off).replace(/[.-]/g, '');
  const hideL = off >= 0.62,
    hideR = off <= -0.62;
  const eye = 7.6 * sq,
    eyeY = 47,
    fx = off * 2.2;
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 100",
    className: className,
    preserveAspectRatio: "xMidYMid slice",
    style: {
      borderRadius: radius,
      display: 'block',
      filter: muted ? 'saturate(.75)' : 'none'
    },
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: uid + 'bg',
    x1: "0",
    y1: "0",
    x2: "0.4",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: bg[0]
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: bg[1]
  }))), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "0",
    width: "100",
    height: "100",
    fill: 'url(#' + uid + 'bg)'
  }), long && /*#__PURE__*/React.createElement("ellipse", {
    cx: cx,
    cy: "53",
    rx: 24 * sq,
    ry: "32",
    fill: hair
  }), style === 3 && /*#__PURE__*/React.createElement("circle", {
    cx: cx,
    cy: "19",
    r: "8",
    fill: hair
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "50",
    cy: "122",
    rx: "43",
    ry: "42",
    fill: cloth
  }), /*#__PURE__*/React.createElement("path", {
    d: `M${50 - 9} 118 L${50} 96 L${50 + 9} 118 Z`,
    fill: "#FFFFFF",
    opacity: ".92"
  }), /*#__PURE__*/React.createElement("path", {
    d: `M${cx - 6.5} 64 L${cx - 6.5} 86 L${cx + 6.5} 86 L${cx + 6.5} 64 Z`,
    fill: skin
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: cx,
    cy: "70",
    rx: 13 * sq,
    ry: "6",
    fill: "#000",
    opacity: ".13"
  }), !hideR && /*#__PURE__*/React.createElement("ellipse", {
    cx: cx + 19.5 * sq,
    cy: "48",
    rx: "3.2",
    ry: "4.4",
    fill: skin
  }), !hideL && /*#__PURE__*/React.createElement("ellipse", {
    cx: cx - 19.5 * sq,
    cy: "48",
    rx: "3.2",
    ry: "4.4",
    fill: skin
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: cx,
    cy: "46",
    rx: 20 * sq,
    ry: "25",
    fill: skin
  }), /*#__PURE__*/React.createElement("path", {
    d: `M ${cx - 20.5 * sq} 41 C ${cx - 21 * sq} 13, ${cx + 21 * sq} 13, ${cx + 20.5 * sq} 41
                C ${cx + 11 * sq} 30, ${cx - 11 * sq} 30, ${cx - 20.5 * sq} 41 Z`,
    fill: hair
  }), !hideL && /*#__PURE__*/React.createElement("ellipse", {
    cx: cx - eye + fx,
    cy: eyeY,
    rx: "2",
    ry: "2.5",
    fill: "#2B2320"
  }), !hideR && /*#__PURE__*/React.createElement("ellipse", {
    cx: cx + eye + fx,
    cy: eyeY,
    rx: "2",
    ry: "2.5",
    fill: "#2B2320"
  }), !hideL && /*#__PURE__*/React.createElement("path", {
    d: `M${cx - eye - 3 + fx} ${eyeY - 5.4} q3 -1.8 6 0`,
    stroke: hair,
    strokeWidth: "1.5",
    fill: "none",
    strokeLinecap: "round"
  }), !hideR && /*#__PURE__*/React.createElement("path", {
    d: `M${cx + eye - 3 + fx} ${eyeY - 5.4} q3 -1.8 6 0`,
    stroke: hair,
    strokeWidth: "1.5",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: `M${cx + fx + off * 4} 51 q${1.5 + off * 3} 4 ${-1.5} 5`,
    stroke: "#00000038",
    strokeWidth: "1.4",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: `M${cx - 4 * sq + fx} 61 q${4 * sq} 3 ${8 * sq} 0`,
    stroke: "#9B5B4E",
    strokeWidth: "1.7",
    fill: "none",
    strokeLinecap: "round"
  }));
}

/* The customer's _reference.jpg from the NAS, fetched two at a time and kept for the session. */
const REF_CACHE = {};
const refQueue = {
  active: 0,
  waiting: []
};
function loadReference(id) {
  if (REF_CACHE[id]) return REF_CACHE[id];
  const p = new Promise(resolve => {
    const run = () => {
      refQueue.active++;
      fetch(API + 'reference.php?id=' + encodeURIComponent(id), {
        cache: 'no-store',
        headers: {
          'X-PhotoFlow-Session': getToken()
        }
      }).then(r => r.ok && (r.headers.get('Content-Type') || '').indexOf('image/') === 0 ? r.blob().then(b => ({
        url: URL.createObjectURL(b)
      })) : {
        url: null,
        failed: r.status !== 404
      }).catch(() => ({
        url: null,
        failed: true
      })).then(v => {
        if (v.failed) delete REF_CACHE[id]; /* a network blip shouldn't stick for the whole day */
        refQueue.active--;
        const next = refQueue.waiting.shift();
        if (next) next();
        resolve(v);
      });
    };
    refQueue.active < 2 ? run() : refQueue.waiting.push(run);
  });
  REF_CACHE[id] = p;
  return p;
}
function LiveReference({
  c,
  className,
  radius,
  compact,
  short
}) {
  const [st, setSt] = useState({
    loading: true,
    url: null
  });
  useEffect(() => {
    let alive = true;
    setSt({
      loading: true,
      url: null
    });
    loadReference(c.id).then(v => {
      if (alive) setSt({
        loading: false,
        url: v.url
      });
    });
    return () => {
      alive = false;
    };
  }, [c.id]);
  if (st.url) return /*#__PURE__*/React.createElement("img", {
    src: st.url,
    alt: "",
    className: className,
    style: {
      borderRadius: radius,
      display: 'block',
      objectFit: 'cover',
      objectPosition: '50% 30%'
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    className: `${className} bg-line grid place-items-center text-muted`,
    style: {
      borderRadius: radius
    }
  }, !st.loading && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center"
  }, /*#__PURE__*/React.createElement(Icon.cam, {
    s: compact ? 16 : 20
  }), !compact && /*#__PURE__*/React.createElement("span", {
    className: "mono text-[8px] font-bold track mt-1 text-center"
  }, short ? 'NO PHOTO' : 'NO PHOTO YET')));
}

/* ============================== PRIMITIVES ============================== */

const Icon = {
  back: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p.s || 20,
    height: p.s || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M15 5l-7 7 7 7"
  })),
  check: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p.s || 20,
    height: p.s || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 12.5l5.5 5.5L20 6.5"
  })),
  cam: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p.s || 20,
    height: p.s || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 8.5A2.5 2.5 0 015.5 6h1.7l1.2-2h6.2l1.2 2h1.7A2.5 2.5 0 0121 8.5v9A2.5 2.5 0 0118.5 20h-13A2.5 2.5 0 013 17.5z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "13",
    r: "3.6"
  })),
  search: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p.s || 20,
    height: p.s || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "6.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 16l4.5 4.5"
  })),
  plus: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p.s || 20,
    height: p.s || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.6",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14M5 12h14"
  })),
  people: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p.s || 20,
    height: p.s || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "8",
    r: "3.4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 19c0-3.2 2.7-5 6-5s6 1.8 6 5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 5.6A3.4 3.4 0 0117 12M18 19c0-2.4-.9-4-2.4-4.8"
  })),
  chart: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p.s || 20,
    height: p.s || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 20V10M10 20V4M16 20v-7M22 20H2"
  })),
  folder: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p.s || 20,
    height: p.s || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 7a2 2 0 012-2h4l2 2.5h8a2 2 0 012 2V18a2 2 0 01-2 2H5a2 2 0 01-2-2z"
  })),
  warn: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p.s || 20,
    height: p.s || 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 8v5M12 16.5v.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  })),
  chev: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p.s || 18,
    height: p.s || 18,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 5l7 7-7 7"
  })),
  spark: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: p.s || 16,
    height: p.s || 16,
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18.5 14l.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8z",
    opacity: ".7"
  }))
};
function Btn({
  variant = 'primary',
  children,
  className = '',
  ...rest
}) {
  const base = 'tap w-full rounded-2xl font-extrabold flex items-center justify-center gap-2.5 select-none';
  const v = {
    primary: 'bg-brand text-ink h-16 text-[17px] shadow-[0_6px_0_0_#D69A00] active:shadow-[0_2px_0_0_#D69A00] active:translate-y-[4px]',
    confirm: 'bg-good text-white h-16 text-[17px] shadow-[0_6px_0_0_#0A7A55] active:shadow-[0_2px_0_0_#0A7A55] active:translate-y-[4px]',
    dark: 'bg-ink text-white h-16 text-[17px]',
    ghost: 'bg-white text-ink2 h-14 text-[15px] border-2 border-line',
    quiet: 'bg-transparent text-muted h-12 text-[14px] font-bold'
  }[variant];
  return /*#__PURE__*/React.createElement("button", _extends({}, rest, {
    className: `${base} ${v} ${className}`
  }), children);
}
function Label({
  children,
  className = ''
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `mono track text-[10px] font-semibold text-muted uppercase ${className}`
  }, children);
}
function IdChip({
  id,
  tone = 'soft'
}) {
  const t = tone === 'dark' ? 'bg-white/12 text-brand border-white/15' : 'bg-brandSoft text-brandDeep border-brand/40';
  return /*#__PURE__*/React.createElement("span", {
    className: `mono text-[11px] font-semibold px-2 py-[3px] rounded-md border ${t}`
  }, id);
}
function StatusPill({
  status
}) {
  const map = {
    'Complete': ['bg-goodSoft', 'text-good', 'border-good/25'],
    'In progress': ['bg-warnSoft', 'text-warn', 'border-warn/25'],
    'Ready': ['bg-brandSoft', 'text-brandDeep', 'border-brand/40']
  }[status] || ['bg-line', 'text-muted', 'border-line'];
  return /*#__PURE__*/React.createElement("span", {
    className: `text-[11px] font-bold px-2.5 py-1 rounded-full border ${map[0]} ${map[1]} ${map[2]}`
  }, status);
}

/* device chrome — sells the iPhone context */
function StatusBar({
  dark = false
}) {
  const c = dark ? 'text-white/85 bg-ink' : 'text-ink/75';
  return /*#__PURE__*/React.createElement("div", {
    className: `sbar flex items-center justify-between px-6 pt-2.5 pb-1 text-[11px] font-semibold ${c} mono flex-none`
  }, /*#__PURE__*/React.createElement("span", null, clock()), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 18 12",
    width: "17",
    height: "11",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "8",
    width: "3",
    height: "4",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.5",
    y: "5.5",
    width: "3",
    height: "6.5",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "3",
    width: "3",
    height: "9",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13.5",
    y: "0",
    width: "3",
    height: "12",
    rx: "1",
    opacity: ".35"
  })), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 26 12",
    width: "24",
    height: "11",
    fill: "none",
    stroke: "currentColor"
  }, /*#__PURE__*/React.createElement("rect", {
    x: ".7",
    y: ".7",
    width: "21",
    height: "10.6",
    rx: "3",
    strokeWidth: "1.2",
    opacity: ".5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2.4",
    y: "2.4",
    width: "14",
    height: "7.2",
    rx: "1.6",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M23.6 4.2v3.6",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    opacity: ".5"
  }))));
}
function TopBar({
  title,
  onBack,
  right,
  dark = false,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `flex-none px-4 pb-3 ${dark ? 'bg-ink text-white' : 'bg-cream'} border-b ${dark ? 'border-white/10' : 'border-line'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 h-11"
  }, onBack ? /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    "aria-label": "Back",
    className: `tap w-10 h-10 -ml-1 rounded-xl flex items-center justify-center ${dark ? 'text-white/80 hover:bg-white/10' : 'text-ink2 hover:bg-black/5'}`
  }, /*#__PURE__*/React.createElement(Icon.back, null)) : null, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: `mono track text-[10.5px] font-bold uppercase ${dark ? 'text-brand' : 'text-brandDeep'}`
  }, title), sub && /*#__PURE__*/React.createElement("div", {
    className: `text-[13px] font-bold truncate ${dark ? 'text-white' : 'text-ink'}`
  }, sub)), right));
}
function Dock({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "dock flex-none px-4 pt-2.5 pb-3 bg-cream/95 backdrop-blur border-t border-line space-y-2"
  }, children);
}

/* ============================== CUSTOMER CARD ============================== */

function CustomerCard({
  c,
  record,
  onSelect,
  mode = 'today'
}) {
  const st = record ? statusOf(record) : null;
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onSelect(c),
    className: "tap w-full bg-paper rounded-2xl border border-line p-2.5 flex gap-3 text-left items-center hover:border-brand/60 active:bg-brandSoft/40"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative flex-none"
  }, /*#__PURE__*/React.createElement(CustomerReferencePhoto, {
    c: c,
    className: "w-[68px] h-[68px]",
    radius: 14,
    short: true
  }), /*#__PURE__*/React.createElement("span", {
    className: "mono absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-ink text-white text-[8px] font-semibold px-1.5 py-[2px] rounded track"
  }, "REF")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-extrabold leading-tight truncate"
  }, c.name)), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 flex items-center gap-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement(IdChip, {
    id: c.id
  }), mode === 'today' ? /*#__PURE__*/React.createElement("span", {
    className: "mono text-[11.5px] font-semibold text-ink2"
  }, c.time || '', c.status === 'arrived' ? ' · arrived' : '', c.branch && c.live && c.id.indexOf(c.branch + ' ') !== 0 ? ' · at ' + c.branch : '') : c.lastVisit ? /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-muted"
  }, "Last visit ", c.lastVisit) : null)), /*#__PURE__*/React.createElement("div", {
    className: "flex-none flex flex-col items-end gap-1.5 pl-1"
  }, st && /*#__PURE__*/React.createElement(StatusPill, {
    status: st
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-muted"
  }, /*#__PURE__*/React.createElement(Icon.chev, null))));
}

/* ========================= CUSTOMER CONFIRMATION ========================= */

function CustomerConfirmation({
  c,
  onYes,
  onBack
}) {
  /* Which folder will these photos go into? Ask the NAS now, not after the photos are taken —
     and refuse to continue while the ID has two folders. */
  const [look, setLook] = useState(c.live ? {
    loading: true
  } : {
    status: 'demo'
  });
  const check = () => {
    setLook({
      loading: true
    });
    apiGet('customers.php?view=lookup&id=' + encodeURIComponent(c.id)).then(j => setLook({
      status: j.status,
      folders: j.folders,
      today: j.today
    })).catch(e => setLook({
      error: e.message
    }));
  };
  useEffect(() => {
    if (c.live) check();
  }, [c.id]);
  const blocked = c.live && (look.loading || look.error || look.status === 'duplicate');
  /* What is already saved for this customer today decides what comes next: a customer whose
     BEFORE photos are done is here for their AFTER photos, even if another phone took them.
     The switch covers the rest — a doctor sometimes asks for AFTER photos only. */
  const t = look.today || {
    before: 0,
    after: 0,
    beforeExtra: 0,
    afterExtra: 0
  };
  const beforeDone = t.before > 0 || t.beforeExtra > 0;
  const afterDone = t.after > 0 || t.afterExtra > 0;
  const suggested = beforeDone && !afterDone ? 'after' : 'before';
  const [phase, setPhase] = useState(suggested);
  const [chosen, setChosen] = useState(false);
  useEffect(() => {
    if (!chosen) setPhase(suggested);
  }, [suggested]);
  const phaseWord = phase.toUpperCase();
  const other = phase === 'before' ? 'AFTER' : 'BEFORE';
  const doneNow = phase === 'before' ? beforeDone : afterDone;
  const confirmed = look.status === 'found' ? Object.assign({}, c, {
    folder: look.folders[0]
  }) : look.status === 'none' ? Object.assign({}, c, {
    folder: null
  }) : c;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    title: "Confirm customer",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fade-up bg-paper rounded-3xl border border-line overflow-hidden p-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative w-[150px] mx-auto ratio ratio-3x4 rounded-2xl overflow-hidden bg-cream"
  }, /*#__PURE__*/React.createElement(CustomerReferencePhoto, {
    c: c,
    className: "rfill object-cover",
    radius: 0
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-2 left-2 mono track text-[8.5px] font-bold bg-ink/85 text-white px-1.5 py-[3px] rounded"
  }, "REFERENCE")), /*#__PURE__*/React.createElement("div", {
    className: "pt-2 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[19px] font-extrabold leading-tight"
  }, c.name), /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5 flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(IdChip, {
    id: c.id
  }), c.time && c.time !== '—' && /*#__PURE__*/React.createElement("span", {
    className: "mono text-[13px] font-bold text-ink2"
  }, c.time)), c.live && /*#__PURE__*/React.createElement("div", {
    className: `mt-2 rounded-xl px-3 py-1.5 ${look.status === 'duplicate' || look.error ? 'bg-warnSoft' : 'bg-cream'}`
  }, /*#__PURE__*/React.createElement(Label, null, "Photo folder"), /*#__PURE__*/React.createElement("div", {
    className: `mono text-[12px] font-bold mt-0.5 break-words ${look.status === 'duplicate' || look.error ? 'text-warn' : ''}`
  }, look.loading ? 'Checking the NAS…' : look.error ? look.error : look.status === 'found' ? look.folders[0] : look.status === 'duplicate' ? `${look.folders.length} folders for this customer: ${look.folders.join(' / ')}. Ask IT to merge them first.` : 'New folder: ' + folderLabel(c)), look.error && /*#__PURE__*/React.createElement("button", {
    onClick: check,
    className: "tap mt-1.5 text-[12.5px] font-extrabold text-ink2"
  }, "Try again")))), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 mb-1.5 text-center"
  }, /*#__PURE__*/React.createElement(Label, null, "Taking"), /*#__PURE__*/React.createElement("div", {
    className: `mt-0.5 text-[24px] font-extrabold leading-none tracking-tight ${phase === 'before' ? 'text-brandDeep' : 'text-good'}`
  }, phaseWord), doneNow && /*#__PURE__*/React.createElement("p", {
    className: "text-[11.5px] font-bold text-warn mt-1"
  }, "Already saved today \u2014 these photos will be added"))), /*#__PURE__*/React.createElement(Dock, null, /*#__PURE__*/React.createElement(Btn, {
    variant: "confirm",
    onClick: () => onYes(confirmed, 'face', phase),
    disabled: blocked,
    className: "!h-14"
  }, /*#__PURE__*/React.createElement(Icon.check, null), /*#__PURE__*/React.createElement("span", null, "5-ANGLE PHOTO")), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: () => onYes(confirmed, 'photos', phase),
    disabled: blocked,
    className: "!h-12"
  }, /*#__PURE__*/React.createElement(Icon.cam, {
    s: 17
  }), /*#__PURE__*/React.createElement("span", null, "OTHERS \u2014 HAND, LEG\u2026")), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "quiet",
    onClick: onBack,
    className: "!w-1/2 !h-10"
  }, "Back"), /*#__PURE__*/React.createElement(Btn, {
    variant: "quiet",
    onClick: () => {
      setChosen(true);
      setPhase(phase === 'before' ? 'after' : 'before');
    },
    className: "!w-1/2 !h-10 !text-ink2"
  }, other, " ", /*#__PURE__*/React.createElement(Icon.chev, {
    s: 16
  })))));
}

/* ============================= ANGLE PROGRESS ============================= */

function HeadGlyph({
  off,
  tone
}) {
  const cx = 12 + off * 3.4,
    sq = 1 - Math.abs(off) * 0.3;
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "22",
    height: "22",
    fill: "none",
    stroke: tone,
    strokeWidth: "1.8"
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: cx,
    cy: "11",
    rx: 6.2 * sq,
    ry: "7.4"
  }), /*#__PURE__*/React.createElement("path", {
    d: `M${cx - 6.4 * sq} 9.5 q${6.4 * sq} -6 ${12.8 * sq} 0`,
    strokeWidth: "2.4",
    strokeLinecap: "round"
  }), off > -0.6 && /*#__PURE__*/React.createElement("circle", {
    cx: cx + 2.4 * sq,
    cy: "11.6",
    r: ".9",
    fill: tone,
    stroke: "none"
  }), off < 0.6 && /*#__PURE__*/React.createElement("circle", {
    cx: cx - 2.4 * sq,
    cy: "11.6",
    r: ".9",
    fill: tone,
    stroke: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 22c1.4-2.4 10.6-2.4 12 0",
    strokeLinecap: "round"
  }));
}
function AngleProgress({
  index,
  done,
  onPick
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex gap-[5px]"
  }, ANGLES.map((ang, i) => {
    const isDone = done[i],
      isNow = i === index;
    const cls = isNow ? 'bg-ink border-ink text-white' : isDone ? 'bg-goodSoft border-good/30 text-good' : 'bg-paper border-line text-muted';
    const inner = /*#__PURE__*/React.createElement(React.Fragment, null, isDone && !isNow ? /*#__PURE__*/React.createElement("span", {
      className: "h-[22px] flex items-center"
    }, /*#__PURE__*/React.createElement(Icon.check, {
      s: 17
    })) : /*#__PURE__*/React.createElement(HeadGlyph, {
      off: ang.off,
      tone: isNow ? '#FFC02E' : '#A79E92'
    }), /*#__PURE__*/React.createElement("span", {
      className: "mono text-[8.5px] font-bold track"
    }, ang.short));
    const shell = `flex-1 rounded-xl border-2 py-1.5 flex flex-col items-center gap-0.5 ${cls}`;
    return isDone && !isNow && onPick ? /*#__PURE__*/React.createElement("button", {
      key: ang.key,
      onClick: () => onPick(i),
      className: `tap ${shell}`,
      "aria-label": `Redo ${ang.full}`
    }, inner) : /*#__PURE__*/React.createElement("div", {
      key: ang.key,
      className: shell
    }, inner);
  }));
}

/* ============================== PHOTO PREVIEW ============================== */

function PhotoPreview({
  photo,
  className = '',
  radius = 20,
  showStamp = true,
  full = false,
  grid = false
}) {
  /* Grids show the small copy; only the check screen decodes the full 8 MP image. */
  const src = full ? photo.src : thumbUrl(photo);
  return /*#__PURE__*/React.createElement("div", {
    className: `relative overflow-hidden bg-ink ${className}`,
    style: {
      borderRadius: radius
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "",
    className: "rfill object-cover"
  }) : /*#__PURE__*/React.createElement(CustomerReferencePhoto, {
    seed: photo.seed,
    off: photo.off,
    className: "rfill",
    radius: 0
  }), grid && /*#__PURE__*/React.createElement(GridLines, null), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 pointer-events-none",
    style: {
      boxShadow: 'inset 0 0 60px rgba(0,0,0,.28)'
    }
  }), showStamp && /*#__PURE__*/React.createElement("div", {
    className: "mono absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-semibold text-white/90 track"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bg-black/45 px-1.5 py-[3px] rounded"
  }, photo.label), /*#__PURE__*/React.createElement("span", {
    className: "bg-black/45 px-1.5 py-[3px] rounded"
  }, isoToday(), " ", photo.time)));
}

/* ============================== IMAGE PIPELINE ============================== */

/* 0 = keep whatever the camera gives, no downscale. Set a number (e.g. 2400) to cap
   the longest edge if photos turn out too heavy for the clinic wifi. */
const MAX_EDGE = 0;
const JPEG_Q = 0.92;
/* The reference copy: big enough to recognise a face, small enough to load a whole
   day's list over clinic wifi. */
const THUMB_EDGE = 640;
/* Most of one label at a time; a phone holding dozens of 8 MP photos runs out of memory. */
const EXTRA_MAX = 12;

/* Thresholds. Measured values are shown under each check so they can be
   calibrated against real photos taken in the treatment room. */
const QC = {
  darkBelow: 48,
  brightAbove: 216,
  blurBelow: 90,
  minEdge: 640
};

/* iPhone photos carry an EXIF orientation tag that <canvas> ignores, which is
   why naive uploads come out sideways. Read it so we can rotate. */
function exifOrientation(buf) {
  try {
    const v = new DataView(buf);
    if (v.byteLength < 4 || v.getUint16(0) !== 0xFFD8) return 1;
    let off = 2;
    while (off + 4 <= v.byteLength) {
      const marker = v.getUint16(off);
      if (marker === 0xFFE1) {
        const start = off + 4;
        if (v.getUint32(start) !== 0x45786966) return 1; /* "Exif" */
        const tiff = start + 6;
        const little = v.getUint16(tiff) === 0x4949;
        const ifd = tiff + v.getUint32(tiff + 4, little);
        const count = v.getUint16(ifd, little);
        for (let i = 0; i < count; i++) {
          const e = ifd + 2 + i * 12;
          if (v.getUint16(e, little) === 0x0112) return v.getUint16(e + 8, little) || 1;
        }
        return 1;
      }
      if ((marker & 0xFF00) !== 0xFF00) break;
      off += 2 + v.getUint16(off + 2);
    }
  } catch (e) {/* unreadable EXIF is not worth failing a photo over */}
  return 1;
}

/* The size recorded inside the JPEG, before any orientation is applied. Comparing
   this against what the browser decoded tells us whether it rotated the image for
   us — modern Safari does, iOS 12 does not, and applying EXIF twice is what makes
   a photo come out flipped. */
function jpegSize(buf) {
  try {
    const v = new DataView(buf);
    let off = 2;
    while (off + 9 <= v.byteLength) {
      if (v.getUint8(off) !== 0xFF) {
        off++;
        continue;
      }
      const m = v.getUint8(off + 1);
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
        return {
          h: v.getUint16(off + 5),
          w: v.getUint16(off + 7)
        };
      }
      if (m === 0xD8 || m === 0x01 || m >= 0xD0 && m <= 0xD7) {
        off += 2;
        continue;
      }
      off += 2 + v.getUint16(off + 2);
    }
  } catch (e) {/* fall through */}
  return null;
}
function drawNormalised(img, orientation, maxEdge) {
  const w = img.naturalWidth || img.width,
    h = img.naturalHeight || img.height;
  const scale = maxEdge ? Math.min(1, maxEdge / Math.max(w, h)) : 1;
  const sw = Math.round(w * scale),
    sh = Math.round(h * scale);
  const swap = orientation >= 5;
  const cv = document.createElement('canvas');
  cv.width = swap ? sh : sw;
  cv.height = swap ? sw : sh;
  const g = cv.getContext('2d');
  switch (orientation) {
    case 2:
      g.transform(-1, 0, 0, 1, sw, 0);
      break;
    case 3:
      g.transform(-1, 0, 0, -1, sw, sh);
      break;
    case 4:
      g.transform(1, 0, 0, -1, 0, sh);
      break;
    case 5:
      g.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      g.transform(0, 1, -1, 0, sh, 0);
      break;
    case 7:
      g.transform(0, -1, -1, 0, sh, sw);
      break;
    case 8:
      g.transform(0, -1, 1, 0, 0, sw);
      break;
    default:
      break;
  }
  g.drawImage(img, 0, 0, sw, sh);
  return cv;
}

/* Two measurements, both independent of skin tone:
   mean luminance, and the variance of a Laplacian (how much fine detail
   survives — motion blur and soft focus both collapse it). */
function measure(cv) {
  const w = 320,
    h = Math.max(1, Math.round(cv.height * (320 / cv.width)));
  const a = document.createElement('canvas');
  a.width = w;
  a.height = h;
  const g = a.getContext('2d');
  g.drawImage(cv, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  let lum = 0;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    gray[p] = y;
    lum += y;
  }
  let sum = 0,
    sumSq = 0,
    n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const L = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      sum += L;
      sumSq += L * L;
      n++;
    }
  }
  const mean = sum / n;
  a.width = a.height = 0;
  return {
    brightness: lum / (w * h),
    sharpness: Math.max(0, sumSq / n - mean * mean)
  };
}
function runChecks(m, srcW, srcH) {
  const dark = m.brightness < QC.darkBelow,
    blown = m.brightness > QC.brightAbove;
  return [{
    label: 'Lighting',
    ok: !dark && !blown,
    bad: dark ? 'Too dark' : 'Too bright',
    detail: 'brightness ' + Math.round(m.brightness)
  }, {
    label: 'Sharpness',
    ok: m.sharpness >= QC.blurBelow,
    bad: 'Looks blurry',
    detail: 'detail ' + Math.round(m.sharpness)
  }, {
    label: 'Resolution',
    ok: Math.min(srcW, srcH) >= QC.minEdge,
    bad: 'Photo too small',
    detail: srcW + '×' + srcH
  }];
}
function canvasToBlob(cv, q) {
  return new Promise(function (resolve, reject) {
    if (cv.toBlob) {
      cv.toBlob(function (b) {
        b ? resolve(b) : reject(new Error('Could not encode that photo.'));
      }, 'image/jpeg', q);
      return;
    }
    try {
      const bin = atob(cv.toDataURL('image/jpeg', q).split(',')[1]);
      const u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      resolve(new Blob([u], {
        type: 'image/jpeg'
      }));
    } catch (e) {
      reject(e);
    }
  });
}

/* Photos are kept as Blobs, not base-64 strings: a third smaller, and they upload as-is.
   The 8 MP canvas is freed straight away — iOS 12 caps total canvas memory per page,
   and a day of full-resolution photos would otherwise hit it and crash the tab. */
function makeThumb(cv) {
  const s = Math.min(1, THUMB_EDGE / Math.max(cv.width, cv.height));
  const t = document.createElement('canvas');
  t.width = Math.max(1, Math.round(cv.width * s));
  t.height = Math.max(1, Math.round(cv.height * s));
  t.getContext('2d').drawImage(cv, 0, 0, t.width, t.height);
  return canvasToBlob(t, 0.85).then(function (b) {
    t.width = t.height = 0;
    return b;
  });
}
function finishFromCanvas(cv, srcW, srcH, angle) {
  const m = measure(cv);
  let thumb = null;
  return makeThumb(cv).then(function (t) {
    thumb = t;
    return canvasToBlob(cv, JPEG_Q);
  }).then(function (blob) {
    cv.width = cv.height = 0;
    return {
      blob: blob,
      thumb: thumb,
      src: URL.createObjectURL(blob),
      label: angle.full,
      time: clock(),
      checks: runChecks(m, srcW, srcH)
    };
  }, function (e) {
    cv.width = cv.height = 0;
    throw e;
  });
}

/* A small preview URL, made once per photo and reused: a grid of extra photos would otherwise
   decode several 8 MP images at once, which iOS 12 can't afford. */
function thumbUrl(p) {
  if (!p) return null;
  if (!p.thumbSrc && p.thumb) p.thumbSrc = URL.createObjectURL(p.thumb);
  return p.thumbSrc || p.src;
}
function processFile(file, angle) {
  return new Promise(function (resolve, reject) {
    const fr = new FileReader();
    fr.onerror = function () {
      reject(new Error('Could not read that photo.'));
    };
    fr.onload = function () {
      const buf = fr.result;
      let ori = exifOrientation(buf);
      const enc = jpegSize(buf);
      const url = URL.createObjectURL(new Blob([buf], {
        type: file.type || 'image/jpeg'
      }));
      const img = new Image();
      img.onload = function () {
        try {
          /* Already rotated by the browser? Then rotating again would flip it. */
          if (enc && ori >= 5 && img.naturalWidth === enc.h && img.naturalHeight === enc.w) ori = 1;
          const cv = drawNormalised(img, ori, MAX_EDGE);
          const w = img.naturalWidth,
            h = img.naturalHeight;
          img.onload = img.onerror = null;
          URL.revokeObjectURL(url);
          img.src = '';
          finishFromCanvas(cv, w, h, angle).then(resolve, reject);
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Could not open that photo.'));
      };
      img.src = url;
    };
    fr.readAsArrayBuffer(file);
  });
}

/* ================================= BACKEND ================================= */

/* Relative, so it resolves next to index.html wherever IT deploys the folder. */
const API = 'api/';

/* The clinic build (dist/index.html) sets this. It never shows sample customers and never
   pretends to save: if the server can't be reached, the phone says so instead. */
const PILOT = !!window.PHOTOFLOW_PILOT;
const TOKEN_STORE = 'photoflow.session';
const USER_STORE = 'photoflow.user';
function getToken() {
  try {
    return localStorage.getItem(TOKEN_STORE) || '';
  } catch (e) {
    return '';
  }
}
function setToken(t) {
  try {
    t ? localStorage.setItem(TOKEN_STORE, t) : localStorage.removeItem(TOKEN_STORE);
  } catch (e) {}
}
function getUser() {
  try {
    const s = localStorage.getItem(USER_STORE);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}
function setUser(u) {
  try {
    u ? localStorage.setItem(USER_STORE, JSON.stringify(u)) : localStorage.removeItem(USER_STORE);
  } catch (e) {}
}
function clearSession() {
  setToken('');
  setUser(null);
}
function withTimeout(p, ms) {
  return Promise.race([p, new Promise(function (_, rej) {
    setTimeout(function () {
      rej(new Error('timeout'));
    }, ms);
  })]);
}

/* live         — signed in, on the real server: photos go to the NAS
   needs-login  — on the real server, but this phone isn't signed in (or its session expired)
   unconfigured — the backend is installed but config.php is missing
   demo         — anywhere else (the claude.ai link, a laptop): nothing is saved
   offline      — the clinic build couldn't reach its server (wifi down): nothing works until it can */
async function probeBackend() {
  const away = {
    mode: PILOT ? 'offline' : 'demo'
  };
  let health;
  try {
    health = await withTimeout(fetch(API + 'health.php', {
      cache: 'no-store'
    }), 8000);
  } catch (e) {
    return away;
  }
  if (!health.ok) return away;
  let hj = null;
  try {
    hj = await health.json();
  } catch (e) {}
  if (!hj || hj.service !== 'photoflow') return away;
  if (!hj.configured) return {
    mode: 'unconfigured'
  };
  const pos = hj.pos === 'connected';
  const token = getToken();
  if (!token) return {
    mode: 'needs-login',
    pos
  };
  try {
    const r = await withTimeout(fetch(API + 'me.php', {
      cache: 'no-store',
      headers: {
        'X-PhotoFlow-Session': token
      }
    }), 8000);
    if (r.status === 401) {
      clearSession();
      return {
        mode: 'needs-login',
        pos
      };
    }
    if (!r.ok) return away;
    const j = await r.json();
    if (!j || !j.ok) {
      clearSession();
      return {
        mode: 'needs-login',
        pos
      };
    }
    setUser(j.user);
    return {
      mode: 'live',
      pos,
      user: j.user
    };
  } catch (e) {
    return away;
  }
}
async function apiGet(path) {
  let r;
  try {
    /* Generous: the first POS lookup of the day may wait for the report to download. */
    r = await withTimeout(fetch(API + path, {
      cache: 'no-store',
      headers: {
        'X-PhotoFlow-Session': getToken()
      }
    }), 90000);
  } catch (e) {
    throw new Error('No connection to the server. Check the wifi and try again.');
  }
  let j = null;
  try {
    j = await r.json();
  } catch (e) {}
  if (r.status === 401) {
    clearSession();
    throw new Error('Signed out. Please sign in again.');
  }
  if (r.status === 403) throw new Error(j && j.error || 'Your account doesn\'t have access to that.');
  if (!r.ok || !j || !j.ok) throw new Error(j && j.error || 'Server error (HTTP ' + r.status + ').');
  return j;
}

/* A customer as the server describes it, in the shape the screens use. */
function fromServer(c) {
  return {
    id: c.id,
    name: c.name || c.id,
    time: c.time || null,
    phone: c.phoneLast4 || '',
    lastVisit: c.lastVisit ? prettyDate(c.lastVisit) : null,
    folder: c.folder || null,
    branch: c.branch || null,
    status: c.status || null,
    source: c.source,
    live: true,
    rec: {
      before: c.before >= 5 || c.before === 0 && (c.beforeExtra || 0) > 0,
      after: c.after >= 5 || c.after === 0 && (c.afterExtra || 0) > 0,
      started: (c.before || 0) + (c.after || 0) + (c.beforeExtra || 0) + (c.afterExtra || 0) > 0
    },
    counts: {
      before: (c.before || 0) + (c.beforeExtra || 0),
      after: (c.after || 0) + (c.afterExtra || 0)
    }
  };
}
async function apiPost(path, body) {
  let r;
  try {
    r = await withTimeout(fetch(API + path, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-PhotoFlow-Session': getToken()
      },
      body: JSON.stringify(body || {})
    }), 20000);
  } catch (e) {
    throw new Error('No connection to the server. Check the wifi and try again.');
  }
  let j = null;
  try {
    j = await r.json();
  } catch (e) {}
  if (r.status === 401) {
    clearSession();
    throw new Error('Signed out. Please sign in again.');
  }
  if (r.status === 403) throw new Error(j && j.error || 'Admin access only.');
  if (!r.ok || !j || !j.ok) throw new Error(j && j.error || 'Server error (HTTP ' + r.status + ').');
  return j;
}
async function uploadPhoto(o) {
  const fd = new FormData();
  fd.append('customerId', o.customerId);
  fd.append('customerName', o.customerName || '');
  fd.append('phase', o.phase.toUpperCase());
  fd.append('angle', o.angle);
  if (o.angle === 'extra') {
    /* hands, legs, backs: one group per label */
    fd.append('group', String(o.group));
    fd.append('seq', String(o.seq));
    fd.append('label', o.label || '');
  }
  fd.append('session', o.session);
  if (o.replace) fd.append('replace', '1');
  fd.append('photo', o.blob, o.angle + '.jpg');
  if (o.reference) fd.append('reference', o.reference, 'reference.jpg');
  let r;
  try {
    r = await withTimeout(fetch(API + 'upload.php', {
      method: 'POST',
      headers: {
        'X-PhotoFlow-Session': getToken()
      },
      body: fd
    }), 120000);
  } catch (e) {
    throw new Error('No connection to the server. Check the wifi and try again.');
  }
  let j = null;
  try {
    j = await r.json();
  } catch (e) {}
  if (r.status === 401) {
    clearSession();
    throw new Error('Signed out. Please sign in again.');
  }
  if (r.status === 403) throw new Error(j && j.error || 'Your account doesn\'t have access to that outlet.');
  if (!r.ok || !j || !j.ok) throw new Error(j && j.error || 'Saving failed (HTTP ' + r.status + ').');
  return j;
}
const hhmmss = () => {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join('');
};

/* ======================= PHOTOS WAITING ON THE PHONE =======================

   A photo taken with TAKE PHOTO exists only inside this page — iOS does not put it in the
   camera roll. If the wifi drops and the app is closed, it is gone for good (it happened at an
   outlet on 25 Sep). So every photo is written to the phone's own storage the moment it is
   taken, and only deleted once the NAS has confirmed it. Whatever is still waiting is sent
   again automatically: when the app opens, when the phone comes back online, and every minute
   while the app is open. */

const DB_NAME = 'photoflow',
  DB_STORE = 'photos';
let dbPromise = null;
function db() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(function (resolve, reject) {
    if (!window.indexedDB) {
      reject(new Error('This browser cannot keep photos on the phone.'));
      return;
    }
    const rq = indexedDB.open(DB_NAME, 1);
    rq.onupgradeneeded = function () {
      const d = rq.result;
      if (!d.objectStoreNames.contains(DB_STORE)) d.createObjectStore(DB_STORE, {
        keyPath: 'key'
      });
    };
    rq.onsuccess = function () {
      resolve(rq.result);
    };
    rq.onerror = function () {
      reject(rq.error || new Error('Cannot open phone storage.'));
    };
  });
  return dbPromise;
}
function dbRun(mode, fn) {
  return db().then(function (d) {
    return new Promise(function (resolve, reject) {
      const tx = d.transaction(DB_STORE, mode);
      const store = tx.objectStore(DB_STORE);
      let out;
      try {
        out = fn(store);
      } catch (e) {
        reject(e);
        return;
      }
      tx.oncomplete = function () {
        resolve(out && out.result !== undefined ? out.result : out);
      };
      tx.onerror = tx.onabort = function () {
        reject(tx.error || new Error('Phone storage is full.'));
      };
    });
  });
}
const queuePut = rec => dbRun('readwrite', st => st.put(rec));
const queueDelete = key => dbRun('readwrite', st => st.delete(key));
const queueAll = () => dbRun('readonly', st => st.getAll()).then(r => r || []);

/* One entry per photo. sessionId keeps a customer's BEFORE and AFTER apart. */
function queueKey(sessionId, itemKey) {
  return sessionId + '|' + itemKey;
}
function queueRecord(sessionId, itemKey, meta, photo, state) {
  return {
    key: queueKey(sessionId, itemKey),
    sessionId: sessionId,
    item: itemKey,
    state: state || 'draft',
    customerId: meta.customerId,
    customerName: meta.customerName,
    customerSeed: meta.customerSeed,
    phase: meta.phase,
    session: meta.session,
    angle: meta.angle,
    group: meta.group,
    seq: meta.seq,
    label: meta.label,
    blob: photo.blob,
    thumb: photo.thumb || null,
    isReference: !!meta.isReference,
    at: Date.now()
  };
}

/* Group what's waiting, newest first: one line per customer and phase. */
function queueSessions(rows) {
  const by = {};
  rows.forEach(function (r) {
    const g = by[r.sessionId] || (by[r.sessionId] = {
      sessionId: r.sessionId,
      customerId: r.customerId,
      customerName: r.customerName,
      phase: r.phase,
      session: r.session,
      state: 'ready',
      count: 0,
      at: 0
    });
    g.count++;
    g.at = Math.max(g.at, r.at || 0);
    if (r.state !== 'ready') g.state = 'draft'; /* a session the therapist never pressed SAVE on */
  });
  return Object.keys(by).map(k => by[k]).sort((a, b) => b.at - a.at);
}

/* Send everything that is waiting. One at a time, oldest first; each photo is deleted from the
   phone the moment the NAS has it, so a retry never sends the same photo twice. */
let sending = false;
async function sendQueued(onProgress) {
  if (sending) return {
    skipped: true
  };
  sending = true;
  let done = 0,
    failed = 0,
    lastError = null,
    folder = null;
  try {
    const rows = (await queueAll()).filter(r => r.state === 'ready').sort((a, b) => a.at - b.at);
    for (const r of rows) {
      try {
        const res = await uploadPhoto({
          customerId: r.customerId,
          customerName: r.customerName,
          phase: r.phase,
          angle: r.angle,
          group: r.group,
          seq: r.seq,
          label: r.label,
          session: r.session,
          blob: r.blob,
          reference: r.isReference ? r.thumb : null
        });
        if (res && res.customerFolder) folder = res.customerFolder;
        await queueDelete(r.key);
        done++;
      } catch (e) {
        failed++;
        lastError = e.message;
        break; /* wifi is down or the server is unhappy: stop, keep the rest */
      }
      if (onProgress) onProgress(done, rows.length);
    }
  } catch (e) {
    lastError = e.message;
  }
  sending = false;
  return {
    done: done,
    failed: failed,
    error: lastError,
    folder: folder
  };
}

/* ============================== CAMERA CAPTURE ============================== */

/* The angle the therapist has to reproduce, drawn rather than previewed. The real framing
   happens in LiveCamera below, which draws this same guide over the live picture. */
/* The grid the iPhone's own camera shows (Settings → Camera → Grid). Drawing the same lines
   here means the guide and the camera viewfinder line up, which is how the therapists aim. */
function GridLines({
  opacity = 0.22,
  colour = '#FFFFFF'
}) {
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 100",
    className: "rfill",
    preserveAspectRatio: "none",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("g", {
    stroke: colour,
    strokeOpacity: opacity,
    strokeWidth: "0.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M33.33 0 V100 M66.67 0 V100 M0 33.33 H100 M0 66.67 H100"
  })));
}
function AngleGuide({
  angle,
  grid = true
}) {
  const off = angle.off,
    cx = 50 + off * 11,
    sq = 1 - Math.abs(off) * 0.3;
  const eye = 6.5 * sq,
    fx = off * 2;
  const hideL = off >= 0.62,
    hideR = off <= -0.62;
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 100",
    className: "rfill",
    preserveAspectRatio: "xMidYMid meet"
  }, grid && /*#__PURE__*/React.createElement("g", {
    stroke: "#FFFFFF",
    strokeOpacity: ".22",
    strokeWidth: "0.5"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M33.33 0 V100 M66.67 0 V100 M0 33.33 H100 M0 66.67 H100"
  })), /*#__PURE__*/React.createElement("ellipse", {
    cx: cx,
    cy: "46",
    rx: 25 * sq,
    ry: "33",
    fill: "none",
    stroke: "#FFC02E",
    strokeWidth: "1",
    strokeDasharray: "3 2.6",
    opacity: ".9"
  }), /*#__PURE__*/React.createElement("ellipse", {
    className: "pulse-ring",
    cx: cx,
    cy: "46",
    rx: 25 * sq,
    ry: "33",
    fill: "none",
    stroke: "#FFC02E",
    strokeWidth: ".6",
    style: {
      transformOrigin: `${cx}px 46px`
    }
  }), /*#__PURE__*/React.createElement("g", {
    stroke: "#FFFFFF",
    strokeOpacity: ".5",
    fill: "none",
    strokeWidth: "1.3",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: cx,
    cy: "46",
    rx: 17 * sq,
    ry: "22"
  }), /*#__PURE__*/React.createElement("path", {
    d: `M${cx - 17.5 * sq} 39 q${17.5 * sq} -14 ${35 * sq} 0`,
    strokeWidth: "2.6"
  }), !hideL && /*#__PURE__*/React.createElement("circle", {
    cx: cx - eye + fx,
    cy: "46",
    r: "1.4",
    fill: "#FFFFFF",
    fillOpacity: ".5",
    stroke: "none"
  }), !hideR && /*#__PURE__*/React.createElement("circle", {
    cx: cx + eye + fx,
    cy: "46",
    r: "1.4",
    fill: "#FFFFFF",
    fillOpacity: ".5",
    stroke: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: `M${cx + fx + off * 4} 50 q${1.5 + off * 3} 4 ${-1.5} 4.5`
  }), /*#__PURE__*/React.createElement("path", {
    d: `M${cx - 3.5 * sq + fx} 60 q${3.5 * sq} 2.6 ${7 * sq} 0`
  }), /*#__PURE__*/React.createElement("path", {
    d: `M${cx} 68 v6 M${cx - 11} 80 q11 -7 22 0`,
    strokeOpacity: ".28"
  })), off !== 0 && /*#__PURE__*/React.createElement("g", {
    stroke: "#FFC02E",
    fill: "none",
    strokeWidth: "1.4",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    opacity: ".9"
  }, /*#__PURE__*/React.createElement("path", {
    d: off < 0 ? 'M38 14 q-10 3 -13 10' : 'M62 14 q10 3 13 10'
  }), /*#__PURE__*/React.createElement("path", {
    d: off < 0 ? 'M25 24 l1 -6 M25 24 l6 -1' : 'M75 24 l-1 -6 M75 24 l-6 -1'
  })));
}

/* ============================ LIVE CAMERA (GRID) ============================ */

/* The iOS camera sheet that <input capture> opens never shows the 3×3 grid, whatever
   Settings → Camera → Grid says: that setting only applies to the Camera app itself.
   So TAKE PHOTO opens our own viewfinder instead, with the grid (and the face guide)
   drawn over the live picture. Needs iOS 11+ in Safari, or iOS 13.4+ from the Home
   Screen icon; anywhere it can't run, TAKE PHOTO falls back to the iOS camera. */
function canLiveCamera() {
  return !!(window.isSecureContext !== false && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/* Ask for the biggest 4:3 picture the back camera will give. Safari picks the nearest
   mode it has; the Resolution check on the next screen shows what it actually was. */
const LIVE_CONSTRAINTS = {
  audio: false,
  video: {
    facingMode: {
      ideal: 'environment'
    },
    width: {
      ideal: 4032
    },
    height: {
      ideal: 3024
    }
  }
};
function LiveCamera({
  angle,
  guide,
  onShot,
  onClose,
  onNativeCamera
}) {
  const videoRef = useRef(null),
    streamRef = useRef(null);
  const [dims, setDims] = useState(null); /* the video's own size, once it is playing */
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [box, setBox] = useState({
    w: window.innerWidth,
    h: window.innerHeight
  });
  useEffect(() => {
    let alive = true;
    navigator.mediaDevices.getUserMedia(LIVE_CONSTRAINTS).then(function (s) {
      if (!alive) {
        s.getTracks().forEach(function (t) {
          t.stop();
        });
        return;
      }
      streamRef.current = s;
      const v = videoRef.current;
      v.srcObject = s;
      const p = v.play();
      if (p && p.catch) p.catch(function () {});
    }).catch(function (e) {
      if (!alive) return;
      setErr(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'Camera access was blocked. Allow it in Settings → Safari → Camera, or use the iPhone camera below.' : 'Couldn’t start the camera here. Use the iPhone camera below.');
    });
    const onResize = function () {
      setBox({
        w: window.innerWidth,
        h: window.innerHeight
      });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return function () {
      alive = false;
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (streamRef.current) streamRef.current.getTracks().forEach(function (t) {
        t.stop();
      });
      streamRef.current = null;
    };
  }, []);
  const onMeta = () => {
    const v = videoRef.current;
    if (v && v.videoWidth) setDims({
      w: v.videoWidth,
      h: v.videoHeight
    });
  };
  const shoot = () => {
    const v = videoRef.current;
    if (busy || !v || !v.videoWidth) return;
    setBusy(true);
    const w = v.videoWidth,
      h = v.videoHeight;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    try {
      cv.getContext('2d').drawImage(v, 0, 0, w, h);
    } catch (e) {
      setBusy(false);
      setErr('Couldn’t take that photo. Try again.');
      return;
    }
    if (streamRef.current) streamRef.current.getTracks().forEach(function (t) {
      t.stop();
    });
    streamRef.current = null;
    onShot(cv, w, h);
  };

  /* Fit the whole camera frame on screen (no cropping), so the grid lines sit exactly on
     the thirds of the photo that gets saved. */
  const barH = 132;
  const availW = box.w,
    availH = Math.max(200, box.h - barH);
  let fw = availW,
    fh = availH;
  if (dims) {
    const ar = dims.w / dims.h;
    if (availW / availH > ar) {
      fh = availH;
      fw = Math.round(availH * ar);
    } else {
      fw = availW;
      fh = Math.round(availW / ar);
    }
  }
  const ui = /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '1 1 auto',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 'env(safe-area-inset-top)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: fw,
      height: fh,
      overflow: 'hidden',
      background: '#111'
    }
  }, /*#__PURE__*/React.createElement("video", {
    ref: videoRef,
    playsInline: true,
    muted: true,
    autoPlay: true,
    onLoadedMetadata: onMeta,
    onResize: onMeta,
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: 'fill'
    }
  }), dims && /*#__PURE__*/React.createElement(GridLines, {
    opacity: 0.55
  }), dims && guide && /*#__PURE__*/React.createElement("div", {
    className: "rfill",
    style: {
      opacity: .8
    }
  }, /*#__PURE__*/React.createElement(AngleGuide, {
    angle: angle,
    grid: false
  })), angle && dims && /*#__PURE__*/React.createElement("span", {
    className: "mono track",
    style: {
      position: 'absolute',
      top: 10,
      left: 10,
      fontSize: 10,
      fontWeight: 700,
      background: '#FFC02E',
      color: '#16130F',
      padding: '4px 8px',
      borderRadius: 6
    }
  }, guide ? angle.n + ' / 5 · ' : '', angle.full), dims && angle && angle.hint && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: '28px 12px 12px',
      textAlign: 'center',
      background: 'linear-gradient(to top, rgba(0,0,0,.6), rgba(0,0,0,0))'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#fff',
      fontSize: 13,
      fontWeight: 700
    }
  }, angle.hint)), !dims && !err && /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      position: 'absolute',
      top: '50%',
      left: 0,
      right: 0,
      textAlign: 'center',
      color: 'rgba(255,255,255,.6)',
      fontSize: 11,
      letterSpacing: '.12em'
    }
  }, "STARTING CAMERA\u2026"), err && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '50%',
      left: 16,
      right: 16,
      transform: 'translateY(-50%)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 1.45,
      margin: 0
    }
  }, err)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 'none',
      width: '100%',
      height: barH,
      boxSizing: 'border-box',
      padding: '0 22px env(safe-area-inset-bottom)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "tap",
    style: {
      color: '#fff',
      fontSize: 15,
      fontWeight: 700,
      background: 'none',
      border: 0,
      width: 84,
      textAlign: 'left'
    }
  }, "Cancel"), err ? /*#__PURE__*/React.createElement("button", {
    onClick: onNativeCamera,
    className: "tap",
    style: {
      background: '#FFC02E',
      color: '#16130F',
      fontSize: 14,
      fontWeight: 800,
      border: 0,
      borderRadius: 14,
      padding: '14px 16px'
    }
  }, "USE IPHONE CAMERA") : /*#__PURE__*/React.createElement("button", {
    onClick: shoot,
    disabled: !dims || busy,
    "aria-label": "Take photo",
    className: "tap",
    style: {
      width: 74,
      height: 74,
      borderRadius: '50%',
      background: '#fff',
      border: '5px solid rgba(255,255,255,.35)',
      backgroundClip: 'padding-box',
      opacity: !dims || busy ? .4 : 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: onNativeCamera,
    className: "tap",
    style: {
      color: 'rgba(255,255,255,.7)',
      fontSize: 11.5,
      fontWeight: 700,
      background: 'none',
      border: 0,
      width: 84,
      textAlign: 'right',
      lineHeight: 1.25,
      visibility: err ? 'hidden' : 'visible'
    }
  }, "iPhone camera", /*#__PURE__*/React.createElement("br", null), "(no grid)")));
  return ReactDOM.createPortal(ui, document.body);
}
function CameraCapture({
  angle,
  customer,
  onCapture,
  onMany,
  remaining,
  allowSample
}) {
  const camRef = useRef(null),
    libRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(null);
  const [err, setErr] = useState(null);
  const [live, setLive] = useState(false);
  const onCam = e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    setErr(null);
    processFile(f, angle).then(p => {
      setBusy(false);
      onCapture(p);
    }).catch(x => {
      setBusy(false);
      setErr(x.message);
    });
  };
  const takePhoto = () => {
    setErr(null);
    if (canLiveCamera()) setLive(true);else camRef.current.click();
  };
  const nativeCamera = () => {
    setLive(false);
    camRef.current.click();
  };
  const onShot = (cv, w, h) => {
    setLive(false);
    setBusy(true);
    setErr(null);
    finishFromCanvas(cv, w, h, angle).then(p => {
      setBusy(false);
      onCapture(p);
    }).catch(x => {
      setBusy(false);
      setErr(x.message);
    });
  };

  /* Take all five in the Camera app, then bring them in at once. iOS hands the files
     back in the order they were selected, and every one is relabelled by the slot it
     lands in — so a wrong order is visible and fixable on the next screen. */
  const onLibrary = e => {
    const files = Array.prototype.slice.call(e.target.files || []).slice(0, remaining);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    setErr(null);
    setProg('0 / ' + files.length);
    /* One at a time: five 8 MP decodes at once would blow through iOS 12's canvas memory cap. */
    const out = [];
    files.reduce((chain, f) => chain.then(() => processFile(f, angle).then(p => {
      out.push(p);
      setProg(out.length + ' / ' + files.length);
    })), Promise.resolve()).then(() => {
      setBusy(false);
      setProg(null);
      onMany(out);
    }).catch(x => {
      setBusy(false);
      setProg(null);
      setErr(x.message);
    });
  };
  const sample = () => onCapture({
    src: null,
    seed: customer.seed,
    off: angle.off,
    label: angle.full,
    time: clock(),
    checks: null,
    sample: true
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative rounded-3xl overflow-hidden bg-ink ratio ratio-4x3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfill",
    style: {
      background: 'radial-gradient(120% 90% at 50% 20%, #3A332B 0%, #16130F 75%)'
    }
  }, /*#__PURE__*/React.createElement(GridLines, null), /*#__PURE__*/React.createElement(AngleGuide, {
    angle: angle,
    grid: false
  })), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-3 left-3 right-3 flex items-start justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono track text-[9.5px] font-bold bg-brand text-ink px-2 py-1 rounded-md"
  }, angle.n, " / 5 \xB7 ", angle.full), /*#__PURE__*/React.createElement("span", {
    className: "mono track text-[9px] font-bold bg-black/45 text-white/85 px-2 py-1 rounded-md"
  }, "3\xD73 GRID")), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-0 inset-x-0 pt-8 pb-3 px-3 bg-gradient-to-t from-black/70 to-transparent"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-white text-[12.5px] font-bold text-center"
  }, angle.hint), /*#__PURE__*/React.createElement("p", {
    className: "mono text-center text-[9.5px] text-white/55 mt-1"
  }, "TAKE PHOTO OPENS THE CAMERA WITH GRID"))), err && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-warnSoft border border-warn/30 px-3 py-2.5 text-[12.5px] font-bold text-warn"
  }, err), /*#__PURE__*/React.createElement("input", {
    ref: camRef,
    type: "file",
    accept: "image/*",
    capture: "camera",
    onChange: onCam,
    className: "hidden"
  }), /*#__PURE__*/React.createElement("input", {
    ref: libRef,
    type: "file",
    accept: "image/*",
    multiple: true,
    onChange: onLibrary,
    className: "hidden"
  }), live && /*#__PURE__*/React.createElement(LiveCamera, {
    angle: angle,
    guide: true,
    onShot: onShot,
    onClose: () => setLive(false),
    onNativeCamera: nativeCamera
  }), /*#__PURE__*/React.createElement(Btn, {
    onClick: takePhoto,
    disabled: busy
  }, /*#__PURE__*/React.createElement(Icon.cam, null), /*#__PURE__*/React.createElement("span", null, busy ? prog ? 'IMPORTING ' + prog : 'WORKING…' : 'TAKE PHOTO')), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: () => libRef.current.click(),
    disabled: busy,
    className: "!h-12"
  }, /*#__PURE__*/React.createElement("span", null, "IMPORT FROM PHOTOS \xB7 UP TO ", remaining)), remaining === 5 && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-muted text-center leading-snug px-2"
  }, "Shot all five in the Camera app already? Import them in one go."), allowSample && /*#__PURE__*/React.createElement("button", {
    onClick: sample,
    className: "tap w-full h-10 text-[12.5px] font-bold text-muted"
  }, "Sample photo (demo)"));
}

/* ============================ PHOTO QUALITY CHECK ============================ */

function QualityCheck({
  photo,
  onRetake,
  onAccept
}) {
  const checks = photo.checks;
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!checks || step >= checks.length) return;
    const t = setTimeout(() => setStep(s => s + 1), step === 0 ? 200 : 170);
    return () => clearTimeout(t);
  }, [step, checks]);
  const done = !checks || step >= checks.length;
  const failed = checks ? checks.filter(c => !c.ok) : [];
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mx-auto",
    style: {
      width: '100%',
      maxWidth: '33vh'
    }
  }, /*#__PURE__*/React.createElement(PhotoPreview, {
    photo: photo,
    className: "ratio ratio-1x1",
    radius: 24,
    full: true
  })), /*#__PURE__*/React.createElement("div", {
    className: `rounded-2xl border p-3 ${done && failed.length ? 'bg-warnSoft border-warn/30' : 'bg-paper border-line'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: done && failed.length ? 'text-warn' : 'text-brandDeep'
  }, /*#__PURE__*/React.createElement(Icon.spark, null)), /*#__PURE__*/React.createElement(Label, {
    className: done && failed.length ? '!text-warn' : ''
  }, "Photo check"), /*#__PURE__*/React.createElement("span", {
    className: "ml-auto text-[10px] text-muted"
  }, "you confirm framing")), !checks ? /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-muted"
  }, "Sample photo \u2014 not checked.") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, checks.map((c, i) => {
    const shown = step > i;
    return /*#__PURE__*/React.createElement("div", {
      key: c.label,
      className: `flex items-center gap-2 transition-opacity duration-200 ${shown ? 'opacity-100' : 'opacity-25'}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `w-4 h-4 rounded-full grid place-items-center flex-none ${!shown ? 'bg-line' : c.ok ? 'bg-good text-white' : 'bg-warn text-white'}`
    }, shown && (c.ok ? /*#__PURE__*/React.createElement(Icon.check, {
      s: 11
    }) : /*#__PURE__*/React.createElement(Icon.warn, {
      s: 11
    }))), /*#__PURE__*/React.createElement("span", {
      className: `text-[12.5px] font-bold ${!shown ? 'text-muted' : c.ok ? 'text-ink2' : 'text-warn'}`
    }, c.ok ? c.label : c.bad), /*#__PURE__*/React.createElement("span", {
      className: "mono ml-auto text-[10px] text-muted"
    }, c.detail));
  })), done && failed.length > 0 && /*#__PURE__*/React.createElement("p", {
    className: "pop mt-3 text-[13px] font-bold text-warn leading-snug"
  }, failed.length === 1 ? failed[0].bad + '. Please retake.' : 'Photo may be unclear. Please retake.')), done ? failed.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: onAccept,
    className: "!w-[38%] !h-16 !text-[13px] leading-tight"
  }, "USE ANYWAY"), /*#__PURE__*/React.createElement(Btn, {
    onClick: onRetake,
    className: "!w-[62%]"
  }, "RETAKE")) : /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: onRetake,
    className: "!w-[38%] !h-16"
  }, "RETAKE"), /*#__PURE__*/React.createElement(Btn, {
    onClick: onAccept,
    className: "!w-[62%]"
  }, /*#__PURE__*/React.createElement("span", null, "NEXT"), /*#__PURE__*/React.createElement(Icon.chev, {
    s: 19
  }))) : /*#__PURE__*/React.createElement("div", {
    className: "h-16 rounded-2xl bg-paper border-2 border-line grid place-items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono track text-[11px] font-bold text-muted"
  }, "CHECKING PHOTO\u2026")));
}

/* ==================== EXTRA PHOTOS — HANDS, LEGS, BACKS ==================== */

/* The label is the therapist's own words, in any language, and it may be left empty.
   Whatever the clinic has typed before comes back as one-tap buttons. */
function LabelPicker({
  suggestions,
  onDone,
  onCancel
}) {
  const [text, setText] = useState('');
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-4"
  }, /*#__PURE__*/React.createElement(Label, null, "What are these photos of?"), /*#__PURE__*/React.createElement("input", {
    autoFocus: true,
    value: text,
    onChange: e => setText(e.target.value),
    placeholder: "Hand, left knee, \u80CC\u90E8\u2026",
    autoCapitalize: "characters",
    autoCorrect: "off",
    className: "w-full h-14 mt-2 rounded-2xl bg-paper border-2 border-line focus:border-brand outline-none px-4 text-[16px] font-bold"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-[11.5px] text-muted mt-2 leading-snug"
  }, "It becomes part of the file name, so keep it short. You can leave it empty."), suggestions.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Label, {
    className: "mt-5 mb-2"
  }, "Used before"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, suggestions.map(sug => /*#__PURE__*/React.createElement("button", {
    key: sug,
    onClick: () => onDone(sug),
    className: "tap mono text-[12.5px] font-bold bg-paper border border-line rounded-full px-3.5 py-2.5 text-ink2"
  }, sug))))), /*#__PURE__*/React.createElement(Dock, null, /*#__PURE__*/React.createElement(Btn, {
    onClick: () => onDone(text)
  }, /*#__PURE__*/React.createElement("span", null, "NEXT"), /*#__PURE__*/React.createElement(Icon.chev, {
    s: 19
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: () => onDone(''),
    className: "!w-1/2"
  }, "NO LABEL"), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: onCancel,
    className: "!w-1/2"
  }, "CANCEL"))));
}

/* Any number of photos for one label. No angle guide: these are hands, legs and backs. */
function ExtraCapture({
  group,
  onCapture,
  onMany,
  onRemove,
  onDone,
  allowSample,
  customer
}) {
  const camRef = useRef(null),
    libRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(null);
  const [err, setErr] = useState(null);
  const area = {
    full: group.label || 'Extra photos',
    off: 0
  };
  const onCam = e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    setErr(null);
    processFile(f, area).then(p => {
      setBusy(false);
      onCapture(p);
    }).catch(x => {
      setBusy(false);
      setErr(x.message);
    });
  };
  const [live, setLive] = useState(false);
  const takePhoto = () => {
    setErr(null);
    if (canLiveCamera()) setLive(true);else camRef.current.click();
  };
  const nativeCamera = () => {
    setLive(false);
    camRef.current.click();
  };
  const onShot = (cv, w, h) => {
    setLive(false);
    setBusy(true);
    setErr(null);
    finishFromCanvas(cv, w, h, area).then(p => {
      setBusy(false);
      onCapture(p);
    }).catch(x => {
      setBusy(false);
      setErr(x.message);
    });
  };
  const onLibrary = e => {
    const files = Array.prototype.slice.call(e.target.files || []).slice(0, EXTRA_MAX - group.photos.length);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    setErr(null);
    setProg('0 / ' + files.length);
    const out = [];
    files.reduce((chain, f) => chain.then(() => processFile(f, area).then(p => {
      out.push(p);
      setProg(out.length + ' / ' + files.length);
    })), Promise.resolve()).then(() => {
      setBusy(false);
      setProg(null);
      onMany(out);
    }).catch(x => {
      setBusy(false);
      setProg(null);
      setErr(x.message);
    });
  };
  const full = group.photos.length >= EXTRA_MAX;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-3 pb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline justify-between mb-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement(Label, null, "Photos of"), /*#__PURE__*/React.createElement("div", {
    className: "text-[20px] font-extrabold leading-tight break-words"
  }, group.label || 'No label')), /*#__PURE__*/React.createElement("div", {
    className: "mono text-[15px] font-bold text-muted flex-none pl-2"
  }, group.photos.length)), group.was > 0 && group.photos.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-brandSoft border border-brand/35 px-3 py-2.5 mb-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-ink2 font-semibold leading-snug"
  }, group.was, " photo", group.was > 1 ? 's' : '', " of this were taken before the treatment. Take the same again.")), group.photos.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border-2 border-dashed border-line py-10 grid place-items-center text-muted"
  }, /*#__PURE__*/React.createElement(Icon.cam, {
    s: 26
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] font-bold mt-2"
  }, "No photos yet")) : /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-1.5"
  }, group.photos.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: p.seq,
    className: "relative"
  }, /*#__PURE__*/React.createElement(PhotoPreview, {
    photo: p,
    className: "ratio ratio-3x4",
    radius: 9,
    showStamp: false
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => onRemove(i),
    "aria-label": "Remove photo",
    className: "tap absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-ink text-white grid place-items-center text-[15px] font-bold"
  }, "\xD7")))), err && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 rounded-xl bg-warnSoft border border-warn/30 px-3 py-2.5 text-[12.5px] font-bold text-warn"
  }, err), full && /*#__PURE__*/React.createElement("p", {
    className: "text-[11.5px] text-warn font-bold mt-3 text-center"
  }, "That's ", EXTRA_MAX, " photos \u2014 the most for one label."), /*#__PURE__*/React.createElement("input", {
    ref: camRef,
    type: "file",
    accept: "image/*",
    capture: "camera",
    onChange: onCam,
    className: "hidden"
  }), /*#__PURE__*/React.createElement("input", {
    ref: libRef,
    type: "file",
    accept: "image/*",
    multiple: true,
    onChange: onLibrary,
    className: "hidden"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-2"
  }, live && /*#__PURE__*/React.createElement(LiveCamera, {
    angle: area,
    guide: false,
    onShot: onShot,
    onClose: () => setLive(false),
    onNativeCamera: nativeCamera
  }), /*#__PURE__*/React.createElement(Btn, {
    onClick: takePhoto,
    disabled: busy || full
  }, /*#__PURE__*/React.createElement(Icon.cam, null), /*#__PURE__*/React.createElement("span", null, busy ? prog ? 'IMPORTING ' + prog : 'WORKING…' : 'TAKE PHOTO')), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: () => libRef.current.click(),
    disabled: busy || full
  }, /*#__PURE__*/React.createElement("span", null, "IMPORT FROM PHOTOS")), allowSample && /*#__PURE__*/React.createElement("button", {
    onClick: () => onCapture({
      src: null,
      seed: customer.seed,
      off: 0,
      label: group.label || 'Extra',
      time: clock(),
      checks: null,
      sample: true
    }),
    className: "tap w-full h-10 text-[12.5px] font-bold text-muted"
  }, "Sample photo (demo)"))), /*#__PURE__*/React.createElement(Dock, null, /*#__PURE__*/React.createElement(Btn, {
    variant: group.photos.length ? 'primary' : 'ghost',
    onClick: onDone
  }, group.photos.length ? 'DONE' : 'CANCEL')));
}

/* ============================== UPLOAD SUCCESS ============================== */

function UploadSuccess({
  customer,
  phase,
  final,
  demo,
  folder,
  count,
  total,
  today,
  onNext,
  onHome
}) {
  /* Prefer the server's count: BEFORE may have been taken hours earlier, on another phone. */
  const beforeN = today ? today.before + today.beforeExtra : phase === 'before' ? count : total - count;
  const afterN = today ? today.after + today.afterExtra : phase === 'after' ? count : 0;
  const allN = today ? beforeN + afterN : total;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pop flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-[74px] h-[74px] rounded-full bg-good text-white grid place-items-center shadow-[0_10px_28px_-8px_rgba(14,159,110,.7)]"
  }, /*#__PURE__*/React.createElement(Icon.check, {
    s: 38
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 text-[26px] font-extrabold tracking-tight"
  }, demo ? 'DEMO COMPLETE' : final ? 'ALL PHOTOS SAVED' : 'SAVED'), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 text-[13.5px] text-muted"
  }, demo ? 'Nothing was uploaded' : final ? `${allN} photos recorded today` : `${count} ${phase.toUpperCase()} photo${count === 1 ? '' : 's'} uploaded`)), demo && /*#__PURE__*/React.createElement("div", {
    className: "fade-up mt-5 rounded-2xl bg-warnSoft border border-warn/30 p-3.5 flex gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-warn flex-none mt-[1px]"
  }, /*#__PURE__*/React.createElement(Icon.warn, {
    s: 17
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-warn font-bold leading-snug"
  }, "Demo mode \u2014 these photos were not saved anywhere. Open Photo Flow from the clinic server to save to the NAS.")), /*#__PURE__*/React.createElement("div", {
    className: "fade-up mt-5 bg-paper rounded-2xl border border-line p-3 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement(CustomerReferencePhoto, {
    c: customer,
    className: "w-12 h-12 flex-none",
    radius: 12,
    compact: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement(Label, null, "Customer"), /*#__PURE__*/React.createElement("div", {
    className: "text-[16px] font-extrabold truncate"
  }, customer.name)), /*#__PURE__*/React.createElement("div", {
    className: "ml-auto"
  }, /*#__PURE__*/React.createElement(IdChip, {
    id: customer.id
  }))), /*#__PURE__*/React.createElement("div", {
    className: "fade-up mt-3 rounded-2xl bg-ink text-white p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-brand"
  }, /*#__PURE__*/React.createElement(Icon.folder, {
    s: 16
  })), /*#__PURE__*/React.createElement(Label, {
    className: "!text-white/55"
  }, "Destination")), final ? /*#__PURE__*/React.createElement("pre", {
    className: "mono text-[12px] leading-[1.75] mt-2.5 text-white/85 overflow-x-auto"
  }, `New 5 Angle Photo
└── `, /*#__PURE__*/React.createElement("span", {
    className: "text-brand font-semibold"
  }, folder || customer.folder || folderLabel(customer)), `
    └── ${isoToday()}
        ├── BEFORE   `, /*#__PURE__*/React.createElement("span", {
    className: "text-good"
  }, beforeN, " photos"), `
        └── AFTER    `, /*#__PURE__*/React.createElement("span", {
    className: "text-good"
  }, afterN, " photos")) : /*#__PURE__*/React.createElement("pre", {
    className: "mono text-[12px] leading-[1.75] mt-2.5 text-white/85 overflow-x-auto"
  }, `New 5 Angle Photo
└── `, /*#__PURE__*/React.createElement("span", {
    className: "text-brand font-semibold"
  }, folder || customer.folder || folderLabel(customer)), `
    └── ${isoToday()}
        └── `, /*#__PURE__*/React.createElement("span", {
    className: "text-brand font-semibold"
  }, phase.toUpperCase()), `   `, /*#__PURE__*/React.createElement("span", {
    className: "text-good"
  }, count, " photos")), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-white/10 flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-good mt-[1px] flex-none"
  }, /*#__PURE__*/React.createElement(Icon.check, {
    s: 14
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[11.5px] text-white/65 leading-snug"
  }, "Folder chosen by the system. The therapist never searched Synology.")))), /*#__PURE__*/React.createElement(Dock, null, final ? /*#__PURE__*/React.createElement(Btn, {
    variant: "dark",
    onClick: onNext
  }, /*#__PURE__*/React.createElement(Icon.check, null), /*#__PURE__*/React.createElement("span", null, "DONE")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Btn, {
    onClick: onNext
  }, /*#__PURE__*/React.createElement("span", null, "START AFTER PHOTOS NOW"), /*#__PURE__*/React.createElement(Icon.chev, {
    s: 19
  })), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: onHome
  }, /*#__PURE__*/React.createElement(Icon.check, {
    s: 17
  }), /*#__PURE__*/React.createElement("span", null, "DONE FOR NOW \u2014 MAIN PAGE")))));
}

/* ======================== PHOTOS WAITING TO BE SENT ======================== */

function Pending({
  pending,
  onBack,
  onSend,
  onDrop,
  sending,
  live
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    title: "Photos waiting",
    sub: pending.length ? pending.length + ' session' + (pending.length > 1 ? 's' : '') : '',
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-3 pb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-goodSoft px-3 py-2.5 mb-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-good font-bold leading-snug"
  }, "These photos are saved on this phone. They are sent automatically when the wifi is back \u2014 nothing is lost if you close the app.")), pending.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-[13px] text-muted text-center pt-8"
  }, "Nothing is waiting. Every photo has reached the NAS.") : pending.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.sessionId,
    className: "bg-paper rounded-2xl border border-line p-3 mb-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-extrabold truncate"
  }, g.customerName || g.customerId), /*#__PURE__*/React.createElement("span", {
    className: `mono track text-[9px] font-bold px-2 py-[3px] rounded-md ${g.phase === 'before' ? 'bg-brandSoft text-brandDeep' : 'bg-goodSoft text-good'}`
  }, g.phase.toUpperCase())), /*#__PURE__*/React.createElement("div", {
    className: "mono text-[11px] text-muted mt-1"
  }, g.customerId, " \xB7 ", g.count, " photo", g.count > 1 ? 's' : '', g.state === 'draft' ? ' · never saved' : ''), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mt-2.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onSend(g),
    disabled: sending || !live,
    className: "tap flex-1 h-10 rounded-xl bg-brand text-ink text-[12.5px] font-extrabold"
  }, sending ? 'SENDING…' : 'SEND NOW'), /*#__PURE__*/React.createElement("button", {
    onClick: () => onDrop(g),
    disabled: sending,
    className: "tap h-10 px-3 rounded-xl bg-paper border border-line text-[12.5px] font-bold text-muted"
  }, "Delete")))), !live && pending.length > 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-warn font-bold text-center mt-2"
  }, "Waiting for the server \u2014 they will go automatically.")));
}

/* ================================= HOME ================================= */

function BigAction({
  icon,
  title,
  sub,
  onClick,
  tone = 'brand'
}) {
  const t = tone === 'brand' ? 'bg-brand text-ink shadow-[0_6px_0_0_#D69A00] active:shadow-[0_2px_0_0_#D69A00] active:translate-y-[4px]' : 'bg-paper text-ink border-2 border-line';
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    className: `tap w-full rounded-2xl px-4 py-3 flex items-center gap-3 text-left ${t}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-10 h-10 rounded-xl grid place-items-center flex-none ${tone === 'brand' ? 'bg-ink/10' : 'bg-cream text-brandDeep'}`
  }, icon), /*#__PURE__*/React.createElement("span", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block text-[16px] font-extrabold leading-tight"
  }, title), /*#__PURE__*/React.createElement("span", {
    className: `block text-[12px] mt-0.5 ${tone === 'brand' ? 'text-ink/60' : 'text-muted'}`
  }, sub)), /*#__PURE__*/React.createElement("span", {
    className: tone === 'brand' ? 'text-ink/40' : 'text-muted'
  }, /*#__PURE__*/React.createElement(Icon.chev, null)));
}
function ConnectionStatus({
  backend,
  onFix,
  onRetry
}) {
  const m = backend.mode;
  if (m === 'live') return /*#__PURE__*/React.createElement("div", {
    className: "conn is-live"
  }, /*#__PURE__*/React.createElement("i", null), "Connected \u2014 photos save to the NAS");
  if (m === 'needs-login') return /*#__PURE__*/React.createElement("button", {
    className: "conn is-warn tap",
    onClick: onFix
  }, /*#__PURE__*/React.createElement("i", null), "Sign in to save photos");
  if (m === 'offline') return /*#__PURE__*/React.createElement("button", {
    className: "conn is-warn tap",
    onClick: onRetry
  }, /*#__PURE__*/React.createElement("i", null), "No connection to the server \u2014 tap to retry");
  if (m === 'unconfigured') return /*#__PURE__*/React.createElement("div", {
    className: "conn is-warn"
  }, /*#__PURE__*/React.createElement("i", null), "Server not set up yet", PILOT ? '' : ' — demo mode');
  if (m === 'checking') return /*#__PURE__*/React.createElement("div", {
    className: "conn"
  }, /*#__PURE__*/React.createElement("i", null), "Checking connection\u2026");
  return /*#__PURE__*/React.createElement("div", {
    className: "conn"
  }, /*#__PURE__*/React.createElement("i", null), "Demo mode \u2014 photos are not saved");
}

/* Today's list: the sample customers in demo mode, otherwise whatever the server says — already
   scoped to the signed-in account's own outlets, so nothing more to filter here. */
function todaysOf(backend, today) {
  if (backend.mode === 'demo') return CUSTOMERS.filter(c => c.today);
  return today.list || [];
}
function Home({
  go,
  records,
  backend,
  today,
  user,
  onSignOut,
  onRetry,
  waiting
}) {
  const todays = todaysOf(backend, today);
  const complete = todays.filter(c => statusOf(recOf(c, records)) === 'Complete').length;
  const pending = todays.length - complete;
  const live = backend.mode === 'live';
  const todaySub = backend.mode === 'needs-login' ? 'Sign in first' : backend.mode === 'offline' ? 'No connection' : backend.mode === 'unconfigured' ? 'Server not set up yet' : !live ? `${todays.length} booked today` : today.loading && !today.list ? 'Loading…' : backend.pos ? `${todays.length} today` : `${todays.length} photographed today`;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono track text-[10px] font-bold text-brandDeep"
  }, "UR KLINIK"), /*#__PURE__*/React.createElement("div", {
    className: "mono track text-[9px] font-semibold text-muted border border-line rounded-full px-2 py-1"
  }, PILOT ? 'PILOT' : 'MVP PROTOTYPE')), /*#__PURE__*/React.createElement("h1", {
    className: "text-[26px] font-extrabold leading-[1.05] tracking-[-.02em] mt-1.5"
  }, "Photo Flow"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-muted mt-1 font-semibold"
  }, "Simple \xB7 Fast \xB7 Correct"), /*#__PURE__*/React.createElement(ConnectionStatus, {
    backend: backend,
    onFix: () => go('login'),
    onRetry: onRetry
  }), waiting > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => go('pending'),
    className: "conn is-warn tap"
  }, /*#__PURE__*/React.createElement("i", null), waiting, " photo", waiting > 1 ? 's' : '', " saved on this phone, waiting to be sent"), live && user && /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 flex items-center justify-between text-[12px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-muted"
  }, "Signed in as ", /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-ink2"
  }, user.displayName), user.role === 'admin' ? ' · admin' : user.outlets && user.outlets.length ? ' · ' + user.outlets.join(', ') : ''), /*#__PURE__*/React.createElement("button", {
    onClick: onSignOut,
    className: "tap font-bold text-ink2 underline underline-offset-2"
  }, "Sign out")), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-2"
  }, /*#__PURE__*/React.createElement(BigAction, {
    icon: /*#__PURE__*/React.createElement(Icon.people, {
      s: 22
    }),
    title: "TODAY'S CUSTOMERS",
    sub: todaySub,
    onClick: () => go('today')
  }), /*#__PURE__*/React.createElement(BigAction, {
    tone: "quiet",
    icon: /*#__PURE__*/React.createElement(Icon.plus, {
      s: 22
    }),
    title: "NEW WALK-IN",
    sub: "Create a customer in 20 seconds",
    onClick: () => go('new')
  }), /*#__PURE__*/React.createElement(BigAction, {
    tone: "quiet",
    icon: /*#__PURE__*/React.createElement(Icon.search, {
      s: 20
    }),
    title: "SEARCH CUSTOMER",
    sub: backend.mode === 'demo' || backend.pos ? 'Name, phone or membership ID' : 'Name or membership ID',
    onClick: () => go('search')
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 bg-paper rounded-2xl border border-line p-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline justify-between"
  }, /*#__PURE__*/React.createElement(Label, null, "Today"), /*#__PURE__*/React.createElement("span", {
    className: "mono text-[10.5px] text-muted"
  }, prettyToday())), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex items-end gap-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mono text-[24px] font-bold leading-none"
  }, todays.length), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-muted mt-0.5"
  }, "customers")), /*#__PURE__*/React.createElement("div", {
    className: "w-px self-stretch bg-line"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mono text-[24px] font-bold leading-none text-good"
  }, complete), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-muted mt-0.5"
  }, "completed")), /*#__PURE__*/React.createElement("div", {
    className: "w-px self-stretch bg-line"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mono text-[24px] font-bold leading-none text-warn"
  }, pending), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-muted mt-0.5"
  }, "pending"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 h-2 rounded-full bg-cream overflow-hidden flex"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-good h-full transition-all duration-500",
    style: {
      width: `${todays.length ? complete / todays.length * 100 : 0}%`
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-brand h-full",
    style: {
      width: `${todays.length ? pending / todays.length * 100 : 0}%`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 flex gap-2 pb-3"
  }, live && user && user.role === 'admin' && /*#__PURE__*/React.createElement("button", {
    onClick: () => go('admin'),
    className: "tap flex-1 h-11 rounded-xl bg-paper border border-line text-[12.5px] font-bold text-ink2 flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon.warn, {
    s: 16
  }), /*#__PURE__*/React.createElement("span", null, "Admin")), /*#__PURE__*/React.createElement("button", {
    onClick: () => go('dashboard'),
    className: "tap flex-1 h-11 rounded-xl bg-paper border border-line text-[12.5px] font-bold text-ink2 flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon.chart, {
    s: 16
  }), /*#__PURE__*/React.createElement("span", null, "Dashboard")), !PILOT && /*#__PURE__*/React.createElement("button", {
    onClick: () => go('story'),
    className: "tap flex-1 h-11 rounded-xl bg-paper border border-line text-[12.5px] font-bold text-ink2 flex items-center justify-center gap-2"
  }, "Why this changes"))));
}

/* ============================ TODAY'S CUSTOMERS ============================ */

/* Shown instead of sample data when this phone is on the real server but can't use it yet. */
function NotReady({
  backend,
  onFix
}) {
  if (backend.mode === 'checking') return /*#__PURE__*/React.createElement("p", {
    className: "mono text-[11px] text-muted text-center pt-8"
  }, "Checking connection\u2026");
  return /*#__PURE__*/React.createElement("div", {
    className: "pt-6 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[15px] font-bold"
  }, backend.mode === 'needs-login' ? 'Sign in first' : backend.mode === 'offline' ? 'No connection to the server' : 'The server isn’t set up yet'), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-muted mt-1.5 px-6 leading-snug"
  }, backend.mode === 'needs-login' ? 'Sign in with your account to see real customers.' : backend.mode === 'offline' ? 'Check the wifi, then go back and try again.' : 'Ask IT to finish installing Photo Flow.'), backend.mode === 'needs-login' && onFix && /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: onFix
  }, "SIGN IN")));
}
const outletOfId = id => (id || '').trim().split(' ')[0].toUpperCase();
function OutletFilter({
  outlets,
  value,
  onPick
}) {
  if (!outlets || outlets.length < 2) return null;
  const chip = on => `tap mono text-[12px] font-semibold rounded-full px-3 py-2 border ${on ? 'bg-ink text-white border-ink' : 'bg-paper border-line text-ink2'}`;
  return /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement(Label, {
    className: "mb-2"
  }, "Filter by outlet"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onPick(''),
    className: chip(!value)
  }, "ALL"), outlets.map(o => /*#__PURE__*/React.createElement("button", {
    key: o,
    onClick: () => onPick(o),
    className: chip(value === o)
  }, o))));
}
function TodayList({
  records,
  onSelect,
  onBack,
  backend,
  today,
  onRetry,
  onFix
}) {
  const live = backend.mode === 'live',
    demo = backend.mode === 'demo';
  const [filter, setFilter] = useState('');
  const [find, setFind] = useState('');
  const allTodays = todaysOf(backend, today);
  const outlets = Array.from(new Set(allTodays.map(c => outletOfId(c.id)).filter(Boolean))).sort();
  const byOutlet = filter ? allTodays.filter(c => outletOfId(c.id) === filter) : allTodays;
  /* Find someone in today's list without scrolling it: name, membership ID or phone. */
  const needle = find.trim().toLowerCase().replace(/[ -]/g, '');
  const todays = !needle ? byOutlet : byOutlet.filter(c => (c.name || '').toLowerCase().includes(find.trim().toLowerCase()) || (c.id || '').toLowerCase().replace(/[ -]/g, '').includes(needle) || (c.phone || '').includes(needle));
  const up = todays.filter(c => statusOf(recOf(c, records)) !== 'Complete');
  const done = todays.filter(c => statusOf(recOf(c, records)) === 'Complete');
  const todayTitle = live && !backend.pos ? 'Photographed today' : "Today's customers";
  if (!demo && !live) return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    title: todayTitle,
    sub: prettyToday(),
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-3 pb-5"
  }, /*#__PURE__*/React.createElement(NotReady, {
    backend: backend,
    onFix: onFix
  })));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    title: todayTitle,
    sub: prettyToday(),
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-3 pb-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2 bg-brandSoft border border-brand/35 rounded-xl px-3 py-2 mb-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-brandDeep mt-[1px] flex-none"
  }, /*#__PURE__*/React.createElement(Icon.spark, null)), /*#__PURE__*/React.createElement("p", {
    className: "text-[11.5px] text-ink2 leading-snug font-semibold"
  }, "Match the reference photo to the person in front of you before you tap.")), live && !backend.pos && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-paper border border-line px-3 py-2.5 mb-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-muted leading-snug"
  }, "Bookings appear here once the POS is connected. Until then this lists everyone photographed today \u2014 find other customers with ", /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-ink2"
  }, "Search"), ".")), live && /*#__PURE__*/React.createElement(OutletFilter, {
    outlets: outlets,
    value: filter,
    onPick: setFilter
  }), byOutlet.length > 3 && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 bg-paper border border-line focus-within:border-brand rounded-xl px-3 h-10 mb-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-muted flex-none"
  }, /*#__PURE__*/React.createElement(Icon.search, {
    s: 16
  })), /*#__PURE__*/React.createElement("input", {
    value: find,
    onChange: e => setFind(e.target.value),
    placeholder: "Find in today's list",
    className: "flex-1 bg-transparent outline-none text-[14px] font-semibold placeholder:text-muted/60 placeholder:font-medium"
  }), find && /*#__PURE__*/React.createElement("button", {
    onClick: () => setFind(''),
    className: "text-muted text-[12.5px] font-bold px-1"
  }, "Clear")), needle && todays.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-[13px] text-muted text-center pt-4"
  }, "Nobody in today\u2019s list matches that."), live && today.error && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-warnSoft border border-warn/30 px-3 py-2.5 mb-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] font-bold text-warn leading-snug"
  }, today.error), /*#__PURE__*/React.createElement("button", {
    onClick: onRetry,
    className: "tap mt-1.5 text-[12.5px] font-extrabold text-ink2"
  }, "Try again")), live && today.loading && !today.list && /*#__PURE__*/React.createElement("p", {
    className: "mono text-[11px] text-muted text-center pt-6"
  }, "Loading\u2026"), live && today.list && todays.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-[13px] text-muted text-center pt-6"
  }, backend.pos ? 'No bookings today.' : 'Nobody photographed yet today.'), up.length > 0 && /*#__PURE__*/React.createElement(Label, {
    className: "mb-2"
  }, live && !backend.pos ? 'In progress' : 'Up next', " \xB7 ", up.length), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5"
  }, up.map(c => /*#__PURE__*/React.createElement(CustomerCard, {
    key: c.id,
    c: c,
    record: recOf(c, records),
    onSelect: onSelect
  }))), done.length > 0 && /*#__PURE__*/React.createElement(Label, {
    className: "mt-5 mb-2"
  }, "Completed today \xB7 ", done.length), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5"
  }, done.map(c => /*#__PURE__*/React.createElement(CustomerCard, {
    key: c.id,
    c: c,
    record: recOf(c, records),
    onSelect: onSelect
  })))));
}

/* ============================= CUSTOMER SEARCH ============================= */

function CustomerSearch({
  onSelect,
  onBack,
  records,
  backend,
  onFix
}) {
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const live = backend.mode === 'live',
    demo = backend.mode === 'demo';
  const [remote, setRemote] = useState({
    term: '',
    loading: false,
    list: [],
    error: null
  });
  const local = useMemo(() => {
    if (!demo || term.length < 2) return [];
    return CUSTOMERS.filter(c => c.name.toLowerCase().includes(term) || c.phone.includes(term) || c.id.replace(/[ -]/g, '').toLowerCase().includes(term.replace(/[ -]/g, '')));
  }, [term, demo]);

  /* Ask the server once typing pauses; ignore answers to anything but the latest term. */
  useEffect(() => {
    if (!live || term.length < 2) {
      setRemote({
        term: '',
        loading: false,
        list: [],
        error: null
      });
      return;
    }
    let alive = true;
    setRemote(r => ({
      term,
      loading: true,
      list: r.list,
      error: null
    }));
    const t = setTimeout(() => {
      apiGet('customers.php?view=search&q=' + encodeURIComponent(term)).then(j => {
        if (alive) setRemote({
          term,
          loading: false,
          list: j.customers.map(fromServer),
          error: j.posError || null
        });
      }).catch(e => {
        if (alive) setRemote({
          term,
          loading: false,
          list: [],
          error: e.message
        });
      });
    }, 450);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [term, live]);
  const results = live ? remote.list : local;
  const searching = live && (remote.loading || remote.term !== term);
  /* Phone numbers come from the POS customer table, so they are searchable only with the POS. */
  const placeholder = demo || backend.pos ? 'Name, phone or membership ID' : 'Name or membership ID';
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    title: "Search customer",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-none px-4 pt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5 bg-paper border-2 border-line focus-within:border-brand rounded-2xl px-3.5 h-14"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-muted flex-none"
  }, /*#__PURE__*/React.createElement(Icon.search, null)), /*#__PURE__*/React.createElement("input", {
    autoFocus: true,
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: placeholder,
    className: "flex-1 bg-transparent outline-none text-[16px] font-semibold placeholder:text-muted/60 placeholder:font-medium"
  }), q && /*#__PURE__*/React.createElement("button", {
    onClick: () => setQ(''),
    className: "text-muted text-[13px] font-bold px-1"
  }, "Clear"))), /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-3 pb-5"
  }, !demo && !live ? /*#__PURE__*/React.createElement(NotReady, {
    backend: backend,
    onFix: onFix
  }) : term.length < 2 ? /*#__PURE__*/React.createElement("div", {
    className: "pt-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[13px] text-muted leading-relaxed"
  }, "For when a customer says ", /*#__PURE__*/React.createElement("span", {
    className: "text-ink2 font-semibold"
  }, "\u201CI\u2019ve been here before, but I\u2019m not sure which record I have.\u201D")), demo && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Label, {
    className: "mt-5 mb-2"
  }, "Try"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, ['Vera', 'bm2756', '4821', 'Wong'].map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    onClick: () => setQ(s),
    className: "tap mono text-[12px] font-semibold bg-paper border border-line rounded-full px-3 py-2 text-ink2"
  }, s)))), live && !backend.pos && /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-muted leading-snug mt-4"
  }, "Searches the customer folders on the NAS.")) : live && remote.error && results.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "pt-8 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[15px] font-bold text-warn"
  }, "Search didn\u2019t work"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-muted mt-1.5 px-6 leading-snug"
  }, remote.error)) : searching && results.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "mono text-[11px] text-muted text-center pt-8"
  }, "Searching\u2026") : results.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "pt-8 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[15px] font-bold"
  }, "No customer found"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-muted mt-1.5 px-6 leading-snug"
  }, "Check the spelling, or create the person as a new walk-in.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Label, {
    className: "mb-2"
  }, results.length, " match", results.length > 1 ? 'es' : ''), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5"
  }, results.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id
  }, /*#__PURE__*/React.createElement(CustomerCard, {
    c: c,
    record: recOf(c, records),
    mode: "search",
    onSelect: onSelect
  }), c.phone && /*#__PURE__*/React.createElement("div", {
    className: "mono text-[10.5px] text-muted mt-1 ml-[91px]"
  }, "phone \u2022\u2022\u2022\u2022 ", c.phone)))))));
}

/* =============================== NEW WALK-IN =============================== */

/* Folder-safe, but loose enough for whatever the POS issues.
   No dots or slashes — the ID becomes a directory name. */

function Field({
  label,
  note,
  error,
  children
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline gap-2 mb-1.5"
  }, /*#__PURE__*/React.createElement(Label, null, label), note && /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-muted"
  }, note)), children, error && /*#__PURE__*/React.createElement("p", {
    className: "text-[11.5px] font-bold text-warn mt-1.5"
  }, error));
}
function NewCustomer({
  onCreated,
  onBack,
  backend
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [id, setId] = useState('');
  const [touched, setTouched] = useState(false);
  const [created, setCreated] = useState(null);
  const [existing, setExisting] = useState(null);
  const [checking, setChecking] = useState(false);
  const [lookupErr, setLookupErr] = useState(null);
  const [seed] = useState(() => CUSTOMERS.length);
  const live = backend.mode === 'live';
  const cleanId = normalizeId(id) || id.trim();
  const idOk = normalizeId(id) !== null;
  const taken = !live && idOk && !!byId(cleanId);
  const nameOk = name.trim().length > 1;
  const canCreate = nameOk && idOk && !taken;
  const idError = !touched || !cleanId ? null : !idOk ? 'Should look like BM 4521 — outlet code, then the customer number.' : taken ? 'That membership ID already exists.' : null;
  const fresh = () => ({
    id: cleanId,
    name: name.trim(),
    seed,
    time: clock(),
    phone: phone.replace(/\D/g, '').slice(-4) || '0000',
    lastVisit: prettyToday(),
    today: true,
    live: live,
    folder: null
  });

  /* A typo in the ID would put these photos into someone else's folder. So before any photo,
     ask the NAS whether this ID already has one — and if it does, show whose. */
  const create = () => {
    if (!canCreate || checking) return;
    if (!live && PILOT) {
      setLookupErr(backend.mode === 'needs-login' ? 'Sign in first.' : 'No connection to the server. Check the wifi and try again.');
      return;
    }
    if (!live) {
      setCreated(fresh());
      return;
    }
    setChecking(true);
    setLookupErr(null);
    apiGet('customers.php?view=lookup&id=' + encodeURIComponent(cleanId)).then(j => {
      setChecking(false);
      if (j.status === 'duplicate') setLookupErr(`There are ${j.folders.length} folders for ${j.id} (${j.folders.join(' / ')}). Ask IT to merge them first.`);else if (j.status === 'found') setExisting(Object.assign(fromServer(j.customer), {
        folder: j.folders[0]
      }));else setCreated(Object.assign(fresh(), j.customer ? {
        name: j.customer.name || name.trim()
      } : {}));
    }).catch(e => {
      setChecking(false);
      setLookupErr(e.message);
    });
  };
  if (existing) return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    title: "Membership ID in use",
    onBack: () => setExisting(null)
  }), /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl bg-warnSoft border border-warn/30 p-3.5 flex gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-warn flex-none mt-[1px]"
  }, /*#__PURE__*/React.createElement(Icon.warn, {
    s: 17
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-warn font-bold leading-snug"
  }, existing.id, " already has a photo folder. Make sure it belongs to the person in front of you.")), /*#__PURE__*/React.createElement("div", {
    className: "fade-up mt-3 bg-paper rounded-3xl border border-line overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement(CustomerReferencePhoto, {
    c: existing,
    className: "w-full h-[190px]",
    radius: 0
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-3 left-3 mono track text-[9.5px] font-bold bg-ink/85 text-white px-2 py-1 rounded-md"
  }, "REFERENCE PHOTO")), /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, /*#__PURE__*/React.createElement(Label, null, "Existing folder"), /*#__PURE__*/React.createElement("div", {
    className: "mono text-[13px] font-bold mt-1 break-words"
  }, existing.folder), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement(Label, null, "You typed"), /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-extrabold mt-0.5"
  }, name.trim()))))), /*#__PURE__*/React.createElement(Dock, null, /*#__PURE__*/React.createElement(Btn, {
    variant: "confirm",
    onClick: () => onCreated(existing, 'face')
  }, /*#__PURE__*/React.createElement(Icon.check, null), /*#__PURE__*/React.createElement("span", null, "YES, SAME CUSTOMER")), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: () => setExisting(null)
  }, /*#__PURE__*/React.createElement(Icon.back, {
    s: 17
  }), /*#__PURE__*/React.createElement("span", null, "NO \u2014 CHECK THE ID"))));
  if (created) return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pop flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-[70px] h-[70px] rounded-full bg-good text-white grid place-items-center"
  }, /*#__PURE__*/React.createElement(Icon.check, {
    s: 36
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 text-[24px] font-extrabold"
  }, "Customer created")), /*#__PURE__*/React.createElement("div", {
    className: "fade-up mt-6 bg-paper rounded-2xl border border-line p-4"
  }, /*#__PURE__*/React.createElement(Label, null, "Customer"), /*#__PURE__*/React.createElement("div", {
    className: "text-[22px] font-extrabold leading-tight mt-0.5"
  }, created.name), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement(IdChip, {
    id: created.id
  }))), /*#__PURE__*/React.createElement("div", {
    className: "fade-up mt-3 bg-brandSoft border border-brand/35 rounded-2xl p-4 flex gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-brandDeep flex-none mt-[1px]"
  }, /*#__PURE__*/React.createElement(Icon.cam, {
    s: 18
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-ink2 leading-snug font-bold"
  }, "No separate reference photo needed. The FRONT photo you take next becomes this customer\u2019s reference image for future visits."))), /*#__PURE__*/React.createElement(Dock, null, /*#__PURE__*/React.createElement(Btn, {
    onClick: () => onCreated(created, 'face')
  }, /*#__PURE__*/React.createElement("span", null, "5-ANGLE PHOTO (BEFORE)"), /*#__PURE__*/React.createElement(Icon.chev, {
    s: 19
  })), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: () => onCreated(created, 'photos')
  }, /*#__PURE__*/React.createElement(Icon.cam, {
    s: 17
  }), /*#__PURE__*/React.createElement("span", null, "OTHERS \u2014 HAND, LEG\u2026 (BEFORE)"))));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    title: "New customer",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-4 pb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-muted leading-snug mb-4"
  }, "Open the file first, then take the photos. Reception can fill this in before the customer goes through."), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Customer name"
  }, /*#__PURE__*/React.createElement("input", {
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "Full name",
    className: "w-full h-14 rounded-2xl bg-paper border-2 border-line focus:border-brand outline-none px-4 text-[16px] font-bold"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Phone number",
    note: "optional"
  }, /*#__PURE__*/React.createElement("input", {
    value: phone,
    onChange: e => setPhone(e.target.value),
    inputMode: "tel",
    placeholder: "01X-XXX XXXX",
    className: "mono w-full h-14 rounded-2xl bg-paper border-2 border-line focus:border-brand outline-none px-4 text-[16px] font-bold"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Membership ID",
    note: "same as POS",
    error: idError
  }, /*#__PURE__*/React.createElement("input", {
    value: id,
    onChange: e => setId(e.target.value),
    onBlur: () => setTouched(true),
    autoCapitalize: "characters",
    autoCorrect: "off",
    spellCheck: "false",
    placeholder: "BM 4521",
    className: `mono w-full h-14 rounded-2xl bg-paper border-2 outline-none px-4 text-[16px] font-bold ${idError ? 'border-warn' : 'border-line focus:border-brand'}`
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 rounded-2xl bg-paper border border-line p-3.5 flex gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-muted flex-none mt-[1px]"
  }, /*#__PURE__*/React.createElement(Icon.warn, {
    s: 16
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[11.5px] text-muted leading-snug"
  }, "Type the ID exactly as the POS system shows it. The photo folder is named after it, so a mismatch here is a mismatch on the drive."))), /*#__PURE__*/React.createElement(Dock, null, lookupErr && /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-warn font-bold text-center leading-snug"
  }, lookupErr), /*#__PURE__*/React.createElement(Btn, {
    onClick: create,
    disabled: !canCreate || checking
  }, checking ? 'CHECKING ID…' : 'CREATE CUSTOMER')));
}

/* ============================== PHOTO SESSION ============================== */

function PhotoSession({
  customer,
  phase,
  mode,
  session,
  backend,
  onSaved,
  onBack
}) {
  const face = mode !== 'photos'; /* 'face' = the five angles, then anything extra */
  const [idx, setIdx] = useState(0);
  const [shots, setShots] = useState([null, null, null, null, null]);
  const [pending, setPending] = useState(null);
  /* shoot | check | complete | label | extra | uploading */
  const [stage, setStage] = useState(face ? 'shoot' : 'label');
  const [up, setUp] = useState({
    done: 0,
    error: null,
    demo: false
  });

  /* Extra photos — hands, legs, backs — one group per label the therapist types.
     An AFTER session starts with the same labels the BEFORE session used. */
  const [extras, setExtras] = useState(() => (session.groups || []).filter(g => g.phase !== phase).map(g => ({
    n: g.group,
    label: g.label,
    photos: [],
    was: g.count
  })));
  const [gi, setGi] = useState(-1);
  const seqRef = useRef({});
  /* The customer's earlier labels arrive from the server a moment after this screen opens. */
  useEffect(() => {
    const from = (session.groups || []).filter(g => g.phase !== phase);
    if (!from.length) return;
    setExtras(prev => {
      const add = from.filter(g => !prev.some(x => x.n === g.group)).map(g => ({
        n: g.group,
        label: g.label,
        photos: [],
        was: g.count
      }));
      return add.length ? prev.concat(add) : prev;
    });
  }, [session]);

  /* One stamp per session, reused on every retry: DSM skips files it already has, so a retry
     never duplicates. savedRef marks what already reached the NAS, so a retry resumes where it
     stopped; a photo retaken after it was saved is sent again with replace, overwriting only it. */
  const sessionRef = useRef(null),
    folderRef = useRef(customer.folder || null);
  /* Every photo goes onto the phone the moment it is taken, so a dropped wifi or a closed app
     can never lose one. sessionId keeps this customer's BEFORE and AFTER apart. */
  if (!sessionRef.current) sessionRef.current = hhmmss();
  const sessionId = customer.id + '|' + phase + '|' + sessionRef.current;
  const [keepErr, setKeepErr] = useState(null);
  const keep = (itemKey, photo, extra) => {
    if (!photo || !photo.blob || backend.mode === 'demo') return; /* the demo saves nothing anywhere */
    queuePut(queueRecord(sessionId, itemKey, Object.assign({
      customerId: customer.id,
      customerName: customer.name,
      phase: phase,
      session: sessionRef.current
    }, extra || {}), photo, 'draft')).then(() => setKeepErr(null)).catch(e => setKeepErr('This phone could not store the photo (' + e.message + '). Save as soon as you can.'));
  };
  const savedRef = useRef({}),
    replaceRef = useRef({});
  const angle = ANGLES[idx];
  const taken = shots.filter(Boolean).length;
  const live = backend.mode === 'live';
  const extraPhotos = extras.reduce((n, g) => n + g.photos.length, 0);
  const hasSample = shots.some(p => p && p.sample) || extras.some(g => g.photos.some(p => p.sample));
  const faceReady = !face || shots.every(Boolean);
  const ready = faceReady && (face || extraPhotos > 0);

  /* Everything this session will send, in order. The key stays the same across retries, so a
     photo already on the NAS is never sent twice. */
  const items = () => {
    const list = [];
    if (face) ANGLES.forEach((a, i) => shots[i] && list.push({
      key: 'a' + i,
      angle: a.key,
      name: a.full,
      blob: shots[i].blob,
      reference: phase === 'before' && i === 0 ? shots[i].thumb : null
    }));
    extras.forEach(g => g.photos.forEach(p => list.push({
      key: 'e' + g.n + '-' + p.seq,
      angle: 'extra',
      group: g.n,
      seq: p.seq,
      label: g.label,
      name: (g.label || 'Extra') + ' ' + p.seq,
      blob: p.blob
    })));
    return list;
  };

  /* Free a photo's memory once nothing shows it — except the one standing in as the
     customer's reference image. */
  const discard = p => {
    if (!p) return;
    if (p.src && p.src.indexOf('blob:') === 0) URL.revokeObjectURL(p.src);
    if (p.thumbSrc && p.thumbSrc.indexOf('blob:') === 0) URL.revokeObjectURL(p.thumbSrc);
  };
  const setReference = p => {
    if (phase !== 'before' || !p || !p.thumb) return;
    if (REF_SRC[customer.id]) URL.revokeObjectURL(REF_SRC[customer.id]);
    REF_SRC[customer.id] = URL.createObjectURL(p.thumb);
  };
  const allRef = useRef([]);
  allRef.current = shots.concat.apply(shots, extras.map(g => g.photos));
  useEffect(() => () => {
    allRef.current.forEach(discard);
  }, []);

  /* One tap to open the camera, shutter, Use Photo — and nothing else. A photo that
     passes every check is kept without asking; we only interrupt when something is wrong. */
  const commit = p => {
    const next = shots.slice();
    const old = next[idx];
    next[idx] = p;
    if (idx === 0) setReference(p);
    keep('a' + idx, p, {
      angle: ANGLES[idx].key,
      isReference: phase === 'before' && idx === 0
    });
    discard(old);
    if (savedRef.current['a' + idx]) {
      savedRef.current['a' + idx] = false;
      replaceRef.current['a' + idx] = true;
    }
    setShots(next);
    setPending(null);
    if (next.every(Boolean)) {
      setStage('complete');
      return;
    }
    let n = idx + 1;
    while (n < 5 && next[n]) n++;
    if (n >= 5) n = next.indexOf(null);
    setIdx(n);
    setStage('shoot');
  };

  /* A batch import fills the empty slots in order, relabelling each photo as it lands. */
  const commitMany = ps => {
    const next = shots.slice();
    let n = idx;
    for (let i = 0; i < ps.length; i++) {
      while (n < 5 && next[n]) n++;
      if (n >= 5) break;
      const p = Object.assign({}, ps[i], {
        label: ANGLES[n].full,
        off: ANGLES[n].off
      });
      next[n] = p;
      n++;
    }
    if (!shots[0] && next[0]) setReference(next[0]);
    next.forEach((p, i) => {
      if (p && p !== shots[i]) keep('a' + i, p, {
        angle: ANGLES[i].key,
        isReference: phase === 'before' && i === 0
      });
    });
    setShots(next);
    setPending(null);
    if (next.every(Boolean)) {
      setStage('complete');
      return;
    }
    setIdx(next.indexOf(null));
    setStage('shoot');
  };
  const capture = p => {
    const clean = !p.checks || p.checks.every(c => c.ok);
    if (clean) commit(p);else {
      setPending(p);
      setStage('check');
    }
  };
  const retake = () => {
    discard(pending);
    setPending(null);
    setStage('shoot');
  };

  /* ---- extra photos ---- */
  const nextGroupNumber = () => extras.reduce((m, g) => Math.max(m, g.n), face ? 5 : 0) + 1;
  const startGroup = label => {
    const clean = String(label || '').trim().slice(0, 20);
    const same = extras.findIndex(g => g.label.toUpperCase() === clean.toUpperCase() && clean !== '');
    if (same >= 0) {
      setGi(same);
      setStage('extra');
      return;
    }
    const g = {
      n: nextGroupNumber(),
      label: clean,
      photos: [],
      was: 0
    };
    setExtras(extras.concat([g]));
    setGi(extras.length);
    setStage('extra');
  };
  const addToGroup = ps => {
    const next = extras.slice();
    const g = Object.assign({}, next[gi]);
    let seq = seqRef.current[g.n] || 0;
    g.photos = g.photos.concat(ps.slice(0, EXTRA_MAX - g.photos.length).map(p => {
      seq += 1;
      return Object.assign({}, p, {
        seq: seq
      });
    }));
    seqRef.current[g.n] = seq;
    g.photos.forEach(p => keep('e' + g.n + '-' + p.seq, p, {
      angle: 'extra',
      group: g.n,
      seq: p.seq,
      label: g.label
    }));
    next[gi] = g;
    setExtras(next);
  };
  const removeFromGroup = i => {
    const next = extras.slice();
    const g = Object.assign({}, next[gi]);
    const p = g.photos[i];
    if (savedRef.current['e' + g.n + '-' + p.seq]) return; /* already on the NAS: leave it alone */
    g.photos = g.photos.slice(0, i).concat(g.photos.slice(i + 1));
    queueDelete(queueKey(sessionId, 'e' + g.n + '-' + p.seq)).catch(() => {});
    discard(p);
    next[gi] = g;
    setExtras(next);
  };
  /* An empty group is nothing to save: drop it when the therapist leaves it. */
  const closeGroup = () => {
    const g = extras[gi];
    setExtras(g && g.photos.length === 0 && !g.was ? extras.filter((_, i) => i !== gi) : extras);
    setGi(-1);
    setStage(face && !shots.every(Boolean) ? 'shoot' : 'complete');
  };
  const redo = i => {
    setIdx(i);
    setPending(null);
    setStage('shoot');
  };
  const runUpload = async () => {
    setStage('uploading');
    const list = items(),
      total = list.length;
    let mode = backend.mode;
    if (mode !== 'live' && mode !== 'demo') mode = (await probeBackend()).mode;

    /* Mark every photo ready to send. They are already on the phone; this is what makes the
       app (and the next app start) keep trying until the NAS has them. */
    let kept = true;
    for (const it of mode === 'demo' ? [] : list) {
      try {
        await queuePut(queueRecord(sessionId, it.key, {
          customerId: customer.id,
          customerName: customer.name,
          phase: phase,
          session: sessionRef.current,
          angle: it.angle,
          group: it.group,
          seq: it.seq,
          label: it.label,
          isReference: !!it.reference
        }, {
          blob: it.blob,
          thumb: it.reference || null
        }, 'ready'));
      } catch (e) {
        kept = false;
      }
    }
    if (mode !== 'live' && PILOT) {
      setUp({
        done: 0,
        total: total,
        waiting: kept ? total : 0,
        error: {
          at: 'the first photo',
          message: mode === 'needs-login' ? 'This phone isn\'t signed in yet. Sign in and these photos will be sent.' : 'No connection to the server right now.'
        },
        demo: false
      });
      return;
    }
    if (mode !== 'live') {
      /* Not on the real server: walk the progress bar, and say plainly nothing was saved. */
      for (let i = 0; i <= total; i++) {
        setUp({
          done: i,
          total: total,
          error: null,
          demo: true
        });
        await new Promise(r => setTimeout(r, 240));
      }
      setTimeout(() => onSaved(phase, true, null, total), 200);
      return;
    }
    setUp({
      done: 0,
      total: total,
      error: null,
      demo: false
    });
    const res = await sendQueued(done => setUp({
      done: done,
      total: total,
      error: null,
      demo: false
    }));
    if (res.folder) folderRef.current = res.folder;
    const left = (await queueAll().catch(() => [])).filter(r => r.sessionId === sessionId).length;
    if (left === 0) {
      setTimeout(() => onSaved(phase, false, folderRef.current, total), 300);
      return;
    }
    setUp({
      done: total - left,
      total: total,
      waiting: left,
      error: {
        at: 'photo ' + (total - left + 1),
        message: res.error || 'The server could not be reached.',
        total: total
      },
      demo: false
    });
  };
  const header = /*#__PURE__*/React.createElement("div", {
    className: "flex-none px-4 py-2.5 bg-ink text-white flex items-center gap-2.5"
  }, stage === 'shoot' && taken === 0 || stage === 'label' && !face && extras.length === 0 ? /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    "aria-label": "Back",
    className: "tap w-8 h-8 -ml-1 rounded-lg grid place-items-center text-white/70"
  }, /*#__PURE__*/React.createElement(Icon.back, {
    s: 18
  })) : /*#__PURE__*/React.createElement("div", {
    className: "w-1"
  }), /*#__PURE__*/React.createElement(CustomerReferencePhoto, {
    c: customer,
    className: "w-9 h-9 flex-none",
    radius: 9,
    compact: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[14px] font-extrabold leading-tight truncate"
  }, customer.name), /*#__PURE__*/React.createElement("div", {
    className: "mono text-[10px] text-white/50"
  }, customer.id)), /*#__PURE__*/React.createElement("span", {
    className: `mono track text-[10px] font-bold px-2.5 py-1.5 rounded-lg ${phase === 'before' ? 'bg-brand text-ink' : 'bg-good text-white'}`
  }, phase.toUpperCase()), keepErr && /*#__PURE__*/React.createElement("span", {
    className: "text-warn flex-none",
    title: keepErr
  }, /*#__PURE__*/React.createElement(Icon.warn, {
    s: 18
  })));
  if (stage === 'uploading') return /*#__PURE__*/React.createElement(React.Fragment, null, header, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 grid place-items-center px-8"
  }, up.error ? /*#__PURE__*/React.createElement("div", {
    className: "w-full text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-16 mx-auto rounded-2xl bg-warnSoft text-warn grid place-items-center"
  }, /*#__PURE__*/React.createElement(Icon.warn, {
    s: 30
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 text-[17px] font-extrabold"
  }, "Couldn\u2019t reach the NAS"), /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] text-warn font-bold mt-2 leading-snug"
  }, up.error.message), up.waiting > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 rounded-xl bg-goodSoft px-3 py-2.5"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[12.5px] font-bold text-good leading-snug"
  }, up.waiting, " photo", up.waiting > 1 ? 's are' : ' is', " saved on this phone. Nothing is lost \u2014 they are sent automatically once the wifi is back.")), up.done > 0 && /*#__PURE__*/React.createElement("p", {
    className: "mono text-[11px] text-muted mt-2"
  }, up.done, " of ", up.error.total || up.done, " already on the NAS."), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 space-y-2"
  }, /*#__PURE__*/React.createElement(Btn, {
    onClick: runUpload
  }, "TRY AGAIN NOW"), /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    onClick: () => onBack()
  }, "LEAVE IT FOR LATER"), /*#__PURE__*/React.createElement(Btn, {
    variant: "quiet",
    onClick: () => setStage('complete')
  }, "Back to photos"))) : /*#__PURE__*/React.createElement("div", {
    className: "w-full text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative w-16 h-16 mx-auto rounded-2xl bg-ink text-brand grid place-items-center overflow-hidden"
  }, /*#__PURE__*/React.createElement(Icon.folder, {
    s: 28
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-x-0 h-8 bg-brand/25 sweep"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 text-[16px] font-extrabold"
  }, "Saving ", phase, " photos"), /*#__PURE__*/React.createElement("div", {
    className: "mono text-[11px] text-muted mt-1"
  }, up.demo ? 'Demo — nothing is actually saved' : 'Assigning destination automatically…'), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 h-2.5 rounded-full bg-line overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-good transition-all duration-300",
    style: {
      width: (up.total ? up.done / up.total * 100 : 0) + '%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "mono text-[11px] text-muted mt-2"
  }, up.done, " of ", up.total || 0, " ", up.demo ? 'processed' : 'saved to the NAS'))));
  if (stage === 'complete') return /*#__PURE__*/React.createElement(React.Fragment, null, header, /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pop flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-[54px] h-[54px] rounded-full bg-good text-white grid place-items-center"
  }, /*#__PURE__*/React.createElement(Icon.check, {
    s: 28
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 text-[20px] font-extrabold text-center leading-tight"
  }, phase.toUpperCase(), " PHOTOS COMPLETE"), /*#__PURE__*/React.createElement("div", {
    className: "mono text-[12px] text-good font-bold mt-0.5"
  }, face ? '5 / 5 face angles' : '', face && extraPhotos ? ' · ' : '', extraPhotos ? extraPhotos + ' more photo' + (extraPhotos > 1 ? 's' : '') : '')), face && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-5 gap-1.5 mt-3"
  }, shots.map((p, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => redo(i),
    className: "tap",
    "aria-label": `Redo ${ANGLES[i].full}`
  }, /*#__PURE__*/React.createElement(PhotoPreview, {
    photo: p,
    className: "ratio ratio-1x1",
    radius: 9,
    showStamp: false
  }), /*#__PURE__*/React.createElement("div", {
    className: "mono text-[8px] text-muted text-center mt-0.5 track"
  }, ANGLES[i].short)))), /*#__PURE__*/React.createElement("p", {
    className: "text-[10.5px] text-muted text-center mt-1.5"
  }, "Tap any photo to retake it.")), extras.map((g, i) => /*#__PURE__*/React.createElement("div", {
    key: g.n,
    className: "mt-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline gap-2"
  }, /*#__PURE__*/React.createElement(Label, {
    className: "!text-ink2 break-words"
  }, g.label || 'No label'), /*#__PURE__*/React.createElement("span", {
    className: "mono text-[10.5px] text-muted"
  }, g.photos.length), g.photos.length === 0 && g.was > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] font-bold text-warn"
  }, g.was, " before \u2014 not taken yet"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setGi(i);
      setStage('extra');
    },
    className: "tap ml-auto text-[12px] font-extrabold text-brandDeep"
  }, "Edit")), g.photos.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-7 gap-1 mt-1"
  }, g.photos.map(p => /*#__PURE__*/React.createElement(PhotoPreview, {
    key: p.seq,
    photo: p,
    className: "ratio ratio-1x1",
    radius: 7,
    showStamp: false
  }))))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setGi(-1);
      setStage('label');
    },
    className: "tap w-full mt-3 h-11 rounded-xl bg-paper border-2 border-dashed border-line text-[12.5px] font-extrabold text-ink2 flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Icon.plus, {
    s: 17
  }), /*#__PURE__*/React.createElement("span", null, "ADD OTHERS (HAND, LEG, BACK\u2026)")), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 mb-1 rounded-xl bg-paper border border-line px-3 py-2 flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-brandDeep flex-none mt-[2px]"
  }, /*#__PURE__*/React.createElement(Icon.folder, {
    s: 15
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement(Label, null, "Will be saved to"), /*#__PURE__*/React.createElement("div", {
    className: "mono text-[11px] font-bold mt-0.5 leading-snug break-words"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-brandDeep"
  }, live && folderRef.current ? folderRef.current : folderLabel(customer)), " / ", isoToday(), " / ", phase.toUpperCase())))), /*#__PURE__*/React.createElement(Dock, null, live && hasSample && /*#__PURE__*/React.createElement("p", {
    className: "text-[11.5px] text-warn font-bold text-center leading-snug"
  }, "Sample photos can\u2019t go to the NAS. Tap them and take real ones."), /*#__PURE__*/React.createElement(Btn, {
    onClick: runUpload,
    disabled: live && hasSample || !ready
  }, "SAVE ", phase.toUpperCase(), " PHOTOS")));
  if (stage === 'label') return /*#__PURE__*/React.createElement(React.Fragment, null, header, /*#__PURE__*/React.createElement(LabelPicker, {
    suggestions: session.labels || [],
    onDone: startGroup,
    onCancel: () => face || extras.length ? setStage('complete') : onBack()
  }));
  if (stage === 'extra') return /*#__PURE__*/React.createElement(React.Fragment, null, header, /*#__PURE__*/React.createElement(ExtraCapture, {
    group: extras[gi],
    customer: customer,
    allowSample: !live && !PILOT,
    onCapture: p => addToGroup([p]),
    onMany: addToGroup,
    onRemove: removeFromGroup,
    onDone: closeGroup
  }));
  return /*#__PURE__*/React.createElement(React.Fragment, null, header, /*#__PURE__*/React.createElement("div", {
    className: "flex-none px-4 pt-3 pb-2.5 bg-cream border-b border-line"
  }, /*#__PURE__*/React.createElement(AngleProgress, {
    index: idx,
    done: shots.map(Boolean),
    onPick: redo
  })), /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-2.5 pb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Label, null, "Current angle"), /*#__PURE__*/React.createElement("div", {
    className: "text-[18px] font-extrabold leading-tight"
  }, angle.full)), /*#__PURE__*/React.createElement("div", {
    className: "mono text-[14px] font-bold text-muted"
  }, taken, " / 5")), stage === 'check' ? /*#__PURE__*/React.createElement(QualityCheck, {
    photo: pending,
    onRetake: retake,
    onAccept: () => commit(pending)
  }) : /*#__PURE__*/React.createElement(CameraCapture, {
    key: angle.key,
    angle: angle,
    customer: customer,
    onCapture: capture,
    onMany: commitMany,
    remaining: 5 - taken,
    allowSample: !live && !PILOT
  })));
}

/* ================================ DASHBOARD ================================ */

function Tick({
  on
}) {
  return on ? /*#__PURE__*/React.createElement("span", {
    className: "inline-grid place-items-center w-5 h-5 rounded-md bg-goodSoft text-good"
  }, /*#__PURE__*/React.createElement(Icon.check, {
    s: 12
  })) : /*#__PURE__*/React.createElement("span", {
    className: "inline-block w-5 text-center text-muted font-bold"
  }, "\u2014");
}
function Dashboard({
  records,
  onBack,
  backend,
  today
}) {
  const live = backend.mode === 'live';
  const todays = todaysOf(backend, today);
  const complete = todays.filter(c => statusOf(recOf(c, records)) === 'Complete').length;
  const pending = todays.length - complete;
  const photos = todays.reduce((n, c) => {
    if (c.counts) return n + c.counts.before + c.counts.after;
    const r = recOf(c, records);
    return n + (r.before ? 5 : 0) + (r.after ? 5 : 0);
  }, 0);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    title: "Photo flow status",
    sub: prettyToday(),
    onBack: onBack,
    dark: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 bg-cream px-4 pt-4 pb-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, [['Customers', todays.length, 'text-ink'], ['Completed', complete, 'text-good'], ['Pending', pending, 'text-warn']].map(([l, v, c]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    className: "bg-paper rounded-2xl border border-line px-3 py-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: `mono text-[26px] font-bold leading-none ${c}`
  }, v), /*#__PURE__*/React.createElement("div", {
    className: "text-[10.5px] text-muted mt-1.5 font-semibold"
  }, l)))), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 bg-paper rounded-2xl border border-line px-4 py-3 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[12.5px] font-semibold text-ink2"
  }, "Photos recorded today"), /*#__PURE__*/React.createElement("span", {
    className: "mono text-[17px] font-bold"
  }, photos)), /*#__PURE__*/React.createElement(Label, {
    className: "mt-5 mb-2"
  }, "Records"), /*#__PURE__*/React.createElement("div", {
    className: "bg-paper rounded-2xl border border-line overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-left border-collapse",
    style: {
      minWidth: '320px'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    className: "bg-cream"
  }, [['Customer', 'text-left'], ['Before', 'text-center'], ['After', 'text-center'], ['Status', 'text-left']].map(([h, al]) => /*#__PURE__*/React.createElement("th", {
    key: h,
    className: `mono track text-[8.5px] font-bold text-muted uppercase px-2 py-2 first:pl-3 last:pr-3 whitespace-nowrap ${al}`
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, todays.map(c => {
    const r = recOf(c, records),
      st = statusOf(r);
    return /*#__PURE__*/React.createElement("tr", {
      key: c.id,
      className: "border-t border-line align-middle"
    }, /*#__PURE__*/React.createElement("td", {
      className: "px-2 pl-3 py-2.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[12.5px] font-bold leading-tight whitespace-nowrap"
    }, c.name), /*#__PURE__*/React.createElement("div", {
      className: "mono text-[9.5px] text-muted"
    }, c.id)), /*#__PURE__*/React.createElement("td", {
      className: "px-2 py-2.5 text-center"
    }, /*#__PURE__*/React.createElement(Tick, {
      on: r.before
    })), /*#__PURE__*/React.createElement("td", {
      className: "px-2 py-2.5 text-center"
    }, /*#__PURE__*/React.createElement(Tick, {
      on: r.after
    })), /*#__PURE__*/React.createElement("td", {
      className: "px-2 pr-3 py-2.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: `text-[10px] font-bold whitespace-nowrap ${st === 'Complete' ? 'text-good' : st === 'In progress' ? 'text-warn' : 'text-brandDeep'}`
    }, st === 'Ready' ? 'Pending' : st)));
  }))))), /*#__PURE__*/React.createElement("p", {
    className: "mono text-[9.5px] text-muted mt-3 leading-relaxed track"
  }, live ? backend.pos ? 'LIVE · POS BOOKINGS + NAS SAVES' : 'LIVE · FROM PHOTOS SAVED TODAY · POS NOT CONNECTED' : backend.mode === 'demo' ? 'DEMO DATA · NO SYNOLOGY CONNECTION' : 'NOT CONNECTED', PILOT ? '' : ' · FOR INTERNAL DISCUSSION ONLY')));
}

/* ============================== THE STORY ============================== */

function Flow({
  tone,
  title,
  steps,
  note
}) {
  const dark = tone === 'new';
  return /*#__PURE__*/React.createElement("div", {
    className: `rounded-2xl border p-4 ${dark ? 'bg-ink border-ink text-white' : 'bg-paper border-line'}`
  }, /*#__PURE__*/React.createElement(Label, {
    className: dark ? '!text-brand' : ''
  }, title), /*#__PURE__*/React.createElement("ol", {
    className: "mt-3 space-y-0"
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: `mt-[5px] w-1.5 h-1.5 rounded-full flex-none ${s.risk ? 'bg-warn' : dark ? 'bg-brand' : 'bg-line'}`
  }), /*#__PURE__*/React.createElement("span", {
    className: `text-[13px] leading-snug ${s.risk ? 'font-bold text-warn' : dark ? 'text-white/85' : 'text-ink2'}`
  }, s.t)), i < steps.length - 1 && /*#__PURE__*/React.createElement("div", {
    className: `ml-[3px] w-px h-3 ${dark ? 'bg-white/20' : 'bg-line'}`
  })))), note && /*#__PURE__*/React.createElement("p", {
    className: `text-[11.5px] mt-3 pt-3 border-t leading-snug ${dark ? 'border-white/10 text-white/55' : 'border-line text-muted'}`
  }, note));
}
function Story({
  onBack
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    title: "Why this changes",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-4 pb-5 space-y-3"
  }, /*#__PURE__*/React.createElement(Flow, {
    tone: "old",
    title: "Today",
    steps: [{
      t: 'Customer arrives'
    }, {
      t: 'Therapist tries to remember who they are',
      risk: true
    }, {
      t: 'Open Synology'
    }, {
      t: 'Search through customer folders',
      risk: true
    }, {
      t: 'Upload manually'
    }, {
      t: 'Risk of the wrong folder',
      risk: true
    }],
    note: "Six steps, three of them where things go wrong."
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center text-muted"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    width: "22",
    height: "22",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 4v15M6 13l6 6 6-6"
  }))), /*#__PURE__*/React.createElement(Flow, {
    tone: "new",
    title: "With Photo Flow",
    steps: [{
      t: 'Customer arrives'
    }, {
      t: 'Find them by reference photo'
    }, {
      t: 'Confirm it is the right person'
    }, {
      t: 'Take 5 angles'
    }, {
      t: 'System assigns the destination'
    }, {
      t: 'Done'
    }],
    note: "The therapist never opens Synology and never chooses a folder."
  }), /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl bg-brandSoft border border-brand/35 p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[15px] font-extrabold leading-snug"
  }, "\u201CDon\u2019t make therapists search faster. Remove the need to search.\u201D"), /*#__PURE__*/React.createElement("p", {
    className: "mono track text-[9.5px] text-brandDeep font-bold mt-2.5"
  }, "PRODUCT PRINCIPLE \xB7 FIND \u2192 TAKE \u2192 DONE")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl bg-paper border border-line p-4"
  }, /*#__PURE__*/React.createElement(Label, null, "Safeguards"), /*#__PURE__*/React.createElement("ul", {
    className: "mt-2.5 space-y-2"
  }, ['The therapist confirms the customer — the system only suggests.', 'No facial recognition decides who the customer is.', 'Customer ID is the system identifier, not personal details.', 'Photos are assigned only after confirmation.'].map(t => /*#__PURE__*/React.createElement("li", {
    key: t,
    className: "flex items-start gap-2 text-[12.5px] text-ink2 leading-snug"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-good flex-none mt-[2px]"
  }, /*#__PURE__*/React.createElement(Icon.check, {
    s: 13
  })), /*#__PURE__*/React.createElement("span", null, t)))))));
}

/* ================================== LOGIN ================================== */

function Login({
  onDone
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const submit = async () => {
    const u = username.trim();
    if (!u || !password) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await withTimeout(fetch(API + 'login.php', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: u,
          password
        })
      }), 15000);
      let j = null;
      try {
        j = await r.json();
      } catch (e) {}
      if (!r.ok || !j || !j.ok) {
        setBusy(false);
        setErr(j && j.error || 'Wrong username or password.');
        return;
      }
      setToken(j.token);
      setUser(j.user);
      const b = await probeBackend();
      setBusy(false);
      onDone(b);
    } catch (e) {
      setBusy(false);
      setErr('Cannot reach the Photo Flow server right now.');
    }
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    title: "Sign in"
  }), /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[22px] font-extrabold leading-tight"
  }, "Sign in to Photo Flow"), /*#__PURE__*/React.createElement("p", {
    className: "text-[13px] text-muted mt-2 leading-snug"
  }, "Use your own account. Ask an admin if you don\u2019t have one yet."), /*#__PURE__*/React.createElement("div", {
    className: "mt-5 space-y-3"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Username"
  }, /*#__PURE__*/React.createElement("input", {
    className: "keyin mt-1",
    value: username,
    onChange: e => setUsername(e.target.value),
    placeholder: "e.g. jessie.tan",
    autoCapitalize: "off",
    autoCorrect: "off",
    spellCheck: "false"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Password"
  }, /*#__PURE__*/React.createElement("input", {
    className: "keyin mt-1",
    type: "password",
    value: password,
    onChange: e => setPassword(e.target.value),
    placeholder: "Password",
    onKeyDown: e => {
      if (e.key === 'Enter') submit();
    }
  }))), err && /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-warn font-bold mt-2"
  }, err)), /*#__PURE__*/React.createElement(Dock, null, /*#__PURE__*/React.createElement(Btn, {
    onClick: submit,
    disabled: busy || !username.trim() || !password
  }, busy ? 'SIGNING IN…' : 'SIGN IN')));
}

/* =================================== ADMIN =================================== */

function AdminHub({
  onBack,
  go
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    title: "Admin",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-4 space-y-2.5"
  }, /*#__PURE__*/React.createElement(BigAction, {
    tone: "quiet",
    icon: /*#__PURE__*/React.createElement(Icon.people, {
      s: 20
    }),
    title: "MANAGE ACCOUNTS",
    sub: "Create staff logins and assign outlets",
    onClick: () => go('admin-users')
  }), /*#__PURE__*/React.createElement(BigAction, {
    tone: "quiet",
    icon: /*#__PURE__*/React.createElement(Icon.chart, {
      s: 20
    }),
    title: "AUDIT TRAIL",
    sub: "Every photo saved and every account change",
    onClick: () => go('admin-audit')
  })));
}
function OutletCheckboxes({
  outlets,
  selected,
  onChange
}) {
  const toggle = o => onChange(selected.includes(o) ? selected.filter(x => x !== o) : [...selected, o]);
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 mt-1"
  }, outlets.map(o => /*#__PURE__*/React.createElement("button", {
    key: o,
    type: "button",
    onClick: () => toggle(o),
    className: `tap mono text-[12px] font-semibold rounded-full px-3 py-2 border ${selected.includes(o) ? 'bg-ink text-white border-ink' : 'bg-paper border-line text-ink2'}`
  }, o)));
}
function AdminUserForm({
  outlets,
  initial,
  onCancel,
  onSubmit,
  busy,
  err
}) {
  const editing = !!initial;
  const [username, setUsername] = useState(initial ? initial.username : '');
  const [displayName, setDisplayName] = useState(initial ? initial.displayName : '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initial ? initial.role : 'staff');
  const [outletsSel, setOutletsSel] = useState(initial ? initial.outlets : []);
  const submit = () => onSubmit({
    username,
    displayName,
    password,
    role,
    outlets: role === 'admin' ? [] : outletsSel
  });
  const canSubmit = username.trim() && (editing || password.length >= 8) && (role === 'admin' || outletsSel.length > 0);
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Username"
  }, /*#__PURE__*/React.createElement("input", {
    className: "keyin mt-1",
    value: username,
    disabled: editing,
    onChange: e => setUsername(e.target.value),
    placeholder: "e.g. jessie.tan",
    autoCapitalize: "off",
    autoCorrect: "off",
    spellCheck: "false"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Display name"
  }, /*#__PURE__*/React.createElement("input", {
    className: "keyin mt-1",
    value: displayName,
    onChange: e => setDisplayName(e.target.value),
    placeholder: "e.g. Jessie Tan"
  })), /*#__PURE__*/React.createElement(Field, {
    label: editing ? 'New password' : 'Password',
    note: editing ? 'leave blank to keep the current one' : 'at least 8 characters'
  }, /*#__PURE__*/React.createElement("input", {
    className: "keyin mt-1",
    type: "password",
    value: password,
    onChange: e => setPassword(e.target.value),
    placeholder: editing ? '••••••••' : 'At least 8 characters'
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Role"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mt-1"
  }, ['staff', 'admin'].map(r => /*#__PURE__*/React.createElement("button", {
    key: r,
    type: "button",
    onClick: () => setRole(r),
    className: `tap flex-1 h-11 rounded-xl text-[13px] font-bold border ${role === r ? 'bg-ink text-white border-ink' : 'bg-paper border-line text-ink2'}`
  }, r.toUpperCase())))), role !== 'admin' && /*#__PURE__*/React.createElement(Field, {
    label: "Outlets this account may use",
    note: outletsSel.length === 0 ? 'pick at least one' : null
  }, /*#__PURE__*/React.createElement(OutletCheckboxes, {
    outlets: outlets,
    selected: outletsSel,
    onChange: setOutletsSel
  })), err && /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-warn font-bold"
  }, err), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 pt-1"
  }, /*#__PURE__*/React.createElement(Btn, {
    variant: "ghost",
    className: "flex-1",
    onClick: onCancel
  }, "CANCEL"), /*#__PURE__*/React.createElement(Btn, {
    className: "flex-1",
    onClick: submit,
    disabled: busy || !canSubmit
  }, busy ? 'SAVING…' : editing ? 'SAVE' : 'CREATE ACCOUNT')));
}
function AdminUsers({
  onBack
}) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    users: [],
    outlets: []
  });
  const [mode, setMode] = useState('list'); // list | create | edit:<username>
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const load = () => {
    setState(s => ({
      ...s,
      loading: true,
      error: null
    }));
    apiGet('admin-users.php').then(j => setState({
      loading: false,
      error: null,
      users: j.users,
      outlets: j.outlets
    })).catch(e => setState(s => ({
      ...s,
      loading: false,
      error: e.message
    })));
  };
  useEffect(load, []);
  const editing = mode.indexOf('edit:') === 0 ? state.users.find(u => u.username === mode.slice(5)) : null;
  const create = async fields => {
    setBusy(true);
    setErr(null);
    try {
      await apiPost('admin-users.php', {
        action: 'create',
        ...fields
      });
      setBusy(false);
      setMode('list');
      load();
    } catch (e) {
      setBusy(false);
      setErr(e.message);
    }
  };
  const update = async fields => {
    setBusy(true);
    setErr(null);
    try {
      await apiPost('admin-users.php', {
        action: 'update',
        username: editing.username,
        displayName: fields.displayName,
        role: fields.role,
        outlets: fields.outlets
      });
      if (fields.password && fields.password.length >= 8) {
        await apiPost('admin-users.php', {
          action: 'reset-password',
          username: editing.username,
          password: fields.password
        });
      }
      setBusy(false);
      setMode('list');
      load();
    } catch (e) {
      setBusy(false);
      setErr(e.message);
    }
  };
  const toggleActive = async u => {
    try {
      await apiPost('admin-users.php', {
        action: 'update',
        username: u.username,
        active: !u.active
      });
      load();
    } catch (e) {
      setState(s => ({
        ...s,
        error: e.message
      }));
    }
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    title: "Manage accounts",
    onBack: mode === 'list' ? onBack : () => {
      setErr(null);
      setMode('list');
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-4 pb-6"
  }, mode === 'list' && /*#__PURE__*/React.createElement(React.Fragment, null, state.loading && /*#__PURE__*/React.createElement("p", {
    className: "mono text-[11px] text-muted text-center pt-8"
  }, "Loading\u2026"), state.error && /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-warn font-bold"
  }, state.error), !state.loading && !state.error && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, state.users.map(u => /*#__PURE__*/React.createElement("div", {
    key: u.username,
    className: "bg-paper rounded-2xl border border-line p-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[15px] font-extrabold truncate"
  }, u.displayName, !u.active && /*#__PURE__*/React.createElement("span", {
    className: "text-warn"
  }, " \xB7 disabled")), /*#__PURE__*/React.createElement("div", {
    className: "mono text-[11px] text-muted mt-0.5 truncate"
  }, u.username, " \xB7 ", u.role, u.role !== 'admin' && u.outlets.length ? ' · ' + u.outlets.join(', ') : '')), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setErr(null);
      setMode('edit:' + u.username);
    },
    className: "tap flex-none text-[12px] font-bold text-brandDeep"
  }, "EDIT")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => toggleActive(u),
    className: "tap flex-1 h-9 rounded-lg bg-cream border border-line text-[11.5px] font-bold text-ink2"
  }, u.active ? 'DISABLE' : 'ENABLE'))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
  }, /*#__PURE__*/React.createElement(Btn, {
    onClick: () => {
      setErr(null);
      setMode('create');
    }
  }, "+ NEW ACCOUNT")))), mode === 'create' && /*#__PURE__*/React.createElement(AdminUserForm, {
    outlets: state.outlets,
    initial: null,
    busy: busy,
    err: err,
    onCancel: () => setMode('list'),
    onSubmit: create
  }), editing && /*#__PURE__*/React.createElement(AdminUserForm, {
    outlets: state.outlets,
    initial: editing,
    busy: busy,
    err: err,
    onCancel: () => setMode('list'),
    onSubmit: update
  })));
}
function auditLabel(e) {
  return {
    'photo.saved': 'Photo saved',
    'auth.login': 'Sign-in',
    'user.created': 'Account created',
    'user.updated': 'Account updated',
    'user.password_reset': 'Password reset'
  }[e.event] || e.event;
}
function AdminAudit({
  onBack
}) {
  const now = new Date();
  const [month, setMonth] = useState(now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'));
  const [state, setState] = useState({
    loading: true,
    error: null,
    entries: []
  });
  const shiftMonth = delta => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  };
  useEffect(() => {
    setState(s => ({
      ...s,
      loading: true,
      error: null
    }));
    apiGet('admin-audit.php?month=' + encodeURIComponent(month) + '&limit=300').then(j => setState({
      loading: false,
      error: null,
      entries: j.entries
    })).catch(e => setState({
      loading: false,
      error: e.message,
      entries: []
    }));
  }, [month]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    title: "Audit trail",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    className: "px-4 pt-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => shiftMonth(-1),
    className: "tap w-9 h-9 rounded-lg bg-paper border border-line grid place-items-center text-ink2"
  }, /*#__PURE__*/React.createElement(Icon.back, {
    s: 14
  })), /*#__PURE__*/React.createElement("div", {
    className: "mono text-[12px] font-bold flex-1 text-center"
  }, month), /*#__PURE__*/React.createElement("button", {
    onClick: () => shiftMonth(1),
    className: "tap w-9 h-9 rounded-lg bg-paper border border-line grid place-items-center text-ink2"
  }, /*#__PURE__*/React.createElement(Icon.chev, {
    s: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "app-scroll flex-1 px-4 pt-3 pb-6"
  }, state.loading && /*#__PURE__*/React.createElement("p", {
    className: "mono text-[11px] text-muted text-center pt-8"
  }, "Loading\u2026"), state.error && /*#__PURE__*/React.createElement("p", {
    className: "text-[12px] text-warn font-bold"
  }, state.error), !state.loading && !state.error && state.entries.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-[13px] text-muted text-center pt-8"
  }, "No activity this month."), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, state.entries.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "bg-paper rounded-xl border border-line p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[13px] font-extrabold"
  }, auditLabel(e)), /*#__PURE__*/React.createElement("div", {
    className: "mono text-[10px] text-muted flex-none"
  }, e.at ? new Date(e.at).toLocaleString() : '')), /*#__PURE__*/React.createElement("div", {
    className: "text-[11.5px] text-muted mt-1"
  }, e.username && /*#__PURE__*/React.createElement(React.Fragment, null, "by ", /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-ink2"
  }, e.username), ' '), e.actor && !e.username && /*#__PURE__*/React.createElement(React.Fragment, null, "by ", /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-ink2"
  }, e.actor), ' '), e.customerId && /*#__PURE__*/React.createElement(React.Fragment, null, "\xB7 customer ", /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, e.customerId), ' '), e.target && /*#__PURE__*/React.createElement(React.Fragment, null, "\xB7 account ", /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, e.target), ' '), e.result && /*#__PURE__*/React.createElement(React.Fragment, null, "\xB7 ", e.result)))))));
}

/* ================================== APP ================================== */

function App() {
  const [screen, setScreen] = useState('home');
  const [stack, setStack] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [phase, setPhase] = useState('before');
  const [mode, setMode] = useState('face'); /* face = the five angles | photos = anything else */
  const [session, setSession] = useState({
    labels: [],
    groups: []
  });
  const [saved, setSaved] = useState(null);
  const [records, setRecords] = useState({});
  const [extra, setExtra] = useState([]);
  const [backend, setBackend] = useState({
    mode: 'checking'
  });
  const [user, setUserState] = useState(getUser);
  const [today, setToday] = useState({
    list: null,
    branches: null,
    loading: false,
    error: null
  });
  /* Photos still on the phone, and the automatic resend. */
  const [pending, setPending] = useState([]);
  const [sendingNow, setSendingNow] = useState(false);
  const refreshPending = () => queueAll().then(rows => setPending(queueSessions(rows))).catch(() => {});
  const flush = async () => {
    if (backend.mode !== 'live' || sendingNow) return;
    const rows = await queueAll().catch(() => []);
    if (!rows.some(r => r.state === 'ready')) {
      setPending(queueSessions(rows));
      return;
    }
    setSendingNow(true);
    await sendQueued();
    setSendingNow(false);
    refreshPending();
  };
  useEffect(() => {
    refreshPending();
  }, [screen]);
  useEffect(() => {
    if (backend.mode !== 'live') return;
    flush(); /* as soon as the app can reach the server */
    const t = setInterval(flush, 60000); /* and once a minute while it is open */
    const on = () => flush(); /* and the moment the phone says it is online */
    window.addEventListener('online', on, false);
    return () => {
      clearInterval(t);
      window.removeEventListener('online', on, false);
    };
  }, [backend.mode]);
  const applyBackend = b => {
    setBackend(b);
    setUserState(b.user || null);
  };
  useEffect(() => {
    probeBackend().then(applyBackend);
  }, []);
  const refreshToday = () => {
    setToday(t => ({
      list: t.list,
      branches: t.branches,
      loading: true,
      error: null
    }));
    apiGet('customers.php?view=today').then(j => setToday({
      list: j.customers.map(fromServer),
      branches: j.branches || null,
      loading: false,
      error: j.posError || null
    })).catch(e => setToday(t => ({
      list: t.list,
      branches: t.branches,
      loading: false,
      error: e.message
    })));
  };
  /* Fresh numbers whenever a screen that shows them opens. */
  useEffect(() => {
    if (backend.mode === 'live' && (screen === 'home' || screen === 'today' || screen === 'dashboard')) refreshToday();
  }, [screen, backend.mode]);
  const go = s => {
    setStack(k => [...k, screen]);
    setScreen(s);
  };
  const back = () => setStack(k => {
    const c = [...k];
    setScreen(c.pop() || 'home');
    return c;
  });
  const home = () => {
    setStack([]);
    setScreen('home');
  };
  const pick = c => {
    setCustomer(c);
    go('confirm');
  };

  /* What this customer already has today: the labels a BEFORE session used, so the AFTER
     session can offer the same ones back, plus the clinic's recent labels for the keypad. */
  const startSession = (c, ph, md) => {
    setCustomer(c);
    setPhase(ph);
    setMode(md || 'face');
    setSession({
      labels: [],
      groups: []
    });
    if (!records[c.id]) setRecords(r => ({
      ...r,
      [c.id]: {
        before: false,
        after: false
      }
    }));
    setStack([]);
    setScreen('session');
    if (backend.mode === 'live') {
      apiGet('customers.php?view=lookup&id=' + encodeURIComponent(c.id)).then(j => setSession({
        labels: j.labels || [],
        groups: j.today && j.today.groups || []
      })).catch(() => {});
    }
  };
  const onSaved = (ph, demo, folder, count) => {
    setRecords(r => ({
      ...r,
      [customer.id]: {
        ...(r[customer.id] || {}),
        [ph]: true
      }
    }));
    setSaved(prev => ({
      phase: ph,
      final: ph === 'after',
      demo: demo,
      count: count || 0,
      total: (count || 0) + (prev && prev.count || 0),
      folder: folder || prev && prev.folder || null
    }));
    setScreen('saved');
    /* How many photos this customer really has today — including any taken on another phone. */
    if (backend.mode === 'live') {
      apiGet('customers.php?view=lookup&id=' + encodeURIComponent(customer.id)).then(j => setSaved(prev => prev ? Object.assign({}, prev, {
        today: j.today
      }) : prev)).catch(() => {});
    }
  };
  const signOut = async () => {
    try {
      await apiPost('logout.php', {});
    } catch (e) {}
    clearSession();
    applyBackend({
      mode: 'needs-login',
      pos: backend.pos
    });
    home();
  };
  const dark = screen === 'session' || screen === 'dashboard';
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(StatusBar, {
    dark: dark
  }), screen === 'home' && /*#__PURE__*/React.createElement(Home, {
    go: go,
    records: records,
    backend: backend,
    today: today,
    user: user,
    onSignOut: signOut,
    waiting: pending.reduce((n, g) => n + g.count, 0),
    onRetry: () => {
      setBackend({
        mode: 'checking'
      });
      probeBackend().then(applyBackend);
    }
  }), screen === 'pending' && /*#__PURE__*/React.createElement(Pending, {
    pending: pending,
    onBack: back,
    sending: sendingNow,
    live: backend.mode === 'live',
    onSend: async g => {
      setSendingNow(true);
      const rows = await queueAll().catch(() => []);
      for (const r of rows) if (r.sessionId === g.sessionId && r.state !== 'ready') await queuePut(Object.assign({}, r, {
        state: 'ready'
      })).catch(() => {});
      await sendQueued();
      setSendingNow(false);
      refreshPending();
    },
    onDrop: async g => {
      const rows = await queueAll().catch(() => []);
      for (const r of rows) if (r.sessionId === g.sessionId) await queueDelete(r.key).catch(() => {});
      refreshPending();
    }
  }), screen === 'login' && /*#__PURE__*/React.createElement(Login, {
    onDone: b => {
      applyBackend(b);
      home();
    }
  }), screen === 'today' && /*#__PURE__*/React.createElement(TodayList, {
    records: records,
    onSelect: pick,
    onBack: back,
    backend: backend,
    today: today,
    onRetry: refreshToday,
    onFix: () => go('login')
  }), screen === 'search' && /*#__PURE__*/React.createElement(CustomerSearch, {
    records: records,
    onSelect: pick,
    onBack: back,
    backend: backend,
    onFix: () => go('login')
  }), screen === 'new' && /*#__PURE__*/React.createElement(NewCustomer, {
    backend: backend,
    onBack: back,
    onCreated: (c, md) => {
      if (!c.live) CUSTOMERS.push(c);
      setExtra(e => [...e, c.id]);
      startSession(c, 'before', md);
    }
  }), screen === 'confirm' && /*#__PURE__*/React.createElement(CustomerConfirmation, {
    c: customer,
    onBack: back,
    onYes: (c2, md, ph) => startSession(c2 || customer, ph || 'before', md)
  }), screen === 'session' && /*#__PURE__*/React.createElement(PhotoSession, {
    key: customer.id + phase,
    customer: customer,
    phase: phase,
    mode: mode,
    session: session,
    backend: backend,
    onSaved: onSaved,
    onBack: home
  }), screen === 'saved' && /*#__PURE__*/React.createElement(UploadSuccess, {
    customer: customer,
    phase: saved.phase,
    final: saved.final,
    demo: saved.demo,
    folder: saved.folder,
    count: saved.count,
    total: saved.total,
    today: saved.today,
    onHome: home,
    onNext: () => saved.final ? home() : startSession(customer, 'after', mode)
  }), screen === 'dashboard' && /*#__PURE__*/React.createElement(Dashboard, {
    records: records,
    onBack: back,
    backend: backend,
    today: today
  }), screen === 'story' && /*#__PURE__*/React.createElement(Story, {
    onBack: back
  }), screen === 'admin' && /*#__PURE__*/React.createElement(AdminHub, {
    onBack: back,
    go: go
  }), screen === 'admin-users' && /*#__PURE__*/React.createElement(AdminUsers, {
    onBack: back
  }), screen === 'admin-audit' && /*#__PURE__*/React.createElement(AdminAudit, {
    onBack: back
  }));
}
ReactDOM.createRoot(document.getElementById('screen')).render(/*#__PURE__*/React.createElement(App, null));