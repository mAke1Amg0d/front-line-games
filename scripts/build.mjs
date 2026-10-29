import { mkdir, readFile, readdir, rm, writeFile, copyFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { games } from "../games.js";
import { renderGameCards, renderFilters, renderHeroCards, summarizeCatalog } from "../catalog.mjs";

const root = process.cwd();
const out = join(root, "dist");
const client = join(out, "client");
const server = join(out, "server");
const files = [
  "index.html",
  "styles.css",
  "games.js",
  "script.js",
  "catalog.mjs",
  "favicon.svg",
  "brand-icon.png",
  "founder-magzhan.webp",
];
const optionalFiles = ["og.png", "og-studio.png", "logo-wide.png"];
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
};

// Commit this generated HTML alongside games.js. GitHub Pages serves the root
// directly, so crawlers and players without JavaScript get the full catalog.
const summary = summarizeCatalog(games);
let html = await readFile(join(root, "index.html"), "utf8");
for (const [section, markup] of Object.entries({ hero: renderHeroCards(games), filters: renderFilters(games), games: renderGameCards(games) })) {
  const pattern = new RegExp(`<!-- catalog:${section}:start -->[\\s\\S]*?<!-- catalog:${section}:end -->`);
  if (!pattern.test(html)) throw new Error(`Missing catalog template marker: ${section}`);
  html = html.replace(pattern, `<!-- catalog:${section}:start -->${markup}\n<!-- catalog:${section}:end -->`);
}
for (const [attribute, value] of Object.entries({
  "data-signal-count": `${summary.total}/${summary.total}`,
  "data-total-games": String(summary.total).padStart(2, "0"),
  "data-game-count": String(summary.total).padStart(2, "0"),
  "data-total-categories": String(summary.categories.length).padStart(2, "0"),
  "data-next-sector": `${summary.nextSector}+`,
  "data-catalog-intro": `${summary.total} worlds, ${summary.categories.length} kinds of chaos.`,
})) html = html.replace(new RegExp(`(${attribute}>)[^<]*`, "g"), `$1${value}`);
html = html.replace(/content="\d+ Roblox experiences\. One front line\. Pick a sector and play\."/g, `content="${summary.total} Roblox experiences. One front line. Pick a sector and play."`);
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", name: "Front Line Games", url: "https://make1amg0d.github.io/front-line-games/", logo: "https://make1amg0d.github.io/front-line-games/brand-icon.png", founder: { "@type": "Person", name: "Magzhan Qydyrbek" } },
    { "@type": "ItemList", name: "Front Line Games Roblox experiences", numberOfItems: summary.total, itemListElement: games.map((game, index) => ({ "@type": "ListItem", position: index + 1, name: game.title, url: game.url })) },
  ],
};
html = html.replace(/(<script type="application\/ld\+json" id="catalog-metadata">)[\s\S]*?(<\/script>)/, `$1${JSON.stringify(structuredData).replaceAll("<", "\\u003c")}$2`);
await writeFile(join(root, "index.html"), html.replace(/[ \t]+$/gm, ""));

for (const file of await readdir(join(root, "assets/games"))) {
  if (/\.(webp|json)$/.test(file)) files.push(`assets/games/${file}`);
}

await rm(out, { recursive: true, force: true });
await mkdir(client, { recursive: true });
await mkdir(server, { recursive: true });

const embedded = [];
for (const file of [...files, ...optionalFiles]) {
  try {
    const source = join(root, file);
    const destination = join(client, file);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
    const body = await readFile(source);
    const route = file === "index.html" ? "/" : `/${file.replaceAll("\\", "/")}`;
    embedded.push([
      route,
      {
        type: contentTypes[extname(file)] || "application/octet-stream",
        body: body.toString("base64"),
      },
    ]);
  } catch (error) {
    if (!optionalFiles.includes(file)) throw error;
  }
}

const worker = `const files = new Map(${JSON.stringify(embedded)});

function decode(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname === "/index.html" ? "/" : url.pathname.replace(/\\/$/, "") || "/";
    const file = files.get(path);
    if (!file) {
      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return new Response(decode(file.body), {
      headers: {
        "content-type": file.type,
        "cache-control": path === "/" ? "public, max-age=300" : "public, max-age=86400",
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin",
      },
    });
  },
};
`;

await writeFile(join(server, "index.js"), worker);
console.log(`Built ${embedded.length} assets into ${out}`);
