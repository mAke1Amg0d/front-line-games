import { mkdir, writeFile } from "node:fs/promises";
import { games } from "../games.js";

const directory = new URL("../assets/games/", import.meta.url);
await mkdir(directory, { recursive: true });
const getJSON = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Roblox returned ${response.status}: ${url}`);
  return response.json();
};

// Run explicitly before releases, never in the visitor's browser or offline CI.
// Public Roblox endpoints only; no cookies, keys, or authentication required.
const manifest = [];
const downloads = [];
for (const game of games) {
  const placeId = game.url.match(/\/games\/(\d+)/)?.[1];
  if (!placeId) throw new Error(`Invalid place URL for ${game.id}`);
  const { universeId } = await getJSON(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
  if (!universeId) throw new Error(`No universe for ${game.id}`);
  const details = await getJSON(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
  const experience = details.data?.[0];
  if (experience?.creator?.id !== 246804689 || experience.creator.type !== "Group") {
    throw new Error(`Unexpected owner for ${game.id}; preserve current artwork and investigate.`);
  }
  const thumbnails = await getJSON(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=1&defaults=false&size=768x432&format=Webp&isCircular=false`);
  let thumbnail = thumbnails.data?.[0]?.thumbnails?.find((item) => item.state === "Completed");
  let width = 768;
  let height = 432;
  let kind = "thumbnail";
  if (!thumbnail) {
    const icons = await getJSON(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Webp&isCircular=false`);
    thumbnail = icons.data?.find((item) => item.state === "Completed");
    width = height = 512;
    kind = "icon";
  }
  if (!thumbnail || !/^https:\/\/tr\.rbxcdn\.com\//.test(thumbnail.imageUrl)) throw new Error(`Artwork not ready for ${game.id}`);
  const response = await fetch(thumbnail.imageUrl, { signal: AbortSignal.timeout(20000) });
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error(`Invalid artwork response for ${game.id}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") throw new Error(`Expected WebP artwork for ${game.id}`);
  downloads.push({ id: game.id, bytes });
  manifest.push({ id: game.id, placeId, universeId, robloxTitle: experience.name, creator: experience.creator.name, source: thumbnail.imageUrl, image: `assets/games/${game.id}.webp`, width, height, kind });
  console.log(`${game.id}: verified studio owner, universe ${universeId}, ${bytes.length} bytes`);
}
// Only replace the committed assets after the entire catalog verifies.
for (const { id, bytes } of downloads) await writeFile(new URL(`${id}.webp`, directory), bytes);
await writeFile(new URL("manifest.json", directory), `${JSON.stringify({ verifiedAt: new Date().toISOString(), games: manifest }, null, 2)}\n`);
for (const game of games) {
  const artwork = manifest.find((entry) => entry.id === game.id);
  Object.assign(game, { image: artwork.image, universeId: artwork.universeId, imageWidth: artwork.width, imageHeight: artwork.height, imageKind: artwork.kind });
}
await writeFile(new URL("../games.js", import.meta.url), `/* Add releases at the end, oldest to newest. Run npm run build before publishing. */\nexport const games = ${JSON.stringify(games, null, 2)};\n`);
