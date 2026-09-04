/**
 * Core Typing Engine
 * Supports Strict touch typing, Blind mode, Sudden death fail-safes,
 * Metronome cadence synchronization, and timed sprint trials.
 */

import { sound } from './sound-engine.js';
import { getFingerForKey, getOppositeShift, isShiftRequired } from './finger-mapping.js';
import { store } from './state.js';
import { calculateMastery } from './mastery.js';
import { calculateConsistency } from './speed-test.js';

export function buildWordIndexMap(text) {
  if (!text) return { charToWord: [], words: [] };

  const charToWord = new Array(text.length).fill(-1);
  const words = [];
  let inWord = false;
  let wordStart = 0;

  for (let i = 0; i < text.length; i++) {
    const isWhitespace = text[i] === ' ' || text[i] === '\n' || text[i] === '\t';
    if (!isWhitespace) {
      if (!inWord) {
        inWord = true;
        wordStart = i;
      }
      charToWord[i] = words.length;
    } else {
      if (inWord) {
        words.push({
          wordIndex: words.length,
          startIndex: wordStart,
          endIndex: i - 1,
          text: text.slice(wordStart, i)
        });
        inWord = false;
      }
      charToWord[i] = -1;
    }
  }

  if (inWord) {
    words.push({
      wordIndex: words.length,
      startIndex: wordStart,
      endIndex: text.length - 1,
      text: text.slice(wordStart, text.length)
    });
  }

  return { charToWord, words };
}

export class TypingEngine {
  constructor() {
    this.lesson = null;
    this.currentRoundIdx = 0;
    this.currentText = '';
    this.charIndex = 0;
    this.charStates = [];
    this.mistypedCharIndices = new Set();
    this.mistypedWordIndices = new Set();
    this.sessionMistypedWords = new Set();
    this.wordMap = null;

    this.isActive = false;
    this.isPaused = false;
    this.startTime = null;
    this.lastCharTime = null;
    this.totalPausedMs = 0;
    this.pausedAt = null;

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
    this.sessionMistypedWords = new Set();
    this.isActive = true;
    this.isPaused = false;
    this.startTime = null;
    this.lastCharTime = null;
    this.totalPausedMs = 0;
    this.pausedAt = null;

    const state = store.getState();
    if (state.settings.metronomeEnabled) {
      sound.startMetronome(state.settings.metronomeBpm || 100);
    } else {
      sound.stopMetronome();
    }

    if (lesson.timeLimitSec) {
      this.timeRemainingSec = lesson.timeLimitSec;
      // Countdown will start when first letter is typed
      this.stopSprintCountdown();
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
    const rawText = this.lesson.rounds[roundIdx] || '';
    const isCode = !!(this.lesson.isCodeLesson || this.lesson.isCodePreset);
    this.currentText = isCode ? rawText : rawText.replace(/[ \t]{2,}/g, ' ').trim();
    this.charIndex = 0;
    this.charStates = new Array(this.currentText.length).fill(null);
    this.mistypedCharIndices = new Set();
    this.mistypedWordIndices = new Set();
    this.wordMap = buildWordIndexMap(this.currentText);
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

  getWordIndexForChar(charIdx) {
    if (!this.wordMap || !this.currentText) return -1;
    if (charIdx < 0) return -1;
    if (charIdx >= this.currentText.length) {
      return this.wordMap.words.length - 1;
    }
    if (this.wordMap.charToWord[charIdx] >= 0) {
      return this.wordMap.charToWord[charIdx];
    }
    // If charIdx is on whitespace, find the preceding word index
    for (let i = charIdx - 1; i >= 0; i--) {
      if (this.wordMap.charToWord[i] >= 0) {
        return this.wordMap.charToWord[i];
      }
    }
    // If leading whitespace before first word:
    for (let i = charIdx + 1; i < this.currentText.length; i++) {
      if (this.wordMap.charToWord[i] >= 0) {
        return this.wordMap.charToWord[i];
      }
    }
    return -1;
  }

  isWordFullyCorrect(wordIdx) {
    if (!this.wordMap || !this.wordMap.words[wordIdx]) return true;
    const { startIndex, endIndex } = this.wordMap.words[wordIdx];
    for (let i = startIndex; i <= endIndex; i++) {
      if (!this.charStates[i] || this.charStates[i].status !== 'correct') {
        return false;
      }
    }
    return true;
  }

  hasUncorrectedErrorsInWord(wordIdx) {
    if (!this.wordMap || !this.wordMap.words[wordIdx]) return false;
    const { startIndex, endIndex } = this.wordMap.words[wordIdx];
    for (let i = startIndex; i <= endIndex; i++) {
      if (this.charStates[i] && this.charStates[i].status === 'incorrect') {
        return true;
      }
    }
    return false;
  }

  isAllTextCorrect() {
    if (!this.currentText) return true;
    for (let i = 0; i < this.currentText.length; i++) {
      if (!this.charStates[i] || this.charStates[i].status !== 'correct') {
        return false;
      }
    }
    return true;
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

  retryLesson() {
    this.clearRoundTransition();
    if (this.lesson) {
      this.startLesson(this.lesson);
    }
  }

  recordMistypedWord(charIdx) {
    const wordIdx = this.getWordIndexForChar(charIdx);
    if (wordIdx >= 0 && this.wordMap?.words?.[wordIdx]) {
      const raw = this.wordMap.words[wordIdx].text;
      const clean = raw.trim().replace(/^[^a-zA-Z0-9_]+|[^a-zA-Z0-9_]+$/g, '');
      if (clean.length > 0) {
        this.sessionMistypedWords.add(clean);
      }
    }
  }

  handleKeyDown(e) {
    // Ignore keyboard shortcuts with Command/Ctrl (e.g. Cmd+K, Cmd+R, Cmd+C, Ctrl+C)
    if (e.metaKey || e.ctrlKey) {
      return;
    }

    // Always swallow default browser scrolling/navigation keys in typing contexts
    if (['Space', 'Backspace', 'Tab', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) || [' ', 'Backspace', 'Tab', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault?.();
    }

    if (!this.isActive || this.isPaused) return;

    // During round transition between rounds:
    // Enter or Space immediately advances to the next round without waiting for the timer.
    // All other trailing keystrokes are swallowed and discarded so they never register as errors on the finished text.
    if (this.roundTransitioning) {
      if (e.code === 'Enter' || e.key === 'Enter' || e.code === 'Space' || e.key === ' ') {
        e.preventDefault?.();
        this.advanceToNextRound();
      } else {
        e.preventDefault?.();
      }
      return;
    }

    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
      return;
    }

    const state = store.getState();
    const isWordCorrectionMode = !!state.settings.wordCorrectionMode;

    // --- Backspace Handling ---
    // In Word Correction Mode, Backspace is handled first so typists can correct
    // mistakes even when positioned at the end of the text.
    if (e.key === 'Backspace' || e.code === 'Backspace') {
      if (!isWordCorrectionMode) return;

      if (this.charIndex > 0) {
        this.charIndex -= 1;
        this.charStates[this.charIndex] = null;
        sound.playKeyClick(this.getCurrentExpectedChar() || ' ');
        this.emitState();
      }
      return;
    }

    // If the text for the round is already complete, ignore any further character keystrokes
    if (this.charIndex >= this.currentText.length) {
      return;
    }

    const expectedChar = this.getCurrentExpectedChar();
    if (!expectedChar && this.charIndex >= this.currentText.length) {
      return;
    }

    // Map physical Enter to newline and Tab to tab character for code and multi-line text
    let typedKey = e.key;
    if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter') {
      typedKey = '\n';
    } else if (e.key === 'Tab' || e.code === 'Tab') {
      typedKey = '\t';
    }

    if (typedKey.length !== 1) {
      return;
    }

    const now = Date.now();
    const isFirstKeystroke = !this.startTime;
    if (isFirstKeystroke) {
      this.startTime = now;
      this.lastCharTime = now;
      this.totalPausedMs = 0;
      this.pausedAt = null;
      if (this.timeRemainingSec !== null) {
        this.startSprintCountdown();
      }
    }

    const latency = this.lastCharTime && !isFirstKeystroke ? Math.min(1500, now - this.lastCharTime) : 200;
    this.lastCharTime = now;

    const charKey = (expectedChar || ' ').toLowerCase();
    if (!this.keyStatsDelta[charKey]) {
      this.keyStatsDelta[charKey] = { attempts: 0, errors: 0, totalLatencyMs: 0 };
    }
    this.keyStatsDelta[charKey].attempts += 1;
    this.keyStatsDelta[charKey].totalLatencyMs += latency;
    this.totalAttempts += 1;

    const isMatch = typedKey === expectedChar;

    if (!isWordCorrectionMode) {
      // ═════════════════════════════════════════════════════════════
      // STANDARD / STRICT TOUCH TYPING MODE
      // ═════════════════════════════════════════════════════════════
      if (isMatch) {
        this.totalCorrect += 1;
        this.currentCombo += 1;
        this.maxCombo = Math.max(this.maxCombo, this.currentCombo);
        this.charStates[this.charIndex] = { status: 'correct', char: typedKey };

        if (expectedChar === ' ') {
          sound.playSpace();
        } else if (expectedChar === '\n') {
          sound.playKeyClick('Enter');
        } else {
          sound.playKeyClick(expectedChar);
        }

        if ([10, 25, 50, 100, 150, 200].includes(this.currentCombo)) {
          sound.playCombo(this.currentCombo);
        }

        this.charIndex += 1;

        if (this.charIndex < this.currentText.length && (this.currentText[this.charIndex - 1] === ' ' || this.currentText[this.charIndex - 1] === '\n')) {
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
        this.recordMistypedWord(this.charIndex);

        sound.playError();

        if (state.settings.suddenDeath) {
          // Sudden death triggered! Reset round
          this.charIndex = 0;
          this.charStates = new Array(this.currentText.length).fill(null);
          this.mistypedWordIndices = new Set();
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
    } else {
      // ═════════════════════════════════════════════════════════════
      // WORD CORRECTION MODE (Keep typing on error, Backspace to fix)
      // ═════════════════════════════════════════════════════════════
      const currentWordIdx = this.getWordIndexForChar(this.charIndex);

      if (expectedChar === '\n') {
        if (typedKey === '\n') {
          this.totalCorrect += 1;
          this.currentCombo += 1;
          this.maxCombo = Math.max(this.maxCombo, this.currentCombo);
          this.charStates[this.charIndex] = { status: 'correct', char: '\n' };
          sound.playKeyClick('Enter');
          sound.playWordComplete();

          if ([10, 25, 50, 100, 150, 200].includes(this.currentCombo)) {
            sound.playCombo(this.currentCombo);
          }

          this.charIndex += 1;
          this.emitState();

          if (this.charIndex >= this.currentText.length) {
            this.finishRound();
          }
        } else {
          this.totalErrors += 1;
          this.currentCombo = 0;
          this.keyStatsDelta[charKey].errors += 1;
          this.mistypedCharIndices.add(this.charIndex);
          if (currentWordIdx >= 0) this.mistypedWordIndices.add(currentWordIdx);
          this.recordMistypedWord(this.charIndex);
          this.charStates[this.charIndex] = {
            status: 'incorrect',
            typed: typedKey,
            expected: expectedChar
          };
          sound.playError();

          if (state.settings.suddenDeath) {
            this.charIndex = 0;
            this.charStates = new Array(this.currentText.length).fill(null);
            this.mistypedCharIndices = new Set();
            this.mistypedWordIndices = new Set();
            if (this.onSuddenDeathFail) this.onSuddenDeathFail();
            this.emitState();
            return;
          }

          if (this.onErrorFeedback) {
            this.onErrorFeedback({
              expectedChar,
              typedKey,
              targetFinger: getFingerForKey(expectedChar)
            });
          }
          this.charIndex += 1;
          this.emitState();

          if (this.charIndex >= this.currentText.length) {
            this.finishRound();
          }
        }
      } else if (expectedChar === ' ') {
        // A word boundary is still a normal character in correction mode.
        // Accepting it lets the user continue typing after an earlier error.
        if (typedKey === ' ') {
          this.totalCorrect += 1;
          this.currentCombo += 1;
          this.maxCombo = Math.max(this.maxCombo, this.currentCombo);
          this.charStates[this.charIndex] = { status: 'correct', char: ' ' };
          sound.playSpace();
          sound.playWordComplete();

          if ([10, 25, 50, 100, 150, 200].includes(this.currentCombo)) {
            sound.playCombo(this.currentCombo);
          }

          this.charIndex += 1;
          this.emitState();

          if (this.charIndex >= this.currentText.length) {
            this.finishRound();
          }
        } else {
          // Expected space, but user typed a non-space key
          this.totalErrors += 1;
          this.currentCombo = 0;
          this.keyStatsDelta[charKey].errors += 1;
          this.mistypedCharIndices.add(this.charIndex);
          if (currentWordIdx >= 0) this.mistypedWordIndices.add(currentWordIdx);
          this.recordMistypedWord(this.charIndex);
          this.charStates[this.charIndex] = {
            status: 'incorrect',
            typed: typedKey,
            expected: expectedChar
          };
          sound.playError();

          if (state.settings.suddenDeath) {
            this.charIndex = 0;
            this.charStates = new Array(this.currentText.length).fill(null);
            this.mistypedCharIndices = new Set();
            this.mistypedWordIndices = new Set();
            if (this.onSuddenDeathFail) this.onSuddenDeathFail();
            this.emitState();
            return;
          }

          if (this.onErrorFeedback) {
            this.onErrorFeedback({
              expectedChar,
              typedKey,
              targetFinger: getFingerForKey(expectedChar)
            });
          }
          this.charIndex += 1;
          this.emitState();

          if (this.charIndex >= this.currentText.length) {
            this.finishRound();
          }
        }
      } else {
        // Expected a non-space character (inside a word)
        if (isMatch) {
          this.totalCorrect += 1;
          this.currentCombo += 1;
          this.maxCombo = Math.max(this.maxCombo, this.currentCombo);
          this.charStates[this.charIndex] = { status: 'correct', char: typedKey };
          sound.playKeyClick(expectedChar);

          if ([10, 25, 50, 100, 150, 200].includes(this.currentCombo)) {
            sound.playCombo(this.currentCombo);
          }

          this.charIndex += 1;
          this.emitState();

          if (this.charIndex >= this.currentText.length) {
            this.finishRound();
          }
        } else {
          // Mistyped key inside a word!
          this.totalErrors += 1;
          this.currentCombo = 0;
          this.keyStatsDelta[charKey].errors += 1;
          this.mistypedCharIndices.add(this.charIndex);
          if (currentWordIdx >= 0) this.mistypedWordIndices.add(currentWordIdx);
          this.recordMistypedWord(this.charIndex);

          this.charStates[this.charIndex] = {
            status: 'incorrect',
            typed: typedKey,
            expected: expectedChar
          };

          sound.playError();

          if (state.settings.suddenDeath) {
            this.charIndex = 0;
            this.charStates = new Array(this.currentText.length).fill(null);
            this.mistypedCharIndices = new Set();
            this.mistypedWordIndices = new Set();
            if (this.onSuddenDeathFail) {
              this.onSuddenDeathFail();
            }
            this.emitState();
            return;
          }

          if (this.onErrorFeedback) {
            this.onErrorFeedback({
              expectedChar,
              typedKey,
              targetFinger: getFingerForKey(expectedChar)
            });
          }

          this.charIndex += 1; // Keep typing!
          this.emitState();

          if (this.charIndex >= this.currentText.length) {
            this.finishRound();
          }
        }
      }
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

    const activeElapsedMs = this.startTime ? Math.max(1000, (Date.now() - this.startTime) - (this.totalPausedMs || 0)) : 1000;
    const durationSec = activeElapsedMs / 1000;
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

    const consistency = calculateConsistency(this.wpmHistory);

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
      consistency,
      mistypedWords: Array.from(this.sessionMistypedWords),
      accuracyTarget: accTarget,
      wpmTarget: wpmTarget
    };

    if (this.onLessonFinished) {
      this.onLessonFinished(summary);
    }
  }

  calculateLiveWpm() {
    if (!this.startTime) return 0;
    const activeElapsedMs = (Date.now() - this.startTime) - (this.totalPausedMs || 0);
    const elapsedMinutes = activeElapsedMs / 60000;
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
        const activeElapsedMs = (Date.now() - this.startTime) - (this.totalPausedMs || 0);
        const timeSec = Math.round(activeElapsedMs / 1000);
        const wpm = this.calculateLiveWpm();
        this.wpmHistory.push({ timeSec, wpm });
        if (this.wpmHistory.length > 80) this.wpmHistory.shift();
        if (this.timeRemainingSec === null) {
          this.emitState();
        }
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
      if (this.isActive && !this.isPaused && this.startTime && this.timeRemainingSec !== null) {
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
    if (this.startTime && !this.pausedAt) {
      this.pausedAt = Date.now();
    }
    sound.stopMetronome();
    this.emitState();
  }

  resume() {
    this.isPaused = false;
    if (this.pausedAt) {
      this.totalPausedMs = (this.totalPausedMs || 0) + (Date.now() - this.pausedAt);
      this.pausedAt = null;
    }
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

    const state = store.getState();

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
      startTime: this.startTime,
      isStarted: !!this.startTime,
      isPaused: this.isPaused,
      roundTransitioning: this.roundTransitioning,
      charStates: this.charStates || [],
      mistypedCharIndices: this.mistypedCharIndices || new Set(),
      mistypedWordIndices: this.mistypedWordIndices || new Set(),
      charToWord: this.wordMap ? this.wordMap.charToWord : [],
      wordCorrectionMode: !!state.settings.wordCorrectionMode
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
