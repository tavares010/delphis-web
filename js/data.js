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

// Qué tiempos se confunden entre sí de verdad (pedagogía estándar de inglés)
// — usado para que los distractores del quiz prioricen la opción más dura
// de distinguir, en vez de una cualquiera al azar.
const TENSE_CONFUSION = {
  'Present simple': ['Present continuous', 'Present perfect'],
  'Present continuous': ['Present simple', 'Going to'],
  'Past simple': ['Present perfect', 'Going to'],
  'Present perfect': ['Past simple', 'Present simple'],
  'Going to': ['Future simple', 'Present continuous'],
  'Future simple': ['Going to', 'Present perfect'],
};

// Lo mismo pero para las 8 estructuras de Nivel 3 — qué estructura se
// confunde con cuál (los condicionales entre sí por cercanía, y los 3
// tiempos avanzados sueltos con el condicional/perfecto más parecido).
const ESTRUCTURA_CONFUSION = {
  'Zero Conditional': ['First Conditional'],
  'First Conditional': ['Zero Conditional', 'Second Conditional'],
  'Second Conditional': ['First Conditional', 'Third Conditional', 'Mixed Conditional'],
  'Third Conditional': ['Second Conditional', 'Mixed Conditional'],
  'Mixed Conditional': ['Second Conditional', 'Third Conditional'],
  'Present Perfect Continuous': ['Past Perfect'],
  'Past Perfect': ['Present Perfect Continuous'],
  'Future Continuous': ['Present Perfect Continuous'],
};

// El campo `verb` de los JSON (p.ej. "to be") es un identificador ESTABLE en
// inglés que no se toca — de él sale el slug/id usado para el progreso, SRS
// y el agrupado por verbo, igual en los 5 idiomas. Esta tabla solo traduce
// el NOMBRE que se muestra al usuario cuando el curso activo no es inglés
// (si no, un curso de francés mostraría "to be" en vez de "être").
const VERBOS_POR_IDIOMA = {
  fr: {
    "to be": "être", "to have": "avoir", "to can": "pouvoir", "to know": "savoir",
    "to want": "vouloir", "to need": "avoir besoin", "to go": "aller", "to do": "faire",
    "to get": "obtenir", "to make": "faire", "to follow": "suivre", "to take": "prendre",
    "to begin": "commencer", "to come": "venir", "to give": "donner", "to use": "utiliser",
    "to find": "trouver", "to tell": "dire", "to listen": "écouter", "to organize": "organiser",
    "to become": "devenir", "to leave": "partir", "to work": "travailler", "to feel": "ressentir",
    "to fly": "voler", "to ask": "demander", "to marry": "se marier", "to try": "essayer",
    "to run": "courir", "to remain": "rester", "to show": "montrer", "to fall": "tomber",
    "to hold": "tenir", "to apply": "appliquer", "to see": "voir", "to let": "laisser",
    "to bring": "apporter", "to like": "aimer", "to help": "aider", "to start": "commencer",
    "to call": "appeler", "to forget": "oublier", "to avoid": "éviter", "to move": "bouger",
    "to play": "jouer", "to pay": "payer", "to hear": "entendre", "to believe": "croire",
    "to allow": "permettre", "to sit": "s'asseoir", "to suffer": "souffrir", "to lead": "mener",
    "to live": "vivre", "to meet": "rencontrer", "to carry": "porter", "to think": "penser",
    "to write": "écrire", "to finish": "finir", "to expect": "s'attendre", "to share": "partager",
    "to talk": "parler", "to read": "lire", "to lose": "perdre", "to speak": "parler",
  },
  de: {
    "to be": "sein", "to have": "haben", "to can": "können", "to know": "wissen",
    "to want": "wollen", "to need": "brauchen", "to go": "gehen", "to do": "tun",
    "to get": "bekommen", "to make": "machen", "to follow": "folgen", "to take": "nehmen",
    "to begin": "beginnen", "to come": "kommen", "to give": "geben", "to use": "benutzen",
    "to find": "finden", "to tell": "sagen", "to listen": "hören", "to organize": "organisieren",
    "to become": "werden", "to leave": "verlassen", "to work": "arbeiten", "to feel": "fühlen",
    "to fly": "fliegen", "to ask": "fragen", "to marry": "heiraten", "to try": "versuchen",
    "to run": "laufen", "to remain": "bleiben", "to show": "zeigen", "to fall": "fallen",
    "to hold": "halten", "to apply": "anwenden", "to see": "sehen", "to let": "lassen",
    "to bring": "bringen", "to like": "mögen", "to help": "helfen", "to start": "anfangen",
    "to call": "rufen", "to forget": "vergessen", "to avoid": "vermeiden", "to move": "bewegen",
    "to play": "spielen", "to pay": "zahlen", "to hear": "hören", "to believe": "glauben",
    "to allow": "erlauben", "to sit": "sitzen", "to suffer": "leiden", "to lead": "führen",
    "to live": "leben", "to meet": "treffen", "to carry": "tragen", "to think": "denken",
    "to write": "schreiben", "to finish": "beenden", "to expect": "erwarten", "to share": "teilen",
    "to talk": "sprechen", "to read": "lesen", "to lose": "verlieren", "to speak": "sprechen",
  },
  it: {
    "to be": "essere", "to have": "avere", "to can": "potere", "to know": "sapere",
    "to want": "volere", "to need": "dovere", "to go": "andare", "to do": "fare",
    "to get": "ottenere", "to make": "fare", "to follow": "seguire", "to take": "prendere",
    "to begin": "iniziare", "to come": "venire", "to give": "dare", "to use": "usare",
    "to find": "trovare", "to tell": "dire", "to listen": "ascoltare", "to organize": "organizzare",
    "to become": "diventare", "to leave": "partire", "to work": "lavorare", "to feel": "sentire",
    "to fly": "volare", "to ask": "chiedere", "to marry": "sposare", "to try": "provare",
    "to run": "correre", "to remain": "rimanere", "to show": "mostrare", "to fall": "cadere",
    "to hold": "tenere", "to apply": "applicare", "to see": "vedere", "to let": "lasciare",
    "to bring": "portare", "to like": "piacere", "to help": "aiutare", "to start": "iniziare",
    "to call": "chiamare", "to forget": "dimenticare", "to avoid": "evitare", "to move": "muovere",
    "to play": "giocare", "to pay": "pagare", "to hear": "udire", "to believe": "credere",
    "to allow": "permettere", "to sit": "sedere", "to suffer": "soffrire", "to lead": "guidare",
    "to live": "vivere", "to meet": "incontrare", "to carry": "portare", "to think": "pensare",
    "to write": "scrivere", "to finish": "finire", "to expect": "aspettare", "to share": "condividere",
    "to talk": "parlare", "to read": "leggere", "to lose": "perdere", "to speak": "parlare",
  },
  pt: {
    "to be": "ser", "to have": "ter", "to can": "poder", "to know": "saber",
    "to want": "querer", "to need": "precisar", "to go": "ir", "to do": "fazer",
    "to get": "obter", "to make": "fazer", "to follow": "seguir", "to take": "levar",
    "to begin": "começar", "to come": "vir", "to give": "dar", "to use": "usar",
    "to find": "encontrar", "to tell": "contar", "to listen": "ouvir", "to organize": "organizar",
    "to become": "tornar", "to leave": "deixar", "to work": "trabalhar", "to feel": "sentir",
    "to fly": "voar", "to ask": "perguntar", "to marry": "casar", "to try": "tentar",
    "to run": "correr", "to remain": "permanecer", "to show": "mostrar", "to fall": "cair",
    "to hold": "manter", "to apply": "aplicar", "to see": "ver", "to let": "deixar",
    "to bring": "trazer", "to like": "gostar", "to help": "ajudar", "to start": "começar",
    "to call": "chamar", "to forget": "esquecer", "to avoid": "evitar", "to move": "mover",
    "to play": "jogar", "to pay": "pagar", "to hear": "ouvir", "to believe": "acreditar",
    "to allow": "permitir", "to sit": "sentar", "to suffer": "sofrer", "to lead": "conduzir",
    "to live": "viver", "to meet": "encontrar", "to carry": "carregar", "to think": "pensar",
    "to write": "escrever", "to finish": "terminar", "to expect": "esperar", "to share": "compartilhar",
    "to talk": "falar", "to read": "ler", "to lose": "perder", "to speak": "falar",
  },
};

function traducirVerbo(verboEn, cursoId) {
  const tabla = VERBOS_POR_IDIOMA[cursoId];
  return (tabla && tabla[verboEn]) || verboEn;
}

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

function groupPhrasesByVerb(list, cursoId, variantsList) {
  const byVerb = {};
  // variantsList es un array disperso (algunas frases no tienen ninguna
  // variante útil y quedan fuera del todo) -indexado por su campo `index`,
  // NO por la posición dentro del array, así que se busca por id, nunca
  // por variantsList[i] directo.
  const variantsById = {};
  if (variantsList) variantsList.forEach(v => { variantsById[v.index] = v; });
  list.forEach((item, i) => {
    const id = slugify(item.verb);
    if (!byVerb[id]) byVerb[id] = { id, verbo: traducirVerbo(item.verb, cursoId), frases: [] };
    const entry = variantsById[i];
    const variantes = entry && entry.variants;
    byVerb[id].frases.push({
      es: item.promptEs,
      en: item.translationEn,
      tiempo: TENSE_ES[item.tense] || item.tense,
      tenseRaw: item.tense,
      audio: item.audioAsset ? WEB_EXPORT_BASE + item.audioAsset : null,
      imagen: item.imageUrl || null,
      variantesTiempo: variantes || null,
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

// Distractores que PRIORIZAN el par más confuso de verdad (Nivel 1 y 3):
// dentro del pool ya real (mismo verbo en Nivel 1, estructuras cercanas
// en Nivel 3), pone primero los candidatos cuya "clave de confusión"
// (tiempo verbal o estructura) está en TENSE_CONFUSION/ESTRUCTURA_CONFUSION
// para la frase correcta, antes que el resto del pool o el pool global.
function buildDistractoresConfusion(frase, pool, poolGlobal, groupKeyFn, confusionMap, max = 2) {
  const claveCorrecta = groupKeyFn(frase);
  const confusables = new Set((confusionMap[claveCorrecta] || []));
  const candidatos = pool.filter(f => f.en !== frase.en);
  const prioritarios = candidatos.filter(f => confusables.has(groupKeyFn(f)));
  const resto = candidatos.filter(f => !confusables.has(groupKeyFn(f)));

  let opciones = shuffleArr(prioritarios).slice(0, max).map(f => f.en);
  if (opciones.length < max) {
    const extra = shuffleArr(resto).map(f => f.en).filter(en => !opciones.includes(en));
    opciones = opciones.concat(extra.slice(0, max - opciones.length));
  }
  if (opciones.length < max && poolGlobal) {
    const extra = shuffleArr(poolGlobal.filter(en => en !== frase.en && !opciones.includes(en)));
    opciones = opciones.concat(extra.slice(0, max - opciones.length));
  }
  return opciones;
}

// Distractores de PAR MÍNIMO (solo Nivel 2): la EXACTA misma frase base,
// solo con el tiempo verbal cambiado (p.ej. correcta "Are you being kind?"
// -> distractores "Have you been kind?" / "Were you kind?" / "Will you be
// kind?"). Posible porque los datos reales de Nivel 2 están alineados por
// posición entre los 6 tiempos del mismo verbo (ver `idx` en data.js). Si
// por lo que sea no hay suficientes (verbo/tiempo sin datos), rellena con
// el distractor normal de mismo-verbo como red de seguridad.
function buildDistractoresParalelo(frase, content, todasLasFrasesDelGrupo, poolGlobal, max = 2) {
  if (frase.idx == null || !frase.verboId) return buildDistractores(frase, todasLasFrasesDelGrupo, poolGlobal);
  const otrosTiempos = shuffleArr(Object.keys(TENSE_ES).filter(t => t !== frase.tenseRaw));
  const opciones = [];
  otrosTiempos.forEach(t => {
    if (opciones.length >= max) return;
    const arr = content.nivel2.byVerbTense[`${frase.verboId}__${t}`];
    const candidata = arr && arr[frase.idx];
    if (candidata && candidata.en !== frase.en && !opciones.includes(candidata.en)) opciones.push(candidata.en);
  });
  if (opciones.length < max) {
    const relleno = buildDistractores(frase, todasLasFrasesDelGrupo, poolGlobal)
      .filter(en => !opciones.includes(en));
    opciones.push(...relleno.slice(0, max - opciones.length));
  }
  return opciones;
}

// Distractores de PAR MÍNIMO generado (Nivel 1): a diferencia de Nivel 2,
// los datos reales de Nivel 1 no tienen la misma frase repetida en otro
// tiempo -cada frase es contenido distinto. Para tener el mismo truco
// pedagógico ahí, se generó por lotes (IA, ver PROMPT.md/scratchpad) la
// MISMA frase conjugada en 2 tiempos que de verdad se confunden con el
// suyo (TENSE_CONFUSION), guardado en data/level1_tense_variants.json.
// Si el idioma activo no tiene ese archivo todavía, cae al distractor de
// confusión normal (mismo verbo, tiempo confuso, frase real distinta).
function buildDistractoresGenerados(frase, pool, poolGlobal, max = 2) {
  if (!frase.variantesTiempo) {
    return buildDistractoresConfusion(frase, pool, poolGlobal, x => x.tenseRaw, TENSE_CONFUSION, max);
  }
  const opciones = shuffleArr(Object.values(frase.variantesTiempo)).slice(0, max);
  if (opciones.length < max) {
    const relleno = buildDistractoresConfusion(frase, pool, poolGlobal, x => x.tenseRaw, TENSE_CONFUSION, max)
      .filter(en => !opciones.includes(en));
    opciones.push(...relleno.slice(0, max - opciones.length));
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
    const [level1Raw, level2Raw, level3Raw, bookQuiz, bookChaptersRaw, pkgCatalog, pkgPhrases, shopCatalog, roleplayScenarios, storyPackages, level1Variants] = await Promise.all([
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
      // Variantes de tiempo verbal para distractores de par mínimo en Nivel 1
      // (ver buildDistractoresGenerados) — opcional, solo existe en inglés
      // por ahora; otros idiomas caen al distractor de confusión normal.
      loadJSONOptional(`data/level1_tense_variants${sufijo}.json`),
    ]);

    // ---------- NIVEL 1: 64 verbos agrupados en 8 bloques de 8 ----------
    const nivel1PorVerbo = groupPhrasesByVerb(level1Raw, curso.id, level1Variants);
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
      // `idx` = posición dentro de su propio grupo verbo+tiempo (0..14). Los
      // datos reales están alineados por posición entre tiempos del mismo
      // verbo (mismo sujeto/frase base, verificado con el contenido real:
      // idx 0 de "to be" es "¿Eres amable?"/"¿Eras amable?"/"¿Serás amable?"...
      // en los 6 tiempos) — eso es lo que permite distractores de par mínimo.
      nivel2ByVerbTense[key].push({
        es: x.promptEs, en: x.translationEn, tiempo: TENSE_ES[x.tense] || x.tense,
        tenseRaw: x.tense, audio: null, imagen: x.imageUrl || null,
        verboId: slugify(x.verb), idx: nivel2ByVerbTense[key].length,
      });
    });
    const nivel2PoolGlobal = level2Raw.map(x => x.translationEn);

    // ---------- NIVEL 3: 8 estructuras avanzadas ----------
    const nivel3PorEstructura = {};
    level3Raw.forEach(x => {
      const id = slugify(x.verb);
      if (!nivel3PorEstructura[id]) nivel3PorEstructura[id] = { id, nombre: NIVEL3_NOMBRES_ES[x.verb] || x.verb, raw: x.verb, frases: [] };
      nivel3PorEstructura[id].frases.push({
        es: x.promptEs, en: x.translationEn, tiempo: NIVEL3_NOMBRES_ES[x.tense] || x.tense,
        tenseRaw: x.tense, audio: null, imagen: x.imageUrl || null,
        estructuraId: id, estructuraRaw: x.verb,
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
