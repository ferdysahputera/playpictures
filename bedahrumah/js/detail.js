let chartProgress = null;
let chartNilai = null;

document.addEventListener('DOMContentLoaded', async function() {
    const params = new URLSearchParams(window.location.search);
    const namaAnggota = params.get('anggota');

    if (!namaAnggota) {
        window.location.href = 'index.html';
        return;
    }

    const namaEl = document.getElementById('namaAnggota');
    if (namaEl) namaEl.textContent = namaAnggota;

    const data = await fetchData();
    const daftarAnggota = Array.isArray(data.anggota) ? data.anggota : [];
    const anggota = daftarAnggota.find(function(a) {
        return String(a.nama || '').trim().toLowerCase() === String(namaAnggota).trim().toLowerCase();
    });

    const noUrut = anggota ? anggota.noUrut : '';
    const badge = document.getElementById('badgeAnggota');
    if (badge) badge.textContent = 'Anggota #' + (noUrut || '-');

    tampilkanFotoRab(noUrut);

    const rabAnggota = (Array.isArray(data.rab) ? data.rab : []).filter(function(r) {
        return String(r.anggota || '').trim() === String(namaAnggota).trim();
    });

    const materialAnggota = (Array.isArray(data.material) ? data.material : []).filter(function(m) {
        return String(m.anggota || '').trim() === String(namaAnggota).trim();
    });

    renderRAB(rabAnggota);
    renderMaterial(materialAnggota);
    renderSisa(rabAnggota, materialAnggota);
});

/* ---------------- FOTO RAB FISIK ---------------- */

function tampilkanFotoRab(noUrut) {
    const img = document.getElementById('fotoRabImg');
    const empty = document.getElementById('fotoRabEmpty');
    const status = document.getElementById('fotoStatus');

    if (!img || !empty) return;

    const n = parseInt(noUrut);
    if (isNaN(n)) {
        empty.textContent = 'Nomor urut anggota tidak ditemukan.';
        if (status) status.textContent = 'Foto tidak tersedia';
        return;
    }

    const nomor = n < 10 ? '0' + n : String(n);
    const daftarExt = ['jpg', 'jpeg', 'png', 'webp'];
    const daftarNama = [nomor, String(n)];
    let iNama = 0;
    let idx = 0;

    function cobaBerikutnya() {
        if (iNama >= daftarNama.length) {
            img.style.display = 'none';
            empty.style.display = 'block';
            empty.textContent = 'Belum ada foto RAB untuk anggota ini.';
            if (status) {
                status.textContent = 'Belum ada foto';
                status.className = 'tag tag-warn';
            }
            return;
        }
        if (idx >= daftarExt.length) {
            iNama++;
            idx = 0;
            cobaBerikutnya();
            return;
        }
        const src = 'images/rab/' + daftarNama[iNama] + '.' + daftarExt[idx] + '?v=' + Date.now();
        idx++;
        const tester = new Image();
        tester.onload = function() {
            img.src = src;
            img.style.display = 'block';
            empty.style.display = 'none';
            if (status) {
                status.textContent = 'Foto tersedia';
                status.className = 'tag tag-ok';
            }
        };
        tester.onerror = cobaBerikutnya;
        tester.src = src;
    }

    cobaBerikutnya();
}

/* ---------------- TABEL RAB ---------------- */

function renderRAB(rabAnggota) {
    const tbody = document.querySelector('#rabTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let total = 0;

    if (rabAnggota.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);">Belum ada data RAB.</td></tr>';
    }

    rabAnggota.forEach(function(r, index) {
        const volume = parseFloat(r.volume) || 0;
        const harga = parseFloat(r.hargaSatuan) || 0;
        const jumlah = volume * harga;
        total += jumlah;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${r.uraian || '-'}</td>
            <td>${volume}</td>
            <td>${r.satuan || '-'}</td>
            <td>${formatRupiah(harga)}</td>
            <td>${formatRupiah(jumlah)}</td>
        `;
        tbody.appendChild(row);
    });

    const totalEl = document.getElementById('totalRabTable');
    if (totalEl) totalEl.textContent = formatRupiah(total);
    const statEl = document.getElementById('totalRAB');
    if (statEl) statEl.textContent = formatRupiah(total);
    const itemEl = document.getElementById('jumlahItemRAB');
    if (itemEl) itemEl.textContent = rabAnggota.length + ' item bahan';
}

/* ---------------- TABEL MATERIAL MASUK ---------------- */

function renderMaterial(materialAnggota) {
    const tbody = document.querySelector('#materialTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let total = 0;

    if (materialAnggota.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-secondary);">Belum ada material yang masuk.</td></tr>';
    }

    materialAnggota.forEach(function(m, index) {
        const volume = parseFloat(m.volume) || 0;
        const harga = parseFloat(m.hargaSatuan) || 0;
        const jumlah = volume * harga;
        total += jumlah;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${formatTanggal(m.tanggal)}</td>
            <td>${m.namaMaterial || '-'}</td>
            <td>${volume}</td>
            <td>${m.satuan || '-'}</td>
            <td>${formatRupiah(harga)}</td>
            <td>${formatRupiah(jumlah)}</td>
            <td>${m.keterangan || '-'}</td>
        `;
        tbody.appendChild(row);
    });

    const totalEl = document.getElementById('totalMaterialTable');
    if (totalEl) totalEl.textContent = formatRupiah(total);
    const statEl = document.getElementById('totalMaterial');
    if (statEl) statEl.textContent = formatRupiah(total);
    const itemEl = document.getElementById('jumlahItemMaterial');
    if (itemEl) itemEl.textContent = materialAnggota.length + ' pengiriman';
}

/* ---------------- SISA BAHAN ---------------- */

function hitungSisa(rabAnggota, materialAnggota) {
    const map = {};

    rabAnggota.forEach(function(r) {
        const key = String(r.uraian || '-').toLowerCase().trim();
        const volume = parseFloat(r.volume) || 0;
        const harga = parseFloat(r.hargaSatuan) || 0;
        const satuan = r.satuan || '-';

        if (!map[key]) {
            map[key] = {
                nama: r.uraian || '-',
                volRab: 0,
                volMasuk: 0,
                satuan: satuan,
                harga: harga
            };
        }

        map[key].volRab += volume;
        if (harga > 0) map[key].harga = harga;
        if (satuan && satuan !== '-') map[key].satuan = satuan;
    });

    materialAnggota.forEach(function(m) {
        const key = String(m.namaMaterial || '-').toLowerCase().trim();
        const volume = parseFloat(m.volume) || 0;
        const harga = parseFloat(m.hargaSatuan) || 0;
        const satuan = m.satuan || '-';

        if (map[key]) {
            map[key].volMasuk += volume;
            if (harga > 0 && map[key].harga === 0) map[key].harga = harga;
            if (satuan && satuan !== '-' && map[key].satuan === '-') map[key].satuan = satuan;
        }
    });

    return Object.keys(map).map(function(k) {
        return map[k];
    }).sort(function(a, b) {
        return a.nama.localeCompare(b.nama, 'id');
    });
}

function renderSisa(rabAnggota, materialAnggota) {
    const tbody = document.querySelector('#sisaTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const list = hitungSisa(rabAnggota, materialAnggota);
    let totalRab = 0;
    let totalMasuk = 0;
    let totalNilaiSisa = 0;
    let jumlahKurang = 0;

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-secondary);">Belum ada data RAB.</td></tr>';
    }

    list.forEach(function(item, index) {
        const sisa = item.volRab - item.volMasuk;
        const sisaFix = sisa < 0 ? 0 : sisa;
        const nilaiRab = item.volRab * (item.harga || 0);
        const nilaiMasuk = Math.min(item.volMasuk, item.volRab) * (item.harga || 0);
        const nilaiSisa = sisaFix * (item.harga || 0);

        totalRab += nilaiRab;
        totalMasuk += nilaiMasuk;
        totalNilaiSisa += nilaiSisa;
        if (sisaFix > 0) jumlahKurang++;

        const status = sisaFix <= 0
            ? '<span class="tag tag-ok">Lengkap</span>'
            : '<span class="tag tag-warn">Kurang ' + sisaFix + ' ' + (item.satuan || '') + '</span>';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.nama}</td>
            <td>${item.volRab}</td>
            <td>${item.volMasuk}</td>
            <td><strong>${sisaFix}</strong></td>
            <td>${item.satuan}</td>
            <td>${formatRupiah(nilaiSisa)}</td>
            <td>${status}</td>
        `;
        tbody.appendChild(row);
    });

    const nilaiSisaTotal = Math.max(0, totalRab - totalMasuk);
    const persen = totalRab > 0 ? Math.min(100, (totalMasuk / totalRab) * 100) : 0;

    const totalSisaTableEl = document.getElementById('totalSisaTable');
    if (totalSisaTableEl) totalSisaTableEl.textContent = formatRupiah(totalNilaiSisa);

    const sisaEl = document.getElementById('nilaiSisa');
    if (sisaEl) sisaEl.textContent = formatRupiah(nilaiSisaTotal);
    const jumlahSisaEl = document.getElementById('jumlahSisa');
    if (jumlahSisaEl) jumlahSisaEl.textContent = jumlahKurang + ' bahan kurang';
    const progresEl = document.getElementById('progresNilai');
    if (progresEl) progresEl.textContent = persen.toFixed(1) + '%';
    const barEl = document.getElementById('progresBar');
    if (barEl) barEl.style.width = persen.toFixed(1) + '%';

    gambarGrafik(list, totalMasuk, nilaiSisaTotal);
}

/* ---------------- GRAFIK ---------------- */

function potongLabel(teks, maks) {
    const t = String(teks || '-');
    return t.length > maks ? t.slice(0, maks - 1) + '…' : t;
}

function gambarGrafik(list, nilaiMasuk, nilaiSisa) {
    if (typeof Chart === 'undefined') return;

    if (chartProgress) {
        chartProgress.destroy();
        chartProgress = null;
    }
    if (chartNilai) {
        chartNilai.destroy();
        chartNilai = null;
    }

    const canvasProgress = document.getElementById('chartProgress');
    const canvasNilai = document.getElementById('chartNilai');

    if (canvasProgress && list.length > 0) {
        const boxProgress = canvasProgress.parentElement;
        if (boxProgress) {
            boxProgress.style.height = Math.max(240, Math.min(640, list.length * 34 + 50)) + 'px';
        }

        const labels = list.map(function(i) { return potongLabel(i.nama, 22); });
        const dataPersen = list.map(function(i) {
            if (i.volRab <= 0) return 0;
            return Math.min(100, Math.round((i.volMasuk / i.volRab) * 1000) / 10);
        });
        const warna = dataPersen.map(function(p) {
            if (p >= 100) return 'rgba(34, 197, 94, 0.85)';
            if (p >= 50) return 'rgba(37, 99, 235, 0.85)';
            if (p > 0) return 'rgba(245, 158, 11, 0.9)';
            return 'rgba(239, 68, 68, 0.85)';
        });

        chartProgress = new Chart(canvasProgress.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Realisasi (%)',
                    data: dataPersen,
                    backgroundColor: warna,
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 16,
                    categoryPercentage: 0.85,
                    barPercentage: 0.9
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 700 },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                const item = list[ctx.dataIndex];
                                return 'Masuk ' + item.volMasuk + ' / ' + item.volRab + ' ' + item.satuan + ' (' + ctx.parsed.x + '%)';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        min: 0,
                        max: 100,
                        grid: { color: 'rgba(148, 163, 184, 0.22)' },
                        ticks: {
                            callback: function(v) { return v + '%'; },
                            color: '#475569',
                            font: { size: 11 }
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#1e293b', font: { size: 11 } }
                    }
                }
            }
        });
    }

    if (canvasNilai) {
        chartNilai = new Chart(canvasNilai.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Nilai Material Masuk', 'Nilai Belum Diterima'],
                datasets: [{
                    data: [Math.round(nilaiMasuk), Math.round(nilaiSisa)],
                    backgroundColor: ['rgba(34, 197, 94, 0.85)', 'rgba(239, 68, 68, 0.75)'],
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#475569',
                            font: { size: 11 },
                            boxWidth: 12,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return ctx.label + ': ' + formatRupiah(ctx.parsed);
                            }
                        }
                    }
                }
            }
        });
    }
}

/* ---------------- UTIL ---------------- */

function formatTanggal(tanggal) {
    if (!tanggal) return '-';
    const d = new Date(tanggal);
    if (isNaN(d.getTime())) return String(tanggal);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
