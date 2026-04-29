import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { onSnapshot, query, orderBy } from 'firebase/firestore';
import { consumptionRef } from '../firebaseClient';

const categorize = (itemName: string) => {
  if (!itemName) return '其他';
  const name = itemName.toLowerCase();
  if (name.match(/餐|雞|飯|麵|咖啡|豆花|牛乳|啤酒|水|飲料|茶|餅|食|鍋貼|水餃|湯|肉|蛋|菜|果|冰|排|鍋/)) return '食';
  if (name.match(/服|鞋|褲|衫|衣/)) return '衣';
  if (name.match(/租|房貸|水費|電費|瓦斯|宿/)) return '住';
  if (name.match(/車|外送|停車|捷運|高鐵|台鐵|客運|機票|服務費/)) return '行';
  if (name.match(/書|課|博客來|雜誌|學費/)) return '育';
  if (name.match(/遊戲|電影|玩具|KTV|展覽|門票/)) return '樂';
  return '其他';
};

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#94a3b8'];

export default function Consumption() {
  const [selectedMonth, setSelectedMonth] = useState('202604');
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(consumptionRef, (snapshot: any) => {
      const fetchedItems = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(fetchedItems);
    });
    return () => unsubscribe();
  }, []);

  const formattedSelectedMonth = selectedMonth.replace('-', '');
  
  const filteredItems = items.filter(item => {
    const dateStr = item.date || '';
    return dateStr.startsWith(selectedMonth) || dateStr.startsWith(formattedSelectedMonth);
  });

  const categoryTotals: Record<string, number> = { '食': 0, '衣': 0, '住': 0, '行': 0, '育': 0, '樂': 0, '其他': 0 };
  let totalAmount = 0;

  filteredItems.forEach(item => {
    const amt = Number(item.amount);
    if (!isNaN(amt) && amt > 0) {
      const cat = categorize(item.itemName);
      categoryTotals[cat] += amt;
      totalAmount += amt;
    }
  });

  const categoryData = Object.keys(categoryTotals).map((key, index) => ({
    name: key,
    value: categoryTotals[key],
    color: COLORS[index % COLORS.length]
  })).filter(d => d.value > 0);

  categoryData.sort((a, b) => b.value - a.value);
  const topCategory = categoryData.length > 0 ? categoryData[0].name : '無';
  const topValue = categoryData.length > 0 ? categoryData[0].value : 0;

  // Compute Historical Trends dynamically
  const monthlyTotals: Record<string, number> = {};
  items.forEach(item => {
    let monthKey = '';
    const dateStr = item.date || '';
    if (dateStr.includes('-')) {
      monthKey = dateStr.substring(0, 7);
    } else if (dateStr.length >= 6) {
      monthKey = dateStr.substring(0, 4) + '-' + dateStr.substring(4, 6);
    }
    
    if (monthKey) {
      if (!monthlyTotals[monthKey]) monthlyTotals[monthKey] = 0;
      monthlyTotals[monthKey] += Number(item.amount) || 0;
    }
  });

  const computedHistoricalExpenses = Object.keys(monthlyTotals)
    .sort()
    .slice(-6) // Last 6 months
    .map(key => ({ month: key, amount: monthlyTotals[key] }));

  return (
    <div>
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel">
          <h3 style={{ marginTop: 0 }}>This Month's Consumption ({selectedMonth})</h3>
          <div className="stat-value">${totalAmount.toLocaleString()}</div>
          <div className="stat-label">Based on {filteredItems.length} Invoices</div>
        </div>
        <div className="glass-panel">
          <h3 style={{ marginTop: 0 }}>Top Category</h3>
          <div className="stat-value">{topCategory}</div>
          <div className="stat-label">${topValue.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ height: '400px' }}>
          <h3 style={{ marginTop: 0 }}>Historical Trends</h3>
          {computedHistoricalExpenses.length > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={computedHistoricalExpenses} margin={{ top: 5, right: 20, bottom: 25, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} cursor={{fill: '#334155'}} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
              No Data in Firebase
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ height: '400px' }}>
          <h3 style={{ marginTop: 0 }}>Category Breakdown ({selectedMonth})</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#f8fafc' }}
                  style={{ outline: 'none' }}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} 
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#94a3b8' }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
              No Data in Firebase
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Invoice Details</h3>
          <select 
            className="form-input" 
            style={{ width: '200px', margin: 0 }} 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
          >
            <option value="202604">2026 年 04 月</option>
            <option value="202603">2026 年 03 月</option>
          </select>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice No</th>
                <th>Category</th>
                <th>Item Name</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => {
                const cat = categorize(item.itemName);
                return (
                  <tr key={item.id || idx}>
                    <td>{item.date}</td>
                    <td>{item.invoiceNo || item.invoice}</td>
                    <td>
                      <span style={{ 
                        background: 'rgba(59, 130, 246, 0.2)', 
                        color: '#60a5fa', 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        fontSize: '0.8rem'
                      }}>
                        {cat}
                      </span>
                    </td>
                    <td>{item.itemName}</td>
                    <td style={{ fontWeight: 'bold' }}>${Number(item.amount).toLocaleString()}</td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                    No records found for {selectedMonth}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
