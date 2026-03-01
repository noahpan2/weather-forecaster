import { HOURLY } from '../data/mockData.js';
import { toF } from './temps.js';

export function hData(id, u) {
  return u === 'F' ? HOURLY[id].map(t => Math.round(toF(t))) : HOURLY[id].map(t => Math.round(t));
}

export function blendedAt(h, ids, u) {
  if (!ids.length) return null;
  const v = ids.map(id => hData(id, u)[h]);
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
}

export function spreadAt(h, ids, u) {
  if (ids.length < 2) return 0;
  const v = ids.map(id => hData(id, u)[h]);
  return Math.max(...v) - Math.min(...v);
}

export function dailyStats(ids, u) {
  if (!ids.length) return { h: null, l: null };
  return {
    h: Math.round(ids.map(id => Math.max(...hData(id, u))).reduce((a, b) => a + b, 0) / ids.length),
    l: Math.round(ids.map(id => Math.min(...hData(id, u))).reduce((a, b) => a + b, 0) / ids.length),
  };
}
