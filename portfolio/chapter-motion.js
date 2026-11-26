import * as THREE from './vendor/three.module.js';
import {addPrintAtmosphere, cameraPath} from './cinematic-motion.js';

const BLACK = 0x201921;
const PAPER = 0xf3e8d6;
const RED = 0xd3163f;
const MIX = (from, to, t) => from + (to - from) * t;
const clamp = (value) => THREE.MathUtils.clamp(value, 0, 1);
const ease = (value) => { const t = clamp(value); return t * t * (3 - 2 * t); };

const SEQUENCES = {
  origin: {
    captions: ['A city in silhouette', 'The streets rise from the ink', 'An open door to 1337'],
    camera: [[0, 2.8, 15], [6.5, 5.8, 10], [.4, 1.9, 2]],
    target: [[0, 1.8, -2], [0, 1.5, -4], [0, 1.5, -9]],
  },
  arsenal: {
    captions: ['Tools on the workbench', 'The parts turn in the air', 'The circuit comes together'],
    camera: [[0, 3.8, 14], [5, 6.5, 11], [.2, 7.2, 10]],
    target: [[0, .5, 0], [0, .3, 0], [0, .3, 0]],
  },
  machine: {
    captions: ['A packet leaves the page', 'One hop at a time', 'The response comes back'],
    camera: [[2.6, 9, 12], [3.3, 4.1, 2.5], [0, 1.25, -11]],
    target: [[0, 1, -5], [0, 1, -9], [0, 2, -18]],
  },
  finale: {
    captions: ['The last panel', 'Three pages turn', 'A blank page waits'],
    camera: [[0, 2.5, 13], [4.7, 3.8, 3.8], [0, 2.65, -8.3]],
    target: [[0, 2, -6], [0, 2.2, -9], [0, 2.3, -17]],
  },
};

const CAMERAS = Object.fromEntries(Object.entries(SEQUENCES).map(([name, shot]) => [
  name,
  {eye: cameraPath([0,.5,1], shot.camera), look: cameraPath([0,.5,1], shot.target)},
]));

function drawStamp(value) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 224;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f3e8d6';
  ctx.fillRect(0, 0, 512, 224);
  for (let row = 10; row < 218; row += 8) {
    for (let col = 10; col < 506; col += 8) {
      ctx.fillStyle = (row + col) % 5 === 0 ? '#21192170' : '#21192130';
      ctx.fillRect(col + (row % 16) / 4, row, 1.5, 1.5);
    }
  }
  ctx.strokeStyle = '#201921';
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, 492, 204);
  ctx.fillStyle = '#201921';
  ctx.font = '900 84px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, 256, 114, 460);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeScreentone(invert = false) {
  const source = document.createElement('canvas');
  source.width = source.height = 128;
  const ctx = source.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#382330';
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 16; col++) {
      const x = col * 8 + (row % 2) * 4;
      const y = row * 8;
      const coverage = (invert ? 15 - row : row) / 15;
      const radius = .55 + coverage * 1.55 + ((col * 7 + row * 3) % 5) * .12;
      ctx.globalAlpha = .15 + coverage * .26;
      ctx.beginPath();
      ctx.arc(x + 1, y + 2, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(source);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createKit(scene) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const edges = new THREE.EdgesGeometry(box);
  const border = new THREE.LineBasicMaterial({color: BLACK});
  const ink = new THREE.MeshLambertMaterial({color: BLACK});
  const tone = makeScreentone();
  const paper = new THREE.MeshLambertMaterial({color: PAPER, map: tone});
  const crimson = new THREE.MeshBasicMaterial({color: RED, map: makeScreentone(true)});
  const tan = new THREE.MeshLambertMaterial({color: 0xb5a08c, map: tone});
  const materials = {ink, paper, crimson, tan};

  function block(size, position, material = paper, parent = scene, outlined = true) {
    const object = new THREE.Mesh(box, material);
    object.scale.set(...size);
    object.position.set(...position);
    if (outlined) object.add(new THREE.LineSegments(edges, border));
    parent.add(object);
    return object;
  }

  function stamp(value, size, position, parent = scene) {
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({map: drawStamp(value)}));
    plate.position.set(...position);
    parent.add(plate);
    return plate;
  }

  function disc(radius, position) {
    const ball = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), crimson);
    ball.position.set(...position);
    scene.add(ball);
    return ball;
  }

  return {block, stamp, disc, ...materials};
}

function origin(scene, kit, mobile) {
  const {block, stamp, disc, ink, paper, tan} = kit;
  block([22, .18, 18], [0, -.14, -4], tan);
  block([2.6, .04, 16], [0, -.01, -4], ink);
  const moon = disc(2.6, [0, 4.6, -12]);
  const buildings = [];
  for (let index = 0; index < (mobile ? 13 : 22); index++) {
    const side = index % 2 ? 1 : -1;
    const x = side * (2 + (index % 5) * .6);
    const z = 1.3 - Math.floor(index / 2) * 1.35;
    const height = .65 + index % 5 * .47 + (index === 8 ? 1.3 : 0);
    const house = new THREE.Group();
    house.position.set(x, 0, z);
    scene.add(house);
    block([1.15, height, 1.1], [0, height/2, 0], index % 3 ? paper : tan, house);
    block([.87, .12, .9], [0, height, 0], ink, house);
    for (const slit of [-.25, .25]) block([.11, .25, .025], [slit, height*.67, .56], ink, house, false);
    if (index === 8 || index === 11) {
      block([.14, .62, .14], [0, height + .34, 0], ink, house);
      block([.25, .08, .25], [0, height + .57, 0], paper, house);
    }
    buildings.push({house, height, index});
  }
  const gateway = new THREE.Group();
  gateway.position.set(0, 0, -8.2);
  scene.add(gateway);
  for (const x of [-1.5, 1.5]) block([.29, 3.65, .51], [x, 1.82, 0], ink, gateway);
  block([3.35, .64, .55], [0, 3.55, 0], paper, gateway);
  stamp('1337', [1.64, .63], [0, 3.56, .29], gateway);
  return (p) => {
    for (const {house, height, index} of buildings) {
      const local = ease((p - (index % 7) * .023) / .48);
      house.scale.y = .16 + .84 * local;
      house.position.y = -height * .12 * (1 - local);
    }
    gateway.position.y = -1.9 * (1 - ease((p - .35) / .45));
    moon.position.y = 3.8 + p * .8;
  };
}

function arsenal(scene, kit, mobile) {
  const {block, stamp, ink, paper, tan, crimson} = kit;
  const board = block([7, .25, 5], [0, -.18, 0], ink);
  const workbench = block([10, .08, 7.2], [0, -.36, 0], tan);
  const routes = [];
  for (let index = -5; index <= 5; index++) {
    routes.push(block([.04, .05, 4.6], [index*.51, -.03, 0], index % 3 ? paper : crimson, scene, false));
  }
  const chip = new THREE.Group();
  scene.add(chip);
  block([2.85, .36, 2.12], [0, .17, 0], paper, chip);
  stamp('CORE', [1.9, .83], [0,.363,0], chip).rotation.x = -Math.PI/2;
  const modules = [];
  for (let index = 0; index < (mobile ? 6 : 10); index++) {
    const side = index % 2 ? 1 : -1;
    const z = (Math.floor(index / 2) - (mobile ? 1 : 2)) * .72;
    const tool = new THREE.Group();
    scene.add(tool);
    block([1.26, .13, .38], [0, 0, 0], index % 3 ? paper : crimson, tool);
    block([.35, .25, .44], [-.35, .05, 0], ink, tool);
    block([.13, .03, .12], [.51, .086, 0], crimson, tool, false);
    modules.push({tool, side, z, index});
  }
  return (p) => {
    const split = Math.sin(Math.PI * p);
    const seat = ease((p - .57) / .4);
    board.rotation.y = -.13 * split;
    workbench.rotation.y = -.13 * split;
    chip.position.y = .31 + split * 1.05 - seat * .22;
    chip.rotation.y = split * .65;
    routes.forEach((route, index) => route.scale.z = MIX(.5 + index * .09, 4.6, seat));
    for (const {tool, side, z, index} of modules) {
      tool.position.set(side * (MIX(3.45, 2.1, seat) + split * (.64 + index % 3 * .16)), .38 + split * (.35 + (index % 4) * .36) - seat*.18, z);
      tool.rotation.set(split * side * .68, split * side * (1.25 + index*.06), split * side * .25);
    }
  };
}

function machine(scene, kit, mobile) {
  const {block, stamp, ink, paper, tan, crimson} = kit;
  block([11,.12,26], [0,-.1,-7.5], tan);
  const stations = ['CLIENT','DNS','SERVER','RETURN'];
  const gates = [];
  stations.forEach((title, index) => {
    const group = new THREE.Group();
    group.position.z = -2 - index * 4.8;
    scene.add(group);
    for (const x of [-2.3,2.3]) {
      block([.26, 3.6, .55], [x,1.8,0], index % 2 ? paper : ink, group);
      block([.55,.14,.72], [x,.08,0], ink, group);
    }
    block([4.9,.52,.6], [0,3.61,0], paper, group);
    stamp(title, [2.15,.55], [0,3.6,.315], group);
    gates.push(group);
  });
  const packet = block([.33,.33,.33], [0,1,3], crimson, scene, false);
  const trails = Array.from({length: mobile ? 5 : 10}, (_, index) =>
    block([.14-index*.007,.14-index*.007,.14-index*.007], [0,0,0], crimson, scene, false));
  for (let index = 0; index < 20; index++) block([.06,.02,.65], [0,-.023,3-index*1.07], ink, scene, false);
  const packetZ = (p) => p < .72 ? MIX(3, -16.4, p / .72) : MIX(-16.4, -.3, (p-.72)/.28);
  return (p) => {
    packet.position.z = packetZ(p);
    packet.position.y = .9 + Math.sin(p * 14) * .19;
    packet.rotation.set(p * 9, p * 14, p * 4);
    trails.forEach((trail, index) => {
      const earlier = Math.max(0, p - .012 * (index + 1));
      trail.position.set(0, .9 + Math.sin(earlier * 14) * .19, packetZ(earlier));
      trail.visible = p > .02 * index;
    });
    gates.forEach((gate) => {
      const proximity = Math.max(0, 1 - Math.abs(gate.position.z - packet.position.z) / 2.1);
      gate.scale.y = .88 + proximity * .12;
    });
  };
}

function finale(scene, kit) {
  const {block, stamp, disc, ink, paper, tan, crimson} = kit;
  block([20,.13,27], [0,-.12,-6.5], tan);
  block([3.2,.023,25], [0,-.041,-6], ink);
  disc(2.3,[0,4.6,-19]);
  const pages = [];
  for (let index = 0; index < 3; index++) {
    const hinge = new THREE.Group();
    hinge.position.set(-2.58, .02, -1.8-index*4.1);
    scene.add(hinge);
    block([5.15,4.78,.075], [2.58,2.4,0], paper, hinge);
    stamp(['TO','BE','CONTINUED'][index], [3.72,1.5], [2.58,2.4,.046], hinge);
    pages.push(hinge);
  }
  const figure = new THREE.Group();
  scene.add(figure);
  block([.47,.71,.26], [0,.88,0], ink, figure);
  block([.33,.33,.3], [0,1.43,0], ink, figure);
  for (const x of [-.13,.13]) block([.17,.55,.16], [x,.31,0], ink, figure);
  const scarf = block([.52,.1,.07], [.29,1.23,.12], crimson, figure, false);
  const last = new THREE.Group();
  last.position.set(0, 2.3, -17.4);
  scene.add(last);
  stamp('VOL. 01', [5.3,2.25], [0,0,0], last);
  const seal = disc(.31, [2, -.56, .035]);
  last.add(seal);
  for (const offset of [-.12, 0, .12]) {
    block([.034, .3, .01], [2 + offset, -.56, .053], ink, last, false).rotation.z = -.58;
  }
  return (p) => {
    pages.forEach((page,index) => {
      page.rotation.y = 1.65 * ease((p - index*.17) / .33);
      page.position.y = -.45 * ease((p - index*.2) / .6);
    });
    figure.position.z = MIX(4,-14,p);
    scarf.rotation.z = Math.sin(p * 21) * .18;
    last.scale.setScalar(.48 + ease((p-.55)/.45)*.52);
  };
}

const BUILDERS = {origin, arsenal, machine, finale};

function releaseWorld(scene) {
  const resources = new Set();
  scene.traverse(({geometry, material}) => {
    if (geometry) resources.add(geometry);
    if (material?.map) resources.add(material.map);
    if (material) resources.add(material);
  });
  resources.forEach((resource) => resource.dispose());
}

export function initChapterMotion(panels) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'motion-folio-canvas';
  canvas.setAttribute('aria-hidden','true');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'low-power'});
  } catch {
    return;
  }

  let active = null;
  let frame = 0;
  let previous = -1;
  let currentCaption;
  const camera = new THREE.PerspectiveCamera(41, 1, .07, 76);
  const target = new THREE.Vector3();
  const eyeCoordinates = [];
  const targetCoordinates = [];
  const mobile = window.matchMedia('(max-width: 700px)').matches;
  const views = panels.map((root) => ({
    root,
    stage: root.querySelector('.motion-folio-stage'),
    track: root.querySelector('.motion-folio-track'),
    caption: root.querySelector('[data-motion-caption]'),
    theme: root.dataset.motionFolio,
  }));
  views.forEach(({root}) => root.classList.add('is-motion-folio'));

  function select(view) {
    if (active) {
      releaseWorld(active.scene);
      active.scene = null;
      active.update = null;
      active.atmosphere = null;
      active.root.classList.remove('is-rendering-folio');
    }
    active = view;
    previous = -1;
    currentCaption = null;
    if (!active) {
      canvas.remove();
      return;
    }
    active.stage.prepend(canvas);
    active.root.classList.add('is-rendering-folio');
    active.scene = new THREE.Scene();
    active.scene.background = new THREE.Color(PAPER);
    active.scene.fog = new THREE.Fog(PAPER, 15, 49);
    const key = new THREE.DirectionalLight(0xffefd3, 1.28);
    key.position.set(-6, 12, 5);
    active.key = key;
    active.scene.add(key, new THREE.HemisphereLight(0xfffaef, 0x685566, 1.32));
    active.update = BUILDERS[active.theme](active.scene, createKit(active.scene), mobile);
    active.atmosphere = addPrintAtmosphere(active.scene, mobile, {near: 4, far: -20});
    const width = active.stage.clientWidth || 1;
    const height = active.stage.clientHeight || 1;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.45, 1500 / width));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = camera.aspect < .9 ? 58 : 40;
    camera.updateProjectionMatrix();
  }

  function draw() {
    frame = 0;
    if (document.hidden || motion.matches) return;
    const mid = innerHeight * .5;
    const view = views.find(({track}) => {
      const bounds = track.getBoundingClientRect();
      return bounds.top <= mid && bounds.bottom >= mid;
    });
    if (!view) {
      if (active) select(null);
      return;
    }
    if (active !== view) select(view);
    const bounds = active.track.getBoundingClientRect();
    const pin = parseFloat(getComputedStyle(active.stage).top) || 0;
    const travel = Math.max(1, bounds.height - active.stage.offsetHeight);
    const p = clamp((pin - bounds.top) / travel);
    if (Math.abs(p - previous) < .0001) return;
    previous = p;
    active.stage.style.setProperty('--folio-progress', p);
    const config = SEQUENCES[active.theme];
    const cameraTrack = CAMERAS[active.theme];
    camera.position.fromArray(cameraTrack.eye(p, eyeCoordinates));
    target.fromArray(cameraTrack.look(p, targetCoordinates));
    camera.lookAt(target);
    active.atmosphere(p, .13 + Math.sin(p * Math.PI) * .14);
    active.key.position.set(-6 + p * 8, 12 - p * 6, 5);
    active.update(p);
    const stage = Math.min(2, Math.floor(p * 3));
    if (stage !== currentCaption) {
      currentCaption = stage;
      active.caption.textContent = config.captions[stage];
      active.root.dataset.motionBeat = String(stage + 1);
    }
    renderer.render(active.scene, camera);
  }

  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function resize() {
    if (active) select(null);
    schedule();
  }
  function onMotion() {
    if (motion.matches && active) select(null);
    schedule();
  }

  function dispose() {
    cancelAnimationFrame(frame);
    select(null);
    renderer.dispose();
    views.forEach(({root}) => root.classList.remove('is-motion-folio'));
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pagehide', onHide);
    document.removeEventListener('visibilitychange', schedule);
    motion.removeEventListener('change', onMotion);
    canvas.removeEventListener('webglcontextlost', onLost);
  }

  function onLost(event) {
    event.preventDefault();
    dispose();
  }
  function onHide(event) {
    if (!event.persisted) dispose();
  }

  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', resize, {passive: true});
  window.addEventListener('pagehide', onHide);
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', onMotion);
  canvas.addEventListener('webglcontextlost', onLost);
  schedule();
}
