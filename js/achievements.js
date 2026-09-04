/**
 * 20 Milestone Achievements Engine
 * Evaluates unlock conditions, tracks progress, and triggers celebrations.
 */

import { sound } from './sound-engine.js';
import { AnalyticsEngine } from './analytics.js';
import { getLocalDateKey } from './state.js';
import { QUOTE_VAULT } from './premium-features.js';

export const ACHIEVEMENTS = [
  {
    id: 'first_steps',
    title: 'First Steps',
    description: 'Complete your first touch-typing lesson.',
    icon: '🚀',
    category: 'progression',
    check: (state, session) => session && (session.lessonId === 1 || session.lessonId === '1')
  },
  {
    id: 'home_row_hero',
    title: 'Home Row Hero',
    description: 'Earn 3 stars on all 6 Home Row lessons.',
    icon: '👑',
    category: 'mastery',
    check: (state) => {
      const stars = state.starsByLesson || {};
      for (let i = 1; i <= 6; i++) {
        if ((stars[i] || 0) < 3) return false;
      }
      return true;
    }
  },
  {
    id: 'top_row_master',
    title: 'Top Row Master',
    description: 'Complete all Level 2 Top Row lessons.',
    icon: '⚡',
    category: 'progression',
    check: (state) => {
      const comp = state.lessonCompletion || {};
      for (let i = 7; i <= 12; i++) {
        if (!comp[i]?.completed) return false;
      }
      return true;
    }
  },
  {
    id: 'bottom_row_master',
    title: 'Bottom Row Master',
    description: 'Complete all Level 3 Bottom Row lessons.',
    icon: '⚓',
    category: 'progression',
    check: (state) => {
      const comp = state.lessonCompletion || {};
      for (let i = 13; i <= 18; i++) {
        if (!comp[i]?.completed) return false;
      }
      return true;
    }
  },
  {
    id: 'all_ten',
    title: 'All Ten Fingers',
    description: 'Achieve 80%+ accuracy across all 10 fingers.',
    icon: '🖐️',
    category: 'mastery',
    check: (state) => {
      const mastery = AnalyticsEngine.getFingerMastery(state.keyStats || {});
      const practiced = mastery.filter(m => m.totalAttempts >= 10);
      return practiced.length >= 8 && practiced.every(m => m.accuracy >= 80);
    }
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Reach 50 WPM in any lesson.',
    icon: '🔥',
    category: 'speed',
    check: (state, session) => (session?.wpm >= 50) || (state.bestWpm >= 50)
  },
  {
    id: 'lightning_fast',
    title: 'Lightning Fast',
    description: 'Reach 75 WPM in any lesson.',
    icon: '⚡',
    category: 'speed',
    check: (state, session) => (session?.wpm >= 75) || (state.bestWpm >= 75)
  },
  {
    id: 'centurion',
    title: 'Centurion',
    description: 'Achieve an unbroken 100-character combo.',
    icon: '🎯',
    category: 'combo',
    check: (state, session) => (session?.maxCombo >= 100)
  },
  {
    id: 'combo_king',
    title: 'Combo King',
    description: 'Achieve an unbroken 200-character combo.',
    icon: '🛡️',
    category: 'combo',
    check: (state, session) => (session?.maxCombo >= 200)
  },
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    description: 'Complete a lesson with 100% flawless accuracy.',
    icon: '💎',
    category: 'accuracy',
    check: (state, session) => session && session.accuracy === 100 && session.totalKeystrokes >= 40
  },
  {
    id: 'keystrokes_1k',
    title: '1,000 Keystrokes',
    description: 'Type a lifetime total of 1,000 keystrokes.',
    icon: '⌨️',
    category: 'volume',
    check: (state) => (state.totalKeystrokes || 0) >= 1000
  },
  {
    id: 'keystrokes_10k',
    title: '10,000 Keystrokes',
    description: 'Type a lifetime total of 10,000 keystrokes.',
    icon: '🏆',
    category: 'volume',
    check: (state) => (state.totalKeystrokes || 0) >= 10000
  },
  {
    id: 'week_warrior',
    title: 'Week Warrior',
    description: 'Maintain a 7-day daily practice streak.',
    icon: '🔥',
    category: 'streak',
    check: (state) => (state.dailyStreak || 0) >= 7 || (state.bestStreak || 0) >= 7
  },
  {
    id: 'marathon_typist',
    title: 'Marathon Typist',
    description: 'Accumulate 30 minutes of total practice time.',
    icon: '⏱️',
    category: 'volume',
    check: (state) => (state.totalPracticeTimeSec || 0) >= 1800
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Complete a typing lesson between 10 PM and 4 AM.',
    icon: '🦉',
    category: 'special',
    check: () => {
      const hour = new Date().getHours();
      return hour >= 22 || hour < 4;
    }
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Complete a typing lesson between 5 AM and 8 AM.',
    icon: '🌅',
    category: 'special',
    check: () => {
      const hour = new Date().getHours();
      return hour >= 5 && hour < 8;
    }
  },
  {
    id: 'daily_grinder',
    title: 'Daily Grinder',
    description: 'Complete 3 lessons in a single calendar day.',
    icon: '⚙️',
    category: 'dedication',
    check: (state) => {
      const today = getLocalDateKey();
      const todaySessions = (state.sessions || []).filter(s => getLocalDateKey(s.date || s.recordedAt) === today);
      return todaySessions.length >= 3;
    }
  },
  {
    id: 'three_star_student',
    title: '3-Star Student',
    description: 'Earn 3 stars on 10 different lessons.',
    icon: '⭐',
    category: 'mastery',
    check: (state) => {
      const threeStarCount = Object.values(state.starsByLesson || {}).filter(s => s >= 3).length;
      return threeStarCount >= 10;
    }
  },
  {
    id: 'errorless_lesson',
    title: 'Errorless Run',
    description: 'Complete a lesson with 0 errors.',
    icon: '✨',
    category: 'accuracy',
    check: (state, session) => session && session.totalErrors === 0 && session.totalKeystrokes >= 50
  },
  {
    id: 'grandmaster',
    title: 'Grandmaster Typist',
    description: 'Complete all 30 curriculum lessons.',
    icon: '🌟',
    category: 'mastery',
    check: (state) => {
      const comp = state.lessonCompletion || {};
      for (let i = 1; i <= 30; i++) {
        if (!comp[i]?.completed) return false;
      }
      return true;
    }
  },
  // --- Premium Achievements ---
  {
    id: 'quote_collector',
    title: 'Quote Collector',
    description: 'Practice with 10 different quotes from the Quote Vault.',
    icon: '📖',
    category: 'premium',
    xpBonus: 100,
    check: (state) => (state.quotesPracticed || []).length >= 10
  },
  {
    id: 'zen_master',
    title: 'Zen Master',
    description: 'Complete 5 Zen Mode typing sessions.',
    icon: '🧘',
    category: 'premium',
    xpBonus: 150,
    check: (state) => (state.zenSessionsCompleted || 0) >= 5
  },
  {
    id: 'multilingual',
    title: 'Multilingual',
    description: 'Practice typing in 3 different languages.',
    icon: '🌍',
    category: 'premium',
    xpBonus: 200,
    check: (state) => (state.languagesPracticed || []).length >= 3
  },
  {
    id: 'focus_master',
    title: 'Deep Focus',
    description: 'Complete a lesson in Focus Mode.',
    icon: '🎯',
    category: 'premium',
    xpBonus: 75,
    check: (state) => (state.sessions || []).some(s => s.inFocusMode === true)
  },
  {
    id: 'theme_creator',
    title: 'Theme Creator',
    description: 'Create your first custom keyboard theme.',
    icon: '🎨',
    category: 'premium',
    xpBonus: 50,
    check: () => {
      try {
        const themes = JSON.parse(localStorage.getItem('typing_tutor_custom_themes') || '[]');
        return themes.length >= 1;
      } catch { return false; }
    }
  },
  // --- Arcade Gaming Achievements ---
  {
    id: 'space_cadet',
    title: 'Space Cadet',
    description: 'Clear Wave 3 in Type Invaders: Orbit Defense.',
    icon: '🚀',
    category: 'arcade',
    xpBonus: 100,
    check: (state) => (state.arcadeStats?.invadersMaxWave || 1) >= 3
  },
  {
    id: 'orbital_defender',
    title: 'Orbital Defender',
    description: 'Defeat the Mothership Boss in Type Invaders.',
    icon: '🛸',
    category: 'arcade',
    xpBonus: 250,
    check: (state) => (state.arcadeStats?.invadersBossDefeated || 0) >= 1
  },
  {
    id: 'nitro_typist',
    title: 'Nitro Typist',
    description: 'Achieve 70+ WPM in Nitro Sprint Drag Race.',
    icon: '🏎️',
    category: 'arcade',
    xpBonus: 150,
    check: (state) => (state.arcadeStats?.nitroBestWpm || 0) >= 70
  },
  {
    id: 'arcade_champion',
    title: 'Arcade Champion',
    description: 'Score 5,000+ points in a single Type Invaders game.',
    icon: '🕹️',
    category: 'arcade',
    xpBonus: 200,
    check: (state) => (state.arcadeStats?.invadersHighScore || 0) >= 5000
  },
  {
    id: 'code_breaker',
    title: 'Cyber Code Breaker',
    description: 'Exfiltrate 3,000+ KB in Matrix Rain: Code Breaker.',
    icon: '💻',
    category: 'arcade',
    xpBonus: 150,
    check: (state) => (state.arcadeStats?.matrixHighScore || 0) >= 3000
  },
  {
    id: 'rhythm_master',
    title: 'KeyBeats Virtuoso',
    description: 'Score 10,000+ points in KeyBeats: Rhythm Flow.',
    icon: '🎵',
    category: 'arcade',
    xpBonus: 150,
    check: (state) => (state.arcadeStats?.rhythmHighScore || 0) >= 10000
  },
  {
    id: 'goal_achiever',
    title: 'Goal Achiever',
    description: 'Meet your daily practice goal 3 days in a row.',
    icon: '🏅',
    category: 'premium',
    xpBonus: 125,
    check: (state) => (state.dailyStreak || 0) >= 3 || (state.goalStreakDays || 0) >= 3
  },
  {
    id: 'literary_typist',
    title: 'Literary Typist',
    description: 'Practice 5 literature quotes from the Quote Vault.',
    icon: '📚',
    category: 'premium',
    xpBonus: 75,
    check: (state) => (state.quotesPracticed || []).filter(id => {
      const q = QUOTE_VAULT.find(item => item.id === id);
      return (q && q.category === 'literature') || (typeof id === 'string' && id.startsWith('lit_'));
    }).length >= 5
  },
  {
    id: 'sonic_explorer',
    title: 'Sonic Explorer',
    description: 'Try all 5 Zen Mode ambient soundscapes.',
    icon: '🎵',
    category: 'premium',
    xpBonus: 75,
    check: (state) => (state.zenSoundscapesUsed || []).length >= 5
  },
  {
    id: 'wellness_champion',
    title: 'Wellness Champion',
    description: 'Take 10 ergonomic break reminders.',
    icon: '🧘‍♂️',
    category: 'premium',
    xpBonus: 100,
    check: (state) => (state.breaksTaken || 0) >= 10
  },
  {
    id: 'code_ninja',
    title: 'Code Ninja',
    description: 'Practice 3 programming code snippets in Code Arena.',
    icon: '💻',
    category: 'premium',
    xpBonus: 150,
    check: (state) => (state.codeSnippetsPracticed || []).length >= 3
  },
  {
    id: 'speed_demon_60',
    title: '60s Benchmark Master',
    description: 'Reach 60+ WPM in a 60-Second Speed Benchmark Test.',
    icon: '⚡',
    category: 'speed',
    xpBonus: 150,
    check: (state) => (state.speedTestBests?.['60s']?.wpm || 0) >= 60
  },
  {
    id: 'certified_master',
    title: 'Certified Master',
    description: 'Attain 70+ WPM qualifying for official Master Certification.',
    icon: '📜',
    category: 'milestone',
    xpBonus: 200,
    check: (state) => (state.bestWpm || 0) >= 70
  }
];

export class AchievementEngine {
  /**
   * Evaluates all achievements against state and returns newly unlocked ones
   */
  static evaluate(stateStore, currentSession = null) {
    const state = stateStore.getState();
    const currentUnlocked = { ...(state.achievementsUnlocked || {}) };
    const newlyUnlocked = [];

    ACHIEVEMENTS.forEach(ach => {
      if (!currentUnlocked[ach.id]) {
        try {
          if (ach.check(state, currentSession)) {
            currentUnlocked[ach.id] = Date.now();
            newlyUnlocked.push(ach);
          }
        } catch (e) {
          console.warn('Achievement check error for', ach.id, e);
        }
      }
    });

    if (newlyUnlocked.length > 0) {
      const totalXpBonus = newlyUnlocked.reduce((sum, ach) => sum + (ach.xpBonus || 50), 0);
      stateStore.update(prev => ({
        ...prev,
        achievementsUnlocked: currentUnlocked,
        xp: prev.xp + totalXpBonus
      }));

      sound.playAchievement();
    }

    return newlyUnlocked;
  }
}
