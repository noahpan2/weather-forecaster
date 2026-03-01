import { P, SOURCES } from '../constants.js';
import { normals, disp } from '../utils/temps.js';
import { hData, blendedAt } from '../utils/hourly.js';
import { DOY0 } from '../constants.js';

export function HourlyChart({ sources, unit, currentTime, hovHour, setHovHour }) {
  const enabled = sources.filter(s => s.enabled);
  const eIds    = enabled.map(s => s.id);

  const W = 700, H = 210, pL = 40, pR = 16, pT = 24, pB = 32;
  const cW = W - pL - pR, cH = H - pT - pB;

  const allV = SOURCES.flatMap(s => hData(s.id, unit));
  const step = unit === 'F' ? 5 : 2;
  const gMin = Math.floor(Math.min(...allV) / step) * step - step;
  const gMax = Math.ceil(Math.max(...allV)  / step) * step + step;

  const toX = h => pL + (h / 23) * cW;
  const toY = t => pT + ((gMax - t) / (gMax - gMin)) * cH;

  const grid = [];
  for (let t = Math.ceil(gMin / step) * step; t <= gMax; t += step) grid.push(t);

  const { avgH, avgL } = normals(DOY0);
  const nH = disp(avgH, unit), nL = disp(avgL, unit);

  const bandPts = () => {
    const top = [], bot = [];
    for (let h = 0; h < 24; h++) {
      const v = eIds.map(id => hData(id, unit)[h]);
      if (!v.length) continue;
      top.push(`${toX(h)},${toY(Math.max(...v))}`);
      bot.push(`${toX(h)},${toY(Math.min(...v))}`);
    }
    return [...top, ...bot.reverse()].join(' ');
  };

  const srcPath = id => hData(id, unit).map((t, h) => `${h === 0 ? 'M' : 'L'} ${toX(h)} ${toY(t)}`).join(' ');
  const blPath  = Array.from({ length: 24 }, (_, h) => {
    const v = blendedAt(h, eIds, unit);
    return v !== null ? `${h === 0 ? 'M' : 'L'} ${toX(h)} ${toY(v)}` : '';
  }).join(' ');

  const dTemp = blendedAt(hovHour ?? currentTime, eIds, unit);
  const f = unit === 'F' ? 32 : 0;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {grid.map(t => (
          <g key={t}>
            <line x1={pL} y1={toY(t)} x2={W - pR} y2={toY(t)} stroke={P.border} strokeWidth="1" />
            <text x={pL - 7} y={toY(t) + 4} textAnchor="end" fontSize="10" fill={P.t5} fontFamily="IBM Plex Mono, monospace">{t}°</text>
          </g>
        ))}
        {gMin < f && f < gMax && (
          <line x1={pL} y1={toY(f)} x2={W - pR} y2={toY(f)} stroke={P.blue} strokeWidth="1.5" strokeDasharray="4,4" opacity="0.3" />
        )}
        {nH > gMin && nH < gMax && (
          <line x1={pL} y1={toY(nH)} x2={W - pR} y2={toY(nH)} stroke={P.orange} strokeWidth="1.5" strokeDasharray="6,4" opacity="0.4" />
        )}
        {nL > gMin && nL < gMax && (
          <line x1={pL} y1={toY(nL)} x2={W - pR} y2={toY(nL)} stroke={P.orange} strokeWidth="1.5" strokeDasharray="6,4" opacity="0.4" />
        )}
        {eIds.length > 1 && <polygon points={bandPts()} fill={`${P.blue}14`} />}
        {enabled.map(s => (
          <path key={s.id} d={srcPath(s.id)} fill="none" stroke={s.color} strokeWidth="1.5" strokeOpacity="0.22" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {eIds.length > 0 && (
          <path d={blPath} fill="none" stroke={P.t1} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
        <line x1={toX(currentTime)} y1={pT - 4} x2={toX(currentTime)} y2={H - pB + 4} stroke={P.orange} strokeWidth="1.5" strokeDasharray="4,3" />
        <circle cx={toX(currentTime)} cy={pT - 8} r="3.5" fill={P.orange} />
        {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
          <text key={h} x={toX(h)} y={H - pB + 16} textAnchor="middle" fontSize="10" fill={P.t5} fontFamily="IBM Plex Mono, monospace">
            {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
          </text>
        ))}
        {hovHour !== null && (
          <>
            <line x1={toX(hovHour)} y1={pT} x2={toX(hovHour)} y2={H - pB} stroke={P.t1} strokeWidth="1" opacity="0.1" />
            {enabled.map(s => (
              <circle key={s.id} cx={toX(hovHour)} cy={toY(hData(s.id, unit)[hovHour])} r="4" fill={s.color} stroke="#fff" strokeWidth="2" />
            ))}
            {dTemp !== null && (
              <circle cx={toX(hovHour)} cy={toY(dTemp)} r="5.5" fill={P.t1} stroke="#fff" strokeWidth="2.5" />
            )}
          </>
        )}
        {Array.from({ length: 24 }, (_, h) => (
          <rect key={h} x={toX(h) - (cW / 48)} y={0} width={cW / 24} height={H} fill="transparent"
            style={{ cursor: 'crosshair' }} onMouseEnter={() => setHovHour(h)} onMouseLeave={() => setHovHour(null)} />
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 14, paddingLeft: pL, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 2.5, background: P.t1, borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: P.t3, fontWeight: 500 }}>Blended</span>
        </div>
        {enabled.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 2, background: s.color, borderRadius: 2, opacity: 0.45 }} />
            <span style={{ fontSize: 11, color: P.t4 }}>{s.name}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 0, borderTop: `1.5px dashed ${P.orange}`, opacity: 0.6 }} />
          <span style={{ fontSize: 11, color: P.orange, opacity: 0.8 }}>Hist. avg</span>
        </div>
      </div>
    </div>
  );
}
