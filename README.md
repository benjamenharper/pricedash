# CoinGecko Dashboard

A modern, responsive dashboard that showcases the capabilities of the CoinGecko API. This application displays cryptocurrency data across various categories including Top Crypto, AI Crypto, Meme Coins, RWA & DPIN, Crypto Gaming, and Stablecoins. The dashboard is designed to be compact and suitable for half-screen display.

## Features

- **Compact Design**: Optimized for half-screen display and mobile devices
- **Modern UI**: Clean, responsive design with light/dark mode toggle
- **Market Overview**: Global cryptocurrency market statistics
- **Category Tabs**: View top cryptocurrencies across different categories
- **Trending Coins**: Display of trending coins in the last 24 hours
- **Recently Added**: Latest coins added to CoinGecko
- **Detailed Coin Information**: Click on any coin to view detailed information
- **API Rate Limit Handling**: Queue system for API calls with exponential backoff
- **Local Caching**: 5-minute cache to reduce API calls

## Categories Displayed

1. **Top Crypto**: Overall top cryptocurrencies by market cap
2. **AI Crypto**: Cryptocurrencies related to artificial intelligence
3. **Meme Coins**: Popular meme-based cryptocurrencies
4. **RWA**: Real World Assets and Decentralized Physical Infrastructure
5. **Gaming**: Gaming and metaverse related cryptocurrencies
6. **Stable**: Price-stable cryptocurrencies

## Technologies Used

- HTML5, CSS3, JavaScript (ES6+)
- Bootstrap 5 for responsive layout
- CoinGecko API v3 for cryptocurrency data
- Chart.js for data visualization
- LocalStorage for caching API responses

## How to Use

1. Simply open the `index.html` file in a web browser
2. The dashboard will automatically load with the latest cryptocurrency data
3. Use the tabs to navigate between different cryptocurrency categories
4. Click on any cryptocurrency to view more detailed information

## Compact Layout Features

- Reduced padding and margins throughout the UI
- Smaller font sizes and image dimensions
- Streamlined data display (removed Market Cap column)
- Shortened category tab names
- Optimized for half-screen display
- Mobile-friendly responsive design

## API Usage Notes

This dashboard uses the free public CoinGecko API which has rate limits:
- 10-30 calls per minute
- No API key required for basic usage
- Implemented queue system with 1.5-second delays between API calls
- Exponential backoff for failed requests
- Local caching to reduce API calls (5-minute cache duration)

## Future Improvements

- Add price charts for historical data visualization
- Implement search functionality
- Add portfolio tracking capabilities
- Add more detailed statistics and comparisons
- Implement more sophisticated caching strategies
- Explore alternative or additional APIs

## Credits

- Data provided by [CoinGecko API](https://www.coingecko.com/en/api)
- Icons from Bootstrap Icons

## License

MIT License
