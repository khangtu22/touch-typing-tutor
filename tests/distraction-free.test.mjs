import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_STATE } from '../js/state.js';
import { generateSpeedTestLesson } from '../js/speed-test.js';
import { GhostRacer } from '../js/ghost-racer.js';

test('distraction-free mode settings default to false in DEFAULT_STATE', () => {
  assert.equal(DEFAULT_STATE.settings.distractionFreeMode, false);
  assert.equal(DEFAULT_STATE.settings.distractionFreeCollapse, false);
  assert.equal(DEFAULT_STATE.settings.distractionFreeSpeedHints, true);
});

test('timed speed tests provide countdown while word benchmarks have null time limit', () => {
  const timed60s = generateSpeedTestLesson('60s');
  assert.equal(timed60s.timeLimitSec, 60);

  const timed30s = generateSpeedTestLesson('30s');
  assert.equal(timed30s.timeLimitSec, 30);

  const words50 = generateSpeedTestLesson('50w');
  assert.equal(words50.timeLimitSec, null);

  const words25 = generateSpeedTestLesson('25w');
  assert.equal(words25.timeLimitSec, null);
});

test('distraction-free hiding state calculation', () => {
  // Helper to compute whether distraction-free typing is active
  const isDistractionFreeTyping = (distractionFreeMode, isStarted, isPaused) => {
    return !!distractionFreeMode && !!isStarted && !isPaused;
  };

  // Helper to compute timer visibility
  const hasCountdown = (timeRemainingSec) => {
    return timeRemainingSec !== null && timeRemainingSec !== undefined;
  };

  // 1. Before typing starts: nothing hidden
  assert.equal(isDistractionFreeTyping(true, false, false), false);

  // 2. Actively typing with distraction free mode ON: hidden
  assert.equal(isDistractionFreeTyping(true, true, false), true);

  // 3. Actively typing with distraction free mode OFF: not hidden
  assert.equal(isDistractionFreeTyping(false, true, false), false);

  // 4. Paused during typing: not hidden (reveals HUD & bot)
  assert.equal(isDistractionFreeTyping(true, true, true), false);

  // 5. Timed test has countdown: timer pill shown
  assert.equal(hasCountdown(59), true);
  assert.equal(hasCountdown(0), true);

  // 6. Word benchmark has no countdown: timer pill hidden
  assert.equal(hasCountdown(null), false);
  assert.equal(hasCountdown(undefined), false);
});

test('ghost racer telemetry functions normally when HUD is hidden', () => {
  const racer = new GhostRacer();
  racer.startRace({ totalChars: 100, mode: 'bot', botWpm: 50 });

  // Before typing starts
  const readyState = racer.update(0, false);
  assert.equal(readyState.isEnabled, true);
  assert.equal(readyState.userPct, 0);
  assert.equal(readyState.competitorPct, 0);

  // During typing race
  const activeState = racer.update(50, true);
  assert.equal(activeState.isEnabled, true);
  assert.equal(activeState.userPct, 50);
  assert.ok(activeState.competitorPct >= 0);
  assert.ok(['leading', 'trailing', 'tied'].includes(activeState.leadStatus));
});

import { getNextWordStartIndex } from '../js/ui.js';

test('getNextWordStartIndex finds the first character index of the upcoming word', () => {
  const text = 'The quick brown fox';
  // Inside first word 'The' (indices 0, 1, 2) -> next word is 'quick' at index 4
  assert.equal(getNextWordStartIndex(text, 0), 4);
  assert.equal(getNextWordStartIndex(text, 1), 4);
  assert.equal(getNextWordStartIndex(text, 2), 4);

  // At whitespace after 'The' (index 3) -> next word is 'quick' at index 4
  assert.equal(getNextWordStartIndex(text, 3), 4);

  // Inside 'quick' (indices 4..8) -> next word is 'brown' at index 10
  assert.equal(getNextWordStartIndex(text, 4), 10);
  assert.equal(getNextWordStartIndex(text, 7), 10);

  // At whitespace after 'quick' (index 9) -> next word is 'brown' at index 10
  assert.equal(getNextWordStartIndex(text, 9), 10);

  // Inside 'brown' (index 10) -> next word is 'fox' at index 16
  assert.equal(getNextWordStartIndex(text, 10), 16);

  // In the last word 'fox' (indices 16..18) -> no next word, returns -1
  assert.equal(getNextWordStartIndex(text, 16), -1);
  assert.equal(getNextWordStartIndex(text, 18), -1);

  // Edge cases
  assert.equal(getNextWordStartIndex('', 0), -1);
  assert.equal(getNextWordStartIndex('OnlyOneWord', 0), -1);
  assert.equal(getNextWordStartIndex('Two  Words', 0), 5); // Multi-space
  assert.equal(getNextWordStartIndex('Two\nWords', 0), 4); // Newline separator
});

test('distraction-free speed hints stamp on next word first character and persist ("stay there")', () => {
  const sampleText = 'The quick brown fox jumps over the lazy dog and runs across.';
  // Words and start indices:
  // "The": 0, "quick": 4, "brown": 10, "fox": 16, "jumps": 20, "over": 26, "the": 31, "lazy": 35, "dog": 40
  const speedHints = new Map();
  let lastSpeedHintIndex = 0;
  const speedHintStep = 20;

  const simulateKeystroke = (charIndex, wpm, isDistractionFree, speedHintsEnabled, isStarted, isPaused) => {
    const isCurrentlyTyping = isDistractionFree && speedHintsEnabled && isStarted && !isPaused;
    const currentWpm = Math.round(wpm || 0);

    if (isCurrentlyTyping && currentWpm > 0) {
      const minThreshold = lastSpeedHintIndex === 0 ? Math.min(speedHintStep, 16) : lastSpeedHintIndex + speedHintStep;
      if (charIndex >= minThreshold) {
        const nextWordStart = getNextWordStartIndex(sampleText, charIndex);
        if (nextWordStart !== -1) {
          if (!speedHints.has(nextWordStart)) {
            speedHints.set(nextWordStart, currentWpm);
          }
          lastSpeedHintIndex = charIndex;
        }
      }
    }
  };

  // 1. Not typing or distraction-free disabled: nothing stamped
  simulateKeystroke(5, 55, false, true, true, false);
  assert.equal(speedHints.size, 0);

  // 2. Early typing before threshold (< 16 chars): not stamped
  simulateKeystroke(10, 60, true, true, true, false);
  assert.equal(speedHints.size, 0);

  // 3. At index 16 (in "fox"): threshold 16 reached!
  // Stamped on the NEXT word's first character: 'j' in "jumps" (index 20)!
  simulateKeystroke(16, 68, true, true, true, false);
  assert.equal(speedHints.size, 1);
  assert.equal(speedHints.has(16), false); // NOT on current character!
  assert.equal(speedHints.get(20), 68);    // On next word's first character ('j' of "jumps")
  assert.equal(sampleText[20], 'j');

  // 4. Typing through word 3 and 4: hint at 20 persists ("stay there"), no new hint yet
  simulateKeystroke(22, 70, true, true, true, false);
  assert.equal(speedHints.size, 1);
  assert.equal(speedHints.get(20), 68);

  // 5. User reaches index 36 (threshold 16 + 20 = 36):
  // At index 36 ('a' in "lazy"), next word is "dog" at index 40!
  // Stamped on next word's first character ('d' of "dog" at index 40)!
  simulateKeystroke(36, 75, true, true, true, false);
  assert.equal(speedHints.size, 2);
  assert.equal(speedHints.get(20), 68); // First hint persists
  assert.equal(speedHints.get(40), 75); // Second hint on 'd' in "dog"
  assert.equal(sampleText[40], 'd');

  // 6. Backspacing retains previously placed milestone breadcrumbs
  simulateKeystroke(30, 72, true, true, true, false);
  assert.equal(speedHints.size, 2);
  assert.equal(speedHints.get(20), 68);
  assert.equal(speedHints.get(40), 75);

  // 7. Reset clears hints
  speedHints.clear();
  lastSpeedHintIndex = 0;
  assert.equal(speedHints.size, 0);
});

test('restarting a round clears old speed hints and resets milestone tracking', () => {
  const sampleText = 'The quick brown fox jumps over the lazy dog and runs across.';
  const speedHints = new Map();
  let lastSpeedHintIndex = 0;
  let lastSpeedHintRoundIdx = 0;
  const speedHintStep = 20;

  const handleStateChange = (charIndex, wpm, isDistractionFree, speedHintsEnabled, isStarted, isPaused, roundIdx = 0) => {
    // Clear old speed hints when round changes or when the round is restarted / not started
    if (lastSpeedHintRoundIdx !== roundIdx || !isStarted || charIndex === 0) {
      if (!isStarted || charIndex === 0 || lastSpeedHintRoundIdx !== roundIdx) {
        speedHints.clear();
        lastSpeedHintIndex = 0;
        lastSpeedHintRoundIdx = roundIdx;
      }
    }

    const isCurrentlyTyping = isDistractionFree && speedHintsEnabled && isStarted && !isPaused;
    const currentWpm = Math.round(wpm || 0);

    if (isCurrentlyTyping && currentWpm > 0) {
      const minThreshold = lastSpeedHintIndex === 0 ? Math.min(speedHintStep, 16) : lastSpeedHintIndex + speedHintStep;
      if (charIndex >= minThreshold) {
        const nextWordStart = getNextWordStartIndex(sampleText, charIndex);
        if (nextWordStart !== -1) {
          if (!speedHints.has(nextWordStart)) {
            speedHints.set(nextWordStart, currentWpm);
          }
          lastSpeedHintIndex = charIndex;
        }
      }
    }
  };

  // 1. Type through to create speed hints
  handleStateChange(16, 70, true, true, true, false, 0);
  assert.equal(speedHints.size, 1);
  assert.equal(speedHints.get(20), 70);

  handleStateChange(36, 78, true, true, true, false, 0);
  assert.equal(speedHints.size, 2);
  assert.equal(speedHints.get(20), 70);
  assert.equal(speedHints.get(40), 78);

  // 2. User restarts the round (typingEngine resets charIndex to 0 and isStarted to false)
  handleStateChange(0, 0, true, true, false, false, 0);

  // All old speed hints MUST be cleared immediately on round restart
  assert.equal(speedHints.size, 0);
  assert.equal(lastSpeedHintIndex, 0);

  // 3. User begins typing the restarted round from scratch
  handleStateChange(1, 0, true, true, true, false, 0);
  assert.equal(speedHints.size, 0);

  // When reaching threshold in the restarted round, fresh hints stamp accurately
  handleStateChange(16, 82, true, true, true, false, 0);
  assert.equal(speedHints.size, 1);
  assert.equal(speedHints.get(20), 82); // Fresh new WPM recorded
});
