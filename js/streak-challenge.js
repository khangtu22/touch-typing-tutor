/**
 * Daily Streak & Daily Challenge Engine
 * Manages consecutive practice streaks without timezone glitches
 * and provides date-seeded daily fluency trials.
 */

import { getDailyChallengeLesson } from './curriculum.js';

export class StreakEngine {
  static getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  static getYesterdayString() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  /**
   * Evaluates streak status on application startup
   */
  static evaluateStreakStatus(stateStore) {
    const state = stateStore.getState();
    const today = this.getTodayString();
    const yesterday = this.getYesterdayString();
    const lastPractice = state.lastPracticeDate;

    if (!lastPractice) {
      return {
        streak: 0,
        practicedToday: false,
        isBroken: false
      };
    }

    if (lastPractice === today) {
      return {
        streak: state.dailyStreak,
        practicedToday: true,
        isBroken: false
      };
    }

    if (lastPractice === yesterday) {
      return {
        streak: state.dailyStreak,
        practicedToday: false,
        isBroken: false
      };
    }

    // Missed yesterday and today -> streak broken
    if (state.dailyStreak > 0) {
      stateStore.update(prev => ({
        ...prev,
        dailyStreak: 0
      }));
    }

    return {
      streak: 0,
      practicedToday: false,
      isBroken: true
    };
  }

  /**
   * Retrieves or initializes today's Daily Challenge
   */
  static getDailyChallenge(stateStore) {
    const today = this.getTodayString();
    const state = stateStore.getState();
    const challengeLesson = getDailyChallengeLesson(today);

    const isCompletedToday = state.dailyChallengeState?.date === today && state.dailyChallengeState?.completed;

    return {
      lesson: challengeLesson,
      date: today,
      isCompleted: !!isCompletedToday,
      bestWpm: state.dailyChallengeState?.bestWpm || 0,
      bestAccuracy: state.dailyChallengeState?.bestAccuracy || 0
    };
  }

  /**
   * Records completion of the daily challenge
   */
  static recordDailyChallengeCompletion(stateStore, { wpm, accuracy }) {
    const today = this.getTodayString();
    stateStore.update(prev => ({
      ...prev,
      xp: prev.xp + 50, // +50 Bonus XP for Daily Challenge
      dailyChallengeState: {
        date: today,
        completed: true,
        bestWpm: Math.max(prev.dailyChallengeState?.bestWpm || 0, wpm),
        bestAccuracy: Math.max(prev.dailyChallengeState?.bestAccuracy || 0, accuracy)
      }
    }));
  }
}
