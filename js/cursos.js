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

// Fotos reales (Pexels) del lugar/idioma de cada curso — buscadas y
// verificadas manualmente, no una consulta en vivo (así no depende de una
// API key en el cliente ni de que Pexels esté disponible al cargar la web).
const CURSO_COVER = {
  en: 'https://images.pexels.com/photos/17160708/pexels-photo-17160708.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=350&w=700',
  fr: 'https://images.pexels.com/photos/16496484/pexels-photo-16496484.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=350&w=700',
  de: 'https://images.pexels.com/photos/2570063/pexels-photo-2570063.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=350&w=700',
  it: 'https://images.pexels.com/photos/27541217/pexels-photo-27541217.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=350&w=700',
  pt: 'https://images.pexels.com/photos/16207032/pexels-photo-16207032.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=350&w=700',
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
        <div class="lang-card__cover" style="background-image:url('${CURSO_COVER[c.id] || CURSO_COVER.en}');">
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
