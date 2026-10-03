import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const site = path.join(root, "site");
const metadata = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
fs.mkdirSync(site, { recursive: true });
const html = fs.readFileSync(path.join(root, "web", "index.html"), "utf8").replaceAll("@@VERSION@@", metadata.version);
fs.writeFileSync(path.join(site, "index.html"), html);
fs.copyFileSync(path.join(root, "src", "index.js"), path.join(site, "api.js"));
fs.copyFileSync(path.join(root, "web", "app.js"), path.join(site, "app.js"));
fs.copyFileSync(path.join(root, "examples", "jobs.json"), path.join(site, "jobs.json"));
fs.writeFileSync(path.join(site, ".nojekyll"), "");
fs.writeFileSync(path.join(site, "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://jiankn.github.io/epoxy-planner/</loc></url></urlset>');
console.log("Built API documentation and browser example for " + metadata.name + " " + metadata.version);
