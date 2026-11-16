#!/usr/bin/env node
/**
 * Discover public-domain models and PBR materials without an account.
 * Uses official read-only Poly Haven and ambientCG APIs — no scraping and
 * no automatic download/publishing of unreviewed assets.
 *
 * node scripts/asset_search.mjs "snow" --type texture --limit 8
 * node scripts/asset_search.mjs "pine tree" --provider polyhaven --type model
 */
const argv = process.argv.slice(2);
function flag(name, fallback) {
  const i = argv.indexOf("--" + name);
  return i < 0 ? fallback : (argv[i + 1] ?? fallback);
}
const options = new Set(["provider", "type", "limit"]);
const terms = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--") && options.has(argv[i].slice(2))) { i++; continue; }
  if (!argv[i].startsWith("--")) terms.push(argv[i]);
}
const query = terms.join(" ").trim();
const provider = flag("provider", "all").toLowerCase();
const type = flag("type", "all").toLowerCase();
const limit = Number(flag("limit", "10"));
if (!query || !["all", "polyhaven", "ambientcg"].includes(provider) ||
    !["all", "model", "texture", "hdri"].includes(type) ||
    !Number.isInteger(limit) || limit < 1 || limit > 30) {
  console.error("Usage: node scripts/asset_search.mjs <keywords> [--provider all|polyhaven|ambientcg] [--type all|model|texture|hdri] [--limit 1..30]");
  process.exit(2);
}
const words = query.toLowerCase().split(/\s+/);
async function getJSON(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AlpineSkiPro-asset-research/1.0 (open-source game tooling)",
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw Error("HTTP " + response.status + " " + url);
  return response.json();
}
const label = {0: "hdri", 1: "texture", 2: "model"};
function rank(item, text) {
  let n = 0;
  for (const word of words) {
    if (item.name.toLowerCase().includes(word)) n += 5;
    if (item.tags.includes(word)) n += 3;
    if (text.includes(word)) n += 1;
  }
  return n;
}
async function searchPolyHaven() {
  // The public API requires a recognisable user agent and source credit.
  const data = await getJSON("https://api.polyhaven.com/assets");
  const found = Object.entries(data).map(([id, item]) => {
    const name = String(item.name ?? id);
    const tags = (item.tags ?? []).map((x) => String(x).toLowerCase());
    const text = [name, item.category, item.description, ...tags]
      .join(" ").toLowerCase();
    return {
      id, name, tags,
      type: label[item.type] ?? "other",
      url: "https://polyhaven.com/a/" + encodeURIComponent(id),
      score: rank({name, tags}, text),
      provider: "Poly Haven",
      license: "CC0-1.0",
    };
  });
  return found.filter((r) => r.score >= words.length &&
    (type === "all" || type === r.type)).sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
async function searchAmbientCG() {
  const apiType = { model: "3d-model", texture: "material", hdri: "hdri" }[type];
  const u = new URL("https://ambientcg.com/api/v3/assets");
  u.searchParams.set("q", query);
  if (apiType) u.searchParams.set("type", apiType);
  u.searchParams.set("limit", String(limit));
  u.searchParams.set("include", "title,url,type,tags,shortDescription");
  const data = await getJSON(u.toString());
  const items = Array.isArray(data) ? data :
    (Array.isArray(data.assets) ? data.assets :
    (Array.isArray(data.foundAssets) ? data.foundAssets : []));
  return items.slice(0, limit).map((entry) => {
    const item = typeof entry === "string" ? {id: entry} : entry;
    const id = String(item.id ?? item.assetId ?? item.assetID ?? "");
    return {
      id, name: String(item.title ?? item.name ?? id),
      type: String(item.type ?? apiType ?? "mixed"),
      url: "https://ambientcg.com/a/" + encodeURIComponent(id),
      provider: "ambientCG",
      license: "CC0-1.0",
    };
  }).filter((entry) => entry.id);
}
const tasks = [];
if (provider !== "ambientcg") tasks.push(searchPolyHaven());
if (provider !== "polyhaven") tasks.push(searchAmbientCG());
const results = await Promise.allSettled(tasks);
let ok = false;
for (const result of results) {
  if (result.status === "rejected") {
    console.error("Catalogue inaccessible : " + String(result.reason));
    continue;
  }
  ok = true;
  for (const item of result.value)
    console.log("[" + item.provider + " | " + item.license + " | " +
      item.type + "] " + item.name + "\n  " + item.url);
}
console.log("\nRecherche documentaire uniquement : vérifier l'objet choisi, ses droits et son poids avant import.");
if (!ok) process.exitCode = 1;
