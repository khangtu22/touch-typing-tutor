/**
 * Universal Command Palette (Cmd+K / Ctrl+K / Esc)
 * Spotlight modal for keyboard-first navigation, mode switching, themes, and actions.
 */

import { sound } from './sound-engine.js';

export class CommandPalette {
  constructor(uiManager, store) {
    this.ui = uiManager;
    this.store = store;
    this.isOpen = false;
    this.selectedIndex = 0;
    this.filteredCommands = [];
    this.overlayEl = null;

    this.commands = [
      // --- Navigation ---
      { id: 'nav_curriculum', title: 'Go to Curriculum & Dashboard', category: 'Navigation', icon: '📖', shortcut: '1', action: () => this.ui.navigateTo('dashboard') },
      { id: 'nav_code', title: 'Open Developer Code Arena', category: 'Navigation', icon: '💻', shortcut: 'C', action: () => this.ui.navigateTo('code') },
      { id: 'nav_speedtest', title: 'Start Benchmark Speed Test', category: 'Navigation', icon: '⚡', shortcut: 'T', action: () => this.ui.navigateTo('speedtest') },
      { id: 'nav_quotes', title: 'Browse Quote Vault & Literature', category: 'Navigation', icon: '📜', shortcut: 'Q', action: () => this.ui.navigateTo('quotes') },
      { id: 'nav_custom', title: 'Open Custom Arena & Text Importer', category: 'Navigation', icon: '✨', action: () => this.ui.navigateTo('custom') },
      { id: 'nav_arcade', title: 'Play Arcade Mini-Games', category: 'Navigation', icon: '🎮', action: () => this.ui.navigateTo('arcade') },
      { id: 'nav_profile', title: 'View Analytics & Finger Heatmap', category: 'Navigation', icon: '📊', action: () => this.ui.navigateTo('profile') },
      { id: 'nav_settings', title: 'Open Settings & Preferences', category: 'Navigation', icon: '⚙️', action: () => this.ui.navigateTo('settings') },

      // --- Quick Actions ---
      { id: 'act_qotd', title: "Practice Quote of the Day", category: 'Quick Action', icon: '✨', action: () => this.ui.startQuoteOfTheDayPractice() },
      { id: 'act_random_quote', title: 'Practice Random Quote', category: 'Quick Action', icon: '🎲', action: () => this.ui.startRandomQuote() },
      { id: 'act_weakness_drill', title: 'Launch Keybr AI Weak-Key Drill', category: 'Quick Action', icon: '🎯', action: () => this.ui.startWeaknessDrill() },
      { id: 'act_zen_mode', title: 'Enter Distraction-Free Zen Mode', category: 'Quick Action', icon: '🧘', shortcut: 'Z', action: () => this.ui.startZenPractice() },
      { id: 'act_certificate', title: 'View & Download Typing Certificate', category: 'Quick Action', icon: '📜', action: () => this.ui.openCertificateModal() },
      { id: 'act_speed_60', title: 'Start 60-Second Speed Benchmark', category: 'Quick Action', icon: '⏱️', action: () => this.ui.startSpeedTest('60s') },
      { id: 'act_speed_30', title: 'Start 30-Second Speed Sprint', category: 'Quick Action', icon: '⚡', action: () => this.ui.startSpeedTest('30s') },

      // --- Themes ---
      { id: 'theme_dark', title: 'Theme: Dark Cyberpunk', category: 'Theme', icon: '🌌', action: () => this.setTheme('dark') },
      { id: 'theme_tokyo', title: 'Theme: Tokyo Night (Neon Purple)', category: 'Theme', icon: '🌆', action: () => this.setTheme('tokyo') },
      { id: 'theme_retro', title: 'Theme: Retro Beige (90s Terminal)', category: 'Theme', icon: '💾', action: () => this.setTheme('retro') },
      { id: 'theme_cyberpunk', title: 'Theme: Cyberpunk Neon Yellow', category: 'Theme', icon: '⚡', action: () => this.setTheme('cyberpunk') },
      { id: 'theme_botanical', title: 'Theme: Botanical Forest Green', category: 'Theme', icon: '🌿', action: () => this.setTheme('botanical') },

      // --- Sound Profiles ---
      { id: 'sound_cherry_blue', title: 'Sound: Cherry MX Blue (Clicky)', category: 'Audio', icon: '🔊', action: () => this.setSound('cherry_blue') },
      { id: 'sound_gateron_brown', title: 'Sound: Gateron Brown (Warm Tactile)', category: 'Audio', icon: '🔊', action: () => this.setSound('gateron_brown') },
      { id: 'sound_holy_panda', title: 'Sound: Holy Panda / Topre (Deep Thock)', category: 'Audio', icon: '🔊', action: () => this.setSound('holy_panda') },
      { id: 'sound_typewriter', title: 'Sound: Vintage Typewriter (Mechanical Bell)', category: 'Audio', icon: '🔔', action: () => this.setSound('typewriter') },
      { id: 'sound_bubble_pop', title: 'Sound: Bubble Wrap Pop (Playful Pitch)', category: 'Audio', icon: '🫧', action: () => this.setSound('bubble_pop') }
    ];

    this.filteredCommands = [...this.commands];
    this.injectModal();
    this.attachGlobalHotkeys();
  }

  setTheme(themeName) {
    this.store.update(prev => ({
      ...prev,
      settings: { ...prev.settings, theme: themeName }
    }));
    document.body.className = `theme-${themeName}`;
    this.ui.showToast(`Theme changed to ${themeName}`, 'accent');
  }

  setSound(switchProfile) {
    this.store.update(prev => ({
      ...prev,
      settings: { ...prev.settings, switchProfile }
    }));
    sound.setSwitchProfile(switchProfile);
    const friendlyName = switchProfile.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
    this.ui.showToast(`Sound profile set to ${friendlyName}`, 'teal');
  }

  injectModal() {
    if (document.getElementById('command-palette-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'command-palette-modal';
    overlay.className = 'cp-overlay';
    overlay.style.display = 'none';

    overlay.innerHTML = `
      <div class="cp-card">
        <div class="cp-search-row">
          <svg class="cp-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="cp-search-input" class="cp-input" placeholder="Type a command, screen, theme, or shortcut..." autocomplete="off" spellcheck="false" />
          <span class="cp-esc-badge">ESC</span>
        </div>
        <div id="cp-list" class="cp-list"></div>
        <div class="cp-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
          <span><kbd>↵</kbd> to select</span>
          <span><kbd>ESC</kbd> to close</span>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlayEl = overlay;

    // Overlay click dismiss
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    // Input search filter
    const input = overlay.querySelector('#cp-search-input');
    input.addEventListener('input', (e) => {
      this.filter(e.target.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectPrev();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.executeSelected();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });
  }

  attachGlobalHotkeys() {
    window.addEventListener('keydown', (e) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
        return;
      }

      // Esc when open
      if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        this.close();
      }
    });
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.selectedIndex = 0;
    this.filteredCommands = [...this.commands];
    if (this.overlayEl) {
      this.overlayEl.style.display = 'flex';
      const input = this.overlayEl.querySelector('#cp-search-input');
      if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 30);
      }
      this.renderList();
    }
  }

  close() {
    this.isOpen = false;
    if (this.overlayEl) {
      this.overlayEl.style.display = 'none';
    }
  }

  filter(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      this.filteredCommands = [...this.commands];
    } else {
      this.filteredCommands = this.commands.filter(cmd =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        (cmd.shortcut && cmd.shortcut.toLowerCase() === q)
      );
    }
    this.selectedIndex = 0;
    this.renderList();
  }

  selectNext() {
    if (this.filteredCommands.length === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
    this.renderList();
    this.scrollToSelected();
  }

  selectPrev() {
    if (this.filteredCommands.length === 0) return;
    this.selectedIndex = (this.selectedIndex - 1 + this.filteredCommands.length) % this.filteredCommands.length;
    this.renderList();
    this.scrollToSelected();
  }

  scrollToSelected() {
    const active = this.overlayEl?.querySelector('.cp-item.cp-item-selected');
    if (active) {
      active.scrollIntoView({ block: 'nearest' });
    }
  }

  executeSelected() {
    const cmd = this.filteredCommands[this.selectedIndex];
    if (cmd && typeof cmd.action === 'function') {
      this.close();
      cmd.action();
    }
  }

  renderList() {
    const listEl = this.overlayEl?.querySelector('#cp-list');
    if (!listEl) return;

    if (this.filteredCommands.length === 0) {
      listEl.innerHTML = `
        <div class="cp-empty">
          <span>🔍 No matching commands found</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = this.filteredCommands.map((cmd, idx) => {
      const isSelected = idx === this.selectedIndex;
      return `
        <div class="cp-item ${isSelected ? 'cp-item-selected' : ''}" data-index="${idx}">
          <div class="cp-item-left">
            <span class="cp-item-icon">${cmd.icon}</span>
            <div class="cp-item-info">
              <span class="cp-item-title">${cmd.title}</span>
              <span class="cp-item-cat">${cmd.category}</span>
            </div>
          </div>
          ${cmd.shortcut ? `<span class="cp-item-shortcut">${cmd.shortcut}</span>` : ''}
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.cp-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        this.selectedIndex = parseInt(item.dataset.index, 10);
        this.renderList();
      });
      item.addEventListener('click', () => {
        this.selectedIndex = parseInt(item.dataset.index, 10);
        this.executeSelected();
      });
    });
  }
}
