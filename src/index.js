/** Unit-explicit material planning. No curing or product-selection assumptions. */
export const LITERS_PER_US_GALLON = 3.785411784;
const CM_PER_UNIT = Object.freeze({ mm: 0.1, cm: 1, in: 2.54 });
const LANDING_PAGES = Object.freeze({
  rectangle: "https://epoxyplanner.com/epoxy-calculator/",
  round: "https://epoxyplanner.com/round-epoxy-table-calculator/",
  sphere: "https://epoxyplanner.com/sphere-resin-calculator/",
  river: "https://epoxyplanner.com/river-table-epoxy-calculator/"
});

function finiteNumber(value, field, { zero = false } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value) || (zero ? value < 0 : value <= 0)) {
    throw new TypeError(field + " must be a finite " + (zero ? "non-negative" : "positive") + " number");
  }
  return value;
}

function percent(value, field) {
  const result = finiteNumber(value, field, { zero: true });
  if (result > 100) throw new RangeError(field + " must be at most 100");
  return result;
}

function volume(liters) {
  return { liters, usGallons: liters / LITERS_PER_US_GALLON };
}

/** Convert US liquid gallons to liters. Imperial gallons are not supported. */
export function usGallonsToLiters(gallons) {
  const result = finiteNumber(gallons, "gallons", { zero: true }) * LITERS_PER_US_GALLON;
  if (!Number.isFinite(result)) throw new RangeError("converted volume is outside the supported numeric range");
  return result;
}

/** Convert liters to US liquid gallons. */
export function litersToUsGallons(liters) {
  return finiteNumber(liters, "liters", { zero: true }) / LITERS_PER_US_GALLON;
}

/**
 * Estimate a rectangle, round pour, sphere, or river-table resin cavity.
 * Units are explicit: mm, cm, or in for every dimension in one project.
 * River samples are equal-length segments. Margins are additive, not compounded.
 * Price and volume-based resin:hardener ratios are optional manufacturer inputs.
 * @param {object} project A project matching the README input schema.
 * @returns {object} Unrounded raw/recommended volumes, optional split/cost and calculator URL.
 */
export function estimateProject(project) {
  if (!project || typeof project !== "object" || Array.isArray(project)) {
    throw new TypeError("project must be an object");
  }
  const { kind, unit } = project;
  if (!Object.hasOwn(LANDING_PAGES, kind)) throw new TypeError("kind must be rectangle, round, sphere, or river");
  if (!Object.hasOwn(CM_PER_UNIT, unit)) throw new TypeError("unit must be mm, cm, or in");
  if (project.name !== undefined && typeof project.name !== "string") throw new TypeError("name must be a string");
  const dim = (field) => finiteNumber(project[field], field) * CM_PER_UNIT[unit];
  let cubicCm;
  if (kind === "rectangle") {
    cubicCm = dim("length") * dim("width") * dim("depth");
  } else if (kind === "round") {
    cubicCm = Math.PI * (dim("diameter") / 2) ** 2 * dim("depth");
  } else if (kind === "sphere") {
    cubicCm = (4 / 3) * Math.PI * (dim("diameter") / 2) ** 3;
  } else {
    let width;
    if (project.segmentWidths !== undefined) {
      if (!Array.isArray(project.segmentWidths) || project.segmentWidths.length === 0) {
        throw new TypeError("segmentWidths must be a non-empty array of equal-length segment widths");
      }
      width = project.segmentWidths.reduce((sum, value) => sum + finiteNumber(value, "segment width") / project.segmentWidths.length, 0) * CM_PER_UNIT[unit];
    } else {
      width = dim("width");
    }
    cubicCm = dim("length") * width * dim("depth");
  }
  const wastePercent = percent(project.wastePercent === undefined ? 10 : project.wastePercent, "wastePercent");
  const seepagePercent = percent(project.seepagePercent === undefined ? 0 : project.seepagePercent, "seepagePercent");
  const sealCoatPercent = percent(project.sealCoatPercent === undefined ? 0 : project.sealCoatPercent, "sealCoatPercent");
  const allowancePercent = wastePercent + seepagePercent + sealCoatPercent;
  const rawLiters = cubicCm / 1000;
  const recommendedLiters = rawLiters * (1 + allowancePercent / 100);
  if (!Number.isFinite(recommendedLiters) || recommendedLiters <= 0) {
    throw new RangeError("dimensions produce a volume outside the supported numeric range");
  }
  let mix = null;
  if (project.mixRatio !== undefined) {
    const ratio = project.mixRatio;
    if (!ratio || ratio.basis !== "volume") throw new TypeError("mixRatio.basis must be volume; weight ratios cannot split volume");
    const resin = finiteNumber(ratio.resin, "mixRatio.resin");
    const hardener = finiteNumber(ratio.hardener, "mixRatio.hardener");
    const maxPart = Math.max(resin, hardener);
    const resinShare = (resin / maxPart) / (resin / maxPart + hardener / maxPart);
    mix = { basis: "volume", resin: volume(recommendedLiters * resinShare), hardener: volume(recommendedLiters * (1 - resinShare)) };
  }
  let materialCost = null;
  if (project.price !== undefined) {
    const price = project.price;
    if (!price || !["liter", "us-gallon"].includes(price.per)) throw new TypeError("price.per must be liter or us-gallon");
    if (typeof price.currency !== "string" || !/^[A-Z]{3}$/.test(price.currency)) throw new TypeError("price.currency must be a three-letter uppercase currency code");
    const amount = finiteNumber(price.amount, "price.amount", { zero: true });
    const quantity = price.per === "liter" ? recommendedLiters : recommendedLiters / LITERS_PER_US_GALLON;
    if (!Number.isFinite(amount * quantity)) throw new RangeError("material cost is outside the supported numeric range");
    materialCost = { amount: amount * quantity, currency: price.currency };
  }
  return {
    name: project.name ?? "Untitled project", kind, unit,
    raw: volume(rawLiters), recommended: volume(recommendedLiters),
    allowancePercent, mix, materialCost, calculatorUrl: LANDING_PAGES[kind]
  };
}

/** Estimate all jobs; invalid entries fail with their job index instead of being skipped. */
export function estimateBatch(projects) {
  if (!Array.isArray(projects) || projects.length === 0) throw new TypeError("projects must be a non-empty array");
  return projects.map((project, index) => {
    try { return estimateProject(project); }
    catch (error) { throw new TypeError("Project " + (index + 1) + ": " + error.message); }
  });
}

/** Export estimates to CSV, escaping quotes/newlines and neutralizing spreadsheet formulas. */
export function estimatesToCsv(estimates) {
  const cell = (value) => {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const columns = ["name", "kind", "raw_liters", "recommended_liters", "recommended_us_gallons", "allowance_percent", "resin_liters", "hardener_liters", "material_cost", "currency", "calculator_url"];
  const rows = estimates.map((result) => [
    result.name, result.kind, result.raw.liters, result.recommended.liters,
    result.recommended.usGallons, result.allowancePercent,
    result.mix?.resin.liters, result.mix?.hardener.liters,
    result.materialCost?.amount, result.materialCost?.currency, result.calculatorUrl
  ].map(cell).join(","));
  return [columns.join(","), ...rows].join("\r\n") + "\r\n";
}
