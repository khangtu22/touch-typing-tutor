/**
 * Proportional 3D Anatomical Hand & Finger Guide Engine (v4.0)
 *
 * Major Architectural Upgrades:
 * - True Anatomical Hand Proportions: Realistic knuckle baseline (MCP arch),
 *   natural finger lengths (60-80px vs old 250px rods), and sculpted 3D palms.
 * - Dynamic Hand Inverse Kinematics (IK): When a finger reaches for top/number rows,
 *   the entire palm glides and tilts naturally instead of stretching fingers into tentacles.
 * - Organic Hand Topography: True interdigital webs between knuckles, thenar (thumb ball)
 *   muscle mound, hypothenar edge, and carpal wrist base with flexor tendons.
 * - 3D Multi-Layer Shading: Cylindrical phalanx lighting, spherical knuckle capsules with
 *   anatomical flexure creases, glossy translucent fingernails, and soft-tissue touch pads.
 * - Parabolic 3D Z-Elevation: Fingers lift upward in 3D space during flight with dynamic
 *   shadow diffusion and squash-and-stretch tactile strike physics.
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

/**
 * Generates an organic, tapered 3D finger contour with natural joint bulges.
 */
function makeOrganicFingerContour(points, widths) {
  const normals = points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tangent = { x: next.x - previous.x, y: next.y - previous.y };
    const length = Math.hypot(tangent.x, tangent.y) || 1;
    return { x: -tangent.y / length, y: tangent.x / length };
  });

  const left = points.map((p, i) => addPoint(p, scalePoint(normals[i], widths[i] / 2)));
  const right = points.map((p, i) => addPoint(p, scalePoint(normals[i], -widths[i] / 2)));

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
}

/** Builds cylindrical phalanx segment meshes for rich 3D shading */
function makePhalanxMesh(pA, pB, widthA, widthB) {
  const tangent = { x: pB.x - pA.x, y: pB.y - pA.y };
  const length = Math.hypot(tangent.x, tangent.y) || 1;
  const normal = { x: -tangent.y / length, y: tangent.x / length };

  const aL = addPoint(pA, scalePoint(normal, widthA / 2));
  const aR = addPoint(pA, scalePoint(normal, -widthA / 2));
  const bL = addPoint(pB, scalePoint(normal, widthB / 2));
  const bR = addPoint(pB, scalePoint(normal, -widthB / 2));

  return `M ${formatPoint(aL)} L ${formatPoint(bL)} L ${formatPoint(bR)} L ${formatPoint(aR)} Z`;
}

function makeCenterlineSpline(points) {
  const [base, jointOne, jointTwo, tip] = points;
  return `M ${formatPoint(base)} Q ${formatPoint(jointOne)} ${formatPoint(jointTwo)} Q ${formatPoint(jointTwo)} ${formatPoint(tip)}`;
}

/** SVG Finger Group Markup */
function createFingerMarkup(nodeId, fingerId, label) {
  const isIndex = nodeId.includes('index');
  const isThumb = nodeId.includes('thumb');

  return `
    <g id="${nodeId}" class="overlay-finger-group" data-finger="${fingerId}">
      <!-- Dynamic 3D elevation shadow layer -->
      <g class="finger-shadow-layer">
        <path class="finger-shadow-body" filter="url(#fingerElevShadow)"/>
        <ellipse class="fingertip-shadow-ellipse" filter="url(#fingerElevShadow)"/>
      </g>

      <!-- Extensor tendon line connecting knuckle to fingertip -->
      <path class="finger-dorsal-tendon"/>

      <!-- Smooth organic skin contour -->
      <path class="finger-skin-contour"/>

      <!-- 3D Cylindrical Phalanx Meshes -->
      <g class="finger-phalanxes-3d">
        <path class="phalanx-proximal" fill="url(#phalanx3dGrad)"/>
        <path class="phalanx-middle" fill="url(#phalanx3dGrad)"/>
        <path class="phalanx-distal" fill="url(#phalanxTipGrad)"/>
      </g>

      <!-- Dorsal specular bone ridge -->
      <path class="finger-specular-ridge"/>

      <!-- Volumetric Knuckle Joint Capsules -->
      <g class="knuckle-capsule knuckle-base">
        <circle class="knuckle-socket" r="6.5" fill="url(#knuckleJointGrad)"/>
        <ellipse class="knuckle-crease-top" rx="5" ry="1"/>
        <ellipse class="knuckle-crease-bot" rx="4.2" ry="0.9"/>
        <circle class="knuckle-glint" r="2"/>
      </g>

      <g class="knuckle-capsule knuckle-mid">
        <circle class="knuckle-socket" r="5.5" fill="url(#knuckleJointGrad)"/>
        <ellipse class="knuckle-crease-mid" rx="3.8" ry="0.9"/>
        <circle class="knuckle-glint" r="1.6"/>
      </g>

      <!-- Keystroke impact contact wave -->
      <circle class="tactile-impact-ripple" r="18"/>

      <!-- 3D Fingertip Assembly -->
      <g class="fingertip-assembly-3d">
        <circle class="fingertip-active-halo" r="22"/>
        <circle class="fingertip-targeting-ring" r="15"/>

        <!-- Soft-tissue touch pad cushion -->
        <circle class="fingertip-pad-cushion" r="13" fill="url(#fingertipPadGrad)"/>
        <circle class="fingertip-pad-core" r="10"/>

        <!-- Glossy translucent fingernail with specular highlight -->
        <g class="fingernail-group">
          <ellipse class="fingernail-plate" rx="5.8" ry="3.6" fill="url(#fingernailSheenGrad)"/>
          <path class="fingernail-highlight-curve"/>
        </g>

        <!-- Tactile homing nubs on F and J index anchors -->
        ${isIndex ? `
          <g class="homing-nub-group">
            <rect class="homing-nub-base" width="12" height="2.8" rx="1.4"/>
            <rect class="homing-nub-glint" width="10" height="0.8" rx="0.4"/>
          </g>
        ` : ''}

        <!-- Crisp monospace key label -->
        <text class="fingertip-key-label" y="0.5">${label}</text>
      </g>
    </g>
  `;
}

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

    // Biomechanical IK palm dynamics
    this.leftPalmOffset = { x: 0, y: 0 };
    this.rightPalmOffset = { x: 0, y: 0 };
    this.leftPalmTarget = { x: 0, y: 0 };
    this.rightPalmTarget = { x: 0, y: 0 };

    this.handTilt = { left: 0, right: 0 };
    this.targetTilt = { left: 0, right: 0 };
    this.idleClock = 0;

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
            <!-- Palm 3D Shading Gradients -->
            <linearGradient id="leftPalm3dGrad" x1="0%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stop-color="#384566" stop-opacity="0.86"/>
              <stop offset="30%" stop-color="#242E49" stop-opacity="0.92"/>
              <stop offset="70%" stop-color="#161E30" stop-opacity="0.96"/>
              <stop offset="100%" stop-color="#0D121E" stop-opacity="0.98"/>
            </linearGradient>

            <linearGradient id="rightPalm3dGrad" x1="100%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stop-color="#384566" stop-opacity="0.86"/>
              <stop offset="30%" stop-color="#242E49" stop-opacity="0.92"/>
              <stop offset="70%" stop-color="#161E30" stop-opacity="0.96"/>
              <stop offset="100%" stop-color="#0D121E" stop-opacity="0.98"/>
            </linearGradient>

            <!-- 3D Cylindrical Phalanx Gradient -->
            <linearGradient id="phalanx3dGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#182033" stop-opacity="0.85"/>
              <stop offset="32%" stop-color="#39486B" stop-opacity="0.92"/>
              <stop offset="68%" stop-color="#25304B" stop-opacity="0.94"/>
              <stop offset="100%" stop-color="#111726" stop-opacity="0.95"/>
            </linearGradient>

            <!-- Distal Pad Cushion Gradient -->
            <radialGradient id="fingertipPadGrad" cx="38%" cy="32%" r="68%">
              <stop offset="0%" stop-color="#46577E" stop-opacity="0.96"/>
              <stop offset="45%" stop-color="#212A40" stop-opacity="0.98"/>
              <stop offset="85%" stop-color="#131928" stop-opacity="1"/>
              <stop offset="100%" stop-color="#0A0E17" stop-opacity="1"/>
            </radialGradient>

            <!-- Knuckle Capsule Sphere Gradient -->
            <radialGradient id="knuckleJointGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stop-color="#556994" stop-opacity="0.88"/>
              <stop offset="40%" stop-color="#27334C" stop-opacity="0.92"/>
              <stop offset="85%" stop-color="#141B2A" stop-opacity="0.95"/>
              <stop offset="100%" stop-color="#0B0F18" stop-opacity="0.98"/>
            </radialGradient>

            <!-- Glossy Translucent Fingernail Gradient -->
            <linearGradient id="fingernailSheenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="rgba(255, 255, 255, 0.48)"/>
              <stop offset="50%" stop-color="rgba(215, 230, 255, 0.2)"/>
              <stop offset="100%" stop-color="rgba(160, 185, 230, 0.08)"/>
            </linearGradient>

            <!-- Thenar Mound (Thumb Muscle) 3D Radial Highlight -->
            <radialGradient id="thenarMoundGrad" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stop-color="rgba(90, 115, 168, 0.35)"/>
              <stop offset="60%" stop-color="rgba(40, 55, 85, 0.12)"/>
              <stop offset="100%" stop-color="rgba(15, 22, 38, 0)"/>
            </radialGradient>

            <!-- Ambient Hand Drop Shadow Filter -->
            <filter id="handAmbientShadow" x="-30%" y="-20%" width="160%" height="160%">
              <feDropShadow dx="0" dy="16" stdDeviation="14" flood-color="#000" flood-opacity="0.65"/>
              <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity="0.42"/>
            </filter>

            <!-- Dynamic 3D Elevation Shadow Filter for Reaching Fingers -->
            <filter id="fingerElevShadow" x="-60%" y="-40%" width="220%" height="220%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur"/>
              <feOffset dx="0" dy="10" result="offset"/>
              <feFlood flood-color="#000000" flood-opacity="0.55" result="color"/>
              <feComposite in2="offset" in="color" operator="in"/>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <!-- ============================================== -->
          <!-- LEFT HAND 3D PALM MESH & ANATOMY               -->
          <!-- ============================================== -->
          <g id="left-hand-complex" class="hand-complex-group">
            <path id="left-palm-path" class="palm-body" fill="url(#leftPalm3dGrad)"/>
            <path id="left-palm-rim" class="palm-rim-specular"/>
            <path id="left-thenar-mound" class="palm-thenar-mound" fill="url(#thenarMoundGrad)"/>
            <path id="left-palm-highlight" class="palm-highlight"/>
            <path id="left-palm-crease" class="palm-crease"/>
            <path id="left-wrist-tendon-1" class="wrist-tendon"/>
            <path id="left-wrist-tendon-2" class="wrist-tendon"/>
          </g>

          ${createFingerMarkup('fg-left-pinky', 'left-pinky', 'A')}
          ${createFingerMarkup('fg-left-ring', 'left-ring', 'S')}
          ${createFingerMarkup('fg-left-middle', 'left-middle', 'D')}
          ${createFingerMarkup('fg-left-index', 'left-index', 'F')}
          ${createFingerMarkup('fg-left-thumb', 'thumbs', '␣')}

          <!-- ============================================== -->
          <!-- RIGHT HAND 3D PALM MESH & ANATOMY              -->
          <!-- ============================================== -->
          <g id="right-hand-complex" class="hand-complex-group">
            <path id="right-palm-path" class="palm-body" fill="url(#rightPalm3dGrad)"/>
            <path id="right-palm-rim" class="palm-rim-specular"/>
            <path id="right-thenar-mound" class="palm-thenar-mound" fill="url(#thenarMoundGrad)"/>
            <path id="right-palm-highlight" class="palm-highlight"/>
            <path id="right-palm-crease" class="palm-crease"/>
            <path id="right-wrist-tendon-1" class="wrist-tendon"/>
            <path id="right-wrist-tendon-2" class="wrist-tendon"/>
          </g>

          ${createFingerMarkup('fg-right-thumb', 'thumbs', '␣')}
          ${createFingerMarkup('fg-right-index', 'right-index', 'J')}
          ${createFingerMarkup('fg-right-middle', 'right-middle', 'K')}
          ${createFingerMarkup('fg-right-ring', 'right-ring', 'L')}
          ${createFingerMarkup('fg-right-pinky', 'right-pinky', ';')}
        </svg>

        <div id="mech-kb-slot" class="mech-kb-slot"></div>
      </div>
    `;

    this.container.appendChild(wrapper);

    this.svgOverlay = wrapper.querySelector('#keyboard-hand-svg');
    this.reachBanner = wrapper.querySelector('#keyboard-reach-banner');
    this.reachText = wrapper.querySelector('#keyboard-reach-text');

    // Left hand elements
    this.leftHandGroup = wrapper.querySelector('#left-hand-complex');
    this.leftPalm = wrapper.querySelector('#left-palm-path');
    this.leftPalmRim = wrapper.querySelector('#left-palm-rim');
    this.leftThenar = wrapper.querySelector('#left-thenar-mound');
    this.leftPalmHighlight = wrapper.querySelector('#left-palm-highlight');
    this.leftPalmCrease = wrapper.querySelector('#left-palm-crease');
    this.leftTendon1 = wrapper.querySelector('#left-wrist-tendon-1');
    this.leftTendon2 = wrapper.querySelector('#left-wrist-tendon-2');

    // Right hand elements
    this.rightHandGroup = wrapper.querySelector('#right-hand-complex');
    this.rightPalm = wrapper.querySelector('#right-palm-path');
    this.rightPalmRim = wrapper.querySelector('#right-palm-rim');
    this.rightThenar = wrapper.querySelector('#right-thenar-mound');
    this.rightPalmHighlight = wrapper.querySelector('#right-palm-highlight');
    this.rightPalmCrease = wrapper.querySelector('#right-palm-crease');
    this.rightTendon1 = wrapper.querySelector('#right-wrist-tendon-1');
    this.rightTendon2 = wrapper.querySelector('#right-wrist-tendon-2');

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
        shadowBody: group.querySelector('.finger-shadow-body'),
        shadowTip: group.querySelector('.fingertip-shadow-ellipse'),
        dorsalTendon: group.querySelector('.finger-dorsal-tendon'),
        skinContour: group.querySelector('.finger-skin-contour'),
        phalanxes: {
          proximal: group.querySelector('.phalanx-proximal'),
          middle: group.querySelector('.phalanx-middle'),
          distal: group.querySelector('.phalanx-distal')
        },
        specularRidge: group.querySelector('.finger-specular-ridge'),
        knuckles: {
          base: group.querySelector('.knuckle-base'),
          mid: group.querySelector('.knuckle-mid')
        },
        tipAssembly: group.querySelector('.fingertip-assembly-3d'),
        tipCushion: group.querySelector('.fingertip-pad-cushion'),
        tipCore: group.querySelector('.fingertip-pad-core'),
        nailPlate: group.querySelector('.fingernail-plate'),
        nailHighlight: group.querySelector('.fingernail-highlight-curve'),
        halo: group.querySelector('.fingertip-active-halo'),
        targetingRing: group.querySelector('.fingertip-targeting-ring'),
        impactRipple: group.querySelector('.tactile-impact-ripple'),
        label: group.querySelector('.fingertip-key-label'),
        nubBase: group.querySelector('.homing-nub-base'),
        nubGlint: group.querySelector('.homing-nub-glint'),
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

  /**
   * Calculates 3D articulated joints with true human finger proportions.
   */
  getFingerPose(knuckle, target, defaultHome, fingerId, isLeft, elevation = 0) {
    const horizontalReach = target.x - defaultHome.x;
    const outward = fingerId === 'thumbs' ? (isLeft ? -1 : 1) : 0;

    // Organic joint sway & articulation
    const sway = clamp(horizontalReach * 0.18 + outward * 3.5, -22, 22);
    const length = Math.max(1, Math.hypot(target.x - knuckle.x, target.y - knuckle.y));

    // True anatomical finger widths [Base, PIP Joint, DIP Joint, Tip Pad]
    const sizeMap = {
      'left-pinky': [18.5, 15.5, 13, 19.5],
      'right-pinky': [18.5, 15.5, 13, 19.5],
      'left-ring': [20.5, 17, 14.5, 21],
      'right-ring': [20.5, 17, 14.5, 21],
      'left-middle': [22, 18.5, 15.5, 22.5],
      'right-middle': [22, 18.5, 15.5, 22.5],
      'left-index': [21.5, 18, 15, 22],
      'right-index': [21.5, 18, 15, 22],
      thumbs: [23, 19, 16.5, 23]
    };
    const widths = sizeMap[fingerId] || [21, 17, 14.5, 21];

    // Joints along natural finger length
    const jointOne = pointOnLine(knuckle, target, 0.44, sway, -Math.min(5, length * 0.03) - elevation * 4);
    const jointTwo = pointOnLine(knuckle, target, 0.78, sway * 0.5, -Math.min(3, length * 0.018) - elevation * 2.5);

    return {
      knuckle,
      jointOne,
      jointTwo,
      tip: target,
      widths,
      elevation,
      sway
    };
  }

  applyFingerPose(node, pose) {
    const points = [pose.knuckle, pose.jointOne, pose.jointTwo, pose.tip];
    const contourPath = makeOrganicFingerContour(points, pose.widths);
    const centerline = makeCenterlineSpline(points);

    // 1. Dynamic 3D elevation shadow
    if (node.shadowBody) {
      node.shadowBody.setAttribute('d', contourPath);
      const shadowOffsetY = 4 + pose.elevation * 10;
      const shadowOpacity = 0.55 - pose.elevation * 0.18;
      node.shadowBody.style.transform = `translateY(${shadowOffsetY.toFixed(1)}px)`;
      node.shadowBody.style.opacity = shadowOpacity.toFixed(2);
    }

    if (node.shadowTip) {
      node.shadowTip.setAttribute('cx', pose.tip.x);
      node.shadowTip.setAttribute('cy', pose.tip.y + 5 + pose.elevation * 10);
      node.shadowTip.setAttribute('rx', (pose.widths[3] * 0.6 + pose.elevation * 2).toFixed(1));
      node.shadowTip.setAttribute('ry', (pose.widths[3] * 0.4 + pose.elevation * 1.5).toFixed(1));
    }

    // 2. Skin contour & dorsal tendon
    node.skinContour?.setAttribute('d', contourPath);
    node.dorsalTendon?.setAttribute('d', centerline);

    // 3. 3D Cylindrical Phalanx Meshes
    if (node.phalanxes) {
      const p1 = makePhalanxMesh(pose.knuckle, pose.jointOne, pose.widths[0], pose.widths[1]);
      const p2 = makePhalanxMesh(pose.jointOne, pose.jointTwo, pose.widths[1], pose.widths[2]);
      const p3 = makePhalanxMesh(pose.jointTwo, pose.tip, pose.widths[2], pose.widths[3]);
      node.phalanxes.proximal?.setAttribute('d', p1);
      node.phalanxes.middle?.setAttribute('d', p2);
      node.phalanxes.distal?.setAttribute('d', p3);
    }

    // 4. Dorsal Bone Specular Ridge
    node.specularRidge?.setAttribute('d', centerline);

    // 5. Knuckle Capsules
    if (node.knuckles?.base) {
      node.knuckles.base.setAttribute('transform', `translate(${pose.jointOne.x.toFixed(2)}, ${pose.jointOne.y.toFixed(2)})`);
    }
    if (node.knuckles?.mid) {
      node.knuckles.mid.setAttribute('transform', `translate(${pose.jointTwo.x.toFixed(2)}, ${pose.jointTwo.y.toFixed(2)})`);
    }

    // 6. 3D Fingertip Assembly
    if (node.tipAssembly) {
      const tipScale = (1.0 + pose.elevation * 0.06).toFixed(3);
      node.tipAssembly.setAttribute('transform', `translate(${pose.tip.x.toFixed(2)}, ${pose.tip.y.toFixed(2)}) scale(${tipScale})`);
    }

    // 7. Tactile Homing Nub on index keys
    if (node.nubBase) {
      node.nubBase.setAttribute('x', -6);
      node.nubBase.setAttribute('y', 5.2);
    }
    if (node.nubGlint) {
      node.nubGlint.setAttribute('x', -5);
      node.nubGlint.setAttribute('y', 5.6);
    }

    // 8. Fingernail Highlight Curve
    if (node.nailHighlight) {
      node.nailHighlight.setAttribute('d', `M -4.2,-2.2 Q 0,-4.5 4.2,-2.2`);
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

  /**
   * Ultra-Fluid 60-144Hz Animation Loop with IK Palm Glide & Parabolic Arc
   */
  animateHands(timestamp) {
    this.motionFrame = null;
    let hasActiveMotion = false;
    this.idleClock += 0.035;

    // Smooth wrist tilt interpolation
    this.handTilt.left = lerp(this.handTilt.left, this.targetTilt.left, 0.12);
    this.handTilt.right = lerp(this.handTilt.right, this.targetTilt.right, 0.12);

    // Smooth palm glide interpolation
    this.leftPalmOffset.x = lerp(this.leftPalmOffset.x, this.leftPalmTarget.x, 0.12);
    this.leftPalmOffset.y = lerp(this.leftPalmOffset.y, this.leftPalmTarget.y, 0.12);
    this.rightPalmOffset.x = lerp(this.rightPalmOffset.x, this.rightPalmTarget.x, 0.12);
    this.rightPalmOffset.y = lerp(this.rightPalmOffset.y, this.rightPalmTarget.y, 0.12);

    if (this.leftHandGroup) {
      this.leftHandGroup.style.transformOrigin = '25% 100%';
      this.leftHandGroup.style.transform = `translate(${this.leftPalmOffset.x.toFixed(1)}px, ${this.leftPalmOffset.y.toFixed(1)}px) rotate(${this.handTilt.left.toFixed(2)}deg)`;
    }
    if (this.rightHandGroup) {
      this.rightHandGroup.style.transformOrigin = '75% 100%';
      this.rightHandGroup.style.transform = `translate(${this.rightPalmOffset.x.toFixed(1)}px, ${this.rightPalmOffset.y.toFixed(1)}px) rotate(${this.handTilt.right.toFixed(2)}deg)`;
    }

    this.motionStates.forEach((motion, nodeId) => {
      const node = this.fingerNodes.get(nodeId);
      if (!node) return;

      const palmOffset = motion.isLeft ? this.leftPalmOffset : this.rightPalmOffset;
      const adjustedKnuckle = {
        x: motion.knuckle.x + palmOffset.x,
        y: motion.knuckle.y + palmOffset.y
      };

      if (motion.done) {
        // Subtle organic resting breathing micro-motion
        const idleSway = Math.sin(this.idleClock + (motion.isLeft ? 0 : Math.PI)) * 0.35;
        const currentPos = {
          x: motion.current.x,
          y: motion.current.y + (motion.fingerId === 'thumbs' ? 0 : idleSway)
        };

        this.applyFingerPose(node, this.getFingerPose(
          adjustedKnuckle,
          currentPos,
          motion.defaultHome,
          motion.fingerId,
          motion.isLeft,
          0
        ));
        return;
      }

      const elapsed = timestamp - motion.start;
      const progress = clamp(elapsed / motion.duration, 0, 1);

      // Quartic smooth ease-out curve
      const eased = 1 - Math.pow(1 - progress, 4);

      // Parabolic 3D Z-elevation curve (peaks at 1.0 mid-flight)
      const elevation = Math.sin(Math.PI * progress);

      // Upward flight arc in screen space
      const travelDist = Math.hypot(motion.to.x - motion.from.x, motion.to.y - motion.from.y);
      const arcLiftPx = Math.min(20, travelDist * 0.2) * elevation;

      motion.current = {
        x: lerp(motion.from.x, motion.to.x, eased),
        y: lerp(motion.from.y, motion.to.y, eased) - arcLiftPx
      };

      this.applyFingerPose(node, this.getFingerPose(
        adjustedKnuckle,
        motion.current,
        motion.defaultHome,
        motion.fingerId,
        motion.isLeft,
        elevation
      ));

      if (progress < 1) {
        hasActiveMotion = true;
      } else {
        motion.current = { ...motion.to };
        motion.done = true;
      }
    });

    if (hasActiveMotion || Math.abs(this.leftPalmOffset.y - this.leftPalmTarget.y) > 0.1 || Math.abs(this.rightPalmOffset.y - this.rightPalmTarget.y) > 0.1) {
      this.requestMotionFrame();
    }
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
      if (node) this.applyFingerPose(node, this.getFingerPose(knuckle, target, defaultHome, fingerId, isLeft, 0));
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

    const distance = Math.hypot(target.x - existing.from.x, target.y - existing.from.y);
    existing.duration = this.isReducedMotion()
      ? 0
      : clamp(160 + distance * 0.38, 150, 270);
    existing.done = existing.duration === 0;

    if (existing.done) {
      existing.current = { ...target };
      const node = this.fingerNodes.get(nodeId);
      if (node) this.applyFingerPose(node, this.getFingerPose(knuckle, target, defaultHome, fingerId, isLeft, 0));
    } else {
      this.requestMotionFrame();
    }
  }

  /**
   * Instantaneous tactile press impact wave
   */
  triggerPhysicalPress(code, key) {
    if (!this.activeFingerId) return;

    this.fingerNodes.forEach(node => {
      if (node.fingerId === this.activeFingerId) {
        node.group.classList.remove('finger-press-impact');
        void node.group.offsetWidth; // Restart CSS keyframe
        node.group.classList.add('finger-press-impact');
      }
    });
  }

  updateFingers() {
    if (!this.svgOverlay) return;

    const slot = this.container?.querySelector('#mech-kb-slot');
    if (!slot) return;

    const width = slot.offsetWidth || 960;
    const height = slot.offsetHeight || 320;
    this.svgOverlay.setAttribute('viewBox', `0 0 ${width} ${height + 130}`);
    this.svgOverlay.style.height = `${height + 130}px`;

    // Dynamic keycap center coordinates
    const space = this.getKeyCenter('Space', { x: width / 2, y: 260 });
    const homePositions = {
      'left-pinky': this.getKeyCenter('KeyA', { x: 190, y: 155 }),
      'left-ring': this.getKeyCenter('KeyS', { x: 242, y: 155 }),
      'left-middle': this.getKeyCenter('KeyD', { x: 294, y: 155 }),
      'left-index': this.getKeyCenter('KeyF', { x: 346, y: 155 }),
      'left-thumb': { x: space.x - 48, y: space.y - 4 },
      'right-thumb': { x: space.x + 48, y: space.y - 4 },
      'right-index': this.getKeyCenter('KeyJ', { x: 554, y: 155 }),
      'right-middle': this.getKeyCenter('KeyK', { x: 606, y: 155 }),
      'right-ring': this.getKeyCenter('KeyL', { x: 658, y: 155 }),
      'right-pinky': this.getKeyCenter('Semicolon', { x: 710, y: 155 })
    };

    // ========================================================
    // ANATOMICALLY ACCURATE KNUCKLE ARCH (MCP BASELINE)
    // Distance from home key to knuckle is ~60px (proportional)
    // ========================================================
    const leftKnuckles = {
      'left-pinky': { x: homePositions['left-pinky'].x - 5, y: homePositions['left-pinky'].y + 66 },
      'left-ring': { x: homePositions['left-ring'].x - 2, y: homePositions['left-ring'].y + 61 },
      'left-middle': { x: homePositions['left-middle'].x, y: homePositions['left-middle'].y + 57 },
      'left-index': { x: homePositions['left-index'].x + 2, y: homePositions['left-index'].y + 59 },
      'left-thumb': { x: homePositions['left-index'].x + 28, y: space.y + 12 }
    };

    const rightKnuckles = {
      'right-thumb': { x: homePositions['right-index'].x - 28, y: space.y + 12 },
      'right-index': { x: homePositions['right-index'].x - 2, y: homePositions['right-index'].y + 59 },
      'right-middle': { x: homePositions['right-middle'].x, y: homePositions['right-middle'].y + 57 },
      'right-ring': { x: homePositions['right-ring'].x + 2, y: homePositions['right-ring'].y + 61 },
      'right-pinky': { x: homePositions['right-pinky'].x + 5, y: homePositions['right-pinky'].y + 66 }
    };

    this.renderSculptedPalm('left', leftKnuckles, homePositions, height);
    this.renderSculptedPalm('right', rightKnuckles, homePositions, height);

    // Compute IK Palm Target Glide & Wrist Tilt
    this.leftPalmTarget = { x: 0, y: 0 };
    this.rightPalmTarget = { x: 0, y: 0 };
    this.targetTilt.left = 0;
    this.targetTilt.right = 0;

    const updateFinger = (nodeId, knuckle, defaultHome, isLeft) => {
      const node = this.fingerNodes.get(nodeId);
      if (!node) return;

      let target = defaultHome;
      const isActive = this.activeFingerId === node.fingerId;

      if (isActive && this.activeChar && node.fingerId !== 'thumbs') {
        target = this.getCharKeyCenter(this.activeChar, defaultHome);
        const reachDeltaX = target.x - defaultHome.x;
        const reachDeltaY = target.y - defaultHome.y;

        // IK Palm Response: Palm glides forward slightly when reaching for upper rows
        if (isLeft) {
          this.leftPalmTarget.x = clamp(reachDeltaX * 0.22, -14, 14);
          this.leftPalmTarget.y = clamp(reachDeltaY * 0.25, -22, 10);
          this.targetTilt.left = clamp(reachDeltaX * 0.045, -3.5, 3.5);
        } else {
          this.rightPalmTarget.x = clamp(reachDeltaX * 0.22, -14, 14);
          this.rightPalmTarget.y = clamp(reachDeltaY * 0.25, -22, 10);
          this.targetTilt.right = clamp(reachDeltaX * 0.045, -3.5, 3.5);
        }
      }

      if (this.activeFingerId === 'thumbs' && node.fingerId === 'thumbs') {
        target = isLeft ? homePositions['left-thumb'] : homePositions['right-thumb'];
      }

      if (this.shiftNeeded === 'ShiftLeft' && nodeId === 'fg-left-pinky') {
        target = this.getKeyCenter('ShiftLeft', { x: 140, y: 210 });
        this.leftPalmTarget.x = -12;
        this.leftPalmTarget.y = 8;
        this.targetTilt.left = -2.8;
      } else if (this.shiftNeeded === 'ShiftRight' && nodeId === 'fg-right-pinky') {
        target = this.getKeyCenter('ShiftRight', { x: 760, y: 210 });
        this.rightPalmTarget.x = 12;
        this.rightPalmTarget.y = 8;
        this.targetTilt.right = 2.8;
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

  /**
   * Renders a sculpted 3D palm mesh with interdigital web dips and thenar muscle mound.
   */
  renderSculptedPalm(hand, knuckles, homePositions, height) {
    const isLeft = hand === 'left';
    const pinkyK = knuckles[isLeft ? 'left-pinky' : 'right-pinky'];
    const ringK = knuckles[isLeft ? 'left-ring' : 'right-ring'];
    const middleK = knuckles[isLeft ? 'left-middle' : 'right-middle'];
    const indexK = knuckles[isLeft ? 'left-index' : 'right-index'];
    const thumbK = knuckles[isLeft ? 'left-thumb' : 'right-thumb'];

    const palm = isLeft ? this.leftPalm : this.rightPalm;
    const rim = isLeft ? this.leftPalmRim : this.rightPalmRim;
    const thenar = isLeft ? this.leftThenar : this.rightThenar;
    const highlight = isLeft ? this.leftPalmHighlight : this.rightPalmHighlight;
    const crease = isLeft ? this.leftPalmCrease : this.rightPalmCrease;
    const tendon1 = isLeft ? this.leftTendon1 : this.rightTendon1;
    const tendon2 = isLeft ? this.leftTendon2 : this.rightTendon2;
    if (!palm) return;

    const bottom = height + 128;

    // Interdigital web dips between adjacent knuckles
    const webPR = { x: lerp(pinkyK.x, ringK.x, 0.5), y: lerp(pinkyK.y, ringK.y, 0.5) + 6 };
    const webRM = { x: lerp(ringK.x, middleK.x, 0.5), y: lerp(ringK.y, middleK.y, 0.5) + 5 };
    const webMI = { x: lerp(middleK.x, indexK.x, 0.5), y: lerp(middleK.y, indexK.y, 0.5) + 6 };

    // Continuous anatomical palm outline
    const palmPath = isLeft
      ? `M ${pinkyK.x - 16},${pinkyK.y + 4}
         C ${pinkyK.x - 8},${pinkyK.y - 12} ${pinkyK.x + 8},${pinkyK.y - 10} ${webPR.x},${webPR.y}
         C ${ringK.x - 6},${ringK.y - 12} ${ringK.x + 6},${ringK.y - 12} ${webRM.x},${webRM.y}
         C ${middleK.x - 6},${middleK.y - 14} ${middleK.x + 6},${middleK.y - 14} ${webMI.x},${webMI.y}
         C ${indexK.x - 6},${indexK.y - 12} ${indexK.x + 10},${indexK.y - 8} ${indexK.x + 16},${indexK.y + 12}
         C ${thumbK.x + 8},${thumbK.y - 16} ${thumbK.x + 36},${thumbK.y - 6} ${thumbK.x + 42},${thumbK.y + 16}
         C ${thumbK.x + 34},${thumbK.y + 60} ${indexK.x + 24},${bottom - 20} ${indexK.x + 8},${bottom}
         L ${pinkyK.x - 22},${bottom}
         C ${pinkyK.x - 28},${bottom - 24} ${pinkyK.x - 24},${pinkyK.y + 48} ${pinkyK.x - 16},${pinkyK.y + 4} Z`
      : `M ${indexK.x - 16},${indexK.y + 12}
         C ${indexK.x - 10},${indexK.y - 8} ${indexK.x + 6},${indexK.y - 12} ${webMI.x},${webMI.y}
         C ${middleK.x - 6},${middleK.y - 14} ${middleK.x + 6},${middleK.y - 14} ${webRM.x},${webRM.y}
         C ${ringK.x - 6},${ringK.y - 12} ${ringK.x + 6},${ringK.y - 12} ${webPR.x},${webPR.y}
         C ${pinkyK.x - 8},${pinkyK.y - 10} ${pinkyK.x + 8},${pinkyK.y - 12} ${pinkyK.x + 16},${pinkyK.y + 4}
         C ${pinkyK.x + 24},${pinkyK.y + 48} ${pinkyK.x + 28},${bottom - 24} ${pinkyK.x + 22},${bottom}
         L ${indexK.x - 8},${bottom}
         C ${indexK.x - 24},${bottom - 20} ${thumbK.x - 34},${thumbK.y + 60} ${thumbK.x - 42},${thumbK.y + 16}
         C ${thumbK.x - 36},${thumbK.y - 6} ${thumbK.x - 8},${thumbK.y - 16} ${indexK.x - 16},${indexK.y + 12} Z`;

    palm.setAttribute('d', palmPath);

    // Specular upper knuckle arch rim
    rim?.setAttribute('d', isLeft
      ? `M ${pinkyK.x - 14},${pinkyK.y + 2} Q ${middleK.x},${middleK.y - 12} ${indexK.x + 14},${indexK.y + 4}`
      : `M ${indexK.x - 14},${indexK.y + 4} Q ${middleK.x},${middleK.y - 12} ${pinkyK.x + 14},${pinkyK.y + 2}`);

    // Thenar (thumb ball muscle) 3D mound
    thenar?.setAttribute('d', isLeft
      ? `M ${indexK.x + 10},${indexK.y + 25} C ${thumbK.x + 36},${thumbK.y + 10} ${thumbK.x + 30},${bottom - 40} ${indexK.x + 12},${bottom - 45} Z`
      : `M ${indexK.x - 10},${indexK.y + 25} C ${thumbK.x - 36},${thumbK.y + 10} ${thumbK.x - 30},${bottom - 40} ${indexK.x - 12},${bottom - 45} Z`);

    // Palm topography highlight & lifelines
    highlight?.setAttribute('d', isLeft
      ? `M ${pinkyK.x - 6},${pinkyK.y + 28} Q ${middleK.x + 2},${middleK.y + 48} ${thumbK.x + 22},${thumbK.y + 28}`
      : `M ${thumbK.x - 22},${thumbK.y + 28} Q ${middleK.x - 2},${middleK.y + 48} ${pinkyK.x + 6},${pinkyK.y + 28}`);

    crease?.setAttribute('d', isLeft
      ? `M ${indexK.x + 2},${indexK.y + 30} Q ${indexK.x + 28},${indexK.y + 54} ${thumbK.x + 8},${thumbK.y + 38}`
      : `M ${thumbK.x - 8},${thumbK.y + 38} Q ${indexK.x - 28},${indexK.y + 54} ${indexK.x - 2},${indexK.y + 30}`);

    // Wrist flexor tendon accents
    tendon1?.setAttribute('d', `M ${indexK.x - 2},${indexK.y + 60} L ${indexK.x - 2},${bottom}`);
    tendon2?.setAttribute('d', `M ${indexK.x + 12},${indexK.y + 62} L ${indexK.x + 12},${bottom}`);
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
