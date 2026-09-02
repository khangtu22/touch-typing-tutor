/**
 * KeyFlow Arcade Hub & Gamified Typing Test Engine (v3.2.0)
 * Featuring 4 Distinct Arcade Game Modes:
 * 1. Type Invaders: Orbit Defense (Laser turret, wave spawner, power-ups, boss battle)
 * 2. Nitro Sprint: 60s Speed Drag Race (Analog speedometer physics, turbo bursts, ghost racer)
 * 3. Matrix Rain: Code Breaker (Netrunner terminal hacking, digital rain canvas, syntax tokens)
 * 4. KeyBeats: Rhythm Flow (4-Lane rhythm action, timing hit zones, Fever Mode overdrive)
 */

import { sound } from './sound-engine.js';
import { store } from './state.js';

// ==========================================
// ADAPTIVE WORD BANKS FOR ARCADE GAMEPLAY
// ==========================================
const CADET_WORDS = [
  'star', 'glow', 'beam', 'fire', 'dark', 'nova', 'ship', 'fast', 'flow',
  'path', 'dash', 'code', 'data', 'byte', 'core', 'warp', 'grid', 'bolt',
  'time', 'flux', 'jump', 'moon', 'mars', 'orbit', 'solar', 'laser', 'space',
  'speed', 'drive', 'pulse', 'spark', 'flare', 'blast', 'light', 'zenith'
];

const ACE_WORDS = [
  'velocity', 'gravity', 'quantum', 'nebula', 'asteroid', 'protocol',
  'keyboard', 'terminal', 'teleport', 'hyperion', 'spectrum', 'radiance',
  'momentum', 'tactical', 'reaction', 'accuracy', 'frequency', 'satellite',
  'thruster', 'horizon', 'cybernetic', 'overdrive', 'dynamo', 'catalyst',
  'vanguard', 'supernova', 'starlight', 'interlink', 'matrix', 'parallax'
];

const HYPERDRIVE_WORDS = [
  'const_speed', 'async_pulse', 'import_flux', 'export_core', 'render_laser',
  'packet_loss', 'buffer_size', 'system_boot', 'override_7', 'matrix_init',
  'crypto_hash', 'shield_lock', 'telemetry_99', 'vector_angle', 'cyber_drone',
  'quantum_leap', 'zero_gravity', 'plasma_shield', 'warp_velocity', 'engine_boost'
];

const BOSS_PHRASES = [
  'DESTROY_ALIEN_MOTHERSHIP',
  'const victory = speed >= 90;',
  'INITIALIZE_ORBITAL_DEFENSE',
  'OVERCHARGE_PLASMA_CANNON',
  'REBOOT_PLANETARY_SHIELDS',
  'MAXIMUM_VELOCITY_ENGAGED'
];

const CODE_TOKENS = [
  'function', 'return', 'async', 'await', 'import', 'export', 'const', 'let',
  'typeof', 'instanceof', 'Promise', 'resolve', 'reject', 'try', 'catch',
  'throw', 'finally', 'switch', 'case', 'break', 'default', 'continue',
  'console.log', 'document.get', 'window.fetch', 'JSON.stringify', 'Math.floor',
  'Array.from', 'Object.keys', 'setTimeout', 'setInterval', 'addEventListener',
  '0x7F4A', '0xFF00', '0x1A2B', '0x99C1', '0xDE44', '0x00FF',
  'item => item.id', 'sum += val;', 'res.json();', 'el.classList', 'key === code'
];

const RHYTHM_BEAT_WORDS = [
  'flow', 'beat', 'drop', 'bass', 'step', 'wave', 'tune', 'kick',
  'snare', 'vibe', 'drum', 'groove', 'rhythm', 'pulse', 'tempo', 'track',
  'synth', 'audio', 'sonic', 'dance', 'hyper', 'fever', 'stride', 'glide'
];

const POWERUP_TYPES = [
  { id: 'emp', name: 'EMP Shockwave', icon: '⚡', desc: 'Vaporizes all on-screen targets' },
  { id: 'freeze', name: 'Cryo Freeze', icon: '❄️', desc: 'Slows down time for 6 seconds' },
  { id: 'shield', name: 'Shield Matrix', icon: '🛡️', desc: 'Restores +1 planetary shield' }
];

// ==========================================
// 1. TYPE INVADERS: ORBIT DEFENSE GAME
// ==========================================
export class TypeInvadersGame {
  constructor(container, options = {}) {
    this.container = container;
    this.difficulty = options.difficulty || 'cadet'; // 'cadet' | 'ace' | 'hyperdrive'
    this.onExit = options.onExit || (() => {});

    this.state = {
      running: false,
      paused: false,
      score: 0,
      wave: 1,
      maxWave: 7,
      shieldHp: 3,
      maxShieldHp: 3,
      combo: 0,
      multiplier: 1,
      enemies: [],
      targetEnemyId: null,
      powerups: { emp: 1, freeze: 0 },
      isFrozen: false,
      freezeTimer: null,
      bossActive: false,
      bossHp: 0,
      bossMaxHp: 0,
      bossPhraseIndex: 0,
      bossCurrentText: '',
      totalEnemiesVaporized: 0,
      totalKeystrokes: 0,
      totalErrors: 0,
      startTime: 0,
      wpm: 0
    };

    this.animationId = null;
    this.lastFrameTime = performance.now();
    this.spawnTimer = 0;
    this.particles = [];

    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  mount() {
    this.container.innerHTML = `
      <div class="arcade-cabinet">
        <!-- Arcade Header HUD -->
        <div class="arcade-hud">
          <div class="hud-left">
            <div class="arcade-hud-pill">
              <span class="hud-label">SCORE</span>
              <span id="arcade-hud-score" class="hud-value hud-glow-cyan">0</span>
            </div>
            <div class="arcade-hud-pill">
              <span class="hud-label">WAVE</span>
              <span id="arcade-hud-wave" class="hud-value hud-glow-purple">1 / 7</span>
            </div>
            <div class="arcade-hud-pill">
              <span class="hud-label">MULTIPLIER</span>
              <span id="arcade-hud-multiplier" class="hud-value hud-glow-gold">1x</span>
            </div>
          </div>

          <div class="hud-center">
            <div class="arcade-shield-bar">
              <span class="hud-label" style="margin-right: 6px;">SHIELD:</span>
              <div id="arcade-shield-cells" class="shield-cells">
                <span class="shield-cell filled"></span>
                <span class="shield-cell filled"></span>
                <span class="shield-cell filled"></span>
              </div>
            </div>
          </div>

          <div class="hud-right">
            <div class="arcade-powerup-bar">
              <button id="btn-powerup-emp" class="arcade-powerup-btn" title="Press [TAB] or click to trigger EMP shockwave">
                <span class="powerup-icon">⚡</span>
                <span class="powerup-count" id="count-powerup-emp">1</span>
                <span class="powerup-key">TAB</span>
              </button>
              <button id="btn-powerup-freeze" class="arcade-powerup-btn" title="Press [SPACE] when available or click for Cryo Freeze">
                <span class="powerup-icon">❄️</span>
                <span class="powerup-count" id="count-powerup-freeze">0</span>
                <span class="powerup-key">SPC</span>
              </button>
            </div>
            <button id="arcade-btn-pause" class="arcade-control-btn" title="Pause Game (Escape)">⏸</button>
            <button id="arcade-btn-quit" class="arcade-control-btn" title="Exit to Hub">✕</button>
          </div>
        </div>

        <!-- Boss Alert Banner -->
        <div id="arcade-boss-banner" class="arcade-boss-banner" style="display: none;">
          <div class="boss-banner-content">
            <span class="boss-warning-icon">⚠️</span>
            <span class="boss-warning-text">MOTHERSHIP BOSS DETECTED! TYPE TO DEPLETE SHIELD</span>
            <span class="boss-warning-icon">⚠️</span>
          </div>
          <div class="boss-hp-track">
            <div id="arcade-boss-hp-fill" class="boss-hp-fill" style="width: 100%;"></div>
          </div>
        </div>

        <!-- Space Battle Arena Stage -->
        <div id="arcade-arena" class="arcade-arena">
          <canvas id="arcade-fx-canvas" class="arcade-fx-canvas"></canvas>
          <div id="arcade-enemies-layer" class="arcade-enemies-layer"></div>

          <!-- Defensive Turret at Bottom -->
          <div id="arcade-turret" class="arcade-turret">
            <div class="turret-barrel"></div>
            <div class="turret-base"></div>
          </div>

          <!-- Planetary Defense Shield Dome -->
          <div id="arcade-shield-dome" class="arcade-shield-dome"></div>

          <!-- Floating Laser Impact Indicator -->
          <div id="arcade-target-reticle" class="arcade-target-reticle" style="display: none;"></div>
        </div>

        <!-- Combo & Telemetry Floating Bar -->
        <div class="arcade-bottom-telemetry">
          <div class="telemetry-item">
            <span class="telem-label">COMBO</span>
            <span id="arcade-telem-combo" class="telem-val">0</span>
          </div>
          <div class="telemetry-item">
            <span class="telem-label">LIVE WPM</span>
            <span id="arcade-telem-wpm" class="telem-val">0</span>
          </div>
          <div class="telemetry-item">
            <span class="telem-label">VAPORIZED</span>
            <span id="arcade-telem-kills" class="telem-val">0</span>
          </div>
        </div>
      </div>
    `;

    this.fxCanvas = this.container.querySelector('#arcade-fx-canvas');
    this.fxCtx = this.fxCanvas ? this.fxCanvas.getContext('2d') : null;
    this.enemiesLayer = this.container.querySelector('#arcade-enemies-layer');
    this.turretEl = this.container.querySelector('#arcade-turret');
    this.reticleEl = this.container.querySelector('#arcade-target-reticle');

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('keydown', this.handleKeyDown);

    // Wire HUD Controls
    this.container.querySelector('#btn-powerup-emp')?.addEventListener('click', () => this.triggerEmp());
    this.container.querySelector('#btn-powerup-freeze')?.addEventListener('click', () => this.triggerFreeze());
    this.container.querySelector('#arcade-btn-pause')?.addEventListener('click', () => this.togglePause());
    this.container.querySelector('#arcade-btn-quit')?.addEventListener('click', () => this.quitGame());

    this.start();
  }

  resizeCanvas() {
    if (!this.fxCanvas) return;
    const rect = this.fxCanvas.getBoundingClientRect();
    this.fxCanvas.width = rect.width;
    this.fxCanvas.height = rect.height;
  }

  start() {
    this.state.running = true;
    this.state.paused = false;
    this.state.score = 0;
    this.state.wave = 1;
    this.state.shieldHp = 3;
    this.state.combo = 0;
    this.state.multiplier = 1;
    this.state.enemies = [];
    this.state.powerups = { emp: 1, freeze: 1 };
    this.state.totalEnemiesVaporized = 0;
    this.state.totalKeystrokes = 0;
    this.state.totalErrors = 0;
    this.state.startTime = performance.now();
    this.particles = [];

    this.updateHud();
    sound.playPowerup();

    this.lastFrameTime = performance.now();
    this.loop(this.lastFrameTime);
  }

  loop(currentTime) {
    if (!this.state.running) return;

    const dt = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;

    if (!this.state.paused) {
      this.update(dt);
      this.renderFx(dt);
    }

    this.animationId = requestAnimationFrame(time => this.loop(time));
  }

  update(dt) {
    const elapsedMinutes = (performance.now() - this.state.startTime) / 60000;
    if (elapsedMinutes > 0 && this.state.totalKeystrokes > 0) {
      this.state.wpm = Math.round((this.state.totalKeystrokes / 5) / elapsedMinutes);
      const wpmEl = this.container.querySelector('#arcade-telem-wpm');
      if (wpmEl) wpmEl.textContent = `${this.state.wpm}`;
    }

    // Wave 7 is Boss Wave
    if (this.state.wave >= this.state.maxWave && !this.state.bossActive) {
      this.spawnBoss();
    }

    // Normal Enemy Spawning
    if (!this.state.bossActive) {
      this.spawnTimer += dt;
      const spawnInterval = Math.max(1.2, 3.2 - (this.state.wave * 0.3));
      const maxEnemiesOnScreen = Math.min(6, 2 + this.state.wave);

      if (this.spawnTimer >= spawnInterval && this.state.enemies.length < maxEnemiesOnScreen) {
        this.spawnTimer = 0;
        this.spawnEnemy();
      }
    }

    // Update Enemies Position
    const speedMultiplier = this.state.isFrozen ? 0.2 : 1.0;
    const baseSpeed = (20 + (this.state.wave * 8)) * (this.difficulty === 'hyperdrive' ? 1.4 : this.difficulty === 'ace' ? 1.2 : 1.0);

    for (let i = this.state.enemies.length - 1; i >= 0; i--) {
      const enemy = this.state.enemies[i];
      enemy.y += (baseSpeed * enemy.speedFactor * speedMultiplier) * dt;

      // Check Shield Breach
      if (enemy.y >= 88) {
        this.handleShieldBreach(enemy, i);
      }
    }

    // Update Boss Minions if Boss is active
    if (this.state.bossActive) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= 4.0 && this.state.enemies.length < 2) {
        this.spawnTimer = 0;
        this.spawnEnemy(true); // minion
      }
    }

    this.renderEnemiesDOM();
  }

  getWordForCurrentWave() {
    if (this.difficulty === 'hyperdrive' || this.state.wave >= 5) {
      const pool = [...ACE_WORDS, ...HYPERDRIVE_WORDS];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    if (this.difficulty === 'ace' || this.state.wave >= 3) {
      return ACE_WORDS[Math.floor(Math.random() * ACE_WORDS.length)];
    }
    return CADET_WORDS[Math.floor(Math.random() * CADET_WORDS.length)];
  }

  spawnEnemy(isMinion = false) {
    const word = this.getWordForCurrentWave();
    const existingWords = new Set(this.state.enemies.map(e => e.word));
    if (existingWords.has(word) && this.state.enemies.length > 0) return; // avoid duplicate active words

    // Distribute randomly across 5 lanes (15% to 85% width)
    const laneX = 12 + Math.random() * 76;
    const hasPowerup = Math.random() < 0.18;
    const powerup = hasPowerup ? POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)] : null;

    const enemy = {
      id: `invader-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      word,
      typedIndex: 0,
      x: laneX,
      y: 5,
      speedFactor: 0.85 + Math.random() * 0.35,
      powerup,
      isMinion,
      icon: isMinion ? '🛸' : (powerup ? '✨' : '👾')
    };

    this.state.enemies.push(enemy);
  }

  spawnBoss() {
    this.state.bossActive = true;
    this.state.bossMaxHp = 6;
    this.state.bossHp = 6;
    this.state.bossPhraseIndex = 0;
    this.state.bossCurrentText = BOSS_PHRASES[0];
    this.state.enemies = []; // clear small enemies for boss entrance

    sound.playBossAlarm();

    const banner = this.container.querySelector('#arcade-boss-banner');
    if (banner) banner.style.display = 'block';

    this.spawnBossMinion();
    this.renderEnemiesDOM();
  }

  spawnBossMinion() {
    const enemy = {
      id: `boss-core`,
      word: this.state.bossCurrentText,
      typedIndex: 0,
      x: 50,
      y: 18,
      speedFactor: 0, // static mothership at top
      isBoss: true,
      icon: '🛸'
    };
    this.state.enemies = [enemy];
    this.state.targetEnemyId = enemy.id;
  }

  handleKeyDown(e) {
    if (!this.state.running || this.state.paused) {
      if (e.key === 'Escape' && this.state.running) this.togglePause();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      this.triggerEmp();
      return;
    }

    if (e.key === ' ' && this.state.powerups.freeze > 0 && !this.state.isFrozen) {
      e.preventDefault();
      this.triggerFreeze();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      this.togglePause();
      return;
    }

    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;

    const char = e.key;
    this.state.totalKeystrokes++;

    // 1. If currently locked onto a target enemy
    if (this.state.targetEnemyId) {
      const enemy = this.state.enemies.find(e => e.id === this.state.targetEnemyId);
      if (enemy) {
        const expectedChar = enemy.word[enemy.typedIndex];
        if (char === expectedChar) {
          this.hitTarget(enemy);
          return;
        } else {
          this.misfire();
          return;
        }
      }
    }

    // 2. Not locked onto an enemy yet: find lowest enemy matching this starting character
    const candidate = this.state.enemies
      .filter(e => e.word.startsWith(char) && e.typedIndex === 0)
      .sort((a, b) => b.y - a.y)[0]; // target closest to shield first

    if (candidate) {
      this.state.targetEnemyId = candidate.id;
      this.hitTarget(candidate);
    } else {
      this.misfire();
    }
  }

  hitTarget(enemy) {
    enemy.typedIndex++;
    this.state.combo++;
    this.state.multiplier = Math.min(8, 1 + Math.floor(this.state.combo / 10));

    sound.playLaserShot();
    this.aimTurretAt(enemy.x, enemy.y);
    this.spawnLaserBeam(enemy.x, enemy.y);

    // Check if word completed
    if (enemy.typedIndex >= enemy.word.length) {
      this.destroyEnemy(enemy);
    }

    this.updateHud();
    this.renderEnemiesDOM();
  }

  misfire() {
    this.state.totalErrors++;
    this.state.combo = 0;
    this.state.multiplier = 1;
    sound.playShieldAlarm();

    if (this.turretEl) {
      this.turretEl.classList.add('turret-misfire');
      setTimeout(() => this.turretEl?.classList.remove('turret-misfire'), 200);
    }

    this.updateHud();
  }

  destroyEnemy(enemy) {
    this.state.totalEnemiesVaporized++;
    const wordScore = (enemy.word.length * 120) * this.state.multiplier;
    this.state.score += wordScore;

    sound.playExplosion();
    this.createExplosion(enemy.x, enemy.y, enemy.isBoss ? '#FF5C7A' : '#00D4AA');

    // Handle Powerup Drop
    if (enemy.powerup) {
      if (enemy.powerup.id === 'emp') this.state.powerups.emp++;
      if (enemy.powerup.id === 'freeze') this.state.powerups.freeze++;
      if (enemy.powerup.id === 'shield') {
        this.state.shieldHp = Math.min(this.state.maxShieldHp, this.state.shieldHp + 1);
      }
      sound.playPowerup();
      this.showFloatingText(`+${enemy.powerup.name.toUpperCase()}!`, enemy.x, enemy.y, '#FFD166');
    } else {
      this.showFloatingText(`+${wordScore}`, enemy.x, enemy.y, '#00D4AA');
    }

    // Boss damage handling
    if (enemy.isBoss) {
      this.state.bossHp--;
      const hpPct = Math.round((this.state.bossHp / this.state.bossMaxHp) * 100);
      const hpFill = this.container.querySelector('#arcade-boss-hp-fill');
      if (hpFill) hpFill.style.width = `${hpPct}%`;

      if (this.state.bossHp <= 0) {
        this.handleBossDefeated();
        return;
      } else {
        // Advance to next boss phrase
        this.state.bossPhraseIndex = (this.state.bossPhraseIndex + 1) % BOSS_PHRASES.length;
        this.state.bossCurrentText = BOSS_PHRASES[this.state.bossPhraseIndex];
        enemy.word = this.state.bossCurrentText;
        enemy.typedIndex = 0;
        return;
      }
    }

    // Remove normal enemy
    this.state.enemies = this.state.enemies.filter(e => e.id !== enemy.id);
    if (this.state.targetEnemyId === enemy.id) {
      this.state.targetEnemyId = null;
    }

    // Check Wave Advancement (every 8 enemies vaporized per wave)
    if (this.state.totalEnemiesVaporized % 8 === 0 && this.state.wave < this.state.maxWave) {
      this.advanceWave();
    }
  }

  advanceWave() {
    this.state.wave++;
    sound.playPowerup();
    this.showFloatingText(`WAVE ${this.state.wave} ENGAGED!`, 50, 45, '#7C5CFC', 24);
    this.updateHud();
  }

  handleShieldBreach(enemy, index) {
    this.state.shieldHp--;
    sound.playShieldAlarm();
    this.createExplosion(enemy.x, 88, '#FF5C7A');

    // Remove breached enemy
    this.state.enemies.splice(index, 1);
    if (this.state.targetEnemyId === enemy.id) this.state.targetEnemyId = null;

    // Flash shield dome red
    const dome = this.container.querySelector('#arcade-shield-dome');
    if (dome) {
      dome.classList.add('dome-impact');
      setTimeout(() => dome.classList.remove('dome-impact'), 400);
    }

    this.updateHud();

    if (this.state.shieldHp <= 0) {
      this.handleGameOver();
    }
  }

  triggerEmp() {
    if (this.state.powerups.emp <= 0) return;
    this.state.powerups.emp--;
    sound.playExplosion();

    // Flash screen with plasma EMP
    const arena = this.container.querySelector('#arcade-arena');
    if (arena) {
      arena.classList.add('emp-flash');
      setTimeout(() => arena.classList.remove('emp-flash'), 500);
    }

    // Vaporize all non-boss enemies
    const toDestroy = [...this.state.enemies.filter(e => !e.isBoss)];
    toDestroy.forEach(e => {
      this.destroyEnemy(e);
    });

    this.state.targetEnemyId = null;
    this.updateHud();
    this.renderEnemiesDOM();
  }

  triggerFreeze() {
    if (this.state.powerups.freeze <= 0 || this.state.isFrozen) return;
    this.state.powerups.freeze--;
    this.state.isFrozen = true;
    sound.playPowerup();

    const arena = this.container.querySelector('#arcade-arena');
    if (arena) arena.classList.add('cryo-frozen');

    clearTimeout(this.state.freezeTimer);
    this.state.freezeTimer = setTimeout(() => {
      this.state.isFrozen = false;
      if (arena) arena.classList.remove('cryo-frozen');
    }, 6000);

    this.updateHud();
  }

  aimTurretAt(targetX, targetY) {
    if (!this.turretEl) return;
    const dx = targetX - 50;
    const dy = targetY - 92;
    const angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    this.turretEl.style.transform = `translateX(-50%) rotate(${angle}deg)`;
  }

  spawnLaserBeam(targetX, targetY) {
    if (!this.fxCtx || !this.fxCanvas) return;
    const startX = (this.fxCanvas.width * 50) / 100;
    const startY = (this.fxCanvas.height * 90) / 100;
    const endX = (this.fxCanvas.width * targetX) / 100;
    const endY = (this.fxCanvas.height * targetY) / 100;

    this.particles.push({
      type: 'laser',
      x1: startX,
      y1: startY,
      x2: endX,
      y2: endY,
      color: '#00D4AA',
      life: 0.12,
      maxLife: 0.12
    });
  }

  createExplosion(xPct, yPct, color = '#00D4AA') {
    if (!this.fxCanvas) return;
    const cx = (this.fxCanvas.width * xPct) / 100;
    const cy = (this.fxCanvas.height * yPct) / 100;

    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 180;
      this.particles.push({
        type: 'spark',
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2 + Math.random() * 3,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7
      });
    }
  }

  showFloatingText(text, xPct, yPct, color = '#00D4AA', fontSize = 16) {
    if (!this.fxCanvas) return;
    const cx = (this.fxCanvas.width * xPct) / 100;
    const cy = (this.fxCanvas.height * yPct) / 100;

    this.particles.push({
      type: 'text',
      text,
      x: cx,
      y: cy,
      vy: -50,
      color,
      fontSize,
      life: 0.8,
      maxLife: 0.8
    });
  }

  renderFx(dt) {
    if (!this.fxCtx || !this.fxCanvas) return;
    this.fxCtx.clearRect(0, 0, this.fxCanvas.width, this.fxCanvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const alpha = Math.max(0, p.life / p.maxLife);

      if (p.type === 'laser') {
        this.fxCtx.save();
        this.fxCtx.strokeStyle = p.color;
        this.fxCtx.globalAlpha = alpha;
        this.fxCtx.lineWidth = 3.5;
        this.fxCtx.shadowColor = p.color;
        this.fxCtx.shadowBlur = 12;
        this.fxCtx.beginPath();
        this.fxCtx.moveTo(p.x1, p.y1);
        this.fxCtx.lineTo(p.x2, p.y2);
        this.fxCtx.stroke();
        this.fxCtx.restore();
      } else if (p.type === 'spark') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        this.fxCtx.save();
        this.fxCtx.fillStyle = p.color;
        this.fxCtx.globalAlpha = alpha;
        this.fxCtx.shadowColor = p.color;
        this.fxCtx.shadowBlur = 8;
        this.fxCtx.beginPath();
        this.fxCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.fxCtx.fill();
        this.fxCtx.restore();
      } else if (p.type === 'text') {
        p.y += p.vy * dt;
        this.fxCtx.save();
        this.fxCtx.font = `800 ${p.fontSize}px 'JetBrains Mono', monospace`;
        this.fxCtx.fillStyle = p.color;
        this.fxCtx.globalAlpha = alpha;
        this.fxCtx.textAlign = 'center';
        this.fxCtx.shadowColor = p.color;
        this.fxCtx.shadowBlur = 10;
        this.fxCtx.fillText(p.text, p.x, p.y);
        this.fxCtx.restore();
      }
    }
  }

  renderEnemiesDOM() {
    if (!this.enemiesLayer) return;

    this.enemiesLayer.innerHTML = this.state.enemies.map(enemy => {
      const isLocked = this.state.targetEnemyId === enemy.id;
      const typedPart = enemy.word.slice(0, enemy.typedIndex);
      const remainingPart = enemy.word.slice(enemy.typedIndex);

      return `
        <div class="invader-capsule ${isLocked ? 'target-locked' : ''} ${enemy.isBoss ? 'boss-vessel' : ''}" style="left: ${enemy.x}%; top: ${enemy.y}%;">
          <div class="invader-icon">${enemy.icon}</div>
          <div class="invader-word">
            <span class="word-typed">${typedPart}</span><span class="word-remaining">${remainingPart}</span>
          </div>
          ${enemy.powerup ? `<span class="invader-powerup-badge">${enemy.powerup.icon}</span>` : ''}
        </div>
      `;
    }).join('');
  }

  updateHud() {
    const scoreEl = this.container.querySelector('#arcade-hud-score');
    if (scoreEl) scoreEl.textContent = this.state.score.toLocaleString();

    const waveEl = this.container.querySelector('#arcade-hud-wave');
    if (waveEl) waveEl.textContent = `${this.state.wave} / ${this.state.maxWave}`;

    const multEl = this.container.querySelector('#arcade-hud-multiplier');
    if (multEl) multEl.textContent = `${this.state.multiplier}x`;

    const comboEl = this.container.querySelector('#arcade-telem-combo');
    if (comboEl) comboEl.textContent = `${this.state.combo}`;

    const killsEl = this.container.querySelector('#arcade-telem-kills');
    if (killsEl) killsEl.textContent = `${this.state.totalEnemiesVaporized}`;

    const empCountEl = this.container.querySelector('#count-powerup-emp');
    if (empCountEl) empCountEl.textContent = `${this.state.powerups.emp}`;

    const freezeCountEl = this.container.querySelector('#count-powerup-freeze');
    if (freezeCountEl) freezeCountEl.textContent = `${this.state.powerups.freeze}`;

    // Shield HP Cells
    const shieldCells = this.container.querySelector('#arcade-shield-cells');
    if (shieldCells) {
      let cellsHtml = '';
      for (let i = 0; i < this.state.maxShieldHp; i++) {
        cellsHtml += `<span class="shield-cell ${i < this.state.shieldHp ? 'filled' : 'empty'}"></span>`;
      }
      shieldCells.innerHTML = cellsHtml;
    }
  }

  togglePause() {
    this.state.paused = !this.state.paused;
    const pauseBtn = this.container.querySelector('#arcade-btn-pause');
    if (pauseBtn) pauseBtn.textContent = this.state.paused ? '▶' : '⏸';
  }

  handleGameOver() {
    this.state.running = false;
    cancelAnimationFrame(this.animationId);

    const accuracy = this.state.totalKeystrokes > 0
      ? Math.round(((this.state.totalKeystrokes - this.state.totalErrors) / this.state.totalKeystrokes) * 100)
      : 100;
    const xpEarned = Math.round(this.state.score / 20) + (this.state.wave * 25);

    store.recordArcadeResult({
      gameId: 'type-invaders',
      score: this.state.score,
      wave: this.state.wave,
      bossDefeated: false,
      wpm: this.state.wpm,
      accuracy,
      xpEarned
    });

    this.showEndModal({
      title: 'DEFENSE MATRIX BREACHED',
      subtitle: 'Earth shields collapsed under alien bombardment',
      isVictory: false,
      xpEarned,
      accuracy
    });
  }

  handleBossDefeated() {
    this.state.running = false;
    cancelAnimationFrame(this.animationId);

    const accuracy = this.state.totalKeystrokes > 0
      ? Math.round(((this.state.totalKeystrokes - this.state.totalErrors) / this.state.totalKeystrokes) * 100)
      : 100;
    const xpEarned = Math.round(this.state.score / 15) + 300;

    store.recordArcadeResult({
      gameId: 'type-invaders',
      score: this.state.score + 5000,
      wave: 7,
      bossDefeated: true,
      wpm: this.state.wpm,
      accuracy,
      xpEarned
    });

    this.showEndModal({
      title: 'VICTORY! MOTHERSHIP VAPORIZED',
      subtitle: 'Earth planetary orbit is secured. Grandmaster defense accomplished!',
      isVictory: true,
      xpEarned,
      accuracy
    });
  }

  showEndModal({ title, subtitle, isVictory, xpEarned, accuracy }) {
    const modal = document.createElement('div');
    modal.className = 'arcade-modal-overlay';
    modal.innerHTML = `
      <div class="arcade-modal-card ${isVictory ? 'modal-victory' : 'modal-defeat'}">
        <div class="modal-badge-icon">${isVictory ? '👑' : '💥'}</div>
        <h2 class="modal-title">${title}</h2>
        <p class="modal-subtitle">${subtitle}</p>

        <div class="arcade-summary-grid">
          <div class="summary-pill">
            <span class="summary-label">FINAL SCORE</span>
            <span class="summary-value hud-glow-cyan">${this.state.score.toLocaleString()}</span>
          </div>
          <div class="summary-pill">
            <span class="summary-label">WAVE REACHED</span>
            <span class="summary-value hud-glow-purple">${this.state.wave} / 7</span>
          </div>
          <div class="summary-pill">
            <span class="summary-label">AVERAGE WPM</span>
            <span class="summary-value hud-glow-gold">${this.state.wpm}</span>
          </div>
          <div class="summary-pill">
            <span class="summary-label">ACCURACY</span>
            <span class="summary-value">${accuracy}%</span>
          </div>
        </div>

        <div class="arcade-reward-banner">
          <span>⚡ +${xpEarned} Bonus XP Awarded to Profile</span>
        </div>

        <div class="modal-actions">
          <button id="modal-btn-replay" class="btn btn-primary btn-lg">Play Again</button>
          <button id="modal-btn-hub" class="btn btn-secondary btn-lg">Back to Arcade Hub</button>
        </div>
      </div>
    `;

    this.container.appendChild(modal);

    modal.querySelector('#modal-btn-replay')?.addEventListener('click', () => {
      modal.remove();
      this.mount();
    });

    modal.querySelector('#modal-btn-hub')?.addEventListener('click', () => {
      modal.remove();
      this.quitGame();
    });
  }

  quitGame() {
    this.state.running = false;
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.onExit();
  }
}

// ==========================================
// 2. NITRO SPRINT: 60S DRAG RACE
// ==========================================
export class NitroSprintGame {
  constructor(container, options = {}) {
    this.container = container;
    this.durationSec = options.durationSec || 60;
    this.onExit = options.onExit || (() => {});

    this.state = {
      running: false,
      timeLeft: this.durationSec,
      timer: null,
      score: 0,
      wpm: 0,
      peakWpm: 0,
      combo: 0,
      nitroActive: false,
      nitroMeter: 0, // 0 - 100%
      textToType: '',
      charIndex: 0,
      totalKeystrokes: 0,
      totalErrors: 0,
      startTime: 0
    };

    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  mount() {
    const passages = [
      'Velocity and precision create effortless typing mastery. Keep your eyes forward, trust your muscle memory, and let your fingers fly across the mechanical keyboard with rhythm and confidence.',
      'Touch typing eliminates the friction between thought and digital creation. Feel the tactile click of every switch, maintain continuous momentum, and unlock your true maximum typing speed.',
      'Smooth is fast, and fast is smooth. Do not rush difficult letters; maintain a steady metronome cadence, hold your posture upright, and watch your speed accelerate into high gear.'
    ];
    this.state.textToType = passages[Math.floor(Math.random() * passages.length)];

    this.container.innerHTML = `
      <div class="arcade-cabinet nitro-theme">
        <!-- Nitro Race HUD -->
        <div class="nitro-hud">
          <div class="nitro-speedometer-box">
            <div class="speedo-gauge">
              <div id="speedo-needle" class="speedo-needle" style="transform: rotate(-90deg);"></div>
              <div class="speedo-center">
                <span id="nitro-live-wpm" class="speedo-val">0</span>
                <span class="speedo-unit">WPM</span>
              </div>
            </div>
          </div>

          <div class="nitro-metrics-row">
            <div class="arcade-hud-pill">
              <span class="hud-label">TIME REMAINING</span>
              <span id="nitro-time-left" class="hud-value hud-glow-gold">${this.durationSec}s</span>
            </div>
            <div class="arcade-hud-pill">
              <span class="hud-label">PEAK WPM</span>
              <span id="nitro-peak-wpm" class="hud-value hud-glow-cyan">0</span>
            </div>
            <div class="arcade-hud-pill">
              <span class="hud-label">NITRO BOOST</span>
              <div class="nitro-boost-bar">
                <div id="nitro-boost-fill" class="nitro-boost-fill" style="width: 0%;"></div>
              </div>
            </div>
          </div>

          <button id="nitro-btn-quit" class="arcade-control-btn" style="position: absolute; top: 16px; right: 16px;">✕</button>
        </div>

        <!-- Track & Typing Passage -->
        <div class="nitro-track-arena">
          <div id="nitro-speed-lines" class="nitro-speed-lines"></div>

          <div class="nitro-typing-box">
            <div id="nitro-text-display" class="nitro-text-display"></div>
          </div>
        </div>
      </div>
    `;

    window.addEventListener('keydown', this.handleKeyDown);
    this.container.querySelector('#nitro-btn-quit')?.addEventListener('click', () => this.quitGame());

    this.renderTextDisplay();
    this.start();
  }

  start() {
    this.state.running = true;
    this.state.timeLeft = this.durationSec;
    this.state.charIndex = 0;
    this.state.totalKeystrokes = 0;
    this.state.totalErrors = 0;
    this.state.startTime = performance.now();

    this.state.timer = setInterval(() => {
      this.state.timeLeft--;
      const timeEl = this.container.querySelector('#nitro-time-left');
      if (timeEl) timeEl.textContent = `${this.state.timeLeft}s`;

      if (this.state.timeLeft <= 0) {
        this.finishRace();
      }
    }, 1000);
  }

  handleKeyDown(e) {
    if (!this.state.running) return;
    if (e.key === 'Escape') {
      this.quitGame();
      return;
    }
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;

    e.preventDefault();
    const char = e.key;
    const expectedChar = this.state.textToType[this.state.charIndex];

    this.state.totalKeystrokes++;

    if (char === expectedChar) {
      this.state.charIndex++;
      this.state.combo++;
      this.state.nitroMeter = Math.min(100, this.state.nitroMeter + 3);

      sound.playKeyClick(char);

      // Trigger Nitro on high combo
      if (this.state.combo % 20 === 0 && !this.state.nitroActive) {
        this.triggerNitroBoost();
      }

      // Loop text if completed
      if (this.state.charIndex >= this.state.textToType.length) {
        this.state.charIndex = 0;
      }
    } else {
      this.state.totalErrors++;
      this.state.combo = 0;
      this.state.nitroMeter = Math.max(0, this.state.nitroMeter - 10);
      sound.playShieldAlarm();
    }

    this.updateSpeedMetrics();
    this.renderTextDisplay();
  }

  updateSpeedMetrics() {
    const elapsedMinutes = (performance.now() - this.state.startTime) / 60000;
    if (elapsedMinutes > 0 && this.state.totalKeystrokes > 0) {
      this.state.wpm = Math.round((this.state.totalKeystrokes / 5) / elapsedMinutes);
      this.state.peakWpm = Math.max(this.state.peakWpm, this.state.wpm);

      const wpmEl = this.container.querySelector('#nitro-live-wpm');
      if (wpmEl) wpmEl.textContent = `${this.state.wpm}`;

      const peakEl = this.container.querySelector('#nitro-peak-wpm');
      if (peakEl) peakEl.textContent = `${this.state.peakWpm}`;

      // Analog Needle Gauge: 0 to 140 WPM maps from -90deg to +90deg
      const angle = Math.min(90, Math.max(-90, -90 + (this.state.wpm / 140) * 180));
      const needleEl = this.container.querySelector('#speedo-needle');
      if (needleEl) needleEl.style.transform = `rotate(${angle}deg)`;

      // Nitro bar
      const nitroFill = this.container.querySelector('#nitro-boost-fill');
      if (nitroFill) nitroFill.style.width = `${this.state.nitroMeter}%`;
    }
  }

  triggerNitroBoost() {
    this.state.nitroActive = true;
    sound.playNitroBoost();

    const track = this.container.querySelector('.nitro-track-arena');
    if (track) track.classList.add('nitro-turbo-active');

    setTimeout(() => {
      this.state.nitroActive = false;
      if (track) track.classList.remove('nitro-turbo-active');
    }, 4000);
  }

  renderTextDisplay() {
    const displayEl = this.container.querySelector('#nitro-text-display');
    if (!displayEl) return;

    let html = '';
    for (let i = 0; i < this.state.textToType.length; i++) {
      const ch = this.state.textToType[i];
      if (i < this.state.charIndex) {
        html += `<span class="char-correct">${ch}</span>`;
      } else if (i === this.state.charIndex) {
        html += `<span class="char-current">${ch}</span>`;
      } else {
        html += `<span class="char-upcoming">${ch}</span>`;
      }
    }
    displayEl.innerHTML = html;
  }

  finishRace() {
    this.state.running = false;
    clearInterval(this.state.timer);
    window.removeEventListener('keydown', this.handleKeyDown);

    const accuracy = this.state.totalKeystrokes > 0
      ? Math.round(((this.state.totalKeystrokes - this.state.totalErrors) / this.state.totalKeystrokes) * 100)
      : 100;
    const xpEarned = Math.round(this.state.wpm * 2) + 50;

    store.recordArcadeResult({
      gameId: 'nitro-sprint',
      wpm: this.state.wpm,
      accuracy,
      xpEarned
    });

    const modal = document.createElement('div');
    modal.className = 'arcade-modal-overlay';
    modal.innerHTML = `
      <div class="arcade-modal-card modal-victory">
        <div class="modal-badge-icon">🏁</div>
        <h2 class="modal-title">SPEED TRIAL COMPLETE!</h2>
        <p class="modal-subtitle">60-Second Drag Race Final Telemetry</p>

        <div class="arcade-summary-grid">
          <div class="summary-pill">
            <span class="summary-label">AVERAGE SPEED</span>
            <span class="summary-value hud-glow-cyan">${this.state.wpm} WPM</span>
          </div>
          <div class="summary-pill">
            <span class="summary-label">PEAK VELOCITY</span>
            <span class="summary-value hud-glow-gold">${this.state.peakWpm} WPM</span>
          </div>
          <div class="summary-pill">
            <span class="summary-label">ACCURACY</span>
            <span class="summary-value hud-glow-purple">${accuracy}%</span>
          </div>
          <div class="summary-pill">
            <span class="summary-label">TOTAL STROKES</span>
            <span class="summary-value">${this.state.totalKeystrokes}</span>
          </div>
        </div>

        <div class="arcade-reward-banner">
          <span>⚡ +${xpEarned} Bonus XP Earned</span>
        </div>

        <div class="modal-actions">
          <button id="nitro-btn-replay" class="btn btn-primary btn-lg">Race Again</button>
          <button id="nitro-btn-hub" class="btn btn-secondary btn-lg">Back to Arcade Hub</button>
        </div>
      </div>
    `;

    this.container.appendChild(modal);

    modal.querySelector('#nitro-btn-replay')?.addEventListener('click', () => {
      modal.remove();
      this.mount();
    });

    modal.querySelector('#nitro-btn-hub')?.addEventListener('click', () => {
      modal.remove();
      this.quitGame();
    });
  }

  quitGame() {
    this.state.running = false;
    clearInterval(this.state.timer);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.onExit();
  }
}

// ==========================================
// 3. MATRIX RAIN: CODE BREAKER TERMINAL HACK
// ==========================================
export class MatrixRainGame {
  constructor(container, options = {}) {
    this.container = container;
    this.onExit = options.onExit || (() => {});

    this.state = {
      running: false,
      paused: false,
      score: 0,
      securityBreachPct: 0, // 0 to 100%
      dataExfiltratedKb: 0,
      combo: 0,
      multiplier: 1,
      columns: [],
      targetTokenId: null,
      overclockBombs: 1,
      totalHacked: 0,
      totalKeystrokes: 0,
      totalErrors: 0,
      startTime: 0,
      wpm: 0
    };

    this.animationId = null;
    this.lastFrameTime = performance.now();
    this.spawnTimer = 0;
    this.matrixCanvas = null;
    this.matrixCtx = null;
    this.matrixDrops = [];

    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  mount() {
    this.container.innerHTML = `
      <div class="arcade-cabinet matrix-theme">
        <!-- Matrix Terminal HUD -->
        <div class="arcade-hud matrix-hud">
          <div class="hud-left">
            <div class="arcade-hud-pill">
              <span class="hud-label">DATA EXFILTRATED</span>
              <span id="matrix-hud-score" class="hud-value hud-glow-cyan">0 KB</span>
            </div>
            <div class="arcade-hud-pill">
              <span class="hud-label">BREACH LEVEL</span>
              <span id="matrix-hud-breach" class="hud-value hud-glow-gold">0%</span>
            </div>
            <div class="arcade-hud-pill">
              <span class="hud-label">OVERCLOCK MULTIPLIER</span>
              <span id="matrix-hud-multiplier" class="hud-value hud-glow-purple">1x</span>
            </div>
          </div>

          <div class="hud-center">
            <div class="matrix-firewall-bar">
              <span class="hud-label" style="margin-right: 6px;">FIREWALL OVERHEAT:</span>
              <div class="firewall-track">
                <div id="matrix-firewall-fill" class="firewall-fill" style="width: 0%;"></div>
              </div>
            </div>
          </div>

          <div class="hud-right">
            <button id="btn-matrix-purge" class="arcade-powerup-btn" title="Press [TAB] or click for Buffer Overclock Purge">
              <span class="powerup-icon">⚡</span>
              <span class="powerup-count" id="count-matrix-bombs">1</span>
              <span class="powerup-key">TAB</span>
            </button>
            <button id="matrix-btn-pause" class="arcade-control-btn" title="Pause Game (Escape)">⏸</button>
            <button id="matrix-btn-quit" class="arcade-control-btn" title="Exit to Hub">✕</button>
          </div>
        </div>

        <!-- Terminal Stage Area -->
        <div id="matrix-arena" class="arcade-arena matrix-arena">
          <canvas id="matrix-bg-canvas" class="matrix-bg-canvas"></canvas>
          <div id="matrix-tokens-layer" class="matrix-tokens-layer"></div>

          <!-- Bottom Decryption Buffer Line -->
          <div class="matrix-buffer-line">
            <span class="buffer-label">> ROOT ACCESS BUFFER ACTIVE</span>
          </div>
        </div>

        <!-- Matrix Telemetry -->
        <div class="arcade-bottom-telemetry">
          <div class="telemetry-item">
            <span class="telem-label">COMBO HACKS</span>
            <span id="matrix-telem-combo" class="telem-val">0</span>
          </div>
          <div class="telemetry-item">
            <span class="telem-label">HACK RATE</span>
            <span id="matrix-telem-wpm" class="telem-val">0 WPM</span>
          </div>
          <div class="telemetry-item">
            <span class="telem-label">TOKENS DECRYPTED</span>
            <span id="matrix-telem-hacked" class="telem-val">0</span>
          </div>
        </div>
      </div>
    `;

    this.matrixCanvas = this.container.querySelector('#matrix-bg-canvas');
    this.matrixCtx = this.matrixCanvas ? this.matrixCanvas.getContext('2d') : null;
    this.tokensLayer = this.container.querySelector('#matrix-tokens-layer');

    this.initMatrixRainCanvas();
    window.addEventListener('resize', () => this.initMatrixRainCanvas());
    window.addEventListener('keydown', this.handleKeyDown);

    this.container.querySelector('#btn-matrix-purge')?.addEventListener('click', () => this.triggerBufferPurge());
    this.container.querySelector('#matrix-btn-pause')?.addEventListener('click', () => this.togglePause());
    this.container.querySelector('#matrix-btn-quit')?.addEventListener('click', () => this.quitGame());

    this.start();
  }

  initMatrixRainCanvas() {
    if (!this.matrixCanvas) return;
    const rect = this.matrixCanvas.getBoundingClientRect();
    this.matrixCanvas.width = rect.width;
    this.matrixCanvas.height = rect.height;

    const columns = Math.floor(rect.width / 18);
    this.matrixDrops = new Array(columns).fill(1);
  }

  start() {
    this.state.running = true;
    this.state.paused = false;
    this.state.score = 0;
    this.state.securityBreachPct = 0;
    this.state.combo = 0;
    this.state.multiplier = 1;
    this.state.columns = [];
    this.state.overclockBombs = 1;
    this.state.totalHacked = 0;
    this.state.totalKeystrokes = 0;
    this.state.totalErrors = 0;
    this.state.startTime = performance.now();

    this.updateHud();
    sound.playCyberDecrypt();

    this.lastFrameTime = performance.now();
    this.loop(this.lastFrameTime);
  }

  loop(currentTime) {
    if (!this.state.running) return;

    const dt = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;

    if (!this.state.paused) {
      this.update(dt);
      this.renderMatrixBg();
    }

    this.animationId = requestAnimationFrame(time => this.loop(time));
  }

  update(dt) {
    const elapsedMinutes = (performance.now() - this.state.startTime) / 60000;
    if (elapsedMinutes > 0 && this.state.totalKeystrokes > 0) {
      this.state.wpm = Math.round((this.state.totalKeystrokes / 5) / elapsedMinutes);
      const wpmEl = this.container.querySelector('#matrix-telem-wpm');
      if (wpmEl) wpmEl.textContent = `${this.state.wpm} WPM`;
    }

    // Token Spawning
    this.spawnTimer += dt;
    if (this.spawnTimer >= 1.4 && this.state.columns.length < 5) {
      this.spawnTimer = 0;
      this.spawnToken();
    }

    // Token descent
    const fallSpeed = 22 + (this.state.securityBreachPct * 0.2);
    for (let i = this.state.columns.length - 1; i >= 0; i--) {
      const token = this.state.columns[i];
      token.y += (fallSpeed * token.speedFactor) * dt;

      // Firewall breach (token reached bottom buffer)
      if (token.y >= 86) {
        this.handleFirewallOverheat(token, i);
      }
    }

    this.renderTokensDOM();
  }

  spawnToken() {
    const text = CODE_TOKENS[Math.floor(Math.random() * CODE_TOKENS.length)];
    const existing = new Set(this.state.columns.map(t => t.text));
    if (existing.has(text) && this.state.columns.length > 0) return;

    const laneX = 14 + Math.random() * 72;
    const isHex = text.startsWith('0x');

    const token = {
      id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text,
      typedIndex: 0,
      x: laneX,
      y: 4,
      speedFactor: 0.85 + Math.random() * 0.35,
      isHex
    };

    this.state.columns.push(token);
  }

  handleKeyDown(e) {
    if (!this.state.running || this.state.paused) {
      if (e.key === 'Escape' && this.state.running) this.togglePause();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      this.triggerBufferPurge();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      this.togglePause();
      return;
    }

    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;

    const char = e.key;
    this.state.totalKeystrokes++;

    // 1. Locked target
    if (this.state.targetTokenId) {
      const token = this.state.columns.find(t => t.id === this.state.targetTokenId);
      if (token) {
        const expectedChar = token.text[token.typedIndex];
        if (char === expectedChar) {
          this.hitToken(token);
          return;
        } else {
          this.misfire();
          return;
        }
      }
    }

    // 2. Unlocked target: find closest matching token
    const candidate = this.state.columns
      .filter(t => t.text.startsWith(char) && t.typedIndex === 0)
      .sort((a, b) => b.y - a.y)[0];

    if (candidate) {
      this.state.targetTokenId = candidate.id;
      this.hitToken(candidate);
    } else {
      this.misfire();
    }
  }

  hitToken(token) {
    token.typedIndex++;
    this.state.combo++;
    this.state.multiplier = Math.min(8, 1 + Math.floor(this.state.combo / 8));

    sound.playKeyClick(token.text[token.typedIndex - 1]);

    if (token.typedIndex >= token.text.length) {
      this.decryptToken(token);
    }

    this.updateHud();
    this.renderTokensDOM();
  }

  misfire() {
    this.state.totalErrors++;
    this.state.combo = 0;
    this.state.multiplier = 1;
    sound.playShieldAlarm();
    this.updateHud();
  }

  decryptToken(token) {
    this.state.totalHacked++;
    const dataYield = (token.text.length * 32) * this.state.multiplier;
    this.state.score += dataYield;
    this.state.securityBreachPct = Math.min(100, this.state.securityBreachPct + 3);

    sound.playCyberDecrypt();

    this.state.columns = this.state.columns.filter(t => t.id !== token.id);
    if (this.state.targetTokenId === token.id) this.state.targetTokenId = null;

    if (this.state.securityBreachPct >= 100) {
      this.handleMainframeBreached();
    }
  }

  handleFirewallOverheat(token, index) {
    sound.playShieldAlarm();
    this.state.columns.splice(index, 1);
    if (this.state.targetTokenId === token.id) this.state.targetTokenId = null;

    this.state.securityBreachPct = Math.max(0, this.state.securityBreachPct - 12);
    this.updateHud();
  }

  triggerBufferPurge() {
    if (this.state.overclockBombs <= 0) return;
    this.state.overclockBombs--;
    sound.playCyberDecrypt();

    const count = this.state.columns.length;
    this.state.score += count * 250;
    this.state.totalHacked += count;
    this.state.columns = [];
    this.state.targetTokenId = null;

    const arena = this.container.querySelector('#matrix-arena');
    if (arena) {
      arena.classList.add('emp-flash');
      setTimeout(() => arena.classList.remove('emp-flash'), 400);
    }

    this.updateHud();
    this.renderTokensDOM();
  }

  renderMatrixBg() {
    if (!this.matrixCtx || !this.matrixCanvas) return;
    this.matrixCtx.fillStyle = 'rgba(6, 8, 14, 0.12)';
    this.matrixCtx.fillRect(0, 0, this.matrixCanvas.width, this.matrixCanvas.height);

    this.matrixCtx.fillStyle = '#00D4AA';
    this.matrixCtx.font = '13px monospace';

    for (let i = 0; i < this.matrixDrops.length; i++) {
      const char = String.fromCharCode(0x30A0 + Math.random() * 96);
      const x = i * 18;
      const y = this.matrixDrops[i] * 18;

      this.matrixCtx.fillText(char, x, y);

      if (y > this.matrixCanvas.height && Math.random() > 0.975) {
        this.matrixDrops[i] = 0;
      }
      this.matrixDrops[i]++;
    }
  }

  renderTokensDOM() {
    if (!this.tokensLayer) return;

    this.tokensLayer.innerHTML = this.state.columns.map(token => {
      const isLocked = this.state.targetTokenId === token.id;
      const typedPart = token.text.slice(0, token.typedIndex);
      const remainingPart = token.text.slice(token.typedIndex);

      return `
        <div class="matrix-token-pill ${isLocked ? 'target-locked' : ''} ${token.isHex ? 'hex-token' : ''}" style="left: ${token.x}%; top: ${token.y}%;">
          <span class="token-glyph">⚡</span>
          <span class="token-code"><span class="code-typed">${typedPart}</span><span class="code-rem">${remainingPart}</span></span>
        </div>
      `;
    }).join('');
  }

  updateHud() {
    const scoreEl = this.container.querySelector('#matrix-hud-score');
    if (scoreEl) scoreEl.textContent = `${this.state.score.toLocaleString()} KB`;

    const breachEl = this.container.querySelector('#matrix-hud-breach');
    if (breachEl) breachEl.textContent = `${this.state.securityBreachPct}%`;

    const multEl = this.container.querySelector('#matrix-hud-multiplier');
    if (multEl) multEl.textContent = `${this.state.multiplier}x`;

    const comboEl = this.container.querySelector('#matrix-telem-combo');
    if (comboEl) comboEl.textContent = `${this.state.combo}`;

    const hackedEl = this.container.querySelector('#matrix-telem-hacked');
    if (hackedEl) hackedEl.textContent = `${this.state.totalHacked}`;

    const purgeCountEl = this.container.querySelector('#count-matrix-bombs');
    if (purgeCountEl) purgeCountEl.textContent = `${this.state.overclockBombs}`;

    const firewallFill = this.container.querySelector('#matrix-firewall-fill');
    if (firewallFill) firewallFill.style.width = `${this.state.securityBreachPct}%`;
  }

  togglePause() {
    this.state.paused = !this.state.paused;
    const pauseBtn = this.container.querySelector('#matrix-btn-pause');
    if (pauseBtn) pauseBtn.textContent = this.state.paused ? '▶' : '⏸';
  }

  handleMainframeBreached() {
    this.state.running = false;
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.handleKeyDown);

    const accuracy = this.state.totalKeystrokes > 0
      ? Math.round(((this.state.totalKeystrokes - this.state.totalErrors) / this.state.totalKeystrokes) * 100)
      : 100;
    const xpEarned = Math.round(this.state.score / 20) + 200;

    store.recordArcadeResult({
      gameId: 'matrix-rain',
      score: this.state.score,
      wpm: this.state.wpm,
      accuracy,
      xpEarned
    });

    const modal = document.createElement('div');
    modal.className = 'arcade-modal-overlay';
    modal.innerHTML = `
      <div class="arcade-modal-card modal-victory">
        <div class="modal-badge-icon">💻</div>
        <h2 class="modal-title">MAINFRAME COMPROMISED!</h2>
        <p class="modal-subtitle">100% Security Breach &amp; Data Exfiltration Complete</p>

        <div class="arcade-summary-grid">
          <div class="summary-pill">
            <span class="summary-label">DATA EXFILTRATED</span>
            <span class="summary-value hud-glow-cyan">${this.state.score.toLocaleString()} KB</span>
          </div>
          <div class="summary-pill">
            <span class="summary-label">HACK RATE</span>
            <span class="summary-value hud-glow-gold">${this.state.wpm} WPM</span>
          </div>
          <div class="summary-pill">
            <span class="summary-label">ACCURACY</span>
            <span class="summary-value hud-glow-purple">${accuracy}%</span>
          </div>
          <div class="summary-pill">
            <span class="summary-label">TOKENS DECRYPTED</span>
            <span class="summary-value">${this.state.totalHacked}</span>
          </div>
        </div>

        <div class="arcade-reward-banner">
          <span>⚡ +${xpEarned} Bonus XP Earned</span>
        </div>

        <div class="modal-actions">
          <button id="matrix-btn-replay" class="btn btn-primary btn-lg">Hack Again</button>
          <button id="matrix-btn-hub" class="btn btn-secondary btn-lg">Back to Arcade Hub</button>
        </div>
      </div>
    `;

    this.container.appendChild(modal);

    modal.querySelector('#matrix-btn-replay')?.addEventListener('click', () => {
      modal.remove();
      this.mount();
    });

    modal.querySelector('#matrix-btn-hub')?.addEventListener('click', () => {
      modal.remove();
      this.quitGame();
    });
  }

  quitGame() {
    this.state.running = false;
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.onExit();
  }
}

// ==========================================
// 4. KEYBEATS: RHYTHM FLOW ACTION
// ==========================================
export class KeyBeatsGame {
  constructor(container, options = {}) {
    this.container = container;
    this.onExit = options.onExit || (() => {});

    this.state = {
      running: false,
      paused: false,
      score: 0,
      combo: 0,
      maxCombo: 0,
      multiplier: 1,
      feverPct: 0,
      feverActive: false,
      feverTimer: null,
      notes: [],
      totalNotesHit: 0,
      totalKeystrokes: 0,
      totalErrors: 0,
      startTime: 0,
      wpm: 0
    };

    this.animationId = null;
    this.lastFrameTime = performance.now();
    this.spawnTimer = 0;

    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  mount() {
    this.container.innerHTML = `
      <div class="arcade-cabinet rhythm-theme">
        <!-- Rhythm HUD -->
        <div class="arcade-hud rhythm-hud">
          <div class="hud-left">
            <div class="arcade-hud-pill">
              <span class="hud-label">BEAT SCORE</span>
              <span id="rhythm-hud-score" class="hud-value hud-glow-cyan">0</span>
            </div>
            <div class="arcade-hud-pill">
              <span class="hud-label">RHYTHM COMBO</span>
              <span id="rhythm-hud-combo" class="hud-value hud-glow-gold">0</span>
            </div>
            <div class="arcade-hud-pill">
              <span class="hud-label">FEVER MULTIPLIER</span>
              <span id="rhythm-hud-multiplier" class="hud-value hud-glow-purple">1x</span>
            </div>
          </div>

          <div class="hud-center">
            <div class="fever-meter-bar">
              <span class="hud-label" style="margin-right: 6px;">FEVER OVERDRIVE:</span>
              <div class="fever-track">
                <div id="rhythm-fever-fill" class="fever-fill" style="width: 0%;"></div>
              </div>
            </div>
          </div>

          <div class="hud-right">
            <button id="rhythm-btn-pause" class="arcade-control-btn" title="Pause Game (Escape)">⏸</button>
            <button id="rhythm-btn-quit" class="arcade-control-btn" title="Exit to Hub">✕</button>
          </div>
        </div>

        <!-- 4-Lane Rhythm Highway -->
        <div id="rhythm-arena" class="arcade-arena rhythm-arena">
          <div class="rhythm-lanes">
            <div class="rhythm-lane lane-0"></div>
            <div class="rhythm-lane lane-1"></div>
            <div class="rhythm-lane lane-2"></div>
            <div class="rhythm-lane lane-3"></div>
          </div>

          <div id="rhythm-notes-layer" class="rhythm-notes-layer"></div>

          <!-- Target Hit Line -->
          <div class="rhythm-hit-line">
            <div class="hit-indicator"></div>
          </div>

          <!-- Rating Popups Container -->
          <div id="rhythm-rating-popup" class="rhythm-rating-popup" style="display: none;">PERFECT</div>
        </div>

        <!-- Telemetry -->
        <div class="arcade-bottom-telemetry">
          <div class="telemetry-item">
            <span class="telem-label">MAX COMBO</span>
            <span id="rhythm-telem-maxcombo" class="telem-val">0</span>
          </div>
          <div class="telemetry-item">
            <span class="telem-label">BEAT CADENCE</span>
            <span id="rhythm-telem-wpm" class="telem-val">0 WPM</span>
          </div>
          <div class="telemetry-item">
            <span class="telem-label">NOTES STRUCK</span>
            <span id="rhythm-telem-notes" class="telem-val">0</span>
          </div>
        </div>
      </div>
    `;

    this.notesLayer = this.container.querySelector('#rhythm-notes-layer');
    this.ratingPopup = this.container.querySelector('#rhythm-rating-popup');

    window.addEventListener('keydown', this.handleKeyDown);
    this.container.querySelector('#rhythm-btn-pause')?.addEventListener('click', () => this.togglePause());
    this.container.querySelector('#rhythm-btn-quit')?.addEventListener('click', () => this.quitGame());

    this.start();
  }

  start() {
    this.state.running = true;
    this.state.paused = false;
    this.state.score = 0;
    this.state.combo = 0;
    this.state.maxCombo = 0;
    this.state.multiplier = 1;
    this.state.feverPct = 0;
    this.state.feverActive = false;
    this.state.notes = [];
    this.state.totalNotesHit = 0;
    this.state.totalKeystrokes = 0;
    this.state.totalErrors = 0;
    this.state.startTime = performance.now();

    this.updateHud();
    sound.playBeatHit('perfect');

    this.lastFrameTime = performance.now();
    this.loop(this.lastFrameTime);
  }

  loop(currentTime) {
    if (!this.state.running) return;

    const dt = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;

    if (!this.state.paused) {
      this.update(dt);
    }

    this.animationId = requestAnimationFrame(time => this.loop(time));
  }

  update(dt) {
    const elapsedMinutes = (performance.now() - this.state.startTime) / 60000;
    if (elapsedMinutes > 0 && this.state.totalKeystrokes > 0) {
      this.state.wpm = Math.round((this.state.totalKeystrokes / 5) / elapsedMinutes);
      const wpmEl = this.container.querySelector('#rhythm-telem-wpm');
      if (wpmEl) wpmEl.textContent = `${this.state.wpm} WPM`;
    }

    // Spawn notes down lanes
    this.spawnTimer += dt;
    if (this.spawnTimer >= 1.2) {
      this.spawnTimer = 0;
      this.spawnRhythmNote();
    }

    // Move notes down
    const speed = 28;
    for (let i = this.state.notes.length - 1; i >= 0; i--) {
      const note = this.state.notes[i];
      note.y += speed * dt;

      // Note missed past hit line (y > 88)
      if (note.y > 90) {
        this.handleMiss(note, i);
      }
    }

    this.renderNotesDOM();
  }

  spawnRhythmNote() {
    const word = RHYTHM_BEAT_WORDS[Math.floor(Math.random() * RHYTHM_BEAT_WORDS.length)];
    const lane = Math.floor(Math.random() * 4); // 0, 1, 2, 3
    const laneX = [16, 38, 62, 84][lane];

    const note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      word,
      typedIndex: 0,
      lane,
      x: laneX,
      y: 0
    };

    this.state.notes.push(note);
  }

  handleKeyDown(e) {
    if (!this.state.running || this.state.paused) {
      if (e.key === 'Escape' && this.state.running) this.togglePause();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      this.togglePause();
      return;
    }

    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;

    const char = e.key;
    this.state.totalKeystrokes++;

    // Find notes near hit line (y between 40 and 88)
    const candidates = this.state.notes
      .filter(n => n.y >= 35 && n.y <= 88)
      .sort((a, b) => b.y - a.y); // closest to hit line first

    let matchedNote = null;
    for (const note of candidates) {
      if (note.word[note.typedIndex] === char) {
        matchedNote = note;
        break;
      }
    }

    if (matchedNote) {
      matchedNote.typedIndex++;
      sound.playKeyClick(char);

      if (matchedNote.typedIndex >= matchedNote.word.length) {
        this.hitCompleteNote(matchedNote);
      }
    } else {
      this.state.totalErrors++;
      this.state.combo = 0;
      this.state.multiplier = 1;
      sound.playShieldAlarm();
      this.showRating('MISS', '#FF5C7A');
    }

    this.updateHud();
    this.renderNotesDOM();
  }

  hitCompleteNote(note) {
    this.state.totalNotesHit++;
    this.state.combo++;
    this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);

    // Accuracy rating based on y distance to hit line (target y = 78)
    const dist = Math.abs(note.y - 78);
    let rating = 'PERFECT';
    let pts = 500;
    let color = '#00D4AA';

    if (dist <= 8) {
      rating = 'PERFECT';
      pts = 500;
      color = '#00D4AA';
      this.state.feverPct = Math.min(100, this.state.feverPct + 12);
    } else if (dist <= 16) {
      rating = 'GREAT';
      pts = 300;
      color = '#FFD166';
      this.state.feverPct = Math.min(100, this.state.feverPct + 8);
    } else {
      rating = 'GOOD';
      pts = 150;
      color = '#A78BFA';
      this.state.feverPct = Math.min(100, this.state.feverPct + 4);
    }

    sound.playBeatHit(rating.toLowerCase());
    this.showRating(rating, color);

    const mult = this.state.feverActive ? 4 : (1 + Math.floor(this.state.combo / 10));
    this.state.score += pts * mult;

    // Check Fever activation
    if (this.state.feverPct >= 100 && !this.state.feverActive) {
      this.activateFeverMode();
    }

    this.state.notes = this.state.notes.filter(n => n.id !== note.id);
  }

  handleMiss(note, index) {
    this.state.notes.splice(index, 1);
    this.state.combo = 0;
    this.state.multiplier = 1;
    sound.playShieldAlarm();
    this.showRating('MISS', '#FF5C7A');
    this.updateHud();
  }

  activateFeverMode() {
    this.state.feverActive = true;
    this.state.multiplier = 4;
    sound.playFeverActive();

    const arena = this.container.querySelector('#rhythm-arena');
    if (arena) arena.classList.add('fever-overdrive');

    clearTimeout(this.state.feverTimer);
    this.state.feverTimer = setTimeout(() => {
      this.state.feverActive = false;
      this.state.feverPct = 0;
      if (arena) arena.classList.remove('fever-overdrive');
      this.updateHud();
    }, 8000);

    this.updateHud();
  }

  showRating(text, color) {
    if (!this.ratingPopup) return;
    this.ratingPopup.textContent = text;
    this.ratingPopup.style.color = color;
    this.ratingPopup.style.display = 'block';

    this.ratingPopup.classList.remove('rating-anim');
    void this.ratingPopup.offsetWidth; // trigger reflow
    this.ratingPopup.classList.add('rating-anim');
  }

  renderNotesDOM() {
    if (!this.notesLayer) return;

    this.notesLayer.innerHTML = this.state.notes.map(note => {
      const typedPart = note.word.slice(0, note.typedIndex);
      const remainingPart = note.word.slice(note.typedIndex);

      return `
        <div class="rhythm-note-pill lane-${note.lane}" style="left: ${note.x}%; top: ${note.y}%;">
          <span class="note-typed">${typedPart}</span><span class="note-rem">${remainingPart}</span>
        </div>
      `;
    }).join('');
  }

  updateHud() {
    const scoreEl = this.container.querySelector('#rhythm-hud-score');
    if (scoreEl) scoreEl.textContent = this.state.score.toLocaleString();

    const comboEl = this.container.querySelector('#rhythm-hud-combo');
    if (comboEl) comboEl.textContent = `${this.state.combo}`;

    const multEl = this.container.querySelector('#rhythm-hud-multiplier');
    if (multEl) multEl.textContent = `${this.state.multiplier}x`;

    const maxComboEl = this.container.querySelector('#rhythm-telem-maxcombo');
    if (maxComboEl) maxComboEl.textContent = `${this.state.maxCombo}`;

    const notesCountEl = this.container.querySelector('#rhythm-telem-notes');
    if (notesCountEl) notesCountEl.textContent = `${this.state.totalNotesHit}`;

    const feverFill = this.container.querySelector('#rhythm-fever-fill');
    if (feverFill) feverFill.style.width = `${this.state.feverPct}%`;
  }

  togglePause() {
    this.state.paused = !this.state.paused;
    const pauseBtn = this.container.querySelector('#rhythm-btn-pause');
    if (pauseBtn) pauseBtn.textContent = this.state.paused ? '▶' : '⏸';
  }

  quitGame() {
    this.state.running = false;
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.handleKeyDown);

    const accuracy = this.state.totalKeystrokes > 0
      ? Math.round(((this.state.totalKeystrokes - this.state.totalErrors) / this.state.totalKeystrokes) * 100)
      : 100;
    const xpEarned = Math.round(this.state.score / 25) + 50;

    store.recordArcadeResult({
      gameId: 'key-beats',
      score: this.state.score,
      wpm: this.state.wpm,
      accuracy,
      xpEarned
    });

    this.onExit();
  }
}

// ==========================================
// 5. ARCADE HUB MANAGER (Lobby & Game Selector)
// ==========================================
export class ArcadeHubManager {
  constructor(container, uiManager) {
    this.container = container;
    this.ui = uiManager;
    this.activeGame = null;
  }

  renderLobby() {
    const state = store.getState();
    const stats = state.arcadeStats || {
      invadersHighScore: 0,
      invadersMaxWave: 1,
      nitroBestWpm: 0,
      matrixHighScore: 0,
      rhythmHighScore: 0,
      totalGamesPlayed: 0
    };

    this.container.innerHTML = `
      <div class="arcade-lobby">
        <div class="arcade-lobby-header">
          <div class="arcade-badge-chip">🕹️ 4-GAME ARCADE ARENA</div>
          <h1 class="arcade-lobby-title">Master Speed, Accuracy &amp; Rhythm</h1>
          <p class="arcade-lobby-subtitle">
            Four gamified typing test modes designed to build rapid finger cadence, burst velocity, code syntax reflexes, and metronome endurance.
          </p>
        </div>

        <!-- Arcade Hall of Fame Stats Banner -->
        <div class="arcade-hall-of-fame">
          <div class="hof-stat-card">
            <div class="hof-stat-icon">👾</div>
            <div class="hof-stat-info">
              <span class="hof-stat-label">TYPE INVADERS</span>
              <span class="hof-stat-value">${(stats.invadersHighScore || 0).toLocaleString()} PTS</span>
            </div>
          </div>
          <div class="hof-stat-card">
            <div class="hof-stat-icon">🏎️</div>
            <div class="hof-stat-info">
              <span class="hof-stat-label">NITRO DRAG TOP SPEED</span>
              <span class="hof-stat-value">${stats.nitroBestWpm || 0} WPM</span>
            </div>
          </div>
          <div class="hof-stat-card">
            <div class="hof-stat-icon">💻</div>
            <div class="hof-stat-info">
              <span class="hof-stat-label">MATRIX TERMINAL HACK</span>
              <span class="hof-stat-value">${(stats.matrixHighScore || 0).toLocaleString()} KB</span>
            </div>
          </div>
          <div class="hof-stat-card">
            <div class="hof-stat-icon">🎵</div>
            <div class="hof-stat-info">
              <span class="hof-stat-label">KEYBEATS RHYTHM</span>
              <span class="hof-stat-value">${(stats.rhythmHighScore || 0).toLocaleString()} PTS</span>
            </div>
          </div>
        </div>

        <!-- 4 Game Selection Grid -->
        <div class="arcade-game-grid">
          <!-- Game 1: Type Invaders -->
          <div class="arcade-game-card">
            <div class="game-card-banner banner-invaders">
              <span class="game-banner-badge">ACTION DEFENSE</span>
              <span class="game-banner-icon">🚀</span>
            </div>
            <div class="game-card-body">
              <h2 class="game-card-title">Type Invaders: Orbit Defense</h2>
              <p class="game-card-desc">
                Defend Earth against descending word-vessels and meteors. Features laser lock-on, EMP shockwaves, Cryo time freeze, and multi-phase Mothership Boss battles.
              </p>
              
              <div class="game-features-pills">
                <span class="feature-tag">⚡ 7 Waves + Boss</span>
                <span class="feature-tag">🛡️ Shield Defense</span>
                <span class="feature-tag">❄️ Power-Ups</span>
              </div>

              <div class="game-difficulty-select">
                <label>Difficulty:</label>
                <div class="difficulty-toggles">
                  <button class="diff-btn active" data-diff="cadet">Cadet (30+ WPM)</button>
                  <button class="diff-btn" data-diff="ace">Ace (50+ WPM)</button>
                  <button class="diff-btn" data-diff="hyperdrive">Hyper (80+ WPM)</button>
                </div>
              </div>

              <button id="btn-launch-invaders" class="btn btn-primary btn-lg arcade-launch-btn">
                Launch Orbit Defense
              </button>
            </div>
          </div>

          <!-- Game 2: Nitro Sprint -->
          <div class="arcade-game-card">
            <div class="game-card-banner banner-nitro">
              <span class="game-banner-badge">SPEED TRIAL</span>
              <span class="game-banner-icon">🏎️</span>
            </div>
            <div class="game-card-body">
              <h2 class="game-card-title">Nitro Sprint: 60s Drag Race</h2>
              <p class="game-card-desc">
                An adrenaline-fueled speed trial against time. Watch the analog speedometer rev up as you type, and trigger Nitro turbo boosts on flawless combo streaks.
              </p>

              <div class="game-features-pills">
                <span class="feature-tag">⏱️ 60-Second Trial</span>
                <span class="feature-tag">🔥 Nitro Turbo</span>
                <span class="feature-tag">🏎️ Live Speedometer</span>
              </div>

              <div style="flex: 1;"></div>

              <button id="btn-launch-nitro" class="btn btn-secondary btn-lg arcade-launch-btn" style="margin-top: 24px;">
                Start 60s Drag Race
              </button>
            </div>
          </div>

          <!-- Game 3: Matrix Rain -->
          <div class="arcade-game-card">
            <div class="game-card-banner banner-matrix">
              <span class="game-banner-badge">SYNTAX HACK</span>
              <span class="game-banner-icon">💻</span>
            </div>
            <div class="game-card-body">
              <h2 class="game-card-title">Matrix Rain: Code Breaker</h2>
              <p class="game-card-desc">
                Infiltrate the cyber mainframe. Decrypt cascading streams of JavaScript keywords, hex numbers, and code tokens before the firewall overheats.
              </p>

              <div class="game-features-pills">
                <span class="feature-tag">🟢 Digital Rain Canvas</span>
                <span class="feature-tag">⚡ Buffer Purge</span>
                <span class="feature-tag">💻 Code Syntax</span>
              </div>

              <div style="flex: 1;"></div>

              <button id="btn-launch-matrix" class="btn btn-primary btn-lg arcade-launch-btn" style="margin-top: 24px; background: #00D4AA; border-color: #00D4AA;">
                Infiltrate Mainframe
              </button>
            </div>
          </div>

          <!-- Game 4: KeyBeats -->
          <div class="arcade-game-card">
            <div class="game-card-banner banner-rhythm">
              <span class="game-banner-badge">RHYTHM ACTION</span>
              <span class="game-banner-icon">🎵</span>
            </div>
            <div class="game-card-body">
              <h2 class="game-card-title">KeyBeats: Rhythm Flow</h2>
              <p class="game-card-desc">
                4-Lane rhythm typing game. Strike words precisely as they cross the neon hit line to build your Fever Overdrive and master steady metronome cadence.
              </p>

              <div class="game-features-pills">
                <span class="feature-tag">🎵 4-Lane Highway</span>
                <span class="feature-tag">✨ Fever Overdrive</span>
                <span class="feature-tag">🎯 Precision Timing</span>
              </div>

              <div style="flex: 1;"></div>

              <button id="btn-launch-rhythm" class="btn btn-secondary btn-lg arcade-launch-btn" style="margin-top: 24px;">
                Start Rhythm Flow
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Wire Difficulty Selector
    let selectedDifficulty = 'cadet';
    this.container.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedDifficulty = btn.dataset.diff;
      });
    });

    // Wire Launch Buttons
    this.container.querySelector('#btn-launch-invaders')?.addEventListener('click', () => {
      this.launchTypeInvaders(selectedDifficulty);
    });

    this.container.querySelector('#btn-launch-nitro')?.addEventListener('click', () => {
      this.launchNitroSprint();
    });

    this.container.querySelector('#btn-launch-matrix')?.addEventListener('click', () => {
      this.launchMatrixRain();
    });

    this.container.querySelector('#btn-launch-rhythm')?.addEventListener('click', () => {
      this.launchKeyBeats();
    });
  }

  launchTypeInvaders(difficulty = 'cadet') {
    this.activeGame = new TypeInvadersGame(this.container, {
      difficulty,
      onExit: () => this.renderLobby()
    });
    this.activeGame.mount();
  }

  launchNitroSprint() {
    this.activeGame = new NitroSprintGame(this.container, {
      durationSec: 60,
      onExit: () => this.renderLobby()
    });
    this.activeGame.mount();
  }

  launchMatrixRain() {
    this.activeGame = new MatrixRainGame(this.container, {
      onExit: () => this.renderLobby()
    });
    this.activeGame.mount();
  }

  launchKeyBeats() {
    this.activeGame = new KeyBeatsGame(this.container, {
      onExit: () => this.renderLobby()
    });
    this.activeGame.mount();
  }
}
