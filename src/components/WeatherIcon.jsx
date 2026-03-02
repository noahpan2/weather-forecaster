const SUN = '#F5A623';
const CLD = '#9AAABB';
const SNW = '#7AAAD0';
const RN  = '#5B8DB8';

export function WeatherIcon({ condition, size = 24 }) {
  const c = (condition || '').toLowerCase();
  const v = '0 0 24 24';

  if (c === 'sunny') {
    const rays = [0, 45, 90, 135, 180, 225, 270, 315];
    return (
      <svg width={size} height={size} viewBox={v} fill="none">
        <circle cx="12" cy="12" r="4.5" fill={SUN} />
        {rays.map(a => {
          const r = a * Math.PI / 180;
          return <line key={a}
            x1={12 + 6.5 * Math.cos(r)} y1={12 + 6.5 * Math.sin(r)}
            x2={12 + 9.5 * Math.cos(r)} y2={12 + 9.5 * Math.sin(r)}
            stroke={SUN} strokeWidth="1.6" strokeLinecap="round" />;
        })}
      </svg>
    );
  }

  if (c.includes('partly')) {
    const rays = [0, 60, 120, 180, 240, 300];
    return (
      <svg width={size} height={size} viewBox={v} fill="none">
        <circle cx="16" cy="8" r="3.5" fill={SUN} />
        {rays.map(a => {
          const r = a * Math.PI / 180;
          return <line key={a}
            x1={16 + 5 * Math.cos(r)}   y1={8 + 5 * Math.sin(r)}
            x2={16 + 6.8 * Math.cos(r)} y2={8 + 6.8 * Math.sin(r)}
            stroke={SUN} strokeWidth="1.4" strokeLinecap="round" />;
        })}
        <path d="M2,18 Q0,18 0,15.5 Q0,13 3,12.5 Q3.5,10 7.5,10 Q11.5,10 12,12.5 Q15.5,12.5 15.5,15.5 Q15.5,18 12,18 Z" fill={CLD} />
      </svg>
    );
  }

  if (c.includes('mostly')) {
    return (
      <svg width={size} height={size} viewBox={v} fill="none">
        <circle cx="17" cy="7" r="3.5" fill={SUN} opacity="0.85" />
        <path d="M2,18 Q0,18 0,15 Q0,12 3.5,11.5 Q4,8.5 9,8.5 Q14,8.5 14.5,11.5 Q19,11.5 19,15 Q19,18 14.5,18 Z" fill={CLD} />
      </svg>
    );
  }

  if (c.includes('snow') || c.includes('flurr')) {
    return (
      <svg width={size} height={size} viewBox={v} fill="none">
        <path d="M3,14 Q1,14 1,11.5 Q1,9 4,8.5 Q4.5,6 8,6 Q11.5,6 12,8.5 Q15.5,8.5 15.5,11.5 Q15.5,14 12,14 Z" fill={CLD} />
        <circle cx="5"  cy="17.5" r="1.3" fill={SNW} />
        <circle cx="10" cy="19"   r="1.3" fill={SNW} />
        <circle cx="15" cy="17.5" r="1.3" fill={SNW} />
      </svg>
    );
  }

  if (c.includes('rain') || c.includes('shower')) {
    return (
      <svg width={size} height={size} viewBox={v} fill="none">
        <path d="M3,13 Q1,13 1,10.5 Q1,8 4,7.5 Q4.5,5 8,5 Q11.5,5 12,7.5 Q15.5,7.5 15.5,10.5 Q15.5,13 12,13 Z" fill={CLD} />
        <line x1="4.5"  y1="15"  x2="3.5"  y2="19" stroke={RN} strokeWidth="1.6" strokeLinecap="round" />
        <line x1="9"    y1="15"  x2="8"    y2="19" stroke={RN} strokeWidth="1.6" strokeLinecap="round" />
        <line x1="13.5" y1="15"  x2="12.5" y2="19" stroke={RN} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  // Cloudy / Overcast
  return (
    <svg width={size} height={size} viewBox={v} fill="none">
      <path d="M3,17 Q0.5,17 0.5,14 Q0.5,11 4,10.5 Q4.5,8 9,8 Q13.5,8 14,10.5 Q19,10.5 19,14 Q19,17 14,17 Z" fill={CLD} />
    </svg>
  );
}
