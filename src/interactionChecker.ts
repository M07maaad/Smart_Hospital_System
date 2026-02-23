// ============================================================
// 📁 src/services/interactionChecker.ts
// الـ Service الجديد - بيتصل بـ Vercel Function بدلاً من RxNav مباشرة
// ============================================================

import { supabase } from '../lib/supabase';

interface PatientMedication {
  id: string;
  patient_id: string;
  drug_name: string;
  dose: string;
  start_date: string;
  active_ingredient: string;
  is_active: boolean;
  rx_cui?: string;
}

interface InteractionResult {
  safe: boolean;
  message?: string;
  messages?: string[];
}

export const checkDrugInteractions = async (
  newDrugCui: string,
  newDrugName: string,
  currentMeds: PatientMedication[],
  onStatusUpdate?: (status: string) => void
): Promise<InteractionResult> => {

  // 1. التحقق من صحة كود الدواء
  const safeNewCui = newDrugCui ? String(newDrugCui).trim() : '';

  if (!safeNewCui || !/^\d+$/.test(safeNewCui)) {
    return {
      safe: true,
      message: `⚠️ تنبيه: كود الدواء (${newDrugName}) غير صالح للفحص.`,
    };
  }

  // 2. تجميع أكواد أدوية المريض الحالية
  onStatusUpdate?.('جاري تجميع بيانات الأدوية الحالية...');

  const medCuisSet = new Set<string>();
  const cuiToName: Record<string, string> = {};

  for (const med of currentMeds) {
    if (!med.is_active) continue;

    let cui = med.rx_cui ? String(med.rx_cui).trim() : null;

    // استرجاع الكود من DB للأدوية اللي مالهاش rx_cui
    if ((!cui || cui === 'null' || cui === 'undefined') && med.active_ingredient) {
      try {
        const { data } = await supabase
          .from('drugs')
          .select('rx_cui')
          .ilike('active_ingredient', med.active_ingredient)
          .not('rx_cui', 'is', null)
          .limit(1);

        if (data && data.length > 0) {
          cui = String(data[0].rx_cui).trim();
        }
      } catch (_) { /* تجاهل */ }
    }

    if (cui && /^\d+$/.test(cui) && cui !== safeNewCui) {
      medCuisSet.add(cui);
      cuiToName[cui] = med.drug_name;
    }
  }

  const medCuis = Array.from(medCuisSet);

  if (medCuis.length === 0) {
    return { safe: true, message: '✅ آمن (لا توجد أدوية حالية صالحة للمقارنة).' };
  }

  // 3. الاتصال بـ Vercel Serverless Function
  onStatusUpdate?.('جاري الاتصال بخادم فحص التعارضات...');

  try {
    const allCuis = [safeNewCui, ...medCuis].join('+');
    const response = await fetch(`/api/interactions?rxcuis=${allCuis}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const data = await response.json();

    // 4. تحليل النتائج
    const conflicts: string[] = [];

    if (data.fullInteractionTypeGroup) {
      for (const group of data.fullInteractionTypeGroup) {
        for (const type of group.fullInteractionType) {
          for (const pair of type.interactionPair) {
            const involvedCuis: string[] = pair.interactionConcept.map(
              (c: any) => c.minConceptItem.rxcui
            );

            if (involvedCuis.includes(safeNewCui)) {
              const severity = pair.severity === 'high' ? '⛔ خطر شديد' : '⚠️ تحذير';
              const otherCui = involvedCuis.find((c) => c !== safeNewCui);
              const otherName = cuiToName[otherCui ?? ''] ?? 'دواء آخر';

              conflicts.push(
                `${severity}: تعارض بين (${newDrugName}) و (${otherName}).\n📝 ${pair.description}`
              );
            }
          }
        }
      }
    }

    if (conflicts.length > 0) {
      return { safe: false, messages: conflicts };
    }

    return { safe: true, message: '✅ آمن: تم الفحص عبر RxNav ولا توجد تعارضات.' };

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[InteractionChecker] Error:', msg);
    return {
      safe: true,
      message: `⚠️ تعذّر إجراء فحص التعارضات (${msg}). يُرجى التحقق يدوياً.`,
    };
  }
};
