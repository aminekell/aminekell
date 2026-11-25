import * as THREE from './vendor/three.module.js';

const KEYFRAMES = [
  { at: 0, camera: [0, 0, 17], target: [0, 0, 0], fov: 36, hinge: 0, separation: 0, signal: [4.25, -2.35, 0.18], label: 'PROFILE / READY TO SAVE' },
  { at: 0.14, camera: [2.4, -1.15, 11], target: [3.8, -2.1, 0], fov: 34, hinge: 0, separation: 0.12, signal: [4.25, -2.35, 0.18], label: 'SAVE / REQUEST CREATED' },
  { at: 0.28, camera: [0.2, 1.5, 17.5], target: [0, -2, -3.8], fov: 46, hinge: -1.12, separation: 1.1, signal: [0, -3.25, -1.8], label: 'GUTTER / SIGNAL FALLING' },
  { at: 0.38, camera: [0, 0.5, 15.5], target: [0, -4.5, -5.3], fov: 44, hinge: -1.12, separation: 2.4, signal: [3.5, -4.5, -4.15], label: 'BROWSER / PROFILE SAVE' },
  { at: 0.49, camera: [2.4, -3.8, -2.4], target: [3.5, -4.5, -8.7], fov: 42, hinge: -1.12, separation: 2.7, signal: [3.5, -4.5, -4.5], label: 'BROWSER / PROFILE SAVE' },
  { at: 0.59, camera: [-0.7, -2.3, -6.2], target: [-1.2, -2.7, -10.6], fov: 42, hinge: -1.12, separation: 2.9, signal: [-1.2, -2.7, -9.2], label: 'GATEWAY / REQUEST ROUTED' },
  { at: 0.68, camera: [0.7, -1, -11.2], target: [1.25, -1, -15.8], fov: 42, hinge: -1.12, separation: 3, signal: [1.25, -1, -14.4], label: 'COMPANY SERVICE / NAME ACCEPTED' },
  { at: 0.719, camera: [0.7, -1, -11.2], target: [1.25, -1, -15.8], fov: 42, hinge: -1.12, separation: 3, signal: [1.25, -1, -14.4], label: 'COMPANY SERVICE / NAME ACCEPTED' },
  { at: 0.72, camera: [0, 0.1, -10], target: [0, 0, -18.7], fov: 48, hinge: -1.12, separation: 3, signal: [0, 0, -18.52], label: 'IMAGE STORAGE / UPLOAD FAILED' },
  { at: 0.76, camera: [0, 0.1, -10], target: [0, 0, -18.7], fov: 48, hinge: -1.12, separation: 3, signal: [0, 0, -18.52], label: 'IMAGE STORAGE / UPLOAD FAILED' },
  { at: 0.84, camera: [0, 0.1, -10], target: [0, 0, -18.7], fov: 48, hinge: -1.12, separation: 3, signal: [0, 0, -18.52], label: '503 / THE FAILURE SPREAD' },
  { at: 0.92, camera: [0, 0.2, -2.5], target: [0, 0, -7], fov: 40, hinge: -0.6, separation: 1.3, signal: [4, -0.5, 0.18], label: 'FOLDING THE MACHINE BACK INTO PAPER' },
  { at: 1, camera: [0, 0, 17], target: [0, 0, 0], fov: 36, hinge: 0, separation: 0, signal: [4, -0.5, 0.18], label: 'ONE CRIMSON MARK REMAINS' },
];

const BEATS = [
  { at: 0, beat: '01 / THE PRINTED PAGE', heading: 'A quiet spread. One small signal.', caption: 'The owner edits the company profile and presses Save.' },
  { at: 0.2, beat: '02 / THE GUTTER OPENS', heading: 'The page has an underside.', caption: 'Paper, ink, halftone, and foreground art peel apart at the hinge.' },
  { at: 0.37, beat: '03 / INSIDE THE REQUEST', heading: 'Follow the signal into the system.', caption: 'Browser → gateway → company service → image storage.' },
  { at: 0.72, beat: '04 / THE FAILURE SPREAD', heading: 'The logo failed. What should publish?', caption: 'The request stops at image storage. The new name is still waiting.' },
  { at: 0.86, beat: '05 / BACK TO THE PAGE', heading: 'The machine folds back into print.', caption: 'The system closes. One red mark stays where the failure happened.' },
];
const MOBILE_SIGNAL_KEYFRAMES = [
  [0, [1.35, -3.55, 0.18]],
  [0.14, [1.35, -3.55, 0.18]],
  [0.28, [0, 0, -1.8]],
  [0.38, [0, 0, -4.15]],
  [0.49, [0, 0, -4.5]],
  [0.59, [-1.2, 0.3, -9.2]],
  [0.68, [1.25, -0.15, -14.4]],
  [0.76, [0, 0, -18.52]],
  [0.84, [0, 0, -18.52]],
  [0.92, [1.35, -2.65, 0.18]],
  [1, [1.35, -2.65, 0.18]],
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const lerpVector = (a, b, t) => a.map((value, index) => lerp(value, b[index], t));

function frameAt(progress, mobile = false) {
  let index = 0;
  while (index < KEYFRAMES.length - 2 && progress > KEYFRAMES[index + 1].at) index++;
  const from = KEYFRAMES[index];
  const to = KEYFRAMES[index + 1];
  const amount = clamp((progress - from.at) / (to.at - from.at), 0, 1);
  const signalPath = mobile ? MOBILE_SIGNAL_KEYFRAMES : KEYFRAMES.map(({ at, signal }) => [at, signal]);
  let signalIndex = 0;
  while (signalIndex < signalPath.length - 2 && progress > signalPath[signalIndex + 1][0]) signalIndex++;
  const signalFrom = signalPath[signalIndex];
  const signalTo = signalPath[signalIndex + 1];
  const signalAmount = clamp((progress - signalFrom[0]) / (signalTo[0] - signalFrom[0]), 0, 1);
  const frame = {
    camera: lerpVector(from.camera, to.camera, amount),
    target: lerpVector(from.target, to.target, amount),
    signal: lerpVector(signalFrom[1], signalTo[1], signalAmount),
    fov: lerp(from.fov, to.fov, amount),
    hinge: lerp(from.hinge, to.hinge, amount),
    separation: lerp(from.separation, to.separation, amount),
  };
  if (mobile && progress <= 0.28) {
    frame.camera[0] *= 0.5;
    frame.camera[2] += 1.5;
    frame.target[0] *= 0.35;
    frame.fov += 6;
  }
  if (mobile && progress >= 0.72 && progress <= 0.84) {
    frame.camera[2] = -7.8;
    frame.target[2] = -18.7;
    frame.fov = 48;
  } else if (mobile && progress > 0.84 && progress < 0.92) {
    const foldProgress = (progress - 0.84) / 0.08;
    frame.camera[2] = lerp(-7.8, -2.5, foldProgress);
    frame.target[2] = lerp(-18.7, -7, foldProgress);
    frame.fov = lerp(48, 40, foldProgress);
  }
  return frame;
}

function paperTexture(kind, mobile = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  const mobileSegment = kind === 'mobile-top' || kind === 'mobile-bottom' || (mobile && kind.startsWith('failure-'));
  canvas.height = mobileSegment ? 675 : (mobile ? 1350 : 1200);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable for the manga artwork.');
  const { width, height } = canvas;
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, width, height);

  for (let y = 24; y < height; y += 14) {
    for (let x = 20 + (Math.floor(y / 14) % 2) * 7; x < width; x += 14) {
      ctx.fillStyle = '#11111122';
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = '#111';
  ctx.lineWidth = 12;
  ctx.strokeRect(24, 24, width - 48, height - 48);
  ctx.lineWidth = 5;

  const inkText = (text, x, y, size, weight = 700, align = 'left') => {
    ctx.fillStyle = '#111';
    ctx.font = `${weight} ${size}px Arial, sans-serif`;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
  };
  const panel = (x, y, w, h, fill = '#fffaf2') => {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 5;
    ctx.strokeRect(x, y, w, h);
  };
  const line = (x1, y1, x2, y2, width = 3) => {
    ctx.strokeStyle = '#111';
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  if (kind === 'mobile-top') {
    panel(55, 55, 790, 565, '#fffaf2');
    inkText('NORTHSTAR WORKS', 90, 130, 32);
    inkText('COMPANY PROFILE / 07', 90, 180, 19, 500);
    ctx.beginPath();
    ctx.ellipse(450, 385, 310, 145, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 5;
    ctx.stroke();
    inkText('“A new name deserves', 450, 370, 28, 400, 'center');
    inkText('the right mark.”', 450, 414, 28, 400, 'center');
  } else if (kind === 'mobile-bottom') {
    panel(55, 55, 790, 565, '#fffaf2');
    inkText('SAVE COMPANY PROFILE', 375, 120, 23);
    inkText('NAME', 375, 205, 18);
    inkText('Northstar Studio', 375, 252, 25, 400);
    line(375, 270, 800, 270, 3);
    inkText('NEW LOGO', 375, 350, 18);
    inkText('northstar-mark.svg', 375, 398, 20, 400);
    panel(530, 470, 245, 100, '#111');
    ctx.fillStyle = '#f5f0e8';
    inkText('SAVE', 652, 532, 27, 700, 'center');
  } else if (kind === 'left') {
    panel(55, 55, 790, 180, '#111');
    inkText('NORTHSTAR WORKS', 90, 132, 42, 700);
    ctx.fillStyle = '#f5f0e8';
    ctx.fillText('COMPANY / PROFILE 04', 90, 190);
    panel(55, 270, 790, 405);
    inkText('COMPANY PROFILE', 92, 335, 34);
    inkText('ORGANIZATION / 07', 92, 395, 21, 500);
    line(92, 430, 805, 430, 2);
    inkText('CURRENT NAME', 92, 495, 19, 700);
    inkText('Northstar Works', 92, 550, 34, 400);
    inkText('NEW NAME', 92, 615, 19, 700);
    inkText('Northstar Studio', 92, 656, 27, 400);
    panel(55, 720, 790, 385, '#e8dfd1');
    inkText('UPLOAD QUEUE', 92, 780, 22);
    inkText('northstar-mark.svg', 92, 840, 27, 400);
    inkText('IMAGE / SVG / READY', 92, 895, 17, 500);
    for (let i = 0; i < 10; i++) line(92 + i * 18, 1010, 140 + i * 18, 970, 2);
    inkText('EDIT PROFILE', 92, 1060, 18);
  } else if (kind === 'right') {
    if (mobile) {
      panel(55, 55, 790, 455, '#fffaf2');
      inkText('A NEW CHAPTER', 90, 120, 25);
      inkText('starts with one small change.', 90, 170, 32, 400);
      ctx.beginPath();
      ctx.ellipse(450, 340, 310, 120, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 5;
      ctx.stroke();
      inkText('“Let’s make it official.”', 450, 350, 29, 400, 'center');
      line(55, 675, 845, 675, 9);
      panel(55, 720, 790, 565, '#fffaf2');
      inkText('SAVE COMPANY PROFILE', 90, 785, 24);
      inkText('NAME', 375, 860, 19);
      inkText('Northstar Studio', 375, 915, 28, 400);
      line(375, 934, 800, 934, 3);
      inkText('NEW LOGO', 375, 995, 19);
      inkText('northstar-mark.svg', 375, 1045, 23, 400);
      panel(550, 1115, 250, 90, '#111');
      ctx.fillStyle = '#f5f0e8';
      inkText('SAVE', 675, 1170, 24, 700, 'center');
    } else {
      panel(55, 55, 790, 260, '#fffaf2');
      ctx.beginPath();
      ctx.ellipse(450, 180, 310, 95, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 5;
      ctx.stroke();
      inkText('“Let’s make it official.”', 450, 190, 31, 400, 'center');
      panel(55, 360, 790, 745, '#fffaf2');
      inkText('EDIT COMPANY PROFILE', 405, 430, 25);
      inkText('COMPANY NAME', 405, 505, 18);
      inkText('Northstar Studio', 405, 555, 28, 400);
      line(405, 575, 800, 575, 3);
      inkText('NEW LOGO', 405, 655, 18);
      inkText('northstar-mark.svg', 405, 705, 22, 400);
      panel(530, 900, 245, 100, '#111');
      ctx.fillStyle = '#f5f0e8';
      inkText('SAVE', 652, 963, 28, 700, 'center');
    }
  } else if (kind === 'hatch') {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    for (let x = -height; x < width; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x + height, 0);
      ctx.stroke();
    }
    ctx.restore();
  } else if (kind === 'failure-left' || kind === 'failure-right') {
    panel(55, 55, 790, height - 110, '#fffaf2');
    inkText(kind === 'failure-left' ? 'IMAGE STORAGE' : 'COMPANY PROFILE', 90, 120, 25);
    inkText(kind === 'failure-left' ? 'logo upload timed out' : 'name update received', 90, 180, 22, 400);
    line(55, height * 0.5, 845, height * 0.5, 12);
    for (let i = 0; i < 12; i++) line(85 + i * 56, height - 190, 115 + i * 56, height - 230, 2);
    inkText(kind === 'failure-left' ? '503 / SERVICE UNAVAILABLE' : 'REQUEST INCOMPLETE', 90, height - 100, 19, 700);
  } else {
    panel(55, 55, 790, height - 110, '#fffaf2');
    inkText('BROWSER', width / 2, 150, 30, 700, 'center');
    inkText('PUT /companies/me', width / 2, 205, 20, 400, 'center');
    line(110, 280, 790, 280, 8);
    inkText('GATEWAY', width / 2, 380, 30, 700, 'center');
    inkText('company-service', width / 2, 500, 25, 400, 'center');
    inkText('IMAGE STORAGE', width / 2, 660, 30, 700, 'center');
    inkText('503', width / 2, 850, 150, 700, 'center');
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeLine(points, color = 0x111111, opacity = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const material = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  return new THREE.Line(geometry, material);
}

function makeTextCard(title, subtitle, kind) {
  const canvas = document.createElement('canvas');
  canvas.width = 850;
  canvas.height = 470;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable for the system labels.');
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 12) {
    ctx.fillStyle = '#1111111e';
    for (let x = (y % 24) / 2; x < canvas.width; x += 12) ctx.fillRect(x, y, 2, 2);
  }
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, 95);
  ctx.fillStyle = '#f5f0e8';
  ctx.font = '700 31px Arial, sans-serif';
  ctx.fillText(kind.toUpperCase(), 32, 62);
  ctx.fillStyle = '#111';
  ctx.font = '700 55px Arial, sans-serif';
  ctx.fillText(title.toUpperCase(), 38, 210);
  ctx.font = '26px monospace';
  ctx.fillText(subtitle, 42, 268);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 7;
  ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  ctx.strokeStyle = '#dc143c';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(40, 390);
  ctx.lineTo(canvas.width - 40, 390);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addFrame(group, width, height, z, color = 0x111111, lineWidth = 1, centerX = 0, centerY = 0) {
  const halfW = width / 2;
  const halfH = height / 2;
  const outline = makeLine([
    [centerX - halfW, centerY - halfH, z], [centerX + halfW, centerY - halfH, z],
    [centerX + halfW, centerY + halfH, z], [centerX - halfW, centerY + halfH, z],
    [centerX - halfW, centerY - halfH, z],
  ], color);
  outline.material.linewidth = lineWidth;
  group.add(outline);
}

function addCharacter(parent, mobile = false) {
  const character = new THREE.Group();
  const centerX = mobile ? -1.25 : 1.3;
  const centerY = mobile ? -1.35 : -1.5;
  const shirt = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
  const paper = new THREE.MeshBasicMaterial({ color: 0xf5f0e8, side: THREE.DoubleSide });
  const shape = new THREE.Shape();
  shape.moveTo(-1.25, -2.65);
  shape.lineTo(-1.05, -1.35);
  shape.lineTo(-0.67, -0.95);
  shape.lineTo(-0.55, -0.38);
  shape.lineTo(0.55, -0.38);
  shape.lineTo(0.67, -0.95);
  shape.lineTo(1.05, -1.35);
  shape.lineTo(1.25, -2.65);
  shape.closePath();
  const torso = new THREE.Mesh(new THREE.ShapeGeometry(shape), shirt);
  torso.position.set(centerX, centerY, 0.13);
  character.add(torso);

  const head = new THREE.Mesh(new THREE.CircleGeometry(0.56, 32), paper);
  head.position.set(centerX, centerY + 0.34, 0.15);
  character.add(head);
  const headOutline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.CircleGeometry(0.56, 32)),
    new THREE.LineBasicMaterial({ color: 0x111111 })
  );
  headOutline.position.copy(head.position);
  character.add(headOutline);

  const hair = new THREE.Shape();
  hair.moveTo(-0.62, 0.24);
  hair.lineTo(-0.44, 0.86);
  hair.lineTo(-0.05, 1.02);
  hair.lineTo(0.22, 0.84);
  hair.lineTo(0.58, 0.83);
  hair.lineTo(0.65, 0.27);
  hair.lineTo(0.36, 0.54);
  hair.lineTo(0.04, 0.66);
  hair.lineTo(-0.29, 0.52);
  hair.closePath();
  const hairMesh = new THREE.Mesh(new THREE.ShapeGeometry(hair), shirt);
  hairMesh.position.set(centerX, centerY, 0.17);
  character.add(hairMesh);
  for (const eyeX of [-0.2, 0.2]) {
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), shirt);
    eye.position.set(centerX + eyeX, centerY + 0.38, 0.19);
    character.add(eye);
  }
  parent.add(character);
  return character;
}

function addDesktopSpread(scene) {
  const spread = new THREE.Group();
  const paper = new THREE.MeshBasicMaterial({ color: 0xf5f0e8, side: THREE.DoubleSide });
  const leftPage = new THREE.Group();
  const leftBody = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 0.12), paper);
  leftBody.position.set(-3, 0, -0.04);
  leftPage.add(leftBody);
  const leftArt = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 8),
    new THREE.MeshBasicMaterial({ map: paperTexture('left'), side: THREE.DoubleSide })
  );
  leftArt.position.set(-3, 0, 0.03);
  leftPage.add(leftArt);
  addFrame(leftPage, 5.8, 7.8, 0.1, 0x111111, 1, -3, 0);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.6, 8.6),
    new THREE.MeshBasicMaterial({ map: paperTexture('hatch'), transparent: true, opacity: 0.42, side: THREE.DoubleSide })
  );
  shadow.position.set(-3, -0.15, -0.18);
  leftPage.add(shadow);
  spread.add(leftPage);

  const hinge = new THREE.Group();
  const rightBody = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 0.12), paper);
  rightBody.position.set(3, 0, -0.04);
  hinge.add(rightBody);
  const rightArt = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 8),
    new THREE.MeshBasicMaterial({ map: paperTexture('right'), side: THREE.DoubleSide })
  );
  rightArt.position.set(3, 0, 0.03);
  hinge.add(rightArt);
  addFrame(hinge, 5.8, 7.8, 0.1, 0x111111, 1, 3, 0);
  const figure = addCharacter(hinge);
  const figureShadow = figure.clone();
  figureShadow.traverse((child) => {
    if (child.isMesh) {
      child.material = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.22 });
      child.position.z = -0.22;
    }
  });
  figureShadow.position.set(-0.12, -0.12, -0.08);
  hinge.add(figureShadow);
  spread.add(hinge);

  const gutter = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 8, 0.16),
    new THREE.MeshBasicMaterial({ color: 0x111111 })
  );
  gutter.position.z = 0.05;
  spread.add(gutter);
  scene.add(spread);
  return { spread, hinge, figure, leftPage, gutter };
}

function addMobileSpread(scene) {
  const spread = new THREE.Group();
  const paper = new THREE.MeshBasicMaterial({ color: 0xf5f0e8, side: THREE.DoubleSide });
  const upper = new THREE.Group();
  const upperBody = new THREE.Mesh(new THREE.BoxGeometry(6, 4.5, 0.12), paper);
  upperBody.position.set(0, 2.25, -0.04);
  upper.add(upperBody);
  const upperArt = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 4.5),
    new THREE.MeshBasicMaterial({ map: paperTexture('mobile-top', true), side: THREE.DoubleSide })
  );
  upperArt.position.set(0, 2.25, 0.03);
  upper.add(upperArt);
  addFrame(upper, 5.8, 4.3, 0.1, 0x111111, 1, 0, 2.25);
  spread.add(upper);

  const lowerHinge = new THREE.Group();
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(6, 4.5, 0.12), paper);
  lowerBody.position.set(0, -2.25, -0.04);
  lowerHinge.add(lowerBody);
  const lowerArt = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 4.5),
    new THREE.MeshBasicMaterial({ map: paperTexture('mobile-bottom', true), side: THREE.DoubleSide })
  );
  lowerArt.position.set(0, -2.25, 0.03);
  lowerHinge.add(lowerArt);
  addFrame(lowerHinge, 5.8, 4.3, 0.1, 0x111111, 1, 0, -2.25);
  addCharacter(lowerHinge, true);
  spread.add(lowerHinge);

  const gutter = new THREE.Mesh(new THREE.BoxGeometry(6, 0.13, 0.16), new THREE.MeshBasicMaterial({ color: 0x111111 }));
  gutter.position.z = 0.05;
  spread.add(gutter);
  scene.add(spread);
  return { spread, hinge: lowerHinge, figure: lowerHinge, leftPage: upper, gutter };
}

function addMachine(scene, mobile) {
  const stations = [
    { name: 'Browser', detail: 'PUT /companies/me', kind: 'PROFILE / SAVE', position: [mobile ? 0 : 3.5, mobile ? 0 : -4.5, -4.5] },
    { name: 'Gateway', detail: 'request routed', kind: 'AUTH / ROUTE', position: [-1.2, mobile ? 0.3 : -2.7, -9.6] },
    { name: 'Company service', detail: 'name accepted', kind: 'PROFILE / UPDATE', position: [1.25, mobile ? -0.15 : -1, -14.8] },
    { name: 'Image storage', detail: 'upload unavailable', kind: 'OBJECT / WRITE', position: [0, 0, -20] },
  ];
  const machine = new THREE.Group();
  const cardWidth = mobile ? 3.1 : 4.2;
  const cardHeight = mobile ? 1.8 : 2.4;
  stations.forEach((station, index) => {
    const [x, y, z] = station.position;
    const stationGroup = new THREE.Group();
    stationGroup.position.set(x, y, z);
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(cardWidth + 1.1, cardHeight + 1.05),
      new THREE.MeshBasicMaterial({ map: paperTexture('hatch'), transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    halo.position.z = -1.5;
    stationGroup.add(halo);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(cardWidth, cardHeight, 0.45),
      new THREE.MeshBasicMaterial({ color: 0xf5f0e8 })
    );
    stationGroup.add(box);
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(cardWidth - 0.16, cardHeight - 0.16),
      new THREE.MeshBasicMaterial({ map: makeTextCard(station.name, station.detail, station.kind), side: THREE.DoubleSide })
    );
    card.position.z = 0.24;
    stationGroup.add(card);
    addFrame(stationGroup, cardWidth, cardHeight, 0.3);
    stationGroup.visible = false;
    station.visual = stationGroup;
    station.revealAt = [0.34, 0.52, 0.62, 0.72][index];
    station.hideAt = [0.52, 0.62, 0.72, 0.84][index];
    machine.add(stationGroup);
  });

  const routePoints = stations.map((station) => new THREE.Vector3(...station.position));
  const curve = new THREE.CatmullRomCurve3(routePoints);
  const baseRoute = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 90, 0.055, 8, false),
    new THREE.MeshBasicMaterial({ color: 0x111111 })
  );
  const liveRoute = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 90, 0.018, 6, false),
    new THREE.MeshBasicMaterial({ color: 0xdc143c })
  );
  machine.add(baseRoute, liveRoute);
  const routeLines = [baseRoute, liveRoute];

  const signal = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xdc143c })
  );
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xdc143c, transparent: true, opacity: 0.17 })
  );
  signal.add(glow, core);
  machine.add(signal);

  const failureSpread = new THREE.Group();
  const failureDepth = -18.7;
  const failureWidth = mobile ? 5.8 : 8.1;
  const failureHeight = mobile ? 7.8 : 5.2;
  const pageMaterial = (kind) => new THREE.MeshBasicMaterial({
    map: paperTexture(kind, mobile),
    side: THREE.DoubleSide,
  });
  const half = failureWidth / 2;
  for (const side of [-1, 1]) {
    const pageWidth = mobile ? failureWidth : failureWidth / 2 - 0.08;
    const pageHeight = mobile ? failureHeight / 2 - 0.08 : failureHeight;
    const pageX = mobile ? 0 : side * failureWidth / 4;
    const pageY = mobile ? side * failureHeight / 4 : 0;
    const page = new THREE.Mesh(
      new THREE.PlaneGeometry(pageWidth, pageHeight),
      pageMaterial(side < 0 ? 'failure-left' : 'failure-right')
    );
    page.position.set(pageX, pageY, failureDepth);
    failureSpread.add(page);
    addFrame(failureSpread, pageWidth - 0.12, pageHeight - 0.12, failureDepth + 0.03, 0x111111, 1, pageX, pageY);
  }
  const gutter = new THREE.Mesh(
    new THREE.BoxGeometry(mobile ? failureWidth : 0.1, mobile ? 0.1 : failureHeight, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x111111 })
  );
  gutter.position.set(0, 0, failureDepth + 0.04);
  failureSpread.add(gutter);
  const impactCanvas = document.createElement('canvas');
  impactCanvas.width = 900;
  impactCanvas.height = 350;
  const impactContext = impactCanvas.getContext('2d');
  if (!impactContext) throw new Error('Canvas 2D is unavailable for the failure panel.');
  impactContext.fillStyle = '#dc143c';
  impactContext.fillRect(0, 0, impactCanvas.width, impactCanvas.height);
  impactContext.strokeStyle = '#111';
  impactContext.lineWidth = 16;
  impactContext.strokeRect(8, 8, impactCanvas.width - 16, impactCanvas.height - 16);
  impactContext.fillStyle = '#fffaf2';
  impactContext.font = '900 245px Arial, sans-serif';
  impactContext.textAlign = 'center';
  impactContext.textBaseline = 'middle';
  impactContext.fillText('503', impactCanvas.width / 2, impactCanvas.height / 2 + 8);
  const impactTexture = new THREE.CanvasTexture(impactCanvas);
  impactTexture.colorSpace = THREE.SRGBColorSpace;
  const impact = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(failureWidth - 0.55, mobile ? 4.5 : 6.2), mobile ? 1.45 : 1.85),
    new THREE.MeshBasicMaterial({ map: impactTexture, side: THREE.DoubleSide })
  );
  impact.position.set(0, 0, failureDepth + 0.16);
  failureSpread.add(impact);
  const outcomeCanvas = document.createElement('canvas');
  outcomeCanvas.width = 900;
  outcomeCanvas.height = 180;
  const outcomeContext = outcomeCanvas.getContext('2d');
  if (!outcomeContext) throw new Error('Canvas 2D is unavailable for the outcome panel.');
  const outcomeTexture = new THREE.CanvasTexture(outcomeCanvas);
  outcomeTexture.colorSpace = THREE.SRGBColorSpace;
  const outcomeCard = new THREE.Mesh(
    new THREE.PlaneGeometry(failureWidth - 0.55, mobile ? 1.05 : 1.15),
    new THREE.MeshBasicMaterial({ map: outcomeTexture, side: THREE.DoubleSide })
  );
  outcomeCard.position.set(0, mobile ? 2.35 : 1.65, failureDepth + 0.18);
  outcomeCard.visible = false;
  failureSpread.add(outcomeCard);
  const setOutcome = (outcome) => {
    outcomeCard.visible = Boolean(outcome);
    if (!outcome) return;
    outcomeContext.fillStyle = '#fffaf2';
    outcomeContext.fillRect(0, 0, outcomeCanvas.width, outcomeCanvas.height);
    outcomeContext.strokeStyle = '#111';
    outcomeContext.lineWidth = 12;
    outcomeContext.strokeRect(8, 8, outcomeCanvas.width - 16, outcomeCanvas.height - 16);
    outcomeContext.fillStyle = '#dc143c';
    outcomeContext.fillRect(8, 8, 24, outcomeCanvas.height - 16);
    outcomeContext.fillStyle = '#111';
    outcomeContext.font = '700 36px monospace';
    outcomeContext.textAlign = 'left';
    outcomeContext.textBaseline = 'middle';
    outcomeContext.fillText(
      mobile
        ? (outcome === 'partial' ? 'STUDIO / OLD LOGO' : 'BOTH EDITS HELD')
        : (outcome === 'partial' ? 'NORTHSTAR STUDIO / OLD LOGO RETAINED' : 'DRAFT / STUDIO + NEW LOGO HELD'),
      58,
      outcomeCanvas.height / 2
    );
    outcomeTexture.needsUpdate = true;
  };
  machine.add(failureSpread);
  scene.add(machine);
  return { machine, signal, stations, routeLines, failureSpread, failureDepth, failureWidth, failureHeight, setOutcome };
}

function updateCaption(root, progress, previousBeat) {
  let beat = 0;
  while (beat < BEATS.length - 1 && progress >= BEATS[beat + 1].at) beat++;
  if (beat !== previousBeat) {
    root.querySelector('[data-sequence-beat]').textContent = BEATS[beat].beat;
    root.querySelector('[data-sequence-heading]').textContent = BEATS[beat].heading;
    root.querySelector('[data-sequence-caption]').textContent = BEATS[beat].caption;
  }
  return beat;
}

export function initHirePathSequence(root) {
  const canvas = root.querySelector('[data-sequence-canvas]');
  const stage = root.querySelector('[data-sequence-stage]');
  const track = root.querySelector('[data-sequence-track]');
  const question = root.querySelector('[data-sequence-question]');
  const nodeLabel = root.querySelector('[data-sequence-node]');
  const status = root.querySelector('[data-sequence-status]');
  if (!canvas || !stage || !track || !question || !nodeLabel || !status) {
    throw new Error('HirePath 3D scene is missing required markup.');
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: true,
      powerPreference: 'low-power',
    });
  } catch (error) {
    console.info('WebGL is unavailable; showing the illustrated HirePath sequence instead.', error);
    const fallbackStatus = root.querySelector('[data-fallback-status]');
    if (fallbackStatus) fallbackStatus.textContent = 'Illustrated reading mode: WebGL is unavailable. The decision and both endings remain available below.';
    return;
  }

  const mobile = window.matchMedia('(max-width: 768px)').matches;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd7cebd);
  scene.fog = new THREE.Fog(0xd7cebd, 23, 42);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
  const page = mobile ? addMobileSpread(scene) : addDesktopSpread(scene);
  const machine = addMachine(scene, mobile);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0xd7cebd, 1);
  root.classList.add('is-webgl');

  let visible = false;
  let scheduled = false;
  let lastProgress = -1;
  let currentBeat = -1;
  let lastLabel = '';
  let lastOutcome = '';

  const updateVisibility = () => {
    const rect = stage.getBoundingClientRect();
    const next = rect.bottom > 0 && rect.top < window.innerHeight;
    if (next !== visible) {
      visible = next;
      if (visible) lastProgress = -1;
    }
  };

  const resize = () => {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    lastProgress = -1;
    updateVisibility();
    schedule();
  };

  const render = () => {
    scheduled = false;
    if (!visible || document.hidden) return;
    const rect = track.getBoundingClientRect();
    const progress = clamp(-rect.top / Math.max(1, rect.height - stage.clientHeight), 0, 1);
    if (Math.abs(progress - lastProgress) < 0.0001 && lastOutcome === (root.dataset.outcome || '')) return;
    lastProgress = progress;
    const frame = frameAt(progress, mobile);
    camera.position.set(...frame.camera);
    camera.lookAt(...frame.target);
    camera.fov = mobile ? Math.min(60, frame.fov * 1.18) : frame.fov;
    camera.updateProjectionMatrix();
    page.hinge.rotation.y = mobile ? 0 : frame.hinge;
    if (mobile) page.hinge.rotation.x = frame.hinge * -0.75;
    page.spread.rotation.x = mobile ? 0 : frame.hinge * 0.65;
    page.spread.position.z = -frame.separation * 0.35;
    page.leftPage.position.z = -frame.separation * 0.25;
    page.figure.position.z = frame.separation * 0.32;
    page.gutter.position.z = 0.05 + frame.separation * 0.28;
    machine.signal.position.set(...frame.signal);
    machine.stations.forEach((station) => {
      station.visual.visible = progress >= station.revealAt && progress < station.hideAt;
    });
    machine.routeLines.forEach((routeLine) => {
      routeLine.visible = progress < 0.72;
    });

    const beat = updateCaption(root, progress, currentBeat);
    currentBeat = beat;
    const upperKeyframe = KEYFRAMES.reduce((previous, keyframe) => keyframe.at <= progress ? keyframe : previous, KEYFRAMES[0]);
    if (upperKeyframe.label !== lastLabel) {
      nodeLabel.textContent = upperKeyframe.label;
      lastLabel = upperKeyframe.label;
    }
    question.hidden = progress < 0.72 || progress >= 0.86;
    const outcome = root.dataset.outcome || '';
    if (outcome !== lastOutcome) {
      stage.dataset.outcome = outcome;
      machine.setOutcome(outcome);
      lastOutcome = outcome;
    }
    if (progress >= 0.72 && !outcome) {
      status.textContent = 'The request stopped at image storage. Choose what the interface should publish.';
    }
    renderer.render(scene, camera);
  };

  function schedule() {
    if (scheduled || !visible || document.hidden) return;
    scheduled = true;
    requestAnimationFrame(render);
  }

  root.addEventListener('click', schedule);
  const onScroll = () => {
    updateVisibility();
    schedule();
  };
  const onVisibilityChange = () => {
    updateVisibility();
    if (!document.hidden) schedule();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  resize();
  schedule();
}
