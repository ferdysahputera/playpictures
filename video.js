/* ============================================================
   PLAY PICTURES – video.js  (Halaman Video Player)

   FITUR:
   - Player dibuat via YouTube IFrame Player API (bukan <iframe> statis)
   - OAuth 2.0: Like, Dislike, Subscribe, Komentar langsung di website
   - Share ke WhatsApp / Twitter / Facebook / Telegram
   - Download (redirect ke layanan download)
   - Komentar dari API YouTube
   - Video terkait dari channel
   ============================================================ */

"use strict";

const YT_API = "https://www.googleapis.com/youtube/v3";

// ── State ─────────────────────────────────────────────────
let accessToken  = null;
let tokenClient  = null;
let ytPlayer     = null;   // YT.Player instance
let videoId      = null;
let isSubscribed = false;
let isLiked      = false;
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
function toast(msg, type="") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast show" + (type ? " "+type : "");
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.className = "toast"; }, 3500);
}

// ── Fetch API (read) ──────────────────────────────────────
async function yt(ep, params={}) {
  const url = new URL(`${YT_API}/${ep}`);
  Object.entries({ key: CONFIG.API_KEY, ...params })
    .forEach(([k,v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "API error");
  return data;
}

// ── Fetch API (write — butuh accessToken) ─────────────────
async function ytW(ep, method="POST", body=null, params={}) {
  if (!accessToken) { toast("🔑 Silakan login terlebih dahulu", "error"); return null; }
  const url = new URL(`${YT_API}/${ep}`);
  Object.entries({ key: CONFIG.API_KEY, ...params })
    .forEach(([k,v]) => url.searchParams.set(k, v));
  const opts = {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url.toString(), opts);
  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

// ═══════════════════════════════════════════════
// YOUTUBE IFRAME PLAYER API
// (Player dibuat via JavaScript — bukan <iframe> statis di HTML)
// ═══════════════════════════════════════════════

// Callback global yang dipanggil YouTube API setelah siap
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
      rel:             0,      // tidak tampilkan video lain di akhir
      modestbranding:  1,      // minimal branding YouTube
      iv_load_policy:  3,      // sembunyikan anotasi
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
// OAUTH / LOGIN
// ═══════════════════════════════════════════════
function initOAuth() {
  if (!window.google || !CONFIG.CLIENT_ID || CONFIG.CLIENT_ID.includes("GANTI_")) return;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "profile",
      "email",
    ].join(" "),
    callback: onTokenReceived,
  });
}

async function onTokenReceived(resp) {
  if (resp.error) { toast("Login gagal: " + resp.error, "error"); return; }
  accessToken = resp.access_token;
  try {
    const me = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    }).then(r => r.json());

    document.getElementById("userAvatar").src = me.picture || "";
    document.getElementById("userName").textContent = me.name || "User";
    document.getElementById("loginBtn").style.display  = "none";
    document.getElementById("userInfo").style.display  = "flex";

    // Set avatar di form komentar
    const ownAvatar = document.getElementById("commentAvatar");
    if (ownAvatar && me.picture) ownAvatar.src = me.picture;

    // Tampilkan form komentar, sembunyikan login msg
    document.getElementById("commentLoginMsg").style.display = "none";
    document.getElementById("commentForm").style.display = "";
    document.getElementById("loginHint").style.display = "none";

    toast("✅ Login berhasil! Halo, " + (me.name || "User"));

    // Cek status subscribe + like
    checkSubscription();
    checkLikeStatus();
  } catch(e) { console.warn(e); }
}

function doLogin() {
  if (!tokenClient) {
    if (!CONFIG.CLIENT_ID || CONFIG.CLIENT_ID.includes("GANTI_")) {
      toast("⚠️ CLIENT_ID belum diisi di config.js", "error");
    } else {
      toast("Menunggu Google Identity Services...", "error");
    }
    return;
  }
  tokenClient.requestAccessToken();
}

function doLogout() {
  if (accessToken) google.accounts.oauth2.revoke(accessToken, ()=>{});
  accessToken = null;
  document.getElementById("loginBtn").style.display  = "";
  document.getElementById("userInfo").style.display  = "none";
  document.getElementById("commentLoginMsg").style.display = "";
  document.getElementById("commentForm").style.display = "none";
  document.getElementById("loginHint").style.display = "";
  isSubscribed = false; isLiked = false;
  updateUI();
  toast("Anda telah keluar.");
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

    // Title & breadcrumb
    document.title = `${v.snippet.title} – Play Pictures`;
    document.getElementById("vTitle").textContent = v.snippet.title;

    // Stats
    const dur = parseDur(v.contentDetails?.duration);
    document.getElementById("vViews").textContent = `👁 ${fmt(v.statistics?.viewCount)} tayangan`;
    document.getElementById("vDate").textContent  = `📅 ${fmtDate(v.snippet.publishedAt)}`;
    document.getElementById("vDuration").textContent = dur ? `⏱ ${dur}` : "";

    // Like count
    document.getElementById("likeCount").textContent =
      v.statistics?.likeCount ? `Like (${fmt(v.statistics.likeCount)})` : "Like";

    // YouTube links
    document.getElementById("btnYoutube").href = ytUrl;
    document.getElementById("ytCommentLink").href = ytUrl;
    const dlYt = document.getElementById("dlYt");
    if (dlYt) dlYt.href = ytUrl;

    // Deskripsi
    const rawDesc = v.snippet.description || "Tidak ada deskripsi.";
    renderDescriptionWithParts(rawDesc);

    // Channel
    await loadChannelMini(v.snippet.channelId);

    // Komentar (count badge)
    const cnt = document.getElementById("commentCount");
    if (cnt) cnt.textContent = fmt(v.statistics?.commentCount);

    return v;
  } catch(e) {
    toast("Gagal memuat video: " + e.message, "error");
    console.error(e);
  }
}

// ── Fungsi Render Deskripsi & Part Video ───────────────────
function renderDescriptionWithParts(text) {
  const descEl = document.getElementById("descText");
  if (!descEl) return;

  // Regex untuk link YouTube (e.g., https://www.youtube.com/watch?v=xxx atau https://youtu.be/xxx)
  const ytRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})[^\s\n\r]*)/gi;

  let htmlContent = esc(text);

  // Deteksi pencocokan link video di deskripsi
  const matches = [...text.matchAll(ytRegex)];
  
  // 1. Ubah link YouTube menjadi link lokal (video.html?v=ID)
  // Serta mendeteksi teks 'part 1', 'part 2', dsb di sekitarnya
  // Kita lakukan replace langsung menggunakan string asli
  const uniqueMatches = [];
  matches.forEach(m => {
    const fullUrl = m[1];
    const targetVid = m[2];
    if (!uniqueMatches.some(x => x.url === fullUrl)) {
      uniqueMatches.push({ url: fullUrl, id: targetVid });
    }
  });

  // Urutkan terbalik dari terpanjang agar replace tidak bentrok
  uniqueMatches.sort((a, b) => b.url.length - a.url.length);

  uniqueMatches.forEach(item => {
    const localUrl = `video.html?v=${item.id}`;
    // Kita buat span/link minimalis dengan class part-link
    // Cari teks sekeliling di teks asli (misal: "Part 1 : url" atau "Part 2 - url")
    // Agar simpel, kita bungkus link dengan styling glass
    const escUrl = esc(item.url);
    const regexReplace = new RegExp(escapeRegExp(escUrl), 'g');
    htmlContent = htmlContent.replace(regexReplace, `<a href="${localUrl}" class="part-link"><i class="fa-solid fa-play"></i> TONTON DI SINI</a>`);
  });

  // Ganti sisa teks "part X" atau "PART X" biasa menjadi format span keren
  const partWordRegex = /\b(part\s*\d+)\b/gi;
  htmlContent = htmlContent.replace(partWordRegex, '<span class="part-badge">$1</span>');

  // Ganti baris baru (\n) menjadi <br>
  htmlContent = htmlContent.replace(/\n/g, "<br>");
  
  descEl.innerHTML = htmlContent;

  // 2. Deteksi Video Sebelum & Selanjutnya
  // Format populer di deskripsi: "Sebelumnya:", "Next:", "Previous:", "Video Selanjutnya:"
  // Kita cari baris yang mengandung kata kunci tersebut
  const lines = text.split("\n");
  let prevId = null;
  let prevTitle = "Video Sebelumnya";
  let nextId = null;
  let nextTitle = "Video Selanjutnya";

  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    const matchYt = line.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (matchYt) {
      const foundId = matchYt[1];
      // Ambil teks sebelum link untuk judul atau deteksi label
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

  // Jika tidak terdeteksi via kata kunci eksplisit, kita gunakan default playlist order atau part order
  // Jika ada part links yang terdeteksi, kita asumsikan part sebelum/sesudahnya adalah prev/next
  let prevPartNum = null;
  let nextPartNum = null;

  if (uniqueMatches.length > 0) {
    // Cari posisi videoId saat ini di daftar matches
    const currentIndex = uniqueMatches.findIndex(x => x.id === videoId);
    
    // Jika terdeteksi kata kunci eksplisit tapi kita juga ingin tahu part number-nya
    if (currentIndex !== -1) {
      // Index 0 adalah Part 1, index 1 adalah Part 2, dst.
      // Jika di deskripsi diurutkan Part 1 paling atas:
      // Video sebelumnya (Part lebih kecil) ada di index sebelumnya atau sesudahnya tergantung urutan tulisan.
      // Kita asumsikan urutan standar (Part 1 di atas, Part 2 di bawah):
      // Maka index lebih kecil = Part sebelumnya.
      if (currentIndex > 0) {
        prevId = uniqueMatches[currentIndex - 1].id;
        prevPartNum = currentIndex; // e.g. jika currentIndex = 1 (Part 2), maka prevPartNum = 1 (Part 1)
      }
      if (currentIndex < uniqueMatches.length - 1) {
        nextId = uniqueMatches[currentIndex + 1].id;
        nextPartNum = currentIndex + 2; // e.g. jika currentIndex = 1 (Part 2), maka nextPartNum = 3 (Part 3)
      }
    } else {
      // Jika video saat ini tidak ada di deskripsi, default ke part pertama sebagai selanjutnya
      nextId = uniqueMatches[0].id;
      nextPartNum = 1;
    }
  }

  // Jika terdeteksi dari kata kunci baris teks, tebak part number-nya jika memungkinkan
  if (prevId && !prevPartNum) {
    const idx = uniqueMatches.findIndex(x => x.id === prevId);
    if (idx !== -1) prevPartNum = idx + 1;
  }
  if (nextId && !nextPartNum) {
    const idx = uniqueMatches.findIndex(x => x.id === nextId);
    if (idx !== -1) nextPartNum = idx + 1;
  }

  // Tampilkan navigasi video
  const navContainer = document.getElementById("navVideos");
  const prevBtn = document.getElementById("prevVideoLink");
  const nextBtn = document.getElementById("nextVideoLink");

  let hasNav = false;

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

  if (navContainer) {
    navContainer.style.display = hasNav ? "grid" : "none";
  }
}

// Helper untuk fetch detail judul lengkap dan thumbnail video
async function fetchVideoMeta(id, titleId, thumbId) {
  try {
    const data = await yt("videos", { part: "snippet", id });
    if (data.items?.[0]) {
      const v = data.items[0];
      const titleEl = document.getElementById(titleId);
      if (titleEl) {
        titleEl.textContent = v.snippet.title;
        titleEl.title = v.snippet.title; // tambahkan tooltip judul lengkap
      }

      const thumbEl = document.getElementById(thumbId);
      if (thumbEl) {
        const url = thumb(v.snippet.thumbnails, ["medium", "default"]);
        if (url) {
          thumbEl.src = url;
          thumbEl.style.display = "block";
        }
      }
    }
  } catch(e) {
    console.warn("Fetch video meta:", e);
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Load Channel Mini ──────────────────────────────────────
async function loadChannelMini(chId) {
  try {
    const data = await yt("channels", { part: "snippet,statistics", id: chId });
    const ch = data.items?.[0];
    if (!ch) return;
    const av = thumb(ch.snippet.thumbnails);
    if (av) {
      const el = document.getElementById("chMiniAvatar");
      if (el) el.src = av;
    }
    const nm = document.getElementById("chMiniName");
    if (nm) nm.textContent = ch.snippet.title;
    const subs = document.getElementById("chMiniSubs");
    if (subs) subs.textContent = `${fmt(ch.statistics?.subscriberCount)} subscriber`;
  } catch(e) { console.warn("Channel mini:", e); }
}

// ═══════════════════════════════════════════════
// LIKE / DISLIKE
// ═══════════════════════════════════════════════
async function checkLikeStatus() {
  if (!accessToken || !videoId) return;
  try {
    const data = await ytW("videos/getRating", "GET", null, { id: videoId });
    if (data?.items?.[0]) {
      isLiked = data.items[0].rating === "like";
      updateUI();
    }
  } catch(e) { console.warn("Like check:", e); }
}

async function doLike() {
  if (!accessToken) { doLogin(); return; }
  try {
    const rating = isLiked ? "none" : "like";
    await ytW("videos/rate", "POST", null, { id: videoId, rating });
    isLiked = !isLiked;
    updateUI();
    toast(isLiked ? "👍 Video disukai!" : "👍 Like dibatalkan");
  } catch(e) {
    toast("Gagal like: " + e.message, "error");
  }
}

async function doDislike() {
  if (!accessToken) { doLogin(); return; }
  try {
    await ytW("videos/rate", "POST", null, { id: videoId, rating: "dislike" });
    toast("👎 Dislike berhasil dikirim");
  } catch(e) {
    toast("Gagal dislike: " + e.message, "error");
  }
}

// ═══════════════════════════════════════════════
// SUBSCRIBE
// ═══════════════════════════════════════════════
async function checkSubscription() {
  if (!accessToken) return;
  try {
    const data = await ytW("subscriptions", "GET", null, {
      part: "snippet", mine: "true", forChannelId: CONFIG.CHANNEL_ID,
    });
    isSubscribed = (data?.pageInfo?.totalResults > 0);
    updateUI();
  } catch(e) { console.warn("Check sub:", e); }
}

async function doSubscribe() {
  if (!accessToken) { doLogin(); return; }
  try {
    if (!isSubscribed) {
      await ytW("subscriptions", "POST",
        { snippet: { resourceId: { kind: "youtube#channel", channelId: CONFIG.CHANNEL_ID } } },
        { part: "snippet" }
      );
      isSubscribed = true;
      toast("❤️ Berhasil Subscribe!");
    } else {
      toast("✅ Anda sudah berlangganan channel ini");
    }
    updateUI();
  } catch(e) {
    toast("Gagal subscribe: " + e.message, "error");
  }
}

// ── Update tampilan tombol ─────────────────────────────────
function updateUI() {
  // Like button
  const btnLike = document.getElementById("btnLike");
  if (btnLike) btnLike.classList.toggle("active", isLiked);

  // Subscribe buttons
  document.querySelectorAll("#btnSub, #btnSubMini").forEach(btn => {
    if (!btn) return;
    if (isSubscribed) {
      btn.textContent = "✅ Berlangganan";
      btn.classList.add("subscribed");
    } else {
      btn.textContent = "❤️ Subscribe";
      btn.classList.remove("subscribed");
    }
  });
}

// ═══════════════════════════════════════════════
// KOMENTAR
// ═══════════════════════════════════════════════
async function loadComments(vid) {
  const list = document.getElementById("commentList");
  if (!list) return;
  try {
    const data = await yt("commentThreads", {
      part: "snippet", videoId: vid,
      maxResults: 20, order: "relevance",
    });
    if (!data.items?.length) {
      list.innerHTML = `<p style="color:#5a5878;font-size:0.85rem">Belum ada komentar.</p>`;
      return;
    }
    list.innerHTML = "";
    data.items.forEach(thread => {
      const c = thread.snippet.topLevelComment.snippet;
      const name = esc(c.authorDisplayName);
      const text = esc(c.textDisplay);
      const av   = c.authorProfileImageUrl;
      const likes = parseInt(c.likeCount)||0;

      const item = document.createElement("div");
      item.className = "comment-item";
      item.innerHTML = `
        ${av
          ? `<img class="cmt-avatar" src="${av}" alt="${name}" loading="lazy" />`
          : `<div class="cmt-avatar-fallback">${name.charAt(0).toUpperCase()}</div>`}
        <div class="cmt-body">
          <div class="cmt-name">${name} <span class="cmt-date">${ago(c.publishedAt)}</span></div>
          <div class="cmt-text">${text}</div>
          ${likes > 0 ? `<div class="cmt-likes">👍 ${fmt(likes)}</div>` : ""}
        </div>`;
      list.appendChild(item);
    });
  } catch(e) {
    list.innerHTML = `<p style="color:#5a5878;font-size:0.85rem">Komentar tidak tersedia untuk video ini.</p>`;
    console.warn("Comments:", e);
  }
}

// ── Kirim Komentar ────────────────────────────────────────
async function submitComment() {
  if (!accessToken) { doLogin(); return; }
  const inp = document.getElementById("commentInput");
  const text = inp?.value.trim();
  if (!text) { toast("Tulis komentar dulu!", "error"); return; }

  const btn = document.getElementById("submitComment");
  if (btn) { btn.disabled = true; btn.textContent = "Mengirim..."; }

  try {
    await ytW("commentThreads", "POST", {
      snippet: {
        videoId: videoId,
        topLevelComment: { snippet: { textOriginal: text } },
      },
    }, { part: "snippet" });

    toast("💬 Komentar berhasil dikirim!");
    inp.value = "";

    // Tambahkan komentar baru ke atas list
    const list = document.getElementById("commentList");
    const me = { name: document.getElementById("userName").textContent,
                 avatar: document.getElementById("userAvatar").src };
    if (list) {
      const item = document.createElement("div");
      item.className = "comment-item";
      item.style.borderLeft = "2px solid #9333ea";
      item.style.paddingLeft = "10px";
      item.innerHTML = `
        ${me.avatar
          ? `<img class="cmt-avatar" src="${me.avatar}" alt="${me.name}" />`
          : `<div class="cmt-avatar-fallback">${(me.name||"U").charAt(0)}</div>`}
        <div class="cmt-body">
          <div class="cmt-name">${esc(me.name||"Saya")} <span class="cmt-date">Baru saja</span></div>
          <div class="cmt-text">${esc(text)}</div>
        </div>`;
      list.insertBefore(item, list.firstChild);
    }
  } catch(e) {
    toast("Gagal kirim komentar: " + e.message, "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Kirim Komentar"; }
  }
}

// ═══════════════════════════════════════════════
// VIDEO TERKAIT
// ═══════════════════════════════════════════════
async function loadRelated(currentVid) {
  const list = document.getElementById("relatedList");
  if (!list) return;
  try {
    const srch = await yt("search", {
      part: "snippet", channelId: CONFIG.CHANNEL_ID,
      type: "video", maxResults: 15, order: "date",
    });
    const ids = srch.items.map(i => i.id.videoId)
      .filter(id => id !== currentVid).slice(0, 12).join(",");
    const det = await yt("videos", { part: "snippet,statistics,contentDetails", id: ids });

    list.innerHTML = "";
    det.items.forEach(v => {
      const img = thumb(v.snippet.thumbnails);
      const dur = parseDur(v.contentDetails?.duration);
      const item = document.createElement("div");
      item.className = "related-item";
      item.innerHTML = `
        <div class="related-thumb">
          <img src="${img}" alt="${v.snippet.title}" loading="lazy" />
          ${dur ? `<span class="related-dur">${dur}</span>` : ""}
        </div>
        <div class="related-info">
          <div class="related-title">${v.snippet.title}</div>
          <div class="related-meta">${fmt(v.statistics?.viewCount)} views · ${ago(v.snippet.publishedAt)}</div>
        </div>`;
      item.addEventListener("click", () => {
        window.location.href = `video.html?v=${v.id}`;
      });
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
  // Ambil video ID dari URL
  videoId = new URLSearchParams(window.location.search).get("v");
  if (!videoId) { window.location.href = "index.html"; return; }

  // Scroll navbar
  window.addEventListener("scroll", () => {
    document.querySelector(".navbar")?.classList.toggle("scrolled", scrollY > 20);
  }, { passive: true });

  // Cek config
  if (CONFIG.API_KEY.includes("YOUR_") || CONFIG.API_KEY.includes("AIzaSy") === false) {
    toast("⚠️ Periksa API_KEY di config.js", "error");
  }

  // Load video detail & channel (paralel)
  const vData = await loadVideoDetail(videoId);

  // Inisialisasi player (jika YT API sudah siap)
  if (window.YT && window.YT.Player) {
    createPlayer(videoId);
  }
  // Jika YT API belum siap, window.onYouTubeIframeAPIReady akan dipanggil otomatis

  // Load komentar + related (paralel)
  if (vData) {
    loadComments(videoId);
    loadRelated(videoId);
  }

  // ── Event Listeners ────────────────────────────────────

  // Login / Logout
  document.getElementById("loginBtn")?.addEventListener("click", doLogin);
  document.getElementById("logoutBtn")?.addEventListener("click", doLogout);
  document.getElementById("loginHintBtn")?.addEventListener("click", doLogin);
  document.getElementById("loginForComment")?.addEventListener("click", doLogin);

  // Login hint (muncul jika belum login)
  document.getElementById("loginHint").style.display = "";

  // Like / Dislike / Subscribe
  document.getElementById("btnLike")?.addEventListener("click", doLike);
  document.getElementById("btnDislike")?.addEventListener("click", doDislike);
  document.getElementById("btnSub")?.addEventListener("click", doSubscribe);
  document.getElementById("btnSubMini")?.addEventListener("click", doSubscribe);

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

  // Komentar: cancel / submit
  document.getElementById("cancelComment")?.addEventListener("click", () => {
    const inp = document.getElementById("commentInput");
    if (inp) inp.value = "";
  });
  document.getElementById("submitComment")?.addEventListener("click", submitComment);
  document.getElementById("commentInput")?.addEventListener("keydown", e => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitComment();
  });

  // Auto landscape saat fullscreen di HP (Screen Orientation API)
  const handleFullscreenChange = () => {
    if (document.fullscreenElement) {
      // Masuk fullscreen
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(err => {
          console.log("Orientation lock ditolak/tidak disupport browser:", err.message);
        });
      }
    } else {
      // Keluar fullscreen
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    }
  };
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
  document.addEventListener("mozfullscreenchange", handleFullscreenChange);
  document.addEventListener("MSFullscreenChange", handleFullscreenChange);

  // OAuth init
  if (window.google) initOAuth();
  else document.querySelector('script[src*="gsi"]')?.addEventListener("load", initOAuth);
});
