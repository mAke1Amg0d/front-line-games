import { mkdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";

const root = process.cwd();
const out = join(root, "dist");
const client = join(out, "client");
const server = join(out, "server");
const files = [
  "index.html",
  "styles.css",
  "games.js",
  "script.js",
  "brand-icon.png",
];
const optionalFiles = ["og.png", "logo-wide.png"];
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

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
