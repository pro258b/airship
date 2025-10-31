// Shop items data
const shopItems = [
    {
        id: 1,
        handle: 'tamper-proof-bags-10-pack',
        title: "Tamper-Proof Bags (10 pack)",
        description: "Security bags with unique serial numbers. Perfect for storing seed phrases and important documents.",
        price: 3,
        btcPrice: "~0.000045 BTC",
        icon: "🔒",
        image: "products/tamper-bags.webp", // Add your image path here
        category: "security"
    },
    {
        id: 2,
        handle: 'tamper-evident-seals-20-pack',
        title: "Tamper-Evident Seals (20 pack)",
        description: "Self-adhesive security seals that show clear evidence of tampering. Ideal for hardware wallets.",
        price: 5,
        btcPrice: "~0.000075 BTC",
        icon: "🏷️",
        image: "products/tamper-stickers.webp", // Add your image path here
        category: "security"
    },
    {
        id: 3,
        handle: 'metal-seed-phrase-backup',
        title: "Metal Seed Phrase Backup",
        description: "Fireproof and waterproof stainless steel backup for your 24-word seed phrase.",
        price: 45,
        btcPrice: "~0.00068 BTC",
        icon: "🔩",
        category: "backup"
    },
    {
        id: 4,
        handle: 'hardware-wallet-case',
        title: "Hardware Wallet Case",
        description: "Protective case for Ledger, Trezor, and other hardware wallets. Shock-resistant.",
        price: 15,
        btcPrice: "~0.00023 BTC",
        icon: "💼",
        category: "storage"
    },
    {
        id: 5,
        handle: 'faraday-bag',
        title: "Faraday Bag",
        description: "Signal-blocking bag to protect your devices from remote attacks and tracking.",
        price: 25,
        btcPrice: "~0.00038 BTC",
        icon: "📡",
        category: "security"
    },
    {
        id: 6,
        handle: 'steel-capsule',
        title: "Steel Capsule",
        description: "Waterproof steel capsule for storing paper wallets and seed phrases.",
        price: 35,
        btcPrice: "~0.00053 BTC",
        icon: "🧪",
        category: "storage"
    },
    {
        id: 7,
        handle: 'privacy-screen-protector',
        title: "Privacy Screen Protector",
        description: "Anti-spy screen protector for your phone. Prevents shoulder surfing.",
        price: 12,
        btcPrice: "~0.00018 BTC",
        icon: "📱",
        category: "security"
    },
    {
        id: 8,
        handle: 'holographic-stickers-50-pack',
        title: "Holographic Stickers (50 pack)",
        description: "Tamper-evident holographic stickers for securing devices and packages.",
        price: 8,
        btcPrice: "~0.00012 BTC",
        icon: "✨",
        category: "security"
    },
    {
        id: 9,
        handle: 'fireproof-document-bag',
        title: "Fireproof Document Bag",
        description: "Fire-resistant bag rated to 2000°F. Protects paper wallets and documents.",
        price: 30,
        btcPrice: "~0.00045 BTC",
        icon: "🔥",
        category: "storage"
    },
    {
        id: 10,
        handle: 'usb-dead-drop-kit',
        title: "USB Dead Drop Kit",
        description: "Secure USB storage with tamper-evident casing. Perfect for cold storage.",
        price: 20,
        btcPrice: "~0.0003 BTC",
        icon: "💾",
        category: "storage"
    },
    {
        id: 11,
        handle: 'seed-phrase-tiles',
        title: "Seed Phrase Tiles",
        description: "Laser-engraved metal tiles for creating permanent seed phrase backups.",
        price: 55,
        btcPrice: "~0.00083 BTC",
        icon: "🔤",
        category: "backup"
    },
    {
        id: 12,
        handle: 'security-seal-tape',
        title: "Security Seal Tape",
        description: "Tamper-evident tape that leaves 'VOID' pattern when removed. 50m roll.",
        price: 18,
        btcPrice: "~0.00027 BTC",
        icon: "📦",
        category: "security"
    },
    {
        id: 13,
        handle: 'crypto-steel-cassette',
        title: "Crypto Steel Cassette",
        description: "Premium stainless steel backup solution with automatic punch system.",
        price: 85,
        btcPrice: "~0.00128 BTC",
        icon: "💿",
        category: "backup"
    },
    {
        id: 14,
        handle: 'portable-safe-box',
        title: "Portable Safe Box",
        description: "Compact steel safe with combination lock. Perfect for travel.",
        price: 40,
        btcPrice: "~0.0006 BTC",
        icon: "🔐",
        category: "storage"
    },
    {
        id: 15,
        handle: 'anti-static-bags-25-pack',
        title: "Anti-Static Bags (25 pack)",
        description: "ESD-safe bags for storing hardware wallets and electronic devices.",
        price: 10,
        btcPrice: "~0.00015 BTC",
        icon: "⚡",
        category: "storage"
    },
    {
        id: 16,
        handle: 'webcam-cover-slider',
        title: "Webcam Cover Slider",
        description: "Physical privacy cover for laptop and phone cameras. 3-pack.",
        price: 6,
        btcPrice: "~0.00009 BTC",
        icon: "📷",
        category: "security"
    },
    {
        id: 17,
        handle: 'titanium-seed-plate',
        title: "Titanium Seed Plate",
        description: "Military-grade titanium plate for permanent seed phrase storage.",
        price: 95,
        btcPrice: "~0.00143 BTC",
        icon: "🛡️",
        category: "backup"
    },
    {
        id: 18,
        handle: 'rfid-blocking-sleeves-10-pack',
        title: "RFID Blocking Sleeves (10 pack)",
        description: "Protect your cards and passports from RFID skimming attacks.",
        price: 12,
        btcPrice: "~0.00018 BTC",
        icon: "💳",
        category: "security"
    },
    {
        id: 19,
        handle: 'desiccant-packs-50-pack',
        title: "Desiccant Packs (50 pack)",
        description: "Silica gel packets to protect your backups from moisture damage.",
        price: 8,
        btcPrice: "~0.00012 BTC",
        icon: "💧",
        category: "storage"
    },
    {
        id: 20,
        handle: 'security-audit-kit',
        title: "Security Audit Kit",
        description: "Complete kit with UV light, magnifier, and testing tools for verifying hardware.",
        price: 65,
        btcPrice: "~0.00098 BTC",
        icon: "🔍",
        category: "security"
    }
];

const stripePriceMeta = typeof document !== 'undefined' ? document.querySelector('meta[name="stripe-price-registry"]') : null;
const STRIPE_PRICE_REGISTRY_URL = stripePriceMeta && stripePriceMeta.content ? stripePriceMeta.content : 'stripe-prices.json';
let stripePriceRegistryPromise = null;
let stripePriceCache = null;

function formatStripeAmount(unitAmount, decimalPlaces, currency) {
    if (typeof unitAmount !== 'number' || !Number.isFinite(unitAmount)) {
        return null;
    }

    const decimals = typeof decimalPlaces === 'number' && Number.isFinite(decimalPlaces) ? decimalPlaces : 2;
    const divisor = Math.pow(10, decimals);
    const normalisedCurrency = (currency || 'usd').toUpperCase();
    const amount = unitAmount / divisor;

    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: normalisedCurrency,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(amount);
    } catch (err) {
        return `${normalisedCurrency} ${amount.toFixed(decimals)}`;
    }
}

async function loadStripePriceRegistry() {
    if (stripePriceCache) {
        return stripePriceCache;
    }

    if (!stripePriceRegistryPromise) {
        stripePriceRegistryPromise = fetch(STRIPE_PRICE_REGISTRY_URL, { cache: 'no-store' })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load ${STRIPE_PRICE_REGISTRY_URL}: ${response.status}`);
                }
                return response.json();
            })
            .then(payload => {
                const entries = Array.isArray(payload && payload.prices) ? payload.prices : [];
                const registry = {};
                entries.forEach(entry => {
                    if (!entry || !entry.handle) {
                        return;
                    }
                    registry[entry.handle] = entry;
                });
                stripePriceCache = registry;
                return registry;
            })
            .catch(error => {
                console.warn('Stripe price registry unavailable, using static prices.', error);
                stripePriceCache = {};
                return stripePriceCache;
            });
    }

    return stripePriceRegistryPromise;
}

async function applyStripePriceTags() {
    const registry = await loadStripePriceRegistry();
    if (!registry || !Object.keys(registry).length) {
        return;
    }

    document.querySelectorAll('.item-price').forEach(node => {
        const handle = node.getAttribute('data-stripe-handle');
        if (!handle) {
            return;
        }

        const entry = registry[handle];
        if (!entry) {
            return;
        }

        const unitAmount = typeof entry.unit_amount === 'number' ? entry.unit_amount : Number(entry.unit_amount);
        if (!Number.isFinite(unitAmount)) {
            return;
        }

        const decimalPlaces = Number.isFinite(entry.decimal_places) ? entry.decimal_places : undefined;
        const formatted = formatStripeAmount(unitAmount, decimalPlaces, entry.currency);
        if (!formatted) {
            return;
        }

        node.textContent = formatted;
        if (entry.stripe_price_id) {
            node.dataset.stripePriceId = entry.stripe_price_id;
        }
        if (entry.updated_datetime) {
            node.dataset.updatedDatetime = entry.updated_datetime;
        }
    });
}

function getStripeDisplayPrice(handle) {
    if (!handle || !stripePriceCache) {
        return null;
    }

    const entry = stripePriceCache[handle];
    if (!entry) {
        return null;
    }

    const unitAmount = typeof entry.unit_amount === 'number' ? entry.unit_amount : Number(entry.unit_amount);
    if (!Number.isFinite(unitAmount)) {
        return null;
    }

    const decimalPlaces = Number.isFinite(entry.decimal_places) ? entry.decimal_places : undefined;
    return formatStripeAmount(unitAmount, decimalPlaces, entry.currency);
}

// Render shop items
function renderShopItems(items) {
    const shopGrid = document.getElementById('shopGrid');
    shopGrid.innerHTML = '';
    
    items.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'shop-item';
        itemCard.dataset.category = item.category;
        
        itemCard.innerHTML = `
            <div class="item-image">
                ${item.image ? `<img src="${item.image}" alt="${item.title}" onerror="this.parentElement.innerHTML='${item.icon}'">` : item.icon}
            </div>
            <div class="item-title">${item.title}</div>
            <div class="item-description">${item.description}</div>
            <div class="item-price" data-stripe-handle="${item.handle ? item.handle : ""}" data-default-price="${item.price}">$${item.price}</div>
            <div class="item-btc-price">${item.btcPrice}</div>
            <button class="buy-button" onclick="buyItem(${item.id})">Add to Cart</button>
        `;
        
        shopGrid.appendChild(itemCard);
    });
    applyStripePriceTags();
}

// Filter functionality
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // Update active state
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const category = this.dataset.category;
        
        if (category === 'all') {
            renderShopItems(shopItems);
        } else {
            const filtered = shopItems.filter(item => item.category === category);
            renderShopItems(filtered);
        }
    });
});

// Buy item function
function buyItem(itemId) {
    const item = shopItems.find(i => i.id === itemId);
    if (!item) {
        return;
    }

    const dynamicPrice = getStripeDisplayPrice(item.handle);
    const priceLabel = dynamicPrice || `$${item.price}`;
    alert(`Added "${item.title}" to cart!\n\nPrice: ${priceLabel} (${item.btcPrice})\n\nCheckout coming soon!`);
}

// Initialize shop
renderShopItems(shopItems);
