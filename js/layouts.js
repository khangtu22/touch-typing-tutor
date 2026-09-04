/**
 * Multi-Layout Matrix Definitions
 * Supports QWERTY, Colemak, Dvorak, and Workman physical keyboard layouts,
 * with dynamic key matrices, legends, and touch-typing finger assignments.
 */

export const LAYOUTS = {
  qwerty: {
    id: 'qwerty',
    name: 'QWERTY',
    tagline: 'Standard US English Layout',
    rows: [
      ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
    ]
  },
  colemak: {
    id: 'colemak',
    name: 'Colemak',
    tagline: 'Modern Ergonomic Standard (17 keys moved)',
    rows: [
      ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
      ['q', 'w', 'f', 'p', 'g', 'j', 'l', 'u', 'y', ';', '[', ']', '\\'],
      ['a', 'r', 's', 't', 'd', 'h', 'n', 'e', 'i', 'o', "'"],
      ['z', 'x', 'c', 'v', 'b', 'k', 'm', ',', '.', '/']
    ]
  },
  dvorak: {
    id: 'dvorak',
    name: 'Dvorak',
    tagline: 'Vowel Home Row Cluster for Maximum Efficiency',
    rows: [
      ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '[', ']'],
      ["'", ',', '.', 'p', 'y', 'f', 'g', 'c', 'r', 'l', '/', '=', '\\'],
      ['a', 'o', 'e', 'u', 'i', 'd', 'h', 't', 'n', 's', '-'],
      [';', 'q', 'j', 'k', 'x', 'b', 'm', 'w', 'v', 'z']
    ]
  },
  workman: {
    id: 'workman',
    name: 'Workman',
    tagline: 'Minimizes Lateral Finger Movement & Reach Strain',
    rows: [
      ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
      ['q', 'd', 'r', 'w', 'b', 'j', 'f', 'u', 'p', ';', '[', ']', '\\'],
      ['a', 's', 'h', 't', 'g', 'y', 'n', 'e', 'o', 'i', "'"],
      ['z', 'x', 'm', 'c', 'v', 'k', 'l', ',', '.', '/']
    ]
  }
};

// KeyboardEvent.code identifies the physical US keyboard position, regardless
// of the character produced by the selected operating-system layout. Keep
// these positions separate from the legends in LAYOUTS so alternate layouts
// can guide the correct physical key and finger.
const PHYSICAL_CODES = [
  ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
  ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash']
];

const STANDARD_SHIFT_LEGENDS = [
  ['~', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '{', '}', '|'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ':', '"'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '<', '>', '?']
];

// Dvorak changes the shifted legend on punctuation positions as well as the
// unshifted legend. The other supported layouts use the standard US symbols.
const SHIFT_LEGENDS = {
  dvorak: [
    ['~', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '{', '}'],
    ['"', '<', '>', 'P', 'Y', 'F', 'G', 'C', 'R', 'L', '?', '+', '|'],
    ['A', 'O', 'E', 'U', 'I', 'D', 'H', 'T', 'N', 'S', '_'],
    [':', 'Q', 'J', 'K', 'X', 'B', 'M', 'W', 'V', 'Z']
  ]
};

/**
 * Returns physical key definition rows tailored to the selected layout
 */
export function getLayoutKeycaps(layoutId = 'qwerty') {
  const layout = LAYOUTS[layoutId] || LAYOUTS.qwerty;

  // Key-to-finger mapping for 4 standard rows
  const rowFingerMap = [
    // Row 1 (Number row)
    ['left-pinky', 'left-pinky', 'left-ring', 'left-middle', 'left-index', 'left-index', 'right-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky', 'right-pinky', 'right-pinky'],
    // Row 2 (Top row)
    ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'left-index', 'right-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky', 'right-pinky', 'right-pinky', 'right-pinky'],
    // Row 3 (Home row)
    ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'left-index', 'right-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky', 'right-pinky'],
    // Row 4 (Bottom row)
    ['left-pinky', 'left-ring', 'left-middle', 'left-index', 'left-index', 'right-index', 'right-index', 'right-middle', 'right-ring', 'right-pinky']
  ];

  const shiftLegends = SHIFT_LEGENDS[layout.id] || STANDARD_SHIFT_LEGENDS;

  // Row 1
  const r1 = layout.rows[0].map((char, i) => ({
    code: PHYSICAL_CODES[0][i],
    primary: char,
    shift: shiftLegends[0][i] || char,
    width: '1u',
    finger: rowFingerMap[0][i]
  }));
  r1.push({ code: 'Backspace', label: 'Backspace', width: '2u', finger: 'right-pinky', isSpecial: true });

  // Row 2
  const r2 = [{ code: 'Tab', label: 'Tab', primary: '\t', width: '1.5u', finger: 'left-pinky', isSpecial: true }];
  layout.rows[1].forEach((char, i) => {
    const code = PHYSICAL_CODES[1][i];
    const shift = shiftLegends[1][i] || char.toUpperCase();

    r2.push({
      code,
      primary: char,
      shift,
      width: char === '\\' ? '1.5u' : '1u',
      finger: rowFingerMap[1][i]
    });
  });

  // Row 3
  const r3 = [{ code: 'CapsLock', label: 'Caps', width: '1.75u', finger: 'left-pinky', isSpecial: true }];
  layout.rows[2].forEach((char, i) => {
    const code = PHYSICAL_CODES[2][i];
    const shift = shiftLegends[2][i] || char.toUpperCase();

    // Homing nubs (Index fingers on home row)
    const hasNub = (i === 3 || i === 6);

    r3.push({
      code,
      primary: char,
      shift,
      width: '1u',
      finger: rowFingerMap[2][i],
      hasNub
    });
  });
  r3.push({ code: 'Enter', label: 'Enter', primary: '\n', width: '2.25u', finger: 'right-pinky', isSpecial: true });

  // Row 4
  const r4 = [{ code: 'ShiftLeft', label: 'Shift', width: '2.25u', finger: 'left-pinky', isSpecial: true }];
  layout.rows[3].forEach((char, i) => {
    const code = PHYSICAL_CODES[3][i];
    const shift = shiftLegends[3][i] || char.toUpperCase();

    r4.push({
      code,
      primary: char,
      shift,
      width: '1u',
      finger: rowFingerMap[3][i]
    });
  });
  r4.push({ code: 'ShiftRight', label: 'Shift', width: '2.75u', finger: 'right-pinky', isSpecial: true });

  // Row 5 (Spacebar row)
  const r5 = [
    { code: 'ControlLeft', label: 'Ctrl', width: '1.25u', finger: 'left-pinky', isSpecial: true },
    { code: 'AltLeft', label: 'Alt', width: '1.25u', finger: 'left-ring', isSpecial: true },
    { code: 'MetaLeft', label: 'Cmd', width: '1.25u', finger: 'left-middle', isSpecial: true },
    { code: 'Space', primary: ' ', label: 'Space', width: '6.25u', finger: 'thumbs', isSpecial: true },
    { code: 'MetaRight', label: 'Cmd', width: '1.25u', finger: 'right-middle', isSpecial: true },
    { code: 'AltRight', label: 'Alt', width: '1.25u', finger: 'right-ring', isSpecial: true },
    { code: 'ControlRight', label: 'Ctrl', width: '1.25u', finger: 'right-pinky', isSpecial: true }
  ];

  return [r1, r2, r3, r4, r5];
}
