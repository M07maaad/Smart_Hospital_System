import React, { useState } from 'react';
import { ClipboardList, Plus, CheckCircle, Circle, Trash2 } from 'lucide-react';

interface TasksTabProps {
  patientId: string;
  darkMode: boolean;
}

export function TasksTab({ patientId, darkMode }: TasksTabProps) {
  // Mock data
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Check Blood Pressure every hour', done: false, type: 'nursing' },
    { id: 2, text: 'Prepare discharge summary', done: false, type: 'doctor' },
    { id: 3, text: 'Administer IV fluids', done: true, type: 'nursing' },
  ]);
  const [newTask, setNewTask] = useState('');

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: newTask, done: false, type: 'nursing' }]);
    setNewTask('');
  };

  const deleteTask = (id: number) => {
      setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center">
        <div>
           <h3 className={`font-bold text-lg flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
             <ClipboardList className="text-teal-600" /> Clinical Tasks
           </h3>
           <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manage tasks for doctors and nurses</p>
        </div>
      </div>

      <div className={`p-4 rounded-2xl border flex gap-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <input
            type="text"
            className={`flex-1 bg-transparent outline-none ${darkMode ? 'text-white placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`}
            placeholder="Add a new task..."
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
          />
          <button
            onClick={addTask}
            className="bg-teal-600 hover:bg-teal-700 text-white p-2 rounded-xl transition-colors"
          >
            <Plus size={20} />
          </button>
      </div>

      <div className="space-y-3">
         {tasks.map(task => (
             <div key={task.id} className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                 task.done
                 ? (darkMode ? 'bg-slate-800/50 border-slate-700 opacity-60' : 'bg-slate-50 border-slate-100 opacity-60')
                 : (darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm')
             }`}>
                 <button onClick={() => toggleTask(task.id)} className={`transition-colors ${task.done ? 'text-teal-500' : 'text-slate-300 hover:text-teal-500'}`}>
                    {task.done ? <CheckCircle size={24} /> : <Circle size={24} />}
                 </button>
                 <span className={`flex-1 font-medium ${task.done ? 'line-through' : ''} ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    {task.text}
                 </span>
                 <span className={`text-xs px-2 py-1 rounded-md uppercase font-bold ${
                     task.type === 'nursing'
                     ? (darkMode ? 'bg-pink-900/30 text-pink-400' : 'bg-pink-100 text-pink-600')
                     : (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600')
                 }`}>
                    {task.type}
                 </span>
                 <button onClick={() => deleteTask(task.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                 </button>
             </div>
         ))}
      </div>
    </div>
  );
}
