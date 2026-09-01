/**
 * Custom Practice & Developer Code Studio Engine
 * Chunks raw text, formats code syntax presets, and generates speed sprint trials.
 */

export const CODE_PRESETS = [
  {
    id: 'js_es6',
    title: 'JavaScript ES6+ & Async',
    language: 'JavaScript',
    icon: '⚡',
    code: `const fetchUserData = async (userId) => {
  const response = await fetch(\`/api/users/\${userId}\`);
  if (!response.ok) throw new Error("Failed to load user");
  const { name, email, roles = [] } = await response.json();
  return { id: userId, name, email, isAdmin: roles.includes("admin") };
};`
  },
  {
    id: 'python_structures',
    title: 'Python Comprehensions & OOP',
    language: 'Python',
    icon: '🐍',
    code: `class TypingMetric:
    def __init__(self, wpm: int, accuracy: float):
        self.wpm = wpm
        self.accuracy = accuracy

    def is_mastered(self) -> bool:
        return self.wpm >= 60 and self.accuracy >= 0.96

scores = [TypingMetric(w, 0.98) for w in [45, 62, 78, 85]]
top_scores = [s.wpm for s in scores if s.is_mastered()]`
  },
  {
    id: 'react_hooks',
    title: 'React Custom Hooks & State',
    language: 'React',
    icon: '⚛️',
    code: `export function useTypingTimer(isActive, onTick) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
      if (onTick) onTick();
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  return { seconds, formatted: \`\${Math.floor(seconds / 60)}:\${seconds % 60}\` };
}`
  },
  {
    id: 'rust_pattern',
    title: 'Rust Structs & Pattern Matching',
    language: 'Rust',
    icon: '🦀',
    code: `pub enum KeyStrokeResult {
    Correct(char, u32),
    Mistake(char, char),
    Completed,
}

pub fn evaluate_key(expected: char, actual: char, combo: u32) -> KeyStrokeResult {
    match (expected, actual) {
        (e, a) if e == a => KeyStrokeResult::Correct(e, combo + 1),
        (e, a) => KeyStrokeResult::Mistake(e, a),
    }
}`
  },
  {
    id: 'sql_queries',
    title: 'SQL Complex Aggregations & Joins',
    language: 'SQL',
    icon: '🗄️',
    code: `SELECT u.user_id, u.username, AVG(s.wpm) AS average_wpm, MAX(s.wpm) AS top_wpm
FROM users u
INNER JOIN sessions s ON u.user_id = s.user_id
WHERE s.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.user_id, u.username
HAVING COUNT(s.session_id) >= 10
ORDER BY top_wpm DESC;`
  }
];

export const SPRINT_TEXT_POOL = [
  "The quick brown fox jumps over the lazy dog while rhythm and muscle memory take over.",
  "Focus entirely on smooth cadence rather than frantic speed. True velocity is effortless precision.",
  "Every keystroke reinforces neuromuscular pathways that turn deliberate thought into pure tactile reflex.",
  "Consistency is the secret superpower. Ten minutes of mindful daily typing transforms your speed forever.",
  "Breathe steadily, relax your shoulders, keep your wrists elevated, and let your fingers find their anchors."
];

/**
 * A short, broad diagnostic used to place experienced typists without
 * awarding curriculum completion credit for skipped lessons.
 */
export function createPlacementLesson() {
  return {
    id: 'placement-check',
    isPlacementTest: true,
    level: 0,
    levelTitle: 'Skill Check',
    title: 'Touch Typing Skill Check',
    subtitle: 'A four-part diagnostic for speed, accuracy, numbers, and symbols',
    description: 'Type each passage at a comfortable pace. Your result recommends a starting point but never marks skipped lessons as mastered.',
    keys: ['all'],
    targetFingerIds: [],
    roundLabels: ['Home row control', 'Everyday prose', 'Numbers & symbols', 'Mixed fluency'],
    rounds: [
      'a s d f j k l ;  sad fall ask skill glad',
      'The quick brown fox jumps over the lazy dog with smooth, accurate rhythm.',
      'Typing 1234567890 costs $45.67, scores 98%, and uses symbols like #, /, and @.',
      'Practice calmly: write clean sentences, use Shift correctly, and keep your eyes forward.'
    ],
    accuracyTarget: 93,
    wpmTarget: 35,
    xpReward: 35,
    estimatedMinutes: 3
  };
}

export class CustomPracticeManager {
  /**
   * Chunks arbitrary raw text into cleanly formatted 1-5 round mini lessons
   */
  static createLessonFromText(title, rawText) {
    const cleanText = rawText.trim().replace(/\r\n/g, '\n').replace(/\t/g, '  ');
    if (!cleanText) return null;

    // Split by double newline or line blocks of ~120 chars
    let rounds = [];
    const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let currentChunk = '';
    lines.forEach(line => {
      if (currentChunk.length + line.length < 130) {
        currentChunk = currentChunk ? `${currentChunk} ${line}` : line;
      } else {
        if (currentChunk) rounds.push(currentChunk);
        currentChunk = line;
      }
    });
    if (currentChunk) rounds.push(currentChunk);

    if (rounds.length === 0) rounds = [cleanText.slice(0, 200)];
    rounds = rounds.slice(0, 6); // Max 6 rounds

    return {
      id: `custom-${Date.now()}`,
      level: 0,
      levelTitle: 'Custom Arena',
      title: title || 'Custom Practice Passage',
      subtitle: `${rounds.length} Rounds • User Custom Content`,
      description: 'Practice custom text, articles, or coding snippets with full telemetry.',
      keys: ['all'],
      targetFingerIds: [],
      rounds,
      accuracyTarget: 93,
      wpmTarget: 35,
      xpReward: 50
    };
  }

  /**
   * Generates a timed sprint lesson
   */
  static createSprintLesson(seconds = 60) {
    const count = Math.ceil(seconds / 15);
    const shuffled = [...SPRINT_TEXT_POOL].sort(() => Math.random() - 0.5);
    const rounds = shuffled.slice(0, Math.min(count, SPRINT_TEXT_POOL.length));

    return {
      id: `sprint-${seconds}s`,
      level: 0,
      levelTitle: `${seconds}s Speed Sprint`,
      title: `${seconds}-Second Speed Trial`,
      subtitle: `Push your maximum typing velocity under a ${seconds}s time limit`,
      description: 'Maintain maximum rhythm and velocity without sacrificing accuracy.',
      keys: ['all'],
      targetFingerIds: [],
      rounds,
      timeLimitSec: seconds,
      accuracyTarget: 95,
      wpmTarget: 50,
      xpReward: 60
    };
  }
}
