// POST /api/voice { text, voice } -> audio/mpeg. A natural narrator voice for the WFO 2027 film.
// Optional: needs OPENAI_API_KEY in the Vercel project's environment variables.
// Without it, GET reports { tts: false } and the presenter screen uses the browser's own voice.
const VOICES = ['cedar', 'marin', 'ash', 'ballad', 'onyx', 'sage', 'coral', 'verse'];
const INSTRUCTIONS = `You are the narrator of a short, sincere documentary about a team, played at their own meeting.
Voice: warm, grounded, human. Calm and unhurried, like a documentary narrator who cares about the people in the story.
Pacing: measured. Leave a natural breath at commas and a real pause between sentences. Slow down slightly on the last sentence of a paragraph.
Tone: uplifting and heartfelt, with quiet pride and a warm smile in the voice. Hopeful, never salesy, never dramatic. Let the energy rise gently as the story builds, and land the final line with warmth. When quoting a team member, soften a little, as if passing on their words with care.`;

export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({ tts: !!process.env.OPENAI_API_KEY, voices: VOICES });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'voice not configured' });
  const origin = req.headers.origin || '';
  if (origin && !/^https:\/\/([a-z0-9-]+\.)*qourlite\.xyz$|^https:\/\/[a-z0-9-]+\.vercel\.app$|^http:\/\/localhost(:\d+)?$/.test(origin)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const b = typeof req.body === 'object' && req.body ? req.body : {};
  const text = String(b.text || '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, 1500);
  if (!text) return res.status(400).json({ error: 'no text' });
  const want = VOICES.includes(b.voice) ? b.voice : VOICES[0];

  const speak = voice => fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input: text, instructions: INSTRUCTIONS, response_format: 'mp3' }),
  });
  try {
    let r = await speak(want);
    if (r.status === 400 && want !== 'ash') r = await speak('ash'); // a voice this account or model does not offer
    if (!r.ok) return res.status(502).json({ error: 'tts ' + r.status });
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('content-type', 'audio/mpeg');
    res.setHeader('cache-control', 'no-store');
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).json({ error: 'failed' });
  }
}
