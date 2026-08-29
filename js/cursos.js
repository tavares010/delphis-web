/* ===========================================================
   DELPHIS METHOD — SELECTOR DE CURSO (cursos.html)
   =========================================================== */

const CURSO_DESCRIPCIONES = {
  en: 'El curso completo: 64 verbos, 16 estructuras, el libro "La Sed" y paquetes temáticos.',
  fr: '64 verbos y 16 estructuras traducidos al francés real. El libro y los paquetes llegan pronto.',
  de: '64 verbos y 16 estructuras traducidos al alemán real. El libro y los paquetes llegan pronto.',
  it: '64 verbos y 16 estructuras traducidos al italiano real. El libro y los paquetes llegan pronto.',
  pt: '64 verbos y 16 estructuras traducidos al portugués real. El libro y los paquetes llegan pronto.',
};

function cursoTieneProgreso(cursoId) {
  const all = curriculumLoadAll();
  const d = all[cursoId];
  return !!(d && d.lecciones && Object.keys(d.lecciones).length > 0);
}

function renderCursos() {
  const grid = document.getElementById('cursosGrid');
  const activo = getCursoActivo();
  grid.innerHTML = CURSOS.map(c => {
    const esActivo = c.id === activo.id;
    const enProgreso = cursoTieneProgreso(c.id);
    let badge = 'Empezar';
    if (esActivo) badge = 'Curso activo';
    else if (enProgreso) badge = 'Continuar';
    return `
      <div class="pack-card reveal-up visible ${esActivo ? 'equipped' : ''}" style="${esActivo ? 'border-color:rgba(56,189,248,.5); background:rgba(56,189,248,.05);' : ''}">
        <div class="pack-card__top">
          <div class="pack-card__icon" style="background:rgba(56,189,248,.12); font-size:2rem;">${c.bandera}</div>
          <span class="pack-card__status ${esActivo ? 'pack-card__status--live' : (enProgreso ? 'pack-card__status--live' : 'pack-card__status--soon')}">${badge}</span>
        </div>
        <h4>${c.nombre}</h4>
        <p>${CURSO_DESCRIPCIONES[c.id] || ''}</p>
        <div class="pack-card__cta">
          <button class="btn ${esActivo ? 'btn--outline' : 'btn--primary'} btn--block" data-curso="${c.id}">
            ${esActivo ? 'Ir al curso' : (enProgreso ? 'Continuar' : 'Empezar')}
          </button>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('button[data-curso]').forEach(btn => {
    btn.addEventListener('click', () => {
      setCursoActivo(btn.dataset.curso);
      location.href = 'curriculo.html';
    });
  });
}

initAuthUI({ protect: true, onReady: renderCursos });
