import test from "node:test";
import assert from "node:assert/strict";
import { SparkRegistry } from "../SparkRegistry.js";

const r = Object.create(SparkRegistry.prototype);
const n = (partial) =>
  r._normalizeConfig({ id: "s6", name: "S6", lanIp: "10.0.0.6", ...partial });

test("roles derive workerNode and llmMonitoring", () => {
  assert.equal(n({ role: "head" }).workerNode, false);
  assert.equal(n({ role: "head" }).llmMonitoring, true);
  assert.equal(n({ role: "worker" }).workerNode, true);
  assert.equal(n({ role: "worker" }).llmMonitoring, false);
  assert.equal(n({ role: "standalone" }).llmMonitoring, true);
  assert.equal(n({ role: "standalone", llmMonitoring: false }).llmMonitoring, false);
});

test("legacy workerNode-only becomes worker", () => {
  const out = n({ workerNode: true, workerLabel: "  DS  ", workerHeadId: "s5" });
  assert.equal(out.role, "worker");
  assert.equal(out.workerLabel, "DS");
  assert.equal(out.workerHeadId, "s5");
});

test("non-workers clear worker fields; self head rejected", () => {
  assert.equal(n({ role: "head", workerLabel: "x", workerHeadId: "s5" }).workerLabel, null);
  assert.equal(n({ role: "worker", workerHeadId: "s6" }).workerHeadId, null);
});

test("invalid role falls back via workerNode", () => {
  assert.equal(n({ role: "nope", workerNode: true }).role, "worker");
  assert.equal(n({ role: "nope" }).role, "standalone");
});
