const SPREADSHEET_URL = "https://script.google.com/macros/s/AKfycbyWLT8o7vWvc8IhdIekaHUzCvpotl5c19y45fbIeQYL9SUpk9Q8Y9f6jOTwVOAUVL3v/exec";

const ADMIN_CREDENTIALS = {
    username: "ketua",
    password: "bedahrumah123"
};

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka || 0);
}

function escapeHtml(nilai) {
    return String(nilai == null ? '' : nilai)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function kunciTanggalLokal(d) {
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

function tanggalKey(tanggal) {
    if (!tanggal) return '';
    if (tanggal instanceof Date) {
        if (isNaN(tanggal.getTime())) return '';
        return kunciTanggalLokal(tanggal);
    }
    const teks = String(tanggal).trim();
    if (!teks) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(teks)) return teks;
    const tanpaZona = teks.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
    if (tanpaZona && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(teks)) {
        return tanpaZona[1] + '-' + tanpaZona[2] + '-' + tanpaZona[3];
    }
    const lokal = teks.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (lokal) {
        return lokal[3] + '-' + lokal[2].padStart(2, '0') + '-' + lokal[1].padStart(2, '0');
    }
    const d = new Date(teks);
    if (isNaN(d.getTime())) return '';
    return kunciTanggalLokal(d);
}

function tanggalHariIni() {
    return kunciTanggalLokal(new Date());
}

function formatTanggal(tanggal) {
    const key = tanggalKey(tanggal);
    if (!key) return tanggal ? String(tanggal) : '-';
    const bagian = key.split('-');
    const d = new Date(Number(bagian[0]), Number(bagian[1]) - 1, Number(bagian[2]));
    if (isNaN(d.getTime())) return key;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daftarNamaBahan(material, masterMaterial) {
    const set = new Set();
    (material || []).forEach(function(m) {
        const nama = String(m.namaMaterial || '').trim();
        if (nama) set.add(nama);
    });
    (masterMaterial || []).forEach(function(m) {
        const nama = String(m.namaMaterial || '').trim();
        if (nama) set.add(nama);
    });
    return Array.from(set).sort(function(a, b) {
        return a.localeCompare(b, 'id');
    });
}

function barisBarangMasuk(material, filterTanggal) {
    return (material || []).map(function(m) {
        const volume = parseFloat(m.volume) || 0;
        const harga = parseFloat(m.hargaSatuan) || 0;
        return {
            tanggalKey: tanggalKey(m.tanggal),
            tanggal: m.tanggal,
            namaMaterial: String(m.namaMaterial || '-').trim() || '-',
            volume: volume,
            satuan: String(m.satuan || '-').trim() || '-',
            anggota: String(m.anggota || '-').trim() || '-',
            keterangan: String(m.keterangan || '-').trim() || '-',
            nilai: volume * harga
        };
    }).filter(function(row) {
        if (!filterTanggal) return true;
        return row.tanggalKey === filterTanggal;
    }).sort(function(a, b) {
        const ta = a.tanggalKey || '';
        const tb = b.tanggalKey || '';
        if (ta !== tb) return tb.localeCompare(ta);
        return a.namaMaterial.localeCompare(b.namaMaterial, 'id');
    });
}

function kelompokkanPenerimaBahan(material, namaBahan) {
    const target = String(namaBahan || '').trim().toLowerCase();
    const map = {};
    (material || []).forEach(function(m) {
        if (String(m.namaMaterial || '').trim().toLowerCase() !== target) return;
        const anggota = String(m.anggota || '-').trim() || '-';
        if (!map[anggota]) {
            map[anggota] = { anggota: anggota, volume: 0, satuan: '', kiriman: 0, terakhir: '' };
        }
        map[anggota].volume += parseFloat(m.volume) || 0;
        if (!map[anggota].satuan && m.satuan) map[anggota].satuan = m.satuan;
        map[anggota].kiriman += 1;
        const tgl = tanggalKey(m.tanggal);
        if (tgl && (!map[anggota].terakhir || tgl > map[anggota].terakhir)) {
            map[anggota].terakhir = tgl;
        }
    });
    return Object.keys(map).map(function(k) {
        return map[k];
    }).sort(function(a, b) {
        return a.anggota.localeCompare(b.anggota, 'id');
    });
}

function namaSingkat(nama) {
    let teks = String(nama || '-').trim();
    const gelar = /^(bapak|bpk|pak|ibu|bu|h\.?|hj\.?|drs\.?|dra\.?|dr\.?|ust\.?|ustadz|ustadzah)\s+/i;
    while (gelar.test(teks)) {
        teks = teks.replace(gelar, '').trim();
    }
    const bagian = teks.split(/\s+/).filter(Boolean);
    if (bagian.length > 2) teks = bagian.slice(0, 2).join(' ');
    if (teks.length > 22) teks = teks.slice(0, 21).trim() + '…';
    return teks || String(nama || '-');
}

/* ============ GALERI & GOOGLE DRIVE ============ */

const DRIVE_API_KEY = 'AIzaSyCg5tQGPz3LFlipqI6Lcd1Tk6UiVUwmV7s'; // Isi dengan Google Drive API Key (opsional, untuk load otomatis dari folder Drive)

// Satu folder Drive untuk semua anggota (fallback jika anggota tidak ada di mapping di bawah).
const DRIVE_FOLDER_ID = '';

// Mapping ID anggota (No Urut) -> ID folder Drive masing-masing.
// Buat folder di Google Drive, nama folder bebas, lalu isi ID-nya di sini sesuai No Urut anggota.
// Contoh untuk 15 anggota:
// const DRIVE_FOLDER_BY_URUT = {
//   '1': 'idFolderAnggota1',
//   '2': 'idFolderAnggota2',
//   ...
//   '15': 'idFolderAnggota15'
// };
const DRIVE_FOLDER_BY_URUT = {'1': '1G2noVVKy9QoeMDT_Q_fV7Oo3v2IgsVfO',
 '2': '1gPwF2KOdbWM9WYzwpMbwabj99OHQI_KY',
 '3': '1KTJQbG03vcNwQOWRdi0T6wUOXYln94KB',
 '4': '1xOUu5-xuX4qcqVTANWZxgbBKxqVZWYSD',
 '5': '1p0ozHB-gcfH5ovXXsxdTZT1-MO80ViZr',
 '6': 'dLTGdJLXCMscVM2-ePf9X5uUlpiI8uXR',
 '7': '1N-wr3dkMDltLgNViR3CW7FgOz1HNCih3',
 '8': '1qPKnZY8cqCaMHaKYKOnjNWCX74agVcwi',
 '9': '1Q2r-eO1iJ4mIHqNx9-qhv2iuG261JZJk',
 '10': '1W0NetHgLHk0VOFuY8pw5GCNBGP4j2z4C',
 '11': '10lNriHHYQdONuO7Va0jpDUIYsnN_GphK',
 '12': '1kiAHfg71G0n1k7wxdJhbQTaZWhxBpKaG',
 '13': '1We4OBRoPLGBTrVmyqcR8pZe_S0eQy5yX',
 '14': '1AMaIzkWWfwJpCiZFMFb8Kc1mCsUjUWA6',
 '15': '1lL11Un-7nE4VEICZiJUlnLDvjTKgR4u7'          

};

// Cache hasil resolusi folder.
const _folderCacheByUrut = {};

function getDriveFolderForMember(noUrut) {
    if (noUrut == null) return DRIVE_FOLDER_ID || '';
    const key = String(noUrut).trim();
    if (_folderCacheByUrut[key]) return _folderCacheByUrut[key];
    const manual = DRIVE_FOLDER_BY_URUT && DRIVE_FOLDER_BY_URUT[key];
    if (manual) {
        _folderCacheByUrut[key] = manual;
        return manual;
    }
    return DRIVE_FOLDER_ID || '';
}

function driveImageUrl(fileId) {
    return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w800';
}

function driveThumbnailUrl(fileId, size) {
    size = size || 'w400';
    return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=' + size;
}

function driveFullSizeUrl(url) {
    if (!url) return url;
    const m = String(url).match(/[?&]id=([A-Za-z0-9_-]+)/);
    if (m) {
        return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w2048';
    }
    return url;
}

/* ============ LIGHTBOX FULL FOTO ============ */
function bukaGaleriLightbox(src, caption) {
    const lb = document.getElementById('galeriLightbox');
    const img = document.getElementById('galeriLightboxImg');
    const cap = document.getElementById('galeriLightboxCaption');
    if (img) img.src = src;
    if (cap) cap.textContent = caption || '';
    if (lb) lb.style.display = 'flex';
}

function tutupGaleriLightbox() {
    const lb = document.getElementById('galeriLightbox');
    const img = document.getElementById('galeriLightboxImg');
    if (lb) lb.style.display = 'none';
    if (img) img.src = '';
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') tutupGaleriLightbox();
});

function listDriveImages(folderId, apiKey) {
    if (!apiKey || !folderId) return Promise.resolve([]);
    const url = 'https://www.googleapis.com/drive/v3/files?' +
        'key=' + encodeURIComponent(apiKey) +
        '&q=' + encodeURIComponent("'" + folderId + "' in parents and trashed = false") +
        '&fields=files(id,name,mimeType,createdTime)' +
        '&orderBy=createdTime desc';
    return fetch(url).then(function(res) {
        if (!res.ok) {
            console.warn('Drive API gagal (status ' + res.status + ') untuk folder ' + folderId + '. Pastikan Drive API diaktifkan dan API key tidak dibatasi referrer.');
            return { files: [] };
        }
        return res.json();
    }).then(function(data) {
        return (data.files || []).filter(function(f) {
            return /image\//.test(f.mimeType || '');
        }).map(function(f) {
            return {
                id: f.id,
                nama: f.name,
                url: driveImageUrl(f.id),
                thumb: driveThumbnailUrl(f.id, 'w400'),
                tanggal: f.createdTime || ''
            };
        });
    }).catch(function(err) {
        console.error('Gagal memuat daftar foto Drive:', err);
        return [];
    });
}

function ensureLoadingOverlay() {
    if (document.getElementById('loadingOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.innerHTML = `
        <div class="loader-box">
            <div class="spinner"></div>
            <p id="loadingText">MENYIMPAN DATA</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

function showLoading(text = 'MENYIMPAN DATA') {
    ensureLoadingOverlay();
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    if (loadingText) loadingText.textContent = text.toUpperCase();
    if (overlay) {
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
}

function fetchData() {
    return new Promise((resolve) => {
        const callbackName = 'jsonpCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        window[callbackName] = function(data) {
            resolve(data || { anggota: [], rab: [], material: [], kas: [], masterMaterial: [] });
            if (script && script.parentNode) script.parentNode.removeChild(script);
            delete window[callbackName];
        };
        const script = document.createElement('script');
        script.src = SPREADSHEET_URL + '?action=getAll&callback=' + callbackName;
        script.onerror = function() {
            console.error('Error fetching data');
            resolve({ anggota: [], rab: [], material: [], kas: [], masterMaterial: [] });
            if (script && script.parentNode) script.parentNode.removeChild(script);
            delete window[callbackName];
        };
        document.body.appendChild(script);
    });
}

async function postData(action, payload, loadingText = 'MENYIMPAN DATA') {
    try {
        showLoading(loadingText);
        const formData = new FormData();
        formData.append('action', action);
        formData.append('data', JSON.stringify(payload));
        
        const response = await fetch(SPREADSHEET_URL, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        hideLoading();
        return result;
    } catch (error) {
        console.error('Error posting data:', error);
        hideLoading();
        alert('Gagal menyimpan data.');
        return { success: false };
    }
}

document.addEventListener('DOMContentLoaded', ensureLoadingOverlay);

/* ============ CACHE LOKAL (localStorage) ============ */

const STORAGE_KEY = 'bedahrumah_data_v1';
const STORAGE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 jam

function simpanDataLokal(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, disimpan: Date.now() }));
    } catch (e) {
        console.warn('Gagal menyimpan ke localStorage:', e);
    }
}

function muatDataLokal() {
    try {
        const teks = localStorage.getItem(STORAGE_KEY);
        if (!teks) return null;
        const simpan = JSON.parse(teks);
        if (!simpan || !simpan.data) return null;
        if (Date.now() - simpan.disimpan > STORAGE_MAX_AGE) return null;
        return simpan.data;
    } catch (e) {
        return null;
    }
}
