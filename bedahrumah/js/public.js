let chartKasKomposisi = null;
let chartKasSaldo = null;
let dataMasukPublik = { material: [], anggota: [] };
let bahanSelectTerinisialisasi = false;

document.addEventListener('DOMContentLoaded', async function() {
    const data = await fetchData();

    const anggota = Array.isArray(data.anggota) ? data.anggota : [];
    const rab = Array.isArray(data.rab) ? data.rab : [];
    const material = Array.isArray(data.material) ? data.material : [];
    const kas = Array.isArray(data.kas) ? data.kas : [];

    renderAnggota(anggota, rab, material);

    dataMasukPublik.material = material;
    dataMasukPublik.anggota = anggota;
    inisialisasiBarangMasuk();

    renderKas(kas);
});

/* ---------------- BARANG MASUK ---------------- */

function inisialisasiBarangMasuk() {
    const filterTanggal = document.getElementById('filterTanggalMasuk');
    if (filterTanggal) {
        filterTanggal.addEventListener('change', renderBarangMasuk);
    }
    const filterBahan = document.getElementById('filterBahanMasuk');
    if (filterBahan) {
        filterBahan.addEventListener('change', renderPenerimaBahan);
    }
    renderBarangMasuk();
    renderPenerimaBahan();
}

function resetFilterTanggalMasuk() {
    const filterTanggal = document.getElementById('filterTanggalMasuk');
    if (filterTanggal) filterTanggal.value = '';
    renderBarangMasuk();
}

function renderBarangMasuk() {
    const tbody = document.querySelector('#barangMasukTable tbody');
    const ringkasan = document.getElementById('ringkasanTanggalMasuk');
    if (!tbody) return;

    const filterEl = document.getElementById('filterTanggalMasuk');
    const filterTanggal = filterEl ? filterEl.value : '';
    const rows = barisBarangMasuk(dataMasukPublik.material, filterTanggal);
    tbody.innerHTML = '';

    const penerimaUnik = {};
    let totalNilai = 0;
    const jumlahPerTanggal = {};

    rows.forEach(function(r) {
        penerimaUnik[r.anggota] = true;
        totalNilai += r.nilai;
        jumlahPerTanggal[r.tanggalKey] = (jumlahPerTanggal[r.tanggalKey] || 0) + 1;
    });

    if (ringkasan) {
        const labelTanggal = filterTanggal ? formatTanggal(filterTanggal) : 'Semua tanggal';
        ringkasan.innerHTML = `
            <span class="ringkasan-chip">Tanggal <strong>${escapeHtml(labelTanggal)}</strong></span>
            <span class="ringkasan-chip">Pengiriman <strong>${rows.length}</strong></span>
            <span class="ringkasan-chip">Penerima <strong>${Object.keys(penerimaUnik).length}</strong></span>
            <span class="ringkasan-chip">Total nilai <strong>${formatRupiah(totalNilai)}</strong></span>
        `;
    }

    if (rows.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${filterTanggal ? 'Belum ada barang masuk pada tanggal ini.' : 'Belum ada data barang masuk.'}</td></tr>`;
        return;
    }

    let grupTanggal = null;
    let nomor = 0;

    rows.forEach(function(r) {
        if (r.tanggalKey !== grupTanggal) {
            grupTanggal = r.tanggalKey;
            const groupRow = document.createElement('tr');
            groupRow.className = 'date-group-row';
            groupRow.innerHTML = `<td colspan="7">${escapeHtml(formatTanggal(r.tanggal))} &middot; ${jumlahPerTanggal[grupTanggal] || 0} pengiriman</td>`;
            tbody.appendChild(groupRow);
        }
        nomor += 1;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${nomor}</td>
            <td>${escapeHtml(formatTanggal(r.tanggal))}</td>
            <td>${escapeHtml(r.namaMaterial)}</td>
            <td>${r.volume}</td>
            <td>${escapeHtml(r.satuan)}</td>
            <td>${escapeHtml(r.anggota)}</td>
            <td>${escapeHtml(r.keterangan)}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderPenerimaBahan() {
    const select = document.getElementById('filterBahanMasuk');
    const tbody = document.querySelector('#penerimaBahanTable tbody');
    const ringkasan = document.getElementById('ringkasanPenerimaBahan');
    if (!select || !tbody) return;

    const daftar = daftarNamaBahan(dataMasukPublik.material, []);
    const terpilih = select.value;
    select.innerHTML = '<option value="">-- Pilih Bahan --</option>';
    daftar.forEach(function(nama) {
        const opt = document.createElement('option');
        opt.value = nama;
        opt.textContent = nama;
        select.appendChild(opt);
    });

    if (!bahanSelectTerinisialisasi && daftar.length > 0) {
        select.value = daftar[0];
        bahanSelectTerinisialisasi = true;
    } else if (terpilih && daftar.indexOf(terpilih) !== -1) {
        select.value = terpilih;
    }

    const namaBahan = select.value;
    tbody.innerHTML = '';

    if (!namaBahan) {
        if (ringkasan) ringkasan.innerHTML = '';
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Pilih satu bahan untuk melihat anggota yang sudah menerima.</td></tr>';
        return;
    }

    const penerima = kelompokkanPenerimaBahan(dataMasukPublik.material, namaBahan);
    const totalVolume = penerima.reduce(function(total, p) { return total + p.volume; }, 0);
    const totalKiriman = penerima.reduce(function(total, p) { return total + p.kiriman; }, 0);
    const satuan = penerima.length > 0 ? (penerima[0].satuan || '-') : '-';

    if (ringkasan) {
        ringkasan.innerHTML = `
            <span class="ringkasan-chip">Bahan <strong>${escapeHtml(namaBahan)}</strong></span>
            <span class="ringkasan-chip">Total diterima <strong>${totalVolume} ${escapeHtml(satuan)}</strong></span>
            <span class="ringkasan-chip">Anggota <strong>${penerima.length}</strong></span>
            <span class="ringkasan-chip">Pengiriman <strong>${totalKiriman}</strong></span>
        `;
    }

    if (penerima.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Belum ada anggota yang menerima bahan ini.</td></tr>';
        return;
    }

    penerima.forEach(function(p, index) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHtml(p.anggota)}</td>
            <td><strong>${p.volume}</strong></td>
            <td>${escapeHtml(p.satuan || '-')}</td>
            <td>${p.kiriman}</td>
            <td>${p.terakhir ? escapeHtml(formatTanggal(p.terakhir)) : '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

/* ---------------- KARTU ANGGOTA ---------------- */

function renderAnggota(anggota, rab, material) {
    const grid = document.getElementById('membersGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (anggota.length === 0) {
        grid.innerHTML = '<p class="empty-state">Belum ada data anggota. Silakan login admin untuk menambahkan anggota.</p>';
        return;
    }

    const urut = anggota.slice().sort(function(a, b) {
        return (parseInt(a.noUrut) || 0) - (parseInt(b.noUrut) || 0);
    });

    urut.forEach(function(a) {
        const nama = String(a.nama || '-');
        const nilaiRab = totalNilai(rab.filter(function(r) {
            return String(r.anggota || '').trim() === nama.trim();
        }));
        const nilaiMasuk = totalNilai(material.filter(function(m) {
            return String(m.anggota || '').trim() === nama.trim();
        }));
        const persen = nilaiRab > 0 ? Math.min(100, (nilaiMasuk / nilaiRab) * 100) : 0;

        const card = document.createElement('a');
        card.href = 'detail.html?anggota=' + encodeURIComponent(nama);
        card.className = 'member-card';
        card.innerHTML = `
            <div class="member-top">
                <div class="member-avatar">${inisial(nama)}</div>
                <div>
                    <h3 style="margin:0;" title="${escapeHtml(nama)}">${escapeHtml(namaSingkat(nama))}</h3>
                    <p style="margin:0;font-size:0.85rem;">Anggota #${a.noUrut || '-'}</p>
                </div>
            </div>
            <div class="progress-line"><span style="width:${persen.toFixed(1)}%"></span></div>
            <div class="member-meta">
                <span>Realisasi ${persen.toFixed(0)}%</span>
                <span>${formatRupiah(nilaiMasuk)}</span>
            </div>
            <p style="font-size:0.8rem;color:var(--text-secondary);">RAB ${formatRupiah(nilaiRab)}</p>
        `;
        grid.appendChild(card);
    });
}

function totalNilai(rows) {
    return rows.reduce(function(total, r) {
        const volume = parseFloat(r.volume) || 0;
        const harga = parseFloat(r.hargaSatuan) || 0;
        return total + (volume * harga);
    }, 0);
}

function inisial(nama) {
    const parts = String(nama || '?').trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* ---------------- KAS ---------------- */

function urutkanKas(kas) {
    return kas.slice().sort(function(a, b) {
        const ka = tanggalKey(a.tanggal);
        const kb = tanggalKey(b.tanggal);
        if (ka !== kb) return ka.localeCompare(kb);
        return (parseFloat(a.jumlah) || 0) - (parseFloat(b.jumlah) || 0);
    });
}

function renderKas(kas) {
    const urut = urutkanKas(kas);

    let masuk = 0;
    let keluar = 0;

    urut.forEach(function(k) {
        const jumlah = parseFloat(k.jumlah) || 0;
        if (k.jenis === 'masuk') masuk += jumlah;
        else if (k.jenis === 'keluar') keluar += jumlah;
    });

    const saldo = masuk - keluar;

    const totalMasukEl = document.getElementById('totalMasuk');
    const totalKeluarEl = document.getElementById('totalKeluar');
    const saldoEl = document.getElementById('saldo');
    const saldoTableEl = document.getElementById('saldoTable');
    const jumlahEl = document.getElementById('jumlahTransaksi');

    if (totalMasukEl) totalMasukEl.textContent = formatRupiah(masuk);
    if (totalKeluarEl) totalKeluarEl.textContent = formatRupiah(keluar);
    if (saldoEl) saldoEl.textContent = formatRupiah(saldo);
    if (saldoTableEl) saldoTableEl.textContent = formatRupiah(saldo);
    if (jumlahEl) jumlahEl.textContent = urut.length + ' transaksi';

    const tbody = document.querySelector('#kasTable tbody');
    if (tbody) {
        tbody.innerHTML = '';

        if (urut.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);">Belum ada transaksi kas.</td></tr>';
        }

        urut.forEach(function(k, index) {
            const jumlah = parseFloat(k.jumlah) || 0;
            const isMasuk = k.jenis === 'masuk';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${formatTanggal(k.tanggal)}</td>
                <td><span class="tag ${isMasuk ? 'tag-ok' : 'tag-warn'}">${isMasuk ? 'Kas Masuk' : 'Kas Keluar'}</span></td>
                <td style="font-weight:600;color:${isMasuk ? '#166534' : '#991b1b'};">${isMasuk ? '+' : '-'} ${formatRupiah(jumlah)}</td>
                <td>${k.keterangan || '-'}</td>
            `;
            tbody.appendChild(row);
        });
    }

    gambarGrafikKas(urut, masuk, keluar);
}

function gambarGrafikKas(kas, masuk, keluar) {
    if (typeof Chart === 'undefined') return;

    if (chartKasKomposisi) {
        chartKasKomposisi.destroy();
        chartKasKomposisi = null;
    }
    if (chartKasSaldo) {
        chartKasSaldo.destroy();
        chartKasSaldo = null;
    }

    const canvasKomposisi = document.getElementById('chartKasKomposisi');
    if (canvasKomposisi) {
        chartKasKomposisi = new Chart(canvasKomposisi.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Kas Masuk', 'Kas Keluar'],
                datasets: [{
                    data: [Math.round(masuk), Math.round(keluar)],
                    backgroundColor: ['rgba(34, 197, 94, 0.85)', 'rgba(239, 68, 68, 0.8)'],
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

    const canvasSaldo = document.getElementById('chartKasSaldo');
    if (!canvasSaldo) return;

    const labels = [];
    const dataSaldo = [];
    let berjalan = 0;

    kas.forEach(function(k) {
        const jumlah = parseFloat(k.jumlah) || 0;
        berjalan += (k.jenis === 'masuk' ? jumlah : -jumlah);
        labels.push(formatTanggal(k.tanggal));
        dataSaldo.push(Math.round(berjalan));
    });

    if (labels.length === 0) {
        labels.push('-');
        dataSaldo.push(0);
    }

    chartKasSaldo = new Chart(canvasSaldo.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Saldo Kas',
                data: dataSaldo,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.14)',
                fill: true,
                tension: 0.35,
                borderWidth: 2.5,
                pointRadius: 3,
                pointBackgroundColor: '#1d4ed8',
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return 'Saldo: ' + formatRupiah(ctx.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#475569', font: { size: 10 }, maxRotation: 0, autoSkip: true }
                },
                y: {
                    grid: { color: 'rgba(148, 163, 184, 0.22)' },
                    ticks: {
                        color: '#475569',
                        font: { size: 10 },
                        callback: function(value) {
                            return formatRupiah(value);
                        }
                    }
                }
            }
        }
    });
}

/* ---------------- UTIL ---------------- */
