import React, { useState } from 'react';
import { Droplet, Plus, ArrowDown, ArrowUp } from 'lucide-react';

interface FluidBalanceTabProps {
  patientId: string;
  darkMode: boolean;
}

export function FluidBalanceTab({ patientId, darkMode }: FluidBalanceTabProps) {
  // Mock data for now
  const [entries, setEntries] = useState([
    { id: 1, type: 'intake', item: 'IV Normal Saline', amount: 500, time: '08:00' },
    { id: 2, type: 'output', item: 'Urine', amount: 350, time: '09:30' },
    { id: 3, type: 'intake', item: 'Oral Water', amount: 200, time: '10:00' },
  ]);

  const totalIntake = entries.filter(e => e.type === 'intake').reduce((acc, curr) => acc + curr.amount, 0);
  const totalOutput = entries.filter(e => e.type === 'output').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIntake - totalOutput;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center">
        <div>
           <h3 className={`font-bold text-lg flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
             <Droplet className="text-cyan-500" /> Fluid Balance Sheet (24h)
           </h3>
           <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Monitor Intake and Output</p>
        </div>
        <button className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-cyan-600/20">
           <Plus size={16}/> Add Entry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Summary Cards */}
         <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-green-50 border-green-100'}`}>
            <span className={`text-xs font-bold uppercase ${darkMode ? 'text-green-400' : 'text-green-600'}`}>Total Intake</span>
            <div className={`text-2xl font-black mt-1 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>{totalIntake} ml</div>
         </div>
         <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-amber-50 border-amber-100'}`}>
            <span className={`text-xs font-bold uppercase ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>Total Output</span>
            <div className={`text-2xl font-black mt-1 ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>{totalOutput} ml</div>
         </div>
         <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-100'}`}>
            <span className={`text-xs font-bold uppercase ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Net Balance</span>
            <div className={`text-2xl font-black mt-1 ${balance > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {balance > 0 ? '+' : ''}{balance} ml
            </div>
         </div>
      </div>

      <div className={`rounded-2xl shadow-sm border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
         <table className="w-full text-right text-sm">
            <thead className={`border-b ${darkMode ? 'bg-slate-900/50 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
               <tr>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Item</th>
                  <th className="p-4 font-medium">Amount (ml)</th>
                  <th className="p-4 font-medium">Time</th>
               </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
               {entries.map(e => (
                  <tr key={e.id} className={darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}>
                     <td className="p-4">
                        {e.type === 'intake'
                           ? <span className="flex items-center gap-1 text-green-600 font-bold"><ArrowDown size={14}/> Intake</span>
                           : <span className="flex items-center gap-1 text-amber-600 font-bold"><ArrowUp size={14}/> Output</span>
                        }
                     </td>
                     <td className={`p-4 font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{e.item}</td>
                     <td className={`p-4 font-mono ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{e.amount}</td>
                     <td className={`p-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{e.time}</td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
    </div>
  );
}
