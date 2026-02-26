import React, { useState } from 'react';
import { FileText, Download, Check } from 'lucide-react';

interface DischargeViewProps {
  darkMode: boolean;
}

export function DischargeView({ darkMode }: DischargeViewProps) {
  const [patientId, setPatientId] = useState('');
  const [summary, setSummary] = useState('');
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    setGenerated(true);
    setTimeout(() => setGenerated(false), 3000);
  };

  return (
    <div className={`p-8 h-full overflow-auto ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Discharge Planning</h1>
        <p className="text-sm opacity-60">Generate discharge summaries and patient instructions</p>
      </header>

      <div className={`max-w-2xl mx-auto p-6 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
         <div className="space-y-4">
            <div>
                <label className="block text-sm font-bold mb-2">Patient ID / Name</label>
                <input
                    type="text"
                    className={`w-full p-3 rounded-xl border outline-none focus:ring-2 ${darkMode ? 'bg-slate-900 border-slate-600' : 'bg-slate-50 border-slate-300'}`}
                    placeholder="Enter patient details..."
                    value={patientId}
                    onChange={e => setPatientId(e.target.value)}
                />
            </div>
            <div>
                <label className="block text-sm font-bold mb-2">Clinical Summary & Instructions</label>
                <textarea
                    rows={6}
                    className={`w-full p-3 rounded-xl border outline-none focus:ring-2 ${darkMode ? 'bg-slate-900 border-slate-600' : 'bg-slate-50 border-slate-300'}`}
                    placeholder="Type discharge notes here..."
                    value={summary}
                    onChange={e => setSummary(e.target.value)}
                ></textarea>
            </div>
            <button
                onClick={handleGenerate}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
            >
                {generated ? <Check size={20}/> : <Download size={20}/>}
                {generated ? 'Generated Successfully' : 'Generate Discharge Summary PDF'}
            </button>
         </div>
      </div>
    </div>
  );
}
