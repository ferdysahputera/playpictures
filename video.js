/* ============================================================
   PLAY PICTURES – video.js  (Halaman Video Player)
   ============================================================ */

"use strict";

const YT_API = "https://www.googleapis.com/youtube/v3";

// ── State ─────────────────────────────────────────────────
let ytPlayer     = null;
let videoId      = null;
let descExpanded = false;

// ── Utilitas ──────────────────────────────────────────────
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
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { year:"numeric", month:"long", day:"numeric" });
}
function thumb(t, keys=["maxres","standard","high","medium","default"]) {
  for (const k of keys) if (t?.[k]?.url) return t[k].url;
  return "";
}
function parseDur(d) {
  if (!d) return "";
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h=+m[1]||0, min=+m[2]||0, s=+m[3]||0;
  return h ? `${h}:${String(min).padStart(2,"0")}:${String(s).padStart(2,"0")}`
           : `${min}:${String(s).padStart(2,"0")}`;
}
function esc(s) {
  const d = document.createElement("div"); d.textContent = s; return d.innerHTML;
}
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function toast(msg, type="") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast show" + (type ? " "+type : "");
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.className = "toast"; }, 3500);
}

// ── Fetch API ─────────────────────────────────────────────
async function yt(ep, params={}) {
  const url = new URL(`${YT_API}/${ep}`);
  Object.entries({ key: CONFIG.API_KEY, ...params })
    .forEach(([k,v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "API error");
  return data;
}

// ═══════════════════════════════════════════════
// YOUTUBE IFRAME PLAYER API
// ═══════════════════════════════════════════════
window.onYouTubeIframeAPIReady = function() {
  if (!videoId) return;
  createPlayer(videoId);
};

function createPlayer(vid) {
  const placeholder = document.getElementById("playerPlaceholder");
  ytPlayer = new YT.Player("ytPlayerTarget", {
    videoId: vid,
    playerVars: {
      autoplay:        1,
      rel:             0,
      modestbranding:  1,
      iv_load_policy:  3,
      playsinline:     1,
    },
    events: {
      onReady: () => {
        if (placeholder) placeholder.style.display = "none";
      },
      onError: (e) => {
        if (placeholder) {
          placeholder.innerHTML = `<p style="color:#f87171">❌ Video tidak dapat diputar (error ${e.data})</p>`;
        }
      },
    },
  });
}

// ═══════════════════════════════════════════════
// LOAD VIDEO DETAIL
// ═══════════════════════════════════════════════
async function loadVideoDetail(vid) {
  try {
    const data = await yt("videos", {
      part: "snippet,statistics,contentDetails",
      id: vid,
    });
    const v = data.items?.[0];
    if (!v) { toast("Video tidak ditemukan", "error"); return; }

    const ytUrl = `https://www.youtube.com/watch?v=${vid}`;

    document.title = `${v.snippet.title} – Play Pictures`;
    document.getElementById("vTitle").textContent = v.snippet.title;

    const dur = parseDur(v.contentDetails?.duration);
    document.getElementById("vViews").textContent = `👁 ${fmt(v.statistics?.viewCount)} tayangan`;
    document.getElementById("vDate").textContent  = `📅 ${fmtDate(v.snippet.publishedAt)}`;
    document.getElementById("vDuration").textContent = dur ? `⏱ ${dur}` : "";

    const btnYt = document.getElementById("btnYoutube");
    if (btnYt) btnYt.href = ytUrl;
    const dlYt = document.getElementById("dlYt");
    if (dlYt) dlYt.href = ytUrl;

    // Deskripsi
    const rawDesc = v.snippet.description || "";
    renderDescription(rawDesc);

    return v;
  } catch(e) {
    toast("Gagal memuat video: " + e.message, "error");
    console.error(e);
  }
}

// ═══════════════════════════════════════════════
// RENDER DESKRIPSI & DETEKSI PART VIDEO
// ═══════════════════════════════════════════════
function renderDescription(text) {
  const descEl = document.getElementById("descText");
  const descCard = document.querySelector(".desc-card");
  if (!descEl) return;

  if (!text || !text.trim()) {
    if (descCard) descCard.style.display = "none";
    return;
  }
  if (descCard) descCard.style.display = "";

  // ── Regex YouTube link ────────────────────────────────
  const ytRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})[^\s\n\r]*)/gi;
  const matches = [...text.matchAll(ytRegex)];

  // Kumpulkan link unik
  const uniqueMatches = [];
  matches.forEach(m => {
    if (!uniqueMatches.some(x => x.url === m[1])) {
      uniqueMatches.push({ url: m[1], id: m[2] });
    }
  });
  uniqueMatches.sort((a, b) => b.url.length - a.url.length);

  // ── Langkah 1: Ganti URL dengan token SEBELUM di-escape ──
  // Ini penting! Kalau di-escape dulu, "&" di URL jadi "&amp;" dan replace gagal.
  let tokenizedText = text;
  const tokenMap = {};
  uniqueMatches.forEach((item, idx) => {
    const token = `__YTTOKEN_${idx}__`;
    tokenMap[token] = `<a href="video.html?v=${item.id}" class="part-link"><i class="fa-solid fa-play"></i> TONTON DI SINI</a>`;
    // Ganti semua kemunculan URL ini dengan token
    tokenizedText = tokenizedText.split(item.url).join(token);
  });

  // ── Langkah 2: Escape HTML dari teks yang sudah di-tokenisasi ──
  let htmlContent = esc(tokenizedText);

  // ── Langkah 3: Kembalikan token menjadi HTML link ──
  Object.entries(tokenMap).forEach(([token, html]) => {
    htmlContent = htmlContent.split(token).join(html);
  });

  // ── Highlight "Part X" ────────────────────────────────
  htmlContent = htmlContent.replace(/\b(part\s*\d+)\b/gi, '<span class="part-badge">$1</span>');

  // ── Ganti newline ke <br> ─────────────────────────────
  htmlContent = htmlContent.replace(/\n/g, "<br>");

  descEl.innerHTML = htmlContent;

  // ── Navigasi Sebelumnya / Selanjutnya dari deskripsi ──
  const lines = text.split("\n");
  let prevId = null, nextId = null;
  let prevTitle = "Video Sebelumnya", nextTitle = "Video Selanjutnya";

  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    const matchYt = line.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (matchYt) {
      const foundId = matchYt[1];
      const prefixText = line.split(matchYt[0])[0].trim().replace(/[:\-–—]/g, "").trim();
      if (lowerLine.includes("sebelum") || lowerLine.includes("prev") || lowerLine.includes("lalu")) {
        prevId = foundId;
        if (prefixText.length > 3) prevTitle = prefixText;
      } else if (lowerLine.includes("lanjut") || lowerLine.includes("next") || lowerLine.includes("selanjut") || lowerLine.includes("berikut")) {
        nextId = foundId;
        if (prefixText.length > 3) nextTitle = prefixText;
      }
    }
  });

  // Deteksi dari posisi video saat ini di daftar link
  let prevPartNum = null, nextPartNum = null;
  if (uniqueMatches.length > 0) {
    const currentIndex = uniqueMatches.findIndex(x => x.id === videoId);
    if (currentIndex !== -1) {
      if (currentIndex > 0) {
        prevId = uniqueMatches[currentIndex - 1].id;
        prevPartNum = currentIndex;
      }
      if (currentIndex < uniqueMatches.length - 1) {
        nextId = uniqueMatches[currentIndex + 1].id;
        nextPartNum = currentIndex + 2;
      }
    } else {
      nextId = uniqueMatches[0].id;
      nextPartNum = 1;
    }
  }

  if (prevId && !prevPartNum) {
    const idx = uniqueMatches.findIndex(x => x.id === prevId);
    if (idx !== -1) prevPartNum = idx + 1;
  }
  if (nextId && !nextPartNum) {
    const idx = uniqueMatches.findIndex(x => x.id === nextId);
    if (idx !== -1) nextPartNum = idx + 1;
  }

  const navContainer = document.getElementById("navVideos");
  const prevBtn = document.getElementById("prevVideoLink");
  const nextBtn = document.getElementById("nextVideoLink");
  let hasNav = false;

  if (prevBtn) {
    if (prevId) {
      prevBtn.href = `video.html?v=${prevId}`;
      const labelText = prevPartNum ? `SEBELUMNYA (PART ${prevPartNum})` : "SEBELUMNYA";
      prevBtn.querySelector(".nav-label").textContent = labelText;
      prevBtn.style.display = "flex";
      hasNav = true;
      fetchVideoMeta(prevId, "prevVideoTitle", "prevVideoThumb");
    } else {
      prevBtn.style.display = "none";
    }
  }

  if (nextBtn) {
    if (nextId) {
      nextBtn.href = `video.html?v=${nextId}`;
      const labelText = nextPartNum ? `SELANJUTNYA (PART ${nextPartNum})` : "SELANJUTNYA";
      nextBtn.querySelector(".nav-label").textContent = labelText;
      nextBtn.style.display = "flex";
      hasNav = true;
      fetchVideoMeta(nextId, "nextVideoTitle", "nextVideoThumb");
    } else {
      nextBtn.style.display = "none";
    }
  }

  if (navContainer) navContainer.style.display = hasNav ? "grid" : "none";
}

// ── Fetch thumbnail & judul video navigasi ────────────────
async function fetchVideoMeta(id, titleId, thumbId) {
  try {
    const data = await yt("videos", { part: "snippet", id });
    if (data.items?.[0]) {
      const v = data.items[0];
      const titleEl = document.getElementById(titleId);
      if (titleEl) { titleEl.textContent = v.snippet.title; titleEl.title = v.snippet.title; }
      const thumbEl = document.getElementById(thumbId);
      if (thumbEl) {
        const url = thumb(v.snippet.thumbnails, ["medium", "default"]);
        if (url) { thumbEl.src = url; thumbEl.style.display = "block"; }
      }
    }
  } catch(e) { console.warn("Fetch video meta:", e); }
}

// ═══════════════════════════════════════════════
// VIDEO LAINNYA (SIDEBAR)
// ═══════════════════════════════════════════════
async function loadRelated(currentVid) {
  const list = document.getElementById("relatedList");
  if (!list) return;

  try {
    // Ambil dari playlist dulu, fallback ke search channel
    let videoItems = [];

    if (CONFIG.PLAYLIST_ID && !CONFIG.PLAYLIST_ID.includes("YOUR_") && !CONFIG.PLAYLIST_ID.includes("xxx")) {
      const pl = await yt("playlistItems", {
        part: "snippet", playlistId: CONFIG.PLAYLIST_ID, maxResults: 20,
      });
      const ids = pl.items
        .map(i => i.snippet.resourceId.videoId)
        .filter(id => id !== currentVid)
        .slice(0, 15)
        .join(",");
      if (ids) {
        const det = await yt("videos", { part: "snippet,statistics,contentDetails", id: ids });
        videoItems = det.items;
      }
    }

    // Fallback: search channel
    if (!videoItems.length) {
      const srch = await yt("search", {
        part: "snippet", channelId: CONFIG.CHANNEL_ID,
        type: "video", maxResults: 20, order: "date",
      });
      const ids = srch.items.map(i => i.id.videoId)
        .filter(id => id !== currentVid).slice(0, 15).join(",");
      if (ids) {
        const det = await yt("videos", { part: "snippet,statistics,contentDetails", id: ids });
        videoItems = det.items;
      }
    }

    list.innerHTML = "";
    if (!videoItems.length) {
      list.innerHTML = `<p style="color:#5a5878;font-size:0.85rem">Tidak ada video lainnya.</p>`;
      return;
    }

    videoItems.forEach(v => {
      const img = thumb(v.snippet.thumbnails);
      const dur = parseDur(v.contentDetails?.duration);
      const item = document.createElement("div");
      item.className = "related-item";
      item.innerHTML = `
        <div class="related-thumb">
          <img src="${img}" alt="${esc(v.snippet.title)}" loading="lazy" />
          ${dur ? `<span class="related-dur">${dur}</span>` : ""}
        </div>
        <div class="related-info">
          <div class="related-title">${esc(v.snippet.title)}</div>
          <div class="related-meta">${fmt(v.statistics?.viewCount)} views · ${ago(v.snippet.publishedAt)}</div>
        </div>`;
      item.addEventListener("click", () => { window.location.href = `video.html?v=${v.id}`; });
      list.appendChild(item);
    });
  } catch(e) {
    console.warn("Related:", e);
    if (list) list.innerHTML = `<p style="color:#5a5878;font-size:0.8rem">Gagal memuat video lainnya.</p>`;
  }
}

// ═══════════════════════════════════════════════
// SHARE
// ═══════════════════════════════════════════════
function openShare(vid, title) {
  const ytUrl  = `https://www.youtube.com/watch?v=${vid}`;
  const pageUrl = window.location.href;
  document.getElementById("shareTitle").textContent = title;
  document.getElementById("shareUrlInput").value = pageUrl;
  document.getElementById("shareWa").href = `https://api.whatsapp.com/send?text=${encodeURIComponent(title+"\n"+ytUrl)}`;
  document.getElementById("shareTw").href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(ytUrl)}`;
  document.getElementById("shareFb").href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ytUrl)}`;
  document.getElementById("shareTg").href = `https://t.me/share/url?url=${encodeURIComponent(ytUrl)}&text=${encodeURIComponent(title)}`;
  document.getElementById("shareModal").style.display = "flex";
}

// ═══════════════════════════════════════════════
// INIT HALAMAN
// ═══════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async () => {
  videoId = new URLSearchParams(window.location.search).get("v");
  if (!videoId) { window.location.href = "index.html"; return; }

  window.addEventListener("scroll", () => {
    document.querySelector(".navbar")?.classList.toggle("scrolled", scrollY > 20);
  }, { passive: true });

  // Load video detail
  const vData = await loadVideoDetail(videoId);

  // Inisialisasi player
  if (window.YT && window.YT.Player) {
    createPlayer(videoId);
  }

  // Load video lainnya
  if (vData) {
    loadRelated(videoId);
  }

  // Share
  const title = document.getElementById("vTitle")?.textContent || "Video";
  document.getElementById("btnShare")?.addEventListener("click", () => openShare(videoId, title));
  document.getElementById("shareClose")?.addEventListener("click", () => {
    document.getElementById("shareModal").style.display = "none";
  });
  document.getElementById("shareModal")?.addEventListener("click", e => {
    if (e.target === document.getElementById("shareModal"))
      document.getElementById("shareModal").style.display = "none";
  });

  // Copy link
  document.getElementById("copyLinkBtn")?.addEventListener("click", () => {
    const inp = document.getElementById("shareUrlInput");
    navigator.clipboard.writeText(inp.value).catch(() => {
      inp.select(); document.execCommand("copy");
    });
    toast("✅ Link disalin!");
  });

  // Download
  document.getElementById("btnDownload")?.addEventListener("click", () => {
    document.getElementById("dlModal").style.display = "flex";
  });
  document.getElementById("dlClose")?.addEventListener("click", () => {
    document.getElementById("dlModal").style.display = "none";
  });
  document.getElementById("dlModal")?.addEventListener("click", e => {
    if (e.target === document.getElementById("dlModal"))
      document.getElementById("dlModal").style.display = "none";
  });

  // ESC close modals
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      document.getElementById("shareModal").style.display = "none";
      document.getElementById("dlModal").style.display = "none";
    }
  });

  // Deskripsi toggle
  document.getElementById("descToggle")?.addEventListener("click", () => {
    descExpanded = !descExpanded;
    const el = document.getElementById("descText");
    el?.classList.toggle("short", !descExpanded);
    document.getElementById("descToggle").textContent =
      descExpanded ? "Tampilkan lebih sedikit ▴" : "Tampilkan lebih banyak ▾";
  });

  // Auto landscape fullscreen di mobile
  const handleFullscreenChange = () => {
    if (document.fullscreenElement) {
      screen.orientation?.lock?.("landscape").catch(() => {});
    } else {
      screen.orientation?.unlock?.();
    }
  };
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
});
