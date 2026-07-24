/* 
   SHIFT PHOTOGRAPHY APPS LOGIC - LIQUID GLASS EDITION WITH JPG PREVIEW & MULTI-DAY SUPPORT
*/

// --- LOCAL STORAGE MODULE ---
const LocalDB = {
  KEYS: {
    CART: 'shift_cart',
    UNSELECTED: 'shift_unselected_items',
    CUSTOMER: 'shift_customer_data'
  },
  
  saveCart(cartData) {
    try {
      localStorage.setItem(this.KEYS.CART, JSON.stringify(cartData));
    } catch (e) {
      console.error('Error saving cart to localStorage:', e);
    }
  },
  
  loadCart() {
    try {
      const data = localStorage.getItem(this.KEYS.CART);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading cart from localStorage:', e);
      return [];
    }
  },
  
  saveUnselectedItems(items) {
    try {
      localStorage.setItem(this.KEYS.UNSELECTED, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving unselected items:', e);
    }
  },
  
  loadUnselectedItems() {
    try {
      const data = localStorage.getItem(this.KEYS.UNSELECTED);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading unselected items:', e);
      return [];
    }
  },
  
  saveCustomerData(customerData) {
    try {
      localStorage.setItem(this.KEYS.CUSTOMER, JSON.stringify(customerData));
    } catch (e) {
      console.error('Error saving customer data:', e);
    }
  },
  
  loadCustomerData() {
    try {
      const data = localStorage.getItem(this.KEYS.CUSTOMER);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error loading customer data:', e);
      return null;
    }
  },
  
  clearAll() {
    try {
      localStorage.removeItem(this.KEYS.CART);
      localStorage.removeItem(this.KEYS.UNSELECTED);
      localStorage.removeItem(this.KEYS.CUSTOMER);
    } catch (e) {
      console.error('Error clearing localStorage:', e);
    }
  }
};

// --- STATE MANAGEMENT ---
let cart = [];
// track disabled state (not checked in checklist)
let unselectedCartItemIds = [];
const adminWhatsAppNumber = "6285368217683"; // Ganti dengan nomor WA Admin (format internasional tanpa +)

// Define category mappings for package validation
const packageCategoryMap = {
  // Hantaran
  'Batari': 'hantaran', 'Padma': 'hantaran', 'Atman': 'hantaran',
  // Prawedding
  'Narapati': 'prawedding', 'Bupala': 'prawedding',
  // Wedding
  'Astana': 'wedding', 'Akusara': 'wedding', 'Gandewa': 'wedding', 'Bumantra': 'wedding', 'Cundamani': 'wedding',
  // Wedding Clip
  'Indurasmi': 'clip', 'Baskara': 'clip', 'Narpati': 'clip'
};

// --- PACKAGE INCLUSIONS DETAILS MAP ---
const packageDetailsMap = {
  // HANTARAN
  'Batari':     'Dokumentasi, File saja, File Foto Edit, Semua File via Drive',
  'Padma':      'Dokumentasi, File saja, File Foto Edit, 1 Menit Teaser Clip Hantaran, Semua File via Drive',
  'Atman':      'Dokumentasi, File saja, File Foto Edit, 1 Menit Teaser Clip Hantaran, Cetak Uk. 22R + Bingkai, Semua File via Drive',
  // PRAWEDDING
  'Narapati':   'Foto saja, 1 Hari 1 Konsep 1 Lokasi, Edit File Foto, Cetak 60x40cm (22R) + Bingkai 2 Pcs, Semua File Via Drive',
  'Bupala':     'Foto saja, 1 Hari 2 Konsep 2 Lokasi, Edit File Foto, Cetak 60x40cm (22R) + Bingkai 2 Pcs, Semua File Via Drive',
  // WEDDING
  'Astana':     'Maks. 2 Hari Kerja, Album Magnetik Keluarga, Cetak 120 Foto 4R, Cetak 5 Pcs 12R, Bingkai 12R 1 Pcs, Edit File Foto, Flashdisk 16 Gb',
  'Akusara':    'Maks. 2 Hari Kerja, Album Magnetik Keluarga, Cetak 120 Foto 4R, Cetak 5 Pcs 12R, Bingkai 12R 1 Pcs, Video Shooting Dokumentasi, Edit File Foto, Flashdisk 16 Gb',
  'Gandewa':    'Maks. 2 Hari Kerja, Album Hard Cover/Kolase (10 Sheet), Album Magnetik Keluarga (10 Sheet), Cetak 120 Foto 4R, Cetak 5 Pcs 12R, Bingkai 12R 1 Pcs, Edit File Foto, Flashdisk 16 Gb',
  'Bumantra':   'Maks. 2 Hari Kerja, Album Hard Cover/Kolase (10 Sheet), Album Magnetik (10 Sheet), Cetak 120 Foto 4R, Cetak 5 Pcs 12R, Bingkai 12R 1 Pcs, Cetak 22R + Bingkai 1 Pcs, Video Shooting Dokumentasi, Edit File Foto, Flashdisk 16 Gb',
  'Cundamani':  'Maks. 2 Hari Kerja, Album Hard Cover/Kolase (10 Sheet), Album Magnetik (15 Sheet), Cetak 120 Foto 4R, Cetak 5 Pcs 12R, Bingkai 12R 2 Pcs, Cetak 22R + Bingkai 1 Pcs, Video Wedding Clip (1-3 Menit), Video Shooting Dokumentasi, Edit File Foto, Flashdisk 32 Gb',
  // WEDDING CLIP
  'Indurasmi':  'Teaser 1 Menit, 1 Hari',
  'Baskara':    'Clip 2-3 Menit, 1 Hari',
  'Narpati':    'Clip 2-3 Menit, 2 Hari',
  // ADD-ONS
  'Background Kain (per baju)': 'Background kain per baju',
  'Barcode Foto': 'Barcode foto digital',
};

// --- PACKAGE CATEGORY TAB SWITCHER ---
function switchPkgTab(tabId, btn) {
  document.querySelectorAll('.pkg-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.pkg-tab').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('tab-' + tabId);
  if (panel) panel.classList.add('active');
  if (btn) btn.classList.add('active');
}

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
  
  if (!music || !toggleBtn) return;
  
  music.volume = 0.3;
  
  const updatePlayingState = () => {
    if (music.paused) {
      toggleBtn.classList.remove('playing');
    } else {
      toggleBtn.classList.add('playing');
    }
  };
  
  toggleBtn.addEventListener('click', () => {
    if (music.paused) {
      music.play().then(() => {
        toggleBtn.classList.add('playing');
      }).catch(err => {
        console.log("Browser blocked autoplay. User action registered.", err);
      });
    } else {
      music.pause();
      toggleBtn.classList.remove('playing');
    }
  });
  
  music.addEventListener('play', updatePlayingState);
  music.addEventListener('pause', updatePlayingState);
  music.addEventListener('ended', updatePlayingState);
  
  updatePlayingState();
}

// --- GALLERY FILTER & LIGHTBOX ---
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

// --- CART ACTIONS & MANAGEMENT ---
function addPackageToCart(packageName, price) {
  const newCat = packageCategoryMap[packageName];
  
  // If it belongs to one of the 4 main categories, ensure user only selects 1 per category
  if (newCat) {
    const existingIndex = cart.findIndex(item => packageCategoryMap[item.name] === newCat);
    if (existingIndex !== -1) {
      const existingItem = cart[existingIndex];
      const confirmReplace = confirm(`Kategori "${newCat.toUpperCase()}" sudah memiliki paket "${existingItem.name}" di keranjang. Ingin menggantinya dengan "${packageName}"?`);
      if (confirmReplace) {
        // Also remove from unselected list if it was there
        unselectedCartItemIds = unselectedCartItemIds.filter(id => id !== existingItem.id);
        cart.splice(existingIndex, 1);
      } else {
        return; // Cancel addition
      }
    }
  }

  // Fetch detailed inclusions from the package map
  const details = packageDetailsMap[packageName] || 'Paket Pilihan';
  
  const item = {
    id: packageName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
    name: packageName,
    category: newCat || 'addon',
    details: details,
    price: price
  };
  
  cart.push(item);
  LocalDB.saveCart(cart); // Save to localStorage
  updateCartUI();
  updatePricelistButtonsState();
  
  // Animate the desktop cart button icon
  const desktopCartBtn = document.getElementById('open-cart-btn');
  if (desktopCartBtn) {
    desktopCartBtn.classList.remove('cart-pop-animation');
    void desktopCartBtn.offsetWidth; // Trigger reflow to restart animation
    desktopCartBtn.classList.add('cart-pop-animation');
    setTimeout(() => desktopCartBtn.classList.remove('cart-pop-animation'), 600);
  }
  
  // Animate the mobile cart bottom nav button icon
  const mobileCartTrigger = document.getElementById('mobile-cart-trigger');
  if (mobileCartTrigger) {
    mobileCartTrigger.classList.remove('cart-pop-animation');
    void mobileCartTrigger.offsetWidth; // Trigger reflow to restart animation
    mobileCartTrigger.classList.add('cart-pop-animation');
    setTimeout(() => mobileCartTrigger.classList.remove('cart-pop-animation'), 600);
  }
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
  unselectedCartItemIds = unselectedCartItemIds.filter(id => id !== itemId);
  LocalDB.saveCart(cart); // Save to localStorage
  LocalDB.saveUnselectedItems(unselectedCartItemIds); // Save to localStorage
  updateCartUI();
  updatePricelistButtonsState();
}

function toggleCartItemSelection(itemId) {
  if (unselectedCartItemIds.includes(itemId)) {
    unselectedCartItemIds = unselectedCartItemIds.filter(id => id !== itemId);
  } else {
    unselectedCartItemIds.push(itemId);
  }
  LocalDB.saveUnselectedItems(unselectedCartItemIds); // Save to localStorage
  updateCartUI();
}

// Function to update visual indicator/button text in pricing section
function updatePricelistButtonsState() {
  // Find all buttons in packages list
  const buttons = document.querySelectorAll('#packages button[onclick^="addPackageToCart"]');
  buttons.forEach(btn => {
    // extract package name from onclick="addPackageToCart('Name', Price)"
    const match = btn.getAttribute('onclick').match(/addPackageToCart\('([^']+)'/);
    if (match && match[1]) {
      const pName = match[1];
      const isAdded = cart.some(item => item.name === pName);
      
      const parentCard = btn.closest('.package-card') || btn.closest('.addon-chip');
      if (isAdded) {
        btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Terpilih';
        btn.disabled = true;
        if (parentCard) parentCard.classList.add('selected-pkg-card');
      } else {
        if (btn.classList.contains('addon-add-btn')) {
          btn.innerHTML = '<i class="fa-solid fa-plus"></i>';
        } else {
          btn.innerHTML = 'Pilih Paket';
        }
        btn.disabled = false;
        if (parentCard) parentCard.classList.remove('selected-pkg-card');
      }
    }
  });
}

function updateCartUI() {
  const badgeCount = document.getElementById('cart-badge-count');
  const mobileBadgeCount = document.getElementById('mobile-cart-badge-count');
  const itemsContainer = document.getElementById('cart-items-container');
  const totalDisplay = document.getElementById('cart-total-display');
  const checkoutForm = document.getElementById('cart-checkout-form');
  
  // badge represents checked/active items only
  const activeItemsCount = cart.filter(item => !unselectedCartItemIds.includes(item.id)).length;
  if (badgeCount) badgeCount.textContent = activeItemsCount;
  if (mobileBadgeCount) mobileBadgeCount.textContent = activeItemsCount;
  
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
    const isChecked = !unselectedCartItemIds.includes(item.id);
    if (isChecked) {
      total += item.price;
    }
    
    // Get category name for display
    const categoryDisplay = item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'Addon';
    const categoryColor = {
      'hantaran': '#C5A880',
      'prawedding': '#E91E63',
      'wedding': '#9C27B0',
      'clip': '#FF9800',
      'addon': '#607D8B'
    };
    
    html += `
      <div class="cart-item ${isChecked ? '' : 'cart-item-unchecked'}">
        <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
          <input type="checkbox" class="cart-item-checkbox" ${isChecked ? 'checked' : ''} onchange="toggleCartItemSelection('${item.id}')">
          <div class="cart-item-info">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <h4 style="${isChecked ? '' : 'text-decoration: line-through; color: var(--color-gray);'}">${item.name}</h4>
              <span style="font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; background: ${categoryColor[item.category] || categoryColor.addon}; color: white; padding: 2px 8px; border-radius: 10px;">${categoryDisplay}</span>
            </div>
            <p>${item.details}</p>
            <p style="margin-top: 5px; font-weight: 600; color: ${isChecked ? 'var(--color-gold-dark)' : 'var(--color-gray)'};">${formatRupiah(item.price)}</p>
          </div>
        </div>
        <button class="cart-item-remove" onclick="removeCartItem('${item.id}')" aria-label="Hapus Item">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
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
  // Only process checked items
  const activeCartItems = cart.filter(item => !unselectedCartItemIds.includes(item.id));
  
  if (activeCartItems.length === 0) {
    alert('Mohon pilih minimal satu paket (checklist) di keranjang terlebih dahulu.');
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
  activeCartItems.forEach(item => {
    // Determine category display name
    const catCode = packageCategoryMap[item.name];
    let catDisplay = "Add-ons";
    if (catCode === "hantaran") catDisplay = "Hantaran";
    else if (catCode === "prawedding") catDisplay = "Prawedding";
    else if (catCode === "wedding") catDisplay = "Wedding";
    else if (catCode === "clip") catDisplay = "Wedding Clip";
    
    // Format package inclusions as bullet points or smaller text lines
    const inclusionsHTML = item.details.split(', ').map(inc => `<span style="display: block; font-size: 8.5px; color: var(--color-gray); margin-top: 2px;">• ${inc}</span>`).join('');
    
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid rgba(197, 168, 128, 0.1)';
    row.innerHTML = `
      <td style="padding: 12px 0; vertical-align: top;">
        <span style="font-size: 9px; font-weight: 700; color: var(--color-gold-dark); text-transform: uppercase; display: block; margin-bottom: 2px; letter-spacing: 0.5px;">[ ${catDisplay} ]</span>
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
// --- DOWNLOAD HIGH QUALITY PDF OR MULTI-PAGE FALLBACK ---
function downloadInvoicePDFOrJPG() {
  const btn = document.getElementById('btn-download-jpg');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan...'; }
  
  const element = document.getElementById('invoice-card-print');
  const coupleNames = document.getElementById('input-names').value.trim().replace(/\s+/g, '_') || 'Wedding';
  
  // Clone element temporarily to measure and capture full content without scroll clipping
  const clone = element.cloneNode(true);
  clone.style.position = 'absolute';
  clone.style.top = '-9999px';
  clone.style.left = '-9999px';
  clone.style.width = '480px'; // Force exact modal width
  clone.style.height = 'auto'; // Force full heights
  clone.style.overflow = 'visible';
  document.body.appendChild(clone);
  
  const opt = {
    scale: 2.0,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false
  };
  
  html2canvas(clone, opt).then(canvas => {
    // Remove clone
    document.body.removeChild(clone);
    
    const { jsPDF } = window.jspdf;
    
    const imgWidth = 210; // A4 standard width in mm
    const pageHeight = 297; // A4 standard height in mm
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgHeight = (canvasHeight * imgWidth) / canvasWidth;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Check if the content height fits standard A4, otherwise generate multi-page PDF
    if (imgHeight > pageHeight) {
      // Calculate how many pages we need based on actual scale
      let heightLeft = imgHeight;
      let position = 0;
      const pageCanvasHeight = (canvasWidth * pageHeight) / imgWidth;
      
      while (heightLeft > 0) {
        const sHeight = Math.min(canvasHeight - (Math.abs(position) * (canvasHeight / imgHeight)), pageCanvasHeight);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = sHeight;
        
        const ctx = tempCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, sHeight);
        ctx.drawImage(canvas, 0, Math.abs(position) * (canvasHeight / imgHeight), canvasWidth, sHeight, 0, 0, canvasWidth, sHeight);
        
        const pageData = tempCanvas.toDataURL('image/jpeg', 0.95);
        const drawHeight = (sHeight * imgWidth) / canvasWidth;
        pdf.addImage(pageData, 'JPEG', 0, 0, imgWidth, drawHeight);
        
        heightLeft -= pageHeight;
        position -= pageHeight;
        
        if (heightLeft > 0) {
          pdf.addPage();
        }
      }
      pdf.save(`Invoice_Shift_${coupleNames}.pdf`);
    } else {
      // Short enough, download as PDF directly
      const pageData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(pageData, 'JPEG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Invoice_Shift_${coupleNames}.pdf`);
    }
  }).catch(err => {
    if (document.body.contains(clone)) {
      document.body.removeChild(clone);
    }
    console.error('Error generating Invoice: ', err);
    alert('Gagal mengunduh invoice. Silakan coba kembali.');
  }).finally(() => {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Unduh PDF / JPG'; }
  });
}

// --- SEND TO WA: downloads PDF first, then opens WhatsApp ---
function sendInvoiceWhatsAppDirect() {
  const activeCartItems = cart.filter(item => !unselectedCartItemIds.includes(item.id));
  if (activeCartItems.length === 0) {
    alert('Mohon pilih minimal satu paket terlebih dahulu.');
    return;
  }

  const btn = document.getElementById('btn-send-wa');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan...'; }
  
  const coupleNames = document.getElementById('invoice-couple-names').textContent;
  const dateRange = document.getElementById('invoice-date-range').textContent;
  const venue = document.getElementById('invoice-venue-location').textContent;
  const totalDisplay = document.getElementById('invoice-total-amount').textContent;
  const coupleNamesFile = document.getElementById('input-names').value.trim().replace(/\s+/g, '_') || 'Wedding';
  
  const element = document.getElementById('invoice-card-print');
  
  // Clone element temporarily to measure and capture full content without scroll clipping
  const clone = element.cloneNode(true);
  clone.style.position = 'absolute';
  clone.style.top = '-9999px';
  clone.style.left = '-9999px';
  clone.style.width = '480px';
  clone.style.height = 'auto';
  clone.style.overflow = 'visible';
  document.body.appendChild(clone);
  
  const opt = {
    scale: 2.0,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false
  };
  
  html2canvas(clone, opt).then(canvas => {
    document.body.removeChild(clone);
    const { jsPDF } = window.jspdf;
    
    const imgWidth = 210; 
    const pageHeight = 297; 
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgHeight = (canvasHeight * imgWidth) / canvasWidth;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Auto-generate & download PDF
    if (imgHeight > pageHeight) {
      let heightLeft = imgHeight;
      let position = 0;
      const pageCanvasHeight = (canvasWidth * pageHeight) / imgWidth;
      
      while (heightLeft > 0) {
        const sHeight = Math.min(canvasHeight - (Math.abs(position) * (canvasHeight / imgHeight)), pageCanvasHeight);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = sHeight;
        
        const ctx = tempCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, sHeight);
        ctx.drawImage(canvas, 0, Math.abs(position) * (canvasHeight / imgHeight), canvasWidth, sHeight, 0, 0, canvasWidth, sHeight);
        
        const pageData = tempCanvas.toDataURL('image/jpeg', 0.95);
        const drawHeight = (sHeight * imgWidth) / canvasWidth;
        pdf.addImage(pageData, 'JPEG', 0, 0, imgWidth, drawHeight);
        
        heightLeft -= pageHeight;
        position -= pageHeight;
        
        if (heightLeft > 0) {
          pdf.addPage();
        }
      }
      pdf.save(`Invoice_Shift_${coupleNamesFile}.pdf`);
    } else {
      const pageData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(pageData, 'JPEG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Invoice_Shift_${coupleNamesFile}.pdf`);
    }
    
    // Step 2 — Build the full text invoice message
    let itemStrings = '';
    let total = 0;
    activeCartItems.forEach((item, index) => {
      const catCode = packageCategoryMap[item.name];
      let catDisplay = "Add-ons";
      if (catCode === "hantaran") catDisplay = "Hantaran";
      else if (catCode === "prawedding") catDisplay = "Prawedding";
      else if (catCode === "wedding") catDisplay = "Wedding";
      else if (catCode === "clip") catDisplay = "Wedding Clip";
      
      const formattedDetails = item.details.split(', ').map(inc => `     • ${inc}`).join('\n');
      itemStrings += `${index + 1}. *[ ${catDisplay} ] ${item.name}*\n   - _Harga: ${formatRupiah(item.price)}_\n   - _Rincian:_\n${formattedDetails}\n\n`;
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
                    `📎 *Invoice PDF sudah terunduh otomatis di perangkat Anda.*\n` +
                    `Silakan lampirkan dokumen invoice tersebut bersama pesan ini.\n\n` +
                    `Terima kasih telah memilih Shift Photography!`;

    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${adminWhatsAppNumber}?text=${encodedMessage}`;
    
    // Step 3 — Open WhatsApp after download triggered
    setTimeout(() => { window.open(waUrl, '_blank'); }, 800);
    
  }).catch(err => {
    if (document.body.contains(clone)) {
      document.body.removeChild(clone);
    }
    console.error('Error generating invoice PDF for WA: ', err);
    alert('Gagal menyiapkan invoice. Silakan coba lagi.');
  }).finally(() => {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Checkout'; }
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
  // Load cart and customer data from localStorage
  cart = LocalDB.loadCart();
  unselectedCartItemIds = LocalDB.loadUnselectedItems();
  
  // Load customer form data if exists
  const savedCustomerData = LocalDB.loadCustomerData();
  if (savedCustomerData) {
    const inputNames = document.getElementById('input-names');
    const inputStartDate = document.getElementById('input-start-date');
    const inputEndDate = document.getElementById('input-end-date');
    const inputVenue = document.getElementById('input-venue');
    
    if (inputNames && savedCustomerData.names) inputNames.value = savedCustomerData.names;
    if (inputStartDate && savedCustomerData.startDate) inputStartDate.value = savedCustomerData.startDate;
    if (inputEndDate && savedCustomerData.endDate) inputEndDate.value = savedCustomerData.endDate;
    if (inputVenue && savedCustomerData.venue) inputVenue.value = savedCustomerData.venue;
  }
  
  // Auto-save customer form data on input
  const setupAutoSave = () => {
    const inputNames = document.getElementById('input-names');
    const inputStartDate = document.getElementById('input-start-date');
    const inputEndDate = document.getElementById('input-end-date');
    const inputVenue = document.getElementById('input-venue');
    
    const saveCustomerData = () => {
      const customerData = {
        names: inputNames?.value || '',
        startDate: inputStartDate?.value || '',
        endDate: inputEndDate?.value || '',
        venue: inputVenue?.value || '',
        lastUpdated: new Date().toISOString()
      };
      LocalDB.saveCustomerData(customerData);
    };
    
    if (inputNames) inputNames.addEventListener('input', saveCustomerData);
    if (inputStartDate) inputStartDate.addEventListener('change', saveCustomerData);
    if (inputEndDate) inputEndDate.addEventListener('change', saveCustomerData);
    if (inputVenue) inputVenue.addEventListener('input', saveCustomerData);
  };
  
  initSparkles();
  initMobileBottomNav();
  initMusicPlayer();
  initGallery();
  initScrollReveal();
  initHeaderScroll();
  initScrollActiveNav();
  updatePricelistButtonsState();
  updateCartUI(); // Update cart UI with loaded data
  setupAutoSave(); // Setup auto-save for customer form
  
  const openCartBtn = document.getElementById('open-cart-btn');
  if (openCartBtn) {
    openCartBtn.addEventListener('click', () => {
      openCart();
      syncMobileCartActiveState();
    });
  }
});
