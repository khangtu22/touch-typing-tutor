/**
 * Interactive keyboard-integrated hand overlay renderer.
 *
 * The guide is intentionally stylised so it stays legible on top of the
 * keyboard, but the hands are built from tapered, articulated SVG shapes
 * instead of single strokes. Finger tips are animated from their current
 * position to the next key so a practice session feels continuous.
 */

import { FINGERS } from './finger-mapping.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const samePoint = (a, b) => Math.abs(a.x - b.x) < 0.25 && Math.abs(a.y - b.y) < 0.25;

const pointOnLine = (from, to, amount, xOffset = 0, yOffset = 0) => ({
  x: lerp(from.x, to.x, amount) + xOffset,
  y: lerp(from.y, to.y, amount) + yOffset
});

const addPoint = (point, other) => ({ x: point.x + other.x, y: point.y + other.y });
const scalePoint = (point, amount) => ({ x: point.x * amount, y: point.y * amount });
const formatPoint = point => `${point.x.toFixed(2)},${point.y.toFixed(2)}`;

/** Create a softly rounded, tapered body around an articulated centerline. */
const makeFingerBodyPath = (points, widths) => {
  const normals = points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tangent = { x: next.x - previous.x, y: next.y - previous.y };
    const length = Math.hypot(tangent.x, tangent.y) || 1;
    return { x: -tangent.y / length, y: tangent.x / length };
  });

  const left = points.map((point, index) => addPoint(point, scalePoint(normals[index], widths[index] / 2)));
  const right = points.map((point, index) => addPoint(point, scalePoint(normals[index], -widths[index] / 2)));

  return [
    `M ${formatPoint(left[0])}`,
    `C ${formatPoint(left[0])} ${formatPoint(left[1])} ${formatPoint(left[1])}`,
    `C ${formatPoint(left[1])} ${formatPoint(left[2])} ${formatPoint(left[2])}`,
    `C ${formatPoint(left[2])} ${formatPoint(left[3])} ${formatPoint(left[3])}`,
    `C ${formatPoint(right[3])} ${formatPoint(right[2])} ${formatPoint(right[2])}`,
    `C ${formatPoint(right[2])} ${formatPoint(right[1])} ${formatPoint(right[1])}`,
    `C ${formatPoint(right[1])} ${formatPoint(right[0])} ${formatPoint(right[0])}`,
    'Z'
  ].join(' ');
};

const makeCenterlinePath = points => {
  const [base, jointOne, jointTwo, tip] = points;
  return `M ${formatPoint(base)} Q ${formatPoint(jointOne)} ${formatPoint(jointTwo)} Q ${formatPoint(jointTwo)} ${formatPoint(tip)}`;
};

const fingerMarkup = (nodeId, fingerId, label) => `
  <g id="${nodeId}" class="overlay-finger-group" data-finger="${fingerId}">
    <path class="finger-shadow"/>
    <path class="finger-segment-path"/>
    <path class="finger-highlight"/>
    <circle class="finger-joint joint-base" r="7"/>
    <circle class="finger-joint joint-mid" r="5.5"/>
    <circle class="fingertip-circle" r="13"/>
    <ellipse class="fingernail" rx="5.5" ry="3.5"/>
    ${nodeId.includes('index') ? '<rect class="homing-nub-indicator" width="14" height="2.5" rx="1"/>' : ''}
    <text class="fingertip-key-label">${label}</text>
  </g>
`;

export class HandRenderer {
  constructor(containerEl, keyboardRenderer = null) {
    this.container = containerEl;
    this.keyboardRenderer = keyboardRenderer;
    this.activeFingerId = null;
    this.activeChar = null;
    this.shiftNeeded = null;

    this.fingerNodes = new Map();
    this.motionStates = new Map();
    this.motionFrame = null;
    this.svgOverlay = null;

    this.render();
  }

  setKeyboardRenderer(kb) {
    this.keyboardRenderer = kb;
    this.updateFingers();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.fingerNodes.clear();
    this.motionStates.clear();

    const wrapper = document.createElement('div');
    wrapper.className = 'keyboard-hands-system';

    wrapper.innerHTML = `
      <div id="keyboard-reach-banner" class="keyboard-reach-banner">
        <span class="reach-mode-pill">Home Rest</span>
        <span id="keyboard-reach-text" class="reach-instruction">Rest fingers on <strong>A S D F</strong> (Left Hand) &amp; <strong>J K L ;</strong> (Right Hand)</span>
      </div>

      <div class="keyboard-and-hands-stage" id="keyboard-stage">
        <svg id="keyboard-hand-svg" class="keyboard-hand-overlay-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="leftHandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#33415F" stop-opacity=".82"/>
              <stop offset="58%" stop-color="#202A42" stop-opacity=".9"/>
              <stop offset="100%" stop-color="#121827" stop-opacity=".98"/>
            </linearGradient>
            <linearGradient id="rightHandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#33415F" stop-opacity=".82"/>
              <stop offset="58%" stop-color="#202A42" stop-opacity=".9"/>
              <stop offset="100%" stop-color="#121827" stop-opacity=".98"/>
            </linearGradient>
            <linearGradient id="fingerGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#202A42" stop-opacity=".72"/>
              <stop offset="50%" stop-color="#344361" stop-opacity=".9"/>
              <stop offset="100%" stop-color="#182136" stop-opacity=".82"/>
            </linearGradient>
            <filter id="handShadow" x="-50%" y="-30%" width="200%" height="180%">
              <feDropShadow dx="0" dy="11" stdDeviation="9" flood-color="#000" flood-opacity=".52"/>
            </filter>
          </defs>

          <path id="left-palm-path" class="palm-body" fill="url(#leftHandGrad)"/>
          <path id="left-palm-highlight" class="palm-highlight"/>
          <path id="left-palm-crease" class="palm-crease"/>

          ${fingerMarkup('fg-left-pinky', 'left-pinky', 'A')}
          ${fingerMarkup('fg-left-ring', 'left-ring', 'S')}
          ${fingerMarkup('fg-left-middle', 'left-middle', 'D')}
          ${fingerMarkup('fg-left-index', 'left-index', 'F')}
          ${fingerMarkup('fg-left-thumb', 'thumbs', '␣')}

          <path id="right-palm-path" class="palm-body" fill="url(#rightHandGrad)"/>
          <path id="right-palm-highlight" class="palm-highlight"/>
          <path id="right-palm-crease" class="palm-crease"/>

          ${fingerMarkup('fg-right-thumb', 'thumbs', '␣')}
          ${fingerMarkup('fg-right-index', 'right-index', 'J')}
          ${fingerMarkup('fg-right-middle', 'right-middle', 'K')}
          ${fingerMarkup('fg-right-ring', 'right-ring', 'L')}
          ${fingerMarkup('fg-right-pinky', 'right-pinky', ';')}
        </svg>

        <div id="mech-kb-slot" class="mech-kb-slot"></div>
      </div>
    `;

    this.container.appendChild(wrapper);

    this.svgOverlay = wrapper.querySelector('#keyboard-hand-svg');
    this.reachBanner = wrapper.querySelector('#keyboard-reach-banner');
    this.reachText = wrapper.querySelector('#keyboard-reach-text');
    this.leftPalm = wrapper.querySelector('#left-palm-path');
    this.rightPalm = wrapper.querySelector('#right-palm-path');
    this.leftPalmHighlight = wrapper.querySelector('#left-palm-highlight');
    this.rightPalmHighlight = wrapper.querySelector('#right-palm-highlight');
    this.leftPalmCrease = wrapper.querySelector('#left-palm-crease');
    this.rightPalmCrease = wrapper.querySelector('#right-palm-crease');

    wrapper.querySelectorAll('.overlay-finger-group').forEach(group => {
      const fingerId = group.dataset.finger;
      const fingerObj = Object.values(FINGERS).find(f => f.id === fingerId);
      if (fingerObj) {
        group.style.setProperty('--finger-color', fingerObj.color);
        group.style.setProperty('--finger-light', fingerObj.colorLight);
        group.style.setProperty('--finger-glow', fingerObj.glow);
      }

      this.fingerNodes.set(group.id, {
        group,
        shadow: group.querySelector('.finger-shadow'),
        path: group.querySelector('.finger-segment-path'),
        highlight: group.querySelector('.finger-highlight'),
        baseJoint: group.querySelector('.joint-base'),
        midJoint: group.querySelector('.joint-mid'),
        circle: group.querySelector('.fingertip-circle'),
        nail: group.querySelector('.fingernail'),
        label: group.querySelector('.fingertip-key-label'),
        nub: group.querySelector('.homing-nub-indicator'),
        fingerId
      });
    });

    requestAnimationFrame(() => this.updateFingers());
  }

  getKeyCenter(code, fallback = { x: 0, y: 0 }) {
    if (!this.keyboardRenderer || !this.keyboardRenderer.keyElements) return fallback;
    const element = this.keyboardRenderer.keyElements.get(code);
    if (!element) return fallback;

    const slot = this.container?.querySelector('#mech-kb-slot');
    if (!slot) return fallback;

    const elementRect = element.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();
    if (slotRect.width === 0) return fallback;

    return {
      x: elementRect.left - slotRect.left + elementRect.width / 2,
      y: elementRect.top - slotRect.top + elementRect.height / 2
    };
  }

  getCharKeyCenter(char, fallback = { x: 0, y: 0 }) {
    if (!this.keyboardRenderer || !char) return fallback;
    const code = this.keyboardRenderer.charToCode.get(char) ||
      this.keyboardRenderer.charToCode.get(char.toLowerCase()) ||
      this.keyboardRenderer.charToCode.get(char.toUpperCase());
    return code ? this.getKeyCenter(code, fallback) : fallback;
  }

  getFingerPose(knuckle, target, defaultHome, fingerId, isLeft) {
    const horizontalReach = target.x - defaultHome.x;
    const outward = fingerId === 'thumbs' ? (isLeft ? -1 : 1) : 0;
    const sway = clamp(horizontalReach * 0.18 + outward * 3, -28, 28);
    const length = Math.max(1, Math.hypot(target.x - knuckle.x, target.y - knuckle.y));
    const size = {
      'left-pinky': [18, 15, 13, 20],
      'right-pinky': [18, 15, 13, 20],
      'left-ring': [21, 17, 14, 21],
      'right-ring': [21, 17, 14, 21],
      'left-middle': [23, 18, 15, 22],
      'right-middle': [23, 18, 15, 22],
      'left-index': [25, 19, 16, 23],
      'right-index': [25, 19, 16, 23],
      thumbs: [26, 20, 17, 23]
    }[fingerId] || [22, 17, 14, 21];

    const jointOne = pointOnLine(knuckle, target, 0.35, sway, -Math.min(4, length * 0.02));
    const jointTwo = pointOnLine(knuckle, target, 0.7, sway * 0.48, -Math.min(2.5, length * 0.012));

    return {
      knuckle,
      jointOne,
      jointTwo,
      tip: target,
      widths: size
    };
  }

  applyFingerPose(node, pose) {
    const points = [pose.knuckle, pose.jointOne, pose.jointTwo, pose.tip];
    const bodyPath = makeFingerBodyPath(points, pose.widths);

    node.shadow?.setAttribute('d', bodyPath);
    node.path?.setAttribute('d', bodyPath);
    node.highlight?.setAttribute('d', makeCenterlinePath(points));

    node.baseJoint?.setAttribute('cx', pose.jointOne.x);
    node.baseJoint?.setAttribute('cy', pose.jointOne.y);
    node.midJoint?.setAttribute('cx', pose.jointTwo.x);
    node.midJoint?.setAttribute('cy', pose.jointTwo.y);

    node.circle?.setAttribute('cx', pose.tip.x);
    node.circle?.setAttribute('cy', pose.tip.y);
    node.nail?.setAttribute('cx', pose.tip.x);
    node.nail?.setAttribute('cy', pose.tip.y - 1);
    node.label?.setAttribute('x', pose.tip.x);
    node.label?.setAttribute('y', pose.tip.y + 0.5);

    if (node.nub) {
      node.nub.setAttribute('x', pose.tip.x - 7);
      node.nub.setAttribute('y', pose.tip.y + 6);
    }
  }

  isReducedMotion() {
    return document.body?.classList.contains('reduced-motion') ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  requestMotionFrame() {
    if (this.motionFrame !== null) return;
    this.motionFrame = requestAnimationFrame(timestamp => this.animateHands(timestamp));
  }

  animateHands(timestamp) {
    this.motionFrame = null;
    let hasActiveMotion = false;

    this.motionStates.forEach((motion, nodeId) => {
      const node = this.fingerNodes.get(nodeId);
      if (!node) return;

      if (motion.done) {
        this.applyFingerPose(node, this.getFingerPose(
          motion.knuckle,
          motion.current,
          motion.defaultHome,
          motion.fingerId,
          motion.isLeft
        ));
        return;
      }

      const progress = clamp((timestamp - motion.start) / motion.duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      motion.current = {
        x: lerp(motion.from.x, motion.to.x, eased),
        y: lerp(motion.from.y, motion.to.y, eased)
      };

      this.applyFingerPose(node, this.getFingerPose(
        motion.knuckle,
        motion.current,
        motion.defaultHome,
        motion.fingerId,
        motion.isLeft
      ));

      if (progress < 1) {
        hasActiveMotion = true;
      } else {
        motion.current = { ...motion.to };
        motion.done = true;
      }
    });

    if (hasActiveMotion) this.requestMotionFrame();
  }

  updateMotion(nodeId, knuckle, target, defaultHome, fingerId, isLeft) {
    const now = performance.now();
    const existing = this.motionStates.get(nodeId);

    if (!existing) {
      const motion = {
        current: { ...target },
        from: { ...target },
        to: { ...target },
        start: now,
        duration: 0,
        done: true,
        knuckle,
        defaultHome,
        fingerId,
        isLeft
      };
      this.motionStates.set(nodeId, motion);
      const node = this.fingerNodes.get(nodeId);
      if (node) this.applyFingerPose(node, this.getFingerPose(knuckle, target, defaultHome, fingerId, isLeft));
      return;
    }

    existing.knuckle = knuckle;
    existing.defaultHome = defaultHome;
    existing.fingerId = fingerId;
    existing.isLeft = isLeft;

    if (samePoint(existing.to, target)) return;

    existing.from = { ...existing.current };
    existing.to = { ...target };
    existing.start = now;
    existing.duration = this.isReducedMotion()
      ? 0
      : 190 + Math.min(150, Math.hypot(target.x - existing.from.x, target.y - existing.from.y) * 0.48);
    existing.done = existing.duration === 0;

    if (existing.done) {
      existing.current = { ...target };
      const node = this.fingerNodes.get(nodeId);
      if (node) this.applyFingerPose(node, this.getFingerPose(knuckle, target, defaultHome, fingerId, isLeft));
    } else {
      this.requestMotionFrame();
    }
  }

  updateFingers() {
    if (!this.svgOverlay) return;

    const slot = this.container?.querySelector('#mech-kb-slot');
    if (!slot) return;

    const width = slot.offsetWidth || 960;
    const height = slot.offsetHeight || 320;
    this.svgOverlay.setAttribute('viewBox', `0 0 ${width} ${height + 130}`);
    this.svgOverlay.style.height = `${height + 130}px`;

    const space = this.getKeyCenter('Space', { x: width / 2, y: 260 });
    const homePositions = {
      'left-pinky': this.getKeyCenter('KeyA', { x: 190, y: 155 }),
      'left-ring': this.getKeyCenter('KeyS', { x: 242, y: 155 }),
      'left-middle': this.getKeyCenter('KeyD', { x: 294, y: 155 }),
      'left-index': this.getKeyCenter('KeyF', { x: 346, y: 155 }),
      'left-thumb': { x: space.x - 60, y: space.y },
      'right-thumb': { x: space.x + 60, y: space.y },
      'right-index': this.getKeyCenter('KeyJ', { x: 554, y: 155 }),
      'right-middle': this.getKeyCenter('KeyK', { x: 606, y: 155 }),
      'right-ring': this.getKeyCenter('KeyL', { x: 658, y: 155 }),
      'right-pinky': this.getKeyCenter('Semicolon', { x: 710, y: 155 })
    };

    const leftKnuckles = {
      'left-pinky': { x: homePositions['left-pinky'].x - 10, y: height + 14 },
      'left-ring': { x: homePositions['left-ring'].x - 5, y: height + 20 },
      'left-middle': { x: homePositions['left-middle'].x, y: height + 24 },
      'left-index': { x: homePositions['left-index'].x + 5, y: height + 21 },
      'left-thumb': { x: homePositions['left-index'].x + 40, y: height + 48 }
    };

    const rightKnuckles = {
      'right-thumb': { x: homePositions['right-index'].x - 40, y: height + 48 },
      'right-index': { x: homePositions['right-index'].x - 5, y: height + 21 },
      'right-middle': { x: homePositions['right-middle'].x, y: height + 24 },
      'right-ring': { x: homePositions['right-ring'].x + 5, y: height + 20 },
      'right-pinky': { x: homePositions['right-pinky'].x + 10, y: height + 14 }
    };

    this.renderPalm('left', leftKnuckles, height);
    this.renderPalm('right', rightKnuckles, height);

    const updateFinger = (nodeId, knuckle, defaultHome, isLeft) => {
      const node = this.fingerNodes.get(nodeId);
      if (!node) return;

      let target = defaultHome;
      const isActive = this.activeFingerId === node.fingerId;

      if (isActive && this.activeChar && node.fingerId !== 'thumbs') {
        target = this.getCharKeyCenter(this.activeChar, defaultHome);
      }

      if (this.activeFingerId === 'thumbs' && node.fingerId === 'thumbs') {
        target = isLeft ? homePositions['left-thumb'] : homePositions['right-thumb'];
      }

      if (this.shiftNeeded === 'ShiftLeft' && nodeId === 'fg-left-pinky') {
        target = this.getKeyCenter('ShiftLeft', { x: 140, y: 210 });
      } else if (this.shiftNeeded === 'ShiftRight' && nodeId === 'fg-right-pinky') {
        target = this.getKeyCenter('ShiftRight', { x: 760, y: 210 });
      }

      node.group.classList.toggle('finger-on-key-active', isActive);
      node.group.classList.toggle('finger-shift-holding',
        (this.shiftNeeded === 'ShiftLeft' && nodeId === 'fg-left-pinky') ||
        (this.shiftNeeded === 'ShiftRight' && nodeId === 'fg-right-pinky')
      );

      this.updateMotion(nodeId, knuckle, target, defaultHome, node.fingerId, isLeft);
    };

    updateFinger('fg-left-pinky', leftKnuckles['left-pinky'], homePositions['left-pinky'], true);
    updateFinger('fg-left-ring', leftKnuckles['left-ring'], homePositions['left-ring'], true);
    updateFinger('fg-left-middle', leftKnuckles['left-middle'], homePositions['left-middle'], true);
    updateFinger('fg-left-index', leftKnuckles['left-index'], homePositions['left-index'], true);
    updateFinger('fg-left-thumb', leftKnuckles['left-thumb'], homePositions['left-thumb'], true);

    updateFinger('fg-right-thumb', rightKnuckles['right-thumb'], homePositions['right-thumb'], false);
    updateFinger('fg-right-index', rightKnuckles['right-index'], homePositions['right-index'], false);
    updateFinger('fg-right-middle', rightKnuckles['right-middle'], homePositions['right-middle'], false);
    updateFinger('fg-right-ring', rightKnuckles['right-ring'], homePositions['right-ring'], false);
    updateFinger('fg-right-pinky', rightKnuckles['right-pinky'], homePositions['right-pinky'], false);
  }

  renderPalm(hand, knuckles, height) {
    const isLeft = hand === 'left';
    const pinky = knuckles[isLeft ? 'left-pinky' : 'right-pinky'];
    const index = knuckles[isLeft ? 'left-index' : 'right-index'];
    const thumb = knuckles[isLeft ? 'left-thumb' : 'right-thumb'];
    const palm = isLeft ? this.leftPalm : this.rightPalm;
    const highlight = isLeft ? this.leftPalmHighlight : this.rightPalmHighlight;
    const crease = isLeft ? this.leftPalmCrease : this.rightPalmCrease;
    if (!palm) return;

    const bottom = height + 124;
    const leftEdge = isLeft ? pinky.x - 30 : thumb.x - 30;
    const rightEdge = isLeft ? thumb.x + 38 : pinky.x + 30;
    const palmPath = isLeft
      ? `M ${pinky.x - 28},${pinky.y + 18}
         C ${pinky.x - 17},${pinky.y - 7} ${pinky.x + 2},${pinky.y - 18} ${pinky.x + 20},${pinky.y - 4}
         C ${(pinky.x + index.x) / 2},${index.y - 13} ${index.x + 12},${index.y - 3} ${index.x + 24},${index.y + 14}
         C ${thumb.x + 16},${thumb.y - 18} ${thumb.x + 38},${thumb.y - 9} ${thumb.x + 44},${thumb.y + 15}
         C ${thumb.x + 32},${height + 59} ${thumb.x + 10},${bottom - 18} ${index.x - 1},${bottom}
         L ${leftEdge},${bottom} Z`
      : `M ${thumb.x - 44},${thumb.y + 15}
         C ${thumb.x - 38},${thumb.y - 9} ${thumb.x - 16},${thumb.y - 18} ${thumb.x - 4},${thumb.y - 2}
         C ${index.x - 12},${index.y - 3} ${(index.x + pinky.x) / 2},${pinky.y - 13} ${pinky.x - 20},${pinky.y - 4}
         C ${pinky.x - 2},${pinky.y - 18} ${pinky.x + 17},${pinky.y - 7} ${pinky.x + 28},${pinky.y + 18}
         L ${rightEdge},${bottom} L ${index.x + 1},${bottom}
         C ${thumb.x - 10},${bottom - 18} ${thumb.x - 32},${height + 59} ${thumb.x - 44},${thumb.y + 15} Z`;

    palm.setAttribute('d', palmPath);
    highlight?.setAttribute('d', isLeft
      ? `M ${pinky.x - 11},${pinky.y + 20} Q ${(pinky.x + index.x) / 2},${height + 52} ${thumb.x + 23},${thumb.y + 27}`
      : `M ${thumb.x - 23},${thumb.y + 27} Q ${(index.x + pinky.x) / 2},${height + 52} ${pinky.x + 11},${pinky.y + 20}`);
    crease?.setAttribute('d', isLeft
      ? `M ${index.x + 1},${height + 38} Q ${index.x + 33},${height + 60} ${thumb.x + 12},${height + 42}`
      : `M ${thumb.x - 12},${height + 42} Q ${index.x - 33},${height + 60} ${index.x - 1},${height + 38}`);
  }

  highlightFinger(fingerId, expectedChar = '', shiftNeeded = null) {
    this.activeFingerId = fingerId;
    this.activeChar = expectedChar;
    this.shiftNeeded = shiftNeeded;
    this.updateFingers();

    const fingerObj = Object.values(FINGERS).find(f => f.id === fingerId);
    if (this.reachText && fingerObj) {
      const homeKey = fingerObj.homeKey === ' ' ? 'Space' : fingerObj.homeKey.toUpperCase();
      const charDisplay = expectedChar === ' ' ? 'Spacebar' : expectedChar.toUpperCase();

      if (shiftNeeded) {
        const shiftHand = shiftNeeded === 'ShiftLeft' ? 'Left Pinky (Shift)' : 'Right Pinky (Shift)';
        this.reachText.innerHTML = `Hold <strong>${shiftHand}</strong> + Press <strong>${charDisplay}</strong> with <span style="color: ${fingerObj.color}; font-weight: 800;">${fingerObj.name}</span>`;
      } else if (homeKey !== charDisplay) {
        this.reachText.innerHTML = `<span style="color: ${fingerObj.color}; font-weight: 800;">${fingerObj.name}</span> reaches from home <strong>${homeKey}</strong> ➔ Press <strong>${charDisplay}</strong>`;
      } else {
        this.reachText.innerHTML = `<span style="color: ${fingerObj.color}; font-weight: 800;">${fingerObj.name}</span> presses home key <strong>${charDisplay}</strong>`;
      }
    } else if (this.reachText) {
      this.reachText.innerHTML = 'Rest fingers on <strong>A S D F</strong> &amp; <strong>J K L ;</strong>';
    }

    this.reachBanner?.classList.toggle('reach-active', !!fingerId);
  }

  clear() {
    this.activeFingerId = null;
    this.activeChar = null;
    this.shiftNeeded = null;
    this.updateFingers();

    if (this.reachText) {
      this.reachText.innerHTML = 'Rest fingers on <strong>A S D F</strong> &amp; <strong>J K L ;</strong>';
    }
    this.reachBanner?.classList.remove('reach-active');
  }
}
