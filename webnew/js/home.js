// Logika halaman index: grid, search, sort (Terbaru/Popular), pagination.
(function () {
  const CFG = window.APP_CONFIG;
  const grid = document.getElementById("grid");
  const state = document.getElementById("state");
  const loadMoreWrap = document.getElementById("loadMoreWrap");
  const loadMoreBtn = document.getElementById("loadMore");
  const searchInput = document.getElementById("search");
  const sortBox = document.getElementById("sort");
  const pageTitle = document.getElementById("pageTitle");

  let allItems = []; // item lengkap (dari getAllPlaylistItems)
  let stats = {}; // videoId -> viewCount
  let nextToken = null;
  let sortMode = "recent"; // recent | popular
  let query = "";
  let loading = false;

  function cardHTML(it) {
    const v = stats[it.videoId] != null ? Util.formatViews(stats[it.videoId]) : "";
    return `
      <a class="card" href="video.html?v=${encodeURIComponent(it.videoId)}">
        <div class="thumb">
          <img loading="lazy" src="${it.thumb}" alt="" />
          ${v ? `<span class="badge">${v} views</span>` : ""}
        </div>
        <div class="meta">
          <div class="title">${escapeHTML(it.title)}</div>
          <div class="sub">
            <span>${Util.formatDate(it.publishedAt)}</span>
          </div>
        </div>
      </a>`;
  }

  function escapeHTML(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function visibleItems() {
    let list = allItems.slice();
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((it) => it.title.toLowerCase().includes(q));
    }
    if (sortMode === "popular") {
      list.sort((a, b) => (stats[b.videoId] || 0) - (stats[a.videoId] || 0));
    } else {
      list.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }
    return list;
  }

  function render() {
    const list = visibleItems();
    if (!list.length) {
      grid.innerHTML = "";
      state.classList.remove("hidden");
      state.innerHTML =
        '<div>' + (allItems.length ? "Tidak ada hasil." : "Playlist kosong.") + "</div>";
      loadMoreWrap.classList.add("hidden");
      return;
    }
    state.classList.add("hidden");
    grid.innerHTML = list.map(cardHTML).join("");
    loadMoreWrap.classList.toggle("hidden", !nextToken || query.length > 0);
  }

  async function loadStats() {
    // batch ambil view count untuk Popular
    const ids = allItems.map((i) => i.videoId).filter(Boolean);
    if (!ids.length) return;
    try {
      const data = await API.getStats(ids);
      stats = data.stats || {};
    } catch (e) {
      console.warn("stats gagal:", e.message);
    }
  }

  function showChannelBanner() {
    const ch = API.getChannelInfo();
    const banner = document.getElementById("channelBanner");
    if (!ch || !ch.title) {
      if (banner) banner.classList.add("hidden");
      return;
    }
    if (banner) {
      banner.innerHTML = `
        ${ch.avatar ? `<img src="${ch.avatar}" alt="" />` : ""}
        <div>
          <div class="cname">${escapeHTML(ch.title)}</div>
          <div class="csub">Daftar video</div>
        </div>`;
      banner.classList.remove("hidden");
    }
  }

  async function init() {
    try {
      await API.resolvePlaylist();
    } catch (e) {
      state.classList.remove("hidden");
      state.innerHTML =
        '<div>Setel <code>PLAYLIST_ID</code> atau <code>CHANNEL_ID</code> di <code>js/config.js</code>, lalu jalankan <code>node server.js</code>.</div>';
      return;
    }
    try {
      showChannelBanner();
      const data = await API.getPlaylist(null);
      allItems = data.items || [];
      nextToken = data.nextPageToken || null;
      await loadStats();
      render();
    } catch (e) {
      state.classList.remove("hidden");
      state.innerHTML = '<div>Gagal memuat: ' + escapeHTML(e.message) + "</div>";
    }
  }

  async function loadMore() {
    if (!nextToken || loading) return;
    loading = true;
    loadMoreBtn.textContent = "Memuat...";
    try {
      const data = await API.getPlaylist(nextToken);
      const existing = new Set(allItems.map((i) => i.videoId));
      (data.items || []).forEach((it) => {
        if (!existing.has(it.videoId)) allItems.push(it);
      });
      nextToken = data.nextPageToken || null;
      await loadStats();
      render();
    } catch (e) {
      console.warn(e.message);
    } finally {
      loading = false;
      loadMoreBtn.textContent = "Muat lebih banyak";
    }
  }

  // events
  searchInput.addEventListener("input", (e) => {
    query = e.target.value.trim();
    render();
  });

  sortBox.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    sortMode = btn.dataset.sort;
    [...sortBox.children].forEach((b) => b.classList.toggle("active", b === btn));
    pageTitle.textContent = sortMode === "popular" ? "Playlist Popular" : "Playlist Terbaru";
    render();
  });

  loadMoreBtn.addEventListener("click", loadMore);

  init();
})();
