/**
 * Advanced Analytics & Performance Intelligence Dashboard
 * High-DPI Canvas Charts, Interactive Hover Crosshairs & Tooltips,
 * Dual View Modes (Per-Session vs Daily Average), Velocity Scorecards,
 * Biomechanical Finger Mastery, Problem Key Action Diagnostics, and CSV Export.
 *
 * Pure Vanilla Web Standards & Zero External Dependencies.
 */

import { FINGERS, KEY_TO_FINGER } from './finger-mapping.js';
import { getLocalDateKey, store } from './state.js';
import { AnalyticsEngine } from './analytics.js';
import { generateWeakKeysLesson } from './curriculum.js';

// ---------------------------------------------------------------------------
// Helpers & Time Utilities
// ---------------------------------------------------------------------------

/**
 * Parses any date value into a valid Date object or fallback.
 * @param {string|number|Date} val
 * @returns {Date}
 */
function safeDate(val) {
  if (!val) return new Date();
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Returns a midnight Date for local day grouping.
 * @param {string|number|Date} val
 * @returns {Date}
 */
function dayStart(val) {
  const d = safeDate(val);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Formats a short calendar date: "Sep 3", "Oct 12"
 * @param {Date} d
 * @returns {string}
 */
function fmtShortDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Formats full date and time: "Sep 03, 2026 21:42"
 * @param {string|Date} val
 * @returns {string}
 */
function fmtDateTime(val) {
  const d = safeDate(val);
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hh}:${mm}`;
}

/**
 * Relative time or friendly time for tooltips: "Today at 9:42 PM" / "Yesterday at 14:15"
 * @param {string|Date} val
 * @returns {string}
 */
function fmtRelativeTime(val) {
  const d = safeDate(val);
  const todayKey = getLocalDateKey();
  const dKey = getLocalDateKey(d);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = getLocalDateKey(yesterday);

  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (dKey === todayKey) return `Today at ${timeStr}`;
  if (dKey === yKey) return `Yesterday at ${timeStr}`;
  return `${fmtShortDate(d)} at ${timeStr}`;
}

/**
 * Formats duration in seconds: 85 -> "1m 25s", 42 -> "42s"
 * @param {number} sec
 * @returns {string}
 */
function fmtDuration(sec) {
  const s = Math.round(Number(sec) || 0);
  const m = Math.floor(s / 60);
  const remS = s % 60;
  return m > 0 ? `${m}m ${remS}s` : `${remS}s`;
}

/**
 * HTML star symbols
 * @param {number} count
 * @returns {string}
 */
function starsHtml(count) {
  const total = 5;
  let out = '';
  for (let i = 0; i < total; i++) {
    const filled = i < count;
    out += `<span style="color: ${filled ? '#FFB86B' : 'rgba(255,255,255,0.2)'}; font-size: 13px;">${filled ? '★' : '☆'}</span>`;
  }
  return out;
}

/**
 * Escapes HTML strings safely.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Escapes CSV values.
 * @param {*} value
 * @returns {string}
 */
function csvCell(value) {
  const str = String(value ?? '').replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Filters sessions array by time window and ensures oldest-to-newest order for plotting.
 * @param {Array} sessions
 * @param {'7d'|'30d'|'90d'|'all'} period
 * @returns {Array}
 */
export function filterByPeriod(sessions = [], period = '7d') {
  if (!Array.isArray(sessions) || sessions.length === 0) return [];

  // Sort chronological (oldest to newest)
  const sorted = [...sessions].sort((a, b) => safeDate(a.date).getTime() - safeDate(b.date).getTime());
  if (period === 'all') return sorted;

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  return sorted.filter(s => safeDate(s.date) >= cutoff);
}

/**
 * Prepares chart plotting points depending on view mode ('session' vs 'day').
 * @param {Array} sessions - Chronologically sorted sessions in the period
 * @param {'session'|'day'} mode
 * @param {'wpm'|'accuracy'} metric
 * @param {'7d'|'30d'|'90d'|'all'} period
 * @returns {Array<object>}
 */
function prepareChartData(sessions = [], mode = 'session', metric = 'wpm', period = '7d') {
  if (!sessions || sessions.length === 0) return [];

  if (mode === 'session') {
    return sessions.map((s, idx) => {
      const val = typeof s[metric] === 'number' ? s[metric] : (metric === 'wpm' ? 0 : 100);
      const d = safeDate(s.date);
      return {
        idx,
        val,
        wpm: s.wpm || 0,
        accuracy: s.accuracy || 100,
        durationSec: s.durationSec || 0,
        stars: s.stars || 1,
        title: s.lessonTitle || `Lesson ${s.lessonId}`,
        kind: s.kind || 'lesson',
        date: d,
        label: fmtShortDate(d),
        timeLabel: fmtRelativeTime(d),
        subLabel: `#${idx + 1}`
      };
    });
  }

  // mode === 'day' -> Group by calendar day
  const dayMap = new Map();
  sessions.forEach(s => {
    const dKey = getLocalDateKey(s.date);
    if (!dayMap.has(dKey)) {
      dayMap.set(dKey, {
        dateStr: dKey,
        date: dayStart(s.date),
        wpms: [],
        accuracies: [],
        sessionsCount: 0,
        totalDuration: 0,
        titles: []
      });
    }
    const entry = dayMap.get(dKey);
    entry.wpms.push(Number(s.wpm) || 0);
    entry.accuracies.push(Number(s.accuracy) || 100);
    entry.sessionsCount++;
    entry.totalDuration += (Number(s.durationSec) || 0);
    entry.titles.push(s.lessonTitle || `Lesson ${s.lessonId}`);
  });

  // For 7d and 30d views, build continuous calendar days so rest days are visible
  const points = [];
  if (period === '7d' || period === '30d') {
    const totalDays = period === '7d' ? 7 : 30;
    const today = new Date();
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dKey = getLocalDateKey(d);
      const existing = dayMap.get(dKey);

      if (existing) {
        const avgWpm = Math.round(existing.wpms.reduce((a, b) => a + b, 0) / existing.wpms.length);
        const avgAcc = Math.round(existing.accuracies.reduce((a, b) => a + b, 0) / existing.accuracies.length);
        points.push({
          idx: points.length,
          val: metric === 'wpm' ? avgWpm : avgAcc,
          wpm: avgWpm,
          accuracy: avgAcc,
          sessionsCount: existing.sessionsCount,
          durationSec: existing.totalDuration,
          date: d,
          dateStr: dKey,
          label: fmtShortDate(d),
          timeLabel: `${fmtShortDate(d)} (${existing.sessionsCount} session${existing.sessionsCount > 1 ? 's' : ''})`,
          hasActivity: true
        });
      } else {
        // Inactive day point (only included in timeline if there is adjacent activity)
        points.push({
          idx: points.length,
          val: null, // Gap / rest day
          wpm: 0,
          accuracy: 0,
          sessionsCount: 0,
          durationSec: 0,
          date: d,
          dateStr: dKey,
          label: fmtShortDate(d),
          timeLabel: `${fmtShortDate(d)} (Rest day)`,
          hasActivity: false
        });
      }
    }
  } else {
    // 90d or All -> Only active days sorted
    Array.from(dayMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .forEach((entry, idx) => {
        const avgWpm = Math.round(entry.wpms.reduce((a, b) => a + b, 0) / entry.wpms.length);
        const avgAcc = Math.round(entry.accuracies.reduce((a, b) => a + b, 0) / entry.accuracies.length);
        points.push({
          idx,
          val: metric === 'wpm' ? avgWpm : avgAcc,
          wpm: avgWpm,
          accuracy: avgAcc,
          sessionsCount: entry.sessionsCount,
          durationSec: entry.totalDuration,
          date: entry.date,
          dateStr: entry.dateStr,
          label: fmtShortDate(entry.date),
          timeLabel: `${fmtShortDate(entry.date)} (${entry.sessionsCount} runs)`,
          hasActivity: true
        });
      });
  }

  return points;
}

// ---------------------------------------------------------------------------
// High-DPI Canvas Setup & Interactive Crosshair Engine
// ---------------------------------------------------------------------------

/**
 * Initializes a crisp High-DPI Canvas context.
 * @param {HTMLCanvasElement} canvas
 * @returns {{ ctx: CanvasRenderingContext2D, W: number, H: number }}
 */
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const W = Math.max(rect.width || canvas.clientWidth || 400, 280);
  const H = Math.max(rect.height || canvas.clientHeight || 240, 180);

  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
  ctx.scale(dpr, dpr);

  return { ctx, W, H };
}

/**
 * Draws an empty state card on canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {string} msg
 */
function drawEmptyState(ctx, W, H, msg = 'No sessions recorded in this period') {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.fillStyle = 'rgba(154, 163, 178, 0.6)';
  ctx.font = '500 13px Inter, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(msg, W / 2, H / 2 - 10);
  ctx.font = '11px Inter, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(154, 163, 178, 0.4)';
  ctx.fillText('Complete a typing session to see your live curve', W / 2, H / 2 + 12);
  ctx.restore();
}

/**
 * Shared Core Chart Renderer supporting:
 * - Bézier curve or stepped interpolation
 * - Glowing underfill gradients
 * - Target benchmark & Average dashed lines
 * - Interactive hover crosshair & highlight dot
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Array} points
 * @param {object} opts
 * @param {number|null} hoverIdx - Index of point currently hovered
 */
function renderCanvasChart(canvas, points, opts, hoverIdx = null) {
  const { ctx, W, H } = setupCanvas(canvas);

  const validPoints = points.filter(p => p.val !== null);
  if (validPoints.length === 0) {
    drawEmptyState(ctx, W, H);
    return;
  }

  const PAD = { top: 28, right: 36, bottom: 44, left: 54 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Compute scale boundaries
  const vals = validPoints.map(p => p.val);
  const minObserved = Math.min(...vals);
  const maxObserved = Math.max(...vals);

  let minVal, maxVal;
  if (opts.metric === 'accuracy') {
    minVal = Math.max(0, Math.min(80, Math.floor((minObserved - 5) / 5) * 5));
    maxVal = 100;
  } else {
    const targetWpm = opts.targetWpm || 40;
    maxVal = Math.max(maxObserved + 10, targetWpm + 10, 30);
    minVal = Math.max(0, Math.min(minObserved - 10, 0));
  }
  const range = maxVal - minVal || 1;

  // Coordinate mappers
  const xOf = idx => {
    if (points.length <= 1) return PAD.left + chartW / 2;
    return PAD.left + (idx / (points.length - 1)) * chartW;
  };

  const yOf = val => {
    if (val === null) return PAD.top + chartH;
    const clamped = Math.min(maxVal, Math.max(minVal, val));
    return PAD.top + chartH - ((clamped - minVal) / range) * chartH;
  };

  ctx.clearRect(0, 0, W, H);

  // 1. Horizontal Grid Lines & Y-Axis Labels
  const GRID_STEPS = 4;
  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = '11px "JetBrains Mono", monospace';

  for (let i = 0; i <= GRID_STEPS; i++) {
    const y = PAD.top + (chartH / GRID_STEPS) * i;
    const stepVal = Math.round(minVal + (range / GRID_STEPS) * (GRID_STEPS - i));

    ctx.strokeStyle = i === GRID_STEPS ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.setLineDash(i === GRID_STEPS ? [] : [3, 4]);

    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + chartW, y);
    ctx.stroke();

    ctx.fillStyle = 'rgba(154, 163, 178, 0.7)';
    ctx.fillText(`${stepVal}${opts.ySuffix || ''}`, PAD.left - 8, y);
  }
  ctx.restore();

  // 2. Target Reference Line (if specified)
  if (opts.targetVal && opts.targetVal >= minVal && opts.targetVal <= maxVal) {
    const targetY = yOf(opts.targetVal);
    ctx.save();
    ctx.strokeStyle = opts.targetColor || 'rgba(255, 184, 107, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, targetY);
    ctx.lineTo(PAD.left + chartW, targetY);
    ctx.stroke();

    ctx.fillStyle = opts.targetColor || 'rgba(255, 184, 107, 0.9)';
    ctx.font = '600 10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${opts.targetLabel || 'Target'}: ${opts.targetVal}${opts.ySuffix || ''}`, PAD.left + 8, targetY - 7);
    ctx.restore();
  }

  // 3. Period Average Reference Line
  if (validPoints.length > 1) {
    const avgVal = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const avgY = yOf(avgVal);
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, avgY);
    ctx.lineTo(PAD.left + chartW, avgY);
    ctx.stroke();

    ctx.fillStyle = 'rgba(154, 163, 178, 0.6)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`avg ${avgVal}${opts.ySuffix || ''}`, PAD.left + chartW - 6, avgY - 6);
    ctx.restore();
  }

  // Filter contiguous active segments (for day mode with gaps)
  const segments = [];
  let currentSegment = [];
  points.forEach(p => {
    if (p.val !== null) {
      currentSegment.push(p);
    } else if (currentSegment.length > 0) {
      segments.push(currentSegment);
      currentSegment = [];
    }
  });
  if (currentSegment.length > 0) segments.push(currentSegment);

  // 4. Gradient Area Fill
  segments.forEach(seg => {
    if (seg.length <= 1) return;

    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH);
    grad.addColorStop(0, opts.gradientTop);
    grad.addColorStop(1, opts.gradientBottom);

    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(xOf(seg[0].idx), yOf(seg[0].val));

    for (let i = 1; i < seg.length; i++) {
      const prevX = xOf(seg[i - 1].idx);
      const prevY = yOf(seg[i - 1].val);
      const currX = xOf(seg[i].idx);
      const currY = yOf(seg[i].val);
      const midX = (prevX + currX) / 2;
      const midY = (prevY + currY) / 2;
      ctx.quadraticCurveTo(prevX, prevY, midX, midY);
    }
    const lastP = seg[seg.length - 1];
    ctx.lineTo(xOf(lastP.idx), yOf(lastP.val));
    ctx.lineTo(xOf(lastP.idx), PAD.top + chartH);
    ctx.lineTo(xOf(seg[0].idx), PAD.top + chartH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  // 5. Smooth Curve Stroke
  segments.forEach(seg => {
    ctx.save();
    ctx.strokeStyle = opts.lineColor;
    ctx.lineWidth = 2.75;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = opts.lineColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();

    if (seg.length === 1) {
      const px = xOf(seg[0].idx);
      const py = yOf(seg[0].val);
      ctx.moveTo(px - 14, py);
      ctx.lineTo(px + 14, py);
    } else {
      ctx.moveTo(xOf(seg[0].idx), yOf(seg[0].val));
      for (let i = 1; i < seg.length; i++) {
        const prevX = xOf(seg[i - 1].idx);
        const prevY = yOf(seg[i - 1].val);
        const currX = xOf(seg[i].idx);
        const currY = yOf(seg[i].val);
        const midX = (prevX + currX) / 2;
        const midY = (prevY + currY) / 2;
        ctx.quadraticCurveTo(prevX, prevY, midX, midY);
      }
      const lastP = seg[seg.length - 1];
      ctx.lineTo(xOf(lastP.idx), yOf(lastP.val));
    }
    ctx.stroke();
    ctx.restore();
  });

  // 6. Data Point Circles
  validPoints.forEach(p => {
    const isHovered = hoverIdx === p.idx;
    const x = xOf(p.idx);
    const y = yOf(p.val);

    // Glow Halo
    ctx.save();
    ctx.fillStyle = opts.lineColor;
    ctx.globalAlpha = isHovered ? 0.45 : 0.2;
    ctx.beginPath();
    ctx.arc(x, y, isHovered ? 8.5 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Solid Node Dot
    ctx.save();
    ctx.fillStyle = isHovered ? '#FFFFFF' : opts.lineColor;
    ctx.strokeStyle = '#121620';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, isHovered ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  // 7. Interactive Crosshair & Cursor Highlight
  if (hoverIdx !== null) {
    const hoverP = points.find(p => p.idx === hoverIdx);
    if (hoverP && hoverP.val !== null) {
      const hx = xOf(hoverP.idx);
      const hy = yOf(hoverP.val);

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hx, PAD.top);
      ctx.lineTo(hx, PAD.top + chartH);
      ctx.stroke();
      ctx.restore();

      // Outer Pulsing Ring
      ctx.save();
      ctx.strokeStyle = opts.lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 8. X-Axis Date Labels
  ctx.save();
  ctx.fillStyle = 'rgba(154, 163, 178, 0.75)';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const maxLabels = Math.min(points.length, 8);
  const step = Math.max(1, Math.floor((points.length - 1) / Math.max(1, maxLabels - 1)));
  const drawnX = new Set();

  for (let i = 0; i < points.length; i += step) {
    const x = Math.round(xOf(i));
    if (drawnX.has(x)) continue;
    drawnX.add(x);
    ctx.fillText(points[i].label, x, PAD.top + chartH + 9);
  }

  // Always draw last point label
  if (points.length > 1) {
    const lastIdx = points.length - 1;
    const x = Math.round(xOf(lastIdx));
    if (!drawnX.has(x)) {
      ctx.fillText(points[lastIdx].label, x, PAD.top + chartH + 9);
    }
  }
  ctx.restore();
}

/**
 * Attaches pointer/touch listeners to the canvas for interactive hover tooltips.
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} tooltipEl
 * @param {Array} points
 * @param {object} opts
 */
function attachChartInteractivity(canvas, tooltipEl, points, opts) {
  if (!canvas || !tooltipEl || points.length === 0) return;

  const PAD = { top: 28, right: 36, bottom: 44, left: 54 };

  const onPointerMove = e => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : null);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : null);
    if (clientX === null) return;

    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const chartW = rect.width - PAD.left - PAD.right;
    if (mouseX < PAD.left - 10 || mouseX > rect.width - PAD.right + 10) {
      tooltipEl.style.opacity = '0';
      tooltipEl.style.pointerEvents = 'none';
      renderCanvasChart(canvas, points, opts, null);
      return;
    }

    // Find nearest point
    let nearest = points[0];
    let minDiff = Infinity;

    points.forEach(p => {
      if (p.val === null) return;
      const px = points.length <= 1
        ? PAD.left + chartW / 2
        : PAD.left + (p.idx / (points.length - 1)) * chartW;
      const diff = Math.abs(mouseX - px);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = p;
      }
    });

    if (!nearest) return;

    // Redraw with highlight crosshair
    renderCanvasChart(canvas, points, opts, nearest.idx);

    // Populate Tooltip
    const kindBadge = nearest.kind === 'code'
      ? '<span class="aa-tag aa-tag-code">💻 Code</span>'
      : nearest.kind === 'speedtest'
        ? '<span class="aa-tag aa-tag-speed">⚡ Speed Test</span>'
        : nearest.kind === 'quote'
          ? '<span class="aa-tag aa-tag-quote">📜 Quote</span>'
          : nearest.kind === 'zen'
            ? '<span class="aa-tag aa-tag-zen">🧘 Zen</span>'
          : '<span class="aa-tag aa-tag-lesson">📖 Lesson</span>';

    const wpmVal = nearest.wpm ?? nearest.val ?? 0;
    const accVal = nearest.accuracy ?? 100;
    const starsMarkup = nearest.stars ? starsHtml(nearest.stars) : '';

    tooltipEl.innerHTML = `
      <div class="aa-tip-header">
        <span class="aa-tip-title">${escapeHtml(nearest.title || 'Practice Session')}</span>
        ${kindBadge}
      </div>
      <div class="aa-tip-time">${nearest.timeLabel || fmtRelativeTime(nearest.date)}</div>
      <div class="aa-tip-metrics">
        <div class="aa-tip-metric">
          <span class="aa-tip-val" style="color: #7C5CFC;">${wpmVal}</span>
          <span class="aa-tip-lbl">WPM</span>
        </div>
        <div class="aa-tip-metric">
          <span class="aa-tip-val" style="color: #00D4AA;">${accVal}%</span>
          <span class="aa-tip-lbl">ACC</span>
        </div>
        ${nearest.durationSec ? `
          <div class="aa-tip-metric">
            <span class="aa-tip-val" style="color: var(--text-secondary);">${fmtDuration(nearest.durationSec)}</span>
            <span class="aa-tip-lbl">TIME</span>
          </div>
        ` : ''}
      </div>
      ${starsMarkup ? `<div class="aa-tip-stars">${starsMarkup}</div>` : ''}
    `;

    // Positioning
    const tipW = tooltipEl.offsetWidth || 180;
    const tipH = tooltipEl.offsetHeight || 110;
    let left = mouseX + 14;
    let top = mouseY - tipH / 2;

    if (left + tipW > rect.width - 10) left = mouseX - tipW - 14;
    if (top < 10) top = 10;
    if (top + tipH > rect.height - 10) top = rect.height - tipH - 10;

    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${top}px`;
    tooltipEl.style.opacity = '1';
  };

  const onPointerLeave = () => {
    tooltipEl.style.opacity = '0';
    tooltipEl.style.pointerEvents = 'none';
    renderCanvasChart(canvas, points, opts, null);
  };

  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mouseleave', onPointerLeave);
  canvas.addEventListener('touchmove', onPointerMove, { passive: true });
  canvas.addEventListener('touchend', onPointerLeave);
}

// ---------------------------------------------------------------------------
// Chart Wrappers
// ---------------------------------------------------------------------------

export function renderWpmTrendChart(canvas, tooltipEl, sessions = [], period = '7d', mode = 'session', targetWpm = 40) {
  const filtered = filterByPeriod(sessions, period);
  const points = prepareChartData(filtered, mode, 'wpm', period);

  const opts = {
    metric: 'wpm',
    lineColor: '#7C5CFC',
    gradientTop: 'rgba(124, 92, 252, 0.45)',
    gradientBottom: 'rgba(124, 92, 252, 0.0)',
    ySuffix: '',
    targetVal: targetWpm,
    targetLabel: 'Goal',
    targetColor: 'rgba(255, 184, 107, 0.85)'
  };

  renderCanvasChart(canvas, points, opts);
  if (tooltipEl) attachChartInteractivity(canvas, tooltipEl, points, opts);
}

export function renderAccuracyTrendChart(canvas, tooltipEl, sessions = [], period = '7d', mode = 'session') {
  const filtered = filterByPeriod(sessions, period);
  const points = prepareChartData(filtered, mode, 'accuracy', period);

  const opts = {
    metric: 'accuracy',
    lineColor: '#00D4AA',
    gradientTop: 'rgba(0, 212, 170, 0.4)',
    gradientBottom: 'rgba(0, 212, 170, 0.0)',
    ySuffix: '%',
    targetVal: 95,
    targetLabel: 'Target',
    targetColor: 'rgba(0, 212, 170, 0.7)'
  };

  renderCanvasChart(canvas, points, opts);
  if (tooltipEl) attachChartInteractivity(canvas, tooltipEl, points, opts);
}

// ---------------------------------------------------------------------------
// Diagnostics: Weak Keys & 10-Finger Biomechanical Heatmap
// ---------------------------------------------------------------------------

/**
 * Renders the top problem keys with error stats and a 1-click adaptive drill button.
 * @param {HTMLElement} container
 * @param {object} keyStats
 * @param {object} uiManager
 */
export function renderProblemKeysDiagnostic(container, keyStats = {}, uiManager = null) {
  const weakKeys = AnalyticsEngine.getWeakKeys(keyStats, 5);

  if (weakKeys.length === 0) {
    container.innerHTML = `
      <div class="aa-diag-clean">
        <div style="font-size: 28px; margin-bottom: 6px;">✨</div>
        <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">Zero Problem Keys Detected</div>
        <p style="font-size: 12px; color: var(--text-secondary); margin: 4px 0 0;">All practiced keys currently maintain >= 94% touch typing accuracy.</p>
      </div>
    `;
    return;
  }

  const rows = weakKeys.map(k => {
    const fingerId = KEY_TO_FINGER[k.char] || KEY_TO_FINGER[k.char.toLowerCase()];
    const fingerObj = Object.values(FINGERS).find(f => f.id === fingerId);
    const fingerName = fingerObj ? fingerObj.name : 'Home Row';

    return `
      <div class="aa-weak-key-row">
        <div class="aa-key-badge">${escapeHtml(k.char.toUpperCase())}</div>
        <div class="aa-key-info">
          <div class="aa-key-name">${fingerName}</div>
          <div class="aa-key-meta">${k.attempts} strokes · ${k.errors} errors (${Math.round(k.errorRate * 100)}% err)</div>
        </div>
        <div class="aa-key-stat">
          <span class="aa-key-acc" style="color: ${k.accuracy < 80 ? '#FF5C7A' : '#FFB86B'};">${k.accuracy}%</span>
          <span class="aa-key-lat">${k.avgLatency}ms</span>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="aa-weak-keys-list">${rows}</div>
    <div style="margin-top: 14px; display: flex; justify-content: flex-end;">
      <button id="aa-launch-drill-btn" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 12px;">
        <span>⚡ Launch Targeted Weak Keys Drill</span>
      </button>
    </div>
  `;

  const drillBtn = container.querySelector('#aa-launch-drill-btn');
  if (drillBtn && uiManager) {
    drillBtn.addEventListener('click', () => {
      const keysToDrill = weakKeys.map(k => k.char);
      const lesson = generateWeakKeysLesson(keysToDrill);
      uiManager.startLesson(lesson);
    });
  }
}

/**
 * Computes and renders the 10-finger muscle memory mastery progress bars.
 * @param {HTMLElement} container
 * @param {object} keyStats
 */
export function renderFingerHeatmapTable(container, keyStats = {}) {
  const mastery = AnalyticsEngine.getFingerMastery(keyStats);
  const ORDER = [
    'left-pinky', 'left-ring', 'left-middle', 'left-index',
    'thumbs',
    'right-index', 'right-middle', 'right-ring', 'right-pinky'
  ];

  const sorted = ORDER
    .map(id => mastery.find(f => f.finger.id === id))
    .filter(Boolean);

  container.innerHTML = sorted.map(({ finger, accuracy, totalAttempts, totalErrors }) => {
    const color = accuracy < 80 ? '#FF5C7A' : accuracy < 90 ? '#FFB86B' : accuracy < 97 ? '#00D4AA' : '#7C5CFC';
    const noData = totalAttempts < 5;

    return `
      <div class="aa-finger-row">
        <div class="aa-finger-title-col">
          <span class="aa-finger-dot" style="background: ${finger.color};"></span>
          <span class="aa-finger-name">${finger.name}</span>
        </div>
        <div class="aa-finger-bar-track">
          <div class="aa-finger-bar-fill" data-target="${noData ? 0 : accuracy}" style="width: 0%; background: ${color};"></div>
        </div>
        <div class="aa-finger-acc-val" style="color: ${noData ? 'var(--text-muted)' : color};">
          ${noData ? '—' : `${accuracy}%`}
        </div>
      </div>
    `;
  }).join('');

  requestAnimationFrame(() => {
    container.querySelectorAll('.aa-finger-bar-fill').forEach(bar => {
      bar.style.width = `${bar.dataset.target}%`;
    });
  });
}

// ---------------------------------------------------------------------------
// Searchable, Sortable, Paginated Session History Table
// ---------------------------------------------------------------------------

/**
 * Renders the session history table with search, kind filter, column sorting, pagination, and deletion.
 * @param {HTMLElement} container
 * @param {Array}       sessions
 * @param {object}      tableState - { sortKey, sortDir, page, pageSize, search, kindFilter }
 * @param {object}      uiManager
 */
export function renderSessionHistoryTable(container, sessions = [], tableState = {}, uiManager = null) {
  const {
    sortKey = 'date',
    sortDir = 'desc',
    page = 1,
    pageSize = 10,
    search = '',
    kindFilter = 'all'
  } = tableState;

  if (!sessions || sessions.length === 0) {
    container.innerHTML = `
      <div style="padding: 48px 24px; text-align: center; color: var(--text-muted); font-size: 13.5px;">
        <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
        <div>No practice sessions found yet. Complete a lesson to view your history.</div>
      </div>
    `;
    return;
  }

  // 1. Filter by Search Query & Kind
  let filtered = [...sessions];
  if (kindFilter !== 'all') {
    filtered = filtered.filter(s => {
      if (kindFilter === 'lesson') return s.kind === 'lesson' || Number.isInteger(s.lessonId);
      if (kindFilter === 'speedtest') return s.kind === 'speedtest' || String(s.lessonId).includes('speed');
      if (kindFilter === 'code') return s.kind === 'code';
      if (kindFilter === 'quote') return s.kind === 'quote';
      if (kindFilter === 'zen') return s.kind === 'zen';
      if (kindFilter === 'custom') return s.kind === 'custom' || s.kind === 'practice';
      return true;
    });
  }

  if (search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(s => (s.lessonTitle || `Lesson ${s.lessonId}`).toLowerCase().includes(q));
  }

  // 2. Sort
  filtered.sort((a, b) => {
    let va, vb;
    switch (sortKey) {
      case 'date':
        va = safeDate(a.date).getTime();
        vb = safeDate(b.date).getTime();
        break;
      case 'wpm':
        va = Number(a.wpm) || 0;
        vb = Number(b.wpm) || 0;
        break;
      case 'accuracy':
        va = Number(a.accuracy) || 0;
        vb = Number(b.accuracy) || 0;
        break;
      case 'duration':
        va = Number(a.durationSec) || 0;
        vb = Number(b.durationSec) || 0;
        break;
      case 'stars':
        va = Number(a.stars) || 0;
        vb = Number(b.stars) || 0;
        break;
      default:
        va = 0;
        vb = 0;
    }
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  // 3. Pagination
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  const pageItems = filtered.slice(startIndex, endIndex);

  // 4. Render Table HTML
  const COLS = [
    { key: 'date', label: 'Date & Time' },
    { key: 'lesson', label: 'Session / Activity', noSort: true },
    { key: 'wpm', label: 'WPM' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'duration', label: 'Duration' },
    { key: 'stars', label: 'Stars' },
    { key: 'actions', label: '', noSort: true }
  ];

  const thHeaders = COLS.map(col => {
    if (col.noSort) {
      return `<th class="aa-th ${col.key === 'actions' ? 'aa-th-actions' : ''}">${col.label}</th>`;
    }
    const isActive = sortKey === col.key;
    const nextDir = isActive && sortDir === 'desc' ? 'asc' : 'desc';
    const arrow = isActive ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';
    return `<th class="aa-th aa-th-sortable ${isActive ? 'aa-th-active' : ''}" data-sort="${col.key}" data-dir="${nextDir}" title="Sort by ${col.label}">${col.label}${arrow}</th>`;
  }).join('');

  const rowsHtml = pageItems.map((s, idx) => {
    const accColor = s.accuracy >= 97 ? '#00D4AA' : s.accuracy >= 90 ? 'var(--text-primary)' : '#FFB86B';
    const kindTag = s.kind === 'code'
      ? '<span class="aa-badge aa-badge-code">Code</span>'
      : s.kind === 'speedtest'
        ? '<span class="aa-badge aa-badge-speed">Speed</span>'
        : s.kind === 'quote'
          ? '<span class="aa-badge aa-badge-quote">Quote</span>'
          : s.kind === 'zen'
            ? '<span class="aa-badge aa-badge-zen">Zen</span>'
          : s.kind === 'placement'
            ? '<span class="aa-badge aa-badge-placement">Test</span>'
            : '<span class="aa-badge aa-badge-lesson">Curriculum</span>';

    return `
      <tr class="aa-tr">
        <td class="aa-td" style="white-space: nowrap; color: var(--text-secondary); font-size: 12px;">${fmtDateTime(s.date)}</td>
        <td class="aa-td" style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${kindTag}
            <span class="aa-session-title" title="${escapeHtml(s.lessonTitle || `Lesson ${s.lessonId}`)}">
              ${escapeHtml(s.lessonTitle || `Lesson ${s.lessonId}`)}
            </span>
          </div>
        </td>
        <td class="aa-td aa-td-mono" style="color: #7C5CFC; font-weight: 700;">${s.wpm || 0}</td>
        <td class="aa-td aa-td-mono" style="color: ${accColor}; font-weight: 700;">${s.accuracy || 100}%</td>
        <td class="aa-td aa-td-mono" style="color: var(--text-secondary); font-size: 12px;">${fmtDuration(s.durationSec || 0)}</td>
        <td class="aa-td" style="white-space: nowrap;">${starsHtml(s.stars || 1)}</td>
        <td class="aa-td aa-td-actions">
          <button class="aa-del-btn" data-date="${s.date}" title="Delete session">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="overflow-x: auto; width: 100%;">
      <table class="aa-table">
        <thead><tr class="aa-thead-tr">${thHeaders}</tr></thead>
        <tbody>${rowsHtml.length > 0 ? rowsHtml : `<tr><td colspan="7" style="text-align: center; padding: 28px; color: var(--text-muted);">No matching sessions found.</td></tr>`}</tbody>
      </table>
    </div>

    <!-- Pagination Bar -->
    <div class="aa-pagination-bar">
      <div class="aa-page-info">
        Showing <strong style="color: var(--text-primary); font-family: var(--font-mono);">${totalCount > 0 ? startIndex + 1 : 0}–${endIndex}</strong> of <strong style="color: var(--text-primary); font-family: var(--font-mono);">${totalCount}</strong> sessions
      </div>
      <div class="aa-page-nav">
        <button class="btn btn-secondary btn-sm aa-prev-btn" ${currentPage <= 1 ? 'disabled' : ''}>‹ Previous</button>
        <span class="aa-page-count">Page ${currentPage} of ${totalPages}</span>
        <button class="btn btn-secondary btn-sm aa-next-btn" ${currentPage >= totalPages ? 'disabled' : ''}>Next ›</button>
      </div>
    </div>
  `;

  // Attach handlers
  container.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const nextState = {
        ...tableState,
        sortKey: th.dataset.sort,
        sortDir: th.dataset.dir,
        page: 1
      };
      renderSessionHistoryTable(container, sessions, nextState, uiManager);
    });
  });

  const prevBtn = container.querySelector('.aa-prev-btn');
  if (prevBtn && currentPage > 1) {
    prevBtn.addEventListener('click', () => {
      renderSessionHistoryTable(container, sessions, { ...tableState, page: currentPage - 1 }, uiManager);
    });
  }

  const nextBtn = container.querySelector('.aa-next-btn');
  if (nextBtn && currentPage < totalPages) {
    nextBtn.addEventListener('click', () => {
      renderSessionHistoryTable(container, sessions, { ...tableState, page: currentPage + 1 }, uiManager);
    });
  }

  container.querySelectorAll('.aa-del-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const sessionDate = btn.dataset.date;
      if (confirm('Delete this typing attempt from your history?')) {
        store.deleteSession(sessionDate);
        const updatedState = store.getState();
        renderSessionHistoryTable(container, updatedState.sessions || [], tableState, uiManager);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

export function exportSessionsCSV(sessions = []) {
  if (!sessions || sessions.length === 0) {
    alert('No sessions available to export.');
    return;
  }

  const HEADERS = ['Date & Time', 'Lesson / Activity', 'WPM', 'Accuracy (%)', 'Duration (sec)', 'Stars', 'XP Earned', 'Category', 'Focus Mode'];

  const rows = [
    HEADERS.join(','),
    ...sessions.map(s => [
      csvCell(fmtDateTime(s.date)),
      csvCell(s.lessonTitle || `Lesson ${s.lessonId}`),
      Number(s.wpm) || 0,
      Number(s.accuracy) || 100,
      Number(s.durationSec) || 0,
      Number(s.stars) || 1,
      Number(s.xpEarned) || 0,
      csvCell(s.kind || 'lesson'),
      s.inFocusMode ? 'Yes' : 'No'
    ].join(','))
  ];

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const todayKey = getLocalDateKey();
  const link = document.createElement('a');
  link.href = url;
  link.download = `keyflow-sessions-${todayKey}.csv`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 200);
}

// ---------------------------------------------------------------------------
// Main Dashboard Controller
// ---------------------------------------------------------------------------

/**
 * Computes top-level scorecard metrics for the given period.
 * @param {Array} sessions
 * @param {string} period
 * @returns {object}
 */
function computeScorecardMetrics(sessions = [], period = '7d') {
  const currentFiltered = filterByPeriod(sessions, period);

  if (currentFiltered.length === 0) {
    return {
      avgWpm: 0,
      peakWpm: 0,
      avgAccuracy: 100,
      totalRuns: 0,
      totalMinutes: 0,
      activeDays: 0,
      totalDays: period === '7d' ? 7 : period === '30d' ? 30 : 90,
      trendPct: 0
    };
  }

  const wpms = currentFiltered.map(s => Number(s.wpm) || 0);
  const accs = currentFiltered.map(s => Number(s.accuracy) || 100);
  const totalSecs = currentFiltered.reduce((sum, s) => sum + (Number(s.durationSec) || 0), 0);

  const avgWpm = Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length);
  const peakWpm = Math.max(...wpms);
  const avgAccuracy = Math.round(accs.reduce((a, b) => a + b, 0) / accs.length);
  const totalMinutes = Math.round(totalSecs / 60);

  // Active days count
  const activeDaysSet = new Set(currentFiltered.map(s => getLocalDateKey(s.date)));
  const activeDays = activeDaysSet.size;
  const totalDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;

  // Trend vs previous period
  let trendPct = 0;
  if (period !== 'all') {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const priorEnd = new Date();
    priorEnd.setDate(priorEnd.getDate() - days);
    priorEnd.setHours(0, 0, 0, 0);

    const priorStart = new Date();
    priorStart.setDate(priorStart.getDate() - days * 2);
    priorStart.setHours(0, 0, 0, 0);

    const priorSessions = sessions.filter(s => {
      const d = safeDate(s.date);
      return d >= priorStart && d < priorEnd;
    });

    if (priorSessions.length > 0) {
      const priorWpms = priorSessions.map(s => Number(s.wpm) || 0);
      const priorAvg = priorWpms.reduce((a, b) => a + b, 0) / priorWpms.length;
      if (priorAvg > 0) {
        trendPct = Math.round(((avgWpm - priorAvg) / priorAvg) * 100);
      }
    }
  }

  return {
    avgWpm,
    peakWpm,
    avgAccuracy,
    totalRuns: currentFiltered.length,
    totalMinutes,
    activeDays,
    totalDays,
    trendPct
  };
}

/**
 * Main function: Renders the complete Advanced Analytics Dashboard.
 * @param {HTMLElement} container
 * @param {object} state - store.getState()
 * @param {object} uiManager
 */
export function renderAdvancedAnalyticsDashboard(container, state = {}, uiManager = null) {
  if (!container) return;

  let activePeriod = '7d'; // '7d' | '30d' | '90d' | 'all'
  let activeMode = 'day'; // 'session' | 'day'

  const tableState = {
    sortKey: 'date',
    sortDir: 'desc',
    page: 1,
    pageSize: 10,
    search: '',
    kindFilter: 'all'
  };

  container.innerHTML = `
    <div class="aa-dashboard-root">
      <!-- Top Control Bar -->
      <div class="aa-header-row">
        <div>
          <h2 class="aa-main-title">Telemetry &amp; Chart Analysis</h2>
          <p class="aa-main-sub">Real-time velocity curves, precision stability, and biomechanical diagnostics</p>
        </div>

        <div class="aa-controls-group">
          <!-- View Mode Toggle -->
          <div class="aa-mode-toggle" id="aa-mode-toggle" role="group" aria-label="Analytics view mode">
            <button class="aa-mode-btn ${activeMode === 'session' ? 'active' : ''}" aria-pressed="${activeMode === 'session'}" data-mode="session">Per Session</button>
            <button class="aa-mode-btn ${activeMode === 'day' ? 'active' : ''}" aria-pressed="${activeMode === 'day'}" data-mode="day">Daily Average</button>
          </div>

          <!-- Period Tabs -->
          <div class="aa-period-tabs" id="aa-period-tabs" role="group" aria-label="Analytics time period">
            <button class="aa-period-btn ${activePeriod === '7d' ? 'active' : ''}" aria-pressed="${activePeriod === '7d'}" data-period="7d">7 Days</button>
            <button class="aa-period-btn ${activePeriod === '30d' ? 'active' : ''}" aria-pressed="${activePeriod === '30d'}" data-period="30d">30 Days</button>
            <button class="aa-period-btn ${activePeriod === '90d' ? 'active' : ''}" aria-pressed="${activePeriod === '90d'}" data-period="90d">90 Days</button>
            <button class="aa-period-btn ${activePeriod === 'all' ? 'active' : ''}" aria-pressed="${activePeriod === 'all'}" data-period="all">All Time</button>
          </div>
        </div>
      </div>

      <!-- Performance Scorecard -->
      <div id="aa-scorecard-slot" class="aa-scorecard-grid"></div>

      <!-- Main Dual Chart Cards -->
      <div class="aa-charts-grid">
        <!-- WPM Velocity Trend Card -->
        <div class="aa-chart-card">
          <div class="aa-card-head">
            <div class="aa-head-left">
              <span class="aa-card-icon">⚡</span>
              <div>
                <h3 class="aa-card-title">WPM Velocity Curve</h3>
                <span class="aa-card-sub">Typing speed progression over selected timeframe</span>
              </div>
            </div>
            <div id="aa-wpm-meta" class="aa-card-meta"></div>
          </div>
          <div class="aa-canvas-box">
            <canvas id="aa-wpm-canvas"></canvas>
            <div id="aa-wpm-tooltip" class="aa-hover-tooltip"></div>
          </div>
        </div>

        <!-- Accuracy & Consistency Trend Card -->
        <div class="aa-chart-card">
          <div class="aa-card-head">
            <div class="aa-head-left">
              <span class="aa-card-icon">🎯</span>
              <div>
                <h3 class="aa-card-title">Accuracy &amp; Rhythm Stability</h3>
                <span class="aa-card-sub">Error rate minimization &amp; discipline trajectory</span>
              </div>
            </div>
            <div id="aa-acc-meta" class="aa-card-meta"></div>
          </div>
          <div class="aa-canvas-box">
            <canvas id="aa-acc-canvas"></canvas>
            <div id="aa-acc-tooltip" class="aa-hover-tooltip"></div>
          </div>
        </div>
      </div>

      <!-- Diagnostics Row: Weak Keys & 10-Finger Biomechanical Heatmap -->
      <div class="aa-diagnostics-grid">
        <!-- Problem Keys Card -->
        <div class="aa-card">
          <div class="aa-card-head">
            <div class="aa-head-left">
              <span class="aa-card-icon">⚠️</span>
              <div>
                <h3 class="aa-card-title">Problem Keys Diagnostic</h3>
                <span class="aa-card-sub">Lowest accuracy keys costing you velocity</span>
              </div>
            </div>
          </div>
          <div id="aa-problem-keys-slot"></div>
        </div>

        <!-- 10-Finger Muscle Memory Card -->
        <div class="aa-card">
          <div class="aa-card-head">
            <div class="aa-head-left">
              <span class="aa-card-icon">🖐️</span>
              <div>
                <h3 class="aa-card-title">10-Finger Biomechanical Mastery</h3>
                <span class="aa-card-sub">Individual finger accuracy ratings &amp; stroke balance</span>
              </div>
            </div>
          </div>
          <div id="aa-finger-heatmap-slot" class="aa-finger-heatmap-box"></div>
        </div>
      </div>

      <!-- Session History Table Card -->
      <div class="aa-card">
        <div class="aa-card-head" style="flex-wrap: wrap; gap: 14px;">
          <div class="aa-head-left">
            <span class="aa-card-icon">📋</span>
            <div>
              <h3 class="aa-card-title">Detailed Session History</h3>
              <span class="aa-card-sub">Log of all practice rounds, speed tests, and lessons</span>
            </div>
          </div>

          <!-- Table Actions: Search, Filter, Export -->
          <div class="aa-table-toolbar">
            <input type="text" id="aa-history-search" class="aa-search-input" placeholder="Search lessons..." value="${escapeHtml(tableState.search)}">
            <select id="aa-kind-filter" class="aa-select">
              <option value="all">All Activities</option>
              <option value="lesson">Curriculum Lessons</option>
              <option value="code">Developer Code</option>
              <option value="speedtest">Speed Tests</option>
              <option value="quote">Quote Vault</option>
              <option value="zen">Zen Mode</option>
              <option value="custom">Custom Practice</option>
            </select>
            <button id="aa-export-csv-btn" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">
              <span>↓ Export CSV</span>
            </button>
          </div>
        </div>

        <div id="aa-history-table-slot" style="margin-top: 10px;"></div>
      </div>
    </div>
  `;

  // DOM References
  const scorecardSlot = container.querySelector('#aa-scorecard-slot');
  const wpmCanvas = container.querySelector('#aa-wpm-canvas');
  const wpmTooltip = container.querySelector('#aa-wpm-tooltip');
  const wpmMeta = container.querySelector('#aa-wpm-meta');
  const accCanvas = container.querySelector('#aa-acc-canvas');
  const accTooltip = container.querySelector('#aa-acc-tooltip');
  const accMeta = container.querySelector('#aa-acc-meta');
  const problemKeysSlot = container.querySelector('#aa-problem-keys-slot');
  const fingerSlot = container.querySelector('#aa-finger-heatmap-slot');
  const historySlot = container.querySelector('#aa-history-table-slot');
  const searchInput = container.querySelector('#aa-history-search');
  const kindSelect = container.querySelector('#aa-kind-filter');
  const exportBtn = container.querySelector('#aa-export-csv-btn');
  const modeToggle = container.querySelector('#aa-mode-toggle');
  const periodTabs = container.querySelector('#aa-period-tabs');

  // Render Function
  function renderAll() {
    const currentState = store.getState();
    const sessions = currentState.sessions || [];
    const targetWpm = currentState.targetWpm || currentState.settings?.goals?.dailyWpm || 40;

    // 1. Scorecard
    const metrics = computeScorecardMetrics(sessions, activePeriod);
    const trendMarkup = metrics.trendPct !== 0
      ? `<span class="aa-trend-pill ${metrics.trendPct > 0 ? 'up' : 'down'}">${metrics.trendPct > 0 ? '↑' : '↓'} ${Math.abs(metrics.trendPct)}% vs prev</span>`
      : '';

    scorecardSlot.innerHTML = `
      <div class="aa-stat-card">
        <div class="aa-stat-head">
          <span class="aa-stat-label">Period Avg Speed</span>
          <span class="aa-stat-icon">⚡</span>
        </div>
        <div class="aa-stat-val" style="color: #7C5CFC;">${metrics.avgWpm} <span class="aa-stat-unit">WPM</span></div>
        <div class="aa-stat-footer">${trendMarkup || `<span style="color: var(--text-muted); font-size: 11px;">Over ${activePeriod === 'all' ? 'all time' : activePeriod}</span>`}</div>
      </div>

      <div class="aa-stat-card">
        <div class="aa-stat-head">
          <span class="aa-stat-label">Peak Velocity</span>
          <span class="aa-stat-icon">🚀</span>
        </div>
        <div class="aa-stat-val" style="color: var(--reward-amber);">${metrics.peakWpm} <span class="aa-stat-unit">WPM</span></div>
        <div class="aa-stat-footer"><span style="color: var(--text-muted); font-size: 11px;">Best run in period</span></div>
      </div>

      <div class="aa-stat-card">
        <div class="aa-stat-head">
          <span class="aa-stat-label">Precision Stability</span>
          <span class="aa-stat-icon">🎯</span>
        </div>
        <div class="aa-stat-val" style="color: #00D4AA;">${metrics.avgAccuracy}%</div>
        <div class="aa-stat-footer"><span style="color: var(--text-muted); font-size: 11px;">Average accuracy rating</span></div>
      </div>

      <div class="aa-stat-card">
        <div class="aa-stat-head">
          <span class="aa-stat-label">Practice Volume</span>
          <span class="aa-stat-icon">⏱️</span>
        </div>
        <div class="aa-stat-val" style="color: var(--text-primary);">${metrics.totalRuns} <span class="aa-stat-unit">runs</span></div>
        <div class="aa-stat-footer"><span style="color: var(--text-muted); font-size: 11px;">${metrics.totalMinutes}m total practice time</span></div>
      </div>

      <div class="aa-stat-card">
        <div class="aa-stat-head">
          <span class="aa-stat-label">Consistency Rate</span>
          <span class="aa-stat-icon">🔥</span>
        </div>
        <div class="aa-stat-val" style="color: #FF8E53;">${metrics.activeDays} <span class="aa-stat-unit">/ ${metrics.totalDays}d</span></div>
        <div class="aa-stat-footer"><span style="color: var(--text-muted); font-size: 11px;">${Math.round((metrics.activeDays / (metrics.totalDays || 1)) * 100)}% active days</span></div>
      </div>
    `;

    // 2. Meta Headers on Chart Cards
    wpmMeta.innerHTML = `<span class="aa-pill-badge">${metrics.totalRuns} data points · avg ${metrics.avgWpm} WPM</span>`;
    accMeta.innerHTML = `<span class="aa-pill-badge">avg ${metrics.avgAccuracy}% accuracy</span>`;

    // 3. Canvas Charts (defer to next frame so container sizes are computed)
    requestAnimationFrame(() => {
      renderWpmTrendChart(wpmCanvas, wpmTooltip, sessions, activePeriod, activeMode, targetWpm);
      renderAccuracyTrendChart(accCanvas, accTooltip, sessions, activePeriod, activeMode);
    });

    // 4. Diagnostics
    renderProblemKeysDiagnostic(problemKeysSlot, currentState.keyStats || {}, uiManager);
    renderFingerHeatmapTable(fingerSlot, currentState.keyStats || {});

    // 5. History Table
    renderSessionHistoryTable(historySlot, sessions, tableState, uiManager);
  }

  // Event Listeners for Controls
  modeToggle.addEventListener('click', e => {
    const btn = e.target.closest('button[data-mode]');
    if (!btn) return;
    activeMode = btn.dataset.mode;
    modeToggle.querySelectorAll('.aa-mode-btn').forEach(b => {
      const isActive = b.dataset.mode === activeMode;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
    });
    renderAll();
  });

  periodTabs.addEventListener('click', e => {
    const btn = e.target.closest('button[data-period]');
    if (!btn) return;
    activePeriod = btn.dataset.period;
    periodTabs.querySelectorAll('.aa-period-btn').forEach(b => {
      const isActive = b.dataset.period === activePeriod;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
    });
    renderAll();
  });

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      tableState.search = e.target.value;
      tableState.page = 1;
      const currentState = store.getState();
      renderSessionHistoryTable(historySlot, currentState.sessions || [], tableState, uiManager);
    });
  }

  if (kindSelect) {
    kindSelect.addEventListener('change', e => {
      tableState.kindFilter = e.target.value;
      tableState.page = 1;
      const currentState = store.getState();
      renderSessionHistoryTable(historySlot, currentState.sessions || [], tableState, uiManager);
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const currentState = store.getState();
      exportSessionsCSV(currentState.sessions || []);
    });
  }

  // ResizeObserver on canvas wrappers for crisp Retina redraws
  let ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => {
      const currentState = store.getState();
      const sessions = currentState.sessions || [];
      const targetWpm = currentState.targetWpm || 40;
      requestAnimationFrame(() => {
        renderWpmTrendChart(wpmCanvas, wpmTooltip, sessions, activePeriod, activeMode, targetWpm);
        renderAccuracyTrendChart(accCanvas, accTooltip, sessions, activePeriod, activeMode);
      });
    });
    if (wpmCanvas.parentElement) ro.observe(wpmCanvas.parentElement);
    if (accCanvas.parentElement) ro.observe(accCanvas.parentElement);
  }

  container._aaCleanup = () => {
    if (ro) ro.disconnect();
  };

  // Initial render
  renderAll();
}
