/* 
   SHIFT PHOTOGRAPHY APPS LOGIC - LIQUID GLASS EDITION WITH JPG PREVIEW & MULTI-DAY SUPPORT
*/

// --- STATE MANAGEMENT ---
let cart = [];
let selectedCustomOptions = [];
const adminWhatsAppNumber = "6281234567890"; // Ganti dengan nomor WA Admin (format internasional tanpa +)

// --- PACKAGE INCLUSIONS DETAILS MAP ---
const packageDetailsMap = {
  'Classic Bronze': '1 Photographer (6 Jam), 50 Edited Photos, USB Flash Drive with Raw Files, 1 Standard Wedding Album, Digital Invitation Template',
  'Royal Gold': '2 Photographers & 1 Videographer, 100 Edited Photos, Cinematic Highlight Film (3-5m), 1 Premium Leather Album, Drone Footage, Same Day Edit (SDE)',
  'Majestic Platinum': 'Full Day Coverage (12 Jam), 3 Photographers & 2 Videographers, Unlimited Edited Photos, Feature Film (15-20m) & SDE, 2 Premium Leather Albums, Drone & Crane Equipment, Pre-Wedding Session'
};

// --- SPARKLES / DUST FLOATING EFFECT ---
function initSparkles() {
  const container = document.getElementById('sparkles-container');
  if (!container) return;
  
  const sparkleCount = 40;
  for (let i = 0; i < sparkleCount; i++) {
    const sparkle = document.createElement('div');
    sparkle.classList.add('sparkle');
    sparkle.style.left = `${Math.random() * 100}vw`;
    sparkle.style.animationDelay = `${Math.random() * 8}s`;
    sparkle.style.animationDuration = `${5 + Math.random() * 8}s`;
    sparkle.style.transform = `scale(${0.3 + Math.random() * 0.9})`;
    container.appendChild(sparkle);
  }
}

// --- MOBILE BOTTOM NAVIGATION (LIQUID SLIDER) ---
function initMobileBottomNav() {
  const navItems = document.querySelectorAll('.mobile-nav-item');
  
  function moveIndicator(index) {
    const indicator = document.getElementById('mobile-nav-indicator');
    if (indicator) {
      indicator.style.transform = `translate3d(calc(${index} * 100%), -50%, 0)`;
    }
  }

  // Set initial indicator position
  const activeItem = document.querySelector('.mobile-nav-item.active');
  if (activeItem) {
    const index = activeItem.getAttribute('data-index');
    setTimeout(() => moveIndicator(index), 100);
  }
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      if (item.id === 'mobile-cart-trigger') {
        openCart();
        return;
      }
      
      const index = item.getAttribute('data-index');
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      moveIndicator(index);
    });
  });
}

// --- MUSIC PLAYER CONTROLLER ---
function initMusicPlayer() {
  const music = document.getElementById('bg-music');
  const toggleBtn = document.getElementById('music-toggle-btn');
  const tooltip = document.getElementById('music-tooltip');
  
  if (!music || !toggleBtn) return;
  
  // Interactive play on button click
  toggleBtn.addEventListener('click', () => {
    if (music.paused) {
      music.play().then(() => {
        toggleBtn.classList.add('playing');
        tooltip.textContent = "Playing";
      }).catch(err => {
        console.log("Browser blocked autoplay. User action registered.", err);
      });
    } else {
      music.pause();
      toggleBtn.classList.remove('playing');
      tooltip.textContent = "Paused";
    }
  });

  // Autoplay music friendly handler
  const autoPlayHandler = () => {
    if (music.paused && !toggleBtn.classList.contains('playing')) {
      music.play().then(() => {
        toggleBtn.classList.add('playing');
        tooltip.textContent = "Playing";
      }).catch(() => {});
    }
    document.removeEventListener('click', autoPlayHandler);
  };
  document.addEventListener('click', autoPlayHandler);
}

// --- GALLERY FILTER & LIGHTBOX ---
function initGallery() {
  const filters = document.querySelectorAll('.gallery-filters button');
  const items = document.querySelectorAll('.gallery-item');
  
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(f => f.classList.remove('active'));
      btn.classList.add('active');
      
      const filterValue = btn.getAttribute('data-filter');
      
      items.forEach(item => {
        const cat = item.getAttribute('data-category');
        if (filterValue === 'all' || cat === filterValue) {
          item.style.display = 'block';
          setTimeout(() => item.style.opacity = '1', 50);
        } else {
          item.style.opacity = '0';
          setTimeout(() => item.style.display = 'none', 300);
        }
      });
    });
  });
}

function openLightbox(imgSrc) {
  const lightbox = document.getElementById('gallery-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  if (lightbox && lightboxImg) {
    lightboxImg.src = imgSrc;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeLightbox() {
  const lightbox = document.getElementById('gallery-lightbox');
  if (lightbox) {
    lightbox.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

// --- INTERSECTION OBSERVER ANIMATION REVEAL ---
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
  });
  
  reveals.forEach(el => observer.observe(el));
}

// --- CUSTOM PACKAGES CONSTRUCTOR ---
function toggleConstructorOption(element) {
  element.classList.toggle('selected');
  const optionId = element.getAttribute('data-id');
  const name = element.getAttribute('data-name');
  const price = parseInt(element.getAttribute('data-price'), 10);
  
  if (element.classList.contains('selected')) {
    selectedCustomOptions.push({ id: optionId, name, price });
  } else {
    selectedCustomOptions = selectedCustomOptions.filter(opt => opt.id !== optionId);
  }
  
  updateConstructorSummary();
}

// Set active navigation items on scroll
function initScrollActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.mobile-nav-item');
  const indicator = document.getElementById('mobile-nav-indicator');

  function moveIndicator(index) {
    if (indicator) {
      indicator.style.transform = `translate3d(calc(${index} * 100%), -50%, 0)`;
    }
  }

  window.addEventListener('scroll', () => {
    let scrollY = window.pageYOffset;
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120;
      const sectionId = current.getAttribute('id');
      
      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        const targetNav = document.querySelector(`.mobile-nav-item[href*=${sectionId}]`);
        if (targetNav) {
          const index = targetNav.getAttribute('data-index');
          navItems.forEach(n => n.classList.remove('active'));
          targetNav.classList.add('active');
          moveIndicator(index);
        }
      }
    });
  });
}

function updateConstructorSummary() {
  const summaryList = document.getElementById('constructor-summary-list');
  const totalPriceDisplay = document.getElementById('constructor-total-price');
  
  if (selectedCustomOptions.length === 0) {
    summaryList.innerHTML = `<li style="color: var(--color-gray); font-style: italic;">Belum ada item yang dipilih</li>`;
    totalPriceDisplay.textContent = 'Rp 0';
    return;
  }
  
  let html = '';
  let total = 0;
  
  selectedCustomOptions.forEach(opt => {
    html += `<li>
      <span>${opt.name}</span>
      <span>${formatRupiah(opt.price)}</span>
    </li>`;
    total += opt.price;
  });
  
  summaryList.innerHTML = html;
  totalPriceDisplay.textContent = formatRupiah(total);
}

function addCustomToCart() {
  if (selectedCustomOptions.length === 0) {
    alert('Silakan pilih minimal satu layanan kustom sebelum ditambahkan ke keranjang.');
    return;
  }
  
  const itemsDescription = selectedCustomOptions.map(opt => opt.name).join(', ');
  const totalPrice = selectedCustomOptions.reduce((acc, opt) => acc + opt.price, 0);
  
  const customPackage = {
    id: 'custom-' + Date.now(),
    name: 'Custom Package Bundle',
    details: itemsDescription,
    price: totalPrice
  };
  
  cart.push(customPackage);
  updateCartUI();
  openCart();
  
  // Reset Constructor Selection
  selectedCustomOptions = [];
  document.querySelectorAll('.constructor-option-item').forEach(item => {
    item.classList.remove('selected');
  });
  updateConstructorSummary();
}

// --- CART ACTIONS & MANAGEMENT ---
function addPackageToCart(packageName, price) {
  // Fetch detailed inclusions from the package map
  const details = packageDetailsMap[packageName] || 'Paket Pilihan';
  
  const item = {
    id: packageName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
    name: packageName,
    details: details,
    price: price
  };
  
  cart.push(item);
  updateCartUI();
  openCart();
}

function initHeaderScroll() {
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('glass-header');
    } else {
      header.classList.remove('glass-header');
    }
  });
}

function removeCartItem(itemId) {
  cart = cart.filter(item => item.id !== itemId);
  updateCartUI();
}

function updateCartUI() {
  const badgeCount = document.getElementById('cart-badge-count');
  const mobileBadgeCount = document.getElementById('mobile-cart-badge-count');
  const itemsContainer = document.getElementById('cart-items-container');
  const totalDisplay = document.getElementById('cart-total-display');
  const checkoutForm = document.getElementById('cart-checkout-form');
  
  if (badgeCount) badgeCount.textContent = cart.length;
  if (mobileBadgeCount) mobileBadgeCount.textContent = cart.length;
  
  if (cart.length === 0) {
    itemsContainer.innerHTML = `<p class="cart-empty-message">Keranjang Anda kosong</p>`;
    totalDisplay.textContent = 'Rp 0';
    checkoutForm.style.display = 'none';
    return;
  }
  
  checkoutForm.style.display = 'flex';
  
  let html = '';
  let total = 0;
  
  cart.forEach(item => {
    html += `
      <div class="cart-item">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p>${item.details}</p>
          <p style="margin-top: 5px; font-weight: 600;">${formatRupiah(item.price)}</p>
        </div>
        <button class="cart-item-remove" onclick="removeCartItem('${item.id}')" aria-label="Hapus Item">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
    total += item.price;
  });
  
  itemsContainer.innerHTML = html;
  totalDisplay.textContent = formatRupiah(total);
}

function openCart() {
  document.getElementById('cart-drawer').classList.add('active');
  document.getElementById('cart-overlay').classList.add('active');
}

function syncMobileCartActiveState() {
  const navItems = document.querySelectorAll('.mobile-nav-item');
  const indicator = document.getElementById('mobile-nav-indicator');
  const cartTrigger = document.getElementById('mobile-cart-trigger');
  
  if (cartTrigger && indicator) {
    navItems.forEach(n => n.classList.remove('active'));
    cartTrigger.classList.add('active');
    const index = cartTrigger.getAttribute('data-index');
    indicator.style.transform = `translate3d(calc(${index} * 100%), -50%, 0)`;
  }
}

function closeCart() {
  document.getElementById('cart-drawer').classList.remove('active');
  document.getElementById('cart-overlay').classList.remove('active');
  
  // Return navigation active state
  const activeSection = document.querySelector('section[id]');
  const navItems = document.querySelectorAll('.mobile-nav-item');
  const indicator = document.getElementById('mobile-nav-indicator');
  if (activeSection && indicator) {
    let scrollY = window.pageYOffset;
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120;
      const sectionId = current.getAttribute('id');
      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        const targetNav = document.querySelector(`.mobile-nav-item[href*=${sectionId}]`);
        if (targetNav) {
          navItems.forEach(n => n.classList.remove('active'));
          targetNav.classList.add('active');
          const index = targetNav.getAttribute('data-index');
          indicator.style.transform = `translate3d(calc(${index} * 100%), -50%, 0)`;
        }
      }
    });
  }
}

// --- LUXURY INVOICE PREVIEW MODAL LOGIC ---
function openInvoicePreview() {
  if (cart.length === 0) {
    alert('Keranjang Anda kosong. Silakan pilih paket terlebih dahulu.');
    return;
  }
  
  const coupleNames = document.getElementById('input-names').value.trim();
  const startDateVal = document.getElementById('input-start-date').value;
  const endDateVal = document.getElementById('input-end-date').value;
  const venue = document.getElementById('input-venue').value.trim();
  
  if (!coupleNames || !startDateVal || !venue) {
    alert('Mohon lengkapi Nama Pasangan, Tanggal Mulai, dan Venue terlebih dahulu.');
    return;
  }
  
  // Build Date Range String
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const startDateFormatted = new Date(startDateVal).toLocaleDateString('id-ID', options);
  
  let dateRangeText = startDateFormatted;
  if (endDateVal && endDateVal !== startDateVal) {
    const endDateFormatted = new Date(endDateVal).toLocaleDateString('id-ID', options);
    dateRangeText = `${startDateFormatted} s/d ${endDateFormatted}`;
  }
  
  // Populate preview text blocks
  document.getElementById('invoice-couple-names').textContent = coupleNames;
  document.getElementById('invoice-date-range').textContent = dateRangeText;
  document.getElementById('invoice-venue-location').textContent = venue;
  
  // Populate products list
  const tableBody = document.getElementById('invoice-items-list');
  tableBody.innerHTML = '';
  
  let total = 0;
  cart.forEach(item => {
    // Format package inclusions as bullet points or smaller text lines
    const inclusionsHTML = item.details.split(', ').map(inc => `<span style="display: block; font-size: 8.5px; color: var(--color-gray); margin-top: 2px;">• ${inc}</span>`).join('');
    
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid rgba(197, 168, 128, 0.1)';
    row.innerHTML = `
      <td style="padding: 12px 0; vertical-align: top;">
        <span style="font-weight: 600; display: block; color: var(--color-dark);">${item.name}</span>
        ${inclusionsHTML}
      </td>
      <td style="padding: 12px 0; text-align: right; font-weight: 600; vertical-align: top; color: var(--color-gold-dark);">${formatRupiah(item.price)}</td>
    `;
    tableBody.appendChild(row);
    total += item.price;
  });
  
  document.getElementById('invoice-total-amount').textContent = formatRupiah(total);
  
  // Close Cart Drawer first
  closeCart();
  
  // Open Preview Modal
  const modal = document.getElementById('invoice-preview-modal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeInvoiceModal() {
  const modal = document.getElementById('invoice-preview-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

// --- JPG GENERATION (returns a Promise resolving the dataURL) ---
function generateInvoiceJPG() {
  const element = document.getElementById('invoice-card-print');
  if (!element) return Promise.reject('No element found');
  
  const opt = {
    scale: 2.5,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false
  };
  
  return html2canvas(element, opt).then(canvas => {
    return canvas.toDataURL('image/jpeg', 0.98);
  });
}

// --- DOWNLOAD ONLY (button click) ---
function downloadInvoiceJPG() {
  const btn = document.getElementById('btn-download-jpg');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan..'; }
  
  generateInvoiceJPG().then(imgData => {
    const coupleNames = document.getElementById('input-names').value.trim().replace(/\s+/g, '_');
    const link = document.createElement('a');
    link.download = `Invoice_Shift_${coupleNames || 'Wedding'}.jpg`;
    link.href = imgData;
    link.click();
  }).catch(err => {
    console.error('Error generating JPG Invoice: ', err);
    alert('Gagal mengunduh invoice JPG. Silakan coba kembali.');
  }).finally(() => {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-file-arrow-down"></i> Unduh JPG'; }
  });
}

// --- SEND TO WA: downloads JPG first, then opens WhatsApp ---
function sendInvoiceWhatsAppDirect() {
  const btn = document.getElementById('btn-send-wa');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan...'; }
  
  const coupleNames = document.getElementById('invoice-couple-names').textContent;
  const dateRange = document.getElementById('invoice-date-range').textContent;
  const venue = document.getElementById('invoice-venue-location').textContent;
  const totalDisplay = document.getElementById('invoice-total-amount').textContent;
  const coupleNamesFile = document.getElementById('input-names').value.trim().replace(/\s+/g, '_');
  
  // Step 1 — Render & download invoice JPG first
  generateInvoiceJPG().then(imgData => {
    // Auto-download the JPG to the user's device
    const link = document.createElement('a');
    link.download = `Invoice_Shift_${coupleNamesFile || 'Wedding'}.jpg`;
    link.href = imgData;
    link.click();
    
    // Step 2 — Build the full text invoice message
    let itemStrings = '';
    let total = 0;
    cart.forEach((item, index) => {
      const formattedDetails = item.details.split(', ').map(inc => `     • ${inc}`).join('\n');
      itemStrings += `${index + 1}. *${item.name}*\n   - _Harga: ${formatRupiah(item.price)}_\n   - _Rincian:_\n${formattedDetails}\n\n`;
      total += item.price;
    });

    const message = `✨ *INVOICE ESTIMASI PEMESANAN SHIFT PHOTOGRAPHY* ✨\n\n` +
                    `👤 *Detail Klien:*\n` +
                    `Nama Pasangan: ${coupleNames}\n` +
                    `Tanggal Acara: ${dateRange}\n` +
                    `Lokasi / Venue: ${venue}\n\n` +
                    `📋 *Daftar Pesanan & Rincian Paket:*\n` +
                    `${itemStrings}` +
                    `💰 *TOTAL ESTIMASI:* *${totalDisplay}*\n\n` +
                    `📎 *Invoice JPG sudah terunduh otomatis di perangkat Anda.*\n` +
                    `Silakan lampirkan gambar invoice tersebut bersama pesan ini.\n\n` +
                    `Terima kasih telah memilih Shift Photography!`;

    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${adminWhatsAppNumber}?text=${encodedMessage}`;
    
    // Step 3 — Open WhatsApp after JPG download triggered
    setTimeout(() => { window.open(waUrl, '_blank'); }, 800);
    
  }).catch(err => {
    console.error('Error generating invoice JPG for WA: ', err);
    alert('Gagal menyiapkan invoice JPG. Silakan coba lagi.');
  }).finally(() => {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Kirim ke WA'; }
  });
}

// --- UTILITY FUNCTIONS ---
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

// --- INIT APP ---
document.addEventListener('DOMContentLoaded', () => {
  initSparkles();
  initMobileBottomNav();
  initMusicPlayer();
  initGallery();
  initScrollReveal();
  initHeaderScroll();
  initScrollActiveNav();
  
  const openCartBtn = document.getElementById('open-cart-btn');
  if (openCartBtn) {
    openCartBtn.addEventListener('click', () => {
      openCart();
      syncMobileCartActiveState();
    });
  }
});
