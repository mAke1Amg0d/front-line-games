import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const gamesScript = await readFile(new URL("../games.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");
globalThis.window = {};
await import("../games.js");
const games = globalThis.window.FRONT_LINE_GAMES;
const worker = (await import("../dist/server/index.js")).default;

test("the page includes essential navigation and calls to action", () => {
  assert.match(html, /id="games"/);
  assert.match(html, /id="community"/);
  assert.match(html, /https:\/\/discord\.gg\/ZdnGSwczs/);
  assert.match(html, /Skip to content/);
});

test("all nine games and direct Roblox URLs are present", () => {
  const titleCount = (gamesScript.match(/title:/g) || []).length;
  const robloxCount = (gamesScript.match(/https:\/\/www\.roblox\.com\/games\//g) || []).length;
  assert.equal(titleCount, 9);
  assert.equal(robloxCount, 9);
  assert.equal(games.length, 9);
  assert.equal(new Set(games.map((game) => game.id)).size, 9);
  for (const game of games) {
    assert.match(game.url, /^https:\/\/www\.roblox\.com\/games\//);
    assert.match(game.image, /^https:\/\/tr\.rbxcdn\.com\//);
    assert.ok(game.title);
    assert.ok(game.description);
    assert.ok(game.category);
  }
});

test("responsive and reduced-motion styles are defined", () => {
  assert.match(styles, /@media \(max-width: 820px\)/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test("the production worker serves the site and its social card", async () => {
  const home = await worker.fetch(new Request("https://front-line-games.test/"));
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-type"), /^text\/html/);
  assert.match(await home.text(), /HOLD THE/);

  const socialCard = await worker.fetch(
    new Request("https://front-line-games.test/og.png"),
  );
  assert.equal(socialCard.status, 200);
  assert.equal(socialCard.headers.get("content-type"), "image/png");

  const missing = await worker.fetch(
    new Request("https://front-line-games.test/not-found"),
  );
  assert.equal(missing.status, 404);
});
