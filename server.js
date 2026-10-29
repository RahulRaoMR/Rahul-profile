const http = require("node:http");
const { readFile } = require("node:fs");
const path = require("node:path");

const routes = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/script.js": ["script.js", "text/javascript; charset=utf-8"],
};

const assetTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

const port = Number(process.env.PORT) || 3000;

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  let route = routes[pathname];

  if (!route && /^\/assets\/[A-Za-z0-9._-]+$/.test(pathname)) {
    const mimeType = assetTypes[path.extname(pathname).toLowerCase()];
    if (mimeType) {
      route = [pathname.slice(1), mimeType];
    }
  }

  if (!route) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  readFile(path.join(__dirname, route[0]), (error, content) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500);
      response.end(error.code === "ENOENT" ? "Not found" : "Unable to load file");
      return;
    }

    response.writeHead(200, { "Content-Type": route[1], "Cache-Control": "no-store" });
    response.end(content);
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the running server before starting another copy.`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});

server.on("listening", () => {
  console.log(`Open http://localhost:${port}`);
});

server.listen(port, "127.0.0.1");
