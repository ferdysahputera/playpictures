// Server lokal: proxy YouTube Data API v3 + serve file statis.
// Jalankan:  node server.js   lalu buka http://localhost:3000
// API key dibaca dari file .env (YOUTUBE_API_KEY=...). Jangan commit file .env.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = 3000;
const YT = "https://www.googleapis.com/youtube/v3";

// ---- baca .env sederhana ----
try {
  const raw = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
  raw.split("\n").forEach((line) => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
} catch (_) {}

const API_KEY = process.env.YOUTUBE_API_KEY || "";
if (!API_KEY) {
  console.warn("⚠  YOUTUBE_API_KEY belum diset. Isi di file .env");
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

function sendJSON(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  res.end(body);
}

async function proxyYT(res, endpoint, params) {
  if (!API_KEY) return sendJSON(res, { error: "API key belum diset di .env" }, 500);
  const q = new URLSearchParams({ key: API_KEY, ...params });
  try {
    const r = await fetch(`${YT}/${endpoint}?${q}`);
    const data = await r.json();
    if (data.error) return sendJSON(res, { error: data.error.message }, 502);
    res.writeHead(200, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" });
    res.end(JSON.stringify(transform(endpoint, data)));
  } catch (e) {
    sendJSON(res, { error: String(e.message || e) }, 500);
  }
}

// bentuk respons agar cocok dengan frontend (sama seperti worker)
function transform(endpoint, data) {
  if (endpoint === "playlistItems") {
    const items = (data.items || []).map((it) => {
      const sn = it.snippet;
      const th = sn.thumbnails || {};
      const thumb = th.maxres?.url || th.standard?.url || th.high?.url || th.medium?.url || th.default?.url || "";
      return {
        videoId: it.contentDetails?.videoId || sn.resourceId?.videoId || "",
        title: sn.title,
        publishedAt: sn.publishedAt,
        thumb,
      };
    });
    return { items, nextPageToken: data.nextPageToken || null, pageInfo: data.pageInfo || null };
  }
  if (endpoint === "videos") {
    const stats = {};
    for (const it of data.items || []) stats[it.id] = Number(it.statistics?.viewCount || 0);
    return { stats };
  }
  if (endpoint === "channels") {
    const ch = (data.items || [])[0];
    if (!ch) return { error: "channel tidak ditemukan" };
    const th = ch.snippet?.thumbnails || {};
    const avatar = th.medium?.url || th.high?.url || th.default?.url || "";
    return {
      channelId: ch.id,
      title: ch.snippet?.title || "",
      avatar,
      playlistId: ch.contentDetails?.relatedPlaylists?.uploads || "",
    };
  }
  return data;
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(__dirname, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ""));
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); return res.end("Forbidden");
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const p = u.pathname;

  if (p === "/playlist") {
    return proxyYT(res, "playlistItems", {
      part: "snippet,contentDetails",
      playlistId: u.searchParams.get("playlistId") || "",
      maxResults: u.searchParams.get("maxResults") || "24",
      ...(u.searchParams.get("pageToken") ? { pageToken: u.searchParams.get("pageToken") } : {}),
    });
  }
  if (p === "/videos") {
    return proxyYT(res, "videos", {
      part: "statistics",
      id: u.searchParams.get("ids") || "",
    });
  }
  if (p === "/video") {
    return proxyYT(res, "videos", {
      part: "snippet,contentDetails,statistics",
      id: u.searchParams.get("id") || "",
    });
  }
  if (p === "/channel") {
    return proxyYT(res, "channels", {
      part: "snippet,contentDetails",
      id: u.searchParams.get("channelId") || "",
    });
  }
  if (p === "/" || p === "/health") {
    return sendJSON(res, { ok: true, service: "yt-playlist-proxy" });
  }
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`✓ Jalankan di browser:  http://localhost:${PORT}`);
  if (!API_KEY) console.log("✗ Isi YOUTUBE_API_KEY di file .env dulu");
});
