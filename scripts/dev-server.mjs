import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, relative, isAbsolute } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const server = createServer(async (request, response) => {
  try {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end("Method not allowed");
      return;
    }
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    const path = url.pathname.replace(/^\/front-line-games(?=\/)/, "");
    const pathname = decodeURIComponent(path === "/" ? "/index.html" : path);
    const assetPath = normalize(pathname).replace(/^([/\\])+/, "");
    const file = join(root, assetPath);
    const withinRoot = relative(root, file);
    const publicAsset = /^(index\.html|styles\.css|script\.js|games\.js|catalog\.mjs|favicon\.svg|brand-icon\.png|logo-wide\.png|og(?:-studio)?\.png|founder-magzhan\.webp|assets[/\\]games[/\\][a-z-]+\.(webp|json))$/.test(assetPath);
    if (!publicAsset || withinRoot.startsWith("..") || isAbsolute(withinRoot)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) throw new Error("Not a file");
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Local: http://localhost:${server.address().port}/`);
});
