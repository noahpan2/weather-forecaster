import { P } from '../constants.js';
import { disp } from '../utils/temps.js';

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
            <span style={{ fontSize: 13, color: P.t4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {d.condition}
            </span>
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
