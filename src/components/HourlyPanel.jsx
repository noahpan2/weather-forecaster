import { P } from '../constants.js';
import { blendedAt } from '../utils/hourly.js';
import { WeatherIcon } from './WeatherIcon.jsx';
import { PanelChart } from './PanelChart.jsx';

const PERIODS = [
  { label: 'Afternoon', hours: [12,13,14,15,16,17], condition: 'Mostly Cloudy' },
  { label: 'Evening',   hours: [18,19,20,21,22,23], condition: 'Light Snow'    },
  { label: 'Overnight', hours: [0,1,2,3,4,5],       condition: 'Cloudy'        },
  { label: 'Morning',   hours: [6,7,8,9,10,11],     condition: 'Partly Cloudy' },
];

export function HourlyPanel({ sources, unit, currentTime }) {
  const eIds = sources.filter(s => s.enabled).map(s => s.id);

  const periodTemp = hours => {
    const vals = hours.map(h => blendedAt(h, eIds, unit)).filter(v => v !== null);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  return (
    <div>
      <p style={{ padding: '16px 22px 4px', fontSize: 15, color: P.t3, lineHeight: 1.5 }}>
        Mostly cloudy through the afternoon, with light snow expected overnight.
      </p>

      {/* Period summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '12px 16px 4px' }}>
        {PERIODS.map(p => (
          <div key={p.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '10px 4px' }}>
            <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.05em', textTransform: 'uppercase', color: P.t4 }}>
              {p.label}
            </span>
            <WeatherIcon condition={p.condition} size={26} />
            <span style={{ fontSize: 18, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace', color: P.t1 }}>
              {periodTemp(p.hours)}°
            </span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ padding: '4px 8px 8px' }}>
        <PanelChart sources={sources} unit={unit} currentTime={currentTime} />
      </div>
    </div>
  );
}
