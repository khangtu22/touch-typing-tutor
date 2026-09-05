/**
 * Central State Store & Persistence Layer
 * Manages reactive state, localStorage sync, safe schema recovery, XP curve,
 * JSON backup/restore portability, and extended customization settings.
 */

import { MASTERED_STARS, PASSING_STARS, PERFECT_STARS } from './mastery.js';

const STORAGE_KEY = 'typing_tutor_progress';

/**
 * Returns a stable local-calendar date key (YYYY-MM-DD).
 * Date-only strings are preserved so imported/exported history does not
 * shift a session into the previous day in a non-UTC timezone.
 */
export function getLocalDateKey(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const LEVEL_TITLES = [
  'Keyboard Novice',      // Lvl 1
  'Home Row Apprentice',  // Lvl 2
  'Key Seeker',           // Lvl 3
  'Rhythm Starter',       // Lvl 4
  'Home Row Nomad',       // Lvl 5
  'Top Row Explorer',     // Lvl 6
  'Bottom Row Scout',     // Lvl 7
  'Ten-Finger Pioneer',   // Lvl 8
  'Tactile Enthusiast',   // Lvl 9
  'Rhythm Weaver',        // Lvl 10
  'Flow Finder',          // Lvl 11
  'Shift Synchronizer',   // Lvl 12
  'Punctuation Pro',      // Lvl 13
  'Cadence Master',       // Lvl 14
  'Speed Striker',        // Lvl 15
  'Steady Striker',       // Lvl 16
  'Number Navigator',     // Lvl 17
  'Symbol Specialist',    // Lvl 18
  'Code Typist',          // Lvl 19
  'Swift Typist',         // Lvl 20
  'Precision Artist',     // Lvl 21
  'Velocity Artisan',     // Lvl 22
  'Muscle Memory Elite',  // Lvl 23
  'Keyboard Virtuoso',    // Lvl 24
  'Hyperflow Typist',     // Lvl 25
  'Apex Transcriber',     // Lvl 26
  'Legend of Home Row',   // Lvl 27
  'Master of Ten Keys',   // Lvl 28
  'Typing Luminary',      // Lvl 29
  'Grandmaster Typist'    // Lvl 30
];

export function getXpForLevel(lvl) {
  if (lvl <= 1) return 0;
  return Math.floor(120 * Math.pow(lvl - 1, 1.45));
}

export function getLevelFromXp(xp) {
  let level = 1;
  while (level < 30 && xp >= getXpForLevel(level + 1)) {
    level++;
  }
  return level;
}

export function getLevelProgress(xp) {
  const currentLvl = getLevelFromXp(xp);
  const currentLvlXp = getXpForLevel(currentLvl);
  const isMaxLevel = currentLvl >= 30;
  const nextLvlXp = isMaxLevel ? null : getXpForLevel(currentLvl + 1);
  const progressXp = Math.max(0, xp - currentLvlXp);
  const neededXp = isMaxLevel ? 0 : nextLvlXp - currentLvlXp;
  const pct = isMaxLevel ? 100 : Math.min(100, Math.max(0, Math.round((progressXp / neededXp) * 100)));
  const title = LEVEL_TITLES[currentLvl - 1] || 'Grandmaster Typist';

  return {
    currentLvl,
    title,
    currentLvlXp,
    nextLvlXp,
    progressXp,
    neededXp,
    isMaxLevel,
    pct
  };
}

const DEFAULT_STATE = {
  schemaVersion: 3,
  onboardingComplete: false,
  targetWpm: 40,
  xp: 0,
  level: 1,
  starsByLesson: {},
  lessonCompletion: {},
  currentLesson: 1,
  dailyStreak: 0,
  bestStreak: 0,
  lastPracticeDate: null,
  practiceDatesHistory: [],
  achievementsUnlocked: {},
  keyStats: {},
  sessions: [],
  totalKeystrokes: 0,
  totalCorrect: 0,
  totalErrors: 0,
  totalPracticeTimeSec: 0,
  bestWpm: 0,
  averageWpm: 0,
  bestAccuracy: 0,
  placementTest: null,
  arcadeStats: {
    invadersHighScore: 0,
    invadersMaxWave: 1,
    invadersBossDefeated: 0,
    nitroBestWpm: 0,
    matrixHighScore: 0,
    rhythmHighScore: 0,
    questHighScore: 0,
    questCompletedRuns: 0,
    totalGamesPlayed: 0
  },
  settings: {
    soundEnabled: true,
    soundVolume: 0.6,
    switchProfile: 'cherry_blue', // 'cherry_blue' | 'gateron_brown' | 'holy_panda' | 'typewriter' | 'bubble_pop'
    theme: 'dark', // 'dark' | 'retro' | 'cyberpunk' | 'botanical' | 'tokyo'
    customThemeId: null, // id of applied custom theme, or null for built-in
    layout: 'qwerty', // 'qwerty' | 'colemak' | 'dvorak' | 'workman'
    keyboardVisible: true,
    handGuideVisible: true,
    reachBannerVisible: true,
    textSize: 'medium',
    reducedMotion: false,
    highContrast: false,
    difficulty: 'balanced',
    ghostMode: 'bot', // 'off' | 'personal_best' | 'bot'
    botWpm: 50,
    blindMode: false,
    suddenDeath: false,
    wordCorrectionMode: false,
    metronomeEnabled: false,
    metronomeBpm: 100,
    // --- Premium Feature Settings ---
    isPremium: true,          // All features are included for every user.
    practiceLanguage: 'en',  // For multi-language practice
    goals: {
      enabled: false,
      dailyMinutes: 15,
      dailyWpm: 50,
      weeklyLessons: 5,
      notificationsEnabled: false,
      notificationHour: 20
    },
    wellness: {
      breakEnabled: false,
      breakInterval: 30,        // minutes
      eyeCareEnabled: false,
      focusModeShortcut: true
    }
  },
  dailyChallengeState: {
    date: null,
    completed: false,
    bestWpm: 0,
    bestAccuracy: 0
  },
  // --- Premium Feature Tracking ---
  quotesPracticed: [],         // Array of quote ids practiced
  quoteBookmarks: [],          // Array of bookmarked quote ids
  zenSessionsCompleted: 0,     // Count of completed Zen mode sessions
  languagesPracticed: [],      // Array of language codes practiced
  codeSnippetsPracticed: [],   // Array of code snippet ids practiced
  speedTestBests: {},          // Personal bests per speed test preset: { '15s': { wpm, accuracy, consistency, date } }
  certificateName: '',         // Custom name for printable diploma
};

class StateStore {
  constructor() {
    this.subscribers = new Set();
    this.saveTimeout = null;
    this.state = this.loadState();

    // Preserve the latest session and progress if the page is refreshed or hidden
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this.flushPersist());
      window.addEventListener('beforeunload', () => this.flushPersist());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.flushPersist();
      });
    }
  }

  loadState() {
    try {
      if (typeof localStorage === 'undefined') {
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      const parsed = JSON.parse(raw);
      const parsedSettings = parsed.settings || {};

      // Sanitize and normalize sessions array so historical dates and metrics are retained
      const rawSessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
      const cleanSessions = rawSessions
        .filter(s => s && typeof s === 'object')
        .map(s => {
          const rawDate = s.date || s.recordedAt || s.timestamp;
          let isoDate;
          try {
            const d = new Date(rawDate);
            isoDate = !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
          } catch (e) {
            isoDate = new Date().toISOString();
          }
          return {
            date: isoDate,
            lessonId: s.lessonId ?? 'practice',
            lessonTitle: s.lessonTitle || (s.lessonId ? `Lesson ${s.lessonId}` : 'Practice Session'),
            wpm: Math.max(0, Math.round(Number(s.wpm) || 0)),
            accuracy: Math.max(0, Math.min(100, Math.round(Number(s.accuracy) || 100))),
            durationSec: Math.max(0, Math.round(Number(s.durationSec) || 0)),
            stars: Math.max(1, Math.min(PERFECT_STARS, Math.round(Number(s.stars) || 1))),
            xpEarned: Math.max(0, Math.round(Number(s.xpEarned) || 0)),
            wpmHistory: Array.isArray(s.wpmHistory) ? s.wpmHistory : [],
            kind: s.kind || (Number.isInteger(s.lessonId) && s.lessonId >= 1 && s.lessonId <= 30 ? 'lesson' : 'practice'),
            mastery: s.mastery || null,
            inFocusMode: !!s.inFocusMode,
            speedTestPreset: s.speedTestPreset || null
          };
        });

      const state = {
        ...DEFAULT_STATE,
        ...parsed,
        sessions: cleanSessions,
        settings: {
          ...DEFAULT_STATE.settings,
          ...parsedSettings,
          // Premium is included for everyone. Keep the legacy field so older
          // saved data remains compatible, but never restore a restricted tier.
          isPremium: true,
          // Deep merge nested settings objects
          goals: {
            ...DEFAULT_STATE.settings.goals,
            ...(parsedSettings.goals || {})
          },
          wellness: {
            ...DEFAULT_STATE.settings.wellness,
            ...(parsedSettings.wellness || {})
          }
        },
        dailyChallengeState: {
          ...DEFAULT_STATE.dailyChallengeState,
          ...(parsed.dailyChallengeState || {})
        }
      };

      // The level is derived data. Always recalculate it when restoring so an
      // older or interrupted save cannot show a stale level after refresh.
      state.level = getLevelFromXp(state.xp);
      return state;
    } catch (err) {
      console.warn('Corrupted local state found. Recovering to clean defaults.', err);
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  notify(changedKeys = []) {
    this.subscribers.forEach(cb => {
      try {
        cb(this.state, changedKeys);
      } catch (err) {
        console.error('Subscriber notification error:', err);
      }
    });
  }

  persist() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.writeToStorage();
  }

  writeToStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch (err) {
      console.error('Error saving state to localStorage:', err);
    }
  }

  flushPersist() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.writeToStorage();
  }

  update(updater) {
    if (typeof updater === 'function') {
      this.state = updater(this.state);
    } else {
      this.state = { ...this.state, ...updater };
    }
    // Keep legacy saves and older callers from reintroducing a separate tier.
    this.state.settings = { ...(this.state.settings || {}), isPremium: true };
    this.state.level = getLevelFromXp(this.state.xp);
    this.persist();
    this.notify();
    return this.state;
  }

  recordSession({
    lessonId,
    lessonTitle,
    wpm,
    accuracy,
    durationSec,
    stars,
    xpEarned,
    keyStatsDelta = {},
    wpmHistory = [],
    mastery = null,
    isPlacementTest = false,
    placementRecommendation = null,
    inFocusMode = false,
    kind = null,
    speedTestPreset = null
  }) {
    const today = getLocalDateKey();
    const recordedAt = new Date().toISOString();
    const isCurriculumLesson = Number.isInteger(lessonId) && lessonId >= 1 && lessonId <= 30;
    const sessionStars = Math.min(PERFECT_STARS, Math.max(1, Number(stars) || 1));
    const sessionMastery = {
      stars: sessionStars,
      isPassed: mastery?.isPassed ?? sessionStars >= PASSING_STARS,
      isMastered: mastery?.isMastered ?? sessionStars >= MASTERED_STARS,
      isPerfected: mastery?.isPerfected ?? sessionStars >= PERFECT_STARS,
      nextGoal: mastery?.nextGoal || null
    };

    const updatedKeyStats = { ...(this.state.keyStats || {}) };
    Object.entries(keyStatsDelta).forEach(([char, data]) => {
      if (!updatedKeyStats[char]) {
        updatedKeyStats[char] = { attempts: 0, errors: 0, totalLatencyMs: 0 };
      }
      updatedKeyStats[char].attempts += (data.attempts || 0);
      updatedKeyStats[char].errors += (data.errors || 0);
      updatedKeyStats[char].totalLatencyMs += (data.totalLatencyMs || 0);
    });

    const attemptsDelta = Object.values(keyStatsDelta).reduce((sum, key) => sum + (key.attempts || 0), 0);
    const errorsDelta = Object.values(keyStatsDelta).reduce((sum, key) => sum + (key.errors || 0), 0);
    const sessionKind = kind || (isPlacementTest ? 'placement' : isCurriculumLesson ? 'lesson' : 'practice');
    const newSession = {
      date: recordedAt,
      lessonId,
      lessonTitle: lessonTitle || `Lesson ${lessonId}`,
      wpm: Math.max(0, Math.round(wpm)),
      accuracy: Math.max(0, Math.min(100, Math.round(accuracy))),
      durationSec: Math.max(0, Math.round(durationSec)),
      stars: sessionStars,
      xpEarned: Math.max(0, Math.round(xpEarned || 0)),
      wpmHistory: Array.isArray(wpmHistory) ? wpmHistory : [],
      kind: sessionKind,
      mastery: isCurriculumLesson ? sessionMastery : null,
      inFocusMode: !!inFocusMode,
      speedTestPreset: speedTestPreset || null
    };

    const sessions = [newSession, ...(this.state.sessions || [])].slice(0, 1000);

    const starsByLesson = { ...(this.state.starsByLesson || {}) };
    const lessonCompletion = { ...(this.state.lessonCompletion || {}) };
    let currentLesson = this.state.currentLesson || 1;

    if (isCurriculumLesson) {
      const currentBestStars = starsByLesson[lessonId] || 0;
      starsByLesson[lessonId] = Math.max(currentBestStars, sessionStars);

      const existing = lessonCompletion[lessonId] || {
        completed: false,
        bestWpm: 0,
        bestAccuracy: 0,
        bestStars: 0,
        attempts: 0,
        bestRun: null
      };
      const isNewBestWpm = wpm > existing.bestWpm;
      const bestStars = Math.max(existing.bestStars || 0, currentBestStars, sessionStars);
      const wasPassed = existing.passed ?? currentBestStars >= PASSING_STARS;
      const wasMastered = existing.mastered ?? currentBestStars >= MASTERED_STARS;
      const wasPerfected = existing.perfected ?? currentBestStars >= PERFECT_STARS;

      lessonCompletion[lessonId] = {
        ...existing,
        completed: true,
        passed: wasPassed || sessionMastery.isPassed,
        mastered: wasMastered || sessionMastery.isMastered,
        perfected: wasPerfected || sessionMastery.isPerfected,
        bestStars,
        lastStars: sessionStars,
        lastAttemptAt: recordedAt,
        nextGoal: sessionMastery.nextGoal,
        bestWpm: Math.max(existing.bestWpm || 0, wpm),
        bestAccuracy: Math.max(existing.bestAccuracy || 0, accuracy),
        attempts: (existing.attempts || 0) + 1,
        bestRun: isNewBestWpm ? { wpm, durationSec, wpmHistory } : (existing.bestRun || { wpm, durationSec, wpmHistory })
      };

      // A finished run only unlocks the next lesson after its minimum
      // accuracy and speed goals are both met.
      if (lessonId === currentLesson && sessionMastery.isPassed && currentLesson < 30) {
        currentLesson = lessonId + 1;
      }
    }

    let placementTest = this.state.placementTest || null;
    if (isPlacementTest && placementRecommendation) {
      placementTest = {
        completedAt: recordedAt,
        wpm: Math.round(wpm),
        accuracy: Math.round(accuracy),
        ...placementRecommendation
      };
      currentLesson = Math.max(currentLesson, placementRecommendation.lessonId || 1);
    }

    const allWpms = sessions.map(s => s.wpm);
    const avgWpm = allWpms.length ? Math.round(allWpms.reduce((a, b) => a + b, 0) / allWpms.length) : wpm;
    const bestWpm = Math.max(this.state.bestWpm || 0, wpm);
    const bestAccuracy = Math.max(this.state.bestAccuracy || 0, accuracy);

    const streakResult = this.calculateStreakOnPractice(today);

    this.update(prev => ({
      ...prev,
      schemaVersion: DEFAULT_STATE.schemaVersion,
      xp: prev.xp + xpEarned,
      starsByLesson,
      lessonCompletion,
      currentLesson,
      placementTest,
      sessions,
      keyStats: updatedKeyStats,
      bestWpm,
      averageWpm: avgWpm,
      bestAccuracy,
      totalPracticeTimeSec: (prev.totalPracticeTimeSec || 0) + durationSec,
      totalKeystrokes: (prev.totalKeystrokes || 0) + attemptsDelta,
      totalCorrect: (prev.totalCorrect || 0) + Math.max(0, attemptsDelta - errorsDelta),
      totalErrors: (prev.totalErrors || 0) + errorsDelta,
      dailyStreak: streakResult.currentStreak,
      bestStreak: Math.max(prev.bestStreak || 0, streakResult.currentStreak),
      lastPracticeDate: today,
      practiceDatesHistory: streakResult.history
    }));

    // A completed session is durable user data. Commit it immediately so a
    // quick tab close or browser shutdown cannot lose the latest history row.
    this.flushPersist();
  }

  calculateStreakOnPractice(todayDateStr) {
    const history = Array.from(new Set([todayDateStr, ...(this.state.practiceDatesHistory || [])])).sort().reverse();
    const lastDate = this.state.lastPracticeDate;
    let currentStreak = this.state.dailyStreak || 0;

    if (!lastDate) {
      currentStreak = 1;
    } else if (lastDate === todayDateStr) {
      currentStreak = Math.max(1, currentStreak);
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateKey(yesterday);

      if (lastDate === yesterdayStr) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
    }

    return { currentStreak, history };
  }

  // Record arcade mini-game score, wave, and award XP
  recordArcadeResult({ gameId, score = 0, wave = 1, bossDefeated = false, wpm = 0, accuracy = 100, xpEarned = 50, victory = false }) {
    const today = getLocalDateKey();
    const streakResult = this.calculateStreakOnPractice(today);

    this.update(prev => {
      const currentArcade = prev.arcadeStats || DEFAULT_STATE.arcadeStats;
      const invadersHighScore = gameId === 'type-invaders'
        ? Math.max(currentArcade.invadersHighScore || 0, score)
        : currentArcade.invadersHighScore || 0;
      const invadersMaxWave = gameId === 'type-invaders'
        ? Math.max(currentArcade.invadersMaxWave || 1, wave)
        : currentArcade.invadersMaxWave || 1;
      const invadersBossDefeated = (currentArcade.invadersBossDefeated || 0) + (bossDefeated ? 1 : 0);
      const nitroBestWpm = gameId === 'nitro-sprint'
        ? Math.max(currentArcade.nitroBestWpm || 0, wpm)
        : currentArcade.nitroBestWpm || 0;
      const matrixHighScore = gameId === 'matrix-rain'
        ? Math.max(currentArcade.matrixHighScore || 0, score)
        : currentArcade.matrixHighScore || 0;
      const rhythmHighScore = gameId === 'key-beats'
        ? Math.max(currentArcade.rhythmHighScore || 0, score)
        : currentArcade.rhythmHighScore || 0;

      return {
        ...prev,
        xp: prev.xp + xpEarned,
        arcadeStats: {
          ...currentArcade,
          invadersHighScore,
          invadersMaxWave,
          invadersBossDefeated,
          nitroBestWpm,
          matrixHighScore,
          rhythmHighScore,
          questHighScore: gameId === 'typing-quest'
            ? Math.max(currentArcade.questHighScore || 0, score)
            : currentArcade.questHighScore || 0,
          questCompletedRuns: (currentArcade.questCompletedRuns || 0) + (gameId === 'typing-quest' && victory ? 1 : 0),
          totalGamesPlayed: (currentArcade.totalGamesPlayed || 0) + 1
        },
        dailyStreak: streakResult.currentStreak,
        bestStreak: Math.max(prev.bestStreak || 0, streakResult.currentStreak),
        lastPracticeDate: today,
        practiceDatesHistory: streakResult.history
      };
    });
  }

  recordSpeedTestResult({ presetId, wpm, accuracy, consistency = 100, durationSec = 60 }) {
    const prevBests = this.state.speedTestBests || {};
    const existing = prevBests[presetId];
    const isNewPB = !existing || wpm > existing.wpm;

    const newBest = {
      wpm: Math.max(existing?.wpm || 0, Math.round(wpm)),
      accuracy: Math.round(accuracy),
      consistency: Math.round(consistency),
      date: new Date().toISOString()
    };

    this.update(prev => ({
      ...prev,
      speedTestBests: {
        ...(prev.speedTestBests || {}),
        [presetId]: isNewPB ? newBest : (prev.speedTestBests?.[presetId] || newBest)
      }
    }));

    return { isNewPB, best: newBest };
  }

  recordCodeSnippetCompleted(snippetId) {
    if (!snippetId) return;
    this.update(prev => {
      const current = prev.codeSnippetsPracticed || [];
      if (!current.includes(snippetId)) {
        return {
          ...prev,
          codeSnippetsPracticed: [...current, snippetId]
        };
      }
      return prev;
    });
  }

  toggleQuoteBookmark(quoteId) {
    const id = Number(quoteId);
    if (!Number.isFinite(id)) return false;
    let nextState = false;
    this.update(prev => {
      const bookmarks = Array.isArray(prev.quoteBookmarks) ? [...prev.quoteBookmarks] : [];
      const index = bookmarks.indexOf(id);
      if (index >= 0) {
        bookmarks.splice(index, 1);
        nextState = false;
      } else {
        bookmarks.push(id);
        nextState = true;
      }
      return {
        ...prev,
        quoteBookmarks: bookmarks
      };
    });
    return nextState;
  }

  isQuoteBookmarked(quoteId) {
    const id = Number(quoteId);
    return Array.isArray(this.state.quoteBookmarks) && this.state.quoteBookmarks.includes(id);
  }

  getQuoteStats(quoteId) {
    const id = Number(quoteId);
    const targetLessonId = `quote-${id}`;
    let count = 0;
    let bestWpm = 0;
    let bestAccuracy = 0;
    let lastDate = null;

    const sessions = this.state.sessions || [];
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (s && (s.lessonId === targetLessonId || (s.lessonId === id && s.kind === 'quote'))) {
        count++;
        if (s.wpm > bestWpm) bestWpm = s.wpm;
        if (s.accuracy > bestAccuracy) bestAccuracy = s.accuracy;
        if (!lastDate || new Date(s.date) > new Date(lastDate)) {
          lastDate = s.date;
        }
      }
    }

    return {
      count,
      bestWpm,
      bestAccuracy,
      lastDate
    };
  }

  getAllQuoteStats() {
    const statsMap = {};
    const sessions = this.state.sessions || [];
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (!s || !s.lessonId) continue;
      let qId = null;
      if (typeof s.lessonId === 'string' && s.lessonId.startsWith('quote-')) {
        qId = parseInt(s.lessonId.replace('quote-', ''), 10);
      } else if (s.kind === 'quote' && Number.isInteger(s.lessonId)) {
        qId = s.lessonId;
      }
      if (qId !== null && !isNaN(qId)) {
        if (!statsMap[qId]) {
          statsMap[qId] = {
            count: 0,
            bestWpm: 0,
            bestAccuracy: 0,
            lastDate: null
          };
        }
        const item = statsMap[qId];
        item.count++;
        if (s.wpm > item.bestWpm) item.bestWpm = s.wpm;
        if (s.accuracy > item.bestAccuracy) item.bestAccuracy = s.accuracy;
        if (!item.lastDate || new Date(s.date) > new Date(item.lastDate)) {
          item.lastDate = s.date;
        }
      }
    }
    return statsMap;
  }

  // Delete a single session by date or index
  deleteSession(sessionDateOrIndex) {
    this.update(prev => {
      let filtered;
      if (typeof sessionDateOrIndex === 'number') {
        filtered = prev.sessions.filter((_, idx) => idx !== sessionDateOrIndex);
      } else {
        filtered = prev.sessions.filter(s => s.date !== sessionDateOrIndex);
      }
      const allWpms = filtered.map(s => s.wpm);
      const avgWpm = allWpms.length ? Math.round(allWpms.reduce((a, b) => a + b, 0) / allWpms.length) : 0;
      return {
        ...prev,
        sessions: filtered,
        averageWpm: avgWpm
      };
    });
    this.flushPersist();
  }

  // Clear all session history while preserving progress/stars
  clearSessionHistory() {
    this.update(prev => ({
      ...prev,
      sessions: [],
      averageWpm: 0
    }));
    this.flushPersist();
  }

  // Export state to downloadable JSON string
  exportBackupJson() {
    return JSON.stringify({
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      data: this.state
    }, null, 2);
  }

  // Import state from JSON string with validation
  importBackupJson(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      const data = parsed.data || parsed;
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('Invalid JSON structure');
      }

      const arrayFields = [
        'sessions', 'practiceDatesHistory', 'quotesPracticed', 'quoteBookmarks',
        'languagesPracticed', 'codeSnippetsPracticed'
      ];
      arrayFields.forEach(field => {
        if (data[field] !== undefined && !Array.isArray(data[field])) {
          throw new Error(`Invalid backup field: ${field} must be an array`);
        }
      });

      const objectFields = [
        'settings', 'dailyChallengeState', 'starsByLesson', 'lessonCompletion',
        'achievementsUnlocked', 'keyStats', 'arcadeStats', 'speedTestBests'
      ];
      objectFields.forEach(field => {
        if (data[field] !== undefined && (
          data[field] === null || typeof data[field] !== 'object' || Array.isArray(data[field])
        )) {
          throw new Error(`Invalid backup field: ${field} must be an object`);
        }
      });

      const xp = Number(data.xp ?? 0);
      if (!Number.isFinite(xp) || xp < 0) throw new Error('Invalid backup field: xp');

      const safeData = {
        ...data,
        xp: Math.round(xp),
        sessions: (data.sessions || []).filter(s => s && typeof s === 'object' && !Array.isArray(s)),
        practiceDatesHistory: (data.practiceDatesHistory || []).filter(value => typeof value === 'string')
      };

      this.state = {
        ...DEFAULT_STATE,
        ...safeData,
        settings: {
          ...DEFAULT_STATE.settings,
          ...(safeData.settings || {}),
          isPremium: true,
          goals: {
            ...DEFAULT_STATE.settings.goals,
            ...(safeData.settings?.goals || {})
          },
          wellness: {
            ...DEFAULT_STATE.settings.wellness,
            ...(safeData.settings?.wellness || {})
          }
        },
        dailyChallengeState: {
          ...DEFAULT_STATE.dailyChallengeState,
          ...(safeData.dailyChallengeState || {})
        }
      };
      this.state.schemaVersion = DEFAULT_STATE.schemaVersion;
      this.state.level = getLevelFromXp(this.state.xp);
      this.persist();
      this.notify();
      return { success: true };
    } catch (err) {
      console.error('Failed to import backup JSON:', err);
      return { success: false, error: err.message };
    }
  }

  resetAll() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    this.notify();
  }

  seedDemo() {
    const today = getLocalDateKey();
    const demoStars = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3, 9: 2, 10: 2, 11: 3, 12: 2 };
    const demoCompletion = {};
    for (let i = 1; i <= 12; i++) {
      demoCompletion[i] = {
        completed: true,
        bestWpm: Math.floor(45 + Math.random() * 20),
        bestAccuracy: Math.floor(92 + Math.random() * 7),
        attempts: Math.floor(2 + Math.random() * 4)
      };
    }

    const demoKeyStats = {};
    'abcdefghijklmnopqrstuvwxyz,.;'.split('').forEach(char => {
      const isWeak = ['r', 't', ';', 'q', 'p'].includes(char);
      const attempts = Math.floor(150 + Math.random() * 300);
      const errors = isWeak ? Math.floor(attempts * 0.18) : Math.floor(attempts * 0.04);
      demoKeyStats[char] = {
        attempts,
        errors,
        totalLatencyMs: attempts * (isWeak ? 320 : 180)
      };
    });

    const now = Date.now();
    const ONE_DAY = 86400000;
    const practiceDates = [];
    for (let i = 6; i >= 0; i--) {
      practiceDates.push(getLocalDateKey(new Date(now - i * ONE_DAY)));
    }

    // Generate realistic multi-day session timeline across the last 7 days
    const demoSessions = [
      { date: new Date(now - 1000 * 60 * 15).toISOString(), lessonId: 12, lessonTitle: 'Top & Home Flow', wpm: 68, accuracy: 98, durationSec: 75, stars: 3, xpEarned: 85, kind: 'lesson' },
      { date: new Date(now - 1000 * 60 * 60 * 2).toISOString(), lessonId: 'speed-test-60s', lessonTitle: 'Speed Test (60s)', wpm: 64, accuracy: 96, durationSec: 60, stars: 3, xpEarned: 70, kind: 'speedtest' },
      { date: new Date(now - 1000 * 60 * 60 * 5).toISOString(), lessonId: 11, lessonTitle: 'Top + Home Combinations', wpm: 61, accuracy: 97, durationSec: 68, stars: 3, xpEarned: 80, kind: 'lesson' },
      { date: new Date(now - ONE_DAY - 1000 * 60 * 60 * 3).toISOString(), lessonId: 10, lessonTitle: 'Rhythm & Word Cadence', wpm: 58, accuracy: 95, durationSec: 72, stars: 2, xpEarned: 65, kind: 'lesson' },
      { date: new Date(now - ONE_DAY - 1000 * 60 * 60 * 7).toISOString(), lessonId: 'js-syntax', lessonTitle: 'Code Arena: JavaScript ES6+', wpm: 52, accuracy: 94, durationSec: 90, stars: 2, xpEarned: 60, kind: 'code' },
      { date: new Date(now - ONE_DAY * 2 - 1000 * 60 * 60 * 4).toISOString(), lessonId: 9, lessonTitle: 'Bottom Row C & M Keys', wpm: 56, accuracy: 96, durationSec: 70, stars: 3, xpEarned: 75, kind: 'lesson' },
      { date: new Date(now - ONE_DAY * 2 - 1000 * 60 * 60 * 9).toISOString(), lessonId: 8, lessonTitle: 'Bottom Row Anchors', wpm: 53, accuracy: 93, durationSec: 65, stars: 2, xpEarned: 55, kind: 'lesson' },
      { date: new Date(now - ONE_DAY * 3 - 1000 * 60 * 60 * 2).toISOString(), lessonId: 7, lessonTitle: 'Top Row Reaches', wpm: 50, accuracy: 96, durationSec: 60, stars: 3, xpEarned: 70, kind: 'lesson' },
      { date: new Date(now - ONE_DAY * 3 - 1000 * 60 * 60 * 6).toISOString(), lessonId: 'quote-1', lessonTitle: 'Quote Vault: Seneca on Time', wpm: 48, accuracy: 98, durationSec: 85, stars: 3, xpEarned: 80, kind: 'quote' },
      { date: new Date(now - ONE_DAY * 4 - 1000 * 60 * 60 * 5).toISOString(), lessonId: 6, lessonTitle: 'Index Finger Extensions', wpm: 47, accuracy: 94, durationSec: 65, stars: 2, xpEarned: 55, kind: 'lesson' },
      { date: new Date(now - ONE_DAY * 5 - 1000 * 60 * 60 * 3).toISOString(), lessonId: 5, lessonTitle: 'Middle & Ring Agility', wpm: 45, accuracy: 92, durationSec: 62, stars: 2, xpEarned: 50, kind: 'lesson' },
      { date: new Date(now - ONE_DAY * 6 - 1000 * 60 * 60 * 4).toISOString(), lessonId: 4, lessonTitle: 'Home Row Cadence', wpm: 42, accuracy: 97, durationSec: 58, stars: 3, xpEarned: 65, kind: 'lesson' }
    ];

    const demoState = {
      schemaVersion: DEFAULT_STATE.schemaVersion,
      onboardingComplete: true,
      targetWpm: 60,
      xp: 2850,
      level: 12,
      starsByLesson: demoStars,
      lessonCompletion: demoCompletion,
      currentLesson: 13,
      dailyStreak: 7,
      bestStreak: 7,
      lastPracticeDate: today,
      practiceDatesHistory: practiceDates,
      achievementsUnlocked: {
        'first_steps': now - ONE_DAY * 6,
        'home_row_hero': now - ONE_DAY * 5,
        'top_row_master': now - ONE_DAY * 3,
        'centurion': now - ONE_DAY * 2,
        'speed_demon': now - ONE_DAY
      },
      keyStats: demoKeyStats,
      sessions: demoSessions,
      totalKeystrokes: 6820,
      totalCorrect: 6450,
      totalErrors: 370,
      totalPracticeTimeSec: 1840,
      bestWpm: 68,
      averageWpm: 54,
      bestAccuracy: 98,
      placementTest: null,
      settings: {
        isPremium: true,
        soundEnabled: true,
        soundVolume: 0.6,
        switchProfile: 'cherry_blue',
        theme: 'dark',
        layout: 'qwerty',
        keyboardVisible: true,
        handGuideVisible: true,
        reachBannerVisible: true,
        textSize: 'medium',
        reducedMotion: false,
        highContrast: false,
        difficulty: 'balanced',
        ghostMode: 'bot',
        botWpm: 50,
        blindMode: false,
        suddenDeath: false,
        wordCorrectionMode: false,
        metronomeEnabled: false,
        metronomeBpm: 100
      },
      dailyChallengeState: {
        date: today,
        completed: false,
        bestWpm: 0,
        bestAccuracy: 0
      }
    };

    this.state = demoState;
    this.persist();
    this.notify();
  }

  seedDemoData() {
    this.seedDemo();
  }
}

export const store = new StateStore();
