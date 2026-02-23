// ============================================================
// 📁 api/interactions.js
// Vercel Serverless Function - بيشتغل على السيرفر مش في المتصفح
// بيستقبل الطلب من الـ Frontend ويكلم RxNav بدلاً منه
// ============================================================

const RXNAV_BASE_URL = 'https://rxnav.nlm.nih.gov/REST/interaction/list.json';

export default async function handler(req, res) {
  // السماح للـ Frontend بالاتصال (CORS Headers)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { rxcuis } = req.query;

  // التحقق من البيانات
  if (!rxcuis || typeof rxcuis !== 'string' || rxcuis.trim() === '') {
    return res.status(400).json({ error: 'Missing parameter: rxcuis' });
  }

  const cuiList = rxcuis.split('+').map((c) => c.trim()).filter(Boolean);
  const invalidCodes = cuiList.filter((c) => !/^\d+$/.test(c));

  if (invalidCodes.length > 0) {
    return res.status(400).json({ error: `Invalid RxCUI codes: ${invalidCodes.join(', ')}` });
  }

  if (cuiList.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 RxCUI codes' });
  }

  try {
    // الطلب من السيرفر - لا CORS هنا
    const targetUrl = `${RXNAV_BASE_URL}?rxcuis=${cuiList.join('+')}&sources=ONCHigh`;
    
    const rxnavResponse = await fetch(targetUrl, {
      headers: { Accept: 'application/json' },
    });

    if (!rxnavResponse.ok) {
      return res.status(502).json({ error: `RxNav returned status ${rxnavResponse.status}` });
    }

    const data = await rxnavResponse.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
