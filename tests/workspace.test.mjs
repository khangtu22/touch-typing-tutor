import test from 'node:test';
import assert from 'node:assert/strict';
import { captureViewState, practiceDestination } from '../js/workspace.js';
import { accessibleForeground } from '../js/theme-studio.js';

test('practice fallback routes supported and legacy launch types to their library', () => {
  for (const [lesson, destination] of [
    [{isCodeLesson:true},'code'], [{quoteId:42},'quotes'],
    [{isCustom:true},'custom'], [{languageCode:'fr'},'custom'],
    [{isSpeedTest:true},'speedtest'], [{isPassageSprint:true},'speedtest'],
    [{id:'sprint-30'},'speedtest'], [{id:1},'dashboard']
  ]) assert.equal(practiceDestination(lesson), destination);
});

test('return context snapshots nested filters without including practice telemetry', () => {
  const ui={activeCodeSearch:'fetch',customDraftText:'Keep this draft',analyticsViewState:{table:{search:'code',page:2}},currentLessonData:{id:42}};
  const state=captureViewState(ui);
  ui.analyticsViewState.table.page=5;
  assert.equal(state.analyticsViewState.table.page,2);
  assert.equal(state.customDraftText,'Keep this draft');
  assert.equal(state.currentLessonData,undefined);
});

test('custom theme buttons choose a contrasting foreground for light and dark accents', () => {
  assert.equal(accessibleForeground('#ffffff'),'#000000');
  assert.equal(accessibleForeground('#000000'),'#FFFFFF');
  assert.equal(accessibleForeground('#00ffff'),'#000000');
});
