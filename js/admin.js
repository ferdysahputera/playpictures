if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
    window.location.href = 'login.html';
}

let globalData = { anggota: [], rab: [], material: [], kas: [], masterMaterial: [] };

document.addEventListener('DOMContentLoaded', async function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            sessionStorage.removeItem('adminLoggedIn');
            window.location.href = 'login.html';
        });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const rabTgl = document.getElementById('rabTanggal');
    const matTgl = document.getElementById('matTanggal');
    const kasTgl = document.getElementById('kasTanggal');
    if (rabTgl) rabTgl.value = today;
    if (matTgl) matTgl.value = today;
    if (kasTgl) kasTgl.value = today;
    
    const selectMaster = document.getElementById('selectMasterMaterial');
    if (selectMaster) {
        selectMaster.addEventListener('change', isiDariMaster);
    }
    
    const selectMasterRab = document.getElementById('selectMasterForRab');
    if (selectMasterRab) {
        selectMasterRab.addEventListener('change', isiDariMasterRab);
    }
    
    const rabAnggotaSelect = document.getElementById('rabAnggota');
    if (rabAnggotaSelect) {
        rabAnggotaSelect.addEventListener('change', function() {
            renderRAB();
        });
    }
    
    const matAnggotaSelect = document.getElementById('matAnggota');
    if (matAnggotaSelect) {
        matAnggotaSelect.addEventListener('change', function() {
            renderMaterial();
        });
    }
    
    const rabWrap = document.getElementById('rabTableWrap');
    const rabInfo = document.getElementById('rabInfoPilih');
    if (rabWrap) rabWrap.style.display = 'none';
    if (rabInfo) rabInfo.style.display = 'block';
    const rabTotal = document.getElementById('totalRabInput');
    if (rabTotal) rabTotal.textContent = formatRupiah(0);
    
    const rabSisaWrap = document.getElementById('rabSisaWrap');
    if (rabSisaWrap) rabSisaWrap.style.display = 'none';
    
    const matWrap = document.getElementById('matTableWrap');
    const matInfo = document.getElementById('matInfoPilih');
    if (matWrap) matWrap.style.display = 'none';
    if (matInfo) matInfo.style.display = 'block';
    const matTotal = document.getElementById('totalMatInput');
    if (matTotal) matTotal.textContent = formatRupiah(0);
    
    await loadData();
});

async function loadData() {
    globalData = await fetchData();
    if (!globalData.anggota) globalData.anggota = [];
    if (!globalData.rab) globalData.rab = [];
    if (!globalData.material) globalData.material = [];
    if (!globalData.kas) globalData.kas = [];
    if (!globalData.masterMaterial) globalData.masterMaterial = [];
    renderAnggota();
    renderSelectAnggota();
    renderMasterMaterial();
    renderSelectMasterMaterial();
    renderSelectMasterForRab();
    renderRAB();
    renderMaterial();
    renderKas();
    renderRekapSisa();
}

function renderAnggota() {
    const tbody = document.querySelector('#anggotaTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (globalData.anggota && globalData.anggota.length > 0) {
        const sorted = [...globalData.anggota].sort((a, b) => {
            const na = parseInt(a.noUrut) || 0;
            const nb = parseInt(b.noUrut) || 0;
            return na - nb;
        });
        sorted.forEach((a) => {
            const namaSafe = String(a.nama || '').replace(/'/g, "\\'");
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${a.noUrut || '-'}</td>
                <td>${a.nama || '-'}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-primary" onclick="bukaEditAnggota('${namaSafe}', '${a.noUrut || ''}')">Edit</button>
                        <button class="btn btn-danger" onclick="hapusAnggota('${namaSafe}')">Hapus</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

function renderSelectAnggota() {
    const selects = ['rabAnggota', 'matAnggota'];
    selects.forEach(selId => {
        const select = document.getElementById(selId);
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">-- Pilih Anggota --</option>';
        if (globalData.anggota && globalData.anggota.length > 0) {
            const sorted = [...globalData.anggota].sort((a, b) => {
                const na = parseInt(a.noUrut) || 0;
                const nb = parseInt(b.noUrut) || 0;
                return na - nb;
            });
            sorted.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.nama;
                opt.textContent = a.nama;
                select.appendChild(opt);
            });
        }
        if (current) select.value = current;
    });
}

async function tambahAnggota() {
    const namaInput = document.getElementById('namaAnggotaInput');
    const noUrutInput = document.getElementById('noUrutAnggota');
    const nama = namaInput.value.trim();
    const noUrut = noUrutInput.value;
    
    if (!nama || !noUrut) {
        alert('Nama dan No. Urut wajib diisi');
        return;
    }
    
    const res = await postData('addAnggota', { nama, noUrut: parseInt(noUrut) }, 'MENAMBAH ANGGOTA');
    if (res && res.success) {
        if (namaInput) namaInput.value = '';
        if (noUrutInput) noUrutInput.value = '';
        await loadData();
    }
}

function bukaEditAnggota(nama, noUrut) {
    document.getElementById('editAnggotaOldNama').value = nama;
    document.getElementById('editAnggotaNama').value = nama;
    document.getElementById('editAnggotaNo').value = noUrut;
    const modal = document.getElementById('editAnggotaModal');
    if (modal) modal.classList.add('active');
}

function closeEditAnggota() {
    const modal = document.getElementById('editAnggotaModal');
    if (modal) modal.classList.remove('active');
}

async function simpanEditAnggota() {
    const oldNama = document.getElementById('editAnggotaOldNama').value;
    const nama = document.getElementById('editAnggotaNama').value.trim();
    const noUrut = document.getElementById('editAnggotaNo').value;
    
    if (!nama || !noUrut) {
        alert('Nama dan No. Urut wajib diisi');
        return;
    }
    
    const res = await postData('editAnggota', { oldNama, nama, noUrut: parseInt(noUrut) }, 'MENYIMPAN PERUBAHAN');
    if (res && res.success) {
        closeEditAnggota();
        await loadData();
    } else {
        alert('Gagal mengedit anggota');
    }
}

async function hapusAnggota(nama) {
    if (!confirm('Hapus anggota ' + nama + '?')) return;
    await postData('deleteAnggota', { nama }, 'MENGHAPUS ANGGOTA');
    await loadData();
}

async function tambahMasterMaterial() {
    const namaInput = document.getElementById('masterNama');
    const satuanInput = document.getElementById('masterSatuan');
    const hargaInput = document.getElementById('masterHarga');
    
    const namaMaterial = namaInput.value.trim();
    const satuan = satuanInput.value.trim();
    const hargaSatuan = hargaInput.value;
    
    if (!namaMaterial || !satuan || !hargaSatuan) {
        alert('Nama material, satuan, dan harga wajib diisi');
        return;
    }
    
    const res = await postData('addMasterMaterial', { namaMaterial, satuan, hargaSatuan: parseFloat(hargaSatuan) }, 'MENAMBAH MASTER MATERIAL');
    if (res && res.success) {
        if (namaInput) namaInput.value = '';
        if (satuanInput) satuanInput.value = '';
        if (hargaInput) hargaInput.value = '';
        await loadData();
    }
}

function renderMasterMaterial() {
    const tbody = document.querySelector('#masterMaterialTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (globalData.masterMaterial && globalData.masterMaterial.length > 0) {
        globalData.masterMaterial.forEach((m) => {
            const namaSafe = String(m.namaMaterial || '').replace(/'/g, "\\'");
            const harga = parseFloat(m.hargaSatuan) || 0;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${m.namaMaterial || '-'}</td>
                <td>${m.satuan || '-'}</td>
                <td>${formatRupiah(harga)}</td>
                <td><button class="btn btn-danger" onclick="hapusMasterMaterial('${namaSafe}')">Hapus</button></td>
            `;
            tbody.appendChild(row);
        });
    }
}

async function hapusMasterMaterial(namaMaterial) {
    if (!confirm('Hapus ' + namaMaterial + ' dari master material?')) return;
    await postData('deleteMasterMaterial', { namaMaterial }, 'MENGHAPUS MASTER MATERIAL');
    await loadData();
}

function renderSelectMasterMaterial() {
    const select = document.getElementById('selectMasterMaterial');
    if (!select) return;
    select.innerHTML = '<option value="">-- Pilih dari Master Material --</option>';
    if (globalData.masterMaterial && globalData.masterMaterial.length > 0) {
        globalData.masterMaterial.forEach((m) => {
            const harga = parseFloat(m.hargaSatuan) || 0;
            const opt = document.createElement('option');
            opt.value = m.namaMaterial;
            opt.setAttribute('data-satuan', m.satuan || '');
            opt.setAttribute('data-harga', harga);
            opt.textContent = (m.namaMaterial || '-') + ' (' + (m.satuan || '-') + ' - ' + formatRupiah(harga) + ')';
            select.appendChild(opt);
        });
    }
}

function renderSelectMasterForRab() {
    const select = document.getElementById('selectMasterForRab');
    if (!select) return;
    select.innerHTML = '<option value="">-- Pilih dari Master Material --</option>';
    if (globalData.masterMaterial && globalData.masterMaterial.length > 0) {
        globalData.masterMaterial.forEach((m) => {
            const harga = parseFloat(m.hargaSatuan) || 0;
            const opt = document.createElement('option');
            opt.value = m.namaMaterial;
            opt.setAttribute('data-satuan', m.satuan || '');
            opt.setAttribute('data-harga', harga);
            opt.textContent = (m.namaMaterial || '-') + ' (' + (m.satuan || '-') + ' - ' + formatRupiah(harga) + ')';
            select.appendChild(opt);
        });
    }
}

function isiDariMaster() {
    const select = document.getElementById('selectMasterMaterial');
    const namaMat = document.getElementById('matNama');
    const satuan = document.getElementById('matSatuan');
    const harga = document.getElementById('matHarga');
    
    if (!select || select.value === '') {
        if (namaMat) namaMat.value = '';
        if (satuan) satuan.value = '';
        if (harga) harga.value = '';
        return;
    }
    
    const opt = select.options[select.selectedIndex];
    if (namaMat) namaMat.value = select.value;
    if (satuan) satuan.value = opt.getAttribute('data-satuan') || '';
    if (harga) harga.value = opt.getAttribute('data-harga') || '';
}

function isiDariMasterRab() {
    const select = document.getElementById('selectMasterForRab');
    const uraian = document.getElementById('rabUraian');
    const satuan = document.getElementById('rabSatuan');
    const harga = document.getElementById('rabHarga');
    
    if (!select || select.value === '') {
        if (uraian) uraian.value = '';
        if (satuan) satuan.value = '';
        if (harga) harga.value = '';
        return;
    }
    
    const opt = select.options[select.selectedIndex];
    if (uraian) uraian.value = select.value;
    if (satuan) satuan.value = opt.getAttribute('data-satuan') || '';
    if (harga) harga.value = opt.getAttribute('data-harga') || '';
}

function resetFormRAB() {
    document.getElementById('rabUraian').value = '';
    document.getElementById('rabVolume').value = '';
    document.getElementById('rabSatuan').value = '';
    document.getElementById('rabHarga').value = '';
    const selectMaster = document.getElementById('selectMasterForRab');
    if (selectMaster) selectMaster.value = '';
}

function resetFormMaterial() {
    document.getElementById('matVolume').value = '';
    document.getElementById('matKeterangan').value = '';
    const selectMaster = document.getElementById('selectMasterMaterial');
    if (selectMaster) selectMaster.value = '';
    document.getElementById('matNama').value = '';
    document.getElementById('matSatuan').value = '';
    document.getElementById('matHarga').value = '';
}

async function tambahRAB() {
    const anggota = document.getElementById('rabAnggota').value;
    const tanggal = document.getElementById('rabTanggal').value;
    const uraian = document.getElementById('rabUraian').value.trim();
    const volume = document.getElementById('rabVolume').value;
    const satuan = document.getElementById('rabSatuan').value.trim();
    const hargaSatuan = document.getElementById('rabHarga').value;
    
    if (!anggota) {
        alert('Pilih anggota terlebih dahulu');
        return;
    }
    if (!uraian || !volume || !hargaSatuan) {
        alert('Pilih material dari master dan lengkapi data RAB');
        return;
    }
    
    const jumlah = parseFloat(volume) * parseFloat(hargaSatuan);
    const res = await postData('addRAB', { anggota, tanggal, uraian, volume, satuan, hargaSatuan, jumlah }, 'MENAMBAH RAB');
    if (res && res.success) {
        resetFormRAB();
        await loadData();
        const sel = document.getElementById('rabAnggota');
        if (sel) sel.value = anggota;
        renderRAB();
    }
}

function renderRAB() {
    const tbody = document.querySelector('#rabInputTable tbody');
    const totalEl = document.getElementById('totalRabInput');
    const selectedAnggota = document.getElementById('rabAnggota').value;
    const wrap = document.getElementById('rabTableWrap');
    const info = document.getElementById('rabInfoPilih');
    const sisaWrap = document.getElementById('rabSisaWrap');
    
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!selectedAnggota) {
        if (wrap) wrap.style.display = 'none';
        if (info) info.style.display = 'block';
        if (sisaWrap) sisaWrap.style.display = 'none';
        if (totalEl) totalEl.textContent = formatRupiah(0);
        tampilkanFotoRab('');
        renderRekapSisa();
        return;
    }
    
    if (wrap) wrap.style.display = 'block';
    if (info) info.style.display = 'none';
    tampilkanFotoRab(selectedAnggota);
    const printRabNama = document.getElementById('printRabNama');
    if (printRabNama) printRabNama.textContent = selectedAnggota;
    const printRabTanggal = document.getElementById('printRabTanggal');
    if (printRabTanggal) printRabTanggal.textContent = formatTanggalCetak();
    const printSisaNama = document.getElementById('printSisaNama');
    if (printSisaNama) printSisaNama.textContent = selectedAnggota;
    const printSisaTanggal = document.getElementById('printSisaTanggal');
    if (printSisaTanggal) printSisaTanggal.textContent = formatTanggalCetak();
    
    let totalJumlah = 0;
    let nomorUrutBahan = 0;
    if (globalData.rab && globalData.rab.length > 0) {
        globalData.rab.forEach((r) => {
            if (String(r.anggota).trim() !== String(selectedAnggota).trim()) return;
            const volume = parseFloat(r.volume) || 0;
            const hargaSatuan = parseFloat(r.hargaSatuan) || 0;
            const jumlah = volume * hargaSatuan;
            totalJumlah += jumlah;
            nomorUrutBahan += 1;
            const uraianSafe = String(r.uraian || '').replace(/'/g, "\\'");
            const anggotaSafe = String(r.anggota || '').replace(/'/g, "\\'");
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${nomorUrutBahan}</td>
                <td>${r.uraian || '-'}</td>
                <td>${volume}</td>
                <td>${r.satuan || '-'}</td>
                <td>${formatRupiah(hargaSatuan)}</td>
                <td>${formatRupiah(jumlah)}</td>
                <td><button class="btn btn-danger" onclick="hapusRAB('${uraianSafe}', '${anggotaSafe}')">Hapus</button></td>
            `;
            tbody.appendChild(row);
        });
    }
    
    if (totalEl) totalEl.textContent = formatRupiah(totalJumlah);
    renderRekapSisaPerAnggota(selectedAnggota);
    renderRekapSisa();
}

function renderRekapSisaPerAnggota(namaAnggota) {
    const wrap = document.getElementById('rabSisaWrap');
    const namaEl = document.getElementById('namaAnggotaRabSisa');
    const tbody = document.querySelector('#rabSisaTable tbody');
    
    if (!wrap || !tbody) return;
    
    if (!namaAnggota) {
        wrap.style.display = 'none';
        return;
    }
    
    wrap.style.display = 'block';
    if (namaEl) namaEl.textContent = namaAnggota;
    tbody.innerHTML = '';
    
    const map = {};
    let nomorUrutBahan = 0;
    
    if (globalData.rab && globalData.rab.length > 0) {
        globalData.rab.forEach(r => {
            if (String(r.anggota).trim() !== String(namaAnggota).trim()) return;
            const key = (r.uraian || '-').toLowerCase().trim();
            const volRab = parseFloat(r.volume) || 0;
            const harga = parseFloat(r.hargaSatuan) || 0;
            const satuan = r.satuan || '-';
            if (!map[key]) {
                nomorUrutBahan += 1;
                map[key] = {
                    material: r.uraian || '-',
                    urutan: nomorUrutBahan,
                    volRab: 0,
                    volMasuk: 0,
                    satuan: satuan,
                    harga: harga
                };
            }
            map[key].volRab += volRab;
            if (harga > 0) map[key].harga = harga;
            if (satuan && satuan !== '-') map[key].satuan = satuan;
        });
    }
    
    if (globalData.material && globalData.material.length > 0) {
        globalData.material.forEach(m => {
            if (String(m.anggota).trim() !== String(namaAnggota).trim()) return;
            const key = (m.namaMaterial || '-').toLowerCase().trim();
            const volMasuk = parseFloat(m.volume) || 0;
            const harga = parseFloat(m.hargaSatuan) || 0;
            const satuan = m.satuan || '-';
            if (map[key]) {
                map[key].volMasuk += volMasuk;
                if (harga > 0 && map[key].harga === 0) map[key].harga = harga;
                if (satuan && satuan !== '-' && map[key].satuan === '-') map[key].satuan = satuan;
            }
        });
    }
    
    const list = Object.values(map).sort((a,b) => {
        if (a.material < b.material) return -1;
        if (a.material > b.material) return 1;
        return 0;
    });
    
    if (list.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="9" style="text-align:center; color:var(--text-secondary);">Belum ada data RAB untuk anggota ini</td>`;
        tbody.appendChild(row);
        return;
    }
    
    list.forEach((item, idx) => {
        const sisa = item.volRab - item.volMasuk;
        const sisaFix = sisa < 0 ? 0 : sisa;
        const nilaiSisa = sisaFix * (item.harga || 0);
        const row = document.createElement('tr');
        let statusHtml = '';
        if (sisaFix <= 0) {
            statusHtml = '<span class="badge-lengkap">Sudah Terpenuhi</span>';
        } else {
            statusHtml = '<span class="badge-sisa">Masih Kurang</span>';
        }
        row.innerHTML = `
            <td>${idx + 1}</td>
            <td>${item.material}</td>
            <td>${item.volRab}</td>
            <td>${item.volMasuk}</td>
            <td><strong>${sisaFix}</strong></td>
            <td>${item.satuan}</td>
            <td>${formatRupiah(item.harga || 0)}</td>
            <td>${formatRupiah(nilaiSisa)}</td>
            <td>${statusHtml}</td>
        `;
        tbody.appendChild(row);
    });
}

async function hapusRAB(uraian, anggota) {
    if (!confirm('Hapus item RAB ini?')) return;
    await postData('deleteRAB', { uraian, anggota }, 'MENGHAPUS RAB');
    await loadData();
    const sel = document.getElementById('rabAnggota');
    if (sel) sel.value = anggota;
    renderRAB();
}

async function tambahMaterial() {
    const anggota = document.getElementById('matAnggota').value;
    const tanggal = document.getElementById('matTanggal').value;
    const namaMaterial = document.getElementById('matNama').value.trim();
    const volume = document.getElementById('matVolume').value;
    const satuan = document.getElementById('matSatuan').value.trim();
    const hargaSatuan = document.getElementById('matHarga').value;
    const keterangan = document.getElementById('matKeterangan').value.trim();
    
    if (!anggota) {
        alert('Pilih anggota terlebih dahulu');
        return;
    }
    if (!namaMaterial || !volume || !hargaSatuan) {
        alert('Pilih material dari master dan isi volume masuk');
        return;
    }
    
    const jumlah = parseFloat(volume) * parseFloat(hargaSatuan);
    const res = await postData('addMaterial', { anggota, tanggal, namaMaterial, volume, satuan, hargaSatuan, keterangan, jumlah }, 'MENAMBAH MATERIAL MASUK');
    if (res && res.success) {
        resetFormMaterial();
        await loadData();
        const sel = document.getElementById('matAnggota');
        if (sel) sel.value = anggota;
        renderMaterial();
    }
}

function renderMaterial() {
    const tbody = document.querySelector('#matInputTable tbody');
    const totalEl = document.getElementById('totalMatInput');
    const selectedAnggota = document.getElementById('matAnggota').value;
    const wrap = document.getElementById('matTableWrap');
    const info = document.getElementById('matInfoPilih');
    
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!selectedAnggota) {
        if (wrap) wrap.style.display = 'none';
        if (info) info.style.display = 'block';
        if (totalEl) totalEl.textContent = formatRupiah(0);
        renderRekapSisa();
        return;
    }
    
    if (wrap) wrap.style.display = 'block';
    if (info) info.style.display = 'none';
    
    let totalJumlah = 0;
    let nomorMaterial = 0;
    if (globalData.material && globalData.material.length > 0) {
        globalData.material.forEach((m) => {
            if (String(m.anggota).trim() !== String(selectedAnggota).trim()) return;
            const volume = parseFloat(m.volume) || 0;
            const hargaSatuan = parseFloat(m.hargaSatuan) || 0;
            const jumlah = volume * hargaSatuan;
            totalJumlah += jumlah;
            nomorMaterial += 1;
            const namaMatSafe = String(m.namaMaterial || '').replace(/'/g, "\\'");
            const anggotaSafe = String(m.anggota || '').replace(/'/g, "\\'");
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${nomorMaterial}</td>
                <td>${m.tanggal || '-'}</td>
                <td>${m.namaMaterial || '-'}</td>
                <td>${volume}</td>
                <td>${m.satuan || '-'}</td>
                <td>${formatRupiah(hargaSatuan)}</td>
                <td>${formatRupiah(jumlah)}</td>
                <td>${m.keterangan || '-'}</td>
                <td><button class="btn btn-danger" onclick="hapusMaterial('${namaMatSafe}', '${anggotaSafe}')">Hapus</button></td>
            `;
            tbody.appendChild(row);
        });
    }
    
    if (totalEl) totalEl.textContent = formatRupiah(totalJumlah);
    renderRekapSisa();
}

async function hapusMaterial(namaMaterial, anggota) {
    if (!confirm('Hapus material masuk ini?')) return;
    await postData('deleteMaterial', { namaMaterial, anggota }, 'MENGHAPUS MATERIAL');
    await loadData();
    const sel = document.getElementById('matAnggota');
    if (sel) sel.value = anggota;
    renderMaterial();
}

function renderRekapSisa() {
    const tbody = document.querySelector('#rekapSisaTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!globalData.rab || globalData.rab.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="10" style="text-align:center; color:var(--text-secondary);">Belum ada data RAB. Silakan input RAB per anggota terlebih dahulu.</td>`;
        tbody.appendChild(row);
        return;
    }
    
    const map = {};
    
    globalData.rab.forEach(r => {
        const key = (r.anggota || '-') + '||' + (r.uraian || '-').toLowerCase().trim();
        const volRab = parseFloat(r.volume) || 0;
        const harga = parseFloat(r.hargaSatuan) || 0;
        const satuan = r.satuan || '-';
        if (!map[key]) {
            map[key] = {
                anggota: r.anggota || '-',
                material: r.uraian || '-',
                volRab: 0,
                volMasuk: 0,
                satuan: satuan,
                harga: harga
            };
        }
        map[key].volRab += volRab;
        if (harga > 0) map[key].harga = harga;
        if (satuan && satuan !== '-') map[key].satuan = satuan;
    });
    
    if (globalData.material && globalData.material.length > 0) {
        globalData.material.forEach(m => {
            const key = (m.anggota || '-') + '||' + (m.namaMaterial || '-').toLowerCase().trim();
            const volMasuk = parseFloat(m.volume) || 0;
            const harga = parseFloat(m.hargaSatuan) || 0;
            const satuan = m.satuan || '-';
            if (map[key]) {
                map[key].volMasuk += volMasuk;
                if (harga > 0 && map[key].harga === 0) map[key].harga = harga;
                if (satuan && satuan !== '-' && map[key].satuan === '-') map[key].satuan = satuan;
            }
        });
    }
    
    const list = Object.values(map).sort((a,b) => {
        if (a.anggota < b.anggota) return -1;
        if (a.anggota > b.anggota) return 1;
        if (a.material < b.material) return -1;
        if (a.material > b.material) return 1;
        return 0;
    });
    
    if (list.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="10" style="text-align:center; color:var(--text-secondary);">Tidak ada data untuk direkap</td>`;
        tbody.appendChild(row);
        return;
    }
    
    list.forEach((item, idx) => {
        const sisa = item.volRab - item.volMasuk;
        const sisaFix = sisa < 0 ? 0 : sisa;
        const nilaiSisa = sisaFix * (item.harga || 0);
        const row = document.createElement('tr');
        let statusHtml = '';
        if (sisaFix <= 0) {
            statusHtml = '<span class="badge-lengkap">Sudah Terpenuhi</span>';
        } else {
            statusHtml = '<span class="badge-sisa">Masih Kurang</span>';
        }
        row.innerHTML = `
            <td>${idx + 1}</td>
            <td>${item.anggota}</td>
            <td>${item.material}</td>
            <td>${item.volRab}</td>
            <td>${item.volMasuk}</td>
            <td><strong>${sisaFix}</strong></td>
            <td>${item.satuan}</td>
            <td>${formatRupiah(item.harga || 0)}</td>
            <td>${formatRupiah(nilaiSisa)}</td>
            <td>${statusHtml}</td>
        `;
        tbody.appendChild(row);
    });
}

async function tambahKas() {
    const jenis = document.getElementById('kasJenis').value;
    const tanggal = document.getElementById('kasTanggal').value;
    const jumlah = document.getElementById('kasJumlah').value;
    const keterangan = document.getElementById('kasKeterangan').value.trim();
    
    if (!jumlah) {
        alert('Jumlah wajib diisi');
        return;
    }
    
    const res = await postData('addKas', { jenis, tanggal, jumlah: parseFloat(jumlah), keterangan }, 'MENAMBAH TRANSAKSI KAS');
    if (res && res.success) {
        document.getElementById('kasJumlah').value = '';
        document.getElementById('kasKeterangan').value = '';
        await loadData();
    }
}

function renderKas() {
    const tbody = document.querySelector('#kasTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let masuk = 0, keluar = 0;
    if (globalData.kas && globalData.kas.length > 0) {
        globalData.kas.forEach((k) => {
            const jumlah = parseFloat(k.jumlah) || 0;
            if (k.jenis === 'masuk') masuk += jumlah;
            if (k.jenis === 'keluar') keluar += jumlah;
            const tanggalSafe = String(k.tanggal || '').replace(/'/g, "\\'");
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${k.tanggal || '-'}</td>
                <td>${k.jenis === 'masuk' ? 'Kas Masuk' : 'Kas Keluar'}</td>
                <td>${formatRupiah(jumlah)}</td>
                <td>${k.keterangan || '-'}</td>
                <td><button class="btn btn-danger" onclick="hapusKas('${tanggalSafe}', '${k.jenis}', '${k.jumlah}')">Hapus</button></td>
            `;
            tbody.appendChild(row);
        });
    }
    
    const saldoEl = document.getElementById('kasSaldoAdmin');
    if (saldoEl) saldoEl.textContent = formatRupiah(masuk - keluar);
}

async function hapusKas(tanggal, jenis, jumlah) {
    if (!confirm('Hapus transaksi kas ini?')) return;
    await postData('deleteKas', { tanggal, jenis, jumlah }, 'MENGHAPUS TRANSAKSI KAS');
    await loadData();
}

async function syncData() {
    await loadData();
}

/* ============ FOTO RAB FISIK ============ */

function getAnggotaByNama(nama) {
    if (!globalData.anggota) return null;
    return globalData.anggota.find(a => String(a.nama || '').trim() === String(nama || '').trim()) || null;
}

function formatNoUrut(no) {
    const n = parseInt(no);
    if (isNaN(n)) return null;
    return n < 10 ? '0' + n : String(n);
}

function tampilkanFotoRab(namaAnggota) {
    const wrap = document.getElementById('fotoRabWrap');
    const img = document.getElementById('fotoRabImg');
    const empty = document.getElementById('fotoRabEmpty');
    if (!wrap || !img || !empty) return;
    
    if (!namaAnggota) {
        wrap.classList.remove('active');
        img.classList.add('hidden');
        img.removeAttribute('src');
        return;
    }
    
    wrap.classList.add('active');
    
    const anggota = getAnggotaByNama(namaAnggota);
    const noUrut = anggota ? formatNoUrut(anggota.noUrut) : null;
    
    if (!noUrut) {
        img.classList.add('hidden');
        empty.style.display = 'block';
        empty.textContent = 'Nomor urut anggota tidak ditemukan.';
        return;
    }
    
    const daftarExt = ['jpg', 'jpeg', 'png', 'webp'];
    const daftarNama = [noUrut, String(parseInt(anggota.noUrut) || '')];
    let iNama = 0;
    let idx = 0;
    
    img.classList.add('hidden');
    empty.style.display = 'block';
    empty.textContent = 'Memuat foto RAB...';
    
    function cobaBerikutnya() {
        if (iNama >= daftarNama.length) {
            empty.style.display = 'block';
            empty.innerHTML = 'Belum ada foto untuk anggota ini.<br>Simpan file di <strong>images/rab/' + noUrut + '.jpg</strong> (atau .png/.jpeg)';
            return;
        }
        if (idx >= daftarExt.length) {
            iNama++;
            idx = 0;
            cobaBerikutnya();
            return;
        }
        const src = '../images/rab/' + daftarNama[iNama] + '.' + daftarExt[idx] + '?v=' + Date.now();
        idx++;
        const tester = new Image();
        tester.onload = function() {
            img.src = src;
            img.classList.remove('hidden');
            empty.style.display = 'none';
        };
        tester.onerror = cobaBerikutnya;
        tester.src = src;
    }
    
    cobaBerikutnya();
}

/* ============ CETAK PDF / JPG ============ */

function formatTanggalCetak() {
    return new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getAnggotaAktif() {
    const sel = document.getElementById('rabAnggota');
    return sel ? sel.value : '';
}

function cloneTableUntukCetak(tableId, opsi) {
    opsi = opsi || {};
    const table = document.getElementById(tableId);
    if (!table) return '';
    
    const clone = table.cloneNode(true);
    const thead = clone.querySelector('thead');
    const tbody = clone.querySelector('tbody');
    const tfoot = clone.querySelector('tfoot');
    
    if (opsi.hapusKolomAksi) {
        [thead, tbody].forEach(function(section) {
            if (!section) return;
            section.querySelectorAll('tr').forEach(function(tr) {
                if (tr.children.length > 1 && tr.lastElementChild) {
                    tr.lastElementChild.remove();
                }
            });
        });
    }
    
    if (tfoot) {
        if (opsi.footerHtml) {
            tfoot.innerHTML = opsi.footerHtml;
        } else {
            tfoot.remove();
        }
    }
    
    return clone.outerHTML;
}

function buatDokumenCetak(judul, subjudul, isiTabelHtml) {
    const wrapper = document.createElement('div');
    wrapper.className = 'print-doc';
    wrapper.style.cssText = 'width:1040px;background:#ffffff;padding:32px;color:#1e293b;font-family:Inter,Arial,sans-serif;box-sizing:border-box;';
    wrapper.innerHTML = `
        <div style="border-bottom:3px solid #2563eb;padding-bottom:14px;margin-bottom:20px;">
            <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;">${judul}</h1>
            <p style="margin:0;font-size:12px;color:#475569;">${subjudul}</p>
        </div>
        <style>
            .print-doc table { width:100%; border-collapse:collapse; font-size:12px; }
            .print-doc thead th { background:#f1f5f9; color:#334155; text-align:left; padding:9px 10px; border:1px solid #cbd5e1; font-weight:600; }
            .print-doc tbody td { padding:8px 10px; border:1px solid #e2e8f0; }
            .print-doc tbody tr:nth-child(even) td { background:#f8fafc; }
            .print-doc tfoot td { padding:9px 10px; border:1px solid #cbd5e1; background:#eef2ff; font-weight:700; }
            .print-doc .badge-sisa { color:#991b1b; font-weight:600; }
            .print-doc .badge-lengkap { color:#166534; font-weight:600; }
        </style>
        ${isiTabelHtml}
        <p style="margin-top:22px;font-size:11px;color:#64748b;">Dokumen dibuat otomatis oleh sistem Bedah Rumah Kelompok.</p>
    `;
    return wrapper;
}

function unduhNodeSebagaiJpg(node, namaFile) {
    if (typeof html2canvas !== 'function') {
        alert('Library html2canvas belum termuat. Pastikan ada koneksi internet lalu muat ulang halaman.');
        return;
    }
    showLoading('MENYIAPKAN GAMBAR JPG');
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;';
    holder.appendChild(node);
    document.body.appendChild(holder);
    
    html2canvas(node, { backgroundColor: '#ffffff', scale: 2, useCORS: true })
        .then(function(canvas) {
            const link = document.createElement('a');
            link.download = namaFile + '.jpg';
            link.href = canvas.toDataURL('image/jpeg', 0.95);
            link.click();
        })
        .catch(function(err) {
            console.error(err);
            alert('Gagal membuat gambar JPG.');
        })
        .finally(function() {
            hideLoading();
            if (holder.parentNode) holder.parentNode.removeChild(holder);
        });
}

function cetakNodeSebagaiPdf(node, judul) {
    showLoading('MENYIAPKAN CETAK PDF');
    const holder = document.createElement('div');
    holder.id = 'pdfHolder';
    holder.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;';
    holder.appendChild(node);
    document.body.appendChild(holder);
    
    setTimeout(function() {
        hideLoading();
        document.body.classList.add('printing-custom');
        window.print();
        setTimeout(function() {
            document.body.classList.remove('printing-custom');
            if (holder.parentNode) holder.parentNode.removeChild(holder);
        }, 1000);
    }, 300);
}

function siapkanCetakRab() {
    const nama = getAnggotaAktif();
    if (!nama) {
        alert('Pilih anggota terlebih dahulu');
        return null;
    }
    const totalText = document.getElementById('totalRabInput') ? document.getElementById('totalRabInput').textContent : formatRupiah(0);
    const tabel = cloneTableUntukCetak('rabInputTable', {
        hapusKolomAksi: true,
        footerHtml: '<tr><td colspan="5">TOTAL RAB</td><td>' + totalText + '</td></tr>'
    });
    return buatDokumenCetak(
        'RENCANA ANGGARAN BIAYA (RAB)',
        'Anggota: <strong>' + nama + '</strong> &nbsp;|&nbsp; Dicetak: ' + formatTanggalCetak(),
        tabel
    );
}

function siapkanCetakSisa() {
    const nama = getAnggotaAktif();
    if (!nama) {
        alert('Pilih anggota terlebih dahulu');
        return null;
    }
    const tabel = cloneTableUntukCetak('rabSisaTable', { hapusKolomAksi: false });
    return buatDokumenCetak(
        'REKAP SISA MATERIAL YANG BELUM DITERIMA',
        'Anggota: <strong>' + nama + '</strong> &nbsp;|&nbsp; Dicetak: ' + formatTanggalCetak(),
        tabel
    );
}

function cetakRabPdf() {
    const node = siapkanCetakRab();
    if (node) cetakNodeSebagaiPdf(node, 'RAB');
}

function cetakRabJpg() {
    const nama = getAnggotaAktif();
    if (!nama) {
        alert('Pilih anggota terlebih dahulu');
        return;
    }
    const node = siapkanCetakRab();
    if (node) unduhNodeSebagaiJpg(node, 'RAB-' + nama.replace(/\s+/g, '-'));
}

function cetakSisaPdf() {
    const node = siapkanCetakSisa();
    if (node) cetakNodeSebagaiPdf(node, 'SISA');
}

function cetakSisaJpg() {
    const nama = getAnggotaAktif();
    if (!nama) {
        alert('Pilih anggota terlebih dahulu');
        return;
    }
    const node = siapkanCetakSisa();
    if (node) unduhNodeSebagaiJpg(node, 'Sisa-Material-' + nama.replace(/\s+/g, '-'));
}

window.addEventListener('afterprint', function() {
    const holder = document.getElementById('pdfHolder');
    if (holder && holder.parentNode) holder.parentNode.removeChild(holder);
});
