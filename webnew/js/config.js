// Konfigurasi site.
// Isi SALAH SATU di bawah: PLAYLIST_ID  ATAU  CHANNEL_ID.
// 1) PLAYLIST_ID: ID playlist (dari URL youtube.com/playlist?list=PL...)
// 2) CHANNEL_ID : ID channel  -> otomatis pakai playlist "uploads" channel tsb
//
// MODE KONEKSI (pilih salah satu):
//  A) Proxy (aman, key tidak kelihatan):
//     - WORKER_URL = URL Cloudflare Worker / Pages Function
//     - YOUTUBE_API_KEY biarkan kosong.
//  B) Langsung ke YouTube (sama seperti situs utama Play Pictures):
//     - WORKER_URL = ""  (kosong)
//     - YOUTUBE_API_KEY = key YouTube Anda (sudah dipakai situs utama)
window.APP_CONFIG = {
  PLAYLIST_ID: "PL-FZtns4xgSElDgxA-146aX585xzalgbx",
  CHANNEL_ID: "UC87Oi8WXRAI2ncAX7CoBT6w",

  WORKER_URL: "", // mode langsung (sesuai situs utama). Isi URL proxy bila pakai Worker.
  YOUTUBE_API_KEY: "AIzaSyDq4QPxumyDdxZB6ZlUciD7dsSA5ftQsQk", // key situs utama (direct mode)

  PAGE_SIZE: 24,
  CACHE_TTL_MS: 10 * 60 * 1000, // 10 menit
};
