/* ===========================================================
   DELPHIS METHOD — PROXY DE IA REAL (roleplay + chat del libro
   + traducción al tocar palabras)
   Backend ya desplegado (ver web_export/PROMPT.md §11). Nunca se
   llama a Anthropic directamente desde el cliente.
   =========================================================== */

const AI_PROXY_URL = 'https://server-9xj7.onrender.com/api/roleplay-turn';

// timeout largo: el plan gratuito de Render duerme el servicio tras ~15 min
// sin uso, y la primera petición que lo despierta puede tardar bastante.
async function callAI(systemPrompt, messages, { timeoutMs = 60000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, messages }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { error: 'server' };
    const data = await res.json();
    return { text: data.text };
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') return { error: 'timeout' };
    return { error: 'network' };
  }
}

// La respuesta suele ser JSON embebido, a veces con texto alrededor —
// busca el primer { y el último } y parsea eso.
function parseAIJson(text) {
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch (e) { return null; }
}

// ---------- Traducción al tocar una palabra/frase (usa el mismo endpoint) ----------
const TRANSLATE_CACHE_KEY = 'delphis_translations_v1';

function translateCacheLoad() {
  try { return JSON.parse(localStorage.getItem(TRANSLATE_CACHE_KEY)) || {}; } catch (e) { return {}; }
}
function translateCacheSave(d) { localStorage.setItem(TRANSLATE_CACHE_KEY, JSON.stringify(d)); }

async function translateToSpanish(text) {
  const key = text.trim().toLowerCase();
  if (!key) return null;
  const cache = translateCacheLoad();
  if (cache[key]) return cache[key];

  const systemPrompt = `You are a translation engine embedded in an English-learning app. Translate the given English word or short phrase into natural, contextually appropriate Spanish (the text comes from a fantasy novel a Spanish-speaking student is reading). Reply with STRICT JSON only, no markdown formatting, no extra text, in exactly this shape: {"es": "..."}`;
  const { text: raw, error } = await callAI(systemPrompt, [{ role: 'user', content: key }]);
  if (error) return { error };

  const parsed = parseAIJson(raw);
  const es = (parsed && parsed.es) ? parsed.es : (raw || '').trim();
  if (es) { cache[key] = es; translateCacheSave(cache); }
  return { es };
}
