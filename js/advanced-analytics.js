/**
 * Advanced Analytics Dashboard
 * Canvas-based charts, session history table, finger heatmap trends, CSV export.
 * Zero external dependencies – pure vanilla JS + Canvas API.
 *
 * Exported API:
 *   renderWpmTrendChart(canvas, sessions, period)
 *   renderAccuracyTrendChart(canvas, sessions, period)
 *   renderFingerHeatmapTable(container, keyStats, period, sessions)
 *   renderSessionHistoryTable(container, sessions, sortKey, sortDir)
 *   exportSessionsCSV(sessions)
 *   renderAdvancedAnalyticsDashboard(container, state)
 */

import { FINGERS, KEY_TO_FINGER } from './finger-mapping.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns a Date representing midnight (local time) for the ISO date string
 * stored on each session.  Normalising to midnight makes grouping by calendar
 * day deterministic regardless of the time component.
 * @param {string} isoString
 * @returns {Date}
 */
function dayStart(isoString) {
  const d = new Date(isoString);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Filters a sessions array to those that fall within the given period window.
 * @param {Array}              sessions
 * @param {'7d'|'30d'|'all'}  period
 * @returns {Array}
 */
function filterByPeriod(sessions, period) {
  if (!sessions || sessions.length === 0) return [];
  if (period === 'all') return sessions;

  const days = period === '7d' ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  return sessions.filter(s => new Date(s.date) >= cutoff);
}

/**
 * Groups sessions by calendar day and returns an array of
 * { label: 'Mon DD', ts: number, avg: number } objects sorted oldest-first.
 * @param {Array}              sessions
 * @param {'wpm'|'accuracy'}   metric
 * @returns {Array<{label: string, ts: number, avg: number}>}
 */
function groupByDay(sessions, metric) {
  const map = new Map();

  for (const s of sessions) {
    const d = dayStart(s.date);
    const key = d.getTime();
    if (!map.has(key)) {
      map.set(key, { ts: key, values: [], label: fmtShortDate(d) });
    }
    const v = s[metric];
    if (typeof v === 'number' && !isNaN(v)) {
      map.get(key).values.push(v);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => a.ts - b.ts)
    .map(entry => ({
      label: entry.label,
      ts: entry.ts,
      avg: entry.values.length
        ? Math.round(entry.values.reduce((a, b) => a + b, 0) / entry.values.length)
        : 0
    }));
}

/**
 * Short month+day format: "Sep 1", "Jan 15" etc.
 * @param {Date} d
 * @returns {string}
 */
function fmtShortDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Full date-time format for the session table: "Jan 01, 2026 09:42"
 * @param {string} isoString
 * @returns {string}
 */
function fmtDateTime(isoString) {
  const d = new Date(isoString);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${date} ${hh}:${mm}`;
}

/**
 * Duration formatter: 95 → "1m 35s"
 * @param {number} sec
 * @returns {string}
 */
function fmtDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Renders star glyphs: ★ for earned, ☆ for empty (max 3).
 * @param {number} count
 * @returns {string} – HTML string
 */
function starsHtml(count) {
  const MAX = 3;
  let out = '';
  for (let i = 0; i < MAX; i++) {
    const filled = i < count;
    out += `<span style="color:${filled ? 'var(--reward-amber)' : 'var(--text-muted)'}">${filled ? '★' : '☆'}</span>`;
  }
  return out;
}

/**
 * Minimal HTML escape for untrusted string content injected via innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtmlStr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Wraps a CSV cell value in double-quotes, escaping any inner double-quotes.
 * @param {*} value
 * @returns {string}
 */
function csvCell(value) {
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

// ---------------------------------------------------------------------------
// Canvas utilities
// ---------------------------------------------------------------------------

/**
 * DPI-aware canvas setup.  Sizes the canvas bitmap to match the CSS layout
 * dimensions multiplied by devicePixelRatio, then scales the 2D context so
 * that all drawing coordinates remain in CSS pixel units.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {{ ctx: CanvasRenderingContext2D, W: number, H: number }}
 */
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  // Use the element's rendered width/height (set by CSS)
  const W = canvas.clientWidth  || 600;
  const H = canvas.clientHeight || 220;

  canvas.width  = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  return { ctx, W, H };
}

/**
 * Draws a centred "No data" placeholder on the canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {string} [msg]
 */
function drawEmpty(ctx, W, H, msg = 'No data for this period') {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.fillStyle = 'rgba(92,101,120,0.7)';
  ctx.font = '13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(msg, W / 2, H / 2);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Core chart renderer (shared engine for WPM and Accuracy charts)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} TrendChartOptions
 * @property {'wpm'|'accuracy'} metric
 * @property {string} lineColor        – solid line and dot colour
 * @property {string} gradientTop      – rgba() at the top of the fill gradient
 * @property {string} gradientBottom   – rgba() at the bottom (usually transparent)
 * @property {string} [yLabel]         – optional suffix for y-axis tick labels (e.g. '%')
 */

/**
 * Renders a canvas trend chart: grid, gradient area fill, smooth Bézier line,
 * data-point circles, and labelled axes.
 *
 * @param {HTMLCanvasElement}  canvas
 * @param {Array}              sessions
 * @param {'7d'|'30d'|'all'}  period
 * @param {TrendChartOptions}  opts
 */
function renderTrendChart(canvas, sessions, period, opts) {
  const { ctx, W, H } = setupCanvas(canvas);

  // ── Filter & group ──────────────────────────────────────────────────────
  const filtered = filterByPeriod(sessions, period);
  if (filtered.length === 0) { drawEmpty(ctx, W, H); return; }

  const points = groupByDay(filtered, opts.metric);
  if (points.length === 0) { drawEmpty(ctx, W, H); return; }

  // ── Layout constants ────────────────────────────────────────────────────
  const PAD = { top: 24, right: 28, bottom: 44, left: 52 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top  - PAD.bottom;

  // ── Value range ─────────────────────────────────────────────────────────
  const vals   = points.map(p => p.avg);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const isAcc  = opts.metric === 'accuracy';

  const maxVal = isAcc ? 100 : Math.max(rawMax + 10, 20);
  const minVal = Math.max(0, rawMin - (isAcc ? 5 : 10));
  const range  = maxVal - minVal || 1;

  // ── Coordinate mappers ───────────────────────────────────────────────────
  const xOf = idx =>
    PAD.left + (points.length === 1 ? chartW / 2 : (idx / (points.length - 1)) * chartW);
  const yOf = val =>
    PAD.top + chartH - ((val - minVal) / range) * chartH;

  // ── Clear ────────────────────────────────────────────────────────────────
  ctx.clearRect(0, 0, W, H);

  // ── Horizontal grid lines ─────────────────────────────────────────────────
  const GRID_LINES = 4;
  ctx.save();
  ctx.setLineDash([4, 4]);
  for (let i = 0; i <= GRID_LINES; i++) {
    const y = PAD.top + (chartH / GRID_LINES) * i;
    // Baseline uses a slightly stronger stroke
    ctx.strokeStyle = i === GRID_LINES
      ? 'rgba(255,255,255,0.15)'
      : 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.setLineDash(i === GRID_LINES ? [] : [4, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + chartW, y);
    ctx.stroke();
  }
  ctx.restore();

  // ── Y-axis labels ─────────────────────────────────────────────────────────
  ctx.save();
  ctx.fillStyle = 'rgba(154,163,178,0.8)';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= GRID_LINES; i++) {
    const val = Math.round(minVal + (range / GRID_LINES) * (GRID_LINES - i));
    const y   = PAD.top + (chartH / GRID_LINES) * i;
    ctx.fillText(`${val}${opts.yLabel || ''}`, PAD.left - 8, y);
  }
  ctx.restore();

  // ── Gradient area fill (only when ≥ 2 points for a closed shape) ──────────
  if (points.length > 1) {
    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH);
    grad.addColorStop(0, opts.gradientTop);
    grad.addColorStop(1, opts.gradientBottom);

    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(points[0].avg));

    for (let i = 1; i < points.length; i++) {
      const xc = (xOf(i - 1) + xOf(i)) / 2;
      const yc = (yOf(points[i - 1].avg) + yOf(points[i].avg)) / 2;
      ctx.quadraticCurveTo(xOf(i - 1), yOf(points[i - 1].avg), xc, yc);
    }
    // Close back down to the baseline
    ctx.lineTo(xOf(points.length - 1), yOf(points[points.length - 1].avg));
    ctx.lineTo(xOf(points.length - 1), PAD.top + chartH);
    ctx.lineTo(xOf(0), PAD.top + chartH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Smooth Bézier line ────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = opts.lineColor;
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.beginPath();

  if (points.length === 1) {
    // Single data point – render a small horizontal tick instead of a dot-line
    ctx.moveTo(xOf(0) - 12, yOf(points[0].avg));
    ctx.lineTo(xOf(0) + 12, yOf(points[0].avg));
  } else {
    ctx.moveTo(xOf(0), yOf(points[0].avg));
    for (let i = 1; i < points.length; i++) {
      const xc = (xOf(i - 1) + xOf(i)) / 2;
      const yc = (yOf(points[i - 1].avg) + yOf(points[i].avg)) / 2;
      ctx.quadraticCurveTo(xOf(i - 1), yOf(points[i - 1].avg), xc, yc);
    }
    ctx.lineTo(xOf(points.length - 1), yOf(points[points.length - 1].avg));
  }
  ctx.stroke();
  ctx.restore();

  // ── Data point circles ────────────────────────────────────────────────────
  for (let i = 0; i < points.length; i++) {
    const x = xOf(i);
    const y = yOf(points[i].avg);

    // Subtle glow ring
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = opts.lineColor;
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Solid filled dot with dark border
    ctx.save();
    ctx.fillStyle   = opts.lineColor;
    ctx.strokeStyle = '#151923';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ── X-axis date labels ────────────────────────────────────────────────────
  // Limit the number of visible labels to avoid crowding
  const maxLabels = Math.min(points.length, 7);
  const step = Math.max(1, Math.floor((points.length - 1) / Math.max(1, maxLabels - 1)));

  ctx.save();
  ctx.fillStyle    = 'rgba(154,163,178,0.8)';
  ctx.font         = '10px Inter, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';

  const drawnX = new Set();
  for (let i = 0; i < points.length; i += step) {
    const x = Math.round(xOf(i));
    if (drawnX.has(x)) continue;
    drawnX.add(x);
    ctx.fillText(points[i].label, x, PAD.top + chartH + 9);
  }
  // Always render the very last label
  if (points.length > 1) {
    const last = points.length - 1;
    const x = Math.round(xOf(last));
    if (!drawnX.has(x)) {
      ctx.fillText(points[last].label, x, PAD.top + chartH + 9);
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 1. renderWpmTrendChart
// ---------------------------------------------------------------------------

/**
 * Renders a WPM trend chart onto the given canvas using the Canvas 2D API.
 * Supports period filtering ('7d', '30d', 'all') and shows a graceful empty
 * state when no data is available.
 *
 * Colour: purple (#7C5CFC) line with rgba(124,92,252,0.4) → transparent fill.
 *
 * @param {HTMLCanvasElement}  canvas
 * @param {Array}              sessions  – state.sessions
 * @param {'7d'|'30d'|'all'}  period
 */
export function renderWpmTrendChart(canvas, sessions, period) {
  renderTrendChart(canvas, sessions, period, {
    metric:         'wpm',
    lineColor:      '#7C5CFC',
    gradientTop:    'rgba(124,92,252,0.4)',
    gradientBottom: 'rgba(124,92,252,0)',
    yLabel:         ''
  });
}

// ---------------------------------------------------------------------------
// 2. renderAccuracyTrendChart
// ---------------------------------------------------------------------------

/**
 * Renders an accuracy trend chart onto the given canvas.
 * Y-axis is capped at 100 %.  Colour: teal (#00D4AA).
 *
 * @param {HTMLCanvasElement}  canvas
 * @param {Array}              sessions
 * @param {'7d'|'30d'|'all'}  period
 */
export function renderAccuracyTrendChart(canvas, sessions, period) {
  renderTrendChart(canvas, sessions, period, {
    metric:         'accuracy',
    lineColor:      '#00D4AA',
    gradientTop:    'rgba(0,212,170,0.35)',
    gradientBottom: 'rgba(0,212,170,0)',
    yLabel:         '%'
  });
}

// ---------------------------------------------------------------------------
// 3. renderFingerHeatmapTable
// ---------------------------------------------------------------------------

/**
 * Computes per-finger accuracy aggregates from a keyStats object.
 *
 * @param {Object} keyStats – state.keyStats  { [char]: { attempts, errors } }
 * @returns {Array<{finger: Object, accuracy: number, totalAttempts: number}>}
 */
function computeFingerAccuracies(keyStats) {
  // Initialise a bucket for every finger
  const stats = {};
  Object.values(FINGERS).forEach(f => {
    stats[f.id] = { finger: f, totalAttempts: 0, totalErrors: 0 };
  });

  // Accumulate key-level data into finger buckets
  Object.entries(keyStats || {}).forEach(([char, data]) => {
    const fingerId = KEY_TO_FINGER[char] || KEY_TO_FINGER[char.toLowerCase()];
    if (fingerId && stats[fingerId]) {
      stats[fingerId].totalAttempts += (data.attempts || 0);
      stats[fingerId].totalErrors   += (data.errors   || 0);
    }
  });

  return Object.values(stats).map(entry => {
    const { totalAttempts, totalErrors } = entry;
    const accuracy = totalAttempts >= 5
      ? Math.max(0, Math.min(100, Math.round(((totalAttempts - totalErrors) / totalAttempts) * 100)))
      : 100; // Fresh baseline when fewer than 5 attempts
    return { finger: entry.finger, accuracy, totalAttempts };
  });
}

/**
 * Maps an accuracy percentage to its corresponding traffic-light colour.
 * < 80 %  → red   |  80–89 % → amber  |  90–96 % → teal  |  97 %+ → purple
 *
 * @param {number} acc
 * @returns {string} – hex colour
 */
function accuracyColor(acc) {
  if (acc < 80) return '#FF5C7A'; // --error-coral
  if (acc < 90) return '#FFB86B'; // --reward-amber
  if (acc < 97) return '#00D4AA'; // --success-teal
  return '#7C5CFC';               // --accent-primary
}

/**
 * Renders the 10-finger accuracy heatmap grid into `container`.
 * Bars animate in via a CSS width transition triggered on the next paint frame.
 *
 * @param {HTMLElement}        container
 * @param {Object}             keyStats   – state.keyStats
 * @param {'7d'|'30d'|'all'}  period
 * @param {Array}              sessions
 */
export function renderFingerHeatmapTable(container, keyStats, period, sessions) {
  // For '7d'/'30d' the global keyStats is used because per-session key deltas
  // are not stored on the lightweight session objects in state.sessions.
  // The period parameter is accepted for API consistency and future use.
  const effectiveStats = keyStats || {};
  const fingerData = computeFingerAccuracies(effectiveStats);

  // Canonical left-to-right display order
  const ORDER = [
    'left-pinky', 'left-ring', 'left-middle', 'left-index',
    'thumbs',
    'right-index', 'right-middle', 'right-ring', 'right-pinky'
  ];

  const sorted = ORDER
    .map(id => fingerData.find(f => f.finger.id === id))
    .filter(Boolean);

  // Render starting with bars at width:0 so the transition plays on mount
  container.innerHTML = sorted.map(({ finger, accuracy, totalAttempts }) => {
    const color  = accuracyColor(accuracy);
    const noData = totalAttempts < 5;

    return `
      <div style="
        display: grid;
        grid-template-columns: 134px 1fr 52px;
        align-items: center;
        gap: 12px;
        padding: 9px 0;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      ">
        <!-- Finger name + colour dot -->
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: ${finger.color};
            flex-shrink: 0;
          "></span>
          <span style="
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            white-space: nowrap;
          ">${finger.name}</span>
        </div>

        <!-- Progress bar track -->
        <div style="
          position: relative;
          height: 8px;
          background: rgba(255,255,255,0.07);
          border-radius: 999px;
          overflow: hidden;
        ">
          <div class="aa-heatmap-bar" data-target="${noData ? 0 : accuracy}" style="
            height: 100%;
            width: 0%;
            background: ${color};
            border-radius: 999px;
            transition: width 0.65s cubic-bezier(0.16,1,0.3,1);
            will-change: width;
          "></div>
        </div>

        <!-- Accuracy label -->
        <div style="
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 700;
          color: ${noData ? 'var(--text-muted)' : color};
          text-align: right;
          white-space: nowrap;
        ">${noData ? '—' : `${accuracy}%`}</div>
      </div>
    `;
  }).join('');

  // Animate bars in on the next paint so the CSS transition from 0→target fires
  requestAnimationFrame(() => {
    container.querySelectorAll('.aa-heatmap-bar').forEach(bar => {
      bar.style.width = `${bar.dataset.target}%`;
    });
  });
}

// ---------------------------------------------------------------------------
// 4. renderSessionHistoryTable
// ---------------------------------------------------------------------------

/**
 * Returns the inline CSS for a table header cell.
 * @param {boolean} isActive – whether this column is currently sorted
 * @returns {string}
 */
function thStyle(isActive) {
  return [
    'padding: 10px 12px',
    'text-align: left',
    'font-size: 11px',
    'font-weight: 700',
    'text-transform: uppercase',
    'letter-spacing: 0.06em',
    `color: ${isActive ? 'var(--accent-primary)' : 'var(--text-muted)'}`,
    'white-space: nowrap',
    'user-select: none'
  ].join('; ');
}

/**
 * Returns the inline CSS for a table body cell.
 * @returns {string}
 */
function tdStyle() {
  return [
    'padding: 10px 12px',
    'border-bottom: 1px solid rgba(255,255,255,0.04)',
    'vertical-align: middle'
  ].join('; ');
}

/**
 * Inline style for pagination buttons.
 * @param {boolean} disabled
 * @returns {string}
 */
function pageBtnStyle(disabled) {
  return [
    'padding: 6px 14px',
    'border-radius: var(--radius-sm, 6px)',
    'font-size: 12px',
    'font-weight: 600',
    `color: ${disabled ? 'var(--text-muted)' : 'var(--text-primary)'}`,
    `background: ${disabled ? 'rgba(255,255,255,0.02)' : 'var(--surface-2)'}`,
    `border: 1px solid ${disabled ? 'rgba(255,255,255,0.05)' : 'var(--border-subtle)'}`,
    `cursor: ${disabled ? 'not-allowed' : 'pointer'}`,
    `opacity: ${disabled ? '0.4' : '1'}`,
    'transition: all 0.15s ease',
    'font-family: var(--font-sans)',
    'display: inline-flex',
    'align-items: center',
    'gap: 4px'
  ].join('; ');
}

/**
 * Renders a sortable and paginated session history table into `container`.
 * Displays 10 attempts per page with previous/next navigation and column sorting.
 *
 * @param {HTMLElement} container
 * @param {Array}       sessions
 * @param {'date'|'wpm'|'accuracy'|'duration'|'stars'} [sortKey='date']
 * @param {'asc'|'desc'} [sortDir='desc']
 * @param {number}      [page=1]
 * @param {number}      [pageSize=10]
 */
export function renderSessionHistoryTable(container, sessions, sortKey = 'date', sortDir = 'desc', page = 1, pageSize = 10) {
  // ── Empty state ──────────────────────────────────────────────────────────
  if (!sessions || sessions.length === 0) {
    container.innerHTML = `
      <div style="
        padding: 40px 24px;
        text-align: center;
        color: var(--text-muted);
        font-size: 14px;
      ">Complete a lesson to see your history here</div>
    `;
    return;
  }

  // ── Sort ─────────────────────────────────────────────────────────────────
  const sorted = [...sessions].sort((a, b) => {
    let va, vb;
    switch (sortKey) {
      case 'date':     va = new Date(a.date).getTime(); vb = new Date(b.date).getTime(); break;
      case 'wpm':      va = a.wpm      || 0; vb = b.wpm      || 0; break;
      case 'accuracy': va = a.accuracy || 0; vb = b.accuracy || 0; break;
      case 'duration': va = a.durationSec || 0; vb = b.durationSec || 0; break;
      case 'stars':    va = a.stars    || 0; vb = b.stars    || 0; break;
      default:         va = 0;               vb = 0;
    }
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  // ── Pagination calculations (10 items per page) ──────────────────────────
  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  const pageItems = sorted.slice(startIndex, endIndex);

  // ── Column definitions ───────────────────────────────────────────────────
  const COLS = [
    { key: 'date',     label: 'Date' },
    { key: 'lesson',   label: 'Lesson',   noSort: true },
    { key: 'wpm',      label: 'WPM' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'duration', label: 'Duration' },
    { key: 'stars',    label: 'Stars' }
  ];

  // ── Header ───────────────────────────────────────────────────────────────
  const thCells = COLS.map(col => {
    if (col.noSort) {
      return `<th style="${thStyle(false)}">${col.label}</th>`;
    }
    const isActive = sortKey === col.key;
    const nextDir  = isActive && sortDir === 'desc' ? 'asc' : 'desc';
    const arrow    = isActive ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';
    return `<th data-sort-key="${col.key}" data-sort-dir="${nextDir}" style="${thStyle(isActive)}" title="Sort by ${col.label}">${col.label}${arrow}</th>`;
  }).join('');

  // ── Body rows ─────────────────────────────────────────────────────────────
  const bodyRows = pageItems.map((s, idx) => {
    const rowBg = idx % 2 === 0 ? 'background: rgba(255,255,255,0.015);' : '';
    const accColor = s.accuracy >= 97
      ? 'var(--success-teal)'
      : s.accuracy >= 90
        ? 'var(--text-primary)'
        : 'var(--reward-amber)';

    return `
      <tr style="${rowBg}">
        <td style="${tdStyle()}">${fmtDateTime(s.date)}</td>
        <td style="${tdStyle()} max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtmlStr(s.lessonTitle || `Lesson ${s.lessonId}`)}">
          ${escapeHtmlStr(s.lessonTitle || `Lesson ${s.lessonId}`)}
        </td>
        <td style="${tdStyle()} font-family:var(--font-mono); color:var(--accent-primary); font-weight:700;">
          ${s.wpm}
        </td>
        <td style="${tdStyle()} font-family:var(--font-mono); color:${accColor}; font-weight:700;">
          ${s.accuracy}%
        </td>
        <td style="${tdStyle()} font-family:var(--font-mono); color:var(--text-secondary);">
          ${fmtDuration(s.durationSec || 0)}
        </td>
        <td style="${tdStyle()} letter-spacing:2px;">
          ${starsHtml(s.stars || 0)}
        </td>
      </tr>
    `;
  }).join('');

  // ── Assemble HTML ─────────────────────────────────────────────────────────
  container.innerHTML = `
    <div style="overflow-x: auto; width: 100%;">
      <table style="
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        color: var(--text-secondary);
      ">
        <thead>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">${thCells}</tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>

    <!-- Pagination Bar (10 per page) -->
    <div style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid rgba(255,255,255,0.06);
      font-size: 12px;
      color: var(--text-muted);
    ">
      <div>
        Showing <strong style="color:var(--text-primary); font-family:var(--font-mono);">${totalCount > 0 ? startIndex + 1 : 0}–${endIndex}</strong> of <strong style="color:var(--text-primary); font-family:var(--font-mono);">${totalCount}</strong> attempts
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <button class="aa-page-btn aa-page-prev" ${currentPage <= 1 ? 'disabled' : ''} style="${pageBtnStyle(currentPage <= 1)}" title="Previous 10 attempts">
          ‹ Previous
        </button>
        <span style="font-family: var(--font-mono); padding: 0 8px; color: var(--text-secondary); font-weight: 600;">
          Page ${currentPage} of ${totalPages}
        </span>
        <button class="aa-page-btn aa-page-next" ${currentPage >= totalPages ? 'disabled' : ''} style="${pageBtnStyle(currentPage >= totalPages)}" title="Next 10 attempts">
          Next ›
        </button>
      </div>
    </div>
  `;

  // ── Attach sort click handlers ────────────────────────────────────────────
  container.querySelectorAll('th[data-sort-key]').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      renderSessionHistoryTable(container, sessions, th.dataset.sortKey, th.dataset.sortDir, 1, pageSize);
    });
  });

  // ── Attach pagination click handlers ──────────────────────────────────────
  const prevBtn = container.querySelector('.aa-page-prev');
  if (prevBtn && currentPage > 1) {
    prevBtn.addEventListener('click', () => {
      renderSessionHistoryTable(container, sessions, sortKey, sortDir, currentPage - 1, pageSize);
    });
  }

  const nextBtn = container.querySelector('.aa-page-next');
  if (nextBtn && currentPage < totalPages) {
    nextBtn.addEventListener('click', () => {
      renderSessionHistoryTable(container, sessions, sortKey, sortDir, currentPage + 1, pageSize);
    });
  }
}

// ---------------------------------------------------------------------------
// 5. exportSessionsCSV
// ---------------------------------------------------------------------------

/**
 * Generates a CSV of all sessions and triggers a browser file download.
 *
 * Columns: Date, Lesson, WPM, Accuracy, Duration (sec), Stars, XP Earned, Kind
 * File name: keyflow-sessions-YYYY-MM-DD.csv
 *
 * @param {Array} sessions – state.sessions
 */
export function exportSessionsCSV(sessions) {
  if (!sessions || sessions.length === 0) {
    console.warn('[advanced-analytics] exportSessionsCSV: nothing to export');
    return;
  }

  const HEADERS = ['Date', 'Lesson', 'WPM', 'Accuracy', 'Duration (sec)', 'Stars', 'XP Earned', 'Kind'];

  const csvRows = [
    HEADERS.join(','),
    ...sessions.map(s => [
      csvCell(fmtDateTime(s.date)),
      csvCell(s.lessonTitle || `Lesson ${s.lessonId}`),
      s.wpm        || 0,
      s.accuracy   || 0,
      s.durationSec|| 0,
      s.stars      || 0,
      s.xpEarned   || 0,
      csvCell(s.kind || 'lesson')
    ].join(','))
  ];

  const csv  = csvRows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const link  = document.createElement('a');
  link.href     = url;
  link.download = `keyflow-sessions-${today}.csv`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Clean up the object URL after the download is triggered
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 150);
}

// ---------------------------------------------------------------------------
// Shared inline-style helpers
// ---------------------------------------------------------------------------

/** Glassmorphism card wrapper style. */
function cardStyle() {
  return [
    'background: var(--surface-1)',
    'border: 1px solid var(--border-subtle)',
    'border-radius: var(--radius-md)',
    'padding: 22px 24px',
    'box-shadow: var(--shadow-sm)',
    'display: flex',
    'flex-direction: column',
    'gap: 16px'
  ].join('; ');
}

/** Row that holds a card title on the left and an action/badge on the right. */
function cardHeaderStyle() {
  return [
    'display: flex',
    'align-items: center',
    'justify-content: space-between',
    'flex-wrap: wrap',
    'gap: 8px'
  ].join('; ');
}

/** Bold card section title. */
function cardTitleStyle() {
  return 'font-size: 15px; font-weight: 700; color: var(--text-primary);';
}

/**
 * Inline style for a period selector pill button.
 * @param {string} period  – '7d' | '30d' | 'all'
 * @param {string} active  – currently selected period
 * @returns {string}
 */
function periodTabStyle(period, active) {
  const on = period === active;
  return [
    'padding: 6px 16px',
    'border-radius: var(--radius-full)',
    `font-size: 13px`,
    `font-weight: ${on ? '700' : '600'}`,
    `color: ${on ? 'var(--text-primary)' : 'var(--text-muted)'}`,
    `background: ${on ? 'var(--surface-3)' : 'transparent'}`,
    `border: ${on ? '1px solid var(--border-light)' : '1px solid transparent'}`,
    'cursor: pointer',
    'transition: all 0.15s',
    'white-space: nowrap'
  ].join('; ');
}

// ---------------------------------------------------------------------------
// 6. renderAdvancedAnalyticsDashboard
// ---------------------------------------------------------------------------

/**
 * Renders the complete advanced analytics page into `container`.
 *
 * Structure:
 *   • Header with period tabs (7 Days / 30 Days / All Time)
 *   • Two chart cards side by side (WPM Trend + Accuracy Trend)
 *   • Finger heatmap card
 *   • Session history table card with CSV export button
 *
 * Period state is managed internally; switching tabs re-renders chart data
 * without destroying the outer HTML shell.
 *
 * A `container._aaCleanup()` function is exposed so the caller can remove the
 * resize listener when navigating away from this screen.
 *
 * @param {HTMLElement} container  – DOM node to render into
 * @param {Object}      state      – store.getState() snapshot
 */
export function renderAdvancedAnalyticsDashboard(container, state) {
  /** @type {'7d'|'30d'|'all'} */
  let activePeriod = '7d';

  // ── Static shell ──────────────────────────────────────────────────────────
  container.innerHTML = `
    <div id="aa-root" style="
      display: flex;
      flex-direction: column;
      gap: 28px;
      width: 100%;
      font-family: var(--font-sans);
      color: var(--text-primary);
    ">

      <!-- Page header + period tabs -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      ">
        <div>
          <h2 style="
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.01em;
            color: var(--text-primary);
            margin: 0 0 4px;
          ">Advanced Analytics</h2>
          <p style="
            font-size: 13px;
            color: var(--text-secondary);
            margin: 0;
          ">Detailed trends, finger breakdown, and session history</p>
        </div>

        <div id="aa-period-tabs" style="
          display: flex;
          gap: 4px;
          background: var(--surface-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-full);
          padding: 4px;
        ">
          ${['7d', '30d', 'all'].map(p => `
            <button data-period="${p}" style="${periodTabStyle(p, activePeriod)}">
              ${p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : 'All Time'}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Charts row -->
      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
      ">

        <!-- WPM Trend card -->
        <div style="${cardStyle()}">
          <div style="${cardHeaderStyle()}">
            <span style="${cardTitleStyle()}">⚡ WPM Trend</span>
            <span id="aa-wpm-avg" style="font-size:11px; color:var(--text-muted);"></span>
          </div>
          <canvas id="aa-wpm-canvas" style="
            display: block;
            width: 100%;
            height: 220px;
            border-radius: var(--radius-sm);
          "></canvas>
        </div>

        <!-- Accuracy Trend card -->
        <div style="${cardStyle()}">
          <div style="${cardHeaderStyle()}">
            <span style="${cardTitleStyle()}">🎯 Accuracy Trend</span>
            <span id="aa-acc-avg" style="font-size:11px; color:var(--text-muted);"></span>
          </div>
          <canvas id="aa-acc-canvas" style="
            display: block;
            width: 100%;
            height: 220px;
            border-radius: var(--radius-sm);
          "></canvas>
        </div>
      </div>

      <!-- Finger Heatmap card -->
      <div style="${cardStyle()}">
        <div style="${cardHeaderStyle()}">
          <span style="${cardTitleStyle()}">🖐 Finger Accuracy Heatmap</span>
          <!-- Legend -->
          <div style="display:flex; gap:14px; flex-wrap:wrap;">
            ${[
              { color: '#FF5C7A', label: '< 80%'  },
              { color: '#FFB86B', label: '80–89%' },
              { color: '#00D4AA', label: '90–96%' },
              { color: '#7C5CFC', label: '97%+'   }
            ].map(l => `
              <span style="display:flex; align-items:center; gap:5px; font-size:11px; color:var(--text-muted);">
                <span style="
                  display: inline-block;
                  width: 8px;
                  height: 8px;
                  border-radius: 50%;
                  background: ${l.color};
                "></span>
                ${l.label}
              </span>
            `).join('')}
          </div>
        </div>
        <div id="aa-heatmap-container" style="padding-top: 4px;"></div>
      </div>

      <!-- Session History card -->
      <div style="${cardStyle()}">
        <div style="${cardHeaderStyle()}">
          <span style="${cardTitleStyle()}">📋 Session History</span>
          <button id="aa-export-btn" style="
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 7px 15px;
            border-radius: var(--radius-full);
            background: rgba(124,92,252,0.12);
            border: 1px solid rgba(124,92,252,0.35);
            color: var(--accent-primary);
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.15s;
            font-family: var(--font-sans);
          ">↓ Export CSV</button>
        </div>
        <div id="aa-history-container" style="padding-top: 4px;"></div>
      </div>

    </div>
  `;

  // ── DOM references ────────────────────────────────────────────────────────
  const wpmCanvas  = container.querySelector('#aa-wpm-canvas');
  const accCanvas  = container.querySelector('#aa-acc-canvas');
  const heatmapEl  = container.querySelector('#aa-heatmap-container');
  const historyEl  = container.querySelector('#aa-history-container');
  const exportBtn  = container.querySelector('#aa-export-btn');
  const tabsEl     = container.querySelector('#aa-period-tabs');
  const wpmAvgEl   = container.querySelector('#aa-wpm-avg');
  const accAvgEl   = container.querySelector('#aa-acc-avg');

  // ── Export handler ────────────────────────────────────────────────────────
  exportBtn.addEventListener('click',       () => exportSessionsCSV(state.sessions));
  exportBtn.addEventListener('mouseenter',  () => { exportBtn.style.background = 'rgba(124,92,252,0.22)'; });
  exportBtn.addEventListener('mouseleave',  () => { exportBtn.style.background = 'rgba(124,92,252,0.12)'; });

  // ── Data render (called on load + period change) ──────────────────────────
  function renderData() {
    const sessions = state.sessions || [];
    const filtered = filterByPeriod(sessions, activePeriod);

    // Update subtitle average badges
    if (filtered.length > 0) {
      const avgWpm = Math.round(filtered.reduce((s, x) => s + (x.wpm || 0), 0) / filtered.length);
      const avgAcc = Math.round(filtered.reduce((s, x) => s + (x.accuracy || 0), 0) / filtered.length);
      wpmAvgEl.textContent = `avg ${avgWpm} WPM`;
      accAvgEl.textContent = `avg ${avgAcc}%`;
    } else {
      wpmAvgEl.textContent = '';
      accAvgEl.textContent = '';
    }

    // Charts need layout dimensions from the browser; defer one frame
    requestAnimationFrame(() => {
      renderWpmTrendChart(wpmCanvas,  sessions, activePeriod);
      renderAccuracyTrendChart(accCanvas, sessions, activePeriod);
    });

    // Heatmap (period arg is passed for API consistency)
    renderFingerHeatmapTable(heatmapEl, state.keyStats || {}, activePeriod, sessions);

    // History table shows sessions paginated at 10 items per page
    renderSessionHistoryTable(historyEl, sessions, 'date', 'desc', 1, 10);
  }

  // ── Period tab click ──────────────────────────────────────────────────────
  tabsEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-period]');
    if (!btn) return;

    activePeriod = btn.dataset.period;

    // Re-style all tab buttons
    tabsEl.querySelectorAll('button[data-period]').forEach(b => {
      b.style.cssText = periodTabStyle(b.dataset.period, activePeriod);
    });

    renderData();
  });

  // ── Initial paint ─────────────────────────────────────────────────────────
  renderData();

  // ── Resize handler (debounced) ────────────────────────────────────────────
  // Re-draws charts with correct DPI scaling when the window is resized.
  let resizeTimer = null;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      requestAnimationFrame(() => {
        renderWpmTrendChart(wpmCanvas,  state.sessions || [], activePeriod);
        renderAccuracyTrendChart(accCanvas, state.sessions || [], activePeriod);
      });
    }, 120);
  };
  window.addEventListener('resize', onResize);

  /**
   * Call this when navigating away from the analytics screen to remove the
   * resize listener and avoid memory leaks.
   */
  container._aaCleanup = () => window.removeEventListener('resize', onResize);
}
