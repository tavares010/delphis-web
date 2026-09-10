/* ===========================================================
   DELPHIS METHOD — MI PROGRESO (progreso.html)
   Sin ?nivel= -> resumen de los 3 niveles. Con ?nivel=N -> detalle:
   dominio %, puntos débiles (secciones incompletas O con muchos fallos
   aunque estén al 100%) y dominadas (100% y cero fallos), con un botón
   para entrenar solo los puntos débiles.
   =========================================================== */
function qsP2(sel, root = document) { return root.querySelector(sel); }

const progresoParams = new URLSearchParams(location.search);
const NIVEL_PROGRESO = parseInt(progresoParams.get('nivel'), 10) || null;

function tierDe(pct) {
  if (pct >= 80) return { id: 'experto', nombre: 'Experto', icono: '🏆' };
  if (pct >= 50) return { id: 'avanzado', nombre: 'Avanzado', icono: '🚀' };
  if (pct >= 25) return { id: 'intermedio', nombre: 'Intermedio', icono: '📈' };
  return { id: 'principiante', nombre: 'Principiante', icono: '🌱' };
}

// % de dominio de un nivel: mismo cálculo que ya usan nivel-card/hub
// (completos/total sobre nodos de lección), reutilizando estadoCamino()
// en vez de recalcular nada aparte.
function dominioNivel(camino) {
  const estados = estadoCamino(camino);
  const idxLecciones = [];
  camino.forEach((n, i) => { if (n.tipo === 'leccion') idxLecciones.push(i); });
  const total = idxLecciones.length;
  const completos = idxLecciones.filter(i => estados[i] === 'completo').length;
  return total ? Math.round((completos / total) * 100) : 0;
}

// Punto débil = sección incompleta, O completa al 100% pero con más de 2
// fallos registrados (aprobada a base de fallar mucho sigue siendo un
// punto débil real). Dominada = 100% y cero fallos.
function analizarSecciones(nivel, camino, content) {
  const secciones = seccionesDeNivel(nivel, content);
  const estados = estadoCamino(camino);
  const debiles = [];
  const dominadas = [];
  secciones.forEach(s => {
    const idxEnCamino = [];
    camino.forEach((n, i) => { if (n.tipo === 'leccion' && nodoGroupId(n, nivel) === s.id) idxEnCamino.push(i); });
    const total = idxEnCamino.length;
    const completos = idxEnCamino.filter(i => estados[i] === 'completo').length;
    const pct = total ? Math.round((completos / total) * 100) : 0;
    const fallos = mistakeCountFor(s.id);
    if (pct < 100 || fallos > 2) debiles.push({ ...s, pct, fallos });
    else if (pct === 100 && fallos === 0) dominadas.push(s);
  });
  return { debiles, dominadas };
}

function renderResumen(caminos, content) {
  document.getElementById('progresoTitulo').textContent = 'Cómo vas';
  document.getElementById('btnProgresoBack').href = 'curriculo.html';
  const wrap = document.getElementById('progresoWrap');
  wrap.innerHTML = `
    <div class="progreso-ring-row">
      ${[1, 2, 3].map(n => {
        const pct = dominioNivel(caminos[`nivel${n}`]);
        const tier = tierDe(pct);
        return `
          <a href="progreso.html?nivel=${n}" class="quiz-result" style="text-decoration:none;">
            <span class="eyebrow">Nivel ${n}</span>
            <div class="quiz-result__ring" data-ring style="--ring-pct:0; --ring-color:#4ade80;">
              <div class="quiz-result__score pass">${pct}%</div>
            </div>
            <div class="progreso-tier-badge progreso-tier-badge--${tier.id}">${tier.icono} ${tier.nombre}</div>
          </a>
        `;
      }).join('')}
    </div>
  `;
  requestAnimationFrame(() => {
    wrap.querySelectorAll('[data-ring]').forEach((ring, i) => ring.style.setProperty('--ring-pct', dominioNivel(caminos[`nivel${i + 1}`])));
  });
}

function renderDetalle(nivel, caminos, content) {
  document.getElementById('progresoTitulo').textContent = `Nivel ${nivel} · Cómo vas`;
  document.getElementById('btnProgresoBack').href = `curriculo.html?nivel=${nivel}`;
  const camino = caminos[`nivel${nivel}`];
  const pct = dominioNivel(camino);
  const tier = tierDe(pct);
  const { debiles, dominadas } = analizarSecciones(nivel, camino, content);
  const wrap = document.getElementById('progresoWrap');

  wrap.innerHTML = `
    <div class="quiz-result" style="margin-bottom:2rem;">
      <div class="quiz-result__ring" id="progresoRing" style="--ring-pct:0; --ring-color:#4ade80;">
        <div class="quiz-result__score pass">${pct}%</div>
      </div>
      <div class="progreso-tier-badge progreso-tier-badge--${tier.id}">${tier.icono} ${tier.nombre}</div>
    </div>

    <div class="lesson-card" style="margin-bottom:1.6rem;">
      <h3 style="margin-bottom:.3rem;">🎯 Puntos débiles</h3>
      <p style="color:var(--gray-500); font-size:.85rem; margin-bottom:1rem;">Secciones sin terminar, o terminadas a base de fallar bastante.</p>
      <div class="progreso-chips" id="chipsDebiles">
        ${debiles.length ? debiles.map(s => `<span class="progreso-chip progreso-chip--weak">${s.icono} ${s.nombre} · ${s.pct}%${s.fallos ? ` · ${s.fallos} fallos` : ''}</span>`).join('') : '<span style="color:var(--gray-500); font-size:.85rem;">Ninguna -vas muy bien.</span>'}
      </div>
      ${debiles.length ? '<button class="btn btn--primary" id="btnEntrenar">🎯 Entrenar puntos débiles</button>' : ''}
    </div>

    <div class="lesson-card">
      <h3 style="margin-bottom:.3rem;">✅ Dominado</h3>
      <p style="color:var(--gray-500); font-size:.85rem; margin-bottom:1rem;">Secciones completas y sin ningún fallo registrado.</p>
      <div class="progreso-chips">
        ${dominadas.length ? dominadas.map(s => `<span class="progreso-chip progreso-chip--mastered">${s.icono} ${s.nombre}</span>`).join('') : '<span style="color:var(--gray-500); font-size:.85rem;">Todavía ninguna sección al 100% sin fallos.</span>'}
      </div>
    </div>
  `;

  requestAnimationFrame(() => { qsP2('#progresoRing').style.setProperty('--ring-pct', pct); });

  const btnEntrenar = qsP2('#btnEntrenar');
  if (btnEntrenar) {
    btnEntrenar.addEventListener('click', () => {
      const catIds = debiles.map(s => s.id).join(',');
      location.href = `leccion.html?tipo=entrenamiento&nivel=${nivel}&cats=${encodeURIComponent(catIds)}`;
    });
  }

  if (typeof ofrecerTour === 'function') {
    ofrecerTour('progreso', [
      { selector: '#progresoRing', titulo: 'Tu nivel de dominio', texto: '% de lecciones de este nivel que ya aprobaste.' },
      { selector: '#chipsDebiles', titulo: 'Puntos débiles de verdad', texto: 'No es solo "lo que falta" -una sección aprobada a base de fallar mucho también sale aquí.' },
    ]);
  }
}

async function initProgreso() {
  const content = await loadContent();
  const caminos = buildCamino(content);
  if (NIVEL_PROGRESO) renderDetalle(NIVEL_PROGRESO, caminos, content);
  else renderResumen(caminos, content);
}

initAuthUI({ protect: true, onReady: initProgreso });
