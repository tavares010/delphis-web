/* ===========================================================
   DELPHIS METHOD — PROGRESO, GAMIFICACIÓN Y CURRÍCULO DESBLOQUEADO
   Todo persiste en este navegador (localStorage). Sin cuentas ni backend.
   =========================================================== */

const PROGRESS_KEY = 'delphis_progress_v1';
const CURRICULUM_KEY = 'delphis_curriculum_v1';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function progressDefault() {
  return {
    puntos: 0,
    monedas: 0,
    avatar: '🦊',
    nombre: 'Estudiante',
    tema: 'theme_classic',
    temasComprados: ['theme_classic'],
    marco: null,
    marcosComprados: [],
    tituloId: null,
    titulosComprados: [],
    titulo: 'Estudiante de Delphis',
    racha: 0,
    ultimoDiaActivo: null,
    statsHoy: { fecha: todayStr(), aciertos: 0, palabrasConsultadas: 0 },
    statsSemana: { aciertos: 0 },
    retosReclamados: [], // ids de retos ya reclamados hoy (se resetea con statsHoy.fecha)
  };
}

function progressLoad() {
  let data;
  try {
    data = JSON.parse(localStorage.getItem(PROGRESS_KEY));
  } catch (e) {
    data = null;
  }
  // Combina con los valores por defecto en vez de reemplazar del todo — así
  // el progreso guardado con una versión anterior (a la que le falten campos
  // nuevos, como temasComprados o marco) se completa solo, sin borrar nada.
  data = { ...progressDefault(), ...(data && typeof data === 'object' ? data : {}) };

  // reset diario de stats/retos si cambió el día
  if (!data.statsHoy || data.statsHoy.fecha !== todayStr()) {
    data.statsHoy = { fecha: todayStr(), aciertos: 0, palabrasConsultadas: 0 };
    data.retosReclamados = [];
  }
  return data;
}

function progressSave(data) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
}

function getRankInfo(puntos) {
  let actual = RANGOS[0];
  let siguiente = RANGOS[1] || null;
  for (let i = 0; i < RANGOS.length; i++) {
    if (puntos >= RANGOS[i].min) {
      actual = RANGOS[i];
      siguiente = RANGOS[i + 1] || null;
    }
  }
  const rangoIndex = RANGOS.indexOf(actual);
  let progresoPct = 100;
  if (siguiente) {
    progresoPct = Math.min(100, Math.round(((puntos - actual.min) / (siguiente.min - actual.min)) * 100));
  }
  return { actual, siguiente, rangoIndex, progresoPct };
}

// Suma puntos por una respuesta correcta en el juego.
// tiempoSegundos: tiempo que tardó en responder (bonus de velocidad).
function addGamePoints(tiempoSegundos) {
  const data = progressLoad();
  const { rangoIndex } = getRankInfo(data.puntos);
  const base = 10 + rangoIndex * 2;
  let bonusVelocidad = 0;
  if (tiempoSegundos <= 3) bonusVelocidad = 10;
  else if (tiempoSegundos <= 6) bonusVelocidad = 6;
  else if (tiempoSegundos <= 10) bonusVelocidad = 3;

  const puntosAntes = data.puntos;
  const rankAntes = getRankInfo(puntosAntes).actual.nombre;
  data.puntos += base + bonusVelocidad;

  let subioDeRango = false;
  const rankDespues = getRankInfo(data.puntos).actual.nombre;
  if (rankDespues !== rankAntes) {
    data.puntos += 50;
    subioDeRango = true;
  }

  data.statsHoy.aciertos += 1;
  data.statsSemana.aciertos += 1;
  progressSave(data);
  return { ganados: base + bonusVelocidad + (subioDeRango ? 50 : 0), subioDeRango, data };
}

function addCoins(cantidad) {
  const data = progressLoad();
  data.monedas += cantidad;
  progressSave(data);
  return data;
}

function spendCoins(cantidad) {
  const data = progressLoad();
  if (data.monedas < cantidad) return false;
  data.monedas -= cantidad;
  progressSave(data);
  return true;
}

function registerWordConsulted() {
  const data = progressLoad();
  data.statsHoy.palabrasConsultadas += 1;
  progressSave(data);
}

// Llamar una vez por sesión de estudio (cualquier acierto) para actualizar la racha diaria
function touchStreak() {
  const data = progressLoad();
  const today = todayStr();
  if (data.ultimoDiaActivo === today) return data.racha;

  if (data.ultimoDiaActivo) {
    const prev = new Date(data.ultimoDiaActivo);
    const diffDays = Math.round((new Date(today) - prev) / 86400000);
    data.racha = diffDays === 1 ? data.racha + 1 : 1;
  } else {
    data.racha = 1;
  }
  data.ultimoDiaActivo = today;
  progressSave(data);
  return data.racha;
}

// Compra/equipa un ítem real de shop_catalog.json. tipo: 'theme' | 'frame' | 'title'.
function comprarItemTienda(item) {
  const data = progressLoad();
  const campoComprados = { theme: 'temasComprados', frame: 'marcosComprados', title: 'titulosComprados' }[item.type];
  const campoActivo = { theme: 'tema', frame: 'marco', title: 'tituloId' }[item.type];
  if (!campoComprados) return false;
  if (!data[campoComprados]) data[campoComprados] = [];

  const yaComprado = data[campoComprados].includes(item.id);
  if (!yaComprado) {
    if (data.monedas < item.price) return false;
    data.monedas -= item.price;
    data[campoComprados].push(item.id);
  }
  data[campoActivo] = item.id;
  if (item.type === 'title') data.titulo = item.name;
  progressSave(data);
  return true;
}

function quitarMarco() {
  const data = progressLoad();
  data.marco = null;
  progressSave(data);
}

function setAvatar(emoji) {
  const data = progressLoad();
  data.avatar = emoji;
  progressSave(data);
}

function setNombre(nombre) {
  const data = progressLoad();
  data.nombre = nombre || 'Estudiante';
  progressSave(data);
}

// ---------- Currículo: qué lecciones/repasos/capítulos completó el usuario ----------
// Todo (verbos de los 3 niveles y paquetes) vive bajo `lecciones`, con ids
// globalmente únicos (`n1-to-be`, `n2-to-be-present-simple-1`, `n3-...`, `pkg-hosteleria`).
// Cada curso/idioma (js/courses.js) tiene su propio currículo — el progreso en
// francés no tiene nada que ver con el de inglés.
function cursoIdActivo() {
  return (typeof getCursoActivo === 'function') ? getCursoActivo().id : 'en';
}

function curriculumLoadAll() {
  let all;
  try {
    all = JSON.parse(localStorage.getItem(CURRICULUM_KEY));
  } catch (e) {
    all = null;
  }
  if (!all || typeof all !== 'object') all = {};
  // Migración: versión anterior (mono-idioma) guardaba `lecciones`/`repasos`/
  // `libro` directamente en la raíz. Si aparece esa forma vieja, se mueve una
  // sola vez a `en` (el idioma que existía entonces) sin perder nada.
  if (all.lecciones || all.repasos || all.libro) {
    all.en = { lecciones: all.lecciones || {}, repasos: all.repasos || {}, libro: all.libro || {} };
    delete all.lecciones; delete all.repasos; delete all.libro;
  }
  return all;
}

function curriculumLoad() {
  const all = curriculumLoadAll();
  const cursoId = cursoIdActivo();
  let d = all[cursoId];
  if (!d || typeof d !== 'object') d = {};
  if (!d.lecciones) d.lecciones = {};
  if (!d.repasos) d.repasos = {};
  if (!d.libro) d.libro = {};
  return d;
}

function curriculumSave(data) {
  const all = curriculumLoadAll();
  all[cursoIdActivo()] = data;
  localStorage.setItem(CURRICULUM_KEY, JSON.stringify(all));
}

function leccionEstado(id) {
  const data = curriculumLoad();
  return (data.lecciones && data.lecciones[id]) || { estudiado: false, quizAprobado: false, jugado: false };
}

function marcarLeccionEstudiada(id) {
  const data = curriculumLoad();
  data.lecciones[id] = { ...leccionEstado(id), estudiado: true };
  curriculumSave(data);
}

function marcarLeccionQuizAprobado(id) {
  const data = curriculumLoad();
  data.lecciones[id] = { ...leccionEstado(id), quizAprobado: true };
  curriculumSave(data);
}

function marcarLeccionJugada(id) {
  const data = curriculumLoad();
  data.lecciones[id] = { ...leccionEstado(id), jugado: true };
  curriculumSave(data);
}

// Alias de paquetes (mismo almacén que las lecciones, con id `pkg-<id>`)
function paqueteEstado(id) { return leccionEstado(`pkg-${id}`); }
function marcarPaqueteEstudiado(id) { marcarLeccionEstudiada(`pkg-${id}`); }
function marcarPaqueteQuizAprobado(id) { marcarLeccionQuizAprobado(`pkg-${id}`); }
function marcarPaqueteJugado(id) { marcarLeccionJugada(`pkg-${id}`); }

function repasoHecho(id) {
  const data = curriculumLoad();
  return !!(data.repasos && data.repasos[id]);
}

function marcarRepasoHecho(id) {
  const data = curriculumLoad();
  if (!data.repasos) data.repasos = {};
  data.repasos[id] = true;
  curriculumSave(data);
}

function libroLeido(capIndex) {
  const data = curriculumLoad();
  return !!(data.libro && data.libro[capIndex]);
}

function marcarLibroLeido(capIndex) {
  const data = curriculumLoad();
  if (!data.libro) data.libro = {};
  data.libro[capIndex] = true;
  curriculumSave(data);
}

// Estado de cada nodo de un camino (array plano de nodos de un nivel):
// 'completo' | 'actual' | 'bloqueado'
function estaHecho(nodo) {
  if (nodo.tipo === 'leccion') return leccionEstado(nodo.id).quizAprobado;
  if (nodo.tipo === 'repaso') return repasoHecho(nodo.id);
  if (nodo.tipo === 'libro') return libroLeido(nodo.capIndex);
  return false;
}

function estadoCamino(camino) {
  const estados = [];
  // Modo desarrollador (js/auth.js): sin bloqueo secuencial, cualquier nodo
  // se puede abrir directamente — solo cambia si se ve como completado o no.
  if (typeof DEV_MODE !== 'undefined' && DEV_MODE) {
    camino.forEach(nodo => estados.push(estaHecho(nodo) ? 'completo' : 'actual'));
    return estados;
  }

  let bloqueado = false;
  camino.forEach((nodo) => {
    if (bloqueado) { estados.push('bloqueado'); return; }
    const hecho = estaHecho(nodo);
    if (hecho) estados.push('completo');
    else { estados.push('actual'); bloqueado = true; }
  });
  return estados;
}

function nivelCompleto(camino) {
  if (!camino.length) return false;
  return estadoCamino(camino).every(e => e === 'completo');
}

// Siguiente nodo no completado de un camino (para el botón "Continuar")
function siguienteNodoDe(camino) {
  const estados = estadoCamino(camino);
  const idx = estados.findIndex(e => e === 'actual');
  if (idx === -1) return null;
  return camino[idx];
}

// Índice (0-based) del nodo "actual" dentro de un camino, o -1 si ya se completó todo
function indiceActual(camino) {
  const estados = estadoCamino(camino);
  return estados.findIndex(e => e === 'actual');
}
