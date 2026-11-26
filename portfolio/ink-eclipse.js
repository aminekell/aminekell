import * as THREE from './vendor/three.module.js';
import {addPrintAtmosphere, cameraPath} from './cinematic-motion.js';

const PAPER = 0xf1e6d3;
const INK = 0x201921;
const CRIMSON = 0xc91237;
const SHOTS = [
  {at: 0, eye: [0, 1, 16], look: [0, .8, 0], open: 0, city: 0, fold: 0},
  {at: .17, eye: [0, 1.15, 9.4], look: [0, 1.62, -1], open: .10, city: .55, fold: 0},
  {at: .34, eye: [2.65, 2.45, 6.1], look: [0, .65, -6], open: .91, city: .92, fold: 0},
  {at: .52, eye: [-.45, 1.55, -4.2], look: [.8, 1.6, -16], open: 1, city: 1, fold: 0},
  {at: .72, eye: [1.1, 2.2, -21], look: [0, 3, -43], open: 1, city: 1, fold: 0},
  {at: .82, eye: [0, 7.2, -28], look: [0, 2.9, -44], open: 1, city: 1, fold: .25},
  {at: 1, eye: [0, 3.1, -33], look: [0, 3.1, -44], open: 1, city: 1, fold: 1},
];
const BEATS = [
  [0, '01 / The red moon', 'A single drop of ink waits on the page.'],
  [.23, '02 / The eclipse fractures', 'The red disk tears open. A city is already moving behind it.'],
  [.43, '03 / The city underneath', 'Follow the ink through the streets and beneath the gates.'],
  [.82, '04 / Closing impression', 'The city sinks into a new print.'],
];

const EYE = cameraPath(SHOTS.map(({at}) => at), SHOTS.map(({eye}) => eye));
const LOOK = cameraPath(SHOTS.map(({at}) => at), SHOTS.map(({look}) => look));

function shotAt(progress) {
  const end = SHOTS.findIndex((shot) => shot.at > progress);
  if (end < 1) return SHOTS.at(-1);
  const a = SHOTS[end - 1];
  const b = SHOTS[end];
  const linear = (progress - a.at) / (b.at - a.at);
  const t = linear * linear * (3 - 2 * linear);
  const blend = (key) => THREE.MathUtils.lerp(a[key], b[key], t);
  return {
    eye: EYE(progress, []),
    look: LOOK(progress, []),
    open: blend('open'), city: blend('city'), fold: blend('fold'),
  };
}

function printTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#efe0c8';
  ctx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 64; row++) {
    for (let col = 0; col < 64; col++) {
      const x = col * 8 + (row % 2) * 4;
      const y = row * 8;
      ctx.fillStyle = (row + col) % 7 === 0 ? '#70534e60' : '#70534e30';
      ctx.fillRect(x, y, y > 280 ? 2 : 1, 1);
    }
  }
  ctx.strokeStyle = '#241c20';
  ctx.lineWidth = 5;
  ctx.strokeRect(12, 12, 488, 488);
  ctx.lineWidth = 1;
  ctx.strokeRect(20, 20, 472, 472);
  for (let offset = 0; offset < 140; offset += 12) {
    ctx.beginPath();
    ctx.moveTo(22, 480 - offset);
    ctx.lineTo(22 + offset, 480);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(490, 22 + offset);
    ctx.lineTo(490 - offset, 22);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makePortalPaper(texture, uniforms) {
  const paper = new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide});
  paper.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      '#include <common>\nuniform float tearRadius;\nuniform float tearAmount;'
    ).replace('#include <map_fragment>', `
      #include <map_fragment>
      vec2 paperUV = (vMapUv - vec2(.497, .664)) * vec2(1.5, 1.0);
      float angle = atan(paperUV.y, paperUV.x);
      float edge = tearRadius * (1.0 + .12 * sin(5.0 * angle + .7)
        + .064 * sin(13.0 * angle) + .025 * sin(49.0 * angle));
      float fiberDistance = length(paperUV) - edge;
      if (tearAmount > .01) {
        if (fiberDistance < 0.0) discard;
        if (fiberDistance < .027) {
          float fibers = step(.55, sin(angle * 337.0 + fiberDistance * 180.0));
          vec3 paperEdge = mix(vec3(.09, .042, .045), vec3(.91, .73, .58), fibers);
          diffuseColor.rgb = mix(diffuseColor.rgb, paperEdge, 1.0 - smoothstep(.007, .027, fiberDistance));
        }
      }
    `);
  };
  paper.customProgramCacheKey = () => 'eclipse-torn-spread';
  return paper;
}

function buildWorld(scene, mobile, artwork) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const outline = new THREE.EdgesGeometry(box);
  const pen = new THREE.LineBasicMaterial({color: INK});
  const red = new THREE.MeshBasicMaterial({color: CRIMSON});
  const dark = new THREE.MeshLambertMaterial({color: INK});
  const pale = new THREE.MeshLambertMaterial({color: PAPER});
  const tan = new THREE.MeshLambertMaterial({color: 0xa48c79});
  function block(parent, size, position, material, bordered = true) {
    const item = new THREE.Mesh(box, material);
    item.position.set(...position);
    item.scale.set(...size);
    if (bordered) item.add(new THREE.LineSegments(outline, pen));
    parent.add(item);
    return item;
  }

  const front = new THREE.Group();
  const tear = {tearRadius: {value: 0}, tearAmount: {value: 0}};
  const print = printTexture();
  const paper = new THREE.MeshBasicMaterial({map: print});
  const card = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 7), makePortalPaper(artwork ?? print, tear));
  card.position.y = .8;
  front.add(card);
  for (const x of [-5.21,5.21]) block(front, [.08, 7.03, .13], [x,.8,-.05], dark);
  for (const y of [-2.69,4.29]) block(front, [10.5,.08,.13], [0,y,-.05], dark);
  scene.add(front);

  const tiles = [];
  const pitch = mobile ? .43 : .3;
  const radius = artwork ? 1.62 : 2.48;
  const inkCenter = artwork ? 1.95 : .8;
  const range = Math.ceil(radius / pitch);
  for (let row = -range; row <= range; row++) {
    for (let col = -range; col <= range; col++) {
      const x = col * pitch;
      const y = row * pitch;
      if (x*x + y*y > radius*radius) continue;
      const n = (row + range) * (2 * range + 1) + col + range;
      tiles.push({x, y, n, angle: n * 2.39996323, drift: (n * 19 % 31) / 31});
    }
  }
  const fragments = new THREE.InstancedMesh(box, red, tiles.length);
  fragments.frustumCulled = false;
  scene.add(fragments);
  const stamp = new THREE.Object3D();
  const pieceColor = new THREE.Color();
  tiles.forEach(({n}, index) => {
    pieceColor.setRGB(n % 7 ? 1 : .22, n % 7 ? .71 : .14, n % 7 ? .76 : .20);
    fragments.setColorAt(index, pieceColor);
  });

  // The same artwork provides the backdrop behind the street geometry.
  const skyline = artwork && new THREE.Mesh(
    new THREE.PlaneGeometry(39, 26),
    new THREE.MeshBasicMaterial({map: artwork, transparent: true, opacity: 0, depthWrite: false})
  );
  if (skyline) {
    skyline.position.set(0, 5, -46);
    skyline.renderOrder = -2;
    scene.add(skyline);
  }
  const atmosphere = addPrintAtmosphere(scene, mobile, {near: -.8});
  const city = new THREE.Group();
  scene.add(city);
  block(city, [25, .12, 46], [0, -.12, -25], pale);
  block(city, [3, .018, 41], [0, -.045, -24], dark, false);
  for (let z = -5; z > -42; z -= 2) {
    block(city, [.045, .02, .9], [0, -.025, z], red, false);
  }

  const towers = [];
  const streets = mobile ? 8 : 12;
  for (let index = 0; index < streets; index++) {
    const z = -4.5 - index * (36 / streets);
    for (const side of [-1, 1]) {
      const width = 1.25 + ((index * 3 + side + 4) % 6) * .23;
      const height = 1.3 + ((index * 7 + side + 4) % 9) * .53;
      const x = side * (3 + (index % 3) * .85);
      const building = new THREE.Group();
      building.position.set(x, 0, z);
      city.add(building);
      block(building, [width, height, 1.5], [0, height / 2, 0], index % 3 === 0 ? dark : pale);
      block(building, [width + .24, .12, 1.74], [0, height, 0], dark);
      for (let floor = .65; floor < height - .3; floor += .52) {
        block(building, [width * .75, .09, .015], [0, floor, .756], index % 3 === 0 ? tan : dark, false);
      }
      if (index % 3 !== 1) {
        const cap = .25 + (index % 4) * .14;
        block(building, [width * .68, cap, .94], [0, height + cap / 2, -.17], index % 2 ? tan : pale);
        block(building, [.10, .42, .11], [width*.19, height + cap + .2, -.23], dark, false);
      }
      for (const offset of [-.26,.26]) {
        block(building, [.04, height * .72, .018], [width * offset, height*.44, .769], dark, false);
      }
      towers.push({building, height, delay: index / streets * .42});
    }
  }
  for (const z of [-8, -19, -30]) {
    const gate = new THREE.Group();
    gate.position.z = z;
    city.add(gate);
    for (const x of [-1.85, 1.85]) {
      block(gate, [.23, 3.2, .3], [x, 1.6, 0], dark);
      block(gate, [.43, .21, .5], [x, .1, 0], pale);
    }
    block(gate, [4.5, .27, .57], [0, 3.2, 0], dark);
    block(gate, [3.94, .095, .39], [0, 2.8, 0], red, false);
    block(gate, [.46, .38, .13], [0, 2.99, .28], red);
    for (const x of [-2.06, 2.06]) {
      block(gate, [.09, 2.6, .10], [x, 1.6, .29], tan, false);
      block(gate, [.46, .3, .47], [x, 2.62, .09], pale);
    }
  }

  const finalPrint = new THREE.Group();
  const finalPaper = new THREE.Mesh(card.geometry, paper);
  finalPrint.add(finalPaper);
  const rim = new THREE.Mesh(new THREE.RingGeometry(1.9, 1.96, mobile ? 40 : 72), dark);
  rim.position.z = .045;
  finalPrint.add(rim);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(1.75, mobile ? 36 : 64), red);
  inner.position.z = .06;
  finalPrint.add(inner);
  for (let index = -5; index <= 5; index++) {
    const h = .32 + (Math.cos(index*1.8) + 1) * .24;
    block(finalPrint, [.22, h, .06], [index*.25, -.59+h/2, .1], dark, false);
  }
  for (const offset of [-.16, 0, .16]) {
    block(finalPrint, [.05,.4,.02], [.75+offset,.74,.09], dark, false).rotation.z = -.58;
  }
  finalPrint.position.set(0, 3.1, -44);
  scene.add(finalPrint);

  function update(frame) {
    front.visible = frame.open < .994;
    front.rotation.y = -.53 * frame.open;
    front.rotation.z = .09 * frame.open;
    front.position.x = -1.15 * frame.open;
    tear.tearAmount.value = frame.open;
    tear.tearRadius.value = Math.pow(frame.open, 1.15) * .82;
    fragments.visible = (!artwork || frame.open > .045) && frame.fold < .92;
    for (let i = 0; i < tiles.length; i++) {
      const {x, y, n, angle, drift} = tiles[i];
      const peel = THREE.MathUtils.clamp((frame.open - drift * .16) / .84, 0, 1);
      const curl = Math.sin(peel * Math.PI);
      const endX = Math.cos(angle) * (2.85 + drift * 2.2);
      const endY = inkCenter + Math.sin(angle) * (1.45 + drift * 2.6);
      stamp.position.set(
        THREE.MathUtils.lerp(x, endX, peel) + Math.sin(angle) * curl * 1.5,
        THREE.MathUtils.lerp(y + inkCenter, endY, peel),
        .06 + curl * (1 + drift) - peel * (4 + drift * 34),
      );
      stamp.rotation.set(peel * (angle % 6), peel * (n % 11) * .36, peel * (n % 7) * .48);
      const size = artwork ? pitch * (.25 + drift * .67) : pitch * .978;
      stamp.scale.set(size, size * (.92 + drift * 1.6), .04 + peel * (.12 + drift * .24));
      stamp.scale.multiplyScalar(1 - frame.fold * .94);
      stamp.updateMatrix();
      fragments.setMatrixAt(i, stamp.matrix);
    }
    fragments.instanceMatrix.needsUpdate = true;
    city.visible = frame.city > .01 && frame.fold < .99;
    if (skyline) {
      skyline.material.opacity = frame.city * (1 - frame.fold) * .43;
      skyline.visible = skyline.material.opacity > .005;
    }
    atmosphere(frame.city, frame.city * (1 - frame.fold) * .28);
    for (const {building, height, delay} of towers) {
      const emerge = THREE.MathUtils.clamp((frame.city - delay)/.55, 0, 1);
      building.position.y = -height * (1 - emerge + frame.fold);
    }
    city.position.y = -frame.fold * 5;
    finalPrint.visible = frame.city > .68;
    finalPrint.scale.setScalar(.55 + .45 * frame.fold);
  }
  return update;
}

export async function initInkEclipse(root) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches) return;
  const artPath = new URL('./assets/ink-eclipse-spread.webp', import.meta.url);
  const artwork = await new THREE.TextureLoader().loadAsync(artPath.href).catch(() => null);
  if (artwork) artwork.colorSpace = THREE.SRGBColorSpace;
  if (motion.matches) {
    artwork?.dispose();
    return;
  }
  const track = root.querySelector('.eclipse-track');
  const stage = root.querySelector('.eclipse-stage');
  const canvas = stage.querySelector('canvas');
  const beat = root.querySelector('[data-eclipse-beat]');
  const caption = root.querySelector('[data-eclipse-caption]');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: 'low-power'});
  } catch {
    artwork?.dispose();
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAPER);
  scene.fog = new THREE.Fog(PAPER, 20, 61);
  const camera = new THREE.PerspectiveCamera(42, 1, .08, 75);
  const light = new THREE.DirectionalLight(0xffedcb, 1.45);
  light.position.set(-5, 8, 9);
  scene.add(light, new THREE.HemisphereLight(0xfff4e1, 0x5c4855, 1.55));
  const updateWorld = buildWorld(scene, window.matchMedia('(max-width: 700px)').matches, artwork);
  root.classList.add('has-eclipse-webgl');

  let raf = 0;
  let previous = -1;
  let activeBeat;
  let visible = false;
  function render() {
    raf = 0;
    if (!visible || document.hidden || motion.matches) return;
    const bounds = track.getBoundingClientRect();
    const progress = THREE.MathUtils.clamp(-bounds.top / Math.max(1, bounds.height - stage.clientHeight), 0, 1);
    if (Math.abs(previous - progress) < .0001) return;
    previous = progress;
    const frame = shotAt(progress);
    camera.position.set(...frame.eye);
    camera.lookAt(...frame.look);
    updateWorld(frame);
    light.position.set(-5 + frame.open * 6, 8 + frame.fold * 2, 9 - frame.city * 18);
    const info = BEATS.findLast(([at]) => at <= progress);
    if (info !== activeBeat) {
      activeBeat = info;
      beat.textContent = info[1];
      caption.textContent = info[2];
    }
    renderer.render(scene, camera);
  }
  function schedule() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(render);
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) schedule();
  });
  observer.observe(stage);
  const resize = new ResizeObserver(() => {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5, 1600 / width, 1150 / height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = camera.aspect < .8 ? 61 : 42;
    camera.updateProjectionMatrix();
    previous = -1;
    schedule();
  });
  resize.observe(stage);

  function dispose() {
    cancelAnimationFrame(raf);
    resize.disconnect();
    observer.disconnect();
    window.removeEventListener('scroll', schedule);
    document.removeEventListener('visibilitychange', schedule);
    window.removeEventListener('pagehide', onHide);
    canvas.removeEventListener('webglcontextlost', onLost);
    const resources = new Set();
    scene.traverse(({geometry, material}) => {
      if (geometry) resources.add(geometry);
      if (material?.map) resources.add(material.map);
      if (material) resources.add(material);
    });
    resources.forEach((resource) => resource.dispose());
    renderer.dispose();
  }
  function onHide(event) {
    if (!event.persisted) dispose();
  }
  function onLost(event) {
    event.preventDefault();
    root.classList.remove('has-eclipse-webgl');
    dispose();
  }
  window.addEventListener('scroll', schedule, {passive: true});
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('pagehide', onHide);
  canvas.addEventListener('webglcontextlost', onLost);
}
