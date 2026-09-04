/**
 * Finger Mapping & Color Design Tokens
 * Defines the standard 10-finger touch typing positions, colors, and key associations.
 */

export const FINGERS = {
  LEFT_PINKY: {
    id: 'left-pinky',
    name: 'Left Pinky',
    hand: 'left',
    color: '#FF6B8B', // Coral Pink
    colorLight: 'rgba(255, 107, 139, 0.18)',
    glow: '0 0 16px rgba(255, 107, 139, 0.45)',
    homeKey: 'a'
  },
  LEFT_RING: {
    id: 'left-ring',
    name: 'Left Ring',
    hand: 'left',
    color: '#FF8E53', // Tangerine
    colorLight: 'rgba(255, 142, 83, 0.18)',
    glow: '0 0 16px rgba(255, 142, 83, 0.45)',
    homeKey: 's'
  },
  LEFT_MIDDLE: {
    id: 'left-middle',
    name: 'Left Middle',
    hand: 'left',
    color: '#FFD166', // Golden Amber
    colorLight: 'rgba(255, 209, 102, 0.18)',
    glow: '0 0 16px rgba(255, 209, 102, 0.45)',
    homeKey: 'd'
  },
  LEFT_INDEX: {
    id: 'left-index',
    name: 'Left Index',
    hand: 'left',
    color: '#06D6A0', // Emerald Green
    colorLight: 'rgba(6, 214, 160, 0.18)',
    glow: '0 0 16px rgba(6, 214, 160, 0.45)',
    homeKey: 'f'
  },
  THUMBS: {
    id: 'thumbs',
    name: 'Thumbs',
    hand: 'both',
    color: '#94A3B8', // Slate Neutral
    colorLight: 'rgba(148, 163, 184, 0.18)',
    glow: '0 0 16px rgba(148, 163, 184, 0.45)',
    homeKey: ' '
  },
  RIGHT_INDEX: {
    id: 'right-index',
    name: 'Right Index',
    hand: 'right',
    color: '#118AB2', // Vivid Cyan
    colorLight: 'rgba(17, 138, 178, 0.18)',
    glow: '0 0 16px rgba(17, 138, 178, 0.45)',
    homeKey: 'j'
  },
  RIGHT_MIDDLE: {
    id: 'right-middle',
    name: 'Right Middle',
    hand: 'right',
    color: '#4EA8DE', // Sky Blue
    colorLight: 'rgba(78, 168, 222, 0.18)',
    glow: '0 0 16px rgba(78, 168, 222, 0.45)',
    homeKey: 'k'
  },
  RIGHT_RING: {
    id: 'right-ring',
    name: 'Right Ring',
    hand: 'right',
    color: '#7C5CFC', // Royal Purple
    colorLight: 'rgba(124, 92, 252, 0.18)',
    glow: '0 0 16px rgba(124, 92, 252, 0.45)',
    homeKey: 'l'
  },
  RIGHT_PINKY: {
    id: 'right-pinky',
    name: 'Right Pinky',
    hand: 'right',
    color: '#C77DFF', // Bright Magenta
    colorLight: 'rgba(199, 125, 255, 0.18)',
    glow: '0 0 16px rgba(199, 125, 255, 0.45)',
    homeKey: ';'
  }
};

/**
 * Key to Finger mapping
 * Maps every standard character and symbol to its primary finger ID.
 */
export const KEY_TO_FINGER = {
  // Left Pinky
  '`': 'left-pinky', '~': 'left-pinky',
  '1': 'left-pinky', '!': 'left-pinky',
  'q': 'left-pinky', 'Q': 'left-pinky',
  'a': 'left-pinky', 'A': 'left-pinky',
  'z': 'left-pinky', 'Z': 'left-pinky',
  'Tab': 'left-pinky', 'Caps': 'left-pinky', 'ShiftLeft': 'left-pinky',

  // Left Ring
  '2': 'left-ring', '@': 'left-ring',
  'w': 'left-ring', 'W': 'left-ring',
  's': 'left-ring', 'S': 'left-ring',
  'x': 'left-ring', 'X': 'left-ring',

  // Left Middle
  '3': 'left-middle', '#': 'left-middle',
  'e': 'left-middle', 'E': 'left-middle',
  'd': 'left-middle', 'D': 'left-middle',
  'c': 'left-middle', 'C': 'left-middle',

  // Left Index
  '4': 'left-index', '$': 'left-index',
  '5': 'left-index', '%': 'left-index',
  'r': 'left-index', 'R': 'left-index',
  't': 'left-index', 'T': 'left-index',
  'f': 'left-index', 'F': 'left-index',
  'g': 'left-index', 'G': 'left-index',
  'v': 'left-index', 'V': 'left-index',
  'b': 'left-index', 'B': 'left-index',

  // Thumbs
  ' ': 'thumbs',

  // Right Index
  '6': 'right-index', '^': 'right-index',
  '7': 'right-index', '&': 'right-index',
  'y': 'right-index', 'Y': 'right-index',
  'u': 'right-index', 'U': 'right-index',
  'h': 'right-index', 'H': 'right-index',
  'j': 'right-index', 'J': 'right-index',
  'n': 'right-index', 'N': 'right-index',
  'm': 'right-index', 'M': 'right-index',

  // Right Middle
  '8': 'right-middle', '*': 'right-middle',
  'i': 'right-middle', 'I': 'right-middle',
  'k': 'right-middle', 'K': 'right-middle',
  ',': 'right-middle', '<': 'right-middle',

  // Right Ring
  '9': 'right-ring', '(': 'right-ring',
  'o': 'right-ring', 'O': 'right-ring',
  'l': 'right-ring', 'L': 'right-ring',
  '.': 'right-ring', '>': 'right-ring',

  // Right Pinky
  '0': 'right-pinky', ')': 'right-pinky',
  '-': 'right-pinky', '_': 'right-pinky',
  '=': 'right-pinky', '+': 'right-pinky',
  'p': 'right-pinky', 'P': 'right-pinky',
  '[': 'right-pinky', '{': 'right-pinky',
  ']': 'right-pinky', '}': 'right-pinky',
  '\\': 'right-pinky', '|': 'right-pinky',
  ';': 'right-pinky', ':': 'right-pinky',
  "'": 'right-pinky', '"': 'right-pinky',
  '/': 'right-pinky', '?': 'right-pinky',
  'Enter': 'right-pinky', 'Backspace': 'right-pinky', 'ShiftRight': 'right-pinky',
  '\n': 'right-pinky', '\r': 'right-pinky', '\t': 'left-pinky'
};

/**
 * Returns finger object for a character
 */
export function getFingerForKey(char) {
  if (!char) return null;
  const fingerId = KEY_TO_FINGER[char] || KEY_TO_FINGER[char.toLowerCase()];
  if (!fingerId) return FINGERS.RIGHT_INDEX; // Fallback
  return Object.values(FINGERS).find(f => f.id === fingerId) || null;
}

/**
 * Returns which Shift key (Left or Right) should be used when typing a capital letter or shifted symbol.
 * Standard touch-typing rule: Use the opposite hand's Shift key.
 */
export function getOppositeShift(char) {
  const finger = getFingerForKey(char);
  if (!finger) return null;
  if (finger.hand === 'left') {
    return 'ShiftRight'; // Use right shift for left hand keys
  } else if (finger.hand === 'right') {
    return 'ShiftLeft'; // Use left shift for right hand keys
  }
  return null;
}

/**
 * Checks if a character requires the Shift key
 */
export function isShiftRequired(char) {
  if (!char || char.length !== 1) return false;
  if (char === '\n' || char === '\r' || char === '\t' || char === ' ') return false;
  if (char >= 'A' && char <= 'Z') return true;
  const shiftedSymbols = '~!@#$%^&*()_+{}|:"<>?';
  return shiftedSymbols.includes(char);
}
