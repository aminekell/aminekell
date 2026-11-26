import * as THREE from './vendor/three.module.js';

const PAPER = 0xf5f0e8;
const INK = 0x191719;
const RED = 0xc41639;

function buildInception(scene, block) {
  const layers = [0, 1, 2, 3].map((index) => {
    const layer = new THREE.Group();
    layer.position.y = index * 1.08;
    scene.add(layer);
    block(layer, [5, .23, 3.2], [0, 0, 0], index === 0 ? INK : PAPER);
    for (const x of [-2.15, 2.15]) {
      block(layer, [.38, .48, 2.6], [x, .34, 0], INK);
    }
    if (index === 0) {
      for (const x of [-1.15, 0, 1.15]) block(layer, [.83, .33, 1.28], [x, .29, 0], PAPER);
    } else {
      block(layer, [3.3, .38, 1.48], [0, .32, 0], [PAPER, 0xb7a897, 0xd6bbaa, PAPER][index]);
      for (const x of [-.85, -.55, -.25, .05]) block(layer, [.12, .09, .06], [x, .38, .76], INK);
    }
    return layer;
  });
  const route = block(scene, [.08, 3.45, .08], [1.5, 1.88, 1], RED);
  return (amount, camera) => {
    layers[2].position.x = amount * 2.4;
    layers[2].rotation.y = amount * .22;
    route.scale.y = 1 - .48 * amount;
    route.position.y = 1.88 + amount * .82;
    camera.position.set(8, 6.4, 9);
    camera.lookAt(.45, 1.9, 0);
  };
}

function buildCorridor(scene, block) {
  block(scene, [7.2, .18, 8.6], [0, -.12, 0], 0xe9ded0);
  const grid = new THREE.GridHelper(8, 8, INK, 0xaa9f92);
  grid.position.y = -.021;
  scene.add(grid);
  for (const x of [-3.1, 3.1]) block(scene, [.5, 2.8, 8], [x, 1.4, 0], 0xd4c2a9);
  block(scene, [6.5, 2.8, .4], [0, 1.4, -3.8], PAPER);
  for (const x of [-2.64, 2.64]) {
    for (const z of [-3, -1.2, .6, 2.4]) block(scene, [.32, 2.8, .15], [x, 1.4, z], INK);
  }
  block(scene, [.07, .05, 5.9], [0, .035, -.64], RED);
  block(scene, [.23, .08, .25], [0, .035, -3.55], RED);
  block(scene, [.17, .19, .17], [0, .09, 2.31], RED);
  const overhead = new THREE.Vector3(6.7, 10, 8.4);
  const eye = new THREE.Vector3(0, 1.25, 2.53);
  const mapCenter = new THREE.Vector3(0, 0, -.1);
  const farWall = new THREE.Vector3(0, 1.1, -3.5);
  const target = new THREE.Vector3();
  return (amount, camera) => {
    camera.position.lerpVectors(overhead, eye, amount);
    camera.lookAt(target.lerpVectors(mapCenter, farWall, amount));
  };
}

export function initProjectDepthScene(panel) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const stage = panel.querySelector('.depth-stage');
  const track = panel.querySelector('.depth-scroll-track');
  const sticky = panel.querySelector('.depth-scroll-frame');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'depth-project-canvas';
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'low-power'});
  } catch {
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xebdfce);
  const camera = new THREE.PerspectiveCamera(43, 1, .07, 60);
  scene.add(new THREE.HemisphereLight(0xfff8e8, 0x635c69, 1.7));
  const key = new THREE.DirectionalLight(0xffebce, 1.3);
  key.position.set(-4, 8, 6);
  scene.add(key);

  const outlines = new THREE.LineBasicMaterial({color: INK});
  const materials = new Map();
  function block(parent, size, position, color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshLambertMaterial({color}));
    const geometry = new THREE.BoxGeometry(...size);
    const mesh = new THREE.Mesh(geometry, materials.get(color));
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), outlines));
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }

  const inception = stage.classList.contains('depth-stage--stack');
  const layout = inception ? buildInception(scene, block) : buildCorridor(scene, block);
  const className = inception ? 'is-stopped' : 'is-projected';
  const button = panel.querySelector('[data-depth-action]');
  let amount = Number(panel.classList.contains(className));
  let frame = 0;
  let scrollFrame = 0;

  function render() {
    layout(amount, camera);
    renderer.render(scene, camera);
  }

  function resize() {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5, 1050 / width));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  }

  function animate() {
    cancelAnimationFrame(frame);
    const from = amount;
    const to = Number(panel.classList.contains(className));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      amount = to;
      render();
      return;
    }
    let started;
    function tick(now) {
      started ??= now;
      const t = Math.min(1, (now - started) / 720);
      amount = THREE.MathUtils.lerp(from, to, t * t * (3 - 2 * t));
      render();
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  }

  function updateFromScroll() {
    scrollFrame = 0;
    if (motion.matches) return;
    const bounds = track.getBoundingClientRect();
    const pinTop = parseFloat(getComputedStyle(sticky).top) || 0;
    const travel = Math.max(1, bounds.height - sticky.offsetHeight);
    const progress = THREE.MathUtils.clamp((pinTop - bounds.top) / travel, 0, 1);
    const next = progress * progress * (3 - 2 * progress);
    if (Math.abs(next - amount) < .0001) return;
    cancelAnimationFrame(frame);
    amount = next;
    panel.dispatchEvent(new CustomEvent('depth-scroll-state', {detail: progress >= .85}));
    render();
  }

  function onScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateFromScroll);
  }

  const sizeObserver = new ResizeObserver(() => {
    resize();
    onScroll();
  });
  function dispose() {
    cancelAnimationFrame(frame);
    cancelAnimationFrame(scrollFrame);
    sizeObserver.disconnect();
    window.removeEventListener('scroll', onScroll);
    panel.removeEventListener('click', onClick);
    window.removeEventListener('pagehide', onPageHide);
    canvas.removeEventListener('webglcontextlost', onLoss);
    const resources = new Set();
    scene.traverse(({geometry, material}) => {
      if (geometry) resources.add(geometry);
      if (Array.isArray(material)) material.forEach((item) => resources.add(item));
      else if (material) resources.add(material);
    });
    resources.forEach((resource) => resource.dispose());
    renderer.dispose();
    panel.classList.remove('has-project-webgl');
    canvas.remove();
  }
  function onPageHide(event) {
    if (!event.persisted) dispose();
  }
  function onLoss(event) {
    event.preventDefault();
    dispose();
  }
  function onClick(event) {
    if (event.target.closest('[data-depth-action]') === button) animate();
  }

  stage.append(canvas);
  panel.classList.add('has-project-webgl');
  sizeObserver.observe(stage);
  panel.addEventListener('click', onClick);
  canvas.addEventListener('webglcontextlost', onLoss);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('scroll', onScroll, {passive: true});
}
