import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';

interface VitalsChartProps {
  data: {
    date: string;
    hr: number;
    bp: string;
    temp: number;
    spo2: number;
  }[];
  darkMode: boolean;
}

export function VitalsChart({ data, darkMode }: VitalsChartProps) {
  // Parse BP to Systolic/Diastolic for charting?
  // For simplicity, let's just chart HR and SpO2 for now, as BP is string "120/80".

  const chartData = data.map(d => {
    let systolic = 0;
    let diastolic = 0;
    if (typeof d.bp === 'string' && d.bp.includes('/')) {
        const [sys, dia] = d.bp.split('/').map(Number);
        systolic = sys || 0;
        diastolic = dia || 0;
    }
    return {
        ...d,
        systolic,
        diastolic,
        formattedDate: format(parseISO(d.date), 'MM/dd HH:mm'),
    };
  });

  return (
    <div className={`w-full h-[300px] mt-8 p-4 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Mointoring History (Last 24h)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
          <XAxis
            dataKey="formattedDate"
            stroke={darkMode ? '#94a3b8' : '#64748b'}
            tick={{ fontSize: 12 }}
          />
          <YAxis stroke={darkMode ? '#94a3b8' : '#64748b'} />
          <Tooltip
            contentStyle={{
                backgroundColor: darkMode ? '#1e293b' : '#fff',
                borderColor: darkMode ? '#334155' : '#e2e8f0',
                color: darkMode ? '#f1f5f9' : '#0f172a'
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="hr" name="Heart Rate" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="spo2" name="SpO2 %" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="temp" name="Temp °C" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="systolic" name="BP Sys" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
          <Line type="monotone" dataKey="diastolic" name="BP Dia" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="3 3" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
