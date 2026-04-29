import React, { useState } from 'react';
import { isFirebaseConfigured } from '../firebaseClient';

export default function Settings() {
  const [configStr, setConfigStr] = useState(localStorage.getItem('firebaseConfig') || '');

  const handleSave = () => {
    try {
      if (!configStr.trim()) {
        localStorage.removeItem('firebaseConfig');
        alert('Config cleared. Page will reload.');
        window.location.reload();
        return;
      }
      
      let parsed;
      try {
        parsed = JSON.parse(configStr);
      } catch (e) {
        // Fallback for raw Javascript objects copied directly from Firebase Console
        try {
          // eslint-disable-next-line no-new-func
          parsed = new Function('return ' + configStr.trim())();
        } catch (err) {
          alert('Invalid format. Please paste the Firebase config object correctly.');
          return;
        }
      }
      
      if (!parsed || !parsed.apiKey || !parsed.projectId) {
        alert('Invalid Firebase Config: Missing apiKey or projectId');
        return;
      }
      
      localStorage.setItem('firebaseConfig', JSON.stringify(parsed, null, 2));
      alert('Config saved! The application will now reload to apply the new database connection.');
      window.location.reload();
    } catch (e) {
      alert('An error occurred while saving the configuration.');
    }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginTop: 0 }}>App Settings</h2>
      
      <div style={{ marginBottom: '2rem' }}>
        <h3 className="section-title">Database Connection</h3>
        {!isFirebaseConfigured && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <strong>Action Required:</strong> Firebase is not connected. Please enter your Firebase Configuration to start using the app.
          </div>
        )}
        <p style={{ color: '#94a3b8' }}>
          Paste your Firebase Web App configuration object (JSON) below. This data is only stored locally in your browser.
        </p>
        
        <textarea 
          className="form-input" 
          rows={10} 
          style={{ fontFamily: 'monospace', fontSize: '14px', whiteSpace: 'pre' }}
          placeholder={`{\n  "apiKey": "AIzaSyDOCabC...",\n  "authDomain": "your-app.firebaseapp.com",\n  "projectId": "your-app",\n  "storageBucket": "your-app.appspot.com",\n  "messagingSenderId": "123456789",\n  "appId": "1:123:web:456"\n}`}
          value={configStr}
          onChange={e => setConfigStr(e.target.value)}
        />
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button className="btn" style={{ background: '#10b981' }} onClick={handleSave}>
            Save & Connect
          </button>
          <button className="btn" style={{ background: '#ef4444' }} onClick={() => setConfigStr('')}>
            Clear
          </button>
        </div>
        
        <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <h3 style={{ marginTop: 0, color: '#f8fafc', fontSize: '1.1rem' }}>如何取得 Firebase Config？ (首次設定)</h3>
          <ol style={{ color: '#cbd5e1', fontSize: '0.95rem', paddingLeft: '1.2rem', lineHeight: '1.8', margin: 0 }}>
            <li>前往 <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>Firebase Console</a> 並登入 Google 帳號。</li>
            <li>點擊 <strong>"建立專案 (Create Project)"</strong>，輸入你喜歡的專案名稱。</li>
            <li>在左側選單選擇 <strong>"Build" &gt; "Firestore Database"</strong>。</li>
            <li>點擊 <strong>"Create Database"</strong>，地區選擇 <code>asia-east1</code> (台灣) 或預設值，模式請先選擇<strong>「Test mode (測試模式)」</strong>。</li>
            <li>回到總覽頁面 (點左上角 Project Overview 旁邊的齒輪)，點擊畫面中央的 <code>&lt;/&gt;</code> (Web) 圖示來新增應用程式。</li>
            <li>註冊完成後，畫面會顯示一段包含 <code>apiKey</code>, <code>projectId</code> 的 <code>firebaseConfig</code> 程式碼，請直接複製該區塊並貼到上方的輸入框！</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
