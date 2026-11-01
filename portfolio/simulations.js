/**
 * Small, deterministic teaching models. These functions never execute commands,
 * open sockets, access files, or claim to run the original student projects.
 */

export function ipv4ToInt(address) {
  if (typeof address !== "string" || !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(address)) {
    throw new RangeError("Enter four decimal IPv4 octets.");
  }
  const octets = address.split(".").map(Number);
  if (octets.some(value => value > 255)) throw new RangeError("IPv4 octets must be between 0 and 255.");
  return octets.reduce((value, octet) => value * 256 + octet, 0) >>> 0;
}

export function sameSubnet(a, b, prefix) {
  const length = Number(prefix);
  if (!Number.isInteger(length) || length < 0 || length > 32) throw new RangeError("Prefix must be an integer from 0 to 32.");
  const mask = length === 0 ? 0 : (0xffffffff << (32 - length)) >>> 0;
  return (ipv4ToInt(a) & mask) === (ipv4ToInt(b) & mask);
}

export function networkTrace({ destination = "10.20.0.42", prefix = 24, route = true } = {}) {
  const stages = [{ label: "SOURCE", detail: `10.10.0.2/${prefix} prepares an IPv4 packet for ${destination}.` }];
  const result = (ok, explanation) => ({ ok, stages, explanation });
  try {
    const local = sameSubnet("10.10.0.2", destination, prefix);
    stages.push({ label: "MASK", detail: local ? "The mask marks this destination as on-link." : "The mask marks this destination as remote." });
    if (destination === "10.10.0.2") {
      stages.push({ label: "LOCAL", detail: "The destination is this host. Delivery stays in the local IP stack." });
      return result(true, "A packet addressed to the sending host does not need a router.");
    }
    if (local) {
      if (destination === "10.10.0.1") {
        stages.push({ label: "ARP", detail: "The gateway is physically on the source LAN, so its link-layer address can be resolved." });
        stages.push({ label: "DELIVER", detail: "10.10.0.1 receives the packet on its local interface." });
        return result(true, "On-link delivery uses address resolution, not the gateway's routing table.");
      }
      stages.push({ label: "ARP TIMEOUT", detail: "The destination is not on the source Ethernet segment. Routers do not forward ARP broadcasts." });
      return result(false, "An overly broad mask can make a remote destination appear local. The host tries ARP instead of using its gateway.");
    }
    if (!sameSubnet("10.10.0.2", "10.10.0.1", prefix)) {
      stages.push({ label: "GATEWAY", detail: "10.10.0.1 is not on-link under this source mask; this model has no explicit host route to it." });
      return result(false, "The configured next hop must be reachable on-link, unless an explicit route resolves it.");
    }
    stages.push({ label: "GATEWAY", detail: "10.10.0.2 resolves 10.10.0.1 on its LAN; the destination IP remains unchanged." });
    if (!route || !sameSubnet(destination, "10.20.0.1", 24)) {
      stages.push({ label: "NO ROUTE", detail: "The router has no matching route to this destination. No default route exists in this exercise." });
      return result(false, "Delivery requires a matching route. This bounded exercise has two LANs and one router.");
    }
    if (destination === "10.20.0.0" || destination === "10.20.0.255") {
      stages.push({ label: "NOT A HOST", detail: "This address is the /24 network identifier or directed broadcast, not the simulated receiving host." });
      return result(false, "A network identifier or broadcast address is not a unicast endpoint.");
    }
    stages.push({ label: "ROUTER", detail: "10.20.0.0/24 selects the router's second interface, 10.20.0.1. TTL decreases by one." });
    if (destination !== "10.20.0.42" && destination !== "10.20.0.1") {
      stages.push({ label: "ARP TIMEOUT", detail: "The route exists, but no endpoint with this address is present on the destination LAN." });
      return result(false, "A route gets a packet to the correct network; the destination host must also exist.");
    }
    stages.push({ label: "DELIVER", detail: `${destination} receives the packet. A return route through 10.20.0.1 is assumed for the receiving host.` });
    return result(true, "The mask decides local versus remote; the router selects the destination network. Routing is not a direct line between arbitrary hosts.");
  } catch (error) {
    stages.push({ label: "INVALID", detail: error.message });
    return result(false, error.message);
  }
}

// Tokenization is deliberately small. Quotes group literal text; there is no
// expansion, escaping, redirection, command substitution, or shell evaluation.
export function parsePipeline(command) {
  const fail = error => ({ ok: false, commands: [], error });
  if (typeof command !== "string" || !command.trim()) return fail("Enter a pipeline beginning with echo.");
  if (command.length > 240) return fail("Keep this teaching pipeline under 240 characters.");
  if (/[;&<>`$\\\n\r]/.test(command)) return fail("Only literal text and pipes are supported; shell control syntax is disabled.");
  const pieces = [];
  let tokens = [], token = "", started = false, quote = "";
  const finishToken = () => { if (started) tokens.push(token); token = ""; started = false; };
  for (const char of command) {
    if (quote) {
      if (char === quote) quote = "";
      else token += char;
      started = true;
    } else if (char === "'" || char === '"') {
      quote = char; started = true;
    } else if (char === "|") {
      finishToken();
      if (!tokens.length) return fail("Each pipe needs a command on both sides.");
      pieces.push(tokens); tokens = [];
    } else if (/\s/.test(char)) finishToken();
    else { token += char; started = true; }
  }
  if (quote) return fail("Close the quoted text before running the pipeline.");
  finishToken();
  if (!tokens.length) return fail("Each pipe needs a command on both sides.");
  pieces.push(tokens);
  if (pieces.length > 3) return fail("This model supports up to three pipeline stages.");
  if (pieces[0][0] !== "echo") return fail("Start with echo <literal text>.");
  if (pieces[0][1]?.startsWith("-")) return fail("echo options are outside this model; use literal text without a leading dash.");
  let counted = false, translated = false;
  const commands = [];
  for (let index = 0; index < pieces.length; index++) {
    const [name, ...args] = pieces[index];
    if (index === 0 && name === "echo") commands.push({ name, args });
    else if (!counted && !translated && name === "tr" && args.join(" ") === "a-z A-Z") {
      translated = true; commands.push({ name, args });
    } else if (!counted && name === "wc" && args.join(" ") === "-c" && index === pieces.length - 1) {
      counted = true; commands.push({ name, args });
    } else return fail("Supported: echo <text> | tr a-z A-Z | wc -c. tr and wc are optional, in that order.");
  }
  return { ok: true, commands };
}

export function pipelineTrace(command = "echo hello | tr a-z A-Z | wc -c") {
  const parsed = parsePipeline(command);
  const stages = [{ label: "PARSE", detail: parsed.ok ? `${parsed.commands.length} bounded command stage(s); quoted text stays literal.` : parsed.error }];
  if (!parsed.ok) return { ok: false, stages, output: "", explanation: parsed.error };
  let output = "";
  for (let index = 0; index < parsed.commands.length; index++) {
    const { name, args } = parsed.commands[index];
    if (name === "echo") output = `${args.join(" ")}\n`;
    if (name === "tr") output = output.replace(/[a-z]/g, char => char.toUpperCase());
    if (name === "wc") output = `${new TextEncoder().encode(output).length}\n`;
    stages.push({ label: name.toUpperCase(), detail: name === "wc" ? `Counts UTF-8 bytes, including echo's trailing newline. Output: ${output.trim()}.` : `stdout contains ${JSON.stringify(output)}.` });
    if (index < parsed.commands.length - 1) stages.push({ label: "PIPE", detail: `Stage ${index + 1} stdout (fd 1) connects to stage ${index + 2} stdin (fd 0). Each command is a separate simulated process.` });
  }
  stages.push({ label: "STDOUT", detail: `The last process writes ${JSON.stringify(output)} to the terminal.` });
  return { ok: true, stages, output, explanation: "A pipe carries a byte stream between processes. This deterministic model shows the resulting data, not actual concurrent scheduling or a running shell." };
}

export function architectureTrace({ offline = false, authenticated = true, project = "inception" } = {}) {
  const stages = [{ label: "CLIENT", detail: project === "transcendence" ? "A browser sends GET /users/profile with a Bearer token over HTTPS." : "A browser requests the WordPress site over HTTPS." }];
  stages.push({ label: "NGINX", detail: "TLS terminates at the HTTPS reverse proxy on port 443." });
  if (project === "transcendence") {
    stages.push({ label: "GATEWAY", detail: "The NestJS gateway validates the JWT locally and checks the route guard. The auth service is not contacted for every profile request." });
    if (!authenticated) {
      stages.push({ label: "401", detail: "The missing or invalid token is rejected before the user service is called." });
      return { ok: false, stages, explanation: "Authentication belongs at the request boundary. This is a simplified profile request from the verified team architecture." };
    }
    stages.push({ label: "TCP / USER", detail: "NestJS ClientProxy forwards the profile operation to ms-user over TCP." });
    if (offline) {
      stages.push({ label: "UNAVAILABLE", detail: "The simulated user service is offline; no database query or successful response follows. Exact production error mapping is not reproduced." });
      return { ok: false, stages, explanation: "A gateway cannot complete the profile request when its downstream user service is unavailable." };
    }
    stages.push({ label: "POSTGRESQL", detail: "ms-user reads its user data through TypeORM and PostgreSQL." });
    stages.push({ label: "RESPONSE", detail: "The result returns through ms-user, gateway, and NGINX to the browser." });
    return { ok: true, stages, explanation: "A verified path through the team project: HTTPS → NGINX → gateway JWT guard → TCP user service → PostgreSQL. This demonstration uses synthetic data and performs no real request." };
  }
  stages.push({ label: "WORDPRESS", detail: "NGINX forwards PHP requests to WordPress/PHP-FPM on port 9000 over the Compose bridge network." });
  if (offline) {
    stages.push({ label: "DB OFFLINE", detail: "The simulated MariaDB service is unavailable. WordPress cannot complete a database-backed page request." });
    stages.push({ label: "VOLUME", detail: "Database files remain in the bind-backed database volume. Container availability and persistent data are distinct." });
    return { ok: false, stages, explanation: "Stopping a database container interrupts requests; it does not itself delete the persistent volume. This is a bounded conceptual failure, not a live outage." };
  }
  stages.push({ label: "MARIADB", detail: "WordPress queries MariaDB on port 3306. Site and database data use separate bind-backed volumes." });
  stages.push({ label: "RESPONSE", detail: "PHP-FPM returns the generated page through NGINX to the browser." });
  return { ok: true, stages, explanation: "The verified Compose topology separates the TLS boundary, PHP application, and database. Additional declared services are omitted from this request-focused model." };
}

export function philosophersState(tick, { safe = true, count = 5 } = {}) {
  const size = Math.max(2, Math.min(9, Math.trunc(Number(count)) || 5));
  const time = Math.max(0, Math.min(2000, Math.floor(Number(tick)) || 0));
  const agents = Array.from({ length: size }, (_, id) => ({ id, state: "thinking", forks: [] }));
  const forks = Array(size).fill(null);
  if (!safe) {
    for (const agent of agents) {
      agent.state = time === 0 ? "thinking" : time === 1 ? "hungry" : "waiting";
      if (time >= 2) { forks[agent.id] = agent.id; agent.forks = [agent.id]; }
    }
    return { agents, forks, deadlocked: time >= 2, tick: time, explanation: time >= 2 ? "Every philosopher holds their left fork and waits for the right one, owned by a neighbor. Circular wait prevents progress." : "Unsafe schedule: all philosophers will take their left fork together, then wait for the right." };
  }
  // Replay a round-robin scheduler. Each scheduled agent performs one action:
  // become hungry, acquire a fork in global order, eat, or release both forks.
  // A total ordering on resources removes circular wait.
  for (let step = 0; step < time; step++) {
    const agent = agents[step % size];
    const needed = [agent.id, (agent.id + 1) % size].sort((a, b) => a - b);
    if (agent.state === "thinking") agent.state = "hungry";
    else if (agent.state === "eating") {
      for (const fork of agent.forks) forks[fork] = null;
      agent.forks = []; agent.state = "thinking";
    } else {
      const next = needed[agent.forks.length];
      if (forks[next] === null) {
        forks[next] = agent.id;
        agent.forks.push(next);
        agent.state = agent.forks.length === 2 ? "eating" : "hungry";
      } else agent.state = "waiting";
    }
  }
  return { agents, forks, deadlocked: false, tick: time, explanation: "Each philosopher acquires the lower-numbered fork first, then the higher. This total resource order removes circular wait; the model uses a fair round-robin scheduler. It does not prove all real implementations are starvation-free." };
}

/** Grid DDA. distance is the ray parameter for a unit direction (Euclidean ray
 * distance); a camera renderer must multiply by cos(rayAngle-cameraAngle) to
 * obtain perpendicular wall distance and avoid fisheye distortion. */
export function castRay(map, x, y, angle) {
  if (!Array.isArray(map) || !map.length || !Array.isArray(map[0]) || !map[0].length || ![x, y, angle].every(Number.isFinite)) {
    return { distance: Infinity, hitX: x, hitY: y, side: -1 };
  }
  const width = map[0].length, height = map.length;
  let cellX = Math.floor(x), cellY = Math.floor(y);
  if (cellX < 0 || cellY < 0 || cellX >= width || cellY >= height) return { distance: Infinity, hitX: x, hitY: y, side: -1 };
  if (map[cellY][cellX]) return { distance: 0, hitX: x, hitY: y, side: -1 };
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const deltaX = Math.abs(dx) < 1e-12 ? Infinity : Math.abs(1 / dx);
  const deltaY = Math.abs(dy) < 1e-12 ? Infinity : Math.abs(1 / dy);
  const stepX = dx < 0 ? -1 : 1, stepY = dy < 0 ? -1 : 1;
  let nextX = deltaX === Infinity ? Infinity : (dx < 0 ? x - cellX : cellX + 1 - x) * deltaX;
  let nextY = deltaY === Infinity ? Infinity : (dy < 0 ? y - cellY : cellY + 1 - y) * deltaY;
  for (let step = 0; step < width * height + 1; step++) {
    let distance, side;
    if (nextX < nextY) { distance = nextX; nextX += deltaX; cellX += stepX; side = 0; }
    else { distance = nextY; nextY += deltaY; cellY += stepY; side = 1; }
    if (cellX < 0 || cellY < 0 || cellX >= width || cellY >= height) return { distance: Infinity, hitX: x + dx * distance, hitY: y + dy * distance, side: -1 };
    if (map[cellY]?.[cellX]) return { distance, hitX: x + dx * distance, hitY: y + dy * distance, side };
  }
  return { distance: Infinity, hitX: x, hitY: y, side: -1 };
}

export function generateAutomaton(rule = 90, width = 61, rows = 36) {
  const ruleNumber = Math.max(0, Math.min(255, Math.trunc(Number(rule)) || 0));
  const columns = Math.max(3, Math.min(201, Math.trunc(Number(width)) || 61));
  const height = Math.max(1, Math.min(200, Math.trunc(Number(rows)) || 36));
  const cells = [Array(columns).fill(0)];
  cells[0][Math.floor(columns / 2)] = 1;
  for (let row = 1; row < height; row++) {
    const previous = cells[row - 1];
    cells.push(previous.map((_, col) => {
      const neighborhood = ((previous[col - 1] || 0) << 2) | (previous[col] << 1) | (previous[col + 1] || 0);
      return (ruleNumber >> neighborhood) & 1;
    }));
  }
  return cells;
}
