import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const cli = fileURLToPath(new URL("../bin/epoxy-planner.js", import.meta.url));
const jobs = fileURLToPath(new URL("../examples/jobs.json", import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });

test("CLI estimates the complete example batch as JSON or CSV", () => {
  const json = run(jobs);
  assert.equal(json.status, 0, json.stderr);
  assert.equal(JSON.parse(json.stdout).length, 3);
  assert.ok(Math.abs(JSON.parse(json.stdout)[0].recommended.liters - 1.98) < 1e-12);
  const csv = run(jobs, "--format", "csv");
  assert.equal(csv.status, 0, csv.stderr);
  assert.equal(csv.stdout.trim().split(/\r?\n/).length, 4);
  assert.ok(csv.stdout.includes("River table"));
});

test("CLI fails clearly for malformed options or absent files", () => {
  for (const args of [[jobs, "--format", "xml"], [jobs, "--unknown", "json"], ["absent-job-list.json"]]) {
    const result = run(...args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /epoxy-planner:/);
  }
  assert.equal(run("--help").status, 0);
  assert.match(run("--version").stdout, /^0\.1\.0/);
});
