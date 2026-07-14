const assert = require('assert');
const { normalizeSearchText, buildSearchTokens } = require('./utils/searchEngine');

const cases = [
  ['cofee', 'coffee'],
  ['neckles', 'necklace'],
  ['plantr', 'planter'],
  ['Kottravai Handmade Heal Soap', 'heal soap'],
  ['Premium Eco Friendly Natural Coffee Mug', 'coffee mug']
];

for (const [input, expected] of cases) {
  const normalized = normalizeSearchText(input);
  assert.notStrictEqual(normalized.includes(expected), false, `${input} should normalize to include ${expected}`);
}

const tokens = buildSearchTokens('Coffee Mug Set');
assert.deepStrictEqual(tokens, ['coffee', 'mug', 'set']);

console.log('search engine regression checks passed');
