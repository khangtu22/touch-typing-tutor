/**
 * Application Entry Point & Service Worker Registration
 * Bootstraps the UI, initializes sound hooks, registers offline PWA worker, and dev tools.
 */

import { store } from './state.js';
import { sound } from './sound-engine.js';
import { UIManager } from './ui.js';
import { goalsManager } from './goals-wellness.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Register PWA Service Worker for Offline Execution
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js?v=3.5.0')
      .then((reg) => {
        console.info('KeyFlow PWA Service Worker registered:', reg.scope);
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.warn('PWA Service Worker registration skipped:', err);
      });
  }

  // 2. Initialize Sound Engine on first user interaction
  const initAudio = () => {
    sound.init();
    sound.resume();
    window.removeEventListener('click', initAudio);
    window.removeEventListener('keydown', initAudio);
  };
  window.addEventListener('click', initAudio, { once: true });
  window.addEventListener('keydown', initAudio, { once: true });

  // 3. Initialize UI Manager
  const ui = new UIManager();
  ui.start();

  // 4. Initialize Wellness/Goals break timer if enabled
  goalsManager.syncBreakTimer();
  goalsManager.syncNotification();

  // 5. Developer Console Helpers
  window.resetTypingTutor = () => {
    store.resetAll();
    console.info('Typing Tutor state has been completely reset.');
    ui.navigateTo('onboarding');
    ui.renderOnboarding();
  };

  window.seedTypingTutorDemo = () => {
    store.seedDemo();
    console.info('Typing Tutor demo state loaded with Level 12, unlocked lessons, streak, and achievements.');
    ui.navigateTo('dashboard');
  };

  // 6. Unlock premium for dev testing
  window.unlockPremium = () => {
    store.update(prev => ({
      ...prev,
      settings: { ...prev.settings, isPremium: true }
    }));
    console.info('%c👑 Premium unlocked!', 'color: #FFB86B; font-weight: bold;');
    ui.navigateTo('dashboard');
  };

  console.info(
    '%c⌨️ KeyFlow v3.0 Premium Ready%c\nFeatures: Focus Mode, Zen Mode, Quote Vault, Goals, Theme Studio, Advanced Analytics & Multi-Language.',
    'color: #7C5CFC; font-weight: bold; font-size: 14px;',
    'color: #9AA3B2; font-size: 12px;'
  );
});
