import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { predictProbabilities } from './inference.js';
import { recommend } from './recommend.js';

const fixtures = JSON.parse(readFileSync(new URL('./test-fixtures/keras-predictions.json', import.meta.url)));
test('exported model matches reference Keras predictions', () => {
  for (const { values, probabilities } of fixtures) {
    const actual = predictProbabilities(values);
    actual.forEach((score, i) => assert.ok(Math.abs(score - probabilities[i]) < 1e-5));
  }
});
const climate = { header: { fill_value: -999 }, properties: { parameter: {
  T2M: { ANN: 24.5 }, RH2M: { ANN: 56.17 }, PRECTOTCORR: { ANN: 3.65 },
} }, geometry: { coordinates: [84.35, 27.6, 357.81] } };
const ok = value => ({ ok: true, json: async () => value });

test('uses live climate, soil pH and the trained model', async () => {
  const result = await recommend(27.6, 84.35, async url => String(url).includes('power.larc') ? ok(climate) : ok({
    properties: { layers: [{ depths: [{ values: { mean: 60 } }], unit_measure: { d_factor: 10 } }] },
  }));
  assert.equal(result.crops.length, 5);
  assert.equal(result.crops[0].crop, 'pigeonpeas');
  assert.equal(result.ph, 6);
  assert.equal(result.ph_is_default, false);
  assert.equal(result.elevation, 357.81);
});
test('soil failure uses and reports the default pH', async () => {
  const result = await recommend(27.6, 84.35, async url => {
    if (String(url).includes('power.larc')) return ok(climate);
    throw new Error('Soil timeout');
  });
  assert.equal(result.ph, 6.5);
  assert.equal(result.ph_is_default, true);
});
test('climate failure returns 502', async () => {
  await assert.rejects(recommend(27.6, 84.35, async () => { throw new Error('timeout'); }), { status: 502 });
});
test('missing climate values return 422', async () => {
  await assert.rejects(recommend(27.6, 84.35, async () => ok({})), { status: 422 });
});
test('invalid coordinates are rejected before fetching', async () => {
  for (const [lat, lon] of [[100, 0], [0, 200], [undefined, 2], ['27.6', 84.35], [NaN, 0]]) {
    await assert.rejects(recommend(lat, lon, () => { throw new Error('must not fetch'); }), { status: 422 });
  }
});
