const API_KEY = "AIzaSyDq4QPxumyDdxZB6ZlUciD7dsSA5ftQsQk";
const PLAYLIST_ID = "PL-FZtns4xgSElDgxA-146aX585xzalgbx";
const CHANNEL_ID = "UC87Oi8WXRAI2ncAX7CoBT6w";
const MAX_RESULTS = 12;

let nextPageToken = "";
let fetching = false;
let mode = "playlist";
let lastQuery = "";
let currentView = "grid";
let sortOrder = "newest";
let currentItems = [];
let isNewSearch = true;

const MANUAL_TAGS = [
  "OT. SULTAN",
  "OT. AMG",
  "OT. LEGENDA AMORA",
  "OT. AZKA",
  "OT. ATTARAZKA",
  "OT. FREDIS",
  "OT BELENO",
  "OT. RAVI",
  "OT. FIANDRA",
  "CAMPURSARI",
  "OT. YUNIOR",
  "VENUS MUSIK",
  "OT. RONA AUDIO"
];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let shuffledTags = shuffleArray(MANUAL_TAGS);

const videoListEl = document.getElementById("video-list");
const resultsHeader = document.getElementById("results-header");
const resultsTitle = document.getElementById("results-title");
const loaderEl = document.getElementById("loader");
const controlsBar = document.getElementById("controls-bar");
const viewGridBtn = document.getElementById("view-grid");
const viewListBtn = document.getElementById("view-list");
const sortNewestBtn = document.getElementById("sort-newest");
const sortOldestBtn = document.getElementById("sort-oldest");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const resetButton = document.getElementById("reset-button");
const errorMessageEl = document.getElementById("error-message");
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("nav");

const urlParams = new URLSearchParams(window.location.search);
const initialQuery = urlParams.get("q");
if (initialQuery) {
  lastQuery = initialQuery;
  mode = "search";
  searchInput.value = initialQuery;
  resetButton.classList.remove("hidden");
}

const floatingSearchBtn = document.getElementById("floating-search");
const searchOverlay = document.getElementById("search-overlay");
const overlaySearchForm = document.getElementById("overlay-search-form");
const overlaySearchInput = document.getElementById("overlay-search-input");
const overlayClose = document.getElementById("overlay-close");

async function fetchVideos() {
  if (fetching) return;
  fetching = true;
  if (isNewSearch) {
    loaderEl.classList.remove("hidden");
  }
  errorMessageEl.classList.add("hidden");
  try {
    const url =
      mode === "playlist"
        ? `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${PLAYLIST_ID}&maxResults=${MAX_RESULTS}&key=${API_KEY}&pageToken=${nextPageToken}`
        : `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${CHANNEL_ID}&q=${encodeURIComponent(
            lastQuery
          )}&maxResults=${MAX_RESULTS}&key=${API_KEY}&pageToken=${nextPageToken}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP error " + res.status);
    const data = await res.json();
    renderVideos(data);
    nextPageToken = data.nextPageToken || "";
  } catch (err) {
    errorMessageEl.textContent =
      "Gagal memuat data. Periksa koneksi atau API Key Anda.";
    errorMessageEl.classList.remove("hidden");
  } finally {
    loaderEl.classList.add("hidden");
    fetching = false;
    if (isNewSearch) {
      checkShortPage();
    }
  }
}

function renderVideos(data) {
  const items = data.items || [];
  if (mode === "search" && items.length === 0) {
    errorMessageEl.textContent = "Tidak ada hasil pencarian.";
    errorMessageEl.classList.remove("hidden");
  } else {
    errorMessageEl.classList.add("hidden");
  }
  
  if (isNewSearch) {
    currentItems = items;
  } else {
    currentItems = [...currentItems, ...items];
  }
  
  applySortAndRender();
  updateSearchInfo();
  updateControlsVisibility();
}

function applySortAndRender() {
  let items = [...currentItems];
  items.sort((a, b) => {
    const dateA = new Date(a.snippet?.publishedAt || 0);
    const dateB = new Date(b.snippet?.publishedAt || 0);
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  if (isNewSearch) {
    videoListEl.innerHTML = "";
    isNewSearch = false;
  }

  videoListEl.classList.remove("list-view");
  if (currentView === "list") {
    videoListEl.classList.add("list-view");
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const snippet = item.snippet;
    if (!snippet || snippet.title === "Private video" || snippet.title === "Video pribadi") return;
    const vidId = mode === "playlist" ? snippet.resourceId.videoId : item.id.videoId;
    const tags = snippet.title.split("|").map(t => t.trim()).filter(t => t).slice(1);
    const card = document.createElement("a");
    card.href = `./video.html?v=${vidId}`;
    card.target = "";
    card.rel = "noopener noreferrer";
    card.className = "card";
    card.innerHTML = `
      <div class="thumb-wrapper">
        <img class="thumb" src="${snippet.thumbnails?.medium?.url || ''}" alt="Thumbnail ${snippet.title}" />
        <div class="tags">
          ${tags.map(tag => `<span class="tag" data-query="${tag}">${tag}</span>`).join("")}
        </div>
      </div>
      <div class="card-content">
        <div class="title">${snippet.title}</div>
         <div class="published">${new Date(snippet.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
    `;
    fragment.appendChild(card);
  });
  videoListEl.appendChild(fragment);
}

function updateSearchInfo() {
  if (mode === "search" && lastQuery) {
    const count = currentItems.length;
    resultsTitle.textContent = `Hasil Pencarian: "${lastQuery}" (${count} hasil)`;
    resultsHeader.classList.remove("hidden");
  } else {
    resultsHeader.classList.add("hidden");
  }
}

function checkShortPage() {
  if (document.body.scrollHeight <= window.innerHeight && nextPageToken && !fetching) {
    fetchVideos();
  }
}

let scrollTimeout;
window.addEventListener("scroll", () => {
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
  if (nearBottom && nextPageToken && !fetching) {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      fetchVideos();
    }, 200);
  }
});

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;
  mode = "search";
  lastQuery = query;
  nextPageToken = "";
  isNewSearch = true;
  videoListEl.innerHTML = "";
  fetchVideos();
  resetButton.classList.remove("hidden");
  updateControlsVisibility();
});

resetButton.addEventListener("click", () => {
  mode = "playlist";
  lastQuery = "";
  nextPageToken = "";
  isNewSearch = true;
  videoListEl.innerHTML = "";
  controlsBar.classList.add("hidden");
  resultsHeader.classList.add("hidden");
  resetButton.classList.add("hidden");
  fetchVideos();
  searchInput.value = "";
});

menuToggle.addEventListener("click", () => {
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", !expanded);
  menuToggle.classList.toggle("active");
  nav.classList.toggle("open");
});

// Floating Search Button (Mobile)
floatingSearchBtn.addEventListener("click", () => {
  searchOverlay.classList.add("active");
  overlaySearchInput.focus();
});

overlayClose.addEventListener("click", () => {
  searchOverlay.classList.remove("active");
});

overlaySearchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = overlaySearchInput.value.trim();
  if (!query) return;
  searchOverlay.classList.remove("active");
  mode = "search";
  lastQuery = query;
  nextPageToken = "";
  isNewSearch = true;
  videoListEl.innerHTML = "";
  fetchVideos();
  resetButton.classList.remove("hidden");
  updateControlsVisibility();
});

// Close menu when clicking outside nav
document.addEventListener("click", (e) => {
  if (!nav.contains(e.target) && !menuToggle.contains(e.target) && nav.classList.contains("open")) {
    nav.classList.remove("open");
    menuToggle.classList.remove("active");
    menuToggle.setAttribute("aria-expanded", "false");
  }
});

// Tag click to search
videoListEl.addEventListener("click", (e) => {
  const tag = e.target.closest(".tag");
  if (!tag) return;
  e.preventDefault();
  e.stopPropagation();
  const query = tag.dataset.query;
  searchInput.value = query;
  lastQuery = query;
  mode = "search";
  nextPageToken = "";
  isNewSearch = true;
  videoListEl.innerHTML = "";
  fetchVideos();
  resetButton.classList.remove("hidden");
  updateControlsVisibility();
});

// Tag recommendations
const tagRecEl = document.getElementById("tag-recommendations");
searchInput.addEventListener("input", () => {
  const val = searchInput.value.trim().toLowerCase();
  if (!val) {
    tagRecEl.classList.add("hidden");
    tagRecEl.innerHTML = "";
    return;
  }
  const matches = shuffledTags.filter(t => t.toLowerCase().includes(val)).slice(0, 8);
  if (!matches.length) {
    tagRecEl.classList.add("hidden");
    tagRecEl.innerHTML = "";
    return;
  }
  tagRecEl.innerHTML = matches.map(t => `<span class="rec-tag" data-query="${t}">${t}</span>`).join("");
  tagRecEl.classList.remove("hidden");
});

searchInput.addEventListener("focus", () => {
  if (searchInput.value.trim()) return;
  shuffledTags = shuffleArray(MANUAL_TAGS);
  tagRecEl.innerHTML = shuffledTags.slice(0, 8).map(t => `<span class="rec-tag" data-query="${t}">${t}</span>`).join("");
  tagRecEl.classList.remove("hidden");
});

tagRecEl.addEventListener("click", (e) => {
  const recTag = e.target.closest(".rec-tag");
  if (!recTag) return;
  const query = recTag.dataset.query;
  searchInput.value = query;
  lastQuery = query;
  mode = "search";
  nextPageToken = "";
  isNewSearch = true;
  videoListEl.innerHTML = "";
  tagRecEl.classList.add("hidden");
  fetchVideos();
  resetButton.classList.remove("hidden");
  updateControlsVisibility();
});

document.addEventListener("click", (e) => {
  if (!tagRecEl.contains(e.target) && e.target !== searchInput) {
    tagRecEl.classList.add("hidden");
  }
});

// View toggle
viewGridBtn.addEventListener("click", () => {
  currentView = "grid";
  viewGridBtn.classList.add("active");
  viewListBtn.classList.remove("active");
  applySortAndRender();
});

viewListBtn.addEventListener("click", () => {
  currentView = "list";
  viewListBtn.classList.add("active");
  viewGridBtn.classList.remove("active");
  applySortAndRender();
});

// Sort toggle
sortNewestBtn.addEventListener("click", () => {
  sortOrder = "newest";
  sortNewestBtn.classList.add("active");
  sortOldestBtn.classList.remove("active");
  applySortAndRender();
});

sortOldestBtn.addEventListener("click", () => {
  sortOrder = "oldest";
  sortOldestBtn.classList.add("active");
  sortNewestBtn.classList.remove("active");
  applySortAndRender();
});

// Show controls only in search mode
function updateControlsVisibility() {
  if (mode === "search" && lastQuery) {
    controlsBar.classList.remove("hidden");
  } else {
    controlsBar.classList.add("hidden");
  }
}

// Load initial videos
fetchVideos();