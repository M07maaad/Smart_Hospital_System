// ==========================================
// 📁 src/services/api.ts
// ==========================================

import { PatientMedication } from '../types/index';

export const checkInteractionsByCode = async (
  newDrugIngredient: string,
  newDrugName: string,
  currentMeds: PatientMedication[],
  setStatus: (status: string) => void
) => {
  const ingredient = newDrugIngredient ? String(newDrugIngredient).trim() : '';

  if (!ingredient) {
    return { safe: true, message: `⚠️ تنبيه: المادة الفعالة للدواء (${newDrugName}) غير متوفرة للفحص.` };
  }

  // تجميع أدوية المريض الحالية (المادة الفعالة + الاسم التجاري)
  const currentMedsList = currentMeds
    .filter(m => m.is_active && m.active_ingredient)
    .map(m => ({ drug_name: m.drug_name, active_ingredient: m.active_ingredient }));

  if (currentMedsList.length === 0) {
    return { safe: true, message: "✅ آمن (لا توجد أدوية حالية للمقارنة)." };
  }

  // الاتصال بالـ Edge Function
  try {
    setStatus("جاري فحص التعارضات...");

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const fnUrl = `${supabaseUrl}/functions/v1/check-interactions`;

    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        drug_name: newDrugName,
        drug_ingredient: ingredient,
        current_meds: currentMedsList,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Edge Function error (${res.status}): ${errText}`);
    }

    const data = await res.json();

    // 4. تحليل الرد من الـ Edge Function
    if (data.error) throw new Error(data.error);

    if (!data.safe && data.messages) {
      return { safe: false, messages: data.messages };
    }

    return { safe: true, message: data.message || "✅ آمن: لا توجد تعارضات معروفة." };

  } catch (error) {
    console.error("Check Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown";
    return { safe: true, message: `حدث خطأ أثناء الاتصال (${msg}).` };
  }
};
