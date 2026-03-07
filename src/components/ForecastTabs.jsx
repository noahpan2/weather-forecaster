import { useState } from 'react';
import { P } from '../constants.js';
import { WeekList } from './WeekList.jsx';
import { HourlyPanel } from './HourlyPanel.jsx';
import { TomorrowPanel } from './TomorrowPanel.jsx';

const TABS = [
  { id: '10day',    label: '10 Days',     heading: '10-Day Outlook'  },
  { id: '24h',      label: 'Next 24 Hrs', heading: 'Next 24 Hours'   },
  { id: 'tomorrow', label: 'Tomorrow',    heading: 'Tomorrow'        },
];

export function ForecastTabs({ fdays, unit, sources, currentTime }) {
  const [tab, setTab] = useState('10day');

  return (
    <div className="fu d4 card forecast-tabs-card" style={{ marginBottom: 16, overflow: 'hidden' }}>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: `1.5px solid ${P.border}`, padding: '0 22px' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '15px 0',
              marginRight: 28,
              marginBottom: -1.5,
              background: 'none',
              border: 'none',
              borderBottom: tab === t.id ? `2px solid ${P.t1}` : '2px solid transparent',
              fontSize: 13,
              fontWeight: tab === t.id ? 700 : 500,
              fontFamily: 'IBM Plex Mono, monospace',
              letterSpacing: '0.02em',
              color: tab === t.id ? P.t1 : P.t4,
              cursor: 'pointer',
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Heading */}
      <div className="card-label" style={{ padding: '16px 22px 4px' }}>
        {TABS.find(t => t.id === tab).heading}
      </div>

      {tab === '10day'    && <><WeekList fdays={fdays} unit={unit} /><div style={{ height: 8 }} /></>}
      {tab === '24h'      && <HourlyPanel sources={sources} unit={unit} currentTime={currentTime} />}
      {tab === 'tomorrow' && <TomorrowPanel fdays={fdays} unit={unit} />}
    </div>
  );
}
