from src.features.preprocess import load_and_prepare
from src.models.mlp import build_mlp
from tensorflow import keras
import tensorflow as tf
import numpy as np
import json
from pathlib import Path
import joblib

tf.random.set_seed(42)
np.random.seed(42)

def train():

    X_tr, X_te, y_tr, y_te,scaler,le = load_and_prepare("data/raw/Crop_recommendation.csv")

    model = build_mlp(X_tr.shape[1], len(le.classes_))

    model.fit(X_tr, y_tr, validation_split=0.15, epochs=500, batch_size=32,
          callbacks=[keras.callbacks.EarlyStopping(patience=15, restore_best_weights=True)])

    model.save("artifacts/model.keras")
    Path("artifacts/labels.json").write_text(json.dumps(list(le.classes_)))
    print(joblib.load("artifacts/scaler.joblib").mean_)

    print(model.evaluate(X_te, y_te))

if __name__ == "__main__":

     train()
     