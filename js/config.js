const SPREADSHEET_URL = "https://script.google.com/macros/s/AKfycbwR5XP8zb6nAI7_n0wKk9m_lDDdAnhVLpUyyg70Af3pMiytMyP-fl8lBWleJJRV7cct/exec";

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
