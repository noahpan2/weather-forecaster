import { SOURCES } from '../constants.js';

export function SrcDots({ availIds, activeIds, size = 5, gap = 3 }) {
  return (
    <div style={{ display: 'flex', gap, alignItems: 'center' }}>
      {SOURCES.map(s => {
        const on = availIds.includes(s.id) && activeIds.includes(s.id);
        return (
          <div key={s.id} style={{
            width: size, height: size, borderRadius: '50%',
            background: on ? s.color : 'transparent',
            border: `1.5px solid ${on ? s.color : '#CCC9BF'}`,
            opacity: on ? 1 : 0.38, transition: 'all 0.15s',
          }} />
        );
      })}
    </div>
  );
}
