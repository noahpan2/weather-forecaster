import { useState, useRef } from "react";

// ---- DATA GENERATION ----

function toF(c) { return Math.round((c * 9 / 5 + 32) * 10) / 10; }
function tempDisplay(c, unit) { return unit === "F" ? Math.round(toF(c)) : Math.round(c * 10) / 10; }

// Toronto historical normals (approximate, per month-day)
// Based on typical climate data for Toronto Pearson
function getHistoricalNormals(dayOfYear) {
  // Approximate sinusoidal model for Toronto
  // Avg high peaks ~27°C late July (day ~205), low ~-3°C late Jan (day ~25)
  // Avg low peaks ~18°C late July, low ~-10°C late Jan
  const highAmp = 16.5;
  const highMean = 11.5;
  const lowAmp = 14.5;
  const lowMean = 3;
  const phase = (dayOfYear - 205) / 365 * Math.PI * 2;
  const avgHigh = highMean + highAmp * Math.cos(phase);
  const avgLow = lowMean + lowAmp * Math.cos(phase);
  // Record-ish offsets for Toronto
  const recordHigh = avgHigh + 12 + Math.sin(dayOfYear * 0.15) * 3;
  const recordLow = avgLow - 14 + Math.cos(dayOfYear * 0.2) * 3;
  return { avgHigh, avgLow, recordHigh, recordLow };
}

function getDayOfYear(daysFromNow) {
  // Feb 27 = day 58
  return (58 + daysFromNow) % 365;
}

// Generate forecast data for up to 35 days
function generateForecast() {
  const days = [];
  const dayNames = ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May"];

  for (let d = 0; d < 35; d++) {
    const doy = getDayOfYear(d);
    const normals = getHistoricalNormals(doy);
    const date = new Date(2026, 1, 27 + d);
    const dayName = d === 0 ? "Today" : d === 1 ? "Tomorrow" : dayNames[date.getDay()];
    const monthDay = `${months[date.getMonth()]} ${date.getDate()}`;

    // Simulate forecast with some variance from normals
    const forecastVariance = Math.sin(d * 0.8) * 4 + Math.cos(d * 1.3) * 2;
    const forecastHigh = normals.avgHigh + forecastVariance + (Math.random() - 0.5) * 2;
    const forecastLow = normals.avgLow + forecastVariance * 0.7 + (Math.random() - 0.5) * 2;

    // Ensemble spread increases with forecast day
    const spreadFactor = Math.min(d * 0.3, 6);
    const ensembleHighRange = [forecastHigh - spreadFactor, forecastHigh + spreadFactor];
    const ensembleLowRange = [forecastLow - spreadFactor, forecastLow + spreadFactor];

    const conditions = ["Sunny", "Partly Cloudy", "Mostly Cloudy", "Snow", "Rain/Snow", "Cloudy", "Light Snow", "Clear"];
    const precips = [5, 10, 30, 80, 60, 40, 55, 0];

    days.push({
      day: d,
      dayName,
      monthDay,
      forecastHigh: Math.round(forecastHigh * 10) / 10,
      forecastLow: Math.round(forecastLow * 10) / 10,
      ensembleHighRange,
      ensembleLowRange,
      avgHigh: normals.avgHigh,
      avgLow: normals.avgLow,
      recordHigh: normals.recordHigh,
      recordLow: normals.recordLow,
      condition: conditions[d % conditions.length],
      precip: precips[d % precips.length],
    });
  }
  return days;
}

const FORECAST_DATA = generateForecast();

// Sources for today's 24-hour chart
const SOURCES = [
  { id: "open-meteo", name: "Open-Meteo", color: "#3B82C4" },
  { id: "pirate", name: "Pirate Weather", color: "#D4793A" },
  { id: "weatherkit", name: "WeatherKit", color: "#3A9E6B" },
  { id: "owm", name: "OpenWeather", color: "#8B5EC4" },
];

function generateSourceData(baseHigh, baseLow, seed) {
  const temps = [];
  for (let h = 0; h < 24; h++) {
    const progress = h / 23;
    const dayShape = Math.sin((progress - 0.25) * Math.PI * 2) * 0.5 + 0.5;
    const base = baseLow + (baseHigh - baseLow) * dayShape;
    const noise = Math.sin(h * seed * 0.7) * 1.2 + Math.cos(h * seed * 0.3) * 0.8;
    temps.push(Math.round((base + noise) * 10) / 10);
  }
  return temps;
}

const MOCK_C = {
  "open-meteo": generateSourceData(4, -3, 1.1),
  pirate: generateSourceData(5, -4, 1.4),
  weatherkit: generateSourceData(3, -2, 1.7),
  owm: generateSourceData(5, -3, 2.1),
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getData(sid, unit) { return unit === "F" ? MOCK_C[sid].map(toF) : MOCK_C[sid]; }
function getBlended(h, srcs, unit) {
  const a = srcs.filter(s => s.enabled);
  if (!a.length) return null;
  const v = a.map(s => getData(s.id, unit)[h]);
  return Math.round((v.reduce((x, y) => x + y, 0) / v.length) * 10) / 10;
}
function getRange(h, srcs, unit) {
  const a = srcs.filter(s => s.enabled);
  if (!a.length) return { min: 0, max: 0, spread: 0 };
  const v = a.map(s => getData(s.id, unit)[h]);
  return { min: Math.min(...v), max: Math.max(...v), spread: Math.max(...v) - Math.min(...v) };
}
function getDailyStats(srcs, unit) {
  const a = srcs.filter(s => s.enabled);
  if (!a.length) return { high: "--", low: "--", avgSpread: 0 };
  let highs = [], lows = [], spreads = [];
  a.forEach(s => { const d = getData(s.id, unit); highs.push(Math.max(...d)); lows.push(Math.min(...d)); });
  for (let h = 0; h < 24; h++) spreads.push(getRange(h, srcs, unit).spread);
  return {
    high: Math.round(highs.reduce((a, b) => a + b, 0) / highs.length * 10) / 10,
    low: Math.round(lows.reduce((a, b) => a + b, 0) / lows.length * 10) / 10,
    avgSpread: Math.round(spreads.reduce((a, b) => a + b, 0) / spreads.length * 10) / 10,
  };
}

function ConfidenceBadge({ spread, unit }) {
  const t1 = unit === "F" ? 2.7 : 1.5, t2 = unit === "F" ? 5.4 : 3;
  const level = spread < t1 ? "High" : spread < t2 ? "Med" : "Low";
  const s = { High: { bg: "#E8F5EC", c: "#2D7A4F", b: "#C2E5CC" }, Med: { bg: "#FEF6E4", c: "#9A7B2E", b: "#F0DFA4" }, Low: { bg: "#FDE8E4", c: "#B04A3A", b: "#F0C0B8" } }[level];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: s.bg, color: s.c, border: `1px solid ${s.b}`, fontSize: 12, fontWeight: 600 }}>
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.c, opacity: 0.7 }} />{level} agreement
  </span>;
}

// ---- EXTENDED FORECAST CHART ----
function ExtendedForecastChart({ data, unit, daysToShow, hoveredDay, setHoveredDay }) {
  const W = 700, H = 300, padX = 44, padY = 28, padBottom = 48;

  const slice = data.slice(0, daysToShow);
  const allVals = slice.flatMap(d => {
    const rH = tempDisplay(d.recordHigh, unit);
    const rL = tempDisplay(d.recordLow, unit);
    const eH = tempDisplay(d.ensembleHighRange[1], unit);
    const eL = tempDisplay(d.ensembleLowRange[0], unit);
    return [rH, rL, eH, eL];
  });
  const gMin = Math.min(...allVals) - 4;
  const gMax = Math.max(...allVals) + 4;

  const toX = (i) => padX + (i / (slice.length - 1)) * (W - padX * 2);
  const toY = (t) => padY + ((gMax - t) / (gMax - gMin)) * (H - padY - padBottom);

  // Build paths
  const buildLine = (accessor) => slice.map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(accessor(d))}`).join(" ");
  const buildBand = (topAccessor, bottomAccessor) => {
    const top = slice.map((d, i) => `${toX(i)},${toY(topAccessor(d))}`);
    const bot = slice.map((d, i) => `${toX(i)},${toY(bottomAccessor(d))}`).reverse();
    return [...top, ...bot].join(" ");
  };

  const fH = d => tempDisplay(d.forecastHigh, unit);
  const fL = d => tempDisplay(d.forecastLow, unit);
  const aH = d => tempDisplay(d.avgHigh, unit);
  const aL = d => tempDisplay(d.avgLow, unit);
  const eHi = d => tempDisplay(d.ensembleHighRange[1], unit);
  const eLo = d => tempDisplay(d.ensembleLowRange[0], unit);

  // Grid
  const gridStep = unit === "F" ? 10 : 5;
  const gridStart = Math.floor(gMin / gridStep) * gridStep;
  const gridEnd = Math.ceil(gMax / gridStep) * gridStep;
  const gridLines = [];
  for (let t = gridStart; t <= gridEnd; t += gridStep) gridLines.push(t);

  // Confidence zone boundaries
  const reliableDay = 7;
  const moderateDay = 16;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      {/* Confidence zone backgrounds */}
      {daysToShow > reliableDay && (
        <rect x={toX(reliableDay)} y={padY - 8} width={toX(Math.min(moderateDay, daysToShow - 1)) - toX(reliableDay)} height={H - padY - padBottom + 16} fill="rgba(234,179,8,0.04)" rx="4" />
      )}
      {daysToShow > moderateDay && (
        <rect x={toX(moderateDay)} y={padY - 8} width={toX(daysToShow - 1) - toX(moderateDay)} height={H - padY - padBottom + 16} fill="rgba(220,80,60,0.04)" rx="4" />
      )}

      {/* Grid lines */}
      {gridLines.map(t => (
        <g key={t}>
          <line x1={padX} y1={toY(t)} x2={W - padX} y2={toY(t)} stroke="#EEEDEA" strokeWidth="1" />
          <text x={padX - 8} y={toY(t) + 4} textAnchor="end" fill="#B0B5BF" fontSize="10" fontFamily="JetBrains Mono, monospace">{t}°</text>
        </g>
      ))}

      {/* Freezing line */}
      {(() => {
        const freezeT = unit === "F" ? 32 : 0;
        return gMin < freezeT && gMax > freezeT ? (
          <line x1={padX} y1={toY(freezeT)} x2={W - padX} y2={toY(freezeT)} stroke="#94B8D4" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.5" />
        ) : null;
      })()}

      {/* Ensemble spread band */}
      <polygon points={buildBand(eHi, eLo)} fill="rgba(59,130,196,0.06)" stroke="none" />

      {/* Historical average band */}
      <polygon points={buildBand(aH, aL)} fill="rgba(180,160,130,0.10)" stroke="none" />

      {/* Historical avg lines */}
      <path d={buildLine(aH)} fill="none" stroke="#C4A670" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.6" />
      <path d={buildLine(aL)} fill="none" stroke="#C4A670" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.6" />

      {/* Forecast high/low lines */}
      <path d={buildLine(fH)} fill="none" stroke="#D4543A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={buildLine(fL)} fill="none" stroke="#3B82C4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Day labels */}
      {slice.map((d, i) => {
        const showLabel = daysToShow <= 16 ? true : i % (daysToShow > 21 ? 3 : 2) === 0 || i === slice.length - 1;
        if (!showLabel) return null;
        return (
          <g key={i}>
            <text x={toX(i)} y={H - padBottom + 16} textAnchor="middle" fill="#7C8494" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight={d.day < 2 ? "600" : "400"}>
              {daysToShow <= 16 ? d.dayName : d.monthDay}
            </text>
            {daysToShow > 7 && (
              <text x={toX(i)} y={H - padBottom + 28} textAnchor="middle" fill="#B0B5BF" fontSize="9" fontFamily="JetBrains Mono, monospace">
                {daysToShow <= 16 ? d.monthDay : ""}
              </text>
            )}
          </g>
        );
      })}

      {/* Confidence zone labels at top */}
      {daysToShow > reliableDay && (
        <text x={toX(Math.min(reliableDay + 2, moderateDay - 1))} y={padY - 2} textAnchor="middle" fill="#B89E2B" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="500" opacity="0.7">
          MODERATE CONFIDENCE
        </text>
      )}
      {daysToShow > moderateDay && (
        <text x={toX(moderateDay + Math.floor((daysToShow - 1 - moderateDay) / 2))} y={padY - 2} textAnchor="middle" fill="#C05A4A" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="500" opacity="0.7">
          LOW CONFIDENCE
        </text>
      )}

      {/* Hover */}
      {hoveredDay !== null && hoveredDay < slice.length && (() => {
        const d = slice[hoveredDay];
        const x = toX(hoveredDay);
        return (
          <>
            <line x1={x} y1={padY} x2={x} y2={H - padBottom} stroke="#1E2432" strokeWidth="1" opacity="0.15" />
            <circle cx={x} cy={toY(fH(d))} r="5" fill="#D4543A" stroke="#fff" strokeWidth="2" />
            <circle cx={x} cy={toY(fL(d))} r="5" fill="#3B82C4" stroke="#fff" strokeWidth="2" />
            <circle cx={x} cy={toY(aH(d))} r="3.5" fill="#C4A670" stroke="#fff" strokeWidth="1.5" />
            <circle cx={x} cy={toY(aL(d))} r="3.5" fill="#C4A670" stroke="#fff" strokeWidth="1.5" />
          </>
        );
      })()}

      {/* Hover zones */}
      {slice.map((_, i) => (
        <rect key={i} x={toX(i) - (W - padX * 2) / slice.length / 2} y={0} width={(W - padX * 2) / slice.length} height={H} fill="transparent" style={{ cursor: "crosshair" }} onMouseEnter={() => setHoveredDay(i)} onMouseLeave={() => setHoveredDay(null)} />
      ))}
    </svg>
  );
}

// ---- MAIN APP ----
export default function WeatherApp() {
  const [sources, setSources] = useState(SOURCES.map(s => ({ ...s, enabled: true })));
  const [hoveredHour, setHoveredHour] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [unit, setUnit] = useState("F");
  const [forecastRange, setForecastRange] = useState(16);
  const [currentTime] = useState(14);

  const toggleSource = (id) => setSources(p => p.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  const stats = getDailyStats(sources, unit);
  const activeCount = sources.filter(s => s.enabled).length;
  const todayNormals = getHistoricalNormals(getDayOfYear(0));

  // 24h chart params
  const chartW = 680, chartH = 200, padX = 36, padY = 24;
  const allTemps24 = Object.keys(MOCK_C).flatMap(id => getData(id, unit));
  const gMin24 = Math.min(...allTemps24) - 2, gMax24 = Math.max(...allTemps24) + 2;
  const toX24 = (h) => padX + (h / 23) * (chartW - padX * 2);
  const toY24 = (t) => padY + ((gMax24 - t) / (gMax24 - gMin24)) * (chartH - padY * 2);
  const buildPath24 = (sid) => getData(sid, unit).map((t, h) => `${h === 0 ? "M" : "L"} ${toX24(h)} ${toY24(t)}`).join(" ");
  const buildBand24 = () => {
    const top = [], bot = [];
    for (let h = 0; h < 24; h++) { const r = getRange(h, sources, unit); top.push(`${toX24(h)},${toY24(r.max)}`); bot.push(`${toX24(h)},${toY24(r.min)}`); }
    return [...top, ...bot.reverse()].join(" ");
  };
  const buildBlended24 = () => HOURS.map(h => { const v = getBlended(h, sources, unit); return v === null ? "" : `${h === 0 ? "M" : "L"} ${toX24(h)} ${toY24(v)}`; }).join(" ");

  const displayHour = hoveredHour !== null ? hoveredHour : currentTime;
  const displayTemp = getBlended(displayHour, sources, unit);
  const displayRange = getRange(displayHour, sources, unit);

  const gridStep24 = unit === "F" ? 5 : 2;
  const gs24 = Math.floor(gMin24 / gridStep24) * gridStep24;
  const ge24 = Math.ceil(gMax24 / gridStep24) * gridStep24;
  const gl24 = []; for (let t = gs24; t <= ge24; t += gridStep24) gl24.push(t);

  // Hovered day data for the detail card
  const hoveredDayData = hoveredDay !== null && hoveredDay < FORECAST_DATA.length ? FORECAST_DATA[hoveredDay] : null;

  return (
    <div style={{ minHeight: "100vh", background: "#F6F5F1", color: "#1E2432", fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.45s ease-out both; }
        .d1{animation-delay:.04s} .d2{animation-delay:.08s} .d3{animation-delay:.12s} .d4{animation-delay:.16s} .d5{animation-delay:.2s}
        .source-pill { transition: all 0.15s ease; cursor: pointer; user-select: none; }
        .source-pill:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); transform: translateY(-1px); }
        .range-btn { transition: all 0.12s ease; cursor: pointer; user-select: none; }
        .range-btn:hover { background: rgba(0,0,0,0.06) !important; }
        .unit-btn { transition: all 0.15s ease; cursor: pointer; user-select: none; font-family: 'JetBrains Mono', monospace; }
      `}</style>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "44px 28px 64px" }}>

        {/* Header */}
        <div className="fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 2 }}>Toronto</h1>
            <div style={{ fontSize: 14, color: "#7C8494" }}>Friday, February 27 · Mostly cloudy, light snow this evening</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1.5px solid #D8D6D0", background: "#EEEDEA" }}>
              <button className="unit-btn" onClick={() => setUnit("F")} style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600, border: "none", background: unit === "F" ? "#1E2432" : "transparent", color: unit === "F" ? "#F6F5F1" : "#7C8494", borderRadius: unit === "F" ? 6 : 0 }}>°F</button>
              <button className="unit-btn" onClick={() => setUnit("C")} style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600, border: "none", background: unit === "C" ? "#1E2432" : "transparent", color: unit === "C" ? "#F6F5F1" : "#7C8494", borderRadius: unit === "C" ? 6 : 0 }}>°C</button>
            </div>
            <button onClick={() => setShowSourcePanel(!showSourcePanel)} style={{ background: showSourcePanel ? "#1E2432" : "#EEEDEA", border: "1.5px solid " + (showSourcePanel ? "#1E2432" : "#D8D6D0"), borderRadius: 8, padding: "6px 14px", color: showSourcePanel ? "#F6F5F1" : "#5A6172", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>
              {activeCount}/{sources.length} sources
            </button>
          </div>
        </div>

        {/* Source panel */}
        {showSourcePanel && (
          <div className="fade-up" style={{ marginBottom: 28, padding: "20px 24px", background: "#FFF", border: "1.5px solid #E4E2DC", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: "#9CA3AF", textTransform: "uppercase", marginBottom: 14 }}>Data Sources</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {sources.map(s => (
                <div key={s.id} className="source-pill" onClick={() => toggleSource(s.id)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${s.enabled ? s.color + "50" : "#E4E2DC"}`, background: s.enabled ? s.color + "0C" : "#FAFAF8", opacity: s.enabled ? 1 : 0.5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.enabled ? s.color : "#C8C6C0" }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: s.enabled ? "#1E2432" : "#9CA3AF" }}>{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="fade-up d1" style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <div style={{ fontSize: 108, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>
              {displayTemp !== null ? Math.round(displayTemp) : "--"}
              <span style={{ fontSize: 48, fontWeight: 600, color: "#9CA3AF" }}>°</span>
            </div>
            <div style={{ paddingBottom: 10 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 500, color: "#9CA3AF", marginBottom: 6 }}>
                {hoveredHour !== null ? `${hoveredHour.toString().padStart(2, "0")}:00` : "2:00 PM"}
              </div>
              <ConfidenceBadge spread={displayRange.spread} unit={unit} />
            </div>
          </div>
        </div>

        {/* Stats row with historical comparison */}
        <div className="fade-up d2" style={{ display: "flex", gap: 20, marginBottom: 36, flexWrap: "wrap" }}>
          {[
            { label: "High", value: `${stats.high}°`, bold: true },
            { label: "Low", value: `${stats.low}°`, bold: false },
            { label: "Avg High", value: `${tempDisplay(todayNormals.avgHigh, unit)}°`, color: "#C4A670" },
            { label: "Avg Low", value: `${tempDisplay(todayNormals.avgLow, unit)}°`, color: "#C4A670" },
            { label: "Record High", value: `${tempDisplay(todayNormals.recordHigh, unit)}°`, color: "#D4543A" },
            { label: "Record Low", value: `${tempDisplay(todayNormals.recordLow, unit)}°`, color: "#3B82C4" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500, letterSpacing: "0.06em", color: item.color || "#B0B5BF", textTransform: "uppercase" }}>{item.label}</span>
              <span style={{ fontSize: 18, fontWeight: item.bold ? 700 : 500, color: item.color || (item.bold ? "#1E2432" : "#6B7280") }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* 24-Hour chart */}
        <div className="fade-up d3" style={{ marginBottom: 32, background: "#FFF", border: "1.5px solid #E4E2DC", borderRadius: 16, padding: "24px 16px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: "#B0B5BF", textTransform: "uppercase", marginBottom: 16, paddingLeft: 20 }}>
            24-Hour Temperature · Blended Forecast
          </div>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", height: "auto" }}>
            {gl24.map(t => (
              <g key={t}>
                <line x1={padX} y1={toY24(t)} x2={chartW - padX} y2={toY24(t)} stroke="#EEEDEA" strokeWidth="1" />
                <text x={padX - 8} y={toY24(t) + 4} textAnchor="end" fill="#B0B5BF" fontSize="10" fontFamily="JetBrains Mono, monospace">{t}°</text>
              </g>
            ))}
            {/* Historical avg high/low lines for today */}
            {(() => {
              const ah = tempDisplay(todayNormals.avgHigh, unit);
              const al = tempDisplay(todayNormals.avgLow, unit);
              return <>
                {ah > gMin24 && ah < gMax24 && <line x1={padX} y1={toY24(ah)} x2={chartW - padX} y2={toY24(ah)} stroke="#C4A670" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.4" />}
                {al > gMin24 && al < gMax24 && <line x1={padX} y1={toY24(al)} x2={chartW - padX} y2={toY24(al)} stroke="#C4A670" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.4" />}
              </>;
            })()}
            {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
              <text key={h} x={toX24(h)} y={chartH - 2} textAnchor="middle" fill="#B0B5BF" fontSize="10" fontFamily="JetBrains Mono, monospace">
                {h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`}
              </text>
            ))}
            {activeCount > 1 && <polygon points={buildBand24()} fill="rgba(59,130,196,0.08)" />}
            {sources.filter(s => s.enabled).map(s => (
              <path key={s.id} d={buildPath24(s.id)} fill="none" stroke={s.color} strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {activeCount > 0 && <path d={buildBlended24()} fill="none" stroke="#1E2432" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
            <line x1={toX24(currentTime)} y1={padY - 4} x2={toX24(currentTime)} y2={chartH - padY + 4} stroke="#D4793A" strokeWidth="1.5" strokeDasharray="4,3" />
            <circle cx={toX24(currentTime)} cy={padY - 8} r="3.5" fill="#D4793A" />
            {hoveredHour !== null && <>
              <line x1={toX24(hoveredHour)} y1={padY} x2={toX24(hoveredHour)} y2={chartH - padY} stroke="#1E2432" strokeWidth="1" opacity="0.15" />
              {sources.filter(s => s.enabled).map(s => (
                <circle key={s.id} cx={toX24(hoveredHour)} cy={toY24(getData(s.id, unit)[hoveredHour])} r="4.5" fill={s.color} stroke="#fff" strokeWidth="2" />
              ))}
              {displayTemp !== null && <circle cx={toX24(hoveredHour)} cy={toY24(displayTemp)} r="6" fill="#1E2432" stroke="#fff" strokeWidth="2.5" />}
            </>}
            {HOURS.map(h => <rect key={h} x={toX24(h) - (chartW - padX * 2) / 48} y={0} width={(chartW - padX * 2) / 24} height={chartH} fill="transparent" style={{ cursor: "crosshair" }} onMouseEnter={() => setHoveredHour(h)} onMouseLeave={() => setHoveredHour(null)} />)}
          </svg>
          <div style={{ display: "flex", gap: 18, marginTop: 14, paddingLeft: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 18, height: 3, background: "#1E2432", borderRadius: 2 }} />
              <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>Blended</span>
            </div>
            {sources.filter(s => s.enabled).map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 18, height: 2.5, background: s.color, borderRadius: 2, opacity: 0.45 }} />
                <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>{s.name}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginLeft: 8 }}>
              <div style={{ width: 18, height: 0, borderTop: "1.5px dashed #C4A670" }} />
              <span style={{ fontSize: 12, color: "#C4A670", fontWeight: 500 }}>Historical avg</span>
            </div>
          </div>
        </div>

        {/* Extended Forecast */}
        <div className="fade-up d4" style={{ background: "#FFF", border: "1.5px solid #E4E2DC", borderRadius: 16, padding: "24px 16px 20px", marginBottom: 32, boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: 20, paddingRight: 16, marginBottom: 16 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: "#B0B5BF", textTransform: "uppercase" }}>
              Extended Forecast · High &amp; Low vs. Historical
            </div>
            <div style={{ display: "flex", gap: 4, borderRadius: 8, overflow: "hidden", border: "1.5px solid #E4E2DC", background: "#F6F5F1" }}>
              {[{ label: "7d", val: 7 }, { label: "16d", val: 16 }, { label: "35d", val: 35 }].map(r => (
                <button key={r.val} className="range-btn" onClick={() => setForecastRange(r.val)} style={{
                  padding: "5px 12px", fontSize: 12, fontWeight: 600, border: "none",
                  fontFamily: "'JetBrains Mono', monospace",
                  background: forecastRange === r.val ? "#1E2432" : "transparent",
                  color: forecastRange === r.val ? "#F6F5F1" : "#7C8494",
                  borderRadius: forecastRange === r.val ? 6 : 0,
                }}>{r.label}</button>
              ))}
            </div>
          </div>

          <ExtendedForecastChart data={FORECAST_DATA} unit={unit} daysToShow={forecastRange} hoveredDay={hoveredDay} setHoveredDay={setHoveredDay} />

          {/* Legend */}
          <div style={{ display: "flex", gap: 18, paddingLeft: 20, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 18, height: 3, background: "#D4543A", borderRadius: 2 }} />
              <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>Forecast High</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 18, height: 3, background: "#3B82C4", borderRadius: 2 }} />
              <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>Forecast Low</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 18, height: 0, borderTop: "1.5px dashed #C4A670" }} />
              <span style={{ fontSize: 12, color: "#C4A670", fontWeight: 500 }}>Historical Avg</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 18, height: 10, background: "rgba(59,130,196,0.1)", borderRadius: 2 }} />
              <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>Ensemble Spread</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 18, height: 10, background: "rgba(180,160,130,0.15)", borderRadius: 2 }} />
              <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>Avg High–Low Range</span>
            </div>
          </div>

          {/* Hover detail card */}
          {hoveredDayData && (
            <div style={{ marginTop: 14, padding: "14px 20px", background: "#F9F8F5", border: "1px solid #EEEDEA", borderRadius: 10, animation: "fadeUp 0.1s ease-out" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{hoveredDayData.dayName}</span>
                  <span style={{ color: "#9CA3AF", fontSize: 13, marginLeft: 8 }}>{hoveredDayData.monthDay}</span>
                  {hoveredDayData.day >= 16 && <span style={{ marginLeft: 10, fontSize: 11, color: "#B04A3A", fontWeight: 600, background: "#FDE8E4", padding: "2px 8px", borderRadius: 4 }}>Ensemble only</span>}
                </div>
                <div style={{ display: "flex", gap: 20 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#B0B5BF", textTransform: "uppercase", letterSpacing: "0.06em" }}>Fcst</div>
                    <div><span style={{ color: "#D4543A", fontWeight: 700, fontSize: 15 }}>{tempDisplay(hoveredDayData.forecastHigh, unit)}°</span> <span style={{ color: "#B0B5BF" }}>/</span> <span style={{ color: "#3B82C4", fontWeight: 700, fontSize: 15 }}>{tempDisplay(hoveredDayData.forecastLow, unit)}°</span></div>
                  </div>
                  <div style={{ width: 1, background: "#E4E2DC" }} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#C4A670", textTransform: "uppercase", letterSpacing: "0.06em" }}>Avg</div>
                    <div><span style={{ color: "#C4A670", fontWeight: 600, fontSize: 15 }}>{tempDisplay(hoveredDayData.avgHigh, unit)}°</span> <span style={{ color: "#D8D6D0" }}>/</span> <span style={{ color: "#C4A670", fontWeight: 600, fontSize: 15 }}>{tempDisplay(hoveredDayData.avgLow, unit)}°</span></div>
                  </div>
                  <div style={{ width: 1, background: "#E4E2DC" }} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>Δ High</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: tempDisplay(hoveredDayData.forecastHigh, unit) > tempDisplay(hoveredDayData.avgHigh, unit) ? "#D4543A" : "#3B82C4" }}>
                      {tempDisplay(hoveredDayData.forecastHigh, unit) > tempDisplay(hoveredDayData.avgHigh, unit) ? "+" : ""}
                      {Math.round(tempDisplay(hoveredDayData.forecastHigh, unit) - tempDisplay(hoveredDayData.avgHigh, unit))}°
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick stats cards */}
        <div className="fade-up d5" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 36 }}>
          {[
            { label: "Precip", value: "20%", sub: "Light snow 6–9 PM" },
            { label: "Wind", value: unit === "F" ? "12 mph" : "19 km/h", sub: `NW gusts to ${unit === "F" ? "22 mph" : "35 km/h"}` },
            { label: "Humidity", value: "68%", sub: `Dew point ${unit === "F" ? "22°" : "-6°"}` },
          ].map(card => (
            <div key={card.label} style={{ background: "#FFF", border: "1.5px solid #E4E2DC", borderRadius: 14, padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: "#B0B5BF", textTransform: "uppercase", marginBottom: 8 }}>{card.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{card.value}</div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="fade-up d5" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#C8C6C0" }}>
            Updated 2:32 PM · Blended from {activeCount} source{activeCount !== 1 ? "s" : ""} · Historical data via Open-Meteo ERA5
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#D0CEC8", fontWeight: 500, letterSpacing: "0.06em" }}>NOAH · v0.2</div>
        </div>
      </div>
    </div>
  );
}
