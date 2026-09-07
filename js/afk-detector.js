/**
 * Lesson inactivity detector.
 *
 * AFK detection is deliberately scoped to an already-started lesson. Waiting
 * on the lesson intro does not trigger it, and the detector never changes
 * typing state by itself: the UI owns the pause action and can explain why it
 * happened.
 */

export const DEFAULT_AFK_TIMEOUT_MS = 30_000;

const MIN_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 10 * 60_000;
const POINTER_ACTIVITY_THROTTLE_MS = 750;

const clampTimeout = value => Math.min(
  MAX_TIMEOUT_MS,
  Math.max(MIN_TIMEOUT_MS, Number.isFinite(value) ? value : DEFAULT_AFK_TIMEOUT_MS)
);

export class AFKDetector {
  constructor({
    isSessionActive = () => false,
    getConfig = () => ({ enabled: true, timeoutMs: DEFAULT_AFK_TIMEOUT_MS }),
    onIdle = () => {}
  } = {}) {
    this.isSessionActive = isSessionActive;
    this.getConfig = getConfig;
    this.onIdle = onIdle;
    this.timer = null;
    this.lastActivityAt = 0;
    this.lastPointerActivityAt = 0;
    this.wasSessionActive = false;
    this.started = false;

    this.handleActivity = () => this.notifyActivity();
    this.handlePointerActivity = () => {
      const now = Date.now();
      if (now - this.lastPointerActivityAt < POINTER_ACTIVITY_THROTTLE_MS) return;
      this.lastPointerActivityAt = now;
      this.notifyActivity();
    };
    this.handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        this.clearTimer();
      } else {
        this.check();
      }
    };
  }

  start() {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    window.addEventListener('keydown', this.handleActivity, { passive: true });
    window.addEventListener('pointerdown', this.handleActivity, { passive: true });
    window.addEventListener('pointermove', this.handlePointerActivity, { passive: true });
    window.addEventListener('touchstart', this.handleActivity, { passive: true });
    window.addEventListener('wheel', this.handleActivity, { passive: true });
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.sync();
  }

  stop() {
    if (!this.started || typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.handleActivity);
    window.removeEventListener('pointerdown', this.handleActivity);
    window.removeEventListener('pointermove', this.handlePointerActivity);
    window.removeEventListener('touchstart', this.handleActivity);
    window.removeEventListener('wheel', this.handleActivity);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.clearTimer();
    this.started = false;
    this.wasSessionActive = false;
    this.lastActivityAt = 0;
    this.lastPointerActivityAt = 0;
  }

  getConfigValue() {
    const config = this.getConfig?.() || {};
    return {
      enabled: config.enabled !== false,
      timeoutMs: clampTimeout(
        Number.isFinite(Number(config.timeoutMs))
          ? Number(config.timeoutMs)
          : DEFAULT_AFK_TIMEOUT_MS
      )
    };
  }

  clearTimer() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  sync() {
    if (!this.started) return;
    const { enabled } = this.getConfigValue();
    if (!enabled || !this.isSessionActive() || document.visibilityState === 'hidden') {
      this.clearTimer();
      if (!enabled || !this.isSessionActive()) this.wasSessionActive = false;
      return;
    }

    if (!this.wasSessionActive || !this.lastActivityAt) {
      this.lastActivityAt = Date.now();
      this.lastPointerActivityAt = 0;
      this.wasSessionActive = true;
    }
    this.schedule();
  }

  notifyActivity() {
    if (!this.started || !this.isSessionActive()) return;
    this.lastActivityAt = Date.now();
    this.wasSessionActive = true;
    this.schedule();
  }

  schedule() {
    this.clearTimer();
    if (!this.isSessionActive() || document.visibilityState === 'hidden') return;

    const { enabled, timeoutMs } = this.getConfigValue();
    if (!enabled) {
      this.wasSessionActive = false;
      return;
    }

    const elapsed = Math.max(0, Date.now() - this.lastActivityAt);
    const remaining = timeoutMs - elapsed;
    if (remaining <= 0) {
      this.check();
      return;
    }

    this.timer = setTimeout(() => {
      this.timer = null;
      this.check();
    }, remaining + 20);
  }

  check() {
    this.clearTimer();
    if (!this.started || !this.isSessionActive() || document.visibilityState === 'hidden') {
      if (!this.isSessionActive()) this.wasSessionActive = false;
      return;
    }

    const { enabled, timeoutMs } = this.getConfigValue();
    if (!enabled) {
      this.wasSessionActive = false;
      return;
    }
    if (!this.lastActivityAt) this.lastActivityAt = Date.now();

    const idleMs = Math.max(0, Date.now() - this.lastActivityAt);
    if (idleMs >= timeoutMs) {
      this.lastActivityAt = Date.now();
      this.onIdle({ idleMs, timeoutMs });
      return;
    }

    this.schedule();
  }
}
