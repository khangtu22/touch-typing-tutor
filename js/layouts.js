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

  const shiftSymbolsRow1 = ['~', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+'];

  // Row 1
  const r1 = layout.rows[0].map((char, i) => ({
    code: i === 0 ? 'Backquote' : i === 11 ? 'Minus' : i === 12 ? 'Equal' : `Digit${char}`,
    primary: char,
    shift: shiftSymbolsRow1[i] || char,
    width: '1u',
    finger: rowFingerMap[0][i]
  }));
  r1.push({ code: 'Backspace', label: 'Backspace', width: '2u', finger: 'right-pinky', isSpecial: true });

  // Row 2
  const r2 = [{ code: 'Tab', label: 'Tab', primary: '\t', width: '1.5u', finger: 'left-pinky', isSpecial: true }];
  layout.rows[1].forEach((char, i) => {
    let code = `Key${char.toUpperCase()}`;
    let shift = char.toUpperCase();
    if (char === '[') { code = 'BracketLeft'; shift = '{'; }
    else if (char === ']') { code = 'BracketRight'; shift = '}'; }
    else if (char === '\\') { code = 'Backslash'; shift = '|'; }
    else if (char === ';') { code = 'Semicolon'; shift = ':'; }
    else if (char === "'") { code = 'Quote'; shift = '"'; }
    else if (char === ',') { code = 'Comma'; shift = '<'; }
    else if (char === '.') { code = 'Period'; shift = '>'; }
    else if (char === '/') { code = 'Slash'; shift = '?'; }
    else if (char === '=') { code = 'Equal'; shift = '+'; }

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
    let code = `Key${char.toUpperCase()}`;
    let shift = char.toUpperCase();
    if (char === ';') { code = 'Semicolon'; shift = ':'; }
    else if (char === "'") { code = 'Quote'; shift = '"'; }
    else if (char === '-') { code = 'Minus'; shift = '_'; }

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
    let code = `Key${char.toUpperCase()}`;
    let shift = char.toUpperCase();
    if (char === ',') { code = 'Comma'; shift = '<'; }
    else if (char === '.') { code = 'Period'; shift = '>'; }
    else if (char === '/') { code = 'Slash'; shift = '?'; }
    else if (char === ';') { code = 'Semicolon'; shift = ':'; }

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
