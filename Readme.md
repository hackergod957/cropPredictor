# Sprout · Crop Predictor

Sprout is a small crop recommendation app built for a Hack Club project.
Choose a location on a map, enter coordinates, or use your browser's location
button. The app uses NASA POWER climate data and SoilGrids soil pH to rank
five crops with a trained neural network. Results include temperature,
humidity, estimated monthly rainfall, soil pH, and model scores.

The frontend is plain HTML/CSS/JavaScript with Leaflet. Express serves it
locally. The same trained model also runs in a Vercel Node function, so the
hosted app does not depend on a Python process running on someone's laptop.

## Run locally (Node only)

You need **Node.js 20+**, npm, and an internet connection. No API keys are needed.
The exported model and original Python model files are included in this repo.

```sh
git clone https://github.com/hackergod957/cropPredictor.git
cd cropPredictor
npm ci --prefix server
cp server/.env.example server/.env
npm start --prefix server
```

Open **http://localhost:3000**. Select **Try Chitwan, Nepal**, then **Find my crops**.
The `.env` copy is a first-time setup step; preserve your settings on later runs.
If an existing `server/.env` sets `ML_URL`, remove that line to use Node inference.

The browser calls `POST /api/recommend`. The server fetches climate and soil
data, standardizes the four model features, and evaluates the exported trained
weights. SoilGrids failures use a default pH of 6.5, clearly marked in results.
NASA failures return 502; locations without climate data return 422.

Map tiles and optional web fonts require internet access. Browser location needs
permission and either localhost or HTTPS. Manual coordinates still work without
location permission.

## Farming guides

After getting recommendations, select any crop to open its growing guide.
All 22 model crops have a five-step guide covering site and season planning,
planting, water, crop care and harvest, with an agricultural extension or
research source link. Guides show the selected location's climate and soil
readings as context, and mark fallback soil pH.

These are built-in educational summaries, not LLM-generated or personalized
agronomic plans. No API key or paid AI service is needed. Confirm local seasons,
varieties, spacing and input rates before planting. Changing the location clears
the guide so old results are not shown for a new spot.

## Deploy to Vercel

Import this repository into Vercel and set **Root Directory to `server`**.
The included `server/vercel.json` defines the static build and Node API function.
No Python install, `ML_URL`, or external prediction backend is required.
The build copies Leaflet's assets into the public directory.

Alternatively, from an authenticated Vercel CLI:

```sh
cd server
npx vercel --prod
```

After deploying, open the production URL in a private browser window and request
a prediction. Make sure visitors are not required to sign into Vercel. Use that
verified production URL as the submission demo and add it to this README.
A local `localhost` address is only a development address, not a public demo.

## Test

```sh
npm test --prefix server
npm run build --prefix server
curl -i http://localhost:3000/api/recommend \
  -H 'Content-Type: application/json' \
  -d '{"lat":27.60,"lon":84.35}'
```

Tests cover model parity with saved Keras reference predictions, coordinate
validation, upstream climate errors, soil fallback, and the optional FastAPI
proxy's status passthrough and transport failures.

## Optional: original Python API and training

The original FastAPI service and training code are retained. The development
environment used **Python 3.14**; the dependency file includes prerelease
TensorFlow/Keras versions. Use a virtual environment from the repository root:

```sh
python3.14 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000
```

In another terminal, set `ML_URL=http://127.0.0.1:8000` in `server/.env`, then
start Express. The proxy has a 20-second timeout. FastAPI's allowed origin
defaults to `http://localhost:3000`; set `EXPRESS_ORIGIN` in the Python process
environment to override it. `GET /health` checks the Python service.

To retrain, obtain `Crop_recommendation.csv` and place it at
`data/raw/Crop_recommendation.csv`. The training CSV is **not included**;
running the shipped model does not require it. The expected columns are
`temperature`, `humidity`, `ph`, `rainfall`, and `label`. Additional N/P/K columns
are ignored. Run these from the repository root:

```sh
.venv/bin/python -m src.models.train
.venv/bin/python scripts/export_model.py
npm test --prefix server
```

Retraining updates `artifacts/`; exporting updates `server/model/model.js`.
Recheck the Keras reference fixtures if intentionally changing the model.
The export contains dense weights, ReLU/softmax activations, scaler statistics,
feature order, and crop labels. Dropout is inactive during inference.

## Limitations

This is an exploratory recommendation tool, not a yield forecast or planting
advice. Model scores are not calibrated guarantees. Annual climate averages may
differ from the growing-season conditions represented by training data.
Rainfall is estimated from NASA's annual daily precipitation rate multiplied by
30.4; its compatibility with training rainfall remains a limitation. Nutrient
levels, irrigation, local crop varieties, and farming practices are not modeled.
Soil pH can be a fallback value. Elevation is metadata, not a model feature.

See [DEVLOG.md](DEVLOG.md) for the Chitwan humidity check and development findings.
