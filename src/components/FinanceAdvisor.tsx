import React, { useState } from 'react';
import { Send } from 'lucide-react';

export default function FinanceAdvisor() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! I am connected to Google Finance. Ask me for investment advice or stock quotes.' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', text: input }]);
    setInput('');
    
    // Mock response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: `Looking up info for "${input}"... Based on current Google Finance data, the market shows mixed signals. Make sure to diversify.` 
      }]);
    }, 1000);
  };

  return (
    <div className="glass-panel chat-box">
      <h3 style={{ marginTop: 0 }}>Google Finance Advisor</h3>
      
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.text}
          </div>
        ))}
      </div>

      <div className="chat-input-wrapper">
        <input 
          type="text" 
          className="form-input" 
          placeholder="Ask about AAPL, TSLA, or market trends..." 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSend()}
        />
        <button className="btn" onClick={handleSend} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
