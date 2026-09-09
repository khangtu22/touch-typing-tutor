import test from 'node:test';
import assert from 'node:assert/strict';

import {
  WORDS_200,
  WORDS_1K,
  WORDS_5K,
  VOCABULARY_PRESETS,
  VOCABULARY_POOLS,
  getVocabularyPool
} from '../js/vocabularies.js';

import {
  SPEED_TEST_PRESETS,
  COMMON_WORDS_POOL,
  generateWordsText,
  generateSpeedTestLesson,
  calculateConsistency
} from '../js/speed-test.js';

import { store, DEFAULT_STATE } from '../js/state.js';

test('vocabulary pools integrity and structure', () => {
  assert.equal(WORDS_200.length, 200, 'WORDS_200 must have exactly 200 words');
  assert.equal(WORDS_1K.length, 1000, 'WORDS_1K must have exactly 1000 words');
  assert.equal(WORDS_5K.length, 5000, 'WORDS_5K must have exactly 5000 words');

  // Verify unique words
  assert.equal(new Set(WORDS_200).size, 200, 'WORDS_200 contains no duplicates');
  assert.equal(new Set(WORDS_1K).size, 1000, 'WORDS_1K contains no duplicates');
  assert.equal(new Set(WORDS_5K).size, 5000, 'WORDS_5K contains no duplicates');

  // Verify non-empty lowercase alphanumeric strings
  for (const w of WORDS_200) assert.match(w, /^[a-z]+$/, `Invalid 200 word: ${w}`);
  for (const w of WORDS_1K) assert.match(w, /^[a-z]+$/, `Invalid 1k word: ${w}`);
  for (const w of WORDS_5K) assert.match(w, /^[a-z]+$/, `Invalid 5k word: ${w}`);

  // Presets definition
  assert.equal(VOCABULARY_PRESETS.length, 3, 'There are 3 vocabulary presets');
  const ids = VOCABULARY_PRESETS.map(v => v.id);
  assert.deepEqual(ids, ['200', '1k', '5k'], 'Preset IDs match 200, 1k, 5k');

  // getVocabularyPool
  assert.equal(getVocabularyPool('200').length, 200);
  assert.equal(getVocabularyPool('1k').length, 1000);
  assert.equal(getVocabularyPool('5k').length, 5000);
  assert.equal(getVocabularyPool('unknown').length, 200, 'Unknown vocabId falls back to 200');

  // Backwards compatible export
  assert.equal(COMMON_WORDS_POOL.length, 200, 'COMMON_WORDS_POOL points to 200 words');
});

test('generateWordsText draws from correct vocabulary pool without adjacent repeats', () => {
  const text200 = generateWordsText(80, '200');
  const words200 = text200.split(' ');
  assert.equal(words200.length, 80, 'Generates requested count');
  const set200 = new Set(WORDS_200);
  words200.forEach((w, i) => {
    assert(set200.has(w), `Word "${w}" should be in WORDS_200`);
    if (i > 0) assert.notEqual(w, words200[i - 1], 'No adjacent repeated words');
  });

  const text1k = generateWordsText(100, '1k');
  const words1k = text1k.split(' ');
  assert.equal(words1k.length, 100);
  const set1k = new Set(WORDS_1K);
  words1k.forEach((w, i) => {
    assert(set1k.has(w), `Word "${w}" should be in WORDS_1K`);
    if (i > 0) assert.notEqual(w, words1k[i - 1], 'No adjacent repeated words');
  });

  const text5k = generateWordsText(100, '5k');
  const words5k = text5k.split(' ');
  assert.equal(words5k.length, 100);
  const set5k = new Set(WORDS_5K);
  words5k.forEach((w, i) => {
    assert(set5k.has(w), `Word "${w}" should be in WORDS_5K`);
    if (i > 0) assert.notEqual(w, words5k[i - 1], 'No adjacent repeated words');
  });
});

test('generateSpeedTestLesson supports vocabulary modes and presets', () => {
  const lesson60sDefault = generateSpeedTestLesson('60s');
  assert.equal(lesson60sDefault.speedTestPreset, '60s');
  assert.equal(lesson60sDefault.speedTestVocab, '200');
  assert.equal(lesson60sDefault.title, '60s Standard');
  assert.equal(lesson60sDefault.timeLimitSec, 60);

  const lesson60s1k = generateSpeedTestLesson('60s', '1k');
  assert.equal(lesson60s1k.speedTestPreset, '60s');
  assert.equal(lesson60s1k.speedTestVocab, '1k');
  assert.equal(lesson60s1k.title, '60s Standard · 1K');
  assert.equal(lesson60s1k.timeLimitSec, 60);
  assert(lesson60s1k.subtitle.includes('English 1k'));

  const lesson25w5k = generateSpeedTestLesson('25w', '5k');
  assert.equal(lesson25w5k.speedTestPreset, '25w');
  assert.equal(lesson25w5k.speedTestVocab, '5k');
  assert.equal(lesson25w5k.title, '25 Words · 5K');
  assert.equal(lesson25w5k.timeLimitSec, null);
  assert.equal(lesson25w5k.rounds[0].split(' ').length, 25);
});

test('store isolates personal records per vocabulary tier with backwards-compatibility', () => {
  // store imported directly
  store.writeToStorage = () => {};
  store.state = structuredClone(DEFAULT_STATE);

  // Initial records are empty
  assert.equal(store.getSpeedTestBest('60s', '200'), null);
  assert.equal(store.getSpeedTestBest('60s', '1k'), null);
  assert.equal(store.getSpeedTestBest('60s', '5k'), null);

  // 1. Record 60s in default 200 mode
  const res200 = store.recordSpeedTestResult({
    presetId: '60s',
    vocabMode: '200',
    wpm: 80,
    accuracy: 97,
    consistency: 85
  });
  assert.equal(res200.isNewPB, true);
  // Backwards compatibility: accessible via both '60s' and '60s_200'
  assert.equal(store.state.speedTestBests['60s'].wpm, 80);
  assert.equal(store.state.speedTestBests['60s_200'].wpm, 80);
  assert.equal(store.getSpeedTestBest('60s', '200').wpm, 80);
  assert.equal(store.getSpeedTestBest('60s', '1k'), null, '1k has no record yet');

  // 2. Record 60s in 1k mode
  const res1k = store.recordSpeedTestResult({
    presetId: '60s',
    vocabMode: '1k',
    wpm: 65,
    accuracy: 94,
    consistency: 78
  });
  assert.equal(res1k.isNewPB, true);
  assert.equal(store.state.speedTestBests['60s_1k'].wpm, 65);
  assert.equal(store.getSpeedTestBest('60s', '1k').wpm, 65);
  // Default 200 record remains completely untouched
  assert.equal(store.getSpeedTestBest('60s', '200').wpm, 80);
  assert.equal(store.state.speedTestBests['60s'].wpm, 80);

  // 3. Record 60s in 5k mode
  const res5k = store.recordSpeedTestResult({
    presetId: '60s',
    vocabMode: '5k',
    wpm: 55,
    accuracy: 92,
    consistency: 70
  });
  assert.equal(res5k.isNewPB, true);
  assert.equal(store.getSpeedTestBest('60s', '5k').wpm, 55);
  assert.equal(store.getSpeedTestBest('60s', '1k').wpm, 65);
  assert.equal(store.getSpeedTestBest('60s', '200').wpm, 80);

  // 4. Test legacy record lookup without composite key
  store.state.speedTestBests = { '30s': { wpm: 90, accuracy: 98, consistency: 90, date: '2026-09-09' } };
  assert.equal(store.getSpeedTestBest('30s', '200').wpm, 90, 'Legacy 30s record seamlessly resolves for 200');
  assert.equal(store.getSpeedTestBest('30s', '1k'), null, 'Legacy 30s record does not bleed into 1k');
});
