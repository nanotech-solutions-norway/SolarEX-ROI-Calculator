# Validation Log - Apply ROI Future Self Note

Generated: 17:24, 22.06.2026 Europe/Oslo
Repository: `nanotech-solutions-norway/SolarEX-ROI-Calculator`
Branch: `gh-pages`
Status: GH_PAGES_BASELINE_PRESERVED_PANEL_TYPE_ADDED_PENDING_LIVE_BROWSER_VALIDATION
Labels: ROI, GPS, CURRENCY, PANEL_TYPE, USER_CORRECTION

## User input

User uploaded `SolarEX_ROI_Calculator_Future_Self_Note.md` and instructed to use what is needed.

## Key baseline adopted

The note states that the stable ROI Calculator is a standalone project deployed from `gh-pages`, and that validated GPS, currency conversion, PVGIS, Open-Meteo and manual fallback logic should not be disturbed.

## Action performed

The previous correction had been applied to `main`, but the uploaded note identifies `gh-pages` as the deployment branch. The active correction was therefore applied to `gh-pages`.

### Preserved

- Existing GPS workflow with `Resolving location…` state.
- Reverse geocoding that displays locality, region and country where available.
- Coordinate fallback when reverse geocoding fails.
- Local currency mapping and live EUR-based exchange-rate lookup.
- Euro and local-currency result rendering.
- PVGIS annual PV-output priority.
- Open-Meteo fallback.
- Manual full-sun-hour fallback.
- SolarEX Quartz SiO₂ / SolarEX Titan TiO₂ technical separation.
- Existing standalone visual system and favicon posture.

### Added

- Solar panel type selector injected by `assets/app.js` if the field is absent from the static HTML.
- Panel type options:
  - Polycrystalline — default, 90 W/m²
  - Monocrystalline — 105 W/m²
  - PERC — 115 W/m²
  - TOPCon — 125 W/m²
  - Perovskites — 130 W/m²
- Panel type changes update the editable Panel specific power field.
- Result details now include Solar panel type and Panel specific power.
- Presets reset panel type to Polycrystalline and preserve 90 W/m² default.
- README updated to document `gh-pages` branch deployment and the Future Self Note constraints.

## Files changed

| File | Branch | Purpose |
|---|---|---|
| `assets/app.js` | `gh-pages` | Added panel type support while preserving validated GPS/currency logic. |
| `README.md` | `gh-pages` | Updated deployment and change-control documentation. |
| `docs/validation/20260622-gh-pages-future-note-application.md` | `gh-pages` | This validation log. |

## Pending live validation

After GitHub Pages deployment/cache refresh:

1. Open `https://nanotech-solutions-norway.github.io/SolarEX-ROI-Calculator/`.
2. Confirm the Solar panel type selector appears.
3. Confirm default is Polycrystalline.
4. Confirm PERC, TOPCon and Perovskites are available.
5. Confirm changing panel type updates Panel specific power.
6. Confirm Use GPS first shows `Resolving location…`.
7. Confirm GPS resolves to locality/region/country or coordinates.
8. Confirm local-currency output remains visible after location/GPS calculation.
9. Run one ROI calculation and confirm results include Solar panel type and Panel specific power.

## Safety status

No private credentials, API keys, SQL configuration, backend logic, customer-data storage, cookies or database connection were added.
