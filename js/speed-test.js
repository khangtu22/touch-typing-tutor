/**
 * Standard Benchmark Speed Test Engine
 * Implements Monkeytype & 10FastFingers standard timed and word-count trials.
 */

import { VOCABULARY_PRESETS, VOCABULARY_POOLS, getVocabularyPool, WORDS_200 } from './vocabularies.js';

export { VOCABULARY_PRESETS, VOCABULARY_POOLS, getVocabularyPool };

export const SPEED_TEST_PRESETS = [
  { id: '15s', type: 'time', value: 15, label: '15s Burst', icon: '⚡', desc: 'A quick sprint to find your top speed' },
  { id: '30s', type: 'time', value: 30, label: '30s Sprint', icon: '⏱️', desc: 'Build momentum in half a minute' },
  { id: '60s', type: 'time', value: 60, label: '60s Standard', icon: '🏆', desc: 'One minute to find your everyday pace' },
  { id: '120s', type: 'time', value: 120, label: '120s Endurance', icon: '🔋', desc: 'Long-form consistency challenge' },
  { id: '25w', type: 'words', value: 25, label: '25 Words', icon: '📝', desc: 'Compact word target' },
  { id: '50w', type: 'words', value: 50, label: '50 Words', icon: '🎯', desc: 'Standard word trial' },
  { id: '100w', type: 'words', value: 100, label: '100 Words', icon: '📚', desc: 'Extended word endurance' }
];

// Top 200 high-frequency English words for standardized benchmarks (backwards-compatible export)
export const COMMON_WORDS_POOL = WORDS_200;

/**
 * Generates a random sequence of words from the selected vocabulary pool.
 * @param {number} count
 * @param {string} vocabMode - '200', '1k', or '5k'
 * @returns {string}
 */
export function generateWordsText(count = 50, vocabMode = '200') {
  const pool = getVocabularyPool(vocabMode);
  const words = [];
  let lastWord = '';
  for (let i = 0; i < count; i++) {
    let w;
    do {
      w = pool[Math.floor(Math.random() * pool.length)];
    } while (w === lastWord && pool.length > 1);
    words.push(w);
    lastWord = w;
  }
  return words.join(' ');
}

/**
 * Computes the Monkeytype-standard typing speed consistency percentage.
 * Consistency measures how uniform your keystroke pace was throughout the test.
 * @param {Array<number>} wpmSamples - Array of periodic instantaneous WPM readings
 * @returns {number} 0-100 percentage
 */
export function calculateConsistency(wpmSamples = []) {
  if (!wpmSamples || !Array.isArray(wpmSamples) || wpmSamples.length < 3) return 100;

  const validSamples = wpmSamples
    .map(v => (typeof v === 'number' ? v : (v && typeof v.wpm === 'number' ? v.wpm : NaN)))
    .filter(v => Number.isFinite(v) && v > 0);
  if (validSamples.length < 3) return 100;

  const mean = validSamples.reduce((a, b) => a + b, 0) / validSamples.length;
  if (mean <= 0) return 100;

  const variance = validSamples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / validSamples.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of Variation (CV) = stdDev / mean
  const cv = stdDev / mean;
  const consistency = Math.max(0, Math.min(100, Math.round(100 * (1 - cv))));
  return consistency;
}

/**
 * Builds a lesson object ready for TypingEngine representing a speed benchmark test.
 * @param {string} presetId - e.g. '15s', '30s', '60s', '25w', '50w'
 * @param {string} vocabMode - '200', '1k', or '5k'
 * @returns {object}
 */
export function generateSpeedTestLesson(presetId = '60s', vocabMode = '200') {
  const preset = SPEED_TEST_PRESETS.find(p => p.id === presetId) || SPEED_TEST_PRESETS[2];
  const vocab = VOCABULARY_PRESETS.find(v => v.id === vocabMode) || VOCABULARY_PRESETS[0];

  let text;
  let timeLimit = null;

  if (preset.type === 'time') {
    // Generate an abundant pool of words that exceeds what anyone could type in the allotted seconds
    // (approx 220 WPM * time in minutes)
    const wordsNeeded = Math.ceil((220 / 60) * preset.value) + 30;
    text = generateWordsText(wordsNeeded, vocab.id);
    timeLimit = preset.value;
  } else {
    text = generateWordsText(preset.value, vocab.id);
    timeLimit = null;
  }

  const titleSuffix = vocab.id !== '200' ? ` · ${vocab.shortLabel.toUpperCase()}` : '';

  return {
    id: `speedtest_${preset.id}_${vocab.id}_${Date.now()}`,
    title: `${preset.label}${titleSuffix}`,
    subtitle: `${vocab.label} · ${preset.desc}`,
    skillFocus: `Standardized speed & consistency (${vocab.label})`,
    targetWpm: 60,
    accuracyTarget: 95,
    estimatedMinutes: preset.type === 'time' ? Math.ceil(preset.value / 60) : 1,
    timeLimitSec: timeLimit,
    rounds: [text],
    isSpeedTest: true,
    speedTestPreset: preset.id,
    speedTestVocab: vocab.id,
    speedTestType: preset.type
  };
}
