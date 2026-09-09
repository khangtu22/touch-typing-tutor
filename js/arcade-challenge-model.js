/** Rules for the garden, tower, and memory arcade games. No DOM or storage. */
export const ARCADE_CHALLENGES = [
  {
    id: 'word-garden', key: 'garden', title: 'Word Garden', icon: '🌷',
    category: 'RELAXED PRACTICE', stat: 'gardenHighScore', goal: 12,
    description: 'Grow a little garden, one word at a time. Every completed word blooms a flower, and flawless words collect sunshine. No timer, no lost lives.',
    features: ['12 flowers to grow', 'Perfect-word sunshine', 'No countdown'],
    action: 'Plant your first word', unit: 'flowers',
    instructions: 'Type the highlighted word to grow a flower. Mistakes are safe: try the same letter again. A flawless word earns bonus sunshine.',
    victoryTitle: 'Your garden is in full bloom!'
  },
  {
    id: 'skyline-stack', key: 'stack', title: 'Skyline Stack', icon: '🏙️',
    category: 'PRECISION CHALLENGE', stat: 'stackHighScore', goal: 15,
    description: 'Build a 15-floor skyline with accurate typing. Mistakes weaken your tower; flawless floors restore stability. Keep it standing all the way to the roof.',
    features: ['15-floor tower', 'Stability meter', 'Clean-word combos'],
    action: 'Build your skyline', unit: 'floors',
    instructions: 'Complete a word to add a floor. Each wrong letter costs one stability point. A flawless word restores one. Reach 15 floors before stability hits zero.',
    victoryTitle: 'You reached the skyline!'
  },
  {
    id: 'word-recall', key: 'recall', title: 'Word Recall', icon: '🧠',
    category: 'MEMORY CHALLENGE', stat: 'recallHighScore', goal: 10,
    description: 'Study a word, watch it disappear, then type it from memory. Recall ten words with five lives. Need a second look? Trade the word bonus for a hint.',
    features: ['10 memory rounds', 'Timed word previews', 'Optional hints'],
    action: 'Test your recall', unit: 'words recalled',
    instructions: 'Press Enter or Start to study a word. When it disappears, type it from memory. Wrong letters cost a life; a hint shows it again but removes the word bonus.',
    victoryTitle: 'A memorable performance!'
  }
];

const WORDS = {
  easy: 'bud bee sun sky dew oak bay seed leaf rain pond rose fern mint moss hill lake tree bark nest bird wind root glow blue dawn',
  medium: 'garden petal meadow flower willow clover bloom spring orchid branch forest pollen breeze tulip pebble stream sunset maple violet harvest morning blossom sparrow',
  hard: 'sunflower evergreen butterfly wildflower moonlight waterfall dandelion lavender snowflake landscape riverbank woodland mountain bluebell honeysuckle starlight snowdrop raindrop seedling daylight'
};
export const CHALLENGE_LEVELS = {
  easy: { multiplier: 1, previewMs: 5000, label: 'Easy (3–4)' },
  medium: { multiplier: 1.5, previewMs: 4000, label: 'Med (4–7)' },
  hard: { multiplier: 2, previewMs: 3000, label: 'Hard (8–11)' }
};

export class ArcadeChallengeRun {
  constructor(key, difficulty = 'medium', random = Math.random) {
    this.config = ARCADE_CHALLENGES.find(game => game.key === key);
    if (!this.config) throw new Error(`Unknown arcade challenge: ${key}`);
    this.difficulty = CHALLENGE_LEVELS[difficulty] ? difficulty : 'medium';
    this.level = CHALLENGE_LEVELS[this.difficulty];
    this.random = random;
    this.words = WORDS[this.difficulty].split(' ');
    this.completed = [];
    this.attempts = 0;
    this.errors = 0;
    this.correctChars = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.score = 0;
    this.health = 5;
    this.elapsedMs = 0;
    this.started = false;
    this.finished = false;
    this.victory = false;
    this.phase = key === 'recall' ? 'ready' : 'typing';
    this.message = key === 'recall' ? 'Ready when you are. Start to reveal your first word.' : 'Your first letter starts the game. Take your time.';
    this.pickWord();
  }

  pickWord() {
    const choices = this.words.filter(word => word !== this.word);
    this.word = choices[Math.floor(this.random() * choices.length)];
    this.cursor = 0;
    this.wordErrors = 0;
    this.hinted = false;
    this.previewLeftMs = this.level.previewMs;
  }

  study() {
    if (this.finished || this.config.key !== 'recall' || this.phase !== 'ready') return;
    this.started = true;
    this.phase = 'study';
    this.message = 'Remember this word. Press Enter when you are ready, or wait for it to hide.';
  }

  recall() {
    if (this.finished || this.phase !== 'study') return;
    this.phase = 'typing';
    this.previewLeftMs = 0;
    this.message = 'Type the hidden word from memory. Use a hint if you need another look.';
  }

  hint() {
    if (this.finished || this.config.key !== 'recall' || this.phase !== 'typing') return;
    this.hinted = true;
    this.phase = 'study';
    this.previewLeftMs = this.level.previewMs;
    this.message = 'Take another look. This word earns base points; its bonus is now off.';
  }

  advance(ms) {
    if (!this.started || this.finished) return;
    this.elapsedMs += Math.max(0, ms);
    if (this.phase === 'study') {
      this.previewLeftMs = Math.max(0, this.previewLeftMs - ms);
      if (this.previewLeftMs === 0) this.recall();
    }
  }

  type(char) {
    if (this.finished || this.phase !== 'typing' || !/^[a-z]$/i.test(char)) return false;
    this.started = true;
    this.attempts++;
    if (char.toLowerCase() !== this.word[this.cursor]) {
      this.errors++;
      this.wordErrors++;
      this.combo = 0;
      if (this.config.key !== 'garden') this.health--;
      this.message = this.config.key === 'garden'
        ? 'No rush. Try the highlighted letter again — your flower is safe.'
        : this.config.key === 'stack'
          ? 'One stability lost. Try that letter again; a flawless word repairs the tower.'
          : 'One life lost. Try that letter again, or use a hint.';
      if (this.health === 0) this.finish(false);
      return false;
    }
    this.correctChars++;
    this.cursor++;
    if (this.cursor < this.word.length) return true;

    const clean = this.wordErrors === 0 && !this.hinted;
    this.combo = clean ? this.combo + 1 : 0;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const points = Math.round((100 + (clean ? 25 * Math.min(this.combo, 4) : 0)) * this.level.multiplier);
    this.score += points;
    this.completed.push({ word: this.word, clean });
    if (this.config.key === 'stack' && clean) this.health = Math.min(5, this.health + 1);
    this.message = clean ? `Flawless word! +${points} points.${this.config.key === 'stack' ? ' One stability restored.' : ''}` : `Word complete! +${points} points. Keep growing.`;
    if (this.completed.length === this.config.goal) {
      this.finish(true);
    } else {
      this.pickWord();
      if (this.config.key === 'recall') {
        this.phase = 'study';
        this.message = `+${points} points. Study the next word.`;
      }
    }
    return true;
  }

  finish(victory) {
    if (this.finished) return;
    this.finished = true;
    this.victory = victory;
  }

  get metrics() {
    return {
      accuracy: this.attempts ? Math.round(this.correctChars / this.attempts * 100) : 100,
      wpm: this.elapsedMs >= 1000 ? Math.round(this.correctChars / 5 / (this.elapsedMs / 60000)) : 0,
      xpEarned: this.completed.length * 3 + (this.victory ? 25 : 0)
    };
  }
}
