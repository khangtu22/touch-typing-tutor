/**
 * Analytics, Heatmap Calculations, Finger Mastery & SVG Graph Generator
 * Computes deep diagnostic metrics, per-finger mastery, weak key identification,
 * smart actionable recommendations, and lightweight SVG sparklines.
 */

import { FINGERS, KEY_TO_FINGER } from './finger-mapping.js';

let sparklineInstanceId = 0;

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
  static renderWpmSparklineSvg(wpmHistory = [], width = 640, height = 170, targetWpm = null) {
    const samples = (Array.isArray(wpmHistory) ? wpmHistory : [])
      .map((sample, index) => ({
        wpm: Number(typeof sample === 'number' ? sample : sample?.wpm),
        timeSec: Number(typeof sample === 'object' ? sample?.timeSec : NaN),
        index
      }))
      .filter(sample => Number.isFinite(sample.wpm) && sample.wpm >= 0);

    if (samples.length < 2) {
      return `
        <div class="sparkline-empty">
          <span>Keep typing to build your session pace graph.</span>
        </div>
      `;
    }

    const padding = { top: 18, right: 48, bottom: 28, left: 42 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const values = samples.map(sample => sample.wpm);
    const target = Number(targetWpm);
    const domainValues = Number.isFinite(target) && target >= 0 ? [...values, target] : values;
    const rawMin = Math.min(...domainValues);
    const rawMax = Math.max(...domainValues);
    const rawSpan = Math.max(1, rawMax - rawMin);
    const domainPadding = Math.max(4, rawSpan * 0.18);
    const minWpm = Math.max(0, Math.floor(rawMin - domainPadding));
    const maxWpm = Math.ceil(rawMax + domainPadding);
    const safeMaxWpm = maxWpm <= minWpm ? minWpm + 10 : maxWpm;

    const getX = idx => padding.left + (idx / (samples.length - 1)) * chartW;
    const getY = val => padding.top + chartH - ((val - minWpm) / (safeMaxWpm - minWpm)) * chartH;

    const coordinates = samples.map((sample, i) => ({ x: getX(i), y: getY(sample.wpm) }));
    // A quadratic midpoint path softens noisy one-second samples without
    // inventing a peak between measurements.
    let linePath = `M ${coordinates[0].x.toFixed(2)},${coordinates[0].y.toFixed(2)}`;
    for (let i = 1; i < coordinates.length; i++) {
      const previous = coordinates[i - 1];
      const current = coordinates[i];
      const midpoint = { x: (previous.x + current.x) / 2, y: (previous.y + current.y) / 2 };
      linePath += ` Q ${previous.x.toFixed(2)},${previous.y.toFixed(2)} ${midpoint.x.toFixed(2)},${midpoint.y.toFixed(2)}`;
    }
    const last = coordinates[coordinates.length - 1];
    const beforeLast = coordinates[coordinates.length - 2];
    linePath += ` Q ${beforeLast.x.toFixed(2)},${beforeLast.y.toFixed(2)} ${last.x.toFixed(2)},${last.y.toFixed(2)}`;
    const areaPath = `${linePath} L ${last.x.toFixed(2)},${padding.top + chartH} L ${coordinates[0].x.toFixed(2)},${padding.top + chartH} Z`;

    const avgWpm = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const avgY = getY(avgWpm);
    const midWpm = Math.round((minWpm + safeMaxWpm) / 2);
    const gradientId = `wpmGradient-${++sparklineInstanceId}`;
    const durationLabel = Number.isFinite(samples[samples.length - 1].timeSec)
      ? `${Math.max(0, Math.round(samples[samples.length - 1].timeSec))} seconds`
      : `${samples.length} samples`;
    const timeLabel = sample => Number.isFinite(sample.timeSec) ? `${Math.max(0, Math.round(sample.timeSec))}s` : `#${sample.index + 1}`;

    return `
      <svg class="wpm-sparkline-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="WPM velocity over ${durationLabel}">
        <title>WPM velocity over ${durationLabel}</title>
        <desc>Session pace ranged from ${Math.round(Math.min(...values))} to ${Math.round(Math.max(...values))} WPM, with an average of ${avgWpm} WPM.</desc>
        <defs>
          <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#7C5CFC" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#7C5CFC" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        <g class="sparkline-grid" aria-hidden="true">
          <line x1="${padding.left}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top}"/>
          <line x1="${padding.left}" y1="${padding.top + chartH / 2}" x2="${width - padding.right}" y2="${padding.top + chartH / 2}"/>
          <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" class="sparkline-baseline"/>
        </g>

        <g class="sparkline-axis" aria-hidden="true">
          <text x="${padding.left - 9}" y="${padding.top + 4}" class="sparkline-axis-label" text-anchor="end">${safeMaxWpm}</text>
          <text x="${padding.left - 9}" y="${padding.top + chartH / 2 + 4}" class="sparkline-axis-label" text-anchor="end">${midWpm}</text>
          <text x="${padding.left - 9}" y="${padding.top + chartH + 4}" class="sparkline-axis-label" text-anchor="end">${minWpm}</text>
          <text x="${padding.left}" y="${height - 5}" class="sparkline-time-label" text-anchor="start">${timeLabel(samples[0])}</text>
          <text x="${width - padding.right}" y="${height - 5}" class="sparkline-time-label" text-anchor="end">${timeLabel(samples[samples.length - 1])}</text>
        </g>

        <line class="sparkline-average-line" x1="${padding.left}" y1="${avgY}" x2="${width - padding.right}" y2="${avgY}"/>
        <text x="${width - padding.right + 5}" y="${avgY + 4}" class="sparkline-avg-label">avg ${avgWpm}</text>
        ${Number.isFinite(target) && target >= 0 ? `
          <line class="sparkline-target-line" x1="${padding.left}" y1="${getY(target)}" x2="${width - padding.right}" y2="${getY(target)}"/>
          <text x="${width - padding.right - 5}" y="${getY(target) - 5}" class="sparkline-target-label" text-anchor="end">target ${Math.round(target)}</text>
        ` : ''}

        <path class="sparkline-area" d="${areaPath}" fill="url(#${gradientId})"/>
        <path class="sparkline-line" d="${linePath}"/>

        ${samples.map((sample, i) => `
          <circle class="sparkline-point" cx="${coordinates[i].x.toFixed(2)}" cy="${coordinates[i].y.toFixed(2)}" r="3.2"><title>${timeLabel(sample)} · ${Math.round(sample.wpm)} WPM</title></circle>
        `).join('')}
      </svg>
    `;
  }
}
