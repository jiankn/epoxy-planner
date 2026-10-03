import assert from "node:assert/strict";
import test from "node:test";
import { estimateProject, estimateBatch, estimatesToCsv, litersToUsGallons, usGallonsToLiters } from "../src/index.js";

const cube = { kind: "rectangle", unit: "cm", length: 10, width: 10, depth: 10, wastePercent: 0 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.max(1e-12, Math.abs(expected) * 1e-12), actual + " != " + expected);

test("one cubic decimeter is one liter, including equivalent mm and inch inputs", () => {
  for (const [unit, side] of [["cm", 10], ["mm", 100], ["in", 10 / 2.54]]) {
    const result = estimateProject({ ...cube, unit, length: side, width: side, depth: side });
    close(result.raw.liters, 1);
    close(result.recommended.usGallons, 1 / 3.785411784);
  }
});

test("round pour and sphere use their geometric volumes", () => {
  close(estimateProject({ kind: "round", unit: "cm", diameter: 10, depth: 2, wastePercent: 0 }).raw.liters, Math.PI * 0.05);
  close(estimateProject({ kind: "sphere", unit: "cm", diameter: 10, wastePercent: 0 }).raw.liters, Math.PI / 6);
});

test("one US liquid gallon is exactly 3.785411784 liters", () => {
  close(usGallonsToLiters(1), 3.785411784);
  close(litersToUsGallons(3.785411784), 1);
  assert.equal(usGallonsToLiters(0), 0);
  assert.equal(litersToUsGallons(0), 0);
});

test("river width samples represent equal-length segments; allowances are additive", () => {
  const project = { kind: "river", unit: "cm", length: 100, depth: 2, segmentWidths: [10, 20], wastePercent: 10, seepagePercent: 8, sealCoatPercent: 5 };
  const result = estimateProject(project);
  close(result.raw.liters, 3);
  close(result.recommended.liters, 3.69);
  assert.equal(result.allowancePercent, 23);
  close(estimateProject({ ...project, segmentWidths: undefined, width: 15 }).recommended.liters, result.recommended.liters);
});

test("volume ratios conserve the recommended total; missing ratios stay unknown", () => {
  assert.equal(estimateProject(cube).mix, null);
  const result = estimateProject({ ...cube, wastePercent: 20, mixRatio: { basis: "volume", resin: 2, hardener: 1 } });
  close(result.mix.resin.liters, 0.8);
  close(result.mix.hardener.liters, 0.4);
  close(result.mix.resin.liters + result.mix.hardener.liters, result.recommended.liters);
  assert.throws(() => estimateProject({ ...cube, mixRatio: { basis: "weight", resin: 2, hardener: 1 } }), /weight ratios/);
});

test("prices use the specified quantity unit; no price produces no inferred budget", () => {
  assert.equal(estimateProject(cube).materialCost, null);
  close(estimateProject({ ...cube, price: { amount: 24, currency: "USD", per: "liter" } }).materialCost.amount, 24);
  close(estimateProject({ ...cube, price: { amount: 24 * 3.785411784, currency: "USD", per: "us-gallon" } }).materialCost.amount, 24);
});

test("reject ambiguous units, non-numbers, missing dimensions, invalid allowances and overflow", () => {
  const invalid = [
    { unit: "metric" }, { length: "10" }, { depth: 0 }, { width: -1 }, { length: NaN },
    { kind: "other" }, { wastePercent: -5 }, { wastePercent: 101 }, { seepagePercent: null },
    { length: 1e200, width: 1e200, depth: 1e200 }, { length: 1e-300, width: 1e-300, depth: 1e-300 },
    { name: 1 }, { price: { amount: -1, currency: "USD", per: "liter" } },
    { price: { amount: 1, currency: "usd", per: "liter" } }
  ];
  for (const change of invalid) assert.throws(() => estimateProject({ ...cube, ...change }), JSON.stringify(change));
  for (const value of [-1, "1", Infinity, NaN]) assert.throws(() => usGallonsToLiters(value));
  assert.throws(() => usGallonsToLiters(1e308), /numeric range/);
  assert.throws(() => estimateProject({ kind: "river", unit: "cm", length: 10, depth: 1, segmentWidths: [] }), /non-empty/);
});

test("batch errors identify the job; CSV escapes quoted/newline names and spreadsheet formulas", () => {
  assert.throws(() => estimateBatch([]), /non-empty/);
  assert.throws(() => estimateBatch([cube, { ...cube, depth: -1 }]), /Project 2:/);
  const csv = estimatesToCsv(estimateBatch([{ ...cube, name: 'Mold, "A"\nsecond line' }, { ...cube, name: "=1+1" }]));
  assert.ok(csv.includes('"Mold, ""A""\nsecond line"'));
  assert.ok(csv.includes('"\'=1+1"'));
  assert.ok(csv.startsWith("name,kind,raw_liters,"));
});
