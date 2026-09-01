/**
 * UI & Screen Coordinator (Expanded Suite)
 * Manages view routing, Custom Arena, Ghost Racing HUD, Theme live switcher,
 * Multi-layout key remapping, and JSON Backup & Restore.
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
import { FINGERS } from './finger-mapping.js';
import { ghostRacer } from './ghost-racer.js';
import { CODE_PRESETS, createPlacementLesson, CustomPracticeManager } from './custom-practice.js';
import { LAYOUTS } from './layouts.js';
import { getLessonMastery, getPlacementRecommendation, getReviewQueue } from './mastery.js';

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
    this.currentLessonData = null;
    this.currentSessionSummary = null;
    this.activeArenaTab = 'code'; // 'paste' | 'code' | 'sprint'

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
      settings: document.getElementById('screen-settings')
    };

    this.toastContainer = document.getElementById('toast-container');
    this.confettiContainer = document.getElementById('confetti-container');

    // Navigation buttons
    this.navBrand = document.getElementById('nav-brand');
    this.navDashboardBtn = document.getElementById('nav-dashboard-btn');
    this.navCustomBtn = document.getElementById('nav-custom-btn');
    this.navProfileBtn = document.getElementById('nav-profile-btn');
    this.navSettingsBtn = document.getElementById('nav-settings-btn');

    // Lesson Screen HUD elements
    this.lessonTitleEl = document.getElementById('hud-lesson-title');
    this.lessonRoundEl = document.getElementById('hud-lesson-round');
    this.lessonProgressFill = document.getElementById('hud-progress-fill');
    this.hudWpmEl = document.getElementById('hud-wpm');
    this.hudAccuracyEl = document.getElementById('hud-accuracy');
    this.hudComboEl = document.getElementById('hud-combo');
    this.hudComboWrapper = document.getElementById('hud-combo-wrapper');
    this.typingTextDisplay = document.getElementById('typing-text-display');
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
    if (this.navCustomBtn) this.navCustomBtn.addEventListener('click', () => this.navigateTo('custom'));
    if (this.navProfileBtn) this.navProfileBtn.addEventListener('click', () => this.navigateTo('profile'));
    if (this.navSettingsBtn) this.navSettingsBtn.addEventListener('click', () => this.navigateTo('settings'));

    // Global Keydown Handler
    window.addEventListener('keydown', (e) => {
      sound.resume();

      if (e.key === 'Escape' && this.activeScreen === 'lesson') {
        e.preventDefault();
        this.toggleLessonPause();
        return;
      }

      // On the results screen, Enter advances to the next lesson unless the
      // user is already interacting with a specific control.
      if (this.activeScreen === 'results' && (e.key === 'Enter' || e.code === 'NumpadEnter')) {
        const target = e.target;
        const isInteractiveTarget = target?.closest?.(
          'button, a, input, textarea, select, [contenteditable="true"]'
        );

        if (!isInteractiveTarget) {
          e.preventDefault();
          document.getElementById('results-next-btn')?.click();
        }
        return;
      }

      if (this.activeScreen === 'lesson' && typingEngine.isActive) {
        if (this.keyboardRenderer) {
          this.keyboardRenderer.triggerPhysicalPress(e.code);
        }
        typingEngine.handleKeyDown(e);
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

      // Themes
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
    if (this.navCustomBtn) this.navCustomBtn.classList.toggle('nav-btn-active', screenName === 'custom');
    if (this.navProfileBtn) this.navProfileBtn.classList.toggle('nav-btn-active', screenName === 'profile');
    if (this.navSettingsBtn) this.navSettingsBtn.classList.toggle('nav-btn-active', screenName === 'settings');

    if (screenName === 'dashboard') this.renderDashboard();
    if (screenName === 'custom') this.renderCustomArena();
    if (screenName === 'profile') this.renderProfile();
    if (screenName === 'settings') this.renderSettings();
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
          previewHand.highlightFinger('left-index');
          setTimeout(() => previewHand.highlightFinger('right-index'), 1200);
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
    const adaptiveFocus = AnalyticsEngine.getAdaptiveFocus({
      keyStats: state.keyStats,
      currentLesson: currentLessonObj,
      lessonCompletion: state.lessonCompletion
    });
    const adaptiveFocusKeys = adaptiveFocus.keys?.map(key => key === ' ' ? 'Space' : key.toUpperCase()) || [];

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
          <div class="hero-action">
            <button id="hero-start-btn" class="btn btn-primary btn-hero">
              <span>${currentLessonMastery.isMastered ? 'Keep Sharp' : currentLessonMastery.isPassed ? 'Master This Lesson' : currentLessonMastery.isAttempted ? 'Practice Again' : 'Continue Lesson'}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </button>
          </div>
        </div>

        <!-- Dashboard Widgets Grid -->
        <div class="dashboard-widgets-grid">
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

          <!-- Adaptive Focus Widget -->
          <div class="widget-card adaptive-focus-widget">
            <div class="widget-header">
              <div class="widget-title-group">
                <span class="widget-icon">${escapeHtml(adaptiveFocus.icon)}</span>
                <h3 class="widget-title">Adaptive Focus</h3>
              </div>
              <span class="badge badge-accent">Recommended</span>
            </div>
            <div class="adaptive-focus-body">
              <span class="adaptive-focus-eyebrow">${escapeHtml(adaptiveFocus.eyebrow)}</span>
              <h4 class="adaptive-focus-title">${escapeHtml(adaptiveFocus.title)}</h4>
              <p class="widget-desc">${escapeHtml(adaptiveFocus.message)}</p>
              ${adaptiveFocusKeys.length > 0 ? `
                <div class="adaptive-focus-keys" aria-label="Keys to practice">
                  ${adaptiveFocusKeys.map(key => `<span>${escapeHtml(key)}</span>`).join('')}
                </div>
              ` : ''}
              <span class="adaptive-focus-detail">${escapeHtml(adaptiveFocus.detail)}</span>
            </div>
            <div class="widget-footer">
              <button id="adaptive-focus-btn" class="btn btn-secondary btn-sm">${escapeHtml(adaptiveFocus.actionLabel)} →</button>
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

    document.getElementById('hero-start-btn')?.addEventListener('click', () => this.startLesson(currentLessonObj));
    document.getElementById('daily-challenge-btn')?.addEventListener('click', () => this.startLesson(dailyChallenge.lesson));
    document.getElementById('mastery-review-btn')?.addEventListener('click', () => {
      if (nextReview?.lesson) this.startLesson(nextReview.lesson);
    });
    document.getElementById('placement-test-btn')?.addEventListener('click', () => {
      this.startLesson(createPlacementLesson());
    });
    document.getElementById('adaptive-focus-btn')?.addEventListener('click', () => {
      if (adaptiveFocus.type === 'weak-keys') {
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
    const raceStatus = ghostRacer.update(data.progressPct);
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

    this.renderTypingText(data.currentText, data.charIndex);

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

  renderTypingText(text, currentIndex) {
    if (!this.typingTextDisplay) return;

    let html = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const displayChar = char === ' ' ? '&nbsp;' : char;

      if (i < currentIndex) {
        html += `<span class="char-token char-correct">${displayChar}</span>`;
      } else if (i === currentIndex) {
        html += `<span class="char-token char-current"><span class="char-caret"></span>${displayChar}</span>`;
      } else {
        html += `<span class="char-token char-upcoming">${displayChar}</span>`;
      }
    }

    this.typingTextDisplay.innerHTML = html;
  }

  handleTypingError(data) {
    if (this.keyboardRenderer) {
      this.keyboardRenderer.triggerError(data.typedKey);
    }

    const currentCharEl = this.typingTextDisplay?.querySelector('.char-current');
    if (currentCharEl) {
      currentCharEl.classList.add('char-error-shake');
      setTimeout(() => currentCharEl.classList.remove('char-error-shake'), 250);
    }
  }

  handleRoundFinished(data) {
    this.showToast(`Round ${data.roundIdx + 1} Complete! Press Enter for the next round.`, 'teal');
  }

  handleLessonFinished(summary) {
    this.currentSessionSummary = summary;
    ghostRacer.stopRace();
    document.body.classList.remove('blind-mode-active');

    if (summary.isPlacementTest) {
      summary.placementRecommendation = getPlacementRecommendation(summary);
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
      placementRecommendation: summary.placementRecommendation
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
    const isFinalCurriculumLesson = isCurriculumLesson && summary.lessonId === CURRICULUM.length;
    const resultTitle = summary.isPlacementTest
      ? 'Skill Check Complete!'
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
      : isCurriculumLesson && !mastery.isPassed
        ? 'Practice Again →'
        : isFinalCurriculumLesson && mastery.isPassed
          ? 'View Mastery Plan →'
          : isCurriculumLesson && mastery.isPassed
            ? 'Next Lesson →'
            : 'Back to Curriculum →';

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
          <button id="results-next-btn" class="btn btn-primary btn-large">${primaryActionLabel}</button>
          <button id="results-retry-btn" class="btn btn-secondary">Retry Lesson</button>
          <button id="results-dashboard-btn" class="btn btn-outline">Back to Dashboard</button>
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
      const lesson = CURRICULUM.find(l => l.id === summary.lessonId) || this.currentLessonData;
      if (lesson) this.startLesson(lesson);
    });

    document.getElementById('results-dashboard-btn')?.addEventListener('click', () => {
      this.navigateTo('dashboard');
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
            <h2 class="profile-name">Touch Typist</h2>
            <p class="profile-level-badge">Level ${lvlInfo.currentLvl} • ${lvlInfo.title}</p>
            <div class="profile-xp-bar-track">
              <div class="profile-xp-bar-fill" style="width: ${lvlInfo.pct}%"></div>
            </div>
            <span class="profile-xp-sub">${state.xp.toLocaleString()} Total XP (${lvlInfo.progressXp} / ${lvlInfo.neededXp} to Level ${lvlInfo.currentLvl + 1})</span>
          </div>
        </div>

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
              <span class="legend-item"><span class="legend-box poor"></span> Needs Practice (&lt;80%)</span>
              <span class="legend-item"><span class="legend-box improving"></span> Improving (80-89%)</span>
              <span class="legend-item"><span class="legend-box good"></span> Good (90-96%)</span>
              <span class="legend-item"><span class="legend-box mastered"></span> Mastered (97%+)</span>
            </div>
          </div>
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
              <p class="card-subtitle">Unlock badges through dedication, accuracy, and speed</p>
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
                    <span class="ach-status">${isUnlocked ? '✓ Unlocked' : '🔒 Locked'}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    const heatmapContainer = document.getElementById('profile-heatmap-container');
    if (heatmapContainer) {
      const kb = new KeyboardRenderer(heatmapContainer, { interactive: false, layoutId: state.settings.layout || 'qwerty' });
      kb.applyHeatmap(state.keyStats);
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
            <div class="theme-card-option ${settings.theme === 'dark' ? 'theme-active' : ''}" data-theme="dark">
              <div class="theme-preview-palette">
                <span class="palette-dot" style="background: #0F1117"></span>
                <span class="palette-dot" style="background: #191E2C"></span>
                <span class="palette-dot" style="background: #7C5CFC"></span>
              </div>
              <span class="theme-name">Dark Flow</span>
            </div>

            <div class="theme-card-option ${settings.theme === 'retro' ? 'theme-active' : ''}" data-theme="retro">
              <div class="theme-preview-palette">
                <span class="palette-dot" style="background: #282A30"></span>
                <span class="palette-dot" style="background: #D8D2C2"></span>
                <span class="palette-dot" style="background: #FF8C00"></span>
              </div>
              <span class="theme-name">Retro 1984</span>
            </div>

            <div class="theme-card-option ${settings.theme === 'cyberpunk' ? 'theme-active' : ''}" data-theme="cyberpunk">
              <div class="theme-preview-palette">
                <span class="palette-dot" style="background: #090114"></span>
                <span class="palette-dot" style="background: #00F0FF"></span>
                <span class="palette-dot" style="background: #FF007F"></span>
              </div>
              <span class="theme-name">Cyberpunk</span>
            </div>

            <div class="theme-card-option ${settings.theme === 'botanical' ? 'theme-active' : ''}" data-theme="botanical">
              <div class="theme-preview-palette">
                <span class="palette-dot" style="background: #0B170E"></span>
                <span class="palette-dot" style="background: #172D1E"></span>
                <span class="palette-dot" style="background: #52B788"></span>
              </div>
              <span class="theme-name">Botanical</span>
            </div>

            <div class="theme-card-option ${settings.theme === 'tokyo' ? 'theme-active' : ''}" data-theme="tokyo">
              <div class="theme-preview-palette">
                <span class="palette-dot" style="background: #1A1B26"></span>
                <span class="palette-dot" style="background: #202436"></span>
                <span class="palette-dot" style="background: #BB9AF7"></span>
              </div>
              <span class="theme-name">Tokyo Night</span>
            </div>
          </div>
        </div>

        <!-- 2. Audio & Switch Sound Profiles -->
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

        <!-- 3. Metronome & Cadence Rhythm -->
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

        <!-- 4. Keyboard Layouts & Hardcore Modes -->
        <div class="settings-group-card">
          <h3 class="group-title">Keyboard Layout & Training Modes</h3>
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
              <label class="setting-label">Sudden Death Mode</label>
              <p class="setting-desc">A single mistake immediately restarts the current round</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-suddendeath-toggle" ${settings.suddenDeath ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- 5. Ghost Racer Competitors -->
        <div class="settings-group-card">
          <h3 class="group-title">Ghost Racer & Bot Competitors</h3>
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

        <!-- 6. Data Portability (Backup & Restore) -->
        <div class="settings-group-card">
          <h3 class="group-title">Data Backup & Restore</h3>
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

        <!-- 7. Danger Zone -->
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

    // Theme selector
    container.querySelectorAll('.theme-card-option').forEach(card => {
      card.addEventListener('click', () => {
        const theme = card.dataset.theme;
        store.update(prev => ({
          ...prev,
          settings: { ...prev.settings, theme }
        }));
        this.renderSettings();
      });
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

    // Blind & Sudden Death
    document.getElementById('setting-blind-toggle')?.addEventListener('change', (e) => {
      store.update(prev => ({
        ...prev,
        settings: { ...prev.settings, blindMode: e.target.checked }
      }));
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
}
