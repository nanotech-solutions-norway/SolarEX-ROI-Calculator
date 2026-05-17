# SolarEX ROI Calculator

Static GitHub Pages calculator for estimating SolarEX Quartz SiO₂ and SolarEX Titan TiO₂ coating ROI.

## Purpose

This repository contains a production-ready static web calculator for SolarEX commercial screening. It is designed to be embedded or linked from the SolarEX website and to support technical-commercial discussions with EPC teams, O&M operators, asset owners and procurement stakeholders.

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

## Reference defaults

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
404.html
robots.txt
sitemap.xml
.nojekyll
.github/workflows/deploy-pages.yml
```

## Deployment

GitHub Pages can deploy this site from GitHub Actions. In repository settings, select **Pages → Source → GitHub Actions** and run the `Deploy SolarEX ROI Calculator` workflow.

## Contact

SolarEX technical and commercial inquiries: [info@solarex.no](mailto:info@solarex.no)
