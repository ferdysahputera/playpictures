const API_KEY = "AIzaSyDq4QPxumyDdxZB6ZlUciD7dsSA5ftQsQk";
const PLAYLIST_ID = "PL-FZtns4xgSElDgxA-146aX585xzalgbx";

const params = new URLSearchParams(window.location.search);
const videoId = params.get("v");

const playerEl = document.getElementById("player");
const titleEl = document.getElementById("video-title");
const dateEl = document.getElementById("video-date");
const descEl = document.getElementById("video-desc");
const errorEl = document.getElementById("error-message");
const playlistContainer = document.getElementById("playlist-videos");

if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
  errorEl.textContent = "ID video tidak valid.";
  errorEl.classList.add("visible");
} else {
  loadVideo(videoId);
}

async function loadVideo(id) {
  try {
    playerEl.innerHTML = `
      <iframe width="100%" height="480" src="https://www.youtube.com/embed/${id}" 
      frameborder="0" allowfullscreen></iframe>
    `;

    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP error " + res.status);
    const data = await res.json();
    const video = data.items[0].snippet;

    titleEl.textContent = video.title;
    dateEl.textContent = `Dipublikasikan pada: ${new Date(video.publishedAt).toLocaleDateString()}`;
    descEl.innerHTML = formatDescription(video.description || "Tidak ada deskripsi.");

    // Ambil semua videoId dari deskripsi
    const videoIdsInDesc = extractAllVideoIds(video.description);

    // Load playlist utama + video dari deskripsi gabungan
    loadCombinedPlaylist(videoIdsInDesc);

  } catch (err) {
    console.error(err);
    errorEl.textContent = "Gagal memuat video. Pastikan API Key dan ID benar.";
    errorEl.classList.add("visible");
  }
}

function formatDescription(text) {
  let formatted = text.replace(/\n/g, "<br>");

  // Ganti link youtube ke localhost/video.html?v=VIDEOID
  formatted = formatted.replace(
    /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/g,
    (match, vidId) => {
      return `<a href="./video.html?v=${vidId}">${match}</a>`;
    }
  );

  // Link lain tetap buka di tab baru
  formatted = formatted.replace(
    /(https?:\/\/[^\s<]+)/g,
    (match) => {
      if (/youtube\.com\/watch\?v=/.test(match)) return match; 
      return `<a href="${match}" target="_blank" rel="noopener noreferrer">${match}</a>`;
    }
  );

  return formatted;
}

function extractAllVideoIds(text) {
  if (!text) return [];
  const regex = /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/gi;
  const ids = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    ids.push(match[1]);
  }
  // Remove duplicates
  return [...new Set(ids)];
}

async function loadCombinedPlaylist(videoIdsFromDesc) {
  try {
    // Ambil playlist utama dulu
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${PLAYLIST_ID}&maxResults=20&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP error " + res.status);
    const data = await res.json();
    const playlistItems = data.items || [];

    // Filter video private dan buat array video dari playlist
    const playlistVideos = playlistItems
      .filter(item => item.snippet && item.snippet.title !== "Private video" && item.snippet.title !== "Video pribadi")
      .map(item => ({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumb: item.snippet.thumbnails?.default?.url || ""
      }));

    // Gabungkan video dari deskripsi yang belum ada di playlist
    const uniqueDescVideos = [];

    for (const vidId of videoIdsFromDesc) {
      if (!playlistVideos.some(v => v.videoId === vidId)) {
        // Ambil info video ini via API (judul, thumbnail)
        try {
          const vidRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${vidId}&key=${API_KEY}`);
          if (!vidRes.ok) continue;
          const vidData = await vidRes.json();
          if (!vidData.items.length) continue;
          const snippet = vidData.items[0].snippet;
          if (snippet.title === "Private video" || snippet.title === "Video pribadi") continue;
          uniqueDescVideos.push({
            videoId: vidId,
            title: snippet.title,
            thumb: snippet.thumbnails?.default?.url || ""
          });
        } catch {
          // Skip jika gagal ambil data video
          continue;
        }
      }
    }

    // Gabungkan semua video untuk tampil
    const allVideos = [...playlistVideos, ...uniqueDescVideos];

    // Kosongkan container dulu
    playlistContainer.innerHTML = "";

    // Render semua video
    allVideos.forEach(video => {
      const card = document.createElement("a");
      card.href = `video.html?v=${video.videoId}`;
      card.className = "small-card";
      card.innerHTML = `
        <img src="${video.thumb}" alt="Thumbnail ${video.title}" />
        <div>${video.title}</div>
      `;
      playlistContainer.appendChild(card);
    });

  } catch (error) {
    console.error("Gagal load playlist terkait:", error);
  }
}