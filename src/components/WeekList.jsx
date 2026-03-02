import { P } from '../constants.js';
import { disp } from '../utils/temps.js';
import { WeatherIcon } from './WeatherIcon.jsx';

function Chevron() {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
      <path d="M1 1l5 5-5 5" stroke="#C8C6BE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
            <span className="week-day" style={{ fontWeight: i < 2 ? 700 : 400, color: i === 0 ? P.t1 : P.t3 }}>
              {d.dayName}
            </span>
            <WeatherIcon condition={d.condition} />
            <div className="bar-area">
              <div className="temp-track">
                <div className="temp-pill" style={{ left: `${left}%`, width: `${pillW}%` }} />
                <span className="bar-lo" style={{ left: `${left}%` }}>{lo}°</span>
                <span className="bar-hi" style={{ left: `${left + pillW}%` }}>{hi}°</span>
              </div>
            </div>
            <Chevron />
          </div>
        );
      })}
    </div>
  );
}
