import React, { useState, useEffect } from 'react';
import { onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db, transactionsRef } from '../firebaseClient';

export default function HistoryList() {
  const [history, setHistory] = useState<any[]>([]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editShares, setEditShares] = useState('');
  const [editSellPrice, setEditSellPrice] = useState('');
  const [editAvgCost, setEditAvgCost] = useState('');

  // Add new history form state
  const [isAdding, setIsAdding] = useState(false);
  const [addDate, setAddDate] = useState('');
  const [addSymbol, setAddSymbol] = useState('');
  const [addAssetClass, setAddAssetClass] = useState('US Stock');
  const [addShares, setAddShares] = useState('');
  const [addSellPrice, setAddSellPrice] = useState('');
  const [addAvgCost, setAddAvgCost] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(transactionsRef, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by date ascending to compute correct avg cost over time
      fetched.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const holdings: Record<string, { qty: number, totalCost: number }> = {};
      const realizedHistory: any[] = [];

      fetched.forEach((tx: any) => {
        if (!tx.symbol || !(tx.assetClass === 'US Stock' || tx.assetClass === 'TW Stock')) return;

        const key = `${tx.assetClass}|${tx.symbol}`;
        if (!holdings[key]) holdings[key] = { qty: 0, totalCost: 0 };

        const amt = Number(tx.amount) || 0;
        const price = Number(tx.price) || 0;

        if (tx.action === 'Correction') {
           holdings[key].qty = amt;
           holdings[key].totalCost = amt * price;
        } else if (tx.action === 'Buy') {
          holdings[key].qty += amt;
          holdings[key].totalCost += (amt * price);
        } else if (tx.action === 'Sell') {
          const calculatedAvgCost = holdings[key].qty > 0 ? holdings[key].totalCost / holdings[key].qty : 0;
          const avgCost = tx.overrideAvgCost !== undefined ? tx.overrideAvgCost : calculatedAvgCost;
          const pnl = (price * amt) - (avgCost * amt);

          holdings[key].qty -= amt;
          holdings[key].totalCost -= (calculatedAvgCost * amt);

          realizedHistory.push({
            id: tx.id,
            date: tx.date,
            symbol: tx.symbol,
            assetClass: tx.assetClass,
            action: 'Sell',
            shares: amt,
            sellPrice: price,
            cost: avgCost,
            pnl: pnl
          });
        } else if (tx.action === 'LegacyHistory') {
          // Manual history entry that doesn't affect running holdings
          const avgCost = tx.overrideAvgCost || 0;
          const pnl = (price * amt) - (avgCost * amt);
          
          realizedHistory.push({
            id: tx.id,
            date: tx.date,
            symbol: tx.symbol,
            assetClass: tx.assetClass,
            action: 'Sell',
            shares: amt,
            sellPrice: price,
            cost: avgCost,
            pnl: pnl
          });
        }
      });

      // Sort history descending to show newest sells first
      realizedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistory(realizedHistory);
    });
    return () => unsubscribe();
  }, []);

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditShares(item.shares.toString());
    setEditSellPrice(item.sellPrice.toString());
    setEditAvgCost(item.cost.toString());
  };

  const handleSaveEdit = async (item: any) => {
    try {
      const docRef = doc(db, 'transactions', item.id);
      await updateDoc(docRef, {
        amount: Number(editShares),
        price: Number(editSellPrice),
        overrideAvgCost: Number(editAvgCost)
      });
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update history.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this history record?")) return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete history.');
    }
  };

  const handleAddHistory = async () => {
    if (!addDate || !addSymbol || !addShares || !addSellPrice || !addAvgCost) {
      alert("Please fill in all fields to add a history record.");
      return;
    }
    
    try {
      await addDoc(transactionsRef, {
        category: 'Asset',
        assetClass: addAssetClass,
        symbol: addSymbol.toUpperCase(),
        action: 'LegacyHistory',
        amount: Number(addShares),
        price: Number(addSellPrice),
        overrideAvgCost: Number(addAvgCost),
        date: addDate,
        notes: 'Manually added past trade',
        createdAt: new Date()
      });
      
      // Reset form
      setIsAdding(false);
      setAddDate('');
      setAddSymbol('');
      setAddShares('');
      setAddSellPrice('');
      setAddAvgCost('');
    } catch (err) {
      console.error(err);
      alert('Failed to add history.');
    }
  };

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 className="section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Trade History (Realized PnL)</h3>
        <button className="btn" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : '+ Add History Manually'}
        </button>
      </div>

      {isAdding && (
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <div className="grid-3" style={{ marginBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Date</label>
              <input type="date" className="form-input" value={addDate} onChange={e => setAddDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Asset Class</label>
              <select className="form-input" value={addAssetClass} onChange={e => setAddAssetClass(e.target.value)}>
                <option value="US Stock">US Stock</option>
                <option value="TW Stock">TW Stock</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Symbol</label>
              <input type="text" className="form-input" placeholder="e.g. AAPL" value={addSymbol} onChange={e => setAddSymbol(e.target.value)} />
            </div>
          </div>
          <div className="grid-3" style={{ marginBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Shares</label>
              <input type="number" className="form-input" placeholder="e.g. 100" value={addShares} onChange={e => setAddShares(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Sell Price</label>
              <input type="number" className="form-input" placeholder="e.g. 150" value={addSellPrice} onChange={e => setAddSellPrice(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Avg Cost Base</label>
              <input type="number" className="form-input" placeholder="e.g. 120" value={addAvgCost} onChange={e => setAddAvgCost(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-full" style={{ background: '#10b981' }} onClick={handleAddHistory}>Save History Record</button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Symbol</th>
              <th>Action</th>
              <th>Shares</th>
              <th>Sell Price</th>
              <th>Avg Cost Base</th>
              <th>Realized PnL</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, idx) => {
              const isEditing = editingId === item.id;
              const isPositive = item.pnl >= 0;
              const currency = item.assetClass === 'US Stock' ? '$' : 'NT$';
              return (
                <tr key={idx}>
                  <td>{item.date}</td>
                  <td style={{ fontWeight: 'bold' }}>{item.symbol}</td>
                  <td>{item.action}</td>
                  <td>
                    {isEditing ? (
                      <input type="number" className="form-input" style={{ width: '80px', padding: '4px', margin: 0 }} value={editShares} onChange={e => setEditShares(e.target.value)} />
                    ) : (
                      item.shares
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {currency}
                        <input type="number" className="form-input" style={{ width: '80px', padding: '4px', margin: 0 }} value={editSellPrice} onChange={e => setEditSellPrice(e.target.value)} />
                      </div>
                    ) : (
                      `${currency} ${item.sellPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {currency}
                        <input type="number" className="form-input" style={{ width: '80px', padding: '4px', margin: 0 }} value={editAvgCost} onChange={e => setEditAvgCost(e.target.value)} />
                      </div>
                    ) : (
                      `${currency} ${item.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    )}
                  </td>
                  <td className={isPositive ? 'positive' : 'negative'}>
                    {isPositive ? '+' : ''}{item.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleSaveEdit(item)}>Save</button>
                        <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#475569' }} onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn" style={{ padding: '4px 12px', fontSize: '0.8rem', background: '#3b82f6' }} onClick={() => handleEdit(item)}>Edit</button>
                        <button className="btn" style={{ padding: '4px 12px', fontSize: '0.8rem', background: '#ef4444' }} onClick={() => handleDelete(item.id)}>Del</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {history.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                  No realized PnL history found in Firebase.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
