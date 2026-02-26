import React, { useState } from 'react';
import { Bot, X, Send } from 'lucide-react';
import { Patient } from '../types';

interface SmartAssistantProps {
  patient: Patient;
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}

export function SmartAssistant({ patient, isOpen, onClose, darkMode }: SmartAssistantProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: `Hello! I am your AI assistant. Ask me anything about ${patient.name}.` }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');

    // Simple heuristic "AI" response
    setTimeout(() => {
      let response = "I'm not sure about that yet.";
      const lowerInput = userMsg.toLowerCase();

      if (lowerInput.includes('bp') || lowerInput.includes('pressure')) {
        response = `The latest Blood Pressure for ${patient.name} is ${patient.vitals?.bp || 'unknown'}.`;
      } else if (lowerInput.includes('hr') || lowerInput.includes('heart')) {
        response = `Current Heart Rate is ${patient.vitals?.hr || '--'} bpm.`;
      } else if (lowerInput.includes('temp')) {
        response = `Current Temperature is ${patient.vitals?.temp || '--'} °C.`;
      } else if (lowerInput.includes('diagnosis')) {
        response = `Diagnosis: ${patient.diagnosis}`;
      } else if (lowerInput.includes('status')) {
        response = `Patient status is currently marked as: ${patient.status}`;
      } else if (lowerInput.includes('age')) {
        response = `${patient.name} is ${patient.age} years old.`;
      }

      setMessages(prev => [...prev, { role: 'bot', text: response }]);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-20 right-6 w-80 h-96 shadow-2xl rounded-2xl flex flex-col overflow-hidden z-50 border animate-in slide-in-from-bottom-10 ${
        darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      <div className={`p-4 border-b flex justify-between items-center ${darkMode ? 'bg-indigo-900/30 border-slate-700' : 'bg-indigo-50 border-indigo-100'}`}>
         <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
                <Bot size={18} className="text-white" />
            </div>
            <h3 className={`font-bold text-sm ${darkMode ? 'text-indigo-200' : 'text-indigo-800'}`}>Smart Assistant</h3>
         </div>
         <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : (darkMode ? 'bg-slate-800 text-slate-200 rounded-bl-none' : 'bg-slate-100 text-slate-800 rounded-bl-none')
                }`}>
                    {m.text}
                </div>
            </div>
        ))}
      </div>

      <div className={`p-3 border-t flex gap-2 ${darkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'}`}>
        <input
            type="text"
            className={`flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                darkMode ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-white border border-slate-200'
            }`}
            placeholder="Ask about patient..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button
            onClick={handleSend}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl transition-colors"
        >
            <Send size={18} />
        </button>
      </div>
    </div>
  );
}
