import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const DIST_DIR = resolve("dist");
const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? "4173");

function normalizePublicBasePath(value) {
  if (!value || value === "/") {
    return "/";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;

  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function getContentType(filePath) {
  switch (extname(filePath)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".wasm":
      return "application/wasm";
    default:
      return "application/octet-stream";
  }
}

async function resolveFilePath(pathname, publicBasePath) {
  if (publicBasePath !== "/") {
    if (pathname === "/") {
      return { redirect: publicBasePath };
    }

    if (pathname === publicBasePath.slice(0, -1)) {
      return { redirect: publicBasePath };
    }

    if (!pathname.startsWith(publicBasePath)) {
      return null;
    }
  }

  const relativePath =
    publicBasePath === "/"
      ? pathname.replace(/^\/+/, "")
      : pathname.slice(publicBasePath.length).replace(/^\/+/, "");
  const requestedPath = relativePath === "" ? "index.html" : relativePath;
  const normalizedRequestedPath = normalize(requestedPath).replace(/^\.(?:[\\/]|$)/, "");
  const filePath = join(DIST_DIR, normalizedRequestedPath);

  if (!filePath.startsWith(DIST_DIR)) {
    return null;
  }

  try {
    const fileStats = await stat(filePath);

    if (fileStats.isDirectory()) {
      return join(filePath, "index.html");
    }

    return filePath;
  } catch {
    if (!requestedPath.includes(".")) {
      return join(DIST_DIR, "index.html");
    }

    return null;
  }
}

await access(DIST_DIR);

const publicBasePath = normalizePublicBasePath(process.env.GT_PUBLIC_BASE);
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${HOST}:${PORT}`}`);
  const resolvedFilePath = await resolveFilePath(url.pathname, publicBasePath);

  if (resolvedFilePath === null) {
    response.writeHead(404);
    response.end("Not Found");
    return;
  }

  if (typeof resolvedFilePath === "object" && "redirect" in resolvedFilePath) {
    response.writeHead(302, { Location: resolvedFilePath.redirect });
    response.end();
    return;
  }

  response.writeHead(200, {
    "Content-Type": getContentType(resolvedFilePath)
  });
  createReadStream(resolvedFilePath).pipe(response);
});

server.listen(PORT, HOST, () => {
  console.log(`preview-dist listening on http://${HOST}:${PORT}${publicBasePath}`);
});
