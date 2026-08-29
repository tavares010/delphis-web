/* ===========================================================
   DELPHIS METHOD — MOTOR DE REPETICIÓN ESPACIADA (Leitner, 6 niveles)
   Palabras que el usuario toca mientras lee entran aquí.
   Nivel 0-5. Acierto sube de nivel y aleja el repaso. Fallo baja
   de nivel y acerca el repaso.
   =========================================================== */

const SRS_KEY = 'delphis_srs_v1';

// Intervalos al subir de nivel (en minutos) — nivel 0→1, 1→2, ... 4→5
const SRS_INTERVALOS_MIN = [10, 60, 360, 1440, 4320, 10080]; // 10min,1h,6h,1d,3d,7d

// El vocabulario de repaso también es por curso/idioma (js/courses.js) —
// las palabras de francés no deben mezclarse con las de inglés.
function srsLoadAll() {
  let all;
  try {
    all = JSON.parse(localStorage.getItem(SRS_KEY));
  } catch (e) {
    all = null;
  }
  if (!all || typeof all !== 'object') return {};
  // Migración: la versión mono-idioma guardaba las palabras directamente en
  // la raíz (clave = palabra, valor = entrada con `nivel`). La forma nueva
  // tiene un nivel de anidado más (clave = curso, valor = mapa de palabras),
  // así que lo distinguimos mirando la FORMA de los valores, no las claves
  // (una clave de palabra podría coincidir por casualidad con un id de curso).
  const values = Object.values(all);
  const looksOld = values.length > 0 && values.every(v => v && typeof v === 'object' && typeof v.nivel === 'number');
  return looksOld ? { en: all } : all;
}

function srsLoad() {
  const all = srsLoadAll();
  const cursoId = (typeof getCursoActivo === 'function') ? getCursoActivo().id : 'en';
  return all[cursoId] || {};
}

function srsSave(data) {
  const all = srsLoadAll();
  const cursoId = (typeof getCursoActivo === 'function') ? getCursoActivo().id : 'en';
  all[cursoId] = data;
  localStorage.setItem(SRS_KEY, JSON.stringify(all));
}

function srsNormalize(str) {
  return str.trim().toLowerCase();
}

// Agrega una palabra nueva (si no existe) al sistema
function srsAddWord(en, es) {
  const data = srsLoad();
  const key = srsNormalize(en);
  if (data[key]) return data[key];
  const now = Date.now();
  data[key] = {
    en, es, nivel: 0,
    aciertos: 0, fallos: 0,
    creada: now,
    ultimoRepaso: null,
    proximoRepaso: now, // disponible de inmediato la primera vez
  };
  srsSave(data);
  return data[key];
}

function srsGetWord(en) {
  const data = srsLoad();
  return data[srsNormalize(en)] || null;
}

function srsAllWords() {
  const data = srsLoad();
  return Object.values(data);
}

// Palabras cuyo repaso ya venció, ordenadas por más vencidas primero
function srsDueWords() {
  const now = Date.now();
  return srsAllWords()
    .filter(w => w.proximoRepaso <= now)
    .sort((a, b) => a.proximoRepaso - b.proximoRepaso);
}

function srsCount() {
  return srsAllWords().length;
}

// Registra el resultado de un repaso: sube o baja de nivel y recalcula el próximo repaso
function srsReview(en, correcto) {
  const data = srsLoad();
  const key = srsNormalize(en);
  const word = data[key];
  if (!word) return null;

  const now = Date.now();
  word.ultimoRepaso = now;

  if (correcto) {
    word.aciertos += 1;
    word.nivel = Math.min(5, word.nivel + 1);
    const minutos = SRS_INTERVALOS_MIN[Math.max(0, word.nivel - 1)];
    word.proximoRepaso = now + minutos * 60 * 1000;
  } else {
    word.fallos += 1;
    word.nivel = Math.max(0, word.nivel - 1);
    const minutos = 5 + word.nivel * 2;
    word.proximoRepaso = now + minutos * 60 * 1000;
  }

  data[key] = word;
  srsSave(data);
  return word;
}

// La corrección colectiva de respuestas ("➕ añadir como válida") vive en
// js/accepted-answers.js — conectada a la base de datos real y compartida
// con la app móvil (Firebase Realtime Database, proyecto delphis-55733).
