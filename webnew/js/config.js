// Konfigurasi site.
// Isi SALAH SATU di bawah: PLAYLIST_ID  ATAU  CHANNEL_ID.
// 1) PLAYLIST_ID: ID playlist (dari URL youtube.com/playlist?list=PL...)
// 2) CHANNEL_ID : ID channel  -> otomatis pakai playlist "uploads" channel tsb
//
// MODE KONEKSI (pilih salah satu):
//  A) Proxy (aman, key tidak kelihatan):
//     - WORKER_URL = "http://localhost:3000" (lokal: jalankan `node server.js`)
//       atau URL Cloudflare Worker untuk production.
//     - YOUTUBE_API_KEY biarkan kosong.
//  B) Langsung ke YouTube (paling gampang untuk GitHub Pages, tanpa backend):
//     - WORKER_URL = ""  (kosong)
//     - YOUTUBE_API_KEY = "AIza..."  (key akan kelihatan di browser — risiko quota)
window.APP_CONFIG = {
  PLAYLIST_ID: "PL-FZtns4xgSElDgxA-146aX585xzalgbx", // ganti, atau biarkan jika pakai CHANNEL_ID
  CHANNEL_ID: "UC87Oi8WXRAI2ncAX7CoBT6w",          // ganti dengan ID channel (opsional)

  WORKER_URL: "https://yt-playlist-proxy.pages.dev/", // mode proxy. Kosongkan "" untuk mode langsung.
  YOUTUBE_API_KEY: "",                 // hanya untuk mode langsung (WORKER_URL = "").

  PAGE_SIZE: 24,
  CACHE_TTL_MS: 10 * 60 * 1000, // 10 menit
};
