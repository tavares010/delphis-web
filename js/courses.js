/* ===========================================================
   DELPHIS METHOD — CURSO (idioma)
   La app enseña un único idioma de destino: inglés. Hubo soporte
   multi-idioma (francés/alemán/italiano/portugués) que se quitó por
   completo -este array se queda con 1 solo curso a propósito, no es un
   descuido. getCursoActivo()/aplicarTemaCurso() se dejan tal cual:
   funcionan igual con 1 curso que con varios, no hacía falta reescribirlos.
   =========================================================== */
const CURSOS = [
  { id: 'en', nombre: 'Inglés', bandera: '🇬🇧', speechLang: 'en-US', sufijo: '', disponible: true, colorA: '#0369a1', colorB: '#0ea5e9' },
];

const CURSO_ACTIVO_KEY = 'delphis_curso_activo';

function getCursoActivo() {
  const id = localStorage.getItem(CURSO_ACTIVO_KEY);
  return CURSOS.find(c => c.id === id) || CURSOS[0];
}

// Repinta el acento de marca de toda la app (botones, badges, barras de
// progreso...) con el color del curso activo — todo eso ya usa
// var(--blue-500)/var(--cyan-400)/var(--cyan-300), así que sobreescribir
// estas 3 variables en :root basta, sin tocar ni un selector de CSS.
function aplicarTemaCurso(curso) {
  const c = curso || getCursoActivo();
  const root = document.documentElement.style;
  root.setProperty('--blue-500', c.colorA);
  root.setProperty('--blue-400', c.colorA);
  root.setProperty('--cyan-400', c.colorB);
  root.setProperty('--cyan-300', c.colorB);
}

function setCursoActivo(id) {
  if (!CURSOS.find(c => c.id === id)) return;
  localStorage.setItem(CURSO_ACTIVO_KEY, id);
  aplicarTemaCurso(cursoPorId(id));
}

function cursoPorId(id) {
  return CURSOS.find(c => c.id === id) || CURSOS[0];
}

// Se aplica en cuanto carga el script, en toda página que lo incluya —
// así el color de marca ya es el correcto antes de pintar nada más.
aplicarTemaCurso();
