import test from 'node:test';
import assert from 'node:assert/strict';
import { DESTINATIONS } from '../js/ui.js';
import {
  CODE_SNIPPETS,
  MIGRATED_CODE_PRESETS,
  chunkCodePreset,
  getFilteredSnippets,
  getRandomCodeSnippet
} from '../js/code-snippets.js';
import {
  PASSAGE_SPRINT_PRESETS,
  SPRINT_TEXT_POOL,
  generatePassageSprintLesson
} from '../js/speed-test.js';
import { store, DEFAULT_STATE, APP_VERSION } from '../js/state.js';
import { CommandPalette } from '../js/command-palette.js';

// ==========================================
// 1. Destination Registry & Navigation Metadata
// ==========================================
test('DESTINATIONS registry contains complete and valid entries for all screens', () => {
  const expectedDestinations = [
    'dashboard',
    'code',
    'speedtest',
    'arcade',
    'custom',
    'quotes',
    'profile',
    'settings'
  ];

  assert.equal(DESTINATIONS.length, expectedDestinations.length);

  const ids = DESTINATIONS.map(d => d.id);
  assert.deepEqual(ids, expectedDestinations);

  for (const dest of DESTINATIONS) {
    assert.ok(dest.id, 'Destination must have an id');
    assert.ok(dest.label, `Destination ${dest.id} must have a label`);
    assert.ok(dest.icon, `Destination ${dest.id} must have an icon`);
  }
});

// ==========================================
// 2. Code Snippets & Custom Preset Migration
// ==========================================
test('Custom code presets migrated to Code Arena with stable IDs and targets', () => {
  const migratedIds = [
    'js_es6',
    'python_structures',
    'react_hooks',
    'rust_pattern',
    'sql_queries'
  ];

  for (const id of migratedIds) {
    const preset = MIGRATED_CODE_PRESETS.find(p => p.id === id);
    assert.ok(preset, `Migrated preset ${id} must exist in MIGRATED_CODE_PRESETS`);
    assert.ok(CODE_SNIPPETS.some(s => s.id === id), `Migrated preset ${id} must exist in CODE_SNIPPETS array`);
    assert.ok(preset.code.length > 50, `Preset ${id} must contain meaningful code`);
    assert.ok(preset.title.length > 0, `Preset ${id} must have a title`);
    assert.ok(preset.language.length > 0, `Preset ${id} must have a language`);
    assert.ok(preset.accuracyTarget >= 90, `Preset ${id} must have accuracy target >= 90%`);
  }
});

test('chunkCodePreset creates valid chunks from code presets', () => {
  const reactPreset = MIGRATED_CODE_PRESETS.find(p => p.id === 'react_hooks');
  assert.ok(reactPreset);

  const rounds = chunkCodePreset(reactPreset.code);
  assert.ok(Array.isArray(rounds));
  assert.ok(rounds.length >= 1);

  // Each chunk should have reasonable length
  for (const round of rounds) {
    assert.ok(round.trim().length > 0);
    assert.ok(round.length <= 200);
  }
});

test('getFilteredSnippets filters by language and search keyword', () => {
  const allSnippets = getFilteredSnippets('all', 'all', '');
  assert.equal(allSnippets.length, CODE_SNIPPETS.length);

  const jsSnippets = getFilteredSnippets('javascript', 'all', '');
  assert.ok(jsSnippets.length > 0);
  assert.ok(jsSnippets.every(s => s.language === 'javascript'));

  const pySnippets = getFilteredSnippets('python', 'all', '');
  assert.ok(pySnippets.length > 0);
  assert.ok(pySnippets.every(s => s.language === 'python'));

  // Search keyword filtering
  const hookMatches = getFilteredSnippets('all', 'all', 'hook');
  assert.ok(hookMatches.length >= 1);
  assert.ok(hookMatches.some(s => s.id === 'react_hooks'));

  // Search query with no match returns empty array
  const noMatches = getFilteredSnippets('all', 'all', 'xyz_nonexistent_query_123');
  assert.equal(noMatches.length, 0);
});

test('getRandomCodeSnippet returns a valid snippet', () => {
  const randomAny = getRandomCodeSnippet('all');
  assert.ok(randomAny);
  assert.ok(CODE_SNIPPETS.includes(randomAny));

  const randomRust = getRandomCodeSnippet('rust');
  assert.ok(randomRust);
  assert.equal(randomRust.language, 'rust');
});

// ==========================================
// 3. Speed Test & Passage Sprints Isolation
// ==========================================
test('PASSAGE_SPRINT_PRESETS has 15s, 30s, 60s, 120s presets', () => {
  assert.equal(PASSAGE_SPRINT_PRESETS.length, 4);

  const durations = PASSAGE_SPRINT_PRESETS.map(p => p.durationSec);
  assert.deepEqual(durations, [15, 30, 60, 120]);

  for (const preset of PASSAGE_SPRINT_PRESETS) {
    assert.ok(preset.id);
    assert.ok(preset.title);
    assert.ok(preset.desc);
    assert.ok(preset.icon);
    assert.ok(preset.seconds > 0);
  }
});

test('generatePassageSprintLesson produces continuous prose lesson from SPRINT_TEXT_POOL', () => {
  assert.ok(SPRINT_TEXT_POOL.length >= 5, 'SPRINT_TEXT_POOL should contain diverse passage texts');

  const lesson60 = generatePassageSprintLesson(60);
  assert.equal(lesson60.timeLimitSec, 60);
  assert.equal(lesson60.sprintDurationSec, 60);
  assert.equal(lesson60.isPassageSprint, true);
  assert.ok(lesson60.title.includes('60s'));
  assert.ok(lesson60.rounds.length >= 1);
  assert.ok(lesson60.rounds[0].length >= 50, 'Sprint text should have sufficient length for continuous typing');

  const lesson30 = generatePassageSprintLesson(30);
  assert.equal(lesson30.timeLimitSec, 30);
  assert.equal(lesson30.sprintDurationSec, 30);
});

test('state isolates passage sprint records from speed test vocabulary records', () => {
  // Ensure default state has passageSprintBests initialized
  assert.ok(typeof DEFAULT_STATE.passageSprintBests === 'object');

  // Record a passage sprint best
  const sprintResult = { wpm: 82, accuracy: 97.5, consistency: 91 };
  store.recordPassageSprintBest(60, sprintResult);

  const recordedBests = store.getPassageSprintBests();
  assert.ok(recordedBests['60s']);
  assert.equal(recordedBests['60s'].wpm, 82);
  assert.equal(recordedBests['60s'].accuracy, 98); // rounded accuracy

  // Speed test benchmarks should NOT have '60s' overwritten or contaminated
  const speedTestBests = store.getSpeedTestBests();
  assert.notEqual(speedTestBests['60s']?.isPassageSprint, true);

  // Recording a lower score does not overwrite the personal best
  const lowerResult = { wpm: 60, accuracy: 99, consistency: 95 };
  store.recordPassageSprintBest(60, lowerResult);
  assert.equal(store.getPassageSprintBests()['60s'].wpm, 82);

  // Recording a higher score updates the personal best
  const higherResult = { wpm: 94, accuracy: 98, consistency: 93 };
  store.recordPassageSprintBest(60, higherResult);
  assert.equal(store.getPassageSprintBests()['60s'].wpm, 94);
});

// ==========================================
// 4. Data Portability & Backup Validation
// ==========================================
test('store validates backup JSON with passageSprintBests support', () => {
  const mockBackup = {
    version: APP_VERSION,
    schemaVersion: 5,
    timestamp: new Date().toISOString(),
    data: {
      ...DEFAULT_STATE,
      passageSprintBests: {
        '30s': { wpm: 88, accuracy: 99, consistency: 94, date: '2026-09-10' }
      }
    }
  };

  const validation = store.validateBackup(mockBackup);
  assert.equal(validation.valid, true);

  const exportedJson = store.exportBackupJson();
  assert.ok(typeof exportedJson === 'string');
  const parsed = JSON.parse(exportedJson);
  assert.ok(parsed.data);
  assert.ok('passageSprintBests' in parsed.data);
});

// ==========================================
// 5. Command Palette Redesign Commands
// ==========================================
test('CommandPalette includes passage sprints, code presets, and accessibility toggles', () => {
  // Create mock UI and mock store
  const mockUI = {
    navigateTo: () => {},
    startPassageSprint: () => {},
    startCodeSnippetById: () => {},
    showToast: () => {}
  };
  const mockStore = {
    getState: () => ({
      settings: { keyboardVisible: true, handGuideVisible: true, reachBannerVisible: true, highContrast: false, reducedMotion: false }
    }),
    update: () => {}
  };

  const cp = new CommandPalette(mockUI, mockStore);
  const commandIds = cp.commands.map(c => c.id);

  // Passage sprints quick actions
  assert.ok(commandIds.includes('act_passage_60'), 'Palette must have 60s passage sprint action');
  assert.ok(commandIds.includes('act_passage_30'), 'Palette must have 30s passage sprint action');

  // Migrated code presets
  assert.ok(commandIds.includes('act_code_js'), 'Palette must have JS code preset action');
  assert.ok(commandIds.includes('act_code_py'), 'Palette must have Python code preset action');
  assert.ok(commandIds.includes('act_code_react'), 'Palette must have React code preset action');
  assert.ok(commandIds.includes('act_code_rust'), 'Palette must have Rust code preset action');
  assert.ok(commandIds.includes('act_code_sql'), 'Palette must have SQL code preset action');

  // Accessibility toggles
  assert.ok(commandIds.includes('toggle_highcontrast'), 'Palette must have high contrast toggle');
  assert.ok(commandIds.includes('toggle_reducedmotion'), 'Palette must have reduced motion toggle');
});
