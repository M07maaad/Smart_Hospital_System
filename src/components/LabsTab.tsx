import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LabResult } from '../types';
import { FlaskConical, Plus, FileText, CheckCircle, AlertTriangle, Clock, X, Loader2 } from 'lucide-react';
import { addMockLab, getMockLabs } from '../utils/mockData';

interface LabsTabProps {
  patientId: string;
  currentUser: string;
  darkMode: boolean;
}

export function LabsTab({ patientId, currentUser, darkMode }: LabsTabProps) {
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLabs = React.useCallback(async () => {
    setLoading(true);
    let labsData: LabResult[] = [];
    try {
        const { data, error } = await supabase
        .from('patient_labs')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

        if (!error && data) {
           labsData = data as any;
        }
    } catch(e) { console.warn(e); }

    // Merge Mock
    const mock = getMockLabs(patientId);
    setLabs([...labsData, ...mock]);
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchLabs();
  }, [fetchLabs]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h3 className={`font-bold text-lg flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            <FlaskConical className="text-purple-600" /> Lab Results & Reports
          </h3>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>View and manage patient laboratory tests</p>
        </div>
        <button
             onClick={() => setShowAddModal(true)}
             className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all active:scale-95"
        >
             <Plus size={18} /> New Lab Order
        </button>
      </div>

      <div className={`rounded-2xl shadow-sm border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        {loading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-purple-600"/></div> : (
        <table className="w-full text-right">
          <thead className={`text-sm border-b ${darkMode ? 'bg-slate-900/50 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
            <tr>
              <th className="p-4 font-medium">Test Name</th>
              <th className="p-4 font-medium">Result</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">Requested By</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
            {labs.length === 0 && (
              <tr><td colSpan={5} className={`p-8 text-center ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No lab results found.</td></tr>
            )}
            {labs.map((lab) => (
              <tr key={lab.id} className={`transition-colors group ${darkMode ? 'hover:bg-purple-900/10' : 'hover:bg-purple-50/50'}`}>
                <td className={`p-4 font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{lab.test_name}</td>
                <td className="p-4">
                    <span className={`font-mono font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {lab.result_value || '--'} <span className="text-xs text-slate-500">{lab.unit}</span>
                    </span>
                </td>
                <td className="p-4">
                   <StatusBadge status={lab.status} />
                </td>
                <td className={`p-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(lab.created_at).toLocaleDateString()}</td>
                <td className={`p-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{lab.requested_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {showAddModal && (
        <AddLabModal
          patientId={patientId}
          currentUser={currentUser}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchLabs(); }}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'Completed') return <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full w-fit"><CheckCircle size={12}/> Completed</span>;
    if (status === 'Critical') return <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full w-fit"><AlertTriangle size={12}/> Critical</span>;
    return <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full w-fit"><Clock size={12}/> Pending</span>;
}

function AddLabModal({ patientId, currentUser, onClose, onSuccess, darkMode }: any) {
  const [testName, setTestName] = useState('');
  const [result, setResult] = useState('');
  const [unit, setUnit] = useState('');
  const [status, setStatus] = useState('Pending');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!testName) return;
    setLoading(true);

    const labData = {
        patient_id: patientId,
        test_name: testName,
        result_value: result,
        unit: unit,
        status: status as any,
        requested_by: currentUser,
        created_at: new Date().toISOString()
    };

    try {
        const { error } = await supabase.from('patient_labs').insert(labData);
        if (error) throw error;
        onSuccess();
    } catch(e) {
        console.warn("Supabase failed, adding to mock", e);
        addMockLab(labData);
        onSuccess();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
        <div className={`p-5 border-b flex justify-between items-center ${darkMode ? 'bg-slate-950/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
          <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-800'}`}>New Lab Order</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
            <div>
                <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Test Name</label>
                <input
                  type="text"
                  className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-300'}`}
                  placeholder="e.g. CBC, Lipid Profile..."
                  value={testName}
                  onChange={e => setTestName(e.target.value)}
                />
            </div>
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Result Value (Optional)</label>
                    <input
                      type="text"
                      className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-300'}`}
                      placeholder="e.g. 14.5"
                      value={result}
                      onChange={e => setResult(e.target.value)}
                    />
                </div>
                <div className="w-1/3">
                    <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Unit</label>
                    <input
                      type="text"
                      className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-300'}`}
                      placeholder="g/dL"
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                    />
                </div>
            </div>
            <div>
                <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Status</label>
                <select
                  className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-300 bg-white'}`}
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Critical">Critical</option>
                </select>
            </div>
        </div>

        <div className={`p-5 border-t flex justify-end gap-3 ${darkMode ? 'bg-slate-950/50 border-slate-700' : 'bg-slate-50/50 border-slate-100'}`}>
          <button onClick={onClose} className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'}`}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!testName || loading}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-600/20"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Save Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
