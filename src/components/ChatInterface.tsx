import React, { useState, useRef, useEffect } from 'react';
import type { Message } from '../hooks/useResignChat';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isVerdictPhase: boolean;
  isTyping: boolean;
}

export function ChatInterface({ messages, onSendMessage, isVerdictPhase, isTyping }: ChatInterfaceProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isVerdictPhase) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="app-container">
      <div className="header-bar">
        <h1 className="header-title">
          <span className="status-dot"></span>
          Resign Na Ba? 🚨
        </h1>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          Chismis Protocol: Active
        </div>
      </div>

      <div className="chat-window">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender} ${msg.isChaotic ? 'shake' : ''}`}>
            {msg.sender === 'ai' ? <strong>Tita AI: </strong> : <strong>You: </strong>}
            {msg.text}
          </div>
        ))}
        {isTyping && (
          <div className="typing-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="input-area" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isVerdictPhase ? "Consulting the HR gods..." : isTyping ? "Tita AI is typing furiously..." : "Spill the tea..."}
          disabled={isVerdictPhase || isTyping}
          autoFocus
          autoComplete="off"
        />
        <button 
          type="submit" 
          className="send-button" 
          disabled={!inputText.trim() || isVerdictPhase || isTyping}
        >
          VENT
        </button>
      </form>
    </div>
  );
}
