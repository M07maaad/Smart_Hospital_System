import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Serverless Function to proxy RxNav API requests and bypass CORS.
 * Path: /api/interaction-checker
 */
export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // 1. Get rxcuis from query
  const { rxcuis } = request.query;

  if (!rxcuis) {
    return response.status(400).json({ error: 'rxcuis parameter is missing' });
  }

  // 2. Clean and format the codes for RxNav (Space or + separated)
  const formattedCuis = String(rxcuis).trim().replace(/\s+/g, '+');
  const targetUrl = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${formattedCuis}&sources=ONCHigh`;

  try {
    // 3. Fetch data from RxNav with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 sec timeout

    const rxNavResponse = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SmartHospitalSystem/1.0'
      }
    });

    clearTimeout(timeoutId);

    if (!rxNavResponse.ok) {
      console.error(`RxNav API Error: ${rxNavResponse.status}`);
      return response.status(rxNavResponse.status).json({ 
        error: `RxNav responded with status ${rxNavResponse.status}` 
      });
    }

    const data = await rxNavResponse.json();

    // 4. Return data to Frontend
    return response.status(200).json(data);

  } catch (error: any) {
    console.error('API Handler Error:', error.message);
    return response.status(500).json({ 
      error: 'Internal Server Error', 
      details: error.message 
    });
  }
}
