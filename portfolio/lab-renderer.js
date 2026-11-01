/** Canvas presentation only. Simulation data stays in simulations.js/app state. */
const INK = "#222722";
const ORANGE = "#bd3615";
const MUTED = "#5e6558";
const LINE = "#bdc2b6";
const PAPER = "#e5e7de";
const FONT = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace';
const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function text(ctx, value, x, y, color = MUTED, size = 9, align = "left") {
  ctx.fillStyle = color;
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(String(value), x, y);
}

function line(ctx, x1, y1, x2, y2, color = LINE, width = 1) {
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function dot(ctx, x, y, radius = 3, color = ORANGE) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill();
}

function arrow(ctx, x1, y1, x2, y2, color = LINE) {
  line(ctx, x1, y1, x2, y2, color);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  line(ctx, x2, y2, x2 - 5 * Math.cos(angle - .5), y2 - 5 * Math.sin(angle - .5), color);
  line(ctx, x2, y2, x2 - 5 * Math.cos(angle + .5), y2 - 5 * Math.sin(angle + .5), color);
}

function background(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, width, height);
  ctx.save(); ctx.globalAlpha = .25;
  for (let x = 28; x < width; x += 28) for (let y = 28; y < height; y += 28) dot(ctx, x, y, .7, MUTED);
  ctx.restore();
  for (const [x, y] of [[14,14], [width-14,14], [14,height-14], [width-14,height-14]]) {
    line(ctx, x - 4, y, x + 4, y); line(ctx, x, y - 4, x, y + 4);
  }
}

function drawComputation(ctx, width, height, state, cells) {
  if (!Array.isArray(cells) || !cells.length) return;
  const rows = cells.length, columns = cells[0].length;
  const size = Math.min((width - 60) / columns, (height - 65) / rows, 6.2);
  const diagramWidth = columns * size;
  const center = width > 650 ? width * .4 : width * .5;
  const left = center - diagramWidth / 2, top = 36;
  const revealed = clamp(Math.floor((Number(state.time) || 0) / 100 * (rows - 1)) + 1, 1, rows);
  text(ctx, `RULE ${state.rule ?? 90} / ONE BIT → STRUCTURE`, 25, 18, INK);
  for (let row = 0; row < revealed; row++) {
    for (let column = 0; column < columns; column++) {
      if (!cells[row][column]) continue;
      ctx.fillStyle = row === revealed - 1 ? ORANGE : INK;
      ctx.fillRect(left + column * size, top + row * size, Math.max(1, size - .7), Math.max(1, size - .7));
    }
  }
  const frontier = top + revealed * size + 4;
  line(ctx, left, frontier, left + diagramWidth, frontier, ORANGE, .7);
  text(ctx, `GENERATION ${String(revealed - 1).padStart(2, "0")}`, left, height - 20, ORANGE);
  text(ctx, "FIXED ZERO BOUNDARIES", width - 25, height - 20, MUTED, 8, "right");
  if (width > 650) {
    const x = width * .73, y = height * .36;
    text(ctx, "A LOCAL RULE.", x, y, INK);
    text(ctx, "A GLOBAL PATTERN.", x, y + 17, INK);
    const rule = Number(state.rule) || 0;
    for (let neighborhood = 7; neighborhood >= 0; neighborhood--) {
      const row = 7 - neighborhood;
      for (let bit = 2; bit >= 0; bit--) {
        ctx.fillStyle = (neighborhood >> bit) & 1 ? INK : "#cbd0c4";
        ctx.fillRect(x + (2 - bit) * 8, y + 38 + row * 13, 5, 5);
      }
      text(ctx, "→", x + 30, y + 41 + row * 13, MUTED, 9);
      ctx.fillStyle = (rule >> neighborhood) & 1 ? ORANGE : "#cbd0c4";
      ctx.fillRect(x + 48, y + 38 + row * 13, 5, 5);
    }
  }
}

function positionsForTrace(width, height, count, isometric) {
  const columns = width < 540 ? Math.min(3, count) : Math.min(count, 8);
  const rowCount = Math.ceil(count / columns);
  const margin = width < 540 ? 26 : 40;
  const stepX = (width - margin * 2) / columns;
  const stepY = Math.min(100, (height - 80) / rowCount);
  const startY = rowCount > 1 ? 82 : height * .47;
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns), column = index % columns;
    const col = row % 2 ? columns - column - 1 : column;
    return { x: margin + stepX * (col + .5), y: startY + row * stepY + (isometric && rowCount === 1 ? Math.sin(index * .9) * 18 : 0), width: Math.min(92, stepX - 13) };
  });
}

function tracePacket(ctx, positions, progress) {
  if (positions.length < 2) return;
  const part = progress * (positions.length - 1);
  const segment = Math.min(positions.length - 2, Math.floor(part));
  const fraction = part - segment;
  const a = positions[segment], b = positions[segment + 1];
  dot(ctx, a.x + (b.x - a.x) * fraction, a.y + (b.y - a.y) * fraction, 4, ORANGE);
}

function isoBlock(ctx, x, y, width, active) {
  const w = Math.min(40, width * .43), depth = w * .45, h = active ? 42 : 31;
  const polygon = (points, fill, stroke = LINE) => {
    ctx.beginPath(); points.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = .8; ctx.stroke();
  };
  polygon([[x-w,y-depth], [x,y-depth*2], [x+w,y-depth], [x,y]], active ? ORANGE : "#d7dbcf", active ? ORANGE : MUTED);
  polygon([[x-w,y-depth], [x,y], [x,y+h], [x-w,y+h-depth]], active ? "#b73212" : "#cbd0c3", active ? ORANGE : MUTED);
  polygon([[x,y], [x+w,y-depth], [x+w,y+h-depth], [x,y+h]], active ? "#ed633a" : "#eef0e8", active ? ORANGE : MUTED);
  for (let i = 1; i < 4; i++) line(ctx, x + 6, y + i * 7, x + w - 5, y + i * 7 - depth + 5, active ? "#f5b49f" : LINE, .6);
}

function drawTrace(ctx, width, height, state, model, isometric = false) {
  const stages = model?.stages || [];
  if (!stages.length) return;
  const progress = clamp((Number(state.time) || 0) / 100, 0, 1);
  const active = Math.min(stages.length - 1, Math.floor((Number(state.time) || 0) / 101 * stages.length));
  const positions = positionsForTrace(width, height, stages.length, isometric);
  text(ctx, isometric ? "REQUEST ANATOMY / SERVICE BOUNDARIES" : state.reality === "network" ? "PACKET TRACE / LOGICAL REACHABILITY" : "PROCESS GRAPH / BYTE STREAMS", 25, 18, INK);
  positions.forEach((point, index) => {
    if (index === 0) return;
    const previous = positions[index - 1];
    arrow(ctx, previous.x, previous.y + (isometric ? 38 : 0), point.x, point.y + (isometric ? 38 : 0), index <= active ? "#979d91" : LINE);
  });
  if (!isometric) tracePacket(ctx, positions, progress);
  positions.forEach((point, index) => {
    const selected = index === active;
    const label = stages[index].label;
    if (isometric || width >= 540) text(ctx, String(index + 1).padStart(2, "0"), isometric && width < 540 ? point.x - point.width / 2 : point.x, point.y - (isometric ? width < 540 ? 35 : 55 : 43), selected ? ORANGE : MUTED, 8, "center");
    if (isometric) {
      isoBlock(ctx, point.x, point.y - 20, point.width, selected);
      text(ctx, label, point.x, point.y + 48, selected ? ORANGE : INK, width < 400 ? 7 : 8, "center");
      const persistent = /WORDPRESS|MARIADB|POSTGRESQL/.test(label);
      if (persistent && height > 220 && (width >= 540 || index >= Math.floor((stages.length - 1) / 3) * 3)) {
        line(ctx, point.x, point.y + 56, point.x, point.y + 72, MUTED, .7);
        ctx.strokeStyle = MUTED; ctx.strokeRect(point.x - 18, point.y + 72, 36, 10);
        text(ctx, "DATA", point.x, point.y + 77, MUTED, 6, "center");
      }
    } else {
      const boxHeight = 42;
      ctx.fillStyle = selected ? INK : PAPER;
      ctx.fillRect(point.x - point.width / 2, point.y - boxHeight / 2, point.width, boxHeight);
      ctx.strokeStyle = selected ? INK : LINE;
      ctx.strokeRect(point.x - point.width / 2, point.y - boxHeight / 2, point.width, boxHeight);
      if (width < 540) text(ctx, String(index + 1).padStart(2, "0"), point.x - point.width / 2 + 8, point.y - 13, selected ? PAPER : MUTED, 6, "center");
      text(ctx, label, point.x, point.y + (width < 540 ? 3 : 0), selected ? PAPER : INK, width < 400 ? 7 : 8, "center");
      if (label === "PIPE") {
        text(ctx, "fd 1 → fd 0", point.x, point.y + 34, MUTED, 7, "center");
      }
    }
  });
  const failed = model.ok === false && active === stages.length - 1;
  text(ctx, `STAGE ${active + 1} / ${stages.length}`, 25, height - 20, ORANGE);
  text(ctx, failed ? "BOUNDARY REJECTED" : progress >= 1 ? "TRACE COMPLETE" : width < 400 ? "SCRUB TIME" : "SCRUB TO FOLLOW CAUSE → EFFECT", width - 25, height - 20, failed ? ORANGE : MUTED, 8, "right");
}

function drawPhilosophers(ctx, width, height, state, model) {
  const agents = model?.agents || [];
  if (!agents.length) return;
  const cx = width > 600 ? width * .4 : width * .5, cy = height * .52;
  const radius = Math.min(90, height * .3, width * .3), count = agents.length;
  const nodeRadius = count > 6 ? 13 : 17;
  const point = (angle, r = radius) => ({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  text(ctx, "RESOURCE OWNERSHIP / ROUND-ROBIN SCHEDULE", 25, 18, INK, width < 400 ? 8 : 9);
  ctx.strokeStyle = LINE; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.arc(cx, cy, radius, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  agents.forEach((agent, index) => {
    const angle = index / count * TAU - Math.PI / 2;
    const fork = point(angle - Math.PI / count, radius * .7);
    const owner = model.forks[index];
    if (owner !== null && owner !== undefined) {
      const position = point(owner / count * TAU - Math.PI / 2);
      line(ctx, fork.x, fork.y, position.x, position.y, ORANGE, 1.5);
    }
    ctx.save(); ctx.translate(fork.x, fork.y); ctx.rotate(angle - Math.PI / count);
    line(ctx, -7, 0, 7, 0, owner === null ? MUTED : ORANGE, 2.5);
    ctx.restore();
    const position = point(angle);
    const eating = agent.state === "eating", waiting = agent.state === "waiting";
    ctx.fillStyle = eating ? ORANGE : PAPER;
    ctx.strokeStyle = waiting ? ORANGE : INK; ctx.lineWidth = eating ? 0 : 1;
    ctx.beginPath(); ctx.arc(position.x, position.y, nodeRadius, 0, TAU); ctx.fill(); if (!eating) ctx.stroke();
    text(ctx, `P${index + 1}`, position.x, position.y, eating ? PAPER : INK, 9, "center");
    const label = point(angle, radius + 30);
    text(ctx, agent.state.toUpperCase(), label.x, label.y, waiting ? ORANGE : MUTED, 7, "center");
  });
  text(ctx, model.deadlocked ? "CIRCULAR" : "RESOURCE", cx, cy - 6, model.deadlocked ? ORANGE : MUTED, 8, "center");
  text(ctx, model.deadlocked ? "WAIT" : "ORDER", cx, cy + 8, model.deadlocked ? ORANGE : MUTED, 8, "center");
  if (width > 600) {
    const x = width * .73;
    text(ctx, "ONE FORK.", x, cy - 30, INK);
    text(ctx, "ONE OWNER.", x, cy - 14, INK);
    dot(ctx, x + 3, cy + 13, 3, ORANGE); text(ctx, "EATING / OWNED", x + 15, cy + 13, MUTED, 8);
    ctx.strokeStyle = ORANGE; ctx.strokeRect(x, cy + 30, 6, 6); text(ctx, "WAITING", x + 15, cy + 33, MUTED, 8);
  }
  text(ctx, `SCHEDULER TICK ${model.tick ?? Math.floor(state.time)}`, 25, height - 20, ORANGE);
  text(ctx, model.deadlocked ? "DEADLOCK: NO PROCESS CAN ADVANCE" : "EXCLUSIVE OWNERSHIP", width - 25, height - 20, model.deadlocked ? ORANGE : MUTED, width < 400 ? 7 : 8, "right");
}

function drawGeometry(ctx, width, height, state, model) {
  if (!model?.rays?.length || !model.map?.length) return;
  const split = state.split !== false;
  const margin = width < 400 ? 18 : 28;
  const top = 45, viewHeight = height - 85;
  const viewWidth = split ? (width - margin * 3) * .58 : width - margin * 2;
  const x = margin, y = top, horizon = y + viewHeight * .5;
  text(ctx, "THE WORLD BEHIND THE PIXELS", 25, 18, INK, width < 400 ? 8 : 9);
  ctx.fillStyle = "#d8dcd0"; ctx.fillRect(x, y, viewWidth, viewHeight / 2);
  ctx.fillStyle = "#b9c0b1"; ctx.fillRect(x, horizon, viewWidth, viewHeight / 2);
  const rays = model.rays, cameraAngle = Number(model.angle) || 0;
  const selectedRay = Math.min(rays.length - 1, Math.floor(clamp((Number(state.time) || 0) / 100, 0, 1) * (rays.length - 1)));
  let fov = Number(model.fov) || (Number(state.fov) || 60) * Math.PI / 180;
  if (fov > Math.PI) fov *= Math.PI / 180;
  const planeDistance = viewWidth / (2 * Math.tan(fov / 2));
  const columnWidth = viewWidth / rays.length;
  rays.forEach((ray, index) => {
    if (!Number.isFinite(ray.distance)) return;
    const perpendicular = Math.max(.05, ray.distance * Math.cos(ray.angle - cameraAngle));
    const columnHeight = Math.min(viewHeight, planeDistance / perpendicular);
    const fog = clamp(perpendicular / 12, 0, .8);
    const base = ray.side === 1 ? 62 : 89;
    const shade = Math.round(base + fog * 95);
    ctx.fillStyle = index === selectedRay ? ORANGE : `rgb(${shade},${shade + 8},${shade - 2})`;
    ctx.fillRect(x + index * columnWidth, horizon - columnHeight / 2, columnWidth + .5, columnHeight);
  });
  line(ctx, x, horizon, x + viewWidth, horizon, "#edf0e6", .5);
  ctx.strokeStyle = MUTED; ctx.lineWidth = .8; ctx.strokeRect(x, y, viewWidth, viewHeight);
  text(ctx, "PROJECTION", x + 8, y + 12, PAPER, 7);
  if (split) {
    const mapX = x + viewWidth + margin;
    const available = width - margin - mapX;
    const rows = model.map.length, columns = model.map[0].length;
    const cell = Math.min(available / columns, viewHeight / rows);
    const mapY = y + (viewHeight - rows * cell) / 2;
    ctx.fillStyle = "#f0f1eb"; ctx.fillRect(mapX, mapY, columns * cell, rows * cell);
    model.map.forEach((row, gy) => row.forEach((wall, gx) => {
      if (!wall) return;
      ctx.fillStyle = INK; ctx.fillRect(mapX + gx * cell + .4, mapY + gy * cell + .4, cell - .8, cell - .8);
    }));
    const player = model.player || { x: 2.5, y: 2.5 };
    const px = mapX + player.x * cell, py = mapY + player.y * cell;
    const stride = Math.max(1, Math.floor(rays.length / 25));
    ctx.save();
    rays.forEach((ray, index) => {
      if (index % stride !== 0 || !Number.isFinite(ray.distance)) return;
      ctx.globalAlpha = .25;
      line(ctx, px, py, mapX + ray.hitX * cell, mapY + ray.hitY * cell, ORANGE, .6);
    });
    ctx.restore();
    const selected = rays[selectedRay];
    line(ctx, px, py, mapX + selected.hitX * cell, mapY + selected.hitY * cell, ORANGE, 1.4);
    dot(ctx, px, py, Math.max(2, cell * .13), ORANGE);
    text(ctx, "GRID → RAYS → DISTANCE", mapX + available / 2, y + viewHeight + 13, MUTED, width < 400 ? 6 : 7, "center");
  }
  const selected = rays[selectedRay];
  const distance = selected.distance * Math.cos(selected.angle - cameraAngle);
  text(ctx, `d⊥ ${Number.isFinite(distance) ? distance.toFixed(2) : "∞"} / ${rays.length} RAYS`, 25, height - 17, ORANGE, 8);
  text(ctx, "h = projection / d⊥", width - 25, height - 17, INK, 8, "right");
}

function drawInterface(ctx, width, height, state) {
  const nodes = ["INPUT", "STATE", "MODEL", "CANVAS", "HTML", "TRACE"];
  const columns = width < 500 ? 3 : 6;
  const rows = Math.ceil(nodes.length / columns);
  const step = (width - 54) / columns, boxWidth = Math.min(95, step - 12);
  const points = nodes.map((name, index) => ({ x: 27 + (index % columns + .5) * step, y: rows > 1 ? 90 + Math.floor(index / columns) * 86 : height * .46 }));
  text(ctx, "THE ILLUSION IS AN IMPLEMENTATION", 25, 18, INK, width < 400 ? 8 : 9);
  const edges = [[0,1], [1,2], [2,3], [1,4], [2,5]];
  edges.forEach(([from, to]) => {
    const a = points[from], b = points[to];
    const sameRow = a.y === b.y;
    if (sameRow && to - from === 1) arrow(ctx, a.x + boxWidth / 2, a.y, b.x - boxWidth / 2, b.y, MUTED);
    else {
      const offset = from === 1 ? 40 : 58;
      line(ctx, a.x, a.y + 20, a.x, a.y + offset, LINE);
      line(ctx, a.x, a.y + offset, b.x, a.y + offset, LINE);
      arrow(ctx, b.x, a.y + offset, b.x, b.y + 20, LINE);
    }
  });
  const active = Math.min(nodes.length - 1, Math.floor(clamp((Number(state.time) || 0) / 100, 0, 1) * nodes.length));
  nodes.forEach((name, index) => {
    const { x, y } = points[index];
    ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = index === active ? ORANGE : LINE;
    ctx.strokeRect(x - boxWidth / 2 - 5, y - 25, boxWidth + 10, 50); ctx.restore();
    ctx.fillStyle = index === active ? INK : PAPER; ctx.fillRect(x - boxWidth / 2, y - 19, boxWidth, 38);
    ctx.strokeStyle = MUTED; ctx.strokeRect(x - boxWidth / 2, y - 19, boxWidth, 38);
    text(ctx, name, x, y, index === active ? PAPER : INK, 8, "center");
    text(ctx, String(index).padStart(2, "0"), x, y - 37, index === active ? ORANGE : MUTED, 8, "center");
  });
  text(ctx, "DETERMINISTIC DATA → TWO REPRESENTATIONS", 25, height - 20, ORANGE, width < 400 ? 7 : 8);
  if (width > 500) text(ctx, "SAME STATE. NO HIDDEN BACKEND.", width - 25, height - 20, MUTED, 8, "right");
}

export function drawLab(ctx, width, height, state, model) {
  if (!ctx || width <= 0 || height <= 0) return;
  ctx.save();
  background(ctx, width, height);
  ctx.beginPath(); ctx.rect(0, 0, width, height); ctx.clip();
  if (state.reality === "computation") drawComputation(ctx, width, height, state, model?.cells || model);
  else if (state.reality === "geometry") drawGeometry(ctx, width, height, state, model);
  else if (state.reality === "interface") drawInterface(ctx, width, height, state);
  else if (state.reality === "process" && state.variant === "philosophers") drawPhilosophers(ctx, width, height, state, model);
  else drawTrace(ctx, width, height, state, model, state.reality === "architecture");
  ctx.restore();
}
