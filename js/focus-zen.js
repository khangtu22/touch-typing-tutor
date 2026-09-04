/**
 * Focus Mode & Zen Mode Manager
 * Focus Mode: minimal UI overlay hiding non-essential elements
 * Zen Mode: fullscreen ambient environment with procedural soundscapes
 */
import { store } from './state.js';
import { sound } from './sound-engine.js';

// ─────────────────────────────────────────────────────────────────────────────
// ZenSoundEngine — All audio generated procedurally via Web Audio API.
// No external audio files are loaded.
// ─────────────────────────────────────────────────────────────────────────────

class ZenSoundEngine {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    /** @type {GainNode|null} */
    this.gainNode = null;
    /** @type {string|null} */
    this.currentSoundscape = null;

    // Holds all active audio nodes so they can be fully torn down on stop()
    this._activeNodes = [];
    // requestAnimationFrame handle for LFO-style JS modulation loops
    this._rafHandle = null;
    // setInterval / setTimeout handles for periodic triggers (birds, etc.)
    this._intervalHandles = [];
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Initialise (or reuse) an AudioContext, sharing with the main sound engine
   * when possible so we stay within browser limits.
   */
  init() {
    if (this.ctx && this.ctx.state !== 'closed') return;

    // Prefer the main engine's context if it already exists and is alive
    if (sound && sound.ctx && sound.ctx.state !== 'closed') {
      this.ctx = sound.ctx;
    } else {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }

    // Resume if suspended (browsers require user gesture before audio)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    // Master gain for this engine so volume can be adjusted independently
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.45;
    this.gainNode.connect(this.ctx.destination);
  }

  /**
   * Smoothly fade in ambient volume.
   * @param {number} [duration=0.35]
   */
  fadeIn(duration = 0.35) {
    if (this.gainNode && this.ctx && this.ctx.state !== 'closed') {
      try {
        const now = this.ctx.currentTime;
        const target = this._targetVolume !== undefined ? this._targetVolume : 0.45;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(0.001, now);
        this.gainNode.gain.linearRampToValueAtTime(target, now + duration);
      } catch (_) {}
    }
  }

  /**
   * Smoothly fade out ambient volume before stopping.
   * @param {number} [duration=0.25]
   */
  fadeOut(duration = 0.25) {
    if (this.gainNode && this.ctx && this.ctx.state !== 'closed') {
      try {
        const now = this.ctx.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
        this.gainNode.gain.linearRampToValueAtTime(0.001, now + duration);
        setTimeout(() => this.stop(), duration * 1000 + 30);
        return;
      } catch (_) {}
    }
    this.stop();
  }

  /**
   * Start one of the five built-in soundscapes.
   * @param {'rain'|'forest'|'lofi'|'whitenoise'|'ocean'} soundscape
   */
  play(soundscape) {
    this.init();
    this.stop(); // tear down any previous soundscape first

    this.currentSoundscape = soundscape;

    switch (soundscape) {
      case 'rain':       this._startRain();       break;
      case 'forest':     this._startForest();     break;
      case 'lofi':       this._startLofi();       break;
      case 'whitenoise': this._startWhiteNoise(); break;
      case 'ocean':      this._startOcean();      break;
      default:
        console.warn(`ZenSoundEngine: unknown soundscape "${soundscape}"`);
    }

    this.fadeIn(0.4);
  }

  /** Stop all active audio nodes and cancel any pending modulation loops. */
  stop() {
    // Cancel JS-based loops
    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }

    // Clear all scheduled timeouts/intervals
    this._intervalHandles.forEach(handle => {
      if (handle && handle._isBirdTimeout) {
        clearTimeout(handle._id);
      } else {
        clearInterval(handle);
      }
    });
    this._intervalHandles = [];

    // Disconnect & stop every node we created
    this._activeNodes.forEach(node => {
      try { node.stop && node.stop(); } catch (_) { /* already stopped */ }
      try { node.disconnect(); } catch (_) {}
    });
    this._activeNodes = [];

    this.currentSoundscape = null;
  }

  /**
   * Set the master output volume for the zen sound engine.
   * @param {number} v - 0.0 to 1.0
   */
  setVolume(v) {
    const vol = Math.max(0, Math.min(1, v));
    this._targetVolume = vol;
    if (this.gainNode && this.ctx && this.ctx.state !== 'closed') {
      try {
        const now = this.ctx.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
        this.gainNode.gain.linearRampToValueAtTime(vol, now + 0.05);
      } catch (_) {}
    }
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  /** Register a node so stop() can clean it up. */
  _track(node) {
    this._activeNodes.push(node);
    return node;
  }

  /**
   * Create a noise-filled AudioBuffer (white or pink).
   * @param {'white'|'pink'} type
   * @returns {AudioBuffer}
   */
  _createNoiseBuffer(type = 'white') {
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 4; // 4-second loop
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else {
      // Pink noise via Paul Kellett's algorithm (accurate 1/f spectrum)
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  /** Convenience: create and start a looping noise source. */
  _makeNoiseSource(type = 'white') {
    const source = this.ctx.createBufferSource();
    source.buffer = this._createNoiseBuffer(type);
    source.loop = true;
    return this._track(source);
  }

  // ── Soundscape: Rain ──────────────────────────────────────────────────────
  // Pink noise through a bandpass cluster with random amplitude modulation
  _startRain() {
    const ctx = this.ctx;

    // Layer 1: heavy rain body — pink noise through a low-mid bandpass
    const src1 = this._makeNoiseSource('pink');
    const bp1 = this._track(ctx.createBiquadFilter());
    bp1.type = 'bandpass';
    bp1.frequency.value = 1000;
    bp1.Q.value = 0.3;

    // Layer 2: drip-like high sparkle — pink noise through a high bandpass
    const src2 = this._makeNoiseSource('pink');
    const bp2 = this._track(ctx.createBiquadFilter());
    bp2.type = 'bandpass';
    bp2.frequency.value = 3500;
    bp2.Q.value = 1.2;

    // Layer 3: distant thunder rumble — pink noise through a lowpass
    const src3 = this._makeNoiseSource('pink');
    const lp = this._track(ctx.createBiquadFilter());
    lp.type = 'lowpass';
    lp.frequency.value = 180;

    // Amplitude modulation gate: slow random gusts
    const modGain = this._track(ctx.createGain());
    modGain.gain.value = 0.8;

    src1.connect(bp1); bp1.connect(modGain);
    src2.connect(bp2); bp2.connect(modGain);
    src3.connect(lp);  lp.connect(modGain);
    modGain.connect(this.gainNode);

    src1.start(); src2.start(); src3.start();

    // JS-based amplitude flutter — random gusts every 2-6 seconds
    let lastGustTime = ctx.currentTime;
    const flicker = () => {
      if (this.currentSoundscape !== 'rain') return;
      const now = ctx.currentTime;
      if (now - lastGustTime > (2 + Math.random() * 4)) {
        const targetGain = 0.5 + Math.random() * 0.5;
        modGain.gain.setTargetAtTime(targetGain, now, 0.8 + Math.random() * 1.5);
        lastGustTime = now;
      }
      this._rafHandle = requestAnimationFrame(flicker);
    };
    this._rafHandle = requestAnimationFrame(flicker);
  }

  // ── Soundscape: Forest ────────────────────────────────────────────────────
  // Sub-bass rumble + randomly triggered chirp tones simulating birds
  _startForest() {
    const ctx = this.ctx;

    // Continuous low-frequency "earth hum" — filtered pink noise
    const hum = this._makeNoiseSource('pink');
    const lp = this._track(ctx.createBiquadFilter());
    lp.type = 'lowpass';
    lp.frequency.value = 200;
    const humGain = this._track(ctx.createGain());
    humGain.gain.value = 0.6;
    hum.connect(lp); lp.connect(humGain); humGain.connect(this.gainNode);
    hum.start();

    // Gentle wind layer
    const wind = this._makeNoiseSource('pink');
    const windBp = this._track(ctx.createBiquadFilter());
    windBp.type = 'bandpass';
    windBp.frequency.value = 600;
    windBp.Q.value = 0.4;
    const windGain = this._track(ctx.createGain());
    windGain.gain.value = 0.25;
    wind.connect(windBp); windBp.connect(windGain); windGain.connect(this.gainNode);
    wind.start();

    // Periodic bird chirps — random sine bursts at bird-like frequencies
    const chirp = () => {
      if (!this.ctx || this.ctx.state === 'closed') return;
      if (this.currentSoundscape !== 'forest') return;

      const freq = 1800 + Math.random() * 2400; // 1.8–4.2 kHz
      const osc = this._track(ctx.createOscillator());
      const env = this._track(ctx.createGain());

      osc.type = 'sine';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, ctx.currentTime);
      env.gain.linearRampToValueAtTime(0.15 + Math.random() * 0.1, ctx.currentTime + 0.02);

      // Chirp pitch slide
      const duration = 0.08 + Math.random() * 0.15;
      osc.frequency.setTargetAtTime(
        freq * (0.8 + Math.random() * 0.4),
        ctx.currentTime + 0.02,
        0.04
      );
      env.gain.setTargetAtTime(0, ctx.currentTime + duration, 0.03);

      osc.connect(env); env.connect(this.gainNode);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.1);

      // Some birds chirp a second note
      if (Math.random() > 0.5) {
        const delay = 120 + Math.random() * 100;
        const tid = setTimeout(() => {
          if (this.currentSoundscape !== 'forest') return;
          const osc2 = this._track(ctx.createOscillator());
          const env2 = this._track(ctx.createGain());
          osc2.type = 'sine';
          osc2.frequency.value = freq * (0.9 + Math.random() * 0.25);
          env2.gain.setValueAtTime(0, ctx.currentTime);
          env2.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.015);
          env2.gain.setTargetAtTime(0, ctx.currentTime + 0.08, 0.025);
          osc2.connect(env2); env2.connect(this.gainNode);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.2);
        }, delay);
        this._intervalHandles.push({ _isBirdTimeout: true, _id: tid });
      }
    };

    // Schedule bird calls at random intervals (3–12 seconds)
    const scheduleBird = () => {
      if (this.currentSoundscape !== 'forest') return;
      chirp();
      const delay = 3000 + Math.random() * 9000;
      const tid = setTimeout(scheduleBird, delay);
      this._intervalHandles.push({ _isBirdTimeout: true, _id: tid });
    };
    scheduleBird();
  }

  // ── Soundscape: Lo-fi ─────────────────────────────────────────────────────
  // Repeating C-major chord (C4-E4-G4) with slow attack/release and slight detune
  _startLofi() {
    const ctx = this.ctx;

    // C major chord frequencies (C4, E4, G4, C5) for richness
    const notes  = [261.63, 329.63, 392.00, 523.25];
    const detune = [-8, 4, -3, 6]; // slight per-voice detuning for warmth

    // Vinyl crackle layer — white noise heavily lowpassed
    const crackle = this._makeNoiseSource('white');
    const crackleFilter = this._track(ctx.createBiquadFilter());
    crackleFilter.type = 'lowpass';
    crackleFilter.frequency.value = 3000;
    const crackleGain = this._track(ctx.createGain());
    crackleGain.gain.value = 0.04;
    crackle.connect(crackleFilter);
    crackleFilter.connect(crackleGain);
    crackleGain.connect(this.gainNode);
    crackle.start();

    // Chord engine: attack → sustain → release → repeat (4-second cycle)
    const chordDuration = 4.0;
    const attackTime    = 0.5;
    const releaseTime   = 1.2;
    const sustainLevel  = 0.18;

    const playChord = (startTime) => {
      notes.forEach((freq, i) => {
        // Dual oscillators per note (sawtooth + triangle) for lo-fi texture
        ['sawtooth', 'triangle'].forEach((type, j) => {
          const osc = this._track(ctx.createOscillator());
          const env = this._track(ctx.createGain());
          const lpf = this._track(ctx.createBiquadFilter());

          osc.type = type;
          osc.frequency.value = freq;
          osc.detune.value = detune[i] + (j === 1 ? 12 : 0);

          // Warm lowpass — characteristic lo-fi rolloff
          lpf.type = 'lowpass';
          lpf.frequency.value = 2200 + Math.random() * 500;
          lpf.Q.value = 0.7;

          const vol = sustainLevel * (j === 0 ? 1 : 0.45);
          env.gain.setValueAtTime(0, startTime);
          env.gain.linearRampToValueAtTime(vol, startTime + attackTime);
          env.gain.setValueAtTime(vol, startTime + chordDuration - releaseTime);
          env.gain.linearRampToValueAtTime(0, startTime + chordDuration);

          osc.connect(lpf); lpf.connect(env); env.connect(this.gainNode);
          osc.start(startTime);
          osc.stop(startTime + chordDuration + 0.05);
        });
      });
    };

    // Seed the first 3 chords immediately, then schedule ahead via rAF
    const scheduleChords = () => {
      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        playChord(now + i * chordDuration);
      }
      let nextStart = now + 3 * chordDuration;

      const tick = () => {
        if (this.currentSoundscape !== 'lofi') return;
        const t = ctx.currentTime;
        if (t >= nextStart - chordDuration) {
          playChord(nextStart);
          nextStart += chordDuration;
        }
        this._rafHandle = requestAnimationFrame(tick);
      };
      this._rafHandle = requestAnimationFrame(tick);
    };

    scheduleChords();
  }

  // ── Soundscape: White Noise ───────────────────────────────────────────────
  // Pure white noise through a highpass filter — clean, focused hiss
  _startWhiteNoise() {
    const ctx = this.ctx;

    const src = this._makeNoiseSource('white');

    // Highpass: cut the muddier lows, leave a clean airy hiss
    const hp = this._track(ctx.createBiquadFilter());
    hp.type = 'highpass';
    hp.frequency.value = 400;
    hp.Q.value = 0.5;

    // High-shelf to prevent harshness in the very high frequencies
    const shelf = this._track(ctx.createBiquadFilter());
    shelf.type = 'highshelf';
    shelf.frequency.value = 8000;
    shelf.gain.value = -6;

    src.connect(hp); hp.connect(shelf); shelf.connect(this.gainNode);
    src.start();
  }

  // ── Soundscape: Ocean ────────────────────────────────────────────────────
  // Low-frequency oscillator with slow LFO shaping gain for wave-like crests
  _startOcean() {
    const ctx = this.ctx;

    // ── Primary wave: low bandpass pink noise, slow LFO (0.12 Hz ≈ 8s cycle)
    const src1 = this._makeNoiseSource('pink');
    const bp1  = this._track(ctx.createBiquadFilter());
    bp1.type = 'bandpass';
    bp1.frequency.value = 400;
    bp1.Q.value = 0.25;

    const lfo1     = this._track(ctx.createOscillator());
    const lfoGain1 = this._track(ctx.createGain());
    const waveGain1 = this._track(ctx.createGain());
    lfo1.type = 'sine';
    lfo1.frequency.value = 0.12;
    lfoGain1.gain.value  = 0.45; // LFO depth
    waveGain1.gain.value = 0.5;  // DC offset (centre of modulation)

    // ── Secondary ripple: higher bandpass, offset LFO for polyrhythmic feel
    const src2  = this._makeNoiseSource('pink');
    const bp2   = this._track(ctx.createBiquadFilter());
    bp2.type = 'bandpass';
    bp2.frequency.value = 1200;
    bp2.Q.value = 0.6;

    const lfo2      = this._track(ctx.createOscillator());
    const lfoGain2  = this._track(ctx.createGain());
    const waveGain2 = this._track(ctx.createGain());
    lfo2.type = 'sine';
    lfo2.frequency.value = 0.19;
    lfoGain2.gain.value  = 0.15;
    waveGain2.gain.value = 0.2;

    // Routing: noise → bandpass → wave gain (modulated by LFO) → master
    src1.connect(bp1);    bp1.connect(waveGain1);
    lfo1.connect(lfoGain1); lfoGain1.connect(waveGain1.gain);

    src2.connect(bp2);    bp2.connect(waveGain2);
    lfo2.connect(lfoGain2); lfoGain2.connect(waveGain2.gain);

    waveGain1.connect(this.gainNode);
    waveGain2.connect(this.gainNode);

    src1.start(); src2.start();
    lfo1.start(); lfo2.start();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FocusModeManager — Minimal distraction-free overlay
// ─────────────────────────────────────────────────────────────────────────────

class FocusModeManager {
  constructor() {
    /** @type {boolean} */
    this.isActive = false;
    /** @type {HTMLElement|null} */
    this._overlay = null;
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  /** Enter focus mode: hide chrome, add body class, show exit badge. */
  enter() {
    if (this.isActive) return;
    this.isActive = true;

    document.body.classList.add('focus-mode-active');

    // Build minimal exit-hint glassmorphic badge
    const badge = document.createElement('div');
    badge.id = 'focus-mode-badge';
    badge.setAttribute('aria-label', 'Press Escape to exit Focus Mode');
    badge.style.cssText = [
      'position:fixed',
      'top:14px',
      'right:18px',
      'z-index:9000',
      'padding:6px 13px',
      'background:rgba(255,255,255,0.07)',
      'backdrop-filter:blur(12px)',
      '-webkit-backdrop-filter:blur(12px)',
      'border:1px solid rgba(255,255,255,0.12)',
      'border-radius:20px',
      'color:rgba(255,255,255,0.55)',
      'font-size:12px',
      'font-family:inherit',
      'letter-spacing:0.04em',
      'cursor:pointer',
      'user-select:none',
      'transition:opacity 0.25s',
      'opacity:0.6',
    ].join(';');
    badge.textContent = 'Esc to exit';
    badge.addEventListener('click', () => this.exit());
    badge.addEventListener('mouseenter', () => { badge.style.opacity = '1'; });
    badge.addEventListener('mouseleave', () => { badge.style.opacity = '0.6'; });

    document.body.appendChild(badge);
    this._overlay = badge;

    document.addEventListener('keydown', this._onKeyDown);
    document.dispatchEvent(new CustomEvent('focusModeEnter', { bubbles: true }));
  }

  /** Exit focus mode: restore chrome, remove badge. */
  exit() {
    if (!this.isActive) return;
    this.isActive = false;

    document.body.classList.remove('focus-mode-active');

    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    }

    document.removeEventListener('keydown', this._onKeyDown);
    document.dispatchEvent(new CustomEvent('focusModeExit', { bubbles: true }));
  }

  /** Toggle between focus and normal mode. */
  toggle() {
    this.isActive ? this.exit() : this.enter();
  }

  /** @private */
  _onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.exit();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ZenModeManager — Ultra-Smooth Fullscreen Ambient Typing Environment
// ─────────────────────────────────────────────────────────────────────────────

class ZenModeManager {
  constructor() {
    /** @type {boolean} */
    this.isActive = false;
    /** @type {ZenSoundEngine} */
    this.zenSoundEngine = new ZenSoundEngine();
    /** @type {HTMLElement|null} */
    this._overlay = null;
    /** @type {number|null} RAF handle for particles */
    this._particleRaf = null;
    /** @type {Function|null} Forwarded typing callback */
    this._onType = null;
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Enter Zen Mode with smooth, zero-latency transition.
   * @param {Function} [onType] - Called with every KeyboardEvent
   * @param {object} [options] - Metadata { title, author }
   */
  enter(onType = null, options = {}) {
    if (this.isActive) return;
    this.isActive = true;
    this._onType = onType;

    const overlay = this._buildOverlay(options);
    document.body.appendChild(overlay);
    this._overlay = overlay;

    // Trigger smooth fade-in and scale-in via next frame
    requestAnimationFrame(() => {
      if (overlay) {
        overlay.classList.add('zen-overlay-active');
        overlay.focus();
      }
    });

    document.addEventListener('keydown', this._onKeyDown, true);
    document.dispatchEvent(new CustomEvent('zenModeEnter', { bubbles: true }));

    // Start high-efficiency particle canvas
    const canvas = overlay.querySelector('canvas.zen-particles');
    if (canvas) this.startParticles(canvas);
  }

  /** Exit Zen Mode: smooth CSS fade out, audio fade out, cleanup overlay. */
  exit() {
    if (!this.isActive) return;
    this.isActive = false;
    this._onType = null;

    // Stop particle loop
    if (this._particleRaf !== null) {
      cancelAnimationFrame(this._particleRaf);
      this._particleRaf = null;
    }

    // Smooth audio fade out
    this.zenSoundEngine.fadeOut(0.2);

    document.removeEventListener('keydown', this._onKeyDown, true);

    if (this._overlay) {
      const overlay = this._overlay;
      this._overlay = null;
      overlay.classList.remove('zen-overlay-active');
      overlay.classList.add('zen-overlay-leaving');
      setTimeout(() => {
        overlay.remove();
      }, 200);
    }

    document.dispatchEvent(new CustomEvent('zenModeExit', { bubbles: true }));
  }

  /**
   * Toggle Zen Mode.
   * @param {Function} [onType]
   */
  toggle(onType = null) {
    this.isActive ? this.exit() : this.enter(onType);
  }

  /**
   * Render the current typing tokens in the zen typing area with live stats.
   * @param {string} html
   * @param {object} [meta] - { wpm, accuracy, progressPct, combo, title, author }
   */
  renderText(html, meta = {}) {
    if (!this._overlay) return;
    const content = this._overlay.querySelector('.zen-typing-content');
    if (content) {
      content.innerHTML = html;
    }

    if (meta.title || meta.author) {
      const titleEl = this._overlay.querySelector('.zen-meta-title');
      if (titleEl) {
        titleEl.textContent = meta.author ? `Zen Sanctuary • ${meta.author}` : (meta.title || 'Zen Sanctuary');
      }
    }

    if (meta.wpm !== undefined) {
      const wpmEl = this._overlay.querySelector('.zen-live-wpm');
      if (wpmEl) wpmEl.textContent = `${Math.round(meta.wpm)}`;
    }

    if (meta.accuracy !== undefined) {
      const accEl = this._overlay.querySelector('.zen-live-acc');
      if (accEl) accEl.textContent = `${Math.round(meta.accuracy)}%`;
    }

    if (meta.progressPct !== undefined) {
      const fillEl = this._overlay.querySelector('.zen-top-progress-fill');
      if (fillEl) fillEl.style.width = `${Math.min(100, Math.max(0, meta.progressPct))}%`;
    }
  }

  /**
   * Trigger error shake on current character.
   */
  triggerError() {
    if (!this._overlay) return;
    const currentCharEl = this._overlay.querySelector('.char-current, .char-incorrect');
    if (currentCharEl) {
      currentCharEl.classList.remove('char-error-shake');
      void currentCharEl.offsetWidth; // trigger reflow
      currentCharEl.classList.add('char-error-shake');
    }
  }

  /**
   * High-performance particle animation.
   * 18 glowing embers using optimized single-pass alpha drawing.
   * @param {HTMLCanvasElement} canvas
   */
  startParticles(canvas) {
    const ctx = canvas.getContext('2d', { alpha: true });
    const COUNT = 18;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = (window.innerWidth) * dpr;
      canvas.height = (window.innerHeight) * dpr;
      // Resizing a canvas resets its bitmap but not the drawing context's
      // transform. Replace the transform so repeated window resizes do not
      // compound the DPR scale and move particles off-screen.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 1.5 + Math.random() * 2.5,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -(0.18 + Math.random() * 0.35),
      alpha: 0.12 + Math.random() * 0.28,
      phase: Math.random() * Math.PI * 2
    }));

    const tick = () => {
      if (!this.isActive) {
        window.removeEventListener('resize', onResize);
        return;
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = 0; i < COUNT; i++) {
        const p = particles[i];
        p.phase += 0.012;
        p.x += p.vx + Math.sin(p.phase) * 0.35;
        p.y += p.vy;

        if (p.y < -10) p.y = window.innerHeight + 10;
        if (p.x < -10) p.x = window.innerWidth + 10;
        if (p.x > window.innerWidth + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160, 140, 255, ${p.alpha})`;
        ctx.fill();
      }

      this._particleRaf = requestAnimationFrame(tick);
    };

    this._particleRaf = requestAnimationFrame(tick);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /**
   * Build modern full-screen zen overlay DOM.
   * @param {object} [options]
   * @returns {HTMLDivElement}
   */
  _buildOverlay(options = {}) {
    const overlay = document.createElement('div');
    overlay.id = 'zen-overlay';
    overlay.className = 'zen-overlay';
    overlay.tabIndex = -1;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Zen Mode — Distraction-Free Sanctuary');

    const titleText = options.author ? `Zen Sanctuary • ${options.author}` : (options.title || 'Zen Sanctuary');

    overlay.innerHTML = `
      <!-- Top Progress Line -->
      <div class="zen-top-progress-bar">
        <div class="zen-top-progress-fill" style="width: 0%;"></div>
      </div>

      <!-- Top Minimalist Bar -->
      <div class="zen-top-bar">
        <div class="zen-title-badge">
          <span class="zen-icon">🧘</span>
          <span class="zen-meta-title">${titleText}</span>
        </div>
        <div class="zen-live-metrics">
          <span class="zen-metric-chip"><strong class="zen-live-wpm">0</strong> WPM</span>
          <span class="zen-metric-chip"><strong class="zen-live-acc">100%</strong> ACC</span>
        </div>
        <button class="zen-quick-exit-btn" title="Exit Zen Mode (Esc)">Esc ✕</button>
      </div>

      <!-- Particle Canvas -->
      <canvas class="zen-particles"></canvas>

      <!-- Center Typing Container -->
      <div class="zen-typing-container">
        <div class="zen-typing-area">
          <div class="zen-typing-content">
            <p class="zen-placeholder">Start typing to begin...</p>
          </div>
        </div>
      </div>

      <!-- Bottom Floating Controls Pill -->
      <div class="zen-controls">
        <div class="zen-soundscapes-group">
          <button class="zen-sound-btn active" data-soundscape="rain">🌧️ Rain</button>
          <button class="zen-sound-btn" data-soundscape="forest">🌲 Forest</button>
          <button class="zen-sound-btn" data-soundscape="lofi">🎵 Lo-Fi</button>
          <button class="zen-sound-btn" data-soundscape="ocean">🌊 Ocean</button>
          <button class="zen-sound-btn" data-soundscape="whitenoise">🌀 White Noise</button>
        </div>
        <div class="zen-divider"></div>
        <div class="zen-volume-group">
          <span class="zen-vol-icon">🔊</span>
          <input type="range" min="0" max="1" step="0.01" value="0.45" class="zen-volume-slider" title="Ambient Soundscape Volume" />
        </div>
        <div class="zen-divider"></div>
        <button class="zen-close-btn">✕ Exit</button>
      </div>
    `;

    // Exit buttons
    overlay.querySelector('.zen-quick-exit-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.exit();
    });

    overlay.querySelector('.zen-close-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.exit();
    });

    // Soundscape selector
    const soundBtns = overlay.querySelectorAll('.zen-sound-btn');
    soundBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.soundscape;
        if (this.zenSoundEngine.currentSoundscape === id) {
          this.zenSoundEngine.fadeOut(0.2);
          soundBtns.forEach(b => b.classList.remove('active'));
        } else {
          soundBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.zenSoundEngine.play(id);
        }
        overlay.focus();
      });
    });

    // Volume slider
    const volSlider = overlay.querySelector('.zen-volume-slider');
    volSlider?.addEventListener('input', (e) => {
      e.stopPropagation();
      this.zenSoundEngine.setVolume(parseFloat(e.target.value));
      overlay.focus();
    });

    return overlay;
  }

  /**
   * Keydown listener installed while Zen Mode is active.
   * Escape exits cleanly; other keystrokes are forwarded to typing engine.
   * @param {KeyboardEvent} e
   * @private
   */
  _onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.exit();
      return;
    }

    if (['Space', 'Backspace', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) || e.key === ' ') {
      e.preventDefault();
    }

    if (typeof this._onType === 'function') {
      this._onType(e);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singletons & Exports
// ─────────────────────────────────────────────────────────────────────────────

export const focusMode = new FocusModeManager();
export const zenMode   = new ZenModeManager();

export { FocusModeManager, ZenModeManager };
