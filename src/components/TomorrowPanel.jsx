import { P } from '../constants.js';
import { disp } from '../utils/temps.js';
import { WeatherIcon } from './WeatherIcon.jsx';

export function TomorrowPanel({ fdays, unit }) {
  const tom = fdays[1];
  if (!tom) return null;

  const hi = disp(tom.bH, unit);
  const lo = disp(tom.bL, unit);
  // Estimate period temps from the day's high/low
  const mid = v => disp(v, unit);
  const periods = [
    { label: 'Overnight', condition: 'Cloudy',        temp: lo },
    { label: 'Morning',   condition: 'Partly Cloudy', temp: mid(tom.bL * 0.55 + tom.bH * 0.45) },
    { label: 'Afternoon', condition: tom.condition,   temp: hi },
    { label: 'Evening',   condition: 'Mostly Cloudy', temp: mid(tom.bH * 0.65 + tom.bL * 0.35) },
  ];

  return (
    <div>
      <p style={{ padding: '16px 22px 4px', fontSize: 15, color: P.t3, lineHeight: 1.5 }}>
        {tom.condition} — high of {hi}°, dropping to {lo}° overnight.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '12px 16px 20px' }}>
        {periods.map(p => (
          <div key={p.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '10px 4px' }}>
            <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em', textTransform: 'uppercase', color: P.t4 }}>
              {p.label}
            </span>
            <WeatherIcon condition={p.condition} size={26} />
            <span style={{ fontSize: 18, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace', color: P.t1 }}>
              {p.temp}°
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
