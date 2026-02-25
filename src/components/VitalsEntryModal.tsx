import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, X, Activity, Droplet, Heart, Thermometer } from 'lucide-react';

interface VitalsEntryModalProps {
  patientId: string;
  currentUser: string;
  onClose: () => void;
  onSuccess: () => void;
  darkMode: boolean;
}

export function VitalsEntryModal({ patientId, currentUser, onClose, onSuccess, darkMode }: VitalsEntryModalProps) {
  const [hr, setHr] = useState('');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [temp, setTemp] = useState('');
  const [spo2, setSpo2] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!hr || !bpSys || !bpDia || !temp || !spo2) {
        alert("Please fill all fields");
        return;
    }

    setLoading(true);

    // 1. Insert into log
    const { error: logError } = await supabase.from('patient_vitals_log').insert({
        patient_id: patientId,
        hr: parseInt(hr),
        bp_systolic: parseInt(bpSys),
        bp_diastolic: parseInt(bpDia),
        temp: parseFloat(temp),
        spo2: parseInt(spo2),
        recorded_by: currentUser,
        recorded_at: new Date().toISOString()
    });

    if (logError) {
        // If table doesn't exist, we might want to just update the patient record directly as fallback
        console.warn("Log insert failed:", logError);
    }

    // 2. Update current patient vitals
    const { error: updateError } = await supabase.from('patients').update({
        vitals: {
            hr: parseInt(hr),
            bp: `${bpSys}/${bpDia}`,
            temp: parseFloat(temp),
            spo2: parseInt(spo2)
        }
    }).eq('id', patientId);

    if (updateError) {
        alert("Error updating vitals: " + updateError.message);
    } else {
        onSuccess();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
        <div className={`p-5 border-b flex justify-between items-center ${darkMode ? 'bg-slate-950/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
          <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>Add Vitals Reading</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
                <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Heart Rate (bpm)</label>
                <div className="relative">
                    <Heart className="absolute right-3 top-3 text-rose-400" size={18} />
                    <input
                      type="number"
                      className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-300'}`}
                      placeholder="e.g. 72"
                      value={hr}
                      onChange={e => setHr(e.target.value)}
                    />
                </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
                <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>SpO2 (%)</label>
                <div className="relative">
                    <Droplet className="absolute right-3 top-3 text-cyan-400" size={18} />
                    <input
                      type="number"
                      className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-300'}`}
                      placeholder="e.g. 98"
                      value={spo2}
                      onChange={e => setSpo2(e.target.value)}
                    />
                </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
                <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Temp (°C)</label>
                <div className="relative">
                    <Thermometer className="absolute right-3 top-3 text-orange-400" size={18} />
                    <input
                      type="number" step="0.1"
                      className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-300'}`}
                      placeholder="e.g. 37.0"
                      value={temp}
                      onChange={e => setTemp(e.target.value)}
                    />
                </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
                <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Blood Pressure</label>
                <div className="flex gap-2">
                    <input
                      type="number"
                      className={`w-full border rounded-xl px-2 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-center ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-300'}`}
                      placeholder="Sys"
                      value={bpSys}
                      onChange={e => setBpSys(e.target.value)}
                    />
                    <span className="self-center text-slate-400">/</span>
                    <input
                      type="number"
                      className={`w-full border rounded-xl px-2 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-center ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-300'}`}
                      placeholder="Dia"
                      value={bpDia}
                      onChange={e => setBpDia(e.target.value)}
                    />
                </div>
            </div>
        </div>

        <div className={`p-5 border-t flex justify-end gap-3 ${darkMode ? 'bg-slate-950/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
          <button onClick={onClose} className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'}`}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Save Vitals'}
          </button>
        </div>
      </div>
    </div>
  );
}
