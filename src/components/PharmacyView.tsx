import React, { useState, useEffect } from 'react';
import { Pill, CheckCircle, Clock, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PatientMedication } from '../types';
import { getMockMedications } from '../utils/mockData';

interface PharmacyViewProps {
  darkMode: boolean;
}

export function PharmacyView({ darkMode }: PharmacyViewProps) {
  const [meds, setMeds] = useState<PatientMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAllMeds = async () => {
      setLoading(true);
      let data: any[] = [];
      try {
        const res = await supabase.from('patient_medications').select('*').eq('is_active', true);
        if (res.data) data = res.data;
      } catch (e) { console.warn(e); }

      const mock = getMockMedications();
      setMeds([...data, ...mock]);
      setLoading(false);
    };
    fetchAllMeds();
  }, []);

  const filteredMeds = meds.filter(m =>
    m.drug_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.patient_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`p-8 h-full overflow-auto ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Pharmacy Dashboard</h1>
          <p className="text-sm opacity-60">Review and dispense medications</p>
        </div>
        <div className="relative w-64">
            <Search className="absolute right-3 top-3 opacity-50" size={18} />
            <input
                type="text"
                placeholder="Search drug or patient ID..."
                className={`w-full pl-4 pr-10 py-2 rounded-xl border outline-none focus:ring-2 ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {filteredMeds.map(med => (
            <div key={med.id} className={`p-4 rounded-xl border flex items-center justify-between ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
                <div className="flex items-center gap-4">
                    <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
                        <Pill size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold">{med.drug_name}</h3>
                        <div className="text-sm opacity-60">
                            {med.dose} • {med.frequency}h • {med.active_ingredient}
                        </div>
                        <div className="text-xs opacity-40 mt-1">PID: {med.patient_id}</div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg flex items-center gap-2">
                        <CheckCircle size={16} /> Dispense
                    </button>
                </div>
            </div>
        ))}
        {filteredMeds.length === 0 && <p className="text-center opacity-50">No active medication orders found.</p>}
      </div>
    </div>
  );
}
