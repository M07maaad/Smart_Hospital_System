# Smart Hospital System (Refactored)

A modern, responsive Hospital Management System built with React, Vite, and Supabase.

## Features

- **Patient Dashboard:** View and filter patients by status (Stable, Critical, etc.).
- **Patient Details:** Detailed view of patient vitals, medical history, and notes.
- **Medication Management:**
  - Add medications with interaction checking (via API/Edge Functions).
  - **New:** Drug Time Reminders & Frequency Scheduling.
  - **New:** Visual Alerts for overdue medications.
- **Vitals Monitoring:**
  - **New:** Live Vitals Chart (Mocked history based on current vitals).
- **Dark Mode:** Fully supported dark theme.
- **Responsive Design:** Mobile-friendly interface.

## Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd smart-hospital-system
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` file in the root directory (or use Vercel Environment Variables):
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```

## Database Migration (Required for New Features)

To support the new **Drug Time Reminder** features, please run the following SQL in your Supabase SQL Editor:

```sql
-- Add columns for medication frequency and last taken time
ALTER TABLE patient_medications
ADD COLUMN IF NOT EXISTS frequency text DEFAULT '24',
ADD COLUMN IF NOT EXISTS last_taken timestamptz;

-- Optional: Comment on columns
COMMENT ON COLUMN patient_medications.frequency IS 'Frequency in hours (e.g. 8, 12, 24)';
COMMENT ON COLUMN patient_medications.last_taken IS 'Timestamp of the last dose taken';

-- Add table for Labs
CREATE TABLE IF NOT EXISTS patient_labs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  result_value text,
  unit text,
  status text DEFAULT 'Pending', -- Pending, Completed, Critical
  created_at timestamptz DEFAULT now(),
  requested_by text
);

-- Add table for Vitals Log
CREATE TABLE IF NOT EXISTS patient_vitals_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  recorded_at timestamptz DEFAULT now(),
  hr integer,
  bp_systolic integer,
  bp_diastolic integer,
  temp numeric,
  spo2 integer,
  recorded_by text
);

-- Update patients table to support vitals json update (if needed)
-- (patients table usually has 'vitals' column as jsonb)
```

## Deployment

This project is optimized for deployment on **Vercel**.

1. Push your code to a Git repository (GitHub/GitLab).
2. Import the project in Vercel.
3. Add the Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the Vercel Project Settings.
4. Deploy!

The `vercel.json` and `api/` directory are configured for Vercel Serverless Functions (for interaction checking).

## Future Improvements

See `SUGGESTIONS.md` for a list of identified flaws and potential enhancements.
