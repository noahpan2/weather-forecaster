import { mkRng, normals } from '../utils/temps.js';
import { SOURCES, DOY0 } from '../constants.js';

/* ─── TARGET DAILY DATA (from CARROT Weather, Feb 27 2026) ──────────────── */
// Values in °C. Days 0–9 from screenshot; days 10–15 extrapolated.
const TARGET = [
  { h:  5.0, l:  -4.4, cond: 'Partly Cloudy'  }, // Fri Feb 27
  { h:  3.3, l:  -7.2, cond: 'Cloudy'          }, // Sat Feb 28
  { h: -7.2, l: -14.4, cond: 'Partly Cloudy'   }, // Sun Mar 1
  { h: -5.0, l: -16.7, cond: 'Sunny'            }, // Mon Mar 2
  { h:  1.1, l:  -6.7, cond: 'Light Snow'       }, // Tue Mar 3
  { h:  4.4, l:  -2.2, cond: 'Partly Cloudy'   }, // Wed Mar 4
  { h:  6.1, l:   0.0, cond: 'Rain Showers'     }, // Thu Mar 5
  { h:  6.7, l:   1.7, cond: 'Cloudy'           }, // Fri Mar 6
  { h:  6.7, l:  -1.1, cond: 'Snow Flurries'    }, // Sat Mar 7
  { h:  6.7, l:  -2.8, cond: 'Partly Cloudy'   }, // Sun Mar 8
  { h:  7.0, l:  -1.5, cond: 'Mostly Cloudy'   }, // Mon Mar 9
  { h:  7.0, l:  -1.0, cond: 'Cloudy'           }, // Tue Mar 10
  { h:  7.5, l:   0.0, cond: 'Partly Cloudy'   }, // Wed Mar 11
  { h:  8.0, l:   0.5, cond: 'Mostly Cloudy'   }, // Thu Mar 12
  { h:  7.0, l:  -0.5, cond: 'Light Snow'       }, // Fri Mar 13
  { h:  6.0, l:  -1.5, cond: 'Overcast'         }, // Sat Mar 14
];

/* ─── HOURLY ─────────────────────────────────────────────────────────────── */
// Today: Hi 41°F (5°C), Lo 24°F (-4.4°C). Small per-source spread for chart.
function genHourly(bH, bL, seed) {
  const rng = mkRng(seed);
  return Array.from({ length: 24 }, (_, h) => {
    const shape = Math.sin((h / 23 - 0.2) * Math.PI * 1.8) * 0.5 + 0.5;
    return bL + (bH - bL) * shape + (rng() - 0.5) * 1.6 + Math.sin(h * 0.8 + seed * 0.01) * 0.4;
  });
}

export const HOURLY = {
  weatherkit: genHourly( 5.5, -4.0, 42),
  tomorrow:   genHourly( 4.5, -5.0, 137),
  pirate:     genHourly( 5.0, -4.5, 73),
  openmeteo:  genHourly( 5.5, -4.2, 211),
  weatherbit: genHourly( 4.8, -4.6, 89),
};

/* ─── DAILY ──────────────────────────────────────────────────────────────── */
// Each source = target ± small seeded noise so blended avg ≈ target.
function genDaily(maxDays, seed) {
  const rng = mkRng(seed);
  return Array.from({ length: maxDays }, (_, d) => {
    const t = TARGET[d] ?? TARGET[TARGET.length - 1];
    const noise = (rng() - 0.5) * 2.0; // ±1°C per-source spread
    return {
      h: t.h + noise,
      l: t.l + noise * 0.8,
    };
  });
}

export const DAILY = {
  weatherkit: genDaily(10, 42), tomorrow: genDaily(5, 137),
  pirate:     genDaily(8, 73),  openmeteo: genDaily(16, 211), weatherbit: genDaily(16, 89),
};

/* ─── FORECAST METADATA ──────────────────────────────────────────────────── */
const dn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const mn = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];

export const FMETA = Array.from({ length: 16 }, (_, d) => {
  const date = new Date(2026, 1, 27 + d);
  const { avgH, avgL } = normals((DOY0 + d) % 365);
  return {
    d,
    dayName:  d === 0 ? 'Today' : d === 1 ? 'Tmrw' : dn[date.getDay()],
    monthDay: `${mn[date.getMonth()]} ${date.getDate()}`,
    avgH, avgL,
    condition: TARGET[d]?.cond ?? 'Mostly Cloudy',
    availIds:  SOURCES.filter(s => d < s.maxDays).map(s => s.id),
  };
});

/* ─── PRECIPITATION NOWCAST ──────────────────────────────────────────────── */
// Today: 0% precip — nearly flat line, tiny noise.
const _rng = mkRng(777);
export const PRECIP_NOWCAST = Array.from({ length: 60 }, (_, m) => {
  const base = m > 44 ? ((m - 44) / 15) * 0.08 : 0;
  return Math.max(0, base + (_rng() - 0.6) * 0.018);
});
