/**
 * 30-lesson progressive touch-typing curriculum.
 *
 * The lesson IDs and persisted-state contract are intentionally stable. The
 * richer metadata powers the roadmap while the four-round arc gives every
 * lesson the same dependable rhythm: warmup, patterns, words, assessment.
 * All text is strictly single-spaced to prevent ambiguity for learners.
 */

export const CURRICULUM_LEVELS = [
  {
    id: 1,
    levelTitle: 'Level 1 — Home Row Foundations',
    title: 'Home Row Foundations',
    subtitle: 'Build relaxed, accurate control from the F and J anchors.',
    description: 'Learn where your hands live, then turn the home row into a dependable launchpad for every reach.',
    milestone: 'Return to F and J without looking.',
    skills: ['Posture', 'F/J anchors', 'Home-row accuracy'],
    icon: '⚓'
  },
  {
    id: 2,
    levelTitle: 'Level 2 — Top Row Control',
    title: 'Top Row Control',
    subtitle: 'Reach upward while keeping your hands anchored and relaxed.',
    description: 'Add the top row one finger at a time, then blend it into natural words and sentences.',
    milestone: 'Reach up and return home by feel.',
    skills: ['Top-row reaches', 'Vowels', 'Row transitions'],
    icon: '↗'
  },
  {
    id: 3,
    levelTitle: 'Level 3 — Bottom Row Reach',
    title: 'Bottom Row Reach',
    subtitle: 'Complete the alphabet with controlled downward reaches.',
    description: 'Develop the lower-row accuracy and diagonal movement needed for confident everyday typing.',
    milestone: 'Type the full alphabet with consistent finger discipline.',
    skills: ['Bottom-row reaches', 'Diagonals', 'Alphabet fluency'],
    icon: '↘'
  },
  {
    id: 4,
    levelTitle: 'Level 4 — Capitals & Punctuation',
    title: 'Capitals & Punctuation',
    subtitle: 'Coordinate both hands for polished, readable sentences.',
    description: 'Make capitalization, punctuation, and sentence rhythm automatic for notes, messages, and documents.',
    milestone: 'Write complete sentences without breaking cadence.',
    skills: ['Opposite-hand Shift', 'Punctuation', 'Sentence rhythm'],
    icon: 'Aa'
  },
  {
    id: 5,
    levelTitle: 'Level 5 — Numbers, Symbols & Shortcuts',
    title: 'Numbers, Symbols & Shortcuts',
    subtitle: 'Handle the characters that power real work and technical tools.',
    description: 'Reach the number row and coordinate modifier chords for spreadsheets, URLs, JSON, and code.',
    milestone: 'Type technical text without hunting for symbols.',
    skills: ['Number row', 'Shifted symbols', 'Modifier chords'],
    icon: '#_'
  },
  {
    id: 6,
    levelTitle: 'Level 6 — Job-Ready Fluency',
    title: 'Job-Ready Fluency',
    subtitle: 'Turn correct technique into sustained speed for work and creation.',
    description: 'Finish with high-frequency prose, workplace writing, code, endurance, and a full-scope capstone.',
    milestone: 'Type real work with speed, accuracy, and calm control.',
    skills: ['Prose', 'Code syntax', 'Endurance'],
    icon: '✦'
  }
];

export const ROUND_LABELS = ['Warmup', 'Pattern control', 'Word flow', 'Assessment'];

const levelById = id => CURRICULUM_LEVELS.find(level => level.id === id);

/** Normalizes multiple spaces into a single space and trims edges */
export const cleanRoundText = str => (typeof str === 'string' ? str.replace(/[ \t]{2,}/g, ' ').trim() : str);

const createLesson = ({
  id,
  level,
  title,
  subtitle,
  description,
  skillFocus,
  keys,
  targetFingerIds,
  rounds,
  accuracyTarget,
  wpmTarget,
  xpReward,
  estimatedMinutes = 5,
  roundLabels = ROUND_LABELS
}) => ({
  id,
  level,
  levelTitle: levelById(level).levelTitle,
  title,
  subtitle,
  description,
  skillFocus,
  keys,
  targetFingerIds,
  rounds: (rounds || []).map(cleanRoundText),
  roundLabels,
  estimatedMinutes,
  accuracyTarget,
  wpmTarget,
  xpReward
});

export const CURRICULUM = [
  // ==========================================
  // LEVEL 1: HOME ROW FOUNDATIONS (Lessons 1-6)
  // ==========================================
  createLesson({
    id: 1,
    level: 1,
    title: 'Anchor Signals',
    subtitle: 'Learn the F and J anchors before adding speed.',
    description: 'Place your index fingers on F and J, keep both thumbs relaxed, and build a steady home position.',
    skillFocus: 'F/J anchors and relaxed posture',
    keys: ['f', 'j', ' '],
    targetFingerIds: ['left-index', 'right-index', 'thumbs'],
    rounds: [
      'f j f j f j fj jf',
      'ff jj fj jf f j j f',
      'f j f j fj jf ff jj',
      'f j f j f j ff jj fj jf'
    ],
    accuracyTarget: 90,
    wpmTarget: 12,
    xpReward: 30,
    estimatedMinutes: 4
  }),
  createLesson({
    id: 2,
    level: 1,
    title: 'Middle Finger Neighbors',
    subtitle: 'Add D and K without losing your anchors.',
    description: 'Use the middle fingers for D and K, returning to F and J after every small reach.',
    skillFocus: 'D/K control and anchor recovery',
    keys: ['d', 'k', 'f', 'j', ' '],
    targetFingerIds: ['left-middle', 'right-middle', 'left-index', 'right-index'],
    rounds: [
      'd k d k dd kk dk kd',
      'd f k j dk fj df kj',
      'did kid did kid find',
      'kid dad did fj dk find'
    ],
    accuracyTarget: 90,
    wpmTarget: 14,
    xpReward: 30,
    estimatedMinutes: 4
  }),
  createLesson({
    id: 3,
    level: 1,
    title: 'Ring Finger Balance',
    subtitle: 'Bring S and L into a stable home-row flow.',
    description: 'Keep your wrists quiet while the ring fingers reach for S and L, then settle back into position.',
    skillFocus: 'S/L ring-finger accuracy',
    keys: ['s', 'l', 'd', 'k', 'f', 'j', ' '],
    targetFingerIds: ['left-ring', 'right-ring', 'left-middle', 'right-middle'],
    rounds: [
      's l s l ss ll sl ls',
      's d f l k j sdl lkj',
      'sad lad ask all silk',
      'salad skill falls ask dad'
    ],
    accuracyTarget: 91,
    wpmTarget: 16,
    xpReward: 35,
    estimatedMinutes: 5
  }),
  createLesson({
    id: 4,
    level: 1,
    title: 'Pinky Stability',
    subtitle: 'Add A and semicolon with light, deliberate movement.',
    description: 'Extend the pinkies from the home row without collapsing the rest of the hand.',
    skillFocus: 'A/; pinky reach and hand shape',
    keys: ['a', ';', 's', 'l', 'd', 'k', 'f', 'j', ' '],
    targetFingerIds: ['left-pinky', 'right-pinky'],
    rounds: [
      'a ; a ; aa ;; a; ;a',
      'as df ;l kj asdf ;lkj',
      'ask fall lad flask ;',
      'a sad lad; a flask; ask all'
    ],
    accuracyTarget: 91,
    wpmTarget: 18,
    xpReward: 35,
    estimatedMinutes: 5
  }),
  createLesson({
    id: 5,
    level: 1,
    title: 'Full Home Row Control',
    subtitle: 'Connect every home-row key with even rhythm.',
    description: 'Synthesize all eight home-row positions while keeping each finger responsible for its own lane.',
    skillFocus: 'Full home-row coordination',
    keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ' '],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky'],
    rounds: [
      'a s d f g h j k l ;',
      'asdf ghjk l; ;lkj hgfd',
      'gash glad half flash hall',
      'all flags fall; glad hands ask; flash'
    ],
    accuracyTarget: 92,
    wpmTarget: 20,
    xpReward: 40,
    estimatedMinutes: 6
  }),
  createLesson({
    id: 6,
    level: 1,
    title: 'Home Row in Real Words',
    subtitle: 'Turn home-row patterns into useful language.',
    description: 'Finish the foundation by typing readable words while keeping your hands ready for the next key.',
    skillFocus: 'Home-row word fluency',
    keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ' '],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky', 'thumbs'],
    rounds: [
      'ask dad lad fall salad glad',
      'flag half flask dash glass',
      'has hall sash falls glad asks',
      'dad has a glad salad; a flash flag'
    ],
    accuracyTarget: 92,
    wpmTarget: 22,
    xpReward: 45,
    estimatedMinutes: 6
  }),

  // ==========================================
  // LEVEL 2: TOP ROW CONTROL (Lessons 7-12)
  // ==========================================
  createLesson({
    id: 7,
    level: 2,
    title: 'Index Climbs',
    subtitle: 'Reach R and U, then return to F and J.',
    description: 'Train the index fingers to move up and home again without dragging the wrist or hand.',
    skillFocus: 'R/U index reaches',
    keys: ['r', 'u', 'f', 'j', 'd', 'k', ' '],
    targetFingerIds: ['left-index', 'right-index'],
    rounds: [
      'r u r u rr uu ru ur',
      'fr ju rf uj fr ju',
      'fur run rug jar far',
      'run far; your jar is full; jug'
    ],
    accuracyTarget: 92,
    wpmTarget: 22,
    xpReward: 40,
    estimatedMinutes: 6
  }),
  createLesson({
    id: 8,
    level: 2,
    title: 'Middle-Finger Vowels',
    subtitle: 'Reach E and I with a quiet, centered hand.',
    description: 'Build vowel confidence by pairing E and I with the home-row fingers that guide each reach.',
    skillFocus: 'E/I middle-finger reaches',
    keys: ['e', 'i', 'r', 'u', 'd', 'k', ' '],
    targetFingerIds: ['left-middle', 'right-middle'],
    rounds: [
      'e i e i ee ii ei ie',
      'de ki ed ik die kid',
      'red ride die kid fire',
      'I ride; the kid is free; die'
    ],
    accuracyTarget: 92,
    wpmTarget: 24,
    xpReward: 40,
    estimatedMinutes: 6
  }),
  createLesson({
    id: 9,
    level: 2,
    title: 'Ring-Finger Climbs',
    subtitle: 'Reach W and O while maintaining wrist alignment.',
    description: 'Add the ring-finger top-row keys and blend them into short, familiar words.',
    skillFocus: 'W/O ring-finger reaches',
    keys: ['w', 'o', 'e', 'i', 's', 'l', ' '],
    targetFingerIds: ['left-ring', 'right-ring'],
    rounds: [
      'w o w o ww oo wo ow',
      'sw lo ws ol wo lo',
      'wood flow work look word',
      'slow words flow well; look out'
    ],
    accuracyTarget: 93,
    wpmTarget: 26,
    xpReward: 45,
    estimatedMinutes: 6
  }),
  createLesson({
    id: 10,
    level: 2,
    title: 'Pinky Corners',
    subtitle: 'Reach Q and P without stretching the palm.',
    description: 'Let the pinkies travel independently while the index fingers continue to feel for F and J.',
    skillFocus: 'Q/P pinky reaches',
    keys: ['q', 'p', 'w', 'o', 'a', ';', ' '],
    targetFingerIds: ['left-pinky', 'right-pinky'],
    rounds: [
      'q p q p qq pp qp pq',
      'aq ;p qa p; qp pq',
      'quit pour quiet pale pure',
      'quiet people pack a small bag; stop'
    ],
    accuracyTarget: 93,
    wpmTarget: 28,
    xpReward: 45,
    estimatedMinutes: 6
  }),
  createLesson({
    id: 11,
    level: 2,
    title: 'Top and Home Transitions',
    subtitle: 'Blend two rows into natural word shapes.',
    description: 'Move between top and home rows with consistent timing instead of pausing at every reach.',
    skillFocus: 'Top/home row transitions',
    keys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ' '],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky'],
    rounds: [
      'q w e r t y u i o p',
      'great write water right quiet',
      'people their house after yellow',
      'write the right words; keep your hands ready'
    ],
    accuracyTarget: 94,
    wpmTarget: 30,
    xpReward: 50,
    estimatedMinutes: 7
  }),
  createLesson({
    id: 12,
    level: 2,
    title: 'Top Row Fluency',
    subtitle: 'Sustain cadence across the full top and home rows.',
    description: 'Use the complete upper alphabet in readable sentences, keeping motion compact and repeatable.',
    skillFocus: 'Full top/home fluency',
    keys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ' '],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky', 'thumbs'],
    rounds: [
      'the light of the bright sky is high',
      'we will write great letters every day',
      'she asked for water after her fast run',
      'the true leader helps their team grow with pride'
    ],
    accuracyTarget: 94,
    wpmTarget: 32,
    xpReward: 50,
    estimatedMinutes: 7
  }),

  // ==========================================
  // LEVEL 3: BOTTOM ROW REACH (Lessons 13-18)
  // ==========================================
  createLesson({
    id: 13,
    level: 3,
    title: 'Index Drops',
    subtitle: 'Reach V, B, N, and M with the index fingers.',
    description: 'Develop controlled downward reaches while keeping the palm stable above the keyboard.',
    skillFocus: 'V/B/N/M index reaches',
    keys: ['v', 'b', 'n', 'm', 'f', 'j', ' '],
    targetFingerIds: ['left-index', 'right-index'],
    rounds: [
      'v b n m vv bb nn mm',
      'fv gb jn jm vb nm',
      'vibe brave never move burn',
      'never move back; brave minds learn; begin'
    ],
    accuracyTarget: 93,
    wpmTarget: 30,
    xpReward: 45,
    estimatedMinutes: 6
  }),
  createLesson({
    id: 14,
    level: 3,
    title: 'Middle-Finger Dives',
    subtitle: 'Reach C and comma with measured downward motion.',
    description: 'Connect the middle fingers to C and comma while preserving a clean home-row recovery.',
    skillFocus: 'C/comma middle-finger reaches',
    keys: ['c', ',', 'd', 'k', 'e', 'i', ' '],
    targetFingerIds: ['left-middle', 'right-middle'],
    rounds: [
      'c , c , cc ,, c, ,c',
      'dc k, cd ,k c, k,',
      'clean, calm, clear, cold',
      'come quickly, check the code, create momentum'
    ],
    accuracyTarget: 93,
    wpmTarget: 32,
    xpReward: 45,
    estimatedMinutes: 6
  }),
  createLesson({
    id: 15,
    level: 3,
    title: 'Ring-Finger Drops',
    subtitle: 'Reach X and period with controlled rebound.',
    description: 'Keep the ring fingers independent as they travel down to X and period.',
    skillFocus: 'X/period ring-finger reaches',
    keys: ['x', '.', 's', 'l', 'w', 'o', ' '],
    targetFingerIds: ['left-ring', 'right-ring'],
    rounds: [
      'x . x . xx .. x. .x',
      'sx l. xs .l x. .x',
      'fix. box. six. mix. axis.',
      'fix the next box. six small steps. move on.'
    ],
    accuracyTarget: 94,
    wpmTarget: 34,
    xpReward: 50,
    estimatedMinutes: 6
  }),
  createLesson({
    id: 16,
    level: 3,
    title: 'Pinky Drops',
    subtitle: 'Reach Z and slash without twisting the wrist.',
    description: 'Finish the bottom-row map by training the widest pinky reaches with patience and accuracy.',
    skillFocus: 'Z/slash pinky reaches',
    keys: ['z', '/', 'a', ';', 'q', 'p', ' '],
    targetFingerIds: ['left-pinky', 'right-pinky'],
    rounds: [
      'z / z / zz // z/ /z',
      'az ;/ za /; z/ /;',
      'zero zoom zone size jazz',
      'blaze across the zone/area; zero delay'
    ],
    accuracyTarget: 94,
    wpmTarget: 36,
    xpReward: 50,
    estimatedMinutes: 6
  }),
  createLesson({
    id: 17,
    level: 3,
    title: 'Bottom and Home Flow',
    subtitle: 'Connect lower reaches with confident home-row recovery.',
    description: 'Blend bottom-row letters and punctuation into realistic phrases without losing your hand shape.',
    skillFocus: 'Bottom/home transitions',
    keys: ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ' '],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky'],
    rounds: [
      'z x c v b n m , . /',
      'complex system matrix vibrant zone',
      'black velvet cushion makes calm vibes',
      'music, rhythm, balance, and focus. keep moving.'
    ],
    accuracyTarget: 94,
    wpmTarget: 38,
    xpReward: 55,
    estimatedMinutes: 7
  }),
  createLesson({
    id: 18,
    level: 3,
    title: 'Alphabet Control',
    subtitle: 'Use every letter with a stable ten-finger map.',
    description: 'Complete the alphabet with pangrams and natural sentences that test every row and every finger.',
    skillFocus: 'Full alphabet accuracy',
    keys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', ' '],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky', 'thumbs'],
    rounds: [
      'the quick brown fox jumps over the lazy dog',
      'pack my box with five dozen liquor jugs',
      'how vexingly quick daft zebras jump over rocks',
      'sphinx of black quartz, judge my very vow.'
    ],
    accuracyTarget: 95,
    wpmTarget: 40,
    xpReward: 60,
    estimatedMinutes: 8
  }),

  // ==========================================
  // LEVEL 4: CAPITALS & PUNCTUATION (Lessons 19-22)
  // ==========================================
  createLesson({
    id: 19,
    level: 4,
    title: 'Right-Hand Capitals',
    subtitle: 'Hold Left Shift while the right hand types.',
    description: 'Practice the opposite-hand Shift rule for right-hand capitals without lifting your eyes from the text.',
    skillFocus: 'Left Shift with right-hand letters',
    keys: ['Y', 'U', 'I', 'O', 'P', 'H', 'J', 'K', 'L', 'N', 'M', 'ShiftLeft'],
    targetFingerIds: ['left-pinky', 'right-index', 'right-middle', 'right-ring', 'right-pinky'],
    rounds: [
      'Y U I O P H J K L N M',
      'You In On My He Just Look Now',
      'John and Mary walked past London bridge',
      'July, June, May, October, November'
    ],
    accuracyTarget: 94,
    wpmTarget: 34,
    xpReward: 50,
    estimatedMinutes: 7
  }),
  createLesson({
    id: 20,
    level: 4,
    title: 'Left-Hand Capitals',
    subtitle: 'Hold Right Shift while the left hand types.',
    description: 'Build the mirror-image Shift habit for left-hand capitals in names, places, and work titles.',
    skillFocus: 'Right Shift with left-hand letters',
    keys: ['Q', 'W', 'E', 'R', 'T', 'A', 'S', 'D', 'F', 'G', 'Z', 'X', 'C', 'V', 'B', 'ShiftRight'],
    targetFingerIds: ['right-pinky', 'left-pinky', 'left-ring', 'left-middle', 'left-index'],
    rounds: [
      'Q W E R T A S D F G Z X C V B',
      'We Are The Best Fast Great Quick',
      'Alice and Bob visited California and Texas',
      'Rome Was Not Built In A Single Day'
    ],
    accuracyTarget: 94,
    wpmTarget: 36,
    xpReward: 50,
    estimatedMinutes: 7
  }),
  createLesson({
    id: 21,
    level: 4,
    title: 'Sentence Punctuation',
    subtitle: 'Use commas, periods, apostrophes, and quotes naturally.',
    description: 'Learn to place punctuation as part of the sentence rhythm rather than as a last-second correction.',
    skillFocus: 'Core sentence punctuation',
    keys: ['.', ',', "'", '"', ';', ':', ' '],
    targetFingerIds: ['right-pinky', 'right-ring', 'right-middle', 'thumbs'],
    rounds: [
      ". , ' \" ; : . ,",
      "it's, that's, don't, can't, won't, let's",
      'He said: "The journey starts here."',
      "Don't count the days; make the days count, always."
    ],
    accuracyTarget: 95,
    wpmTarget: 38,
    xpReward: 55,
    estimatedMinutes: 7
  }),
  createLesson({
    id: 22,
    level: 4,
    title: 'Professional Sentence Flow',
    subtitle: 'Combine capitals and punctuation in polished writing.',
    description: 'Finish the level with messages and short paragraphs that require reliable Shift, punctuation, and cadence.',
    skillFocus: 'Capitalized sentence fluency',
    keys: ['all'],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky', 'thumbs'],
    rounds: [
      'Ready? Go! What next? Incredible!',
      'Are you ready for this? Yes, absolutely!',
      'Option A: focus; Option B: practice daily.',
      'Why wait for tomorrow? Build your future today - right now!'
    ],
    accuracyTarget: 95,
    wpmTarget: 40,
    xpReward: 55,
    estimatedMinutes: 8
  }),

  // ==========================================
  // LEVEL 5: NUMBERS, SYMBOLS & SHORTCUTS (Lessons 23-24)
  // ==========================================
  createLesson({
    id: 23,
    level: 5,
    title: 'Number Row Reach',
    subtitle: 'Reach digits without abandoning your home position.',
    description: 'Map every number to its finger, then bring the skill into dates, quantities, IDs, and short work notes.',
    skillFocus: 'Number-row accuracy',
    keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky'],
    rounds: [
      '1 2 3 4 5 6 7 8 9 0',
      '12 34 56 78 90 2026 1984',
      'Room 402, Flight 789, Code 5013, Pin 8294',
      'In 2026, 85% of 100 students scored above 95 points.'
    ],
    accuracyTarget: 94,
    wpmTarget: 38,
    xpReward: 55,
    estimatedMinutes: 7
  }),
  createLesson({
    id: 24,
    level: 5,
    title: 'Technical Symbols',
    subtitle: 'Coordinate Shift and number-row symbols for real work.',
    description: 'Practice the symbols used in code, data, URLs, and technical communication while keeping modifier timing clean.',
    skillFocus: 'Shifted symbols and modifier chords',
    keys: ['@', '#', '$', '%', '&', '*', '+', '=', '_', '{', '}', '[', ']', '(', ')', '|', ':', ';', ' '],
    targetFingerIds: ['left-pinky', 'right-pinky', 'left-index', 'right-index', 'right-middle'],
    rounds: [
      '@ # $ % & * + = _ { } [ ]',
      'array[0] = { id: 1, value: 99 };',
      'const sum = (a, b) => a + b; // total',
      'Email: dev@code.io | Port: 8080 | Status: 200 (OK)'
    ],
    accuracyTarget: 95,
    wpmTarget: 42,
    xpReward: 60,
    estimatedMinutes: 8
  }),

  // ==========================================
  // LEVEL 6: JOB-READY FLUENCY (Lessons 25-30)
  // ==========================================
  createLesson({
    id: 25,
    level: 6,
    title: 'High-Frequency Words',
    subtitle: 'Make common words automatic and economical.',
    description: 'Build speed from the words that appear most often in everyday writing, without sacrificing accuracy.',
    skillFocus: 'High-frequency word fluency',
    keys: ['all'],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky', 'thumbs'],
    rounds: [
      'the and for are but not you all any can had her was one our out day get has him his how',
      'about after again below could every first great little other right there their these think',
      'through before should because between without another thought together',
      'There is no substitute for steady practice and patient dedication.'
    ],
    accuracyTarget: 95,
    wpmTarget: 42,
    xpReward: 60,
    estimatedMinutes: 8
  }),
  createLesson({
    id: 26,
    level: 6,
    title: 'Workday Prose',
    subtitle: 'Write clear, natural text at a useful working pace.',
    description: 'Practice sentences that resemble updates, documentation, and everyday professional communication.',
    skillFocus: 'Workplace prose and cadence',
    keys: ['all'],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky', 'thumbs'],
    rounds: [
      'Creativity is intelligence having fun, and discipline turns ideas into reality.',
      'Small daily improvements over time lead to stunning long-term results.',
      'Please review the draft, leave clear notes, and share the final version by Friday.',
      'Touch typing lets your ideas move from thought to screen with less friction.'
    ],
    accuracyTarget: 95,
    wpmTarget: 46,
    xpReward: 65,
    estimatedMinutes: 8
  }),
  createLesson({
    id: 27,
    level: 6,
    title: 'Code Building Blocks',
    subtitle: 'Type functions, objects, arrays, and conditions cleanly.',
    description: 'Build confidence with the syntax patterns that appear in modern JavaScript and other programming languages.',
    skillFocus: 'Code syntax and punctuation',
    keys: ['all'],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky'],
    rounds: [
      'function calculateWpm(chars, timeSec) { return Math.round((chars / 5) / (timeSec / 60)); }',
      'const user = { name: "Alex", wpm: 75, accuracy: 0.98 };',
      'if (score >= target) { return { ready: true, next: "practice" }; }',
      'export async function fetchData(url) { const res = await fetch(url); return res.json(); }'
    ],
    accuracyTarget: 96,
    wpmTarget: 50,
    xpReward: 70,
    estimatedMinutes: 9,
    roundLabels: ['Syntax warmup', 'Structures', 'Logic flow', 'Code assessment']
  }),
  createLesson({
    id: 28,
    level: 6,
    title: 'Developer Workflow Text',
    subtitle: 'Practice the symbols and prose of daily technical work.',
    description: 'Blend code, file paths, commands, and explanatory text so your typing transfers to real developer workflows.',
    skillFocus: 'Technical communication and CLI syntax',
    keys: ['all'],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky'],
    rounds: [
      'cd ~/projects/keyflow && npm run test',
      'git checkout -b feature/smooth-hand-guide',
      'document.querySelectorAll(".keycap").forEach(el => el.classList.add("active"));',
      'Write the change, run the tests, review the diff, and ship with confidence.'
    ],
    accuracyTarget: 96,
    wpmTarget: 54,
    xpReward: 75,
    estimatedMinutes: 9,
    roundLabels: ['Command warmup', 'Paths and flags', 'UI code', 'Workflow assessment']
  }),
  createLesson({
    id: 29,
    level: 6,
    title: 'Sustained Speed',
    subtitle: 'Hold a calm, accurate rhythm under time pressure.',
    description: 'Build endurance with longer passages that reward consistency over frantic bursts of speed.',
    skillFocus: 'Speed, rhythm, and endurance',
    keys: ['all'],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky', 'thumbs'],
    rounds: [
      'Speed and precision go hand in hand when your fingers know exactly where every key lives.',
      'Flow smoothly without pausing between words. Let each finger strike cleanly and rebound instantly.',
      'Breathe steadily, relax your shoulders, and let muscle memory guide your fingers across the board.',
      'True velocity comes from effortless rhythm rather than frantic rushing. Stay accurate and keep going.'
    ],
    accuracyTarget: 97,
    wpmTarget: 58,
    xpReward: 80,
    estimatedMinutes: 10
  }),
  createLesson({
    id: 30,
    level: 6,
    title: 'Grandmaster Capstone',
    subtitle: 'Prove complete control across prose, code, and symbols.',
    description: 'Finish the roadmap with a full-scope assessment of accuracy, speed, technical text, and sustained focus.',
    skillFocus: 'Job-ready ten-finger mastery',
    keys: ['all'],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky', 'thumbs'],
    rounds: [
      'A clear mind, steady posture, and accurate fingers create dependable speed every day.',
      'const result = { accuracy: 0.98, wpm: 62, ready: true }; Keep the process calm and repeatable.',
      'From simple anchors to complex sentences, your hands now move with deliberate, quiet confidence.',
      'Congratulations. You can type real work with speed, accuracy, and control. Keep practicing.'
    ],
    accuracyTarget: 97,
    wpmTarget: 62,
    xpReward: 100,
    estimatedMinutes: 12,
    roundLabels: ['Prose warmup', 'Technical blend', 'Full-range flow', 'Capstone assessment']
  })
];

/** Generates a dynamic mini-lesson targeting specific weak keys. */
export function generateWeakKeysLesson(weakKeys = ['r', 't', ';']) {
  const keys = weakKeys.slice(0, 4);
  const rounds = [
    keys.map(k => `${k} ${k} ${k}${k} ${k}`).join(' '),
    keys.map(k => `${k}a ${k}o ${k}e`).join(' ') + ' ' + keys.join(''),
    `practice ${keys.join(' ')} with clean precision and steady rhythm`,
    `master your weak keys: ${keys.join(', ')} until they feel natural`
  ].map(cleanRoundText);

  return {
    id: 'weak-keys-drill',
    level: 0,
    levelTitle: 'Targeted Practice',
    title: `Weak Keys Practice (${keys.join(', ').toUpperCase()})`,
    subtitle: 'Targeted drill to eliminate errors on your weakest keys',
    description: `Focus on accuracy and finger placement for: ${keys.join(', ').toUpperCase()}`,
    skillFocus: 'Weak-key correction',
    keys,
    targetFingerIds: [],
    rounds,
    roundLabels: ROUND_LABELS,
    estimatedMinutes: 4,
    accuracyTarget: 94,
    wpmTarget: 25,
    xpReward: 40
  };
}

/** Generates a dynamic mini-lesson targeting a specific weak finger. */
export function generateWeakFingerLesson(finger) {
  const rounds = [
    `drill for ${finger.name}: focus on clean finger strikes and relaxed posture`,
    `smooth motion with ${finger.name} builds lasting muscle memory`,
    `master your ${finger.name} with consistent daily practice and steady cadence`,
    `use your ${finger.name} with calm precision until the motion feels natural`
  ].map(cleanRoundText);

  return {
    id: `weak-finger-${finger.id}`,
    level: 0,
    levelTitle: 'Finger Conditioning',
    title: `Targeted Drill: ${finger.name}`,
    subtitle: `Condition your ${finger.name} for improved speed and accuracy`,
    description: `Strengthen the reach and muscle memory of your ${finger.name}.`,
    skillFocus: 'Finger-specific conditioning',
    keys: ['all'],
    targetFingerIds: [finger.id],
    rounds,
    roundLabels: ROUND_LABELS,
    estimatedMinutes: 4,
    accuracyTarget: 93,
    wpmTarget: 25,
    xpReward: 40
  };
}

/** Generates a deterministic daily challenge from a date string (YYYY-MM-DD). */
export function getDailyChallengeLesson(dateStr) {
  const pool = [
    {
      title: 'Daily Fluency Challenge: Morning Rhythm',
      rounds: [
        'Start your morning with a clear mind and crisp tactile keystrokes.',
        'Consistency is the mother of mastery. Every keystroke sharpens your mind.',
        'Master the keyboard, and your ideas will flow directly onto the screen without friction.',
        'Keep your hands relaxed, your eyes on the text, and your rhythm steady.'
      ]
    },
    {
      title: 'Daily Fluency Challenge: Cadence & Flow',
      rounds: [
        'Rhythm is the key to endurance: keep your keystrokes evenly spaced like a ticking metronome.',
        'Do not rush tricky words; slow down just enough to maintain 100% accuracy.',
        'Smooth is fast, and fast is smooth. Let muscle memory take the lead.',
        'Finish with control. A calm final line is better than a frantic burst.'
      ]
    },
    {
      title: 'Daily Fluency Challenge: Code & Prose',
      rounds: [
        'const speed = calculateVelocity({ accuracy: 0.99, combo: 150 });',
        'Writing clean code and clear prose requires the same disciplined focus.',
        'Your fingers are the direct bridge between imagination and digital creation.',
        'Plan the thought, trust the fingers, and let the sentence arrive cleanly.'
      ]
    }
  ];

  let hash = 0;
  for (let i = 0; i < dateStr.length; i += 1) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }

  const challenge = pool[Math.abs(hash) % pool.length];
  return {
    id: 'daily-challenge',
    level: 0,
    levelTitle: 'Daily Challenge',
    title: challenge.title,
    subtitle: `Special challenge for ${dateStr} • +50 Bonus XP`,
    description: 'Complete this daily challenge to boost your streak and earn bonus XP!',
    skillFocus: 'Daily fluency maintenance',
    keys: ['all'],
    targetFingerIds: [],
    rounds: (challenge.rounds || []).map(cleanRoundText),
    roundLabels: ROUND_LABELS,
    estimatedMinutes: 5,
    accuracyTarget: 93,
    wpmTarget: 35,
    xpReward: 60
  };
}
