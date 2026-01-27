import React, { useState, useEffect } from 'react';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { 
  User, Lock, Activity, Users, Pill, 
  AlertTriangle, Plus, Trash2, Search, 
  Stethoscope, Thermometer, Heart, Droplet, 
  ChevronRight, ArrowLeft, X, Loader2, ShieldCheck, FileText
} from 'lucide-react';

// --- Supabase Configuration ---
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
// 🛠️ CLINICAL LOGIC & INTERACTION CHECKER
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
    return { safe: true, message: "✅ آمن: لا توجد أدوية حالية للمقارنة." };
  }

  try {
    setStatus("جاري تحليل التداخلات...");
    const allCuisString = [safeNewCui, ...medCuis].join('+');
    
    // محاولة الاتصال بالخادم المحلي
    const response = await fetch(`/api/interaction-checker?rxcuis=${encodeURIComponent(allCuisString)}`);
    
    // إذا كان الخطأ 404، فهذا يعني أن ملف الـ API غير موجود في مكانه الصحيح على Vercel
    if (response.status === 404) {
      throw new Error("مسار الـ API غير موجود (404). تأكد من رفع مجلد api إلى GitHub.");
    }

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
               const otherCui = involvedDrugs.find((c: string) => c !== safeNewCui);
               const otherName = cuiToName[otherCui || ''] || 'دواء آخر';
               conflicts.push(`${severity}: بين (${newDrugName}) و (${otherName}).\n📝 ${pair.description}`);
            }
          }
        }
      }
    }

    return conflicts.length > 0 
      ? { safe: false, messages: conflicts } 
      : { safe: true, message: "✅ لا توجد تداخلات دوائية خطيرة مكتشفة." };

  } catch (error: any) {
    return { safe: true, message: `⚠️ ${error.message}` };
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans" dir="rtl">
      {view === 'login' && <LoginView onLogin={handleLogin} />}
      
      {view !== 'login' && user && (
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20">
            <div className="p-5 border-b border-slate-800 flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Activity size={22} />
              </div>
              <span className="font-bold text-lg tracking-tight">Smart Hospital</span>
            </div>
            
            <nav className="flex-1 p-4 space-y-1">
              <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
                <Users size={20} /> <span className="text-sm font-semibold">قائمة المرضى</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 cursor-not-allowed">
                <FileText size={20} /> <span className="text-sm font-semibold">التقارير</span>
              </button>
            </nav>

            <div className="p-4 border-t border-slate-800">
              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs border border-blue-500/30">
                  {user.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-200 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500">طبيب استشاري</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto relative">
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

// --- Views ---

function LoginView({ onLogin }: { onLogin: (code: string, pass: string) => void }) {
  const [code, setCode] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onLogin(code, pass);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
            <Activity className="text-white" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">تسجيل الدخول</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">نظام إدارة العناية المركزة</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 pr-1 uppercase tracking-wider">كود الموظف</label>
            <input 
              type="text" 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-sm" 
              placeholder="DR-101" 
              required 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 pr-1 uppercase tracking-wider">كلمة المرور</label>
            <input 
              type="password" 
              value={pass} 
              onChange={(e) => setPass(e.target.value)} 
              className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-sm" 
              placeholder="••••••" 
              required 
            />
          </div>
          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center">
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'دخول النظام'}
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
    supabase.from('patients').select('*').then(({ data }) => {
      if (data) setPatients(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">المرضى الحاليين</h1>
          <p className="text-slate-500 text-xs mt-1 font-semibold uppercase tracking-widest">In-Patient Management</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-xs font-bold border border-blue-100">
          {patients.length} حالة مسجلة
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {patients.map(p => (
          <div key={p.id} onClick={() => onSelectPatient(p)} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-xl hover:border-blue-400 transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${p.gender === 'Male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                  {p.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-sm">{p.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{p.room_number} • {p.age} سنة</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                p.status === 'Critical' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'
              }`}>
                {p.status}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg text-[11px] text-slate-600 font-medium flex items-center gap-2 mb-4 border border-slate-100">
              <Stethoscope size={14} className="text-blue-400" />
              <span className="truncate">{p.diagnosis}</span>
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold">
              <span>{p.admission_date}</span>
              <span className="text-blue-600 flex items-center gap-1 group-hover:translate-x-[-2px] transition-transform">
                فتح الملف <ChevronRight size={14} className="rotate-180" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PatientDetailsView({ patient, currentUser, onBack }: any) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center gap-6 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-tight">{patient.name}</h1>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            <span>{patient.gender === 'Male' ? 'ذكر' : 'أنثى'}</span>
            <span>•</span>
            <span>{patient.age} سنة</span>
            <span className="text-blue-600 bg-blue-50 px-2 rounded-md border border-blue-100">غرفة {patient.room_number}</span>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200 px-8 flex gap-8">
        <TabButton label="المؤشرات الحيوية" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <TabButton label="الأدوية" active={activeTab === 'meds'} onClick={() => setActiveTab('meds')} />
        <TabButton label="ملاحظات المتابعة" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'overview' && <OverviewTab patient={patient} />}
          {activeTab === 'meds' && <MedicationsTab patient={patient} />}
          {activeTab === 'notes' && <NotesTab patientId={patient.id} doctorName={currentUser} />}
        </div>
      </div>
    </div>
  );
}

// --- Sub-components (UI) ---

function OverviewTab({ patient }: any) {
  const v = patient.vitals || { hr: 0, bp: '--/--', temp: 0, spo2: 0 };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <VitalCard icon={<Heart className="text-rose-500" />} label="Heart Rate" value={v.hr} unit="bpm" color="rose" />
        <VitalCard icon={<Activity className="text-blue-500" />} label="BP" value={v.bp} unit="mmHg" color="blue" />
        <VitalCard icon={<Thermometer className="text-orange-500" />} label="Temp" value={v.temp} unit="°C" color="orange" />
        <VitalCard icon={<Droplet className="text-cyan-500" />} label="SpO2" value={v.spo2} unit="%" color="cyan" />
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
          <FileText size={18} className="text-blue-500" /> التشخيص والتاريخ المرضي
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">التشخيص الحالي</span>
            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl text-blue-900 text-sm font-bold">{patient.diagnosis}</div>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">الأمراض السابقة</span>
            <div className="flex flex-wrap gap-2">
              {patient.medical_history?.map((h: string, i: number) => (
                <span key={i} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold">{h}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MedicationsTab({ patient }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [meds, setMeds] = useState<PatientMedication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeds = async () => {
    setLoading(true);
    const { data } = await supabase.from('patient_medications').select('*').eq('patient_id', patient.id).eq('is_active', true);
    if (data) setMeds(data);
    setLoading(false);
  };

  useEffect(() => { fetchMeds(); }, [patient.id]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Pill size={18} className="text-blue-500" /> الأدوية النشطة</h3>
          <p className="text-[10px] text-slate-400 font-bold mt-1">يتم فحص التفاعلات دوائياً بشكل تلقائي</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2">
          <Plus size={16} /> إضافة دواء
        </button>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 text-slate-400 border-b border-slate-200 uppercase font-black text-[9px]">
            <tr>
              <th className="p-4">الدواء</th>
              <th className="p-4">الجرعة</th>
              <th className="p-4">المادة الفعالة</th>
              <th className="p-4">البدء</th>
              <th className="p-4 text-center">حذف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={5} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr> : 
             meds.length === 0 ? <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-bold">لا يوجد أدوية نشطة حالياً</td></tr> :
             meds.map(m => (
               <tr key={m.id} className="hover:bg-slate-50 transition-colors font-semibold text-slate-700">
                 <td className="p-4 font-bold text-slate-800">{m.drug_name}</td>
                 <td className="p-4"><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100">{m.dose}</span></td>
                 <td className="p-4 text-slate-500">{m.active_ingredient}</td>
                 <td className="p-4 text-slate-400">{m.start_date}</td>
                 <td className="p-4 text-center"><button onClick={() => {}} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button></td>
               </tr>
             ))
            }
          </tbody>
        </table>
      </div>
      {showAdd && <AddMedicationModal patientId={patient.id} existingMeds={meds} onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); fetchMeds(); }} />}
    </div>
  );
}

function AddMedicationModal({ patientId, existingMeds, onClose, onSuccess }: any) {
  const [term, setTerm] = useState('');
  const [list, setList] = useState<Drug[]>([]);
  const [selected, setSelected] = useState<Drug | null>(null);
  const [dose, setDose] = useState('');
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState('');
  const [alert, setAlert] = useState<{type: string, msg: string | string[]} | null>(null);

  useEffect(() => {
    if (term.length > 2) {
      const timer = setTimeout(() => {
        supabase.from('drugs').select('*').ilike('trade_name', `%${term}%`).limit(6).then(({data}) => {
          if (data) setList(data);
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [term]);

  useEffect(() => {
    if (selected) {
      setChecking(true);
      setAlert(null);
      checkInteractionsByCode(selected.rx_cui || '', selected.trade_name, existingMeds, setStatus).then(res => {
        setAlert(res.safe ? {type: 'success', msg: res.message} : {type: 'danger', msg: res.messages || 'تداخل'});
        setChecking(false);
      });
    }
  }, [selected, existingMeds]);

  const handleSave = async () => {
    if (!selected || !dose) return;
    const { error } = await supabase.from('patient_medications').insert({
      patient_id: patientId, drug_name: selected.trade_name, active_ingredient: selected.active_ingredient,
      dose, start_date: new Date().toISOString().split('T')[0], is_active: true, rx_cui: selected.rx_cui
    });
    if (!error) onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-base">إضافة دواء جديد</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5 text-right">
          <div className="relative">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">اسم الدواء</label>
            <div className="relative">
              <Search className="absolute right-3 top-3.5 text-slate-300" size={16} />
              <input type="text" className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-semibold text-sm" placeholder="ابحث..." value={term} onChange={e => setTerm(e.target.value)} />
            </div>
            {term && !selected && list.length > 0 && (
              <div className="absolute top-full right-0 w-full bg-white border border-slate-100 shadow-xl mt-1 rounded-xl overflow-hidden z-20">
                {list.map(d => (
                  <div key={d.id} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0" onClick={() => { setSelected(d); setTerm(d.trade_name); setList([]); }}>
                    <div className="font-bold text-slate-800 text-xs">{d.trade_name}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-none">{d.active_ingredient}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selected && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-[10px] font-bold text-blue-700 leading-relaxed uppercase">{selected.active_ingredient}</div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">الجرعة</label>
                <input type="text" className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-sm" placeholder="مثال: 500mg IV TDS" value={dose} onChange={e => setDose(e.target.value)} />
              </div>
            </div>
          )}
          {checking && (
            <div className="p-4 bg-blue-50/50 rounded-xl flex flex-col items-center gap-2 border border-blue-100/50">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600"><Loader2 className="animate-spin" size={16} /> جاري فحص التعارضات...</div>
              <div className="text-[9px] text-blue-300 font-black uppercase tracking-widest">{status}</div>
            </div>
          )}
          {alert && !checking && (
            <div className={`p-4 rounded-xl text-[10px] leading-relaxed border ${alert.type === 'danger' ? 'bg-red-50 text-red-900 border-red-100' : 'bg-green-50 text-green-900 border-green-100'}`}>
              {Array.isArray(alert.msg) ? (
                <div className="space-y-3">
                  <div className="font-black flex items-center gap-2 text-red-600 text-xs"><AlertTriangle size={16} /> تداخل دوائي خطير!</div>
                  {alert.msg.map((m, i) => <div key={i} className="bg-white/60 p-3 rounded-lg border-r-4 border-red-500 font-bold shadow-sm">{m}</div>)}
                </div>
              ) : <div className="flex items-center gap-2 font-bold"><ShieldCheck size={16} className="text-green-600" /> {alert.msg}</div>}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
          <button onClick={onClose} className="px-5 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">إلغاء</button>
          <button onClick={handleSave} disabled={alert?.type === 'danger' || !dose || checking} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 shadow-lg shadow-blue-600/20 transition-all active:scale-95">تأكيد الإضافة</button>
        </div>
      </div>
    </div>
  );
}

function NotesTab({ patientId, doctorName }: any) {
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
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <textarea className="w-full border border-slate-200 bg-slate-50/30 rounded-xl p-4 text-xs outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold min-h-[120px] resize-none" placeholder="أدخل ملاحظات المرور اليومي هنا..." value={newNote} onChange={e => setNewNote(e.target.value)}></textarea>
        <div className="flex justify-end"><button onClick={saveNote} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-xs hover:bg-slate-800 transition-all active:scale-95">حفظ الملاحظة</button></div>
      </div>
      <div className="space-y-4 pr-2">
        {notes.length === 0 ? <p className="text-center text-slate-300 py-10 font-bold border-2 border-dashed rounded-xl text-xs uppercase tracking-widest">لا يوجد ملاحظات سابقة</p> :
         notes.map(n => (
          <div key={n.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 group hover:border-blue-200 transition-all">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-[10px]">MD</div>
               <div>
                 <div className="text-xs font-bold text-slate-800 leading-none">{n.doctor_name}</div>
                 <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{new Date(n.created_at).toLocaleString('ar-EG')}</div>
               </div>
             </div>
             <p className="text-slate-600 text-xs leading-relaxed pr-6 border-r-2 border-blue-100 py-1 font-medium">{n.note_text}</p>
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
    <div className={`p-6 rounded-2xl border shadow-sm flex flex-col items-center transition-all hover:shadow-lg hover:-translate-y-1 duration-300 ${styles[color]}`}>
      <div className="mb-3 p-3 bg-white/60 rounded-xl shadow-inner">{icon}</div>
      <div className="text-3xl font-black mb-1 leading-none tracking-tight">{value}</div>
      <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-2 leading-none">{unit}</div>
      <div className="text-[10px] font-bold text-slate-900/30 uppercase tracking-widest leading-none">{label}</div>
    </div>
  );
}

function TabButton({ label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`py-5 px-1 border-b-2 font-black text-[10px] transition-all tracking-widest uppercase leading-none ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
      {label}
    </button>
  );
}
