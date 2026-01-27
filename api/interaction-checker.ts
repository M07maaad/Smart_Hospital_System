import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * خادم وسيط (Proxy) للاتصال بـ RxNav لتجنب مشاكل CORS.
 * تأكد أن هذا الملف موجود في مجلد: api/interaction-checker.ts
 */
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const { rxcuis } = request.query;

  if (!rxcuis) {
    return response.status(400).json({ error: 'rxcuis parameter is missing' });
  }

  // تنظيف الأكواد وتنسيقها
  const cleanCuis = String(rxcuis).trim().replace(/\s+/g, '+');
  const targetUrl = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${cleanCuis}&sources=ONCHigh`;

  try {
    const rxNavResponse = await fetch(targetUrl, {
      headers: { 'Accept': 'application/json' }
    });

    if (!rxNavResponse.ok) {
      return response.status(rxNavResponse.status).json({ error: 'RxNav API error' });
    }

    const data = await rxNavResponse.json();
    return response.status(200).json(data);
  } catch (error: any) {
    return response.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
