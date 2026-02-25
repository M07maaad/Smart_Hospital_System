import { addHours, parseISO, isPast, format, addDays, setHours, setMinutes } from 'date-fns';

export const FREQUENCIES = [
  { label: 'مرة يومياً (Every 24h)', value: 24 },
  { label: 'مرتين يومياً (Every 12h)', value: 12 },
  { label: '3 مرات يومياً (Every 8h)', value: 8 },
  { label: '4 مرات يومياً (Every 6h)', value: 6 },
  { label: 'كل 4 ساعات', value: 4 },
  { label: 'عند اللزوم (PRN)', value: 0 },
];

export const getNextDose = (frequencyHours: number, lastTaken?: string, startDate?: string): Date | null => {
  if (!frequencyHours || frequencyHours === 0) return null; // PRN

  let baseDate = new Date();

  if (lastTaken) {
    baseDate = parseISO(lastTaken);
  } else if (startDate) {
    // If never taken, assume start date at 9:00 AM
    // But if start date is in the past, maybe assume 9:00 AM today?
    const start = parseISO(startDate);
    const todayAt9 = setMinutes(setHours(new Date(), 9), 0);

    // If start date is today or future, use start date at 9 AM
    if (start > new Date()) {
       baseDate = setMinutes(setHours(start, 9), 0);
       return baseDate;
    }
    // If start date was in the past and never taken, it's overdue since 9 AM today (simplification)
    baseDate = todayAt9;
    // If 9 AM is in the future (e.g. it's 7 AM), then it's today 9 AM.
    // If 9 AM is in the past (e.g. it's 10 AM), then next dose depends on frequency.
    // Let's just say if never taken, it's due *now*.
    return new Date();
  } else {
    return new Date();
  }

  return addHours(baseDate, frequencyHours);
};

export const isMedicationDue = (nextDose: Date | null): boolean => {
  if (!nextDose) return false;
  return isPast(nextDose);
};

export const formatNextDose = (date: Date | null): string => {
  if (!date) return 'عند اللزوم';
  return format(date, 'yyyy-MM-dd HH:mm'); // e.g. 2023-10-27 14:30
};
