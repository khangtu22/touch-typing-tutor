/**
 * 30-lesson progressive touch-typing curriculum.
 *
 * The lesson IDs and persisted-state contract are intentionally stable. The
 * richer metadata powers the roadmap while the four-round arc gives every
 * lesson the same dependable rhythm: warmup, patterns, words, assessment.
 * All text is strictly single-spaced to prevent ambiguity for learners.
 */

import { getLayoutKeycaps } from './layouts.js?v=3.8.1';

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
    levelTitle: 'Level 5 — Numbers & Symbols',
    title: 'Numbers & Symbols',
    subtitle: 'Handle the characters that power real work and technical tools.',
    description: 'Reach the number row and coordinate Shift for spreadsheets, URLs, JSON, and code.',
    milestone: 'Type technical text without hunting for symbols.',
    skills: ['Number row', 'Shifted symbols', 'Symbol pairs'],
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

/** Typing time at the passing pace, plus 30 seconds to read cues and reset. */
export const estimateLessonMinutes = (rounds, wpm) => Math.max(1,
  Math.ceil(rounds.reduce((total, text) => total + cleanRoundText(text).length, 0) / (5 * Math.max(1, wpm)) + 0.5)
);

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
  newKeys = [],
  practiceTip = description,
  roundLabels = ROUND_LABELS
}) => ({
  id,
  level,
  levelTitle: levelById(level).levelTitle,
  title,
  subtitle,
  description,
  skillFocus,
  keys: keys.includes('all') ? keys : [...new Set([...keys, ...newKeys])],
  targetFingerIds,
  rounds: (rounds || []).map(cleanRoundText),
  roundLabels,
  roundTips: id <= 3
    ? ['Find each resting key by feel; speed can wait.', 'Alternate the fingers without moving the whole hand.', 'Read each group before typing it.', 'Keep the same controlled rhythm through the final group.']
    : ['Read the technique cue before you start.', 'Keep each reach deliberate and even.', 'Read ahead and connect groups with a single space.', 'Apply the same technique through the final passage.'],
  newKeys,
  practiceTip,
  estimatedMinutes: estimateLessonMinutes(rounds, wpmTarget),
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
    newKeys: ["f", "j", " "],
    practiceTip: "Rest your index fingers on F and J. Tap Space with one relaxed thumb; keep the other fingers resting on home row.",
    rounds: [
      "f j f j ff jj ff jj f j f j fj jf fj jf",
      "fj jf fj jf ff jj ff jj f fj j jf f fj j jf",
      "ffj jjf fjf jfj ffj jjf fjf jfj fj jf ff jj",
      "jf fj jfj fjf jj ff fjf jfj f j jjf ffj jf fj"
    ],
    accuracyTarget: 92,
    wpmTarget: 10,
    roundLabels: ['Find the keys', 'Alternate fingers', 'Mixed patterns', 'Control check'],
    xpReward: 30,
  }),
  createLesson({
    id: 2,
    level: 1,
    title: 'Middle Finger Neighbors',
    subtitle: 'Add D and K without losing your anchors.',
    description: 'Rest the middle fingers on D and K while the index fingers remain on F and J.',
    skillFocus: 'D/K middle-finger control',
    keys: ['d', 'k', 'f', 'j', ' '],
    targetFingerIds: ['left-middle', 'right-middle', 'left-index', 'right-index'],
    newKeys: ["d", "k"],
    practiceTip: "D and K are the resting keys for your middle fingers. Keep your index fingers on F and J; do not move a middle finger onto an index-finger key.",
    rounds: [
      "d k d k dd kk dd kk dk kd dk kd d k d k",
      "df kj fd jk df kj fd jk dk fj kd jf dk fj kd jf",
      "dfd kjk fdf jkj dkd kdk fjf jfj dfd kjk fdf jkj",
      "kj df kdk dfd jf dk fj kd jkj fdf dk kd fd jk"
    ],
    accuracyTarget: 92,
    wpmTarget: 12,
    roundLabels: ['Find the keys', 'Alternate fingers', 'Mixed patterns', 'Control check'],
    xpReward: 30,
  }),
  createLesson({
    id: 3,
    level: 1,
    title: 'Ring Finger Balance',
    subtitle: 'Bring S and L into a stable home-row flow.',
    description: 'Rest your ring fingers on S and L and press lightly while the other fingers stay over their home keys.',
    skillFocus: 'S/L ring-finger accuracy',
    keys: ['s', 'l', 'd', 'k', 'f', 'j', ' '],
    targetFingerIds: ['left-ring', 'right-ring', 'left-middle', 'right-middle'],
    newKeys: ["s", "l"],
    practiceTip: "S and L belong to your ring fingers. Keep D/K under your middle fingers and F/J under your index fingers.",
    rounds: [
      "s l s l ss ll ss ll sl ls sl ls s l s l",
      "sd lk ds kl sf lj fs jl sd lk ds kl sf lj fs jl",
      "sdf jkl fds lkj sds lkl sls lsl sdf jkl fds lkj",
      "lkj sdf sls lkl dfd jkj fds jkl ls sd kl sf lj ds"
    ],
    accuracyTarget: 92,
    wpmTarget: 12,
    roundLabels: ['Find the keys', 'Alternate fingers', 'Mixed patterns', 'Control check'],
    xpReward: 35,
  }),
  createLesson({
    id: 4,
    level: 1,
    title: 'Pinky Stability',
    subtitle: 'Add A and semicolon with light, deliberate movement.',
    description: 'Press A and semicolon with your resting pinkies while keeping the rest of the hand relaxed.',
    skillFocus: 'A/; pinky reach and hand shape',
    keys: ['a', ';', 's', 'l', 'd', 'k', 'f', 'j', ' '],
    targetFingerIds: ['left-pinky', 'right-pinky'],
    newKeys: ["a", ";"],
    practiceTip: "A and semicolon are the resting keys for your pinkies. Use a light touch and keep the other fingers over their own home keys.",
    rounds: [
      "a ; a ; aa ;; aa ;; a; ;a a; ;a a ; a ;",
      "as l; sa ;l ad k; da ;k asdf jkl; ;lkj fdsa",
      "ask dad lad sad all fall flask salad alas adds",
      "dad asks; a lad falls; a sad lad asks dad; a flask"
    ],
    accuracyTarget: 94,
    wpmTarget: 14,
    xpReward: 35,
  }),
  createLesson({
    id: 5,
    level: 1,
    title: 'Full Home Row Control',
    subtitle: 'Connect every home-row key with even rhythm.',
    description: 'Add G and H with sideways index-finger reaches, then combine the full home row.',
    skillFocus: 'G/H reaches and home-row coordination',
    keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ' '],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky'],
    newKeys: ["g", "h"],
    practiceTip: "Reach sideways from F to G with your left index finger and from J to H with your right index finger. Return each index finger to its anchor.",
    rounds: [
      "fgf jhj fgf jhj g h g h gh hg gh hg fgf jhj",
      "fg gf jh hj fgh jhg gfg hjh fgf jhj gfj hjf",
      "glad flag glass half hall has dash gash shag shall",
      "dad has a glass; a lad has a flag; dad adds half"
    ],
    accuracyTarget: 94,
    wpmTarget: 14,
    xpReward: 40,
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
    newKeys: [],
    practiceTip: "Read a short word ahead. Keep each finger in its own lane, and tap Space once between words.",
    rounds: [
      "ask dad lad sad glad half hall dash flag glass",
      "ash dash sash gash all hall fall shall lag flag",
      "dad adds a dash; a lad has a salad; dad has a flask",
      "a lad asks dad; dad has a glass; a lass has a flag"
    ],
    accuracyTarget: 94,
    wpmTarget: 16,
    xpReward: 45,
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
    newKeys: ["r", "u"],
    practiceTip: "Reach from F to R and from J to U with your index fingers, then return home. Keep the reaches small.",
    rounds: [
      "frf juj frf juj r u r u rr uu ru ur frf juj",
      "fr rf ju uj fur rug rag jug fru jur fur rug",
      "fur rug jug jar far rush harsh sugar guard rural",
      "a guard has a jug; a lad has a rug; dad adds sugar"
    ],
    accuracyTarget: 94,
    wpmTarget: 16,
    xpReward: 40,
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
    newKeys: ["e", "i"],
    practiceTip: "Reach from D to E and from K to I with your middle fingers. Leave your index fingers on their own keys.",
    rounds: [
      "ded kik ded kik e i e i ee ii ei ie ded kik",
      "de ed ki ik red rid fed fig die kid fire ride",
      "ride fire field guide slide fresh eager issue",
      "a guide rides; a deer is here; a field is full; fresh air"
    ],
    accuracyTarget: 94,
    wpmTarget: 18,
    xpReward: 40,
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
    newKeys: ["w", "o"],
    practiceTip: "Reach from S to W and from L to O with your ring fingers. Return to S and L after each reach.",
    rounds: [
      "sws lol sws lol w o w o ww oo wo ow sws lol",
      "sw ws lo ol sow low row owe wore word wood",
      "wood flow work look word slow wide wool floor",
      "we use wood; our words flow well; a worker is here"
    ],
    accuracyTarget: 94,
    wpmTarget: 18,
    xpReward: 45,
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
    newKeys: ["q", "p"],
    practiceTip: "Reach from A to Q and from semicolon to P with your pinkies. Release Q before U in each qu pair.",
    rounds: [
      "aqa ;p; aqa ;p; q p q p qq pp qp pq aqa ;p;",
      "aq qa ;p p; qu qu up up quip quip pup pup",
      "quip quill equal prior people paper proper queue",
      "our peers use paper; a proper queue is here; people prepare"
    ],
    accuracyTarget: 94,
    wpmTarget: 18,
    xpReward: 45,
  }),
  createLesson({
    id: 11,
    level: 2,
    title: 'Top and Home Transitions',
    subtitle: 'Add T and Y, then blend the top and home rows.',
    description: 'Move between top and home rows with consistent timing instead of pausing at every reach.',
    skillFocus: 'T/Y reaches and row transitions',
    keys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ' '],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky'],
    newKeys: ["t", "y"],
    practiceTip: "Add the inner top-row reaches: F to T with your left index finger, and J to Y with your right index finger. Return to F/J.",
    rounds: [
      "ftf jyj ftf jyj t y t y tt yy ty yt ftf jyj",
      "frf ftf juj jyj try yet type tidy true reply",
      "their water right yellow steady ready yesterday",
      "write the right words; keep your eyes here; type at a steady rate"
    ],
    accuracyTarget: 95,
    wpmTarget: 20,
    xpReward: 50,
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
    newKeys: [],
    practiceTip: "Keep a steady pace through familiar words. If a reach feels uncertain, slow down and return to home position.",
    rounds: [
      "the water is still; the sky is grey; we are ready",
      "we write; they reply; she reads; he types; you try",
      "they shared their ideas; we asked for a quiet hour",
      "we all agreed to try; the writer prepared a short story; she read it aloud"
    ],
    accuracyTarget: 95,
    wpmTarget: 22,
    xpReward: 50,
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
    newKeys: ["v", "b", "n", "m"],
    practiceTip: "Use the left index finger for V and B, and the right index finger for N and M. Reset on F/J between groups.",
    rounds: [
      "fvf fbf jnj jmj fvf fbf jnj jmj v b n m vb nm",
      "fv vf fb bf jn nj jm mj van man ban move never",
      "vibe brave never move burn begin number memory",
      "brave minds learn; we move one step at a time; never hurry"
    ],
    accuracyTarget: 95,
    wpmTarget: 20,
    xpReward: 45,
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
    newKeys: ["c", ","],
    practiceTip: "Reach from D to C with your left middle finger and from K to comma with your right middle finger. Put one space after each comma.",
    rounds: [
      "dcd k,k dcd k,k c , c , cc ,, c, ,c dcd k,k",
      "dc cd k, ,k can, came, calm, clear, clean, code,",
      "clean, calm, clear, cold, careful, common, create",
      "come here, read the code, check each line, then try again"
    ],
    accuracyTarget: 95,
    wpmTarget: 22,
    xpReward: 45,
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
    newKeys: ["x", "."],
    practiceTip: "Reach from S to X and from L to period with your ring fingers. Type a period without Shift, then one space.",
    rounds: [
      "sxs l.l sxs l.l x . x . xx .. x. .x sxs l.l",
      "sx xs l. .l fix. mix. box. six. next. extra.",
      "fix the box. mix the paint. examine each example.",
      "six small boxes sit next to the desk. check the next example."
    ],
    accuracyTarget: 95,
    wpmTarget: 22,
    xpReward: 50,
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
    newKeys: ["z", "/"],
    practiceTip: "Reach from A to Z and from semicolon to slash with your pinkies. A slash needs no Shift.",
    rounds: [
      "aza ;/; aza ;/; z / z / zz // z/ /z aza ;/;",
      "az za ;/ /; zip/unzip zero/one zone/area size/zoom",
      "zero zoom zone size jazz zip unzip breeze frozen",
      "zoom in/out to resize the view. save the file in zone/zero."
    ],
    accuracyTarget: 95,
    wpmTarget: 22,
    xpReward: 50,
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
    newKeys: [],
    practiceTip: "Practice moving down and back home. Keep a light touch on punctuation and one space between words.",
    rounds: [
      "fvf fbf jnj jmj dcd k,k sxs l.l aza ;/; fvf jmj",
      "van ban man jam can scan clan clam slam jazz",
      "a calm man has a black bag. a small van has a flag.",
      "a lad adds jam. dad scans a map, marks a slash, and asks a calm man."
    ],
    accuracyTarget: 95,
    wpmTarget: 24,
    xpReward: 55,
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
    newKeys: [],
    practiceTip: "Use all three rows. Read the next word without looking down; accuracy matters more than a burst of speed.",
    rounds: [
      "the quick brown fox jumps over the lazy dog",
      "pack my box with five dozen liquor jugs. mix, zip, fix, jump.",
      "we can write a clear message, check each word, and make a quick reply.",
      "a quiet breeze moves the leaves. six bright boxes sit by the window. the project is ready for review."
    ],
    accuracyTarget: 95,
    wpmTarget: 26,
    xpReward: 60,
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
    newKeys: ["Y", "U", "I", "O", "P", "H", "J", "K", "L", "N", "M"],
    practiceTip: "Hold Left Shift with your left pinky for a right-hand capital. Release Shift before the next lowercase letter.",
    rounds: [
      "yY uU iI oO pP hH jJ kK lL nN mM Y U I O P H J K L N M",
      "You you In in On on My my He he Just just Look look Now now",
      "John and Mary walked past London bridge. June is warm.",
      "Please join us on Monday. Use your notes. Keep the next line clear."
    ],
    accuracyTarget: 95,
    wpmTarget: 22,
    xpReward: 50,
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
    newKeys: ["Q", "W", "E", "R", "T", "A", "S", "D", "F", "G", "Z", "X", "C", "V", "B"],
    practiceTip: "Use Right Shift for left-hand capitals. For mixed text, choose the Shift key opposite the letter you are typing.",
    rounds: [
      "qQ wW eE rR tT aA sS dD fF gG zZ xX cC vV bB Q W E R T A S D F G Z X C V B",
      "We we Are are The the Best best Fast fast Great great Quick quick",
      "Alice and Bob visited California and Texas. Grace wrote a note.",
      "The team is ready. We can begin. Review the draft, then send the final version."
    ],
    accuracyTarget: 95,
    wpmTarget: 24,
    xpReward: 50,
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
    newKeys: ["'", "\"", ":"],
    practiceTip: "Apostrophe uses the right pinky without Shift. Hold Left Shift for double quotes and colon; release it for lowercase text.",
    rounds: [
      "' \" ; : ' \" ; : a'a a\"a a;a a:a ' \" ; : ' \" ; :",
      "it's that's don't can't won't let's I'm we're you're they're",
      "He said: \"The draft is ready.\" She replied: \"Let us review it.\"",
      "Don't rush the last word; check each mark. It's clear: careful practice builds control."
    ],
    accuracyTarget: 95,
    wpmTarget: 26,
    xpReward: 55,
  }),
  createLesson({
    id: 22,
    level: 4,
    title: 'Professional Sentence Flow',
    subtitle: 'Combine capitals and punctuation in polished writing.',
    description: 'Finish the level with messages and short paragraphs that require reliable Shift, punctuation, and cadence.',
    skillFocus: 'Capitalized sentence fluency',
    keys: ['?', '!', '-', 'ShiftLeft', 'ShiftRight'],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky', 'thumbs'],
    newKeys: ["?", "!", "-"],
    practiceTip: "Add question mark, exclamation mark, and hyphen. Use Left Shift with slash for ?, Right Shift with 1 for !, and no Shift for -.",
    rounds: [
      "/? ? /? ? ! ! - - Ready? Yes! A short-term plan.",
      "Who is ready? We are! Is the draft clear? Yes, it is!",
      "Please review the short-term plan. Add your notes: what works, and what needs more detail?",
      "Thank you for the update. Can we meet on Friday? Bring the draft, a short checklist, and your questions."
    ],
    accuracyTarget: 95,
    wpmTarget: 28,
    xpReward: 55,
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
    newKeys: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    practiceTip: "Learn digits in groups: left pinky 1, ring 2, middle 3, index 4/5; right index 6/7, middle 8, ring 9, pinky 0.",
    rounds: [
      "a1a s2s d3d f4f f5f j6j j7j k8k l9l ;0; a1a ;0;",
      "12 21 34 43 45 54 67 76 78 87 90 09 2026 6092",
      "Room 402, Flight 789, Code 5013, Pin 8294, Desk 16.",
      "Order 204 has 12 items. Send 8 boxes to room 305 by 10:30. Keep 6 copies of form 79."
    ],
    accuracyTarget: 95,
    wpmTarget: 22,
    xpReward: 55,
  }),
  createLesson({
    id: 24,
    level: 5,
    title: 'Technical Symbols',
    subtitle: 'Coordinate Shift and number-row symbols for real work.',
    description: 'Practice the symbols used in code, data, URLs, and technical communication while keeping modifier timing clean.',
    skillFocus: 'Shifted symbols and bracket pairs',
    keys: ['@', '#', '$', '%', '&', '*', '+', '=', '_', '{', '}', '[', ']', '(', ')', '|', ':', ';', ' '],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky'],
    newKeys: ["@", "#", "$", "%", "^", "&", "*", "+", "=", "_", "{", "}", "[", "]", "(", ")", "|", "<", ">", "\\", "`", "~"],
    practiceTip: "Pair each symbol with its base key. Use the opposite Shift for shifted symbols; brackets, backslash, equals, and backtick need no Shift.",
    rounds: [
      "2@ 3# 4$ 5% 6^ 7& 8* 9( 0) -_ =+ [{ ]} \\| ,< .> `~",
      "@ # $ % ^ & * ( ) = + - _ [ ] { } \\ | < > ` ~ @ # $ % ^",
      "array[0] = { id: 1, value: 99 }; total = (4 + 5) * 2;",
      "const sum = (a, b) => a + b; // total. Email: dev@code.io | Port: 8080"
    ],
    accuracyTarget: 95,
    wpmTarget: 24,
    xpReward: 60,
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
    newKeys: [],
    practiceTip: "Read common word groups together. Keep spaces consistent and give longer words the same calm rhythm.",
    rounds: [
      "the and for are but not you all any can had her was one our out day get has him his how",
      "about after again below could every first little other right there their these think through before should because between without",
      "We can make time for the work that matters. There is always another way to try, and every small step can help us learn.",
      "Before we begin, let us think about what we need. We should work together, ask clear questions, and give each other time to reply. The first answer may change as we learn more."
    ],
    accuracyTarget: 96,
    wpmTarget: 30,
    xpReward: 60,
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
    newKeys: [],
    practiceTip: "Use the same pace for ordinary words and punctuation. Read in short phrases, then check the next phrase.",
    rounds: [
      "Please review the draft and leave your comments before the meeting. We will discuss the remaining questions together.",
      "The new schedule is attached. Our first task is to check the dates, confirm the owners, and update the project notes.",
      "Thank you for the clear feedback. I have revised the opening paragraph and added an example. Please let me know if anything still needs more detail.",
      "We have finished the first review. The team found two items that need attention: the delivery date and the support plan. I will update both sections today. After you check the changes, we can share the document with the rest of the group."
    ],
    accuracyTarget: 96,
    wpmTarget: 32,
    xpReward: 65,
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
    newKeys: [],
    practiceTip: "Slow down around paired brackets and quotes. Type every space and punctuation mark exactly as shown.",
    rounds: [
      "() [] {} (); []; {}; const value = 1; let total = 0; return value;",
      "const user = { name: \"Alex\", wpm: 40, accuracy: 0.98 }; const scores = [24, 30, 36];",
      "function add(a, b) { return a + b; } if (score >= target) { return { ready: true, next: \"practice\" }; }",
      "export async function fetchData(url) { const res = await fetch(url); if (!res.ok) { throw new Error(\"Request failed\"); } return res.json(); }"
    ],
    accuracyTarget: 96,
    wpmTarget: 28,
    xpReward: 70,
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
    newKeys: [],
    practiceTip: "These commands are typing text, not instructions to execute. Pay attention to slashes, flags, quotes, and letter case.",
    rounds: [
      "cd ~/projects/keyflow && npm run test; git status --short",
      "git checkout -b feature/lesson-guide; git diff --stat; npm run build",
      "document.querySelectorAll(\".keycap\").forEach(el => el.classList.add(\"active\"));",
      "Update src/app.js, run npm test, and review the diff. Check the output in dist/index.html. If a check fails, read the error, make one change, and run the check again before sharing the result."
    ],
    accuracyTarget: 96,
    wpmTarget: 30,
    xpReward: 75,
    roundLabels: ['Command warmup', 'Paths and flags', 'UI code', 'Workflow assessment']
  }),
  createLesson({
    id: 29,
    level: 6,
    title: 'Sustained Speed',
    subtitle: 'Hold a calm, accurate rhythm through longer passages.',
    description: 'Build endurance with longer passages that reward consistency over frantic bursts of speed.',
    skillFocus: 'Speed, rhythm, and endurance',
    keys: ['all'],
    targetFingerIds: ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky', 'thumbs'],
    newKeys: [],
    practiceTip: "Aim for an even pace over a longer passage. Pause between rounds if you need a rest; these rounds have no countdown.",
    rounds: [
      "A steady pace starts with a comfortable rhythm. Keep your eyes on the text and let each hand prepare for the next word. There is no need to hurry through the easy parts. Give every word the same attention, including the short ones.",
      "When you reach an unfamiliar word, slow down just enough to read it clearly. Notice the order of the letters and continue with small, controlled movements. A brief change of pace is better than a string of avoidable mistakes. Return to your normal rhythm when the word is complete.",
      "The library opens early on a quiet street. A reader returns a book, checks a note, and finds a seat near the window. Outside, a delivery van stops beside the door. The driver brings three boxes to the desk, where a member of staff checks the labels and records the arrival time.",
      "Our team is preparing a guide for new members. The first section explains where to find the shared files. The next section describes how to ask for help and report a problem. We read each paragraph aloud to check that the instructions are clear. Then we remove repeated details, correct the final dates, and save a copy for review. Before sharing the guide, we ask someone new to follow the steps. Their questions help us see what we missed."
    ],
    accuracyTarget: 97,
    wpmTarget: 36,
    xpReward: 80,
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
    newKeys: [],
    practiceTip: "This is a mixed review, not a race. Use your established finger positions across prose, numbers, capitals, and code.",
    rounds: [
      "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. Read both lines with steady spacing, clear punctuation, and a relaxed touch.",
      "const result = { accuracy: 0.98, wpm: 38, ready: true }; if (result.ready && result.wpm >= 38) { console.log(\"Practice complete!\"); } // Review scores[0] before saving.",
      "Please send 24 copies of the revised plan to room 507 by 14:30 on Friday. The budget is $480, with 10% reserved for supplies. Questions? Email team@example.org and include the project ID: KF-2026.",
      "You have practiced letters, capitals, numbers, and symbols. Now bring them together at a pace you can sustain. Check the details in each sentence, including the spaces and final punctuation marks. When the session ends, review your accuracy and choose one skill to revisit. A useful next step is specific: improve a difficult reach, keep a steadier rhythm, or repeat a passage with fewer errors."
    ],
    accuracyTarget: 97,
    wpmTarget: 38,
    xpReward: 100,
    roundLabels: ['Prose warmup', 'Technical blend', 'Full-range flow', 'Capstone assessment']
  })
];

// Keep the teaching order explicit, including case and punctuation.
const taughtKeys = new Set();
for (const lesson of CURRICULUM) {
  lesson.newKeys.forEach(key => taughtKeys.add(key));
  lesson.allowedKeys = [...taughtKeys];
}

const displayKey = key => key === ' ' ? 'Space' : key.toUpperCase();
const DRILL_LABELS = ['Isolate the keys', 'Alternate reaches', 'Mixed patterns', 'Control check'];

// Practice the selected keys themselves. Instructions belong in the cue, not in the typing text.
function targetedRounds(keys) {
  if (keys.length === 1 && keys[0] === ' ') {
    return [
      'f j d k s l a f j d k s l a f j d k s l a',
      'fj dk sl fj dk sl fj dk sl fj dk sl fj dk sl',
      'a sad lad asks dad a sad lad asks dad a sad lad',
      'dad adds a salad a lad asks dad a sad lad falls'
    ];
  }
  const characters = keys.filter(key => key !== ' ');
  const isolated = characters.map(key => `${key} ${key} ${key}${key}`).join(' ');
  const alternating = characters.map((key, index) => {
    const neighbor = characters[(index + 1) % characters.length];
    return `${key}${neighbor} ${neighbor}${key} ${key}${neighbor}${key}`;
  }).join(' ');
  const mixed = characters.map((key, index) => {
    const next = characters[(index + 1) % characters.length];
    return `${key}${key}${next} ${next}${key}${next} ${next}${next}${key}`;
  }).join(' ');
  const assessment = [...characters].reverse().map((key, index) => {
    const next = characters[index % characters.length];
    return `${key}${next} ${next}${key}${key} ${key}${next}${next}`;
  }).join(' ');
  return [isolated, alternating, mixed, assessment].map(text => {
    // Enough repetitions to assess control, with no invisible leading/trailing spaces.
    return Array.from({length: Math.max(1, Math.ceil(65 / (text.length + 1)))}, () => text).join(' ');
  });
}

/** Generates a focused mini-lesson; Space-only practice uses visible word boundaries. */
export function generateWeakKeysLesson(weakKeys = ['r', 't', ';']) {
  const keys = [...new Set(weakKeys.filter(key => typeof key === 'string' && /^[ -~]$/.test(key)))].slice(0, 4);
  if (!keys.length) keys.push('f', 'j');
  const rounds = targetedRounds(keys);
  return {
    id: 'weak-keys-drill', level: 0, levelTitle: 'Targeted Practice',
    title: `Weak Keys Practice (${keys.map(displayKey).join(', ')})`,
    subtitle: 'Slow down and rebuild accurate control of the selected keys.',
    description: 'Use the highlighted fingers. Read each group before typing it.',
    practiceTip: keys.includes(' ')
      ? 'Tap Space once between groups. Keep a steady rhythm across each boundary.'
      : 'Use the highlighted finger for each key. Keep your touch light and pause between rounds if needed.',
    skillFocus: 'Weak-key correction', keys, targetFingerIds: [], rounds,
    roundLabels: DRILL_LABELS, estimatedMinutes: estimateLessonMinutes(rounds, 18),
    accuracyTarget: 95, wpmTarget: 18, xpReward: 40
  };
}

/** Conditions keys assigned to the chosen finger in the selected keyboard layout. */
export function generateWeakFingerLesson(finger, layoutId = 'qwerty') {
  const keys = [...new Set(getLayoutKeycaps(layoutId).flat()
    .filter(key => key.finger === finger.id && typeof key.primary === 'string' && /^[ -~]$/.test(key.primary))
    .map(key => key.primary))];
  if (!keys.length) throw new Error(`Unknown typing finger: ${finger.id}`);
  const rounds = targetedRounds(keys);
  return {
    id: `weak-finger-${finger.id}`, level: 0, levelTitle: 'Finger Conditioning',
    title: `Targeted Drill: ${finger.name}`,
    subtitle: `Practice the keys assigned to your ${finger.name.toLowerCase()}.`,
    description: 'Build accurate reaches with short groups and a relaxed hand.',
    practiceTip: finger.id === 'thumbs'
      ? 'Tap Space once with your preferred thumb between groups. Keep both hands relaxed.'
      : `Use your ${finger.name.toLowerCase()} for the highlighted keys. Return to home position between groups and pause if the movement becomes tense.`,
    skillFocus: 'Finger-specific conditioning', keys, targetFingerIds: [finger.id], rounds,
    roundLabels: DRILL_LABELS, estimatedMinutes: estimateLessonMinutes(rounds, 18),
    accuracyTarget: 95, wpmTarget: 18, xpReward: 40
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
