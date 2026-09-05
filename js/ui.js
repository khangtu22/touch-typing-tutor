/**
 * UI & Screen Coordinator (Expanded Suite v3.0 — Premium Edition)
 * Manages view routing, Custom Arena, Ghost Racing HUD, Theme live switcher,
 * Multi-layout key remapping, JSON Backup & Restore, and all Premium Features:
 * Focus Mode, Zen Mode, Quote Vault, Goal Rings, Theme Studio, Advanced Analytics.
 */

import { store, getLevelProgress, getLocalDateKey } from './state.js';
import { CURRICULUM, CURRICULUM_LEVELS, generateWeakKeysLesson, generateWeakFingerLesson } from './curriculum.js';
import { typingEngine } from './typing-engine.js';
import { KeyboardRenderer } from './keyboard-renderer.js';
import { HandRenderer } from './hand-renderer.js';
import { AnalyticsEngine } from './analytics.js';
import { ACHIEVEMENTS, AchievementEngine } from './achievements.js';
import { StreakEngine } from './streak-challenge.js';
import { sound } from './sound-engine.js';
import { FINGERS, KEY_TO_FINGER } from './finger-mapping.js';
import { ghostRacer } from './ghost-racer.js';
import { CODE_PRESETS, createPlacementLesson, CustomPracticeManager } from './custom-practice.js';
import { LAYOUTS } from './layouts.js';
import { getLessonMastery, getPlacementRecommendation, getReviewQueue } from './mastery.js';
import { focusMode, zenMode } from './focus-zen.js';
import { goalsManager, renderGoalRings, DEFAULT_GOALS, DEFAULT_WELLNESS } from './goals-wellness.js';
import { themeStudio, renderThemeStudioUI } from './theme-studio.js';
import { renderAdvancedAnalyticsDashboard } from './advanced-analytics.js';
import { QUOTE_VAULT, MULTI_LANG_WORDS, getQuoteOfTheDay, getQuotesByFilter, getRandomQuote, generateLanguagePractice, queryQuotes, estimateTypingTimeSec } from './premium-features.js';
import { ArcadeHubManager } from './arcade-games.js';
import { CODE_LANGUAGES, CODE_SNIPPETS, getFilteredSnippets, getRandomCodeSnippet } from './code-snippets.js';
import { getWeakKeyAnalysis, generateWeaknessDrill, generateMissedWordsDrill } from './weakness-engine.js';
import { SPEED_TEST_PRESETS, generateSpeedTestLesson, calculateConsistency } from './speed-test.js';
import { CommandPalette } from './command-palette.js';
import { drawCertificate, downloadCertificatePng, getTypingRank } from './certificate-generator.js';

const escapeHtml = value => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export class UIManager {
  constructor() {
    this.activeScreen = 'dashboard';
    this.keyboardRenderer = null;
    this.handRenderer = null;
    this.arcadeManager = null;
    this.currentLessonData = null;
    this.currentSessionSummary = null;
    this.activeArenaTab = 'code'; // 'paste' | 'code' | 'sprint' | 'quotes' | 'language'
    this.activeQuoteCategory = null;
    this.activeQuoteDifficulty = null;
    this.activeQuoteSearch = '';
    this.activeQuoteStatus = 'all'; // 'all' | 'unpracticed' | 'practiced' | 'bookmarked'
    this.activeQuoteSort = 'default'; // 'default' | 'shortest' | 'longest' | 'author' | 'wpm'
    this.speakingQuoteId = null;
    this.isFocusModeActive = false;
    this.resultsShortcutLockoutUntil = 0;
    this.typingViewportState = {
      text: null,
      currentIndex: null,
      windowStart: 0
    };
    this.dashboardStageFilter = 'all'; // 'all' | '1' | '2' | '3' | '4' | '5'
    this.dashboardSearchQuery = '';

    this.initElements();
    this.initEventListeners();
    this.subscribeToStore();
  }

  initElements() {
    this.screens = {
      onboarding: document.getElementById('screen-onboarding'),
      dashboard: document.getElementById('screen-dashboard'),
      custom: document.getElementById('screen-custom'),
      lesson: document.getElementById('screen-lesson'),
      results: document.getElementById('screen-results'),
      profile: document.getElementById('screen-profile'),
      settings: document.getElementById('screen-settings'),
      quotes: document.getElementById('screen-quotes'),
      arcade: document.getElementById('screen-arcade'),
      code: document.getElementById('screen-code'),
      speedtest: document.getElementById('screen-speedtest')
    };

    this.toastContainer = document.getElementById('toast-container');
    this.confettiContainer = document.getElementById('confetti-container');

    // Navigation buttons
    this.navBrand = document.getElementById('nav-brand');
    this.navDashboardBtn = document.getElementById('nav-dashboard-btn');
    this.navCodeBtn = document.getElementById('nav-code-btn');
    this.navSpeedtestBtn = document.getElementById('nav-speedtest-btn');
    this.navArcadeBtn = document.getElementById('nav-arcade-btn');
    this.navCustomBtn = document.getElementById('nav-custom-btn');
    this.navProfileBtn = document.getElementById('nav-profile-btn');
    this.navSettingsBtn = document.getElementById('nav-settings-btn');
    this.navQuotesBtn = document.getElementById('nav-quotes-btn');
    this.navPaletteBtn = document.getElementById('nav-palette-btn');
    this.navShortcutsBtn = document.getElementById('nav-shortcuts-btn');

    // Initialize Universal Command Palette
    this.commandPalette = new CommandPalette(this, store);

    // Lesson Screen HUD elements
    this.lessonTitleEl = document.getElementById('hud-lesson-title');
    this.lessonRoundEl = document.getElementById('hud-lesson-round');
    this.lessonProgressFill = document.getElementById('hud-progress-fill');
    this.hudWpmEl = document.getElementById('hud-wpm');
    this.hudAccuracyEl = document.getElementById('hud-accuracy');
    this.hudComboEl = document.getElementById('hud-combo');
    this.hudComboWrapper = document.getElementById('hud-combo-wrapper');
    this.typingTextDisplay = document.getElementById('typing-text-display');
    this.hudCorrectionBadge = document.getElementById('hud-correction-badge');
    this.keyboardContainer = document.getElementById('keyboard-container');
    this.handGuideContainer = document.getElementById('hand-guide-container');

    // Race Track Elements
    this.raceTrackContainer = document.getElementById('race-track-container');
    this.raceCompetitorAvatar = document.getElementById('race-competitor-avatar');
    this.raceCompetitorName = document.getElementById('race-competitor-name');
    this.raceDeltaChip = document.getElementById('race-delta-chip');
    this.raceUserMarker = document.getElementById('race-user-marker');
    this.raceCompetitorMarker = document.getElementById('race-competitor-marker');
  }

  initEventListeners() {
    if (this.navBrand) {
      this.navBrand.addEventListener('click', () => this.navigateTo('dashboard'));
      this.navBrand.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.navigateTo('dashboard');
        }
      });
    }
    if (this.navDashboardBtn) this.navDashboardBtn.addEventListener('click', () => this.navigateTo('dashboard'));
    if (this.navCodeBtn) this.navCodeBtn.addEventListener('click', () => this.navigateTo('code'));
    if (this.navSpeedtestBtn) this.navSpeedtestBtn.addEventListener('click', () => this.navigateTo('speedtest'));
    if (this.navArcadeBtn) this.navArcadeBtn.addEventListener('click', () => this.navigateTo('arcade'));
    if (this.navCustomBtn) this.navCustomBtn.addEventListener('click', () => this.navigateTo('custom'));
    if (this.navProfileBtn) this.navProfileBtn.addEventListener('click', () => this.navigateTo('profile'));
    if (this.navSettingsBtn) this.navSettingsBtn.addEventListener('click', () => this.navigateTo('settings'));
    if (this.navQuotesBtn) this.navQuotesBtn.addEventListener('click', () => this.navigateTo('quotes'));
    if (this.navPaletteBtn) this.navPaletteBtn.addEventListener('click', () => this.openCommandPalette());
    if (this.navShortcutsBtn) this.navShortcutsBtn.addEventListener('click', () => this.showShortcutsPopup());

    // Global Keydown Handler
    window.addEventListener('keydown', (e) => {
      sound.resume();

      if (e.key === 'Escape' && this.activeScreen === 'lesson') {
        e.preventDefault();
        // Exit Zen or Focus mode first before pausing
        if (zenMode.isActive) { zenMode.exit(); return; }
        if (this.isFocusModeActive) { this.exitFocusMode(); return; }
        this.toggleLessonPause();
        return;
      }

      // If lesson is paused, R restarts the round
      if (this.activeScreen === 'lesson' && typingEngine.isPaused && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        this.hidePauseModal();
        typingEngine.retryLesson();
        return;
      }

      // Quotes screen quick search shortcut '/' and modal escape
      if (this.activeScreen === 'quotes') {
        const isInteractive = e.target?.closest?.('input, textarea, select');
        if (e.key === '/' && !isInteractive && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          const searchInput = document.getElementById('quote-search-input');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
          return;
        }
        if (e.key === 'Escape') {
          const customModal = document.getElementById('custom-passage-modal-overlay');
          if (customModal) {
            e.preventDefault();
            customModal.remove();
            return;
          }
          const searchInput = document.getElementById('quote-search-input');
          if (searchInput && document.activeElement === searchInput) {
            e.preventDefault();
            if (searchInput.value) {
              searchInput.value = '';
              this.activeQuoteSearch = '';
              this.updateQuoteVaultGrid();
            }
            searchInput.blur();
            return;
          }
        }
      }

      // Dashboard screen quick search shortcut '/' and search escape / enter
      if (this.activeScreen === 'dashboard') {
        const isInteractive = e.target?.closest?.('input, textarea, select');
        if (e.key === '/' && !isInteractive && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          const searchInput = document.getElementById('roadmap-search-input');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
          return;
        }
        if (e.key === 'Escape') {
          const searchInput = document.getElementById('roadmap-search-input');
          if (searchInput && document.activeElement === searchInput) {
            e.preventDefault();
            if (searchInput.value) {
              searchInput.value = '';
              this.dashboardSearchQuery = '';
              this.applyDashboardFilters();
            }
            searchInput.blur();
            return;
          }
        }
        if (e.key === 'Enter' && !isInteractive && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const heroBtn = document.getElementById('hero-start-btn');
          if (heroBtn && document.activeElement !== heroBtn) {
            e.preventDefault();
            heroBtn.click();
            return;
          }
        }
      }

      // On the results / complete screen:
      // Enter or Space advances to the next lesson; R retries the current lesson; Esc goes to dashboard.
      if (this.activeScreen === 'results') {
        const target = e.target;
        const isInteractiveTarget = target?.closest?.(
          'input, textarea, select, [contenteditable="true"]'
        );

        if (!isInteractiveTarget && !e.ctrlKey && !e.metaKey && !e.altKey) {
          // Always prevent default browser scrolling (Space, Arrows, PageUp/Down, Backspace) on results screen
          if (['Space', 'Backspace', 'Tab', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(e.code) || e.key === ' ') {
            e.preventDefault();
          }

          // Discard residual mistypes and trailing keystrokes from the completed round
          if (Date.now() < (this.resultsShortcutLockoutUntil || 0)) {
            return;
          }

          if (e.key === 'Enter' || e.code === 'NumpadEnter' || e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
            document.getElementById('results-next-btn')?.click();
            return;
          }
          if (e.key.toLowerCase() === 'r') {
            e.preventDefault();
            document.getElementById('results-retry-btn')?.click();
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            document.getElementById('results-dashboard-btn')?.click();
            return;
          }
        }
        return;
      }

      if (this.activeScreen === 'lesson') {
        // If metaKey or ctrlKey is pressed, allow shortcuts like Cmd+K, Cmd+R, Cmd+C, etc.
        if (e.metaKey || e.ctrlKey) {
          if (e.key.toLowerCase() === 'k') {
            e.preventDefault();
            this.openCommandPalette();
            return;
          }
          return;
        }

        // Prevent default browser scrolling on typing screen
        if (['Space', 'Backspace', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) || e.key === ' ') {
          e.preventDefault();
        }

        if (typingEngine.isActive) {
          if (zenMode.isActive) return;
          if (this.keyboardRenderer) {
            this.keyboardRenderer.triggerPhysicalPress(e.code);
          }
          if (this.handRenderer) {
            this.handRenderer.triggerPhysicalPress(e.code, e.key);
          }
          typingEngine.handleKeyDown(e);
        }
        return;
      }

      // --- Global Shortcuts (only on dashboard, never inside inputs or during lessons/results) ---
      if (this.activeScreen === 'dashboard' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = e.target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            this.launchZenMode();
            break;
          case 't':
            e.preventDefault();
            this.navigateTo('speedtest');
            break;
          case 'c':
            e.preventDefault();
            this.navigateTo('code');
            break;
          case 'f': {
            const state = store.getState();
            if (state.settings?.wellness?.focusModeShortcut !== false) {
              e.preventDefault();
            }
            break;
          }
          case 'a':
            e.preventDefault();
            this.navigateTo('profile');
            break;
          case 'g':
            e.preventDefault();
            this.navigateTo('arcade');
            break;
          case 's':
            e.preventDefault();
            this.navigateTo('settings');
            break;
          case 'q':
            e.preventDefault();
            this.navigateTo('quotes');
            break;
          case '?':
            e.preventDefault();
            this.showShortcutsPopup();
            break;
        }
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = e.target?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
          e.preventDefault();
          this.showShortcutsPopup();
        }
      }
    });

    // Handle typing engine callbacks
    typingEngine.onStateChange = (data) => this.handleTypingEngineState(data);
    typingEngine.onErrorFeedback = (data) => this.handleTypingError(data);
    typingEngine.onRoundFinished = (data) => this.handleRoundFinished(data);
    typingEngine.onLessonFinished = (summary) => this.handleLessonFinished(summary);
    typingEngine.onSuddenDeathFail = () => {
      this.showToast('💀 Sudden Death! Mistake made - round restarted!', 'coral');
    };

    window.addEventListener('resize', () => {
      this.checkMobileRestriction();
      // Re-measure after a responsive reflow without animating an idle layout.
      if (typingEngine.isActive && this.typingViewportState.text) {
        this.updateTypingViewport(this.typingViewportState.text, typingEngine.charIndex);
      }
    });
  }

  subscribeToStore() {
    const applyState = (state) => {
      sound.setEnabled(state.settings.soundEnabled);
      sound.setVolume(state.settings.soundVolume);
      sound.setSwitchProfile(state.settings.switchProfile);

      // Themes: check if a custom theme is selected
      if (state.settings.customThemeId) {
        try {
          const customThemes = JSON.parse(localStorage.getItem('typing_tutor_custom_themes') || '[]');
          const customTheme = customThemes.find(t => t.id === state.settings.customThemeId);
          if (customTheme) {
            themeStudio.applyTheme(customTheme);
          } else {
            themeStudio.resetToBuiltIn();
          }
        } catch {
          themeStudio.resetToBuiltIn();
        }
      } else {
        themeStudio.resetToBuiltIn();
      }

      document.body.className = '';
      document.body.classList.add(`theme-${state.settings.theme || 'dark'}`);
      document.body.classList.toggle('high-contrast', !!state.settings.highContrast);
      document.body.classList.toggle('reduced-motion', !!state.settings.reducedMotion);
      document.body.dataset.textSize = state.settings.textSize || 'medium';

      if (this.keyboardRenderer) {
        this.keyboardRenderer.setLayout(state.settings.layout || 'qwerty');
        this.keyboardRenderer.setBlindMode(state.settings.blindMode);
      }

      this.updateHeaderStats(state);
    };

    store.subscribe(applyState);

    // Store state is loaded synchronously before UIManager is created, so the
    // first state notification may not happen until a later user action.
    // Apply the persisted settings and header stats immediately on startup.
    applyState(store.getState());
  }

  start() {
    const state = store.getState();
    StreakEngine.evaluateStreakStatus(store);
    this.checkMobileRestriction();

    if (!state.onboardingComplete) {
      this.navigateTo('onboarding');
      this.renderOnboarding();
    } else {
      this.navigateTo('dashboard');
      this.renderDashboard();
    }
  }

  navigateTo(screenName) {
    if (this.activeScreen === 'arcade' && screenName !== 'arcade') {
      this.arcadeManager?.activeGame?.destroy?.();
    }
    if (this.activeScreen === 'lesson' && screenName !== 'lesson') {
      try { goalsManager.setPracticeActive(false); } catch (e) {}
      try { typingEngine.destroy(); } catch (e) {}
      try { ghostRacer.stopRace(); } catch (e) {}
    }

    if (this.speakingQuoteId && typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
      this.speakingQuoteId = null;
    }

    this.activeScreen = screenName;
    try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (e) {}

    Object.entries(this.screens).forEach(([name, el]) => {
      if (el) {
        el.classList.toggle('screen-active', name === screenName);
      }
    });

    [
      [this.navDashboardBtn, 'dashboard'],
      [this.navCodeBtn, 'code'],
      [this.navSpeedtestBtn, 'speedtest'],
      [this.navArcadeBtn, 'arcade'],
      [this.navCustomBtn, 'custom'],
      [this.navQuotesBtn, 'quotes'],
      [this.navProfileBtn, 'profile'],
      [this.navSettingsBtn, 'settings']
    ].forEach(([button, target]) => {
      if (!button) return;
      const isCurrent = screenName === target;
      button.classList.toggle('nav-btn-active', isCurrent);
      if (isCurrent) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });

    if (screenName === 'dashboard') this.renderDashboard();
    if (screenName === 'code') this.renderCodeArena();
    if (screenName === 'speedtest') this.renderSpeedTest();
    if (screenName === 'arcade') this.renderArcadeScreen();
    if (screenName === 'custom') this.renderCustomArena();
    if (screenName === 'quotes') this.renderQuoteVault();
    if (screenName === 'profile') this.renderProfile();
    if (screenName === 'settings') this.renderSettings();
    if (screenName === 'results') {
      if (this.currentSessionSummary && (!this.screens.results?.children?.length || this.screens.results.innerHTML.trim() === '')) {
        this.renderResults(this.currentSessionSummary);
      }
    }
  }

  renderArcadeScreen() {
    const container = this.screens.arcade;
    if (!container) return;
    if (!this.arcadeManager) {
      this.arcadeManager = new ArcadeHubManager(container, this);
    }
    this.arcadeManager.renderLobby();
  }

  updateHeaderStats(state) {
    const lvlInfo = getLevelProgress(state.xp);
    const levelBadge = document.getElementById('nav-level-badge');
    const xpText = document.getElementById('nav-xp-text');
    const xpFill = document.getElementById('nav-xp-fill');
    const streakCount = document.getElementById('nav-streak-count');
    const streakFlame = document.getElementById('nav-streak-flame');

    if (levelBadge) levelBadge.textContent = `Lvl ${lvlInfo.currentLvl}`;
    if (xpText) xpText.textContent = `${state.xp.toLocaleString()} XP`;
    if (xpFill) xpFill.style.width = `${lvlInfo.pct}%`;
    if (streakCount) streakCount.textContent = `${state.dailyStreak}`;
    if (streakFlame) streakFlame.classList.toggle('flame-active', state.dailyStreak > 0);
  }

  // ==========================================
  // ONBOARDING SCREEN
  // ==========================================
  renderOnboarding() {
    const container = this.screens.onboarding;
    if (!container) return;

    let currentStep = 1;

    const renderStep = () => {
      if (currentStep === 1) {
        container.innerHTML = `
          <div class="onboarding-card">
            <div class="onboarding-badge">Welcome to Pure Muscle Memory</div>
            <h1 class="onboarding-title">Master 10-Finger Touch Typing</h1>
            <p class="onboarding-desc">
              Touch typing isn't about memorizing where keys are on a screen. It's about training your fingers
              to strike with effortless reflex without looking down at the keyboard.
            </p>
            <div class="onboarding-feature-grid">
              <div class="onboarding-feature-item">
                <span class="feature-icon">🖐️</span>
                <strong>Dedicated Fingers</strong>
                <span>Each of your 10 fingers owns a precise set of keys.</span>
              </div>
              <div class="onboarding-feature-item">
                <span class="feature-icon">⚓</span>
                <strong>Tactile Anchors</strong>
                <span>F and J keys guide your index fingers back home.</span>
              </div>
              <div class="onboarding-feature-item">
                <span class="feature-icon">⚡</span>
                <strong>Pure Velocity</strong>
                <span>Type at the exact speed of your thoughts.</span>
              </div>
            </div>
            <button id="onboarding-next-btn" class="btn btn-primary btn-large">Let's Learn →</button>
          </div>
        `;
      } else if (currentStep === 2) {
        container.innerHTML = `
          <div class="onboarding-card onboarding-step-2">
            <div class="onboarding-badge">Step 2 of 3 • The Home Row</div>
            <h1 class="onboarding-title">Meet Your Home Row Anchors</h1>
            <p class="onboarding-desc">
              Rest your fingers lightly on <strong>A S D F</strong> (left hand) and <strong>J K L ;</strong> (right hand).
              Your index fingers always feel for the raised tactile bumps on <strong>F</strong> and <strong>J</strong>.
            </p>
            <div id="onboarding-hand-preview" class="onboarding-hand-preview"></div>
            <div class="finger-legend-chips">
              ${Object.values(FINGERS).map(f => `
                <div class="finger-chip" style="--chip-color: ${f.color}">
                  <span class="chip-dot"></span>
                  <span class="chip-label">${f.name}</span>
                </div>
              `).join('')}
            </div>
            <div class="onboarding-actions">
              <button id="onboarding-prev-btn" class="btn btn-secondary">← Back</button>
              <button id="onboarding-next-btn" class="btn btn-primary btn-large">Continue →</button>
            </div>
          </div>
        `;
        const handPreviewEl = document.getElementById('onboarding-hand-preview');
        if (handPreviewEl) {
          const previewHand = new HandRenderer(handPreviewEl);
          const kbSlot = handPreviewEl.querySelector('#mech-kb-slot') || handPreviewEl;
          const previewKb = new KeyboardRenderer(kbSlot, {
            interactive: false,
            layoutId: store.getState().settings.layout || 'qwerty'
          });
          previewHand.setKeyboardRenderer(previewKb);
          previewHand.highlightFinger('left-index', 'f');

          const timer = setTimeout(() => {
            if (document.body.contains(handPreviewEl)) {
              previewHand.highlightFinger('right-index', 'j');
            }
          }, 1500);
        }
      } else if (currentStep === 3) {
        container.innerHTML = `
          <div class="onboarding-card">
            <div class="onboarding-badge">Step 3 of 3 • Personal Goal</div>
            <h1 class="onboarding-title">What is your Target Speed?</h1>
            <p class="onboarding-desc">
              Choose a target typing velocity. We will calibrate lesson targets and pace your progression.
            </p>
            <div class="wpm-goal-selector">
              <button class="goal-option-card" data-wpm="30">
                <span class="goal-wpm">30 WPM</span>
                <span class="goal-label">Smooth Beginner</span>
              </button>
              <button class="goal-option-card active" data-wpm="40">
                <span class="goal-wpm">40 WPM</span>
                <span class="goal-label">Fluent Everyday</span>
              </button>
              <button class="goal-option-card" data-wpm="60">
                <span class="goal-wpm">60 WPM</span>
                <span class="goal-label">Swift Professional</span>
              </button>
              <button class="goal-option-card" data-wpm="80">
                <span class="goal-wpm">80 WPM</span>
                <span class="goal-label">Speed Demon</span>
              </button>
            </div>
            <div class="onboarding-actions">
              <button id="onboarding-prev-btn" class="btn btn-secondary">← Back</button>
              <button id="onboarding-finish-btn" class="btn btn-primary btn-large">Start Learning →</button>
            </div>
          </div>
        `;

        let selectedWpm = 40;
        container.querySelectorAll('.goal-option-card').forEach(btn => {
          btn.addEventListener('click', () => {
            container.querySelectorAll('.goal-option-card').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedWpm = parseInt(btn.dataset.wpm, 10) || 40;
          });
        });

        const finishBtn = document.getElementById('onboarding-finish-btn');
        if (finishBtn) {
          finishBtn.addEventListener('click', () => {
            store.update(prev => ({
              ...prev,
              onboardingComplete: true,
              targetWpm: selectedWpm
            }));
            this.navigateTo('dashboard');
          });
        }
      }

      const nextBtn = document.getElementById('onboarding-next-btn');
      const prevBtn = document.getElementById('onboarding-prev-btn');

      if (nextBtn) nextBtn.addEventListener('click', () => { currentStep++; renderStep(); });
      if (prevBtn) prevBtn.addEventListener('click', () => { currentStep--; renderStep(); });
    };

    renderStep();
  }

  // ==========================================
  // DASHBOARD SCREEN
  // ==========================================
  getAdaptiveFocusCoach2(state) {
    const keyStats = state.keyStats || {};
    
    // Check per-finger accuracy
    const fingerMastery = AnalyticsEngine.getFingerMastery(keyStats);
    const practicedFingers = fingerMastery.filter(f => f.totalAttempts >= 6);
    const weakFinger = practicedFingers.sort((a, b) => a.accuracy - b.accuracy)[0];
    
    if (weakFinger && weakFinger.accuracy < 85) {
      const targetKeys = Object.entries(KEY_TO_FINGER)
        .filter(([k, fId]) => fId === weakFinger.finger.id)
        .map(([k]) => k.toUpperCase())
        .slice(0, 6);
      
      const explanation = `Your ${weakFinger.finger.name.toLowerCase()} accuracy dropped to ${weakFinger.accuracy}%. This drill targets ${targetKeys.join(' ')}.`;
      const drillLesson = generateWeakFingerLesson(weakFinger.finger);
      drillLesson.title = `Focus Coach 2.0: ${weakFinger.finger.name} Drill`;
      drillLesson.subtitle = explanation;
      
      return {
        hasDrill: true,
        type: 'finger',
        title: `Strengthen ${weakFinger.finger.name}`,
        explanation,
        accuracy: weakFinger.accuracy,
        keys: targetKeys,
        lesson: drillLesson
      };
    }
    
    // Check weak keys
    const weakKeys = AnalyticsEngine.getWeakKeys(keyStats, 4).filter(k => k.accuracy < 85);
    if (weakKeys.length > 0) {
      const keys = weakKeys.map(k => k.char);
      const keysDisplay = keys.map(k => k === ' ' ? 'Space' : k.toUpperCase()).join(' ');
      const lowestAcc = Math.min(...weakKeys.map(k => k.accuracy));
      const explanation = `Your accuracy on ${keysDisplay} dropped to ${lowestAcc}%. This drill targets ${keysDisplay}.`;
      const drillLesson = generateWeakKeysLesson(keys);
      drillLesson.title = `Focus Coach 2.0: Weak Keys Drill (${keysDisplay})`;
      drillLesson.subtitle = explanation;
      
      return {
        hasDrill: true,
        type: 'keys',
        title: `Tune Up ${keysDisplay}`,
        explanation,
        accuracy: lowestAcc,
        keys: keys.map(k => k.toUpperCase()),
        lesson: drillLesson
      };
    }
    
    return null;
  }

  getWeeklyConsistencyData(state) {
    const today = new Date();
    const todayKey = getLocalDateKey(today);
    const historySet = new Set(state.practiceDatesHistory || []);
    if (state.lastPracticeDate === todayKey) {
      historySet.add(todayKey);
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = getLocalDateKey(d);
      const isToday = (dateKey === todayKey);
      const isPracticed = historySet.has(dateKey);

      days.push({
        dateKey,
        dayName: dayNames[d.getDay()],
        dayNum: d.getDate(),
        isToday,
        isPracticed
      });
    }

    const activeDaysCount = days.filter(d => d.isPracticed).length;
    const practicedToday = historySet.has(todayKey);

    return {
      days,
      activeDaysCount,
      practicedToday
    };
  }

  applyDashboardFilters() {
    const container = this.screens.dashboard;
    if (!container) return;

    const query = (this.dashboardSearchQuery || '').trim().toLowerCase();
    const stageFilter = this.dashboardStageFilter || 'all';

    let totalVisibleLessons = 0;
    const levelCards = container.querySelectorAll('.level-group-card');

    levelCards.forEach(levelCard => {
      const levelId = levelCard.dataset.level;
      const isLevelMatch = stageFilter === 'all' || stageFilter === String(levelId);

      if (!isLevelMatch) {
        levelCard.style.display = 'none';
        return;
      }

      const lessonCards = levelCard.querySelectorAll('.lesson-node-card');
      let visibleInLevel = 0;

      lessonCards.forEach(card => {
        const lessonId = parseInt(card.dataset.lessonId, 10);
        const lesson = CURRICULUM.find(l => l.id === lessonId);

        if (!lesson) {
          card.style.display = 'none';
          return;
        }

        let isMatch = true;
        if (query) {
          const matchTitle = lesson.title.toLowerCase().includes(query);
          const matchSubtitle = (lesson.subtitle || '').toLowerCase().includes(query);
          const matchFocus = (lesson.skillFocus || '').toLowerCase().includes(query);
          const matchKeys = lesson.keys.some(k => k.toLowerCase().includes(query) || (query === 'space' && k === ' '));
          const matchLevel = (lesson.levelTitle || '').toLowerCase().includes(query);
          const matchNum = String(lesson.id) === query || `lesson ${lesson.id}`.includes(query) || `l${lesson.id}` === query;

          isMatch = matchTitle || matchSubtitle || matchFocus || matchKeys || matchLevel || matchNum;
        }

        if (isMatch) {
          card.style.display = '';
          visibleInLevel++;
          totalVisibleLessons++;
        } else {
          card.style.display = 'none';
        }
      });

      if (visibleInLevel === 0) {
        levelCard.style.display = 'none';
      } else {
        levelCard.style.display = '';
      }
    });

    const statusEl = document.getElementById('roadmap-filter-status');
    if (statusEl) {
      if (totalVisibleLessons === 0) {
        statusEl.textContent = 'No lessons found matching your filters';
      } else if (stageFilter !== 'all' || query) {
        statusEl.textContent = `Showing ${totalVisibleLessons} of ${CURRICULUM.length} lessons`;
      } else {
        statusEl.textContent = `Showing all ${CURRICULUM.length} lessons across ${CURRICULUM_LEVELS.length} stages`;
      }
    }

    const emptyState = document.getElementById('roadmap-empty-state');
    if (emptyState) {
      emptyState.style.display = totalVisibleLessons === 0 ? 'flex' : 'none';
    }

    const clearBtn = document.getElementById('roadmap-search-clear');
    if (clearBtn) {
      clearBtn.style.display = query ? 'flex' : 'none';
    }
  }

  jumpToCurrentRoadmapLesson() {
    const state = store.getState();
    const currentLessonId = Math.min(CURRICULUM.length, Math.max(1, state.currentLesson || 1));
    const currentLessonObj = CURRICULUM.find(l => l.id === currentLessonId) || CURRICULUM[0];

    if (this.dashboardStageFilter !== 'all' && this.dashboardStageFilter !== String(currentLessonObj.level)) {
      this.dashboardStageFilter = 'all';
      const container = this.screens.dashboard;
      if (container) {
        container.querySelectorAll('.stage-tab').forEach(tab => {
          const isAll = tab.dataset.stage === 'all';
          tab.classList.toggle('active', isAll);
          tab.setAttribute('aria-selected', isAll ? 'true' : 'false');
        });
      }
    }

    if (this.dashboardSearchQuery) {
      this.dashboardSearchQuery = '';
      const input = document.getElementById('roadmap-search-input');
      if (input) input.value = '';
    }

    this.applyDashboardFilters();

    const targetCard = document.querySelector(`.lesson-node-card[data-lesson-id="${currentLessonId}"]`);
    if (targetCard) {
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetCard.classList.remove('node-highlight-pulse');
      void targetCard.offsetWidth;
      targetCard.classList.add('node-highlight-pulse');
      setTimeout(() => {
        targetCard.classList.remove('node-highlight-pulse');
      }, 1500);
      targetCard.focus?.();
    }
  }

  renderDashboard() {
    const container = this.screens.dashboard;
    if (!container) return;

    const state = store.getState();
    const currentLessonId = Math.min(CURRICULUM.length, Math.max(1, state.currentLesson || 1));
    const currentLessonObj = CURRICULUM.find(l => l.id === currentLessonId) || CURRICULUM[0];
    const dailyChallenge = StreakEngine.getDailyChallenge(store);
    const curriculumMastery = CURRICULUM.map(lesson => ({
      lesson,
      completion: state.lessonCompletion?.[lesson.id] || null,
      mastery: getLessonMastery(state.lessonCompletion?.[lesson.id], state.starsByLesson?.[lesson.id])
    }));
    const passedCount = curriculumMastery.filter(item => item.mastery.isPassed).length;
    const masteredCount = curriculumMastery.filter(item => item.mastery.isMastered).length;
    const roadmapProgressPct = Math.round((masteredCount / CURRICULUM.length) * 100);
    const currentLessonCompletion = state.lessonCompletion?.[currentLessonObj.id];
    const currentLessonMastery = getLessonMastery(currentLessonCompletion, state.starsByLesson?.[currentLessonObj.id]);
    const reviewQueue = getReviewQueue(CURRICULUM, state.lessonCompletion, state.starsByLesson);
    const nextReview = reviewQueue[0] || null;
    const placementTest = state.placementTest;

    // Adaptive Focus Coach 2.0 & fallback
    const coach2 = this.getAdaptiveFocusCoach2(state);
    const adaptiveFocus = AnalyticsEngine.getAdaptiveFocus({
      keyStats: state.keyStats,
      currentLesson: currentLessonObj,
      lessonCompletion: state.lessonCompletion
    });
    const adaptiveFocusKeys = coach2?.keys || adaptiveFocus.keys?.map(key => key === ' ' ? 'Space' : key.toUpperCase()) || [];

    // Quote of the Day
    const qotd = getQuoteOfTheDay();
    const qotdEstSec = estimateTypingTimeSec(qotd.text);

    // Goal Progress & Weekly Consistency
    const goalProgress = goalsManager.getGoalProgress(state);
    const weeklyData = this.getWeeklyConsistencyData(state);

    const ctaLabel = currentLessonMastery.isMastered
      ? 'Keep Sharp'
      : currentLessonMastery.isPassed
        ? 'Master This Lesson'
        : currentLessonMastery.isAttempted
          ? 'Resume Practice'
          : 'Start Lesson';

    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Hero Next Lesson Banner -->
        <div class="hero-lesson-card">
          <div class="hero-content">
            <div class="hero-badge-row">
              <span class="badge badge-accent">${escapeHtml(currentLessonObj.levelTitle)}</span>
              <span class="hero-lesson-number">Lesson ${currentLessonObj.id} of ${CURRICULUM.length}</span>
              ${currentLessonMastery.isMastered ? `
                <span class="hero-status-pill status-mastered">✦ Mastered (${currentLessonMastery.bestStars}/5 ★)</span>
              ` : currentLessonMastery.isAttempted ? `
                <span class="hero-status-pill status-attempted">↻ In Progress (${currentLessonMastery.bestStars}/5 ★)</span>
              ` : `
                <span class="hero-status-pill status-new">● Up Next</span>
              `}
            </div>
            <h2 class="hero-title">${escapeHtml(currentLessonObj.title)}</h2>
            <p class="hero-subtitle">${escapeHtml(currentLessonObj.subtitle)}</p>
            <p class="hero-focus"><span>Focus</span> ${escapeHtml(currentLessonObj.skillFocus)}</p>
            
            <div class="hero-metrics-strip">
              <div class="hero-targets-preview">
                <span class="target-pill">≥${currentLessonObj.accuracyTarget}% accuracy</span>
                <span class="target-pill">${currentLessonObj.wpmTarget} WPM target</span>
                <span class="target-pill">~${currentLessonObj.estimatedMinutes} min</span>
                ${currentLessonCompletion ? `
                  <span class="target-pill target-pill-best">🏆 Best: ${currentLessonCompletion.bestWpm || 0} WPM · ${currentLessonCompletion.bestAccuracy || 0}%</span>
                ` : ''}
              </div>
              ${!currentLessonObj.keys.includes('all') && currentLessonObj.keys.length > 0 ? `
                <div class="hero-keycaps-row" aria-label="Key targets">
                  <span class="hero-keycaps-label">Keys:</span>
                  <div class="hero-keycaps-list">
                    ${currentLessonObj.keys.map(k => `<kbd class="hero-kbd">${escapeHtml(k === ' ' ? '␣ Space' : k.toUpperCase())}</kbd>`).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="hero-action">
            <button id="hero-start-btn" class="btn btn-primary btn-hero">
              <span>${ctaLabel}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </button>
            <span class="hero-cta-hint">Press <kbd class="inline-kbd">Enter</kbd> to launch</span>
          </div>
        </div>

        <!-- Quick Practice Modes Hub -->
        <div class="quick-modes-hub" aria-label="Quick Practice Modes">
          <div class="quick-modes-title-row">
            <span class="quick-modes-label">QUICK MODES</span>
            <span class="quick-modes-sub">Jump straight into specialized training arenas</span>
          </div>
          <div class="quick-modes-grid">
            <button id="dashboard-speedtest-btn" class="quick-mode-card mode-speedtest" title="Benchmark Speed Test (15s, 30s, 60s, Passages)">
              <div class="quick-mode-icon-wrap"><span class="quick-mode-icon">⚡</span></div>
              <div class="quick-mode-meta">
                <span class="quick-mode-name">Speed Test</span>
                <span class="quick-mode-desc">15s, 30s, 60s benchmark</span>
              </div>
              <span class="quick-mode-tag">Benchmark</span>
            </button>

            <button id="dashboard-quotes-btn" class="quick-mode-card mode-quotes" title="Quote Vault (95 Curated Passages)">
              <div class="quick-mode-icon-wrap"><span class="quick-mode-icon">📜</span></div>
              <div class="quick-mode-meta">
                <span class="quick-mode-name">Quote Vault</span>
                <span class="quick-mode-desc">95 curated passages</span>
              </div>
              <span class="quick-mode-tag">Classic</span>
            </button>

            <button id="dashboard-code-btn" class="quick-mode-card mode-code" title="Code Arena (JavaScript, Python, Rust, Go)">
              <div class="quick-mode-icon-wrap"><span class="quick-mode-icon">💻</span></div>
              <div class="quick-mode-meta">
                <span class="quick-mode-name">Code Arena</span>
                <span class="quick-mode-desc">JS, Python, TS, Rust &amp; Go</span>
              </div>
              <span class="quick-mode-tag">Syntax</span>
            </button>

            <button id="dashboard-arcade-btn" class="quick-mode-card mode-arcade" title="Arcade Hub (Word Fall, Racer, Matrix)">
              <div class="quick-mode-icon-wrap"><span class="quick-mode-icon">🎮</span></div>
              <div class="quick-mode-meta">
                <span class="quick-mode-name">Arcade Hub</span>
                <span class="quick-mode-desc">Word Fall, Racer, Matrix</span>
              </div>
              <span class="quick-mode-tag">Games</span>
            </button>

            <button id="dashboard-weakness-btn" class="quick-mode-card mode-weakness" title="Keybr AI Conditioning">
              <div class="quick-mode-icon-wrap"><span class="quick-mode-icon">🎯</span></div>
              <div class="quick-mode-meta">
                <span class="quick-mode-name">Keybr AI Drill</span>
                <span class="quick-mode-desc">Target weakest keys</span>
              </div>
              <span class="quick-mode-tag">Adaptive</span>
            </button>

            <button id="dashboard-zen-btn" class="quick-mode-card mode-zen" title="Zen Focus Mode (Press Z)">
              <div class="quick-mode-icon-wrap"><span class="quick-mode-icon">🧘</span></div>
              <div class="quick-mode-meta">
                <span class="quick-mode-name">Zen Flow</span>
                <span class="quick-mode-desc">Distraction-free typing</span>
              </div>
              <span class="quick-mode-shortcut">Z</span>
            </button>
          </div>
        </div>

        <!-- Daily Goals & Weekly Habit Consistency Panel -->
        <div class="daily-activity-panel">
          <div class="daily-activity-header">
            <div class="daily-activity-title-group">
              <span class="panel-icon">🎯</span>
              <div>
                <h3 class="daily-activity-title">Daily Goals &amp; Activity</h3>
                <span class="daily-activity-subtitle">Track your typing volume, rings, and weekly consistency</span>
              </div>
            </div>
            <div class="daily-activity-actions">
              <div class="streak-status-badge">
                <span class="streak-flame">🔥</span>
                <span class="streak-count"><strong>${state.dailyStreak}</strong> day streak</span>
                <span class="streak-divider">·</span>
                <span class="streak-best">Best: ${state.bestStreak || state.dailyStreak || 0}d</span>
              </div>
              <button id="configure-goals-btn" class="btn btn-outline btn-sm">Configure Goals →</button>
            </div>
          </div>
          <div class="daily-activity-body">
            <div class="goals-rings-container">
              <div id="dashboard-goal-rings-container"></div>
            </div>
            <div class="consistency-column">
              <div class="weekly-consistency-widget">
                <div class="consistency-header">
                  <div class="consistency-title-group">
                    <span class="consistency-icon">📅</span>
                    <span class="consistency-title">Weekly Habit</span>
                  </div>
                  <span class="consistency-count-badge ${weeklyData.activeDaysCount >= 5 ? 'streak-strong' : ''}">${weeklyData.activeDaysCount}/7 Active Days</span>
                </div>
                <div class="consistency-days-row" role="group" aria-label="Last 7 days practice record">
                  ${weeklyData.days.map(d => `
                    <div class="consistency-day ${d.isToday ? 'is-today' : ''} ${d.isPracticed ? 'is-practiced' : 'is-missed'}" title="${d.dayName} (${d.dateKey}): ${d.isPracticed ? 'Practiced' : d.isToday ? 'Ready for today' : 'No practice recorded'}">
                      <span class="day-name">${d.dayName}</span>
                      <div class="day-bubble">${d.isPracticed ? '✓' : d.isToday ? '●' : '·'}</div>
                      <span class="day-num">${d.dayNum}</span>
                    </div>
                  `).join('')}
                </div>
                <p class="consistency-status-caption">
                  ${weeklyData.practicedToday 
                    ? '✓ Today\'s practice is logged! Your streak is secured.' 
                    : state.dailyStreak > 0 
                      ? `🔥 Practice any lesson or mode today to maintain your ${state.dailyStreak}-day streak!` 
                      : '⚡ Practice any lesson or mode today to kick off a new daily streak!'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Dashboard Widgets Grid -->
        <div class="dashboard-widgets-grid">
          <!-- Adaptive Focus Coach 2.0 / Recommended Drill Widget -->
          <div class="widget-card recommended-drill-widget">
            <div class="widget-header">
              <div class="widget-title-group">
                <span class="widget-icon">🎯</span>
                <h3 class="widget-title">${coach2 ? 'Recommended Drill' : 'Adaptive Focus'}</h3>
              </div>
              <span class="badge ${coach2 ? 'badge-amber' : 'badge-accent'}">${coach2 ? 'Coach 2.0' : 'Focus'}</span>
            </div>
            <div class="adaptive-focus-body">
              <span class="adaptive-focus-eyebrow">${coach2 ? 'Targeted Precision Drill' : escapeHtml(adaptiveFocus.eyebrow)}</span>
              <h4 class="adaptive-focus-title">${coach2 ? escapeHtml(coach2.title) : escapeHtml(adaptiveFocus.title)}</h4>
              <p class="drill-explanation">${coach2 ? escapeHtml(coach2.explanation) : escapeHtml(adaptiveFocus.message)}</p>
              ${adaptiveFocusKeys.length > 0 ? `
                <div class="adaptive-focus-keys" aria-label="Keys to practice">
                  ${adaptiveFocusKeys.map(key => `<span>${escapeHtml(key)}</span>`).join('')}
                </div>
              ` : ''}
              <span class="adaptive-focus-detail">${coach2 ? 'Custom 5-Minute Targeted Conditioning' : escapeHtml(adaptiveFocus.detail)}</span>
            </div>
            <div class="widget-footer">
              <button id="adaptive-focus-btn" class="btn btn-primary btn-sm">${coach2 ? 'Launch 5-Min Drill →' : escapeHtml(adaptiveFocus.actionLabel) + ' →'}</button>
            </div>
          </div>

          <!-- Quote of the Day Widget -->
          <div class="widget-card quote-of-day-widget">
            <div class="widget-header">
              <div class="widget-title-group">
                <span class="widget-icon">📜</span>
                <h3 class="widget-title">Quote of the Day</h3>
              </div>
              <span class="quote-category-badge quote-cat-${qotd.category}">${qotd.category}</span>
            </div>
            <blockquote class="quote-of-day-text">“${escapeHtml(qotd.text)}”</blockquote>
            <div class="quote-of-day-meta-row">
              <span class="quote-of-day-author">— ${escapeHtml(qotd.author)}${qotd.source ? `, <em>${escapeHtml(qotd.source)}</em>` : ''}</span>
              <span class="quote-of-day-estimate">⏱️ ~${qotdEstSec}s</span>
            </div>
            <div class="widget-footer quote-widget-footer">
              <button id="qotd-practice-btn" class="btn btn-secondary btn-sm">Practice Quote →</button>
              <div class="quote-secondary-actions">
                <button id="dashboard-qotd-zen-btn" class="btn btn-outline btn-sm" title="Practice in Zen Mode">
                  <span>🧘 Zen</span>
                </button>
                <button id="dashboard-qotd-speak-btn" class="btn btn-outline btn-sm quote-tool-btn" data-quote-id="${qotd.id}" data-action="listen" title="Listen with Text-to-Speech">
                  <span aria-hidden="true">${this.speakingQuoteId === qotd.id ? '⏹️' : '🔊'}</span>
                  <span>${this.speakingQuoteId === qotd.id ? 'Stop' : 'Listen'}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Daily Challenge Widget -->
          <div class="widget-card daily-challenge-widget ${dailyChallenge.isCompleted ? 'challenge-completed' : ''}">
            <div class="widget-header">
              <div class="widget-title-group">
                <span class="widget-icon">⚡</span>
                <h3 class="widget-title">Daily Challenge</h3>
              </div>
              <span class="badge badge-amber">+50 Bonus XP</span>
            </div>
            <p class="widget-desc">${escapeHtml(dailyChallenge.lesson.title)}</p>
            <div class="widget-footer">
              ${dailyChallenge.isCompleted ? `
                <span class="completed-tag">✓ Completed Today (${dailyChallenge.bestWpm} WPM)</span>
              ` : `
                <button id="daily-challenge-btn" class="btn btn-secondary btn-sm">Start Challenge</button>
              `}
            </div>
          </div>

          <!-- Quick Stats Performance Widget -->
          <div class="widget-card stats-overview-widget">
            <div class="widget-header">
              <div class="widget-title-group">
                <span class="widget-icon">📊</span>
                <h3 class="widget-title">Performance</h3>
              </div>
              <span class="badge badge-teal">${passedCount}/${CURRICULUM.length} Passed</span>
            </div>
            <div class="stats-mini-grid">
              <div class="stat-mini-item">
                <span class="stat-mini-val">${state.bestWpm || 0}</span>
                <span class="stat-mini-lbl">Best WPM</span>
              </div>
              <div class="stat-mini-item">
                <span class="stat-mini-val">${state.averageWpm || 0}</span>
                <span class="stat-mini-lbl">Avg WPM</span>
              </div>
              <div class="stat-mini-item">
                <span class="stat-mini-val">${masteredCount}</span>
                <span class="stat-mini-lbl">Mastered</span>
              </div>
              <div class="stat-mini-item">
                <span class="stat-mini-val">${state.dailyStreak} 🔥</span>
                <span class="stat-mini-lbl">Day Streak</span>
              </div>
            </div>
            <div class="widget-footer">
              <button id="dashboard-analytics-btn" class="btn btn-outline btn-sm" style="width: 100%; justify-content: center;">
                <span>Detailed Analytics &amp; Heatmap →</span>
              </button>
            </div>
          </div>

          <!-- Mastery Review Widget -->
          <div class="widget-card mastery-queue-widget ${nextReview ? 'has-review' : 'queue-clear'}">
            <div class="widget-header">
              <div class="widget-title-group">
                <span class="widget-icon">${nextReview ? '🧭' : '✨'}</span>
                <h3 class="widget-title">Mastery Queue</h3>
              </div>
              <span class="badge badge-accent">${masteredCount}/30</span>
            </div>
            ${nextReview ? `
              <div class="mastery-queue-body">
                <span class="mastery-queue-kicker">${nextReview.mastery.isPassed ? 'Polish for 4 stars' : 'Pass the core targets'}</span>
                <h4 class="mastery-queue-title">${escapeHtml(nextReview.lesson.title)}</h4>
                <p class="widget-desc">${escapeHtml(nextReview.completion?.nextGoal || `Build toward ${nextReview.lesson.accuracyTarget}% accuracy and ${nextReview.lesson.wpmTarget} WPM.`)}</p>
              </div>
              <div class="widget-footer">
                <button id="mastery-review-btn" class="btn btn-secondary btn-sm">Review Lesson ${nextReview.lesson.id} →</button>
              </div>
            ` : `
              <p class="widget-desc">Every lesson you have attempted is at 4 stars or higher. Keep your skills fresh with a daily challenge or skill check.</p>
            `}
          </div>

          <!-- Placement Skill Check Widget -->
          <div class="widget-card skill-check-widget">
            <div class="widget-header">
              <div class="widget-title-group">
                <span class="widget-icon">🗺️</span>
                <h3 class="widget-title">Skill Check</h3>
              </div>
              <span class="badge badge-amber">~3 min</span>
            </div>
            <p class="widget-desc">${placementTest
              ? `Last result: ${placementTest.wpm} WPM at ${placementTest.accuracy}% — recommended start: Lesson ${placementTest.lessonId}.`
              : 'Already type comfortably? Take a short diagnostic to unlock a better starting point without granting mastery credit.'}</p>
            <div class="widget-footer">
              <button id="placement-test-btn" class="btn btn-outline btn-sm">${placementTest ? 'Retake Skill Check' : 'Take Skill Check'}</button>
            </div>
          </div>
        </div>

        <!-- Curriculum Roadmap Section -->
        <div class="curriculum-roadmap-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Curriculum Roadmap</h2>
              <p class="section-subtitle">A guided 30-lesson path from first anchors to professional typing fluency</p>
            </div>
            <div class="roadmap-header-actions">
              <button id="roadmap-jump-current-btn" class="btn btn-secondary btn-sm" title="Jump to active lesson">
                <span class="jump-icon">⚡</span> Jump to Up Next (L${currentLessonId})
              </button>
              <div class="roadmap-overview">
                <strong>${masteredCount}/${CURRICULUM.length}</strong>
                <span>mastered</span>
                <div class="roadmap-overview-track"><span style="width: ${roadmapProgressPct}%"></span></div>
              </div>
            </div>
          </div>

          <!-- Roadmap Controls: Stage Filter Tabs & Search -->
          <div class="roadmap-controls-bar">
            <div class="roadmap-stage-tabs" role="tablist" aria-label="Curriculum Stages">
              <button class="stage-tab ${this.dashboardStageFilter === 'all' ? 'active' : ''}" data-stage="all" role="tab" aria-selected="${this.dashboardStageFilter === 'all'}">
                All Stages (30)
              </button>
              ${CURRICULUM_LEVELS.map(lvl => {
                const lvlLessons = CURRICULUM.filter(l => l.level === lvl.id);
                const isSelected = this.dashboardStageFilter === String(lvl.id);
                return `
                  <button class="stage-tab ${isSelected ? 'active' : ''}" data-stage="${lvl.id}" role="tab" aria-selected="${isSelected}">
                    Stage ${lvl.id}: ${escapeHtml(lvl.title)} (${lvlLessons.length})
                  </button>
                `;
              }).join('')}
            </div>

            <div class="roadmap-search-wrap">
              <span class="search-icon" aria-hidden="true">🔍</span>
              <input type="search" id="roadmap-search-input" class="roadmap-search-input" placeholder="Search lessons, skills, or keys (Press '/' to search)..." aria-label="Search curriculum lessons" value="${escapeHtml(this.dashboardSearchQuery || '')}" />
              <button id="roadmap-search-clear" class="search-clear-btn" aria-label="Clear search" style="${this.dashboardSearchQuery ? '' : 'display: none;'}">✕</button>
            </div>
          </div>

          <div id="roadmap-filter-status" class="roadmap-filter-status">
            Showing all ${CURRICULUM.length} lessons across ${CURRICULUM_LEVELS.length} stages
          </div>

          <div class="levels-container" id="roadmap-levels-container">
            ${CURRICULUM_LEVELS.map(level => {
              const levelLessons = CURRICULUM.filter(l => l.level === level.id);
              const levelMastered = levelLessons.filter(l => getLessonMastery(state.lessonCompletion?.[l.id], state.starsByLesson?.[l.id]).isMastered).length;
              const levelProgressPct = Math.round((levelMastered / levelLessons.length) * 100);
              const isCurrentLevel = currentLessonObj.level === level.id;
              const levelState = levelMastered === levelLessons.length
                ? 'level-complete'
                : isCurrentLevel
                  ? 'level-current'
                  : levelLessons.some(l => l.id <= currentLessonId)
                    ? 'level-available'
                    : 'level-locked';
              return `
                <div class="level-group-card ${levelState}" data-level="${level.id}">
                  <div class="level-group-header">
                    <div class="level-heading-wrap">
                      <span class="level-icon">${level.icon}</span>
                      <div>
                        <div class="level-kicker">Stage ${level.id} of ${CURRICULUM_LEVELS.length}</div>
                        <h3 class="level-group-title">${escapeHtml(level.title)}</h3>
                      </div>
                    </div>
                    <div class="level-progress-summary">
                      <strong>${levelMastered}/${levelLessons.length}</strong>
                      <span>${levelMastered === levelLessons.length ? 'Mastered' : 'Mastery'}</span>
                    </div>
                  </div>
                  <p class="level-group-description">${escapeHtml(level.description)}</p>
                  <div class="level-skill-row">
                    <span class="level-milestone">Milestone: ${escapeHtml(level.milestone)}</span>
                    <div class="level-skill-pills">${level.skills.map(skill => `<span>${escapeHtml(skill)}</span>`).join('')}</div>
                  </div>
                  <div class="level-progress-track"><span style="width: ${levelProgressPct}%"></span></div>
                  <div class="lessons-grid">
                    ${levelLessons.map(lesson => {
                      const completion = state.lessonCompletion?.[lesson.id];
                      const mastery = getLessonMastery(completion, state.starsByLesson?.[lesson.id]);
                      const isUnlocked = lesson.id <= currentLessonId || mastery.isAttempted;
                      const isCurrent = lesson.id === currentLessonId;
                      const stars = mastery.bestStars;
                      const statusLabel = mastery.isMastered
                        ? 'Mastered'
                        : mastery.isPassed
                          ? 'Needs mastery'
                          : mastery.isAttempted
                            ? 'Practice again'
                            : isCurrent
                              ? 'Up next'
                              : isUnlocked
                                ? 'Available'
                                : 'Locked';

                      return `
                        <div class="lesson-node-card ${isCurrent ? 'node-current' : ''} ${mastery.isMastered ? 'node-mastered' : ''} ${mastery.isAttempted && !mastery.isMastered ? 'node-needs-review' : ''} ${isUnlocked ? 'node-unlocked' : 'node-locked'}"
                             role="${isUnlocked ? 'button' : 'article'}"
                             tabindex="${isUnlocked ? '0' : '-1'}"
                             aria-label="Lesson ${lesson.id}: ${escapeHtml(lesson.title)}. ${statusLabel}."
                             data-lesson-id="${lesson.id}">
                          <div class="node-header">
                            <span class="node-num">${String(lesson.id).padStart(2, '0')}</span>
                            <span class="node-status">${mastery.isMastered ? '✦ Mastered' : mastery.isPassed ? '◐ Needs mastery' : mastery.isAttempted ? '↻ Practice again' : isCurrent ? '● Up next' : isUnlocked ? 'Available' : '🔒 Locked'}</span>
                            <div class="node-stars" aria-label="${stars} of 5 stars">
                              ${[1, 2, 3, 4, 5].map(star => `<span class="star-icon ${stars >= star ? 'star-filled' : ''}">★</span>`).join('')}
                            </div>
                          </div>
                          <h4 class="node-title">${escapeHtml(lesson.title)}</h4>
                          <p class="node-focus">${escapeHtml(lesson.skillFocus)}</p>
                          <div class="node-keys">
                            ${lesson.keys.includes('all') ? `
                              <span class="node-keys-all">Full keyboard</span>
                            ` : `
                              <div class="micro-keycaps-list">
                                ${lesson.keys.map(k => `<kbd class="micro-keycap">${escapeHtml(k === ' ' ? '␣' : k.toUpperCase())}</kbd>`).join('')}
                              </div>
                            `}
                          </div>
                          <div class="node-targets">
                            <span>≥${lesson.accuracyTarget}% acc</span>
                            <span>${lesson.wpmTarget} WPM</span>
                            <span>~${lesson.estimatedMinutes}m</span>
                          </div>
                          ${mastery.isAttempted && completion ? `<div class="node-best">Best ${completion.bestAccuracy || 0}% · ${completion.bestWpm || 0} WPM · ${stars}/5 ★</div>` : ''}
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')}

            <div id="roadmap-empty-state" class="roadmap-empty-state" style="display: none;">
              <span class="empty-icon" aria-hidden="true">🔍</span>
              <h4 class="empty-title">No lessons match your search</h4>
              <p class="empty-desc">We couldn't find any lessons matching your filters. Try searching for specific keys (e.g. 'e', 'r') or keywords (e.g. 'home row', 'speed').</p>
              <button id="roadmap-empty-reset-btn" class="btn btn-secondary btn-sm">Reset Filters</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Render Goal Progress Rings
    const goalRingsSlot = document.getElementById('dashboard-goal-rings-container');
    if (goalRingsSlot) {
      renderGoalRings(goalRingsSlot, goalProgress);
    }

    // Event listeners
    document.getElementById('configure-goals-btn')?.addEventListener('click', () => this.navigateTo('settings'));
    document.getElementById('dashboard-zen-btn')?.addEventListener('click', () => this.launchZenMode());
    document.getElementById('dashboard-weakness-btn')?.addEventListener('click', () => this.startWeaknessDrill());
    document.getElementById('dashboard-speedtest-btn')?.addEventListener('click', () => this.navigateTo('speedtest'));
    document.getElementById('dashboard-code-btn')?.addEventListener('click', () => this.navigateTo('code'));
    document.getElementById('dashboard-quotes-btn')?.addEventListener('click', () => this.navigateTo('quotes'));
    document.getElementById('dashboard-arcade-btn')?.addEventListener('click', () => this.navigateTo('arcade'));
    document.getElementById('dashboard-analytics-btn')?.addEventListener('click', () => this.navigateTo('profile'));
    document.getElementById('hero-start-btn')?.addEventListener('click', () => this.startLesson(currentLessonObj));
    document.getElementById('daily-challenge-btn')?.addEventListener('click', () => this.startLesson(dailyChallenge.lesson));
    document.getElementById('mastery-review-btn')?.addEventListener('click', () => {
      if (nextReview?.lesson) this.startLesson(nextReview.lesson);
    });
    document.getElementById('placement-test-btn')?.addEventListener('click', () => {
      this.startLesson(createPlacementLesson());
    });
    document.getElementById('qotd-practice-btn')?.addEventListener('click', () => {
      this.startQuotePractice(qotd);
    });
    document.getElementById('dashboard-qotd-zen-btn')?.addEventListener('click', () => {
      this.startQuotePractice(qotd, { zen: true });
    });
    document.getElementById('dashboard-qotd-speak-btn')?.addEventListener('click', () => {
      this.speakQuote(qotd.id, qotd.text);
    });
    document.getElementById('adaptive-focus-btn')?.addEventListener('click', () => {
      if (coach2?.lesson) {
        this.startLesson(coach2.lesson);
      } else if (adaptiveFocus.type === 'weak-keys') {
        this.startLesson(generateWeakKeysLesson(adaptiveFocus.keys));
      } else if (adaptiveFocus.type === 'weak-finger') {
        this.startLesson(generateWeakFingerLesson(adaptiveFocus.finger));
      } else if (adaptiveFocus.lesson) {
        this.startLesson(adaptiveFocus.lesson);
      } else {
        this.startLesson(currentLessonObj);
      }
    });

    // Roadmap interactions
    document.getElementById('roadmap-jump-current-btn')?.addEventListener('click', () => {
      this.jumpToCurrentRoadmapLesson();
    });

    // Stage tabs
    container.querySelectorAll('.stage-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const stage = tab.dataset.stage;
        this.dashboardStageFilter = stage;
        container.querySelectorAll('.stage-tab').forEach(t => {
          const isActive = t === tab;
          t.classList.toggle('active', isActive);
          t.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        this.applyDashboardFilters();
      });
    });

    // Search input
    const searchInput = document.getElementById('roadmap-search-input');
    const clearBtn = document.getElementById('roadmap-search-clear');
    searchInput?.addEventListener('input', e => {
      this.dashboardSearchQuery = e.target.value;
      this.applyDashboardFilters();
    });

    clearBtn?.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        this.dashboardSearchQuery = '';
        this.applyDashboardFilters();
        searchInput.focus();
      }
    });

    document.getElementById('roadmap-empty-reset-btn')?.addEventListener('click', () => {
      this.dashboardStageFilter = 'all';
      this.dashboardSearchQuery = '';
      if (searchInput) searchInput.value = '';
      container.querySelectorAll('.stage-tab').forEach(t => {
        const isAll = t.dataset.stage === 'all';
        t.classList.toggle('active', isAll);
        t.setAttribute('aria-selected', isAll ? 'true' : 'false');
      });
      this.applyDashboardFilters();
    });

    container.querySelectorAll('.lesson-node-card.node-unlocked').forEach(node => {
      const openLesson = () => {
        const id = parseInt(node.dataset.lessonId, 10);
        const lesson = CURRICULUM.find(l => l.id === id);
        if (lesson) this.startLesson(lesson);
      };

      node.addEventListener('click', openLesson);
      node.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openLesson();
        }
      });
    });

    // Apply any active filters
    this.applyDashboardFilters();
  }

  // ==========================================
  // CUSTOM ARENA SCREEN
  // ==========================================
  renderCustomArena() {
    const container = this.screens.custom;
    if (!container) return;

    container.innerHTML = `
      <div class="custom-arena-layout">
        <div class="custom-arena-header">
          <h2 class="custom-arena-title">Custom Practice & Code Studio</h2>
          <p class="custom-arena-subtitle">Paste articles, practice developer syntax, or test your speed in timed sprints</p>
        </div>

        <div class="arena-tab-bar">
          <button class="arena-tab-btn ${this.activeArenaTab === 'code' ? 'tab-active' : ''}" data-tab="code">
            <span>⚡ Developer Code Presets</span>
          </button>
          <button class="arena-tab-btn ${this.activeArenaTab === 'paste' ? 'tab-active' : ''}" data-tab="paste">
            <span>📝 Paste Custom Text</span>
          </button>
          <button class="arena-tab-btn ${this.activeArenaTab === 'sprint' ? 'tab-active' : ''}" data-tab="sprint">
            <span>⏱️ Timed Speed Sprints</span>
          </button>
          <button class="arena-tab-btn ${this.activeArenaTab === 'language' ? 'tab-active' : ''}" data-tab="language">
            <span>🌍 Multi-Language</span>
          </button>
        </div>

        <!-- 1. Code Presets Tab -->
        <div class="custom-sub-view ${this.activeArenaTab === 'code' ? 'sub-active' : ''}" id="arena-sub-code">
          <div class="code-presets-grid">
            ${CODE_PRESETS.map(preset => `
              <div class="code-preset-card" data-preset-id="${preset.id}">
                <div class="preset-header">
                  <div class="preset-title-group">
                    <span>${preset.icon}</span>
                    <h3 class="preset-title">${preset.title}</h3>
                  </div>
                  <span class="badge badge-accent">${preset.language}</span>
                </div>
                <div class="preset-code-snippet">${preset.code}</div>
                <button class="btn btn-secondary btn-sm">Practice Code →</button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 2. Paste Custom Text Tab -->
        <div class="custom-sub-view ${this.activeArenaTab === 'paste' ? 'sub-active' : ''}" id="arena-sub-paste">
          <div class="custom-editor-card">
            <textarea id="custom-paste-input" class="custom-textarea" placeholder="Paste your article, book excerpt, poetry, or code snippet here..."></textarea>
            <div class="editor-footer">
              <span id="custom-paste-count" class="editor-counter">0 characters</span>
              <button id="start-custom-paste-btn" class="btn btn-primary">Start Custom Lesson →</button>
            </div>
          </div>
        </div>

        <!-- 3. Timed Sprints Tab -->
        <div class="custom-sub-view ${this.activeArenaTab === 'sprint' ? 'sub-active' : ''}" id="arena-sub-sprint">
          <div class="sprints-grid">
            <div class="sprint-card" data-sprint="15">
              <span class="sprint-time">15s</span>
              <h3 class="sprint-title">Lightning Burst</h3>
              <p class="sprint-desc">Short explosive speed sprint</p>
              <button class="btn btn-secondary btn-sm">Start Sprint</button>
            </div>
            <div class="sprint-card" data-sprint="30">
              <span class="sprint-time">30s</span>
              <h3 class="sprint-title">Power Sprint</h3>
              <p class="sprint-desc">Standard velocity calibration</p>
              <button class="btn btn-secondary btn-sm">Start Sprint</button>
            </div>
            <div class="sprint-card" data-sprint="60">
              <span class="sprint-time">60s</span>
              <h3 class="sprint-title">1-Minute Standard</h3>
              <p class="sprint-desc">Official benchmark test</p>
              <button class="btn btn-secondary btn-sm">Start Sprint</button>
            </div>
            <div class="sprint-card" data-sprint="120">
              <span class="sprint-time">120s</span>
              <h3 class="sprint-title">Endurance Trial</h3>
              <p class="sprint-desc">Long stamina endurance run</p>
              <button class="btn btn-secondary btn-sm">Start Sprint</button>
            </div>
          </div>
        </div>

        <!-- 4. Multi-Language Tab -->
        <div class="custom-sub-view ${this.activeArenaTab === 'language' ? 'sub-active' : ''}" id="arena-sub-language">
          <div style="background: var(--surface-1); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
              <div>
                <h3 style="font-size: 18px; font-weight: 700; color: var(--text-primary);">Multi-Language Vocabulary Conditioning</h3>
                <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">Train muscle memory with 200 common words and 20 sentences in 6 major languages.</p>
              </div>
              <span class="badge badge-teal">👑 Premium Included</span>
            </div>

            <div class="lang-selector-grid">
              ${[
                { code: 'en', flag: '🇬🇧', name: 'English', native: 'English' },
                { code: 'es', flag: '🇪🇸', name: 'Spanish', native: 'Español' },
                { code: 'fr', flag: '🇫🇷', name: 'French', native: 'Français' },
                { code: 'de', flag: '🇩🇪', name: 'German', native: 'Deutsch' },
                { code: 'it', flag: '🇮🇹', name: 'Italian', native: 'Italiano' },
                { code: 'pt', flag: '🇵🇹', name: 'Portuguese', native: 'Português' }
              ].map(lang => {
                const isSelected = (store.getState().settings.practiceLanguage || 'en') === lang.code;
                return `
                  <div class="lang-option-card ${isSelected ? 'lang-active' : ''}" data-lang="${lang.code}">
                    <span class="lang-flag">${lang.flag}</span>
                    <span class="lang-name">${lang.name}</span>
                    <span class="lang-native">${lang.native}</span>
                  </div>
                `;
              }).join('')}
            </div>

            <div style="margin-top: 24px; display: flex; justify-content: flex-end;">
              <button id="start-lang-practice-btn" class="btn btn-primary btn-large">
                Start ${(MULTI_LANG_WORDS[store.getState().settings.practiceLanguage || 'en'] || MULTI_LANG_WORDS.en).name} Practice →
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Tab buttons
    container.querySelectorAll('.arena-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeArenaTab = btn.dataset.tab;
        this.renderCustomArena();
      });
    });

    // Code preset clicks
    container.querySelectorAll('.code-preset-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.presetId;
        const preset = CODE_PRESETS.find(p => p.id === id);
        if (preset) {
          const lesson = CustomPracticeManager.createLessonFromText(preset.title, preset.code, { isCode: true });
          this.startLesson(lesson);
        }
      });
    });

    // Textarea input
    const pasteInput = document.getElementById('custom-paste-input');
    const pasteCount = document.getElementById('custom-paste-count');
    if (pasteInput && pasteCount) {
      pasteInput.addEventListener('input', () => {
        pasteCount.textContent = `${pasteInput.value.length} characters`;
      });
    }

    document.getElementById('start-custom-paste-btn')?.addEventListener('click', () => {
      const val = pasteInput ? pasteInput.value.trim() : '';
      if (!val) {
        this.showToast('Please paste some text first!', 'amber');
        return;
      }
      const lesson = CustomPracticeManager.createLessonFromText('Custom Practice Passage', val);
      if (lesson) lesson.isCustom = true;
      this.startLesson(lesson);
    });

    // Sprint clicks
    container.querySelectorAll('.sprint-card').forEach(card => {
      card.addEventListener('click', () => {
        const seconds = parseInt(card.dataset.sprint, 10) || 60;
        const sprintLesson = CustomPracticeManager.createSprintLesson(seconds);
        this.startLesson(sprintLesson);
      });
    });

    // Language option clicks
    container.querySelectorAll('.lang-option-card').forEach(card => {
      card.addEventListener('click', () => {
        const lang = card.dataset.lang;
        store.update(prev => ({
          ...prev,
          settings: { ...prev.settings, practiceLanguage: lang }
        }));
        this.renderCustomArena();
      });
    });

    document.getElementById('start-lang-practice-btn')?.addEventListener('click', () => {
      const state = store.getState();
      const lang = state.settings.practiceLanguage || 'en';
      const langLesson = generateLanguagePractice(lang);
      this.startLesson(langLesson);
    });
  }

  startQuotePractice(quote, options = {}) {
    if (!quote) return;
    const lesson = CustomPracticeManager.createLessonFromText(`Quote: ${quote.author}`, quote.text);
    if (!lesson) return;
    lesson.id = `quote-${quote.id}`;
    lesson.quoteId = quote.id;
    lesson.quoteData = quote;
    lesson.category = quote.category;
    lesson.difficulty = quote.difficulty;
    lesson.isQuote = true;
    lesson.author = quote.author;
    lesson.source = quote.source || '';
    lesson.subtitle = `${quote.category ? quote.category.charAt(0).toUpperCase() + quote.category.slice(1) : 'Quote'} • ${quote.difficulty || 'standard'} length • ${quote.text.length} chars`;
    if (options.zen) {
      lesson.isZen = true;
      this.launchZenMode(lesson);
    } else {
      this.startLesson(lesson);
    }
  }

  startQuoteOfTheDayPractice(zen = false) {
    const qotd = getQuoteOfTheDay();
    this.startQuotePractice(qotd, { zen });
  }

  startRandomQuote(category = null, difficulty = null, excludeId = null) {
    const targetCat = category !== undefined ? category : this.activeQuoteCategory;
    const targetDiff = difficulty !== undefined ? difficulty : this.activeQuoteDifficulty;
    const state = store.getState();
    const practicedList = state.quotesPracticed || [];
    const bookmarkedList = state.quoteBookmarks || [];
    const quoteStatsMap = store.getAllQuoteStats();

    let pool = queryQuotes({
      category: targetCat,
      difficulty: targetDiff,
      search: this.activeQuoteSearch,
      status: this.activeQuoteStatus,
      sortBy: 'default',
      practicedIds: practicedList,
      bookmarkedIds: bookmarkedList,
      quoteStatsMap
    });

    if (pool.length === 0) {
      pool = getQuotesByFilter(targetCat, targetDiff);
    }
    if (pool.length === 0) {
      pool = QUOTE_VAULT;
    }

    if (excludeId !== null && pool.length > 1) {
      const withoutExcluded = pool.filter(q => q.id !== excludeId);
      if (withoutExcluded.length > 0) pool = withoutExcluded;
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    const quote = pool[randomIndex];
    if (quote) {
      this.startQuotePractice(quote);
    } else {
      this.showToast('No quotes found matching filter.', 'amber');
    }
  }

  speakQuote(quoteId, text) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.showToast('Text-to-speech audio is not supported in this browser.', 'amber');
      return;
    }

    if (this.speakingQuoteId === quoteId) {
      window.speechSynthesis.cancel();
      this.speakingQuoteId = null;
      this.updateSpeechButtons();
      return;
    }

    window.speechSynthesis.cancel();
    this.speakingQuoteId = quoteId;
    this.updateSpeechButtons();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      this.speakingQuoteId = null;
      this.updateSpeechButtons();
    };

    utterance.onerror = () => {
      this.speakingQuoteId = null;
      this.updateSpeechButtons();
    };

    window.speechSynthesis.speak(utterance);
  }

  updateSpeechButtons() {
    const container = this.screens.quotes;
    if (container) {
      container.querySelectorAll('.quote-tool-btn[data-action="listen"]').forEach(btn => {
        const qId = parseInt(btn.dataset.quoteId, 10);
        const isCurrent = this.speakingQuoteId === qId;
        btn.classList.toggle('is-speaking', isCurrent);
        btn.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
        btn.innerHTML = isCurrent
          ? '<span aria-hidden="true">⏹️</span> <span>Stop</span>'
          : '<span aria-hidden="true">🔊</span> <span>Listen</span>';
      });

      const qotdListenBtn = container.querySelector('#qotd-listen-btn');
      if (qotdListenBtn) {
        const qId = parseInt(qotdListenBtn.dataset.quoteId, 10);
        const isCurrent = this.speakingQuoteId === qId;
        qotdListenBtn.classList.toggle('is-speaking', isCurrent);
        qotdListenBtn.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
        qotdListenBtn.innerHTML = isCurrent
          ? '<span aria-hidden="true">⏹️</span> <span>Stop</span>'
          : '<span aria-hidden="true">🔊</span> <span>Listen</span>';
      }
    }

    const dashQotdBtn = document.getElementById('dashboard-qotd-speak-btn');
    if (dashQotdBtn) {
      const qId = parseInt(dashQotdBtn.dataset.quoteId, 10);
      const isCurrent = this.speakingQuoteId === qId;
      dashQotdBtn.classList.toggle('is-speaking', isCurrent);
      dashQotdBtn.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
      dashQotdBtn.innerHTML = isCurrent
        ? '<span aria-hidden="true">⏹️</span> <span>Stop</span>'
        : '<span aria-hidden="true">🔊</span> <span>Listen</span>';
    }
  }

  resetQuoteVaultFilters() {
    this.activeQuoteCategory = null;
    this.activeQuoteDifficulty = null;
    this.activeQuoteSearch = '';
    this.activeQuoteStatus = 'all';
    this.activeQuoteSort = 'default';
    this.renderQuoteVault();
  }

  openCustomPassageModal() {
    let overlay = document.getElementById('custom-passage-modal-overlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'custom-passage-modal-overlay';
    overlay.className = 'custom-quote-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'custom-passage-title');

    overlay.innerHTML = `
      <div class="custom-quote-modal-card">
        <div class="custom-quote-modal-header">
          <div>
            <h3 id="custom-passage-title" style="font-size: 19px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px;">✍️ Practice Custom Passage</h3>
            <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">Type or paste any classic excerpt, poem, or personal text to practice touch typing.</p>
          </div>
          <button id="custom-passage-close-btn" class="btn btn-secondary btn-sm" aria-label="Close modal" style="font-size: 15px; padding: 6px 12px;">✕</button>
        </div>

        <div class="custom-quote-field">
          <label for="custom-passage-text" class="custom-quote-label">Passage Text *</label>
          <textarea id="custom-passage-text" class="custom-quote-textarea" placeholder="Paste your favorite quote, poem, or classic literature passage here..." required></textarea>
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">
            <span id="custom-passage-counter">0 characters · 0 words</span>
            <span id="custom-passage-estimate">~0s at 40 WPM</span>
          </div>
        </div>

        <div class="custom-quote-meta-grid">
          <div class="custom-quote-field">
            <label for="custom-passage-author" class="custom-quote-label">Author Name</label>
            <input type="text" id="custom-passage-author" class="input-field" placeholder="e.g. Marcus Aurelius" style="padding: 9px 12px; font-size: 13.5px;" />
          </div>
          <div class="custom-quote-field">
            <label for="custom-passage-source" class="custom-quote-label">Source / Book Title</label>
            <input type="text" id="custom-passage-source" class="input-field" placeholder="e.g. Meditations" style="padding: 9px 12px; font-size: 13.5px;" />
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; padding-top: 14px; border-top: 1px solid var(--border-subtle); flex-wrap: wrap;">
          <button id="custom-passage-zen-btn" class="btn btn-secondary">
            <span>🧘 Practice in Zen Mode</span>
          </button>
          <button id="custom-passage-start-btn" class="btn btn-primary">
            <span>⚡ Start Typing Passage →</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const textarea = overlay.querySelector('#custom-passage-text');
    const authorInput = overlay.querySelector('#custom-passage-author');
    const sourceInput = overlay.querySelector('#custom-passage-source');
    const counterEl = overlay.querySelector('#custom-passage-counter');
    const estimateEl = overlay.querySelector('#custom-passage-estimate');

    textarea?.focus();

    textarea?.addEventListener('input', () => {
      const val = textarea.value.trim();
      const chars = val.length;
      const words = val ? val.split(/\s+/).length : 0;
      const sec = estimateTypingTimeSec(val, 40);
      counterEl.textContent = `${chars} characters · ${words} words`;
      estimateEl.textContent = `~${sec}s at 40 WPM`;
    });

    const closeModal = () => {
      overlay.remove();
    };

    overlay.querySelector('#custom-passage-close-btn')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    const handleStart = (isZen = false) => {
      const text = textarea.value.trim();
      if (!text) {
        this.showToast('Please enter or paste passage text first.', 'amber');
        textarea.focus();
        return;
      }
      const author = authorInput.value.trim() || 'Custom Author';
      const source = sourceInput.value.trim();
      closeModal();

      const customQuote = {
        id: Date.now(),
        text,
        author: source ? `${author}, ${source}` : author,
        source,
        category: 'literature',
        difficulty: text.length < 80 ? 'short' : text.length <= 200 ? 'medium' : 'long'
      };
      this.startQuotePractice(customQuote, { zen: isZen });
    };

    overlay.querySelector('#custom-passage-start-btn')?.addEventListener('click', () => handleStart(false));
    overlay.querySelector('#custom-passage-zen-btn')?.addEventListener('click', () => handleStart(true));
  }

  // ==========================================
  // QUOTE VAULT SCREEN
  // ==========================================
  renderQuoteVault() {
    const container = this.screens.quotes;
    if (!container) return;

    const state = store.getState();
    const practicedList = state.quotesPracticed || [];
    const bookmarkedList = state.quoteBookmarks || [];
    const quoteStatsMap = store.getAllQuoteStats();

    const practicedCount = practicedList.length;
    const totalQuotesCount = QUOTE_VAULT.length;
    const progressPercent = Math.min(100, Math.round((practicedCount / totalQuotesCount) * 100));

    let topQuoteWpm = 0;
    let totalAccuracySum = 0;
    let quoteAccCount = 0;
    let totalQuotePractices = 0;

    Object.values(quoteStatsMap).forEach(st => {
      totalQuotePractices += (st.count || 0);
      if (st.bestWpm > topQuoteWpm) topQuoteWpm = st.bestWpm;
      if (st.bestAccuracy > 0) {
        totalAccuracySum += st.bestAccuracy;
        quoteAccCount++;
      }
    });
    const avgQuoteAccuracy = quoteAccCount > 0 ? Math.round(totalAccuracySum / quoteAccCount) : 0;

    const qotd = getQuoteOfTheDay();
    const isQotdPracticed = practicedList.includes(qotd.id);
    const isQotdBookmarked = bookmarkedList.includes(qotd.id);
    const qotdStats = quoteStatsMap[qotd.id];
    const qotdEstSec = estimateTypingTimeSec(qotd.text);
    const qotdWordCount = qotd.text.trim().split(/\s+/).length;

    const todayDateStr = new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });

    const catCounts = {
      all: QUOTE_VAULT.length,
      motivation: QUOTE_VAULT.filter(q => q.category === 'motivation').length,
      literature: QUOTE_VAULT.filter(q => q.category === 'literature').length,
      programming: QUOTE_VAULT.filter(q => q.category === 'programming').length,
      science: QUOTE_VAULT.filter(q => q.category === 'science').length,
      philosophy: QUOTE_VAULT.filter(q => q.category === 'philosophy').length,
    };

    container.innerHTML = `
      <div class="quote-vault-layout">
        <!-- Header -->
        <div class="quote-vault-header">
          <div>
            <h2 class="section-title">Quote Vault &amp; Classic Passages</h2>
            <p class="section-subtitle">Practice touch typing with ${QUOTE_VAULT.length}+ timeless passages from literature, philosophy, science, and coding giants.</p>
          </div>
          <div class="quote-vault-header-actions">
            <button id="open-custom-passage-btn" class="btn btn-secondary" title="Import or type your own custom text, poem, or excerpt">
              <span>✍️ Custom Passage</span>
            </button>
            <button id="start-random-quote-btn" class="btn btn-primary" title="Start a random quote from current filter">
              <span>🎲 Practice Random Quote</span>
            </button>
          </div>
        </div>

        <!-- Quote of the Day Spotlight Hero -->
        <section class="quote-spotlight-card" aria-labelledby="qotd-spotlight-title">
          <div class="quote-spotlight-top">
            <div class="quote-spotlight-badge-group">
              <span class="quote-spotlight-tag" id="qotd-spotlight-title">
                <span aria-hidden="true">✨</span> Today's Spotlight
              </span>
              <span class="quote-category-badge quote-cat-${qotd.category}">${qotd.category}</span>
              <span class="quote-difficulty-dot">${qotd.difficulty} length</span>
              ${qotdStats?.bestWpm ? `
                <span class="quote-pb-pill">🏆 PB: ${qotdStats.bestWpm} WPM · ${qotdStats.bestAccuracy}%</span>
              ` : ''}
              ${isQotdPracticed ? `<span class="badge badge-teal">✓ Practiced</span>` : ''}
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="quote-spotlight-date">${todayDateStr}</span>
              <button class="quote-bookmark-btn ${isQotdBookmarked ? 'active' : ''}" id="qotd-bookmark-btn" data-quote-id="${qotd.id}" aria-label="Bookmark Quote of the Day" title="${isQotdBookmarked ? 'Remove Bookmark' : 'Add to Bookmarks'}">
                ${isQotdBookmarked ? '★' : '☆'}
              </button>
            </div>
          </div>

          <div class="quote-spotlight-body">
            <blockquote class="quote-spotlight-text">${escapeHtml(qotd.text)}</blockquote>
            <div class="quote-spotlight-meta-row">
              <div class="quote-spotlight-author-wrap">
                <span class="quote-spotlight-author">${escapeHtml(qotd.author)}</span>
                ${qotd.source ? `<span class="quote-spotlight-source">(${escapeHtml(qotd.source)})</span>` : ''}
              </div>
              <div class="quote-spotlight-metrics">
                <span>${qotdWordCount} words</span>
                <span>•</span>
                <span>${qotd.text.length} chars</span>
                <span>•</span>
                <span>~${qotdEstSec}s typing time</span>
              </div>
            </div>
          </div>

          <div class="quote-spotlight-actions">
            <div class="quote-spotlight-primary-actions">
              <button id="qotd-practice-btn" class="btn btn-primary">
                <span>⚡ ${isQotdPracticed ? 'Practice Again' : "Practice Today's Quote"} →</span>
              </button>
              <button id="qotd-zen-btn" class="btn btn-secondary">
                <span>🧘 Zen Mode</span>
              </button>
            </div>
            <div class="quote-spotlight-tool-actions">
              <button class="quote-tool-btn ${this.speakingQuoteId === qotd.id ? 'is-speaking' : ''}" id="qotd-listen-btn" data-quote-id="${qotd.id}" title="Listen (Read Aloud)">
                <span aria-hidden="true">${this.speakingQuoteId === qotd.id ? '⏹️' : '🔊'}</span>
                <span>${this.speakingQuoteId === qotd.id ? 'Stop' : 'Listen'}</span>
              </button>
              <button class="quote-tool-btn" id="qotd-copy-btn" data-quote-id="${qotd.id}" title="Copy Quote Text">
                <span aria-hidden="true">📋</span>
                <span>Copy</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Stats Overview Strip -->
        <div class="quote-stats-grid">
          <div class="quote-stat-card">
            <div class="quote-stat-header">
              <span>Vault Progress</span>
              <span style="color: var(--accent-primary); font-weight: 800;">${progressPercent}%</span>
            </div>
            <div class="quote-stat-value-row">
              <span class="quote-stat-val">${practicedCount}</span>
              <span class="quote-stat-sub">of ${totalQuotesCount} passages</span>
            </div>
            <div class="quote-progress-bar-wrap">
              <div class="quote-progress-bar-fill" style="width: ${progressPercent}%;"></div>
            </div>
          </div>

          <div class="quote-stat-card">
            <div class="quote-stat-header">
              <span>Top Speed</span>
              <span style="color: var(--success-teal);">⚡ Benchmark</span>
            </div>
            <div class="quote-stat-value-row">
              <span class="quote-stat-val">${topQuoteWpm > 0 ? topQuoteWpm : '—'}</span>
              <span class="quote-stat-sub">${topQuoteWpm > 0 ? 'WPM Peak' : 'No runs yet'}</span>
            </div>
          </div>

          <div class="quote-stat-card">
            <div class="quote-stat-header">
              <span>Average Precision</span>
              <span style="color: var(--reward-amber);">🎯 Accuracy</span>
            </div>
            <div class="quote-stat-value-row">
              <span class="quote-stat-val">${avgQuoteAccuracy > 0 ? avgQuoteAccuracy + '%' : '—'}</span>
              <span class="quote-stat-sub">${totalQuotePractices > 0 ? `${totalQuotePractices} total runs` : 'Benchmark target'}</span>
            </div>
          </div>

          <div class="quote-stat-card">
            <div class="quote-stat-header">
              <span>Saved Passages</span>
              <span style="color: var(--reward-amber);">⭐ Bookmarks</span>
            </div>
            <div class="quote-stat-value-row">
              <span class="quote-stat-val">${bookmarkedList.length}</span>
              <span class="quote-stat-sub">Favorites saved</span>
            </div>
          </div>
        </div>

        <!-- Filter, Search & Sort Toolbar -->
        <div class="quote-vault-controls" role="search" aria-label="Quote filtering and search">
          <!-- Top Row: Search input + Status filters + Sort dropdown -->
          <div class="quote-controls-top-row">
            <div class="quote-search-wrapper">
              <span class="quote-search-icon" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input
                type="search"
                id="quote-search-input"
                class="quote-search-input"
                placeholder="Search passages by author, work, or keyword... (Press /)"
                value="${escapeHtml(this.activeQuoteSearch || '')}"
                autocomplete="off"
                aria-label="Search passages by author, work, or keyword"
              />
              ${this.activeQuoteSearch ? `
                <button id="quote-search-clear-btn" class="quote-search-clear" aria-label="Clear search">✕</button>
              ` : `
                <kbd class="quote-search-kbd">/</kbd>
              `}
            </div>

            <!-- Status Filter Pills -->
            <div class="quote-filters" role="group" aria-label="Status filter">
              <button class="quote-filter-btn ${this.activeQuoteStatus === 'all' ? 'filter-active' : ''}" aria-pressed="${this.activeQuoteStatus === 'all'}" data-status="all">All</button>
              <button class="quote-filter-btn ${this.activeQuoteStatus === 'unpracticed' ? 'filter-active' : ''}" aria-pressed="${this.activeQuoteStatus === 'unpracticed'}" data-status="unpracticed">Unpracticed (${totalQuotesCount - practicedCount})</button>
              <button class="quote-filter-btn ${this.activeQuoteStatus === 'practiced' ? 'filter-active' : ''}" aria-pressed="${this.activeQuoteStatus === 'practiced'}" data-status="practiced">✓ Practiced (${practicedCount})</button>
              <button class="quote-filter-btn ${this.activeQuoteStatus === 'bookmarked' ? 'filter-active' : ''}" aria-pressed="${this.activeQuoteStatus === 'bookmarked'}" data-status="bookmarked">⭐ Saved (${bookmarkedList.length})</button>
            </div>

            <!-- Sort dropdown -->
            <select id="quote-sort-select" class="quote-sort-select" aria-label="Sort passages">
              <option value="default" ${this.activeQuoteSort === 'default' ? 'selected' : ''}>Sort: Curated</option>
              <option value="shortest" ${this.activeQuoteSort === 'shortest' ? 'selected' : ''}>Shortest First</option>
              <option value="longest" ${this.activeQuoteSort === 'longest' ? 'selected' : ''}>Longest First</option>
              <option value="author" ${this.activeQuoteSort === 'author' ? 'selected' : ''}>Author (A → Z)</option>
              <option value="wpm" ${this.activeQuoteSort === 'wpm' ? 'selected' : ''}>Highest Speed (PB)</option>
            </select>
          </div>

          <!-- Bottom Row: Categories and Lengths -->
          <div class="quote-controls-bottom-row">
            <div class="quote-filter-row">
              <span class="quote-filter-label">Category:</span>
              <div class="quote-filters" role="group" aria-label="Category filter">
                <button class="quote-filter-btn ${!this.activeQuoteCategory ? 'filter-active' : ''}" aria-pressed="${!this.activeQuoteCategory}" data-cat="all">All (${catCounts.all})</button>
                <button class="quote-filter-btn ${this.activeQuoteCategory === 'motivation' ? 'filter-active' : ''}" aria-pressed="${this.activeQuoteCategory === 'motivation'}" data-cat="motivation">⚡ Motivation (${catCounts.motivation})</button>
                <button class="quote-filter-btn ${this.activeQuoteCategory === 'literature' ? 'filter-active' : ''}" aria-pressed="${this.activeQuoteCategory === 'literature'}" data-cat="literature">📚 Literature (${catCounts.literature})</button>
                <button class="quote-filter-btn ${this.activeQuoteCategory === 'programming' ? 'filter-active' : ''}" aria-pressed="${this.activeQuoteCategory === 'programming'}" data-cat="programming">💻 Programming (${catCounts.programming})</button>
                <button class="quote-filter-btn ${this.activeQuoteCategory === 'science' ? 'filter-active' : ''}" aria-pressed="${this.activeQuoteCategory === 'science'}" data-cat="science">🔬 Science (${catCounts.science})</button>
                <button class="quote-filter-btn ${this.activeQuoteCategory === 'philosophy' ? 'filter-active' : ''}" aria-pressed="${this.activeQuoteCategory === 'philosophy'}" data-cat="philosophy">🏛️ Philosophy (${catCounts.philosophy})</button>
              </div>
            </div>

            <div class="quote-filter-row">
              <span class="quote-filter-label">Length:</span>
              <div class="quote-filters" role="group" aria-label="Length filter">
                <button class="quote-filter-btn ${!this.activeQuoteDifficulty ? 'filter-active' : ''}" aria-pressed="${!this.activeQuoteDifficulty}" data-diff="all">All Lengths</button>
                <button class="quote-filter-btn ${this.activeQuoteDifficulty === 'short' ? 'filter-active' : ''}" aria-pressed="${this.activeQuoteDifficulty === 'short'}" data-diff="short">⚡ Short (&lt;80)</button>
                <button class="quote-filter-btn ${this.activeQuoteDifficulty === 'medium' ? 'filter-active' : ''}" aria-pressed="${this.activeQuoteDifficulty === 'medium'}" data-diff="medium">📖 Medium (80-200)</button>
                <button class="quote-filter-btn ${this.activeQuoteDifficulty === 'long' ? 'filter-active' : ''}" aria-pressed="${this.activeQuoteDifficulty === 'long'}" data-diff="long">📜 Long (200+)</button>
              </div>
            </div>
          </div>

          <!-- Status Bar -->
          <div class="quote-results-status" id="quote-results-status" role="status" aria-live="polite">
          </div>
        </div>

        <!-- Quotes Grid Container -->
        <div class="quotes-grid" id="quotes-grid-container">
        </div>
      </div>
    `;

    this.attachQuoteVaultListeners(container);
    this.updateQuoteVaultGrid();
  }

  attachQuoteVaultListeners(container) {
    container.querySelector('#open-custom-passage-btn')?.addEventListener('click', () => {
      this.openCustomPassageModal();
    });

    container.querySelector('#start-random-quote-btn')?.addEventListener('click', () => {
      this.startRandomQuote();
    });

    const qotd = getQuoteOfTheDay();
    container.querySelector('#qotd-practice-btn')?.addEventListener('click', () => {
      this.startQuotePractice(qotd);
    });

    container.querySelector('#qotd-zen-btn')?.addEventListener('click', () => {
      this.startQuotePractice(qotd, { zen: true });
    });

    container.querySelector('#qotd-listen-btn')?.addEventListener('click', () => {
      this.speakQuote(qotd.id, qotd.text);
    });

    container.querySelector('#qotd-copy-btn')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(qotd.text);
      this.showToast('Quote copied to clipboard!', 'teal');
    });

    container.querySelector('#qotd-bookmark-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isBookmarked = store.toggleQuoteBookmark(qotd.id);
      const btn = container.querySelector('#qotd-bookmark-btn');
      if (btn) {
        btn.classList.toggle('active', isBookmarked);
        btn.textContent = isBookmarked ? '★' : '☆';
        btn.title = isBookmarked ? 'Remove Bookmark' : 'Add to Bookmarks';
      }
      this.showToast(isBookmarked ? 'Added to bookmarks!' : 'Removed from bookmarks.', 'amber');
      this.updateQuoteVaultGrid();
    });

    const searchInput = container.querySelector('#quote-search-input');
    const clearBtn = container.querySelector('#quote-search-clear-btn');

    searchInput?.addEventListener('input', (e) => {
      this.activeQuoteSearch = e.target.value;
      this.updateQuoteVaultGrid();
    });

    clearBtn?.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      this.activeQuoteSearch = '';
      this.updateQuoteVaultGrid();
    });

    container.querySelectorAll('[data-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('[data-status]').forEach(b => {
          b.classList.remove('filter-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('filter-active');
        btn.setAttribute('aria-pressed', 'true');
        this.activeQuoteStatus = btn.dataset.status;
        this.updateQuoteVaultGrid();
      });
    });

    container.querySelector('#quote-sort-select')?.addEventListener('change', (e) => {
      this.activeQuoteSort = e.target.value;
      this.updateQuoteVaultGrid();
    });

    container.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('[data-cat]').forEach(b => {
          b.classList.remove('filter-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('filter-active');
        btn.setAttribute('aria-pressed', 'true');
        const cat = btn.dataset.cat;
        this.activeQuoteCategory = cat === 'all' ? null : cat;
        this.updateQuoteVaultGrid();
      });
    });

    container.querySelectorAll('[data-diff]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('[data-diff]').forEach(b => {
          b.classList.remove('filter-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('filter-active');
        btn.setAttribute('aria-pressed', 'true');
        const diff = btn.dataset.diff;
        this.activeQuoteDifficulty = diff === 'all' ? null : diff;
        this.updateQuoteVaultGrid();
      });
    });
  }

  updateQuoteVaultGrid() {
    const gridContainer = document.getElementById('quotes-grid-container');
    const statusContainer = document.getElementById('quote-results-status');
    if (!gridContainer) return;

    const state = store.getState();
    const practicedList = state.quotesPracticed || [];
    const bookmarkedList = state.quoteBookmarks || [];
    const quoteStatsMap = store.getAllQuoteStats();

    const quotes = queryQuotes({
      category: this.activeQuoteCategory,
      difficulty: this.activeQuoteDifficulty,
      search: this.activeQuoteSearch,
      status: this.activeQuoteStatus,
      sortBy: this.activeQuoteSort,
      practicedIds: practicedList,
      bookmarkedIds: bookmarkedList,
      quoteStatsMap
    });

    const isFiltered = !!(
      this.activeQuoteCategory ||
      this.activeQuoteDifficulty ||
      this.activeQuoteSearch ||
      this.activeQuoteStatus !== 'all' ||
      this.activeQuoteSort !== 'default'
    );

    if (statusContainer) {
      statusContainer.innerHTML = `
        <span>Showing <strong>${quotes.length}</strong> of <strong>${QUOTE_VAULT.length}</strong> classic passages</span>
        ${isFiltered ? `
          <button id="reset-quote-filters-btn" class="btn btn-secondary btn-sm" style="padding: 3px 10px; font-size: 11.5px;">
            ✕ Reset Filters
          </button>
        ` : ''}
      `;
      statusContainer.querySelector('#reset-quote-filters-btn')?.addEventListener('click', () => {
        this.resetQuoteVaultFilters();
      });
    }

    if (quotes.length === 0) {
      gridContainer.innerHTML = `
        <div class="quote-empty-state">
          <span class="quote-empty-icon" aria-hidden="true">📜</span>
          <h3 class="quote-empty-title">No Matching Passages Found</h3>
          <p class="quote-empty-desc">
            ${this.activeQuoteSearch
              ? `No quotes found matching “${escapeHtml(this.activeQuoteSearch)}”. Try adjusting your search query, category, or length filters.`
              : 'No quotes match the selected filter criteria.'}
          </p>
          <button id="empty-reset-filters-btn" class="btn btn-primary btn-sm" style="margin-top: 6px;">
            <span>Reset All Filters</span>
          </button>
        </div>
      `;
      gridContainer.querySelector('#empty-reset-filters-btn')?.addEventListener('click', () => {
        this.resetQuoteVaultFilters();
      });
      return;
    }

    gridContainer.innerHTML = quotes.map(q => {
      const isPracticed = practicedList.includes(q.id);
      const isBookmarked = bookmarkedList.includes(q.id);
      const stats = quoteStatsMap[q.id];
      const estSec = estimateTypingTimeSec(q.text);
      const wordCount = q.text.trim().split(/\s+/).length;

      return `
        <div class="quote-card ${isPracticed ? 'quote-practiced' : ''} ${isBookmarked ? 'is-bookmarked' : ''}" data-quote-id="${q.id}">
          <div class="quote-card-top">
            <div class="quote-card-badges">
              <span class="quote-category-badge quote-cat-${q.category}">${q.category}</span>
              <span class="quote-difficulty-dot">${q.difficulty}</span>
              ${isPracticed ? `<span class="badge badge-teal" style="font-size: 10px; padding: 2px 6px;">✓</span>` : ''}
            </div>
            <div class="quote-card-header-actions">
              ${stats?.bestWpm ? `
                <span class="quote-pb-pill" title="Personal Best: ${stats.bestWpm} WPM with ${stats.bestAccuracy}% accuracy">
                  🏆 ${stats.bestWpm} WPM
                </span>
              ` : ''}
              <button class="quote-bookmark-btn ${isBookmarked ? 'active' : ''}" data-action="bookmark" data-quote-id="${q.id}" aria-label="Bookmark quote" title="${isBookmarked ? 'Remove Bookmark' : 'Add to Bookmarks'}">
                ${isBookmarked ? '★' : '☆'}
              </button>
            </div>
          </div>

          <blockquote class="quote-text">${escapeHtml(q.text)}</blockquote>

          <div class="quote-card-author-row">
            <span class="quote-author">${escapeHtml(q.author)}</span>
            ${q.source ? `<span class="quote-source">${escapeHtml(q.source)}</span>` : ''}
          </div>

          <div class="quote-card-footer">
            <span class="quote-card-meta">${wordCount} words · ${q.text.length} chars · ~${estSec}s</span>
            <div class="quote-card-btns">
              <button class="quote-tool-btn" data-action="zen" data-quote-id="${q.id}" title="Practice in Zen Mode" aria-label="Practice in Zen Mode">
                <span>🧘</span>
              </button>
              <button class="quote-tool-btn ${this.speakingQuoteId === q.id ? 'is-speaking' : ''}" data-action="listen" data-quote-id="${q.id}" title="Listen (Read Aloud)" aria-label="Listen">
                <span>${this.speakingQuoteId === q.id ? '⏹️' : '🔊'}</span>
              </button>
              <button class="quote-tool-btn" data-action="copy" data-quote-id="${q.id}" title="Copy Quote Text" aria-label="Copy Quote Text">
                <span>📋</span>
              </button>
              <button class="btn btn-secondary btn-sm start-quote-btn" data-quote-id="${q.id}">
                ${isPracticed ? '✓ Retype' : 'Type Quote →'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.attachQuoteCardListeners(gridContainer);
  }

  attachQuoteCardListeners(gridContainer) {
    gridContainer.querySelectorAll('.start-quote-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.quoteId, 10);
        const quote = QUOTE_VAULT.find(q => q.id === id);
        if (quote) {
          this.startQuotePractice(quote);
        }
      });
    });

    gridContainer.querySelectorAll('.quote-bookmark-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.quoteId, 10);
        const isBookmarked = store.toggleQuoteBookmark(id);
        btn.classList.toggle('active', isBookmarked);
        btn.textContent = isBookmarked ? '★' : '☆';
        btn.title = isBookmarked ? 'Remove Bookmark' : 'Add to Bookmarks';
        const card = btn.closest('.quote-card');
        card?.classList.toggle('is-bookmarked', isBookmarked);
        this.showToast(isBookmarked ? 'Added to bookmarks!' : 'Removed from bookmarks.', 'amber');
      });
    });

    gridContainer.querySelectorAll('.quote-tool-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.quoteId, 10);
        const quote = QUOTE_VAULT.find(q => q.id === id);
        if (!quote) return;

        const action = btn.dataset.action;
        if (action === 'zen') {
          this.startQuotePractice(quote, { zen: true });
        } else if (action === 'listen') {
          this.speakQuote(quote.id, quote.text);
        } else if (action === 'copy') {
          navigator.clipboard?.writeText(quote.text);
          this.showToast('Quote copied to clipboard!', 'teal');
        }
      });
    });

    gridContainer.querySelectorAll('.quote-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const id = parseInt(card.dataset.quoteId, 10);
        const quote = QUOTE_VAULT.find(q => q.id === id);
        if (quote) {
          this.startQuotePractice(quote);
        }
      });
    });
  }

  // ==========================================
  // DEVELOPER CODE ARENA SCREEN
  // ==========================================
  renderCodeArena() {
    const container = this.screens.code;
    if (!container) return;

    const state = store.getState();
    const currentLang = this.activeCodeLanguage || 'all';
    const snippets = getFilteredSnippets(currentLang);
    const practiced = state.codeSnippetsPracticed || [];

    container.innerHTML = `
      <div class="code-arena-container">
        <div class="code-arena-header">
          <div>
            <h2 class="section-title">Developer Code Arena</h2>
            <p class="section-subtitle">Real-world syntax typing across 8 programming languages with live formatting and brackets</p>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <span class="badge badge-accent">${practiced.length} Snippets Mastered</span>
            <button id="code-random-btn" class="btn btn-primary">
              <span>🎲 Practice Random Snippet</span>
            </button>
          </div>
        </div>

        <div class="code-lang-tabs">
          ${CODE_LANGUAGES.map(l => `
            <button class="code-lang-pill ${currentLang === l.id ? 'active' : ''}" data-code-lang="${l.id}">
              <span>${l.icon}</span>
              <span>${l.name}</span>
            </button>
          `).join('')}
        </div>

        <div class="code-grid">
          ${snippets.map(s => {
            const isPracticed = practiced.includes(s.id);
            const diffClass = s.difficulty === 'easy' ? 'badge-teal' : s.difficulty === 'medium' ? 'badge-amber' : 'badge-coral';
            return `
              <div class="code-card" data-snippet-id="${s.id}">
                <div>
                  <div class="code-card-header">
                    <span class="badge ${diffClass}" style="text-transform: uppercase;">${s.difficulty}</span>
                    <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">${s.language}</span>
                  </div>
                  <h3 class="code-card-title">${escapeHtml(s.title)}</h3>
                  <p class="code-card-desc">${escapeHtml(s.description)}</p>
                </div>
                <div class="code-preview-box">${escapeHtml(s.code)}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                  <span style="font-size: 11.5px; color: var(--text-muted);">${s.code.length} chars</span>
                  <button class="btn btn-secondary btn-sm start-snippet-btn" data-snippet-id="${s.id}">
                    ${isPracticed ? '✓ Practice Again' : 'Type Snippet →'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Filter clicks
    container.querySelectorAll('[data-code-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeCodeLanguage = btn.dataset.codeLang;
        this.renderCodeArena();
      });
    });

    // Random snippet click
    container.querySelector('#code-random-btn')?.addEventListener('click', () => {
      this.startRandomCodeSnippet(this.activeCodeLanguage);
    });

    // Snippet start clicks
    container.querySelectorAll('.start-snippet-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const snippet = CODE_SNIPPETS.find(s => s.id === btn.dataset.snippetId);
        if (snippet) this.startCodePractice(snippet);
      });
    });

    container.querySelectorAll('.code-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.start-snippet-btn')) return;
        const snippet = CODE_SNIPPETS.find(s => s.id === card.dataset.snippetId);
        if (snippet) this.startCodePractice(snippet);
      });
    });
  }

  startCodePractice(snippet) {
    if (!snippet) return;
    const lesson = {
      id: snippet.id,
      title: `💻 ${snippet.title}`,
      subtitle: `${snippet.language.toUpperCase()} • ${snippet.difficulty.toUpperCase()} • ${snippet.code.length} characters`,
      skillFocus: `Syntax fidelity and special character fluidity: ${snippet.title}`,
      targetWpm: 40,
      accuracyTarget: 95,
      estimatedMinutes: 2,
      rounds: [snippet.code],
      isCodeLesson: true,
      snippetData: snippet,
      snippetId: snippet.id
    };
    this.startLesson(lesson);
  }

  startRandomCodeSnippet(lang = 'all') {
    const snippet = getRandomCodeSnippet(lang);
    if (snippet) {
      this.startCodePractice(snippet);
    }
  }

  // ==========================================
  // BENCHMARK SPEED TEST SCREEN
  // ==========================================
  renderSpeedTest() {
    const container = this.screens.speedtest;
    if (!container) return;

    const state = store.getState();
    const bests = state.speedTestBests || {};
    const activePresetId = this.activeSpeedPresetId || '60s';
    const selectedPreset = SPEED_TEST_PRESETS.find(p => p.id === activePresetId) || SPEED_TEST_PRESETS[2];
    const selectedRecord = bests[selectedPreset.id];
    const completedCount = SPEED_TEST_PRESETS.filter(p => bests[p.id]).length;
    const safeNumber = value => Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;
    const formatRecordDate = value => {
      const date = value ? new Date(value) : null;
      return date && !Number.isNaN(date.valueOf())
        ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : '—';
    };
    const selectedFormat = selectedPreset.type === 'time'
      ? `${selectedPreset.value}-second timed test`
      : `${selectedPreset.value}-word completion test`;
    const selectedGoal = selectedPreset.type === 'time'
      ? '⌨️ Timer starts on first key'
      : `⌨️ Finish after ${selectedPreset.value} words`;

    container.innerHTML = `
      <div class="speedtest-container">
        <header class="speedtest-header">
          <div>
            <p class="speedtest-eyebrow">Typing benchmark arena</p>
            <h2 class="section-title">Benchmark Speed Tests</h2>
            <p class="section-subtitle">Measure speed, accuracy, and pace consistency with the same high-frequency word pool every time.</p>
          </div>
          <div class="speedtest-completion" aria-label="${completedCount} of ${SPEED_TEST_PRESETS.length} personal records">
            <strong>${completedCount}</strong>
            <span>of ${SPEED_TEST_PRESETS.length}<br>records set</span>
          </div>
        </header>

        <div class="speedtest-presets-bar" role="group" aria-label="Choose a benchmark test">
          <div class="speedtest-preset-group">
            <span class="speedtest-group-label">Timed</span>
            ${SPEED_TEST_PRESETS.filter(p => p.type === 'time').map(p => `
              <button class="speedtest-pill ${activePresetId === p.id ? 'active' : ''}" data-speed-preset="${p.id}" aria-pressed="${activePresetId === p.id}">
                <span aria-hidden="true">${p.icon}</span>
                <span>${p.label}</span>
              </button>
            `).join('')}
          </div>
          <div class="speedtest-divider" aria-hidden="true"></div>
          <div class="speedtest-preset-group">
            <span class="speedtest-group-label">Words</span>
            ${SPEED_TEST_PRESETS.filter(p => p.type === 'words').map(p => `
              <button class="speedtest-pill ${activePresetId === p.id ? 'active' : ''}" data-speed-preset="${p.id}" aria-pressed="${activePresetId === p.id}">
                <span aria-hidden="true">${p.icon}</span>
                <span>${p.label}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <section class="speedtest-launch-card" aria-labelledby="speedtest-selected-title">
          <div class="speedtest-launch-icon" aria-hidden="true">${selectedPreset.icon}</div>
          <div class="speedtest-launch-main">
            <p class="speedtest-eyebrow">Selected benchmark</p>
            <h3 id="speedtest-selected-title">${selectedPreset.label}</h3>
            <p>${selectedPreset.desc}. ${selectedFormat}.</p>
            <div class="speedtest-rule-list" aria-label="Test details">
              <span>${selectedGoal}</span>
              <span>◎ High-frequency English words</span>
              <span>↗ Results include consistency</span>
            </div>
          </div>
          <div class="speedtest-launch-record">
            ${selectedRecord ? `
              <span class="speedtest-record-label">Personal best</span>
              <strong>${safeNumber(selectedRecord.wpm)} <small>WPM</small></strong>
              <span>${safeNumber(selectedRecord.accuracy)}% accuracy · ${safeNumber(selectedRecord.consistency || 100)}% consistent</span>
            ` : `
              <span class="speedtest-record-label">First attempt</span>
              <strong>Set your baseline</strong>
              <span>Your result is saved automatically.</span>
            `}
          </div>
          <button id="speedtest-launch-btn" class="btn btn-primary btn-large speedtest-start-btn">
            <span>Start ${selectedPreset.label}</span>
            <span aria-hidden="true">→</span>
          </button>
        </section>

        <section class="speedtest-records" aria-labelledby="speedtest-records-title">
          <div class="speedtest-section-heading">
            <div>
              <p class="speedtest-eyebrow">Your history</p>
              <h3 id="speedtest-records-title">Personal benchmark records</h3>
            </div>
            <span>${completedCount ? `${completedCount} benchmark${completedCount === 1 ? '' : 's'} recorded` : 'Complete a test to set a record'}</span>
          </div>
          <div class="speedtest-bests-grid">
            ${SPEED_TEST_PRESETS.map(p => {
              const record = bests[p.id];
              return `
                <article class="speedtest-best-card ${record ? 'has-record' : ''} ${activePresetId === p.id ? 'is-selected' : ''}">
                  <div class="speedtest-card-topline">
                    <span>${p.icon} ${p.label}</span>
                    <span>${p.type === 'time' ? `${p.value}s` : `${p.value} words`}</span>
                  </div>
                  ${record ? `
                    <div class="speedtest-card-wpm">
                      ${safeNumber(record.wpm)} <span>WPM</span>
                    </div>
                    <div class="speedtest-card-metrics">
                      <span><strong>${safeNumber(record.accuracy)}%</strong> accuracy</span>
                      <span><strong>${safeNumber(record.consistency || 100)}%</strong> steady</span>
                    </div>
                    <time datetime="${record.date || ''}">Best set ${formatRecordDate(record.date)}</time>
                  ` : `
                    <p class="speedtest-card-empty">No benchmark yet</p>
                    <button class="btn btn-secondary btn-sm quick-start-speed-btn" data-speed-preset="${p.id}">Start trial <span aria-hidden="true">→</span></button>
                  `}
                </article>
              `;
            }).join('')}
          </div>
        </section>
      </div>
    `;

    container.querySelectorAll('[data-speed-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeSpeedPresetId = btn.dataset.speedPreset;
        this.renderSpeedTest();
      });
    });

    container.querySelector('#speedtest-launch-btn')?.addEventListener('click', () => {
      this.startSpeedTest(this.activeSpeedPresetId || '60s');
    });

    container.querySelectorAll('.quick-start-speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.startSpeedTest(btn.dataset.speedPreset);
      });
    });
  }

  startSpeedTest(presetId = '60s') {
    const lesson = generateSpeedTestLesson(presetId);
    this.startLesson(lesson);
  }

  startWeaknessDrill() {
    const state = store.getState();
    const drill = generateWeaknessDrill(state.keyStats || {});
    this.showToast(`🎯 Keybr AI Drill Generated: Targets [ ${drill.targetKeys.join(', ').toUpperCase()} ]`, 'accent');
    this.startLesson(drill);
  }

  startMissedWordsDrill(mistypedWords = []) {
    const drill = generateMissedWordsDrill(mistypedWords);
    this.showToast(`🔁 Missed Words Reinforcement: ${drill.mistypedWords.length} words`, 'amber');
    this.startLesson(drill);
  }

  openCommandPalette() {
    if (this.commandPalette) {
      this.commandPalette.open();
    }
  }

  openCertificateModal(initialName = null) {
    const state = store.getState();
    let currentName = initialName || state.certificateName || 'Touch Typist';
    const modalContainer = document.getElementById('certificate-modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div id="cert-modal-overlay" class="cert-modal-overlay">
        <div class="cert-modal-card">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <h2 style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px;">🏆 Verified Touch Typing Certificate</h2>
              <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">Official high-resolution print-ready diploma of touch typing proficiency</p>
            </div>
            <button id="cert-close-btn" class="btn btn-secondary btn-sm" style="font-size: 16px; padding: 6px 12px;">✕</button>
          </div>

          <div style="display: flex; align-items: center; gap: 12px; background: var(--surface-2); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 16px;">
            <label for="cert-name-input" style="font-size: 13px; font-weight: 700; color: var(--text-primary); white-space: nowrap;">Recipient Name:</label>
            <input type="text" id="cert-name-input" class="input-field" value="${escapeHtml(currentName)}" style="flex: 1; padding: 8px 12px; font-size: 14px;" />
          </div>

          <canvas id="cert-canvas" class="cert-canvas-preview"></canvas>

          <div class="cert-controls-row">
            <span style="font-size: 12px; color: var(--text-muted);">Format: 2400 × 1600 px • 300 DPI Luxury Print Edition</span>
            <div style="display: flex; gap: 10px;">
              <button id="cert-download-btn" class="btn btn-primary">
                <span>📥 Download High-Res PNG</span>
              </button>
              <button id="cert-print-btn" class="btn btn-secondary">
                <span>🖨️ Print Certificate</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = modalContainer.querySelector('#cert-canvas');
    const nameInput = modalContainer.querySelector('#cert-name-input');
    const closeBtn = modalContainer.querySelector('#cert-close-btn');
    const downloadBtn = modalContainer.querySelector('#cert-download-btn');
    const printBtn = modalContainer.querySelector('#cert-print-btn');
    const overlay = modalContainer.querySelector('#cert-modal-overlay');

    const updateCanvas = () => {
      const bestWpm = Math.max(state.bestWpm || 65, 30);
      const bestAcc = Math.max(state.bestAccuracy || 98, 90);
      drawCertificate(canvas, {
        name: currentName,
        wpm: bestWpm,
        accuracy: bestAcc,
        totalKeystrokes: state.totalKeystrokes || 15000
      });
    };

    updateCanvas();

    nameInput.addEventListener('input', (e) => {
      currentName = e.target.value.trim() || 'Touch Typist';
      store.update(prev => ({ ...prev, certificateName: currentName }));
      updateCanvas();
    });

    const closeModal = () => {
      modalContainer.innerHTML = '';
    };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    downloadBtn.addEventListener('click', () => {
      downloadCertificatePng(canvas, currentName);
      this.showToast('📥 Certificate PNG downloaded!', 'teal');
    });

    printBtn.addEventListener('click', () => {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>Certificate - ${escapeHtml(currentName)}</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; background: #000; height: 100vh; }
                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              </style>
            </head>
            <body>
              <img src="${canvas.toDataURL('image/png')}" onload="window.print();" />
            </body>
          </html>
        `);
        win.document.close();
      }
    });
  }

  // ==========================================
  // LESSON SCREEN & RACING HUD
  // ==========================================
  startLesson(lessonData) {
    this.currentLessonData = lessonData;
    goalsManager.setPracticeActive(true);
    this.typingViewportState = {
      text: null,
      currentIndex: null,
      windowStart: 0
    };
    this.navigateTo('lesson');

    const state = store.getState();

    // Initialize unified Keyboard and Hand Overlay Stage
    if (!this.handRenderer && this.keyboardContainer) {
      this.handRenderer = new HandRenderer(this.keyboardContainer);
      const kbSlot = document.getElementById('mech-kb-slot') || this.keyboardContainer;
      this.keyboardRenderer = new KeyboardRenderer(kbSlot, {
        interactive: true,
        layoutId: state.settings.layout || 'qwerty',
        blindMode: state.settings.blindMode,
        onKeyClick: (char, code, eventData = {}) => {
          if (typingEngine.isActive) {
            typingEngine.handleKeyDown({
              key: char,
              code,
              shiftKey: !!eventData.shiftKey,
              preventDefault: () => {}
            });
          }
        }
      });
      this.handRenderer.setKeyboardRenderer(this.keyboardRenderer);
    } else {
      if (this.keyboardRenderer) {
        this.keyboardRenderer.setLayout(state.settings.layout || 'qwerty');
        this.keyboardRenderer.setBlindMode(state.settings.blindMode);
        this.keyboardRenderer.clearHeatmap();
      }
      if (this.handRenderer) {
        this.handRenderer.clear();
      }
    }

    // Toggle Blind Mode visual blur
    document.body.classList.toggle('blind-mode-active', !!state.settings.blindMode);

    // Initialize Ghost Racer
    const totalChars = lessonData.rounds.reduce((s, r) => s + r.length, 0);
    const existingCompletion = state.lessonCompletion?.[lessonData.id];
    ghostRacer.startRace({
      totalChars,
      mode: state.settings.ghostMode || 'bot',
      botWpm: state.settings.botWpm || 50,
      bestRun: existingCompletion?.bestRun || null
    });

    // Show/hide Race track
    if (this.raceTrackContainer) {
      this.raceTrackContainer.style.display = state.settings.ghostMode === 'off' ? 'none' : 'flex';
    }

    typingEngine.startLesson(lessonData);
  }

  handleTypingEngineState(data) {
    if (this.lessonTitleEl) {
      this.lessonTitleEl.textContent = data.lesson.title;
      this.lessonTitleEl.title = data.lesson.title || '';
    }
    if (this.lessonRoundEl) {
      const roundLabel = data.lesson.roundLabels?.[data.roundIdx] || `Round ${data.roundIdx + 1}`;
      if (data.timeRemainingSec !== null && data.timeRemainingSec !== undefined) {
        this.lessonRoundEl.textContent = `${roundLabel} · ⏱️ ${data.timeRemainingSec}s left`;
      } else {
        this.lessonRoundEl.textContent = `${roundLabel} · Round ${data.roundIdx + 1} of ${data.totalRounds}`;
      }
    }
    if (this.lessonProgressFill) this.lessonProgressFill.style.width = `${data.progressPct}%`;
    if (this.hudWpmEl) this.hudWpmEl.textContent = data.wpm;
    if (this.hudAccuracyEl) this.hudAccuracyEl.textContent = `${data.accuracy}%`;

    if (this.hudComboEl && this.hudComboWrapper) {
      this.hudComboEl.textContent = `${data.combo}`;
      this.hudComboWrapper.classList.toggle('combo-hot', data.combo >= 25);
      this.hudComboWrapper.classList.toggle('combo-superhot', data.combo >= 50);
    }

    // Ghost Racer Telemetry
    const raceStatus = ghostRacer.update(data.progressPct, !!data.startTime);
    if (raceStatus.isEnabled) {
      if (this.raceUserMarker) this.raceUserMarker.style.left = `${raceStatus.userPct}%`;
      if (this.raceCompetitorMarker) this.raceCompetitorMarker.style.left = `${raceStatus.competitorPct}%`;
      if (this.raceCompetitorAvatar) this.raceCompetitorAvatar.textContent = raceStatus.competitorAvatar;
      if (this.raceCompetitorName) this.raceCompetitorName.textContent = raceStatus.competitorName;

      if (this.raceDeltaChip) {
        this.raceDeltaChip.className = `race-delta-chip ${raceStatus.leadStatus}`;
        if (raceStatus.leadStatus === 'leading') {
          this.raceDeltaChip.textContent = `+${Math.abs(raceStatus.deltaPct)}% Ahead`;
        } else if (raceStatus.leadStatus === 'trailing') {
          this.raceDeltaChip.textContent = `-${Math.abs(raceStatus.deltaPct)}% Behind`;
        } else {
          this.raceDeltaChip.textContent = `Neck & Neck`;
        }
      }
    }

    if (this.hudCorrectionBadge) {
      this.hudCorrectionBadge.style.display = data.wordCorrectionMode ? 'inline-flex' : 'none';
    }

    this.renderTypingText(
      data.currentText,
      data.charIndex,
      data.charStates,
      data.mistypedCharIndices,
      data.charToWord,
      data.wordCorrectionMode
    );

    if (this.keyboardRenderer) {
      this.keyboardRenderer.highlightTarget(data.expectedChar, data.shiftNeeded);
    }
    if (this.handRenderer) {
      this.handRenderer.highlightFinger(
        data.targetFinger ? data.targetFinger.id : null,
        data.expectedChar,
        data.shiftNeeded
      );
    }
  }

  renderTypingText(text, currentIndex, charStates = [], mistypedCharIndices = new Set(), charToWord = [], wordCorrectionMode = false) {
    if (!text) {
      if (this.typingTextDisplay) {
        this.typingTextDisplay.classList.remove('typing-window-animate');
        this.typingTextDisplay.style.setProperty('--typing-window-translate', '0px');
        this.typingTextDisplay.innerHTML = '';
      }
      this.typingViewportState = { text: null, currentIndex: null, windowStart: 0 };
      if (zenMode.isActive) zenMode.renderText('');
      return;
    }

    let html = '';
    let currentWordHtml = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const isSpace = char === ' ';
      const isNewline = char === '\n';
      const isTab = char === '\t';
      const displayChar = isSpace ? '&nbsp;' : isTab ? '&nbsp;&nbsp;&nbsp;&nbsp;' : isNewline ? '↵' : escapeHtml(char);
      const isCharMistyped = mistypedCharIndices && mistypedCharIndices.has(i);
      const stateObj = charStates ? charStates[i] : null;
      const spaceClass = (isSpace || isTab || isNewline) ? ' char-space' : '';
      const charIndexAttribute = `data-char-index="${i}"`;

      let charSpan = '';
      if (i < currentIndex) {
        if (stateObj && stateObj.status === 'incorrect') {
          charSpan = `<span class="char-token char-incorrect${spaceClass}" ${charIndexAttribute} data-expected="${escapeHtml(char)}" title="Mistyped: '${stateObj.typed}' (expected '${char}')">${displayChar}</span>`;
        } else if (isCharMistyped) {
          charSpan = `<span class="char-token char-word-error${spaceClass}" ${charIndexAttribute} title="Corrected character">${displayChar}</span>`;
        } else {
          charSpan = `<span class="char-token char-correct${spaceClass}" ${charIndexAttribute}>${displayChar}</span>`;
        }
      } else if (i === currentIndex) {
        charSpan = `<span class="char-token char-current${spaceClass}" ${charIndexAttribute}><span class="char-caret"></span>${displayChar}</span>`;
      } else {
        charSpan = `<span class="char-token char-upcoming${spaceClass}" ${charIndexAttribute}>${displayChar}</span>`;
      }

      if (isNewline) {
        if (currentWordHtml) {
          html += `<span class="word-token">${currentWordHtml}</span>`;
          currentWordHtml = '';
        }
        html += `<span class="word-token char-newline-token">${charSpan}</span><br>`;
      } else if (isSpace) {
        currentWordHtml += charSpan;
        html += `<span class="word-token">${currentWordHtml}</span>`;
        currentWordHtml = '';
      } else {
        currentWordHtml += charSpan;
      }
    }

    if (currentWordHtml) {
      html += `<span class="word-token">${currentWordHtml}</span>`;
    }

    if (this.typingTextDisplay) {
      this.typingTextDisplay.innerHTML = html;
      this.updateTypingViewport(text, currentIndex);
    }

    if (zenMode.isActive) {
      zenMode.renderText(html, {
        wpm: typingEngine.wpm || 0,
        accuracy: typingEngine.accuracy !== undefined ? typingEngine.accuracy : 100,
        progressPct: typingEngine.progressPct || 0,
        combo: typingEngine.combo || 0,
        title: this.currentLessonData?.title,
        author: this.currentLessonData?.author
      });
    }
  }

  /**
   * Keep the active character inside a three-line window. The offset is
   * intentionally based on the caret's actual rendered line instead of a
   * character-count guess, so it remains correct at every viewport width and
   * font size. It only animates when typing crosses the window boundary.
   */
  updateTypingViewport(text, currentIndex) {
    const display = this.typingTextDisplay;
    if (!display) return;

    const boundedIndex = Math.min(Math.max(Number(currentIndex) || 0, 0), Math.max(0, text.length - 1));
    const target = display.querySelector(`[data-char-index="${boundedIndex}"]`) || display.querySelector('[data-char-index]');
    if (!target) return;

    const computedStyle = window.getComputedStyle(display);
    const lineHeight = parseFloat(computedStyle.lineHeight) || (parseFloat(computedStyle.fontSize) * 1.6) || 24;
    const displayRect = display.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const currentLine = Math.max(0, Math.round((targetRect.top - displayRect.top) / lineHeight));
    // Keep the active line in the middle of the three-line window once it
    // reaches the lower half. The first two lines establish the viewport;
    // entering line three scrolls immediately instead of letting the caret
    // sit on the last visible line.
    const windowStart = Math.max(0, currentLine - 1);
    const previousState = this.typingViewportState;
    const isSameText = previousState.text === text;
    const movedToAnotherWindow = isSameText && previousState.windowStart !== windowStart;
    const movedCaret = isSameText && previousState.currentIndex !== null && previousState.currentIndex !== currentIndex;

    // Remove the transition before resetting a new round or recalculating a
    // stable position. This prevents an idle render from making the text move.
    display.classList.toggle('typing-window-animate', movedToAnotherWindow && movedCaret);
    display.style.setProperty('--typing-window-translate', `${-windowStart * lineHeight}px`);
    this.typingViewportState = { text, currentIndex, windowStart };
  }

  handleTypingError(data) {
    if (this.keyboardRenderer) {
      this.keyboardRenderer.triggerError(data.typedKey);
    }

    const currentCharEl = this.typingTextDisplay?.querySelector('.char-current, .char-incorrect');
    if (currentCharEl) {
      currentCharEl.classList.add('char-error-shake');
      setTimeout(() => currentCharEl.classList.remove('char-error-shake'), 250);
    }

    if (data.requiresCorrection) {
      this.showToast('⚠️ Delete wrong keys with Backspace to fix word before typing space!', 'amber');
    }

    if (zenMode.isActive) {
      zenMode.triggerError();
    }
  }

  handleRoundFinished(data) {
    this.showToast(`Round ${data.roundIdx + 1} Complete!`, 'teal');
  }

  handleLessonFinished(summary) {
    this.currentSessionSummary = summary;
    try {
      goalsManager.setPracticeActive(false);
    } catch (e) {
      console.warn('GoalsManager setPracticeActive error:', e);
    }
    this.resultsShortcutLockoutUntil = Date.now() + 650; // Lockout hotkeys for 650ms to swallow trailing typing keystrokes
    try {
      ghostRacer.stopRace();
    } catch (e) {
      console.warn('GhostRacer stop error:', e);
    }
    document.body.classList.remove('blind-mode-active');

    try {
      if (zenMode?.isActive) {
        zenMode.exit();
      }
    } catch (e) {
      console.warn('ZenMode exit error:', e);
    }

    if (this.isFocusModeActive) {
      summary.inFocusMode = true;
    }

    if (summary.isPlacementTest) {
      try {
        summary.placementRecommendation = getPlacementRecommendation(summary);
      } catch (e) {
        console.warn('Placement recommendation error:', e);
      }
    }

    // Record premium data tracking
    try {
      if (this.currentLessonData?.quoteId || this.currentLessonData?.isQuote) {
        const qId = this.currentLessonData.quoteId;
        if (qId) {
          store.update(prev => ({
            ...prev,
            quotesPracticed: Array.from(new Set([...(prev.quotesPracticed || []), qId]))
          }));
        }
        summary.isQuote = true;
        summary.quoteId = qId;
        summary.quoteData = this.currentLessonData.quoteData || (qId ? QUOTE_VAULT.find(q => q.id === qId) : null);
        summary.quoteCategory = this.currentLessonData.category || summary.quoteData?.category || this.activeQuoteCategory;
        summary.quoteDifficulty = this.currentLessonData.difficulty || summary.quoteData?.difficulty || this.activeQuoteDifficulty;
      }

      if (this.currentLessonData?.isZen) {
        store.update(prev => ({
          ...prev,
          zenSessionsCompleted: (prev.zenSessionsCompleted || 0) + 1
        }));
      }

      if (this.currentLessonData?.languageCode) {
        store.update(prev => ({
          ...prev,
          languagesPracticed: Array.from(new Set([...(prev.languagesPracticed || []), this.currentLessonData.languageCode]))
        }));
      }

      if (this.currentLessonData?.isCodeLesson || this.currentLessonData?.snippetId) {
        const sId = this.currentLessonData.snippetId || this.currentLessonData.id;
        store.recordCodeSnippetCompleted(sId);
        summary.isCodeLesson = true;
        summary.snippetData = this.currentLessonData.snippetData;
      }

      if (this.currentLessonData?.isSpeedTest) {
        const presetId = this.currentLessonData.speedTestPreset || '60s';
        const pbResult = store.recordSpeedTestResult({
          presetId,
          wpm: summary.wpm,
          accuracy: summary.accuracy,
          consistency: summary.consistency || 100,
          durationSec: summary.durationSec
        });
        summary.isSpeedTest = true;
        summary.speedTestPreset = presetId;
        summary.isNewPB = pbResult.isNewPB;
        summary.speedTestPB = pbResult.best;
      }

      if (this.currentLessonData?.isAdaptiveDrill) {
        summary.isAdaptiveDrill = true;
        summary.targetKeys = this.currentLessonData.targetKeys;
      }

      if (this.currentLessonData?.isMissedWordsDrill) {
        summary.isMissedWordsDrill = true;
      }

      let sessionKind = 'lesson';
      if (summary.isPlacementTest) sessionKind = 'placement';
      else if (summary.isSpeedTest) sessionKind = 'speedtest';
      else if (summary.isCodeLesson) sessionKind = 'code';
      else if (summary.isQuote) sessionKind = 'quote';
      else if (this.currentLessonData?.isZen) sessionKind = 'zen';
      else if (this.currentLessonData?.isCustom) sessionKind = 'custom';

      store.recordSession({
        lessonId: summary.lessonId,
        lessonTitle: summary.lessonTitle,
        wpm: summary.wpm,
        accuracy: summary.accuracy,
        durationSec: summary.durationSec,
        stars: summary.stars,
        xpEarned: summary.xpEarned,
        keyStatsDelta: summary.keyStatsDelta,
        wpmHistory: summary.wpmHistory,
        mastery: summary.mastery,
        isPlacementTest: summary.isPlacementTest,
        placementRecommendation: summary.placementRecommendation,
        inFocusMode: !!this.isFocusModeActive,
        kind: sessionKind,
        speedTestPreset: summary.speedTestPreset || null
      });

      if (!summary.isPlacementTest && summary.lessonId === 'daily-challenge') {
        StreakEngine.recordDailyChallengeCompletion(store, {
          wpm: summary.wpm,
          accuracy: summary.accuracy
        });
      }
    } catch (e) {
      console.warn('Session recording error:', e);
    }

    try {
      const unlockedAchievements = summary.isPlacementTest ? [] : AchievementEngine.evaluate(store, summary);
      unlockedAchievements.forEach(ach => {
        this.showToast(`🏆 Achievement Unlocked: ${ach.title}!`, 'amber');
      });
    } catch (e) {
      console.warn('Achievement evaluation error:', e);
    }

    try {
      sound.playLessonComplete(summary.stars);
    } catch (e) {
      console.warn('Lesson complete audio error:', e);
    }

    try {
      if (!summary.isPlacementTest && summary.mastery?.isPassed) {
        this.triggerConfetti();
      }
    } catch (e) {
      console.warn('Confetti error:', e);
    }

    // Always navigate to results screen FIRST so the lesson screen is deactivated and results view is shown!
    this.navigateTo('results');
    this.renderResults(summary);
  }

  toggleLessonPause() {
    if (typingEngine.isPaused) {
      typingEngine.resume();
      goalsManager.setPracticeActive(true);
      this.hidePauseModal();
    } else {
      typingEngine.pause();
      goalsManager.setPracticeActive(false);
      this.showPauseModal();
    }
  }

  showPauseModal() {
    let modal = document.getElementById('pause-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pause-modal';
      modal.className = 'modal-overlay modal-active';
      modal.innerHTML = `
        <div class="modal-card">
          <h2 class="modal-title">Lesson Paused</h2>
          <p class="modal-desc">Take a breath, relax your shoulders, and maintain hand posture.</p>
          <div class="modal-actions">
            <button id="resume-lesson-btn" class="btn btn-primary">Resume (Esc)</button>
            <button id="restart-lesson-btn" class="btn btn-secondary">Restart Round (R)</button>
            <button id="exit-lesson-btn" class="btn btn-outline">Exit to Dashboard</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('resume-lesson-btn')?.addEventListener('click', () => this.toggleLessonPause());
      document.getElementById('restart-lesson-btn')?.addEventListener('click', () => {
        this.hidePauseModal();
        typingEngine.retryLesson();
      });
      document.getElementById('exit-lesson-btn')?.addEventListener('click', () => {
        this.hidePauseModal();
        this.navigateTo('dashboard');
      });
    } else {
      modal.classList.add('modal-active');
    }
  }

  hidePauseModal() {
    const modal = document.getElementById('pause-modal');
    if (modal) modal.classList.remove('modal-active');
  }

  // ==========================================
  // RESULTS SCREEN
  // ==========================================
  renderResults(summary) {
    const container = this.screens.results;
    if (!container) return;

    if (!summary) {
      summary = this.currentSessionSummary;
      if (!summary) return;
    }

    this.resultsShortcutLockoutUntil = Date.now() + 650;

    try {
      const state = store.getState();
      const lvlInfo = getLevelProgress(state.xp);
      let recommendations = [];
      try {
        recommendations = AnalyticsEngine.generateSmartRecommendations(summary, state.keyStats) || [];
      } catch (recErr) {
        console.warn('Smart recommendations calculation failed:', recErr);
        recommendations = [];
      }

      const mastery = summary.mastery || {
        stars: summary.stars || 1,
        isPassed: (summary.stars || 1) >= 3,
        isMastered: (summary.stars || 1) >= 4,
        isPerfected: (summary.stars || 1) >= 5,
        nextGoal: `Reach ${summary.accuracyTarget || 90}% accuracy and ${summary.wpmTarget || 20} WPM`
      };
      const isCodeLesson = !!summary.isCodeLesson || !!this.currentLessonData?.isCodeLesson;
      const isSpeedTest = !!summary.isSpeedTest || !!this.currentLessonData?.isSpeedTest;
      const isAdaptiveDrill = !!summary.isAdaptiveDrill || !!this.currentLessonData?.isAdaptiveDrill;
      const isMissedWordsDrill = !!summary.isMissedWordsDrill || !!this.currentLessonData?.isMissedWordsDrill;
      const isCurriculumLesson = Number.isInteger(summary.lessonId)
        && summary.lessonId >= 1
        && summary.lessonId <= CURRICULUM.length;
      const isQuoteLesson = !!summary.isQuote || !!summary.quoteId || !!this.currentLessonData?.isQuote || !!this.currentLessonData?.quoteId;
      const isFinalCurriculumLesson = isCurriculumLesson && summary.lessonId === CURRICULUM.length;

      const resultTitle = summary.isPlacementTest
        ? 'Skill Check Complete!'
        : isSpeedTest
          ? (summary.isNewPB ? '⚡ New Personal Benchmark Record!' : '⚡ Speed Benchmark Complete')
          : isCodeLesson
            ? '💻 Code Snippet Mastered!'
            : isAdaptiveDrill
              ? '🎯 AI Precision Drill Complete'
              : isMissedWordsDrill
                ? '🔁 Reinforcement Drill Finished'
                : isQuoteLesson
                  ? (mastery.isPerfected ? 'Perfect Run!' : mastery.isMastered ? 'Mastered Quote!' : mastery.isPassed ? 'Quote Completed!' : 'Quote Practice Complete')
                  : mastery.isPerfected
                    ? 'Perfected!'
                    : mastery.isMastered
                      ? 'Lesson Mastered!'
                      : mastery.isPassed
                        ? 'Ready to Advance!'
                        : 'Practice Round Complete';

      const resultSubtitle = summary.isPlacementTest
        ? `${summary.placementRecommendation?.message || 'Your next starting point is ready.'} • +${summary.xpEarned || 35} XP Earned`
        : isSpeedTest
          ? `Consistency: ${summary.consistency || 100}% • Duration: ${Math.round(summary.durationSec || 0)}s • +${summary.xpEarned || 30} XP`
          : `${summary.lessonTitle || 'Lesson Complete'} • +${summary.xpEarned || 30} XP Earned`;

      const primaryActionLabel = summary.isPlacementTest
        ? `Start Lesson ${summary.placementRecommendation?.lessonId || 1} →`
        : isSpeedTest
          ? 'Choose Speed Benchmark →'
          : isCodeLesson
            ? 'Next Code Snippet →'
            : isAdaptiveDrill || isMissedWordsDrill
              ? 'New AI Drill →'
              : isQuoteLesson
                ? 'Next Random Quote →'
                : isCurriculumLesson && !mastery.isPassed
                  ? 'Practice Again →'
                  : isFinalCurriculumLesson && mastery.isPassed
                    ? 'View Mastery Plan →'
                    : isCurriculumLesson && mastery.isPassed
                      ? 'Next Lesson →'
                      : 'Back to Curriculum →';

      const retryActionLabel = isSpeedTest
        ? 'Repeat Benchmark (R)'
        : isCodeLesson
          ? 'Retype Code (R)'
          : isQuoteLesson
            ? 'Replay Quote (R)'
            : 'Retry Lesson (R)';

      const backActionLabel = isCodeLesson
        ? 'Back to Code Arena'
        : isSpeedTest
          ? 'Back to Speed Tests'
          : isQuoteLesson
            ? 'Back to Quote Vault'
            : 'Back to Dashboard';

      const hasMissedWords = Array.isArray(summary.mistypedWords) && summary.mistypedWords.length > 0;
      const isCertEligible = (summary.wpm || 0) >= 50 || (summary.stars || 0) >= 3 || (state.bestWpm && state.bestWpm >= 50);
      const paceSampleCount = Array.isArray(summary.wpmHistory) ? summary.wpmHistory.length : 0;
      const resultBadge = summary.isPlacementTest
        ? 'Placement ready'
        : isSpeedTest
          ? (summary.isNewPB ? 'New personal best' : 'Benchmark complete')
          : `${mastery.stars}/5 mastery stars`;
      const displayedStars = Math.min(5, Math.max(0, Number(mastery.stars) || 0));
      const starLabel = isSpeedTest ? 'performance stars' : 'mastery stars';
      const resultStarsHtml = !summary.isPlacementTest ? `
        <div class="results-stars-row" role="img" aria-label="${displayedStars} out of 5 ${starLabel}">
          <span class="results-stars-icons" aria-hidden="true">
            ${[1, 2, 3, 4, 5].map(star => `<span class="result-star ${displayedStars >= star ? 'star-awarded' : ''}">${displayedStars >= star ? '★' : '☆'}</span>`).join('')}
          </span>
          <span class="results-stars-label"><strong>${displayedStars}/5</strong> ${starLabel}</span>
        </div>
      ` : '';

      let sparklineHtml = '';
      try {
        sparklineHtml = AnalyticsEngine.renderWpmSparklineSvg(summary.wpmHistory, 640, 170, summary.wpmTarget);
      } catch (sparkErr) {
        console.warn('Sparkline rendering error:', sparkErr);
        sparklineHtml = '<div class="sparkline-empty"><span>Session Pace Logged</span></div>';
      }

      container.innerHTML = `
        <div class="results-layout">
          <div class="results-hero-card">
            <div class="results-hero-topline">
              <span class="results-status-badge">${resultBadge}</span>
              <span class="results-xp-inline">+${summary.xpEarned || 30} XP</span>
            </div>
            <h2 class="results-title">${resultTitle}</h2>
            <p class="results-subtitle">${resultSubtitle}</p>
            ${resultStarsHtml}

            <div class="results-metrics-grid">
              <div class="result-metric-card">
                <span class="metric-val">${summary.wpm || 0}</span>
                <span class="metric-lbl">WPM Speed</span>
                <span class="metric-target ${(summary.wpm || 0) >= (summary.wpmTarget || 0) ? 'target-met' : ''}">Target: ${summary.wpmTarget || 15} WPM</span>
              </div>
              <div class="result-metric-card">
                <span class="metric-val">${summary.accuracy || 100}%</span>
                <span class="metric-lbl">Accuracy</span>
                <span class="metric-target ${(summary.accuracy || 100) >= (summary.accuracyTarget || 90) ? 'target-met' : ''}">Target: ${summary.accuracyTarget || 90}%</span>
              </div>
              <div class="result-metric-card">
                <span class="metric-val">${summary.maxCombo || 0} 🔥</span>
                <span class="metric-lbl">Max Combo</span>
                <span class="metric-target">${summary.totalErrors || 0} Errors</span>
              </div>
              <div class="result-metric-card">
                <span class="metric-val">${Math.round(summary.durationSec || 0)}s</span>
                <span class="metric-lbl">Practice Time</span>
                <span class="metric-target">${summary.consistency ? `${summary.consistency}% Consistency` : `${summary.totalKeystrokes || 0} Keystrokes`}</span>
              </div>
            </div>
            <div class="results-hero-foot">
              <span>${summary.totalKeystrokes || 0} keystrokes</span>
              <span>${summary.totalErrors || 0} ${(summary.totalErrors || 0) === 1 ? 'error' : 'errors'}</span>
              <span>Target ${summary.wpmTarget || 15} WPM · ${summary.accuracyTarget || 90}% accuracy</span>
            </div>
            <div class="results-actions">
              <button id="results-next-btn" class="btn btn-primary btn-large">${primaryActionLabel} <span class="action-shortcut">Enter ↵</span></button>
              <button id="results-retry-btn" class="btn btn-secondary">${retryActionLabel}</button>
              ${isCertEligible ? `
                <button id="results-cert-btn" class="btn btn-outline" style="border-color: #D4AF37; color: #D4AF37;">
                  <span>📜 Certificate</span>
                </button>
              ` : ''}
              <button id="results-dashboard-btn" class="btn btn-outline">${backActionLabel}</button>
            </div>
          </div>

          ${hasMissedWords ? `
            <!-- Missed Words Targeted Drill Callout -->
            <div class="missed-words-callout">
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 18px;">⚠️</span>
                  <strong style="color: var(--text-primary); font-size: 14px;">${summary.mistypedWords.length} Missed Word${summary.mistypedWords.length > 1 ? 's' : ''} Detected</strong>
                </div>
                <p style="margin: 4px 0 0; font-size: 12px; color: var(--text-secondary);">Reinforce muscle memory before moving forward:</p>
                <div class="missed-words-tags">
                  ${summary.mistypedWords.map(w => `<span class="missed-word-tag">${escapeHtml(w)}</span>`).join('')}
                </div>
              </div>
              <button id="results-practice-missed-btn" class="btn btn-primary" style="background: #E06C75; border-color: #E06C75;">
                <span>🔁 Practice Missed Words Only</span>
              </button>
            </div>
          ` : ''}

          <div class="results-mastery-card ${summary.isPlacementTest ? 'placement-result' : mastery.isMastered ? 'mastered-result' : 'review-result'}">
            ${summary.isPlacementTest ? `
              <div class="mastery-result-icon">🗺️</div>
              <div>
                <span class="mastery-result-kicker">Recommended starting point</span>
                <h3>Lesson ${summary.placementRecommendation?.lessonId || 1}: ${summary.placementRecommendation?.label || 'Home Row Foundations'}</h3>
                <p>Lessons before this point are available to explore, but none are marked as mastered until you earn the stars.</p>
              </div>
            ` : isSpeedTest ? `
              <div class="mastery-result-icon">⚡</div>
              <div>
                <span class="mastery-result-kicker">Benchmark Assessment</span>
                <h3>${summary.isNewPB ? '🏆 All-Time Personal Best!' : 'Benchmark Logged Successfully'}</h3>
                <p>Consistency rating: ${summary.consistency || 100}%. Pacing stability is tracked across 1-second velocity samples.</p>
              </div>
            ` : `
              <div class="mastery-result-icon">${mastery.isPerfected ? '💎' : mastery.isMastered ? '✦' : mastery.isPassed ? '🚀' : '🎯'}</div>
              <div>
                <span class="mastery-result-kicker">${mastery.stars}/5 mastery stars</span>
                <h3>${mastery.isPerfected ? 'Perfect run recorded' : mastery.isMastered ? 'This skill is mastered' : mastery.isPassed ? 'You passed — now polish it' : 'This lesson stays in your review queue'}</h3>
                <p>${mastery.nextGoal}</p>
              </div>
            `}
          </div>

          <div class="results-graph-card">
            <div class="card-header">
              <h3 class="card-title">WPM Velocity Curve</h3>
              <span class="card-badge">${paceSampleCount ? `${paceSampleCount} pace samples` : 'Session pace'}</span>
            </div>
            <div class="sparkline-wrapper">
              ${sparklineHtml}
            </div>
          </div>

          <div class="results-feedback-grid">
            ${recommendations.map(rec => `
              <div class="recommendation-card">
                <div class="rec-header">
                  <span class="rec-icon">💡</span>
                  <h4 class="rec-title">${escapeHtml(rec.title || '')}</h4>
                </div>
                <p class="rec-message">${escapeHtml(rec.message || '')}</p>
                ${rec.actionLabel && rec.keys ? `
                  <button class="btn btn-secondary btn-sm rec-btn" data-keys="${escapeHtml(rec.keys.join(','))}">${escapeHtml(rec.actionLabel)}</button>
                ` : ''}
              </div>
            `).join('')}
          </div>

          <div class="results-xp-card">
            <div class="xp-row">
              <span><strong>Level ${lvlInfo.currentLvl}</strong> • ${lvlInfo.title}</span>
              <span>${lvlInfo.isMaxLevel ? `${state.xp.toLocaleString()} XP · Max level` : `${state.xp.toLocaleString()} / ${lvlInfo.nextLvlXp.toLocaleString()} XP`}</span>
            </div>
            <div class="xp-bar-track">
              <div class="xp-bar-fill" style="width: ${lvlInfo.pct}%"></div>
            </div>
          </div>

        </div>
      `;

      // Missed Words Drill button
      if (hasMissedWords) {
        document.getElementById('results-practice-missed-btn')?.addEventListener('click', () => {
          this.startMissedWordsDrill(summary.mistypedWords);
        });
      }

      // Certificate button
      if (isCertEligible) {
        document.getElementById('results-cert-btn')?.addEventListener('click', () => {
          this.openCertificateModal();
        });
      }

      document.getElementById('results-next-btn')?.addEventListener('click', () => {
        if (summary.isPlacementTest) {
          const recommendedId = summary.placementRecommendation?.lessonId || 1;
          const recommendedLesson = CURRICULUM.find(lesson => lesson.id === recommendedId) || CURRICULUM[0];
          this.startLesson(recommendedLesson);
          return;
        }

        if (isSpeedTest) {
          this.navigateTo('speedtest');
          return;
        }

        if (isCodeLesson) {
          this.startRandomCodeSnippet(this.activeCodeLanguage || 'all');
          return;
        }

        if (isAdaptiveDrill || isMissedWordsDrill) {
          this.startWeaknessDrill();
          return;
        }

        if (isQuoteLesson) {
          const category = summary.quoteCategory || this.activeQuoteCategory || null;
          const difficulty = summary.quoteDifficulty || this.activeQuoteDifficulty || null;
          const excludeId = summary.quoteId || null;
          this.startRandomQuote(category, difficulty, excludeId);
          return;
        }

        if (!isCurriculumLesson) {
          this.navigateTo('dashboard');
          return;
        }

        if (!mastery.isPassed) {
          const sameLesson = CURRICULUM.find(lesson => lesson.id === summary.lessonId);
          if (sameLesson) this.startLesson(sameLesson);
          return;
        }

        if (isFinalCurriculumLesson) {
          this.navigateTo('dashboard');
          return;
        }

        const nextLesson = CURRICULUM.find(lesson => lesson.id === summary.lessonId + 1) || CURRICULUM[0];
        this.startLesson(nextLesson);
      });

      document.getElementById('results-retry-btn')?.addEventListener('click', () => {
        if (isCodeLesson && summary.snippetData) {
          this.startCodePractice(summary.snippetData);
          return;
        }
        if (isSpeedTest && summary.speedTestPreset) {
          this.startSpeedTest(summary.speedTestPreset);
          return;
        }
        if (isQuoteLesson) {
          if (summary.quoteData) {
            this.startQuotePractice(summary.quoteData);
          } else if (this.currentLessonData) {
            this.startLesson(this.currentLessonData);
          }
          return;
        }
        const lesson = CURRICULUM.find(l => l.id === summary.lessonId) || this.currentLessonData;
        if (lesson) this.startLesson(lesson);
      });

      document.getElementById('results-dashboard-btn')?.addEventListener('click', () => {
        if (isCodeLesson) {
          this.navigateTo('code');
        } else if (isSpeedTest) {
          this.navigateTo('speedtest');
        } else if (isQuoteLesson) {
          this.navigateTo('quotes');
        } else {
          this.navigateTo('dashboard');
        }
      });

      container.querySelectorAll('.rec-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const keys = btn.dataset.keys.split(',');
          const weakLesson = generateWeakKeysLesson(keys);
          this.startLesson(weakLesson);
        });
      });
    } catch (fatalErr) {
      console.error('Fatal error rendering results screen:', fatalErr);
      container.innerHTML = `
        <div class="results-layout" style="text-align: center; padding: 48px 24px;">
          <div class="results-hero-card">
            <h2 class="results-title">Practice Complete!</h2>
            <p class="results-subtitle">${escapeHtml(summary.lessonTitle || 'Lesson')} • +${summary.xpEarned || 30} XP Earned</p>
            <div class="results-metrics-grid">
              <div class="result-metric-card">
                <span class="metric-val">${summary.wpm || 0}</span>
                <span class="metric-lbl">WPM Speed</span>
              </div>
              <div class="result-metric-card">
                <span class="metric-val">${summary.accuracy || 100}%</span>
                <span class="metric-lbl">Accuracy</span>
              </div>
              <div class="result-metric-card">
                <span class="metric-val">${summary.maxCombo || 0} 🔥</span>
                <span class="metric-lbl">Max Combo</span>
              </div>
              <div class="result-metric-card">
                <span class="metric-val">${Math.round(summary.durationSec || 0)}s</span>
                <span class="metric-lbl">Duration</span>
              </div>
            </div>
            <div class="results-actions" style="margin-top: 24px;">
              <button id="results-next-btn" class="btn btn-primary btn-large">Next Practice →</button>
              <button id="results-retry-btn" class="btn btn-secondary">Retry (R)</button>
              <button id="results-dashboard-btn" class="btn btn-outline">Dashboard</button>
            </div>
          </div>
        </div>
      `;
      document.getElementById('results-next-btn')?.addEventListener('click', () => this.navigateTo('dashboard'));
      document.getElementById('results-retry-btn')?.addEventListener('click', () => {
        if (this.currentLessonData) this.startLesson(this.currentLessonData);
        else this.navigateTo('dashboard');
      });
      document.getElementById('results-dashboard-btn')?.addEventListener('click', () => this.navigateTo('dashboard'));
    }
  }

  // ==========================================
  // PROFILE & HEATMAP SCREEN
  // ==========================================
  renderProfile() {
    const container = this.screens.profile;
    if (!container) return;

    const state = store.getState();
    const lvlInfo = getLevelProgress(state.xp);

    container.innerHTML = `
      <div class="profile-layout">
        <!-- Hero Header -->
        <div class="profile-hero-card">
          <div class="avatar-circle">⌨️</div>
          <div class="profile-info">
            <div style="display: flex; align-items: center; gap: 10px;">
              <h2 class="profile-name">Touch Typist</h2>
              <span class="premium-crown" style="font-size: 11px;">👑 Premium Included</span>
            </div>
            <p class="profile-level-badge">Level ${lvlInfo.currentLvl} • ${lvlInfo.title}</p>
            <div class="profile-xp-bar-track">
              <div class="profile-xp-bar-fill" style="width: ${lvlInfo.pct}%"></div>
            </div>
            <span class="profile-xp-sub">${state.xp.toLocaleString()} Total XP (${lvlInfo.isMaxLevel ? 'Max level reached' : `${lvlInfo.progressXp} / ${lvlInfo.neededXp} to Level ${lvlInfo.currentLvl + 1}`})</span>
          </div>
        </div>

        <!-- Official Diploma Action Banner -->
        <div style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.12), rgba(124, 92, 252, 0.12)); border: 1px solid rgba(212, 175, 55, 0.4); border-radius: var(--radius-lg); padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <span style="font-size: 36px;">📜</span>
            <div>
              <h3 style="font-size: 16px; font-weight: 800; color: #D4AF37; margin: 0 0 4px;">KeyFlow Touch Typing Diploma</h3>
              <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">Verified 300 DPI high-resolution printable certificate with custom name &amp; official credentials</p>
            </div>
          </div>
          <button id="profile-cert-btn" class="btn btn-primary" style="background: #D4AF37; color: #16162A; border-color: #D4AF37; font-weight: 700;">
            <span>🏆 View &amp; Download Diploma</span>
          </button>
        </div>

        <!-- Advanced Analytics Dashboard Slot (Scorecards, Dual Velocity Charts, Diagnostics, Session History) -->
        <div id="advanced-analytics-slot"></div>

        <!-- Physical Keyboard Accuracy Heatmap Card -->
        <div class="profile-section-card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Physical Keyboard Accuracy Heatmap</h3>
              <p class="card-subtitle">Visual accuracy performance breakdown per physical keycap</p>
            </div>
            <div class="heatmap-legend">
              <span class="legend-item"><span class="legend-box untested"></span> Untested</span>
              <span class="legend-item"><span class="legend-box poor"></span> Needs Practice (&lt;80%)</span>
              <span class="legend-item"><span class="legend-box improving"></span> Improving (80-89%)</span>
              <span class="legend-item"><span class="legend-box good"></span> Good (90-96%)</span>
              <span class="legend-item"><span class="legend-box mastered"></span> Mastered (97%+)</span>
            </div>
          </div>
          ${Object.keys(state.keyStats || {}).length === 0 ? `
            <div style="padding: 10px 14px; margin-bottom: 12px; background: var(--surface-2); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); font-size: 12.5px; color: var(--text-secondary); display: flex; align-items: center; justify-content: space-between;">
              <span>💡 <strong>Live Telemetry:</strong> Complete practice lessons to illuminate your physical key accuracy heatmap.</span>
              <button id="profile-demo-seed-btn" class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 4px 10px;">Load Demo Data</button>
            </div>
          ` : ''}
          <div id="profile-heatmap-container" class="profile-heatmap-container"></div>
        </div>

        <!-- Milestone Achievements Card -->
        <div class="profile-section-card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Milestone Achievements (${Object.keys(state.achievementsUnlocked || {}).length}/${ACHIEVEMENTS.length})</h3>
              <p class="card-subtitle">Unlock badges through dedication, accuracy, speed, quotes, and zen practice</p>
            </div>
          </div>
          <div class="achievements-grid">
            ${ACHIEVEMENTS.map(ach => {
              const isUnlocked = !!state.achievementsUnlocked?.[ach.id];
              return `
                <div class="achievement-card ${isUnlocked ? 'ach-unlocked' : 'ach-locked'}">
                  <div class="ach-icon">${ach.icon}</div>
                  <div class="ach-info">
                    <h4 class="ach-title">${ach.title}</h4>
                    <p class="ach-desc">${ach.description}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                      <span class="ach-status">${isUnlocked ? '✓ Unlocked' : '🔒 Locked'}</span>
                      <span style="font-size: 11px; color: var(--reward-amber); font-weight: 700;">+${ach.xpBonus || 50} XP</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // Render Advanced Analytics
    const analyticsSlot = document.getElementById('advanced-analytics-slot');
    if (analyticsSlot) {
      renderAdvancedAnalyticsDashboard(analyticsSlot, state, this);
    }

    const heatmapContainer = document.getElementById('profile-heatmap-container');
    if (heatmapContainer) {
      const kb = new KeyboardRenderer(heatmapContainer, { interactive: false, layoutId: state.settings.layout || 'qwerty' });
      kb.applyHeatmap(state.keyStats || {});
    }

    const seedBtn = document.getElementById('profile-demo-seed-btn');
    if (seedBtn) {
      seedBtn.addEventListener('click', () => {
        store.seedDemoData();
        this.renderProfile();
      });
    }

    const certBtn = document.getElementById('profile-cert-btn');
    if (certBtn) {
      certBtn.addEventListener('click', () => {
        this.openCertificateModal();
      });
    }
  }

  // ==========================================
  // SETTINGS SCREEN
  // ==========================================
  renderSettings() {
    const container = this.screens.settings;
    if (!container) return;

    const state = store.getState();
    const settings = state.settings;

    container.innerHTML = `
      <div class="settings-layout">
        <div class="settings-header">
          <h2 class="settings-title">Application Settings</h2>
          <p class="settings-subtitle">Themes, switch sound profiles, layouts, ghost racing, and data backup</p>
        </div>

        <!-- 1. Keycap Visual Themes -->
        <div class="settings-group-card">
          <h3 class="group-title">Keycap Aesthetic Themes</h3>
          <div class="theme-selector-grid">
            <div class="theme-card-option ${!settings.customThemeId && settings.theme === 'dark' ? 'theme-active' : ''}" data-theme="dark">
              <div class="theme-preview-palette">
                <span class="palette-dot" style="background: #0F1117"></span>
                <span class="palette-dot" style="background: #191E2C"></span>
                <span class="palette-dot" style="background: #7C5CFC"></span>
              </div>
              <span class="theme-name">Dark Flow</span>
            </div>

            <div class="theme-card-option ${!settings.customThemeId && settings.theme === 'retro' ? 'theme-active' : ''}" data-theme="retro">
              <div class="theme-preview-palette">
                <span class="palette-dot" style="background: #282A30"></span>
                <span class="palette-dot" style="background: #D8D2C2"></span>
                <span class="palette-dot" style="background: #FF8C00"></span>
              </div>
              <span class="theme-name">Retro 1984</span>
            </div>

            <div class="theme-card-option ${!settings.customThemeId && settings.theme === 'cyberpunk' ? 'theme-active' : ''}" data-theme="cyberpunk">
              <div class="theme-preview-palette">
                <span class="palette-dot" style="background: #090114"></span>
                <span class="palette-dot" style="background: #00F0FF"></span>
                <span class="palette-dot" style="background: #FF007F"></span>
              </div>
              <span class="theme-name">Cyberpunk</span>
            </div>

            <div class="theme-card-option ${!settings.customThemeId && settings.theme === 'botanical' ? 'theme-active' : ''}" data-theme="botanical">
              <div class="theme-preview-palette">
                <span class="palette-dot" style="background: #0B170E"></span>
                <span class="palette-dot" style="background: #172D1E"></span>
                <span class="palette-dot" style="background: #52B788"></span>
              </div>
              <span class="theme-name">Botanical</span>
            </div>

            <div class="theme-card-option ${!settings.customThemeId && settings.theme === 'tokyo' ? 'theme-active' : ''}" data-theme="tokyo">
              <div class="theme-preview-palette">
                <span class="palette-dot" style="background: #1A1B26"></span>
                <span class="palette-dot" style="background: #202436"></span>
                <span class="palette-dot" style="background: #BB9AF7"></span>
              </div>
              <span class="theme-name">Tokyo Night</span>
            </div>

            ${(() => {
              try {
                const customThemes = JSON.parse(localStorage.getItem('typing_tutor_custom_themes') || '[]');
                return customThemes.map(t => `
                  <div class="theme-card-option ${settings.customThemeId === t.id ? 'theme-active' : ''}" data-custom-theme-id="${t.id}">
                    <div class="theme-preview-palette">
                      <span class="palette-dot" style="background: ${t.bgBase || '#0F1117'}"></span>
                      <span class="palette-dot" style="background: ${t.surface2 || '#1B2030'}"></span>
                      <span class="palette-dot" style="background: ${t.accentPrimary || '#7C5CFC'}"></span>
                    </div>
                    <span class="theme-name">${escapeHtml(t.name || 'Custom Theme')}</span>
                  </div>
                `).join('');
              } catch { return ''; }
            })()}
          </div>
        </div>

        <!-- 2. Custom Theme Studio -->
        <div id="theme-studio-slot"></div>

        <!-- 3. Goal Setting & Smart Reminders -->
        <div class="settings-group-card">
          <div class="group-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <h3 class="group-title">🎯 Goal Setting &amp; Smart Reminders</h3>
              <p class="setting-desc">Set daily velocity, duration, and weekly milestones with optional desktop alerts</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-goals-toggle" ${settings.goals?.enabled !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="goals-settings-grid">
            <div class="setting-row">
              <div>
                <label class="setting-label">Daily Practice Time Goal</label>
                <p class="setting-desc">Minutes of practice targeted each day</p>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <input type="number" id="setting-goal-minutes" min="1" max="180" value="${settings.goals?.dailyMinutes || 15}" class="goal-number-input">
                <span style="font-size: 13px; color: var(--text-secondary);">min</span>
              </div>
            </div>

            <div class="setting-row">
              <div>
                <label class="setting-label">Daily WPM Target</label>
                <p class="setting-desc">Speed goal for today's best run</p>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <input type="number" id="setting-goal-wpm" min="15" max="150" value="${settings.goals?.dailyWpm || 50}" class="goal-number-input">
                <span style="font-size: 13px; color: var(--text-secondary);">WPM</span>
              </div>
            </div>

            <div class="setting-row">
              <div>
                <label class="setting-label">Weekly Lesson Milestone</label>
                <p class="setting-desc">Number of lessons to complete each week</p>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <input type="number" id="setting-goal-lessons" min="1" max="30" value="${settings.goals?.weeklyLessons || 5}" class="goal-number-input">
                <span style="font-size: 13px; color: var(--text-secondary);">lessons</span>
              </div>
            </div>

            <div class="setting-row">
              <div>
                <label class="setting-label">Desktop Notifications</label>
                <p class="setting-desc">Gentle reminder if your daily practice goal hasn't been met</p>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-goal-notif-toggle" ${settings.goals?.notificationsEnabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <div>
                <label class="setting-label">Reminder Time</label>
                <p class="setting-desc">Hour to deliver daily notification</p>
              </div>
              <select id="setting-goal-notif-hour" class="select-input" style="width: 130px;">
                <option value="18" ${(settings.goals?.notificationHour || 20) === 18 ? 'selected' : ''}>6:00 PM</option>
                <option value="19" ${(settings.goals?.notificationHour || 20) === 19 ? 'selected' : ''}>7:00 PM</option>
                <option value="20" ${(settings.goals?.notificationHour || 20) === 20 ? 'selected' : ''}>8:00 PM</option>
                <option value="21" ${(settings.goals?.notificationHour || 20) === 21 ? 'selected' : ''}>9:00 PM</option>
                <option value="22" ${(settings.goals?.notificationHour || 20) === 22 ? 'selected' : ''}>10:00 PM</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 4. Ergonomic Wellness & Break Timer -->
        <div class="settings-group-card">
          <h3 class="group-title">🧘 Ergonomic Wellness &amp; Focus</h3>
          <div class="wellness-settings">
            <div class="setting-row">
              <div>
                <label class="setting-label">Break Reminder Interval</label>
                <p class="setting-desc">Gentle full-screen stretch prompt after continuous typing</p>
              </div>
              <select id="setting-break-interval" class="select-input" style="width: 140px;">
                <option value="15" ${(settings.wellness?.breakInterval || 30) === 15 ? 'selected' : ''}>Every 15 mins</option>
                <option value="30" ${(settings.wellness?.breakInterval || 30) === 30 ? 'selected' : ''}>Every 30 mins</option>
                <option value="45" ${(settings.wellness?.breakInterval || 30) === 45 ? 'selected' : ''}>Every 45 mins</option>
                <option value="60" ${(settings.wellness?.breakInterval || 30) === 60 ? 'selected' : ''}>Every 60 mins</option>
              </select>
            </div>

            <div class="setting-row">
              <div>
                <label class="setting-label">Ergonomic Break Reminders</label>
                <p class="setting-desc">Enable periodic 20-second posture and wrist stretch reminders</p>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-break-toggle" ${settings.wellness?.breakEnabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <div>
                <label class="setting-label">Eye Care (20-20-20 Rule)</label>
                <p class="setting-desc">Remind to look at an object 20 feet away for 20 seconds</p>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-eyecare-toggle" ${settings.wellness?.eyeCareEnabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <div>
                <label class="setting-label">Focus Mode Shortcut (F)</label>
                <p class="setting-desc">Pressing 'F' during a lesson toggles minimalist zero-distraction layout</p>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-focus-shortcut-toggle" ${settings.wellness?.focusModeShortcut !== false ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- 5. Audio & Switch Sound Profiles -->
        <div class="settings-group-card">
          <h3 class="group-title">Mechanical Switch Sound Profiles</h3>
          <div class="setting-row">
            <div>
              <label class="setting-label">Sound Effects</label>
              <p class="setting-desc">Enable procedural mechanical switch audio</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-sound-toggle" ${settings.soundEnabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <div>
              <label class="setting-label">Switch Sound Profile</label>
              <p class="setting-desc">Choose your synthesized key switch acoustic character</p>
            </div>
            <select id="setting-switch-profile" class="select-input">
              <option value="cherry_blue" ${settings.switchProfile === 'cherry_blue' ? 'selected' : ''}>Cherry MX Blue (Clicky)</option>
              <option value="gateron_brown" ${settings.switchProfile === 'gateron_brown' ? 'selected' : ''}>Gateron Brown (Warm Tactile)</option>
              <option value="holy_panda" ${settings.switchProfile === 'holy_panda' ? 'selected' : ''}>Holy Panda / Topre (Deep Thock)</option>
              <option value="typewriter" ${settings.switchProfile === 'typewriter' ? 'selected' : ''}>Vintage Typewriter (Mechanical Ping)</option>
              <option value="bubble_pop" ${settings.switchProfile === 'bubble_pop' ? 'selected' : ''}>Bubble Wrap / Soft Pop</option>
            </select>
          </div>
          <div class="setting-row">
            <div>
              <label class="setting-label">Audio Volume</label>
              <p class="setting-desc">Adjust sound output volume</p>
            </div>
            <input type="range" id="setting-volume-slider" min="0" max="1" step="0.05" value="${settings.soundVolume}" class="range-input">
          </div>
        </div>

        <!-- 6. Metronome & Cadence Rhythm -->
        <div class="settings-group-card">
          <h3 class="group-title">Cadence Metronome</h3>
          <div class="setting-row">
            <div>
              <label class="setting-label">Audible Metronome</label>
              <p class="setting-desc">Plays steady ticks during active lessons to train even cadence</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-metronome-toggle" ${settings.metronomeEnabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <div>
              <label class="setting-label">Metronome Tempo (${settings.metronomeBpm || 100} BPM)</label>
              <p class="setting-desc">Speed of rhythm pulse</p>
            </div>
            <input type="range" id="setting-metronome-bpm" min="50" max="220" step="5" value="${settings.metronomeBpm || 100}" class="range-input">
          </div>
        </div>

        <!-- 7. Keyboard Layouts & Hardcore Modes -->
        <div class="settings-group-card">
          <h3 class="group-title">Keyboard Layout &amp; Training Modes</h3>
          <div class="setting-row">
            <div>
              <label class="setting-label">Keyboard Layout</label>
              <p class="setting-desc">Select your target physical layout matrix</p>
            </div>
            <select id="setting-layout-select" class="select-input">
              ${Object.values(LAYOUTS).map(l => `
                <option value="${l.id}" ${settings.layout === l.id ? 'selected' : ''}>${l.name} (${l.tagline})</option>
              `).join('')}
            </select>
          </div>
          <div class="setting-row">
            <div>
              <label class="setting-label">Blind Typing Mode</label>
              <p class="setting-desc">Masks on-screen key legends and character preview to enforce 100% muscle memory</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-blind-toggle" ${settings.blindMode ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <div>
              <label class="setting-label">Word Correction Mode (Backspace to Fix)</label>
              <p class="setting-desc">Keep typing through mistakes. Wrong keys are red; use Backspace to correct them and corrected keys turn yellow.</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-wordcorrection-toggle" ${settings.wordCorrectionMode ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <div>
              <label class="setting-label">Sudden Death Mode</label>
              <p class="setting-desc">A single mistake immediately restarts the current round</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-suddendeath-toggle" ${settings.suddenDeath ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- 8. Ghost Racer Competitors -->
        <div class="settings-group-card">
          <h3 class="group-title">Ghost Racer &amp; Bot Competitors</h3>
          <div class="setting-row">
            <div>
              <label class="setting-label">Race Track Competitor</label>
              <p class="setting-desc">Display head-to-head racing progress above the lesson HUD</p>
            </div>
            <select id="setting-ghost-mode" class="select-input">
              <option value="bot" ${settings.ghostMode === 'bot' ? 'selected' : ''}>AI Bot Pacemaker</option>
              <option value="personal_best" ${settings.ghostMode === 'personal_best' ? 'selected' : ''}>Personal Best Ghost</option>
              <option value="off" ${settings.ghostMode === 'off' ? 'selected' : ''}>Disabled</option>
            </select>
          </div>
          <div class="setting-row">
            <div>
              <label class="setting-label">AI Bot Pace</label>
              <p class="setting-desc">Target speed for AI Bot competitor</p>
            </div>
            <select id="setting-bot-wpm" class="select-input">
              <option value="30" ${settings.botWpm === 30 ? 'selected' : ''}>🐢 Turtle Bot (30 WPM)</option>
              <option value="50" ${settings.botWpm === 50 ? 'selected' : ''}>🦊 Fox Bot (50 WPM)</option>
              <option value="80" ${settings.botWpm === 80 ? 'selected' : ''}>🦅 Falcon Bot (80 WPM)</option>
              <option value="110" ${settings.botWpm === 110 ? 'selected' : ''}>⚡ Cyber Bot (110 WPM)</option>
            </select>
          </div>
        </div>

        <!-- 9. Data Portability (Backup & Restore) -->
        <div class="settings-group-card">
          <h3 class="group-title">Data Backup &amp; Restore</h3>
          <div class="setting-row">
            <div>
              <label class="setting-label">Export / Import Progress</label>
              <p class="setting-desc">Save a local JSON backup or restore your progress on another device</p>
            </div>
            <div class="backup-actions-row">
              <button id="export-backup-btn" class="btn btn-secondary btn-sm">Download Backup JSON</button>
              <label class="btn btn-outline btn-sm" style="cursor: pointer;">
                Restore JSON
                <input type="file" id="import-backup-file" accept=".json" style="display: none;">
              </label>
            </div>
          </div>
        </div>

        <!-- 10. Danger Zone -->
        <div class="settings-group-card danger-zone">
          <h3 class="group-title text-error">Danger Zone</h3>
          <div class="setting-row">
            <div>
              <label class="setting-label">Reset All Progress</label>
              <p class="setting-desc">Permanently erase all lesson stars, XP, streaks, and analytics</p>
            </div>
            <button id="reset-progress-btn" class="btn btn-danger">Reset Progress</button>
          </div>
        </div>
      </div>
    `;

    // Render Theme Studio in its designated slot
    const studioSlot = document.getElementById('theme-studio-slot');
    if (studioSlot) {
      renderThemeStudioUI(studioSlot, () => this.renderSettings());
    }

    // Built-in Theme selector
    container.querySelectorAll('.theme-card-option[data-theme]').forEach(card => {
      card.addEventListener('click', () => {
        const theme = card.dataset.theme;
        store.update(prev => ({
          ...prev,
          settings: { ...prev.settings, theme, customThemeId: null }
        }));
        this.renderSettings();
      });
    });

    // Custom Theme selector
    container.querySelectorAll('.theme-card-option[data-custom-theme-id]').forEach(card => {
      card.addEventListener('click', () => {
        const customThemeId = card.dataset.customThemeId;
        store.update(prev => ({
          ...prev,
          settings: { ...prev.settings, customThemeId }
        }));
        this.renderSettings();
      });
    });

    // Goals Settings
    document.getElementById('setting-goals-toggle')?.addEventListener('change', (e) => {
      store.update(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          goals: { ...(prev.settings.goals || {}), enabled: e.target.checked }
        }
      }));
    });

    document.getElementById('setting-goal-minutes')?.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10) || 15;
      store.update(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          goals: { ...(prev.settings.goals || {}), dailyMinutes: val }
        }
      }));
    });

    document.getElementById('setting-goal-wpm')?.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10) || 50;
      store.update(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          goals: { ...(prev.settings.goals || {}), dailyWpm: val }
        }
      }));
    });

    document.getElementById('setting-goal-lessons')?.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10) || 5;
      store.update(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          goals: { ...(prev.settings.goals || {}), weeklyLessons: val }
        }
      }));
    });

    document.getElementById('setting-goal-notif-toggle')?.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      if (enabled) {
        const granted = await goalsManager.requestNotificationPermission();
        if (granted !== 'granted') {
          e.target.checked = false;
          this.showToast('Notification permission was not granted by your browser.', 'amber');
          return;
        }
      }
      store.update(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          goals: { ...(prev.settings.goals || {}), notificationsEnabled: enabled }
        }
      }));
      if (enabled) {
        const hour = store.getState().settings?.goals?.notificationHour || 20;
        goalsManager.scheduleNotification(hour);
        this.showToast('🔔 Daily reminder notifications activated!', 'teal');
      } else {
        goalsManager.cancelNotification();
      }
    });

    document.getElementById('setting-goal-notif-hour')?.addEventListener('change', (e) => {
      const hour = parseInt(e.target.value, 10) || 20;
      store.update(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          goals: { ...(prev.settings.goals || {}), notificationHour: hour }
        }
      }));
      if (store.getState().settings?.goals?.notificationsEnabled) {
        goalsManager.scheduleNotification(hour);
      }
    });

    // Wellness Settings
    document.getElementById('setting-break-interval')?.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10) || 30;
      store.update(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          wellness: { ...(prev.settings.wellness || {}), breakInterval: val }
        }
      }));
    });

    document.getElementById('setting-break-toggle')?.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      store.update(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          wellness: { ...(prev.settings.wellness || {}), breakEnabled: enabled }
        }
      }));
      goalsManager.syncBreakTimer();
      if (enabled) {
        this.showToast('🧘 Ergonomic break reminders enabled.', 'teal');
      }
    });

    document.getElementById('setting-eyecare-toggle')?.addEventListener('change', (e) => {
      store.update(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          wellness: { ...(prev.settings.wellness || {}), eyeCareEnabled: e.target.checked }
        }
      }));
      goalsManager.syncBreakTimer();
    });

    document.getElementById('setting-focus-shortcut-toggle')?.addEventListener('change', (e) => {
      store.update(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          wellness: { ...(prev.settings.wellness || {}), focusModeShortcut: e.target.checked }
        }
      }));
    });

    // Sound profile
    document.getElementById('setting-switch-profile')?.addEventListener('change', (e) => {
      store.update(prev => ({
        ...prev,
        settings: { ...prev.settings, switchProfile: e.target.value }
      }));
      sound.playKeyClick();
    });

    document.getElementById('setting-sound-toggle')?.addEventListener('change', (e) => {
      store.update(prev => ({
        ...prev,
        settings: { ...prev.settings, soundEnabled: e.target.checked }
      }));
    });

    document.getElementById('setting-volume-slider')?.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      store.update(prev => ({
        ...prev,
        settings: { ...prev.settings, soundVolume: vol }
      }));
      sound.playKeyClick();
    });

    // Metronome
    document.getElementById('setting-metronome-toggle')?.addEventListener('change', (e) => {
      store.update(prev => ({
        ...prev,
        settings: { ...prev.settings, metronomeEnabled: e.target.checked }
      }));
    });

    document.getElementById('setting-metronome-bpm')?.addEventListener('input', (e) => {
      const bpm = parseInt(e.target.value, 10);
      store.update(prev => ({
        ...prev,
        settings: { ...prev.settings, metronomeBpm: bpm }
      }));
    });

    // Layout
    document.getElementById('setting-layout-select')?.addEventListener('change', (e) => {
      store.update(prev => ({
        ...prev,
        settings: { ...prev.settings, layout: e.target.value }
      }));
    });

    // Blind, Word Correction & Sudden Death
    document.getElementById('setting-blind-toggle')?.addEventListener('change', (e) => {
      store.update(prev => ({
        ...prev,
        settings: { ...prev.settings, blindMode: e.target.checked }
      }));
    });

    document.getElementById('setting-wordcorrection-toggle')?.addEventListener('change', (e) => {
      store.update(prev => ({
        ...prev,
        settings: { ...prev.settings, wordCorrectionMode: e.target.checked }
      }));
      this.showToast(
        e.target.checked ? 'Word Correction Mode Enabled' : 'Word Correction Mode Disabled',
        'teal'
      );
    });

    document.getElementById('setting-suddendeath-toggle')?.addEventListener('change', (e) => {
      store.update(prev => ({
        ...prev,
        settings: { ...prev.settings, suddenDeath: e.target.checked }
      }));
    });

    // Ghost mode
    document.getElementById('setting-ghost-mode')?.addEventListener('change', (e) => {
      store.update(prev => ({
        ...prev,
        settings: { ...prev.settings, ghostMode: e.target.value }
      }));
    });

    document.getElementById('setting-bot-wpm')?.addEventListener('change', (e) => {
      store.update(prev => ({
        ...prev,
        settings: { ...prev.settings, botWpm: parseInt(e.target.value, 10) }
      }));
    });

    // Export Backup
    document.getElementById('export-backup-btn')?.addEventListener('click', () => {
      const json = store.exportBackupJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `keyflow-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Backup JSON exported successfully!', 'teal');
    });

    // Import Backup
    document.getElementById('import-backup-file')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = store.importBackupJson(event.target.result);
        if (result.success) {
          this.showToast('Backup progress restored successfully!', 'teal');
          this.renderSettings();
        } else {
          this.showToast(`Import failed: ${result.error}`, 'coral');
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('reset-progress-btn')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all your typing progress, stars, and XP? This action cannot be undone.')) {
        store.resetAll();
        this.showToast('All progress has been reset.', 'amber');
        this.navigateTo('onboarding');
        this.renderOnboarding();
      }
    });
  }

  // ==========================================
  // TOASTS & CELEBRATION EFFECTS
  // ==========================================
  showToast(message, type = 'accent') {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;

    this.toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('toast-show'), 10);
    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  triggerConfetti() {
    const state = store.getState();
    if (state.settings.reducedMotion || !this.confettiContainer) return;

    const colors = ['#7C5CFC', '#00D4AA', '#FFB86B', '#FF6B8B', '#06D6A0', '#4EA8DE'];
    const count = 40;

    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      piece.style.animationDuration = `${1.5 + Math.random() * 1.5}s`;
      piece.style.animationDelay = `${Math.random() * 0.3}s`;

      this.confettiContainer.appendChild(piece);
      setTimeout(() => piece.remove(), 3200);
    }
  }

  checkMobileRestriction() {
    const isMobile = window.innerWidth < 768;
    let warning = document.getElementById('mobile-warning-overlay');

    if (isMobile) {
      if (!warning) {
        warning = document.createElement('div');
        warning.id = 'mobile-warning-overlay';
        warning.className = 'mobile-warning-overlay';
        warning.innerHTML = `
          <div class="mobile-warning-card">
            <span class="warning-icon">⌨️</span>
            <h3>Physical Keyboard Required</h3>
            <p>10-Finger touch typing requires a physical hardware keyboard to build tactile muscle memory. Please open this app on a laptop or desktop computer.</p>
          </div>
        `;
        document.body.appendChild(warning);
      }
    } else {
      if (warning) warning.remove();
    }
  }

  // ==========================================
  // PREMIUM SUITE HELPERS
  // ==========================================
  launchZenMode(customLesson = null) {
    let lessonToUse = customLesson;
    if (!lessonToUse) {
      if (this.activeScreen === 'lesson' && this.currentLessonData) {
        lessonToUse = this.currentLessonData;
      } else {
        const qotd = getQuoteOfTheDay();
        lessonToUse = CustomPracticeManager.createLessonFromText(`Zen: ${qotd.author}`, qotd.text);
        lessonToUse.author = qotd.author;
        lessonToUse.isZen = true;
      }
    }

    if (this.activeScreen !== 'lesson' || this.currentLessonData !== lessonToUse) {
      this.startLesson(lessonToUse);
    }

    zenMode.enter((e) => {
      sound.resume();
      if (this.activeScreen === 'lesson' && typingEngine.isActive) {
        if (this.keyboardRenderer) {
          this.keyboardRenderer.triggerPhysicalPress(e.code);
        }
        typingEngine.handleKeyDown(e);
      }
    }, {
      title: lessonToUse.title || 'Zen Sanctuary',
      author: lessonToUse.author || ''
    });

    if (lessonToUse.rounds && lessonToUse.rounds[0]) {
      this.renderTypingText(lessonToUse.rounds[0], typingEngine.charIndex || 0);
    }

    // Auto-start ambient soundscape (e.g. rain) if sound is enabled
    if (store.getState().settings.soundEnabled !== false && zenMode.zenSoundEngine) {
      zenMode.zenSoundEngine.play('rain');
    }

    // Track zen session
    store.update(prev => ({
      ...prev,
      zenSessionsCompleted: (prev.zenSessionsCompleted || 0) + 1,
      zenSoundscapesUsed: Array.from(new Set([...(prev.zenSoundscapesUsed || []), 'rain']))
    }));

    AchievementEngine.evaluate(store);
  }

  toggleFocusMode() {
    if (this.isFocusModeActive) {
      this.exitFocusMode();
    } else {
      this.enterFocusMode();
    }
  }

  enterFocusMode() {
    this.isFocusModeActive = true;
    document.body.classList.add('focus-mode-active');

    let exitBadge = document.getElementById('focus-exit-badge');
    if (!exitBadge) {
      exitBadge = document.createElement('div');
      exitBadge.id = 'focus-exit-badge';
      exitBadge.className = 'focus-mode-exit-badge';
      exitBadge.setAttribute('role', 'button');
      exitBadge.setAttribute('tabindex', '0');
      exitBadge.setAttribute('aria-label', 'Exit Focus Mode');
      exitBadge.innerHTML = `<span>Focus Mode Active</span> <span class="kbd">Esc</span>`;
      const exitFocusMode = () => this.exitFocusMode();
      exitBadge.addEventListener('click', exitFocusMode);
      exitBadge.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          exitFocusMode();
        }
      });
      document.body.appendChild(exitBadge);
    }

    this.showToast('🎯 Focus Mode enabled. Minimalist layout active.', 'teal');
  }

  exitFocusMode() {
    this.isFocusModeActive = false;
    document.body.classList.remove('focus-mode-active');
    const exitBadge = document.getElementById('focus-exit-badge');
    if (exitBadge) exitBadge.remove();
  }

  showShortcutsPopup() {
    let popup = document.getElementById('shortcuts-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'shortcuts-popup';
      popup.setAttribute('role', 'dialog');
      popup.setAttribute('aria-modal', 'true');
      popup.setAttribute('aria-labelledby', 'shortcuts-dialog-title');
      const previouslyFocused = document.activeElement;
      popup.innerHTML = `
        <div class="shortcuts-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 id="shortcuts-dialog-title" style="margin: 0; font-size: 18px; font-weight: 700; color: var(--text-primary);">⌨️ Keyboard Shortcuts</h3>
            <button id="shortcuts-close-btn" class="btn btn-sm" style="font-size: 16px; padding: 4px 8px; cursor: pointer; color: var(--text-secondary);">✕</button>
          </div>
          <table class="shortcuts-table">
            <tbody>
              <tr>
                <td><span class="shortcut-kbd">Esc</span></td>
                <td>Pause lesson / Exit Focus Mode / Exit Zen Mode</td>
              </tr>
              <tr>
                <td><span class="shortcut-kbd">Enter</span></td>
                <td>Next lesson / Advance on completion page</td>
              </tr>
              <tr>
                <td><span class="shortcut-kbd">R</span></td>
                <td>Retry current lesson on completion page</td>
              </tr>
              <tr>
                <td><span class="shortcut-kbd">F</span></td>
                <td>Toggle Focus Mode (zero-distraction layout)</td>
              </tr>
              <tr>
                <td><span class="shortcut-kbd">Z</span></td>
                <td>Launch Zen Mode with procedural ambient soundscapes</td>
              </tr>
              <tr>
                <td><span class="shortcut-kbd">A</span></td>
                <td>Navigate to Advanced Analytics &amp; Heatmaps</td>
              </tr>
              <tr>
                <td><span class="shortcut-kbd">Q</span></td>
                <td>Navigate to Quote Vault</td>
              </tr>
              <tr>
                <td><span class="shortcut-kbd">G</span></td>
                <td>Navigate to Arcade Games Arena (Type Invaders &amp; Nitro Sprint)</td>
              </tr>
              <tr>
                <td><span class="shortcut-kbd">S</span></td>
                <td>Navigate to Settings &amp; Customization</td>
              </tr>
              <tr>
                <td><span class="shortcut-kbd">?</span></td>
                <td>Open this Shortcuts Help popup</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 20px; text-align: right;">
            <button id="shortcuts-done-btn" class="btn btn-primary btn-sm">Got it</button>
          </div>
        </div>
      `;
      document.body.appendChild(popup);

      const close = () => {
        popup.remove();
        previouslyFocused?.focus?.();
      };
      popup.addEventListener('click', (e) => {
        if (e.target === popup) close();
      });
      popup.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          close();
          return;
        }
        if (e.key !== 'Tab') return;
        const focusable = [...popup.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')];
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      });
      document.getElementById('shortcuts-close-btn')?.addEventListener('click', close);
      document.getElementById('shortcuts-done-btn')?.addEventListener('click', close);
      document.getElementById('shortcuts-close-btn')?.focus();
    }
  }
}
