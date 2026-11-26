import * as THREE from './vendor/three.module.js';

// Weighted monotone tangents prevent a camera from overshooting its framing.
// Sampling is a pure function of the scroll position in either direction.
export function cameraPath(times, points) {
  const secant = (i, axis) => (points[i + 1][axis] - points[i][axis]) / (times[i + 1] - times[i]);
  const slopes = points.map((point, i) => point.map((_, axis) => {
    if (i === 0 || i === points.length - 1) return 0;
    const before = secant(i - 1, axis);
    const after = secant(i, axis);
    if (before * after <= 0) return 0;
    const a = times[i] - times[i - 1];
    const b = times[i + 1] - times[i];
    return 3 * (a + b) / ((2 * b + a) / before + (b + 2 * a) / after);
  }));

  return (progress, output) => {
    let right = times.findIndex((time) => time > progress);
    if (right < 0) right = times.length - 1;
    else if (right === 0) right = 1;
    const left = right - 1;
    const span = times[right] - times[left];
    const t = Math.min(1, Math.max(0, (progress - times[left]) / span));
    const t2 = t * t;
    const t3 = t2 * t;
    for (let axis = 0; axis < 3; axis++) {
      output[axis] = (2 * t3 - 3 * t2 + 1) * points[left][axis]
        + (t3 - 2 * t2 + t) * slopes[left][axis] * span
        + (-2 * t3 + 3 * t2) * points[right][axis]
        + (t3 - t2) * slopes[right][axis] * span;
    }
    return output;
  };
}

export function addPrintAtmosphere(scene, mobile, {near = 5, far = -37} = {}) {
  const count = mobile ? 48 : 105;
  const positions = new Float32Array(count * 3);
  let seed = 47981;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() - .5) * 21;
    positions[i * 3 + 1] = .15 + random() * 8.3;
    positions[i * 3 + 2] = far + random() * (near - far);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x88665a, size: mobile ? .028 : .036, transparent: true,
    opacity: 0, depthWrite: false, sizeAttenuation: true,
  });
  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
  return (progress, opacity) => {
    particles.visible = opacity > .004;
    particles.position.set(progress * .46, Math.sin(progress * Math.PI) * .65, 0);
    material.opacity = opacity;
  };
}
