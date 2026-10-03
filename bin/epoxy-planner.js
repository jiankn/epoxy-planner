#!/usr/bin/env node
import fs from "node:fs";
import { estimateBatch, estimatesToCsv } from "../src/index.js";

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--version") {
  console.log(JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version);
} else if (args.length === 0 || args.includes("--help")) {
  console.log("Usage: epoxy-planner jobs.json [--format json|csv]\nDimensions use explicit mm, cm, or in. Prices and volume mixing ratios are optional.\nExamples: https://jiankn.github.io/epoxy-planner/");
} else {
  try {
    if (!(args.length === 1 || (args.length === 3 && args[1] === "--format"))) throw new Error("Use jobs.json [--format json|csv]");
    const format = args[2] ?? "json";
    if (!["json", "csv"].includes(format)) throw new Error("format must be json or csv");
    const results = estimateBatch(JSON.parse(fs.readFileSync(args[0], "utf8")));
    process.stdout.write(format === "csv" ? estimatesToCsv(results) : JSON.stringify(results, null, 2) + "\n");
  } catch (error) {
    console.error("epoxy-planner: " + error.message);
    process.exitCode = 1;
  }
}
