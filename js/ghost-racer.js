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

  update(userProgressPct = 0) {
    if (!this.isActive) {
      return { isEnabled: false };
    }

    if (!this.startTime) {
      this.startTime = Date.now();
    }

    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    let competitorPct = 0;
    let competitorName = 'AI Bot';
    let competitorAvatar = '🤖';

    if (this.mode === 'personal_best' && this.bestRun && this.bestRun.durationSec) {
      competitorName = `Personal Best (${this.bestRun.wpm} WPM)`;
      competitorAvatar = '👻';
      competitorPct = Math.min(100, (elapsedSeconds / this.bestRun.durationSec) * 100);
    } else {
      // AI Bot calculation: target WPM -> chars per second = (wpm * 5) / 60
      const botObj = BOTS.find(b => b.wpm === this.botWpm) || { name: `${this.botWpm} WPM Bot`, avatar: '🤖' };
      competitorName = botObj.name;
      competitorAvatar = botObj.avatar;

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
      competitorName,
      competitorAvatar,
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
