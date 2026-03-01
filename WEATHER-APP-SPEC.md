# Personal Weather App — Project Specification

> Handoff document for Claude Code. This captures every decision, API detail, architecture choice, and design direction from the planning session. Use this as the single source of truth.

---

## Project Overview

A personal, single-user weather app for Toronto that blends forecasts from 5 independent weather APIs into a unified view. The core differentiator is **multi-source blending with confidence visualization** — showing not just the forecast, but how much agreement exists between sources, and how forecasts compare to historical normals.

This is a personal-use project (not commercial), which keeps all API costs at zero or near-zero.

**Location:** Toronto, Ontario, Canada (43.6532° N, 79.3832° W)
**Units:** Fahrenheit default, with °F/°C toggle (always visible)
**Theme:** Light mode only. No dark mode. The owner explicitly dislikes dark mode.

---

## Data Sources (5 total)

### 1. WeatherKit (Apple)
- **Endpoint:** REST API at `https://weatherkit.apple.com/api/v1/weather/{language}/{latitude}/{longitude}`
- **Auth:** Apple Developer account ($99/year), JWT token signed with a private key
- **Forecast range:** 10 days daily, hourly, plus minute-by-minute precipitation for next hour
- **Historical data:** From August 1, 2021 onward
- **Free tier:** 500,000 calls/month (far more than needed)
- **Key fields:** `forecastDaily.days[].temperatureMax`, `temperatureMin`, `conditionCode`
- **Notes:** Dark Sky lineage. Requires Apple Developer Program membership. REST API can be called from any platform (not iOS-only). Attribution required: must display `` Weather trademark and legal link.
- **Docs:** https://developer.apple.com/weatherkit/

### 2. Tomorrow.io
- **Endpoint:** `https://api.tomorrow.io/v4/weather/forecast`
- **Auth:** API key (free registration)
- **Forecast range:** 5 days daily, 120 hours hourly, some fields extend to 14 days
- **Free tier:** ~100 calls/day (25 calls/day for timeline endpoint, more for realtime)
- **Key fields:** `timelines.daily[].values.temperatureMax`, `temperatureMin`
- **Notes:** Hyperlocal, 60+ weather layers. Has weather insights/alerts engine. Free tier is tight but sufficient for a single user polling every 15-30 min.
- **Docs:** https://docs.tomorrow.io/

### 3. Pirate Weather
- **Endpoint:** `https://api.pirateweather.net/forecast/{apikey}/{latitude},{longitude}`
- **Auth:** Free API key (request at pirateweather.net)
- **Forecast range:** ~8 days daily, 48 hours hourly (HRRR), 10 days (GFS)
- **Historical data:** ERA5 reanalysis from 1940 (via time machine endpoint)
- **Free tier:** 10,000 calls/month. $2/month donation bumps to 20,000.
- **Key fields:** Dark Sky-compatible JSON: `daily.data[].temperatureHigh`, `temperatureLow`
- **Data models used:** HRRR (high-resolution rapid refresh), GFS, GEFS, NBM (National Blend of Models), RTMA, ECMWF
- **Notes:** Created by PhD student Alexander Rey. Open source (can self-host). Drop-in Dark Sky API replacement — same JSON schema. Supports Canadian units natively. Additional fields: smoke levels, solar radiation, fire indices, rain vs. snow intensity breakdown. The self-hosted version requires ~16 GB RAM.
- **Docs:** https://docs.pirateweather.net/

### 4. Open-Meteo
- **Endpoint:** `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=temperature_2m_max,temperature_2m_min`
- **Auth:** None required (no API key needed)
- **Forecast range:** 7 days high-resolution local models, 16 days global models, 35 days via ensemble API
- **Historical data:** ERA5 reanalysis from 1940, IFS model at 9km from 2017+
- **Free tier:** Unlimited for non-commercial use (request fair use under 10,000 calls/day)
- **Ensemble API:** `https://api.open-meteo.com/v1/ensemble?...` — 7 ensemble models from ECMWF, NOAA, DWD, CMCC with 50+ members each, up to 35 days
- **Historical API:** `https://api.open-meteo.com/v1/archive?...` — ERA5 data from 1940, hourly resolution, 9-25km spatial resolution
- **Key fields:** `daily.temperature_2m_max[]`, `daily.temperature_2m_min[]`
- **Notes:** Open source (AGPLv3). Processes 2TB+ data daily. Uses custom OM-File format for fast time-series access. Best source for historical normals computation. The Historical Forecast API (separate from the archive API) provides high-resolution archived forecast data from recent years, useful for ML training.
- **Docs:** https://open-meteo.com/en/docs

### 5. Weatherbit
- **Endpoint:** `https://api.weatherbit.io/v2.0/forecast/daily?lat={lat}&lon={lon}&key={key}`
- **Auth:** Free API key (registration required)
- **Forecast range:** 16 days daily
- **Free tier:** 500 calls/day
- **Key fields:** `data[].max_temp`, `data[].min_temp`
- **Data models used:** GFS, ECMWF, HRRR, ICON with proprietary ML bias correction
- **Notes:** Claims ML techniques reduce forecast error by up to 50% vs raw model output. Good complementary source — uses different bias-correction approach than Open-Meteo.
- **Docs:** https://www.weatherbit.io/api

---

## Architecture

### Source Blending by Day Range

The number of available sources naturally decreases as the forecast extends further out. This tapering IS the confidence story — the app gets "quieter" and more uncertain over time.

| Day Range | Sources Available | Count |
|-----------|-------------------|-------|
| Days 1-5 | WeatherKit, Tomorrow.io, Pirate Weather, Open-Meteo, Weatherbit | 5 |
| Days 5-8 | WeatherKit, Pirate Weather, Open-Meteo, Weatherbit | 4 |
| Days 8-10 | WeatherKit, Open-Meteo, Weatherbit | 3 |
| Days 10-16 | Open-Meteo, Weatherbit | 2 |

**Max forecast range: 16 days.** The owner decided against going further (e.g., Open-Meteo's 35-day ensemble) because beyond 16 days, forecasts are barely better than historical averages. 16 days is where real forecast skill still exists.

### Blending Methods

For each day/hour, compute:

1. **Blended value** — Simple average of all enabled sources (surprisingly effective; naive ensemble averaging often outperforms any single model)
2. **Spread** — Range between min and max source values → used as confidence indicator
3. **Per-source values** — Available for individual inspection via toggle

Future enhancement: **Weighted average** — track accuracy per source over time for Toronto specifically, auto-adjust weights. Log forecasts, compare against actuals, update weights. Lake-effect dynamics may favor certain models.

**Median** is also a good option — more robust against outliers than mean.

### Data Normalization Considerations

Different APIs may define "daily high" differently (midnight-to-midnight vs 6am-to-6am, timezone handling). Normalize to consistent time boundaries for Toronto (Eastern Time).

### Background Fetch + Local Cache

Weather data updates slowly (models refresh every 1-6 hours). The app should:

1. **Poll all 5 sources every 15-30 minutes** in the background
2. **Run API calls in parallel** (`Promise.all` in JS, or async task group in Swift) — total latency is the slowest single source (~1 second), not the sum
3. **Blend results and cache locally** — the UI always reads from cache for instant display
4. **Show "last updated" timestamp** in the UI

Typical usage: ~3,000 API calls/month per source, well within all free tiers.

### Historical Normals

**Source:** Open-Meteo ERA5 Historical API (data from 1940 onward)

**Pre-computation strategy:** Fetch 80+ years of daily high/low temperatures for Toronto from ERA5. Compute the average high and average low for each calendar date (1-366). Cache this locally as a static lookup table. This only needs to be done once (or refreshed annually).

**Accuracy notes on ERA5:**
- Based on ECMWF reanalysis combining station, aircraft, buoy, radar, satellite observations with atmospheric modeling
- Resolution: 9-25km. IFS model at 9km available from 2017 onward
- Temperature performs well globally; Toronto is well-covered by station density
- For computing normals (averaging over decades), individual errors wash out — excellent for this use case
- May be off 1-2°C for any specific historical date vs. official station readings
- Focuses on consistency over pinpoint accuracy

**Sinusoidal approximation for prototyping (Toronto):**
```
avgHigh = 11.5 + 16.5 * cos((dayOfYear - 205) / 365 * 2π)  // peaks ~27°C late July
avgLow  = 3.0 + 14.5 * cos((dayOfYear - 205) / 365 * 2π)   // peaks ~18°C late July
```
Replace with actual ERA5-computed normals in production.

---

## UI Design Specification

### Visual Language: Anthropic Brand Style

The latest design direction is styled as if Anthropic designed it. Key attributes:

**Colors (Anthropic official palette):**
- Background: `#FAF9F5` (warm off-white, called "Light")
- Card background: `#FFFFFF`
- Card border: `#E8E6DC` (light gray)
- Primary text: `#141413` (called "Dark") for hero elements
- Body text: `#2D2D2A`
- Mid text: `#6B6B63`
- Light text: `#9C9B93`
- Faint text: `#B0AEA5` (called "Mid Gray")
- Dividers: `#E8E6DC`
- Accent orange: `#D97757` (Anthropic brand orange — used for "now" markers, historical avg lines)
- Accent blue: `#6A9BCC` (used for low temp lines, confidence bands)
- Accent green: `#788C5D` (used for "high agreement" badges)
- Semantic backgrounds: green-bg `#EDF2E6`, orange-bg `#FBF0EB`, blue-bg `#EBF1F7`, yellow-bg `#F7F3E6`, red-bg `#F7ECEA`

**Typography:**
- Anthropic's actual brand fonts are Styrene (sans) and Tiempos (serif) by Commercial Type / Klim — these are commercial fonts
- For implementation, use IBM Plex Sans (body) and IBM Plex Mono (data/numbers) as close accessible alternatives
- Alternatively, use system-ui stack: `'Söhne', 'Helvetica Neue', system-ui, -apple-system, sans-serif`
- Hero temperature: very light weight (300), ~100px, tight letter-spacing (-0.04em)
- Section labels: 10-11px, uppercase, weight 500, letter-spacing 0.04em, faint color
- Data values: monospace font for numbers

**Design principles (from Geist, Anthropic's design agency):**
- "Doing the simple thing that works"
- Clean typography, muted color palette, modular layouts
- Balance between technical rigor and human-centered storytelling
- Generous whitespace and padding
- Cards with subtle 1.5px borders, 14px border-radius
- Warm tone — not clinical or cold
- Understated confidence — nothing flashy

**Layout:**
- Max width: ~740px, centered
- Padding: 48px top, 28px sides, 64px bottom
- Cards: white background, 1.5px border `#E8E6DC`, border-radius 14px, 22px padding
- Pill badges: border-radius 100px
- Animations: subtle fadeUp (0.4s ease-out), staggered delays (0.03s increments)

### Screen Sections (top to bottom)

#### 1. Header
- City name: 24px, weight 600, dark color
- Subtitle: date + conditions summary, 15px, mid color
- Right side: °F/°C segmented toggle (active state gets dark fill) + sources button showing "N/5 sources"

#### 2. Source Panel (collapsible, toggled by sources button)
- Row of pill-shaped toggles, one per source
- Each pill shows: colored dot + source name + max forecast days in monospace
- Tapping toggles source on/off (affects blending)
- Enabled sources show colored border tint and light colored background
- Disabled sources show at 45% opacity

#### 3. Hero Temperature
- Current blended temperature at ~100px, weight 300
- Time label (e.g., "2:00 PM") in monospace, light color
- Confidence badge: pill showing "High agreement" / "Moderate" / "Low agreement" with semantic colors
  - High: green, spread < 1.5°C (2.7°F)
  - Moderate: yellow, spread < 3°C (5.4°F)
  - Low: red, spread ≥ 3°C

#### 4. Stats Row
- Horizontal row of labeled stat pairs: High, Low, Avg High (historical), Avg Low (historical)
- Labels in uppercase 10px faint, values in 19px
- Historical values use orange color to differentiate from forecast values

#### 5. 24-Hour Temperature Chart
- White card with border
- SVG chart, full width
- Elements:
  - Grid lines with temperature labels on left (monospace)
  - Individual source lines: thin (1.5px), low opacity (0.2), colored per source
  - Confidence band: light blue polygon between min/max across enabled sources
  - Blended line: thick (2.5px), dark color, rounded caps
  - Historical average high/low: dashed orange lines (if within visible range)
  - "Now" marker: orange dashed vertical line with dot at top
  - Hover interaction: crosshair cursor, vertical line appears, dots on each source + larger dot on blended value, temperature updates in hero
  - Time labels at bottom: 12a, 3a, 6a, 9a, 12p, 3p, 6p, 9p format
- Legend below chart: line samples with labels (Blended + each enabled source)

#### 6. Extended Forecast Chart (16-day)
- White card with border
- SVG chart showing daily high/low forecasts across 16 days
- Elements:
  - Forecast high line: warm red/rust (`#B84A30`), 2.5px, solid
  - Forecast low line: blue (`#6A9BCC`), 2.5px, solid
  - Historical average high: dashed orange line, 1.5px, ~0.45 opacity
  - Historical average low: dashed orange line, 1.5px, ~0.45 opacity
  - Historical avg range band: light orange fill between avg high and avg low
  - Ensemble spread band: very light blue fill showing forecast uncertainty (widens over time)
  - Freezing line: dashed blue, very light, at 0°C/32°F if visible
  - Background confidence zones:
    - Days 1-7: no tint (highest confidence)
    - Days 8-10: faint yellow tint, labeled "MODERATE" at top
    - Days 11-16: faint orange tint, labeled "EXTENDED" at top
  - Day labels at bottom: day name (Mon, Tue...) + month/date
  - Source count indicators: row of 5 small dots per day, filled = active source, empty = inactive — visually communicates the natural tapering
  - Hover interaction: vertical line, dots on forecast and historical values, detail card

#### 7. Hover Detail Card (for extended forecast)
When hovering a day on the extended chart, show a floating card with:
- Day name + date
- Forecast High vs. Historical Avg High, with delta (e.g., "Δ +5°")
- Forecast Low vs. Historical Avg Low, with delta
- Number of active sources for that day

### Interaction Patterns

- **Source toggling:** Click source pills to enable/disable. All charts and blended values update immediately.
- **Unit toggle:** Always visible segmented control. Entire app recalculates on switch.
- **Chart hover:** Shows precise values at the hovered point. Hero temperature updates to show hovered time (24h chart) or hovered day (extended chart).
- **Pull to refresh:** (for native app) Brief spinner while parallel API calls resolve (~1 second).

---

## Technical Notes

### API Call Cost Analysis (Personal Use)

Polling every 15 minutes = ~96 calls/day/source = ~2,880 calls/month/source.

| Source | Monthly Usage | Free Tier | Verdict |
|--------|--------------|-----------|---------|
| WeatherKit | ~2,880 | 500,000/month | Well within |
| Tomorrow.io | ~2,880 | ~750-3,000/month | Tight but OK with smart scheduling |
| Pirate Weather | ~2,880 | 10,000/month | Well within |
| Open-Meteo | ~2,880 | Unlimited (fair use) | Well within |
| Weatherbit | ~2,880 | ~15,000/month | Well within |

### Historical Normals Computation

One-time job: call Open-Meteo Historical API for Toronto coordinates, requesting daily temperature_2m_max and temperature_2m_min from 1940-01-01 to present. Group by calendar date (1-366), compute mean. Store as a 366-entry JSON lookup.

```
GET https://api.open-meteo.com/v1/archive?latitude=43.65&longitude=-79.38&start_date=1940-01-01&end_date=2025-12-31&daily=temperature_2m_max,temperature_2m_min&timezone=America/Toronto
```

Note: This is a large request. May need to chunk by decade.

### Platform Considerations

The project was discussed primarily as a web app, but iOS native was also mentioned as a possibility. The UI prototypes are React components (JSX). For native iOS:
- WeatherKit has a Swift-native API (not just REST) — simpler auth
- Could use SwiftUI with async/await for parallel API calls
- iOS Live Activities were mentioned as an area of interest
- Background app refresh for the polling loop

### Key Design Philosophy

The app should feel like a **data-rich instrument panel** — information-dense without being cluttered. The confidence visualization (spread bands, source count dots, background tinting, agreement badges) should make uncertainty **visible and intuitive** rather than hiding it behind a single misleading number. Historical context (average lines) provides a perpetual anchor — when the 16-day forecast converges toward the historical average, that's actually correct because long-range forecasts should approach climatology.

---

## Existing Prototypes

Three React (JSX) component prototypes were created during the design session. They contain mock data generators and demonstrate the interaction patterns. They are not production code but serve as detailed visual references:

1. **weather-app.jsx** — V1, dark theme (superseded — owner dislikes dark mode)
2. **weather-app-light.jsx** — V2, light theme with F/C toggle, historical comparison, secondary stat cards
3. **weather-app-v3.jsx** — V3, extended forecast chart with 7d/16d/35d toggle, ensemble spread, confidence zones, historical normal overlay, source count dots

The V3 prototype plus the Anthropic brand styling direction represents the current target. V3 was being restyled with Anthropic's brand palette and typography when the handoff occurred.

---

## Open Questions / Future Enhancements

- **7-day section format:** Currently a compact row-based list. Could become its own dedicated chart. Decision pending.
- **Precipitation timing visualization:** "Rain starting at 6 PM" bar or minute-by-minute precipitation chart. Not yet designed.
- **Historical percentile bands:** Instead of just avg high/low, show 10th-90th percentile range from ERA5 data. Richer but more complex.
- **Weighted blending:** Auto-adjust source weights based on tracked accuracy for Toronto. Requires logging forecasts and comparing against observed temperatures over time.
- **Acme Weather API:** The former Dark Sky team (who launched Acme Weather in Feb 2026) may offer a developer API. Could become a 6th source if it materializes. They use transformer-based neural networks for precipitation nowcasting.

---

## Resources

- Open-Meteo docs: https://open-meteo.com/en/docs
- Open-Meteo Historical API: https://open-meteo.com/en/docs/historical-weather-api
- Open-Meteo Ensemble API: https://open-meteo.com/en/docs (ensemble section)
- Pirate Weather docs: https://docs.pirateweather.net/
- Pirate Weather GitHub: https://github.com/Pirate-Weather/pirateweather
- WeatherKit REST API: https://developer.apple.com/weatherkit/
- Tomorrow.io docs: https://docs.tomorrow.io/
- Weatherbit API: https://www.weatherbit.io/api
- Weatherbit 16-day: https://www.weatherbit.io/api/weather-forecast-16-day
- ERA5 validation study (global accuracy): https://www.sciencedirect.com/science/article/pii/S1470160X24009385
- Anthropic brand guidelines (color palette, typography): See brand-guidelines skill or search "Anthropic brand colors typography"
