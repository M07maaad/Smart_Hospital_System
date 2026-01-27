import React, { useState, useEffect } from 'react';
// استخدام استيراد مباشر لضمان عمل المعاينة وتجاوز خطأ الـ Resolution
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { 
  User, Lock, Activity, Users, Pill, 
  AlertTriangle, Plus, Trash2, Search, 
  Stethoscope, Thermometer, Heart, Droplet, 
  ChevronRight, ArrowLeft, X, Loader2, ShieldCheck, FileText
} from 'lucide-react';

// --- Supabase Configuration ---
// استخدام الوصول الآمن للمتغيرات لتجنب تحذيرات esbuild في البيئات القديمة
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    return import.meta.env[key] || '';
  } catch (e) {
    return '';
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

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

interface PatientNote {
  id: string;
  created_at: string;
  doctor_name: string;
  note_text: string;
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
    return { safe: true, message: `⚠️ تنبيه: كود الدواء (${newDrugName}) غير متوفر حالياً للفحص الآلي.` };
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
    return { safe: true, message: "✅ آمن: لا توجد أدوية حالية للمريض للمقارنة معها." };
  }

  try {
    setStatus("جاري الاتصال بخادم التفاعلات...");
    const allCuisString = [safeNewCui, ...medCuis].join('+');
    
    // استدعاء الـ API الوسيط في Vercel
    const response = await fetch(`/api/interaction-checker?rxcuis=${encodeURIComponent(allCuisString)}`);
    
    if (!response.ok) {
      throw new Error(`خطأ في استجابة الخادم (${response.status})`);
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

               conflicts.push(`${severity}: تداخل بين (${newDrugName}) و (${otherName}).\n📝 ${description}`);
            }
          }
        }
      }
    }

    if (conflicts.length > 0) {
      return { safe: false, messages: conflicts };
    }

    return { safe: true, message: "✅ تم الفحص: لا توجد تداخلات دوائية معروفة في سجلات RxNav." };

  } catch (error: any) {
    console.error("Interaction Check Error:", error);
    return { safe: true, message: `تعذر الفحص التلقائي (خطأ: ${error.message}). يرجى المراجعة الإكلينيكية.` };
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
                <h1 className="font-bold text-lg leading-tight">Smart Care</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Hospital System</p>
              </div>
            </div>
            
            <nav className="flex-1 p-4 space-y-2">
              <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800 text-slate-300'}`}>
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

// --- Views & Components ---

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
      <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/10 rounded-[2rem] shadow-2xl p-8 text-center animate-in fade-in duration-500">
        <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Activity size={32} className="text-white" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2">Smart Hospital</h2>
        <p className="text-slate-400 mb-8 font-medium">نظام العناية المركزة الذكي</p>
        <form onSubmit={handleSubmit} className="space-y-5 text-right">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 pr-2">كود الموظف</label>
            <input 
              type="text" 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              className="w-full bg-slate-800/50 border-2 border-slate-700/50 rounded-2xl px-5 py-4 text-white outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold" 
              placeholder="DR-101" 
              required 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 pr-2">كلمة المرور</label>
            <input 
              type="password" 
              value={pass} 
              onChange={(e) => setPass(e.target.value)} 
              className="w-full bg-slate-800/50 border-2 border-slate-700/50 rounded-2xl px-5 py-4 text-white outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold" 
              placeholder="••••••" 
              required 
            />
          </div>
          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4.5 rounded-2xl font-black text-lg shadow-2xl shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 mt-4">
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
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-800">المرضى المنومين</h1>
          <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-widest">In-Patient Management</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 text-slate-600 font-black text-sm">
          {patients.length} حالة نشطة
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {patients.map(patient => (
          <div 
            key={patient.id} 
            onClick={() => onSelectPatient(patient)} 
            className="bg-white rounded-[2rem] shadow-sm border-2 border-transparent hover:border-blue-500 hover:shadow-2xl transition-all cursor-pointer group p-8"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${patient.gender === 'Male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                  {patient.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 group-hover:text-blue-600 transition-colors text-lg leading-none">{patient.name}</h3>
                  <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-wider">{patient.room_number} • {patient.age} سنة</p>
                </div>
              </div>
              <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] shadow-sm ${
                patient.status === 'Critical' ? 'bg-red-50 text-red-600' : 
                patient.status === 'Stable' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
              }`}>
                {patient.status}
              </span>
            </div>
            
            <div className="bg-slate-50 p-5 rounded-2xl mb-6 text-sm text-slate-600 flex items-center gap-3 border border-slate-100">
                 <Stethoscope size={18} className="text-blue-500 shrink-0" /> 
                 <span className="truncate font-bold">{patient.diagnosis}</span>
            </div>

            <div className="pt-6 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-300 font-black uppercase tracking-widest">
              <span>الدخول: {patient.admission_date}</span>
              <span className="text-blue-600 flex items-center gap-2 group-hover:translate-x-[-4px] transition-transform">
                عرض الملف الكامل <ChevronRight size={14} className="rotate-180"/>
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
      <header className="bg-white border-b px-8 py-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-500 transition-all active:scale-90">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 leading-none">{patient.name}</h1>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 font-black uppercase tracking-widest">
              <span>{patient.gender === 'Male' ? 'ذكر' : 'أنثى'}</span>
              <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
              <span>{patient.age} سنة</span>
              <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-xl shadow-sm">غرفة {patient.room_number}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b px-8 flex gap-12">
        <TabButton label="المؤشرات الحيوية" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <TabButton label="الأدوية والتعارضات" active={activeTab === 'meds'} onClick={() => setActiveTab('meds')} />
        <TabButton label="ملاحظات المتابعة" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
      </div>

      <div className="flex-1 overflow-auto p-10">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'overview' && <OverviewTab patient={patient} />}
          {activeTab === 'meds' && <MedicationsTab patient={patient} />}
          {activeTab === 'notes' && <NotesTab patientId={patient.id} doctorName={currentUser} />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ patient }: { patient: Patient }) {
  const vitals = patient.vitals || { hr: 0, bp: '--/--', temp: 0, spo2: 0 };
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <VitalCard icon={<Heart className="text-rose-500" />} label="Heart Rate" value={vitals.hr} unit="bpm" color="rose" />
        <VitalCard icon={<Activity className="text-blue-500" />} label="Blood Pressure" value={vitals.bp} unit="mmHg" color="blue" />
        <VitalCard icon={<Thermometer className="text-orange-500" />} label="Temperature" value={vitals.temp} unit="°C" color="orange" />
        <VitalCard icon={<Droplet className="text-cyan-500" />} label="SpO2" value={vitals.spo2} unit="%" color="cyan" />
      </div>
      
      <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="font-black text-slate-800 mb-10 flex items-center gap-4 border-b pb-8">
            <FileText size={24} className="text-blue-600"/> البيانات التشخيصية والتاريخ المرضي
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mb-4 block">التشخيص الحالي</span>
              <div className="bg-blue-50/50 border-2 border-blue-100 p-6 rounded-3xl text-blue-900 font-black text-lg shadow-inner">
                {patient.diagnosis}
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mb-4 block">التاريخ الصحي (History)</span>
              <div className="flex gap-3 flex-wrap">
                {patient.medical_history?.map((h, i) => (
                  <span key={i} className="bg-white text-slate-700 px-5 py-2.5 rounded-2xl border-2 border-slate-50 text-sm font-black shadow-sm">
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
    if(confirm('هل أنت متأكد من إيقاف صرف هذا الدواء للمريض؟')) {
       await supabase.from('patient_medications').update({ is_active: false }).eq('id', medId);
       fetchMeds();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h3 className="font-black text-xl text-slate-800 flex items-center gap-4">
            <Pill className="text-blue-600" /> الأدوية النشطة حالياً
          </h3>
          <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-widest">Rx Monitoring & Interaction Check</p>
        </div>
        <button 
             onClick={() => setShowAddModal(true)}
             className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-2xl shadow-blue-600/30 transition-all active:scale-95 font-black text-sm"
        >
             <Plus size={24} /> إضافة علاج جديد
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        {loading ? <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 w-12 h-12"/></div> : (
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-400 border-b font-black text-[10px] uppercase tracking-widest">
            <tr>
              <th className="p-8">الصنف الدوائي</th>
              <th className="p-8">الجرعة</th>
              <th className="p-8">المادة الفعالة</th>
              <th className="p-8">البدء</th>
              <th className="p-8 text-center">الإجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {currentMeds.length === 0 && (
              <tr><td colSpan={5} className="p-24 text-center text-slate-300 font-black italic text-2xl uppercase tracking-[0.2em]">No Active Medications</td></tr>
            )}
            {currentMeds.map((med) => (
              <tr key={med.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="p-8 font-black text-slate-800 text-lg leading-none">{med.drug_name}</td>
                <td className="p-8"><span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-xl text-xs font-black shadow-sm border border-blue-200">{med.dose}</span></td>
                <td className="p-8 text-slate-400 font-bold text-xs uppercase">{med.active_ingredient}</td>
                <td className="p-8 text-slate-300 text-[10px] font-black uppercase">{med.start_date}</td>
                <td className="p-8 text-center">
                  <button onClick={() => handleDelete(med.id)} className="text-slate-200 hover:text-red-500 p-3 transition-all hover:bg-red-50 rounded-2xl"><Trash2 size={24} /></button>
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
          .limit(10);
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
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20">
        <div className="p-10 border-b flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-800 text-2xl">إضافة علاج للخطة</h3>
            <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">New Clinical Entry</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 transition-all p-3 hover:bg-white rounded-[1.5rem] active:scale-90 shadow-sm border border-transparent hover:border-slate-100"><X size={32} /></button>
        </div>
        
        <div className="p-10 space-y-10 text-right overflow-y-auto max-h-[70vh]">
          <div className="relative">
            <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 pr-4">البحث في الأصناف التجارية</label>
            <div className="relative group">
              <Search className="absolute right-5 top-5 text-slate-300 group-focus-within:text-blue-600 transition-all" size={24} />
              <input 
                type="text" 
                className="w-full border-2 border-slate-50 bg-slate-50 rounded-[2rem] pr-14 pl-6 py-5 outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-600 transition-all font-black text-lg shadow-inner"
                placeholder="ابحث بالاسم التجاري..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            {searchTerm && !selectedDrug && drugsList.length > 0 && (
              <div className="absolute top-full right-0 w-full bg-white border-2 border-slate-50 shadow-2xl mt-4 rounded-[2rem] max-h-72 overflow-y-auto z-20 p-3 space-y-2">
                {drugsList.map(drug => (
                  <div 
                    key={drug.id} 
                    className="p-5 hover:bg-blue-50 cursor-pointer rounded-2xl transition-all border-b border-slate-50 last:border-0" 
                    onClick={() => { setSelectedDrug(drug); setSearchTerm(drug.trade_name); setDrugsList([]); }}
                  >
                    <div className="font-black text-slate-800 text-base">{drug.trade_name}</div>
                    <div className="text-[10px] text-slate-400 mt-2 font-black uppercase tracking-widest leading-none">{drug.active_ingredient}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {selectedDrug && (
             <div className="space-y-8 animate-in slide-in-from-top-6 duration-500">
                <div className="p-6 bg-blue-50/50 border-2 border-blue-100 rounded-[2rem] text-sm font-black text-blue-800 shadow-sm">
                   <div className="opacity-40 text-[9px] uppercase tracking-[0.25em] mb-2">المادة الفعالة المختارة</div>
                   {selectedDrug.active_ingredient}
                </div>
                <div>
                   <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 pr-4">الجرعة الطبية المقررة</label>
                   <input 
                     type="text" 
                     className="w-full border-2 border-slate-50 bg-slate-50 rounded-[2rem] px-8 py-5 outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-600 transition-all font-black text-lg shadow-inner" 
                     value={dose} 
                     onChange={e => setDose(e.target.value)} 
                     placeholder="مثال: 1g IV TDS" 
                   />
                </div>
             </div>
          )}

          {checking && (
            <div className="p-8 bg-blue-50/50 rounded-[2.5rem] flex flex-col items-center gap-4 border-2 border-blue-100/50">
              <div className="flex items-center gap-4 text-lg font-black text-blue-600"><Loader2 className="animate-spin" size={28}/> تحليل التفاعلات الدوائية...</div>
              <div className="text-[10px] text-blue-300 font-black uppercase tracking-[0.4em]">{statusMsg}</div>
            </div>
          )}

          {alert && !checking && (
            <div className={`p-8 rounded-[2.5rem] text-[12px] leading-relaxed border-2 animate-in zoom-in duration-300 ${
              alert.type === 'danger' ? 'bg-red-50 text-red-900 border-red-100 shadow-2xl shadow-red-100/50' : 'bg-green-50 text-green-900 border-green-100 shadow-xl shadow-green-100/30'
            }`}>
              {Array.isArray(alert.msg) ? (
                <div>
                  <div className="font-black mb-6 flex items-center gap-4 text-red-600 text-xl tracking-tight"><AlertTriangle size={32}/> تعارض دوائي خطير!</div>
                  {alert.msg.map((m, i) => <div key={i} className="mb-4 bg-white/70 p-6 rounded-3xl border-r-8 border-red-500 shadow-sm font-bold text-sm leading-relaxed">{m}</div>)}
                </div>
              ) : (
                <div className="flex items-center gap-4 font-black text-base"><ShieldCheck size={28} className="text-green-600"/> {alert.msg}</div>
              )}
            </div>
          )}
        </div>

        <div className="p-10 border-t flex justify-end gap-6 bg-slate-50/50">
          <button onClick={onClose} className="px-8 py-4 text-sm font-black text-slate-400 hover:text-slate-800 transition-all uppercase tracking-[0.2em] active:scale-95">إلغاء</button>
          <button 
            onClick={handleSubmit} 
            disabled={alert?.type === 'danger' || !dose || checking} 
            className="px-14 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] text-sm font-black disabled:opacity-30 shadow-2xl shadow-blue-600/40 transition-all active:scale-95 uppercase tracking-widest"
          >
            تأكيد الحفظ
          </button>
        </div>
      </div>
    </div>
  );
}

function NotesTab({ patientId, doctorName }: { patientId: string, doctorName: string }) {
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [newNote, setNewNote] = useState('');
  
  const fetchNotes = async () => { 
    const { data } = await supabase.from('patient_notes').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }); 
    if(data) setNotes(data); 
  };
  
  useEffect(() => { fetchNotes(); }, [patientId]);
  
  const saveNote = async () => { 
    if(!newNote.trim()) return; 
    await supabase.from('patient_notes').insert({ patient_id: patientId, doctor_name: doctorName, note_text: newNote }); 
    setNewNote(''); 
    fetchNotes(); 
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-sm space-y-6">
        <textarea 
          className="w-full border-4 border-slate-50 bg-slate-50/50 rounded-[2rem] p-8 text-base outline-none focus:ring-12 focus:ring-blue-500/5 focus:border-blue-600 transition-all font-bold min-h-[200px] resize-none shadow-inner" 
          placeholder="أدخل ملاحظات المرور الطبي أو التقدم في الحالة هنا..." 
          value={newNote} 
          onChange={e => setNewNote(e.target.value)}
        ></textarea>
        <div className="flex justify-end">
          <button onClick={saveNote} className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-black text-sm hover:bg-slate-800 shadow-2xl shadow-slate-900/20 transition-all active:scale-95">حفظ ملاحظة المتابعة</button>
        </div>
      </div>
      <div className="space-y-6 pr-6 border-r-4 border-slate-100">
        {notes.length === 0 && (
          <div className="text-center text-slate-200 py-24 font-black border-8 border-dashed rounded-[4rem] text-xl uppercase tracking-[0.3em]">
            No Clinical Notes Found
          </div>
        )}
        {notes.map(note => (
          <div key={note.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm flex flex-col gap-5 group hover:border-blue-200 transition-all relative">
             <div className="flex items-center gap-5">
               <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-600/20">MD</div>
               <div>
                 <div className="text-base font-black text-slate-800">{note.doctor_name}</div>
                 <div className="text-[10px] text-slate-300 font-black uppercase tracking-widest mt-1 leading-none">{new Date(note.created_at).toLocaleString('ar-EG')}</div>
               </div>
             </div>
             <p className="text-slate-600 text-sm leading-relaxed pr-8 border-r-4 border-blue-50 py-2 font-medium">{note.note_text}</p>
          </div>
        ))}
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
    <div className={`p-10 rounded-[3rem] border shadow-sm flex flex-col items-center transition-all hover:shadow-2xl hover:-translate-y-3 duration-500 ${styles[color]}`}>
      <div className="mb-5 p-5 bg-white/70 rounded-[1.5rem] shadow-inner">{icon}</div>
      <div className="text-5xl font-black tracking-tighter mb-2 leading-none">{value}</div>
      <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-2 leading-none">{unit}</div>
      <div className="text-[11px] font-black text-slate-900/30 uppercase tracking-[0.2em] leading-none">{label}</div>
    </div>
  );
}

function TabButton({ label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`py-8 px-2 border-b-4 font-black text-xs transition-all tracking-[0.25em] uppercase leading-none ${
        active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-300 hover:text-slate-500'
      }`}
    >
      {label}
    </button>
  );
}
