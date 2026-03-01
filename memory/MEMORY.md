# Weather App Memory

## Project
- **Type**: Personal single-user weather app for Toronto
- **Stack**: Single HTML file, React 18 + Babel Standalone from CDN, no build step
- **Main file**: `index.html` (863 lines)
- **Spec**: `WEATHER-APP-SPEC.md`
- **Reference prototypes**: `weather-app-v2-reference.jsx`, `weather-app-v3-reference.jsx`

## Architecture
- **Data**: All mock data generated at module level (outside React) using seeded RNG (mulberry32-style)
- **State**: `sources` (5 sources w/ enabled flag), `unit` (F/C), `showSrcs`, `hovHour`, `hovDay`, `currentTime`
- **Dynamic blending**: `computeForecastDays(enabledIds)` recomputed via `useMemo` when sources change

## 5 Sources & Tapering
| Source       | Color    | Max Days |
|--------------|----------|----------|
| WeatherKit   | #3A9E6B  | 10       |
| Tomorrow.io  | #4A8FC4  | 5        |
| Pirate Weather| #C4793A | 8        |
| Open-Meteo   | #5080A8  | 16       |
| Weatherbit   | #7B6BB0  | 16       |

Natural tapering: Days 1–5: 5 sources, Days 6–8: 4, Days 9–10: 3, Days 11–16: 2

## Key Design Decisions
- **Anthropic brand palette**: bg #FAF9F5, text #141413, orange #D97757, blue #6A9BCC
- **Fonts**: IBM Plex Sans (body) + IBM Plex Mono (numbers/data/labels)
- **Hero temp**: 104px, weight 300 (light/elegant, NOT bold)
- **No dark mode** (owner preference)
- **16-day max forecast** (not 35d - beyond 16d forecast skill drops to climatology)
- **Source count dots** per day in extended chart = key confidence visualization
- **Confidence zones**: Days 8–10 yellow (MODERATE), Days 11–16 orange (EXTENDED)

## Historical Normals (Toronto sinusoidal)
```
avgH = 11.5 + 16.5 * cos((doy - 205) / 365 * 2π)  // peaks ~28°C late July
avgL = 3.0  + 14.5 * cos((doy - 205) / 365 * 2π)
Feb 27 (DOY=58): avgH ≈ -2°C (28°F), avgL ≈ -12°C (10°F)
```

## Visual Structure (Dark Sky-inspired, v0.3)
Layout order (top → bottom):
1. Minimal header (city name left, controls right)
2. [Source panel — collapsible]
3. **Centered current conditions** — huge temp (112px w300, centered), condition name, italic narrative sentence, confidence badge, stats pill strip
4. **Precipitation nowcast card** — 60-min area chart with intensity guides
5. **24h hourly chart card** — SVG with blended line, source lines, band, hover
6. [Source detail strip — appears on hover]
7. **7-day outlook card** — vertical list with temperature pill bars (Dark Sky-style)
8. **16-day extended chart card** — unique feature, source dots, confidence zones
9. **Details grid** — 3×2 grid (precip, wind, humidity, pressure, UV, visibility)
10. Footer

## Components
- `ConfidenceBadge` — green/yellow/red pill badge
- `SrcDots` — row of 5 dots (filled=active, hollow=inactive)
- `PrecipBar` — 60-min precipitation nowcast area chart (Dark Sky signature feature)
- `HourlyChart` — 24h SVG chart with hover, band, source lines
- `WeekList` — 7-day list with Dark Sky temperature pill bars (gradient blue→orange)
- `ExtendedChart` — 16-day SVG chart with confidence zones, source dots
- `HoverCard` — detail card for extended chart hover

## Interactions
- Hover 24h chart → hero updates to blended temp at that hour
- Hover 16d chart → hero updates to forecast high for that day, detail card appears
- Toggle sources → all charts + blended values update immediately
- F/C toggle → entire app recalculates
