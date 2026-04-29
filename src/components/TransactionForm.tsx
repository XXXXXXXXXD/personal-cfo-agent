import React, { useState, useEffect } from 'react';
import { addDoc } from 'firebase/firestore';
import { transactionsRef, consumptionRef } from '../firebaseClient';
import { fetchStockInfo } from '../api';

export default function TransactionForm() {
  const [category, setCategory] = useState('Asset');
  const [assetClass, setAssetClass] = useState('Cash');
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [action, setAction] = useState('Increase');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  const [invoiceNo, setInvoiceNo] = useState('');
  const [itemName, setItemName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (category === 'Asset') {
      setAssetClass('Cash');
      setAction('Increase');
    } else if (category === 'Liability') {
      setAssetClass('Personal Loan');
      setAction('IncreaseDebt');
    } else if (category === 'Consumption') {
      setAssetClass('Invoice');
    }
  }, [category]);

  useEffect(() => {
    if (assetClass === 'TW Stock' || assetClass === 'US Stock') {
      setAction('Buy');
    } else if (category === 'Asset' && action !== 'Increase' && action !== 'Decrease') {
      setAction('Increase');
    }
  }, [assetClass, category]);

  const handleSymbolBlur = async () => {
    if (!symbol) return;
    
    if (assetClass === 'TW Stock') {
      const info = await fetchStockInfo(`${symbol}.TW`);
      if (info) {
        setNotes((prev) => (prev ? prev : `股票名稱: ${info.name}`));
        if (!price) setPrice(info.price.toString());
      }
    } else if (assetClass === 'US Stock') {
      const info = await fetchStockInfo(symbol);
      if (info) {
        setNotes((prev) => (prev ? prev : `Company: ${info.name}`));
        if (!price) setPrice(info.price.toString());
      }
    }
  };

  const handleSave = async () => {
    if (!amount) {
      alert('請至少填寫金額或數量');
      return;
    }

    setIsSaving(true);
    try {
      if (category === 'Consumption') {
        await addDoc(consumptionRef, {
          invoiceNo,
          date: date.replace(/-/g, ''), // standardize date formatting to match CSV
          amount: Number(amount),
          itemName,
          createdAt: new Date()
        });
      } else {
        await addDoc(transactionsRef, {
          category,
          assetClass,
          symbol,
          amount: Number(amount),
          price: price ? Number(price) : null,
          action,
          date,
          notes,
          createdAt: new Date()
        });

        // Auto Generate Cash Transaction
        if (assetClass !== 'Cash') {
          let cashChange = 0;
          let cashAction = '';

          const isStockLocal = assetClass === 'TW Stock' || assetClass === 'US Stock';

          if (isStockLocal) {
            const totalValue = Number(amount) * (price ? Number(price) : 0);
            if (action === 'Buy') { cashAction = 'Decrease'; cashChange = totalValue; }
            if (action === 'Sell') { cashAction = 'Increase'; cashChange = totalValue; }
          } else {
            if (category === 'Asset') {
              if (action === 'Increase') { cashAction = 'Decrease'; cashChange = Number(amount); }
              if (action === 'Decrease') { cashAction = 'Increase'; cashChange = Number(amount); }
            } else if (category === 'Liability') {
              if (action === 'IncreaseDebt') { cashAction = 'Increase'; cashChange = Number(amount); }
              if (action === 'RepayDebt') { cashAction = 'Decrease'; cashChange = Number(amount); }
            }
          }

          if (cashChange > 0 && cashAction) {
            await addDoc(transactionsRef, {
              category: 'Asset',
              assetClass: 'Cash',
              symbol: '',
              amount: cashChange,
              price: null,
              action: cashAction,
              date,
              notes: `[Auto Cash] From ${action} ${assetClass}`,
              createdAt: new Date()
            });
          }
        }
      }

      alert('✅ 記錄已成功上傳到 Firebase 資料庫！');
      
      setSymbol('');
      setAmount('');
      setPrice('');
      setDate('');
      setNotes('');
      setInvoiceNo('');
      setItemName('');
    } catch (error) {
      console.error("Error adding document: ", error);
      alert('儲存失敗！請檢查 console 錯誤訊息與 Firebase 權限設定。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const rows = text.split('\n');
        
        const parsed = rows.map((row, index) => {
          if (index === 0 && row.includes('發票日期')) return null; // Skip header row
          
          const cols = row.split(',');
          if (cols.length >= 14) {
            const parsedAmt = parseFloat(cols[12]);
            if (isNaN(parsedAmt)) return null;
            
            return {
              date: cols[1],
              invoice: cols[2],
              amount: parsedAmt,
              itemName: cols[13].trim()
            };
          }
          return null;
        }).filter(Boolean);

        if (parsed.length > 0) {
          setIsSaving(true);
          try {
            for (const item of parsed) {
              await addDoc(consumptionRef, {
                invoiceNo: item?.invoice,
                date: item?.date,
                amount: item?.amount,
                itemName: item?.itemName,
                createdAt: new Date()
              });
            }
            alert(`✅ 成功解析並上傳 ${parsed.length} 筆消費記錄至 Firebase！`);
          } catch (err) {
            console.error('Batch upload error:', err);
            alert('批次上傳失敗！');
          } finally {
            setIsSaving(false);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const isStock = assetClass === 'TW Stock' || assetClass === 'US Stock';

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Record Transaction</h3>
      
      <div className="form-group">
        <label>Transaction Category</label>
        <select className="form-input" value={category} onChange={e => setCategory(e.target.value)} disabled={isSaving}>
          <option value="Asset">資產 (Asset)</option>
          <option value="Liability">負債 (Liability)</option>
          <option value="Consumption">消費 (Consumption)</option>
        </select>
      </div>

      {category === 'Consumption' ? (
        <>
          <div className="grid-2">
            <div className="form-group">
              <label>發票號碼 (Invoice No)</label>
              <input type="text" className="form-input" placeholder="e.g. AB12345678" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} disabled={isSaving} />
            </div>
            <div className="form-group">
              <label>消費日期 (Date)</label>
              <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} disabled={isSaving} />
            </div>
          </div>
          
          <div className="grid-2">
            <div className="form-group">
              <label>發票金額 (Amount)</label>
              <input type="number" className="form-input" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} disabled={isSaving} />
            </div>
            <div className="form-group">
              <label>消費明細_品名 (Item Name)</label>
              <input type="text" className="form-input" placeholder="e.g. 咖啡, 晚餐" value={itemName} onChange={e => setItemName(e.target.value)} disabled={isSaving} />
            </div>
          </div>

          <button className="btn btn-full" onClick={handleSave} disabled={isSaving} style={{ marginBottom: '1rem' }}>
            {isSaving ? 'Saving...' : 'Save Consumption'}
          </button>

          <hr style={{ borderColor: 'var(--glass-border)', margin: '1.5rem 0' }} />
          
          <h4 style={{ marginTop: 0 }}>或透過 CSV 批次匯入發票 (直接寫入 Firebase)</h4>
          <input 
            type="file" 
            accept=".csv" 
            className="form-input" 
            onChange={handleFileUpload} 
            disabled={isSaving}
          />
        </>
      ) : (
        <>
          <div className="form-group">
            <label>Type / Class</label>
            <select className="form-input" value={assetClass} onChange={e => setAssetClass(e.target.value)} disabled={isSaving}>
              {category === 'Asset' ? (
                <>
                  <option value="Cash">現金 (Cash)</option>
                  <option value="TW Stock">台股 (TW Stock)</option>
                  <option value="US Stock">美股 (US Stock)</option>
                  <option value="Crypto">加密貨幣 (Crypto)</option>
                  <option value="Real Estate">房地產 (Real Estate)</option>
                </>
              ) : (
                <>
                  <option value="Personal Loan">信貸 (Personal Loan)</option>
                  <option value="Mortgage">房貸 (Mortgage)</option>
                  <option value="Stock Margin Loan">股票抵押借款 (Stock Margin Loan)</option>
                </>
              )}
            </select>
          </div>

          <div className="form-group">
            <label>{category === 'Asset' && isStock ? 'Symbol (填完點擊空白處自動抓取)' : 'Name / Description'}</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder={isStock ? "e.g. AAPL, 2330" : "e.g. 薪資, 房貸A"} 
              value={symbol} 
              onChange={e => setSymbol(e.target.value)} 
              onBlur={handleSymbolBlur}
              disabled={isSaving} 
            />
          </div>

          {isStock ? (
            <>
              <div className="grid-2">
                <div className="form-group">
                  <label>Quantity / Shares</label>
                  <input type="number" className="form-input" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} disabled={isSaving} />
                </div>
                <div className="form-group">
                  <label>Price per unit</label>
                  <input type="number" className="form-input" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} disabled={isSaving} />
                </div>
              </div>
              <div className="form-group">
                <label>Action</label>
                <select className="form-input" value={action} onChange={e => setAction(e.target.value)} disabled={isSaving}>
                  <option value="Buy">買入 (Buy)</option>
                  <option value="Sell">賣出 (Sell)</option>
                </select>
              </div>
            </>
          ) : (
            <div className="grid-2">
              <div className="form-group">
                <label>Amount / Value</label>
                <input type="number" className="form-input" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} disabled={isSaving} />
              </div>
              <div className="form-group">
                <label>Action</label>
                <select className="form-input" value={action} onChange={e => setAction(e.target.value)} disabled={isSaving}>
                  {category === 'Asset' ? (
                    <>
                      <option value="Increase">增加 (Increase +)</option>
                      <option value="Decrease">減少 (Decrease -)</option>
                    </>
                  ) : (
                    <>
                      <option value="IncreaseDebt">新增借款 (Borrow +)</option>
                      <option value="RepayDebt">償還借款 (Repay -)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Date</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} disabled={isSaving} />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea className="form-input" rows={3} placeholder="Optional details..." value={notes} onChange={e => setNotes(e.target.value)} disabled={isSaving}></textarea>
          </div>

          <button className="btn btn-full" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Record'}
          </button>
        </>
      )}
    </div>
  );
}
