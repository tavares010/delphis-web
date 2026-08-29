/* ===========================================================
   DELPHIS METHOD — PAQUETES TEMÁTICOS (paquetes.html), datos reales
   =========================================================== */

const PACK_COLORS = {
  hosteleria: 'rgba(249,115,22,.15)', deportes: 'rgba(34,197,94,.15)', escuela: 'rgba(139,92,246,.15)',
  viajes: 'rgba(56,189,248,.15)', negocios: 'rgba(250,204,21,.15)', salud: 'rgba(248,113,113,.15)',
  uber: 'rgba(148,163,184,.15)', comercio: 'rgba(236,72,153,.15)',
};

// Fotos reales (Pexels) por contexto, buscadas y verificadas manualmente.
const PACK_COVER = {
  hosteleria: 'https://images.pexels.com/photos/8732584/pexels-photo-8732584.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=350&w=700',
  deportes: 'https://images.pexels.com/photos/8693567/pexels-photo-8693567.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=350&w=700',
  escuela: 'https://images.pexels.com/photos/9159042/pexels-photo-9159042.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=350&w=700',
  viajes: 'https://images.pexels.com/photos/6726195/pexels-photo-6726195.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=350&w=700',
  negocios: 'https://images.pexels.com/photos/7693692/pexels-photo-7693692.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=350&w=700',
  salud: 'https://images.pexels.com/photos/6129444/pexels-photo-6129444.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=350&w=700',
  uber: 'https://images.pexels.com/photos/7263902/pexels-photo-7263902.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=350&w=700',
  comercio: 'https://images.pexels.com/photos/8311880/pexels-photo-8311880.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=350&w=700',
};

function renderPackGrid(content) {
  const grid = document.getElementById('packGrid');
  grid.innerHTML = content.pkgCatalog.map(p => {
    const tieneFrases = !!(content.paquetesConFrases[p.id] && content.paquetesConFrases[p.id].length);
    return `
    <div class="pack-card reveal-up">
      <div class="pack-card__cover" style="background-image:url('${PACK_COVER[p.id] || ''}');">
        <span class="pack-card__status ${tieneFrases ? 'pack-card__status--live' : 'pack-card__status--soon'}">${tieneFrases ? 'Disponible' : 'Próximamente'}</span>
      </div>
      <div class="pack-card__body">
        <div class="pack-card__icon" style="background:${PACK_COLORS[p.id] || 'rgba(148,163,184,.15)'};">${p.emoji}</div>
        <h4>${p.name}</h4>
        <p>${p.description}</p>
        <div class="pack-card__tags"><span>📚 Estudiar</span><span>✅ Quiz</span><span>🎮 Jugar</span></div>
        <div class="pack-card__cta" style="display:flex; flex-direction:column; gap:.6rem;">
          ${tieneFrases
            ? `<a href="leccion.html?tipo=paquete&id=${p.id}" class="btn btn--primary btn--block">Practicar</a>`
            : `<span class="btn btn--outline btn--block" style="opacity:.5; pointer-events:none;">Próximamente</span>`}
          <a href="roleplay.html?pkg=${p.id}" class="btn btn--outline btn--block">🎭 Roleplay con IA</a>
        </div>
      </div>
    </div>
  `;
  }).join('');
  grid.querySelectorAll('.reveal-up').forEach(el => el.classList.add('visible'));
}

function renderStorySection(content) {
  const wrap = document.getElementById('storiesWrap');
  const section = document.getElementById('historias');
  const pkgIds = Object.keys(content.storyPackages);
  if (!pkgIds.length) return;
  section.style.display = '';

  wrap.innerHTML = pkgIds.map(pkgId => {
    const catalogo = content.pkgCatalog.find(p => p.id === pkgId);
    const stories = content.storyPackages[pkgId];
    return `
      <div class="story-pkg-group">
        <div class="story-pkg-group__head">
          <span style="font-size:1.4rem;">${catalogo ? catalogo.emoji : '📖'}</span>
          <h4>${catalogo ? catalogo.name : pkgId}</h4>
        </div>
        <div class="story-grid">
          ${stories.map(s => `
            <div class="story-card" data-pkg="${pkgId}" data-num="${s.number}">
              ${s.thumbnailAsset ? `<img class="story-card__thumb" src="${WEB_EXPORT_BASE + s.thumbnailAsset}" loading="lazy" alt="">` : `<div class="story-card__thumb"></div>`}
              <div class="story-card__body"><strong>${s.title}</strong><span>${s.lines.length} líneas</span></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  wrap.querySelectorAll('.story-card').forEach(card => {
    card.addEventListener('click', () => openStoryReader(content, card.dataset.pkg, parseInt(card.dataset.num, 10)));
  });
}

function openStoryReader(content, pkgId, number) {
  const story = content.storyPackages[pkgId].find(s => s.number === number);
  if (!story) return;

  const overlay = document.createElement('div');
  overlay.className = 'reader-mode-full';
  const videoSrc = story.videoAsset ? WEB_EXPORT_BASE + story.videoAsset : null;
  overlay.innerHTML = `
    <button class="reader-mode-full__close" id="btnCloseStory">✕</button>
    <div class="story-reader">
      <span class="eyebrow">${story.title}</span>
      ${videoSrc ? `<video controls src="${videoSrc}"></video>` : ''}
      <div style="margin-bottom:1.6rem;">
        ${story.vocab.map(v => `<span class="story-vocab-chip" title="${v.translationEs}">${v.termEn}</span>`).join('')}
      </div>
      ${story.lines.map(l => `
        <div class="story-line">
          <div class="story-line__speaker">${l.speaker ? '🗣️' : '📖'}</div>
          <div class="story-line__text"><strong>${l.en}</strong><span>${l.es}</span></div>
        </div>
      `).join('')}
      <div class="lesson-card" style="margin-top:2rem; text-align:center;">
        <span class="eyebrow">Frase reto</span>
        <p style="font-size:1.1rem; margin:.6rem 0;">${story.challengeSentence.en}</p>
        <p style="color:var(--gray-500);">${story.challengeSentence.es}</p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  qsL('#btnCloseStory', overlay).addEventListener('click', () => overlay.remove());
}
function qsL(sel, root = document) { return root.querySelector(sel); }

async function init() {
  const content = await loadContent();
  renderPackGrid(content);
  renderStorySection(content);
}

initAuthUI({ protect: true, onReady: init });
