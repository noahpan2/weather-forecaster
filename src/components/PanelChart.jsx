import { P } from '../constants.js';
import { blendedAt, hData } from '../utils/hourly.js';

// Catmull-Rom → cubic bezier for smooth curves
function smoothPath(pts, tension = 0.35) {
  if (pts.length < 2) return '';
  const d = [`M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d.push(`C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
  }
  return d.join(' ');
}

export function PanelChart({ sources, unit, currentTime }) {
  const enabled = sources.filter(s => s.enabled);
  const eIds = enabled.map(s => s.id);

  const W = 700, H = 170;
  const pL = 16, pR = 16, pT = 20, pB = 56;
  const cW = W - pL - pR, cH = H - pT - pB;

  const blended = Array.from({ length: 24 }, (_, h) => blendedAt(h, eIds, unit));
  const valid = blended.filter(t => t !== null);
  if (!valid.length) return null;

  const tMin = Math.min(...valid) - 1;
  const tMax = Math.max(...valid) + 1;
  const tRange = tMax - tMin || 1;

  const toX = h  => pL + (h / 23) * cW;
  const toY = t  => pT + ((tMax - t) / tRange) * cH;

  const pts    = blended.map((t, h) => ({ x: toX(h), y: toY(t) }));
  const linePath = smoothPath(pts);

  // Ensemble spread band (very subtle)
  const bandTop = [], bandBot = [];
  for (let h = 0; h < 24; h++) {
    const vs = eIds.map(id => hData(id, unit)[h]);
    if (!vs.length) continue;
    bandTop.push({ x: toX(h), y: toY(Math.max(...vs)) });
    bandBot.push({ x: toX(h), y: toY(Math.min(...vs)) });
  }
  const bandPath = eIds.length > 1
    ? smoothPath(bandTop) + ' ' + smoothPath(bandBot.reverse()).replace(/^M/, 'L') + ' Z'
    : null;

  // Labeled hours
  const dotHours = [0, 3, 6, 9, 12, 15, 18, 21];

  const timeLabel = h => {
    if (h === 0)  return '12 AM';
    if (h === 12) return '12 PM';
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
  };

  const nowX = toX(currentTime);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>

      {/* Ensemble spread band */}
      {bandPath && (
        <path d={bandPath} fill={`${P.t1}09`} strokeWidth="0" />
      )}

      {/* Now marker */}
      <line x1={nowX} y1={pT} x2={nowX} y2={H - pB + 2}
        stroke="#D94040" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.65" />

      {/* Main blended line — thick, black */}
      <path d={linePath} fill="none" stroke={P.t1} strokeWidth="3.5"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots + temp labels at labeled hours */}
      {dotHours.map(h => {
        const t = blended[h];
        if (t === null) return null;
        const x = toX(h);
        const y = toY(t);
        return (
          <g key={h}>
            <circle cx={x} cy={y} r="5.5" fill="#fff" stroke={P.t1} strokeWidth="2.5" />
            <text x={x} y={y + 22} textAnchor="middle" fontSize="13" fontWeight="600"
              fill={P.t1} fontFamily="IBM Plex Mono, monospace">{t}°</text>
          </g>
        );
      })}

      {/* "Now" label */}
      <text x={nowX} y={H - pB + 16} textAnchor="middle" fontSize="10" fontWeight="700"
        fill="#D94040" fontFamily="IBM Plex Mono, monospace">Now</text>

      {/* Time axis */}
      {dotHours.map(h => (
        <text key={h} x={toX(h)} y={H - 6} textAnchor="middle" fontSize="10" fill={P.t5}
          fontFamily="IBM Plex Mono, monospace">{timeLabel(h)}</text>
      ))}
    </svg>
  );
}
