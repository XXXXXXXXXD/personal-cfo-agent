import React, { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { addDoc } from 'firebase/firestore';
import { transactionsRef } from '../firebaseClient';
import { fetchPrice, fetchExchangeRate, getCached } from '../api';

export default function StockPortfolio() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [realTimePrices, setRealTimePrices] = useState<Record<string, number>>({});
  const [usdToTwd, setUsdToTwd] = useState<number>(32.5);

  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editCost, setEditCost] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(transactionsRef, (snapshot: any) => {
      const fetched = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      setTransactions(fetched);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function loadPrices() {
      if (transactions.length === 0) return;
      const rate = await fetchExchangeRate();
      setUsdToTwd(rate);

      const symbolsToFetch = new Set<string>();
      transactions.forEach(tx => {
        if ((tx.assetClass === 'US Stock' || tx.assetClass === 'TW Stock' || tx.assetClass === 'Crypto') && tx.symbol) {
          symbolsToFetch.add(`${tx.assetClass}|${tx.symbol}`);
        }
      });

      // 1. Instant Render from Cache (Stale-While-Revalidate)
      const initialPrices: Record<string, number> = {};
      symbolsToFetch.forEach(key => {
        const [assetClass, symbol] = key.split('|');
        const cacheKey = `price_${symbol}`;
        const p = getCached<number>(cacheKey, true); // ignore age
        if (p !== null) {
          initialPrices[key] = p; // Portfolio uses raw USD prices
        }
      });

      if (Object.keys(initialPrices).length > 0) {
        setRealTimePrices(initialPrices);
      }

      // 2. Background Fetch Latest Prices
      const newPrices: Record<string, number> = { ...initialPrices };
      const promises = Array.from(symbolsToFetch).map(async (key) => {
        const [assetClass, symbol] = key.split('|');
        const data = await fetchPrice(assetClass, symbol);
        if (data) {
          newPrices[key] = data.price; 
        }
      });

      await Promise.all(promises);
      setRealTimePrices(newPrices);
    }
    loadPrices();
  }, [transactions]);

  // Aggregate holdings chronologically
  const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const holdings: Record<string, any> = {};

  sortedTx.forEach(tx => {
    if (tx.category !== 'Asset' || !(tx.assetClass === 'US Stock' || tx.assetClass === 'TW Stock')) return;
    
    const key = `${tx.assetClass}|${tx.symbol}`;
    if (!holdings[key]) {
      holdings[key] = {
        symbol: tx.symbol,
        assetClass: tx.assetClass,
        qty: 0,
        totalCost: 0,
      };
    }

    const amt = Number(tx.amount) || 0;
    const price = Number(tx.price) || 0;

    if (tx.action === 'Correction') {
      holdings[key].qty = amt;
      holdings[key].totalCost = amt * price;
    } else if (tx.action === 'Buy') {
      holdings[key].qty += amt;
      holdings[key].totalCost += (amt * price);
    } else if (tx.action === 'Sell') {
      holdings[key].qty -= amt;
      const avgCost = holdings[key].qty > 0 ? (holdings[key].totalCost / (holdings[key].qty + amt)) : 0;
      holdings[key].totalCost -= (amt * avgCost);
    }
  });

  const portfolioList = Object.values(holdings).filter(h => h.qty > 0).map(h => {
    const key = `${h.assetClass}|${h.symbol}`;
    const currentPrice = realTimePrices[key] || 0;
    const avgCost = h.totalCost / h.qty;
    const currentValue = h.qty * currentPrice;
    const unrealizedPnL = currentValue - h.totalCost;
    const roi = h.totalCost > 0 ? (unrealizedPnL / h.totalCost) * 100 : 0;

    return { ...h, currentPrice, avgCost, currentValue, unrealizedPnL, roi };
  });

  const usStocks = portfolioList.filter(s => s.assetClass === 'US Stock');
  const twStocks = portfolioList.filter(s => s.assetClass === 'TW Stock');

  const handleEdit = (stock: any) => {
    setEditingSymbol(stock.symbol);
    setEditQty(stock.qty.toString());
    setEditCost(stock.avgCost.toFixed(2));
  };

  const handleSaveEdit = async (stock: any) => {
    if (!editQty || !editCost) return;
    
    try {
      await addDoc(transactionsRef, {
        category: 'Asset',
        assetClass: stock.assetClass,
        symbol: stock.symbol,
        action: 'Correction',
        amount: Number(editQty),
        price: Number(editCost),
        date: new Date().toISOString().split('T')[0],
        notes: 'Manual Portfolio Correction',
        createdAt: new Date()
      });
      setEditingSymbol(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save correction.');
    }
  };

  const renderTable = (data: any[], currency: string) => (
    <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Shares</th>
            <th>Avg Cost</th>
            <th>Current Price</th>
            <th>Market Value</th>
            <th>Unrealized PnL</th>
            <th>ROI</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((stock, i) => {
            const isEditing = editingSymbol === stock.symbol;
            return (
              <tr key={i}>
                <td style={{ fontWeight: 'bold' }}>{stock.symbol}</td>
                <td>
                  {isEditing ? (
                    <input type="number" className="form-input" style={{ width: '80px', padding: '4px', margin: 0 }} value={editQty} onChange={e => setEditQty(e.target.value)} />
                  ) : (
                    stock.qty.toLocaleString()
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {currency}
                      <input type="number" className="form-input" style={{ width: '80px', padding: '4px', margin: 0 }} value={editCost} onChange={e => setEditCost(e.target.value)} />
                    </div>
                  ) : (
                    `${currency} ${stock.avgCost.toFixed(2)}`
                  )}
                </td>
                <td>
                  {stock.currentPrice > 0 ? `${currency} ${stock.currentPrice.toFixed(2)}` : 'Loading...'}
                </td>
                <td style={{ fontWeight: 'bold' }}>{currency} {stock.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className={stock.unrealizedPnL >= 0 ? 'positive' : 'negative'}>
                  {stock.unrealizedPnL > 0 ? '+' : ''}{stock.unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={stock.roi >= 0 ? 'positive' : 'negative'}>
                  {stock.roi > 0 ? '+' : ''}{stock.roi.toFixed(2)}%
                </td>
                <td>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleSaveEdit(stock)}>Save</button>
                      <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#475569' }} onClick={() => setEditingSymbol(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button className="btn" style={{ padding: '4px 12px', fontSize: '0.8rem', background: '#3b82f6' }} onClick={() => handleEdit(stock)}>Edit</button>
                  )}
                </td>
              </tr>
            );
          })}
          {data.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                No active holdings found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <h2 className="section-title">Taiwan Stocks Portfolio (TWD)</h2>
      {renderTable(twStocks, 'NT$')}

      <h2 className="section-title">US Stocks Portfolio (USD)</h2>
      {renderTable(usStocks, '$')}
    </div>
  );
}
