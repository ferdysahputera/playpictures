// Wrapper fetch ke Cloudflare Worker proxy + cache localStorage.
(function () {
  const CFG = window.APP_CONFIG;
  const BASE = (CFG.WORKER_URL || "").replace(/\/$/, "");
  const DIRECT = !BASE; // mode langsung ke YouTube (tanpa proxy)
  const YT = "https://www.googleapis.com/youtube/v3";
  const YT_EP = {
    "/playlist": "playlistItems",
    "/videos": "videos",
    "/video": "videos",
    "/channel": "channels",
  };
  const YT_PART = {
    "/playlist": "snippet,contentDetails",
    "/videos": "statistics",
    "/video": "snippet,contentDetails,statistics",
    "/channel": "snippet,contentDetails",
  };

  // transform respons YouTube mentah -> bentuk yang dipakai frontend (sama seperti proxy)
  function clientTransform(path, data) {
    if (path === "/playlist") {
      const items = (data.items || []).map((it) => {
        const sn = it.snippet;
        const th = sn.thumbnails || {};
        const thumb =
          th.maxres?.url || th.standard?.url || th.high?.url || th.medium?.url || th.default?.url || "";
        return {
          videoId: it.contentDetails?.videoId || sn.resourceId?.videoId || "",
          title: sn.title,
          publishedAt: sn.publishedAt,
          thumb,
        };
      });
      return { items, nextPageToken: data.nextPageToken || null, pageInfo: data.pageInfo || null };
    }
    if (path === "/videos") {
      const stats = {};
      for (const it of data.items || []) stats[it.id] = Number(it.statistics?.viewCount || 0);
      return { stats };
    }
    if (path === "/video") {
      const it = (data.items || [])[0];
      if (!it) return { error: "not found" };
      const sn = it.snippet;
      const th = sn.thumbnails || {};
      const thumb =
        th.maxres?.url || th.standard?.url || th.high?.url || th.medium?.url || th.default?.url || "";
      return {
        videoId: it.id,
        title: sn.title,
        description: sn.description || "",
        publishedAt: sn.publishedAt,
        channelTitle: sn.channelTitle,
        thumb,
        duration: it.contentDetails?.duration || "",
        viewCount: Number(it.statistics?.viewCount || 0),
      };
    }
    if (path === "/channel") {
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

  function cacheKey(name, param) {
    return `ytcache:${name}:${param || ""}`;
  }

  function readCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() - obj.t > CFG.CACHE_TTL_MS) return null;
      return obj.v;
    } catch (_) {
      return null;
    }
  }

  function writeCache(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
    } catch (_) {}
  }

  async function getJSON(path, params, cacheName) {
    let url;
    if (DIRECT) {
      const full = new URLSearchParams({
        key: CFG.YOUTUBE_API_KEY,
        part: YT_PART[path],
        ...params,
      });
      url = `${YT}/${YT_EP[path]}?${full}`;
    } else {
      const qs = new URLSearchParams(params).toString();
      url = `${BASE}${path}?${qs}`;
    }
    const cacheParam = DIRECT ? url : new URLSearchParams(params).toString();
    const key = cacheName ? cacheKey(cacheName, cacheParam) : null;
    if (key) {
      const cached = readCache(key);
      if (cached) return cached;
    }
    const res = await fetch(url);
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const e = await res.json();
        if (e && e.error) msg = e.error.message || e.error;
      } catch (_) {}
      throw new Error(msg);
    }
    let data = await res.json();
    if (data && data.error) throw new Error(data.error.message || data.error);
    if (DIRECT) data = clientTransform(path, data);
    if (key) writeCache(key, data);
    return data;
  }

  let ACTIVE_PLAYLIST = null; // dipakai setelah resolvePlaylist()
  let CHANNEL = null; // info channel (jika pakai CHANNEL_ID)

  const API = {
    // Tentukan playlist aktif: dari PLAYLIST_ID, atau resolve uploads dari CHANNEL_ID
    async resolvePlaylist() {
      if (CFG.PLAYLIST_ID && !CFG.PLAYLIST_ID.startsWith("PLxxxx")) {
        ACTIVE_PLAYLIST = CFG.PLAYLIST_ID;
        return ACTIVE_PLAYLIST;
      }
      if (CFG.CHANNEL_ID && !CFG.CHANNEL_ID.startsWith("UCxxxx")) {
        const data = await API.getChannel(CFG.CHANNEL_ID);
        CHANNEL = data;
        ACTIVE_PLAYLIST = data.playlistId;
        return ACTIVE_PLAYLIST;
      }
      throw new Error("Setel PLAYLIST_ID atau CHANNEL_ID di js/config.js");
    },

    getChannel(id) {
      return getJSON("/channel", { channelId: id }, "channel:" + id);
    },

    getActivePlaylist() {
      return ACTIVE_PLAYLIST;
    },

    getChannelInfo() {
      return CHANNEL;
    },

    getPlaylist(pageToken) {
      return getJSON(
        "/playlist",
        {
          playlistId: ACTIVE_PLAYLIST,
          maxResults: CFG.PAGE_SIZE,
          ...(pageToken ? { pageToken } : {}),
        },
        "playlist:" + ACTIVE_PLAYLIST
      );
    },

    getStats(ids) {
      if (!ids || !ids.length) return Promise.resolve({ stats: {} });
      return getJSON("/videos", { ids: ids.join(",") }, "stats:" + ids.join(","));
    },

    getVideo(id) {
      return getJSON("/video", { id }, "video:" + id);
    },

    // Ambil seluruh items playlist (dengan batas aman) untuk keperluan sort Popular/Terbaru
    async getAllPlaylistItems(limit = 200) {
      const key = cacheKey("allitems", ACTIVE_PLAYLIST);
      const cached = readCache(key);
      if (cached) return cached;
      let items = [];
      let token = null;
      let guard = 0;
      do {
        const data = await API.getPlaylist(token);
        items = items.concat(data.items || []);
        token = data.nextPageToken;
        guard++;
      } while (token && items.length < limit && guard < 10);
      writeCache(key, items);
      return items;
    },
  };

  // Helper format
  window.Util = {
    formatViews(n) {
      if (n == null) return "";
      if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + " M";
      if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + " jt";
      if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + " rb";
      return String(n);
    },
    formatDate(iso) {
      try {
        const d = new Date(iso);
        return d.toLocaleDateString("id-ID", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch (_) {
        return "";
      }
    },
    // parse URL YouTube pertama dari teks (untuk "Video Selanjutnya")
    firstYouTubeId(text) {
      if (!text) return null;
      const re =
        /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|playlist\?list=)|youtu\.be\/)([A-Za-z0-9_-]{11})/g;
      const m = re.exec(text);
      return m ? m[1] : null;
    },
  };

  window.API = API;
})();
