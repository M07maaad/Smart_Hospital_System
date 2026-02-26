import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Patient, PatientMedication, Drug, PatientNote } from '../types';
import { checkInteractionsByCode } from '../services/api';
import { FREQUENCIES, getNextDose, isMedicationDue, formatNextDose } from '../utils/medicationReminders';
import { addMockMedication, getMockMedications, addMockNote, getMockNotes } from '../utils/mockData';
import { VitalsChart } from './VitalsChart';
import { LabsTab } from './LabsTab';
import { VitalsEntryModal } from './VitalsEntryModal';
import { SmartAssistant } from './SmartAssistant';
import { FluidBalanceTab } from './FluidBalanceTab';
import { TasksTab } from './TasksTab';
import {
  ArrowLeft, Heart, Activity, Thermometer, Droplet, FileText,
  Pill, Plus, Loader2, Trash2, X, Search, AlertTriangle, ShieldCheck, Clock, CheckCircle, Bot
} from 'lucide-react';

interface PatientDetailsViewProps {
  patient: Patient;
  currentUser: string;
  onBack: () => void;
  darkMode?: boolean;
}

export function PatientDetailsView({ patient, currentUser, onBack, darkMode = false }: PatientDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'meds' | 'notes' | 'labs' | 'fluid' | 'tasks'>('overview');
  const [showAssistant, setShowAssistant] = useState(false);

  return (
    <div className={`flex flex-col h-full ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Patient Header */}
      <header className={`border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm transition-colors ${
        darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{patient.name}</h1>
            <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>{patient.gender === 'Male' ? 'ذكر' : 'أنثى'}</span>
              <span className={`w-1 h-1 rounded-full ${darkMode ? 'bg-slate-600' : 'bg-slate-300'}`}></span>
              <span>{patient.age} سنة</span>
              <span className={`w-1 h-1 rounded-full ${darkMode ? 'bg-slate-600' : 'bg-slate-300'}`}></span>
              <span className={`font-bold px-2 rounded-md ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{patient.room_number}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className={`border-b px-8 flex gap-8 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
        <TabButton label="نظرة عامة (Vitals)" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} darkMode={darkMode} />
        <TabButton label="الأدوية والخطة العلاجية" active={activeTab === 'meds'} onClick={() => setActiveTab('meds')} darkMode={darkMode} />
        <TabButton label="المتابعة والملاحظات" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} darkMode={darkMode} />
        <TabButton label="Labs & Reports" active={activeTab === 'labs'} onClick={() => setActiveTab('labs')} darkMode={darkMode} />
        <TabButton label="Fluid Balance" active={activeTab === 'fluid'} onClick={() => setActiveTab('fluid')} darkMode={darkMode} />
        <TabButton label="Tasks" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} darkMode={darkMode} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'overview' && <OverviewTab patient={patient} darkMode={darkMode} />}
          {activeTab === 'meds' && <MedicationsTab patient={patient} darkMode={darkMode} />}
          {activeTab === 'notes' && <NotesTab patientId={patient.id} doctorName={currentUser} darkMode={darkMode} />}
          {activeTab === 'labs' && <LabsTab patientId={patient.id} currentUser={currentUser} darkMode={darkMode} />}
          {activeTab === 'fluid' && <FluidBalanceTab patientId={patient.id} darkMode={darkMode} />}
          {activeTab === 'tasks' && <TasksTab patientId={patient.id} darkMode={darkMode} />}
        </div>
      </div>

      {showAssistant && (
        <SmartAssistant
            patient={patient}
            isOpen={showAssistant}
            onClose={() => setShowAssistant(false)}
            darkMode={darkMode}
        />
      )}

      {/* Floating Smart Assistant Button */}
      {!showAssistant && (
      <div className="fixed bottom-6 right-6 z-50 animate-in zoom-in">
        <button
          onClick={() => setShowAssistant(true)}
          className="p-4 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30"
          title="Smart Assistant"
        >
           <Bot size={28} className="text-white" />
        </button>
      </div>
      )}
    </div>
  );
}

function OverviewTab({ patient, darkMode }: { patient: Patient, darkMode: boolean }) {
  const vitals = patient.vitals || { hr: 0, bp: '--/--', temp: 0, spo2: 0 };
  const [showVitalsModal, setShowVitalsModal] = useState(false);

  // Mock history data based on current vitals for visualization
  // In a real app, we would fetch this from 'patient_vitals_log'
  const [mockHistory, setMockHistory] = useState<any[]>([]);

  useEffect(() => {
    const history = [];
    const now = new Date();
    for(let i=12; i>=0; i--) {
        const time = new Date(now.getTime() - i * 3600 * 1000); // last 12 hours
        // Randomly fluctuate around current vitals
        const hr = vitals.hr + Math.floor(Math.random() * 10 - 5);
        const spo2 = vitals.spo2 + Math.floor(Math.random() * 4 - 2);
        const temp = vitals.temp + (Math.random() * 0.5 - 0.25);
        history.push({
            date: time.toISOString(),
            hr: Math.max(40, hr),
            spo2: Math.min(100, spo2),
            temp: parseFloat(temp.toFixed(1)),
            bp: vitals.bp
        });
    }
    // eslint-disable-next-line
    setMockHistory(history);
  }, [vitals.hr, vitals.spo2, vitals.temp, vitals.bp]); // decomposed dependencies

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <VitalCard icon={<Heart className="text-rose-500" />} label="Heart Rate" value={vitals.hr} unit="bpm" color="rose" darkMode={darkMode} />
        <VitalCard icon={<Activity className="text-blue-500" />} label="Blood Pressure" value={vitals.bp} unit="mmHg" color="blue" darkMode={darkMode} />
        <VitalCard icon={<Thermometer className="text-orange-500" />} label="Temperature" value={vitals.temp} unit="°C" color="orange" darkMode={darkMode} />
        <VitalCard icon={<Droplet className="text-cyan-500" />} label="SpO2" value={vitals.spo2} unit="%" color="cyan" darkMode={darkMode} />
      </div>

      <div className={`p-6 rounded-2xl shadow-sm border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className={`font-bold text-lg flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                <FileText size={20} className="text-blue-600"/> البيانات الطبية
            </h3>
            <button
                onClick={() => setShowVitalsModal(true)}
                className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
                Add Vitals Reading
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <span className={`text-xs uppercase font-bold tracking-wider mb-2 block ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>التشخيص الحالي</span>
              <div className={`p-4 rounded-xl font-medium border ${
                darkMode ? 'bg-blue-900/20 border-blue-900/40 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-900'
              }`}>
                {patient.diagnosis}
              </div>
            </div>
            <div>
              <span className={`text-xs uppercase font-bold tracking-wider mb-2 block ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>التاريخ المرضي (Medical History)</span>
              <div className="flex gap-2 flex-wrap">
                {patient.medical_history?.map((h, i) => (
                  <span key={i} className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${
                    darkMode ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </div>
      </div>

      {/* Vitals History Chart */}
      <div className={`rounded-2xl shadow-sm border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
         <div className={`p-6 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
             <h3 className={`font-bold text-lg flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
               <Activity size={20} className="text-blue-600"/> Monitoring Trends (Live)
             </h3>
         </div>
         <div className="p-4 h-[350px]">
             <VitalsChart data={mockHistory} darkMode={darkMode} />
         </div>
      </div>

      {showVitalsModal && (
        <VitalsEntryModal
            patientId={patient.id}
            currentUser="Current User" // In real app, pass actual user
            onClose={() => setShowVitalsModal(false)}
            onSuccess={() => {
                setShowVitalsModal(false);
                // Trigger refresh if needed, for now we rely on Supabase realtime or simple page reload
                // Since 'patient' prop comes from parent, we might need a refresh callback
                alert("Vitals updated! Please refresh to see changes.");
            }}
            darkMode={darkMode}
        />
      )}
    </div>
  );
}

function MedicationsTab({ patient, darkMode }: { patient: Patient, darkMode: boolean }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentMeds, setCurrentMeds] = useState<PatientMedication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeds = React.useCallback(async () => {
    setLoading(true);
    let meds: PatientMedication[] = [];

    // Try Supabase first
    try {
      const { data, error } = await supabase
        .from('patient_medications')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('is_active', true);

      if (!error && data) {
        meds = data;
      }
    } catch (err) {
      console.warn("Supabase fetch failed, using mock data");
    }

    // Merge with Mock Data (or use mock if Supabase failed/empty)
    const mockMeds = getMockMedications(patient.id);
    // Combine unique by ID (simple merge)
    const combined = [...meds, ...mockMeds.filter(m => !meds.some(existing => existing.id === m.id))];

    setCurrentMeds(combined);
    setLoading(false);
  }, [patient.id]);

  // eslint-disable-next-line
  useEffect(() => { fetchMeds(); }, [fetchMeds]);

  const handleDelete = async (medId: string) => {
    if(confirm('هل أنت متأكد من إيقاف هذا الدواء؟')) {
       await supabase.from('patient_medications').update({ is_active: false }).eq('id', medId);
       fetchMeds();
    }
  };

  const handleTake = async (medId: string) => {
    const now = new Date().toISOString();
    await supabase.from('patient_medications').update({ last_taken: now }).eq('id', medId);
    fetchMeds();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h3 className={`font-bold text-lg flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            <Pill className="text-blue-600" /> الخطة العلاجية الحالية
          </h3>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>إدارة أدوية المريض وفحص التعارضات</p>
        </div>
        <button
             onClick={() => setShowAddModal(true)}
             className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
        >
             <Plus size={18} /> إضافة دواء جديد
        </button>
      </div>

      <div className={`rounded-2xl shadow-sm border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        {loading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600"/></div> : (
        <table className="w-full text-right">
          <thead className={`text-sm border-b ${darkMode ? 'bg-slate-900/50 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
            <tr>
              <th className="p-4 font-medium">اسم الدواء</th>
              <th className="p-4 font-medium">الجرعة</th>
              <th className="p-4 font-medium">الموعد القادم</th>
              <th className="p-4 font-medium">تاريخ البدء</th>
              <th className="p-4 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
            {currentMeds.length === 0 && (
              <tr><td colSpan={5} className={`p-8 text-center ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>لا توجد أدوية مسجلة</td></tr>
            )}
            {currentMeds.map((med) => {
              const freqHours = parseInt(med.frequency || '24') || 0;
              const nextDose = getNextDose(freqHours, med.last_taken, med.start_date);
              const isDue = isMedicationDue(nextDose);

              return (
              <tr key={med.id} className={`transition-colors group ${darkMode ? 'hover:bg-blue-900/10' : 'hover:bg-blue-50/50'}`}>
                <td className={`p-4 font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{med.drug_name}</td>
                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>{med.dose}</span></td>
                <td className="p-4">
                   {freqHours > 0 ? (
                      <div className="flex items-center gap-2">
                        {isDue ? (
                           <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded-full animate-pulse">
                             <Clock size={12}/> مستحق الآن
                           </span>
                        ) : (
                           <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {formatNextDose(nextDose)}
                           </span>
                        )}
                        <button
                          onClick={() => handleTake(med.id)}
                          className="p-1 text-green-600 hover:bg-green-100 rounded-full transition-colors"
                          title="تسجيل أخذ الدواء"
                        >
                          <CheckCircle size={16} />
                        </button>
                      </div>
                   ) : <span className="text-xs text-slate-400">عند اللزوم</span>}
                </td>
                <td className={`p-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{med.start_date}</td>
                <td className="p-4">
                  <button onClick={() => handleDelete(med.id)} className="text-slate-400 hover:text-red-500 p-2 transition-colors"><Trash2 size={18} /></button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>

      {showAddModal && (
        <AddMedicationModal
          patientId={patient.id}
          existingMeds={currentMeds}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchMeds(); }}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

function AddMedicationModal({ patientId, existingMeds, onClose, onSuccess, darkMode }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [drugsList, setDrugsList] = useState<Drug[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState('24');
  const [alert, setAlert] = useState<{ type: string, msg: string | string[] } | null>(null);
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (searchTerm.length > 2) {
      const timer = setTimeout(async () => {
        const { data } = await supabase
          .from('drugs')
          .select('*')
          .ilike('trade_name', `%${searchTerm}%`)
          .limit(10);
        if (data) setDrugsList(data);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (selectedDrug) {
      const performCheck = async () => {
        setChecking(true);
        setAlert(null);
        setStatusMsg("جاري الاتصال بخوادم التفاعلات...");

        const result = await checkInteractionsByCode(
            selectedDrug.active_ingredient || '',
            selectedDrug.trade_name,
            existingMeds,
            setStatusMsg
        );

        if (!result.safe) {
          setAlert({ type: 'danger', msg: result.messages || 'تعارض محتمل' });
        } else {
          setAlert({ type: 'success', msg: result.message });
        }
        setChecking(false);
      };
      performCheck();
    }
  }, [selectedDrug, existingMeds]);

  const handleSubmit = async () => {
    if (selectedDrug && dose) {
      // If severe interaction, confirm with user
      if (alert?.type === 'danger') {
        if (!window.confirm('تنبيه: يوجد تعارض دوائي خطير! هل أنت متأكد من رغبتك في إضافة هذا الدواء على مسؤوليتك؟')) {
          return;
        }
      }

      const newMedData = {
        patient_id: patientId,
        drug_name: selectedDrug.trade_name,
        active_ingredient: selectedDrug.active_ingredient,
        dose: dose,
        frequency: frequency,
        start_date: new Date().toISOString().split('T')[0],
        is_active: true,
        rx_cui: selectedDrug.rx_cui
      };

      try {
        const { error } = await supabase.from('patient_medications').insert(newMedData);

        if (error) {
          console.warn("Supabase insert failed, falling back to local mock:", error);
          // Fallback to Mock
          addMockMedication(newMedData);
          onSuccess();
        } else {
          onSuccess();
        }
      } catch (err: any) {
        console.warn("Supabase error (catch), using mock:", err);
        // Fallback to Mock
        addMockMedication(newMedData);
        onSuccess();
      }
    } else {
      alert("الرجاء اختيار الدواء وتحديد الجرعة.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
        <div className={`p-5 border-b flex justify-between items-center ${darkMode ? 'bg-slate-950/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
          <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>إضافة دواء جديد</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="relative">
            <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>اسم الدواء</label>
            <div className="relative">
              <Search className="absolute right-3 top-3 text-slate-400" size={18} />
              <input
                type="text"
                className={`w-full border rounded-xl pr-10 pl-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                  darkMode
                  ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                }`}
                placeholder="ابحث بالاسم التجاري..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {searchTerm && !selectedDrug && drugsList.length > 0 && (
              <div className={`absolute top-full left-0 w-full border shadow-xl mt-1 rounded-xl max-h-60 overflow-y-auto z-20 ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                {drugsList.map(drug => (
                  <div
                    key={drug.id}
                    className={`p-3 cursor-pointer border-b last:border-0 transition-colors ${
                      darkMode ? 'hover:bg-slate-700 border-slate-700 text-slate-200' : 'hover:bg-blue-50 border-slate-100 text-slate-800'
                    }`}
                    onClick={() => { setSelectedDrug(drug); setSearchTerm(drug.trade_name); setDrugsList([]); }}
                  >
                    <div className="font-bold text-sm">{drug.trade_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{drug.active_ingredient}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedDrug && (
             <div className="space-y-4 animate-in slide-in-from-top-2">
                <div className={`p-3 border rounded-lg text-sm ${
                  darkMode ? 'bg-blue-900/20 border-blue-900/40' : 'bg-blue-50 border-blue-100'
                }`}>
                   <div className="text-blue-600 font-bold mb-1">المادة الفعالة:</div>
                   <div className={darkMode ? 'text-blue-400' : 'text-blue-600'}>{selectedDrug.active_ingredient}</div>
                </div>
                <div>
                   <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>الجرعة الموصوفة</label>
                   <input
                     type="text"
                     className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none ${
                       darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-300'
                     }`}
                     value={dose}
                     onChange={e => setDose(e.target.value)}
                     placeholder="مثال: 500mg"
                   />
                </div>
                <div>
                   <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>التكرار (Frequency)</label>
                   <div className="relative">
                     <Clock className="absolute right-3 top-3.5 text-slate-400" size={18}/>
                     <select
                       className={`w-full border rounded-xl pr-10 pl-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none appearance-none ${
                         darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-300 bg-white'
                       }`}
                       value={frequency}
                       onChange={e => setFrequency(e.target.value)}
                     >
                       {FREQUENCIES.map(f => (
                         <option key={f.value} value={f.value}>{f.label}</option>
                       ))}
                     </select>
                   </div>
                </div>
             </div>
          )}

          {checking && (
            <div className={`flex flex-col items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg ${
              darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50/50 text-blue-600'
            }`}>
              <div className="flex items-center gap-2"><Loader2 className="animate-spin" size={18}/> جاري فحص التعارضات...</div>
              <div className="text-xs font-normal opacity-80">{statusMsg}</div>
            </div>
          )}

          {alert && !checking && (
            <div className={`p-4 rounded-xl text-sm whitespace-pre-line leading-relaxed border ${
              alert.type === 'danger'
                ? (darkMode ? 'bg-red-900/20 text-red-300 border-red-900/40' : 'bg-red-50 text-red-700 border-red-200')
                : (darkMode ? 'bg-green-900/20 text-green-300 border-green-900/40' : 'bg-green-50 text-green-700 border-green-200')
            }`}>
              {Array.isArray(alert.msg) ? (
                <div>
                  <div className="font-bold mb-2 flex items-center gap-2"><AlertTriangle size={16}/> تم اكتشاف تعارضات:</div>
                  {alert.msg.map((m, i) => <div key={i} className={`mb-2 last:mb-0 pl-4 border-r-2 ${darkMode ? 'border-red-800' : 'border-red-300'}`}>{m}</div>)}
                </div>
              ) : (
                <div className="flex items-center gap-2 font-medium"><ShieldCheck size={18}/> {alert.msg}</div>
              )}
            </div>
          )}
        </div>

        <div className={`p-5 border-t flex justify-end gap-3 ${darkMode ? 'bg-slate-950/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
          <button onClick={onClose} className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${
            darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'
          }`}>إلغاء</button>
          <button
            onClick={handleSubmit}
            disabled={!dose || checking}
            className={`px-6 py-2.5 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg ${
              alert?.type === 'danger'
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
            }`}
          >
            {alert?.type === 'danger' ? 'تجاهل وإضافة' : 'تأكيد الإضافة'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotesTab({ patientId, doctorName, darkMode }: { patientId: string, doctorName: string, darkMode: boolean }) {
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [newNote, setNewNote] = useState('');

  const fetchNotes = React.useCallback(async () => {
    let notesData: PatientNote[] = [];
    try {
        const { data } = await supabase.from('patient_notes').select('*').eq('patient_id', patientId).order('created_at', { ascending: false });
        if(data) notesData = data;
    } catch (e) { console.warn(e); }

    const mock = getMockNotes(patientId);
    setNotes([...notesData, ...mock]);
  }, [patientId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const saveNote = async () => {
    if(!newNote) return;
    const noteData = { patient_id: patientId, doctor_name: doctorName, note_text: newNote, created_at: new Date().toISOString() };

    try {
        const { error } = await supabase.from('patient_notes').insert(noteData);
        if (error) throw error;
    } catch (e) {
        console.warn("Saving note to mock store");
        addMockNote(noteData);
    }
    setNewNote('');
    fetchNotes();
  };

  return (
    <div className="space-y-6">
      <div className={`p-5 rounded-2xl border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <textarea
          className={`w-full border rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none ${
            darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-900'
          }`}
          rows={3}
          placeholder="اكتب ملاحظات المرور اليومي هنا..."
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
        ></textarea>
        <div className="flex justify-end mt-3">
          <button onClick={saveNote} className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
            darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
          }`}>حفظ الملاحظة</button>
        </div>
      </div>
      <div className="space-y-4">
        {notes.length === 0 && <p className={`text-center py-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>لا توجد ملاحظات سابقة</p>}
        {notes.map(note => (
          <div key={note.id} className={`p-5 rounded-2xl border shadow-sm relative group transition-colors ${
            darkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-100 hover:border-blue-200'
          }`}>
             <div className="flex items-center gap-3 mb-3">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                 darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'
               }`}>DR</div>
               <div>
                 <div className={`text-sm font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{note.doctor_name}</div>
                 <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{new Date(note.created_at).toLocaleDateString()}</div>
               </div>
             </div>
             <p className={`text-sm leading-relaxed pr-11 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{note.note_text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VitalCard({ icon, label, value, unit, color, darkMode }: any) {
  const colorClasses: Record<string, string> = {
    rose: darkMode ? "bg-rose-900/20 text-rose-400 border-rose-900/30" : "bg-rose-50 text-rose-600 border-rose-100",
    blue: darkMode ? "bg-blue-900/20 text-blue-400 border-blue-900/30" : "bg-blue-50 text-blue-600 border-blue-100",
    orange: darkMode ? "bg-orange-900/20 text-orange-400 border-orange-900/30" : "bg-orange-50 text-orange-600 border-orange-100",
    cyan: darkMode ? "bg-cyan-900/20 text-cyan-400 border-cyan-900/30" : "bg-cyan-50 text-cyan-600 border-cyan-100"
  };

  return (
    <div className={`p-5 rounded-2xl border shadow-sm flex flex-col items-center text-center transition-transform hover:-translate-y-1 duration-300 ${colorClasses[color]}`}>
      <div className="mb-3 opacity-90 p-2 bg-white/50 rounded-full">{icon}</div>
      <div className="text-3xl font-black">{value} <span className="text-xs font-medium opacity-60 uppercase">{unit}</span></div>
      <div className="text-xs font-bold uppercase tracking-wider mt-1 opacity-70">{label}</div>
    </div>
  );
}

function TabButton({ label, active, onClick, darkMode }: any) {
  return (
    <button
      onClick={onClick}
      className={`py-4 px-4 border-b-[3px] font-bold text-sm transition-all ${
        active
        ? 'border-blue-600 text-blue-600'
        : `border-transparent ${darkMode ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-900' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'} rounded-t-lg`
      }`}
    >
      {label}
    </button>
  );
}
