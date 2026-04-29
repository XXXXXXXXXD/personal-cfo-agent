import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { onSnapshot } from 'firebase/firestore';
import { transactionsRef } from '../firebaseClient';
import { fetchPrice, fetchExchangeRate } from '../api';

const mockTimelineData = [
  { date: 'Jan', assets: 1200000 },
  { date: 'Feb', assets: 1250000 },
  { date: 'Mar', assets: 1230000 },
];

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [realTimePrices, setRealTimePrices] = useState<Record<string, number>>({});
  const [usdToTwd, setUsdToTwd] = useState<number>(32.5);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(transactionsRef, (snapshot: any) => {
      const fetched = snapshot.docs.map((doc: any) => doc.data());
      setTransactions(fetched);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function loadPrices() {
      if (transactions.length === 0) return;
      setIsLoadingPrices(true);
      
      try {
        const rate = await fetchExchangeRate();
        setUsdToTwd(rate);

        const symbolsToFetch = new Set<string>();
        transactions.forEach(tx => {
          if ((tx.assetClass === 'US Stock' || tx.assetClass === 'TW Stock' || tx.assetClass === 'Crypto') && tx.symbol) {
            symbolsToFetch.add(`${tx.assetClass}|${tx.symbol}`);
          }
        });

        const newPrices: Record<string, number> = {};
        
        const promises = Array.from(symbolsToFetch).map(async (key) => {
          const [assetClass, symbol] = key.split('|');
          const data = await fetchPrice(assetClass, symbol);
          if (data) {
            const priceInTwd = data.currency === 'USD' ? data.price * rate : data.price;
            newPrices[key] = priceInTwd;
          }
        });

        await Promise.all(promises);
        setRealTimePrices(newPrices);
      } catch (err) {
        console.error("Failed to load real time prices:", err);
      } finally {
        setIsLoadingPrices(false);
      }
    }

    loadPrices();
  }, [transactions]);

  // Compute Aggregations in TWD
  let totalAssets = 0;
  let totalLiabilities = 0;
  
  let assetAlloc: Record<string, number> = { 'US Stocks': 0, 'TW Stocks': 0, 'Crypto': 0, 'Cash': 0, 'Real Estate': 0 };
  let liabilityAlloc: Record<string, number> = { 'Personal Loan': 0, 'Mortgage': 0, 'Margin Loan': 0 };

  const stockHoldings: Record<string, { qty: number, assetClass: string }> = {};

  transactions.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    const isIncrease = tx.action === 'Increase' || tx.action === 'Buy' || tx.action === 'IncreaseDebt' || tx.action === 'Correction';
    const isAsset = tx.category === 'Asset';

    if (isAsset) {
      if (tx.assetClass === 'US Stock' || tx.assetClass === 'TW Stock') {
        const key = `${tx.assetClass}|${tx.symbol}`;
        if (!stockHoldings[key]) stockHoldings[key] = { qty: 0, assetClass: tx.assetClass };
        if (tx.action === 'Correction') stockHoldings[key].qty = amt;
        else stockHoldings[key].qty += isIncrease ? amt : -amt;
      } else {
        const value = isIncrease ? amt : -amt;
        totalAssets += value;
        if (tx.assetClass === 'Crypto') assetAlloc['Crypto'] += value;
        else if (tx.assetClass === 'Real Estate') assetAlloc['Real Estate'] += value;
        else if (tx.assetClass === 'Cash') assetAlloc['Cash'] += value;
      }
    } else {
      const value = isIncrease ? amt : -amt;
      totalLiabilities += value;
      if (tx.assetClass === 'Personal Loan') liabilityAlloc['Personal Loan'] += value;
      else if (tx.assetClass === 'Mortgage') liabilityAlloc['Mortgage'] += value;
      else if (tx.assetClass === 'Stock Margin Loan') liabilityAlloc['Margin Loan'] += value;
    }
  });

  Object.keys(stockHoldings).forEach(key => {
    const holding = stockHoldings[key];
    if (holding.qty > 0) {
      const currentPriceTwd = realTimePrices[key] || 0;
      const valueTwd = holding.qty * currentPriceTwd;
      
      totalAssets += valueTwd;
      if (holding.assetClass === 'US Stock') assetAlloc['US Stocks'] += valueTwd;
      if (holding.assetClass === 'TW Stock') assetAlloc['TW Stocks'] += valueTwd;
    }
  });

  // Calculate Weekly Timeline dynamically (Last 6 Months)
  const timelineData: any[] = [];
  if (transactions.length > 0) {
    const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6); // Set start date to exactly 6 months ago
    
    const weeks: Date[] = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      weeks.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
    if (weeks.length === 0 || weeks[weeks.length - 1].getTime() < endDate.getTime()) {
      weeks.push(new Date(endDate));
    }

    weeks.forEach(weekDate => {
      let weekAssets = 0;
      const weekStockQty: Record<string, number> = {};

      sortedTx.forEach(tx => {
        const txDate = new Date(tx.date);
        if (txDate > weekDate) return;

        const amt = Number(tx.amount) || 0;
        const isIncrease = tx.action === 'Increase' || tx.action === 'Buy' || tx.action === 'IncreaseDebt' || tx.action === 'Correction';
        const isAsset = tx.category === 'Asset';

        if (isAsset) {
          if (tx.assetClass === 'US Stock' || tx.assetClass === 'TW Stock') {
            const key = `${tx.assetClass}|${tx.symbol}`;
            if (!weekStockQty[key]) weekStockQty[key] = 0;
            if (tx.action === 'Correction') weekStockQty[key] = amt;
            else weekStockQty[key] += isIncrease ? amt : -amt;
          } else {
            weekAssets += isIncrease ? amt : -amt;
          }
        }
      });

      // Evaluate stock values
      Object.keys(weekStockQty).forEach(key => {
        const qty = weekStockQty[key];
        if (qty > 0) {
          const currentPriceTwd = realTimePrices[key] || 0;
          weekAssets += qty * currentPriceTwd;
        }
      });

      // Format date MM/DD
      const mm = String(weekDate.getMonth() + 1).padStart(2, '0');
      const dd = String(weekDate.getDate()).padStart(2, '0');

      timelineData.push({
        date: `${mm}/${dd}`,
        assets: weekAssets > 0 ? weekAssets : 0
      });
    });
  }

  const computedBalanceSheet = [
    { name: 'Assets', value: totalAssets > 0 ? totalAssets : 0, color: '#10b981' },
    { name: 'Liabilities', value: totalLiabilities > 0 ? totalLiabilities : 0, color: '#ef4444' }
  ];

  const COLORS_ASSET = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const computedAssetAllocation = Object.entries(assetAlloc)
    .filter(([_, val]) => val > 0)
    .map(([name, val], idx) => ({ name, value: val, color: COLORS_ASSET[idx % COLORS_ASSET.length] }));

  const COLORS_LIAB = ['#f59e0b', '#ec4899', '#ef4444'];
  const computedLiabilityAllocation = Object.entries(liabilityAlloc)
    .filter(([_, val]) => val > 0)
    .map(([name, val], idx) => ({ name, value: val, color: COLORS_LIAB[idx % COLORS_LIAB.length] }));

  const netWorth = totalAssets - totalLiabilities;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Total Net Worth (TWD)</h2>
        <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
          {isLoadingPrices ? '🔄 抓取最新報價中...' : `USD/TWD 匯率: ${usdToTwd.toFixed(2)}`}
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel">
          <div className="stat-label">Total Assets (TWD)</div>
          <div className="stat-value">NT$ {Math.round(totalAssets).toLocaleString()}</div>
          <div className="positive">即時股價估值</div>
        </div>
        <div className="glass-panel">
          <div className="stat-label">Total Liabilities (TWD)</div>
          <div className="stat-value">NT$ {Math.round(totalLiabilities).toLocaleString()}</div>
          <div className="negative">Auto-synced from DB</div>
        </div>
        <div className="glass-panel">
          <div className="stat-label">Net Worth (TWD)</div>
          <div className="stat-value">NT$ {Math.round(netWorth).toLocaleString()}</div>
          <div className={netWorth >= 0 ? 'positive' : 'negative'}>即時資產結算</div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ height: '400px' }}>
          <h3 style={{ marginTop: 0 }}>Assets Timeline (Weekly)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={timelineData.length > 0 ? timelineData : mockTimelineData} margin={{ top: 5, right: 20, bottom: 25, left: 20 }}>
              <defs>
                <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(value) => `NT$ ${(value/1000).toFixed(0)}k`} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} formatter={(value: number) => `NT$ ${Math.round(value).toLocaleString()}`} />
              <Area type="monotone" dataKey="assets" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAssets)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-3">
        <div className="glass-panel">
          <h3 style={{ marginTop: 0 }}>Balance Sheet</h3>
          {computedBalanceSheet.filter(item => item.value > 0).length > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={computedBalanceSheet}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  style={{ outline: 'none' }}
                >
                  {computedBalanceSheet.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} 
                  formatter={(value: number) => `NT$ ${Math.round(value).toLocaleString()}`}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#94a3b8' }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
              Add records to see chart
            </div>
          )}
        </div>

        <div className="glass-panel">
          <h3 style={{ marginTop: 0 }}>Asset Allocation</h3>
          {computedAssetAllocation.length > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={computedAssetAllocation}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  style={{ outline: 'none' }}
                >
                  {computedAssetAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} 
                  formatter={(value: number) => `NT$ ${Math.round(value).toLocaleString()}`}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#94a3b8' }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
              Add assets to see chart
            </div>
          )}
        </div>

        <div className="glass-panel">
          <h3 style={{ marginTop: 0 }}>Liability Allocation</h3>
          {computedLiabilityAllocation.length > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={computedLiabilityAllocation}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  style={{ outline: 'none' }}
                >
                  {computedLiabilityAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} 
                  formatter={(value: number) => `NT$ ${Math.round(value).toLocaleString()}`}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#94a3b8' }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
              Add liabilities to see chart
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
