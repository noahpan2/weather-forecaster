import { useState, useMemo } from 'react';
import { P, SOURCES, DOY0 } from './constants.js';
import { normals, disp } from './utils/temps.js';
import { blendedAt, spreadAt, dailyStats } from './utils/hourly.js';
import { HOURLY } from './data/mockData.js';
import { computeForecastDays } from './data/forecast.js';
import { ConfidenceBadge } from './components/ConfidenceBadge.jsx';
import { PrecipBar }       from './components/PrecipBar.jsx';
import { HourlyChart }     from './components/HourlyChart.jsx';
import { WeekList }        from './components/WeekList.jsx';
import { ExtendedChart }   from './components/ExtendedChart.jsx';
import { HoverCard }       from './components/HoverCard.jsx';

export function App() {
  const [sources,  setSources]  = useState(SOURCES.map(s => ({ ...s, enabled: true })));
  const [unit,     setUnit]     = useState('F');
  const [showSrcs, setShowSrcs] = useState(false);
  const [hovHour,  setHovHour]  = useState(null);
  const [hovDay,   setHovDay]   = useState(null);
  const [currentTime]           = useState(14);

  const toggleSrc = id => setSources(p => p.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  const eIds = sources.filter(s => s.enabled).map(s => s.id);

  const fdays = useMemo(() => computeForecastDays(eIds), [eIds.join(',')]);

  const heroTemp = useMemo(() => {
    if (hovDay !== null) return disp(fdays[hovDay].bH, unit);
    return blendedAt(hovHour ?? currentTime, eIds, unit);
  }, [hovDay, hovHour, unit, eIds.join(','), fdays]);

  const heroSpread = hovDay === null ? spreadAt(hovHour ?? currentTime, eIds, unit) : 0;

  const heroLabel = hovDay !== null
    ? `${fdays[hovDay].dayName} · ${fdays[hovDay].monthDay} — Forecast High`
    : (() => {
        const h  = hovHour ?? currentTime;
        const hr = h === 0 ? 12 : h <= 12 ? h : h - 12;
        return `${hr}:00 ${h < 12 ? 'AM' : 'PM'}`;
      })();

  const stats  = dailyStats(eIds, unit);
  const todayN = normals(DOY0);

  return (
    <div style={{ minHeight: '100vh', background: P.bg, color: P.t2 }}>
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 28px 64px' }}>

        {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
        <div className="fu" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '28px 0 0',
        }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: P.t3, letterSpacing: '-0.01em' }}>
            Toronto
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="unit-seg">
              <button className={`unit-btn${unit === 'F' ? ' active' : ''}`} onClick={() => setUnit('F')}>°F</button>
              <button className={`unit-btn${unit === 'C' ? ' active' : ''}`} onClick={() => setUnit('C')}>°C</button>
            </div>
            <button className={`src-btn${showSrcs ? ' active' : ''}`} onClick={() => setShowSrcs(!showSrcs)}>
              {eIds.length}/5 sources
            </button>
          </div>
        </div>

        {/* ══ SOURCE PANEL ════════════════════════════════════════════════════ */}
        {showSrcs && (
          <div className="fu card" style={{ marginTop: 16, padding: '20px 22px' }}>
            <div className="card-label" style={{ marginBottom: 14 }}>Data Sources</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {sources.map(s => (
                <div key={s.id} className="src-pill" onClick={() => toggleSrc(s.id)} style={{
                  borderColor: s.enabled ? `${s.color}70` : P.border,
                  background:  s.enabled ? `${s.color}12` : '#FAFAF8',
                  color:       s.enabled ? P.t1 : P.t4,
                  opacity:     s.enabled ? 1 : 0.55,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.enabled ? s.color : P.t5 }} />
                  <span>{s.name}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: s.enabled ? s.color : P.t5 }}>
                    {s.maxDays}d
                  </span>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 14, fontSize: 13, color: P.t4, lineHeight: 1.55 }}>
              Toggle sources to control blending. The source count dots on the 16-day chart show the natural tapering of forecast horizons.
            </p>
          </div>
        )}

        {/* ══ CURRENT CONDITIONS ══════════════════════════════════════════════ */}
        <div className="fu d1" style={{ textAlign: 'left', padding: '44px 0 32px' }}>

          {/* Temperature row: temp + hi/lo inline, left-aligned */}
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center' }}>

              <div style={{
                fontSize: 112, fontWeight: 300, letterSpacing: '-0.04em', lineHeight: 1,
                color: P.t1, fontFamily: "'IBM Plex Sans', sans-serif",
              }}>
                {heroTemp !== null ? Math.round(heroTemp) : '—'}
                <span style={{ fontSize: 32, fontWeight: 300, color: P.t4, verticalAlign: 'top', position: 'relative', top: 11 }}>°</span>
              </div>

              {/* Hi / Lo — same line, vertically centered, close off the right of the number */}
              <div style={{ display: 'flex', gap: 28, paddingLeft: 28, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: P.t5, fontFamily: 'IBM Plex Mono, monospace', marginBottom: 3 }}>
                    Today's High
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: P.fHigh, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>
                    {stats.h !== null ? `${stats.h}°` : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: P.t5, fontFamily: 'IBM Plex Mono, monospace', marginBottom: 3 }}>
                    Overnight Low
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: P.fLow, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>
                    {stats.l !== null ? `${stats.l}°` : '—'}
                  </div>
                </div>
            </div>
          </div>
        </div>

          {/* Condition + time label */}
          <div style={{ marginTop: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 600, color: P.t3 }}>Mostly Cloudy</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'IBM Plex Mono, monospace', color: P.t4, marginBottom: 18 }}>
            {heroLabel}
          </div>

          {/* Weather narrative */}
          <p style={{ fontSize: 16, color: P.t3, lineHeight: 1.4, maxWidth: 300, margin: '0 0 20px', fontWeight: 400 }}>
            Mostly cloudy for the hour, with light snow expected this evening.
          </p>

          {/* Confidence badge */}
          {eIds.length > 1 && hovDay === null && (
            <div style={{ marginBottom: 24 }}>
              <ConfidenceBadge spread={heroSpread} unit={unit} />
            </div>
          )}

          {/* Stats strip */}
          <div style={{
            display: 'inline-flex', gap: 0, borderRadius: 12,
            border: `1.5px solid ${P.border}`, overflow: 'hidden', background: P.card,
          }}>
            {[
              { label: 'High',     value: stats.h !== null ? `${stats.h}°` : '—', color: P.t1    },
              { label: 'Low',      value: stats.l !== null ? `${stats.l}°` : '—', color: P.t3    },
              { label: 'Avg High', value: `${disp(todayN.avgH, unit)}°`,           color: P.orange },
              { label: 'Avg Low',  value: `${disp(todayN.avgL, unit)}°`,           color: P.orange },
            ].map((item, i) => (
              <div key={item.label} style={{
                padding: '14px 22px', borderLeft: i > 0 ? `1px solid ${P.border}` : 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
              }}>
                <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: P.t5, fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
                <span style={{ fontSize: 18, fontWeight: 500, color: item.color, fontFamily: 'IBM Plex Mono, monospace' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ══ 10-DAY OUTLOOK ══════════════════════════════════════════════════ */}
        <div className="fu d4 card" style={{ marginBottom: 16, overflow: 'hidden' }}>
          <div className="card-label" style={{ padding: '20px 22px 8px' }}>10-Day Outlook</div>
          <WeekList fdays={fdays} unit={unit} />
          <div style={{ height: 8 }} />
        </div>

        {/* ══ PRECIPITATION NOWCAST ═══════════════════════════════════════════ */}
        <div className="fu d2 card" style={{ padding: '20px 22px', marginBottom: 16 }}>
          <div className="card-label" style={{ marginBottom: 10 }}>Precipitation · Next Hour</div>
          <PrecipBar unit={unit} />
        </div>

        {/* ══ 24-HOUR CHART ═══════════════════════════════════════════════════ */}
        <div className="fu d3 card" style={{ padding: '22px 16px 18px', marginBottom: 16 }}>
          <div className="card-label" style={{ paddingLeft: 24, marginBottom: 16 }}>24-Hour Temperature · Blended Forecast</div>
          <HourlyChart
            sources={sources} unit={unit} currentTime={currentTime}
            hovHour={hovHour} setHovHour={setHovHour}
          />
        </div>

        {/* Source detail strip (24h hover) */}
        {hovHour !== null && eIds.length > 1 && (
          <div style={{
            marginBottom: 16, padding: '13px 22px',
            background: '#fff', border: `1.5px solid ${P.border}`, borderRadius: 10,
            display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center',
          }}>
            {sources.filter(s => s.enabled).map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: 12, color: P.t3, fontWeight: 500 }}>{s.name}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: P.t1, fontFamily: 'IBM Plex Mono, monospace' }}>
                  {disp(HOURLY[s.id][hovHour], unit)}°
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ══ 16-DAY EXTENDED FORECAST ════════════════════════════════════════ */}
        <div className="fu d5 card" style={{ padding: '22px 16px 18px', marginBottom: 16 }}>
          <div className="card-label" style={{ paddingLeft: 28, marginBottom: 16 }}>
            16-Day Extended Forecast · High &amp; Low vs. Historical
          </div>
          <ExtendedChart fdays={fdays} unit={unit} hovDay={hovDay} setHovDay={setHovDay} />
          <div style={{ display: 'flex', gap: 16, paddingLeft: 44, flexWrap: 'wrap', alignItems: 'center', marginTop: 14 }}>
            {[
              { swatch: <div style={{ width: 16, height: 2.5, background: P.fHigh, borderRadius: 2 }} />, label: 'Forecast High',    color: P.t3     },
              { swatch: <div style={{ width: 16, height: 2.5, background: P.fLow,  borderRadius: 2 }} />, label: 'Forecast Low',     color: P.t3     },
              { swatch: <div style={{ width: 16, height: 0, borderTop: `1.5px dashed ${P.orange}`, opacity: 0.65 }} />,              label: 'Historical Avg',   color: P.orange },
              { swatch: <div style={{ width: 16, height: 10, background: `${P.blue}14`,   borderRadius: 2 }} />, label: 'Ensemble Spread', color: P.t4 },
              { swatch: <div style={{ width: 16, height: 10, background: `${P.orange}1A`, borderRadius: 2 }} />, label: 'Avg Band',        color: P.t4 },
            ].map(({ swatch, label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {swatch}
                <span style={{ fontSize: 11, color }}>{label}</span>
              </div>
            ))}
          </div>
          {hovDay !== null && <HoverCard day={fdays[hovDay]} unit={unit} />}
        </div>

        {/* ══ DETAILS GRID ════════════════════════════════════════════════════ */}
        <div className="fu d6 detail-grid" style={{ marginBottom: 40 }}>
          {[
            { label: 'PRECIPITATION', value: '20%',                                sub: 'Light snow 6–9 PM'                          },
            { label: 'WIND',          value: unit === 'F' ? '12 mph' : '19 km/h',  sub: `NW · gusts ${unit === 'F' ? '22 mph' : '35 km/h'}` },
            { label: 'HUMIDITY',      value: '68%',                                sub: `Dew pt ${unit === 'F' ? '22°F' : '-6°C'}`   },
            { label: 'PRESSURE',      value: '1018 mb',                            sub: 'Rising slowly'                              },
            { label: 'UV INDEX',      value: '1',                                  sub: 'Low · 7:01 AM – 6:09 PM'                   },
            { label: 'VISIBILITY',    value: unit === 'F' ? '10 mi' : '16 km',     sub: 'Good · may reduce in snow'                 },
          ].map(c => (
            <div key={c.label} className="detail-cell">
              <div className="card-label" style={{ marginBottom: 10 }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: P.t1, marginBottom: 4, fontFamily: 'IBM Plex Mono, monospace' }}>{c.value}</div>
              <div style={{ fontSize: 12, color: P.t4, lineHeight: 1.4 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
        <div className="fu d7" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: 20, borderTop: `1px solid ${P.border}`, flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ fontSize: 11, color: P.t5, fontFamily: 'IBM Plex Mono, monospace' }}>
            Updated 2:32 PM &middot; {eIds.length} of 5 sources &middot; ERA5 normals via Open-Meteo
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <a href="https://weatherkit.apple.com" style={{ fontSize: 11, color: P.t4, textDecoration: 'none' }}>
              Includes Apple&nbsp;Weather
            </a>
            <span style={{ fontSize: 12, color: P.t5, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500, letterSpacing: '0.04em' }}>
              NOAH · v0.3
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
