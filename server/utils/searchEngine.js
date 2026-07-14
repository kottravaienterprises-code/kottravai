const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'handmade',
  'have', 'in', 'into', 'is', 'it', 'its', 'of', 'on', 'or', 'our', 'premium',
  'natural', 'eco', 'friendly', 'kottravai', 'the', 'this', 'to', 'with', 'your'
]);

const TOKEN_SYNONYMS = {
  'cofee': 'coffee',
  'coffe': 'coffee',
  'coff': 'coffee',
  'coffeed': 'coffee',
  'neckles': 'necklace',
  'necklase': 'necklace',
  'necklage': 'necklace',
  'neckl': 'necklace',
  'plantr': 'planter',
  'plantter': 'planter',
  'plantters': 'planter',
  'soapp': 'soap',
  'soop': 'soap',
  'hampers': 'hamper',
  'gift': 'gift',
  'gifts': 'gift',
  'mugs': 'mug',
  'cups': 'cup',
  'jewellery': 'jewelry',
  'jewelry': 'jewelry'
};

const normalizeSearchText = (value) => {
  if (!value) return '';

  const cleaned = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  const tokens = cleaned
    .split(' ')
    .map((token) => TOKEN_SYNONYMS[token] || token)
    .filter((token) => Boolean(token) && !STOP_WORDS.has(token));

  return tokens.join(' ');
};

const buildSearchTokens = (value) => {
  const normalized = normalizeSearchText(value);
  return normalized ? normalized.split(' ').filter(Boolean) : [];
};

module.exports = {
  normalizeSearchText,
  buildSearchTokens
};
