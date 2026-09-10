/** Interactive lesson telemetry. SVG stays crisp at the actual container size. */
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const finite = value => value !== null && value !== undefined && Number.isFinite(Number(value));
const positive = value => finite(value) ? Math.max(0, Number(value)) : 0;
const keyLabel = key => ({ ' ': 'space', '\n': 'enter', '\t': 'tab' }[key] || key || '?');
const timeLabel = seconds => `${Number(seconds.toFixed(1))}s`;
let chartId = 0;

export function buildLessonChartData(summary = {}) {
  const samples = (Array.isArray(summary.wpmHistory) ? summary.wpmHistory : [])
    .map((sample, index) => ({
      timeSec: positive(typeof sample === 'number' ? index + 1 : sample?.timeSec ?? index + 1),
      wpm: typeof sample === 'number' ? sample : sample?.wpm,
      rawWpm: finite(sample?.rawWpm) ? positive(sample.rawWpm) : null
    }))
    .filter(sample => finite(sample.wpm) && Number(sample.wpm) >= 0)
    .map(sample => ({ ...sample, wpm: Number(sample.wpm) }))
    .sort((a, b) => a.timeSec - b.timeSec);
  // Old / imported histories can contain repeated timestamps.
  const unique = [...new Map(samples.map(sample => [sample.timeSec, sample])).values()];
  const errors = (Array.isArray(summary.errorHistory) ? summary.errorHistory : [])
    .filter(error => finite(error?.timeSec) && Number(error.timeSec) >= 0)
    .map(error => ({ ...error, timeSec: Number(error.timeSec) }))
    .sort((a, b) => a.timeSec - b.timeSec);
  const duration = Math.max(positive(summary.durationSec), unique.at(-1)?.timeSec || 0, errors.at(-1)?.timeSec || 0, 1);
  const buckets = new Map();
  for (const error of errors) {
    const second = Math.min(Math.floor(error.timeSec), Math.max(0, Math.ceil(duration) - 1));
    if (!buckets.has(second)) buckets.set(second, { second, events: [] });
    buckets.get(second).events.push(error);
  }
  const errorBuckets = [...buckets.values()].map(bucket => ({
    ...bucket,
    timeSec: bucket.events.reduce((sum, error) => sum + error.timeSec, 0) / bucket.events.length,
    count: bucket.events.length
  }));
  return {
    samples: unique, errorBuckets, duration,
    hasRaw: unique.some(sample => sample.rawWpm !== null),
    hasErrorTiming: Array.isArray(summary.errorHistory),
    totalErrors: Math.max(positive(summary.totalErrors), errors.length),
    peakWpm: unique.reduce((peak, sample) => Math.max(peak, sample.wpm), 0),
    rawWpm: finite(summary.rawWpm) ? positive(summary.rawWpm)
      : finite(summary.totalKeystrokes) ? Math.round(positive(summary.totalKeystrokes) * 12 / duration) : null,
    target: positive(summary.wpmTarget)
  };
}

export function mountLessonChart(root, summary = {}) {
  if (!root) return () => {};
  const data = buildLessonChartData(summary);
  const id = `lesson-chart-${++chartId}`;
  const clean = data.hasErrorTiming && data.totalErrors === 0;
  const errorStatus = clean ? 'A clean run' : `${data.totalErrors} mistype${data.totalErrors === 1 ? '' : 's'}`;
  const metric = (label, value, className = '') => `<div class="pace-metric ${className}"><dt>${label}</dt><dd>${value}</dd></div>`;
  root.innerHTML = `
    <div class="pace-heading">
      <div><span class="pace-eyebrow">THE WHOLE RUN, AT A GLANCE</span><h3 id="${id}-title">Your typing rhythm</h3></div>
      <span class="pace-status ${clean ? 'is-clean' : ''}"><span aria-hidden="true">${clean ? '✓' : '×'}</span> ${errorStatus}</span>
    </div>
    <div class="pace-toolbar">
      <p>Find your flow. See where you slipped.</p>
      <div class="pace-legend" aria-label="Chart series">
        <span class="pace-legend-wpm" title="Correct keystrokes per minute, averaged over elapsed time"><i aria-hidden="true"></i>wpm</span>
        <button type="button" data-series="raw" aria-pressed="true" ${data.hasRaw ? '' : 'disabled'} title="All typing attempts per minute in each sample interval"><i aria-hidden="true"></i>raw</button>
        <button type="button" data-series="errors" aria-pressed="true" ${data.hasErrorTiming ? '' : 'disabled'} title="Mistypes grouped by second; counts use the right axis"><i aria-hidden="true">×</i>mistypes</button>
      </div>
    </div>
    <div class="pace-plot" ${data.samples.length ? `tabindex="0" role="group" aria-labelledby="${id}-title" aria-describedby="${id}-help"` : ''}>
      <div class="pace-svg-host"></div>
      <div class="pace-tooltip" role="status" aria-live="polite" hidden></div>
    </div>
    <dl class="pace-metrics">
      ${metric('peak wpm', data.samples.length ? Math.round(data.peakWpm) : '—', 'pace-metric-accent')}
      ${metric('raw average', data.rawWpm === null ? '—' : Math.round(data.rawWpm))}
      ${metric('consistency', finite(summary.consistency) ? `${Math.round(positive(summary.consistency))}%` : '—')}
      ${metric('active time', timeLabel(data.duration))}
    </dl>
    <div class="pace-footnote" id="${id}-help">
      <span>${data.hasErrorTiming ? '<b aria-hidden="true">×</b> Mistypes per second · right axis' : 'Mistype timing was not recorded for this run.'}</span>
      <span>${data.samples.length ? 'Hover or touch to inspect · ← → to explore' : 'Finish a lesson to record your rhythm.'}</span>
    </div>`;
  const plot = root.querySelector('.pace-plot');
  const host = root.querySelector('.pace-svg-host');
  const tooltip = root.querySelector('.pace-tooltip');
  const visible = { raw: data.hasRaw, errors: data.hasErrorTiming };
  let width = 0;
  let geometry;
  let activeIndex = -1;
  // Error buckets have their own inspection stops, so short bursts aren't lost
  // when a delayed timer leaves a gap between speed samples.
  const stops = [
    ...data.samples.map(sample => ({ timeSec: sample.timeSec, sample })),
    ...data.errorBuckets.map(bucket => ({ timeSec: bucket.timeSec, bucket }))
  ].sort((a, b) => a.timeSec - b.timeSec);
  const nearestSample = time => data.samples.reduce((best, sample) =>
    !best || Math.abs(sample.timeSec - time) < Math.abs(best.timeSec - time) ? sample : best, null);
  const hide = () => {
    tooltip.hidden = true;
    activeIndex = -1;
    host.querySelector('.pace-cursor')?.setAttribute('visibility', 'hidden');
  };
  const inspect = index => {
    if (!geometry || !stops.length) return;
    activeIndex = Math.max(0, Math.min(stops.length - 1, index));
    const stop = stops[activeIndex];
    const sample = stop.sample || nearestSample(stop.timeSec);
    const bucket = stop.bucket || data.errorBuckets.find(item =>
      item.second === Math.min(Math.floor(stop.timeSec), Math.ceil(data.duration) - 1));
    const { x, y, top, bottom } = geometry;
    const cx = x(stop.timeSec);
    const cursor = host.querySelector('.pace-cursor');
    cursor.setAttribute('visibility', 'visible');
    cursor.innerHTML = `<line x1="${cx}" x2="${cx}" y1="${top}" y2="${bottom}"/>
      ${sample ? `<circle cx="${x(sample.timeSec)}" cy="${y(sample.wpm)}" r="4"/>` : ''}`;
    tooltip.innerHTML = `<div class="pace-tooltip-time">${timeLabel(stop.timeSec)} <span>into your run</span></div>
      ${sample ? `<div class="pace-tooltip-values"><span class="pace-tooltip-wpm">${Math.round(sample.wpm)} <small>wpm</small></span>${visible.raw && sample.rawWpm !== null ? `<span>${Math.round(sample.rawWpm)} <small>raw</small></span>` : ''}</div>` : ''}
      ${visible.errors ? `<div class="pace-tooltip-errors ${bucket ? 'has-errors' : ''}">${bucket ? `${bucket.count} mistype${bucket.count === 1 ? '' : 's'} in this second` : 'No mistypes in this second'}</div>
        ${bucket ? `<ul>${bucket.events.slice(0, 4).map(error => `<li><kbd>${escapeHtml(keyLabel(error.typed))}</kbd><span>instead of</span><kbd>${escapeHtml(keyLabel(error.expected))}</kbd></li>`).join('')}</ul>${bucket.count > 4 ? `<div class="pace-tooltip-more">+${bucket.count - 4} more in this second</div>` : ''}` : ''}` : ''}`;
    tooltip.hidden = false;
    tooltip.style.left = `${Math.max(8, Math.min(width - tooltip.offsetWidth - 8, cx > width / 2 ? cx - tooltip.offsetWidth - 14 : cx + 14))}px`;
  };
  const render = () => {
    const nextWidth = Math.round(plot.getBoundingClientRect().width);
    if (nextWidth < 100) return; // Results can be temporarily hidden by routing.
    width = nextWidth;
    if (!data.samples.length) {
      host.innerHTML = '<div class="pace-empty"><span aria-hidden="true">⌁</span><strong>No pace samples yet</strong><p>Your next run will draw the story of your typing.</p></div>';
      return;
    }
    const height = width < 480 ? 230 : 248;
    const left = 36, right = 30, top = 30, bottom = height - 30;
    const chartWidth = width - left - right;
    const maxValue = data.samples.reduce((max, sample) => Math.max(max, sample.wpm, visible.raw ? sample.rawWpm || 0 : 0), Math.max(20, data.target));
    const roughStep = maxValue / 4;
    const power = 10 ** Math.floor(Math.log10(roughStep));
    const step = [1, 2, 2.5, 3, 4, 5, 10].map(n => n * power).find(n => n >= roughStep) || power * 10;
    const maxWpm = step * 4;
    const maxErrors = Math.max(4, ...data.errorBuckets.map(bucket => bucket.count));
    const x = time => left + time / data.duration * chartWidth;
    const y = value => bottom - value / maxWpm * (bottom - top);
    const errorY = count => bottom - count / maxErrors * (bottom - top);
    geometry = { x, y, left, chartWidth, top, bottom };
    const path = field => {
      let drawing = false;
      return data.samples.map(sample => {
        if (sample[field] === null) { drawing = false; return ''; }
        const command = drawing ? 'L' : 'M';
        drawing = true;
        return `${command}${x(sample.timeSec).toFixed(2)},${y(sample[field]).toFixed(2)}`;
      }).join(' ');
    };
    const ticks = width < 360 ? 3 : width < 480 ? 4 : 6;
    const timePower = 10 ** Math.floor(Math.log10(data.duration / ticks));
    const timeStep = [1, 2, 2.5, 3, 4, 5, 10].map(n => n * timePower)
      .reduce((best, value) => Math.abs(value - data.duration / ticks) < Math.abs(best - data.duration / ticks) ? value : best);
    const timeTicks = [];
    for (let time = 0; time < data.duration - timeStep * 0.5; time += timeStep) timeTicks.push(time);
    timeTicks.push(data.duration);
    const first = data.samples[0], last = data.samples.at(-1);
    host.innerHTML = `<svg viewBox="0 0 ${width} ${height}" class="pace-svg" role="img" aria-labelledby="${id}-svg-title ${id}-desc">
      <title id="${id}-svg-title">Typing speed and mistypes over ${timeLabel(data.duration)}</title>
      <desc id="${id}-desc">WPM peaked at ${Math.round(data.peakWpm)}. ${data.totalErrors} mistypes. WPM uses the left axis. Mistypes per second use the right axis. Raw shows all attempts per minute in each sample interval.</desc>
      <defs><linearGradient id="${id}-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="var(--pace-accent)" stop-opacity=".12"/><stop offset="100%" stop-color="var(--pace-accent)" stop-opacity="0"/></linearGradient></defs>
      <g class="pace-grid" aria-hidden="true">${Array.from({ length: 5 }, (_, i) => `<line x1="${left}" x2="${width - right}" y1="${y(step * i)}" y2="${y(step * i)}"/><text x="${left - 10}" y="${y(step * i) + 4}" text-anchor="end">${step * i}</text>`).join('')}</g>
      <g class="pace-axis" aria-hidden="true"><text x="${left}" y="12">wpm</text>${visible.errors ? `<text class="pace-error-label" x="${width - right}" y="12" text-anchor="end">mistypes</text>${[0, Math.ceil(maxErrors / 2), maxErrors].map(n => `<text class="pace-error-label" x="${width - right + 12}" y="${errorY(n) + 4}">${n}</text>`).join('')}` : ''}
      ${timeTicks.map((time, i) => `<text x="${x(time)}" y="${height - 7}" text-anchor="${i === 0 ? 'start' : i === timeTicks.length - 1 ? 'end' : 'middle'}">${timeLabel(time)}</text>`).join('')}</g>
      ${data.target > 0 ? `<g class="pace-target"><line x1="${left}" x2="${width - right}" y1="${y(data.target)}" y2="${y(data.target)}"/><text x="${left + 5}" y="${y(data.target) - 7}">goal ${data.target}</text></g>` : ''}
      <path d="${path('wpm')} L${x(last.timeSec)},${bottom} L${x(first.timeSec)},${bottom} Z" fill="url(#${id}-fill)"/>
      ${visible.raw ? `<path class="pace-raw-line" d="${path('rawWpm')}"/>` : ''}
      <path class="pace-wpm-line" d="${path('wpm')}"/>
      <circle class="pace-endpoint" cx="${x(last.timeSec)}" cy="${y(last.wpm)}" r="3.5"/>
      ${visible.errors ? `<g class="pace-error-markers">${data.errorBuckets.map(bucket => `<g data-error-second="${bucket.second}" transform="translate(${x(bucket.timeSec)},${errorY(bucket.count)})"><title>${bucket.count} mistypes at ${timeLabel(bucket.timeSec)}</title><circle r="8"/><path d="M-3.5,-3.5 L3.5,3.5 M-3.5,3.5 L3.5,-3.5"/></g>`).join('')}</g>` : ''}
      <g class="pace-cursor" visibility="hidden" aria-hidden="true"></g>
    </svg>`;
    if (activeIndex >= 0) inspect(activeIndex);
  };
  const handlePointer = event => {
    if (!geometry || !stops.length) return;
    const rect = plot.getBoundingClientRect();
    const time = Math.max(0, Math.min(data.duration, (event.clientX - rect.left - geometry.left) / geometry.chartWidth * data.duration));
    // Prefer an error marker when the pointer is near its time coordinate.
    const nearbyError = visible.errors && stops.findIndex(stop => stop.bucket && Math.abs(geometry.x(stop.timeSec) - (event.clientX - rect.left)) <= 9);
    let index = typeof nearbyError === 'number' && nearbyError >= 0 ? nearbyError : 0;
    if (!(typeof nearbyError === 'number' && nearbyError >= 0)) {
      stops.forEach((stop, i) => { if (Math.abs(stop.timeSec - time) < Math.abs(stops[index].timeSec - time)) index = i; });
    }
    if (index !== activeIndex) inspect(index);
  };
  plot.addEventListener('pointermove', handlePointer);
  plot.addEventListener('pointerdown', handlePointer);
  plot.addEventListener('pointerleave', hide);
  plot.addEventListener('focus', () => inspect(0));
  plot.addEventListener('blur', hide);
  plot.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape', 'Enter', ' '].includes(event.key)) return;
    event.stopPropagation();
    event.preventDefault();
    if (event.key === 'Escape') { hide(); return; }
    if (event.key === 'Home') inspect(0);
    else if (event.key === 'End') inspect(stops.length - 1);
    else if (event.key === 'ArrowLeft') inspect(activeIndex - 1);
    else if (event.key === 'ArrowRight') inspect(activeIndex + 1);
  });
  root.querySelectorAll('[data-series]').forEach(button => button.addEventListener('click', () => {
    const series = button.dataset.series;
    visible[series] = !visible[series];
    button.setAttribute('aria-pressed', String(visible[series]));
    hide();
    render();
  }));
  render();
  const observer = new ResizeObserver(() => {
    if (Math.round(plot.getBoundingClientRect().width) !== width) render();
  });
  observer.observe(plot);
  return () => observer.disconnect();
}
