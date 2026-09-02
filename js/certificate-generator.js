/**
 * High-Resolution Diploma & Certificate Generator
 * Renders print-ready (300 DPI / 2400x1600) certificates via HTML5 Canvas.
 */

export function getTypingRank(wpm = 0) {
  if (wpm >= 90) return { title: 'Grandmaster Typist', badge: '👑', color: '#7C5CFC', desc: 'Elite Speed & Flawless Precision' };
  if (wpm >= 70) return { title: 'Master Typist', badge: '💎', color: '#00D4AA', desc: 'Advanced Professional Velocity' };
  if (wpm >= 50) return { title: 'Expert Typist', badge: '⚡', color: '#FFB86B', desc: 'High Efficiency Touch Typist' };
  if (wpm >= 30) return { title: 'Proficient Typist', badge: '🎯', color: '#6366F1', desc: 'Solid Home-Row Foundation' };
  return { title: 'Apprentice Typist', badge: '🌱', color: '#A5B4FC', desc: 'Developing Progressive Muscle Memory' };
}

/**
 * Draws the high-resolution certificate on an HTML5 Canvas element.
 * @param {HTMLCanvasElement} canvas
 * @param {object} data - { name, wpm, accuracy, date, totalKeystrokes, id }
 */
export function drawCertificate(canvas, data = {}) {
  const W = 2400;
  const H = 1600;
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');
  const name = (data.name || 'Touch Typist').toUpperCase();
  const wpm = data.wpm || 65;
  const acc = data.accuracy || 98;
  const rank = getTypingRank(wpm);
  const dateStr = data.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const certId = data.id || `KF-${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Luxury Dark Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0F0F1A');
  bgGrad.addColorStop(0.5, '#16162A');
  bgGrad.addColorStop(1, '#0A0A14');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. Subtle Radial Center Glow
  const glow = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 800);
  glow.addColorStop(0, 'rgba(124, 92, 252, 0.08)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // 3. Gold Double Border
  ctx.save();
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 14;
  ctx.strokeRect(60, 60, W - 120, H - 120);

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.lineWidth = 4;
  ctx.strokeRect(84, 84, W - 168, H - 168);

  // Corner Ornaments
  const corners = [
    [100, 100], [W - 100, 100],
    [100, H - 100], [W - 100, H - 100]
  ];
  corners.forEach(([cx, cy]) => {
    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // 4. Header Badge & Academy Title
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '700 32px "Inter", sans-serif';
  ctx.fillStyle = '#D4AF37';
  ctx.letterSpacing = '8px';
  ctx.fillText('KEYFLOW TOUCH TYPING ACADEMY', W / 2, 220);

  ctx.font = '800 68px "Inter", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.letterSpacing = '2px';
  ctx.fillText('CERTIFICATE OF PROFICIENCY', W / 2, 310);

  // Subtitle
  ctx.font = '400 28px "Inter", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.fillText('THIS IS PROUDLY PRESENTED TO', W / 2, 430);

  // 5. Recipient Name
  ctx.font = '900 82px "Inter", sans-serif';
  const nameGrad = ctx.createLinearGradient(W / 2 - 400, 0, W / 2 + 400, 0);
  nameGrad.addColorStop(0, '#CBA6F7');
  nameGrad.addColorStop(0.5, '#FFFFFF');
  nameGrad.addColorStop(1, '#89B4FA');
  ctx.fillStyle = nameGrad;
  ctx.fillText(name, W / 2, 530);

  // Underline
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 350, 590);
  ctx.lineTo(W / 2 + 350, 590);
  ctx.stroke();

  // Citation
  ctx.font = '400 30px "Inter", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText('For successfully demonstrating verifiable speed, precision, and mastery in touch typing.', W / 2, 660);
  ctx.fillText(`Awarded the official rank of ${rank.title} with 10-finger muscle memory proficiency.`, W / 2, 715);

  // 6. Verified Stats Grid
  const gridY = 880;
  const cards = [
    { label: 'VERIFIED SPEED', value: `${wpm} WPM`, sub: 'Peak Net Words Per Minute', color: '#7C5CFC' },
    { label: 'ACCURACY RATING', value: `${acc}%`, sub: 'Keystroke Fidelity Target', color: '#00D4AA' },
    { label: 'OFFICIAL RANK', value: rank.title, sub: rank.desc, color: '#FFB86B' }
  ];

  const cardW = 560;
  const cardH = 220;
  const startX = (W - (cardW * 3 + 80)) / 2;

  cards.forEach((card, i) => {
    const x = startX + i * (cardW + 40);
    // Card background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    roundRect(ctx, x, gridY, cardW, cardH, 20);
    ctx.fill();
    ctx.stroke();

    // Top Label
    ctx.font = '700 20px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(card.label, x + cardW / 2, gridY + 50);

    // Big Value
    ctx.font = '800 52px "JetBrains Mono", monospace';
    ctx.fillStyle = card.color;
    ctx.fillText(card.value, x + cardW / 2, gridY + 115);

    // Subtitle
    ctx.font = '400 20px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(card.sub, x + cardW / 2, gridY + 170);
  });

  // 7. Gold Seal
  const sealX = W / 2;
  const sealY = 1270;
  const sealR = 100;

  // Outer rays
  ctx.save();
  ctx.translate(sealX, sealY);
  ctx.fillStyle = 'rgba(212, 175, 55, 0.15)';
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-15, -sealR - 25);
    ctx.lineTo(15, -sealR - 25);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Seal circle
  const sealGrad = ctx.createRadialGradient(sealX, sealY, 10, sealX, sealY, sealR);
  sealGrad.addColorStop(0, '#FFE885');
  sealGrad.addColorStop(0.7, '#D4AF37');
  sealGrad.addColorStop(1, '#AA820A');
  ctx.fillStyle = sealGrad;
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealR - 10, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = '900 48px "Inter", sans-serif';
  ctx.fillStyle = '#3E2A00';
  ctx.fillText('★', sealX, sealY - 15);
  ctx.font = '800 18px "Inter", sans-serif';
  ctx.fillText('VERIFIED MASTER', sealX, sealY + 30);

  // 8. Signatures & Footer
  // Left: Date
  ctx.textAlign = 'left';
  ctx.font = '600 22px "Inter", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(`DATE ISSUED: ${dateStr}`, 180, 1420);
  ctx.font = '400 18px "Inter", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText(`AUTHENTICITY ID: ${certId}`, 180, 1460);

  // Right: Signature
  ctx.textAlign = 'right';
  ctx.font = 'italic 700 28px "Georgia", serif';
  ctx.fillStyle = '#D4AF37';
  ctx.fillText('KeyFlow Assessment Board', W - 180, 1420);
  ctx.font = '600 18px "Inter", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText('DIRECTOR OF TYPING MASTERY & ERGONOMICS', W - 180, 1460);

  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Downloads the canvas as a high-resolution PNG image.
 * @param {HTMLCanvasElement} canvas
 * @param {string} userName
 */
export function downloadCertificatePng(canvas, userName = 'Touch_Typist') {
  const link = document.createElement('a');
  link.download = `KeyFlow-Certificate-${userName.replace(/\s+/g, '_')}.png`;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}
