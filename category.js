// Category.js - Handles functionality for category pages

// Constants and configuration
const API_BASE_URL = "https://api.coingecko.com/api/v3";
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

// Get category from filename or URL parameter as fallback
let categoryParam = "ai"; // Default to AI category

// Extract category from filename (e.g., ai.html -> ai)
const pathname = window.location.pathname;
const filename = pathname.substring(pathname.lastIndexOf('/') + 1);

if (filename.endsWith('.html')) {
    // Extract category from filename pattern: category.html
    categoryParam = filename.split('.')[0];
    
    // Handle legacy filename pattern (category_category.html)
    if (categoryParam.includes('_category')) {
        categoryParam = categoryParam.split('_')[0];
    }
} else {
    // Fallback to URL parameter if filename doesn't match pattern
    const urlParams = new URLSearchParams(window.location.search);
    categoryParam = urlParams.get("category") || categoryParam;
}

// Category configurations
const CATEGORY_CONFIG = {
    top: {
        id: "top",
        name: "Top Coins by Market Cap",
        description: "The leading cryptocurrencies ranked by market capitalization",
        icon: "bi-trophy"
    },
    ai: {
        id: "artificial-intelligence",
        name: "A.I. Coins",
        description: "Cryptocurrencies focused on artificial intelligence and machine learning technologies",
        icon: "bi-robot"
    },
    meme: {
        id: "meme-token",
        name: "Meme Coins",
        description: "Cryptocurrencies inspired by internet memes and social media trends",
        icon: "bi-emoji-laughing"
    },
    rwa: {
        id: "real-world-assets-rwa",
        name: "RWA and DPIN",
        description: "Tokens representing real-world assets and decentralized physical infrastructure",
        icon: "bi-buildings"
    },
    gaming: {
        id: "gaming",
        name: "Crypto Gaming",
        description: "Gaming and metaverse related cryptocurrency tokens",
        icon: "bi-controller"
    },
    stablecoins: {
        id: "stablecoins",
        name: "Stablecoins",
        description: "Cryptocurrencies designed to minimize price volatility",
        icon: "bi-coin"
    }
};

// State variables
let apiCache = JSON.parse(localStorage.getItem("apiCache")) || {};
let categoryCoins = [];
let priceChart = null;
let selectedCoins = [];
let currentTimeframe = "7d";
let currentCategory = CATEGORY_CONFIG[categoryParam] || CATEGORY_CONFIG.ai;

// DOM Elements
const themeIcon = document.getElementById("theme-icon");
const lastUpdatedEl = document.getElementById("last-updated");
const sortSelectEl = document.getElementById("sort-select");
const timeframeSelectEl = document.getElementById("timeframe-select");
const categoryTableBodyEl = document.getElementById("ai-table-body");
const categoryMarketCapEl = document.getElementById("ai-market-cap");
const categoryVolumeEl = document.getElementById("ai-volume");
const categoryAvgChangeEl = document.getElementById("ai-avg-change");
const categoryTopPerformerEl = document.getElementById("ai-top-performer");
const priceChartEl = document.getElementById("price-chart");
const categoryNewsEl = document.getElementById("ai-news");

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
    // Update page title and header based on category
    document.title = `TradingOnramp - ${currentCategory.name}`;
    
    const categoryTitleEl = document.querySelector(".category-title");
    const categoryDescEl = document.querySelector(".category-description");
    const categoryIconEl = document.querySelector(".category-icon i");
    
    if (categoryTitleEl) categoryTitleEl.textContent = currentCategory.name;
    if (categoryDescEl) categoryDescEl.textContent = currentCategory.description;
    if (categoryIconEl) categoryIconEl.className = `bi ${currentCategory.icon}`;
    
    // Initialize theme
    initTheme();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load data from cache first
    loadCachedData();
    
    // Fetch fresh data
    fetchCategoryCoins();
    
    // Update last updated time
    updateLastUpdatedTime();
});

// Event listeners setup
function setupEventListeners() {
    // Theme toggle
    if (themeIcon) {
        themeIcon.addEventListener("click", toggleTheme);
    }
    
    // Sort select
    if (sortSelectEl) {
        sortSelectEl.addEventListener("change", () => {
            sortCategoryCoins(sortSelectEl.value);
        });
    }
    
    // Timeframe select
    if (timeframeSelectEl) {
        timeframeSelectEl.addEventListener("change", () => {
            currentTimeframe = timeframeSelectEl.value;
            if (selectedCoins.length > 0) {
                fetchPriceHistory(selectedCoins);
            }
        });
    }
}

// Theme functions
function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    
    if (themeIcon) {
        if (savedTheme === "dark") {
            themeIcon.classList.remove("bi-moon-fill");
            themeIcon.classList.add("bi-sun-fill");
        } else {
            themeIcon.classList.remove("bi-sun-fill");
            themeIcon.classList.add("bi-moon-fill");
        }
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    
    if (themeIcon) {
        if (newTheme === "dark") {
            themeIcon.classList.remove("bi-moon-fill");
            themeIcon.classList.add("bi-sun-fill");
        } else {
            themeIcon.classList.remove("bi-sun-fill");
            themeIcon.classList.add("bi-moon-fill");
        }
    }
}

// Cache functions
function getCachedData(key) {
    const cachedItem = apiCache[key];
    if (cachedItem) {
        const isExpired = (Date.now() - cachedItem.timestamp) >= CACHE_DURATION;
        if (!isExpired) {
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
    
    try {
        localStorage.setItem("apiCache", JSON.stringify(apiCache));
    } catch (e) {
        console.warn("Failed to save cache to localStorage", e);
    }
}

// Utility functions
function formatNumber(num, maximumFractionDigits = 2) {
    if (num === null || num === undefined) return "N/A";
    
    if (Math.abs(num) >= 1e9) {
        return (num / 1e9).toLocaleString(undefined, { maximumFractionDigits }) + "B";
    } else if (Math.abs(num) >= 1e6) {
        return (num / 1e6).toLocaleString(undefined, { maximumFractionDigits }) + "M";
    } else if (Math.abs(num) >= 1e3) {
        return (num / 1e3).toLocaleString(undefined, { maximumFractionDigits }) + "K";
    } else {
        return num.toLocaleString(undefined, { maximumFractionDigits });
    }
}

function formatPrice(price) {
    if (price === null || price === undefined) return "N/A";
    
    if (price < 0.01) {
        return "$" + price.toFixed(6);
    } else if (price < 1) {
        return "$" + price.toFixed(4);
    } else if (price < 10) {
        return "$" + price.toFixed(2);
    } else {
        return "$" + price.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
}

function formatPercentage(percentage) {
    if (percentage === null || percentage === undefined) return "N/A";
    
    const formattedValue = percentage.toFixed(2) + "%";
    const className = percentage >= 0 ? "positive" : "negative";
    const arrow = percentage >= 0 ? "▲" : "▼";
    
    return `<span class="${className}">${arrow} ${formattedValue}</span>`;
}

function updateLastUpdatedTime() {
    const now = new Date();
    if (lastUpdatedEl) {
        lastUpdatedEl.textContent = "Last updated: " + now.toLocaleString();
    }
}

// API functions
async function fetchCategoryCoins() {
    // Special handling for top coins category (no category filter)
    let url;
    if (currentCategory.id === 'top') {
        url = `${API_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h,7d`;
    } else {
        url = `${API_BASE_URL}/coins/markets?vs_currency=usd&category=${currentCategory.id}&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h,7d`;
    }
    
    // Check cache first and display it immediately
    const cachedData = getCachedData(url);
    if (cachedData) {
        console.log("Using cached data for category coins");
        categoryCoins = cachedData;
        updateCategoryUI(cachedData);
        
        // Select top 5 coins for price chart by default if we have cached data
        const topCoins = cachedData.slice(0, 5).map(coin => coin.id);
        selectedCoins = topCoins;
        fetchPriceHistory(topCoins);
    }
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Cache the data
        setCachedData(url, data);
        
        // Update state
        categoryCoins = data;
        
        // Update UI with the fetched data
        updateCategoryUI(data);
        
        // Select top 5 coins for price chart by default
        const topCoins = data.slice(0, 5).map(coin => coin.id);
        selectedCoins = topCoins;
        fetchPriceHistory(topCoins);
        
        return data;
    } catch (error) {
        console.error("Error fetching category coins:", error);
        
        // Only show error if we don't have cached data
        if (!cachedData) {
            showError();
        }
        
        return cachedData || [];
    }
}

async function fetchPriceHistory(coinIds) {
    if (!coinIds || coinIds.length === 0) return;
    
    const days = currentTimeframe === "1d" ? 1 : 
                currentTimeframe === "7d" ? 7 : 
                currentTimeframe === "30d" ? 30 : 90;
    
    // Track which coins have cached data
    const cachedResults = [];
    const cachedCoinIds = [];
    const coinsToFetch = [];
    
    // First check cache for all coins
    for (const coinId of coinIds) {
        const url = `${API_BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
        const cachedData = getCachedData(url);
        
        if (cachedData) {
            console.log(`Using cached price history for ${coinId}`);
            cachedResults.push(cachedData);
            cachedCoinIds.push(coinId);
        } else {
            coinsToFetch.push(coinId);
        }
    }
    
    // If we have any cached data, update the chart immediately
    if (cachedResults.length > 0) {
        updatePriceChart(cachedCoinIds, cachedResults);
    }
    
    // If there are no coins to fetch, we're done
    if (coinsToFetch.length === 0) return;
    
    try {
        const promises = coinsToFetch.map(coinId => {
            const url = `${API_BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
            
            return fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    // Cache the data
                    setCachedData(url, data);
                    return { coinId, data };
                })
                .catch(error => {
                    console.error(`Error fetching price history for ${coinId}:`, error);
                    // Return null for this coin to indicate failure
                    return { coinId, data: null };
                });
        });
        
        const fetchResults = await Promise.all(promises);
        
        // Filter out failed fetches and combine with cached results
        const newResults = [];
        const newCoinIds = [];
        
        for (const { coinId, data } of fetchResults) {
            if (data) {
                newResults.push(data);
                newCoinIds.push(coinId);
            }
        }
        
        // If we have new data, update the chart with all data (cached + new)
        if (newResults.length > 0) {
            const allResults = [...cachedResults, ...newResults];
            const allCoinIds = [...cachedCoinIds, ...newCoinIds];
            updatePriceChart(allCoinIds, allResults);
        }
        
    } catch (error) {
        console.error("Error fetching price history:", error);
        // We already showed cached data if available, so no need to do anything else
    }
}

// UI update functions
function updateCategoryUI(coins) {
    if (!coins || coins.length === 0) return;
    
    // Update category statistics
    updateCategoryStats(coins);
    
    // Update category table
    updateCategoryTable(coins);
}

function updateCategoryStats(coins) {
    // Calculate total market cap
    const totalMarketCap = coins.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
    if (categoryMarketCapEl) {
        categoryMarketCapEl.textContent = formatPrice(totalMarketCap);
    }
    
    // Calculate total volume
    const totalVolume = coins.reduce((sum, coin) => sum + (coin.total_volume || 0), 0);
    if (categoryVolumeEl) {
        categoryVolumeEl.textContent = formatPrice(totalVolume);
    }
    
    // Calculate average 24h change
    const validChanges = coins.filter(coin => coin.price_change_percentage_24h !== null);
    const avgChange = validChanges.reduce((sum, coin) => sum + coin.price_change_percentage_24h, 0) / validChanges.length;
    if (categoryAvgChangeEl) {
        categoryAvgChangeEl.innerHTML = formatPercentage(avgChange);
    }
    
    // Find top performer
    const topPerformer = [...coins].sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))[0];
    if (categoryTopPerformerEl && topPerformer) {
        categoryTopPerformerEl.innerHTML = `${topPerformer.name} (${formatPercentage(topPerformer.price_change_percentage_24h)})`;
    }
}

function updateCategoryTable(coins) {
    if (!categoryTableBodyEl) return;
    
    // Sort coins based on current sort selection
    const sortBy = sortSelectEl ? sortSelectEl.value : "price_change";
    sortCategoryCoins(sortBy, coins);
}

function sortCategoryCoins(sortBy, coinsToSort = null) {
    const coins = coinsToSort || [...categoryCoins];
    
    switch (sortBy) {
        case "price_change":
            coins.sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
            break;
        case "volume":
            coins.sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
            break;
        case "market_cap":
        default:
            coins.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
            break;
    }
    
    renderCategoryTable(coins);
}

function renderCategoryTable(coins) {
    if (!categoryTableBodyEl) return;
    
    let tableHTML = "";
    
    coins.forEach((coin, index) => {
        tableHTML += `
            <tr data-coin-id="${coin.id}" onclick="showCoinDetails('${coin.id}')">
                <td>${index + 1}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${coin.image}" alt="${coin.name}" class="coin-icon me-2" style="width: 24px; height: 24px;">
                        <div>
                            <div class="coin-name">${coin.name}</div>
                            <div class="coin-symbol text-muted">${coin.symbol.toUpperCase()}</div>
                        </div>
                    </div>
                </td>
                <td>${formatPrice(coin.current_price)}</td>
                <td>${formatPercentage(coin.price_change_percentage_24h)}</td>
                <td>${formatPercentage(coin.price_change_percentage_7d_in_currency)}</td>
                <td>${formatPrice(coin.market_cap)}</td>
                <td>${formatPrice(coin.total_volume)}</td>
            </tr>
        `;
    });
    
    categoryTableBodyEl.innerHTML = tableHTML;
}

function updatePriceChart(coinIds, priceData) {
    if (!priceChartEl || !coinIds || !priceData || coinIds.length === 0) return;
    
    // Destroy existing chart if it exists
    if (priceChart) {
        priceChart.destroy();
    }
    
    // Find the coins data from our category coins
    const selectedCoinData = categoryCoins.filter(coin => coinIds.includes(coin.id));
    
    // Process the price data for the chart
    const datasets = [];
    
    coinIds.forEach((coinId, index) => {
        const coinData = selectedCoinData.find(c => c.id === coinId);
        const prices = priceData[index].prices;
        
        // Generate a color based on index
        const hue = (index * 137) % 360; // Golden angle approximation for good distribution
        const color = `hsl(${hue}, 70%, 60%)`;
        
        datasets.push({
            label: coinData ? coinData.name : coinId,
            data: prices.map(price => ({ x: price[0], y: price[1] })),
            borderColor: color,
            backgroundColor: color + "20", // 20 is hex for 12% opacity
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.1
        });
    });
    
    // Get labels (dates) from the first coin
    const labels = priceData[0].prices.map(price => {
        const date = new Date(price[0]);
        // Format based on timeframe
        if (currentTimeframe === "1d") {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } else {
            return date.toLocaleDateString([], { month: "short", day: "numeric" });
        }
    });
    
    // Create the chart
    const ctx = priceChartEl.getContext("2d");
    priceChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    grid: {
                        color: "rgba(200, 200, 200, 0.1)"
                    },
                    ticks: {
                        callback: function(value) {
                            return "$" + formatNumber(value);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: "top"
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ": $" + context.raw.y.toLocaleString(undefined, { maximumFractionDigits: 6 });
                        }
                    }
                }
            }
        }
    });
}

function loadCachedData() {
    // Try to load category data from cache
    const url = `${API_BASE_URL}/coins/markets?vs_currency=usd&category=${currentCategory.id}&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h,7d`;
    const cachedData = getCachedData(url);
    
    if (cachedData) {
        console.log("Using cached data for initial load");
        categoryCoins = cachedData;
        updateCategoryUI(cachedData);
    }
}

function showError() {
    // Update table with error message
    if (categoryTableBodyEl) {
        categoryTableBodyEl.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="py-4">
                        <i class="bi bi-exclamation-triangle text-warning fs-1 d-block mb-3"></i>
                        <p>Failed to load data. Please try again later.</p>
                        <button class="btn btn-sm btn-primary mt-2" onclick="fetchCategoryCoins()">Retry</button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    // Update stats with error
    const elements = [
        categoryMarketCapEl,
        categoryVolumeEl,
        categoryAvgChangeEl,
        categoryTopPerformerEl
    ];
    
    elements.forEach(el => {
        if (el) el.textContent = "Error loading data";
    });
}

// Expose necessary functions to global scope for event handlers
window.fetchCategoryCoins = fetchCategoryCoins;
window.showCoinDetails = function(coinId) {
    // Redirect to the coin detail page
    window.location.href = `coin.html?id=${coinId}`;
};