/**
 * Mastery rules shared by the typing engine, state store, and dashboard.
 * A lesson can be passed without being mastered; this keeps progression
 * encouraging while giving learners a meaningful reason to revisit skills.
 */

export const MAX_MASTERY_STARS = 5;
export const PASSING_STARS = 3;
export const MASTERED_STARS = 4;
export const PERFECT_STARS = 5;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function calculateMastery({
  accuracy = 0,
  wpm = 0,
  accuracyTarget = 90,
  wpmTarget = 15,
  totalErrors = 0,
  totalKeystrokes = 0
} = {}) {
  const targetAccuracy = clamp(Number(accuracyTarget) || 90, 1, 100);
  const targetWpm = Math.max(1, Number(wpmTarget) || 15);
  const precisionTarget = Math.max(96, targetAccuracy + 2);
  const cleanErrorLimit = Math.max(1, Math.floor(Math.max(1, totalKeystrokes) * 0.01));
  const perfectSpeedTarget = Math.ceil(targetWpm * 1.15);

  let stars = 1;
  if (accuracy >= targetAccuracy) stars = 2;
  if (accuracy >= targetAccuracy && wpm >= targetWpm) stars = PASSING_STARS;
  if (accuracy >= precisionTarget && wpm >= targetWpm && totalErrors <= cleanErrorLimit) {
    stars = MASTERED_STARS;
  }
  if (accuracy >= 99 && wpm >= perfectSpeedTarget && totalErrors === 0) {
    stars = PERFECT_STARS;
  }

  let nextGoal = `Reach ${targetAccuracy}% accuracy`;
  if (accuracy >= targetAccuracy && wpm < targetWpm) {
    nextGoal = `Reach ${targetWpm} WPM while keeping ${targetAccuracy}% accuracy`;
  } else if (stars === PASSING_STARS) {
    nextGoal = `Reach ${precisionTarget}% accuracy with ${cleanErrorLimit} or fewer errors`;
  } else if (stars === MASTERED_STARS) {
    nextGoal = `Go error-free at ${perfectSpeedTarget} WPM for a perfect run`;
  } else if (stars === PERFECT_STARS) {
    nextGoal = 'Perfected — keep the skill fresh with a weekly review';
  }

  return {
    stars,
    isPassed: stars >= PASSING_STARS,
    isMastered: stars >= MASTERED_STARS,
    isPerfected: stars === PERFECT_STARS,
    targetAccuracy,
    targetWpm,
    precisionTarget,
    perfectSpeedTarget,
    cleanErrorLimit,
    nextGoal
  };
}

export function getLessonMastery(completion = null, storedStars = 0) {
  const bestStars = clamp(
    Math.max(Number(storedStars) || 0, Number(completion?.bestStars) || 0),
    0,
    MAX_MASTERY_STARS
  );
  const isAttempted = Boolean(completion?.completed || completion?.attempts || bestStars > 0);
  const isPassed = completion?.passed ?? bestStars >= PASSING_STARS;
  const isMastered = completion?.mastered ?? bestStars >= MASTERED_STARS;
  const isPerfected = completion?.perfected ?? bestStars >= PERFECT_STARS;

  return { bestStars, isAttempted, isPassed, isMastered, isPerfected };
}

export function getReviewQueue(lessons = [], lessonCompletion = {}, starsByLesson = {}, limit = 3) {
  return lessons
    .map(lesson => {
      const completion = lessonCompletion?.[lesson.id] || null;
      const mastery = getLessonMastery(completion, starsByLesson?.[lesson.id]);
      return { lesson, completion, mastery };
    })
    .filter(item => item.mastery.isAttempted && !item.mastery.isMastered)
    .sort((a, b) => {
      // Passing a lesson is meaningful progress, so unfinished pass criteria
      // should be revisited before polishing a 3-star run into mastery.
      const aPriority = a.mastery.isPassed ? 1 : 0;
      const bPriority = b.mastery.isPassed ? 1 : 0;
      if (aPriority !== bPriority) return aPriority - bPriority;

      const aLastAttempt = new Date(a.completion?.lastAttemptAt || 0).getTime() || 0;
      const bLastAttempt = new Date(b.completion?.lastAttemptAt || 0).getTime() || 0;
      return aLastAttempt - bLastAttempt || a.lesson.id - b.lesson.id;
    })
    .slice(0, limit);
}

export function getPlacementRecommendation({ wpm = 0, accuracy = 0 } = {}) {
  const tiers = [
    {
      minWpm: 70,
      minAccuracy: 97,
      lessonId: 25,
      label: 'Job-Ready Fluency',
      message: 'Your baseline is strong. Start with professional prose and endurance challenges.'
    },
    {
      minWpm: 50,
      minAccuracy: 95,
      lessonId: 19,
      label: 'Capitals & Punctuation',
      message: 'You have a solid foundation. Refine shifts, punctuation, and sentence flow next.'
    },
    {
      minWpm: 35,
      minAccuracy: 93,
      lessonId: 13,
      label: 'Bottom Row Reach',
      message: 'Your core typing is ready for lower-row accuracy and diagonal movement.'
    },
    {
      minWpm: 25,
      minAccuracy: 90,
      lessonId: 7,
      label: 'Top Row Control',
      message: 'You can move beyond home-row basics and build confident top-row reaches.'
    },
    {
      minWpm: 0,
      minAccuracy: 0,
      lessonId: 1,
      label: 'Home Row Foundations',
      message: 'Start with home-row anchors to build accurate muscle memory before adding speed.'
    }
  ];

  const tier = tiers.find(candidate => wpm >= candidate.minWpm && accuracy >= candidate.minAccuracy) || tiers.at(-1);
  return {
    ...tier,
    unlockedThrough: Math.max(0, tier.lessonId - 1)
  };
}
