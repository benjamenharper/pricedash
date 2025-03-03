// Coin Detail Page JavaScript

// Constants and configuration
const API_BASE_URL = 'https://api.coingecko.com/api/v3';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

// State variables
let coinData = null;
let tvWidget = null;
let tvWidget15m = null;
let tvWidget5m = null;
let tvWidget3m = null;
let currentLayout = 'single';
let currentTheme = 'dark';
let coinId = '';

// Get coin ID from URL parameter
const urlParams = new URLSearchParams(window.location.search);
coinId = urlParams.get('id');

// DOM Elements
const themeIcon = document.getElementById('theme-icon');
const lastUpdatedEl = document.getElementById('last-updated');
const chartTimeButtons = document.querySelectorAll('.chart-time-button');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Get coin ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    coinId = urlParams.get('id');
    
    if (!coinId) {
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize theme
    currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    
    // Initialize UI
    initUI();
    
    // Fetch coin data
    fetchCoinData(coinId);
});

// Event listeners setup
function setupEventListeners() {
    // Theme toggle
    if (themeIcon) {
        themeIcon.addEventListener('click', toggleTheme);
    }
    
    // Set up chart time buttons
    setupChartTimeButtons();
}

// Theme functions
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    if (themeIcon) {
        if (savedTheme === 'dark') {
            themeIcon.classList.remove('bi-moon-fill');
            themeIcon.classList.add('bi-sun-fill');
        } else {
            themeIcon.classList.remove('bi-sun-fill');
            themeIcon.classList.add('bi-moon-fill');
        }
    }
}

function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    currentTheme = newTheme;
    
    // Update charts theme
    updateChartsTheme(newTheme);
}

function updateChartsTheme(theme) {
    // Update all charts with new theme
    if (tvWidget) {
        tvWidget.options.theme = theme;
        tvWidget.setTheme(theme);
    }
    
    if (tvWidget15m) {
        tvWidget15m.options.theme = theme;
        tvWidget15m.setTheme(theme);
    }
    
    if (tvWidget5m) {
        tvWidget5m.options.theme = theme;
        tvWidget5m.setTheme(theme);
    }
    
    if (tvWidget3m) {
        tvWidget3m.options.theme = theme;
        tvWidget3m.setTheme(theme);
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
    if (lastUpdatedEl) {
        const now = new Date();
        lastUpdatedEl.textContent = `Last updated: ${now.toLocaleTimeString()}`;
    }
}

// API functions
async function fetchCoinData(coinId) {
    try {
        // Fetch coin data
        const response = await fetch(`${API_BASE_URL}/coins/${coinId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=true&sparkline=true`);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        coinData = await response.json();
        
        // Update UI with coin data
        updateCoinUI(coinData);
        
        // Initialize chart based on layout
        const symbol = coinData.symbol;
        if (currentLayout === 'single') {
            initTradingViewWidget(symbol, currentTheme, 'tradingview-chart-container', 60);
        } else if (currentLayout === 'multi') {
            initTradingViewWidget(symbol, currentTheme, 'tradingview-chart-15m', 15);
            initTradingViewWidget(symbol, currentTheme, 'tradingview-chart-5m', 5);
            initTradingViewWidget(symbol, currentTheme, 'tradingview-chart-3m', 3);
        }
        
        // Update markets table
        if (coinData.tickers) {
            updateMarketsTable(coinData.tickers);
        }
        
    } catch (error) {
        console.error("Error fetching coin data:", error);
        showError("Failed to load coin data. Please try again later.");
    }
}

// UI update functions
function updateCoinUI(data) {
    if (!data) return;
    
    // Update coin header
    document.getElementById('coin-name').textContent = data.name;
    document.getElementById('coin-symbol').textContent = data.symbol.toUpperCase();
    document.getElementById('coin-rank').textContent = `Rank #${data.market_cap_rank || '--'}`;
    document.getElementById('coin-image').src = data.image.large;
    
    // Update price and price change
    const price = data.market_data.current_price.usd;
    const priceChange24h = data.market_data.price_change_percentage_24h;
    
    document.getElementById('coin-price').textContent = formatPrice(price);
    document.getElementById('coin-price-change').innerHTML = formatPercentage(priceChange24h);
    
    // Update market data
    document.getElementById('market-cap').textContent = formatPrice(data.market_data.market_cap.usd);
    document.getElementById('volume').textContent = formatPrice(data.market_data.total_volume.usd);
    document.getElementById('circulating-supply').textContent = formatNumber(data.market_data.circulating_supply) + ' ' + data.symbol.toUpperCase();
    document.getElementById('total-supply').textContent = data.market_data.total_supply ? formatNumber(data.market_data.total_supply) + ' ' + data.symbol.toUpperCase() : 'N/A';
    
    // Update price changes
    document.getElementById('price-change-24h').innerHTML = formatPercentage(data.market_data.price_change_percentage_24h);
    document.getElementById('price-change-7d').innerHTML = formatPercentage(data.market_data.price_change_percentage_7d);
    document.getElementById('price-change-14d').innerHTML = formatPercentage(data.market_data.price_change_percentage_14d);
    document.getElementById('price-change-30d').innerHTML = formatPercentage(data.market_data.price_change_percentage_30d);
    document.getElementById('price-change-60d').innerHTML = formatPercentage(data.market_data.price_change_percentage_60d);
    document.getElementById('price-change-1y').innerHTML = formatPercentage(data.market_data.price_change_percentage_1y);
    
    // Update description
    if (data.description && data.description.en) {
        document.getElementById('coin-description').innerHTML = data.description.en;
    } else {
        document.getElementById('coin-description').textContent = 'No description available.';
    }
    
    // Update community stats
    updateCommunityStats(data);
    
    // Update links
    updateLinks(data);
}

function updateCommunityStats(data) {
    if (!data || !data.community_data) return;
    
    const communityData = data.community_data;
    
    // Twitter followers
    const twitterFollowers = document.getElementById('twitter-followers');
    if (twitterFollowers) {
        twitterFollowers.textContent = communityData.twitter_followers ? formatNumber(communityData.twitter_followers) : 'N/A';
    }
    
    // Reddit subscribers
    const redditSubscribers = document.getElementById('reddit-subscribers');
    if (redditSubscribers) {
        redditSubscribers.textContent = communityData.reddit_subscribers ? formatNumber(communityData.reddit_subscribers) : 'N/A';
    }
    
    // Telegram users
    const telegramUsers = document.getElementById('telegram-users');
    if (telegramUsers) {
        telegramUsers.textContent = communityData.telegram_channel_user_count ? formatNumber(communityData.telegram_channel_user_count) : 'N/A';
    }
}

function updateLinks(data) {
    if (!data || !data.links) return;
    
    const links = data.links;
    
    // Website link
    const websiteLink = document.getElementById('website-link');
    if (websiteLink && links.homepage && links.homepage[0]) {
        websiteLink.href = links.homepage[0];
    } else if (websiteLink) {
        websiteLink.parentElement.style.display = 'none';
    }
    
    // GitHub link
    const githubLink = document.getElementById('github-link');
    if (githubLink && links.repos_url && links.repos_url.github && links.repos_url.github[0]) {
        githubLink.href = links.repos_url.github[0];
    } else if (githubLink) {
        githubLink.parentElement.style.display = 'none';
    }
    
    // Whitepaper link
    const whitepaperLink = document.getElementById('whitepaper-link');
    if (whitepaperLink && links.whitepaper) {
        whitepaperLink.href = links.whitepaper;
    } else if (whitepaperLink) {
        whitepaperLink.parentElement.style.display = 'none';
    }
}

function updateMarketsTable(tickers) {
    if (!tickers || !tickers.length) return;
    
    const tableBody = document.getElementById('markets-table-body');
    if (!tableBody) return;
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Sort tickers by volume
    tickers.sort((a, b) => b.volume - a.volume);
    
    // Take top 10 tickers
    const topTickers = tickers.slice(0, 10);
    
    // Add rows to table
    topTickers.forEach(ticker => {
        const row = document.createElement('tr');
        
        // Exchange
        const exchangeCell = document.createElement('td');
        exchangeCell.textContent = ticker.market.name;
        row.appendChild(exchangeCell);
        
        // Pair
        const pairCell = document.createElement('td');
        pairCell.textContent = ticker.base + '/' + ticker.target;
        row.appendChild(pairCell);
        
        // Price
        const priceCell = document.createElement('td');
        priceCell.textContent = formatPrice(ticker.last);
        row.appendChild(priceCell);
        
        // Volume
        const volumeCell = document.createElement('td');
        volumeCell.textContent = formatPrice(ticker.volume);
        row.appendChild(volumeCell);
        
        // Trust score
        const trustScoreCell = document.createElement('td');
        if (ticker.trust_score) {
            const trustScore = document.createElement('span');
            const scoreClass = getTrustScoreClass(ticker.trust_score);
            trustScore.className = `trust-score ${scoreClass}`;
            trustScore.textContent = ticker.trust_score.charAt(0).toUpperCase() + ticker.trust_score.slice(1);
            trustScoreCell.appendChild(trustScore);
        } else {
            trustScoreCell.textContent = 'N/A';
        }
        row.appendChild(trustScoreCell);
        
        tableBody.appendChild(row);
    });
}

function getTrustScoreClass(score) {
    switch(score) {
        case 'green':
            return 'green';
        case 'yellow':
            return 'yellow';
        case 'red':
            return 'red';
        default:
            return '';
    }
}

// TradingView chart implementation
function initTradingViewWidget(symbol, theme, containerId, interval) {
    // If widget already exists, destroy it first
    let widgetVar;
    
    // Create widget
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Set height to 500px for all charts
    let height = '500';
    
    const widget = new TradingView.widget({
        width: '100%',
        height: height,
        symbol: `BINANCE:${symbol.toUpperCase()}USDT`,
        interval: interval.toString(),
        timezone: 'Etc/UTC',
        theme: theme,
        style: '1',
        locale: 'en',
        toolbar_bg: theme === 'dark' ? '#1E222D' : '#F1F3F6',
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        container_id: containerId,
        autosize: false,
        studies: [
            "RSI@tv-basicstudies"
        ]
    });
    
    // Store widget reference
    storeWidgetReference(containerId, widget);
    
    return widget;
}

function storeWidgetReference(containerId, widget) {
    // Store widget reference based on container ID
    switch (containerId) {
        case 'tradingview-chart-container':
            tvWidget = widget;
            break;
        case 'tradingview-chart-15m':
            tvWidget15m = widget;
            break;
        case 'tradingview-chart-5m':
            tvWidget5m = widget;
            break;
        case 'tradingview-chart-3m':
            tvWidget3m = widget;
            break;
    }
}

function initUI() {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            toggleTheme();
        });
    }
    
    // Layout toggle buttons
    const layoutButtons = document.querySelectorAll('.layout-button');
    layoutButtons.forEach(button => {
        button.addEventListener('click', function() {
            const layout = this.getAttribute('data-layout');
            setChartLayout(layout);
            
            // Update active button
            layoutButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function setChartLayout(layout) {
    currentLayout = layout;
    
    // Show/hide layouts
    const singleLayout = document.getElementById('single-chart-layout');
    const multiLayout = document.getElementById('multi-chart-layout');
    
    // Hide all layouts first
    singleLayout.style.display = 'none';
    multiLayout.style.display = 'none';
    
    if (layout === 'single') {
        singleLayout.style.display = 'block';
        
        // Make sure single chart is initialized
        if (!tvWidget && coinData) {
            initTradingViewWidget(coinData.symbol, currentTheme, 'tradingview-chart-container', 60);
        }
    } else if (layout === 'multi') {
        multiLayout.style.display = 'block';
        
        // Initialize multi charts if needed
        if (coinData) {
            const symbol = coinData.symbol;
            
            // Initialize charts if they don't exist
            if (!tvWidget15m) {
                initTradingViewWidget(symbol, currentTheme, 'tradingview-chart-15m', 15);
            }
            
            if (!tvWidget5m) {
                initTradingViewWidget(symbol, currentTheme, 'tradingview-chart-5m', 5);
            }
            
            if (!tvWidget3m) {
                initTradingViewWidget(symbol, currentTheme, 'tradingview-chart-3m', 3);
            }
        }
    }
}

function showError(message) {
    console.error(message);
    
    // Create error alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        <strong>Error!</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to page
    const container = document.querySelector('main.container-fluid');
    if (container) {
        container.prepend(alertDiv);
    }
}

// If no coin ID is provided, redirect to the dashboard
if (!coinId) {
    window.location.href = "index.html";
}
