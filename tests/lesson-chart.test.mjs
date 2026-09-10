import test from 'node:test';
import assert from 'node:assert/strict';
import { TypingEngine } from '../js/typing-engine.js';
import { store } from '../js/state.js?v=3.8.1';
import { buildLessonChartData } from '../js/lesson-chart.js';

function run(t, settings = {}) {
  let now = 10000;
  t.mock.method(Date, 'now', () => now);
  const previous = store.state.settings;
  store.state.settings = { ...previous, wordCorrectionMode: false, metronomeEnabled: false, suddenDeath: false, ...settings };
  const engine = new TypingEngine();
  engine.startLesson({ id: 1, title: 'Telemetry test', rounds: ['abc def\nxyz abc def'], wpmTarget: 30, accuracyTarget: 90 });
  engine.stopWpmSampling();
  t.after(() => { engine.stopWpmSampling(); engine.stopSprintCountdown(); engine.clearRoundTransition(); store.state.settings = previous; });
  return { engine, at: value => { now = 10000 + value; }, key: value => engine.handleKeyDown({ key: value, preventDefault() {} }) };
}

test('error events retain typed/expected keys, use active time, and reset on retry', t => {
  const { engine, at, key } = run(t);
  key('x');
  at(1400); key('a'); engine.recordPaceSample();
  at(2000); engine.pause();
  at(22000); key('q');
  assert.equal(engine.getActiveElapsedMs(), 2000);
  engine.resume();
  at(22500); key('z');
  assert.deepEqual(engine.errorHistory, [
    { timeSec: 0, expected: 'a', typed: 'x', round: 1 },
    { timeSec: 2.5, expected: 'b', typed: 'z', round: 1 }
  ]);
  let summary;
  engine.onLessonFinished = value => { summary = value; };
  at(22850); engine.finishLesson();
  assert.equal(summary.durationSec, 2.85);
  assert.equal(summary.wpmHistory.at(-1).timeSec, 2.85);
  assert.equal(summary.wpmHistory.at(-1).wpm, summary.wpm);
  assert.equal(summary.errorHistory.length, summary.totalErrors);
  engine.retryLesson(); engine.stopWpmSampling();
  assert.deepEqual(engine.errorHistory, []);
  assert.deepEqual(engine.wpmHistory, []);
});

test('Backspace corrections preserve original errors and do not become mistypes', t => {
  const { engine, at, key } = run(t, { wordCorrectionMode: true });
  key('x'); at(1000); key('Backspace'); key('a');
  assert.equal(engine.charIndex, 1);
  assert.equal(engine.errorHistory.length, 1);
  assert.equal(engine.totalAttempts, 2);
  assert.equal(engine.errorHistory[0].expected, 'a');
});

test('whitespace errors and sudden-death resets retain accurate event details', t => {
  const { engine, at, key } = run(t, { wordCorrectionMode: true });
  key('a'); at(500); key('b'); key('c'); key('x');
  key('d'); key('e'); key('f'); key('Tab');
  assert.deepEqual(engine.errorHistory.map(({ expected, typed }) => ({ expected, typed })), [
    { expected: ' ', typed: 'x' }, { expected: '\n', typed: '\t' }
  ]);
  store.state.settings.suddenDeath = true;
  key('q');
  assert.equal(engine.charIndex, 0);
  assert.equal(engine.errorHistory.at(-1).expected, 'x');
  assert.equal(engine.errorHistory.length, engine.totalErrors);
});

test('long lessons retain their beginning; short final fragments do not spike raw pace', t => {
  const { engine, at, key } = run(t);
  key('a');
  for (let i = 2; i <= 125; i++) {
    at(i * 1000); engine.totalAttempts = i * 5; engine.totalCorrect = i * 4;
    engine.recordPaceSample();
  }
  assert.equal(engine.wpmHistory[0].timeSec, 2);
  assert.equal(engine.wpmHistory.length, 124);
  at(125010); engine.totalAttempts++;
  engine.recordPaceSample();
  assert.equal(engine.wpmHistory.length, 124);
  assert.equal(engine.wpmHistory.at(-1).timeSec, 125.01);
  assert.equal(engine.wpmHistory.at(-1).rawWpm, 71);
  const last = { ...engine.wpmHistory.at(-1) };
  engine.recordPaceSample();
  assert.deepEqual(engine.wpmHistory.at(-1), last);
});

test('very short runs have a final sample and timed runs stop at their deadline', t => {
  const { engine, at, key } = run(t);
  key('x'); at(100);
  let summary;
  engine.onLessonFinished = value => { summary = value; };
  engine.finishLesson();
  assert.equal(summary.wpmHistory.length, 1);
  assert.equal(summary.wpmHistory[0].timeSec, summary.durationSec);
  assert.equal(summary.accuracy, 0);
  engine.retryLesson(); engine.stopWpmSampling(); key('a');
  engine.lesson.timeLimitSec = 15;
  at(30100); engine.finishLesson();
  assert.equal(summary.durationSec, 15);
  assert.equal(summary.wpmHistory.at(-1).timeSec, 15);
});

test('chart model supports legacy, empty, zero and irregular samples without inventing error timing', () => {
  assert.equal(buildLessonChartData().samples.length, 0);
  const legacy = buildLessonChartData({ wpmHistory: [0, 20, 35], durationSec: 5, totalErrors: 2 });
  assert.equal(legacy.hasRaw, false);
  assert.equal(legacy.hasErrorTiming, false);
  assert.equal(legacy.errorBuckets.length, 0);
  assert.equal(legacy.samples[0].wpm, 0);
  const result = buildLessonChartData({ wpmHistory: [
    { timeSec: 5, wpm: 20 }, { timeSec: 1, wpm: 10 }, { timeSec: 5, wpm: 25 },
    { timeSec: 8, wpm: NaN }, { timeSec: 9, wpm: -3 }
  ], durationSec: 15, errorHistory: [
    { timeSec: 0 }, { timeSec: .1 }, { timeSec: 14.9 }, { timeSec: 15 }, { timeSec: -1 }
  ] });
  assert.deepEqual(result.samples.map(s => [s.timeSec, s.wpm]), [[1, 10], [5, 25]]);
  assert.deepEqual(result.errorBuckets.map(b => [b.second, b.count]), [[0, 2], [14, 2]]);
  assert.equal(result.totalErrors, 4);
});
