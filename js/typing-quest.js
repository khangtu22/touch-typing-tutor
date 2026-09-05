/** A self-paced, five-room typing adventure. The fifth room is the boss. */
import { store } from './state.js';
import { getWeakKeyAnalysis } from './weakness-engine.js';

const WORDS = `
air ant arm art ash bag bat bay bed bee big bird blue boat book box brave
bread brick bring brown brush camp cape card care cave chair charm chest city
clay clear cliff cloud coast coin cold coral craft crown dance dawn deer door
dream drink drum dusk dust eagle earth ember fairy field fire flame flock floor
flower flute forest fox fresh frost fruit gate gem giant gift glass globe gold
grape grass green guard guide hand happy heart hill home honey horse house ice
ink iron island ivory jade jazz jewel join joy judge juice jump key king kite
lake lamp land leaf lemon light lion magic map march maze medal mint moon moss
mouse music nest night north oak ocean olive open orbit owl page paint path
pearl pet piano pilot pine pixel plant pond power prize proud pulse queen quest
quick quiet quilt quiz quote rabbit rain raven reach river road robin rock rope
rose round royal ruby rune sand scale scout seal seed shade shell shield shine
ship shore silver sky sleep smile smoke snow soil song sound south spark spell
spice spring square staff stair stand star steam steel stone storm sun swift
sword table tale teach tent thorn tiger time torch tower trail train tree trust
unity upper value vault vivid voice water watch wave whale wheat white wind
wing wolf wood world write yellow young zebra zero zinc zone
ancient balance barrier blossom boundary bravery bridge brilliant butterfly
captain careful castle cavern champion character crystal curious daylight
diamond discover distance dragon emerald enchanted explore faithful feather
festival flourish fortress fountain freedom friendly frontier garden generous
gentle glacier golden graceful guardian harmony harvest helpful horizon
imagine improve journey justice kingdom lantern laughter library lightning
magical majestic meadow meaning memory message midnight mountain movement
mystery natural northern notebook observe orchard patient peaceful penguin
perfect phoenix picture planet playful practice precious promise protect
puzzle quality rainbow recover reflect remember rescue respect rhythm secret
sentence shadow shelter shimmer silence soldier sparkle spirit sunrise sunset
thunder timber together tomorrow treasure triumph trusted turtle valley velvet
venture victory village violet wander waterfall whisper window wisdom wizard
wonder wooden zephyr adventure adventurer alphabet beautiful celebration
confidence constellation coordination determination discipline dragonfly
encounter evergreen friendship illumination imagination magnificent
observation perseverance possibility protection quietness remarkable
restoration storytelling strength successful thoughtful understanding
`.trim().split(/\s+/);

const LEVELS = { easy: [3, 5], medium: [4, 8], hard: [6, 12] };
const ROOMS = [
  { name: 'Moss Gate', enemy: 'The Bramble Watcher', words: 5, hue: 145 },
  { name: 'Crystal Hollow', enemy: 'The Crystal Sentinel', words: 5, hue: 190 },
  { name: 'Ember Hall', enemy: 'The Ember Knight', words: 5, hue: 25 },
  { name: 'Moonlit Keep', enemy: 'The Twilight Guardian', words: 5, hue: 265 },
  { name: 'Dragon Throne', enemy: 'The Rune Dragon', words: 10, hue: 345 }
];

export class TypingQuestGame {
  constructor(container, { difficulty = 'medium', onExit }) {
    this.container = container;
    this.difficulty = LEVELS[difficulty] ? difficulty : 'medium';
    this.onExit = onExit;
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleVisibility = () => { if (document.hidden) this.pause(); };
    this.handleBlur = () => this.pause();
  }

  mount() {
    this.destroy();
    const analysis = getWeakKeyAnalysis(store.getState().keyStats || {});
    this.targetKeys = analysis.weakKeys.slice(0, 3).map(key => key.char);
    const [min, max] = LEVELS[this.difficulty];
    this.words = [...new Set(WORDS)].filter(word => word.length >= min && word.length <= max);
    this.targetWords = this.words.filter(word => this.targetKeys.some(key => word.includes(key)));
    this.practicedKeys = new Set();
    this.room = 0;
    this.roomsCleared = 0;
    this.roomWords = 0;
    this.completedWords = 0;
    this.hearts = 10;
    this.combo = 0;
    this.bestCombo = 0;
    this.score = 0;
    this.attempts = 0;
    this.errors = 0;
    this.correctChars = 0;
    this.elapsedMs = 0;
    this.segmentStart = null;
    this.started = false;
    this.paused = false;
    this.finished = false;
    this.recorded = false;
    this.running = true;
    this.previousWord = '';
    this.message = 'Your adventure starts with the first letter. Take your time.';
    this.pickWord();
    this.container.innerHTML = `
      <section class="typing-quest" aria-labelledby="quest-title">
        <header class="quest-header">
          <div><span class="quest-eyebrow">ARCADE ADVENTURE · ${this.difficulty}</span>
            <h1 id="quest-title">Typing Quest</h1></div>
          <div class="quest-controls">
            <button class="btn btn-secondary" data-quest="pause">Pause (Esc)</button>
            <button class="btn btn-outline" data-quest="exit">Back to Arcade</button>
          </div>
        </header>
        <div class="quest-hud">
          <div><span>Hearts</span><strong data-stat="hearts"></strong></div>
          <div><span>Combo</span><strong data-stat="combo"></strong></div>
          <div><span>Score</span><strong data-stat="score"></strong></div>
          <div><span>WPM</span><strong data-stat="wpm"></strong></div>
          <div><span>Accuracy</span><strong data-stat="accuracy"></strong></div>
        </div>
        <ol class="quest-map" aria-label="Dungeon rooms">
          ${ROOMS.map((room, index) => `<li><span>${index + 1}</span>${room.name}</li>`).join('')}
        </ol>
        <div class="quest-scene">
          <div class="quest-room-heading"><span class="quest-eyebrow" data-stat="room"></span>
            <h2 data-stat="enemy"></h2></div>
          <svg class="quest-monster" viewBox="0 0 240 180" aria-hidden="true">
            <ellipse cx="120" cy="162" rx="78" ry="10" fill="currentColor" opacity=".15"/>
            <path class="quest-wings" d="M80 85 8 28 22 110 82 136M160 85 232 28 218 110 158 136" fill="currentColor" opacity=".45"/>
            <path d="M62 80 52 20 96 48Q120 35 144 48L188 20 178 80 186 132Q120 182 54 132Z" fill="currentColor"/>
            <path d="M75 89 104 99 84 109M165 89 136 99 156 109" fill="#10141d"/>
            <path d="M99 132 110 141 120 132 130 141 141 132" fill="none" stroke="#10141d" stroke-width="5" stroke-linejoin="round"/>
            <path d="m120 60 9 13-9 13-9-13Z" fill="#fff" opacity=".8"/>
          </svg>
          <div class="quest-enemy-progress"><span data-stat="progress"></span>
            <progress data-quest="enemy-health" aria-label="Words completed in this room"></progress></div>
        </div>
        <div class="quest-practice" tabindex="0" role="region" aria-label="Typing practice. Type the highlighted letter." aria-describedby="quest-instructions">
          <span class="quest-eyebrow">TYPE TO ATTACK</span>
          <div class="quest-word" data-quest="word"></div>
          <p class="quest-message" role="status" aria-live="polite"></p>
          <p id="quest-instructions">Type each word to attack automatically. Mistakes cost one heart; try the same letter again. Clear a room to heal two hearts.</p>
          <p class="quest-focus-note">${this.targetKeys.length ? `Focus keys: ${this.targetKeys.map(key => key.toUpperCase()).join(' · ')}. Every other word favors these keys.` : 'Common-word practice. Build your typing history to unlock weak-key targeting.'}</p>
        </div>
        <div class="quest-pause" hidden>
          <h2>Adventure paused</h2><p>Your time and hearts are safe. Resume when you are ready.</p>
          <button class="btn btn-primary" data-quest="resume">Resume adventure</button>
        </div>
        <section class="quest-result" hidden aria-labelledby="quest-result-title"></section>
      </section>`;
    this.root = this.container.querySelector('.typing-quest');
    this.practice = this.root.querySelector('.quest-practice');
    this.root.querySelector('[data-quest="pause"]').addEventListener('click', () => this.paused ? this.resume() : this.pause());
    this.root.querySelector('[data-quest="resume"]').addEventListener('click', () => this.resume());
    this.root.querySelector('[data-quest="exit"]').addEventListener('click', () => { this.destroy(); this.onExit(); });
    this.practice.addEventListener('click', () => this.practice.focus({ preventScroll: true }));
    this.root.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('visibilitychange', this.handleVisibility);
    window.addEventListener('blur', this.handleBlur);
    this.timer = window.setInterval(() => this.updateMetrics(), 250);
    this.render();
    this.practice.focus({ preventScroll: true });
  }

  pickWord() {
    const targeted = this.completedWords % 2 === 1 && this.targetWords.length;
    const pool = targeted ? this.targetWords : this.words;
    const candidates = pool.filter(word => word !== this.previousWord);
    const choices = candidates.length ? candidates : pool;
    this.word = choices[Math.floor(Math.random() * choices.length)];
    this.previousWord = this.word;
    this.cursor = 0;
    this.wordErrors = 0;
  }

  handleKeyDown(event) {
    if (!this.running || this.finished || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) this.paused ? this.resume() : this.pause();
      return;
    }
    if (this.paused || event.target !== this.practice || event.repeat) return;
    if (event.key === ' ' || event.key === 'Backspace') { event.preventDefault(); return; }
    if (!/^[a-z]$/i.test(event.key)) return;
    event.preventDefault();
    if (!this.started) { this.started = true; this.segmentStart = performance.now(); }
    this.attempts++;
    const expected = this.word[this.cursor];
    if (this.targetKeys.includes(expected)) this.practicedKeys.add(expected);
    if (event.key.toLowerCase() !== expected) {
      this.errors++;
      this.wordErrors++;
      this.hearts--;
      this.combo = 0;
      this.message = `One heart lost. Try ${expected.toUpperCase()} again — accuracy first.`;
      if (!this.hearts) { this.finish(false); return; }
    } else {
      this.cursor++;
      this.correctChars++;
      this.message = 'Keep going. Every correct letter brings you closer.';
      if (this.cursor === this.word.length) {
        this.completedWords++;
        this.roomWords++;
        this.score += 100 + (this.wordErrors === 0 ? 25 : 0);
        this.combo = this.wordErrors === 0 ? this.combo + 1 : 0;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        this.message = this.wordErrors === 0 ? 'Clean hit! +125 points.' : 'Enemy hit! +100 points.';
        if (this.roomWords === ROOMS[this.room].words) {
          this.roomsCleared++;
          if (this.roomsCleared === ROOMS.length) { this.finish(true); return; }
          this.hearts = Math.min(10, this.hearts + 2);
          this.room++;
          this.roomWords = 0;
          this.message = `Room cleared! Two hearts restored. Enter ${ROOMS[this.room].name}.`;
        }
        this.pickWord();
      }
    }
    this.render();
  }

  activeSeconds() {
    return (this.elapsedMs + (this.segmentStart === null ? 0 : performance.now() - this.segmentStart)) / 1000;
  }

  stopClock() {
    if (this.segmentStart !== null) this.elapsedMs += performance.now() - this.segmentStart;
    this.segmentStart = null;
  }

  getMetrics() {
    const seconds = this.activeSeconds();
    return {
      wpm: seconds >= 1 ? Math.round((this.correctChars / 5) / (seconds / 60)) : 0,
      accuracy: this.attempts ? Math.round(((this.attempts - this.errors) / this.attempts) * 100) : 100
    };
  }

  updateMetrics() {
    if (!this.root || !this.running) return;
    const { wpm, accuracy } = this.getMetrics();
    const values = { hearts: `♥ ${this.hearts}/10`, combo: `${this.combo} words`, score: this.score.toLocaleString(), wpm, accuracy: `${accuracy}%` };
    Object.entries(values).forEach(([name, value]) => { this.root.querySelector(`[data-stat="${name}"]`).textContent = value; });
  }

  render() {
    const room = ROOMS[this.room];
    this.root.style.setProperty('--quest-hue', room.hue);
    this.root.classList.toggle('quest-boss', this.room === 4);
    this.root.querySelector('[data-stat="room"]').textContent = `Room ${this.room + 1}/5 · ${room.name}${this.room === 4 ? ' · BOSS' : ''}`;
    this.root.querySelector('[data-stat="enemy"]').textContent = room.enemy;
    this.root.querySelector('[data-stat="progress"]').textContent = `${this.roomWords}/${room.words} words completed`;
    const progress = this.root.querySelector('[data-quest="enemy-health"]');
    progress.max = room.words;
    progress.value = this.roomWords;
    this.root.querySelectorAll('.quest-map li').forEach((item, index) => {
      item.classList.toggle('quest-cleared', index < this.roomsCleared);
      if (index === this.room) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    const word = this.root.querySelector('[data-quest="word"]');
    word.setAttribute('aria-label', `${this.word}. Next letter: ${this.word[this.cursor] || 'complete'}`);
    word.innerHTML = [...this.word].map((char, index) => `<span aria-hidden="true" class="${index < this.cursor ? 'quest-letter-done' : index === this.cursor ? 'quest-letter-current' : ''}">${char}</span>`).join('');
    this.root.querySelector('.quest-message').textContent = this.message;
    this.updateMetrics();
  }

  pause() {
    if (!this.running || this.finished || this.paused) return;
    this.paused = true;
    this.stopClock();
    this.practice.hidden = true;
    this.root.querySelector('.quest-pause').hidden = false;
    this.root.querySelector('[data-quest="pause"]').textContent = 'Resume (Esc)';
    if (!document.hidden) this.root.querySelector('[data-quest="resume"]').focus({ preventScroll: true });
  }

  resume() {
    if (!this.running || this.finished || !this.paused || document.hidden) return;
    this.paused = false;
    if (this.started) this.segmentStart = performance.now();
    this.practice.hidden = false;
    this.root.querySelector('.quest-pause').hidden = true;
    this.root.querySelector('[data-quest="pause"]').textContent = 'Pause (Esc)';
    this.practice.focus({ preventScroll: true });
  }

  finish(victory) {
    if (this.finished || !this.running) return;
    this.finished = true;
    this.stopClock();
    this.render();
    clearInterval(this.timer);
    const { wpm, accuracy } = this.getMetrics();
    const xpEarned = this.completedWords * 2 + (victory ? 25 : 0);
    if (!this.recorded) {
      this.recorded = true;
      store.recordArcadeResult({ gameId: 'typing-quest', score: this.score, wpm, accuracy, xpEarned, victory });
    }
    this.practice.hidden = true;
    this.root.querySelector('[data-quest="pause"]').hidden = true;
    const result = this.root.querySelector('.quest-result');
    result.hidden = false;
    result.innerHTML = `
      <span class="quest-eyebrow">${victory ? 'DUNGEON CONQUERED' : 'ADVENTURE COMPLETE'}</span>
      <h2 id="quest-result-title" tabindex="-1">${victory ? 'The Rune Dragon is defeated!' : 'Rest, recover, and try again.'}</h2>
      <div class="quest-rating" role="img" aria-label="${this.roomsCleared} of 5 stars. ${this.roomsCleared} rooms cleared.">
        <span aria-hidden="true">${ROOMS.map((_, index) => `<span class="${index < this.roomsCleared ? 'quest-star-earned' : 'quest-star-empty'}">${index < this.roomsCleared ? '★' : '☆'}</span>`).join('')}</span>
        <strong aria-hidden="true">${this.roomsCleared}/5 rooms cleared</strong>
      </div>
      <p>${this.score.toLocaleString()} points · ${wpm} WPM · ${accuracy}% accuracy · +${xpEarned} XP</p>
      <p>${this.completedWords} words completed · ${this.errors} mistakes · Best combo: ${this.bestCombo} words</p>
      <p>${this.practicedKeys.size ? `Weak keys practiced: ${[...this.practicedKeys].map(key => key.toUpperCase()).join(' · ')}` : 'Common-word practice completed.'}</p>
      <div class="quest-controls">
        <button class="btn btn-primary" data-quest="retry">Play again</button>
        <button class="btn btn-outline" data-quest="return">Back to Arcade</button>
      </div>`;
    result.querySelector('[data-quest="retry"]').addEventListener('click', () => this.mount());
    result.querySelector('[data-quest="return"]').addEventListener('click', () => { this.destroy(); this.onExit(); });
    result.querySelector('h2').focus({ preventScroll: true });
    result.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }

  destroy() {
    this.running = false;
    clearInterval(this.timer);
    this.root?.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    window.removeEventListener('blur', this.handleBlur);
  }
}
