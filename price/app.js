/* 
   SHIFT PHOTOGRAPHY APPS LOGIC - LIQUID GLASS EDITION
*/

// --- STATE MANAGEMENT ---
let cart = [];
let selectedCustomOptions = [];
const adminWhatsAppNumber = "6281234567890"; // Ganti dengan nomor WA Admin (format internasional tanpa +)

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
      // If it is the cart item, open cart drawer instead of standard navigation path
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

  // Try to autoplay music on first user click anywhere on screen (modern browser policy friendly)
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
      // Toggle Active Class
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
        observer.unobserve(entry.target); // Hanya animasikan sekali
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
  const item = {
    id: packageName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
    name: packageName,
    details: 'Paket Standard Pilihan',
    price: price
  };
  
  cart.push(item);
  updateCartUI();
  openCart();
}

// Update header header background on scroll
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
  
  // Update badge counts
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

// Sync active bottom nav on cart opening
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
  
  // Return active indicator to home/current section scroll position
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

// --- WHATSAPP INVOICE GENERATOR ---
function checkoutToWhatsApp() {
  if (cart.length === 0) {
    alert('Keranjang Anda kosong. Silakan pilih paket terlebih dahulu.');
    return;
  }
  
  const coupleNames = document.getElementById('input-names').value.trim();
  const weddingDate = document.getElementById('input-date').value;
  const venue = document.getElementById('input-venue').value.trim();
  
  if (!coupleNames || !weddingDate || !venue) {
    alert('Mohon isi semua data pernikahan sebelum mengirim invoice.');
    return;
  }
  
  let total = 0;
  let itemStrings = "";
  
  cart.forEach((item, index) => {
    itemStrings += `${index + 1}. *${item.name}*\n   - _Detail: ${item.details}_\n   - _Harga: ${formatRupiah(item.price)}_\n\n`;
    total += item.price;
  });
  
  // Format Date for better presentation
  const formattedDate = new Date(weddingDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const message = `✨ *INVOICE PEMESANAN SHIFT PHOTOGRAPHY* ✨\n\n` +
                  `👤 *Detail Klien:*\n` +
                  `Nama Pasangan: ${coupleNames}\n` +
                  `Tanggal Acara: ${formattedDate}\n` +
                  `Lokasi / Venue: ${venue}\n\n` +
                  `📋 *Daftar Pesanan:*\n` +
                  `${itemStrings}` +
                  `💰 *TOTAL INVOICE:* *${formatRupiah(total)}* \n\n` +
                  `Terima kasih telah memilih Shift Photography. Mohon tunggu konfirmasi admin mengenai ketersediaan tanggal pernikahan Anda.`;
                  
  const encodedMessage = encodeURIComponent(message);
  const waUrl = `https://api.whatsapp.com/send?phone=${adminWhatsAppNumber}&text=${encodedMessage}`;
  
  window.open(waUrl, '_blank');
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
  
  // Toggle cart drawer on icon click
  const openCartBtn = document.getElementById('open-cart-btn');
  if (openCartBtn) {
    openCartBtn.addEventListener('click', () => {
      openCart();
      syncMobileCartActiveState();
    });
  }
});
