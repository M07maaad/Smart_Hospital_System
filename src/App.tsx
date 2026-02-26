import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { PatientDetailsView } from './components/PatientDetailsView';
import { PharmacyView } from './components/PharmacyView';
import { DischargeView } from './components/DischargeView';
import { Sidebar } from './components/Sidebar';
import { Patient } from './types';

export default function SmartHospitalApp() {
  const [view, setView] = useState<'login' | 'dashboard' | 'patient' | 'pharmacy' | 'discharge'>('login');
  const [user, setUser] = useState<{ id: string, name: string } | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true';
  });

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

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
    <div className={`min-h-screen font-sans transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`} dir="rtl">
      {view === 'login' && <LoginView onLogin={handleLogin} />}
      
      {view !== 'login' && user && (
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <Sidebar
            user={user}
            view={view === 'patient' ? 'dashboard' : view}
            setView={setView}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
          />

          {/* Main Content */}
          <main className={`flex-1 overflow-auto relative ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            {view === 'dashboard' && (
              <DashboardView
                onSelectPatient={(p) => { setSelectedPatient(p); setView('patient'); }}
                darkMode={darkMode}
              />
            )}
            
            {view === 'patient' && selectedPatient && (
              <PatientDetailsView 
                patient={selectedPatient} 
                currentUser={user.name}
                onBack={() => setView('dashboard')}
                darkMode={darkMode}
              />
            )}

            {view === 'pharmacy' && <PharmacyView darkMode={darkMode} />}
            {view === 'discharge' && <DischargeView darkMode={darkMode} />}
          </main>
        </div>
      )}
    </div>
  );
}
