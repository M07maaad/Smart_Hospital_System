import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { 
  User, Lock, Activity, Users, Pill, 
  AlertTriangle, Plus, Trash2, Search, 
  Stethoscope, Thermometer, Heart, Droplet, 
  ChevronRight, ArrowLeft, X, Loader2
} from 'lucide-react';

// --- Types ---
interface Drug {
  id: string;
  trade_name: string;
  active_ingredient: string;
  search_key: string;
  group?: string;
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
}

interface PatientNote {
  id: string;
  created_at: string;
  doctor_name: string;
  note_text: string;
}

// ==========================================
// 🛠️ SMART INTERACTION CHECKER LOGIC
// ==========================================

// 1. قاموس تحويل الأسماء (مصر/بريطانيا -> أمريكا)
const DRUG_SYNONYMS: Record<string, string> = {
  "paracetamol": "acetaminophen",
  "salbutamol": "albuterol",
  "glibenclamide": "glyburide",
  "frusemide": "furosemide",
  "adrenaline": "epinephrine",
  "noradrenaline": "norepinephrine",
  "pethidine": "meperidine",
  "amoxycillin": "amoxicillin"
};

// 2. دالة تنظيف اسم الدواء (حذف الأملاح والشوائب)
const cleanDrugName = (rawName: string): string => {
  if (!rawName) return "";
  
  // أخذ أول مادة فعالة فقط في حالة التركيبات
  let name = rawName.toLowerCase().split('+')[0].split('/')[0].trim();

  // قائمة الزوائد الكيميائية للحذف
  const salts = [
    " sodium", " potassium", " calcium", " hcl", " hydrochloride", 
    " sulfate", " phosphate", " maleate", " tartrate", " succinate", 
    " trihydrate", " dihydrate", " monohydrate", " acetate"
  ];

  salts.forEach(salt => {
    if (name.endsWith(salt)) {
      name = name.replace(salt, "").trim();
    }
  });

  // التحقق من القاموس
  if (DRUG_SYNONYMS[name]) {
    return DRUG_SYNONYMS[name];
  }

  return name;
};

// 3. الدالة الرئيسية للفحص
const checkInteractionsLive = async (newDrugActiveIngredient: string, currentMeds: PatientMedication[]) => {
  if (!newDrugActiveIngredient || currentMeds.length === 0) return { safe: true, message: '' };
  
  const searchTerm = cleanDrugName(newDrugActiveIngredient);
  console.log(`🔍 Checking interactions for: ${newDrugActiveIngredient} -> Cleaned: ${searchTerm}`);

  try {
    // جلب البيانات من FDA
    const response = await fetch(`https://api.fda.gov/drug/label.json?search=openfda.substance_name:"${searchTerm}"&limit=1`);
    
    if (!response.ok) {
      console.warn("FDA API not found for:", searchTerm);
      return { safe: true, message: `⚠️ لم يتم العثور على بيانات عالمية للمادة (${searchTerm}). يرجى المراجعة اليدوية.` };
    }
    
    const data = await response.json();
    const result = data.results?.[0];

    if (!result) return { safe: true, message: "⚠️ لا توجد بيانات تفاعلات مسجلة." };

    // تجميع كل نصوص التحذيرات في نص واحد كبير للبحث
    const sectionsToCheck = [
      result.drug_interactions,
      result.warnings,
      result.boxed_warning,
      result.contraindications,
      result.precautions
    ];

    const fullText = sectionsToCheck.flat().join(" ").toLowerCase();

    if (fullText.length < 50) return { safe: true, message: "⚠️ بيانات التفاعلات غير كافية." };

    const conflicts: string[] = [];

    // مقارنة أدوية المريض بالنص المسترجع
    currentMeds.forEach(med => {
      const patientDrugClean = cleanDrugName(med.active_ingredient);
      
      // البحث عن اسم دواء المريض داخل تحذيرات الدواء الجديد
      // نستخدم Regex للبحث عن الكلمة كاملة لتجنب التشابه الجزئي
      const regex = new RegExp(`\\b${patientDrugClean}\\b`, 'i');
      
      if (patientDrugClean.length > 3 && regex.test(fullText)) {
        conflicts.push(`⛔ خطر: ${newDrugActiveIngredient} قد يتفاعل مع ${med.drug_name} (${med.active_ingredient})`);
      }
    });

    if (conflicts.length > 0) {
      return { safe: false, messages: conflicts };
    }

    return { safe: true, message: "✅ آمن: لم يتم العثور على تعارضات معروفة." };

  } catch (error) {
    console.error("API Error:", error);
    return { safe: true, message: "تعذر الاتصال بخادم التفاعلات." };
  }
};

// ==========================================
// END LOGIC
// ==========================================

// --- Main Component ---
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
      alert('خطأ في الاتصال - تأكد من إعدادات Supabase');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans" dir="rtl">
      {view === 'login' && <LoginView onLogin={handleLogin} />}
      
      {view !== 'login' && user && (
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col">
            <div className="p-6 border-b border-slate-700 flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Activity className="w-6 h-6" />
              </div>
              <h1 className="font-bold text-xl">Smart Care</h1>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'dashboard' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                <Users size={20} /> لوحة المرضى
              </button>
            </nav>
            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold">{user.name}</p>
                  <p className="text-xs text-slate-400">Consultant</p>
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

// --- Components ---

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
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
            <Activity size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Smart Hospital</h2>
          <p className="text-slate-500">تسجيل دخول الأطباء</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الكود</label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="DR-101" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور</label>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="••••••" required />
          </div>
          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold flex justify-center">
            {loading ? <Loader2 className="animate-spin" /> : 'دخول'}
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

  if (loading) return <div className="p-10 text-center flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800">قائمة المرضى (In-Patients)</h1>
        <span className="bg-white px-4 py-2 rounded-lg shadow-sm border">العدد: {patients.length}</span>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {patients.map(patient => (
          <div key={patient.id} onClick={() => onSelectPatient(patient)} className="bg-white rounded-xl shadow-sm border p-5 hover:border-blue-400 cursor-pointer transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">{patient.name.charAt(0)}</div>
                <div><h3 className="font-bold text-slate-800">{patient.name}</h3><p className="text-xs text-slate-500">{patient.room_number}</p></div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${patient.status === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{patient.status}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2"><Stethoscope size={16} className="text-slate-400" /> <span className="truncate">{patient.diagnosis}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PatientDetailsView({ patient, currentUser, onBack }: { patient: Patient, currentUser: string, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'meds' | 'notes'>('overview');
  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20} /></button>
          <div><h1 className="text-xl font-bold text-slate-800">{patient.name}</h1><p className="text-sm text-slate-500">{patient.age} سنة • غرفة {patient.room_number}</p></div>
        </div>
      </header>
      <div className="bg-white border-b px-8 flex gap-6">
        <TabButton label="نظرة عامة / Vitals" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <TabButton label="الأدوية والعلاج" active={activeTab === 'meds'} onClick={() => setActiveTab('meds')} />
        <TabButton label="المتابعة اليومية" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
      </div>
      <div className="flex-1 overflow-auto p-8 bg-slate-50">
        {activeTab === 'overview' && <OverviewTab patient={patient} />}
        {activeTab === 'meds' && <MedicationsTab patient={patient} />}
        {activeTab === 'notes' && <NotesTab patientId={patient.id} doctorName={currentUser} />}
      </div>
    </div>
  );
}

function OverviewTab({ patient }: { patient: Patient }) {
  const vitals = patient.vitals || { hr: 0, bp: '--/--', temp: 0, spo2: 0 };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <VitalCard icon={<Heart className="text-red-500" />} label="Heart Rate" value={vitals.hr} unit="bpm" />
        <VitalCard icon={<Activity className="text-blue-500" />} label="BP" value={vitals.bp} unit="mmHg" />
        <VitalCard icon={<Thermometer className="text-orange-500" />} label="Temp" value={vitals.temp} unit="°C" />
        <VitalCard icon={<Droplet className="text-cyan-500" />} label="SpO2" value={vitals.spo2} unit="%" />
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border"><h3 className="font-bold text-lg mb-4 text-blue-800">البيانات الطبية</h3><div className="space-y-4"><div><span className="text-slate-500">التشخيص:</span> <span className="font-medium">{patient.diagnosis}</span></div><div><span className="text-slate-500 block mb-1">التاريخ المرضي:</span><div className="flex gap-2 flex-wrap">{patient.medical_history?.map((h, i) => <span key={i} className="bg-slate-100 px-2 py-1 rounded border text-sm">{h}</span>)}</div></div></div></div>
    </div>
  );
}

function MedicationsTab({ patient }: { patient: Patient }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentMeds, setCurrentMeds] = useState<PatientMedication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeds = async () => {
    setLoading(true);
    const { data } = await supabase.from('patient_medications').select('*').eq('patient_id', patient.id).eq('is_active', true);
    if (data) setCurrentMeds(data);
    setLoading(false);
  };
  useEffect(() => { fetchMeds(); }, [patient.id]);

  const handleDelete = async (medId: string) => {
    if(confirm('إيقاف الدواء؟')) {
       await supabase.from('patient_medications').update({ is_active: false }).eq('id', medId);
       fetchMeds();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg text-slate-800">الخطة العلاجية</h3>
        <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"><Plus size={18} /> إضافة دواء</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? <div className="p-4 text-center">جاري التحميل...</div> : (
        <table className="w-full text-right">
          <thead className="bg-slate-50 text-slate-500 text-sm"><tr><th className="p-4">الدواء</th><th className="p-4">الجرعة</th><th className="p-4">المادة الفعالة</th><th className="p-4">حذف</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{currentMeds.map((med) => (<tr key={med.id} className="hover:bg-slate-50"><td className="p-4 font-bold">{med.drug_name}</td><td className="p-4 text-blue-600">{med.dose}</td><td className="p-4 text-slate-500">{med.active_ingredient}</td><td className="p-4"><button onClick={() => handleDelete(med.id)} className="text-red-500 p-2"><Trash2 size={18} /></button></td></tr>))}</tbody>
        </table>
        )}
      </div>
      {showAddModal && <AddMedicationModal patientId={patient.id} existingMeds={currentMeds} onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchMeds(); }} />}
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

  useEffect(() => {
    if (searchTerm.length > 2) {
      const timer = setTimeout(async () => {
        // استخدام ilike للبحث المرن في قاعدة البيانات
        const { data } = await supabase.from('drugs').select('*').ilike('trade_name', `%${searchTerm}%`).limit(10);
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
        const result = await checkInteractionsLive(selectedDrug.active_ingredient, existingMeds);
        setAlert({ type: result.safe ? 'success' : 'danger', msg: result.safe ? result.message : (result.messages || 'تعارض') });
        setChecking(false);
      };
      performCheck();
    }
  }, [selectedDrug, existingMeds]);

  const handleSubmit = async () => {
    if (selectedDrug && dose) {
      await supabase.from('patient_medications').insert({
        patient_id: patientId, drug_name: selectedDrug.trade_name, active_ingredient: selectedDrug.active_ingredient, dose: dose, start_date: new Date().toISOString().split('T')[0], is_active: true
      });
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4">
        <h3 className="font-bold text-lg border-b pb-2 flex justify-between">إضافة دواء <X onClick={onClose} className="cursor-pointer" /></h3>
        <div className="relative">
          <Search className="absolute right-3 top-3 text-slate-400" size={16} />
          <input type="text" className="w-full border rounded-lg pr-10 pl-4 py-2" placeholder="ابحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          {searchTerm && !selectedDrug && drugsList.length > 0 && (
            <div className="absolute top-full left-0 w-full bg-white border shadow-lg mt-1 rounded-lg max-h-40 overflow-y-auto z-10">
              {drugsList.map(drug => (<div key={drug.id} className="p-2 hover:bg-slate-50 cursor-pointer border-b" onClick={() => { setSelectedDrug(drug); setSearchTerm(drug.trade_name); setDrugsList([]); }}><div className="font-bold text-sm">{drug.trade_name}</div><div className="text-xs text-slate-500">{drug.active_ingredient}</div></div>))}
            </div>
          )}
        </div>
        {selectedDrug && <div><div className="p-3 bg-blue-50 text-blue-800 rounded text-sm mb-2"><strong>المادة الفعالة:</strong> {selectedDrug.active_ingredient}</div><input type="text" className="w-full border rounded-lg px-4 py-2" value={dose} onChange={e => setDose(e.target.value)} placeholder="الجرعة" /></div>}
        {checking && <div className="text-sm text-blue-600 flex items-center gap-2"><Loader2 className="animate-spin" size={16}/> فحص التعارضات مع FDA...</div>}
        {alert && !checking && <div className={`p-3 rounded text-sm ${alert.type === 'danger' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{Array.isArray(alert.msg) ? alert.msg.map((m, i) => <div key={i}>• {m}</div>) : alert.msg}</div>}
        <div className="flex justify-end gap-3"><button onClick={handleSubmit} disabled={alert?.type === 'danger' || !dose || checking} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">تأكيد</button></div>
      </div>
    </div>
  );
}

function NotesTab({ patientId, doctorName }: { patientId: string, doctorName: string }) {
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const fetchNotes = async () => { const { data } = await supabase.from('patient_notes').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }); if(data) setNotes(data); };
  useEffect(() => { fetchNotes(); }, [patientId]);
  const saveNote = async () => { if(!newNote) return; await supabase.from('patient_notes').insert({ patient_id: patientId, doctor_name: doctorName, note_text: newNote }); setNewNote(''); fetchNotes(); };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <textarea className="w-full border rounded-lg p-3 text-sm outline-none" rows={3} placeholder="اكتب ملاحظاتك..." value={newNote} onChange={e => setNewNote(e.target.value)}></textarea>
        <div className="flex justify-end mt-2"><button onClick={saveNote} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm">حفظ</button></div>
      </div>
      <div className="space-y-4">{notes.map(note => (<div key={note.id} className="bg-white p-4 rounded-xl border"><div className="flex items-center gap-2 mb-2 font-bold text-sm"><span className="text-blue-600">{note.doctor_name}</span><span className="text-slate-400 font-normal text-xs">{new Date(note.created_at).toLocaleDateString()}</span></div><p className="text-slate-600 text-sm">{note.note_text}</p></div>))}</div>
    </div>
  );
}

function VitalCard({ icon, label, value, unit }: any) {
  return <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col items-center text-center"><div className="mb-2 opacity-80">{icon}</div><div className="text-2xl font-bold text-slate-800">{value} <span className="text-xs text-slate-400">{unit}</span></div><div className="text-xs text-slate-500 mt-1">{label}</div></div>;
}
function TabButton({ label, active, onClick }: any) {
  return <button onClick={onClick} className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>;
}
