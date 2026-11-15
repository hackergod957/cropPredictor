import model from './model/model.js';

export function predictProbabilities(values) {
  let x = model.features.map((feature, i) => {
    if (!Number.isFinite(values[feature])) throw new Error(`Invalid feature: ${feature}`);
    return (values[feature] - model.mean[i]) / model.scale[i];
  });
  for (const layer of model.layers) {
    x = layer.bias.map((bias, j) => x.reduce((sum, value, i) => sum + value * layer.weights[i][j], bias));
    if (layer.activation === 'relu') x = x.map(value => Math.max(0, value));
    if (layer.activation === 'softmax') {
      const max = Math.max(...x);
      const exp = x.map(value => Math.exp(value - max));
      const total = exp.reduce((sum, value) => sum + value, 0);
      x = exp.map(value => value / total);
    }
  }
  return x;
}

export function predictCrops(values) {
  return predictProbabilities(values)
    .map((score, i) => ({ crop: model.labels[i], score }))
    .sort((a, b) => b.score - a.score).slice(0, 5)
    .map(({ crop, score }) => ({ crop, score: Number(score.toFixed(4)) }));
}
