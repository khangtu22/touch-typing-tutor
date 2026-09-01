/**
 * Core Typing Engine
 * Supports Strict touch typing, Blind mode, Sudden death fail-safes,
 * Metronome cadence synchronization, and timed sprint trials.
 */

import { sound } from './sound-engine.js';
import { getFingerForKey, getOppositeShift, isShiftRequired } from './finger-mapping.js';
import { store } from './state.js';
import { calculateMastery } from './mastery.js';

export class TypingEngine {
  constructor() {
    this.lesson = null;
    this.currentRoundIdx = 0;
    this.currentText = '';
    this.charIndex = 0;

    this.isActive = false;
    this.isPaused = false;
    this.startTime = null;
    this.lastCharTime = null;

    // Session aggregates
    this.totalCorrect = 0;
    this.totalErrors = 0;
    this.totalAttempts = 0;
    this.currentCombo = 0;
    this.maxCombo = 0;
    this.keyStatsDelta = {};
    this.wpmHistory = [];
    this.wpmSampleTimer = null;

    // Timed sprint countdown
    this.timeRemainingSec = null;
    this.sprintTimer = null;

    // Short pause between rounds. Enter can consume this transition early.
    this.roundTransitionTimer = null;
    this.roundTransitioning = false;

    // Callbacks
    this.onStateChange = null;
    this.onRoundFinished = null;
    this.onLessonFinished = null;
    this.onErrorFeedback = null;
    this.onSuddenDeathFail = null;
  }

  startLesson(lesson) {
    this.clearRoundTransition();
    this.lesson = lesson;
    this.currentRoundIdx = 0;
    this.totalCorrect = 0;
    this.totalErrors = 0;
    this.totalAttempts = 0;
    this.currentCombo = 0;
    this.maxCombo = 0;
    this.keyStatsDelta = {};
    this.wpmHistory = [];
    this.isActive = true;
    this.isPaused = false;
    this.startTime = null;
    this.lastCharTime = null;

    const state = store.getState();
    if (state.settings.metronomeEnabled) {
      sound.startMetronome(state.settings.metronomeBpm || 100);
    } else {
      sound.stopMetronome();
    }

    if (lesson.timeLimitSec) {
      this.timeRemainingSec = lesson.timeLimitSec;
      this.startSprintCountdown();
    } else {
      this.timeRemainingSec = null;
      this.stopSprintCountdown();
    }

    this.loadRound(0);
    this.startWpmSampling();
  }

  loadRound(roundIdx) {
    this.clearRoundTransition();
    if (!this.lesson || roundIdx >= this.lesson.rounds.length) {
      this.finishLesson();
      return;
    }

    this.currentRoundIdx = roundIdx;
    this.currentText = this.lesson.rounds[roundIdx];
    this.charIndex = 0;
    this.emitState();
  }

  getCurrentExpectedChar() {
    if (!this.currentText || this.charIndex >= this.currentText.length) return '';
    return this.currentText[this.charIndex];
  }

  getCurrentTargetFinger() {
    const char = this.getCurrentExpectedChar();
    return getFingerForKey(char);
  }

  getOppositeShiftNeeded() {
    const char = this.getCurrentExpectedChar();
    return isShiftRequired(char) ? getOppositeShift(char) : null;
  }

  clearRoundTransition() {
    if (this.roundTransitionTimer !== null) {
      clearTimeout(this.roundTransitionTimer);
      this.roundTransitionTimer = null;
    }
    this.roundTransitioning = false;
  }

  advanceToNextRound() {
    if (!this.isActive || !this.roundTransitioning) return false;

    const nextRoundIdx = this.currentRoundIdx + 1;
    this.clearRoundTransition();
    this.loadRound(nextRoundIdx);
    return true;
  }

  handleKeyDown(e) {
    if (!this.isActive || this.isPaused) return;

    // Enter is a fast-forward only during the completed-round transition.
    // During normal typing it remains an invalid character and cannot skip
    // unfinished practice text.
    if (this.roundTransitioning && (e.code === 'Enter' || e.key === 'Enter')) {
      e.preventDefault?.();
      this.advanceToNextRound();
      return;
    }

    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
      return;
    }

    if (['Space', 'Backspace', 'Tab', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }

    const expectedChar = this.getCurrentExpectedChar();
    if (!expectedChar) return;

    const typedKey = e.key;

    const now = Date.now();
    if (!this.startTime) {
      this.startTime = now;
      this.lastCharTime = now;
    }

    const latency = this.lastCharTime ? Math.min(1500, now - this.lastCharTime) : 200;
    this.lastCharTime = now;

    const charKey = expectedChar.toLowerCase();
    if (!this.keyStatsDelta[charKey]) {
      this.keyStatsDelta[charKey] = { attempts: 0, errors: 0, totalLatencyMs: 0 };
    }
    this.keyStatsDelta[charKey].attempts += 1;
    this.keyStatsDelta[charKey].totalLatencyMs += latency;
    this.totalAttempts += 1;

    const isMatch = typedKey === expectedChar;

    if (isMatch) {
      this.totalCorrect += 1;
      this.currentCombo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.currentCombo);

      if (expectedChar === ' ') {
        sound.playSpace();
      } else {
        sound.playKeyClick(expectedChar);
      }

      if ([10, 25, 50, 100, 150, 200].includes(this.currentCombo)) {
        sound.playCombo(this.currentCombo);
      }

      this.charIndex += 1;

      if (this.charIndex < this.currentText.length && this.currentText[this.charIndex - 1] === ' ') {
        sound.playWordComplete();
      }

      this.emitState();

      if (this.charIndex >= this.currentText.length) {
        this.finishRound();
      }
    } else {
      this.totalErrors += 1;
      this.currentCombo = 0;
      this.keyStatsDelta[charKey].errors += 1;

      sound.playError();

      const state = store.getState();
      if (state.settings.suddenDeath) {
        // Sudden death triggered! Reset round
        this.charIndex = 0;
        if (this.onSuddenDeathFail) {
          this.onSuddenDeathFail();
        }
      }

      if (this.onErrorFeedback) {
        this.onErrorFeedback({
          expectedChar,
          typedKey,
          targetFinger: getFingerForKey(expectedChar)
        });
      }

      this.emitState();
    }
  }

  finishRound() {
    const isLastRound = this.currentRoundIdx >= this.lesson.rounds.length - 1;
    if (isLastRound) {
      this.finishLesson();
    } else {
      this.clearRoundTransition();
      this.roundTransitioning = true;
      sound.playWordComplete();
      if (this.onRoundFinished) {
        this.onRoundFinished({
          roundIdx: this.currentRoundIdx,
          totalRounds: this.lesson.rounds.length
        });
      }
      this.roundTransitionTimer = setTimeout(() => {
        this.roundTransitionTimer = null;
        if (this.isActive && !this.isPaused && this.roundTransitioning) {
          this.advanceToNextRound();
        }
      }, 350);
    }
  }

  finishLesson() {
    this.clearRoundTransition();
    this.isActive = false;
    this.stopWpmSampling();
    this.stopSprintCountdown();
    sound.stopMetronome();

    const durationSec = this.startTime ? (Date.now() - this.startTime) / 1000 : 1;
    const wpm = this.calculateLiveWpm();
    const accuracy = this.calculateLiveAccuracy();

    const accTarget = this.lesson.accuracyTarget || 90;
    const wpmTarget = this.lesson.wpmTarget || 15;
    const mastery = calculateMastery({
      accuracy,
      wpm,
      accuracyTarget: accTarget,
      wpmTarget,
      totalErrors: this.totalErrors,
      totalKeystrokes: this.totalAttempts
    });

    let xpEarned = this.lesson.isPlacementTest ? 35 : (this.lesson.xpReward || 30);
    if (!this.lesson.isPlacementTest) {
      if (accuracy >= 95) xpEarned += 10;
      if (accuracy >= 99) xpEarned += 15;
      if (wpm >= wpmTarget) xpEarned += 10;
      if (mastery.isPassed) xpEarned += 15;
      if (mastery.isMastered) xpEarned += 15;
      if (mastery.isPerfected) xpEarned += 20;
      if (this.maxCombo >= 50) xpEarned += 10;
    }

    const summary = {
      lessonId: this.lesson.id,
      lessonTitle: this.lesson.title,
      lessonSubtitle: this.lesson.subtitle,
      wpm,
      accuracy,
      durationSec,
      stars: mastery.stars,
      mastery,
      isPlacementTest: !!this.lesson.isPlacementTest,
      xpEarned,
      maxCombo: this.maxCombo,
      totalKeystrokes: this.totalAttempts,
      totalCorrect: this.totalCorrect,
      totalErrors: this.totalErrors,
      keyStatsDelta: this.keyStatsDelta,
      wpmHistory: this.wpmHistory,
      accuracyTarget: accTarget,
      wpmTarget: wpmTarget
    };

    if (this.onLessonFinished) {
      this.onLessonFinished(summary);
    }
  }

  calculateLiveWpm() {
    if (!this.startTime) return 0;
    const elapsedMinutes = (Date.now() - this.startTime) / 60000;
    if (elapsedMinutes < 0.02) return 0;
    const wpm = (this.totalCorrect / 5) / elapsedMinutes;
    return Math.max(0, Math.min(220, Math.round(wpm)));
  }

  calculateLiveAccuracy() {
    if (this.totalAttempts === 0) return 100;
    const acc = (this.totalCorrect / this.totalAttempts) * 100;
    return Math.max(0, Math.min(100, Math.round(acc)));
  }

  startWpmSampling() {
    this.stopWpmSampling();
    this.wpmSampleTimer = setInterval(() => {
      if (this.isActive && this.startTime && !this.isPaused) {
        const timeSec = Math.round((Date.now() - this.startTime) / 1000);
        const wpm = this.calculateLiveWpm();
        this.wpmHistory.push({ timeSec, wpm });
        if (this.wpmHistory.length > 80) this.wpmHistory.shift();
      }
    }, 1000);
  }

  stopWpmSampling() {
    if (this.wpmSampleTimer) {
      clearInterval(this.wpmSampleTimer);
      this.wpmSampleTimer = null;
    }
  }

  startSprintCountdown() {
    this.stopSprintCountdown();
    this.sprintTimer = setInterval(() => {
      if (this.isActive && !this.isPaused && this.timeRemainingSec !== null) {
        this.timeRemainingSec -= 1;
        if (this.timeRemainingSec <= 0) {
          this.finishLesson();
        } else {
          this.emitState();
        }
      }
    }, 1000);
  }

  stopSprintCountdown() {
    if (this.sprintTimer) {
      clearInterval(this.sprintTimer);
      this.sprintTimer = null;
    }
  }

  pause() {
    this.isPaused = true;
    sound.stopMetronome();
    this.emitState();
  }

  resume() {
    this.isPaused = false;
    const state = store.getState();
    if (state.settings.metronomeEnabled) {
      sound.startMetronome(state.settings.metronomeBpm || 100);
    }
    this.emitState();
  }

  emitState() {
    if (!this.onStateChange) return;

    const expectedChar = this.getCurrentExpectedChar();
    const targetFinger = this.getCurrentTargetFinger();
    const shiftNeeded = this.getOppositeShiftNeeded();
    const wpm = this.calculateLiveWpm();
    const accuracy = this.calculateLiveAccuracy();

    const totalLessonChars = this.lesson ? this.lesson.rounds.reduce((s, r) => s + r.length, 0) : 1;
    const completedCharsInPriorRounds = this.lesson ? this.lesson.rounds.slice(0, this.currentRoundIdx).reduce((s, r) => s + r.length, 0) : 0;
    const overallProgressPct = Math.min(100, Math.round(((completedCharsInPriorRounds + this.charIndex) / totalLessonChars) * 100));

    this.onStateChange({
      lesson: this.lesson,
      roundIdx: this.currentRoundIdx,
      totalRounds: this.lesson ? this.lesson.rounds.length : 1,
      currentText: this.currentText,
      charIndex: this.charIndex,
      expectedChar,
      targetFinger,
      shiftNeeded,
      wpm,
      accuracy,
      combo: this.currentCombo,
      maxCombo: this.maxCombo,
      progressPct: overallProgressPct,
      timeRemainingSec: this.timeRemainingSec,
      isPaused: this.isPaused
    });
  }

  destroy() {
    this.clearRoundTransition();
    this.stopWpmSampling();
    this.stopSprintCountdown();
    sound.stopMetronome();
    this.isActive = false;
  }
}

export const typingEngine = new TypingEngine();
