import { FMETA, DAILY } from './mockData.js';

export function computeForecastDays(enabledIds) {
  return FMETA.map(m => {
    const srcs = m.availIds.filter(id => enabledIds.includes(id));
    const use  = srcs.length ? srcs : m.availIds;
    const highs = use.map(id => DAILY[id][m.d].h);
    const lows  = use.map(id => DAILY[id][m.d].l);
    const bH = highs.reduce((a, b) => a + b, 0) / highs.length;
    const bL = lows.reduce((a, b) => a + b, 0)  / lows.length;
    const eSp = Math.min(m.d * 0.42, 9);
    return { ...m, bH, bL, hiRange: [bH - eSp, bH + eSp], loRange: [bL - eSp, bL + eSp], enabledAvail: srcs };
  });
}
