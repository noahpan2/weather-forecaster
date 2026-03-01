import { useState, useRef } from "react";

const SOURCES = [
  { id: "open-meteo", name: "Open-Meteo", color: "#3B82C4" },
  { id: "pirate", name: "Pirate Weather", color: "#D4793A" },
  { id: "weatherkit", name: "WeatherKit", color: "#3A9E6B" },
  { id: "owm", name: "OpenWeather", color: "#8B5EC4" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function toF(c) {
  return Math.round(c * 9 / 5 + 32 * 10) / 10;
}

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

const MOCK_SOURCES_DATA_C = {
  "open-meteo": generateSourceData(4, -3, 1.1),
  pirate: generateSourceData(5, -4, 1.4),
  weatherkit: generateSourceData(3, -2, 1.7),
  owm: generateSourceData(5, -3, 2.1),
};

function getData(sourceId, unit) {
  const c = MOCK_SOURCES_DATA_C[sourceId];
  return unit === "F" ? c.map(toF) : c;
}

function getBlended(hour, enabledSources, unit) {
  const active = enabledSources.filter((s) => s.enabled);
  if (active.length === 0) return null;
  const values = active.map((s) => getData(s.id, unit)[hour]);
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function getRange(hour, enabledSources, unit) {
  const active = enabledSources.filter((s) => s.enabled);
  if (active.length === 0) return { min: 0, max: 0, spread: 0 };
  const values = active.map((s) => getData(s.id, unit)[hour]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max, spread: Math.round((max - min) * 10) / 10 };
}

function getDailyStats(enabledSources, unit) {
  const active = enabledSources.filter((s) => s.enabled);
  if (active.length === 0) return { high: "--", low: "--", avgSpread: 0 };
  let allHighs = [];
  let allLows = [];
  let spreads = [];
  active.forEach((s) => {
    const data = getData(s.id, unit);
    allHighs.push(Math.max(...data));
    allLows.push(Math.min(...data));
  });
  for (let h = 0; h < 24; h++) {
    const range = getRange(h, enabledSources, unit);
    spreads.push(range.spread);
  }
  return {
    high: Math.round((allHighs.reduce((a, b) => a + b, 0) / allHighs.length) * 10) / 10,
    low: Math.round((allLows.reduce((a, b) => a + b, 0) / allLows.length) * 10) / 10,
    avgSpread: Math.round((spreads.reduce((a, b) => a + b, 0) / spreads.length) * 10) / 10,
  };
}

function Sparkline({ data, width = 64, height = 24, color = "#94A3B8" }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ConfidenceBadge({ spread, unit }) {
  const threshold = unit === "F" ? 2.7 : 1.5;
  const threshold2 = unit === "F" ? 5.4 : 3;
  const confidence = spread < threshold ? "High" : spread < threshold2 ? "Medium" : "Low";
  const styles = {
    High: { bg: "#E8F5EC", color: "#2D7A4F", border: "#C2E5CC" },
    Medium: { bg: "#FEF6E4", color: "#9A7B2E", border: "#F0DFA4" },
    Low: { bg: "#FDE8E4", color: "#B04A3A", border: "#F0C0B8" },
  };
  const s = styles[confidence];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 10px", borderRadius: 6,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontSize: 12, fontWeight: 600, letterSpacing: "0.02em",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, opacity: 0.7 }} />
      {confidence} agreement
    </span>
  );
}

const WEEK_DATA_C = [
  { day: "Today", high: 4, low: -3, condition: "Mostly Cloudy", precip: 20, temps: [0, -1, -2, -3, -1, 0, 1, 2, 3, 4, 4, 3, 2, 1] },
  { day: "Sat", high: 6, low: -1, condition: "Sunny", precip: 5, temps: [1, 0, -1, 0, 1, 2, 3, 5, 6, 5, 4, 3, 2, 1] },
  { day: "Sun", high: 2, low: -4, condition: "Snow", precip: 80, temps: [0, -1, -2, -4, -3, -1, 0, 1, 2, 2, 1, 0, -1, -2] },
  { day: "Mon", high: 1, low: -5, condition: "Snow/Cloudy", precip: 60, temps: [-2, -3, -4, -5, -3, -2, -1, 0, 1, 1, 0, -1, -2, -3] },
  { day: "Tue", high: 5, low: -2, condition: "Partly Cloudy", precip: 10, temps: [0, -1, -2, -1, 0, 2, 3, 4, 5, 5, 4, 3, 1, 0] },
  { day: "Wed", high: 7, low: 0, condition: "Sunny", precip: 0, temps: [2, 1, 0, 1, 2, 3, 5, 6, 7, 7, 6, 4, 3, 2] },
  { day: "Thu", high: 8, low: 1, condition: "Partly Cloudy", precip: 15, temps: [3, 2, 1, 2, 3, 4, 6, 7, 8, 7, 6, 5, 4, 3] },
];

function getWeekData(unit) {
  return WEEK_DATA_C.map(d => ({
    ...d,
    high: unit === "F" ? Math.round(toF(d.high)) : d.high,
    low: unit === "F" ? Math.round(toF(d.low)) : d.low,
    temps: unit === "F" ? d.temps.map(t => Math.round(toF(t))) : d.temps,
  }));
}

export default function WeatherApp() {
  const [sources, setSources] = useState(SOURCES.map((s) => ({ ...s, enabled: true })));
  const [hoveredHour, setHoveredHour] = useState(null);
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [unit, setUnit] = useState("F");
  const [currentTime] = useState(14);
  const chartRef = useRef(null);

  const toggleSource = (id) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const stats = getDailyStats(sources, unit);
  const activeCount = sources.filter((s) => s.enabled).length;
  const weekData = getWeekData(unit);

  const chartW = 680;
  const chartH = 200;
  const padX = 36;
  const padY = 24;

  const allTemps = Object.keys(MOCK_SOURCES_DATA_C).flatMap(id => getData(id, unit));
  const globalMin = Math.min(...allTemps) - 2;
  const globalMax = Math.max(...allTemps) + 2;

  const toX = (h) => padX + (h / 23) * (chartW - padX * 2);
  const toY = (t) => padY + ((globalMax - t) / (globalMax - globalMin)) * (chartH - padY * 2);

  const buildPath = (sourceId) => {
    const data = getData(sourceId, unit);
    return data.map((t, h) => `${h === 0 ? "M" : "L"} ${toX(h)} ${toY(t)}`).join(" ");
  };

  const buildBand = () => {
    const topPoints = [];
    const bottomPoints = [];
    for (let h = 0; h < 24; h++) {
      const range = getRange(h, sources, unit);
      topPoints.push(`${toX(h)},${toY(range.max)}`);
      bottomPoints.push(`${toX(h)},${toY(range.min)}`);
    }
    return [...topPoints, ...bottomPoints.reverse()].join(" ");
  };

  const buildBlendedPath = () => {
    return HOURS.map((h) => {
      const val = getBlended(h, sources, unit);
      if (val === null) return "";
      return `${h === 0 ? "M" : "L"} ${toX(h)} ${toY(val)}`;
    }).join(" ");
  };

  const displayHour = hoveredHour !== null ? hoveredHour : currentTime;
  const displayTemp = getBlended(displayHour, sources, unit);
  const displayRange = getRange(displayHour, sources, unit);

  // Week bar range
  const weekTemps = weekData.flatMap(d => [d.high, d.low]);
  const weekMin = Math.min(...weekTemps);
  const weekMax = Math.max(...weekTemps);
  const weekRange = weekMax - weekMin || 1;

  // Chart grid values
  const gridStep = unit === "F" ? 5 : 2;
  const gridStart = Math.floor(globalMin / gridStep) * gridStep;
  const gridEnd = Math.ceil(globalMax / gridStep) * gridStep;
  const gridLines = [];
  for (let t = gridStart; t <= gridEnd; t += gridStep) gridLines.push(t);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F6F5F1",
      color: "#1E2432",
      fontFamily: "'Source Sans 3', 'Helvetica Neue', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.45s ease-out both; }
        .d1 { animation-delay: 0.04s; } .d2 { animation-delay: 0.08s; }
        .d3 { animation-delay: 0.12s; } .d4 { animation-delay: 0.16s; } .d5 { animation-delay: 0.2s; }
        .source-pill { transition: all 0.15s ease; cursor: pointer; user-select: none; }
        .source-pill:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); transform: translateY(-1px); }
        .week-row { transition: background 0.12s ease; }
        .week-row:hover { background: rgba(0,0,0,0.02); }
        .unit-btn { transition: all 0.15s ease; cursor: pointer; user-select: none; font-family: 'JetBrains Mono', monospace; }
        .unit-btn:hover { background: rgba(0,0,0,0.06); }
      `}</style>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "44px 28px 64px" }}>

        {/* Top bar */}
        <div className="fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", color: "#1E2432", marginBottom: 2 }}>
              Toronto
            </h1>
            <div style={{ fontSize: 14, color: "#7C8494", fontWeight: 400 }}>
              Friday, February 27 · Mostly cloudy, light snow possible this evening
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Unit toggle */}
            <div style={{
              display: "flex", borderRadius: 8, overflow: "hidden",
              border: "1.5px solid #D8D6D0", background: "#EEEDEA",
            }}>
              <button className="unit-btn" onClick={() => setUnit("F")} style={{
                padding: "6px 12px", fontSize: 13, fontWeight: 600, border: "none",
                background: unit === "F" ? "#1E2432" : "transparent",
                color: unit === "F" ? "#F6F5F1" : "#7C8494",
                borderRadius: unit === "F" ? 6 : 0,
              }}>°F</button>
              <button className="unit-btn" onClick={() => setUnit("C")} style={{
                padding: "6px 12px", fontSize: 13, fontWeight: 600, border: "none",
                background: unit === "C" ? "#1E2432" : "transparent",
                color: unit === "C" ? "#F6F5F1" : "#7C8494",
                borderRadius: unit === "C" ? 6 : 0,
              }}>°C</button>
            </div>
            {/* Sources button */}
            <button onClick={() => setShowSourcePanel(!showSourcePanel)} style={{
              background: showSourcePanel ? "#1E2432" : "#EEEDEA",
              border: "1.5px solid " + (showSourcePanel ? "#1E2432" : "#D8D6D0"),
              borderRadius: 8, padding: "6px 14px",
              color: showSourcePanel ? "#F6F5F1" : "#5A6172",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              transition: "all 0.15s ease",
            }}>
              {activeCount}/{sources.length} sources
            </button>
          </div>
        </div>

        {/* Source panel */}
        {showSourcePanel && (
          <div className="fade-up" style={{
            marginBottom: 28, padding: "20px 24px",
            background: "#FFFFFF", border: "1.5px solid #E4E2DC",
            borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              fontWeight: 500, letterSpacing: "0.08em", color: "#9CA3AF",
              textTransform: "uppercase", marginBottom: 14,
            }}>Data Sources</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {sources.map((s) => (
                <div key={s.id} className="source-pill" onClick={() => toggleSource(s.id)} style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "9px 18px", borderRadius: 10,
                  border: `1.5px solid ${s.enabled ? s.color + "50" : "#E4E2DC"}`,
                  background: s.enabled ? s.color + "0C" : "#FAFAF8",
                  opacity: s.enabled ? 1 : 0.5,
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: s.enabled ? s.color : "#C8C6C0",
                    transition: "all 0.15s ease",
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: s.enabled ? "#1E2432" : "#9CA3AF" }}>
                    {s.name}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: "#9CA3AF", fontWeight: 400 }}>
              Toggle sources to compare how forecasts diverge. The blended line averages all active sources.
            </div>
          </div>
        )}

        {/* Hero temperature */}
        <div className="fade-up d1" style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <div style={{ fontSize: 108, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color: "#1E2432" }}>
              {displayTemp !== null ? Math.round(displayTemp) : "--"}
              <span style={{ fontSize: 48, fontWeight: 600, color: "#9CA3AF" }}>°</span>
            </div>
            <div style={{ paddingBottom: 10 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
                fontWeight: 500, color: "#9CA3AF", marginBottom: 6,
              }}>
                {hoveredHour !== null ? `${hoveredHour.toString().padStart(2, "0")}:00` : "2:00 PM"}
              </div>
              <ConfidenceBadge spread={displayRange.spread} unit={unit} />
            </div>
          </div>
        </div>

        {/* High / Low / Spread */}
        <div className="fade-up d2" style={{ display: "flex", gap: 24, marginBottom: 36 }}>
          {[
            { label: "High", value: stats.high, bold: true },
            { label: "Low", value: stats.low, bold: false },
            { label: "Avg Spread", value: `±${(stats.avgSpread / 2).toFixed(1)}`, bold: false },
          ].map((item, i) => (
            <div key={item.label} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                fontWeight: 500, letterSpacing: "0.06em", color: "#B0B5BF",
                textTransform: "uppercase",
              }}>{item.label}</span>
              <span style={{
                fontSize: 22, fontWeight: item.bold ? 700 : 500,
                color: item.bold ? "#1E2432" : "#6B7280",
              }}>
                {typeof item.value === "number" ? `${item.value}°` : `${item.value}°`}
              </span>
            </div>
          ))}
        </div>

        {/* Chart card */}
        <div className="fade-up d3" style={{
          marginBottom: 32, background: "#FFFFFF",
          border: "1.5px solid #E4E2DC", borderRadius: 16,
          padding: "24px 16px 16px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            fontWeight: 500, letterSpacing: "0.08em", color: "#B0B5BF",
            textTransform: "uppercase", marginBottom: 16, paddingLeft: 20,
          }}>
            24-Hour Temperature · Blended Forecast
          </div>

          <svg ref={chartRef} viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", height: "auto" }}>
            {/* Grid */}
            {gridLines.map((t) => (
              <g key={t}>
                <line x1={padX} y1={toY(t)} x2={chartW - padX} y2={toY(t)} stroke="#EEEDEA" strokeWidth="1" />
                <text x={padX - 8} y={toY(t) + 4} textAnchor="end" fill="#B0B5BF" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="400">
                  {t}°
                </text>
              </g>
            ))}

            {/* Zero line */}
            {unit === "C" && globalMin < 0 && globalMax > 0 && (
              <line x1={padX} y1={toY(0)} x2={chartW - padX} y2={toY(0)} stroke="#D0CEC8" strokeWidth="1.5" strokeDasharray="4,4" />
            )}
            {unit === "F" && globalMin < 32 && globalMax > 32 && (
              <line x1={padX} y1={toY(32)} x2={chartW - padX} y2={toY(32)} stroke="#D0CEC8" strokeWidth="1.5" strokeDasharray="4,4" />
            )}

            {/* Hour labels */}
            {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
              <text key={h} x={toX(h)} y={chartH - 2} textAnchor="middle" fill="#B0B5BF" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="400">
                {h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`}
              </text>
            ))}

            {/* Confidence band */}
            {activeCount > 1 && (
              <polygon points={buildBand()} fill="rgba(59,130,196,0.08)" stroke="none" />
            )}

            {/* Individual source lines */}
            {sources.filter((s) => s.enabled).map((s) => (
              <path key={s.id} d={buildPath(s.id)} fill="none" stroke={s.color} strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" strokeLinejoin="round" />
            ))}

            {/* Blended line */}
            {activeCount > 0 && (
              <path d={buildBlendedPath()} fill="none" stroke="#1E2432" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {/* Now marker */}
            <line x1={toX(currentTime)} y1={padY - 4} x2={toX(currentTime)} y2={chartH - padY + 4} stroke="#D4793A" strokeWidth="1.5" strokeDasharray="4,3" />
            <circle cx={toX(currentTime)} cy={padY - 8} r="3.5" fill="#D4793A" />

            {/* Hover */}
            {hoveredHour !== null && (
              <>
                <line x1={toX(hoveredHour)} y1={padY} x2={toX(hoveredHour)} y2={chartH - padY} stroke="#1E2432" strokeWidth="1" strokeOpacity="0.15" />
                {sources.filter((s) => s.enabled).map((s) => (
                  <circle key={s.id} cx={toX(hoveredHour)} cy={toY(getData(s.id, unit)[hoveredHour])} r="4.5" fill={s.color} stroke="#FFFFFF" strokeWidth="2" />
                ))}
                {displayTemp !== null && (
                  <circle cx={toX(hoveredHour)} cy={toY(displayTemp)} r="6" fill="#1E2432" stroke="#FFFFFF" strokeWidth="2.5" />
                )}
              </>
            )}

            {/* Hover zones */}
            {HOURS.map((h) => (
              <rect key={h} x={toX(h) - (chartW - padX * 2) / 48} y={0} width={(chartW - padX * 2) / 24} height={chartH} fill="transparent" style={{ cursor: "crosshair" }} onMouseEnter={() => setHoveredHour(h)} onMouseLeave={() => setHoveredHour(null)} />
            ))}
          </svg>

          {/* Legend */}
          <div style={{ display: "flex", gap: 18, marginTop: 14, paddingLeft: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 18, height: 3, background: "#1E2432", borderRadius: 2 }} />
              <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>Blended</span>
            </div>
            {sources.filter((s) => s.enabled).map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 18, height: 2.5, background: s.color, borderRadius: 2, opacity: 0.45 }} />
                <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>{s.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hover detail */}
        {hoveredHour !== null && activeCount > 1 && (
          <div style={{
            marginTop: -16, marginBottom: 24,
            padding: "14px 22px", background: "#FFFFFF",
            border: "1.5px solid #E4E2DC", borderRadius: 12,
            display: "flex", gap: 24, flexWrap: "wrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            animation: "fadeUp 0.12s ease-out",
          }}>
            {sources.filter((s) => s.enabled).map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                <span style={{ fontSize: 13, color: "#7C8494", fontWeight: 500 }}>{s.name}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#1E2432" }}>
                  {Math.round(getData(s.id, unit)[hoveredHour])}°
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 7-Day card */}
        <div className="fade-up d4" style={{
          background: "#FFFFFF", border: "1.5px solid #E4E2DC",
          borderRadius: 16, padding: "24px 0 8px", marginBottom: 36,
          boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            fontWeight: 500, letterSpacing: "0.08em", color: "#B0B5BF",
            textTransform: "uppercase", marginBottom: 8, paddingLeft: 24,
          }}>7-Day Outlook</div>

          {weekData.map((d, i) => (
            <div key={d.day} className="week-row" style={{
              display: "grid",
              gridTemplateColumns: "60px 108px 1fr 44px 44px 68px",
              alignItems: "center", padding: "12px 24px", gap: 12,
              borderTop: i === 0 ? "none" : "1px solid #F0EFEB",
            }}>
              <span style={{
                fontSize: 14, fontWeight: i === 0 ? 700 : 500,
                color: i === 0 ? "#1E2432" : "#6B7280",
              }}>{d.day}</span>
              <span style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 400 }}>{d.condition}</span>

              {/* Temp bar */}
              <div style={{ position: "relative", height: 6, background: "#F0EFEB", borderRadius: 3 }}>
                <div style={{
                  position: "absolute",
                  left: `${((d.low - weekMin) / weekRange) * 100}%`,
                  right: `${100 - ((d.high - weekMin) / weekRange) * 100}%`,
                  top: 0, bottom: 0, borderRadius: 3,
                  background: `linear-gradient(90deg, #6BA3D6, #D4793A)`,
                  opacity: 0.65,
                }} />
              </div>

              <span style={{
                fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 400, color: "#9CA3AF", textAlign: "right",
              }}>{d.low}°</span>
              <span style={{
                fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600, color: "#1E2432", textAlign: "right",
              }}>{d.high}°</span>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Sparkline data={d.temps} color="#A0AEBE" />
              </div>
            </div>
          ))}
        </div>

        {/* Precipitation row */}
        <div className="fade-up d5" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14, marginBottom: 36,
        }}>
          {[
            { label: "Precip", value: "20%", sub: "Light snow 6–9 PM" },
            { label: "Wind", value: `${unit === "F" ? "12 mph" : "19 km/h"}`, sub: "NW gusts to " + (unit === "F" ? "22 mph" : "35 km/h") },
            { label: "Humidity", value: "68%", sub: "Dew point " + (unit === "F" ? "22°" : "-6°") },
          ].map((card) => (
            <div key={card.label} style={{
              background: "#FFFFFF", border: "1.5px solid #E4E2DC",
              borderRadius: 14, padding: "18px 20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                fontWeight: 500, letterSpacing: "0.08em", color: "#B0B5BF",
                textTransform: "uppercase", marginBottom: 8,
              }}>{card.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#1E2432", marginBottom: 4 }}>{card.value}</div>
              <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 400 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="fade-up d5" style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px",
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: "#C8C6C0", fontWeight: 400,
          }}>
            Updated 2:32 PM · Blended from {activeCount} source{activeCount !== 1 ? "s" : ""}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
            color: "#D0CEC8", fontWeight: 500, letterSpacing: "0.06em",
          }}>
            NOAH · v0.1
          </div>
        </div>
      </div>
    </div>
  );
}
