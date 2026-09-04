/**
 * Realistic Mechanical Keyboard Layout Renderer
 * Renders staggered QWERTY / Colemak / Dvorak / Workman rows with accurate keycap widths,
 * tactile bumps, active finger color glows, blind mode support, and heatmap visualization.
 */

import { FINGERS } from './finger-mapping.js';
import { getLayoutKeycaps } from './layouts.js';

export class KeyboardRenderer {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.layoutId = options.layoutId || 'qwerty';
    this.blindMode = !!options.blindMode;
    this.options = {
      interactive: true,
      onKeyClick: null,
      ...options
    };
    this.keyElements = new Map();
    this.charToCode = new Map();
    this.currentTargetChar = '';
    this.currentShiftNeeded = null;
    this.virtualShiftActive = false;

    this.render();
  }

  setLayout(layoutId) {
    if (this.layoutId === layoutId) return;
    this.layoutId = layoutId;
    this.render();
  }

  setBlindMode(isBlind) {
    this.blindMode = !!isBlind;
    if (this.container) {
      this.container.classList.toggle('keyboard-blind-mode', this.blindMode);
    }
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.keyElements.clear();
    this.charToCode.clear();
    this.virtualShiftActive = false;

    if (this.blindMode) {
      this.container.classList.add('keyboard-blind-mode');
    } else {
      this.container.classList.remove('keyboard-blind-mode');
    }

    const layoutRows = getLayoutKeycaps(this.layoutId);

    const keyboardWrapper = document.createElement('div');
    keyboardWrapper.className = `mech-keyboard layout-${this.layoutId}`;

    layoutRows.forEach((row, rowIdx) => {
      const rowEl = document.createElement('div');
      rowEl.className = `keyboard-row row-${rowIdx + 1}`;

      row.forEach(keyDef => {
        const keyEl = document.createElement('button');
        keyEl.type = 'button';
        keyEl.className = `keycap key-${keyDef.width.replace('.', '_')} finger-${keyDef.finger}`;
        keyEl.dataset.code = keyDef.code;
        keyEl.dataset.finger = keyDef.finger;
        keyEl.tabIndex = this.options.interactive ? 0 : -1;
        keyEl.setAttribute(
          'aria-label',
          keyDef.isSpecial
            ? (keyDef.label || keyDef.primary || keyDef.code)
            : `${keyDef.primary}${keyDef.shift ? `, Shift ${keyDef.shift}` : ''}`
        );

        const isShiftKey = keyDef.code === 'ShiftLeft' || keyDef.code === 'ShiftRight';
        if (isShiftKey) keyEl.setAttribute('aria-pressed', 'false');

        const fingerObj = Object.values(FINGERS).find(f => f.id === keyDef.finger);
        if (fingerObj) {
          keyEl.style.setProperty('--finger-color', fingerObj.color);
          keyEl.style.setProperty('--finger-light', fingerObj.colorLight);
          keyEl.style.setProperty('--finger-glow', fingerObj.glow);
        }

        const innerEl = document.createElement('div');
        innerEl.className = 'keycap-inner';

        if (keyDef.isSpecial) {
          innerEl.innerHTML = `<span class="key-legend-special">${keyDef.label || keyDef.primary}</span>`;
        } else if (keyDef.shift) {
          innerEl.innerHTML = `
            <span class="key-legend-shift">${keyDef.shift}</span>
            <span class="key-legend-primary">${keyDef.primary.toUpperCase()}</span>
          `;
        } else {
          innerEl.innerHTML = `<span class="key-legend-primary">${keyDef.primary}</span>`;
        }

        const isHomeKey = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'].includes(keyDef.code);
        if (isHomeKey) {
          keyEl.classList.add('key-home-rest');
          const homeDot = document.createElement('div');
          homeDot.className = 'keycap-home-dot';
          innerEl.appendChild(homeDot);
        }

        if (keyDef.hasNub) {
          const nub = document.createElement('div');
          nub.className = 'keycap-homing-nub';
          innerEl.appendChild(nub);
        }

        keyEl.appendChild(innerEl);

        if (this.options.interactive) {
          const activate = () => {
            keyEl.classList.add('key-pressed');
            setTimeout(() => keyEl.classList.remove('key-pressed'), 120);

            if (isShiftKey) {
              this.setVirtualShiftActive(!this.virtualShiftActive);
              return;
            }

            if (this.options.onKeyClick) {
              const shiftActive = this.virtualShiftActive;
              const char = shiftActive && keyDef.shift
                ? keyDef.shift
                : keyDef.primary || keyDef.label;
              this.options.onKeyClick(char, keyDef.code, { shiftKey: shiftActive });
              if (shiftActive) this.setVirtualShiftActive(false);
            }
          };

          keyEl.addEventListener('pointerdown', activate);
          keyEl.addEventListener('pointerup', () => keyEl.classList.remove('key-pressed'));
          keyEl.addEventListener('pointerleave', () => keyEl.classList.remove('key-pressed'));
          keyEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              activate();
            }
          });
        }

        rowEl.appendChild(keyEl);
        this.keyElements.set(keyDef.code, keyEl);

        if (keyDef.primary) {
          this.charToCode.set(keyDef.primary, keyDef.code);
          this.charToCode.set(keyDef.primary.toLowerCase(), keyDef.code);
          this.charToCode.set(keyDef.primary.toUpperCase(), keyDef.code);
        }
        if (keyDef.shift) {
          this.charToCode.set(keyDef.shift, keyDef.code);
        }
      });

      keyboardWrapper.appendChild(rowEl);
    });

    // Special key mappings for whitespace and newlines
    this.charToCode.set('\n', 'Enter');
    this.charToCode.set('\r', 'Enter');
    this.charToCode.set('\t', 'Tab');
    this.charToCode.set(' ', 'Space');

    this.container.appendChild(keyboardWrapper);
  }

  setVirtualShiftActive(active) {
    this.virtualShiftActive = !!active;
    ['ShiftLeft', 'ShiftRight'].forEach(code => {
      const shiftEl = this.keyElements.get(code);
      if (shiftEl) {
        shiftEl.classList.toggle('key-modifier-active', this.virtualShiftActive);
        shiftEl.setAttribute('aria-pressed', String(this.virtualShiftActive));
      }
    });
  }

  highlightTarget(char, shiftNeeded = null) {
    this.keyElements.forEach(el => el.classList.remove('key-target', 'key-shift-target'));
    this.currentTargetChar = char;
    this.currentShiftNeeded = shiftNeeded;

    if (!char) return;

    const code = this.charToCode.get(char) || this.charToCode.get(char.toLowerCase());
    if (code) {
      const targetEl = this.keyElements.get(code);
      if (targetEl) targetEl.classList.add('key-target');
    }

    if (shiftNeeded) {
      const shiftEl = this.keyElements.get(shiftNeeded);
      if (shiftEl) shiftEl.classList.add('key-shift-target');
    }
  }

  triggerError(typedChar) {
    const code = this.charToCode.get(typedChar);
    if (code) {
      const errorEl = this.keyElements.get(code);
      if (errorEl) {
        errorEl.classList.add('key-error');
        setTimeout(() => errorEl.classList.remove('key-error'), 300);
      }
    }

    const targetCode = this.charToCode.get(this.currentTargetChar) || this.charToCode.get(this.currentTargetChar.toLowerCase());
    if (targetCode) {
      const targetEl = this.keyElements.get(targetCode);
      if (targetEl) {
        targetEl.classList.add('key-target-pulse');
        setTimeout(() => targetEl.classList.remove('key-target-pulse'), 400);
      }
    }
  }

  triggerPhysicalPress(code) {
    const el = this.keyElements.get(code);
    if (el) {
      el.classList.add('key-pressed');
      setTimeout(() => el.classList.remove('key-pressed'), 120);
    }
  }

  applyHeatmap(keyStats = {}) {
    const statsObj = keyStats || {};

    this.keyElements.forEach((el, code) => {
      el.classList.remove('heatmap-mastered', 'heatmap-good', 'heatmap-improving', 'heatmap-poor', 'heatmap-untested');

      let attempts = 0;
      let errors = 0;
      let totalLatencyMs = 0;
      let charsFound = [];

      // Collect all stats associated with this physical keycap
      for (const [char, cCode] of this.charToCode.entries()) {
        if (cCode === code) {
          const lower = char.toLowerCase();
          const stats = statsObj[char] || statsObj[lower];
          if (stats && stats.attempts > 0) {
            attempts += (stats.attempts || 0);
            errors += (stats.errors || 0);
            totalLatencyMs += (stats.totalLatencyMs || 0);
            if (!charsFound.includes(lower)) charsFound.push(lower);
          }
        }
      }

      if (attempts > 0) {
        const accuracy = Math.max(0, Math.min(100, Math.round(((attempts - errors) / attempts) * 100)));
        const avgLatency = Math.round(totalLatencyMs / attempts);

        if (accuracy >= 97) el.classList.add('heatmap-mastered');
        else if (accuracy >= 90) el.classList.add('heatmap-good');
        else if (accuracy >= 80) el.classList.add('heatmap-improving');
        else el.classList.add('heatmap-poor');

        const labelName = charsFound.length > 0 ? charsFound.join('/').toUpperCase() : code.replace('Key', '');
        el.title = `Key [${labelName}]: ${accuracy}% Accuracy (${attempts} strokes, ${errors} mistakes, ${avgLatency}ms avg)`;

        // Micro accuracy percentage badge
        const inner = el.querySelector('.keycap-inner');
        if (inner) {
          let badge = inner.querySelector('.keycap-heatmap-badge');
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'keycap-heatmap-badge';
            inner.appendChild(badge);
          }
          badge.textContent = `${accuracy}%`;
        }
      } else {
        el.classList.add('heatmap-untested');
        el.title = `Key [${code.replace('Key', '')}]: Untested`;
        const existingBadge = el.querySelector('.keycap-heatmap-badge');
        if (existingBadge) existingBadge.remove();
      }
    });
  }

  clearHeatmap() {
    this.keyElements.forEach(el => {
      el.classList.remove('heatmap-mastered', 'heatmap-good', 'heatmap-improving', 'heatmap-poor', 'heatmap-untested');
      el.removeAttribute('title');
      const badge = el.querySelector('.keycap-heatmap-badge');
      if (badge) badge.remove();
    });
  }
}
