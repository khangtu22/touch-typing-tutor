/**
 * Analytics, Heatmap Calculations, Finger Mastery & SVG Graph Generator
 * Computes deep diagnostic metrics, per-finger mastery, weak key identification,
 * smart actionable recommendations, and lightweight SVG sparklines.
 */

import { FINGERS, KEY_TO_FINGER } from './finger-mapping.js';

export class AnalyticsEngine {
  /**
   * Identifies the user's most problematic keys based on historical error rates
   */
  static getWeakKeys(keyStats = {}, limit = 4) {
    const list = [];
    Object.entries(keyStats).forEach(([char, stats]) => {
      const attempts = stats.attempts || 0;
      const errors = stats.errors || 0;
      if (attempts >= 8 && char.trim() !== '') {
        const errorRate = errors / attempts;
        const accuracy = ((attempts - errors) / attempts) * 100;
        const avgLatency = Math.round(stats.totalLatencyMs / attempts);

        if (errorRate > 0.06 || accuracy < 94) {
          list.push({
            char,
            attempts,
            errors,
            errorRate,
            accuracy: Math.round(accuracy),
            avgLatency
          });
        }
      }
    });

    list.sort((a, b) => b.errorRate - a.errorRate);
    return list.slice(0, limit);
  }

  /**
   * Computes per-finger mastery percentage based on all characters assigned to each finger
   */
  static getFingerMastery(keyStats = {}) {
    const fingerStats = {};

    Object.values(FINGERS).forEach(finger => {
      fingerStats[finger.id] = {
        finger,
        totalAttempts: 0,
        totalErrors: 0,
        accuracy: 100
      };
    });

    Object.entries(keyStats).forEach(([char, stats]) => {
      const fingerId = KEY_TO_FINGER[char] || KEY_TO_FINGER[char.toLowerCase()];
      if (fingerId && fingerStats[fingerId]) {
        fingerStats[fingerId].totalAttempts += (stats.attempts || 0);
        fingerStats[fingerId].totalErrors += (stats.errors || 0);
      }
    });

    return Object.values(fingerStats).map(f => {
      if (f.totalAttempts >= 5) {
        const correct = f.totalAttempts - f.totalErrors;
        f.accuracy = Math.max(0, Math.min(100, Math.round((correct / f.totalAttempts) * 100)));
      } else {
        f.accuracy = 100; // Default fresh baseline
      }
      return f;
    });
  }

  /**
   * Identifies the weakest finger needing dedicated conditioning
   */
  static getWeakestFinger(keyStats = {}) {
    const mastery = this.getFingerMastery(keyStats);
    const practiced = mastery.filter(m => m.totalAttempts >= 10);
    if (practiced.length === 0) return null;

    practiced.sort((a, b) => a.accuracy - b.accuracy);
    return practiced[0].accuracy < 94 ? practiced[0] : null;
  }

  /**
   * Chooses the most useful next practice action from the learner's current
   * evidence. The dashboard can render this without knowing how the score was
   * calculated, while the UI still owns the actual lesson launch behavior.
  */
  static getAdaptiveFocus({ keyStats = {}, currentLesson = null, lessonCompletion = {} } = {}) {
    const weakKeys = this.getWeakKeys(keyStats, 3);
    const weakFinger = this.getWeakestFinger(keyStats);
    const createFingerFocus = finger => ({
      type: 'weak-finger',
      icon: '🖐️',
      eyebrow: 'Adaptive review',
      title: `Strengthen ${finger.finger.name}`,
      message: `Your ${finger.finger.name.toLowerCase()} is at ${finger.accuracy}% accuracy. Repeating its movement now protects your overall rhythm.`,
      detail: `${finger.totalAttempts} attempts · ${finger.totalErrors} errors`,
      finger: finger.finger,
      actionLabel: 'Start finger drill'
    });

    // A very weak finger is a broader movement problem than any one key, so
    // prioritize conditioning when its accuracy drops to 90% or below.
    if (weakFinger && weakFinger.accuracy <= 90) {
      return createFingerFocus(weakFinger);
    }

    if (weakKeys.length > 0) {
      const keys = weakKeys.map(key => key.char);
      const keyLabel = keys.map(key => `“${key.toUpperCase()}”`).join(', ');
      const totalErrors = weakKeys.reduce((sum, key) => sum + key.errors, 0);
      const weakestKey = weakKeys[0];

      return {
        type: 'weak-keys',
        icon: '🎯',
        eyebrow: 'Adaptive review',
        title: `Tune up ${keyLabel}`,
        message: `These keys are costing you the most accuracy. A short precision drill will make the next lesson feel easier.`,
        detail: `${weakestKey.accuracy}% lowest accuracy · ${totalErrors} recent errors`,
        keys,
        actionLabel: 'Start focus drill'
      };
    }

    if (weakFinger) {
      return createFingerFocus(weakFinger);
    }

    if (currentLesson) {
      const isReplay = !!lessonCompletion?.[currentLesson.id]?.completed;
      return {
        type: 'next-lesson',
        icon: isReplay ? '↻' : '→',
        eyebrow: isReplay ? 'Ready to repeat' : 'Next best step',
        title: isReplay ? `Replay ${currentLesson.title}` : `Continue ${currentLesson.title}`,
        message: isReplay
          ? 'You have completed this lesson. Replay it to improve your best score before moving on.'
          : currentLesson.subtitle,
        detail: `${currentLesson.accuracyTarget}% accuracy · ${currentLesson.wpmTarget} WPM · ~${currentLesson.estimatedMinutes} min`,
        lesson: currentLesson,
        actionLabel: isReplay ? 'Replay lesson' : 'Start lesson'
      };
    }

    return {
      type: 'start',
      icon: '⌨️',
      eyebrow: 'Build your baseline',
      title: 'Start with a focused warmup',
      message: 'Complete a lesson to unlock personalized recommendations for your next session.',
      detail: 'Your first few rounds create the signal for adaptive coaching.',
      actionLabel: 'Start lesson'
    };
  }

  /**
   * Generates supportive, highly specific coaching recommendations
   */
  static generateSmartRecommendations(sessionSummary, keyStats = {}) {
    const recommendations = [];

    const weakKeys = this.getWeakKeys(keyStats, 3);
    if (weakKeys.length > 0) {
      const keysStr = weakKeys.map(k => `"${k.char.toUpperCase()}"`).join(', ');
      recommendations.push({
        type: 'weak-keys',
        title: `Focus on ${keysStr}`,
        message: `Your error rate is highest on ${keysStr}. Practice these keys at a measured pace.`,
        actionLabel: 'Practice Weak Keys',
        keys: weakKeys.map(k => k.char)
      });
    }

    const weakFinger = this.getWeakestFinger(keyStats);
    if (weakFinger) {
      recommendations.push({
        type: 'weak-finger',
        title: `Strengthen ${weakFinger.finger.name}`,
        message: `Your ${weakFinger.finger.name} is currently at ${weakFinger.accuracy}% accuracy. A quick targeted drill will build muscle memory.`,
        actionLabel: `Practice ${weakFinger.finger.name}`,
        finger: weakFinger.finger
      });
    }

    if (sessionSummary) {
      if (sessionSummary.accuracy >= 98 && sessionSummary.wpm < sessionSummary.wpmTarget) {
        recommendations.push({
          type: 'speed',
          title: 'Outstanding Accuracy',
          message: 'Your precision is stellar! Try slightly picking up your rhythm while keeping the same finger discipline.',
          actionLabel: null
        });
      } else if (sessionSummary.accuracy < 90) {
        recommendations.push({
          type: 'accuracy',
          title: 'Slow Down Slightly for Cadence',
          message: 'Speed comes naturally from rhythm. Slow down your keystrokes by 10% to lock in zero-error muscle memory.',
          actionLabel: null
        });
      }
    }

    return recommendations;
  }

  /**
   * Generates an accessible, crisp SVG sparkline graph of WPM over time
   */
  static renderWpmSparklineSvg(wpmHistory = [], width = 540, height = 140) {
    if (!wpmHistory || wpmHistory.length < 2) {
      return `
        <div class="sparkline-empty">
          <span>Complete a session to view your real-time WPM velocity curve.</span>
        </div>
      `;
    }

    const padding = { top: 20, right: 30, bottom: 25, left: 40 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const values = wpmHistory.map(d => d.wpm);
    const minWpm = Math.max(0, Math.min(...values) - 5);
    const maxWpm = Math.max(40, Math.max(...values) + 10);

    const getX = idx => padding.left + (idx / (wpmHistory.length - 1)) * chartW;
    const getY = val => padding.top + chartH - ((val - minWpm) / (maxWpm - minWpm || 1)) * chartH;

    // Line and area path coordinates
    const points = wpmHistory.map((d, i) => `${getX(i)},${getY(d.wpm)}`);
    const linePath = `M ${points.join(' L ')}`;
    const areaPath = `${linePath} L ${getX(wpmHistory.length - 1)},${padding.top + chartH} L ${getX(0)},${padding.top + chartH} Z`;

    const avgWpm = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const avgY = getY(avgWpm);

    return `
      <svg class="wpm-sparkline-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="WPM velocity graph over time">
        <defs>
          <linearGradient id="wpmGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#7C5CFC" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#7C5CFC" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        <!-- Grid Lines -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>
        <line x1="${padding.left}" y1="${padding.top + chartH / 2}" x2="${width - padding.right}" y2="${padding.top + chartH / 2}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="rgba(255,255,255,0.12)"/>

        <!-- Y Axis Labels -->
        <text x="${padding.left - 8}" y="${padding.top + 4}" class="sparkline-axis-label" text-anchor="end">${maxWpm}</text>
        <text x="${padding.left - 8}" y="${padding.top + chartH + 4}" class="sparkline-axis-label" text-anchor="end">${minWpm}</text>

        <!-- Average WPM Reference Line -->
        <line x1="${padding.left}" y1="${avgY}" x2="${width - padding.right}" y2="${avgY}" stroke="#00D4AA" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.6"/>
        <text x="${width - padding.right + 4}" y="${avgY + 4}" class="sparkline-avg-label" fill="#00D4AA">avg ${avgWpm}</text>

        <!-- Shaded Area & Stroke Curve -->
        <path d="${areaPath}" fill="url(#wpmGradient)"/>
        <path d="${linePath}" fill="none" stroke="#7C5CFC" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- Data Points -->
        ${wpmHistory.map((d, i) => `
          <circle cx="${getX(i)}" cy="${getY(d.wpm)}" r="3.5" fill="#7C5CFC" stroke="#151923" stroke-width="1.5"/>
        `).join('')}
      </svg>
    `;
  }
}
