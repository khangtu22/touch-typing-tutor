/** Shared presentation and navigation behavior. No persisted practice data. */
export const VIEW_STATE_KEYS = [
  'dashboardStageFilter', 'dashboardStatusFilter', 'dashboardSearchQuery',
  'activeCodeLanguage', 'activeCodeSearch', 'activeArenaTab', 'customDraftText',
  'speedTestMode', 'activeSpeedPresetId', 'activeSpeedVocabId',
  'activeQuoteCategory', 'activeQuoteDifficulty', 'activeQuoteSearch',
  'activeQuoteStatus', 'activeQuoteSort', 'profileActiveTab', 'analyticsViewState',
  'settingsActiveCategory'
];

export function captureViewState(ui) {
  return Object.fromEntries(VIEW_STATE_KEYS.filter(key => ui[key] !== undefined)
    .map(key => [key, structuredClone(ui[key])]));
}

export function practiceDestination(lesson = {}) {
  if (lesson.isSpeedTest || lesson.isPassageSprint || /^sprint-/.test(lesson.id || '')) return 'speedtest';
  if (lesson.isCodeLesson || lesson.snippetId) return 'code';
  if (lesson.isQuote || lesson.quoteId) return 'quotes';
  if (lesson.isCustom || lesson.languageCode || /^custom-/.test(lesson.id || '')) return 'custom';
  return 'dashboard';
}

export function controlIdentity(element) {
  if (!element) return null;
  if (element.id) return { id: element.id };
  const attributes = ['data-snippet-id', 'data-lesson-id', 'data-quote-id',
    'data-start-sprint', 'data-start-preset', 'data-theme', 'data-lang', 'data-game', 'data-action', 'data-keys'];
  for (const attribute of attributes) {
    if (element.hasAttribute?.(attribute)) return { attribute, value: element.getAttribute(attribute), tag: element.tagName };
  }
  return null;
}

export function findControl(root, identity) {
  if (!root || !identity) return null;
  const candidates = identity.id ? root.querySelectorAll('[id]') : root.querySelectorAll(`[${identity.attribute}]`);
  return [...candidates].find(el => (identity.id ? el.id === identity.id :
    el.getAttribute(identity.attribute) === identity.value && el.tagName === identity.tag) &&
    !el.disabled && el.getClientRects().length && !el.closest('[hidden]')) || null;
}

/** Complete ARIA tab behavior without replacing screen-specific actions. */
export function prepareTabs(root) {
  root.querySelectorAll('[role="tablist"]').forEach((list, listIndex) => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    tabs.forEach((tab, index) => {
      tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
      if (!tab.id) tab.id = `${root.id || 'workspace'}-tabs-${listIndex}-${index}`;
    });
    if (!tabs.some(tab => tab.tabIndex === 0) && tabs[0]) tabs[0].tabIndex = 0;
  });
}

export function prepareScreen(root) {
  if (!root) return;
  prepareTabs(root);
  root.querySelectorAll('.theme-card-option, .lang-option-card').forEach(control => {
    control.setAttribute('role', 'button');
    control.tabIndex = 0;
    control.setAttribute('aria-pressed', String(control.matches('.theme-active, .lang-active')));
  });
  root.querySelectorAll('.setting-row').forEach(row => {
    const field = row.querySelector('input:not([type="file"]), select, textarea');
    const label = row.querySelector('.setting-label');
    const description = row.querySelector('.setting-desc');
    if (!field?.id || !label) return;
    label.setAttribute('for', field.id);
    if (description) {
      description.id = `${field.id}-description`;
      field.setAttribute('aria-describedby', description.id);
    }
  });
  root.querySelectorAll('[role="tab"]').forEach(tab => {
    const category = tab.dataset.settingsCategory;
    const profile = tab.dataset.profileTab;
    const pane = category ? root.querySelector(`#settings-cat-${category}`) :
      profile ? root.querySelector(`#profile-tab-pane-${profile}`) :
      tab.dataset.arenaTab ? root.querySelector(`#arena-sub-${tab.dataset.arenaTab}`) :
      tab.dataset.speedMode ? root.querySelector(`#speed-panel-${tab.dataset.speedMode}`) : null;
    if (pane) {
      pane.setAttribute('role', 'tabpanel');
      pane.setAttribute('aria-labelledby', tab.id);
      tab.setAttribute('aria-controls', pane.id);
    }
  });
}

export function installTabNavigation(root) {
  root.addEventListener('keydown', event => {
    const current = event.target.closest('[role="tab"]');
    const list = current?.closest('[role="tablist"]');
    if (!list || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...list.querySelectorAll('[role="tab"]')].filter(el => !el.disabled);
    const index = tabs.indexOf(current);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 :
      (index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + tabs.length) % tabs.length;
    event.preventDefault();
    event.stopPropagation();
    const id = tabs[next].id;
    tabs[next].click();
    document.getElementById(id)?.focus({ preventScroll: true });
  });
}

/** Dialog focus is trapped only while a dialog is visibly open. */
export function containDialogFocus(dialog, event) {
  if (event.key !== 'Tab') return;
  const controls = [...dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')]
    .filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
  const first = controls[0], last = controls.at(-1);
  if (!first) { event.preventDefault(); dialog.focus(); return; }
  if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
    event.preventDefault(); first.focus();
  }
}
