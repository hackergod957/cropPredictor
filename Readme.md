# Crop Predictor

Run the Python service from the repository root with its dependencies installed:

```sh
.venv/bin/python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000
```

Start the Express proxy with Node 18+:

```sh
cd server
npm ci
cp .env.example .env
npm start
```

`server/.env` sets `ML_URL=http://127.0.0.1:8000` and `PORT=3000`.
FastAPI's allowed origin defaults to `http://localhost:3000`; set
`EXPRESS_ORIGIN` in the Python process environment to override it.
Open **http://localhost:3000** for the frontend. Click the map, drag the pin,
enter coordinates, or use your current location, then select **Find my crops**.
The browser sends requests to Express at `/api/recommend`.

Map tiles (OpenStreetMap) and optional web fonts need internet access.
Location access requires localhost or HTTPS and browser permission.
The frontend shows live API results; start both services to get predictions.

```sh
curl -i http://localhost:3000/api/recommend \
  -H 'Content-Type: application/json' \
  -d '{"lat":27.60,"lon":84.35}'
```

Out-of-range coordinates (for example `{"lat":100,"lon":84.35}`) should
return FastAPI's 422 validation JSON through Express. An unavailable Python
service returns 503 with `{"detail":"Prediction service unavailable"}`.
Climate service failures pass through as 502. Requests time out after 20 seconds. NASA uses a 3-second connect / 8-second
read timeout; the optional SoilGrids lookup uses 2 / 3 seconds before falling
back to the default pH. This keeps normal upstream failures within the proxy budget.

Run proxy tests with `npm test --prefix server`. These use a local mock upstream
to verify the proxy independently of NASA, SoilGrids, and the model.
See [DEVLOG.md](DEVLOG.md) for the climate findings and model limitation.
