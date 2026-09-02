/**
 * Keybr-Style Adaptive Weakness & Digraph Generator
 * Dynamically synthesizes targeted muscle-memory drills based on user key error rates and latency.
 */

const VOWELS = ['a', 'e', 'i', 'o', 'u'];
const COMMON_CONSONANTS = ['t', 'n', 's', 'r', 'h', 'l', 'd', 'c', 'm', 'f', 'p', 'g', 'w', 'b', 'v', 'k'];

/**
 * Analyzes key stats to determine the weakest keys, slowest keys, and overall key health.
 * @param {object} keyStats - state.keyStats
 * @returns {{
 *   weakKeys: Array<{char: string, accuracy: number, attempts: number, errors: number, avgLatencyMs: number}>,
 *   slowKeys: Array<{char: string, avgLatencyMs: number}>,
 *   untestedKeys: Array<string>,
 *   primaryWeakKeys: Array<string>
 * }}
 */
export function getWeakKeyAnalysis(keyStats = {}) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const analyzed = [];
  const untestedKeys = [];

  for (const char of alphabet) {
    const stat = keyStats[char];
    if (!stat || !stat.attempts || stat.attempts < 5) {
      untestedKeys.push(char);
      continue;
    }

    const accuracy = Math.max(0, Math.min(100, Math.round(((stat.attempts - stat.errors) / stat.attempts) * 100)));
    const avgLatencyMs = stat.totalLatencyMs && stat.attempts ? Math.round(stat.totalLatencyMs / stat.attempts) : 250;

    analyzed.push({
      char,
      accuracy,
      attempts: stat.attempts,
      errors: stat.errors,
      avgLatencyMs
    });
  }

  // Sort by lowest accuracy first, then highest errors, then highest latency
  analyzed.sort((a, b) => {
    if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
    if (a.errors !== b.errors) return b.errors - a.errors;
    return b.avgLatencyMs - a.avgLatencyMs;
  });

  const weakKeys = analyzed.filter(k => k.accuracy < 94 || k.errors >= 2);
  const slowKeys = [...analyzed].sort((a, b) => b.avgLatencyMs - a.avgLatencyMs).slice(0, 5);

  // Pick top 3 target keys (or fallback to untested or common weak spots)
  let primaryWeakKeys = weakKeys.slice(0, 3).map(k => k.char);
  if (primaryWeakKeys.length < 3 && untestedKeys.length > 0) {
    primaryWeakKeys.push(...untestedKeys.slice(0, 3 - primaryWeakKeys.length));
  }
  if (primaryWeakKeys.length === 0) {
    primaryWeakKeys = ['p', 'q', 'b']; // default challenging finger targets
  }

  return {
    weakKeys,
    slowKeys,
    untestedKeys,
    primaryWeakKeys
  };
}

/**
 * Generates a realistic pronounceable pseudo-word containing target keys.
 * @param {Array<string>} targetKeys
 * @param {number} minLen
 * @param {number} maxLen
 * @returns {string}
 */
function generatePseudoWord(targetKeys, minLen = 3, maxLen = 6) {
  const length = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
  const targetChar = targetKeys[Math.floor(Math.random() * targetKeys.length)];
  let word = '';

  // Determine starting structure (Consonant-Vowel or Vowel-Consonant)
  let needVowel = Math.random() > 0.4;
  const targetPos = Math.floor(Math.random() * length);

  for (let i = 0; i < length; i++) {
    if (i === targetPos) {
      word += targetChar;
      needVowel = !VOWELS.includes(targetChar);
    } else if (needVowel) {
      const v = VOWELS[Math.floor(Math.random() * VOWELS.length)];
      word += v;
      needVowel = false;
    } else {
      const pool = Math.random() > 0.4 ? COMMON_CONSONANTS : targetKeys;
      const c = pool[Math.floor(Math.random() * pool.length)];
      word += c;
      needVowel = true;
    }
  }

  return word;
}

/**
 * Generates an adaptive Keybr-style targeted drill lesson.
 * @param {object} keyStats
 * @param {object} [options]
 * @returns {{
 *   id: string,
 *   title: string,
 *   subtitle: string,
 *   skillFocus: string,
 *   targetKeys: Array<string>,
 *   targetWpm: number,
 *   accuracyTarget: number,
 *   rounds: Array<string>,
 *   isAdaptiveDrill: boolean
 * }}
 */
export function generateWeaknessDrill(keyStats = {}, options = {}) {
  const analysis = getWeakKeyAnalysis(keyStats);
  const targetKeys = options.targetKeys || analysis.primaryWeakKeys;
  const keysDisplay = targetKeys.map(k => k.toUpperCase()).join(' & ');

  // Generate 3 progressive rounds
  // Round 1: Short syllables (3-4 letters)
  const round1Words = Array.from({ length: 14 }, () => generatePseudoWord(targetKeys, 3, 4));
  const round1 = round1Words.join(' ');

  // Round 2: Mixed length words (4-6 letters)
  const round2Words = Array.from({ length: 16 }, () => generatePseudoWord(targetKeys, 4, 6));
  const round2 = round2Words.join(' ');

  // Round 3: Endurance flow (5-7 letters)
  const round3Words = Array.from({ length: 18 }, () => generatePseudoWord(targetKeys, 4, 7));
  const round3 = round3Words.join(' ');

  return {
    id: `drill_${targetKeys.join('')}_${Date.now()}`,
    title: `Keybr Precision: ${keysDisplay}`,
    subtitle: `AI Muscle Memory Conditioning for [ ${keysDisplay} ]`,
    skillFocus: `Targeted biomechanical accuracy conditioning for ${keysDisplay}`,
    targetKeys,
    targetWpm: 45,
    accuracyTarget: 96,
    estimatedMinutes: 2,
    rounds: [round1, round2, round3],
    isAdaptiveDrill: true
  };
}

/**
 * Generates an immediate targeted drill from a list of mistyped words.
 * @param {Array<string>} mistypedWords
 * @returns {{
 *   id: string,
 *   title: string,
 *   subtitle: string,
 *   skillFocus: string,
 *   rounds: Array<string>,
 *   isMissedWordsDrill: boolean
 * }}
 */
export function generateMissedWordsDrill(mistypedWords = []) {
  const uniqueWords = Array.from(new Set(mistypedWords.map(w => w.trim()).filter(w => w.length > 0)));
  const cleanWords = uniqueWords.length > 0 ? uniqueWords : ['practice', 'accuracy', 'focus'];

  // Repeat words in shuffled order across 2 focused rounds
  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

  const round1List = [];
  while (round1List.length < 18) {
    round1List.push(...shuffle(cleanWords));
  }
  const round1 = round1List.slice(0, 18).join(' ');

  const round2List = [];
  while (round2List.length < 20) {
    round2List.push(...shuffle(cleanWords));
  }
  const round2 = round2List.slice(0, 20).join(' ');

  return {
    id: `missed_words_${Date.now()}`,
    title: `🔁 Missed Words Reinforcement`,
    subtitle: `Targeted mastery drill for ${cleanWords.length} error word${cleanWords.length > 1 ? 's' : ''}`,
    skillFocus: `Flawless repetition of: ${cleanWords.slice(0, 5).join(', ')}${cleanWords.length > 5 ? '...' : ''}`,
    targetWpm: 50,
    accuracyTarget: 98,
    estimatedMinutes: 2,
    rounds: [round1, round2],
    isMissedWordsDrill: true,
    mistypedWords: cleanWords
  };
}
