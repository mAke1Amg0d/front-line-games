import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseHTML } from "linkedom";
import { games } from "../games.js";
import { summarizeCatalog, selectHeroGames, renderGameCards, renderFilters } from "../catalog.mjs";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const styles = await readFile(new URL("styles.css", root), "utf8");
const manifest = JSON.parse(await readFile(new URL("assets/games/manifest.json", root), "utf8"));
const { document } = parseHTML(html);
const worker = (await import("../dist/server/index.js")).default;

const placeIDs = ["98802908280535", "121890043855540", "113233262464001", "127946545657126", "72750913541724", "77168343527069", "103734458564998", "99354010363168", "139201277626845", "119248750585731", "101268290061141", "116576867673805", "86796403587009"];

test("the verified catalog contains each of the thirteen studio experiences exactly once", async () => {
  assert.equal(games.length, 13);
  assert.equal(new Set(games.map(game => game.id)).size, 13);
  assert.equal(new Set(games.map(game => game.universeId)).size, 13);
  assert.deepEqual(games.map(game => new URL(game.url).pathname.split("/")[2]), placeIDs);
  for (const game of games) {
    assert.ok(game.title && game.category && game.description && game.status);
    assert.match(game.accent, /^#[0-9a-f]{6}$/i);
    assert.match(game.image, /^assets\/games\/[a-z-]+\.webp$/);
    const official = manifest.games.find(item => item.id === game.id);
    assert.equal(official.universeId, game.universeId);
    assert.equal(official.placeId, new URL(game.url).pathname.split("/")[2]);
    assert.match(official.source, /^https:\/\/tr\.rbxcdn\.com\//);
    const image = await readFile(new URL(game.image, root));
    assert.equal(image.toString("ascii", 0, 4), "RIFF");
    assert.equal(image.toString("ascii", 8, 12), "WEBP");
    assert.ok(image.length > 1000 && image.length < 150000);
  }
  assert.equal(games.at(-1).title, "+1 Fart Destruction");
  assert.equal(games.at(-1).universeId, 10773345907);
  assert.equal(games.at(-1).status, "New");
});

test("category counts and all static page totals match the catalog without JavaScript", () => {
  const summary = summarizeCatalog();
  assert.deepEqual(summary.counts, { "Tap & Color": 2, "Tower Defense": 4, "Clean Up": 2, "Jumping": 2, "Merge & ASMR": 1, "Destruction": 2 });
  assert.equal(document.querySelectorAll("[data-game-id]").length, summary.total);
  assert.equal(document.querySelector("[data-game-count]").textContent, "13");
  assert.equal(document.querySelector("[data-total-games]").textContent, "13");
  assert.equal(document.querySelector("[data-total-categories]").textContent, "06");
  assert.equal(document.querySelector("[data-next-sector]").textContent, "14+");
  assert.equal(document.querySelector("[data-signal-count]").textContent, "13/13");
  assert.equal(document.querySelector("[data-catalog-intro]").textContent, "13 worlds, 6 kinds of chaos.");
  for (const category of summary.categories) {
    const { document: filtered } = parseHTML(renderGameCards(games, category));
    assert.equal(filtered.querySelectorAll("article").length, summary.counts[category]);
    filtered.querySelectorAll("article").forEach(card => {
      assert.equal(card.dataset.category, category);
      const sector = games.findIndex(game => game.id === card.dataset.gameId) + 1;
      assert.ok(card.textContent.includes(`Sector ${String(sector).padStart(2, "0")}`));
    });
  }
});

test("new releases automatically update summaries, categories, numbering, and hero selections", () => {
  const future = { ...games.at(-1), id: "future-game", title: "A <new> & playful world", category: "Exploration", universeId: 999, artworkPending: false };
  const catalog = [...games, future];
  const summary = summarizeCatalog(catalog);
  assert.equal(summary.total, 14);
  assert.equal(summary.nextSector, 15);
  assert.equal(summary.categories.length, 7);
  assert.equal(summary.counts.Exploration, 1);
  const picks = selectHeroGames(catalog);
  assert.equal(picks[0], future);
  assert.equal(picks.length, 5);
  assert.equal(new Set(picks).size, 5);
  assert.equal(new Set(picks.map(game => game.category)).size, 5);
  assert.match(renderFilters(catalog), /Exploration/);
  assert.match(renderGameCards(catalog, "Exploration"), /Sector 14/);
  assert.match(renderGameCards(catalog), /A &lt;new&gt; &amp; playful world/);
  assert.deepEqual(selectHeroGames([]), []);
  assert.equal(selectHeroGames([future]).length, 1);
  assert.ok(selectHeroGames(games).every(game => !game.artworkPending));
});

test("every navigation target exists and every game card links directly to its matching experience", () => {
  document.querySelectorAll('a[href^="#"]').forEach(link => assert.ok(document.getElementById(link.getAttribute("href").slice(1))));
  document.querySelectorAll("[data-game-id]").forEach(card => {
    const game = games.find(game => game.id === card.dataset.gameId);
    card.querySelectorAll("a").forEach(link => assert.equal(link.getAttribute("href"), game.url));
    assert.equal(card.querySelector("img").getAttribute("width"), String(game.imageWidth));
    assert.equal(card.querySelector("img").getAttribute("height"), String(game.imageHeight));
  });
  document.querySelectorAll('a[target="_blank"]').forEach(link => assert.match(link.getAttribute("rel"), /noreferrer/));
  assert.ok(document.querySelector(".skip-link"));
  assert.equal(document.querySelectorAll("h1").length, 1);
  assert.equal(document.querySelector("html").lang, "en");
  document.querySelectorAll(".hero-game-card figcaption").forEach(caption => assert.equal(caption.parentElement.tagName, "FIGURE"));
});

test("the ticker has equal sequences, exact loop distance, and a user pause control", () => {
  const sequences = [...document.querySelectorAll(".signal-sequence")];
  assert.equal(sequences.length, 2);
  assert.equal(sequences[0].innerHTML.replace(/\s+/g, " "), sequences[1].innerHTML.replace(/\s+/g, " "));
  assert.match(styles, /translate3d\(-50%, 0, 0\)/);
  assert.ok(document.querySelector("[data-motion-button]"));
  assert.match(styles, /animation-play-state: paused !important/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test("social metadata is absolute and the founder stays separate from official studio links", () => {
  assert.equal(document.querySelector('link[rel="canonical"]').href, "https://make1amg0d.github.io/front-line-games/");
  for (const attribute of ["og:description", "twitter:description"]) {
    const meta = document.querySelector(`meta[property="${attribute}"],meta[name="${attribute}"]`);
    assert.match(meta.content, /^13 Roblox experiences/);
  }
  for (const attribute of ["og:image", "twitter:image"]) {
    const meta = document.querySelector(`meta[property="${attribute}"],meta[name="${attribute}"]`);
    assert.equal(meta.content, "https://make1amg0d.github.io/front-line-games/og-studio.png");
  }
  const footer = document.querySelector("footer").innerHTML;
  assert.doesNotMatch(footer, /thisismagzhan|OneManArmySnappy|makesaidadvance/);
  for (const link of ["https://www.instagram.com/frontlinegamesofficial/", "https://www.tiktok.com/@frontlinegames", "https://t.me/frontlinegamesofficial", "https://x.com/FrontLineGamesR", "https://discord.gg/gZH5ahvqGe", "https://www.roblox.com/communities/246804689"]) assert.ok(footer.includes(link));
  assert.match(document.querySelector("#founder").textContent, /Magzhan Qydyrbek/);
  assert.ok(document.querySelector('#founder a[href="https://www.instagram.com/thisismagzhan/"]'));
  assert.ok(document.querySelector('#founder a[href="https://t.me/OneManArmySnappy"]'));
  const structuredData = JSON.parse(document.querySelector("#catalog-metadata").textContent);
  const list = structuredData["@graph"].find(item => item["@type"] === "ItemList");
  assert.equal(list.numberOfItems, games.length);
  assert.deepEqual(list.itemListElement.map(item => item.url), games.map(game => game.url));
});

test("the built site serves every local image, module, and stylesheet without missing assets", async () => {
  const assets = new Set(["/", "/games.js", "/catalog.mjs", "/script.js", "/styles.css", "/og-studio.png", "/brand-icon.png", "/favicon.svg", ...[...document.querySelectorAll("img")].map(image => `/${image.getAttribute("src").split("?")[0]}`)]);
  for (const asset of assets) {
    const result = await worker.fetch(new Request(`https://front-line-games.test${asset}`));
    assert.equal(result.status, 200, asset);
    assert.ok((await result.arrayBuffer()).byteLength > 0, asset);
    if (/\.m?js$/.test(asset)) assert.match(result.headers.get("content-type"), /^text\/javascript/);
    if (/\.webp$/.test(asset)) assert.equal(result.headers.get("content-type"), "image/webp");
  }
  assert.equal((await worker.fetch(new Request("https://front-line-games.test/not-found"))).status, 404);
});

async function startRuntime() {
  const environment = parseHTML(html);
  let activeElement = environment.document.body;
  Object.defineProperty(environment.document, "activeElement", { configurable: true, get: () => activeElement });
  environment.window.HTMLElement.prototype.focus = function () { activeElement = this; };
  const media = new Map();
  const windowMock = {
    matchMedia(query) { if (!media.has(query)) media.set(query, { matches: false, addEventListener(_, listener) { this.listener = listener; } }); return media.get(query); },
    location: { origin: "https://make1amg0d.github.io" },
    scrollY: 0,
    setInterval() {},
    requestAnimationFrame(callback) { callback(); },
    addEventListener() {},
  };
  globalThis.window = windowMock;
  globalThis.document = environment.document;
  await import(`../script.js?test=${Math.random()}`);
  return { ...environment, media };
}

test("filter controls update cards, counts, and pressed states for every category", async () => {
  const { document, window } = await startRuntime();
  for (const button of document.querySelectorAll("[data-filter]")) {
    button.dispatchEvent(new window.Event("click", { bubbles: true }));
    const category = button.dataset.filter;
    const expected = category === "All" ? games.length : summarizeCatalog().counts[category];
    assert.equal(document.querySelectorAll("[data-game-id]").length, expected, category);
    assert.equal(Number(document.querySelector("[data-game-count]").textContent), expected);
    assert.equal(document.querySelectorAll('[data-filter][aria-pressed="true"]').length, 1);
    assert.equal(button.getAttribute("aria-pressed"), "true");
  }
  document.querySelector('[data-filter="All"]').click();
  assert.equal(document.querySelectorAll("[data-game-id]").length, 13);
});

test("the mobile menu isolates background content and closes with Escape or desktop resize", async () => {
  const { document, window, media } = await startRuntime();
  const toggle = document.querySelector("[data-menu-button]");
  toggle.click();
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
  assert.equal(document.querySelector("main").inert, true);
  assert.equal(document.querySelector("footer").inert, true);
  const escape = new window.Event("keydown");
  escape.key = "Escape";
  document.dispatchEvent(escape);
  assert.equal(toggle.getAttribute("aria-expanded"), "false");
  assert.equal(document.querySelector("main").inert, false);
  assert.equal(document.activeElement, toggle);
  toggle.click();
  media.get("(min-width: 821px)").listener({ matches: true });
  assert.equal(toggle.getAttribute("aria-expanded"), "false");
  assert.equal(document.body.classList.contains("menu-open"), false);
});

test("players can pause animation and missing artwork falls back once without losing the play link", async () => {
  const { document, window } = await startRuntime();
  const toggle = document.querySelector("[data-motion-button]");
  toggle.click();
  assert.equal(document.body.classList.contains("motion-paused"), true);
  assert.equal(toggle.textContent, "Resume animations");
  toggle.click();
  assert.equal(document.body.classList.contains("motion-paused"), false);
  const image = document.querySelector(".game-media img");
  const link = image.closest("a").getAttribute("href");
  image.dispatchEvent(new window.Event("error", { bubbles: true }));
  assert.equal(image.src, "brand-icon.png");
  assert.match(image.alt, /artwork unavailable/);
  image.dispatchEvent(new window.Event("error", { bubbles: true }));
  assert.equal(image.src, "brand-icon.png");
  assert.equal(image.closest("a").getAttribute("href"), link);
});
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('the loopback preview serves the Pages path and excludes repository/private files', async () => {
  const processHandle = spawn(process.execPath, ['scripts/dev-server.mjs'], { cwd: fileURLToPath(root), env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const port = await new Promise((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error('Preview startup timed out')), 10000);
      processHandle.once('error', error => { clearTimeout(timer); reject(error); });
      processHandle.stdout.on('data', chunk => {
        output += chunk.toString();
        const match = output.match(/localhost:(\d+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
    });
    const address = `http://127.0.0.1:${port}`;
    assert.equal((await fetch(`${address}/front-line-games/`)).status, 200);
    const module = await fetch(`${address}/front-line-games/catalog.mjs`);
    assert.equal(module.status, 200);
    assert.match(module.headers.get('content-type'), /^text\/javascript/);
    assert.equal((await fetch(`${address}/.git/config`)).status, 403);
    assert.equal((await fetch(`${address}/.openai/hosting.json`)).status, 403);
    assert.equal((await fetch(`${address}/package.json`)).status, 403);
    assert.equal((await fetch(`${address}/`, { method: 'POST' })).status, 405);
    const head = await fetch(`${address}/styles.css`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  } finally {
    processHandle.kill();
  }
});
