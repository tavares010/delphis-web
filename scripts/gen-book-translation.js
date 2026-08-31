/* ===========================================================
   Traduce "La Sed" (data/book_content.json, inglés) a otro idioma,
   capítulo a capítulo, vía el mismo proxy de IA que usa el roleplay.
   Sin audio real ni marcas de tiempo (no hay forma de generar
   narración grabada aquí) -las palabras quedan con s:0,e:0, así que
   el lector simplemente no ofrece karaoke para estos capítulos, pero
   sí funciona tocar cualquier palabra para traducirla y el botón de
   escuchar (usa voz sintética vía speakText, ya corregido por idioma).

   Uso: node scripts/gen-book-translation.js <es|fr|de|it|pt> [--start=N]
   =========================================================== */
const fs = require('fs');
const path = require('path');

const IDIOMA_NOMBRE = { es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese' };
const AI_PROXY_URL = 'https://server-9xj7.onrender.com/api/roleplay-turn';

function parseAIJson(text) {
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch (e) { return null; }
}

async function callAI(systemPrompt, userContent, timeoutMs = 120000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, messages: [{ role: 'user', content: userContent }] }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { error: `http ${res.status}` };
    const data = await res.json();
    return { text: data.text };
  } catch (e) {
    clearTimeout(timer);
    return { error: e.message };
  }
}

function tokenize(paragraphText) {
  return paragraphText.trim().split(/\s+/).filter(Boolean).map(w => ({ w, s: 0, e: 0 }));
}

function buildSystemPrompt(idiomaNombre) {
  return `You are a professional literary translator. You will receive a JSON array of paragraphs (strings) from one chapter of a fantasy novel, in English. Translate them into natural, fluent, literary ${idiomaNombre}, preserving tone, meaning and style as a real published translation would.

Rules:
- Reply with EXACTLY the same number of paragraphs as the input, in the same order.
- Each output paragraph must correspond 1:1 to the input paragraph at the same index -do not merge, split, add, or remove paragraphs.
- Keep character names and invented/fantasy proper nouns unchanged unless ${idiomaNombre} has a very well-established equivalent form.
- Reply with STRICT JSON only, no markdown, no extra text, in exactly this shape: {"paragraphs": ["...", "...", ...]}`;
}

// Los capítulos largos (20-40+ párrafos) truncaban la respuesta de la IA
// antes de cerrar el JSON -por eso "JSON inválido... llegaron ?" fallaba
// SIEMPRE en capítulos grandes y nunca en los cortos. Solución: partir cada
// capítulo en tandas pequeñas (tope de palabras por tanda, nunca todo el
// capítulo de una vez), traducir cada tanda por separado y unirlas después.
const MAX_PALABRAS_POR_TANDA = 220;

function agruparEnTandas(paragraphTexts) {
  const tandas = [];
  let actual = [];
  let palabras = 0;
  for (const p of paragraphTexts) {
    const n = p.split(/\s+/).filter(Boolean).length;
    if (actual.length && palabras + n > MAX_PALABRAS_POR_TANDA) {
      tandas.push(actual);
      actual = [];
      palabras = 0;
    }
    actual.push(p);
    palabras += n;
  }
  if (actual.length) tandas.push(actual);
  return tandas;
}

async function translateBatch(paragraphTexts, systemPrompt) {
  let attempt = 0;
  while (attempt < 4) {
    attempt++;
    const { text, error } = await callAI(systemPrompt, JSON.stringify(paragraphTexts));
    if (error) { console.log(`    intento ${attempt}/4: error "${error}"`); await new Promise(r => setTimeout(r, 3000)); continue; }
    const parsed = parseAIJson(text);
    if (!parsed || !Array.isArray(parsed.paragraphs) || parsed.paragraphs.length !== paragraphTexts.length) {
      console.log(`    intento ${attempt}/4: JSON inválido o número de párrafos no coincide (esperaba ${paragraphTexts.length}, llegaron ${parsed && parsed.paragraphs ? parsed.paragraphs.length : '?'})`);
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }
    return parsed.paragraphs;
  }
  return null;
}

async function translateChapter(chapter, idiomaNombre) {
  const paragraphTexts = chapter.paragraphs.map(p => p.map(w => w.w).join(' '));
  const systemPrompt = buildSystemPrompt(idiomaNombre);
  const tandas = agruparEnTandas(paragraphTexts);
  const resultado = [];
  let parcial = false;
  for (let i = 0; i < tandas.length; i++) {
    if (tandas.length > 1) console.log(`  tanda ${i + 1}/${tandas.length} (${tandas[i].length} párrafos)`);
    const traducidos = await translateBatch(tandas[i], systemPrompt);
    if (!traducidos) {
      // Antes esto abandonaba el CAPÍTULO ENTERO -desperdiciaba las demás
      // tandas ya traducidas bien por una sola tanda difícil. Ahora solo
      // esa tanda concreta se queda en el idioma original, y el resto del
      // capítulo conserva su traducción.
      console.log(`  tanda ${i + 1}/${tandas.length}: FALLÓ tras 4 intentos -esta parte se deja sin traducir (queda en inglés, revisar a mano luego)`);
      resultado.push(...tandas[i]);
      parcial = true;
      continue;
    }
    resultado.push(...traducidos);
  }
  return { paragraphs: resultado.map(tokenize), parcial };
}

async function main() {
  const args = process.argv.slice(2);
  const suf = args[0];
  const startArg = args.find(a => a.startsWith('--start='));
  const startAt = startArg ? parseInt(startArg.split('=')[1], 10) : 0;
  // --only=2,10 -para re-traducir solo capítulos concretos (por ejemplo,
  // los que quedaron parciales en una corrida anterior) sin rehacer los 13.
  const onlyArg = args.find(a => a.startsWith('--only='));
  const onlySet = onlyArg ? new Set(onlyArg.split('=')[1].split(',').map(n => parseInt(n, 10))) : null;
  if (!IDIOMA_NOMBRE[suf]) {
    console.error('Uso: node scripts/gen-book-translation.js <es|fr|de|it|pt> [--start=N] [--only=i,j,...]');
    process.exit(1);
  }
  const idiomaNombre = IDIOMA_NOMBRE[suf];
  const srcPath = path.join(__dirname, '..', 'data', 'book_content.json');
  const outPath = path.join(__dirname, '..', 'data', `book_content_${suf}.json`);
  const chapters = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

  let out = (startAt > 0 || onlySet) && fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : [];

  for (let i = startAt; i < chapters.length; i++) {
    if (onlySet && !onlySet.has(i)) continue;
    const chapter = chapters[i];
    console.log(`[${suf}] capítulo ${i + 1}/${chapters.length}: "${chapter.titulo}" (${chapter.paragraphs.reduce((a, p) => a + p.length, 0)} palabras)`);
    const { paragraphs, parcial } = await translateChapter(chapter, idiomaNombre);
    if (parcial) {
      console.log(`[${suf}] capítulo ${i + 1}: traducido PARCIALMENTE -alguna parte quedó en inglés, revisar a mano luego`);
    }
    out[i] = {
      index: chapter.index,
      titulo: chapter.titulo, // los títulos se quedan en español -son navegación, no contenido de lectura
      quizKey: chapter.quizKey,
      wordCount: paragraphs.reduce((a, p) => a + p.length, 0),
      audio: null, // sin narración grabada real -el lector cae a voz sintética
      paragraphs,
    };
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(`[${suf}] guardado hasta el capítulo ${i + 1}/${chapters.length}`);
  }
  console.log(`[${suf}] DONE. ${out.length}/${chapters.length} capítulos en ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
