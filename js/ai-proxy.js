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

// ---------- Traducción al tocar una palabra/frase ----------
// Google Translate (endpoint público sin clave, CORS abierto -no hace
// falta pasarela propia ni exponer ningún secreto) en vez de nuestra IA:
// antes SIEMPRE asumía que la palabra tocada era inglesa, así que en los
// cursos de otros idiomas traducía mal (trataba una palabra francesa
// como si fuera inglesa). Ahora recibe el idioma real del curso, y de
// paso trae todas las acepciones agrupadas por categoría gramatical y
// una frase de ejemplo real en el idioma original, que se puede escuchar.
const TRANSLATE_CACHE_KEY = 'delphis_translations_v2';

function translateCacheLoad() {
  try { return JSON.parse(localStorage.getItem(TRANSLATE_CACHE_KEY)) || {}; } catch (e) { return {}; }
}
function translateCacheSave(d) { localStorage.setItem(TRANSLATE_CACHE_KEY, JSON.stringify(d)); }

async function translateToSpanish(text, sourceLang) {
  const sl = (sourceLang || 'en').toLowerCase();
  const palabra = text.trim();
  if (!palabra) return null;
  const key = `${sl}:${palabra.toLowerCase()}`;
  const cache = translateCacheLoad();
  if (cache[key]) return cache[key];

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=es&dt=t&dt=bd&dt=md&q=${encodeURIComponent(palabra)}`;
    const res = await fetch(url);
    if (!res.ok) return { error: 'server' };
    const data = await res.json();

    const es = Array.isArray(data[0]) ? data[0].map(seg => seg[0]).join('').trim() : '';
    if (!es) return { error: 'server' };

    // Acepciones: agrupadas por categoría gramatical (verbo, sustantivo...),
    // con las traducciones alternativas de cada una.
    const sentidos = [];
    if (Array.isArray(data[1])) {
      data[1].forEach(grupo => {
        const categoria = grupo && grupo[0];
        const principales = grupo && grupo[1];
        if (categoria && Array.isArray(principales) && principales.length) {
          sentidos.push({ categoria, traducciones: principales.slice(0, 4) });
        }
      });
    }

    // Frase de ejemplo real con la palabra en contexto, en el idioma
    // original -para poder escucharla con la voz de ese idioma.
    let ejemplo = null;
    if (Array.isArray(data[11])) {
      for (const grupo of data[11]) {
        const definiciones = grupo && grupo[1];
        if (Array.isArray(definiciones)) {
          const conEjemplo = definiciones.find(d => d && d[2]);
          if (conEjemplo) { ejemplo = conEjemplo[2].replace(/<\/?b>/g, ''); break; }
        }
      }
    }

    const resultado = { es, sentidos, ejemplo };
    cache[key] = resultado;
    translateCacheSave(cache);
    return resultado;
  } catch (e) {
    return { error: 'network' };
  }
}
