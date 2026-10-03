import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "epoxy-planner-verify-"));
function npm(args, cwd) {
  // Call the official npm CLI with Node directly on both Windows and Linux.
  const npmCli = process.env.npm_execpath;
  assert.ok(npmCli?.endsWith("npm-cli.js"), "Run through npm run verify:package");
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

const packed = JSON.parse(npm(["pack", "--json", "--pack-destination", temporaryRoot], root))[0];
assert.equal(packed.name, packageJson.name);
assert.equal(packed.version, packageJson.version);
for (const required of ["LICENSE", "README.md", "bin/epoxy-planner.js", "src/index.js", "examples/jobs.json"]) {
  assert.ok(packed.files.some((file) => file.path === required), "Missing package file " + required);
}
assert.ok(!packed.files.some((file) => /(?:test\/|\.github\/|site\/)/.test(file.path)), "Development files leaked into package");
npm(["install", "--ignore-scripts", "--no-audit", "--no-fund", "--prefix", temporaryRoot, path.join(temporaryRoot, packed.filename)], root);
const installedRoot = path.join(temporaryRoot, "node_modules", packageJson.name);
const invocation = spawnSync(process.execPath, [path.join(installedRoot, "bin", "epoxy-planner.js"), path.join(installedRoot, "examples", "jobs.json"), "--format", "csv"], { encoding: "utf8" });
assert.equal(invocation.status, 0, invocation.stderr);
assert.ok(invocation.stdout.includes("recommended_liters"));
assert.equal(invocation.stdout.trim().split(/\r?\n/).length, 4);
const library = await import(pathToFileURL(path.join(installedRoot, "src", "index.js")));
assert.equal(library.usGallonsToLiters(1), 3.785411784);
console.log(JSON.stringify({ package: packed.name, version: packed.version, bytes: packed.size, files: packed.files.length, installedCli: "passed", installedImport: "passed", archive: path.join(temporaryRoot, packed.filename) }));
