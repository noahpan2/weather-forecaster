import { P } from '../constants.js';
import { disp } from '../utils/temps.js';
import { SrcDots } from './SrcDots.jsx';

export function HoverCard({ day, unit }) {
  const bH = disp(day.bH, unit), bL = disp(day.bL, unit);
  const aH = disp(day.avgH, unit), aL = disp(day.avgL, unit);
  const dH = Math.round(bH - aH), dL = Math.round(bL - aL);
  const dc  = v => v > 0 ? P.fHigh : v < 0 ? P.fLow : P.t3;
  const col = { display: 'flex', flexDirection: 'column', gap: 4 };
  const lbl = { fontSize: 10, color: P.t5, fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const val = { fontSize: 15, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' };
  const sep = <div style={{ width: 1, background: P.border, alignSelf: 'stretch' }} />;

  return (
    <div style={{ marginTop: 16, padding: '16px 20px', background: P.bg, border: `1px solid ${P.border}`, borderRadius: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 15, color: P.t1 }}>{day.dayName}</span>
          <span style={{ fontSize: 13, color: P.t4, marginLeft: 8 }}>{day.monthDay}</span>
          <span style={{ fontSize: 12, color: P.t4, marginLeft: 10 }}>{day.condition}</span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={col}>
            <span style={lbl}>Forecast</span>
            <div>
              <span style={{ ...val, color: P.fHigh }}>{bH}°</span>
              <span style={{ color: P.t5, margin: '0 4px' }}>/</span>
              <span style={{ ...val, color: P.fLow }}>{bL}°</span>
            </div>
          </div>
          {sep}
          <div style={col}>
            <span style={{ ...lbl, color: P.orange }}>Hist. Avg</span>
            <div>
              <span style={{ ...val, color: P.orange }}>{aH}°</span>
              <span style={{ color: P.t5, margin: '0 4px' }}>/</span>
              <span style={{ ...val, color: P.orange }}>{aL}°</span>
            </div>
          </div>
          {sep}
          <div style={col}><span style={lbl}>Δ High</span><span style={{ ...val, color: dc(dH) }}>{dH > 0 ? '+' : ''}{dH}°</span></div>
          <div style={col}><span style={lbl}>Δ Low</span> <span style={{ ...val, color: dc(dL) }}>{dL > 0 ? '+' : ''}{dL}°</span></div>
          {sep}
          <div style={col}>
            <span style={lbl}>Sources</span>
            <div style={{ marginTop: 2 }}>
              <SrcDots availIds={day.availIds} activeIds={day.enabledAvail} size={7} gap={4} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
