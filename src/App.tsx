import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import Consumption from './components/Consumption';
import FinanceAdvisor from './components/FinanceAdvisor';
import StockPortfolio from './components/StockPortfolio';
import HistoryList from './components/HistoryList';
import Settings from './components/Settings';
import { isFirebaseConfigured } from './firebaseClient';
import { Wallet, Settings as SettingsIcon } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState(isFirebaseConfigured ? 'dashboard' : 'settings');

  return (
    <div className="app-container">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Wallet className="icon" style={{ color: 'var(--accent-color)', width: '32px', height: '32px' }} />
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Personal CFO</h1>
        </div>
      </header>

      <nav className="nav-tabs" style={{ flexWrap: 'wrap' }}>
        <button className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          Dashboard
        </button>
        <button className={`nav-tab ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveTab('portfolio')}>
          Stock Portfolio
        </button>
        <button className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          History
        </button>
        <button className={`nav-tab ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
          Record Tx
        </button>
        <button className={`nav-tab ${activeTab === 'consumption' ? 'active' : ''}`} onClick={() => setActiveTab('consumption')}>
          Consumption
        </button>
        <button className={`nav-tab ${activeTab === 'advisor' ? 'active' : ''}`} onClick={() => setActiveTab('advisor')}>
          Advisor
        </button>
        <button className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SettingsIcon size={18} /> Settings
        </button>
      </nav>

      <main>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'portfolio' && <StockPortfolio />}
        {activeTab === 'history' && <HistoryList />}
        {activeTab === 'transactions' && <TransactionForm />}
        {activeTab === 'consumption' && <Consumption />}
        {activeTab === 'advisor' && <FinanceAdvisor />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  );
}

export default App;
