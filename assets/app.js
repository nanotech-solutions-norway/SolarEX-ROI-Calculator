const $ = (id) => document.getElementById(id);
const CONTACT_FORM_TECHNICAL = 'https://docs.google.com/forms/d/e/1FAIpQLSeENsc9Y8OCrbqvRxTT5CO6oiezhvU7fo2enyZtbPZV9zEGwg/viewform?usp=dialog&hl=en';
const EUROPE = new Set(['NO','SE','FI','DK','IS','GB','IE','FR','DE','ES','PT','NL','BE','LU','AT','CH','PL','CZ','SK','HU','SI','HR','BA','RS','ME','MK','AL','GR','BG','RO','MD','UA','LT','LV','EE']);
const MIDDLE_EAST = new Set(['SA','AE','QA','BH','KW','OM','IQ','JO','IL','PS','EG','LB','SY','YE']);
const PANEL_TYPES = {
  polycrystalline: { label: 'Polycrystalline', specificPower: 90 },
  monocrystalline: { label: 'Monocrystalline', specificPower: 105 },
  perc: { label: 'PERC', specificPower: 115 },
  topcon: { label: 'TOPCon', specificPower: 125 },
  perovskite: { label: 'Perovskites', specificPower: 130 }
};
let currentLocation = null;

function nf(value, digits = 0) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}
function eur(value, digits = 0) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}
function latestFullYear() { return new Date().getFullYear() - 1; }
function setStatus(text, type = 'neutral') {
  const el = $('dataStatus');
  if (!el) return;
  el.textContent = text;
  el.style.color = type === 'ok' ? 'var(--green)' : type === 'warn' ? 'var(--gold)' : type === 'error' ? 'var(--danger)' : 'var(--muted)';
}
function regionFromCountryCode(code) {
  if (EUROPE.has(code)) return 'Europe';
  if (MIDDLE_EAST.has(code)) return 'Middle East';
  return 'International';
}
function defaultTiltFromLat(lat) {
  const absoluteLat = Math.abs(lat || 30);
  return Math.max(10, Math.min(45, Math.round(absoluteLat * .76)));
}
function selectedPanelType() {
  const value = $('panelType')?.value || 'polycrystalline';
  return PANEL_TYPES[value] || PANEL_TYPES.polycrystalline;
}
function applyPanelTypeSpecificPower() {
  const panel = selectedPanelType();
  const input = $('specificPower');
  if (input) input.value = String(panel.specificPower);
}
function autoApplyDefaults() {
  const coating = $('coating').value;
  const region = currentLocation?.region || 'Europe';
  if (coating === 'titan') { $('gainPct').value = '5.15'; $('serviceLife').value = '5'; return; }
  if (region === 'Middle East') { $('gainPct').value = '2'; $('serviceLife').value = '3'; return; }
  if (region === 'Europe') { $('gainPct').value = '10'; $('serviceLife').value = '5'; return; }
  $('gainPct').value = '6';
  $('serviceLife').value = '5';
}
async function geocodeLocation(query) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');
  const response = await fetch(url);
  if (!response.ok) throw new Error('Location lookup failed.');
  const payload = await response.json();
  if (!payload.results || !payload.results.length) throw new Error('No matching location found.');
  const result = payload.results[0];
  const location = {
    name: [result.name, result.admin1, result.country].filter(Boolean).join(', '),
    latitude: Number(result.latitude),
    longitude: Number(result.longitude),
    countryCode: result.country_code || '',
    timezone: result.timezone || 'auto'
  };
  location.region = regionFromCountryCode(location.countryCode);
  return location;
}
async function reverseGeocodeOpenMeteo(latitude, longitude) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/reverse');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');
  const response = await fetch(url);
  if (!response.ok) throw new Error('Reverse lookup failed.');
  const payload = await response.json();
  if (!payload.results || !payload.results.length) throw new Error('No nearby location found.');
  const result = payload.results[0];
  return {
    name: [result.name, result.admin1, result.country].filter(Boolean).join(', '),
    countryCode: result.country_code || '',
    timezone: result.timezone || 'auto'
  };
}
async function reverseGeocodeFallback(latitude, longitude) {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('localityLanguage', 'en');
  const response = await fetch(url);
  if (!response.ok) throw new Error('Fallback reverse lookup failed.');
  const result = await response.json();
  const name = [result.city || result.locality, result.principalSubdivision, result.countryName].filter(Boolean).join(', ');
  if (!name) throw new Error('Fallback returned no location name.');
  return {
    name,
    countryCode: result.countryCode || '',
    timezone: 'auto'
  };
}
async function resolveGpsLocation(pos) {
  const latitude = pos.coords.latitude;
  const longitude = pos.coords.longitude;
  let resolved = null;
  try { resolved = await reverseGeocodeOpenMeteo(latitude, longitude); }
  catch (error) {
    try { resolved = await reverseGeocodeFallback(latitude, longitude); }
    catch (fallbackError) { resolved = null; }
  }
  const location = {
    name: resolved?.name || `Located site (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
    latitude,
    longitude,
    countryCode: resolved?.countryCode || '',
    timezone: resolved?.timezone || 'auto'
  };
  location.region = regionFromCountryCode(location.countryCode);
  return location;
}
function locateWithGps() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('GPS location is not supported in this browser.')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => reject(new Error(err.message || 'GPS location failed. Allow location permission or enter the project location manually.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}
async function ensureLocation() {
  if (currentLocation) return currentLocation;
  const query = $('locationQuery').value.trim();
  if (!query) throw new Error('Enter a project location or use GPS.');
  currentLocation = await geocodeLocation(query);
  $('tilt').value = defaultTiltFromLat(currentLocation.latitude);
  $('locationNote').textContent = `${currentLocation.name} · ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)} · ${currentLocation.region}`;
  autoApplyDefaults();
  return currentLocation;
}
async function fetchPvgisAnnual(location, peakKw, tilt, azimuth, lossPct) {
  const urls = ['https://re.jrc.ec.europa.eu/api/v5_3/PVcalc', 'https://re.jrc.ec.europa.eu/api/v5_2/PVcalc'];
  let lastError = null;
  for (const endpoint of urls) {
    try {
      const url = new URL(endpoint);
      url.searchParams.set('lat', location.latitude);
      url.searchParams.set('lon', location.longitude);
      url.searchParams.set('peakpower', Math.max(.001, peakKw).toFixed(4));
      url.searchParams.set('loss', String(lossPct));
      url.searchParams.set('angle', String(tilt));
      url.searchParams.set('aspect', String(azimuth));
      url.searchParams.set('outputformat', 'json');
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error(`PVGIS returned HTTP ${response.status}`);
      const data = await response.json();
      const fixed = data?.outputs?.totals?.fixed;
      const annualKwh = Number(fixed?.E_y);
      const gti = Number(fixed?.['H(i)_y']);
      if (!Number.isFinite(annualKwh) || annualKwh <= 0) throw new Error('PVGIS annual output missing.');
      return { source: 'PVGIS annual PV output', baselineKwh: annualKwh, solarKwhM2: Number.isFinite(gti) ? gti : null, sunshineHours: null, year: 'PVGIS climate series' };
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error('PVGIS unavailable.');
}
async function fetchOpenMeteoAnnual(location, peakKw, tilt, azimuth, lossPct) {
  const year = latestFullYear();
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', location.latitude);
  url.searchParams.set('longitude', location.longitude);
  url.searchParams.set('start_date', `${year}-01-01`);
  url.searchParams.set('end_date', `${year}-12-31`);
  url.searchParams.set('hourly', 'global_tilted_irradiance,sunshine_duration');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('tilt', String(tilt));
  url.searchParams.set('azimuth', String(azimuth));
  url.searchParams.set('cell_selection', 'land');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Open-Meteo returned HTTP ${response.status}`);
  const data = await response.json();
  const gtiValues = data?.hourly?.global_tilted_irradiance || [];
  const sunValues = data?.hourly?.sunshine_duration || [];
  if (!gtiValues.length) throw new Error('Open-Meteo irradiance data missing.');
  const solarKwhM2 = gtiValues.reduce((sum, value) => sum + (Number(value) || 0), 0) / 1000;
  const sunshineHours = sunValues.reduce((sum, value) => sum + (Number(value) || 0), 0) / 3600;
  const performanceRatio = 1 - (lossPct / 100);
  return { source: `Open-Meteo historical tilted irradiance (${year})`, baselineKwh: peakKw * solarKwhM2 * performanceRatio, solarKwhM2, sunshineHours, year };
}
function manualAnnual(peakKw, manualSunHours, lossPct) {
  const performanceRatio = 1 - (lossPct / 100);
  return { source: 'Manual equivalent full-sun hours', baselineKwh: peakKw * manualSunHours * performanceRatio, solarKwhM2: manualSunHours, sunshineHours: null, year: 'Manual input' };
}
async function getAnnualProduction(location, peakKw, tilt, azimuth, lossPct, manualSunHours) {
  try { return await fetchPvgisAnnual(location, peakKw, tilt, azimuth, lossPct); }
  catch (pvgisError) {
    try { return await fetchOpenMeteoAnnual(location, peakKw, tilt, azimuth, lossPct); }
    catch (openMeteoError) {
      const manual = manualAnnual(peakKw, manualSunHours, lossPct);
      manual.warning = `Live environmental data was unavailable. PVGIS: ${pvgisError.message}. Open-Meteo: ${openMeteoError.message}.`;
      return manual;
    }
  }
}
function pathwayRecommendation(coating, region, gainPct, paybackDays) {
  const p = Number.isFinite(paybackDays) ? nf(paybackDays, 0) : '—';
  if (coating === 'quartz') {
    if (region === 'Middle East') return `Quartz SiO₂ selected: passive easy-clean pathway for high-dust and water-constrained operating environments. The current model uses ${nf(gainPct, 2)}% uplift and produces a simple payback of ${p} days.`;
    if (region === 'Europe') return `Quartz SiO₂ selected: UV-independent passive pathway aligned with European and high-latitude sites. The current model uses ${nf(gainPct, 2)}% uplift and produces a simple payback of ${p} days.`;
    return 'Quartz SiO₂ selected: passive hydrophobic/oleophobic surface pathway. Use site soiling profile and cleaning data to refine uplift and O&M saving assumptions.';
  }
  return `Titan TiO₂ selected: active photocatalytic pathway. Confirm sufficient UV availability and organic/biological or industrial contamination profile during technical review. The current model uses the ${nf(gainPct, 2)}% Titan study uplift reference.`;
}
function updateResults(result) {
  $('baselineOut').textContent = nf(result.baselineKwh, 0);
  $('addedOut').textContent = nf(result.addedKwh, 0);
  $('annualValueOut').textContent = eur(result.annualValue, 0);
  $('paybackOut').textContent = Number.isFinite(result.paybackDays) ? nf(result.paybackDays, 0) : '—';
  $('netValueOut').textContent = eur(result.netValue, 0);
  $('sourceBadge').textContent = result.source;
  $('detailRows').innerHTML = `<tr><td>Solar resource</td><td>${result.solarKwhM2 ? nf(result.solarKwhM2, 0) + ' kWh/m²/year' : 'PVGIS output model'}</td></tr><tr><td>Observed sunshine duration</td><td>${result.sunshineHours ? nf(result.sunshineHours, 0) + ' h/year' : '—'}</td></tr><tr><td>Solar panel type</td><td>${result.panelTypeLabel}</td></tr><tr><td>Panel specific power</td><td>${nf(result.specificPower, 0)} W/m²</td></tr><tr><td>Peak PV capacity</td><td>${nf(result.peakKw, 2)} kWp</td></tr><tr><td>Coating CAPEX</td><td>${eur(result.capex, 0)}</td></tr><tr><td>Selected pathway</td><td>${result.pathwayLabel}</td></tr><tr><td>Yield uplift</td><td>${nf(result.gainPct, 2)}%</td></tr><tr><td>Data period</td><td>${result.year}</td></tr>`;
  $('recommendation').textContent = result.recommendation + (result.warning ? ` ${result.warning}` : '');
}
async function calculate(event) {
  event.preventDefault();
  setStatus('Calculating…');
  $('sourceBadge').textContent = 'Collecting data';
  try {
    const location = await ensureLocation();
    const area = Number($('areaM2').value);
    const specificPower = Number($('specificPower').value);
    const peakKw = (area * specificPower) / 1000;
    const energyPrice = Number($('energyPrice').value);
    const coating = $('coating').value;
    const gainPct = Number($('gainPct').value);
    const coatingCost = Number($('coatingCost').value);
    const serviceLife = Number($('serviceLife').value);
    const lossPct = Number($('systemLoss').value);
    const tilt = Number($('tilt').value);
    const azimuth = Number($('azimuth').value);
    const manualSunHours = Number($('manualSunHours').value);
    const omSaving = Number($('omSaving').value);
    const panel = selectedPanelType();
    if (![area, specificPower, peakKw, energyPrice, gainPct, coatingCost, serviceLife].every(Number.isFinite)) throw new Error('One or more required numeric inputs are invalid.');
    const annual = await getAnnualProduction(location, peakKw, tilt, azimuth, lossPct, manualSunHours);
    const addedKwh = annual.baselineKwh * (gainPct / 100);
    const annualValue = (addedKwh * energyPrice) + (area * omSaving);
    const capex = area * coatingCost;
    const paybackDays = annualValue > 0 ? (capex / annualValue) * 365 : Infinity;
    const netValue = (annualValue * serviceLife) - capex;
    const pathwayLabel = coating === 'quartz' ? 'SolarEX Quartz — SiO₂' : 'SolarEX Titan — TiO₂';
    updateResults({ ...annual, peakKw, specificPower, panelTypeLabel: panel.label, addedKwh, annualValue, capex, paybackDays, netValue, pathwayLabel, gainPct, recommendation: pathwayRecommendation(coating, location.region, gainPct, paybackDays) });
    setStatus('Complete', 'ok');
  } catch (error) {
    setStatus('Input required', 'error');
    $('sourceBadge').textContent = 'Calculation stopped';
    $('recommendation').innerHTML = `Calculation could not be completed: ${error.message} <a href="${CONTACT_FORM_TECHNICAL}" target="_blank" rel="noopener">Request a SolarEX technical review</a>.`;
  }
}
function applyPreset(name) {
  if (name === 'europe') { $('locationQuery').value = 'Oslo'; currentLocation = null; $('panelType').value = 'polycrystalline'; applyPanelTypeSpecificPower(); $('energyPrice').value = '0.289'; $('coating').value = 'quartz'; $('gainPct').value = '10'; $('serviceLife').value = '5'; $('manualSunHours').value = '2335'; $('coatingCost').value = '2.44'; $('systemLoss').value = '0'; }
  if (name === 'middle-east') { $('locationQuery').value = 'Dubai'; currentLocation = null; $('panelType').value = 'polycrystalline'; applyPanelTypeSpecificPower(); $('energyPrice').value = '0.759'; $('coating').value = 'quartz'; $('gainPct').value = '2'; $('serviceLife').value = '3'; $('manualSunHours').value = '3000'; $('coatingCost').value = '2.44'; $('systemLoss').value = '0'; }
  if (name === 'titan') { $('locationQuery').value = $('locationQuery').value || 'Madrid'; currentLocation = null; $('panelType').value = 'polycrystalline'; applyPanelTypeSpecificPower(); $('coating').value = 'titan'; $('gainPct').value = '5.15'; $('serviceLife').value = '5'; $('coatingCost').value = '2.44'; }
  $('locationNote').textContent = 'Preset loaded. Run calculation to fetch environmental data for the selected site.';
  setStatus('Preset loaded');
}
window.addEventListener('DOMContentLoaded', () => {
  $('roiForm').addEventListener('submit', calculate);
  $('coating').addEventListener('change', autoApplyDefaults);
  $('locationQuery').addEventListener('input', () => { currentLocation = null; });
  $('panelType')?.addEventListener('change', applyPanelTypeSpecificPower);
  $('locateBtn').addEventListener('click', async () => {
    setStatus('Locating…');
    try {
      const position = await locateWithGps();
      currentLocation = await resolveGpsLocation(position);
      $('locationQuery').value = currentLocation.name;
      $('tilt').value = defaultTiltFromLat(currentLocation.latitude);
      $('locationNote').textContent = `${currentLocation.name} · ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)} · ${currentLocation.region}`;
      autoApplyDefaults();
      setStatus('Location ready', 'ok');
    } catch (error) {
      setStatus('GPS failed', 'error');
      $('locationNote').textContent = `${error.message} You can still type the project location manually.`;
    }
  });
  document.querySelectorAll('.preset').forEach((button) => button.addEventListener('click', () => applyPreset(button.dataset.preset)));
});
