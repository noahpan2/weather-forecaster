import { P } from '../constants.js';
import { PRECIP_NOWCAST } from '../data/mockData.js';

export function PrecipBar() {
  const W = 700, H = 90, pL = 16, pR = 16, pT = 8, pB = 28;
  const cW = W - pL - pR, cH = H - pT - pB;
  const maxV = 1.0;

  const toX = m => pL + (m / 59) * cW;
  const toY = v => pT + (1 - Math.min(v / maxV, 1)) * cH;

  const areaPath =
    `M ${toX(0)} ${toY(PRECIP_NOWCAST[0])} ` +
    PRECIP_NOWCAST.slice(1).map((v, m) => `L ${toX(m + 1)} ${toY(v)}`).join(' ') +
    ` L ${toX(59)} ${H - pB} L ${toX(0)} ${H - pB} Z`;

  const linePath =
    `M ${toX(0)} ${toY(PRECIP_NOWCAST[0])} ` +
    PRECIP_NOWCAST.slice(1).map((v, m) => `L ${toX(m + 1)} ${toY(v)}`).join(' ');

  const labels = [
    { m: 0,  label: 'Now'  },
    { m: 15, label: '+15m' },
    { m: 30, label: '+30m' },
    { m: 45, label: '+45m' },
    { m: 59, label: '+1h'  },
  ];

  const intensityLabels = [
    { v: 0.9,  label: 'Heavy'    },
    { v: 0.5,  label: 'Moderate' },
    { v: 0.15, label: 'Light'    },
  ];

  const maxActual = Math.max(...PRECIP_NOWCAST);
  const summary = maxActual < 0.05
    ? 'No precipitation in the next hour.'
    : maxActual < 0.2
    ? 'Slight chance of flurries this hour.'
    : 'Precipitation expected this hour.';

  return (
    <div>
      <div style={{ fontSize: 13, color: P.t3, marginBottom: 12, fontStyle: 'italic' }}>
        {summary}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {intensityLabels.map(({ v, label }) => (
          <g key={label}>
            <line x1={pL} y1={toY(v)} x2={W - pR} y2={toY(v)} stroke={P.border} strokeWidth="1" strokeDasharray="3,3" />
            <text x={W - pR + 6} y={toY(v) + 4} fontSize="9" fill={P.t5} fontFamily="IBM Plex Mono, monospace">{label}</text>
          </g>
        ))}
        <path d={areaPath} fill={`${P.blue}22`} />
        <path d={linePath} fill="none" stroke={P.blue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        <line x1={toX(0)} y1={pT} x2={toX(0)} y2={H - pB} stroke={P.orange} strokeWidth="2" />
        {labels.map(({ m, label }) => (
          <text key={m} x={toX(m)} y={H - pB + 16} textAnchor="middle" fontSize="10" fill={P.t5} fontFamily="IBM Plex Mono, monospace">
            {label}
          </text>
        ))}
        <line x1={pL} y1={H - pB} x2={W - pR} y2={H - pB} stroke={P.border} strokeWidth="1" />
      </svg>
    </div>
  );
}
