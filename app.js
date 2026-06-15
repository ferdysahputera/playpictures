/* ============================================================
   PLAY PICTURES – app.js  (Halaman Home)
   ============================================================ */

"use strict";

// ── YouTube API Base ──────────────────────────────────────
const YT_API = "https://www.googleapis.com/youtube/v3";

// ── State ────────────────────────────────────────────────
let nextPageToken = null;
let currentTab   = "playlist";   // Default: tampilkan playlist
let isSearchMode = false;

// ── Utilitas ─────────────────────────────────────────────
function fmt(n) {
  n = parseInt(n) || 0;
  if (n >= 1e6) return (n/1e6).toFixed(1).replace(".0","") + " Jt";
  if (n >= 1e3) return (n/1e3).toFixed(1).replace(".0","") + " Rb";
  return n.toLocaleString("id");
}
function ago(iso) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return "Baru saja";
  if (s < 3600) return `${Math.floor(s/60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s/3600)} jam lalu`;
  if (s < 2592000) return `${Math.floor(s/86400)} hari lalu`;
  if (s < 31536000) return `${Math.floor(s/2592000)} bln lalu`;
  return `${Math.floor(s/31536000)} thn lalu`;
}
function thumb(t, keys=["maxres","standard","high","medium","default"]) {
  for (const k of keys) if (t?.[k]?.url) return t[k].url;
  return "";
}
function duration(d) {
  if (!d) return "";
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h=+m[1]||0, min=+m[2]||0, s=+m[3]||0;
  return h ? `${h}:${String(min).padStart(2,"0")}:${String(s).padStart(2,"0")}`
           : `${min}:${String(s).padStart(2,"0")}`;
}
function toast(msg, type="") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast show" + (type ? " "+type : "");
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.className = "toast"; }, 3000);
}

// ── Fetch YouTube API ─────────────────────────────────────
async function yt(endpoint, params={}) {
  const url = new URL(`${YT_API}/${endpoint}`);
  Object.entries({ key: CONFIG.API_KEY, ...params })
    .forEach(([k,v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "API error");
  return data;
}

// ═══════════════════════════════════════════════
// LOAD VIDEO
// ═══════════════════════════════════════════════
async function loadVideos(tab, pageToken=null, append=false) {
  const grid = document.getElementById("videoGrid");
  const loadMoreWrap = document.getElementById("loadMoreWrap");
  const msgBox = document.getElementById("msgBox");
  if (!grid) return;

  isSearchMode = false;

  if (!append) {
    grid.innerHTML = Array(6).fill('<div class="card skeleton"></div>').join("");
    if (msgBox) msgBox.style.display = "none";
  }

  try {
    let videoItems = [];

    if (tab === "playlist") {
      // Load dari Playlist (DEFAULT)
      const params = { part: "snippet", playlistId: CONFIG.PLAYLIST_ID, maxResults: CONFIG.MAX_RESULTS };
      if (pageToken) params.pageToken = pageToken;
      const pl = await yt("playlistItems", params);
      nextPageToken = pl.nextPageToken || null;
      const ids = pl.items.map(i => i.snippet.resourceId.videoId).join(",");
      if (!ids) { videoItems = []; }
      else {
        const det = await yt("videos", { part: "snippet,statistics,contentDetails", id: ids });
        videoItems = det.items;
      }
    } else {
      // Load dari Channel (latest / popular)
      const order = tab === "popular" ? "viewCount" : "date";
      const params = { part: "snippet", channelId: CONFIG.CHANNEL_ID, type: "video",
                       maxResults: CONFIG.MAX_RESULTS, order };
      if (pageToken) params.pageToken = pageToken;
      const srch = await yt("search", params);
      nextPageToken = srch.nextPageToken || null;
      const ids = srch.items.map(i => i.id.videoId).join(",");
      const det = await yt("videos", { part: "snippet,statistics,contentDetails", id: ids });
      videoItems = det.items;
    }

    if (!append) grid.innerHTML = "";

    if (!videoItems.length) {
      grid.innerHTML = "";
      if (msgBox) {
        msgBox.style.display = "";
        msgBox.innerHTML = "Tidak ada video ditemukan.";
      }
      return;
    }

    videoItems.forEach(v => grid.appendChild(buildCard(v)));
    if (loadMoreWrap) loadMoreWrap.style.display = nextPageToken ? "" : "none";

  } catch(e) {
    console.error(e);
    grid.innerHTML = "";
    if (msgBox) {
      msgBox.style.display = "";
      msgBox.innerHTML = `<p>❌ Gagal memuat video.<br><strong>Pesan:</strong> ${e.message}</p>
        <p style="margin-top:10px;font-size:0.8rem;">Pastikan <strong>API_KEY</strong> dan <strong>CHANNEL_ID</strong> sudah benar di <code>config.js</code></p>`;
    }
  }
}

// ── Build Kartu Video ─────────────────────────────────────
function buildCard(v) {
  const img   = thumb(v.snippet.thumbnails);
  const dur   = duration(v.contentDetails?.duration);
  const views = fmt(v.statistics?.viewCount);
  const card  = document.createElement("div");
  card.className = "card";
  card.dataset.id = v.id;
  card.innerHTML = `
    <div class="card-thumb">
      <img src="${img}" alt="${v.snippet.title}" loading="lazy" />
      <div class="card-play"><div class="card-play-icon">▶</div></div>
      ${dur ? `<span class="card-duration">${dur}</span>` : ""}
    </div>
    <div class="card-info">
      <div class="card-title">${v.snippet.title}</div>
      <div class="card-meta">
        ${views ? `<span>👁 ${views}</span>` : ""}
        <span>🕐 ${ago(v.snippet.publishedAt)}</span>
      </div>
    </div>`;
  card.addEventListener("click", () => {
    window.location.href = `video.html?v=${v.id}`;
  });
  return card;
}

// ═══════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════
let searchTimer;
async function doSearch(q) {
  const grid = document.getElementById("videoGrid");
  const msgBox = document.getElementById("msgBox");
  const loadMoreWrap = document.getElementById("loadMoreWrap");

  if (!q.trim()) {
    // Kembali ke playlist default
    isSearchMode = false;
    nextPageToken = null;
    loadVideos(currentTab);
    return;
  }

  isSearchMode = true;
  nextPageToken = null;
  grid.innerHTML = Array(6).fill('<div class="card skeleton"></div>').join("");
  if (loadMoreWrap) loadMoreWrap.style.display = "none";
  if (msgBox) msgBox.style.display = "none";

  try {
    const srch = await yt("search", {
      part: "snippet", channelId: CONFIG.CHANNEL_ID,
      q, type: "video", maxResults: 12,
    });
    const ids = srch.items.map(i => i.id.videoId).join(",");
    grid.innerHTML = "";

    if (!ids) {
      if (msgBox) { msgBox.style.display=""; msgBox.textContent = `Tidak ada hasil untuk "${q}"`; }
      return;
    }

    const det = await yt("videos", { part: "snippet,statistics,contentDetails", id: ids });
    if (!det.items.length) {
      if (msgBox) { msgBox.style.display=""; msgBox.textContent = `Tidak ada hasil untuk "${q}"`; }
      return;
    }
    det.items.forEach(v => grid.appendChild(buildCard(v)));
  } catch(e) {
    grid.innerHTML = "";
    if (msgBox) { msgBox.style.display=""; msgBox.textContent = "Pencarian gagal: " + e.message; }
  }
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("yr").textContent = new Date().getFullYear();

  // Update footer YouTube link
  const ytLink = document.getElementById("ytChannelLink");
  if (ytLink) ytLink.href = `https://www.youtube.com/channel/${CONFIG.CHANNEL_ID}`;

  // Navbar scroll
  window.addEventListener("scroll", () => {
    document.querySelector(".navbar")?.classList.toggle("scrolled", scrollY > 20);
  }, { passive: true });

  // Cek config
  if (!CONFIG.API_KEY || CONFIG.API_KEY.includes("YOUR_") || !CONFIG.CHANNEL_ID || CONFIG.CHANNEL_ID.includes("xxx")) {
    const msg = document.getElementById("msgBox");
    if (msg) {
      msg.style.display = "";
      msg.innerHTML = `⚠️ Harap isi <strong>API_KEY</strong> dan <strong>CHANNEL_ID</strong> di file <code>config.js</code> terlebih dahulu.`;
    }
    document.getElementById("videoGrid").innerHTML = "";
    return;
  }

  // Aktifkan tab Playlist sebagai default
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  const playlistTab = document.querySelector('.tab-btn[data-tab="playlist"]');
  if (playlistTab) playlistTab.classList.add("active");
  currentTab = "playlist";

  // Load data awal (playlist)
  loadVideos("playlist");

  // Tab
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentTab = btn.dataset.tab;
      nextPageToken = null;
      isSearchMode = false;
      // Bersihkan search jika ada
      const inp = document.getElementById("searchInput");
      const clr = document.getElementById("searchClearBtn");
      if (inp) inp.value = "";
      if (clr) clr.classList.remove("show");
      loadVideos(currentTab);
    });
  });

  // Load more
  document.getElementById("loadMoreBtn")?.addEventListener("click", () => {
    if (nextPageToken && !isSearchMode) loadVideos(currentTab, nextPageToken, true);
  });

  // Search
  const inp = document.getElementById("searchInput");
  const clr = document.getElementById("searchClearBtn");
  inp?.addEventListener("input", e => {
    clr?.classList.toggle("show", e.target.value.length > 0);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => doSearch(e.target.value), 500);
  });
  inp?.addEventListener("keydown", e => { if (e.key==="Enter") { clearTimeout(searchTimer); doSearch(inp.value); }});
  clr?.addEventListener("click", () => {
    inp.value = "";
    clr.classList.remove("show");
    isSearchMode = false;
    nextPageToken = null;
    loadVideos(currentTab);
  });
});
