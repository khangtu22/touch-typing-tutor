import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_STATE } from '../js/state.js';
import { generateSpeedTestLesson } from '../js/speed-test.js';
import { GhostRacer } from '../js/ghost-racer.js';

test('distraction-free mode settings default to false in DEFAULT_STATE', () => {
  assert.equal(DEFAULT_STATE.settings.distractionFreeMode, false);
  assert.equal(DEFAULT_STATE.settings.distractionFreeCollapse, false);
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
