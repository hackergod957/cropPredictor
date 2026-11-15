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

function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle('error', error);
}

function resetResults() {
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
  const list = document.querySelector('#crop-list');
  list.replaceChildren();
  data.crops.slice(0, 5).forEach((crop, index) => {
    const row = document.createElement('li');
    row.className = 'crop';
    const rank = document.createElement('span');
    rank.className = 'crop-rank';
    rank.textContent = String(index + 1).padStart(2, '0');
    const name = document.createElement('span');
    name.className = 'crop-name';
    name.textContent = crop.crop.replaceAll('_', ' ');
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
    row.append(rank, name, track, value);
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
