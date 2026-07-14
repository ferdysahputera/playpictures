// Cloudflare Worker: proxy YouTube Data API v3.
// Menyembunyikan YOUTUBE_API_KEY (set sebagai secret: wrangler secret put YOUTUBE_API_KEY)
// Endpoint:
//   GET /playlist?pageToken=   -> playlistItems.list (part=snippet,contentDetails)
//   GET /videos?ids=a,b,c      -> videos.list (part=statistics)
//   GET /video?id=XXX          -> videos.list (part=snippet,contentDetails,statistics)

const YT = "https://www.googleapis.com/youtube/v3";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
}

function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/(embed|shorts|v)\/([^/?]+)/);
    if (m) return m[2];
  } catch (_) {}
  return null;
}

async function handlePlaylist(request, env) {
  const url = new URL(request.url);
  const pageToken = url.searchParams.get("pageToken") || "";
  const maxResults = url.searchParams.get("maxResults") || "24";
  const playlistId = url.searchParams.get("playlistId") || env.PLAYLIST_ID || "";

  const params = new URLSearchParams({
    part: "snippet,contentDetails",
    playlistId,
    maxResults,
    key: env.YOUTUBE_API_KEY,
  });
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(`${YT}/playlistItems?${params}`);
  const data = await res.json();
  if (data.error) return json({ error: data.error.message }, 502);

  const items = (data.items || []).map((it) => {
    const sn = it.snippet;
    const thumb =
      sn.thumbnails?.maxres?.url ||
      sn.thumbnails?.standard?.url ||
      sn.thumbnails?.high?.url ||
      sn.thumbnails?.medium?.url ||
      sn.thumbnails?.default?.url ||
      "";
    return {
      videoId: it.contentDetails?.videoId || sn.resourceId?.videoId || "",
      title: sn.title,
      publishedAt: sn.publishedAt,
      thumb,
    };
  });

  return json({
    items,
    nextPageToken: data.nextPageToken || null,
    pageInfo: data.pageInfo || null,
  });
}

async function handleVideos(request, env) {
  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") || "").split(",").filter(Boolean);
  if (!ids.length) return json({ stats: {} });

  const params = new URLSearchParams({
    part: "statistics",
    id: ids.join(","),
    key: env.YOUTUBE_API_KEY,
  });
  const res = await fetch(`${YT}/videos?${params}`);
  const data = await res.json();
  if (data.error) return json({ error: data.error.message }, 502);

  const stats = {};
  for (const it of data.items || []) {
    stats[it.id] = Number(it.statistics?.viewCount || 0);
  }
  return json({ stats });
}

async function handleVideo(request, env) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!id) return json({ error: "missing id" }, 400);

  const params = new URLSearchParams({
    part: "snippet,contentDetails,statistics",
    id,
    key: env.YOUTUBE_API_KEY,
  });
  const res = await fetch(`${YT}/videos?${params}`);
  const data = await res.json();
  if (data.error) return json({ error: data.error.message }, 502);
  const it = (data.items || [])[0];
  if (!it) return json({ error: "not found" }, 404);

  const sn = it.snippet;
  const thumb =
    sn.thumbnails?.maxres?.url ||
    sn.thumbnails?.standard?.url ||
    sn.thumbnails?.high?.url ||
    sn.thumbnails?.medium?.url ||
    sn.thumbnails?.default?.url ||
    "";

  return json({
    videoId: it.id,
    title: sn.title,
    description: sn.description || "",
    publishedAt: sn.publishedAt,
    channelTitle: sn.channelTitle,
    thumb,
    duration: it.contentDetails?.duration || "",
    viewCount: Number(it.statistics?.viewCount || 0),
  });
}

async function handleChannel(request, env) {
  const url = new URL(request.url);
  const id = url.searchParams.get("channelId") || "";
  if (!id) return json({ error: "missing channelId" }, 400);

  const params = new URLSearchParams({
    part: "snippet,contentDetails",
    id,
    key: env.YOUTUBE_API_KEY,
  });
  const res = await fetch(`${YT}/channels?${params}`);
  const data = await res.json();
  if (data.error) return json({ error: data.error.message }, 502);
  const ch = (data.items || [])[0];
  if (!ch) return json({ error: "channel tidak ditemukan" }, 404);

  const th = ch.snippet?.thumbnails || {};
  const avatar = th.medium?.url || th.high?.url || th.default?.url || "";
  return json({
    channelId: ch.id,
    title: ch.snippet?.title || "",
    avatar,
    playlistId: ch.contentDetails?.relatedPlaylists?.uploads || "",
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    try {
      if (p === "/playlist") return await handlePlaylist(request, env);
      if (p === "/videos") return await handleVideos(request, env);
      if (p === "/video") return await handleVideo(request, env);
      if (p === "/channel") return await handleChannel(request, env);
      if (p === "/" || p === "/health")
        return json({ ok: true, service: "yt-playlist-proxy" });
      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: String(e && e.message ? e.message : e) }, 500);
    }
  },
};

// dijadikan global untuk kompatibilitas wrangler lama (module worker menggunakan export default)
