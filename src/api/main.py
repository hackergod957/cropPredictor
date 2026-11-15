import requests
import os
from tensorflow import keras
import joblib
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from src.api.schemas import PredictResponse , PredictRequest
from src.data.soilgrids import fetch_soil
from src.data.nasapower import fetch_climate
import pandas as pd 
import numpy as np


model = keras.models.load_model("artifacts/model.keras")
scaler = joblib.load("artifacts/scaler.joblib")
labels = json.loads(Path("artifacts/labels.json").read_text())
FEATURES = json.loads(Path("artifacts/feature_list.json").read_text())

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=[os.getenv("EXPRESS_ORIGIN", "http://localhost:3000")],
                   allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    try :
        climate = fetch_climate(req.lat, req.lon)
        soil = fetch_soil(req.lat, req.lon)

       
        values = {
                    "temperature": climate["temperature"],
                    "humidity": climate["humidity"],
                    "ph": soil["ph"],
                    "rainfall": climate["rainfall"],
                 }
        

        row = pd.DataFrame([[values[f] for f in FEATURES]], columns=FEATURES)

        scaled = scaler.transform(row)
        probs = model.predict(scaled, verbose=0)

        top = np.argsort(probs[0])[::-1][:5]

        crops = [
            {"crop": labels[i], "score": round(float(probs[0][i]), 4)}
            for i in top
        ]

        return {
            "crops": crops,
            "temperature": values["temperature"],
            "humidity": values["humidity"],
            "rainfall": values["rainfall"],
            "ph": values["ph"],
            "ph_is_default": soil["ph_is_default"],
            "elevation": climate.get("elevation"),
        }
    
    except ValueError:  raise HTTPException(422, "No climate data for this location")
    except requests.RequestException:  raise HTTPException(502, "Climate service unavailable")