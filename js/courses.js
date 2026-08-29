/* ===========================================================
   DELPHIS METHOD — CURSOS (idiomas)
   El mismo método y el mismo currículo (Nivel 1/2/3), en varios
   idiomas de destino. El español de los prompts es siempre el
   mismo — lo que cambia es el idioma que se está aprendiendo.
   =========================================================== */

const CURSOS = [
  { id: 'en', nombre: 'Inglés', bandera: '🇬🇧', speechLang: 'en-US', sufijo: '', disponible: true },
  { id: 'fr', nombre: 'Francés', bandera: '🇫🇷', speechLang: 'fr-FR', sufijo: '_fr', disponible: true },
  { id: 'de', nombre: 'Alemán', bandera: '🇩🇪', speechLang: 'de-DE', sufijo: '_de', disponible: true },
  { id: 'it', nombre: 'Italiano', bandera: '🇮🇹', speechLang: 'it-IT', sufijo: '_it', disponible: true },
  { id: 'pt', nombre: 'Portugués', bandera: '🇵🇹', speechLang: 'pt-PT', sufijo: '_pt', disponible: true },
];

const CURSO_ACTIVO_KEY = 'delphis_curso_activo';

function getCursoActivo() {
  const id = localStorage.getItem(CURSO_ACTIVO_KEY);
  return CURSOS.find(c => c.id === id) || CURSOS[0];
}

function setCursoActivo(id) {
  if (!CURSOS.find(c => c.id === id)) return;
  localStorage.setItem(CURSO_ACTIVO_KEY, id);
}

function cursoPorId(id) {
  return CURSOS.find(c => c.id === id) || CURSOS[0];
}
