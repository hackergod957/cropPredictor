"""Export the trained dense model and scaler for dependency-free Node inference.

Run from the repository root: .venv/bin/python scripts/export_model.py
"""
import json
from pathlib import Path

import joblib
from tensorflow import keras

root = Path(__file__).resolve().parents[1]
model = keras.models.load_model(root / 'artifacts/model.keras')
scaler = joblib.load(root / 'artifacts/scaler.joblib')
layers = []
for layer in model.layers:
    if isinstance(layer, keras.layers.Dropout):
        continue  # Dropout is inactive during prediction.
    if not isinstance(layer, keras.layers.Dense):
        raise ValueError(f'Unsupported inference layer: {type(layer).__name__}')
    activation = layer.get_config()['activation']
    if activation not in ('relu', 'softmax'):
        raise ValueError(f'Unsupported activation: {activation}')
    weights, bias = layer.get_weights()
    layers.append({'weights': weights.tolist(), 'bias': bias.tolist(), 'activation': activation})
output = {
    'features': json.loads((root / 'artifacts/feature_list.json').read_text()),
    'labels': json.loads((root / 'artifacts/labels.json').read_text()),
    'mean': scaler.mean_.tolist(),
    'scale': scaler.scale_.tolist(),
    'layers': layers,
}
path = root / 'server/model/model.js'
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text('export default ' + json.dumps(output, separators=(',', ':')) + ';\n')
print(f'Exported {path.relative_to(root)}')
