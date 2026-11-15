import { predictCrops } from './inference.js';

export class PredictionError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function getJson(url, timeoutMs, fetchImpl) {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`Upstream HTTP ${response.status}`);
  return response.json();
}

export async function recommend(lat, lon, fetchImpl = fetch) {
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
      typeof lon !== 'number' || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new PredictionError(422, 'Latitude must be between -90 and 90; longitude between -180 and 180.');
  }
  const climateUrl = new URL('https://power.larc.nasa.gov/api/temporal/climatology/point');
  climateUrl.search = new URLSearchParams({ parameters: 'T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M', community: 'AG', latitude: lat, longitude: lon, format: 'JSON' });
  let climate;
  try {
    climate = await getJson(climateUrl, 11000, fetchImpl);
  } catch {
    throw new PredictionError(502, 'Climate service unavailable. Please try again.');
  }
  const parameters = climate.properties?.parameter;
  const annual = ['T2M', 'RH2M', 'PRECTOTCORR'].map(key => parameters?.[key]?.ANN);
  if (annual.some(value => !Number.isFinite(value) || value === climate.header?.fill_value)) {
    throw new PredictionError(422, 'No climate data for this location');
  }
  const [temperature, humidity, dailyRainfall] = annual;
  let ph = 6.5;
  let ph_is_default = true;
  const soilUrl = new URL('https://rest.isric.org/soilgrids/v2.0/properties/query');
  soilUrl.search = new URLSearchParams({ lat, lon, property: 'phh2o', depth: '0-5cm', value: 'mean' });
  try {
    const soil = await getJson(soilUrl, 5000, fetchImpl);
    const layer = soil.properties?.layers?.[0];
    const value = layer?.depths?.[0]?.values?.mean;
    const factor = layer?.unit_measure?.d_factor;
    if (Number.isFinite(value) && Number.isFinite(factor) && factor > 0) {
      ph = value / factor;
      ph_is_default = false;
    }
  } catch { /* Soil is optional; report the default through ph_is_default. */ }
  const values = { temperature, humidity, rainfall: dailyRainfall * 30.4, ph };
  const elevation = climate.geometry?.coordinates?.[2];
  return { crops: predictCrops(values), ...values, ph_is_default, elevation: Number.isFinite(elevation) ? elevation : null };
}
