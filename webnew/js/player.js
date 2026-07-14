// Logika halaman video: player IFrame, deskripsi, recent, popular, video selanjutnya.
(function () {
  const CFG = window.APP_CONFIG;

  const stateEl = document.getElementById("state");
  const watchEl = document.getElementById("watch");
  const vTitle = document.getElementById("vTitle");
  const vSub = document.getElementById("vSub");
  const vDesc = document.getElementById("vDesc");
  const recentList = document.getElementById("recentList");
  const popularList = document.getElementById("popularList");
  const nextSection = document.getElementById("nextSection");
  const nextBox = document.getElementById("nextBox");

  let ytReady = false;
  let pendingId = null;

  function escapeHTML(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function linkifyDesc(text) {
    const esc = escapeHTML(text);
    return esc.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  function rowHTML(it, viewCount) {
    const v = viewCount != null ? Util.formatViews(viewCount) + " views" : "";
    return `
      <a class="row" href="video.html?v=${encodeURIComponent(it.videoId)}">
        <div class="t"><img loading="lazy" src="${it.thumb}" alt="" /></div>
        <div class="info">
          <div class="tt">${escapeHTML(it.title)}</div>
          ${v ? `<div class="vv">${v}</div>` : ""}
        </div>
      </a>`;
  }

  function createPlayer(id) {
    new YT.Player("player", {
      videoId: id,
      playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
      width: "100%",
      height: "100%",
    });
  }

  window.onYouTubeIframeAPIReady = function () {
    ytReady = true;
    if (pendingId) {
      createPlayer(pendingId);
      pendingId = null;
    }
  };

  async function renderSidebar() {
    try {
      const items = await API.getAllPlaylistItems();
      const ids = items.map((i) => i.videoId).filter(Boolean);
      const data = await API.getStats(ids);
      const stats = data.stats || {};

      const recent = items
        .slice()
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice(0, 8);
      const popular = items
        .slice()
        .sort((a, b) => (stats[b.videoId] || 0) - (stats[a.videoId] || 0))
        .slice(0, 8);

      recentList.innerHTML = recent.map((it) => rowHTML(it)).join("");
      popularList.innerHTML = popular
        .map((it) => rowHTML(it, stats[it.videoId]))
        .join("");
    } catch (e) {
      console.warn("sidebar gagal:", e.message);
    }
  }

  async function setupNext(video) {
    const nextId = Util.firstYouTubeId(video.description);
    if (!nextId || nextId === video.videoId) {
      nextSection.classList.add("hidden");
      return;
    }
    // cari thumb di playlist dulu, fallback fetch detail video
    let thumb = video.thumb;
    let title = "Video berikutnya";
    try {
      const items = await API.getAllPlaylistItems();
      const found = items.find((i) => i.videoId === nextId);
      if (found) {
        thumb = found.thumb;
        title = found.title;
      } else {
        const nv = await API.getVideo(nextId);
        thumb = nv.thumb || thumb;
        title = nv.title || title;
      }
    } catch (_) {}

    nextBox.innerHTML = `
      <div class="t"><img src="${thumb}" alt="" /></div>
      <div>
        <div class="label">Lanjut menonton</div>
        <div class="tt">${escapeHTML(title)}</div>
      </div>`;
    nextBox.onclick = () => {
      window.location.href = "video.html?v=" + encodeURIComponent(nextId);
    };
    nextSection.classList.remove("hidden");
  }

  async function init() {
    const id = new URLSearchParams(location.search).get("v");
    if (!id) {
      stateEl.innerHTML = "<div>Video tidak ditemukan.</div>";
      return;
    }

    if (ytReady) createPlayer(id);
    else pendingId = id;

    try {
      const video = await API.getVideo(id);
      stateEl.classList.add("hidden");
      watchEl.classList.remove("hidden");

      document.title = video.title + " — PlayList";
      vTitle.textContent = video.title;
      vSub.innerHTML =
        `<span>${escapeHTML(video.channelTitle || "")}</span>` +
        `<span>${Util.formatViews(video.viewCount)} views</span>` +
        `<span>${Util.formatDate(video.publishedAt)}</span>`;
      vDesc.innerHTML = linkifyDesc(video.description);

      setupNext(video);
      renderSidebar();
    } catch (e) {
      stateEl.classList.remove("hidden");
      stateEl.innerHTML = '<div>Gagal memuat: ' + escapeHTML(e.message) + "</div>";
    }
  }

  init();
})();
