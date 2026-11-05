// Vercel serverless function: POST /api/analyze
// Keeps GEMINI_API_KEY on the server. Body: { image: <base64>, mime: "image/jpeg", note?: string }
const CATEGORIES = ['road', 'garbage', 'streetlight', 'water', 'other'];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { image, mime = 'image/jpeg', note = '' } = body || {};
  if (!image || image.length > 6_000_000) return res.status(400).json({ error: 'Missing or oversized image' });

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const prompt =
    'You help citizens report local civic issues in India. Look at the photo and respond as JSON. ' +
    'category must be one of: road (potholes, damaged roads/footpaths), garbage (overflowing bins, dumping), ' +
    'streetlight (broken/non-working lights), water (leakage, drainage, waterlogging, sewage), other. ' +
    'severity: low, medium or high (high = immediate safety risk). ' +
    'title: max 8 words. description: 2-3 plain, factual sentences a municipal officer could act on; ' +
    'describe only what is visible, do not invent locations. ' +
    'confidence: 0 to 1. If the photo shows no civic issue, use category "other" and low confidence.' +
    (note ? ` Citizen note: "${String(note).slice(0, 300)}"` : '');

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: image } }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                category: { type: 'STRING', enum: CATEGORIES },
                severity: { type: 'STRING', enum: ['low', 'medium', 'high'] },
                title: { type: 'STRING' },
                description: { type: 'STRING' },
                confidence: { type: 'NUMBER' },
              },
              required: ['category', 'severity', 'title', 'description', 'confidence'],
            },
          },
        }),
      }
    );
    if (!r.ok) return res.status(502).json({ error: 'Gemini request failed', status: r.status });
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const out = JSON.parse(text);
    if (!CATEGORIES.includes(out.category)) out.category = 'other';
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: 'Analysis failed' });
  }
};
