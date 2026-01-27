import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { 
  User, Lock, Activity, Users, Pill, 
  AlertTriangle, Plus, Trash2, Search, 
  Stethoscope, Thermometer, Heart, Droplet, 
  ChevronRight, ArrowLeft, X, Loader2, ShieldCheck, FileText
} from 'lucide-react';

// --- Types ---
interface Drug {
  id: string;
  trade_name: string;
  active_ingredient: string;
  rx_cui?: string;
}

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female';
  room_number: string;
  diagnosis: string;
  admission_date: string;
  status: 'Stable' | 'Critical' | 'Improving';
  medical_history: string[];
  vitals: { hr: number; bp: string; temp: number; spo2: number };
}

interface PatientMedication {
  id: string;
  patient_id: string;
  drug_name: string;
  dose: string;
  start_date: string;
  active_ingredient: string;
  is_active: boolean;
  rx_cui?: string; 
}

// ==========================================
// 🛠️ INTERACTION CHECKER LOGIC
// ==========================================

const checkInteractionsByCode = async (
  newDrugCui: string, 
  newDrugName: string, 
  currentMeds: PatientMedication[], 
  setStatus: (status: string) => void
) => {
  const safeNewCui = newDrugCui ? String(newDrugCui).trim() : '';
  
  if (!safeNewCui || !/^\d+$/.test(safeNewCui)) {
    return { safe: true, message: `⚠️ تنبيه: كود الدواء (${newDrugName}) غير موجود في قاعدة بيانات RxNorm.` };
  }

  const medCuisSet = new Set<string>();
  const cuiToName: Record<string, string> = {};

  for (const med of currentMeds) {
    if (!med.is_active) continue;
    let cui = med.rx_cui ? String(med.rx_cui).trim() : null;
    if (cui && /^\d+$/.test(cui) && cui !== safeNewCui) {
      medCuisSet.add(cui);
      cuiToName[cui] = med.drug_name;
    }
  }
  
  const medCuis = Array.from(medCuisSet);
  if (medCuis.length === 0) {
    return { safe: true, message: "✅ آمن: لا توجد أدوية حالية صالحة للمقارنة." };
  }

  try {
    setStatus("جاري تحليل التفاعلات الدوائية...");
    const allCuisString = [safeNewCui, ...medCuis].join('+');
    
    // Call our local Vercel Serverless Function
    const response = await fetch(`/api/interaction-checker?rxcuis=${encodeURIComponent(allCuisString)}`);
    
    if (!response.ok) {
      throw new Error(`خطأ في الخادم (${response.status})`);
    }

    const data = await response.json();
    const conflicts: string[] = [];

    if (data.fullInteractionTypeGroup) {
      for (const group of data.fullInteractionTypeGroup) {
        for (const type of group.fullInteractionType) {
          for (const pair of type.interactionPair) {
            const involvedDrugs = pair.interactionConcept.map((c: any) => c.minConceptItem.rxcui);
            
            if (involvedDrugs.includes(safeNewCui)) {
               const severity = pair.severity === 'high' ? '⛔ خطر شديد' : '⚠️ تحذير';
               const description = pair.description;
               const otherCui = involvedDrugs.find((c: string) => c !== safeNewCui);
               const otherName = cuiToName[otherCui || ''] || 'دواء آخر في القائمة';

               conflicts.push(`${severity}: بين (${newDrugName}) و (${otherName}).\n📝 ${description}`);
            }
          }
        }
      }
    }

    if (conflicts.length > 0) {
      return { safe: false, messages: conflicts };
    }

    return { safe: true, message: "✅ آمن: لم يتم العثور على تداخلات دوائية خطيرة." };

  } catch (error: any) {
    console.error("Check Error:", error);
    return { safe: true, message: `تعذر إتمام الفحص التلقائي (خطأ: ${error.message}). يرجى المراجعة الإكلينيكية.` };
  }
};

// ==========================================
// MAIN APP COMPONENT
// ==========================================

export default function App() {
  const [view, setView] = useState<'login' | 'dashboard' | 'patient'>('login');
  const [user, setUser] = useState<{ id: string, name: string } | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const handleLogin = async (code: string, pass: string) => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('code', code)
        .eq('password', pass)
        .single();

      if (error || !data) {
        alert('بيانات الدخول غير صحيحة');
        return;
      }
      setUser({ id: data.id, name: data.name });
      setView('dashboard');
    } catch (err) {
      alert('خطأ في الاتصال بقاعدة البيانات');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans" dir="rtl">
      {view === 'login' && <LoginView onLogin={handleLogin} />}
      
      {view !== 'login' && user && (
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col shadow-xl z-20">
            <div className="p-6 border-b border-slate-700 flex items-center gap-3 bg-slate-950">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Smart Care</h1>
                <p className="text-[10px] text-slate-400">Hospital System</p>
              </div>
            </div>
            
            <nav className="flex-1 p-4 space-y-2">
              <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-blue-600' : 'hover:bg-slate-800 text-slate-300'}`}>
                <Users size={20} /> <span>لوحة المرضى</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-500 cursor-not-allowed opacity-50">
                <FileText size={20} /> <span>التقارير الطبية</span>
              </button>
            </nav>

            <div className="p-4 border-t border-slate-800 bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <User size={18} className="text-slate-400"/>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">{user.name}</p>
                  <p className="text-xs text-slate-500">طبيب استشاري</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto bg-slate-50 relative">
            {view === 'dashboard' && (
              <DashboardView onSelectPatient={(p) => { setSelectedPatient(p); setView('patient'); }} />
            )}
            
            {view === 'patient' && selectedPatient && (
              <PatientDetailsView 
                patient={selectedPatient} 
                currentUser={user.name}
                onBack={() => setView('dashboard')}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}

// --- Sub Components ---

function LoginView({ onLogin }: { onLogin: (code: string, pass: string) => void }) {
  const [code, setCode] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(code, pass);
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl p-8 text-center">
        <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Activity size={32} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Smart Hospital</h2>
        <p className="text-slate-400 mb-8">تسجيل الدخول للأطقم الطبية</p>
        <form onSubmit={handleSubmit} className="space-y-5 text-right">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">الكود الوظيفي</label>
            <input 
              type="text" 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="DR-101" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">كلمة المرور</label>
            <input 
              type="password" 
              value={pass} 
              onChange={(e) => setPass(e.target.value)} 
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="••••••" 
              required 
            />
          </div>
          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg mt-4 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin mx-auto" /> : 'دخول النظام'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DashboardView({ onSelectPatient }: { onSelectPatient: (p: Patient) => void }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      const { data } = await supabase.from('patients').select('*');
      if (data) setPatients(data);
      setLoading(false);
    };
    fetchPatients();
  }, []);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 w-10 h-10" /></div>;

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">قائمة المرضى (ICU)</h1>
        <p className="text-slate-500 text-sm">متابعة الحالات المسجلة حالياً في القسم</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {patients.map(patient => (
          <div 
            key={patient.id} 
            onClick={() => onSelectPatient(patient)} 
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-blue-400 cursor-pointer transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${patient.gender === 'Male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                  {patient.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{patient.name}</h3>
                  <p className="text-xs text-slate-500">{patient.room_number} • {patient.age} سنة</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                patient.status === 'Critical' ? 'bg-red-100 text-red-600' : 
                patient.status === 'Stable' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {patient.status}
              </span>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-xl mb-4 text-xs text-slate-600 flex items-center gap-2">
                 <Stethoscope size={14} className="text-blue-500" /> 
                 <span className="truncate">{patient.diagnosis}</span>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold">
              <span>تاريخ الدخول: {patient.admission_date}</span>
              <span className="text-blue-600 flex items-center gap-1 group-hover:translate-x-[-4px] transition-transform">
                عرض الملف <ChevronRight size={14} className="rotate-180"/>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PatientDetailsView({ patient, currentUser, onBack }: { patient: Patient, currentUser: string, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'meds' | 'notes'>('overview');

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{patient.name}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>{patient.gender === 'Male' ? 'ذكر' : 'أنثى'}</span>
              <span>•</span>
              <span>{patient.age} سنة</span>
              <span className="text-blue-600 font-bold bg-blue-50 px-2 rounded ml-2">غرفة {patient.room_number}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b px-8 flex gap-8">
        <TabButton label="المؤشرات الحيوية" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <TabButton label="الأدوية والتعارضات" active={activeTab === 'meds'} onClick={() => setActiveTab('meds')} />
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'overview' && <OverviewTab patient={patient} />}
          {activeTab === 'meds' && <MedicationsTab patient={patient} />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ patient }: { patient: Patient }) {
  const vitals = patient.vitals || { hr: 0, bp: '--/--', temp: 0, spo2: 0 };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <VitalCard icon={<Heart className="text-rose-500" />} label="Heart Rate" value={vitals.hr} unit="bpm" color="rose" />
        <VitalCard icon={<Activity className="text-blue-500" />} label="Blood Pressure" value={vitals.bp} unit="mmHg" color="blue" />
        <VitalCard icon={<Thermometer className="text-orange-500" />} label="Temperature" value={vitals.temp} unit="°C" color="orange" />
        <VitalCard icon={<Droplet className="text-cyan-500" />} label="SpO2" value={vitals.spo2} unit="%" color="cyan" />
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-4">
            <FileText size={18} className="text-blue-600"/> التشخيص الحالي والتاريخ المرضي
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <span className="text-slate-400 text-xs font-bold uppercase mb-2 block">التشخيص</span>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-900 font-medium">
                {patient.diagnosis}
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-xs font-bold uppercase mb-2 block">الأمراض السابقة</span>
              <div className="flex gap-2 flex-wrap">
                {patient.medical_history?.map((h, i) => (
                  <span key={i} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}

function MedicationsTab({ patient }: { patient: Patient }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentMeds, setCurrentMeds] = useState<PatientMedication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeds = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('patient_medications')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('is_active', true);
    if (data) setCurrentMeds(data);
    setLoading(false);
  };

  useEffect(() => { fetchMeds(); }, [patient.id]);

  const handleDelete = async (medId: string) => {
    if(confirm('هل أنت متأكد من إيقاف صرف هذا الدواء؟')) {
       await supabase.from('patient_medications').update({ is_active: false }).eq('id', medId);
       fetchMeds();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Pill className="text-blue-600" /> قائمة الأدوية النشطة
          </h3>
          <p className="text-slate-500 text-sm">إدارة العلاج وفحص التداخلات الدوائية آلياً</p>
        </div>
        <button 
             onClick={() => setShowAddModal(true)}
             className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all"
        >
             <Plus size={18} /> إضافة علاج جديد
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600"/></div> : (
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-400 border-b">
            <tr>
              <th className="p-4">اسم الدواء</th>
              <th className="p-4">الجرعة</th>
              <th className="p-4">المادة الفعالة</th>
              <th className="p-4">تاريخ البدء</th>
              <th className="p-4 text-center">إيقاف</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {currentMeds.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">لا توجد أدوية نشطة مسجلة حالياً</td></tr>
            )}
            {currentMeds.map((med) => (
              <tr key={med.id} className="hover:bg-blue-50/20 transition-colors">
                <td className="p-4 font-bold text-slate-800">{med.drug_name}</td>
                <td className="p-4"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{med.dose}</span></td>
                <td className="p-4 text-slate-500 text-xs">{med.active_ingredient}</td>
                <td className="p-4 text-slate-400 text-xs">{med.start_date}</td>
                <td className="p-4 text-center">
                  <button onClick={() => handleDelete(med.id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
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
        />
      )}
    </div>
  );
}

function AddMedicationModal({ patientId, existingMeds, onClose, onSuccess }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [drugsList, setDrugsList] = useState<Drug[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [dose, setDose] = useState('');
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
          .limit(8);
        if (data) setDrugsList(data);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (selectedDrug) {
      const performCheck = async () => {
        setChecking(true);
        setAlert(null);
        const result = await checkInteractionsByCode(
            selectedDrug.rx_cui || '', 
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
      const { error } = await supabase.from('patient_medications').insert({
        patient_id: patientId, 
        drug_name: selectedDrug.trade_name, 
        active_ingredient: selectedDrug.active_ingredient, 
        dose: dose, 
        start_date: new Date().toISOString().split('T')[0], 
        is_active: true,
        rx_cui: selectedDrug.rx_cui
      });
      if (!error) onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">إضافة دواء جديد للخطة</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-6 text-right">
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 mb-2">اسم الدواء (تجاري)</label>
            <div className="relative">
              <Search className="absolute right-3 top-3 text-slate-300" size={18} />
              <input 
                type="text" 
                className="w-full border border-slate-200 rounded-2xl pr-10 pl-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="ابحث بالاسم التجاري..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            {searchTerm && !selectedDrug && drugsList.length > 0 && (
              <div className="absolute top-full right-0 w-full bg-white border shadow-2xl mt-2 rounded-2xl max-h-52 overflow-y-auto z-20">
                {drugsList.map(drug => (
                  <div 
                    key={drug.id} 
                    className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0" 
                    onClick={() => { setSelectedDrug(drug); setSearchTerm(drug.trade_name); setDrugsList([]); }}
                  >
                    <div className="font-bold text-slate-800 text-xs">{drug.trade_name}</div>
                    <div className="text-[10px] text-slate-400">{drug.active_ingredient}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {selectedDrug && (
             <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs font-bold text-blue-800">
                   {selectedDrug.active_ingredient}
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-2">الجرعة</label>
                   <input 
                     type="text" 
                     className="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                     value={dose} 
                     onChange={e => setDose(e.target.value)} 
                     placeholder="مثال: 500mg مرتين يومياً" 
                   />
                </div>
             </div>
          )}

          {checking && (
            <div className="p-4 bg-blue-50 rounded-2xl flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600"><Loader2 className="animate-spin" size={18}/> جاري تحليل التفاعلات الدوائية...</div>
              <div className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">{statusMsg}</div>
            </div>
          )}

          {alert && !checking && (
            <div className={`p-4 rounded-2xl text-[11px] leading-relaxed border ${
              alert.type === 'danger' ? 'bg-red-50 text-red-900 border-red-200' : 'bg-green-50 text-green-900 border-green-200'
            }`}>
              {Array.isArray(alert.msg) ? (
                <div>
                  <div className="font-black mb-3 flex items-center gap-2 text-red-600"><AlertTriangle size={18}/> تنبيه: تداخلات دوائية خطيرة</div>
                  {alert.msg.map((m, i) => <div key={i} className="mb-2 bg-white/50 p-3 rounded-xl border-r-4 border-red-400">{m}</div>)}
                </div>
              ) : (
                <div className="flex items-center gap-2 font-bold"><ShieldCheck size={18} className="text-green-600"/> {alert.msg}</div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t flex justify-end gap-3 bg-slate-50">
          <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-400 hover:text-slate-600">إلغاء</button>
          <button 
            onClick={handleSubmit} 
            disabled={alert?.type === 'danger' || !dose || checking} 
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold disabled:opacity-40 shadow-lg shadow-blue-600/20 transition-all"
          >
            تأكيد الإضافة
          </button>
        </div>
      </div>
    </div>
  );
}

function VitalCard({ icon, label, value, unit, color }: any) {
  const styles: Record<string, string> = {
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    cyan: "bg-cyan-50 text-cyan-600 border-cyan-100"
  };

  return (
    <div className={`p-6 rounded-3xl border shadow-sm flex flex-col items-center transition-all hover:shadow-md ${styles[color]}`}>
      <div className="mb-3 p-2 bg-white/50 rounded-xl">{icon}</div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">{unit}</div>
      <div className="text-[10px] font-bold text-slate-900/40 uppercase">{label}</div>
    </div>
  );
}

function TabButton({ label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`py-5 px-1 border-b-2 font-black text-xs transition-all ${
        active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
      }`}
    >
      {label}
    </button>
  );
}
