const $ = (id) => document.getElementById(id);
const CONTACT_FORM_TECHNICAL = 'https://docs.google.com/forms/d/e/1FAIpQLSeENsc9Y8OCrbqvRxTT5CO6oiezhvU7fo2enyZtbPZV9zEGwg/viewform?usp=dialog&hl=en';
const EUROPE = new Set(['NO','SE','FI','DK','IS','GB','IE','FR','DE','ES','PT','IT','NL','BE','LU','AT','CH','PL','CZ','SK','HU','SI','HR','BA','RS','ME','MK','AL','GR','BG','RO','MD','UA','LT','LV','EE']);
const MIDDLE_EAST = new Set(['SA','AE','QA','BH','KW','OM','IQ','JO','IL','PS','EG','LB','SY','YE']);
const COUNTRY_CURRENCY = {NO:'NOK',SE:'SEK',DK:'DKK',IS:'ISK',GB:'GBP',CH:'CHF',PL:'PLN',CZ:'CZK',HU:'HUF',RO:'RON',BG:'BGN',HR:'EUR',SI:'EUR',SK:'EUR',FI:'EUR',EE:'EUR',LV:'EUR',LT:'EUR',DE:'EUR',FR:'EUR',ES:'EUR',PT:'EUR',IT:'EUR',NL:'EUR',BE:'EUR',LU:'EUR',AT:'EUR',IE:'EUR',GR:'EUR',CY:'EUR',MT:'EUR',SA:'SAR',AE:'AED',QA:'QAR',BH:'BHD',KW:'KWD',OM:'OMR',IQ:'IQD',JO:'JOD',IL:'ILS',PS:'ILS',EG:'EGP',LB:'LBP',TR:'TRY',US:'USD',CA:'CAD',AU:'AUD',NZ:'NZD',JP:'JPY',CN:'CNY',IN:'INR',BR:'BRL',MX:'MXN',ZA:'ZAR'};
const PANEL_TYPES = {
  polycrystalline: { label: 'Polycrystalline', specificPower: 90 },
  monocrystalline: { label: 'Monocrystalline', specificPower: 105 },
  perc: { label: 'PERC', specificPower: 115 },
  topcon: { label: 'TOPCon', specificPower: 125 },
  perovskite: { label: 'Perovskites', specificPower: 130 }
};
let currentLocation = null;
let currentCurrency = { code:'EUR', rate:1, source:'Euro base', date:'', countryCode:'' };

function nf(value, digits = 0) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}
function eur(value, digits = 0) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { style:'currency', currency:'EUR', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}
function money(value, currency = 'EUR', digits = 0) {
  if (!Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat('en-GB', { style:'currency', currency, maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
  } catch (e) {
    return nf(value, digits) + ' ' + currency;
  }
}
function latestFullYear() { return new Date().getFullYear() - 1; }
function setStatus(text, type = 'neutral') {
  const el = $('dataStatus');
  if (!el) return;
  el.textContent = text;
  el.style.color = type === 'ok' ? 'var(--green)' : type === 'warn' ? 'var(--gold)' : type === 'error' ? 'var(--danger)' : 'var(--muted)';
}
function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
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
function currencyFromCountryCode(code) {
  return COUNTRY_CURRENCY[String(code || '').toUpperCase()] || 'EUR';
}
function selectedPanelType() {
  const value = $('panelType')?.value || 'polycrystalline';
  return PANEL_TYPES[value] || PANEL_TYPES.polycrystalline;
}
function applyPanelTypeSpecificPower() {
  const input = $('specificPower');
  if (input) input.value = String(selectedPanelType().specificPower);
}
function injectPanelTypeSelector() {
  if ($('panelType') || !$('specificPower')) return;
  const specificInput = $('specificPower');
  const specificWrapper = specificInput.closest('div') || specificInput.parentElement;
  if (!specificWrapper || !specificWrapper.parentElement) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<label for="panelType">Solar panel type</label><select id="panelType"><option value="polycrystalline" selected>Polycrystalline</option><option value="monocrystalline">Monocrystalline</option><option value="perc">PERC</option><option value="topcon">TOPCon</option><option value="perovskite">Perovskites</option></select>`;
  specificWrapper.parentElement.insertBefore(wrapper, specificWrapper);
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
  location.currency = currencyFromCountryCode(location.countryCode);
  return location;
}
function normalizeCountryCode(value) { return String(value || '').trim().toUpperCase(); }
function buildGpsDisplayName(parts) {
  const clean = parts.map(v => String(v || '').trim()).filter(Boolean).filter(v => !/^gps location$/i.test(v));
  return [...new Set(clean)].join(', ');
}
function applyResolvedLocation(location, name, countryCode) {
  const code = normalizeCountryCode(countryCode);
  if (name) location.name = name;
  if (code) location.countryCode = code;
  location.region = regionFromCountryCode(location.countryCode);
  location.currency = currencyFromCountryCode(location.countryCode);
  return location;
}
async function reverseWithBigDataCloud(location) {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
  url.searchParams.set('latitude', location.latitude);
  url.searchParams.set('longitude', location.longitude);
  url.searchParams.set('localityLanguage', 'en');
  const response = await fetch(url, { cache:'no-store' });
  if (!response.ok) throw new Error('BigDataCloud HTTP ' + response.status);
  const data = await response.json();
  const name = buildGpsDisplayName([data.locality, data.city, data.principalSubdivision, data.countryName]);
  if (!name) throw new Error('BigDataCloud returned no locality');
  return applyResolvedLocation(location, name, data.countryCode);
}
async function reverseWithNominatim(location) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', location.latitude);
  url.searchParams.set('lon', location.longitude);
  url.searchParams.set('zoom', '10');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'en');
  const response = await fetch(url, { cache:'no-store' });
  if (!response.ok) throw new Error('Nominatim HTTP ' + response.status);
  const data = await response.json();
  const a = data.address || {};
  const name = buildGpsDisplayName([a.city, a.town, a.village, a.municipality, a.county, a.state, a.country]);
  if (!name) throw new Error('Nominatim returned no locality');
  return applyResolvedLocation(location, name, a.country_code);
}
async function enrichGpsLocation(location) {
  const lat = location.latitude;
  const lon = location.longitude;
  const resolvers = [reverseWithBigDataCloud, reverseWithNominatim];
  for (const resolver of resolvers) {
    try { return await resolver(location); }
    catch (e) { location.lastReverseGeocodeError = e.message || String(e); }
  }
  location.name = `Located position (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
  return location;
}
function locateWithGps() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('GPS location is not supported in this browser.')); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const location = await enrichGpsLocation({ name:'Resolving location…', latitude: pos.coords.latitude, longitude: pos.coords.longitude, countryCode:'', timezone:'auto', region:'International', currency:'EUR' });
        resolve(location);
      } catch (error) {
        resolve({ name:`Located position (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`, latitude: pos.coords.latitude, longitude: pos.coords.longitude, countryCode:'', timezone:'auto', region:'International', currency:'EUR' });
      }
    }, (err) => reject(new Error(err.message || 'GPS location failed.')), { enableHighAccuracy:true, timeout:12000 });
  });
}
async function fetchExchangeRate(currency) {
  if (!currency || currency === 'EUR') return { code:'EUR', rate:1, source:'EUR base currency', date:new Date().toISOString().slice(0,10) };
  const endpoints = [`https://api.frankfurter.app/latest?from=EUR&to=${encodeURIComponent(currency)}`, `https://open.er-api.com/v6/latest/EUR`];
  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      let rate = null;
      const date = data.date || data.time_last_update_utc || new Date().toISOString().slice(0,10);
      if (data.rates && Number.isFinite(Number(data.rates[currency]))) rate = Number(data.rates[currency]);
      if (!rate && data.result === 'success' && data.rates && Number.isFinite(Number(data.rates[currency]))) rate = Number(data.rates[currency]);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error('rate missing');
      return { code: currency, rate, source: endpoint.includes('frankfurter') ? 'Frankfurter / ECB reference' : 'ExchangeRate-API open endpoint', date };
    } catch (error) { lastError = error; }
  }
  return { code: currency, rate:null, source:'Exchange rate unavailable', date:'', warning:lastError ? lastError.message : 'Unavailable' };
}
async function ensureLocation() {
  if (currentLocation) return currentLocation;
  const query = $('locationQuery').value.trim();
  if (!query) throw new Error('Enter a project location or use GPS.');
  currentLocation = await geocodeLocation(query);
  $('tilt').value = defaultTiltFromLat(currentLocation.latitude);
  currentCurrency = await fetchExchangeRate(currentLocation.currency);
  $('locationNote').textContent = `${currentLocation.name} · ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)} · ${currentLocation.region} · ${currentCurrency.code}`;
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
      const response = await fetch(url, { mode:'cors' });
      if (!response.ok) throw new Error(`PVGIS returned HTTP ${response.status}`);
      const data = await response.json();
      const fixed = data?.outputs?.totals?.fixed;
      const annualKwh = Number(fixed?.E_y);
      const gti = Number(fixed?.['H(i)_y']);
      if (!Number.isFinite(annualKwh) || annualKwh <= 0) throw new Error('PVGIS annual output missing.');
      return { source:'PVGIS annual PV output', baselineKwh:annualKwh, solarKwhM2:Number.isFinite(gti) ? gti : null, sunshineHours:null, year:'PVGIS climate series' };
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
  return { source:`Open-Meteo historical tilted irradiance (${year})`, baselineKwh:peakKw * solarKwhM2 * performanceRatio, solarKwhM2, sunshineHours, year };
}
function manualAnnual(peakKw, manualSunHours, lossPct) {
  const performanceRatio = 1 - (lossPct / 100);
  return { source:'Manual equivalent full-sun hours', baselineKwh:peakKw * manualSunHours * performanceRatio, solarKwhM2:manualSunHours, sunshineHours:null, year:'Manual input' };
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
function converted(value) { return currentCurrency.rate ? value * currentCurrency.rate : null; }
function updateCurrencyPanel(annualValue, netValue, capex, energyPrice) {
  const c = currentCurrency.code || 'EUR';
  const rate = currentCurrency.rate;
  if (!rate) {
    setText('localCurrencyOut', `${c} conversion unavailable`);
    setText('exchangeRateOut', 'Euro values are shown. Live exchange-rate lookup failed.');
    setText('annualValueLocalOut', 'Local conversion unavailable');
    setText('netValueLocalOut', 'Local conversion unavailable');
    return;
  }
  setText('localCurrencyOut', c === 'EUR' ? 'Local currency: EUR' : `Local currency: ${c} · Annual value ${money(converted(annualValue), c, 0)}`);
  setText('exchangeRateOut', c === 'EUR' ? 'Exchange rate used: 1 EUR = 1 EUR' : `Exchange rate used: 1 EUR = ${nf(rate, 4)} ${c} · Source: ${currentCurrency.source}${currentCurrency.date ? ' · ' + currentCurrency.date : ''}`);
  setText('annualValueLocalOut', c === 'EUR' ? '€/year' : `${eur(annualValue, 0)} / ${money(converted(annualValue), c, 0)} per year`);
  setText('netValueLocalOut', c === 'EUR' ? eur(netValue, 0) : `${eur(netValue, 0)} / ${money(converted(netValue), c, 0)}`);
}
function updateResults(result) {
  setText('baselineOut', nf(result.baselineKwh, 0));
  setText('addedOut', nf(result.addedKwh, 0));
  setText('annualValueOut', eur(result.annualValue, 0));
  setText('paybackOut', Number.isFinite(result.paybackDays) ? nf(result.paybackDays, 0) : '—');
  setText('netValueOut', eur(result.netValue, 0));
  setText('sourceBadge', result.source);
  updateCurrencyPanel(result.annualValue, result.netValue, result.capex, result.energyPrice);
  const c = currentCurrency.code || 'EUR';
  const capexLocal = currentCurrency.rate && c !== 'EUR' ? ` / ${money(result.capex * currentCurrency.rate, c, 0)}` : '';
  const priceLocal = currentCurrency.rate && c !== 'EUR' ? ` / ${money(result.energyPrice * currentCurrency.rate, c, 3)}` : '';
  const detailRows = $('detailRows');
  if (detailRows) {
    detailRows.innerHTML = `<tr><td>Solar resource</td><td>${result.solarKwhM2 ? nf(result.solarKwhM2, 0) + ' kWh/m²/year' : 'PVGIS output model'}</td></tr><tr><td>Observed sunshine duration</td><td>${result.sunshineHours ? nf(result.sunshineHours, 0) + ' h/year' : '—'}</td></tr><tr><td>Solar panel type</td><td>${result.panelTypeLabel}</td></tr><tr><td>Panel specific power</td><td>${nf(result.specificPower, 0)} W/m²</td></tr><tr><td>Peak PV capacity</td><td>${nf(result.peakKw, 2)} kWp</td></tr><tr><td>Energy value</td><td>${eur(result.energyPrice, 3)}${priceLocal} / kWh</td></tr><tr><td>Coating CAPEX</td><td>${eur(result.capex, 0)}${capexLocal}</td></tr><tr><td>Selected pathway</td><td>${result.pathwayLabel}</td></tr><tr><td>Yield uplift</td><td>${nf(result.gainPct, 2)}%</td></tr><tr><td>Data period</td><td>${result.year}</td></tr>`;
  }
  const rec = $('recommendation');
  if (rec) rec.textContent = result.recommendation + (result.warning ? ` ${result.warning}` : '');
}
async function calculate(event) {
  event.preventDefault();
  setStatus('Calculating…');
  setText('sourceBadge', 'Collecting data');
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
    updateResults({ ...annual, peakKw, specificPower, panelTypeLabel: panel.label, addedKwh, annualValue, capex, paybackDays, netValue, pathwayLabel, gainPct, energyPrice, recommendation: pathwayRecommendation(coating, location.region, gainPct, paybackDays) });
    setStatus('Complete', 'ok');
  } catch (error) {
    setStatus('Input required', 'error');
    setText('sourceBadge', 'Calculation stopped');
    const rec = $('recommendation');
    if (rec) rec.innerHTML = `Calculation could not be completed: ${error.message} <a href="${CONTACT_FORM_TECHNICAL}" target="_blank" rel="noopener">Request a SolarEX technical review</a>.`;
  }
}
function applyPreset(name) {
  if (name === 'europe') {
    $('locationQuery').value = 'Oslo'; currentLocation = null; $('panelType').value = 'polycrystalline'; applyPanelTypeSpecificPower(); $('energyPrice').value = '0.289'; $('coating').value = 'quartz'; $('gainPct').value = '10'; $('serviceLife').value = '5'; $('manualSunHours').value = '2335'; $('coatingCost').value = '2.44'; $('systemLoss').value = '0';
  }
  if (name === 'middle-east') {
    $('locationQuery').value = 'Dubai'; currentLocation = null; $('panelType').value = 'polycrystalline'; applyPanelTypeSpecificPower(); $('energyPrice').value = '0.759'; $('coating').value = 'quartz'; $('gainPct').value = '2'; $('serviceLife').value = '3'; $('manualSunHours').value = '3000'; $('coatingCost').value = '2.44'; $('systemLoss').value = '0';
  }
  if (name === 'titan') {
    $('locationQuery').value = $('locationQuery').value || 'Madrid'; currentLocation = null; $('panelType').value = 'polycrystalline'; applyPanelTypeSpecificPower(); $('coating').value = 'titan'; $('gainPct').value = '5.15'; $('serviceLife').value = '5'; $('coatingCost').value = '2.44';
  }
  $('locationNote').textContent = 'Preset loaded. Run calculation to fetch environmental and currency data for the selected site.';
  setStatus('Preset loaded');
}
window.addEventListener('DOMContentLoaded', () => {
  injectPanelTypeSelector();
  applyPanelTypeSpecificPower();
  $('roiForm')?.addEventListener('submit', calculate);
  $('coating')?.addEventListener('change', autoApplyDefaults);
  $('panelType')?.addEventListener('change', applyPanelTypeSpecificPower);
  $('locationQuery')?.addEventListener('input', () => {
    currentLocation = null;
    currentCurrency = { code:'EUR', rate:1, source:'Euro base', date:'', countryCode:'' };
    setText('localCurrencyOut', 'Awaiting project location');
    setText('exchangeRateOut', 'Enter a project location or use GPS to convert Euro values to local currency.');
  });
  $('locateBtn')?.addEventListener('click', async () => {
    setStatus('Locating…');
    $('locationQuery').value = 'Resolving location…';
    try {
      currentLocation = await locateWithGps();
      currentCurrency = await fetchExchangeRate(currentLocation.currency);
      $('locationQuery').value = currentLocation.name || `Located position (${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)})`;
      $('tilt').value = defaultTiltFromLat(currentLocation.latitude);
      $('locationNote').textContent = `${currentLocation.name} · ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)} · ${currentLocation.region} · ${currentCurrency.code}`;
      autoApplyDefaults();
      setStatus('Location ready', 'ok');
    } catch (error) {
      setStatus('GPS failed', 'error');
      $('locationNote').textContent = error.message;
    }
  });
  document.querySelectorAll('.preset').forEach((button) => button.addEventListener('click', () => applyPreset(button.dataset.preset)));
});
