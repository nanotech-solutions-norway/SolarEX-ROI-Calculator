# SolarEX ROI Calculator

Static GitHub Pages calculator for estimating SolarEX Quartz SiO₂ and SolarEX Titan TiO₂ coating ROI.

## Purpose

This repository contains a validated standalone static web calculator for SolarEX commercial screening. It is designed to be linked from the SolarEX website and to support technical-commercial discussions with EPC teams, O&M operators, asset owners and procurement stakeholders.

## Deployment baseline

Current live deployment is branch-based from:

```text
gh-pages
```

Do not reintroduce GitHub Actions Pages deployment unless deployment permissions and repository settings are fully controlled and validated.

## Data hierarchy

The calculator prioritizes environmental data in this order:

1. **PVGIS PVcalc annual PV-output model** — preferred where accessible from the browser because it estimates annual PV energy output directly from coordinates, peak power, tilt, azimuth and system-loss assumptions.
2. **Open-Meteo Historical Weather API** — fallback using hourly global tilted irradiance and sunshine duration for the most recent full calendar year.
3. **Manual equivalent full-sun hours** — final fallback for validated customer/site-specific assumptions or when external API access is unavailable.

## Core formula

```text
Peak PV capacity (kWp) = coated area (m²) × panel specific power (W/m²) / 1000

Baseline kWh/year =
  PVGIS annual PV output
  OR peak PV capacity × annual tilted irradiance × performance factor
  OR peak PV capacity × manual equivalent full-sun hours × performance factor

Added kWh/year = baseline kWh/year × SolarEX uplift %

Annual value = added kWh/year × electricity value + optional O&M saving

CAPEX = coated area × coating cost per m²

Simple payback days = CAPEX / annual value × 365

Net value over service life = annual value × coating service life − CAPEX
```

## GPS and currency logic

When the user selects **Use GPS**, the calculator sets the project location field to:

```text
Resolving location…
```

It then requests browser GPS coordinates, reverse-geocodes the position, and displays the resolved locality, region and country where available. If reverse geocoding cannot resolve a locality, it falls back to coordinates.

When a project location is entered or resolved by GPS, the calculator maps the country to the expected local currency, retrieves a EUR-based exchange rate, and displays Euro value, local-currency value and exchange-rate information where available.

## Solar panel type selector

The calculator includes a **Solar panel type** selector with editable specific-power presets:

- Polycrystalline — default, 90 W/m²
- Monocrystalline — 105 W/m²
- PERC — 115 W/m²
- TOPCon — 125 W/m²
- Perovskites — 130 W/m²

The selector sets a starting value in the editable **Panel specific power** field. Users can still override W/m² manually for validated project-specific values.

## Reference defaults

- Panel type: **Polycrystalline**
- Panel specific power: **90 W/m²**
- Coating cost: **€2.44/m²**
- SolarEX Quartz SiO₂ Europe reference: **10% uplift**, **5-year service life**
- SolarEX Quartz SiO₂ Middle East reference: **2% uplift**, **3-year service life**
- SolarEX Titan TiO₂ study reference: **5.15% uplift**, **5-year service life**
- PV system loss / derate default: **0%** to preserve SolarEX reference-model logic when the user keeps the default 90 W/m² assumption. Set a project-specific derate where actual nominal STC capacity and system losses should be included.

## Public/static posture

- No backend
- No database
- No API keys
- No cookies
- No customer-data storage
- Browser-only requests to public environmental-data endpoints

## Files

```text
index.html
assets/styles.css
assets/app.js
assets/favicon.svg
README.md
robots.txt
sitemap.xml
.nojekyll
404.html
```

## Change-control rules

When modifying the calculator:

1. Change only the requested function.
2. Avoid disturbing validated GPS, currency, PVGIS, Open-Meteo and manual fallback logic.
3. Preserve the current visual system unless a visual redesign is explicitly requested.
4. Validate on desktop and mobile after edits.
5. Check location input, GPS, currency conversion, PVGIS fallback, result rendering and mobile layout.

## Contact

SolarEX technical and commercial inquiries: [info@solarex.no](mailto:info@solarex.no)
