/**
 * Central State Store & Persistence Layer
 * Manages reactive state, localStorage sync, safe schema recovery, XP curve,
 * JSON backup/restore portability, and extended customization settings.
 */

import { MASTERED_STARS, PASSING_STARS, PERFECT_STARS } from './mastery.js';

const STORAGE_KEY = 'typing_tutor_progress';

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
  const nextLvlXp = currentLvl >= 30 ? currentLvlXp + 5000 : getXpForLevel(currentLvl + 1);
  const progressXp = xp - currentLvlXp;
  const neededXp = nextLvlXp - currentLvlXp;
  const pct = Math.min(100, Math.max(0, Math.round((progressXp / neededXp) * 100)));
  const title = LEVEL_TITLES[currentLvl - 1] || 'Grandmaster Typist';

  return {
    currentLvl,
    title,
    currentLvlXp,
    nextLvlXp,
    progressXp,
    neededXp,
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
    isPremium: false,         // Premium mode unlock (no payment, just a toggle)
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
  zenSessionsCompleted: 0,     // Count of completed Zen mode sessions
  languagesPracticed: [],      // Array of language codes practiced
};

class StateStore {
  constructor() {
    this.subscribers = new Set();
    this.saveTimeout = null;
    this.state = this.loadState();

    // Preserve the latest setting if the page is refreshed before the
    // debounced persistence timer has fired.
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this.flushPersist());
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
      const state = {
        ...DEFAULT_STATE,
        ...parsed,
        settings: {
          ...DEFAULT_STATE.settings,
          ...parsedSettings,
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
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.writeToStorage();
    }, 150);
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
    if (!this.saveTimeout) return;

    clearTimeout(this.saveTimeout);
    this.saveTimeout = null;
    this.writeToStorage();
  }

  update(updater) {
    if (typeof updater === 'function') {
      this.state = updater(this.state);
    } else {
      this.state = { ...this.state, ...updater };
    }
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
    placementRecommendation = null
  }) {
    const today = new Date().toISOString().split('T')[0];
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
    const newSession = {
      date: recordedAt,
      lessonId,
      lessonTitle: lessonTitle || `Lesson ${lessonId}`,
      wpm: Math.round(wpm),
      accuracy: Math.round(accuracy),
      durationSec: Math.round(durationSec),
      stars: sessionStars,
      xpEarned,
      wpmHistory: wpmHistory || [],
      kind: isPlacementTest ? 'placement' : isCurriculumLesson ? 'lesson' : 'practice',
      mastery: isCurriculumLesson ? sessionMastery : null
    };

    const sessions = [newSession, ...(this.state.sessions || [])].slice(0, 50);

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
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastDate === yesterdayStr) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
    }

    return { currentStreak, history };
  }

  // Record arcade mini-game score, wave, and award XP
  recordArcadeResult({ gameId, score = 0, wave = 1, bossDefeated = false, wpm = 0, accuracy = 100, xpEarned = 50 }) {
    const today = new Date().toISOString().split('T')[0];
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
          invadersHighScore,
          invadersMaxWave,
          invadersBossDefeated,
          nitroBestWpm,
          matrixHighScore,
          rhythmHighScore,
          totalGamesPlayed: (currentArcade.totalGamesPlayed || 0) + 1
        },
        dailyStreak: streakResult.currentStreak,
        bestStreak: Math.max(prev.bestStreak || 0, streakResult.currentStreak),
        lastPracticeDate: today,
        practiceDatesHistory: streakResult.history
      };
    });
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
      if (typeof data !== 'object' || data === null) throw new Error('Invalid JSON structure');

      this.state = {
        ...DEFAULT_STATE,
        ...data,
        settings: {
          ...DEFAULT_STATE.settings,
          ...(data.settings || {})
        },
        dailyChallengeState: {
          ...DEFAULT_STATE.dailyChallengeState,
          ...(data.dailyChallengeState || {})
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
    const today = new Date().toISOString().split('T')[0];
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

    const demoState = {
      schemaVersion: DEFAULT_STATE.schemaVersion,
      onboardingComplete: true,
      targetWpm: 60,
      xp: 2850,
      level: 12,
      starsByLesson: demoStars,
      lessonCompletion: demoCompletion,
      currentLesson: 13,
      dailyStreak: 5,
      bestStreak: 7,
      lastPracticeDate: today,
      practiceDatesHistory: [today],
      achievementsUnlocked: {
        'first_steps': Date.now() - 86400000 * 5,
        'home_row_hero': Date.now() - 86400000 * 4,
        'top_row_master': Date.now() - 86400000 * 2,
        'centurion': Date.now() - 86400000 * 1,
        'speed_demon': Date.now() - 86400000 * 1
      },
      keyStats: demoKeyStats,
      sessions: [
        { date: new Date().toISOString(), lessonId: 12, lessonTitle: 'Top & Home Flow', wpm: 58, accuracy: 96, durationSec: 75, stars: 2, xpEarned: 65 },
        { date: new Date(Date.now() - 3600000).toISOString(), lessonId: 11, lessonTitle: 'Top + Home Combinations', wpm: 55, accuracy: 98, durationSec: 68, stars: 3, xpEarned: 85 }
      ],
      totalKeystrokes: 6820,
      totalCorrect: 6450,
      totalErrors: 370,
      totalPracticeTimeSec: 1840,
      bestWpm: 64,
      averageWpm: 54,
      bestAccuracy: 99,
      placementTest: null,
      settings: {
        soundEnabled: true,
        soundVolume: 0.6,
        switchProfile: 'cherry_blue',
        theme: 'dark',
        layout: 'qwerty',
        keyboardVisible: true,
        handGuideVisible: true,
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
}

export const store = new StateStore();
