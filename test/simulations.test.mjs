import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// The deployed site is buildless. A data URL lets Node test its browser ES module
// without adding a package manifest solely to change .js module interpretation.
const source = await readFile(new URL("../portfolio/simulations.js", import.meta.url), "utf8");
const { ipv4ToInt, sameSubnet, networkTrace, parsePipeline, pipelineTrace, architectureTrace, philosophersState, castRay, generateAutomaton } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

test("IPv4 arithmetic covers unsigned high addresses and prefix boundaries", () => {
  assert.equal(ipv4ToInt("255.255.255.255"), 4294967295);
  assert.equal(ipv4ToInt("0.0.0.0"), 0);
  assert.equal(sameSubnet("10.10.0.2", "10.20.0.42", 8), true);
  assert.equal(sameSubnet("10.10.0.2", "10.20.0.42", 24), false);
  assert.equal(sameSubnet("10.10.0.2", "10.10.0.2", 32), true);
  assert.equal(sameSubnet("1.1.1.1", "200.1.1.1", 0), true);
  for (const invalid of ["256.0.0.1", "10.1.2", "-1.0.0.0", "1e1.0.0.1", "1.1.1.1x"]) assert.throws(() => ipv4ToInt(invalid), RangeError);
  assert.throws(() => sameSubnet("1.1.1.1", "1.1.1.2", 33), RangeError);
  assert.throws(() => sameSubnet("1.1.1.1", "1.1.1.2", 2.5), RangeError);
});

test("network model distinguishes missing routes, ARP errors, and missing hosts", () => {
  const valid = networkTrace();
  assert.equal(valid.ok, true);
  assert.deepEqual(valid.stages.map(stage => stage.label), ["SOURCE", "MASK", "GATEWAY", "ROUTER", "DELIVER"]);
  assert.equal(networkTrace({ route: false }).ok, false);
  assert.equal(networkTrace({ prefix: 8 }).stages.at(-1).label, "ARP TIMEOUT");
  assert.equal(networkTrace({ prefix: 32 }).stages.at(-1).label, "GATEWAY");
  assert.equal(networkTrace({ destination: "10.30.0.42" }).stages.at(-1).label, "NO ROUTE");
  assert.equal(networkTrace({ destination: "10.20.0.99" }).stages.at(-1).label, "ARP TIMEOUT");
  assert.equal(networkTrace({ destination: "10.20.0.255" }).ok, false);
  assert.equal(networkTrace({ destination: "10.10.0.1", route: false }).ok, true);
  assert.equal(networkTrace({ destination: "bad" }).stages.at(-1).label, "INVALID");
});

test("safe pipeline preserves literal data, ASCII translation and UTF-8 byte counts", () => {
  assert.equal(pipelineTrace("echo hello | tr a-z A-Z | wc -c").output, "6\n");
  assert.equal(pipelineTrace("echo 'hello world'").output, "hello world\n");
  assert.equal(pipelineTrace("echo café | tr a-z A-Z").output, "CAFé\n");
  assert.equal(pipelineTrace("echo café | wc -c").output, "6\n");
  assert.equal(pipelineTrace('echo "a|b" | wc -c').output, "4\n");
  assert.equal(pipelineTrace("echo '' | wc -c").output, "1\n");
  assert.equal(pipelineTrace("echo").output, "\n");
  assert.equal(parsePipeline("echo hi | tr a-z A-Z").commands.length, 2);
});

test("unsupported commands and executable shell syntax are rejected as data", () => {
  for (const command of ["rm -rf /", "echo hi; whoami", "echo $(id)", "echo `id`", "echo x > file", "echo hi && pwd", "echo a || wc -c", "echo 'open", "echo hi |", "echo hi | tr A-Z a-z", "echo hi | wc -c | tr a-z A-Z", "echo -n hi", "echo " + "x".repeat(250)]) {
    assert.equal(pipelineTrace(command).ok, false, command);
    assert.equal(pipelineTrace(command).output, "", command);
  }
});

test("architecture failures stop before unavailable downstream effects", () => {
  assert.equal(architectureTrace().ok, true);
  const failedDB = architectureTrace({ offline: true });
  assert.equal(failedDB.ok, false);
  assert.equal(failedDB.stages.at(-1).label, "VOLUME");
  const unauth = architectureTrace({ project: "transcendence", authenticated: false });
  assert.equal(unauth.stages.at(-1).label, "401");
  assert.equal(unauth.stages.some(stage => stage.label === "POSTGRESQL"), false);
  const unavailable = architectureTrace({ project: "transcendence", offline: true });
  assert.equal(unavailable.stages.at(-1).label, "UNAVAILABLE");
  assert.equal(unavailable.stages.some(stage => stage.label === "RESPONSE"), false);
  assert.equal(architectureTrace({ project: "transcendence" }).stages.at(-1).label, "RESPONSE");
});

test("resource ordering preserves exclusive ownership and makes progress", () => {
  for (const count of [2, 3, 5, 7, 9]) {
    const ate = new Set();
    for (let tick = 0; tick < 500; tick++) {
      const state = philosophersState(tick, { count });
      assert.equal(state.deadlocked, false);
      for (const agent of state.agents) {
        for (const fork of agent.forks) assert.equal(state.forks[fork], agent.id);
        if (agent.state === "eating") {
          ate.add(agent.id);
          assert.equal(agent.forks.length, 2);
          assert.equal(state.agents[(agent.id + 1) % count].state === "eating", false);
        }
      }
      state.forks.forEach((owner, fork) => {
        if (owner !== null) assert.equal(state.agents[owner].forks.includes(fork), true);
      });
    }
    assert.equal(ate.size, count, `all ${count} agents should eat under this scheduler`);
  }
});

test("unsafe schedule creates a circular wait with one fork per agent", () => {
  assert.equal(philosophersState(1, { safe: false }).deadlocked, false);
  const blocked = philosophersState(2, { safe: false });
  assert.equal(blocked.deadlocked, true);
  assert.deepEqual(blocked.forks, [0, 1, 2, 3, 4]);
  assert.equal(blocked.agents.every(agent => agent.state === "waiting" && agent.forks.length === 1), true);
  assert.deepEqual(philosophersState(40), philosophersState(40));
});

test("DDA returns exact wall intersections in four cardinal directions", () => {
  const map = [[1,1,1,1,1], [1,0,0,0,1], [1,0,0,0,1], [1,0,0,0,1], [1,1,1,1,1]];
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2, -Math.PI]) {
    const hit = castRay(map, 2.5, 2.5, angle);
    assert.ok(Math.abs(hit.distance - 1.5) < 1e-9);
    assert.ok(Number.isFinite(hit.hitX) && Number.isFinite(hit.hitY));
  }
  const diagonal = castRay(map, 2.5, 2.5, Math.PI / 4);
  assert.ok(Math.abs(diagonal.distance - Math.sqrt(4.5)) < 1e-9);
  assert.ok(Math.abs(diagonal.hitX - 4) < 1e-9);
  assert.equal(castRay(map, 0.5, 0.5, 0).distance, 0);
  assert.equal(castRay([[0,0],[0,0]], 0.5, 0.5, 0).distance, Infinity);
  assert.ok(Number.isFinite(castRay(map, 2, 2, -Math.PI).distance));
});

test("cellular automaton implements neighborhood rules with fixed zero boundaries", () => {
  assert.deepEqual(generateAutomaton(90, 7, 4), [
    [0,0,0,1,0,0,0],
    [0,0,1,0,1,0,0],
    [0,1,0,0,0,1,0],
    [1,0,1,0,1,0,1]
  ]);
  assert.equal(generateAutomaton(0, 7, 4).slice(1).flat().every(cell => cell === 0), true);
  assert.equal(generateAutomaton(255, 7, 4).slice(1).flat().every(cell => cell === 1), true);
  assert.deepEqual(generateAutomaton(30, 20, 20), generateAutomaton(30, 20, 20));
});
