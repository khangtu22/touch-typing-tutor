/**
 * Ghost Racer & AI Bot Pacemaker Engine
 * Simulates head-to-head typing races against personal bests or calibrated AI bots.
 */

export const BOTS = [
  { id: 'turtle', name: 'Turtle Bot', wpm: 30, avatar: '🐢' },
  { id: 'fox', name: 'Fox Bot', wpm: 50, avatar: '🦊' },
  { id: 'falcon', name: 'Falcon Bot', wpm: 80, avatar: '🦅' },
  { id: 'cyber', name: 'Cyber Bot', wpm: 110, avatar: '⚡' }
];

export class GhostRacer {
  constructor() {
    this.isActive = false;
    this.startTime = null;
    this.mode = 'bot'; // 'off' | 'personal_best' | 'bot'
    this.botWpm = 50;
    this.totalChars = 100;
    this.bestRun = null;
  }

  startRace({ totalChars = 100, mode = 'bot', botWpm = 50, bestRun = null }) {
    this.isActive = mode !== 'off';
    this.mode = mode;
    this.botWpm = botWpm;
    this.totalChars = Math.max(1, totalChars);
    this.bestRun = bestRun;
    this.startTime = null;
  }

  getCompetitorInfo() {
    if (this.mode === 'personal_best' && this.bestRun && this.bestRun.durationSec) {
      return {
        name: `Personal Best (${this.bestRun.wpm} WPM)`,
        avatar: '👻'
      };
    }
    const botObj = BOTS.find(b => b.wpm === this.botWpm) || { name: `${this.botWpm} WPM Bot`, avatar: '🤖' };
    return {
      name: botObj.name,
      avatar: botObj.avatar
    };
  }

  update(userProgressPct = 0, isTypingStarted = false) {
    if (!this.isActive) {
      return { isEnabled: false };
    }

    const competitor = this.getCompetitorInfo();

    // If typing hasn't started yet, keep both racers at the starting line (0%)
    if (!isTypingStarted) {
      this.startTime = null;
      return {
        isEnabled: true,
        userPct: 0,
        competitorPct: 0,
        competitorName: competitor.name,
        competitorAvatar: competitor.avatar,
        deltaPct: 0,
        leadStatus: 'tied'
      };
    }

    if (!this.startTime) {
      this.startTime = Date.now();
    }

    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    let competitorPct = 0;

    if (this.mode === 'personal_best' && this.bestRun && this.bestRun.durationSec) {
      competitorPct = Math.min(100, (elapsedSeconds / this.bestRun.durationSec) * 100);
    } else {
      // AI Bot calculation: target WPM -> chars per second = (wpm * 5) / 60
      const charsPerSec = (this.botWpm * 5) / 60;
      const competitorCharsTyped = charsPerSec * elapsedSeconds;
      competitorPct = Math.min(100, (competitorCharsTyped / this.totalChars) * 100);
    }

    const deltaPct = Math.round(userProgressPct - competitorPct);
    const leadStatus = deltaPct > 3 ? 'leading' : deltaPct < -3 ? 'trailing' : 'tied';

    return {
      isEnabled: true,
      userPct: Math.min(100, Math.max(0, userProgressPct)),
      competitorPct: Math.min(100, Math.max(0, Math.round(competitorPct))),
      competitorName: competitor.name,
      competitorAvatar: competitor.avatar,
      deltaPct,
      leadStatus
    };
  }

  stopRace() {
    this.isActive = false;
    this.startTime = null;
  }
}

export const ghostRacer = new GhostRacer();
