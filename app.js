// Constants and configuration
const API_BASE_URL = 'https://api.coingecko.com/api/v3';
const COIN_COUNT = 6; // Number of coins to display per category
const CATEGORY_IDS = {
    crypto: '', // Default market
    ai: 'artificial-intelligence',
    meme: 'meme-token',
    rwa: 'real-world-assets-rwa', // Updated to match current CoinGecko category ID
    gaming: 'gaming',
    stablecoins: 'stablecoins'
};
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const FORCE_CACHE_ON_RATE_LIMIT = true; // Use cached data even if expired when rate limited

// DOM Elements
const themeIcon = document.getElementById('theme-icon');
const lastUpdatedEl = document.getElementById('last-updated');

// State
let currentTheme = localStorage.getItem('theme') || 'dark';
let apiCache = JSON.parse(localStorage.getItem('apiCache')) || {};
let rateLimitHit = false;
let lastRateLimitTime = 0;
const RATE_LIMIT_COOLDOWN = 60 * 1000; // 1 minute cooldown after rate limit

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Remove the cache clearing code after testing
    // localStorage.removeItem('apiCache');
    // apiCache = {};
    
    // Initialize theme first to prevent flash of wrong theme
    initTheme();
    loadCachedData();
    
    // Load all categories at once for grid layout
    // Use a more reliable approach to ensure all categories load
    const categories = Object.keys(CATEGORY_IDS);
    categories.forEach((category, index) => {
        // Add increasing delays to avoid overwhelming the API
        setTimeout(() => {
            fetchCoinsByCategory(category);
        }, index * 1000); // 1 second between each category
    });
    
    // Fetch trending coins after a delay
    setTimeout(() => {
        fetchTrendingCoins();
    }, categories.length * 1000 + 1000);
    
    // Set last updated time
    updateLastUpdatedTime();
    
    // Initialize theme toggle
    themeIcon.addEventListener('click', toggleTheme);
});

// Cache functions
function getCachedData(key, allowExpired = false) {
    const cachedItem = apiCache[key];
    if (cachedItem) {
        const isExpired = (Date.now() - cachedItem.timestamp) >= CACHE_DURATION;
        
        // Return cached data if not expired or if we're allowing expired data
        if (!isExpired || allowExpired) {
            return cachedItem.data;
        }
    }
    return null;
}

function setCachedData(key, data) {
    apiCache[key] = {
        timestamp: Date.now(),
        data: data
    };
    
    // Save to localStorage (but be mindful of size limits)
    try {
        // First, check if we're approaching localStorage limits
        const cacheString = JSON.stringify(apiCache);
        if (cacheString.length > 4000000) { // ~4MB limit in most browsers
            // If cache is too large, remove oldest entries
            pruneCache();
        }
        
        localStorage.setItem('apiCache', JSON.stringify(apiCache));
    } catch (e) {
        console.warn('Failed to save cache to localStorage. Pruning cache.', e);
        pruneCache(true); // Aggressive pruning
        try {
            localStorage.setItem('apiCache', JSON.stringify(apiCache));
        } catch (e) {
            console.error('Still unable to save cache after pruning. Clearing cache.', e);
            apiCache = {};
            localStorage.removeItem('apiCache');
        }
    }
}

function pruneCache(aggressive = false) {
    // Get all cache keys and their timestamps
    const cacheEntries = Object.entries(apiCache).map(([key, value]) => ({
        key,
        timestamp: value.timestamp
    }));
    
    // Sort by timestamp (oldest first)
    cacheEntries.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest entries until we're under the limit
    const removeCount = aggressive ? Math.ceil(cacheEntries.length * 0.5) : Math.ceil(cacheEntries.length * 0.25);
    
    cacheEntries.slice(0, removeCount).forEach(entry => {
        delete apiCache[entry.key];
    });
    
    console.log(`Pruned ${removeCount} cache entries`);
}

function checkRateLimit() {
    // If we've hit a rate limit recently, use cached data for a while
    if (rateLimitHit) {
        const timeSinceRateLimit = Date.now() - lastRateLimitTime;
        if (timeSinceRateLimit < RATE_LIMIT_COOLDOWN) {
            return true; // Still in cooldown period
        } else {
            rateLimitHit = false; // Cooldown period over
            return false;
        }
    }
    return false;
}

function setRateLimitHit() {
    rateLimitHit = true;
    lastRateLimitTime = Date.now();
    console.warn('Rate limit hit, using cached data for the next minute');
}

// Theme functions
function initTheme() {
    // Force dark theme by default, regardless of localStorage
    document.documentElement.setAttribute('data-theme', 'dark');
    themeIcon.classList.remove('bi-moon-fill');
    themeIcon.classList.add('bi-sun-fill');
    currentTheme = 'dark';
    localStorage.setItem('theme', currentTheme);
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.classList.remove('bi-moon-fill');
        themeIcon.classList.add('bi-sun-fill');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeIcon.classList.remove('bi-sun-fill');
        themeIcon.classList.add('bi-moon-fill');
    }
}

// Utility functions
function formatNumber(num, maximumFractionDigits = 2) {
    if (num === null || num === undefined) return 'N/A';
    
    if (Math.abs(num) >= 1e9) {
        return (num / 1e9).toLocaleString(undefined, { maximumFractionDigits }) + 'B';
    } else if (Math.abs(num) >= 1e6) {
        return (num / 1e6).toLocaleString(undefined, { maximumFractionDigits }) + 'M';
    } else if (Math.abs(num) >= 1e3) {
        return (num / 1e3).toLocaleString(undefined, { maximumFractionDigits }) + 'K';
    } else {
        return num.toLocaleString(undefined, { maximumFractionDigits });
    }
}

function formatPrice(price) {
    if (price === null || price === undefined) return 'N/A';
    
    if (price < 0.01) {
        return `<span class="coin-price">$${price.toFixed(6)}</span>`;
    } else if (price < 1) {
        return `<span class="coin-price">$${price.toFixed(4)}</span>`;
    } else if (price < 10) {
        return `<span class="coin-price">$${price.toFixed(2)}</span>`;
    } else {
        return `<span class="coin-price">$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>`;
    }
}

function formatPercentage(percentage) {
    if (percentage === null || percentage === undefined) return 'N/A';
    
    const formattedValue = percentage.toFixed(2) + '%';
    const className = percentage >= 0 ? 'positive' : 'negative';
    const arrow = percentage >= 0 ? '▲' : '▼';
    
    return `<span class="${className}">${arrow} ${formattedValue}</span>`;
}

function updateLastUpdatedTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    lastUpdatedEl.textContent = `Last updated: ${timeString}`;
}

// API functions
async function fetchWithRetry(url, retries = 3, delay = 1000) {
    // Check if we're in rate limit cooldown
    const isRateLimited = checkRateLimit();
    
    // Check cache first (allow expired data if rate limited)
    const cachedData = getCachedData(url, isRateLimited);
    if (cachedData) {
        return cachedData;
    }
    
    // If we're rate limited but don't have any cached data, we still need to try the API
    let lastError;
    
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            
            // Check for rate limiting response
            if (response.status === 429) {
                console.warn('Rate limit exceeded');
                setRateLimitHit();
                
                // Try to use expired cache data as fallback
                if (FORCE_CACHE_ON_RATE_LIMIT) {
                    const expiredCache = getCachedData(url, true);
                    if (expiredCache) {
                        console.log('Using expired cache data due to rate limit');
                        return expiredCache;
                    }
                }
                
                throw new Error('Rate limit exceeded');
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache the successful response
            setCachedData(url, data);
            
            return data;
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            lastError = error;
            
            // If we hit a rate limit, use any available cached data even if expired
            if (error.message.includes('Rate limit') && FORCE_CACHE_ON_RATE_LIMIT) {
                const expiredCache = getCachedData(url, true);
                if (expiredCache) {
                    console.log('Using expired cache data due to rate limit');
                    return expiredCache;
                }
            }
            
            if (i < retries - 1) {
                // Wait before retrying, with exponential backoff
                const backoffDelay = delay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
        }
    }
    
    throw lastError;
}

async function fetchCoinsByCategory(category) {
    // First check if we have cached data and display it immediately
    const cachedData = getCachedData(`category_${category}`, true); // Allow expired data
    if (cachedData) {
        console.log(`Using cached data for ${category} initial display`);
        updateCoinTableUI(category, cachedData);
    }
    
    try {
        const categoryId = CATEGORY_IDS[category];
        const url = categoryId 
            ? `${API_BASE_URL}/coins/markets?vs_currency=usd&category=${categoryId}&order=market_cap_desc&per_page=${COIN_COUNT}&page=1&sparkline=false&price_change_percentage=24h`
            : `${API_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${COIN_COUNT}&page=1&sparkline=false&price_change_percentage=24h`;
        
        console.log(`Fetching ${category} coins with URL: ${url}`);
        
        let data;
        try {
            data = await fetchWithRetry(url);
        } catch (fetchError) {
            // Special handling for RWA category
            if (category === 'rwa' && fetchError) {
                console.log('Attempting fallback for RWA category...');
                // Try an alternative approach - fetch specific RWA coins by ID
                const rwaCoins = ['tether-gold', 'paxos-gold', 'aave-usdc', 'maker', 'compound-usdt', 'ondo-finance', 'maple'];
                const fallbackUrl = `${API_BASE_URL}/coins/markets?vs_currency=usd&ids=${rwaCoins.join(',')}&order=market_cap_desc&per_page=${COIN_COUNT}&page=1&sparkline=false&price_change_percentage=24h`;
                data = await fetchWithRetry(fallbackUrl);
            } else {
                throw fetchError;
            }
        }
        
        console.log(`${category} data received:`, data.length > 0 ? `${data.length} coins` : 'No coins found');
        
        setCachedData(`category_${category}`, data);
        updateCoinTableUI(category, data);
    } catch (error) {
        console.error(`Error fetching ${category} coins:`, error);
        
        // Only show error if we don't have cached data
        if (!cachedData) {
            const tableBodyId = `${category}-table-body`;
            document.getElementById(tableBodyId).innerHTML = '<tr><td colspan="3" class="text-center text-danger">Failed to load data. Please try again later.</td></tr>';
        }
    }
}

function updateCoinTableUI(category, coins) {
    const tableBodyId = `${category}-table-body`;
    const tableBody = document.getElementById(tableBodyId);
    
    if (!tableBody) return;
    
    if (coins.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No coins found in this category.</td></tr>';
        return;
    }
    
    tableBody.innerHTML = '';
    
    coins.forEach((coin, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-coin-id', coin.id);
        row.addEventListener('click', () => showCoinDetails(coin.id));
        
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <img src="${coin.image}" alt="${coin.name}" class="coin-image">
                    <div>
                        <div class="coin-name">${coin.name}</div>
                        <div class="coin-symbol">${coin.symbol}</div>
                    </div>
                </div>
            </td>
            <td class="coin-price">${formatPrice(coin.current_price)}</td>
            <td>${formatPercentage(coin.price_change_percentage_24h)}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

async function fetchTrendingCoins() {
    try {
        const data = await fetchWithRetry(`${API_BASE_URL}/search/trending`);
        
        // Get trending coin IDs to fetch price data
        const coinIds = data.coins.slice(0, 6).map(item => item.item.id).join(',');
        
        // Fetch price data for trending coins
        const priceData = await fetchWithRetry(`${API_BASE_URL}/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&per_page=6&page=1&sparkline=false&price_change_percentage=24h`);
        
        // Combine trending data with price data
        const combinedData = {
            coins: data.coins,
            priceData: priceData
        };
        
        setCachedData('trending', combinedData);
        updateTrendingCoinsUI(combinedData);
    } catch (error) {
        console.error('Error fetching trending coins:', error);
        document.getElementById('trending-coins').innerHTML = '<p class="text-center text-danger">Failed to load trending coins. Please try again later.</p>';
    }
}

function updateTrendingCoinsUI(trendingData) {
    const trendingCoinsEl = document.getElementById('trending-coins');
    
    if (!trendingCoinsEl) return;
    
    if (!trendingData.coins || trendingData.coins.length === 0) {
        trendingCoinsEl.innerHTML = '<p class="text-center">No trending coins available.</p>';
        return;
    }
    
    trendingCoinsEl.innerHTML = '';
    
    // Limit to 6 trending coins for compact layout
    const coinsToShow = trendingData.coins.slice(0, 6);
    
    coinsToShow.forEach(item => {
        const coin = item.item;
        const trendingCoin = document.createElement('div');
        trendingCoin.className = 'trending-coin';
        trendingCoin.setAttribute('data-coin-id', coin.id);
        trendingCoin.addEventListener('click', () => showCoinDetails(coin.id));
        
        // Find price data for this coin
        const priceInfo = trendingData.priceData ? trendingData.priceData.find(p => p.id === coin.id) : null;
        const priceChange = priceInfo ? formatPercentage(priceInfo.price_change_percentage_24h) : '';
        const price = priceInfo ? formatPrice(priceInfo.current_price) : '';
        
        // Use the coin's market cap rank if available, otherwise use a generic "Trending" badge
        let trendBadge = '';
        if (coin.market_cap_rank) {
            trendBadge = `<span class="badge bg-primary">Rank: ${coin.market_cap_rank}</span>`;
        } else {
            trendBadge = `<span class="trend-badge">Trending</span>`;
        }
        
        trendingCoin.innerHTML = `
            <img src="${coin.small}" alt="${coin.name}">
            <div class="trending-coin-info">
                <div class="trending-coin-name">${coin.name} ${trendBadge}</div>
                <div class="trending-coin-price">${coin.symbol} ${price} ${priceChange}</div>
            </div>
        `;
        
        trendingCoinsEl.appendChild(trendingCoin);
    });
}

// Coin details modal
function showCoinDetails(coinId) {
    // Redirect to the coin detail page
    window.location.href = `coin.html?id=${coinId}`;
}

function loadCachedData() {
    // Try to load data from cache first
    const globalData = getCachedData('global');
    if (globalData) {
        updateGlobalMarketUI(globalData);
    }
    
    Object.keys(CATEGORY_IDS).forEach(category => {
        const categoryData = getCachedData(`category_${category}`);
        if (categoryData) {
            updateCoinTableUI(category, categoryData);
        }
    });
    
    const trendingData = getCachedData('trending');
    if (trendingData) {
        updateTrendingCoinsUI(trendingData);
    }
}
