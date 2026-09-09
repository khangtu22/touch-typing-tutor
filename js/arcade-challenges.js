import { ArcadeChallengeRun, ARCADE_CHALLENGES, CHALLENGE_LEVELS } from './arcade-challenge-model.js?v=3.9.0';
import { store } from './state.js?v=3.8.1';
import { sound } from './sound-engine.js?v=3.8.1';

export { ARCADE_CHALLENGES };

export function renderChallengeCards(stats, difficulties) {
  return ARCADE_CHALLENGES.map(game => `
    <div class="arcade-game-card">
      <div class="game-card-banner banner-${game.key}">
        <span class="game-banner-badge">NEW · ${game.category}</span>
        <span class="game-banner-icon" aria-hidden="true">${game.icon}</span>
      </div>
      <div class="game-card-body">
        <h2 class="game-card-title">${game.title}</h2>
        <p class="game-card-desc">${game.description}</p>
        <div class="game-features-pills">${game.features.map(feature => `<span class="feature-tag">${feature}</span>`).join('')}</div>
        <p class="challenge-card-record">Personal best <strong>${(stats[game.stat] || 0).toLocaleString()} PTS</strong></p>
        <div class="game-difficulty-select">
          <span class="challenge-difficulty-label">WORD LENGTH${game.key === 'recall' ? ' · PREVIEW 5 / 4 / 3 SEC' : ''}:</span>
          <div class="difficulty-toggles" data-game="${game.key}" role="group" aria-label="${game.title} difficulty">
            ${Object.entries(CHALLENGE_LEVELS).map(([level, config]) => `<button class="diff-btn ${difficulties[game.key] === level ? 'active' : ''}" data-diff="${level}" aria-pressed="${difficulties[game.key] === level}">${config.label}</button>`).join('')}
          </div>
        </div>
        <button class="btn btn-primary btn-lg arcade-launch-btn" data-launch-challenge="${game.key}">${game.action}</button>
      </div>
    </div>`).join('');
}

export class ArcadeChallengeGame {
  constructor(container, { key, difficulty = 'medium', onExit = () => {} }) {
    this.container = container;
    this.key = key;
    this.difficulty = difficulty;
    this.onExit = onExit;
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleVisibility = () => { if (document.hidden) this.pause(); };
    this.handleBlur = () => this.pause();
  }

  mount() {
    this.destroy();
    this.run = new ArcadeChallengeRun(this.key, this.difficulty);
    this.paused = false;
    this.recorded = false;
    this.running = true;
    this.lastTick = performance.now();
    const game = this.run.config;
    this.container.innerHTML = `
      <section class="arcade-challenge challenge-${game.key}" aria-labelledby="challenge-title">
        <header class="challenge-header">
          <div><span class="challenge-eyebrow">${game.category} · ${this.run.difficulty}</span><h1 id="challenge-title">${game.title}</h1></div>
          <div class="challenge-controls">
            <button class="btn btn-secondary btn-sm" data-action="pause">Pause (Esc)</button>
            <button class="btn btn-outline btn-sm" data-action="exit">Back to Arcade</button>
          </div>
        </header>
        <div class="challenge-hud">
          <div><span>Score</span><strong data-stat="score">0</strong></div>
          <div><span>${game.key === 'garden' ? 'Sunshine' : game.key === 'stack' ? 'Stability' : 'Lives'}</span><strong data-stat="resource"></strong></div>
          <div><span>Best combo</span><strong data-stat="combo">0</strong></div>
          <div><span>WPM</span><strong data-stat="wpm">0</strong></div>
          <div><span>Accuracy</span><strong data-stat="accuracy">100%</strong></div>
        </div>
        <div class="challenge-play">
          <div class="challenge-scene" aria-label="Game progress">
            <div class="challenge-scene-heading"><span class="challenge-eyebrow" data-stat="stage"></span><span data-stat="progress"></span></div>
            <div class="challenge-art"></div>
            <progress class="challenge-progress" max="${game.goal}" value="0" aria-label="${game.unit} completed"></progress>
          </div>
          <div class="challenge-practice" tabindex="0" role="region" aria-label="Typing area" aria-describedby="challenge-instructions">
            <span class="challenge-eyebrow" data-stat="prompt"></span>
            <div class="challenge-word"></div>
            <p class="challenge-message" role="status" aria-live="polite"></p>
            <div class="challenge-controls challenge-memory-controls">
              <button class="btn btn-secondary btn-sm" data-action="study">Start (Enter)</button>
              <button class="btn btn-outline btn-sm" data-action="hint">Show hint · lose word bonus</button>
            </div>
            <p id="challenge-instructions">${game.instructions}</p>
            <span class="challenge-focus-tip">Click here to type · Tab for controls · Esc to pause</span>
          </div>
        </div>
        <div class="challenge-pause" hidden>
          <span class="challenge-eyebrow">TAKE A BREATHER</span><h2>Game paused</h2>
          <p>Your progress and preview timer are safe.</p>
          <button class="btn btn-primary" data-action="resume">Resume game</button>
        </div>
        <section class="challenge-result" hidden aria-labelledby="challenge-result-title"></section>
      </section>`;
    this.root = this.container.querySelector('.arcade-challenge');
    this.practice = this.root.querySelector('.challenge-practice');
    this.root.querySelector('[data-action="pause"]').addEventListener('click', () => this.paused ? this.resume() : this.pause());
    this.root.querySelector('[data-action="resume"]').addEventListener('click', () => this.resume());
    this.root.querySelector('[data-action="exit"]').addEventListener('click', () => this.exit());
    this.root.querySelector('[data-action="study"]').addEventListener('click', () => this.studyOrRecall());
    this.root.querySelector('[data-action="hint"]').addEventListener('click', () => {
      this.tick();
      this.run.hint();
      this.render();
      this.practice.focus({ preventScroll: true });
    });
    this.practice.addEventListener('click', event => {
      if (!event.target.closest('button')) this.practice.focus({ preventScroll: true });
    });
    this.root.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('visibilitychange', this.handleVisibility);
    window.addEventListener('blur', this.handleBlur);
    // Tabbing away from the play field must not consume a memory preview.
    this.root.addEventListener('focusout', event => {
      if (event.relatedTarget && !this.root.contains(event.relatedTarget)) this.pause(false);
    });
    this.timer = setInterval(() => this.tick(), 100);
    this.render();
    this.root.scrollIntoView({ block: 'start', behavior: 'instant' });
    this.practice.focus({ preventScroll: true });
    this.practice.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }

  tick() {
    const now = performance.now();
    const delta = now - this.lastTick;
    this.lastTick = now;
    if (!this.running || this.paused || this.run.finished) return;
    const phase = this.run.phase;
    this.run.advance(delta);
    if (phase !== this.run.phase) this.render();
    else this.updateHud();
  }

  studyOrRecall() {
    if (this.paused || !this.running || this.run.finished) return;
    this.tick();
    if (this.run.phase === 'ready') this.run.study();
    else this.run.recall();
    this.render();
    this.practice.focus({ preventScroll: true });
  }

  handleKeyDown(event) {
    if (!this.running || this.run.finished || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) this.paused ? this.resume() : this.pause();
      return;
    }
    if (this.paused || event.target !== this.practice || event.repeat) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.studyOrRecall();
      return;
    }
    if (event.key === ' ' || event.key === 'Backspace') { event.preventDefault(); return; }
    if (!/^[a-z]$/i.test(event.key)) return;
    event.preventDefault();
    this.tick();
    if (this.run.phase !== 'typing') return;
    const correct = this.run.type(event.key);
    if (correct) sound.playKeyClick(event.key);
    else sound.playError();
    this.render();
    if (this.run.finished) this.showResult();
  }

  updateHud() {
    const run = this.run;
    const { wpm, accuracy } = run.metrics;
    const values = {
      score: run.score.toLocaleString(),
      resource: run.config.key === 'garden' ? `☀ ${run.completed.filter(word => word.clean).length}` : `${run.health} / 5`,
      combo: `${run.bestCombo} words`, wpm, accuracy: `${accuracy}%`,
      prompt: run.phase === 'ready' ? 'READY TO REMEMBER?' : run.phase === 'study' ? `MEMORIZE · ${Math.ceil(run.previewLeftMs / 1000)}s` : run.config.key === 'recall' ? 'TYPE FROM MEMORY' : 'TYPE TO GROW'
    };
    if (run.config.key === 'stack') values.prompt = 'TYPE TO BUILD';
    Object.entries(values).forEach(([key, value]) => { this.root.querySelector(`[data-stat="${key}"]`).textContent = value; });
  }

  render() {
    const run = this.run;
    this.updateHud();
    this.root.querySelector('[data-stat="stage"]').textContent = run.config.key === 'garden' ? 'YOUR LITTLE PATCH OF GREEN' : run.config.key === 'stack' ? 'FROM FOUNDATION TO SKYLINE' : 'ONE WORD AT A TIME';
    this.root.querySelector('[data-stat="progress"]').textContent = `${run.completed.length} / ${run.config.goal} ${run.config.unit}`;
    this.root.querySelector('progress').value = run.completed.length;
    const art = this.root.querySelector('.challenge-art');
    // Only rebuild the scene when its progress changes, keeping animations stable.
    const sceneKey = `${run.completed.length}:${run.health}`;
    if (this.sceneKey !== sceneKey) {
      this.sceneKey = sceneKey;
      if (run.config.key === 'garden') {
        art.innerHTML = `<div class="garden-plots">${Array.from({ length: run.config.goal }, (_, index) => {
          const bloom = run.completed[index];
          return `<div class="garden-plot ${bloom ? 'is-grown' : ''}"><span aria-hidden="true">${bloom ? ['🌷', '🌼', '🌻', '🌸'][index % 4] : '🌱'}</span><small>${bloom ? bloom.word : `Plot ${index + 1}`}</small>${bloom?.clean ? '<i aria-label="Flawless word">☀</i>' : ''}</div>`;
        }).join('')}</div>`;
      } else if (run.config.key === 'stack') {
        art.innerHTML = `<div class="stack-city" aria-label="${run.completed.length} floors built. Stability ${run.health} of 5."><div class="stack-moon" aria-hidden="true">☾</div><div class="stack-tower ${run.health <= 2 ? 'is-fragile' : ''}"><div class="stack-foundation">KEYFLOW TOWER</div>${run.completed.map((floor, index) => `<div class="stack-floor ${floor.clean ? 'is-clean' : ''}" style="--floor:${index}"><span>${floor.word}</span><i aria-hidden="true">▪ ▪ ▪</i></div>`).join('')}</div></div>`;
      } else {
        art.innerHTML = `<div class="recall-orbit"><span class="recall-symbol" aria-hidden="true">✦</span><div class="recall-rounds" aria-label="${run.completed.length} of 10 words recalled">${Array.from({ length: run.config.goal }, (_, index) => `<span class="${index < run.completed.length ? 'is-recalled' : ''}" aria-hidden="true">${index < run.completed.length ? '✓' : index + 1}</span>`).join('')}</div><p>Look. Remember. Type.</p></div>`;
      }
    }
    const wordEl = this.root.querySelector('.challenge-word');
    const concealed = run.config.key === 'recall' && run.phase !== 'study';
    wordEl.setAttribute('aria-label', run.phase === 'ready' ? 'Word hidden until you start' : concealed ? `${run.word.length}-letter word. ${run.cursor} letters recalled: ${run.word.slice(0, run.cursor)}` : run.word);
    wordEl.innerHTML = run.phase === 'ready' ? '<span aria-hidden="true">ready?</span>' : [...run.word].map((char, index) => `<span aria-hidden="true" class="${index < run.cursor ? 'is-typed' : index === run.cursor && run.phase === 'typing' ? 'is-current' : ''}">${concealed && index >= run.cursor ? '·' : char}</span>`).join('');
    this.root.querySelector('.challenge-message').textContent = run.message;
    const study = this.root.querySelector('[data-action="study"]');
    study.hidden = run.config.key !== 'recall' || run.phase === 'typing';
    study.textContent = run.phase === 'ready' ? 'Start (Enter)' : 'I’m ready (Enter)';
    this.root.querySelector('[data-action="hint"]').hidden = run.config.key !== 'recall' || run.phase !== 'typing';
    // Return focus to typing if a timed preview hid the focused control.
    if (study.hidden && document.activeElement === study) this.practice.focus({ preventScroll: true });
  }

  pause(moveFocus = true) {
    if (!this.running || this.run.finished || this.paused) return;
    this.tick();
    this.paused = true;
    this.root.querySelector('.challenge-play').hidden = true;
    this.root.querySelector('.challenge-pause').hidden = false;
    this.root.querySelector('[data-action="pause"]').textContent = 'Resume (Esc)';
    if (moveFocus && !document.hidden) this.root.querySelector('[data-action="resume"]').focus({ preventScroll: true });
  }

  resume() {
    if (!this.running || this.run.finished || !this.paused || document.hidden) return;
    this.paused = false;
    this.lastTick = performance.now();
    this.root.querySelector('.challenge-play').hidden = false;
    this.root.querySelector('.challenge-pause').hidden = true;
    this.root.querySelector('[data-action="pause"]').textContent = 'Pause (Esc)';
    this.practice.focus({ preventScroll: true });
  }

  showResult() {
    if (this.recorded) return;
    this.recorded = true;
    clearInterval(this.timer);
    const run = this.run;
    const { wpm, accuracy, xpEarned } = run.metrics;
    const previousBest = store.getState().arcadeStats?.[run.config.stat] || 0;
    store.recordArcadeResult({ gameId: run.config.id, score: run.score, victory: run.victory, wpm, accuracy, xpEarned });
    this.root.querySelector('.challenge-practice').hidden = true;
    this.root.querySelector('[data-action="pause"]').hidden = true;
    const result = this.root.querySelector('.challenge-result');
    result.hidden = false;
    result.innerHTML = `
      <span class="challenge-eyebrow">${run.score > previousBest ? 'NEW PERSONAL BEST' : 'ROUND COMPLETE'}</span>
      <h2 id="challenge-result-title" tabindex="-1">${run.victory ? run.config.victoryTitle : run.config.key === 'stack' ? 'Time for a fresh foundation.' : 'Rest your mind. Try again.'}</h2>
      <div class="challenge-result-score">${run.score.toLocaleString()} <span>PTS</span></div>
      <p>${run.completed.length} / ${run.config.goal} ${run.config.unit} · ${accuracy}% accuracy · ${wpm} WPM · +${xpEarned} XP</p>
      <p>${run.errors} mistakes · Best combo: ${run.bestCombo} words${run.config.key === 'recall' ? ' · WPM includes study time' : ''}</p>
      <div class="challenge-controls"><button class="btn btn-primary" data-action="retry">Play again</button><button class="btn btn-outline" data-action="return">Back to Arcade</button></div>`;
    result.querySelector('[data-action="retry"]').addEventListener('click', () => this.mount());
    result.querySelector('[data-action="return"]').addEventListener('click', () => this.exit());
    result.querySelector('h2').focus({ preventScroll: true });
    result.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }

  exit() {
    this.destroy();
    this.onExit();
  }

  destroy() {
    this.running = false;
    this.sceneKey = null;
    clearInterval(this.timer);
    this.root?.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    window.removeEventListener('blur', this.handleBlur);
  }
}
