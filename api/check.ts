import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Serverless Function للتعامل مع طلبات RxNav لتجنب مشاكل CORS.
 * المسار سيكون: /api/interaction-checker
 */
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // استقبال الأكواد من الـ Frontend
  const { rxcuis } = request.query;

  if (!rxcuis) {
    return response.status(400).json({ error: 'Missing rxcuis parameter' });
  }

  // بناء الرابط المباشر لـ RxNav
  const targetUrl = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcuis}&sources=ONCHigh`;

  try {
    // الاتصال من السيرفر للسيرفر (لا يوجد قيود CORS هنا)
    const rxNavResponse = await fetch(targetUrl);
    
    if (!rxNavResponse.ok) {
      throw new Error(`RxNav API error: ${rxNavResponse.status}`);
    }

    const data = await rxNavResponse.json();
    
    // إرجاع البيانات للـ Frontend
    return response.status(200).json(data);
  } catch (error: any) {
    console.error('API Error:', error.message);
    return response.status(500).json({ error: 'Failed to fetch interaction data from RxNav' });
  }
}
