import test from 'node:test';
import assert from 'node:assert/strict';
import { ArcadeChallengeRun, ARCADE_CHALLENGES } from '../js/arcade-challenge-model.js';

const completeWord = run => { for (const char of run.word.slice(run.cursor)) run.type(char); };
const miss = run => run.type(run.word[run.cursor] === 'x' ? 'z' : 'x');

for (const game of ARCADE_CHALLENGES) {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    test(`${game.title}: a full ${difficulty} round wins and cannot score after completion`, () => {
      const run = new ArcadeChallengeRun(game.key, difficulty, () => 0);
      for (let i = 0; i < game.goal; i++) {
        if (run.phase === 'ready') run.study();
        if (run.phase === 'study') run.advance(run.level.previewMs);
        run.advance(3000);
        completeWord(run);
      }
      assert.equal(run.finished, true);
      assert.equal(run.victory, true);
      assert.equal(run.completed.length, game.goal);
      assert.equal(run.bestCombo, game.goal);
      assert.equal(run.metrics.accuracy, 100);
      assert.ok(run.metrics.wpm > 0);
      assert.equal(run.metrics.xpEarned, game.goal * 3 + 25);
      const finalState = JSON.stringify(run);
      run.advance(10000);
      run.type('a');
      run.hint();
      run.finish(false);
      assert.equal(JSON.stringify(run), finalState);
    });
  }
}

test('garden tolerates unlimited mistakes and rewards clean words', () => {
  const run = new ArcadeChallengeRun('garden', 'easy', () => 0);
  for (let i = 0; i < 20; i++) miss(run);
  assert.equal(run.health, 5);
  assert.equal(run.finished, false);
  completeWord(run);
  assert.equal(run.score, 100);
  assert.equal(run.completed[0].clean, false);
  completeWord(run);
  assert.equal(run.score, 225);
  assert.equal(run.completed[1].clean, true);
  assert.ok(run.metrics.accuracy < 100);
});

test('stack repairs only flawless floors and caps stability', () => {
  const run = new ArcadeChallengeRun('stack', 'easy', () => 0);
  miss(run);
  completeWord(run);
  assert.equal(run.health, 4);
  completeWord(run);
  assert.equal(run.health, 5);
  completeWord(run);
  assert.equal(run.health, 5);
});

for (const key of ['stack', 'recall']) {
  test(`${key}: five mistakes lose the round without a victory bonus`, () => {
    const run = new ArcadeChallengeRun(key);
    if (key === 'recall') { run.study(); run.recall(); }
    for (let i = 0; i < 5; i++) miss(run);
    assert.equal(run.finished, true);
    assert.equal(run.victory, false);
    assert.equal(run.health, 0);
    assert.equal(run.metrics.xpEarned, 0);
    assert.equal(run.metrics.accuracy, 0);
  });
}

test('recall waits for Start, ignores typing during study, and hides at the deadline', () => {
  const run = new ArcadeChallengeRun('recall', 'easy');
  run.advance(90000);
  run.type('a');
  assert.equal(run.elapsedMs, 0);
  assert.equal(run.attempts, 0);
  run.study();
  run.advance(4999);
  run.type(run.word[0]);
  assert.equal(run.phase, 'study');
  assert.equal(run.attempts, 0);
  run.advance(1);
  assert.equal(run.phase, 'typing');
  assert.equal(run.elapsedMs, 5000);
});

test('recall hints preserve typed letters, remove only the word bonus, and restart the preview', () => {
  const run = new ArcadeChallengeRun('recall', 'easy', () => 0);
  run.study();
  run.recall();
  run.type(run.word[0]);
  run.hint();
  assert.equal(run.cursor, 1);
  assert.equal(run.health, 5);
  assert.equal(run.previewLeftMs, 5000);
  run.advance(5000);
  completeWord(run);
  assert.equal(run.score, 100);
  assert.equal(run.completed[0].clean, false);
  assert.equal(run.hinted, false);
  assert.equal(run.phase, 'study');
});

test('input normalization, unsupported keys, difficulty fallback and non-repeating words', () => {
  const run = new ArcadeChallengeRun('garden', 'unknown', () => 0);
  assert.equal(run.difficulty, 'medium');
  for (const char of ['Enter', ' ', '2', '_']) run.type(char);
  assert.equal(run.attempts, 0);
  const previous = run.word;
  for (const char of previous.toUpperCase()) run.type(char);
  assert.notEqual(run.word, previous);
  assert.equal(run.metrics.accuracy, 100);
  assert.throws(() => new ArcadeChallengeRun('unknown'));
});

test('all displayed word-length ranges match their banks', () => {
  for (const [difficulty, min, max] of [['easy', 3, 4], ['medium', 4, 7], ['hard', 8, 11]]) {
    const run = new ArcadeChallengeRun('garden', difficulty);
    assert.ok(run.words.every(word => word.length >= min && word.length <= max));
  }
});

test('new arcade records merge old saves, preserve other records, and persist XP once per result', async () => {
  let saved = JSON.stringify({ xp: 80, arcadeStats: { invadersHighScore: 999, totalGamesPlayed: 2 } });
  globalThis.localStorage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
  const { store } = await import('../js/state.js');
  for (const game of ARCADE_CHALLENGES) {
    assert.equal(store.getState().arcadeStats[game.stat], 0);
    store.recordArcadeResult({ gameId: game.id, score: 250, xpEarned: 30, victory: true });
    store.recordArcadeResult({ gameId: game.id, score: 100, xpEarned: 0 });
    assert.equal(store.getState().arcadeStats[game.stat], 250);
  }
  assert.equal(store.getState().arcadeStats.invadersHighScore, 999);
  assert.equal(store.getState().arcadeStats.totalGamesPlayed, 8);
  assert.equal(store.getState().xp, 170);
  store.persist();
  const reloaded = store.loadState();
  assert.equal(reloaded.arcadeStats.recallHighScore, 250);
  assert.equal(reloaded.xp, 170);
  delete globalThis.localStorage;
});
