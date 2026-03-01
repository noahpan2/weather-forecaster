import { P } from '../constants.js';

export function ConfidenceBadge({ spread, unit }) {
  const t1 = unit === 'F' ? 2.7 : 1.5, t2 = unit === 'F' ? 5.4 : 3.0;
  const level = spread < t1 ? 'High' : spread < t2 ? 'Moderate' : 'Low';
  const s = {
    High:     { bg: P.greenBg,  text: '#2D6E4A', dot: P.green  },
    Moderate: { bg: P.yellowBg, text: '#7A5F18', dot: '#B08820' },
    Low:      { bg: P.redBg,    text: '#8C2E26', dot: P.fHigh  },
  }[level];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: '100px', background: s.bg,
      color: s.text, fontSize: 12, fontWeight: 600, border: `1px solid ${s.dot}40`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {level} agreement
    </span>
  );
}
