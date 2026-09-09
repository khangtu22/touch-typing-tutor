import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULUM, estimateLessonMinutes, generateWeakKeysLesson, generateWeakFingerLesson } from '../js/curriculum.js';
import { FINGERS, getFingerForKey } from '../js/finger-mapping.js';
import { LAYOUTS } from '../js/layouts.js';

const printable = text => /^[\x20-\x7e]+$/.test(text) && text === text.trim() && !text.includes('  ');

test('lesson IDs remain compatible with saved progress', () => {
  assert.deepEqual(CURRICULUM.map(lesson => lesson.id), Array.from({length:30}, (_, i) => i + 1));
});
const taught = new Set();
for (const lesson of CURRICULUM) {
  lesson.newKeys.forEach(key => taught.add(key));
  const available = new Set(taught);
  test(`lesson ${lesson.id}: only taught keys, meaningful practice, and complete cues`, () => {
    assert.equal(lesson.rounds.length, 4);
    assert.equal(lesson.roundLabels.length, 4);
    assert.equal(lesson.roundTips.length, 4);
    assert.ok(lesson.practiceTip.length > 30);
    for (const round of lesson.rounds) {
      assert.ok(printable(round), `unsupported or ambiguous whitespace: ${round}`);
      assert.ok(round.length >= 35, 'round should provide more than a few taps');
      for (const char of round) assert.ok(available.has(char), `untaught character ${JSON.stringify(char)}`);
    }
    for (const key of lesson.newKeys) {
      assert.ok(lesson.rounds[0].includes(key), `warmup must teach ${JSON.stringify(key)}`);
      assert.ok(lesson.rounds.join('').split(key).length - 1 >= 2, `repeat new key ${JSON.stringify(key)}`);
    }
    assert.equal(lesson.estimatedMinutes, estimateLessonMinutes(lesson.rounds, lesson.wpmTarget));
    assert.ok(lesson.accuracyTarget >= 92 && lesson.accuracyTarget <= 97);
  });
}

test('early patterns and Shift drills match their stated scope', () => {
  assert.match(CURRICULUM[1].rounds.join(''), /^[fjdk ]+$/);
  assert.match(CURRICULUM[2].rounds.join(''), /^[fjdksl ]+$/);
  for (const char of CURRICULUM[18].rounds.join('')) {
    if (/[A-Z]/.test(char)) assert.equal(getFingerForKey(char).hand, 'right');
  }
  assert.ok(CURRICULUM[28].rounds.at(-1).length >= 400, 'endurance finish is a sustained passage');
  assert.ok(CURRICULUM[29].rounds.join('').length >= 800, 'capstone samples several skills');
});

test('number drill does not introduce shifted number symbols early', () => {
  assert.doesNotMatch(CURRICULUM[22].rounds.join(''), /[@#$%^&*()]/);
});

test('targeted keys remain the majority of non-space drill characters', () => {
  for (const keys of [['r'], [';', 'q'], ['@', '5'], [' ', 'e'], [], ['ShiftLeft', '\n']]) {
    const lesson = generateWeakKeysLesson(keys);
    for (const round of lesson.rounds) {
      assert.ok(printable(round));
      const letters = [...round].filter(key => key !== ' ');
      assert.ok(letters.filter(key => lesson.keys.includes(key)).length / letters.length >= 0.7);
    }
  }
  const spaces = generateWeakKeysLesson([' ']);
  for (const round of spaces.rounds) {
    assert.ok(printable(round));
    assert.ok(round.split(' ').length >= 10);
  }
});

for (const layout of Object.keys(LAYOUTS)) {
  test(`finger drills practice the correct keys in ${layout}`, () => {
    for (const finger of Object.values(FINGERS)) {
      const lesson = generateWeakFingerLesson(finger, layout);
      for (const key of lesson.keys) assert.equal(getFingerForKey(key, layout).id, finger.id);
      for (const round of lesson.rounds) {
        assert.ok(printable(round));
        if (finger.id !== 'thumbs') {
          for (const key of round.replaceAll(' ', '')) assert.equal(getFingerForKey(key, layout).id, finger.id);
        } else assert.ok(round.split(' ').length >= 10);
      }
    }
  });
}
