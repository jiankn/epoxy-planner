# epoxy-planner

Dependency-free JavaScript library and batch CLI for epoxy material estimates. It turns dimensions for casts, round pours, spheres and river-table cavities into raw volume, buffered order quantities and optional material budgets.

When measurements or product assumptions need an interactive check, use the [Epoxy Planner calculator](https://epoxyplanner.com/epoxy-calculator/). For the package API and runnable examples, see the [documentation](https://jiankn.github.io/epoxy-planner/).

The library executes locally. It sends no job names, dimensions or prices to a service. Node.js 20 or later is required for the CLI; the calculation module also works in modern browsers.

## Install

Until the first npm registry release, install the downloadable release archive:

```sh
npm install ./epoxy-planner-0.1.0.tgz
```

The same archive can be installed by URL from the [v0.1.0 release](https://github.com/jiankn/epoxy-planner/releases/tag/v0.1.0). Once npm publication is confirmed, the registry installation command is `npm install epoxy-planner`.

## Estimate one project

```js
import { estimateProject } from 'epoxy-planner';

const estimate = estimateProject({
  name: 'Small rectangular mold',
  kind: 'rectangle', unit: 'cm',
  length: 10, width: 10, depth: 10,
  wastePercent: 10,
  price: { amount: 28, per: 'liter', currency: 'USD' }
});
// raw.liters: 1; recommended.liters: 1.1; materialCost.amount: 30.8
console.log(estimate.recommended);
```

## Batch jobs and CSV

Save an array of projects as `jobs.json` (see [examples/jobs.json](examples/jobs.json)):

```sh
npx --no-install epoxy-planner jobs.json
npx --no-install epoxy-planner jobs.json --format csv > estimates.csv
```

`estimateBatch(projects)` provides the same behavior as a library function; `estimatesToCsv(estimates)` converts its results to CSV. Invalid inputs fail with the one-based job index. CSV export preserves quoted and multiline job names and neutralizes spreadsheet formulas in text cells.

## Input reference

| Field | Meaning |
|---|---|
| `kind` | `rectangle`, `round`, `sphere`, or `river` |
| `unit` | Required: `mm`, `cm`, or `in`; every dimension in the job uses this unit |
| `name` | Optional job label |
| `length`, `width`, `depth` | Positive numeric dimensions for a rectangle |
| `diameter`, `depth` | Positive numeric dimensions for a round pour |
| `diameter` | Positive numeric diameter for a full sphere |
| `length`, `depth`, `width` or `segmentWidths` | River-table cavity; samples in `segmentWidths` represent **equal-length** sections and take precedence over `width` |
| `wastePercent` | Optional planning margin from 0 to 100; default 10 |
| `seepagePercent`, `sealCoatPercent` | Optional additive allowances from 0 to 100; defaults 0 |
| `price` | Optional `{ amount, per: 'liter' \| 'us-gallon', currency: 'USD' }`; currency is a label, with no exchange-rate conversion |
| `mixRatio` | Optional manufacturer-provided `{ resin: 2, hardener: 1, basis: 'volume' }`; a weight ratio is rejected |

All numbers must be finite JavaScript numbers. Zero dimensions, negative margins, numeric strings, ambiguous units and numeric overflow are rejected. Missing prices and ratios produce `null`, rather than an invented price or product ratio.

## River-table example

```js
const river = estimateProject({
  kind: 'river', unit: 'cm', length: 100, depth: 2,
  segmentWidths: [10, 20],
  wastePercent: 10, seepagePercent: 8, sealCoatPercent: 5
});
// 3 raw liters; 3.69 recommended liters (23% additive allowances).
```

The [river-table planning calculator](https://epoxyplanner.com/river-table-epoxy-calculator/) supports checking the cavity measurements before using them in a batch. The 8% and 5% allowances above are example inputs, not universal losses for every project.

## Units and output

`usGallonsToLiters(gallons)` and `litersToUsGallons(liters)` use exactly 3.785411784 liters per **US liquid gallon**. Imperial gallons are not supported. For an interactive conversion, use the [epoxy volume unit converter](https://epoxyplanner.com/epoxy-unit-converter/).

Every result includes `raw` and `recommended` objects with `liters` and `usGallons`, total `allowancePercent`, optional `mix`, optional `materialCost`, and a `calculatorUrl` for the relevant project type. Values are unrounded so callers can choose display precision. A material budget excludes labor, kit rounding, shipping and tax.

These estimates support procurement planning. Check the selected resin manufacturer's ratio, mass limits, maximum pour depth and curing instructions. No curing schedule or safe layer depth is inferred by this package.

## Development

```sh
npm ci
npm test
npm run build
npm run verify:package
```

Tests cover known geometric volumes, unit equivalence, additive allowances, budget units, ratio conservation, invalid inputs, CSV output and CLI error handling. `verify:package` creates a tarball, installs that tarball into a temporary directory and runs the installed CLI and module. CI repeats these checks on Windows and Linux.

Version: 0.1.0. License: MIT. Report reproducible issues in the [source repository](https://github.com/jiankn/epoxy-planner/issues).
