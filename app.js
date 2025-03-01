// Constants and configuration
const API_BASE_URL = 'https://api.coingecko.com/api/v3';
const COIN_COUNT = 5; // Number of coins to display per category
const CATEGORY_IDS = {
    crypto: '', // Default market
    ai: 'artificial-intelligence',
    meme: 'meme-token',
    rwa: 'real-world-assets',
    gaming: 'gaming',
    stablecoins: 'stablecoins'
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// DOM Elements
const themeIcon = document.getElementById('theme-icon');
const lastUpdatedEl = document.getElementById('last-updated');

// State
let currentTheme = localStorage.getItem('theme') || 'light';
let apiCache = JSON.parse(localStorage.getItem('apiCache')) || {};
let apiQueue = [];
let isProcessingQueue = false;
const API_RATE_LIMIT_DELAY = 1500; // 1.5 seconds between API calls

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadCachedData();
    
    // Queue API calls with delays to avoid rate limiting
    queueApiCall(() => fetchGlobalMarketData());
    
    // Load all categories at once for grid layout
    Object.keys(CATEGORY_IDS).forEach(category => {
        queueApiCall(() => fetchCoinsByCategory(category));
    });
    
    queueApiCall(() => fetchTrendingCoins());
    queueApiCall(() => fetchRecentlyAddedCoins());
    
    // Set last updated time
    updateLastUpdatedTime();
    
    // Initialize theme toggle
    themeIcon.addEventListener('click', toggleTheme);
    
    // Process the API queue
    processApiQueue();
});

// API Queue functions
function queueApiCall(apiCallFn) {
    apiQueue.push(apiCallFn);
    if (!isProcessingQueue) {
        processApiQueue();
    }
}

function processApiQueue() {
    if (apiQueue.length === 0) {
        isProcessingQueue = false;
        return;
    }
    
    isProcessingQueue = true;
    const apiCall = apiQueue.shift();
    
    apiCall();
    
    setTimeout(() => {
        processApiQueue();
    }, API_RATE_LIMIT_DELAY);
}

// Cache functions
function getCachedData(key) {
    const cachedItem = apiCache[key];
    if (cachedItem && (Date.now() - cachedItem.timestamp) < CACHE_DURATION) {
        return cachedItem.data;
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
        localStorage.setItem('apiCache', JSON.stringify(apiCache));
    } catch (e) {
        console.warn('Failed to save cache to localStorage. Clearing cache.', e);
        apiCache = {};
        localStorage.removeItem('apiCache');
    }
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
    
    const recentlyAddedData = getCachedData('recently_added');
    if (recentlyAddedData) {
        updateRecentlyAddedUI(recentlyAddedData);
    }
}

// Theme functions
function initTheme() {
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

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    initTheme();
}

// Utility functions
function formatNumber(num, maximumFractionDigits = 2) {
    if (num === null || num === undefined) return 'N/A';
    
    if (num >= 1e12) {
        return (num / 1e12).toLocaleString(undefined, { maximumFractionDigits }) + 'T';
    } else if (num >= 1e9) {
        return (num / 1e9).toLocaleString(undefined, { maximumFractionDigits }) + 'B';
    } else if (num >= 1e6) {
        return (num / 1e6).toLocaleString(undefined, { maximumFractionDigits }) + 'M';
    } else if (num >= 1e3) {
        return (num / 1e3).toLocaleString(undefined, { maximumFractionDigits }) + 'K';
    } else if (num < 0.01 && num > 0) {
        return num.toLocaleString(undefined, { maximumSignificantDigits: 4 });
    } else {
        return num.toLocaleString(undefined, { maximumFractionDigits });
    }
}

function formatPrice(price) {
    if (price === null || price === undefined) return 'N/A';
    
    if (price < 0.01) {
        return '$' + price.toLocaleString(undefined, { maximumSignificantDigits: 4 });
    } else {
        return '$' + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    lastUpdatedEl.textContent = now.toLocaleString();
}

// API functions
async function fetchWithRetry(url, retries = 3, delay = 1000) {
    // Check cache first
    const cachedData = getCachedData(url);
    if (cachedData) {
        return cachedData;
    }
    
    let lastError;
    
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            
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
            
            if (i < retries - 1) {
                // Wait before retrying, with exponential backoff
                const backoffDelay = delay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
        }
    }
    
    throw lastError;
}

async function fetchGlobalMarketData() {
    try {
        const data = await fetchWithRetry(`${API_BASE_URL}/global`);
        updateGlobalMarketUI(data);
    } catch (error) {
        console.error('Error fetching global market data:', error);
        document.getElementById('market-stats').innerHTML = '<div class="col-12 text-center text-danger">Failed to load market data. Please try again later.</div>';
    }
}

function updateGlobalMarketUI(globalData) {
    const data = globalData.data;
    document.getElementById('total-market-cap').textContent = formatNumber(data.total_market_cap.usd);
    document.getElementById('market-cap-change').innerHTML = formatPercentage(data.market_cap_change_percentage_24h_usd);
    document.getElementById('total-volume').textContent = formatNumber(data.total_volume.usd);
    document.getElementById('btc-dominance').textContent = formatNumber(data.market_cap_percentage.btc, 1) + '%';
    document.getElementById('active-coins').textContent = formatNumber(data.active_cryptocurrencies);
}

async function fetchCoinsByCategory(category) {
    try {
        const categoryId = CATEGORY_IDS[category];
        const url = categoryId 
            ? `${API_BASE_URL}/coins/markets?vs_currency=usd&category=${categoryId}&order=market_cap_desc&per_page=${COIN_COUNT}&page=1&sparkline=false&price_change_percentage=24h`
            : `${API_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${COIN_COUNT}&page=1&sparkline=false&price_change_percentage=24h`;
        
        const data = await fetchWithRetry(url);
        setCachedData(`category_${category}`, data);
        updateCoinTableUI(category, data);
    } catch (error) {
        console.error(`Error fetching ${category} coins:`, error);
        const tableBodyId = `${category}-table-body`;
        document.getElementById(tableBodyId).innerHTML = '<tr><td colspan="4" class="text-center text-danger">Failed to load data. Please try again later.</td></tr>';
    }
}

function updateCoinTableUI(category, coins) {
    const tableBodyId = `${category}-table-body`;
    const tableBody = document.getElementById(tableBodyId);
    
    if (!tableBody) return;
    
    if (coins.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No coins found in this category.</td></tr>';
        return;
    }
    
    tableBody.innerHTML = '';
    
    coins.forEach((coin, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-coin-id', coin.id);
        row.addEventListener('click', () => showCoinDetails(coin.id));
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <div class="d-flex align-items-center">
                    <img src="${coin.image}" alt="${coin.name}" class="coin-image">
                    <div>
                        <div class="coin-name">${coin.name}</div>
                        <div class="coin-symbol">${coin.symbol}</div>
                    </div>
                </div>
            </td>
            <td>${formatPrice(coin.current_price)}</td>
            <td>${formatPercentage(coin.price_change_percentage_24h)}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

async function fetchTrendingCoins() {
    try {
        const data = await fetchWithRetry(`${API_BASE_URL}/search/trending`);
        setCachedData('trending', data);
        updateTrendingCoinsUI(data);
    } catch (error) {
        console.error('Error fetching trending coins:', error);
        document.getElementById('trending-coins').innerHTML = '<p class="text-center text-danger">Failed to load trending coins. Please try again later.</p>';
    }
}

function updateTrendingCoinsUI(trendingCoins) {
    const trendingCoinsEl = document.getElementById('trending-coins');
    
    if (!trendingCoinsEl) return;
    
    if (!trendingCoins.coins || trendingCoins.coins.length === 0) {
        trendingCoinsEl.innerHTML = '<p class="text-center">No trending coins available.</p>';
        return;
    }
    
    trendingCoinsEl.innerHTML = '';
    
    // Limit to 6 trending coins for compact layout
    const coinsToShow = trendingCoins.coins.slice(0, 6);
    
    coinsToShow.forEach(item => {
        const coin = item.item;
        const trendingCoin = document.createElement('div');
        trendingCoin.className = 'trending-coin';
        trendingCoin.setAttribute('data-coin-id', coin.id);
        trendingCoin.addEventListener('click', () => showCoinDetails(coin.id));
        
        trendingCoin.innerHTML = `
            <img src="${coin.small}" alt="${coin.name}">
            <div class="trending-coin-info">
                <div class="trending-coin-name">${coin.name}</div>
                <div class="trending-coin-price">${coin.symbol} #${coin.market_cap_rank || 'N/A'}</div>
            </div>
        `;
        
        trendingCoinsEl.appendChild(trendingCoin);
    });
}

async function fetchRecentlyAddedCoins() {
    try {
        const data = await fetchWithRetry(`${API_BASE_URL}/coins/markets?vs_currency=usd&order=created_desc&per_page=6&page=1&sparkline=false`);
        setCachedData('recently_added', data);
        updateRecentlyAddedUI(data);
    } catch (error) {
        console.error('Error fetching recently added coins:', error);
        document.getElementById('recently-added').innerHTML = '<p class="text-center text-danger">Failed to load recently added coins. Please try again later.</p>';
    }
}

function updateRecentlyAddedUI(coins) {
    const recentlyAddedEl = document.getElementById('recently-added');
    
    if (!recentlyAddedEl) return;
    
    if (coins.length === 0) {
        recentlyAddedEl.innerHTML = '<p class="text-center">No recently added coins available.</p>';
        return;
    }
    
    recentlyAddedEl.innerHTML = '';
    
    coins.forEach(coin => {
        const coinEl = document.createElement('div');
        coinEl.className = 'trending-coin';
        coinEl.setAttribute('data-coin-id', coin.id);
        coinEl.addEventListener('click', () => showCoinDetails(coin.id));
        
        coinEl.innerHTML = `
            <img src="${coin.image}" alt="${coin.name}">
            <div class="trending-coin-info">
                <div class="trending-coin-name">${coin.name}</div>
                <div class="trending-coin-price">${formatPrice(coin.current_price)}</div>
            </div>
        `;
        
        recentlyAddedEl.appendChild(coinEl);
    });
}

// Coin details modal
async function showCoinDetails(coinId) {
    const modalBody = document.getElementById('coin-modal-body');
    
    // Show loading spinner
    modalBody.innerHTML = `
        <div class="text-center">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    // Show the modal
    const coinModal = new bootstrap.Modal(document.getElementById('coinModal'));
    coinModal.show();
    
    try {
        const data = await fetchWithRetry(`${API_BASE_URL}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`);
        
        // Format the modal content
        modalBody.innerHTML = `
            <div class="coin-detail-header">
                <img src="${data.image.small}" alt="${data.name}">
                <div>
                    <div class="coin-detail-name">${data.name} 
                        ${data.market_cap_rank ? `<span class="market-cap-rank">#${data.market_cap_rank}</span>` : ''}
                    </div>
                    <div class="coin-detail-symbol">${data.symbol.toUpperCase()}</div>
                </div>
            </div>
            
            <div class="coin-detail-price">
                ${formatPrice(data.market_data.current_price.usd)}
                ${formatPercentage(data.market_data.price_change_percentage_24h)}
            </div>
            
            <div class="coin-detail-stats">
                <div class="coin-detail-stat">
                    <h4>Market Cap</h4>
                    <p>${formatNumber(data.market_data.market_cap.usd)}</p>
                </div>
                <div class="coin-detail-stat">
                    <h4>24h Volume</h4>
                    <p>${formatNumber(data.market_data.total_volume.usd)}</p>
                </div>
                <div class="coin-detail-stat">
                    <h4>24h High</h4>
                    <p>${formatPrice(data.market_data.high_24h.usd)}</p>
                </div>
                <div class="coin-detail-stat">
                    <h4>24h Low</h4>
                    <p>${formatPrice(data.market_data.low_24h.usd)}</p>
                </div>
            </div>
            
            <div class="coin-detail-links">
                ${data.links.homepage[0] ? `<a href="${data.links.homepage[0]}" target="_blank" class="coin-detail-link">Website</a>` : ''}
                ${data.links.blockchain_site[0] ? `<a href="${data.links.blockchain_site[0]}" target="_blank" class="coin-detail-link">Explorer</a>` : ''}
                ${data.links.official_forum_url[0] ? `<a href="${data.links.official_forum_url[0]}" target="_blank" class="coin-detail-link">Forum</a>` : ''}
                ${data.links.subreddit_url ? `<a href="${data.links.subreddit_url}" target="_blank" class="coin-detail-link">Reddit</a>` : ''}
            </div>
        `;
        
    } catch (error) {
        console.error('Error fetching coin details:', error);
        modalBody.innerHTML = '<div class="text-center text-danger">Failed to load coin details. Please try again later.</div>';
    }
}
