import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Patient } from '../types';
import { getNextDose, isMedicationDue } from '../utils/medicationReminders';
import { Loader2, Stethoscope, ChevronRight, Search, Filter, Clock } from 'lucide-react';

interface DashboardViewProps {
  onSelectPatient: (p: Patient) => void;
  darkMode?: boolean;
}

export function DashboardView({ onSelectPatient, darkMode = false }: DashboardViewProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [medAlerts, setMedAlerts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase.from('patients').select('*');
      if (data) {
        setPatients(data);
      }

      const { data: meds } = await supabase.from('patient_medications').select('*').eq('is_active', true);
      if (meds) {
        const alerts: Record<string, boolean> = {};
        meds.forEach(m => {
          const freq = parseInt(m.frequency || '24') || 0;
          if (freq > 0) {
            const next = getNextDose(freq, m.last_taken, m.start_date);
            if (isMedicationDue(next)) {
              alerts[m.patient_id] = true;
            }
          }
        });
        setMedAlerts(alerts);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const filteredPatients = React.useMemo(() => {
    let result = patients;

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(lowerTerm) ||
        p.room_number.toLowerCase().includes(lowerTerm) ||
        p.diagnosis.toLowerCase().includes(lowerTerm)
      );
    }

    if (statusFilter !== 'All') {
      result = result.filter(p => p.status === statusFilter);
    }
    return result;
  }, [patients, searchTerm, statusFilter]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 w-10 h-10" /></div>;

  return (
    <div className={`p-8 min-h-full ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>قائمة المرضى (In-Patients)</h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>نظرة عامة على الحالات المسجلة حالياً</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative">
                <Search className={`absolute right-3 top-2.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} size={18} />
                <input
                    type="text"
                    placeholder="بحث بالاسم، الغرفة، التشخيص..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-4 pr-10 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64 transition-all ${
                        darkMode
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                    }`}
                />
            </div>

            {/* Filter */}
            <div className="relative">
                <Filter className={`absolute right-3 top-2.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} size={18} />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`pl-4 pr-10 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none appearance-none w-full sm:w-40 cursor-pointer transition-all ${
                        darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                >
                    <option value="All">الكل</option>
                    <option value="Stable">مستقر (Stable)</option>
                    <option value="Critical">حرج (Critical)</option>
                    <option value="Improving">يتحسن (Improving)</option>
                </select>
            </div>

            <span className={`px-4 py-2 rounded-xl border font-medium flex items-center justify-center ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
            }`}>
            العدد: {filteredPatients.length}
            </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.length === 0 && (
            <div className="col-span-full text-center py-12">
                <p className={`text-lg ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>لا توجد نتائج مطابقة للبحث</p>
            </div>
        )}
        {filteredPatients.map(patient => (
          <div
            key={patient.id}
            onClick={() => onSelectPatient(patient)}
            className={`relative rounded-2xl shadow-sm border p-5 cursor-pointer transition-all group hover:shadow-md hover:border-blue-400 ${
                darkMode
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-750'
                : 'bg-white border-slate-200 hover:bg-white'
            }`}
          >
            {medAlerts[patient.id] && (
              <div className="absolute top-4 left-4 z-10 animate-bounce">
                <div className="bg-red-500 text-white p-1.5 rounded-full shadow-lg shadow-red-500/30 flex items-center justify-center" title="Medication Due Now">
                  <Clock size={16} className="animate-pulse" />
                </div>
              </div>
            )}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    darkMode
                    ? (patient.gender === 'Male' ? 'bg-blue-900/30 text-blue-400' : 'bg-pink-900/30 text-pink-400')
                    : (patient.gender === 'Male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600')
                }`}>
                  {patient.name.charAt(0)}
                </div>
                <div>
                  <h3 className={`font-bold transition-colors ${darkMode ? 'text-slate-200 group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'}`}>{patient.name}</h3>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{patient.room_number} • {patient.age} سنة</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                patient.status === 'Critical' ? 'bg-red-100 text-red-600' :
                patient.status === 'Stable' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {patient.status}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className={`flex items-center gap-2 text-sm p-2 rounded-lg ${darkMode ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                 <Stethoscope size={16} className={`${darkMode ? 'text-slate-500' : 'text-slate-400'} shrink-0`} />
                 <span className="truncate">{patient.diagnosis}</span>
              </div>
            </div>

            <div className={`pt-4 border-t flex justify-between items-center text-xs ${darkMode ? 'border-slate-700 text-slate-500' : 'border-slate-100 text-slate-500'}`}>
              <span>دخول: {patient.admission_date}</span>
              <span className="text-blue-600 font-medium flex items-center gap-1 group-hover:translate-x-[-2px] transition-transform">
                عرض الملف <ChevronRight size={14} className="rotate-180"/>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
