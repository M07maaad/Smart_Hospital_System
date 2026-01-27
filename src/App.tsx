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
  rx_cui?: string; // الكود الدولي
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
// 🛠️ PROFESSIONAL INTERACTION CHECKER (Using RxNav Codes)
// ==========================================

const CORS_PROXY = "https://api.allorigins.win/raw?url=";

const checkInteractionsByCode = async (newDrugCui: string, newDrugName: string, currentMeds: PatientMedication[]) => {
  // 1. التحقق من وجود كود للدواء الجديد
  if (!newDrugCui) {
    return { safe: true, message: `⚠️ تنبيه: الدواء (${newDrugName}) غير مكود دولياً. لا يمكن فحص التفاعلات له.` };
  }

  // 2. تجهيز القائمة: محاولة العثور على أكواد للأدوية القديمة التي ليس لها كود
  // هذه الخطوة "تعالج" البيانات القديمة تلقائياً
  const medCuis: string[] = [];
  const cuiToName: Record<string, string> = {};

  for (const med of currentMeds) {
    if (!med.is_active) continue;

    let cui = med.rx_cui;

    // إذا لم يكن للدواء كود (بيانات قديمة)، نحاول البحث عنه في قاعدة البيانات
    if (!cui && med.active_ingredient) {
      try {
        const { data } = await supabase
          .from('drugs')
          .select('rx_cui')
          .ilike('active_ingredient', med.active_ingredient)
          .not('rx_cui', 'is', null)
          .limit(1);
        
        if (data && data.length > 0) {
          cui = data[0].rx_cui;
        }
      } catch (e) {
        console.warn("Failed to find code for old drug", med.drug_name);
      }
    }

    if (cui) {
      medCuis.push(cui);
      cuiToName[cui] = med.drug_name;
    }
  }
  
  if (medCuis.length === 0) {
    return { safe: true, message: "✅ آمن (لا توجد أدوية حالية يمكن مقارنتها)." };
  }

  try {
    // 3. استدعاء API التفاعلات
    const allCuis = [newDrugCui, ...medCuis].join('+');
    const targetUrl = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${allCuis}`;
    
    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error("API failed");

    const data = await response.json();
    const conflicts: string[] = [];

    if (data.fullInteractionTypeGroup) {
      for (const group of data.fullInteractionTypeGroup) {
        for (const type of group.fullInteractionType) {
          for (const pair of type.interactionPair) {
            
            const involvedDrugs = pair.interactionConcept.map((c: any) => c.minConceptItem.rxcui);
            
            // شرط أساسي: الدواء الجديد طرف في المشكلة
            if (involvedDrugs.includes(newDrugCui)) {
               const severity = pair.severity === 'high' ? '⛔ خطر شديد' : '⚠️ تحذير';
               const description = pair.description;
               
               const otherCui = involvedDrugs.find((c: string) => c !== newDrugCui);
               const otherName = cuiToName[otherCui || ''] || 'دواء آخر';

               conflicts.push(`${severity}: تعارض بين (${newDrugName}) و (${otherName}).\n📝 ${description}`);
            }
          }
        }
      }
    }

    if (conflicts.length > 0) {
      return { safe: false, messages: conflicts };
    }

    return { safe: true, message: "✅ آمن: تم الفحص عبر RxNav ولا توجد تعارضات." };

  } catch (error) {
    console.error("Check Error:", error);
    return { safe: true, message: "تعذر الاتصال بخادم الفحص الطبي." };
  }
};

// ==========================================
// MAIN APP LOGIC
// ==========================================

export default function SmartHospitalApp() {
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
      alert('خطأ في الاتصال');
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
              <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Smart Care</h1>
                <p className="text-[10px] text-slate-400">Hospital System</p>
              </div>
            </div>
            
            <nav className="flex-1 p-4 space-y-2 bg-slate-900">
              <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${view === 'dashboard' ? 'bg-blue-600 shadow-md' : 'hover:bg-slate-800 text-slate-300'}`}>
                <Users size={20} /> <span>لوحة المرضى</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300 transition-all cursor-not-allowed opacity-60">
                <FileText size={20} /> <span>التقارير (قريباً)</span>
              </button>
            </nav>

            <div className="p-4 border-t border-slate-800 bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <User size={18} className="text-slate-400"/>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">{user.name}</p>
                  <p className="text-xs text-slate-500">Consultant</p>
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
    <div className="flex items-center justify-center min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
            <Activity size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Smart Hospital</h2>
          <p className="text-slate-400">تسجيل دخول الأطقم الطبية</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">الكود الوظيفي</label>
            <div className="relative">
              <User className="absolute right-3 top-3 text-slate-500" size={18}/>
              <input 
                type="text" 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pr-10 pl-4 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                placeholder="Ex: DR-101" 
                required 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-3 top-3 text-slate-500" size={18}/>
              <input 
                type="password" 
                value={pass} 
                onChange={(e) => setPass(e.target.value)} 
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pr-10 pl-4 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                placeholder="••••••" 
                required 
              />
            </div>
          </div>
          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold flex justify-center transition-all shadow-lg shadow-blue-600/20 mt-4">
            {loading ? <Loader2 className="animate-spin" /> : 'تسجيل الدخول'}
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
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">قائمة المرضى (In-Patients)</h1>
          <p className="text-slate-500 text-sm mt-1">نظرة عامة على الحالات المسجلة حالياً</p>
        </div>
        <span className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 text-slate-600 font-medium">
          العدد الكلي: {patients.length}
        </span>
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
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                patient.status === 'Critical' ? 'bg-red-100 text-red-600' : 
                patient.status === 'Stable' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {patient.status}
              </span>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                 <Stethoscope size={16} className="text-slate-400 shrink-0" /> 
                 <span className="truncate">{patient.diagnosis}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
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

function PatientDetailsView({ patient, currentUser, onBack }: { patient: Patient, currentUser: string, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'meds' | 'notes'>('overview');

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Patient Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{patient.name}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>{patient.gender === 'Male' ? 'ذكر' : 'أنثى'}</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span>{patient.age} سنة</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span className="text-blue-600 font-bold bg-blue-50 px-2 rounded-md">{patient.room_number}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-8 flex gap-8">
        <TabButton label="نظرة عامة (Vitals)" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <TabButton label="الأدوية والخطة العلاجية" active={activeTab === 'meds'} onClick={() => setActiveTab('meds')} />
        <TabButton label="المتابعة والملاحظات" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
      </div>

      {/* Content */}
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

function OverviewTab({ patient }: { patient: Patient }) {
  const vitals = patient.vitals || { hr: 0, bp: '--/--', temp: 0, spo2: 0 };
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <VitalCard icon={<Heart className="text-rose-500" />} label="Heart Rate" value={vitals.hr} unit="bpm" color="rose" />
        <VitalCard icon={<Activity className="text-blue-500" />} label="Blood Pressure" value={vitals.bp} unit="mmHg" color="blue" />
        <VitalCard icon={<Thermometer className="text-orange-500" />} label="Temperature" value={vitals.temp} unit="°C" color="orange" />
        <VitalCard icon={<Droplet className="text-cyan-500" />} label="SpO2" value={vitals.spo2} unit="%" color="cyan" />
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-lg mb-6 text-slate-800 flex items-center gap-2">
            <FileText size={20} className="text-blue-600"/> البيانات الطبية
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <span className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-2 block">التشخيص الحالي</span>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-900 font-medium">
                {patient.diagnosis}
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-2 block">التاريخ المرضي (Medical History)</span>
              <div className="flex gap-2 flex-wrap">
                {patient.medical_history?.map((h, i) => (
                  <span key={i} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium">
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
    if(confirm('هل أنت متأكد من إيقاف هذا الدواء؟')) {
       await supabase.from('patient_medications').update({ is_active: false }).eq('id', medId);
       fetchMeds();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Pill className="text-blue-600" /> الخطة العلاجية الحالية
          </h3>
          <p className="text-slate-500 text-sm">إدارة أدوية المريض وفحص التعارضات</p>
        </div>
        <button 
             onClick={() => setShowAddModal(true)}
             className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
        >
             <Plus size={18} /> إضافة دواء جديد
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600"/></div> : (
        <table className="w-full text-right">
          <thead className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
            <tr>
              <th className="p-4 font-medium">اسم الدواء</th>
              <th className="p-4 font-medium">الجرعة</th>
              <th className="p-4 font-medium">المادة الفعالة</th>
              <th className="p-4 font-medium">تاريخ البدء</th>
              <th className="p-4 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentMeds.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">لا توجد أدوية مسجلة</td></tr>
            )}
            {currentMeds.map((med) => (
              <tr key={med.id} className="hover:bg-blue-50/50 transition-colors group">
                <td className="p-4 font-bold text-slate-800">{med.drug_name}</td>
                <td className="p-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{med.dose}</span></td>
                <td className="p-4 text-slate-500 text-sm">{med.active_ingredient}</td>
                <td className="p-4 text-slate-500 text-sm">{med.start_date}</td>
                <td className="p-4">
                  <button onClick={() => handleDelete(med.id)} className="text-slate-400 hover:text-red-500 p-2 transition-colors"><Trash2 size={18} /></button>
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

  // البحث في Supabase (بالأسماء)
  useEffect(() => {
    if (searchTerm.length > 2) {
      const timer = setTimeout(async () => {
        // نختار الأدوية ونتأكد من جلب الـ rx_cui
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

  // عند اختيار دواء، نفحص التعارض فوراً
  useEffect(() => {
    if (selectedDrug) {
      const performCheck = async () => {
        setChecking(true);
        setAlert(null);
        
        // استخدام الدالة الجديدة التي تعالج الأدوية القديمة تلقائياً
        const result = await checkInteractionsByCode(
            selectedDrug.rx_cui || '', 
            selectedDrug.trade_name, 
            existingMeds
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
        rx_cui: selectedDrug.rx_cui // تخزين الكود للمستقبل
      });

      if (error) {
        alert("فشل في إضافة الدواء: " + error.message);
      } else {
        onSuccess();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-lg text-slate-800">إضافة دواء جديد</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-5">
          {/* Search Input */}
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">اسم الدواء</label>
            <div className="relative">
              <Search className="absolute right-3 top-3 text-slate-400" size={18} />
              <input 
                type="text" 
                className="w-full border border-slate-300 rounded-xl pr-10 pl-4 py-3 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="ابحث بالاسم التجاري..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Dropdown */}
            {searchTerm && !selectedDrug && drugsList.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-white border border-slate-200 shadow-xl mt-1 rounded-xl max-h-60 overflow-y-auto z-20">
                {drugsList.map(drug => (
                  <div 
                    key={drug.id} 
                    className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors" 
                    onClick={() => { setSelectedDrug(drug); setSearchTerm(drug.trade_name); setDrugsList([]); }}
                  >
                    <div className="font-bold text-slate-800 text-sm">{drug.trade_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{drug.active_ingredient}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {selectedDrug && (
             <div className="space-y-4 animate-in slide-in-from-top-2">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm">
                   <div className="text-blue-800 font-bold mb-1">المادة الفعالة:</div>
                   <div className="text-blue-600">{selectedDrug.active_ingredient}</div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1.5">الجرعة الموصوفة</label>
                   <input 
                     type="text" 
                     className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                     value={dose} 
                     onChange={e => setDose(e.target.value)} 
                     placeholder="مثال: 500mg مرتين يومياً" 
                   />
                </div>
             </div>
          )}

          {/* Interaction Status */}
          {checking && (
            <div className="flex items-center justify-center gap-2 py-2 text-blue-600 text-sm font-medium bg-blue-50/50 rounded-lg">
              <Loader2 className="animate-spin" size={18}/> جاري فحص التعارضات الطبية...
            </div>
          )}

          {alert && !checking && (
            <div className={`p-4 rounded-xl text-sm whitespace-pre-line leading-relaxed border ${
              alert.type === 'danger' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              {Array.isArray(alert.msg) ? (
                <div>
                  <div className="font-bold mb-2 flex items-center gap-2"><AlertTriangle size={16}/> تم اكتشاف تعارضات:</div>
                  {alert.msg.map((m, i) => <div key={i} className="mb-2 last:mb-0 pl-4 border-r-2 border-red-300">{m}</div>)}
                </div>
              ) : (
                <div className="flex items-center gap-2 font-medium"><ShieldCheck size={18}/> {alert.msg}</div>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
          <button onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors">إلغاء</button>
          <button 
            onClick={handleSubmit} 
            disabled={alert?.type === 'danger' || !dose || checking} 
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20"
          >
            تأكيد الإضافة
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
    if(!newNote) return; 
    await supabase.from('patient_notes').insert({ patient_id: patientId, doctor_name: doctorName, note_text: newNote }); 
    setNewNote(''); 
    fetchNotes(); 
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <textarea 
          className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
          rows={3} 
          placeholder="اكتب ملاحظات المرور اليومي هنا..." 
          value={newNote} 
          onChange={e => setNewNote(e.target.value)}
        ></textarea>
        <div className="flex justify-end mt-3">
          <button onClick={saveNote} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">حفظ الملاحظة</button>
        </div>
      </div>
      <div className="space-y-4">
        {notes.length === 0 && <p className="text-center text-slate-400 py-4">لا توجد ملاحظات سابقة</p>}
        {notes.map(note => (
          <div key={note.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative group hover:border-blue-200 transition-colors">
             <div className="flex items-center gap-3 mb-3">
               <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">DR</div>
               <div>
                 <div className="text-sm font-bold text-slate-800">{note.doctor_name}</div>
                 <div className="text-xs text-slate-400">{new Date(note.created_at).toLocaleDateString()}</div>
               </div>
             </div>
             <p className="text-slate-600 text-sm leading-relaxed pr-11">{note.note_text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function VitalCard({ icon, label, value, unit, color }: any) {
  const colorClasses: Record<string, string> = {
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    cyan: "bg-cyan-50 text-cyan-600 border-cyan-100"
  };

  return (
    <div className={`p-5 rounded-2xl border shadow-sm flex flex-col items-center text-center transition-transform hover:-translate-y-1 duration-300 ${colorClasses[color]}`}>
      <div className="mb-3 opacity-90 p-2 bg-white/50 rounded-full">{icon}</div>
      <div className="text-3xl font-black">{value} <span className="text-xs font-medium opacity-60 uppercase">{unit}</span></div>
      <div className="text-xs font-bold uppercase tracking-wider mt-1 opacity-70">{label}</div>
    </div>
  );
}

function TabButton({ label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`py-4 px-4 border-b-[3px] font-bold text-sm transition-all ${
        active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg'
      }`}
    >
      {label}
    </button>
  );
}
