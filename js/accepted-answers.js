/* ===========================================================
   DELPHIS METHOD — CORRECCIÓN COLECTIVA DE RESPUESTAS (real)
   Firebase Realtime Database COMPARTIDA con la app móvil real
   (proyecto delphis-55733 — ver web_export/PROMPT.md §10), con
   una única rama abierta (`accepted_answers`), igual para app y web.
   Mismo proyecto/app que inicializa js/auth.js (FIREBASE_CONFIG) —
   dos productos de Firebase distintos (Realtime Database aquí,
   Firestore allá) sobre la misma app, no dos proyectos separados.
   =========================================================== */

let aaDb = null;
try {
  aaDb = firebase.app().database();
} catch (e) {
  console.warn('No se pudo conectar a la base de datos de correcciones compartidas:', e.message);
}

// Algoritmo EXACTO de la app móvil (lib/core/answer_normalizer.dart) — si la
// web normaliza distinto, las claves nunca coincidirán entre plataformas.
function normalizeForAcceptedAnswers(value) {
  const accentMap = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };
  let s = (value || '').toLowerCase().trim();
  for (const [accented, plain] of Object.entries(accentMap)) {
    s = s.replaceAll(accented, plain);
  }
  return s
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const AA_LOCAL_KEY = 'delphis_accepted_answers_local_v1';

function aaLoadLocal() {
  try { return JSON.parse(localStorage.getItem(AA_LOCAL_KEY)) || {}; } catch (e) { return {}; }
}
function aaSaveLocal(data) {
  localStorage.setItem(AA_LOCAL_KEY, JSON.stringify(data));
}

// { [targetNormalizado]: Set<string> } — en memoria, para lookups síncronos instantáneos
let acceptedAnswers = {};
let acceptedAnswersReady = false;

function mergeIntoMemory(target, heardSet) {
  if (!acceptedAnswers[target]) acceptedAnswers[target] = new Set();
  heardSet.forEach(h => acceptedAnswers[target].add(h));
}

// Arranca en segundo plano al cargar cualquier página, sin bloquear el primer
// render — si falla por red, la app sigue igual, solo sin este extra.
async function loadAcceptedAnswers() {
  // Copia local primero (funciona sin red, con lo que este navegador ya aceptó antes)
  const local = aaLoadLocal();
  Object.entries(local).forEach(([target, arr]) => mergeIntoMemory(target, new Set(arr)));

  if (!aaDb) { acceptedAnswersReady = true; return; }
  try {
    const snapshot = await aaDb.ref('accepted_answers').get();
    if (snapshot.exists()) {
      const raw = snapshot.val();
      Object.entries(raw).forEach(([target, heardMap]) => {
        const heard = new Set(Object.keys(heardMap).filter(k => heardMap[k] === true));
        mergeIntoMemory(target, heard);
      });
    }
  } catch (e) {
    // sin red / sin Firebase: seguimos con lo que ya había en memoria, sin romper nada
  }
  acceptedAnswersReady = true;
}

function isAcceptedAlternate(target, heard) {
  const t = normalizeForAcceptedAnswers(target);
  const h = normalizeForAcceptedAnswers(heard);
  if (!h) return false;
  return acceptedAnswers[t] ? acceptedAnswers[t].has(h) : false;
}

// Botón "➕ Añadir como respuesta válida": acepta al instante en memoria (y en
// este navegador), y en segundo plano la comparte con todos en Firebase.
async function submitAlternate(target, heard) {
  const t = normalizeForAcceptedAnswers(target);
  const h = normalizeForAcceptedAnswers(heard);
  if (!h || h === t) return;

  mergeIntoMemory(t, new Set([h]));

  const local = aaLoadLocal();
  local[t] = [...(local[t] || []), h].filter((v, i, arr) => arr.indexOf(v) === i);
  aaSaveLocal(local);

  if (!aaDb) return;
  try {
    await aaDb.ref(`accepted_answers/${t}/${h}`).set(true);
  } catch (e) {
    // un fallo de red aquí nunca debe ser visible para el usuario
  }
}

loadAcceptedAnswers();
