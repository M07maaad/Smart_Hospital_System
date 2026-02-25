import React from 'react';
import { Activity, Users, FileText, User, Moon, Sun } from 'lucide-react';

interface SidebarProps {
  user: { id: string; name: string };
  view: 'dashboard' | 'patient';
  setView: (view: 'dashboard' | 'patient') => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export function Sidebar({ user, view, setView, darkMode, toggleDarkMode }: SidebarProps) {
  return (
    <aside className={`w-64 ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 border-l border-slate-200'} hidden md:flex flex-col shadow-xl z-20 transition-colors duration-300`}>
      <div className={`p-6 border-b ${darkMode ? 'border-slate-700 bg-slate-950' : 'border-slate-100 bg-slate-50'} flex items-center gap-3`}>
        <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg">Smart Care</h1>
          <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Hospital System</p>
        </div>
      </div>

      <nav className={`flex-1 p-4 space-y-2 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
        <button
          onClick={() => setView('dashboard')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
            view === 'dashboard'
              ? 'bg-blue-600 text-white shadow-md'
              : `hover:${darkMode ? 'bg-slate-800' : 'bg-slate-100'} ${darkMode ? 'text-slate-300' : 'text-slate-600'}`
          }`}
        >
          <Users size={20} /> <span>لوحة المرضى</span>
        </button>
        <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-not-allowed opacity-60 ${darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}>
          <FileText size={20} /> <span>التقارير (قريباً)</span>
        </button>
      </nav>

      <div className={`p-4 border-t ${darkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'}`}>
        <div className="flex items-center justify-between mb-4">
            <span className={`text-xs font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>THEME</span>
            <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
            >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
        </div>

        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <User size={18} className={darkMode ? 'text-slate-400' : 'text-slate-500'}/>
          </div>
          <div>
            <p className={`text-sm font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{user.name}</p>
            <p className="text-xs text-slate-500">Consultant</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
