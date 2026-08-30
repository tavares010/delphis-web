/* ===========================================================
   DELPHIS METHOD — CURSOS (idiomas)
   El mismo método y el mismo currículo (Nivel 1/2/3), en varios
   idiomas de destino. El español de los prompts es siempre el
   mismo — lo que cambia es el idioma que se está aprendiendo.
   =========================================================== */

// Cada curso tiene su propio par de acento (a=principal, b=degradado) —
// pintan var(--blue-500)/var(--cyan-400) en tiempo real (ver aplicarTemaCurso)
// para que la app entera se sienta distinta según el idioma activo.
const CURSOS = [
  { id: 'en', nombre: 'Inglés', bandera: '🇬🇧', speechLang: 'en-US', sufijo: '', disponible: true, colorA: '#8b5cf6', colorB: '#c084fc' },
  { id: 'fr', nombre: 'Francés', bandera: '🇫🇷', speechLang: 'fr-FR', sufijo: '_fr', disponible: true, colorA: '#4f46e5', colorB: '#38bdf8' },
  { id: 'de', nombre: 'Alemán', bandera: '🇩🇪', speechLang: 'de-DE', sufijo: '_de', disponible: true, colorA: '#d97706', colorB: '#fbbf24' },
  { id: 'it', nombre: 'Italiano', bandera: '🇮🇹', speechLang: 'it-IT', sufijo: '_it', disponible: true, colorA: '#059669', colorB: '#a3e635' },
  { id: 'pt', nombre: 'Portugués', bandera: '🇵🇹', speechLang: 'pt-PT', sufijo: '_pt', disponible: true, colorA: '#e11d48', colorB: '#fb923c' },
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
