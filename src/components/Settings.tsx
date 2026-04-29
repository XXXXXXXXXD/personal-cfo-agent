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
      
      const parsed = JSON.parse(configStr);
      if (!parsed.apiKey || !parsed.projectId) {
        alert('Invalid Firebase Config: Missing apiKey or projectId');
        return;
      }
      
      localStorage.setItem('firebaseConfig', JSON.stringify(parsed, null, 2));
      alert('Config saved! The application will now reload to apply the new database connection.');
      window.location.reload();
    } catch (e) {
      alert('Invalid JSON format. Please paste the valid Firebase config object.');
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
      </div>
    </div>
  );
}
