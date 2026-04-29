// api.ts - Handling all external price fetching logic

// 1. Yahoo Finance (Proxy for US Stocks & Exchange Rates)
export async function fetchYahooFinancePrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    // Use allorigins as a simple free CORS proxy for client-side fetching
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const res = await fetch(proxyUrl);
    const json = await res.json();
    const data = JSON.parse(json.contents);
    
    const result = data.chart.result[0];
    const price = result.meta.regularMarketPrice;
    return price;
  } catch (error) {
    console.error(`Failed to fetch Yahoo Finance for ${symbol}:`, error);
    return null;
  }
}

// 1.b Fetch Stock Name and Price
export async function fetchStockInfo(symbol: string): Promise<{ price: number, name: string } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const res = await fetch(proxyUrl);
    const json = await res.json();
    const data = JSON.parse(json.contents);
    
    const result = data.chart.result[0];
    return {
      price: result.meta.regularMarketPrice,
      name: result.meta.shortName || symbol
    };
  } catch (error) {
    return null;
  }
}

// 2. Fetch USD/TWD Exchange Rate
export async function fetchExchangeRate(): Promise<number> {
  const rate = await fetchYahooFinancePrice('TWD=X');
  return rate || 32.5; // Fallback to 32.5 if API fails
}

// 3. FinMind API (Taiwan Stocks)
export async function fetchTWStockPrice(symbol: string): Promise<number | null> {
  try {
    // Get date 7 days ago to ensure we catch the latest trading day
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const startDate = d.toISOString().split('T')[0];
    
    const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${symbol}&start_date=${startDate}`;
    const res = await fetch(url);
    const json = await res.json();
    
    if (json.data && json.data.length > 0) {
      // Return the most recent close price
      const latest = json.data[json.data.length - 1];
      return latest.close;
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch FinMind for ${symbol}:`, error);
    return null;
  }
}

// 4. CoinGecko API (Crypto)
// Maps user symbols to CoinGecko IDs
const CRYPTO_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'USDT': 'tether',
  'BNB': 'binancecoin'
};

export async function fetchCryptoPrices(symbols: string[]): Promise<Record<string, number>> {
  try {
    const ids = symbols.map(s => CRYPTO_MAP[s.toUpperCase()] || s.toLowerCase()).join(',');
    if (!ids) return {};
    
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    const res = await fetch(url);
    const json = await res.json();
    
    const results: Record<string, number> = {};
    symbols.forEach(s => {
      const id = CRYPTO_MAP[s.toUpperCase()] || s.toLowerCase();
      if (json[id] && json[id].usd) {
        results[s] = json[id].usd;
      }
    });
    return results;
  } catch (error) {
    console.error(`Failed to fetch CoinGecko for ${symbols}:`, error);
    return {};
  }
}

// 5. Unified Price Fetcher based on asset class
export async function fetchPrice(assetClass: string, symbol: string): Promise<{ price: number, currency: 'USD' | 'TWD' } | null> {
  if (assetClass === 'US Stock') {
    const price = await fetchYahooFinancePrice(symbol);
    return price ? { price, currency: 'USD' } : null;
  } 
  
  if (assetClass === 'TW Stock') {
    const price = await fetchTWStockPrice(symbol);
    return price ? { price, currency: 'TWD' } : null;
  }
  
  if (assetClass === 'Crypto') {
    const prices = await fetchCryptoPrices([symbol]);
    return prices[symbol] ? { price: prices[symbol], currency: 'USD' } : null;
  }

  return null;
}
