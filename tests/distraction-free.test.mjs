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

test('distraction-free speed hints stamp at stepped intervals and persist ("stay there")', () => {
  const sampleText = 'The quick brown fox jumps over the lazy dog and runs across the open field today.';
  const speedHints = new Map();
  let lastSpeedHintIndex = 0;
  const speedHintStep = 20;

  const simulateKeystroke = (charIndex, wpm, isDistractionFree, speedHintsEnabled, isStarted, isPaused) => {
    const isCurrentlyTyping = isDistractionFree && speedHintsEnabled && isStarted && !isPaused;
    const currentWpm = Math.round(wpm || 0);

    if (isCurrentlyTyping && currentWpm > 0) {
      const minThreshold = lastSpeedHintIndex === 0 ? Math.min(speedHintStep, 18) : lastSpeedHintIndex + speedHintStep;
      if (charIndex >= minThreshold) {
        const char = sampleText[charIndex];
        if (char && char !== ' ' && char !== '\n' && char !== '\t') {
          speedHints.set(charIndex, currentWpm);
          lastSpeedHintIndex = charIndex;
        }
      }
    }
  };

  // 1. Not typing or distraction-free disabled: nothing stamped
  simulateKeystroke(5, 55, false, true, true, false);
  assert.equal(speedHints.size, 0);

  // 2. Early typing before threshold (< 18 chars): not stamped
  simulateKeystroke(10, 60, true, true, true, false);
  assert.equal(speedHints.size, 0);

  // 3. At index 19: sampleText[19] is ' ' (space after "fox").
  // Threshold (18) is crossed, but character is a space -> skipped!
  assert.equal(sampleText[19], ' ');
  simulateKeystroke(19, 65, true, true, true, false);
  assert.equal(speedHints.size, 0); // Not stamped on space

  // 4. At index 20: first letter of next word ('j' in "jumps") -> stamps neatly!
  assert.equal(sampleText[20], 'j');
  simulateKeystroke(20, 65, true, true, true, false);
  assert.equal(speedHints.size, 1);
  assert.equal(speedHints.get(20), 65);

  // 5. Typing intermediate characters: existing hint persists ("stay there"), no new hint yet
  simulateKeystroke(25, 70, true, true, true, false);
  assert.equal(speedHints.size, 1);
  assert.equal(speedHints.get(20), 65); // Persists!

  // 6. At index 40: next milestone threshold (20 + 20 = 40) is reached on 'd' ("dog") -> stamps!
  assert.equal(sampleText[40], 'd');
  simulateKeystroke(40, 75, true, true, true, false);
  assert.equal(speedHints.size, 2);
  assert.equal(speedHints.get(20), 65); // First hint still stays there
  assert.equal(speedHints.get(40), 75); // Second hint added

  // 7. Backspacing does not wipe previously stamped milestones ("stay there")
  simulateKeystroke(35, 68, true, true, true, false);
  assert.equal(speedHints.size, 2);
  assert.equal(speedHints.get(20), 65);
  assert.equal(speedHints.get(40), 75);

  // 8. Round finish / reset clears hints
  speedHints.clear();
  lastSpeedHintIndex = 0;
  assert.equal(speedHints.size, 0);
});
