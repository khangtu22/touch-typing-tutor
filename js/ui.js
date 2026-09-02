/**
 * UI & Screen Coordinator (Expanded Suite v3.0 — Premium Edition)
 * Manages view routing, Custom Arena, Ghost Racing HUD, Theme live switcher,
 * Multi-layout key remapping, JSON Backup & Restore, and all Premium Features:
 * Focus Mode, Zen Mode, Quote Vault, Goal Rings, Theme Studio, Advanced Analytics.
 */

import { store, getLevelProgress } from './state.js';
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
import { QUOTE_VAULT, MULTI_LANG_WORDS, getQuoteOfTheDay, getQuotesByFilter, getRandomQuote, generateLanguagePractice } from './premium-features.js';
import { ArcadeHubManager } from './arcade-games.js';

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
    this.isFocusModeActive = false;

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
      arcade: document.getElementById('screen-arcade')
    };

    this.toastContainer = document.getElementById('toast-container');
    this.confettiContainer = document.getElementById('confetti-container');

    // Navigation buttons
    this.navBrand = document.getElementById('nav-brand');
    this.navDashboardBtn = document.getElementById('nav-dashboard-btn');
    this.navArcadeBtn = document.getElementById('nav-arcade-btn');
    this.navCustomBtn = document.getElementById('nav-custom-btn');
    this.navProfileBtn = document.getElementById('nav-profile-btn');
    this.navSettingsBtn = document.getElementById('nav-settings-btn');
    this.navQuotesBtn = document.getElementById('nav-quotes-btn');
    this.navPremiumBtn = document.getElementById('nav-premium-btn');
    this.navShortcutsBtn = document.getElementById('nav-shortcuts-btn');

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
    if (this.navBrand) this.navBrand.addEventListener('click', () => this.navigateTo('dashboard'));
    if (this.navDashboardBtn) this.navDashboardBtn.addEventListener('click', () => this.navigateTo('dashboard'));
    if (this.navArcadeBtn) this.navArcadeBtn.addEventListener('click', () => this.navigateTo('arcade'));
    if (this.navCustomBtn) this.navCustomBtn.addEventListener('click', () => this.navigateTo('custom'));
    if (this.navProfileBtn) this.navProfileBtn.addEventListener('click', () => this.navigateTo('profile'));
    if (this.navSettingsBtn) this.navSettingsBtn.addEventListener('click', () => this.navigateTo('settings'));
    if (this.navQuotesBtn) this.navQuotesBtn.addEventListener('click', () => this.navigateTo('quotes'));
    if (this.navPremiumBtn) this.navPremiumBtn.addEventListener('click', () => this.navigateTo('settings'));
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

      // On the results / complete screen:
      // Enter advances to the next lesson; R retries the current lesson.
      if (this.activeScreen === 'results') {
        const target = e.target;
        const isInteractiveTarget = target?.closest?.(
          'input, textarea, select, [contenteditable="true"]'
        );

        if (!isInteractiveTarget && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (e.key === 'Enter' || e.code === 'NumpadEnter') {
            e.preventDefault();
            document.getElementById('results-next-btn')?.click();
            return;
          }
          if (e.key.toLowerCase() === 'r') {
            e.preventDefault();
            document.getElementById('results-retry-btn')?.click();
            return;
          }
        }
      }

      if (this.activeScreen === 'lesson') {
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

    window.addEventListener('resize', () => this.checkMobileRestriction());
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
    if (this.activeScreen === 'lesson' && screenName !== 'lesson') {
      typingEngine.destroy();
      ghostRacer.stopRace();
    }

    this.activeScreen = screenName;

    Object.entries(this.screens).forEach(([name, el]) => {
      if (el) {
        el.classList.toggle('screen-active', name === screenName);
      }
    });

    if (this.navDashboardBtn) this.navDashboardBtn.classList.toggle('nav-btn-active', screenName === 'dashboard');
    if (this.navArcadeBtn) this.navArcadeBtn.classList.toggle('nav-btn-active', screenName === 'arcade');
    if (this.navCustomBtn) this.navCustomBtn.classList.toggle('nav-btn-active', screenName === 'custom');
    if (this.navQuotesBtn) this.navQuotesBtn.classList.toggle('nav-btn-active', screenName === 'quotes');
    if (this.navProfileBtn) this.navProfileBtn.classList.toggle('nav-btn-active', screenName === 'profile');
    if (this.navSettingsBtn) this.navSettingsBtn.classList.toggle('nav-btn-active', screenName === 'settings');

    if (screenName === 'dashboard') this.renderDashboard();
    if (screenName === 'arcade') this.renderArcadeScreen();
    if (screenName === 'custom') this.renderCustomArena();
    if (screenName === 'quotes') this.renderQuoteVault();
    if (screenName === 'profile') this.renderProfile();
    if (screenName === 'settings') this.renderSettings();
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
    const premiumLabel = document.getElementById('nav-premium-label');
    const premiumBtn = document.getElementById('nav-premium-btn');

    if (levelBadge) levelBadge.textContent = `Lvl ${lvlInfo.currentLvl}`;
    if (xpText) xpText.textContent = `${state.xp.toLocaleString()} XP`;
    if (xpFill) xpFill.style.width = `${lvlInfo.pct}%`;
    if (streakCount) streakCount.textContent = `${state.dailyStreak}`;
    if (streakFlame) streakFlame.classList.toggle('flame-active', state.dailyStreak > 0);
    if (premiumLabel) premiumLabel.textContent = state.settings.isPremium ? 'PRO' : 'Free';
    if (premiumBtn) {
      premiumBtn.classList.toggle('premium-active', !!state.settings.isPremium);
      premiumBtn.title = state.settings.isPremium ? 'Premium Active (Click to configure)' : 'Upgrade to Premium (Click to unlock)';
    }
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

    // Goal Progress
    const goalProgress = goalsManager.getGoalProgress(state);

    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Hero Next Lesson Banner -->
        <div class="hero-lesson-card">
          <div class="hero-content">
            <div class="hero-badge-row">
              <span class="badge badge-accent">${currentLessonObj.levelTitle}</span>
              <span class="hero-lesson-number">Lesson ${currentLessonObj.id} of ${CURRICULUM.length}</span>
            </div>
            <h2 class="hero-title">${currentLessonObj.title}</h2>
            <p class="hero-subtitle">${currentLessonObj.subtitle}</p>
            <p class="hero-focus"><span>Focus</span> ${currentLessonObj.skillFocus}</p>
            <div class="hero-keys-preview">
              <span class="keys-label">Targets:</span>
              <span class="target-pill">${currentLessonObj.accuracyTarget}% accuracy</span>
              <span class="target-pill">${currentLessonObj.wpmTarget} WPM</span>
              <span class="target-pill">~${currentLessonObj.estimatedMinutes} min</span>
            </div>
          </div>
          <div class="hero-action" style="display: flex; flex-direction: column; gap: 10px; align-items: flex-end;">
            <button id="hero-start-btn" class="btn btn-primary btn-hero">
              <span>${currentLessonMastery.isMastered ? 'Keep Sharp' : currentLessonMastery.isPassed ? 'Master This Lesson' : currentLessonMastery.isAttempted ? 'Practice Again' : 'Continue Lesson'}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </button>
            <button id="dashboard-zen-btn" class="btn btn-outline btn-sm" style="display: flex; align-items: center; gap: 6px; border-color: rgba(124, 92, 252, 0.4); color: var(--text-primary);">
              <span>🧘 Zen Mode</span>
              <span style="font-size: 10px; opacity: 0.6; font-family: var(--font-mono); background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 3px;">Z</span>
            </button>
          </div>
        </div>

        <!-- Goals Progress Rings Section (if enabled or default) -->
        <div class="goals-rings-section" style="background: var(--surface-1); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">🎯</span>
              <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary);">Daily Goals &amp; Activity</h3>
            </div>
            <button id="configure-goals-btn" class="btn btn-sm" style="font-size: 11px; color: var(--text-secondary); cursor: pointer; text-decoration: underline;">Configure Goals →</button>
          </div>
          <div id="dashboard-goal-rings-container"></div>
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
              <span class="adaptive-focus-detail">${coach2 ? `Custom 5-Minute Targeted Conditioning` : escapeHtml(adaptiveFocus.detail)}</span>
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
            <span class="quote-of-day-author">— ${escapeHtml(qotd.author)}</span>
            <div class="widget-footer">
              <button id="qotd-practice-btn" class="btn btn-secondary btn-sm">Practice Quote →</button>
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
            <p class="widget-desc">${dailyChallenge.lesson.title}</p>
            <div class="widget-footer">
              ${dailyChallenge.isCompleted ? `
                <span class="completed-tag">✓ Completed Today (${dailyChallenge.bestWpm} WPM)</span>
              ` : `
                <button id="daily-challenge-btn" class="btn btn-secondary btn-sm">Start Challenge</button>
              `}
            </div>
          </div>

          <!-- Quick Stats Widget -->
          <div class="widget-card stats-overview-widget">
            <div class="widget-header">
              <div class="widget-title-group">
                <span class="widget-icon">📊</span>
                <h3 class="widget-title">Performance</h3>
              </div>
              <span class="badge badge-teal">${passedCount}/30 Passed</span>
            </div>
            <div class="stats-mini-grid">
              <div class="stat-mini-item">
                <span class="stat-mini-val">${state.bestWpm || 0}</span>
                <span class="stat-mini-lbl">Best WPM</span>
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
                <h4 class="mastery-queue-title">${nextReview.lesson.title}</h4>
                <p class="widget-desc">${nextReview.completion?.nextGoal || `Build toward ${nextReview.lesson.accuracyTarget}% accuracy and ${nextReview.lesson.wpmTarget} WPM.`}</p>
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
              <p class="section-subtitle">A guided path from first anchors to job-ready typing fluency</p>
            </div>
            <div class="roadmap-overview">
              <strong>${masteredCount}/${CURRICULUM.length}</strong>
              <span>lessons mastered</span>
              <div class="roadmap-overview-track"><span style="width: ${roadmapProgressPct}%"></span></div>
            </div>
          </div>

          <div class="levels-container">
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
                        <h3 class="level-group-title">${level.title}</h3>
                      </div>
                    </div>
                    <div class="level-progress-summary">
                      <strong>${levelMastered}/${levelLessons.length}</strong>
                      <span>${levelMastered === levelLessons.length ? 'Mastered' : 'Mastery'}</span>
                    </div>
                  </div>
                  <p class="level-group-description">${level.description}</p>
                  <div class="level-skill-row">
                    <span class="level-milestone">Milestone: ${level.milestone}</span>
                    <div class="level-skill-pills">${level.skills.map(skill => `<span>${skill}</span>`).join('')}</div>
                  </div>
                  <div class="level-progress-track"><span style="width: ${levelProgressPct}%"></span></div>
                  <div class="lessons-grid">
                    ${levelLessons.map(lesson => {
                      const completion = state.lessonCompletion?.[lesson.id];
                      const mastery = getLessonMastery(completion, state.starsByLesson?.[lesson.id]);
                      const isUnlocked = lesson.id <= currentLessonId || mastery.isAttempted;
                      const isCurrent = lesson.id === currentLessonId;
                      const stars = mastery.bestStars;
                      const keyPreview = lesson.keys.includes('all')
                        ? 'Full keyboard'
                        : lesson.keys.map(k => k === ' ' ? 'Space' : k.toUpperCase()).join(' ');
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
                             aria-label="Lesson ${lesson.id}: ${lesson.title}. ${statusLabel}."
                             data-lesson-id="${lesson.id}">
                          <div class="node-header">
                            <span class="node-num">${String(lesson.id).padStart(2, '0')}</span>
                            <span class="node-status">${mastery.isMastered ? '✦ Mastered' : mastery.isPassed ? '◐ Needs mastery' : mastery.isAttempted ? '↻ Practice again' : isCurrent ? '● Up next' : isUnlocked ? 'Available' : '🔒 Locked'}</span>
                            <div class="node-stars" aria-label="${stars} of 5 stars">
                              ${[1, 2, 3, 4, 5].map(star => `<span class="star-icon ${stars >= star ? 'star-filled' : ''}">★</span>`).join('')}
                            </div>
                          </div>
                          <h4 class="node-title">${lesson.title}</h4>
                          <p class="node-focus">${lesson.skillFocus}</p>
                          <p class="node-keys">${keyPreview}</p>
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
          </div>
        </div>
      </div>
    `;

    // Render Goal Progress Rings
    const goalRingsSlot = document.getElementById('dashboard-goal-rings-container');
    if (goalRingsSlot) {
      renderGoalRings(goalRingsSlot, goalProgress);
    }

    document.getElementById('configure-goals-btn')?.addEventListener('click', () => this.navigateTo('settings'));
    document.getElementById('dashboard-zen-btn')?.addEventListener('click', () => this.launchZenMode());
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
              <span class="badge ${store.getState().settings.isPremium ? 'badge-teal' : 'badge-amber'}">${store.getState().settings.isPremium ? '👑 Premium Active' : '👑 Premium Feature'}</span>
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
                const isLocked = !store.getState().settings.isPremium && lang.code !== 'en';
                return `
                  <div class="lang-option-card ${isSelected ? 'lang-active' : ''} ${isLocked ? 'lang-premium-locked' : ''}" data-lang="${lang.code}">
                    <span class="lang-flag">${lang.flag}</span>
                    <span class="lang-name">${lang.name}</span>
                    <span class="lang-native">${lang.native}</span>
                  </div>
                `;
              }).join('')}
            </div>

            ${!store.getState().settings.isPremium ? `
              <div class="premium-gate-notice" style="margin-top: 20px;">
                <span class="gate-icon">👑</span>
                <div style="flex: 1;">
                  <strong style="color: var(--reward-amber); font-size: 14px;">Multi-Language Practice is a Premium Feature</strong>
                  <p>Unlock Spanish, French, German, Italian, and Portuguese vocabulary drills with one click.</p>
                </div>
                <button id="unlock-premium-lang-btn" class="btn btn-primary btn-sm">Unlock Premium Free →</button>
              </div>
            ` : ''}

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
          const lesson = CustomPracticeManager.createLessonFromText(preset.title, preset.code);
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
        const isPrem = store.getState().settings.isPremium;
        if (!isPrem && lang !== 'en') {
          this.showToast('👑 Unlock Premium to access all 6 language vocabularies!', 'amber');
        }
        store.update(prev => ({
          ...prev,
          settings: { ...prev.settings, practiceLanguage: lang }
        }));
        this.renderCustomArena();
      });
    });

    document.getElementById('unlock-premium-lang-btn')?.addEventListener('click', () => {
      store.update(prev => ({
        ...prev,
        settings: { ...prev.settings, isPremium: true }
      }));
      this.showToast('👑 Premium unlocked! All languages and features are now active.', 'teal');
      this.renderCustomArena();
    });

    document.getElementById('start-lang-practice-btn')?.addEventListener('click', () => {
      const state = store.getState();
      const lang = state.settings.practiceLanguage || 'en';
      if (!state.settings.isPremium && lang !== 'en') {
        this.showToast('Please unlock Premium first to practice non-English languages.', 'amber');
        return;
      }
      const langLesson = generateLanguagePractice(lang);
      this.startLesson(langLesson);
    });
  }

  startQuotePractice(quote) {
    if (!quote) return;
    const lesson = CustomPracticeManager.createLessonFromText(`Quote: ${quote.author}`, quote.text);
    if (!lesson) return;
    lesson.id = `quote-${quote.id}`;
    lesson.quoteId = quote.id;
    lesson.quoteData = quote;
    lesson.category = quote.category;
    lesson.difficulty = quote.difficulty;
    lesson.isQuote = true;
    lesson.subtitle = `${quote.category ? quote.category.charAt(0).toUpperCase() + quote.category.slice(1) : 'Quote'} • ${quote.difficulty || 'standard'} length • ${quote.text.length} chars`;
    this.startLesson(lesson);
  }

  startRandomQuote(category = null, difficulty = null, excludeId = null) {
    const targetCat = category !== undefined ? category : this.activeQuoteCategory;
    const targetDiff = difficulty !== undefined ? difficulty : this.activeQuoteDifficulty;
    const quote = getRandomQuote(targetCat, targetDiff, excludeId);
    if (quote) {
      this.startQuotePractice(quote);
    } else {
      this.showToast('No quotes found matching filter.', 'amber');
    }
  }

  // ==========================================
  // QUOTE VAULT SCREEN
  // ==========================================
  renderQuoteVault() {
    const container = this.screens.quotes;
    if (!container) return;

    const quotes = getQuotesByFilter(this.activeQuoteCategory, this.activeQuoteDifficulty);
    const state = store.getState();
    const practicedList = state.quotesPracticed || [];

    container.innerHTML = `
      <div class="quote-vault-layout">
        <div class="quote-vault-header">
          <div>
            <h2 class="section-title">Quote Vault &amp; Classic Passages</h2>
            <p class="section-subtitle">Practice touch typing with 60+ curated public-domain literature, philosophy, code, and science excerpts</p>
          </div>
          <div class="quote-vault-header-actions">
            <span class="badge badge-accent">${practicedList.length} Quotes Practiced</span>
            <button id="start-random-quote-btn" class="btn btn-primary" title="Start a random quote from current filter or all quotes">
              <span>🎲 Practice Random Quote</span>
            </button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; background: var(--surface-1); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px;">
          <!-- Category Filter -->
          <div class="quote-filters">
            <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-right: 6px; align-self: center;">Category:</span>
            <button class="quote-filter-btn ${!this.activeQuoteCategory ? 'filter-active' : ''}" data-cat="all">All (${QUOTE_VAULT.length})</button>
            <button class="quote-filter-btn ${this.activeQuoteCategory === 'motivation' ? 'filter-active' : ''}" data-cat="motivation">⚡ Motivation</button>
            <button class="quote-filter-btn ${this.activeQuoteCategory === 'literature' ? 'filter-active' : ''}" data-cat="literature">📚 Literature</button>
            <button class="quote-filter-btn ${this.activeQuoteCategory === 'programming' ? 'filter-active' : ''}" data-cat="programming">💻 Programming</button>
            <button class="quote-filter-btn ${this.activeQuoteCategory === 'science' ? 'filter-active' : ''}" data-cat="science">🔬 Science</button>
            <button class="quote-filter-btn ${this.activeQuoteCategory === 'philosophy' ? 'filter-active' : ''}" data-cat="philosophy">🏛️ Philosophy</button>
          </div>

          <!-- Difficulty Filter -->
          <div class="quote-filters">
            <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-right: 6px; align-self: center;">Length:</span>
            <button class="quote-filter-btn ${!this.activeQuoteDifficulty ? 'filter-active' : ''}" data-diff="all">All Lengths</button>
            <button class="quote-filter-btn ${this.activeQuoteDifficulty === 'short' ? 'filter-active' : ''}" data-diff="short">⚡ Short (&lt;80)</button>
            <button class="quote-filter-btn ${this.activeQuoteDifficulty === 'medium' ? 'filter-active' : ''}" data-diff="medium">📖 Medium (80-200)</button>
            <button class="quote-filter-btn ${this.activeQuoteDifficulty === 'long' ? 'filter-active' : ''}" data-diff="long">📜 Long (200+)</button>
          </div>
        </div>

        <div class="quotes-grid">
          ${quotes.map(q => {
            const isPracticed = practicedList.includes(q.id);
            return `
              <div class="quote-card ${isPracticed ? 'quote-practiced' : ''}" data-quote-id="${q.id}">
                <div class="quote-card-top">
                  <span class="quote-category-badge quote-cat-${q.category}">${q.category}</span>
                  <span class="quote-difficulty-dot">${q.difficulty} · ${q.text.length} chars</span>
                </div>
                <blockquote class="quote-text">${escapeHtml(q.text)}</blockquote>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 8px;">
                  <span class="quote-author">${escapeHtml(q.author)}</span>
                  <button class="btn btn-secondary btn-sm start-quote-btn" data-quote-id="${q.id}">
                    ${isPracticed ? '✓ Practice Again' : 'Practice Quote →'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Start Random Quote button
    container.querySelector('#start-random-quote-btn')?.addEventListener('click', () => {
      this.startRandomQuote(this.activeQuoteCategory, this.activeQuoteDifficulty);
    });

    // Filter clicks
    container.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.cat;
        this.activeQuoteCategory = cat === 'all' ? null : cat;
        this.renderQuoteVault();
      });
    });

    container.querySelectorAll('[data-diff]').forEach(btn => {
      btn.addEventListener('click', () => {
        const diff = btn.dataset.diff;
        this.activeQuoteDifficulty = diff === 'all' ? null : diff;
        this.renderQuoteVault();
      });
    });

    // Start Quote Practice (button click)
    container.querySelectorAll('.start-quote-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.quoteId, 10);
        const quote = QUOTE_VAULT.find(q => q.id === id);
        if (quote) {
          this.startQuotePractice(quote);
        }
      });
    });

    // Start Quote Practice (card click)
    container.querySelectorAll('.quote-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.start-quote-btn')) return;
        const id = parseInt(card.dataset.quoteId, 10);
        const quote = QUOTE_VAULT.find(q => q.id === id);
        if (quote) {
          this.startQuotePractice(quote);
        }
      });
    });
  }

  // ==========================================
  // LESSON SCREEN & RACING HUD
  // ==========================================
  startLesson(lessonData) {
    this.currentLessonData = lessonData;
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
        onKeyClick: (char, code) => {
          if (typingEngine.isActive) {
            typingEngine.handleKeyDown({ key: char, code, preventDefault: () => {} });
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
    if (this.lessonTitleEl) this.lessonTitleEl.textContent = data.lesson.title;
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
      if (this.typingTextDisplay) this.typingTextDisplay.innerHTML = '';
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

      let charSpan = '';
      if (i < currentIndex) {
        if (stateObj && stateObj.status === 'incorrect') {
          charSpan = `<span class="char-token char-incorrect${spaceClass}" data-expected="${escapeHtml(char)}" title="Mistyped: '${stateObj.typed}' (expected '${char}')">${displayChar}</span>`;
        } else if (isCharMistyped) {
          charSpan = `<span class="char-token char-word-error${spaceClass}" title="Corrected character">${displayChar}</span>`;
        } else {
          charSpan = `<span class="char-token char-correct${spaceClass}">${displayChar}</span>`;
        }
      } else if (i === currentIndex) {
        charSpan = `<span class="char-token char-current${spaceClass}"><span class="char-caret"></span>${displayChar}</span>`;
      } else {
        charSpan = `<span class="char-token char-upcoming${spaceClass}">${displayChar}</span>`;
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
    }

    if (zenMode.isActive) {
      zenMode.renderText(html);
    }
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
    ghostRacer.stopRace();
    document.body.classList.remove('blind-mode-active');

    if (zenMode.isActive) {
      zenMode.exit();
    }

    if (this.isFocusModeActive) {
      summary.inFocusMode = true;
    }

    if (summary.isPlacementTest) {
      summary.placementRecommendation = getPlacementRecommendation(summary);
    }

    // Record premium data tracking
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
      inFocusMode: !!this.isFocusModeActive
    });

    if (!summary.isPlacementTest && summary.lessonId === 'daily-challenge') {
      StreakEngine.recordDailyChallengeCompletion(store, {
        wpm: summary.wpm,
        accuracy: summary.accuracy
      });
    }

    const unlockedAchievements = summary.isPlacementTest ? [] : AchievementEngine.evaluate(store, summary);
    unlockedAchievements.forEach(ach => {
      this.showToast(`🏆 Achievement Unlocked: ${ach.title}!`, 'amber');
    });

    sound.playLessonComplete(summary.stars);
    if (!summary.isPlacementTest && summary.mastery?.isPassed) {
      this.triggerConfetti();
    }

    this.renderResults(summary);
    this.navigateTo('results');
  }

  toggleLessonPause() {
    if (typingEngine.isPaused) {
      typingEngine.resume();
      this.hidePauseModal();
    } else {
      typingEngine.pause();
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
            <button id="exit-lesson-btn" class="btn btn-secondary">Exit to Dashboard</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('resume-lesson-btn')?.addEventListener('click', () => this.toggleLessonPause());
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

    const state = store.getState();
    const lvlInfo = getLevelProgress(state.xp);
    const recommendations = AnalyticsEngine.generateSmartRecommendations(summary, state.keyStats);
    const mastery = summary.mastery || {
      stars: summary.stars,
      isPassed: summary.stars >= 3,
      isMastered: summary.stars >= 4,
      isPerfected: summary.stars >= 5,
      nextGoal: `Reach ${summary.accuracyTarget}% accuracy and ${summary.wpmTarget} WPM`
    };
    const isCurriculumLesson = Number.isInteger(summary.lessonId)
      && summary.lessonId >= 1
      && summary.lessonId <= CURRICULUM.length;
    const isQuoteLesson = !!summary.isQuote || !!summary.quoteId || !!this.currentLessonData?.isQuote || !!this.currentLessonData?.quoteId;
    const isFinalCurriculumLesson = isCurriculumLesson && summary.lessonId === CURRICULUM.length;
    const resultTitle = summary.isPlacementTest
      ? 'Skill Check Complete!'
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
      ? `${summary.placementRecommendation?.message || 'Your next starting point is ready.'} • +${summary.xpEarned} XP Earned`
      : `${summary.lessonTitle} • +${summary.xpEarned} XP Earned`;
    const primaryActionLabel = summary.isPlacementTest
      ? `Start Lesson ${summary.placementRecommendation?.lessonId || 1} →`
      : isQuoteLesson
        ? 'Next Random Quote →'
        : isCurriculumLesson && !mastery.isPassed
          ? 'Practice Again →'
          : isFinalCurriculumLesson && mastery.isPassed
            ? 'View Mastery Plan →'
            : isCurriculumLesson && mastery.isPassed
              ? 'Next Lesson →'
              : 'Back to Curriculum →';
    const retryActionLabel = isQuoteLesson ? 'Replay Quote (R)' : 'Retry Lesson (R)';
    const backActionLabel = isQuoteLesson ? 'Back to Quote Vault' : 'Back to Dashboard';

    container.innerHTML = `
      <div class="results-layout">
        <div class="results-hero-card">
          <div class="results-stars-row">
            ${[1, 2, 3, 4, 5].map(star => `<span class="result-star ${mastery.stars >= star ? 'star-awarded' : ''}">★</span>`).join('')}
          </div>
          <h2 class="results-title">${resultTitle}</h2>
          <p class="results-subtitle">${resultSubtitle}</p>

          <div class="results-metrics-grid">
            <div class="result-metric-card">
              <span class="metric-val">${summary.wpm}</span>
              <span class="metric-lbl">WPM Speed</span>
              <span class="metric-target ${summary.wpm >= summary.wpmTarget ? 'target-met' : ''}">Target: ${summary.wpmTarget} WPM</span>
            </div>
            <div class="result-metric-card">
              <span class="metric-val">${summary.accuracy}%</span>
              <span class="metric-lbl">Accuracy</span>
              <span class="metric-target ${summary.accuracy >= summary.accuracyTarget ? 'target-met' : ''}">Target: ${summary.accuracyTarget}%</span>
            </div>
            <div class="result-metric-card">
              <span class="metric-val">${summary.maxCombo} 🔥</span>
              <span class="metric-lbl">Max Combo</span>
              <span class="metric-target">${summary.totalErrors} Errors</span>
            </div>
            <div class="result-metric-card">
              <span class="metric-val">${Math.round(summary.durationSec)}s</span>
              <span class="metric-lbl">Practice Time</span>
              <span class="metric-target">${summary.totalKeystrokes} Keystrokes</span>
            </div>
          </div>
        </div>

        <div class="results-mastery-card ${summary.isPlacementTest ? 'placement-result' : mastery.isMastered ? 'mastered-result' : 'review-result'}">
          ${summary.isPlacementTest ? `
            <div class="mastery-result-icon">🗺️</div>
            <div>
              <span class="mastery-result-kicker">Recommended starting point</span>
              <h3>Lesson ${summary.placementRecommendation?.lessonId || 1}: ${summary.placementRecommendation?.label || 'Home Row Foundations'}</h3>
              <p>Lessons before this point are available to explore, but none are marked as mastered until you earn the stars.</p>
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
            <span class="card-badge">Session Cadence</span>
          </div>
          <div class="sparkline-wrapper">
            ${AnalyticsEngine.renderWpmSparklineSvg(summary.wpmHistory)}
          </div>
        </div>

        <div class="results-feedback-grid">
          ${recommendations.map(rec => `
            <div class="recommendation-card">
              <div class="rec-header">
                <span class="rec-icon">💡</span>
                <h4 class="rec-title">${rec.title}</h4>
              </div>
              <p class="rec-message">${rec.message}</p>
              ${rec.actionLabel && rec.keys ? `
                <button class="btn btn-secondary btn-sm rec-btn" data-keys="${rec.keys.join(',')}">${rec.actionLabel}</button>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <div class="results-xp-card">
          <div class="xp-row">
            <span><strong>Level ${lvlInfo.currentLvl}</strong> • ${lvlInfo.title}</span>
            <span>${state.xp.toLocaleString()} / ${lvlInfo.nextLvlXp.toLocaleString()} XP</span>
          </div>
          <div class="xp-bar-track">
            <div class="xp-bar-fill" style="width: ${lvlInfo.pct}%"></div>
          </div>
        </div>

        <div class="results-actions">
          <button id="results-next-btn" class="btn btn-primary btn-large">${primaryActionLabel} (Enter ↵)</button>
          <button id="results-retry-btn" class="btn btn-secondary">${retryActionLabel}</button>
          <button id="results-dashboard-btn" class="btn btn-outline">${backActionLabel}</button>
        </div>
      </div>
    `;

    document.getElementById('results-next-btn')?.addEventListener('click', () => {
      if (summary.isPlacementTest) {
        const recommendedId = summary.placementRecommendation?.lessonId || 1;
        const recommendedLesson = CURRICULUM.find(lesson => lesson.id === recommendedId) || CURRICULUM[0];
        this.startLesson(recommendedLesson);
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

      // The primary result action is deliberately mastery-aware. A learner
      // who misses either core target returns to the same lesson; successful
      // runs advance one step, never silently skip curriculum content.
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
      if (isQuoteLesson) {
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
  }

  // ==========================================
  // PROFILE & HEATMAP SCREEN
  // ==========================================
  renderProfile() {
    const container = this.screens.profile;
    if (!container) return;

    const state = store.getState();
    const lvlInfo = getLevelProgress(state.xp);
    const fingerMastery = AnalyticsEngine.getFingerMastery(state.keyStats);
    const totalMins = Math.round((state.totalPracticeTimeSec || 0) / 60);

    container.innerHTML = `
      <div class="profile-layout">
        <div class="profile-hero-card">
          <div class="avatar-circle">⌨️</div>
          <div class="profile-info">
            <div style="display: flex; align-items: center; gap: 10px;">
              <h2 class="profile-name">Touch Typist</h2>
              <span class="premium-crown" style="font-size: 11px;">👑 ${state.settings.isPremium ? 'PRO Master' : 'Free Tier'}</span>
            </div>
            <p class="profile-level-badge">Level ${lvlInfo.currentLvl} • ${lvlInfo.title}</p>
            <div class="profile-xp-bar-track">
              <div class="profile-xp-bar-fill" style="width: ${lvlInfo.pct}%"></div>
            </div>
            <span class="profile-xp-sub">${state.xp.toLocaleString()} Total XP (${lvlInfo.progressXp} / ${lvlInfo.neededXp} to Level ${lvlInfo.currentLvl + 1})</span>
          </div>
        </div>

        <!-- Advanced Analytics Dashboard Slot (Canvas Trend Charts, Finger Trends, Session History, CSV Export) -->
        <div id="advanced-analytics-slot"></div>

        <div class="lifetime-stats-grid">
          <div class="stat-card">
            <span class="stat-icon">⚡</span>
            <span class="stat-number">${state.bestWpm || 0}</span>
            <span class="stat-name">Best WPM</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon">📈</span>
            <span class="stat-number">${state.averageWpm || 0}</span>
            <span class="stat-name">Average WPM</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon">🎯</span>
            <span class="stat-number">${state.bestAccuracy || 100}%</span>
            <span class="stat-name">Best Accuracy</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon">🔥</span>
            <span class="stat-number">${state.dailyStreak} Days</span>
            <span class="stat-name">Current Streak</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon">⏱️</span>
            <span class="stat-number">${totalMins}m</span>
            <span class="stat-name">Practice Time</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon">⌨️</span>
            <span class="stat-number">${(state.totalKeystrokes || 0).toLocaleString()}</span>
            <span class="stat-name">Total Keystrokes</span>
          </div>
        </div>

        <div class="profile-section-card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Keyboard Accuracy Heatmap</h3>
              <p class="card-subtitle">Visual accuracy performance breakdown per physical key</p>
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

        <div class="profile-section-card">
          <div class="card-header">
            <div>
              <h3 class="card-title">10-Finger Muscle Memory Mastery</h3>
              <p class="card-subtitle">Independent accuracy rating per typing finger</p>
            </div>
          </div>
          <div class="finger-mastery-grid">
            ${fingerMastery.map(f => `
              <div class="finger-mastery-item">
                <div class="finger-mastery-head">
                  <span class="finger-dot" style="background: ${f.finger.color}"></span>
                  <span class="finger-title">${f.finger.name}</span>
                  <span class="finger-acc">${f.accuracy}%</span>
                </div>
                <div class="finger-bar-track">
                  <div class="finger-bar-fill" style="width: ${f.accuracy}%; background: ${f.finger.color}"></div>
                </div>
                <span class="finger-attempts">${f.totalAttempts} strokes</span>
              </div>
            `).join('')}
          </div>
        </div>

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
      renderAdvancedAnalyticsDashboard(analyticsSlot, state);
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
        this.renderProfileScreen();
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
              <p class="setting-desc">Keep typing on mistakes. Requires deleting errors with Backspace before completing the word. Mistyped words are marked in yellow.</p>
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

        <!-- 9. Premium Membership Management -->
        <div class="settings-group-card" style="border: 1px solid rgba(255, 184, 107, 0.3); background: linear-gradient(135deg, rgba(255,184,107,0.04), rgba(124,92,252,0.04));">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">👑</span>
                <h3 class="group-title" style="margin: 0; color: var(--reward-amber);">KeyFlow Premium Status</h3>
              </div>
              <p class="setting-desc" style="margin-top: 4px;">
                ${settings.isPremium ? 'All premium features unlocked (Quote Vault, Zen Mode, Multi-Language, Theme Studio, Advanced Analytics).' : 'Unlock multi-language vocabularies, ambient soundscapes, and advanced customization.'}
              </p>
            </div>
            <button id="toggle-premium-mode-btn" class="btn ${settings.isPremium ? 'btn-secondary' : 'btn-primary'} btn-sm">
              ${settings.isPremium ? 'Active (PRO)' : 'Unlock Premium Free →'}
            </button>
          </div>
        </div>

        <!-- 10. Data Portability (Backup & Restore) -->
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

        <!-- 11. Danger Zone -->
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
        if (!granted) {
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
      if (enabled) {
        goalsManager.startBreakTimer();
        this.showToast('🧘 Ergonomic break reminders enabled.', 'teal');
      } else {
        goalsManager.stopBreakTimer();
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

    // Premium Mode Toggle
    document.getElementById('toggle-premium-mode-btn')?.addEventListener('click', () => {
      const current = !!store.getState().settings.isPremium;
      store.update(prev => ({
        ...prev,
        settings: { ...prev.settings, isPremium: !current }
      }));
      this.showToast(!current ? '👑 Premium features unlocked!' : 'Switched to Free Tier.', 'teal');
      this.renderSettings();
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
  launchZenMode() {
    const qotd = getQuoteOfTheDay();
    const zenLesson = CustomPracticeManager.createLessonFromText(`Zen: ${qotd.author}`, qotd.text);
    zenLesson.isZen = true;

    this.startLesson(zenLesson);

    zenMode.enter((e) => {
      sound.resume();
      if (this.activeScreen === 'lesson' && typingEngine.isActive) {
        if (this.keyboardRenderer) {
          this.keyboardRenderer.triggerPhysicalPress(e.code);
        }
        typingEngine.handleKeyDown(e);
      }
    });

    if (zenLesson.rounds && zenLesson.rounds[0]) {
      this.renderTypingText(zenLesson.rounds[0], 0);
    }

    // Auto-start ambient soundscape (e.g. rain)
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
    this.showToast('🧘 Entering Zen Mode. Press Esc anytime to exit.', 'teal');
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
      exitBadge.innerHTML = `<span>Focus Mode Active</span> <span class="kbd">Esc</span>`;
      exitBadge.addEventListener('click', () => this.exitFocusMode());
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
      popup.innerHTML = `
        <div class="shortcuts-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--text-primary);">⌨️ Keyboard Shortcuts</h3>
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

      const close = () => popup.remove();
      popup.addEventListener('click', (e) => {
        if (e.target === popup) close();
      });
      document.getElementById('shortcuts-close-btn')?.addEventListener('click', close);
      document.getElementById('shortcuts-done-btn')?.addEventListener('click', close);
    }
  }
}

