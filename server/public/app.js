import { getCropGuide } from './crop-guides.js';

const form = document.querySelector('#location-form');
const latInput = document.querySelector('#lat');
const lonInput = document.querySelector('#lon');
const submit = document.querySelector('#submit');
const status = document.querySelector('#status');
const empty = document.querySelector('#empty-state');
const results = document.querySelector('#results');
const subtitle = document.querySelector('#result-subtitle');
let map;
let marker;
let activeRequest;
let revision = 0;
let resultContext;
const guidePanel = document.querySelector('#farming-guide');
let selectedCropButton;

function closeGuide(restoreFocus = false) {
  guidePanel.hidden = true;
  selectedCropButton?.setAttribute('aria-expanded', 'false');
  if (restoreFocus && selectedCropButton?.isConnected) selectedCropButton.focus();
  selectedCropButton = undefined;
}

document.querySelector('#close-guide').addEventListener('click', () => closeGuide(true));
guidePanel.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeGuide(true);
});

function openGuide(crop, button) {
  const guide = getCropGuide(crop);
  if (!guide) {
    message('A farming guide is not available for this crop yet.', true);
    return;
  }
  closeGuide();
  selectedCropButton = button;
  button.setAttribute('aria-expanded', 'true');
  const title = document.querySelector('#guide-title');
  title.textContent = `How to grow ${guide.name.toLowerCase()}`;
  document.querySelector('#guide-system').textContent = guide.system;
  const { data, lat, lon } = resultContext;
  document.querySelector('#guide-location').textContent = `Your selected spot: ${lat.toFixed(4)}°, ${lon.toFixed(4)}° · Annual temperature: ${data.temperature} °C · Annual relative humidity: ${data.humidity}% · Soil pH: ${data.ph}${data.ph_is_default ? ' (default estimate)' : ''}. These readings are context, not a season-specific forecast.`;
  document.querySelector('#guide-steps').replaceChildren(...guide.steps.map((step, index) => {
    const item = document.createElement('li');
    const number = document.createElement('span');
    number.className = 'guide-step-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const content = document.createElement('div');
    const heading = document.createElement('h3');
    heading.textContent = step.title;
    const text = document.createElement('p');
    text.textContent = step.text;
    content.append(heading, text);
    item.append(number, content);
    return item;
  }));
  const source = document.querySelector('#guide-source');
  source.href = guide.source.url;
  source.textContent = `${guide.source.title} ↗`;
  guidePanel.hidden = false;
  guidePanel.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  title.focus({ preventScroll: true });
}

function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle('error', error);
}

function resetResults() {
  closeGuide();
  resultContext = undefined;
  revision += 1;
  activeRequest?.abort();
  submit.disabled = false;
  submit.firstElementChild.textContent = 'Find my crops';
  empty.classList.remove('loading');
  empty.hidden = false;
  results.hidden = true;
  subtitle.textContent = 'A shortlist, inspired by local conditions.';
  message('Location updated. Find crops for your selected spot.');
}

function coordinates() {
  if (!form.reportValidity()) return null;
  return [Number(latInput.value), Number(lonInput.value)];
}

function selectLocation(lat, lon, zoom = 9) {
  latInput.value = lat.toFixed(5);
  lonInput.value = lon.toFixed(5);
  if (map) {
    marker.setLatLng([lat, lon]);
    map.setView([lat, lon], zoom);
  }
  resetResults();
}

if (window.L) {
  map = L.map('map', { scrollWheelZoom: false }).setView([27.6, 84.35], 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);
  marker = L.marker([27.6, 84.35], {
    draggable: true,
    icon: L.divIcon({ className: 'map-pin', iconSize: [22, 22], iconAnchor: [11, 11] }),
  }).addTo(map);
  map.on('click', ({ latlng }) => selectLocation(latlng.lat, latlng.lng, map.getZoom()));
  marker.on('dragend', () => {
    const { lat, lng } = marker.getLatLng();
    selectLocation(lat, lng, map.getZoom());
  });
} else {
  document.querySelector('#map').textContent = 'Map unavailable. Enter coordinates below to continue.';
  document.querySelector('.map-hint').hidden = true;
}

for (const input of [latInput, lonInput]) {
  input.addEventListener('input', resetResults);
  input.addEventListener('change', () => {
    const point = coordinates();
    if (point && map) {
      marker.setLatLng(point);
      map.setView(point, map.getZoom());
    }
  });
}
document.querySelector('#chitwan').addEventListener('click', () => selectLocation(27.6, 84.35));
document.querySelector('#locate').addEventListener('click', () => {
  if (!navigator.geolocation) {
    message('Location is not supported here. Select a spot on the map instead.', true);
    return;
  }
  message('Finding your location…');
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => selectLocation(coords.latitude, coords.longitude, 11),
    () => message('Couldn’t access your location. Allow location access or enter coordinates.', true),
    { timeout: 10000, maximumAge: 60000 },
  );
});

function condition(label, value, unit) {
  const box = document.createElement('div');
  box.className = 'condition';
  const title = document.createElement('span');
  title.textContent = label;
  const number = document.createElement('strong');
  number.textContent = Number.isFinite(value) ? Number(value).toFixed(1) : '—';
  const suffix = document.createElement('small');
  suffix.textContent = ` ${unit}`;
  number.append(suffix);
  box.append(title, number);
  return box;
}

function render(data, lat, lon) {
  if (!Array.isArray(data.crops) || !data.crops.length || data.crops.some(crop =>
    typeof crop.crop !== 'string' || !Number.isFinite(crop.score))) {
    throw new Error('The prediction service returned an unexpected response. Please try again.');
  }
  document.querySelector('#conditions').replaceChildren(
    condition('Temperature', data.temperature, '°C'),
    condition('Relative humidity', data.humidity, '%'),
    condition('Rainfall · monthly estimate', data.rainfall, 'mm'),
    condition('Soil pH', data.ph, ''),
  );
  resultContext = { data, lat, lon };
  const list = document.querySelector('#crop-list');
  list.replaceChildren();
  data.crops.slice(0, 5).forEach((crop, index) => {
    const row = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'crop';
    button.setAttribute('aria-controls', 'farming-guide');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', `View farming guide for ${crop.crop}`);
    button.addEventListener('click', () => openGuide(crop.crop, button));
    const rank = document.createElement('span');
    rank.className = 'crop-rank';
    rank.textContent = String(index + 1).padStart(2, '0');
    const name = document.createElement('span');
    name.className = 'crop-name';
    name.textContent = getCropGuide(crop.crop)?.name ?? crop.crop.replaceAll('_', ' ');
    const score = Math.min(1, Math.max(0, crop.score)) * 100;
    const track = document.createElement('span');
    track.className = 'score-track';
    track.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('span');
    fill.style.width = `${score}%`;
    track.append(fill);
    const value = document.createElement('span');
    value.className = 'crop-score';
    value.textContent = `${score.toFixed(1)}%`;
    button.append(rank, name, track, value);
    row.append(button);
    list.append(row);
  });
  document.querySelector('#soil-note').hidden = !data.ph_is_default;
  subtitle.textContent = `Results for ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
  empty.hidden = true;
  results.hidden = false;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const point = coordinates();
  if (!point) return;
  const [lat, lon] = point;
  closeGuide();
  resultContext = undefined;
  activeRequest?.abort();
  const controller = new AbortController();
  activeRequest = controller;
  const currentRevision = ++revision;
  const timeout = setTimeout(() => controller.abort(), 25000);
  submit.disabled = true;
  submit.firstElementChild.textContent = 'Checking your patch…';
  results.hidden = true;
  empty.hidden = false;
  empty.classList.add('loading');
  message('Gathering climate and soil data. This can take about 20 seconds.');
  try {
    const response = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon }),
      signal: controller.signal,
    });
    const data = await response.json();
    if (currentRevision !== revision) return;
    if (!response.ok) {
      const detail = typeof data.detail === 'string' ? data.detail : 'Check your coordinates and try again.';
      throw new Error(detail);
    }
    render(data, lat, lon);
    message('Your shortlist is ready. Explore the possibilities.');
  } catch (error) {
    if (currentRevision !== revision) return;
    message(error.name === 'AbortError'
      ? 'The request took too long. Please try again.'
      : error instanceof TypeError || error instanceof SyntaxError
        ? 'Couldn’t reach the prediction service. Please try again shortly.'
        : error.message, true);
  } finally {
    clearTimeout(timeout);
    if (currentRevision === revision) {
      submit.disabled = false;
      submit.firstElementChild.textContent = 'Find my crops';
      empty.classList.remove('loading');
    }
  }
});
