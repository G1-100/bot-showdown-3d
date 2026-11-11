import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const port = Number(process.env.PORT || 3000);
const publicDir = resolve("public");
const sessions = new Map();
const roster = [
  "PotOddsPete", "NitBot3000", "AllInAnnie", "GTO_Goblin", "CallingStation",
  "RiverRat", "BluffBuster", "TrojanTAG", "LooseCannon", "FoldEmFrank",
  "QuantQueen", "SlowRoller", "ChipChaser", "TiltProof", "ShoveCity",
  "MonteCarla", "RangeRover", "PocketRocket", "YOLO_9000", "SnapCaller"
];
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };

function json(res, code, body) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolveBody, reject) => {
    let raw = "";
    req.on("data", chunk => { raw += chunk; if (raw.length > 10_000) reject(new Error("Request too large")); });
    req.on("end", () => { try { resolveBody(raw ? JSON.parse(raw) : {}); } catch { reject(new Error("Invalid JSON")); } });
  });
}

function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const file = join(publicDir, normalize(requested).replace(/^[/\\]+/, ""));
  if (!file.startsWith(publicDir) || !existsSync(file) || !statSync(file).isFile()) return json(res, 404, { error: "Not found" });
  res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream", "x-content-type-options": "nosniff" });
  createReadStream(file).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/api/health") return json(res, 200, { ok: true, service: "bot-showdown-3d", version: "1.0.0" });
  if (req.method === "GET" && url.pathname === "/api/bots") return json(res, 200, { bots: roster.map((name, id) => ({ id, name })) });
  if (req.method === "POST" && url.pathname === "/api/tournaments") {
    try {
      const body = await readJson(req);
      const session = { id: randomUUID(), seed: Number.isInteger(body.seed) ? body.seed : Date.now(), status: "ready", createdAt: new Date().toISOString(), rounds: 30 };
      sessions.set(session.id, session);
      return json(res, 201, session);
    } catch (error) { return json(res, 400, { error: error.message }); }
  }
  const match = url.pathname.match(/^\/api\/tournaments\/([\w-]+)(\/events)?$/);
  if (match) {
    const session = sessions.get(match[1]);
    if (!session) return json(res, 404, { error: "Unknown tournament" });
    if (req.method === "GET" && !match[2]) return json(res, 200, session);
    if (req.method === "GET" && match[2]) {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
      res.write(`event: session\\ndata: ${JSON.stringify(session)}\\n\\n`);
      const heartbeat = setInterval(() => res.write(": heartbeat\\n\\n"), 25_000);
      req.on("close", () => clearInterval(heartbeat));
      return;
    }
  }
  if (req.method === "GET") return serveStatic(req, res, url.pathname);
  return json(res, 405, { error: "Method not allowed" });
});

server.listen(port, () => console.log(`Bot Showdown 3D listening at http://localhost:${port}`));
