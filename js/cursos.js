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

const CURSO_COVER = {
  en: 'linear-gradient(135deg, #0ea5e9, #0369a1)',
  fr: 'linear-gradient(135deg, #818cf8, #4338ca)',
  de: 'linear-gradient(135deg, #fbbf24, #b45309)',
  it: 'linear-gradient(135deg, #34d399, #047857)',
  pt: 'linear-gradient(135deg, #fb7185, #be123c)',
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
    return `
      <div class="lang-card reveal-up visible ${esActivo ? 'equipped' : ''}">
        <div class="lang-card__cover" style="background:${CURSO_COVER[c.id] || CURSO_COVER.en};">
          <span class="lang-card__badge">3 niveles</span>
          ${esActivo ? '<span class="lang-card__status lang-card__status--live">Curso activo</span>'
            : (enProgreso ? '<span class="lang-card__status lang-card__status--new">Continuar</span>' : '')}
          <span class="lang-card__flag">${c.bandera}</span>
        </div>
        <div class="lang-card__body">
          <h4>${c.nombre}</h4>
          <p>${CURSO_DESCRIPCIONES[c.id] || ''}</p>
          <div class="lang-card__meta">
            <span>🔤 64 verbos</span>
            <span>🎓 8 estructuras avanzadas</span>
          </div>
          <div class="lang-card__foot">
            <span class="lang-card__price">Bloque 1 gratis<small>membresía desde $9/mes</small></span>
            <button class="btn ${esActivo ? 'btn--outline' : 'btn--primary'}" data-curso="${c.id}">
              ${esActivo ? 'Ir al curso' : (enProgreso ? 'Continuar' : 'Empezar')}
            </button>
          </div>
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
