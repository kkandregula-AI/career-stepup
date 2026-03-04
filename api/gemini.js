export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const key = process.env.GEMINI_API_KEY;
  const body = req.body;

  // Extract prompt text
  const parts = body.contents[0].parts;
  const prompt = parts.map(p => p.text || '').join('\n');

  // Try Gemini first
  if (key) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
      });
      const text = await r.text();

      // If rate limited fall through to fallback
      if (r.status !== 429 && r.status !== 503) {
        return res.status(r.status).setHeader('Content-Type','application/json').send(text);
      }
      console.log('Gemini rate limited, trying Pollinations...');
    } catch(e) {
      console.log('Gemini error:', e.message);
    }
  }

  // Fallback: Pollinations AI (free, no key)
  try {
    const encodedPrompt = encodeURIComponent(prompt);
    const r = await fetch(`https://text.pollinations.ai/${encodedPrompt}`);
    const text = await r.text();

    const wrapped = {
      candidates: [{
        content: {
          parts: [{ text: text }]
        }
      }]
    };

    return res.status(200).json(wrapped);
  } catch(e) {
    return res.status(500).json({ error: { message: 'Both Gemini and fallback AI failed: ' + e.message }});
  }
}
