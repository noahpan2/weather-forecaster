import { P } from '../constants.js';
import { disp } from '../utils/temps.js';

const SUN = '#F5A623';
const CLD = '#9AAABB';
const SNW = '#7AAAD0';
const RN  = '#5B8DB8';

function WeatherIcon({ condition }) {
  const c = (condition || '').toLowerCase();
  const sz = 20;
  const v  = '0 0 20 20';

  if (c === 'sunny') {
    const rays = [0, 45, 90, 135, 180, 225, 270, 315];
    return (
      <svg width={sz} height={sz} viewBox={v} fill="none">
        <circle cx="10" cy="10" r="4" fill={SUN} />
        {rays.map(a => {
          const r = a * Math.PI / 180;
          return <line key={a}
            x1={10 + 5.5 * Math.cos(r)} y1={10 + 5.5 * Math.sin(r)}
            x2={10 + 8   * Math.cos(r)} y2={10 + 8   * Math.sin(r)}
            stroke={SUN} strokeWidth="1.5" strokeLinecap="round" />;
        })}
      </svg>
    );
  }

  if (c.includes('partly')) {
    const rays = [0, 60, 120, 180, 240, 300];
    return (
      <svg width={sz} height={sz} viewBox={v} fill="none">
        <circle cx="13.5" cy="6.5" r="3" fill={SUN} />
        {rays.map(a => {
          const r = a * Math.PI / 180;
          return <line key={a}
            x1={13.5 + 4.2 * Math.cos(r)} y1={6.5 + 4.2 * Math.sin(r)}
            x2={13.5 + 5.8 * Math.cos(r)} y2={6.5 + 5.8 * Math.sin(r)}
            stroke={SUN} strokeWidth="1.2" strokeLinecap="round" />;
        })}
        <path d="M1.5,15.5 Q0,15.5 0,13.5 Q0,11.5 2.5,11 Q3,9 6.5,9 Q10,9 10.5,11 Q13.5,11 13.5,13.5 Q13.5,15.5 10.5,15.5 Z" fill={CLD} />
      </svg>
    );
  }

  if (c.includes('mostly')) {
    return (
      <svg width={sz} height={sz} viewBox={v} fill="none">
        <circle cx="14" cy="6" r="3" fill={SUN} opacity="0.85" />
        <path d="M2,15.5 Q0,15.5 0,12.5 Q0,10 3,9.5 Q3.5,7 7.5,7 Q11.5,7 12,9.5 Q16,9.5 16,12.5 Q16,15.5 12,15.5 Z" fill={CLD} />
      </svg>
    );
  }

  if (c.includes('snow') || c.includes('flurr')) {
    return (
      <svg width={sz} height={sz} viewBox={v} fill="none">
        <path d="M2.5,12.5 Q1,12.5 1,10.5 Q1,8.5 3.5,8 Q4,6.5 7,6.5 Q10,6.5 10.5,8 Q13.5,8 13.5,10.5 Q13.5,12.5 10.5,12.5 Z" fill={CLD} />
        <circle cx="4.5"  cy="15.5" r="1.2" fill={SNW} />
        <circle cx="9"    cy="17"   r="1.2" fill={SNW} />
        <circle cx="13.5" cy="15.5" r="1.2" fill={SNW} />
      </svg>
    );
  }

  if (c.includes('rain') || c.includes('shower')) {
    return (
      <svg width={sz} height={sz} viewBox={v} fill="none">
        <path d="M2.5,11.5 Q1,11.5 1,9.5 Q1,7.5 3.5,7 Q4,5.5 7,5.5 Q10,5.5 10.5,7 Q13.5,7 13.5,9.5 Q13.5,11.5 10.5,11.5 Z" fill={CLD} />
        <line x1="4"   y1="13.5" x2="3"   y2="17" stroke={RN} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7.5" y1="13.5" x2="6.5" y2="17" stroke={RN} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="11"  y1="13.5" x2="10"  y2="17" stroke={RN} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  // Cloudy / Overcast
  return (
    <svg width={sz} height={sz} viewBox={v} fill="none">
      <path d="M2.5,14.5 Q0.5,14.5 0.5,12 Q0.5,9.5 3.5,9 Q4,7 8,7 Q12,7 12.5,9 Q17,9 17,12 Q17,14.5 12.5,14.5 Z" fill={CLD} />
    </svg>
  );
}

export function WeekList({ fdays, unit }) {
  const days = fdays.slice(0, 10);
  const temps = days.flatMap(d => [disp(d.bH, unit), disp(d.bL, unit)]);
  const wMin = Math.min(...temps), wMax = Math.max(...temps);
  const wRange = wMax - wMin || 1;

  return (
    <div>
      {days.map((d, i) => {
        const hi = disp(d.bH, unit), lo = disp(d.bL, unit);
        const left  = (lo - wMin) / wRange * 100;
        const width = (hi - lo)   / wRange * 100;
        const pillW = Math.max(width, 4);
        return (
          <div key={i} className="week-row">
            <span style={{ fontSize: 14, fontWeight: i < 2 ? 600 : 400, color: i === 0 ? P.t1 : P.t3 }}>
              {d.dayName}
            </span>
            <WeatherIcon condition={d.condition} />
            {/* Bar area — labels hug the pill's left (lo) and right (hi) edges */}
            <div className="bar-area">
              <div className="temp-track">
                <div className="temp-pill" style={{ left: `${left}%`, width: `${pillW}%` }} />
                <span className="bar-lo" style={{ left: `${left}%` }}>{lo}°</span>
                <span className="bar-hi" style={{ left: `${left + pillW}%` }}>{hi}°</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
