// ==========================================
// 📁 src/types/index.ts
// ==========================================

export interface Drug {
  id: string;
  trade_name: string;
  active_ingredient: string;
  rx_cui?: string;
}

export interface Patient {
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
  vitals_history?: {
    date: string;
    hr: number;
    bp: string;
    temp: number;
    spo2: number;
  }[];
}

export interface PatientMedication {
  id: string;
  patient_id: string;
  drug_name: string;
  dose: string;
  start_date: string;
  active_ingredient: string;
  is_active: boolean;
  rx_cui?: string;
  frequency?: string; // e.g., "Every 8 hours", "Once daily", "Twice daily"
  last_taken?: string; // ISO timestamp
}

export interface PatientNote {
  id: string;
  created_at: string;
  doctor_name: string;
  note_text: string;
}
