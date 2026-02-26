import { Patient, PatientMedication, LabResult, VitalsLog, PatientNote } from '../types';

// Simple in-memory mock store (simulating a database)
const mockPatients: Patient[] = [
  {
    id: 'p1', name: 'Ahmed Ali', age: 45, gender: 'Male', room_number: '101',
    diagnosis: 'Hypertension', admission_date: '2023-10-20', status: 'Stable',
    medical_history: ['Diabetes'], vitals: { hr: 72, bp: '120/80', temp: 36.5, spo2: 98 }
  },
  {
    id: 'p2', name: 'Sara Mohamed', age: 32, gender: 'Female', room_number: '102',
    diagnosis: 'Pneumonia', admission_date: '2023-10-22', status: 'Improving',
    medical_history: ['Asthma'], vitals: { hr: 85, bp: '110/70', temp: 37.2, spo2: 95 }
  },
  {
    id: 'p3', name: 'Khaled Omar', age: 60, gender: 'Male', room_number: '201',
    diagnosis: 'Heart Failure', admission_date: '2023-10-25', status: 'Critical',
    medical_history: ['MI', 'CKD'], vitals: { hr: 90, bp: '140/90', temp: 36.8, spo2: 92 }
  }
];

const mockMeds: PatientMedication[] = [];
const mockLabs: LabResult[] = [];
const mockVitalsLogs: VitalsLog[] = [];
const mockNotes: PatientNote[] = [];

export const getMockPatients = () => mockPatients;

export const addMockMedication = (med: Omit<PatientMedication, 'id'>) => {
  const newMed = { ...med, id: `mock_med_${Date.now()}` };
  mockMeds.push(newMed);
  return newMed;
};

export const getMockMedications = (patientId?: string) => {
  if (patientId) return mockMeds.filter(m => m.patient_id === patientId && m.is_active);
  return mockMeds.filter(m => m.is_active);
};

export const updateMockMedication = (id: string, updates: Partial<PatientMedication>) => {
  const index = mockMeds.findIndex(m => m.id === id);
  if (index !== -1) {
    mockMeds[index] = { ...mockMeds[index], ...updates };
  }
};

export const addMockLab = (lab: Omit<LabResult, 'id'>) => {
  const newLab = { ...lab, id: `mock_lab_${Date.now()}` };
  mockLabs.push(newLab);
  return newLab;
};

export const getMockLabs = (patientId: string) => {
  return mockLabs.filter(l => l.patient_id === patientId);
};

export const addMockVitalsLog = (log: Omit<VitalsLog, 'id'>) => {
  const newLog = { ...log, id: `mock_log_${Date.now()}` };
  mockVitalsLogs.push(newLog);
  // Also update patient current vitals
  const pIndex = mockPatients.findIndex(p => p.id === log.patient_id);
  if (pIndex !== -1) {
    mockPatients[pIndex].vitals = {
        hr: log.hr,
        bp: `${log.bp_systolic}/${log.bp_diastolic}`,
        temp: log.temp,
        spo2: log.spo2
    };
  }
  return newLog;
};

export const getMockVitalsLogs = (patientId: string) => {
    return mockVitalsLogs.filter(l => l.patient_id === patientId);
};

export const addMockNote = (note: Omit<PatientNote, 'id'>) => {
    const newNote = { ...note, id: `mock_note_${Date.now()}` };
    mockNotes.push(newNote);
    return newNote;
};

export const getMockNotes = (patientId: string) => {
    return mockNotes.filter(n => n.patient_id === patientId);
};
