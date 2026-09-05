/**
 * Standard Benchmark Speed Test Engine
 * Implements Monkeytype & 10FastFingers standard timed and word-count trials.
 */

export const SPEED_TEST_PRESETS = [
  { id: '15s', type: 'time', value: 15, label: '15s Burst', icon: '⚡', desc: 'Short sprint for peak raw velocity' },
  { id: '30s', type: 'time', value: 30, label: '30s Sprint', icon: '⏱️', desc: 'Fast test of burst stamina' },
  { id: '60s', type: 'time', value: 60, label: '60s Standard', icon: '🏆', desc: 'Official typing speed benchmark' },
  { id: '120s', type: 'time', value: 120, label: '120s Endurance', icon: '🔋', desc: 'Long-form consistency challenge' },
  { id: '25w', type: 'words', value: 25, label: '25 Words', icon: '📝', desc: 'Compact word target' },
  { id: '50w', type: 'words', value: 50, label: '50 Words', icon: '🎯', desc: 'Standard word trial' },
  { id: '100w', type: 'words', value: 100, label: '100 Words', icon: '📚', desc: 'Extended word endurance' }
];

// Top 200 high-frequency English words for standardized benchmarks
export const COMMON_WORDS_POOL = [
  'the', 'be', 'of', 'and', 'a', 'to', 'in', 'he', 'have', 'it', 'that', 'for', 'they', 'with', 'as', 'not',
  'on', 'she', 'at', 'by', 'this', 'we', 'you', 'do', 'but', 'his', 'from', 'they', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who',
  'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people',
  'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only',
  'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well',
  'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'great', 'world', 'here',
  'life', 'hand', 'part', 'child', 'eye', 'woman', 'place', 'work', 'week', 'case', 'point', 'company', 'number',
  'group', 'problem', 'fact', 'right', 'program', 'hear', 'system', 'water', 'run', 'small', 'keep', 'face',
  'become', 'interest', 'large', 'big', 'often', 'open', 'same', 'together', 'light', 'might', 'begin', 'help',
  'talk', 'turn', 'start', 'show', 'hear', 'play', 'move', 'like', 'live', 'believe', 'hold', 'bring', 'happen',
  'must', 'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn',
  'change', 'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend'
];

/**
 * Generates a random sequence of words from the common pool.
 * @param {number} count
 * @returns {string}
 */
export function generateWordsText(count = 50) {
  const words = [];
  let lastWord = '';
  for (let i = 0; i < count; i++) {
    let w;
    do {
      w = COMMON_WORDS_POOL[Math.floor(Math.random() * COMMON_WORDS_POOL.length)];
    } while (w === lastWord && COMMON_WORDS_POOL.length > 1);
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
 * @returns {object}
 */
export function generateSpeedTestLesson(presetId = '60s') {
  const preset = SPEED_TEST_PRESETS.find(p => p.id === presetId) || SPEED_TEST_PRESETS[2];

  let text;
  let timeLimit = null;

  if (preset.type === 'time') {
    // Generate an abundant pool of words that exceeds what anyone could type in the allotted seconds
    // (approx 200 WPM * time in minutes)
    const wordsNeeded = Math.ceil((220 / 60) * preset.value) + 30;
    text = generateWordsText(wordsNeeded);
    timeLimit = preset.value;
  } else {
    text = generateWordsText(preset.value);
    timeLimit = null;
  }

  return {
    id: `speedtest_${preset.id}_${Date.now()}`,
    title: `⚡ Speed Benchmark (${preset.label})`,
    subtitle: `${preset.desc}`,
    skillFocus: `Standardized speed & consistency measurement`,
    targetWpm: 60,
    accuracyTarget: 95,
    estimatedMinutes: preset.type === 'time' ? Math.ceil(preset.value / 60) : 1,
    timeLimitSec: timeLimit,
    rounds: [text],
    isSpeedTest: true,
    speedTestPreset: preset.id,
    speedTestType: preset.type
  };
}
