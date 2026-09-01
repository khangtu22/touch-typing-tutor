/**
 * Custom Theme Studio
 * Allows users to create, edit, delete, export, and import custom keycap themes.
 * Themes stored in localStorage under 'typing_tutor_custom_themes'
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'typing_tutor_custom_themes';

/**
 * Shape of a custom theme. All hex strings used as defaults can be
 * overridden by the user via the studio editor.
 */
export const DEFAULT_CUSTOM_THEME = {
  id: '',                   // generated uuid-like string
  name: 'My Theme',
  bgBase: '#0F1117',
  surface1: '#151923',
  surface2: '#1B2030',
  accentPrimary: '#7C5CFC',
  successTeal: '#00D4AA',
  textPrimary: '#F5F7FA',
  textSecondary: '#9AA3B2',
  keycapBg: '#1B2030',
  keycapLegend: '#F5F7FA',
  keycapHighlight: '#7C5CFC'
};

// ─────────────────────────────────────────────────────────────────────────────
// Colour helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a CSS hex string ("#RRGGBB" or "#RGB") and return { r, g, b }.
 * Returns { r:0, g:0, b:0 } on failure.
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number }}
 */
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
  const clean = hex.trim().replace(/^#/, '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const int = parseInt(full, 16);
  if (isNaN(int)) return { r: 0, g: 0, b: 0 };
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b:  int & 255
  };
}

/**
 * Produce an rgba() string from a hex colour.
 * @param {string} hex  Hex colour string.
 * @param {number} alpha  Opacity 0–1.
 * @returns {string}  e.g. "rgba(124, 92, 252, 0.35)"
 */
function hexToRgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Slightly lighten a hex colour by blending it with white.
 * @param {string} hex  Hex colour string.
 * @param {number} amount  0–1 (proportion toward white).
 * @returns {string}  Lightened hex string.
 */
function lightenHex(hex, amount = 0.12) {
  const { r, g, b } = hexToRgb(hex);
  const lerp = (a, b, t) => Math.round(a + (b - a) * t);
  const toHex = n => n.toString(16).padStart(2, '0');
  return `#${toHex(lerp(r, 255, amount))}${toHex(lerp(g, 255, amount))}${toHex(lerp(b, 255, amount))}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ThemeStudio class
// ─────────────────────────────────────────────────────────────────────────────

class ThemeStudio {
  // ── Persistence ────────────────────────────────────────────────────────────

  /**
   * Load all custom themes from localStorage.
   * @returns {Array<Object>}
   */
  loadThemes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('[ThemeStudio] Failed to load themes:', err);
      return [];
    }
  }

  /**
   * Persist the themes array to localStorage.
   * @param {Array<Object>} themes
   */
  saveThemes(themes) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
    } catch (err) {
      console.error('[ThemeStudio] Failed to save themes:', err);
    }
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  /**
   * Create a new theme, assign it an id, persist and return it.
   * @param {Partial<typeof DEFAULT_CUSTOM_THEME>} themeData
   * @returns {Object} The saved theme with its generated id.
   */
  createTheme(themeData = {}) {
    const theme = {
      ...DEFAULT_CUSTOM_THEME,
      ...themeData,
      id: this.generateId()
    };
    const themes = this.loadThemes();
    themes.push(theme);
    this.saveThemes(themes);
    return theme;
  }

  /**
   * Update an existing theme by id and persist.
   * @param {string} id
   * @param {Partial<typeof DEFAULT_CUSTOM_THEME>} changes
   * @returns {Object|null} Updated theme, or null if not found.
   */
  updateTheme(id, changes = {}) {
    const themes = this.loadThemes();
    const idx = themes.findIndex(t => t.id === id);
    if (idx === -1) return null;
    themes[idx] = { ...themes[idx], ...changes, id };
    this.saveThemes(themes);
    return themes[idx];
  }

  /**
   * Remove a theme by id.
   * @param {string} id
   */
  deleteTheme(id) {
    const themes = this.loadThemes().filter(t => t.id !== id);
    this.saveThemes(themes);
  }

  // ── CSS Application ────────────────────────────────────────────────────────

  /**
   * Apply a custom theme by injecting CSS custom properties onto :root.
   * Derives surface-3 (a slightly lighter surface-2) and accent-glow automatically.
   * @param {Object} theme
   */
  applyTheme(theme) {
    const root = document.documentElement;
    const set = (prop, value) => root.style.setProperty(prop, value);

    set('--bg-base',        theme.bgBase);
    set('--surface-1',      theme.surface1);
    set('--surface-2',      theme.surface2);
    // surface-3 is a subtle step up from surface-2
    set('--surface-3',      lightenHex(theme.surface2, 0.12));
    set('--surface-glass',  hexToRgba(theme.surface1, 0.75));

    set('--accent-primary',       theme.accentPrimary);
    set('--accent-primary-hover', lightenHex(theme.accentPrimary, 0.1));
    set('--accent-glow',          hexToRgba(theme.accentPrimary, 0.35));

    set('--success-teal',  theme.successTeal);
    set('--success-glow',  hexToRgba(theme.successTeal, 0.35));

    set('--text-primary',   theme.textPrimary);
    set('--text-secondary', theme.textSecondary);

    // Keycap-specific variables (consumed by keyboard.css)
    set('--keycap-bg',      theme.keycapBg);
    set('--keycap-legend',  theme.keycapLegend);

    // Border derivatives based on text
    set('--border-subtle', hexToRgba(theme.textPrimary, 0.08));
    set('--border-light',  hexToRgba(theme.textPrimary, 0.14));
    set('--border-active', hexToRgba(theme.accentPrimary, 0.5));
  }

  /**
   * Remove all inline CSS custom properties set by applyTheme() so the
   * built-in theme (from themes.css) takes over again.
   */
  resetToBuiltIn() {
    const root = document.documentElement;
    const propsToRemove = [
      '--bg-base', '--surface-1', '--surface-2', '--surface-3', '--surface-glass',
      '--accent-primary', '--accent-primary-hover', '--accent-glow',
      '--success-teal', '--success-glow',
      '--text-primary', '--text-secondary',
      '--keycap-bg', '--keycap-legend',
      '--border-subtle', '--border-light', '--border-active'
    ];
    propsToRemove.forEach(p => root.style.removeProperty(p));
  }

  // ── Import / Export ────────────────────────────────────────────────────────

  /**
   * Serialise a theme to a pretty-printed JSON string ready for download.
   * @param {Object} theme
   * @returns {string}
   */
  exportTheme(theme) {
    return JSON.stringify({ keyflow_theme: '1.0', ...theme }, null, 2);
  }

  /**
   * Parse a JSON string, validate required fields, and create the theme in
   * storage.  Throws on parse failure or missing required fields.
   * @param {string} jsonStr
   * @returns {Object} The newly created theme.
   */
  importTheme(jsonStr) {
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error('Invalid JSON – could not parse the file.');
    }

    // Strip the wrapper key if present
    const data = parsed.keyflow_theme ? { ...parsed } : parsed;
    delete data.keyflow_theme;

    // Validate required colour fields
    const required = [
      'bgBase', 'surface1', 'surface2', 'accentPrimary',
      'successTeal', 'textPrimary', 'textSecondary',
      'keycapBg', 'keycapLegend'
    ];
    const missing = required.filter(k => !data[k]);
    if (missing.length) {
      throw new Error(`Theme file is missing required fields: ${missing.join(', ')}`);
    }

    // Always generate a fresh id so imports never collide
    delete data.id;
    return this.createTheme(data);
  }

  // ── ID Generation ──────────────────────────────────────────────────────────

  /**
   * Generate a short random identifier like "theme_a3f9b2".
   * @returns {string}
   */
  generateId() {
    const rand = Math.random().toString(16).slice(2, 8);
    return `theme_${rand}`;
  }
}

/** Singleton exported for app-wide use */
export const themeStudio = new ThemeStudio();

// ─────────────────────────────────────────────────────────────────────────────
// UI Renderer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Field descriptor list – drives both the editor form and live preview updates.
 * @type {Array<{ key: string, label: string, type: 'text'|'color' }>}
 */
const THEME_FIELDS = [
  { key: 'name',            label: 'Theme Name',       type: 'text'  },
  { key: 'bgBase',          label: 'Background',        type: 'color' },
  { key: 'surface1',        label: 'Surface 1',         type: 'color' },
  { key: 'surface2',        label: 'Surface 2',         type: 'color' },
  { key: 'accentPrimary',   label: 'Accent Colour',     type: 'color' },
  { key: 'successTeal',     label: 'Success Colour',    type: 'color' },
  { key: 'textPrimary',     label: 'Text Primary',      type: 'color' },
  { key: 'textSecondary',   label: 'Text Secondary',    type: 'color' },
  { key: 'keycapBg',        label: 'Keycap Background', type: 'color' },
  { key: 'keycapLegend',    label: 'Keycap Legend',     type: 'color' },
  { key: 'keycapHighlight', label: 'Keycap Highlight',  type: 'color' }
];

/**
 * Sample keys shown in the live mini-keyboard preview.
 */
const PREVIEW_KEYS = [
  { label: 'A', isHome: false },
  { label: 'S', isHome: false },
  { label: 'D', isHome: false },
  { label: 'F', isHome: true  },  // target key simulation
  { label: 'G', isHome: false }
];

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Read all current field values from an editor form into a theme-shaped object.
 * @param {HTMLElement} form  The editor form element.
 * @returns {Object}
 */
function collectFormValues(form) {
  const out = {};
  THEME_FIELDS.forEach(({ key }) => {
    const el = form.querySelector(`[data-field="${key}"]`);
    if (el) out[key] = el.value;
  });
  return out;
}

/**
 * Update the live preview section inside an editor form based on current values.
 * @param {HTMLElement} form
 */
function syncPreview(form) {
  const values = collectFormValues(form);
  const preview = form.querySelector('.ts-preview-keyboard');
  if (!preview) return;

  // Update the CSS custom properties scoped to the preview element
  preview.style.background  = values.surface1 || '#151923';
  preview.style.borderColor = hexToRgba(values.accentPrimary || '#7C5CFC', 0.25);

  const keycaps = preview.querySelectorAll('.ts-preview-key');
  keycaps.forEach((key, i) => {
    const isHighlight = PREVIEW_KEYS[i]?.isHome;
    key.style.background  = isHighlight
      ? hexToRgba(values.keycapHighlight || values.accentPrimary, 0.22)
      : (values.keycapBg || '#1B2030');
    key.style.borderColor = isHighlight
      ? (values.keycapHighlight || values.accentPrimary)
      : hexToRgba(values.textPrimary || '#F5F7FA', 0.08);
    key.style.color = isHighlight
      ? (values.keycapHighlight || values.accentPrimary)
      : (values.keycapLegend || '#F5F7FA');
    key.style.boxShadow = isHighlight
      ? `0 4px 0 ${hexToRgba(values.bgBase || '#0F1117', 0.8)}, 0 0 14px ${hexToRgba(values.keycapHighlight || values.accentPrimary, 0.4)}`
      : `0 4px 0 ${hexToRgba(values.bgBase || '#0F1117', 0.8)}`;
  });

  // Update text samples
  const samplePrimary   = preview.closest('.ts-preview-bg')?.querySelector('.ts-preview-text-primary');
  const sampleSecondary = preview.closest('.ts-preview-bg')?.querySelector('.ts-preview-text-secondary');
  const sampleAccent    = preview.closest('.ts-preview-bg')?.querySelector('.ts-preview-text-accent');
  const previewBg       = preview.closest('.ts-preview-bg');

  if (previewBg)       previewBg.style.background = values.bgBase || '#0F1117';
  if (samplePrimary)   samplePrimary.style.color   = values.textPrimary   || '#F5F7FA';
  if (sampleSecondary) sampleSecondary.style.color = values.textSecondary || '#9AA3B2';
  if (sampleAccent)    sampleAccent.style.color     = values.accentPrimary || '#7C5CFC';
}

/**
 * Build and return the inline editor form element.
 * @param {Object}   initial   Initial theme values.
 * @param {Function} onSave    Called with the final values object.
 * @param {Function} onCancel  Called when the user cancels.
 * @returns {HTMLElement}
 */
function buildEditorForm(initial, onSave, onCancel) {
  const wrap = document.createElement('div');
  wrap.className = 'ts-editor';

  // ── Field rows ─────────────────────────────────────────────────────────────
  const fieldsHtml = THEME_FIELDS.map(({ key, label, type }) => {
    const value = initial[key] ?? DEFAULT_CUSTOM_THEME[key] ?? '';
    if (type === 'color') {
      const safeVal = /^#[0-9A-Fa-f]{3,6}$/.test(value) ? value : '#000000';
      return `
        <div class="ts-field-row">
          <label class="ts-field-label" for="ts-field-${key}">${label}</label>
          <div class="ts-color-pair">
            <input
              type="color"
              id="ts-field-${key}"
              class="ts-color-input"
              data-field="${key}"
              value="${safeVal}"
              title="${label}"
            />
            <input
              type="text"
              class="ts-hex-input"
              data-hex-for="${key}"
              value="${safeVal}"
              maxlength="7"
              spellcheck="false"
              placeholder="#000000"
            />
          </div>
        </div>`;
    }
    // Text input (theme name)
    const safeText = String(value).replace(/"/g, '&quot;').replace(/</g, '&lt;');
    return `
      <div class="ts-field-row ts-field-row--name">
        <label class="ts-field-label" for="ts-field-${key}">${label}</label>
        <input
          type="text"
          id="ts-field-${key}"
          class="ts-text-input"
          data-field="${key}"
          value="${safeText}"
          maxlength="40"
          placeholder="My Custom Theme"
        />
      </div>`;
  }).join('');

  // ── Preview keyboard HTML ──────────────────────────────────────────────────
  const keysHtml = PREVIEW_KEYS.map(k =>
    `<div class="ts-preview-key">${k.label}</div>`
  ).join('');

  wrap.innerHTML = `
    <div class="ts-editor-inner">
      <div class="ts-editor-fields">
        ${fieldsHtml}
      </div>

      <div class="ts-preview-panel">
        <p class="ts-preview-title">Live Preview</p>
        <div class="ts-preview-bg">
          <div class="ts-preview-keyboard">
            ${keysHtml}
          </div>
          <div class="ts-preview-text-samples">
            <span class="ts-preview-text-primary">Primary text</span>
            <span class="ts-preview-text-secondary">Secondary text</span>
            <span class="ts-preview-text-accent">Accent colour</span>
          </div>
        </div>
      </div>
    </div>

    <div class="ts-editor-actions">
      <button class="btn btn-primary ts-btn-save">&#x1F4BE; Save Theme</button>
      <button class="btn btn-secondary ts-btn-cancel">Cancel</button>
    </div>
  `;

  // ── Sync bidirectional colour ↔ hex inputs ─────────────────────────────────
  wrap.querySelectorAll('.ts-color-input').forEach(colorEl => {
    const key   = colorEl.dataset.field;
    const hexEl = wrap.querySelector(`[data-hex-for="${key}"]`);

    // Colour picker -> hex text field + preview
    colorEl.addEventListener('input', () => {
      if (hexEl) hexEl.value = colorEl.value;
      syncPreview(wrap);
    });

    // Hex text field -> colour picker + preview
    if (hexEl) {
      hexEl.addEventListener('input', () => {
        const val = hexEl.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          colorEl.value = val;
          syncPreview(wrap);
        }
      });
    }
  });

  // Name field change also refreshes preview
  const nameEl = wrap.querySelector('[data-field="name"]');
  if (nameEl) nameEl.addEventListener('input', () => syncPreview(wrap));

  // ── Button handlers ────────────────────────────────────────────────────────
  wrap.querySelector('.ts-btn-save').addEventListener('click', () => {
    const values = collectFormValues(wrap);
    if (!values.name?.trim()) values.name = 'My Theme';
    onSave(values);
  });

  wrap.querySelector('.ts-btn-cancel').addEventListener('click', onCancel);

  // Initial preview render
  syncPreview(wrap);

  return wrap;
}

/**
 * Build and return a theme card element for the list view.
 * @param {Object} theme
 * @param {Object} handlers  { onApply, onEdit, onDelete, onExport }
 * @returns {HTMLElement}
 */
function buildThemeCard(theme, { onApply, onEdit, onDelete, onExport }) {
  const card = document.createElement('div');
  card.className = 'ts-theme-card';
  card.dataset.themeId = theme.id;

  // Small colour swatch strip
  const swatchColors = [
    theme.bgBase, theme.surface2, theme.accentPrimary,
    theme.successTeal, theme.keycapBg, theme.keycapHighlight
  ];
  const swatchesHtml = swatchColors.map(c =>
    `<span class="ts-swatch" style="background:${c || '#333'}" title="${c || ''}"></span>`
  ).join('');

  card.innerHTML = `
    <div class="ts-card-top">
      <div class="ts-card-info">
        <span class="ts-card-name">${String(theme.name || 'Untitled').replace(/</g, '&lt;')}</span>
        <div class="ts-swatches">${swatchesHtml}</div>
      </div>
      <div class="ts-card-actions">
        <button class="btn btn-primary btn-sm ts-card-btn-apply"  title="Apply this theme">&#x25B6; Apply</button>
        <button class="btn btn-secondary btn-sm ts-card-btn-edit"  title="Edit this theme">&#x270F;&#xFE0F; Edit</button>
        <button class="btn btn-outline btn-sm ts-card-btn-export" title="Export as JSON">&#x2B07; Export</button>
        <button class="btn btn-danger btn-sm ts-card-btn-delete"  title="Delete this theme">&#x1F5D1;</button>
      </div>
    </div>
  `;

  card.querySelector('.ts-card-btn-apply').addEventListener('click', () => onApply(theme));
  card.querySelector('.ts-card-btn-edit').addEventListener('click',  () => onEdit(theme));
  card.querySelector('.ts-card-btn-export').addEventListener('click',() => onExport(theme));
  card.querySelector('.ts-card-btn-delete').addEventListener('click',() => onDelete(theme));

  return card;
}

/**
 * Inject scoped styles for the Theme Studio UI into the document head (once).
 */
function injectStudioStyles() {
  const STYLE_ID = 'theme-studio-styles';
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* ─── Theme Studio Container ─────────────────────────────────────────── */
    .theme-studio {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 24px 0;
      font-family: var(--font-sans);
    }

    .ts-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .ts-header-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }

    .ts-header-subtitle {
      font-size: 13px;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .ts-header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* ─── Reset Banner ───────────────────────────────────────────────────── */
    .ts-reset-banner {
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 16px;
      background: rgba(124, 92, 252, 0.1);
      border: 1px solid rgba(124, 92, 252, 0.3);
      border-radius: var(--radius-sm);
      font-size: 13px;
      color: var(--text-secondary);
    }

    .ts-reset-banner.ts-banner-visible {
      display: flex;
    }

    /* ─── Theme List ─────────────────────────────────────────────────────── */
    .ts-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .ts-empty-state {
      text-align: center;
      padding: 40px 20px;
      border: 1px dashed rgba(255, 255, 255, 0.1);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      font-size: 14px;
    }

    .ts-empty-state p:first-child {
      font-size: 32px;
      margin-bottom: 8px;
    }

    /* ─── Theme Card ─────────────────────────────────────────────────────── */
    .ts-theme-card {
      background: var(--surface-1);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: var(--radius-md);
      padding: 14px 16px;
      transition: border-color 0.2s ease;
    }

    .ts-theme-card:hover {
      border-color: rgba(124, 92, 252, 0.3);
    }

    .ts-theme-card.ts-card-active {
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 1px var(--accent-primary), 0 4px 16px rgba(124, 92, 252, 0.25);
    }

    .ts-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .ts-card-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ts-card-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .ts-swatches {
      display: flex;
      gap: 4px;
    }

    .ts-swatch {
      display: inline-block;
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: transform 0.15s;
    }

    .ts-swatch:hover {
      transform: scale(1.3);
    }

    .ts-card-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* ─── Editor Wrapper ─────────────────────────────────────────────────── */
    .ts-editor-wrap {
      background: var(--surface-1);
      border: 1px solid rgba(124, 92, 252, 0.3);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .ts-editor-heading {
      padding: 14px 18px;
      background: rgba(124, 92, 252, 0.08);
      border-bottom: 1px solid rgba(124, 92, 252, 0.2);
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .ts-editor {
      padding: 18px;
    }

    .ts-editor-inner {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    @media (max-width: 700px) {
      .ts-editor-inner { grid-template-columns: 1fr; }
    }

    .ts-editor-fields {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .ts-field-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .ts-field-row--name { align-items: center; }

    .ts-field-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      flex: 1;
      white-space: nowrap;
    }

    .ts-color-pair {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ts-color-input {
      -webkit-appearance: none;
      appearance: none;
      width: 34px;
      height: 34px;
      border-radius: 6px;
      padding: 2px;
      background: var(--surface-2);
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
    }

    .ts-color-input::-webkit-color-swatch-wrapper { padding: 0; }
    .ts-color-input::-webkit-color-swatch { border: none; border-radius: 4px; }

    .ts-hex-input {
      width: 84px;
      background: var(--surface-2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 6px 8px;
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: 12px;
      outline: none;
      transition: border-color 0.15s;
    }

    .ts-hex-input:focus { border-color: var(--accent-primary); }

    .ts-text-input {
      flex: 1;
      background: var(--surface-2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 8px 10px;
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 14px;
      outline: none;
      transition: border-color 0.15s;
    }

    .ts-text-input:focus { border-color: var(--accent-primary); }

    /* ─── Live Preview ───────────────────────────────────────────────────── */
    .ts-preview-panel {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .ts-preview-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-secondary);
    }

    .ts-preview-bg {
      border-radius: var(--radius-sm);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: background 0.15s;
    }

    .ts-preview-keyboard {
      display: flex;
      gap: 6px;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: background 0.15s, border-color 0.15s;
    }

    .ts-preview-key {
      flex: 1;
      height: 44px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-size: 14px;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s;
    }

    .ts-preview-text-samples {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 13px;
    }

    .ts-preview-text-primary,
    .ts-preview-text-secondary,
    .ts-preview-text-accent {
      transition: color 0.15s;
    }

    /* ─── Editor action bar ──────────────────────────────────────────────── */
    .ts-editor-actions {
      display: flex;
      gap: 10px;
      padding: 14px 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.07);
      margin-top: 18px;
    }

    /* ─── Import label ───────────────────────────────────────────────────── */
    .ts-import-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: var(--surface-2);
      cursor: pointer;
      transition: all 0.15s;
      user-select: none;
    }

    .ts-import-label:hover {
      background: var(--surface-3, #232A3E);
      color: var(--text-primary);
    }

    .ts-import-file { display: none; }

    /* ─── Toast notification ─────────────────────────────────────────────── */
    .ts-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 20px;
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      background: var(--surface-3, #232A3E);
      border: 1px solid rgba(255,255,255,0.15);
      box-shadow: var(--shadow-md);
      z-index: 9999;
      opacity: 0;
      transform: translateY(12px);
      transition: opacity 0.25s ease, transform 0.25s ease;
      pointer-events: none;
      max-width: 340px;
    }

    .ts-toast.ts-toast-show    { opacity: 1; transform: translateY(0); }
    .ts-toast.ts-toast-success { border-color: var(--success-teal); }
    .ts-toast.ts-toast-error   { border-color: var(--error-coral, #FF5C7A); }
  `;
  document.head.appendChild(style);
}

// ── Toast helper ──────────────────────────────────────────────────────────────

let _toastTimer = null;

/**
 * Show a brief toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='info']
 */
function showToast(message, type = 'info') {
  let toast = document.getElementById('ts-toast-el');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ts-toast-el';
    toast.className = 'ts-toast';
    document.body.appendChild(toast);
  }

  toast.className = `ts-toast ts-toast-${type}`;
  toast.textContent = message;

  // Double rAF ensures the transition plays from the hidden state
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('ts-toast-show'));
  });

  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.classList.remove('ts-toast-show');
  }, 2800);
}

// ── Download helper ───────────────────────────────────────────────────────────

/**
 * Trigger a JSON file download in the browser.
 * @param {string} jsonStr
 * @param {string} filename
 */
function downloadJson(jsonStr, filename) {
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main exported render function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render the complete Theme Studio UI into `container`.
 *
 * @param {HTMLElement} container      DOM element to render into.
 * @param {Function}    onThemeApplied Callback invoked with the applied theme object
 *                                     (or null when reset to built-in).
 */
export function renderThemeStudioUI(container, onThemeApplied) {
  if (!container) return;

  // Inject scoped styles once
  injectStudioStyles();

  // Track the id of the currently applied custom theme so we can badge it
  let activeCustomThemeId = null;

  // ── Root element ────────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.className = 'theme-studio';

  // ── Header ──────────────────────────────────────────────────────────────────
  const headerEl = document.createElement('div');
  headerEl.className = 'ts-header';
  headerEl.innerHTML = `
    <div>
      <div class="ts-header-title">&#x1F3A8; Theme Studio</div>
      <div class="ts-header-subtitle">Create and manage your own custom colour themes.</div>
    </div>
    <div class="ts-header-actions">
      <label class="ts-import-label" title="Import a theme JSON file">
        &#x2B06; Import JSON
        <input type="file" class="ts-import-file" accept=".json,application/json" />
      </label>
      <button class="btn btn-primary ts-btn-create">&#xFF0B; Create New Theme</button>
    </div>
  `;

  // ── Reset banner (shown when a custom theme is active) ──────────────────────
  const bannerEl = document.createElement('div');
  bannerEl.className = 'ts-reset-banner';
  bannerEl.innerHTML = `
    <span>&#x1F58C;&#xFE0F; A custom theme is currently active.</span>
    <button class="btn btn-outline btn-sm ts-btn-reset-builtin">Reset to Built-in Theme</button>
  `;

  // ── Editor area ─────────────────────────────────────────────────────────────
  const editorAreaEl = document.createElement('div');
  editorAreaEl.className = 'ts-editor-area';

  // ── Theme list ──────────────────────────────────────────────────────────────
  const listEl = document.createElement('div');
  listEl.className = 'ts-list';

  // Assemble root
  root.appendChild(headerEl);
  root.appendChild(bannerEl);
  root.appendChild(editorAreaEl);
  root.appendChild(listEl);

  container.innerHTML = '';
  container.appendChild(root);

  // ────────────────────────────────────────────────────────────────────────────
  // Helper: re-render the theme list
  // ────────────────────────────────────────────────────────────────────────────
  function renderList() {
    listEl.innerHTML = '';
    const themes = themeStudio.loadThemes();

    if (themes.length === 0) {
      listEl.innerHTML = `
        <div class="ts-empty-state">
          <p>&#x1F3A8;</p>
          <p>No custom themes yet. Click <strong>Create New Theme</strong> to get started,
             or import a JSON file.</p>
        </div>`;
      return;
    }

    themes.forEach(theme => {
      const card = buildThemeCard(theme, {
        onApply:  handleApply,
        onEdit:   handleEdit,
        onDelete: handleDelete,
        onExport: handleExport
      });
      if (theme.id === activeCustomThemeId) card.classList.add('ts-card-active');
      listEl.appendChild(card);
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Helper: close the editor area
  // ────────────────────────────────────────────────────────────────────────────
  function closeEditor() {
    editorAreaEl.innerHTML = '';
    editorAreaEl.style.display = 'none';
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Helper: open the editor for create or edit
  // ────────────────────────────────────────────────────────────────────────────
  function openEditor(existingTheme = null) {
    const isNew   = !existingTheme;
    const initial = existingTheme ? { ...existingTheme } : { ...DEFAULT_CUSTOM_THEME };
    const heading = isNew
      ? '&#x270F;&#xFE0F; Create New Theme'
      : `&#x270F;&#xFE0F; Edit "${String(initial.name || 'Theme').replace(/</g, '&lt;')}"`;

    editorAreaEl.innerHTML = '';
    editorAreaEl.style.display = '';

    const wrap = document.createElement('div');
    wrap.className = 'ts-editor-wrap';

    const headingEl = document.createElement('div');
    headingEl.className = 'ts-editor-heading';
    headingEl.innerHTML = heading;
    wrap.appendChild(headingEl);

    const form = buildEditorForm(
      initial,
      // onSave
      (values) => {
        if (isNew) {
          themeStudio.createTheme(values);
          showToast(`Theme "${values.name}" created!`, 'success');
        } else {
          themeStudio.updateTheme(existingTheme.id, values);
          showToast(`Theme "${values.name}" updated!`, 'success');
          // If this was the active theme, re-apply with refreshed values
          if (existingTheme.id === activeCustomThemeId) {
            const updated = themeStudio.loadThemes().find(t => t.id === existingTheme.id);
            if (updated) {
              themeStudio.applyTheme(updated);
              if (onThemeApplied) onThemeApplied(updated);
            }
          }
        }
        closeEditor();
        renderList();
      },
      // onCancel
      () => closeEditor()
    );

    wrap.appendChild(form);
    editorAreaEl.appendChild(wrap);

    // Scroll editor into view smoothly
    setTimeout(() => wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Action handlers
  // ────────────────────────────────────────────────────────────────────────────

  function handleApply(theme) {
    themeStudio.applyTheme(theme);
    activeCustomThemeId = theme.id;
    bannerEl.classList.add('ts-banner-visible');
    showToast(`Theme "${theme.name}" applied ✨`, 'success');
    renderList();
    if (onThemeApplied) onThemeApplied(theme);
  }

  function handleEdit(theme) {
    openEditor(theme);
  }

  /**
   * Two-click delete guard: first click shows a brief confirmation inline,
   * second click within 3 s completes the deletion.
   */
  function handleDelete(theme) {
    const card = listEl.querySelector(`[data-theme-id="${theme.id}"]`);
    if (!card) return;

    const existingConfirm = card.querySelector('.ts-delete-confirm');
    if (existingConfirm) {
      // Confirmed – proceed
      themeStudio.deleteTheme(theme.id);
      if (theme.id === activeCustomThemeId) {
        themeStudio.resetToBuiltIn();
        activeCustomThemeId = null;
        bannerEl.classList.remove('ts-banner-visible');
        if (onThemeApplied) onThemeApplied(null);
      }
      showToast(`Theme "${theme.name}" deleted.`);
      renderList();
      return;
    }

    // First click – show inline warning
    const confirm = document.createElement('div');
    confirm.className = 'ts-delete-confirm';
    confirm.style.cssText = [
      'margin-top:10px',
      'padding:8px 12px',
      'background:rgba(255,92,122,0.1)',
      'border:1px solid rgba(255,92,122,0.35)',
      'border-radius:6px',
      'font-size:13px',
      'color:var(--error-coral,#FF5C7A)'
    ].join(';');
    confirm.textContent = '\u26A0\uFE0F Click Delete again to confirm removal.';
    card.appendChild(confirm);
    setTimeout(() => confirm.remove(), 3000);
  }

  function handleExport(theme) {
    const json     = themeStudio.exportTheme(theme);
    const filename = `${(theme.name || 'theme').toLowerCase().replace(/\s+/g, '_')}_keyflow.json`;
    downloadJson(json, filename);
    showToast(`Exported "${theme.name}" \uD83D\uDCE6`, 'success');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Top-level button wiring
  // ────────────────────────────────────────────────────────────────────────────

  headerEl.querySelector('.ts-btn-create').addEventListener('click', () => openEditor(null));

  bannerEl.querySelector('.ts-btn-reset-builtin').addEventListener('click', () => {
    themeStudio.resetToBuiltIn();
    activeCustomThemeId = null;
    bannerEl.classList.remove('ts-banner-visible');
    renderList();
    showToast('Reverted to built-in theme.');
    if (onThemeApplied) onThemeApplied(null);
  });

  // ── File import ─────────────────────────────────────────────────────────────
  const fileInput = headerEl.querySelector('.ts-import-file');
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const theme = themeStudio.importTheme(ev.target.result);
        showToast(`Imported "${theme.name}" successfully! \uD83C\uDF89`, 'success');
        renderList();
      } catch (err) {
        showToast(`Import failed: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-imported
    fileInput.value = '';
  });

  // ── Initial render ──────────────────────────────────────────────────────────
  closeEditor();
  renderList();
}
