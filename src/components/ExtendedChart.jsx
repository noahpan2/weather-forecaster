import { P, SOURCES } from '../constants.js';
import { disp } from '../utils/temps.js';

export function ExtendedChart({ fdays, unit, hovDay, setHovDay }) {
  const W = 700, H = 310, pL = 44, pR = 16, pT = 38, pB = 62;
  const cW = W - pL - pR, cH = H - pT - pB;
  const N = fdays.length;

  const dv = d => ({
    bH:  disp(d.bH,         unit), bL:  disp(d.bL,         unit),
    aH:  disp(d.avgH,       unit), aL:  disp(d.avgL,       unit),
    eHH: disp(d.hiRange[1], unit), eLL: disp(d.loRange[0], unit),
  });

  const allV = fdays.flatMap(d => { const v = dv(d); return [v.bH, v.bL, v.aH, v.aL, v.eHH, v.eLL]; });
  const step = unit === 'F' ? 10 : 5;
  const gMin = Math.floor(Math.min(...allV) / step) * step - 2;
  const gMax = Math.ceil(Math.max(...allV)  / step) * step + 2;

  const toX = i => pL + (i / (N - 1)) * cW;
  const toY = t => pT + ((gMax - t) / (gMax - gMin)) * cH;

  const grid = [];
  for (let t = Math.ceil(gMin / step) * step; t <= gMax; t += step) grid.push(t);

  const line = fn => fdays.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(fn(d))}`).join(' ');
  const band = (top, bot) => {
    const t = fdays.map((d, i) => `${toX(i)},${toY(top(d))}`);
    const b = fdays.map((d, i) => `${toX(i)},${toY(bot(d))}`).reverse();
    return [...t, ...b].join(' ');
  };

  const fH  = d => dv(d).bH,  fL  = d => dv(d).bL;
  const aH  = d => dv(d).aH,  aL  = d => dv(d).aL;
  const eHH = d => dv(d).eHH, eLL = d => dv(d).eLL;
  const x7 = toX(7), x10 = toX(10), xEnd = toX(N - 1);
  const f = unit === 'F' ? 32 : 0;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <rect x={x7}  y={pT - 10} width={x10 - x7}   height={cH + 20} fill={P.yellowBg} opacity="0.55" rx="2" />
        <rect x={x10} y={pT - 10} width={xEnd - x10}  height={cH + 20} fill={P.orangeBg} opacity="0.50" rx="2" />
        <text x={(x7 + x10) / 2}   y={pT - 16} textAnchor="middle" fontSize="8" fill="#9A7B2E" fontFamily="IBM Plex Mono, monospace" fontWeight="600" letterSpacing="0.08em">MODERATE</text>
        <text x={(x10 + xEnd) / 2} y={pT - 16} textAnchor="middle" fontSize="8" fill="#A05830" fontFamily="IBM Plex Mono, monospace" fontWeight="600" letterSpacing="0.08em">EXTENDED</text>
        {grid.map(t => (
          <g key={t}>
            <line x1={pL} y1={toY(t)} x2={W - pR} y2={toY(t)} stroke={P.border} strokeWidth="1" />
            <text x={pL - 7} y={toY(t) + 4} textAnchor="end" fontSize="10" fill={P.t5} fontFamily="IBM Plex Mono, monospace">{t}°</text>
          </g>
        ))}
        {gMin < f && f < gMax && (
          <line x1={pL} y1={toY(f)} x2={W - pR} y2={toY(f)} stroke={P.blue} strokeWidth="1.5" strokeDasharray="5,4" opacity="0.3" />
        )}
        <polygon points={band(aH, aL)}   fill={`${P.orange}1A`} />
        <polygon points={band(eHH, eLL)} fill={`${P.blue}0F`}  />
        <path d={line(aH)} fill="none" stroke={P.orange} strokeWidth="1.5" strokeDasharray="5,4" opacity="0.5" />
        <path d={line(aL)} fill="none" stroke={P.orange} strokeWidth="1.5" strokeDasharray="5,4" opacity="0.5" />
        <path d={line(fH)} fill="none" stroke={P.fHigh}  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={line(fL)} fill="none" stroke={P.fLow}   strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {fdays.map((d, i) => (
          <g key={i}>
            <text x={toX(i)} y={H - pB + 16} textAnchor="middle" fontSize={d.d < 2 ? '11' : '10'} fontWeight={d.d < 2 ? '600' : '400'} fill={P.t3} fontFamily="IBM Plex Sans, sans-serif">{d.dayName}</text>
            <text x={toX(i)} y={H - pB + 28} textAnchor="middle" fontSize="9" fill={P.t5} fontFamily="IBM Plex Mono, monospace">{d.monthDay}</text>
          </g>
        ))}
        {fdays.map((d, i) => (
          <g key={`dt-${i}`} transform={`translate(${toX(i)}, ${H - pB + 43})`}>
            {SOURCES.map((s, si) => {
              const on = d.availIds.includes(s.id) && d.enabledAvail.includes(s.id);
              return (
                <circle key={s.id} cx={(si - 2) * 6} cy="0" r="2.5"
                  fill={on ? s.color : 'transparent'} stroke={on ? s.color : '#CCC9BF'}
                  strokeWidth="1" opacity={on ? 0.9 : 0.32} />
              );
            })}
          </g>
        ))}
        {hovDay !== null && (() => {
          const d = fdays[hovDay]; const v = dv(d);
          return (
            <>
              <line x1={toX(hovDay)} y1={pT} x2={toX(hovDay)} y2={H - pB} stroke={P.t1} strokeWidth="1" opacity="0.1" />
              <circle cx={toX(hovDay)} cy={toY(v.bH)} r="5"   fill={P.fHigh}  stroke="#fff" strokeWidth="2" />
              <circle cx={toX(hovDay)} cy={toY(v.bL)} r="5"   fill={P.fLow}   stroke="#fff" strokeWidth="2" />
              <circle cx={toX(hovDay)} cy={toY(v.aH)} r="3.5" fill={P.orange} stroke="#fff" strokeWidth="1.5" />
              <circle cx={toX(hovDay)} cy={toY(v.aL)} r="3.5" fill={P.orange} stroke="#fff" strokeWidth="1.5" />
            </>
          );
        })()}
        {fdays.map((_, i) => (
          <rect key={`hz-${i}`} x={toX(i) - (cW / (N - 1) / 2)} y={0} width={cW / (N - 1)} height={H}
            fill="transparent" style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setHovDay(i)} onMouseLeave={() => setHovDay(null)} />
        ))}
      </svg>
    </div>
  );
}
