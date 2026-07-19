const CONFIG = {
  API_KEY: 'AIzaSyDq4QPxumyDdxZB6ZlUciD7dsSA5ftQsQk',
  PLAYLIST_ID: 'PL-FZtns4xgSElDgxA-146aX585xzalgbx',
  CHANNEL_ID: 'UC87Oi8WXRAI2ncAX7CoBT6w',
  MAX_RESULTS: 20
};

const API = {
  BASE: 'https://www.googleapis.com/youtube/v3',
  CACHE_TTL: 5 * 60 * 1000,
  cache: new Map(),
  TIMEOUT: 15000,

  cacheKey(endpoint, params) {
    return `${endpoint}?${new URLSearchParams(params).toString()}`;
  },

  async request(endpoint, params = {}) {
    const key = this.cacheKey(endpoint, params);
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      return cached.data;
    }

    const url = new URL(`${this.BASE}${endpoint}`);
    url.searchParams.set('key', CONFIG.API_KEY);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

    try {
      const res = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      this.cache.set(key, { data, ts: Date.now() });
      return data;
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw e;
    }
  },

  getPlaylistItems(playlistId, pageToken = '', maxResults = 20) {
    return this.request('/playlistItems', {
      part: 'snippet,contentDetails',
      playlistId,
      maxResults,
      pageToken
    });
  },

  getPlaylist(playlistId) {
    return this.request('/playlists', {
      part: 'snippet,contentDetails',
      id: playlistId
    });
  },

  getVideos(videoIds) {
    return this.request('/videos', {
      part: 'snippet,contentDetails,statistics',
      id: videoIds.join(',')
    });
  },

  searchVideos(query, maxResults = 10, channelId = null) {
    const params = {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults,
      order: 'relevance'
    };
    if (channelId) params.channelId = channelId;
    return this.request('/search', params);
  },

  getRelatedVideos(videoId, maxResults = 10) {
    return this.request('/search', {
      part: 'snippet',
      type: 'video',
      relatedToVideoId: videoId,
      maxResults
    });
  },

  getChannelVideos(channelId, maxResults = 10) {
    return this.request('/search', {
      part: 'snippet',
      channelId,
      type: 'video',
      maxResults,
      order: 'date'
    });
  }
};

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function extractVideoIds(text) {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/g,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/g,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/g
  ];
  const ids = new Set();
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      ids.add(match[1]);
    }
  });
  return Array.from(ids);
}

function extractPartLabel(text) {
  const match = text.match(/\b(Part\s*\d+|Part\s*[IVXLCDM]+)\b/i);
  return match ? match[1] : null;
}

function extractLabels(text) {
  if (!text) return [];
  const partPattern = /\b(Part\s*\d+|Part\s*[IVXLCDM]+)\b/i;
  return text
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length <= 20 && !partPattern.test(s));
}

function getLabelClass(label) {
  return label.toLowerCase() === 'ot' ? 'label-badge ot-badge' : 'label-badge';
}

function extractUrls(text) {
  if (!text) return [];
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlPattern) || [];
  return [...new Set(matches)].filter(url => !url.includes('youtube.com') && !url.includes('youtu.be'));
}

function setupShare(videoId, title) {
  const url = encodeURIComponent(window.location.origin + window.location.pathname + '?v=' + videoId);
  const text = encodeURIComponent(title);

  document.getElementById('shareFb').addEventListener('click', () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
  });

  document.getElementById('shareIg').addEventListener('click', () => {
    window.open(`https://www.instagram.com/?url=${url}`, '_blank');
  });

  document.getElementById('shareWa').addEventListener('click', () => {
    window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
  });

  document.getElementById('shareCopy').addEventListener('click', () => {
    navigator.clipboard.writeText(decodeURIComponent(url)).then(() => {
      const btn = document.getElementById('shareCopy');
      const original = btn.innerHTML;
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
      setTimeout(() => btn.innerHTML = original, 1500);
    });
  });
}

function renderVideoCards(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<div class="loading">Tidak ada video.</div>';
    return;
  }
  container.innerHTML = items.map(item => {
    const thumb = item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '';
    const title = item.snippet.title;
    const channel = item.snippet.channelTitle || '';
    const date = formatDate(item.snippet.publishedAt);
    const id = item.id?.videoId || '';
      const partLabel = extractPartLabel(title);
      const labels = extractLabels(title);

      return `
        <a href="video.html?v=${id}" class="video-card">
          <div class="thumb-wrapper">
            <img src="${thumb}" alt="${title}" loading="lazy">
            <div class="badges">
              ${partLabel ? `<span class="part-badge">${partLabel}</span>` : ''}
              ${labels.map(l => `<span class="${getLabelClass(l)}">${l}</span>`).join('')}
            </div>
          </div>
          <div class="video-card-body">
            <h3>${title}</h3>
            <p class="meta">${channel} &bull; ${date}</p>
          </div>
        </a>
      `;
  }).join('');
}

function formatNumber(num) {
  if (!num) return '0';
  return parseInt(num).toLocaleString('id-ID');
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const isVideoPage = document.querySelector('.video-player-section') !== null;

if (isVideoPage) {
  initVideoPage();
} else {
  initIndexPage();
}

async function initIndexPage() {
  const videoGrid = document.getElementById('videoGrid');
  const sortSelect = document.getElementById('sortSelect');
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  let allVideos = [];
  let currentPageToken = '';
  let currentSort = 'default';

  async function loadMoreVideos() {
    if (loadMoreBtn.disabled) return;
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Memuat...';

    try {
      const data = await API.getPlaylistItems(CONFIG.PLAYLIST_ID, currentPageToken, CONFIG.MAX_RESULTS);
      let items = data.items || [];

      const videoIds = items
        .map(item => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId)
        .filter(Boolean);

      if (videoIds.length > 0) {
        const videosData = await API.getVideos(videoIds);
        const validIds = new Set();
        const statsMap = new Map();
        (videosData.items || []).forEach(v => {
          const id = v.id;
          statsMap.set(id, {
            views: parseInt(v.statistics?.viewCount || '0'),
            likes: parseInt(v.statistics?.likeCount || '0')
          });
          if (v.status?.privacyStatus !== 'private' && v.status?.embeddable !== false) {
            validIds.add(id);
          }
        });

        items = items
          .map(item => {
            const id = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
            return { ...item, stats: id ? (statsMap.get(id) || { views: 0, likes: 0 }) : { views: 0, likes: 0 } };
          })
          .filter(item => {
            const id = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
            return id && validIds.has(id);
          });
      }

      allVideos = allVideos.concat(items);
      currentPageToken = data.nextPageToken || '';
      renderVideos(allVideos, currentSort);
      loadMoreBtn.disabled = !currentPageToken;
      loadMoreBtn.textContent = currentPageToken ? 'Muat Lebih Banyak' : 'Semua Video Dimuat';
      loadMoreBtn.style.display = currentPageToken ? 'inline-block' : 'none';
    } catch (e) {
      videoGrid.innerHTML = `<div class="error-message">Gagal memuat video: ${e.message}. <a href="index.html">Coba lagi</a></div>`;
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Muat Lebih Banyak';
    }
  }

  function sortVideos(videos, sortType) {
    const sorted = [...videos];
    switch (sortType) {
      case 'title-asc':
        sorted.sort((a, b) => a.snippet.title.localeCompare(b.snippet.title));
        break;
      case 'title-desc':
        sorted.sort((a, b) => b.snippet.title.localeCompare(a.snippet.title));
        break;
      case 'date-asc':
        sorted.sort((a, b) => new Date(a.snippet.publishedAt) - new Date(b.snippet.publishedAt));
        break;
      case 'date-desc':
        sorted.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
        break;
      default:
        break;
    }
    return sorted;
  }

  function renderVideos(videos, sortType) {
    const sorted = sortVideos(videos, sortType);
    videoGrid.innerHTML = sorted.map(video => {
      const thumb = video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || '';
      const title = video.snippet.title;
      const channel = video.snippet.videoOwnerChannelTitle || video.snippet.channelTitle || '';
      const date = formatDate(video.snippet.publishedAt);
      const videoId = video.contentDetails?.videoId || video.snippet.resourceId?.videoId || '';
      const partLabel = extractPartLabel(title);
      const labels = extractLabels(title);
      const views = formatNumber(video.stats?.views);
      const likes = formatNumber(video.stats?.likes);

      return `
        <a href="video.html?v=${videoId}" class="video-card">
          <div class="thumb-wrapper">
            <img src="${thumb}" alt="${title}" loading="lazy">
            <div class="badges">
              ${partLabel ? `<span class="part-badge">${partLabel}</span>` : ''}
              ${labels.map(l => `<span class="${getLabelClass(l)}">${l}</span>`).join('')}
            </div>
          </div>
          <div class="video-card-body">
            <h3>${title}</h3>
            <p class="meta">${channel} &bull; ${date} &bull; ${views} views &bull; ${likes} likes</p>
          </div>
        </a>
      `;
    }).join('');

    if (sorted.length === 0) {
      videoGrid.innerHTML = '<div class="loading">Tidak ada video.</div>';
    }
  }

  await loadMoreVideos();

  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderVideos(allVideos, currentSort);
  });

  loadMoreBtn.addEventListener('click', loadMoreVideos);
}

async function initVideoPage() {
  const params = new URLSearchParams(window.location.search);
  const videoId = params.get('v');

  if (!videoId) {
    document.getElementById('videoTitle').textContent = 'Video tidak ditemukan.';
    return;
  }

  const player = document.getElementById('player');
  const videoWrapper = document.getElementById('videoWrapper');
  const videoTitle = document.getElementById('videoTitle');
  const videoDescription = document.getElementById('videoDescription');
  const relatedGrid = document.getElementById('relatedGrid');
  const descVideosGrid = document.getElementById('descVideosGrid');
  const downloadBtn = document.getElementById('downloadBtn');
  const descLinks = document.getElementById('descLinks');
  const downloadModal = document.getElementById('downloadModal');
  const modalConfirm = document.getElementById('modalConfirm');
  const modalCancel = document.getElementById('modalCancel');

  let downloadUrl = `https://www.y2mate.com/watch?v=${videoId}`;
  let currentTitle = '';
  let currentDesc = '';

  downloadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    downloadModal.classList.add('active');
  });

  modalConfirm.addEventListener('click', () => {
    downloadModal.classList.remove('active');
    window.open(downloadUrl, '_blank');
  });

  modalCancel.addEventListener('click', () => {
    downloadModal.classList.remove('active');
  });

  downloadModal.addEventListener('click', (e) => {
    if (e.target === downloadModal) {
      downloadModal.classList.remove('active');
    }
  });

  try {
    const data = await API.getVideos([videoId]);
    const video = data.items?.[0];

    if (video) {
      if (video.status?.privacyStatus === 'private' || video.status?.embeddable === false) {
        videoTitle.textContent = 'Video ini bersifat privat atau tidak dapat diputar.';
        videoDescription.textContent = '';
        downloadBtn.style.display = 'none';
        videoWrapper.style.display = 'none';
      } else {
        currentTitle = video.snippet.title;
        currentDesc = video.snippet.description || 'Tidak ada deskripsi.';
        videoTitle.textContent = currentTitle;
        videoDescription.textContent = currentDesc;
        player.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
        videoWrapper.style.display = 'block';
        setupShare(videoId, currentTitle);
      }
    } else {
      videoTitle.textContent = 'Video tidak ditemukan atau telah dihapus.';
      videoDescription.textContent = '';
      downloadBtn.style.display = 'none';
      videoWrapper.style.display = 'none';
    }
  } catch (e) {
    videoTitle.textContent = 'Gagal memuat detail video: ' + e.message;
    videoDescription.textContent = '';
    downloadBtn.style.display = 'none';
    videoWrapper.style.display = 'none';
    console.error(e);
  }

  const descText = currentDesc || videoDescription.textContent || '';
  const descIds = extractVideoIds(descText);
  const urls = extractUrls(descText);

  if (urls.length > 0) {
    descLinks.innerHTML = urls.map(url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`).join('');
  } else {
    descLinks.innerHTML = '';
  }

  async function loadRecent() {
    try {
      const data = await API.getChannelVideos(CONFIG.CHANNEL_ID, 10);
      const items = data.items || [];
      renderVideoCards(items, 'relatedGrid');
      if (items.length === 0) {
        document.getElementById('relatedGrid').innerHTML = '<div class="loading">Tidak ada video terbaru.</div>';
      }
    } catch (e) {
      document.getElementById('relatedGrid').innerHTML = `<div class="error-message">Gagal memuat video terbaru: ${e.message}</div>`;
    }
  }

  async function loadDescriptionVideos() {
    if (!descIds.length) {
      document.getElementById('descSection').style.display = 'none';
      return;
    }
    try {
      const data = await API.getVideos(descIds);
      const items = (data.items || []).filter(v => v.status?.privacyStatus !== 'private' && v.status?.embeddable !== false);
      renderVideoCards(items, 'descVideosGrid');
    } catch (e) {
      document.getElementById('descVideosGrid').innerHTML = `<div class="error-message">Gagal memuat video dari deskripsi: ${e.message}</div>`;
    }
  }

  await loadRecent();
  await loadDescriptionVideos();
}

const searchToggle = document.getElementById('searchToggle');
const searchOverlay = document.getElementById('searchOverlay');
const searchInput = document.getElementById('searchInput');
const searchClose = document.getElementById('searchClose');
const searchResults = document.getElementById('searchResults');

if (searchToggle && searchOverlay) {
  searchToggle.addEventListener('click', () => {
    searchOverlay.classList.add('active');
    searchInput.focus();
  });

  searchClose.addEventListener('click', () => {
    searchOverlay.classList.remove('active');
    searchInput.value = '';
    searchResults.innerHTML = '';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchOverlay.classList.remove('active');
      searchInput.value = '';
      searchResults.innerHTML = '';
    }
  });

  const performSearch = debounce(async (query) => {
    if (!query.trim()) {
      searchResults.innerHTML = '';
      return;
    }

    try {
      const data = await API.searchVideos(query, 8, CONFIG.CHANNEL_ID);
      const items = data.items || [];
      searchResults.innerHTML = items.map(item => {
        const thumb = item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '';
        const title = item.snippet.title;
        const channel = item.snippet.channelTitle || '';
        const date = formatDate(item.snippet.publishedAt);
        const id = item.id?.videoId || '';
        const partLabel = extractPartLabel(title);
        const labels = extractLabels(title);

        return `
          <a href="video.html?v=${id}" class="search-result-item">
            <div class="thumb-wrapper">
              <img src="${thumb}" alt="${title}">
              <div class="badges">
                ${partLabel ? `<span class="part-badge">${partLabel}</span>` : ''}
                ${labels.map(l => `<span class="${getLabelClass(l)}">${l}</span>`).join('')}
              </div>
            </div>
            <div class="search-result-info">
              <h4>${title}</h4>
              <p>${channel} &bull; ${date}</p>
            </div>
          </a>
        `;
      }).join('');

      if (items.length === 0) {
        searchResults.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px;">Tidak ada hasil.</p>';
      }
    } catch (e) {
      searchResults.innerHTML = `<p style="text-align:center;color:var(--text-secondary);padding:20px;">Gagal mencari: ${e.message}</p>`;
    }
  }, 300);

  searchInput.addEventListener('input', (e) => performSearch(e.target.value));
}
