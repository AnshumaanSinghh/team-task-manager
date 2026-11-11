// Multi-provider JSON completion: Groq -> Gemini -> OpenRouter.
// Every provider is optional; with no keys configured this returns null and
// callers fall back to the deterministic parser / planner.
const TIMEOUT_MS = 12000;

const MODELS = {
  groq: () => process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
  gemini: () => process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  openrouter: () => process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free'
};

function parseJsonLoose(text) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const providers = [
  {
    name: 'groq',
    enabled: () => Boolean(process.env.GROQ_API_KEY),
    run: async (prompt) => {
      const data = await postJson('https://api.groq.com/openai/v1/chat/completions',
        { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        {
          model: MODELS.groq(),
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2
        });
      return parseJsonLoose(data?.choices?.[0]?.message?.content);
    }
  },
  {
    name: 'gemini',
    enabled: () => Boolean(process.env.GEMINI_API_KEY),
    run: async (prompt) => {
      const data = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini()}:generateContent`,
        { 'x-goog-api-key': process.env.GEMINI_API_KEY },
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
        });
      return parseJsonLoose(data?.candidates?.[0]?.content?.parts?.[0]?.text);
    }
  },
  {
    name: 'openrouter',
    enabled: () => Boolean(process.env.OPENROUTER_API_KEY),
    run: async (prompt) => {
      const data = await postJson('https://openrouter.ai/api/v1/chat/completions',
        { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
        {
          model: MODELS.openrouter(),
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2
        });
      return parseJsonLoose(data?.choices?.[0]?.message?.content);
    }
  }
];

const aiConfigured = () => providers.some((p) => p.enabled());

async function completeJson(prompt) {
  for (const provider of providers) {
    if (!provider.enabled()) continue;
    try {
      const data = await provider.run(prompt);
      if (data && typeof data === 'object') return { data, provider: provider.name };
    } catch (error) {
      console.warn(`[ai] ${provider.name} failed: ${error.message}`);
    }
  }
  return null;
}

module.exports = { completeJson, aiConfigured, parseJsonLoose };
