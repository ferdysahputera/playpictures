let kasData = [];
let kasTerfilter = [];
let sortBy = '';
let sortDir = 'asc';

/* ---------- LOADING ---------- */
function setLoading(pct) {
    const bar = document.getElementById('loadingBar');
    const pctNum = document.getElementById('loadingPctNum');
    const p = Math.round(pct);
    if (bar) bar.style.width = p + '%';
    if (pctNum) pctNum.textContent = p + '%';
}

async function hideLoading() {
    const ov = document.getElementById('loadingOverlay');
    if (!ov) return;
    await new Promise(function(r) { setTimeout(r, 350); });
    ov.classList.add('hidden');
}

function isiTanggalCetak() {
    const el = document.getElementById('footerTanggal');
    if (!el) return;
    el.textContent = new Date().toLocaleString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

/* ---------- INIT ---------- */
document.addEventListener('DOMContentLoaded', async function() {
    isiTanggalCetak();

    let pct = 0;
    const iv = setInterval(function() {
        pct += Math.random() * 18;
        if (pct > 92) pct = 92;
        setLoading(pct);
    }, 120);

    try {
        const data = await Promise.race([
            fetchData(),
            new Promise(function(_, rej) { setTimeout(function() { rej(new Error('Timeout')); }, 15000); })
        ]);
        kasData = normalkanKas(Array.isArray(data.kas) ? data.kas : []);
    } catch (e) {
        console.error('Gagal memuat data kas:', e);
        kasData = [];
    }

    hitungSaldoBerjalan(kasData);

    setLoading(100);
    clearInterval(iv);
    await new Promise(function(r) { setTimeout(r, 120); });
    await hideLoading();

    pasangFilterKas();
    renderKas();
});

/* ---------- DATA ---------- */
function normalkanKas(kas) {
    return kas.map(function(k, index) {
        const jenisRaw = String(k.jenis || '').trim().toLowerCase();
        const jenis = jenisRaw.indexOf('keluar') !== -1 ? 'keluar' : 'masuk';
        const ket = String(k.keterangan == null ? '' : k.keterangan).trim();
        return {
            urutAsli: index,
            jenis: jenis,
            tanggal: k.tanggal,
            tanggalKey: tanggalKey(k.tanggal),
            jumlah: parseFloat(k.jumlah) || 0,
            keterangan: ket || '-'
        };
    }).sort(function(a, b) {
        if (a.tanggalKey !== b.tanggalKey) return a.tanggalKey < b.tanggalKey ? -1 : 1;
        return a.urutAsli - b.urutAsli;
    });
}

function hitungSaldoBerjalan(list) {
    let saldo = 0;
    list.forEach(function(k) {
        saldo += (k.jenis === 'masuk' ? k.jumlah : -k.jumlah);
        k.saldo = saldo;
    });
    return saldo;
}

function totalKas(list) {
    let masuk = 0, keluar = 0, jmlMasuk = 0, jmlKeluar = 0;
    list.forEach(function(k) {
        if (k.jenis === 'masuk') { masuk += k.jumlah; jmlMasuk += 1; }
        else { keluar += k.jumlah; jmlKeluar += 1; }
    });
    return { masuk: masuk, keluar: keluar, saldo: masuk - keluar, jmlMasuk: jmlMasuk, jmlKeluar: jmlKeluar };
}

/* ---------- FILTER ---------- */
function pasangFilterKas() {
    const elBulan = document.getElementById('filterKasBulan');
    const elJenis = document.getElementById('filterKasJenis');
    const elCari = document.getElementById('filterKasCari');
    if (elBulan) elBulan.addEventListener('change', renderKas);
    if (elJenis) elJenis.addEventListener('change', renderKas);
    if (elCari) elCari.addEventListener('input', renderKas);
}

function resetFilterKas() {
    const elBulan = document.getElementById('filterKasBulan');
    const elJenis = document.getElementById('filterKasJenis');
    const elCari = document.getElementById('filterKasCari');
    if (elBulan) elBulan.value = '';
    if (elJenis) elJenis.value = '';
    if (elCari) elCari.value = '';
    renderKas();
}

function ambilKasTerfilter() {
    const elBulan = document.getElementById('filterKasBulan');
    const elJenis = document.getElementById('filterKasJenis');
    const elCari = document.getElementById('filterKasCari');
    const bulan = elBulan ? elBulan.value : '';
    const jenis = elJenis ? elJenis.value : '';
    const cari = elCari ? elCari.value.trim().toLowerCase() : '';

    return kasData.filter(function(k) {
        if (bulan && k.tanggalKey.slice(0, 7) !== bulan) return false;
        if (jenis && k.jenis !== jenis) return false;
        if (cari && k.keterangan.toLowerCase().indexOf(cari) === -1) return false;
        return true;
    });
}

/* ---------- URUTKAN ---------- */
function urutkanKas(field) {
    if (sortBy === field) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
        sortBy = field;
        sortDir = 'desc';
    }
    renderKas();
}

function perbaruiIndikatorSort() {
    document.querySelectorAll('table.laporan-table thead th.sortable').forEach(function(th) {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.getAttribute('data-sort') === sortBy) {
            th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
}

/* ---------- RENDER ---------- */
function renderKas() {
    kasTerfilter = ambilKasTerfilter();
    const semua = totalKas(kasData);

    const elMasuk = document.getElementById('kasTotalMasuk');
    const elKeluar = document.getElementById('kasTotalKeluar');
    const elSaldo = document.getElementById('kasSaldo');
    const elJmlMasuk = document.getElementById('kasJumlahMasuk');
    const elJmlKeluar = document.getElementById('kasJumlahKeluar');
    const elJmlTransaksi = document.getElementById('kasJumlahTransaksi');

    if (elMasuk) elMasuk.textContent = formatRupiah(semua.masuk);
    if (elKeluar) elKeluar.textContent = formatRupiah(semua.keluar);
    if (elSaldo) elSaldo.textContent = formatRupiah(semua.saldo);
    if (elJmlMasuk) elJmlMasuk.textContent = semua.jmlMasuk + ' transaksi';
    if (elJmlKeluar) elJmlKeluar.textContent = semua.jmlKeluar + ' transaksi';
    if (elJmlTransaksi) elJmlTransaksi.textContent = kasData.length + ' transaksi';

    renderTabelKas();
    perbaruiIndikatorSort();
    renderPrintSummary();
}

function renderTabelKas() {
    const tbody = document.getElementById('tbodyKas');
    const emptyEl = document.getElementById('emptyKas');
    const wrap = document.querySelector('.laporan-table-wrap');
    const tfoot = document.getElementById('tfootKas');
    if (!tbody) return;

    const t = totalKas(kasTerfilter);
    const footMasuk = document.getElementById('footMasuk');
    const footKeluar = document.getElementById('footKeluar');
    const footSisa = document.getElementById('footSisa');
    if (footMasuk) footMasuk.textContent = formatRupiah(t.masuk);
    if (footKeluar) footKeluar.textContent = formatRupiah(t.keluar);
    if (footSisa) footSisa.textContent = (t.saldo < 0 ? '-' : '') + formatRupiah(Math.abs(t.saldo));

    tbody.innerHTML = '';

    if (kasData.length === 0) {
        if (wrap) wrap.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }
    if (wrap) wrap.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';

    if (kasTerfilter.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Tidak ada transaksi yang cocok dengan filter.</td></tr>';
        if (tfoot) tfoot.style.display = 'none';
        return;
    }
    if (tfoot) tfoot.style.display = '';

    const rows = kasTerfilter.slice();
    if (sortBy === 'masuk' || sortBy === 'keluar') {
        rows.sort(function(a, b) {
            const va = a.jenis === sortBy ? a.jumlah : 0;
            const vb = b.jenis === sortBy ? b.jumlah : 0;
            if (va !== vb) return sortDir === 'desc' ? vb - va : va - vb;
            return 0;
        });
    }

    rows.forEach(function(k) {
        const isMasuk = k.jenis === 'masuk';
        const row = document.createElement('tr');
        row.className = isMasuk ? 'row-masuk' : 'row-keluar';
        const selMasuk = isMasuk
            ? '<span class="nominal-masuk">+ ' + formatRupiah(k.jumlah) + '</span>'
            : '<span class="nominal-kosong">&ndash;</span>';
        const selKeluar = isMasuk
            ? '<span class="nominal-kosong">&ndash;</span>'
            : '<span class="nominal-keluar">&minus; ' + formatRupiah(k.jumlah) + '</span>';
        row.innerHTML =
            '<td>' + escapeHtml(formatTanggal(k.tanggal)) + '</td>' +
            '<td style="text-align:right;">' + selMasuk + '</td>' +
            '<td style="text-align:right;">' + selKeluar + '</td>' +
            '<td>' + escapeHtml(k.keterangan) + '</td>';
        tbody.appendChild(row);
    });
}

function renderPrintSummary() {
    const t = totalKas(kasTerfilter);
    const printMeta = document.getElementById('printMeta');
    if (printMeta) {
        printMeta.textContent = kasTerfilter.length + ' transaksi \u2022 Dicetak ' +
            new Date().toLocaleString('id-ID', {
                day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
    }
    const printSummary = document.getElementById('printSummary');
    if (printSummary) {
        printSummary.innerHTML =
            '<span>Masuk: <b>' + formatRupiah(t.masuk) + '</b></span>' +
            '<span>Keluar: <b>' + formatRupiah(t.keluar) + '</b></span>' +
            '<span>Selisih: <b>' + formatRupiah(t.saldo) + '</b></span>';
    }
}

/* ---------- CETAK ---------- */
function cetakKas() {
    const judulAsli = document.title;
    document.title = 'Kas-BedahRumah-' + new Date().toISOString().slice(0, 10);
    window.print();
    setTimeout(function() { document.title = judulAsli; }, 800);
}

/* ---------- UNDUH JPG ---------- */
function buatHolderKas() {
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px;background:#ffffff;padding:26px 28px;box-sizing:border-box;font-family:Inter,Segoe UI,sans-serif;color:#0b1220;';

    const headerEl = document.querySelector('.laporan-header');
    if (headerEl) {
        const headerClone = headerEl.cloneNode(true);
        headerClone.style.marginBottom = '16px';
        holder.appendChild(headerClone);
    }

    const stripEl = document.getElementById('stripTotal');
    if (stripEl && stripEl.innerHTML.trim() !== '') {
        const stripClone = stripEl.cloneNode(true);
        stripClone.style.marginBottom = '14px';
        holder.appendChild(stripClone);
    }

    const tableWrapEl = document.querySelector('.laporan-table-wrap');
    if (tableWrapEl) {
        const tableClone = tableWrapEl.cloneNode(true);
        tableClone.style.boxShadow = 'none';
        tableClone.style.overflow = 'visible';
        tableClone.style.marginTop = '0';
        holder.appendChild(tableClone);
    }

    const footerEl = document.getElementById('laporanFooter');
    if (footerEl) {
        const footerClone = footerEl.cloneNode(true);
        footerClone.style.marginTop = '16px';
        footerClone.style.marginBottom = '0';
        footerClone.querySelectorAll('.no-print').forEach(function(el) { el.remove(); });
        holder.appendChild(footerClone);
    }

    return holder;
}

function unduhJPGKas() {
    if (typeof html2canvas !== 'function') {
        alert('Library html2canvas belum termuat. Pastikan ada koneksi internet lalu muat ulang halaman.');
        return;
    }
    if (kasData.length === 0) {
        alert('Belum ada data kas untuk diunduh.');
        return;
    }

    const holder = buatHolderKas();
    document.body.appendChild(holder);
    html2canvas(holder, { backgroundColor: '#ffffff', scale: 2, useCORS: true })
        .then(function(canvas) {
            const link = document.createElement('a');
            link.download = 'Kas-BedahRumah-' + new Date().toISOString().slice(0, 10) + '.jpg';
            link.href = canvas.toDataURL('image/jpeg', 0.95);
            link.click();
        })
        .catch(function(err) {
            console.error(err);
            alert('Gagal membuat gambar JPG.');
        })
        .finally(function() {
            if (holder.parentNode) holder.parentNode.removeChild(holder);
        });
}
