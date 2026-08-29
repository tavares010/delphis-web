/* ===========================================================
   DELPHIS METHOD — CARGA DE CONTENIDO REAL
   Todo el contenido (frases, libro, paquetes, tienda, roleplay)
   viene de data/*.json — exportado directamente del código fuente
   real de la app (ver web_export/PROMPT.md y web_export/README.md).
   Nada de esto está inventado.
   =========================================================== */

const WEB_EXPORT_BASE = 'web_export/';

const TENSE_ES = {
  'Present simple': 'Presente simple',
  'Present continuous': 'Presente continuo',
  'Past simple': 'Pasado simple',
  'Present perfect': 'Presente perfecto',
  'Going to': 'Going to',
  'Future simple': 'Futuro simple',
};

// Nombres temáticos para los 8 bloques de Nivel 1, en el mismo orden en que
// aparecen por primera vez en level1_verbs.json (la agrupación real de la app).
const NIVEL1_BLOQUES_NOMBRES = [
  'Verbos esenciales',
  'Acción y logro',
  'Comunicación y cambio',
  'Movimiento y eventos de vida',
  'Percepción y relaciones',
  'Vida diaria',
  'Pensamiento y encuentro',
  'Resultados y expresión',
];

// Las 4 parejas de Nivel 2 (mismos 8 verbos que el Bloque 1 de Nivel 1,
// practicados en profundidad en los 6 tiempos verbales).
const NIVEL2_PAREJAS = [
  { id: 'be-have', nombre: 'to be / to have', verbos: ['to be', 'to have'] },
  { id: 'can-know', nombre: 'to can / to know', verbos: ['to can', 'to know'] },
  { id: 'want-need', nombre: 'to want / to need', verbos: ['to want', 'to need'] },
  { id: 'go-do', nombre: 'to go / to do', verbos: ['to go', 'to do'] },
];

const NIVEL3_NOMBRES_ES = {
  'Zero Conditional': 'Zero conditional',
  'First Conditional': 'First conditional',
  'Second Conditional': 'Second conditional',
  'Third Conditional': 'Third conditional',
  'Mixed Conditional': 'Mixed conditional',
  'Present Perfect Continuous': 'Presente perfecto continuo',
  'Past Perfect': 'Pasado perfecto',
  'Future Continuous': 'Futuro continuo',
};

const RANGOS = [
  { nombre: 'Bronce', min: 0, icono: '🥉' },
  { nombre: 'Plata', min: 300, icono: '🥈' },
  { nombre: 'Oro', min: 800, icono: '🥇' },
  { nombre: 'Platino', min: 1600, icono: '💎' },
  { nombre: 'Diamante', min: 3000, icono: '🔷' },
  { nombre: 'Maestro', min: 6000, icono: '👑' },
];

const AVATARES = ['🦊','🐬','🦉','🐼','🐯','🦁','🐨','🐸','🦄','🐙','🦅','🐺','🐢','🦋','🐳','🐧'];

function slugify(verb) {
  return verb.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`No se pudo cargar ${path} (${res.status})`);
  return res.json();
}

// Como loadJSON, pero devuelve null en vez de lanzar si el archivo no existe
// (por ejemplo, el libro todavía no está traducido a este idioma).
async function loadJSONOptional(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function groupPhrasesByVerb(list) {
  const byVerb = {};
  list.forEach(item => {
    const id = slugify(item.verb);
    if (!byVerb[id]) byVerb[id] = { id, verbo: item.verb, frases: [] };
    byVerb[id].frases.push({
      es: item.promptEs,
      en: item.translationEn,
      tiempo: TENSE_ES[item.tense] || item.tense,
      tenseRaw: item.tense,
      audio: item.audioAsset ? WEB_EXPORT_BASE + item.audioAsset : null,
      imagen: item.imageUrl || null,
    });
  });
  return byVerb;
}

// Distractores: la MISMA frase (mismo verbo) en otro tiempo verbal — el
// truco pedagógico exacto que describe el método, usando solo contenido real.
function buildDistractores(frase, todasLasFrasesDelGrupo, poolGlobal) {
  const mismasVerboOtroTiempo = todasLasFrasesDelGrupo
    .filter(f => f.en !== frase.en)
    .map(f => f.en);
  let opciones = shuffleArr(mismasVerboOtroTiempo).slice(0, 2);
  if (opciones.length < 2 && poolGlobal) {
    const extra = shuffleArr(poolGlobal.filter(en => en !== frase.en && !opciones.includes(en)));
    opciones = opciones.concat(extra.slice(0, 2 - opciones.length));
  }
  return opciones;
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const _contentPromises = {};

// cursoId opcional — por defecto usa el curso activo (js/courses.js).
// El contenido se cachea por curso, así cambiar de idioma no reusa el inglés.
async function loadContent(cursoId) {
  const curso = cursoId ? cursoPorId(cursoId) : getCursoActivo();
  if (_contentPromises[curso.id]) return _contentPromises[curso.id];

  _contentPromises[curso.id] = (async () => {
    const sufijo = curso.sufijo;
    // El libro es opcional por idioma: si no existe data/book_content<sufijo>.json
    // todavía (nadie ha traducido "La Sed" a ese idioma), el curso sigue
    // funcionando normal, solo sin libro — nunca rompe la carga de la página.
    const bookContentPath = sufijo ? `data/book_content${sufijo}.json` : 'data/book_content.json';
    const [level1Raw, level2Raw, level3Raw, bookQuiz, bookChaptersRaw, pkgCatalog, pkgPhrases, shopCatalog, roleplayScenarios, storyPackages] = await Promise.all([
      loadJSON(`data/level1_verbs${sufijo}.json`),
      loadJSON(`data/level2_structures${sufijo}.json`),
      loadJSON(`data/level3_structures${sufijo}.json`),
      loadJSON('data/book_quiz_bank.json'),
      loadJSONOptional(bookContentPath),
      loadJSON('data/package_catalog.json'),
      loadJSON('data/package_phrases.json'),
      loadJSON('data/shop_catalog.json'),
      loadJSON('data/roleplay_scenarios.json'),
      loadJSON('data/story_packages.json'),
    ]);

    // ---------- NIVEL 1: 64 verbos agrupados en 8 bloques de 8 ----------
    const nivel1PorVerbo = groupPhrasesByVerb(level1Raw);
    const nivel1PoolGlobal = level1Raw.map(x => x.translationEn);
    const ordenVerbos1 = [];
    level1Raw.forEach(x => { const id = slugify(x.verb); if (!ordenVerbos1.includes(id)) ordenVerbos1.push(id); });

    const nivel1Bloques = [];
    for (let b = 0; b < 8; b++) {
      const verbosBloque = ordenVerbos1.slice(b * 8, b * 8 + 8);
      nivel1Bloques.push({
        id: `bloque-${b + 1}`,
        nombre: NIVEL1_BLOQUES_NOMBRES[b],
        verbos: verbosBloque.map(id => ({ id, nombre: nivel1PorVerbo[id].verbo })),
      });
    }

    // ---------- NIVEL 2: 8 verbos (4 parejas) x 6 tiempos, 2 lecciones cada uno ----------
    const nivel2ByVerbTense = {}; // `${verbId}__${tenseRaw}` -> [frases]
    level2Raw.forEach(x => {
      const key = `${slugify(x.verb)}__${x.tense}`;
      if (!nivel2ByVerbTense[key]) nivel2ByVerbTense[key] = [];
      nivel2ByVerbTense[key].push({
        es: x.promptEs, en: x.translationEn, tiempo: TENSE_ES[x.tense] || x.tense,
        tenseRaw: x.tense, audio: null, imagen: x.imageUrl || null,
      });
    });
    const nivel2PoolGlobal = level2Raw.map(x => x.translationEn);

    // ---------- NIVEL 3: 8 estructuras avanzadas ----------
    const nivel3PorEstructura = {};
    level3Raw.forEach(x => {
      const id = slugify(x.verb);
      if (!nivel3PorEstructura[id]) nivel3PorEstructura[id] = { id, nombre: NIVEL3_NOMBRES_ES[x.verb] || x.verb, frases: [] };
      nivel3PorEstructura[id].frases.push({
        es: x.promptEs, en: x.translationEn, tiempo: NIVEL3_NOMBRES_ES[x.tense] || x.tense,
        tenseRaw: x.tense, audio: null, imagen: x.imageUrl || null,
      });
    });
    const nivel3PoolGlobal = level3Raw.map(x => x.translationEn);
    const ordenEstructuras3 = [];
    level3Raw.forEach(x => { const id = slugify(x.verb); if (!ordenEstructuras3.includes(id)) ordenEstructuras3.push(id); });

    // ---------- PAQUETES ----------
    const paquetesConFrases = {};
    Object.keys(pkgPhrases).forEach(pid => {
      if (pid === '_note') return;
      paquetesConFrases[pid] = pkgPhrases[pid].map(p => ({ es: p.promptEs, en: p.answerEn }));
    });

    return {
      curso,
      // El libro existe por idioma (data/book_content<sufijo>.json) — si no se ha
      // traducido todavía, la carga simplemente devuelve null y el curso sigue
      // funcionando normal, solo sin libro. Los paquetes con frases propias
      // todavía solo existen en inglés (contenido real de la app móvil).
      libroDisponible: !!bookChaptersRaw,
      paquetesConTextoDisponible: curso.id === 'en',
      nivel1: { porVerbo: nivel1PorVerbo, bloques: nivel1Bloques, poolGlobal: nivel1PoolGlobal, orden: ordenVerbos1 },
      nivel2: { byVerbTense: nivel2ByVerbTense, poolGlobal: nivel2PoolGlobal },
      nivel3: { porEstructura: nivel3PorEstructura, orden: ordenEstructuras3, poolGlobal: nivel3PoolGlobal },
      bookQuiz,
      bookChapters: bookChaptersRaw || [],
      pkgCatalog,
      paquetesConFrases: curso.id === 'en' ? paquetesConFrases : {},
      shopCatalog,
      roleplayScenarios,
      storyPackages,
    };
  })();

  return _contentPromises[curso.id];
}
