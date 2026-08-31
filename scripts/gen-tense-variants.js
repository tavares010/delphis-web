/* ===========================================================
   Genera data/level1_tense_variants_<suf>.json para fr/de/it/pt,
   igual que el existente de inglés: por cada frase de Nivel 1, la
   MISMA frase conjugada en sus 2 tiempos más confusos (TENSE_CONFUSION),
   para que el quiz tenga distractores de par mínimo real en todos
   los idiomas, no solo en inglés.
   Uso: node scripts/gen-tense-variants.js <fr|de|it|pt> [--start=N]
   =========================================================== */
const fs = require('fs');
const path = require('path');

const LANG_NAMES = { fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese' };
const AI_PROXY_URL = 'https://server-9xj7.onrender.com/api/roleplay-turn';
const BATCH_SIZE = 12;

const TENSE_CONFUSION = {
  'Present simple': ['Present continuous', 'Present perfect'],
  'Present continuous': ['Present simple', 'Going to'],
  'Past simple': ['Present perfect', 'Going to'],
  'Present perfect': ['Past simple', 'Present simple'],
  'Going to': ['Future simple', 'Present continuous'],
  'Future simple': ['Going to', 'Present perfect'],
};

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.,!?¿¡'"]/g, '').replace(/\s+/g, ' ').trim();
}

function parseAIJson(text) {
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch (e) { return null; }
}

async function callAI(systemPrompt, userContent, timeoutMs = 90000) {
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

function buildSystemPrompt(langName) {
  return `You are a precise ${langName} grammar engine embedded in a language-learning app.

You will receive a JSON array of items, each with: index, verb (English infinitive, for context only), originalTense, sentence (a real ${langName} sentence in originalTense), and wantTenses (an array of exactly 2 other tense names).

For each item, rewrite the SAME sentence — same subject, same verb, same meaning, same person/number — re-conjugated into EACH of the 2 wantTenses. These are meant to be MINIMAL-PAIR quiz distractors: plausible sentences a learner might confuse with the original, differing ONLY in tense/aspect marking. Keep everything else (subject, object, adverbs) identical to the original sentence.

Tense name meanings (map to the closest real ${langName} tense/aspect):
- "Present simple": simple present
- "Present continuous": present progressive/continuous aspect (if ${langName} has no distinct continuous form for that verb, use the periphrastic continuous construction if one exists, e.g. "être en train de" in French; if truly no distinct form exists, output the present simple form again)
- "Past simple": simple past / passé composé or preterite as appropriate
- "Present perfect": present perfect
- "Going to": near-future "going to" construction
- "Future simple": simple future

Reply with STRICT JSON only, no markdown, no code fences, no extra text, in exactly this shape:
{"results":[{"index":0,"variants":{"<tenseName1>":"...","<tenseName2>":"..."}}]}

Every item in the input must appear in "results", in the same order, with both requested tenses filled in.`;
}

async function processLang(suf, startAt) {
  const langName = LANG_NAMES[suf];
  const verbsPath = path.join(__dirname, '..', 'data', `level1_verbs_${suf}.json`);
  const outPath = path.join(__dirname, '..', 'data', `level1_tense_variants_${suf}.json`);
  const phrases = JSON.parse(fs.readFileSync(verbsPath, 'utf8'));

  let out = [];
  if (fs.existsSync(outPath) && startAt > 0) {
    out = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  }

  const systemPrompt = buildSystemPrompt(langName);
  const total = phrases.length;
  console.log(`[${suf}] ${total} phrases, starting at index ${startAt}, batch size ${BATCH_SIZE}`);

  for (let i = startAt; i < total; i += BATCH_SIZE) {
    const batch = phrases.slice(i, i + BATCH_SIZE);
    const items = batch.map(p => ({
      index: p.index,
      verb: p.verb,
      originalTense: p.tense,
      sentence: p.translationEn, // el campo se llama así mas guarda la frase del idioma activo
      wantTenses: TENSE_CONFUSION[p.tense] || ['Present simple', 'Past simple'],
    }));

    let attempt = 0;
    let ok = false;
    while (attempt < 3 && !ok) {
      attempt++;
      const { text, error } = await callAI(systemPrompt, JSON.stringify(items));
      if (error) {
        console.log(`[${suf}] batch @${i}: error "${error}", attempt ${attempt}/3`);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      const parsed = parseAIJson(text);
      if (!parsed || !Array.isArray(parsed.results)) {
        console.log(`[${suf}] batch @${i}: bad JSON, attempt ${attempt}/3`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      // Valida y filtra: descarta variantes vacías o idénticas a la frase original
      parsed.results.forEach(r => {
        const orig = batch.find(p => p.index === r.index);
        if (!orig || !r.variants) return;
        const cleanVariants = {};
        Object.entries(r.variants).forEach(([tense, sentence]) => {
          if (!sentence || typeof sentence !== 'string') return;
          if (normalize(sentence) === normalize(orig.translationEn)) return; // idéntica a la correcta -inútil como distractor
          cleanVariants[tense] = sentence.trim();
        });
        if (Object.keys(cleanVariants).length) out.push({ index: r.index, variants: cleanVariants });
      });
      ok = true;
    }
    if (!ok) console.log(`[${suf}] batch @${i}: FAILED after 3 attempts, skipping (fallback distractor logic covers this)`);

    fs.writeFileSync(outPath, JSON.stringify(out.sort((a, b) => a.index - b.index), null, 2));
    console.log(`[${suf}] progress: ${Math.min(i + BATCH_SIZE, total)}/${total} -> ${out.length} entries saved`);
  }
  console.log(`[${suf}] DONE. ${out.length}/${total} entries in ${outPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  const suf = args[0];
  const startArg = args.find(a => a.startsWith('--start='));
  const startAt = startArg ? parseInt(startArg.split('=')[1], 10) : 0;
  if (!LANG_NAMES[suf]) {
    console.error('Uso: node scripts/gen-tense-variants.js <fr|de|it|pt> [--start=N]');
    process.exit(1);
  }
  await processLang(suf, startAt);
}

main().catch(e => { console.error(e); process.exit(1); });
