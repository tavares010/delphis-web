/* ===========================================================
   DELPHIS METHOD — PERFIL (perfil.html)
   =========================================================== */

function qsP(sel, root = document) { return root.querySelector(sel); }

let SHOP_CATALOG = [];

const RETOS_DIARIOS = [
  { id: 'aciertos5', icono: '✅', nombre: 'Acierta 5 respuestas hoy', reward: 20, check: (d) => d.statsHoy.aciertos >= 5 },
  { id: 'aciertos10', icono: '⚡', nombre: 'Acierta 10 respuestas hoy', reward: 30, check: (d) => d.statsHoy.aciertos >= 10 },
  { id: 'palabras3', icono: '📖', nombre: 'Consulta 3 palabras nuevas en el libro', reward: 15, check: (d) => d.statsHoy.palabrasConsultadas >= 3 },
  { id: 'rachaHoy', icono: '🔥', nombre: 'Mantén tu racha activa hoy', reward: 10, check: (d) => d.ultimoDiaActivo === todayStr() },
];

function marcoRingStyle(data) {
  if (!data.marco) return '';
  const item = SHOP_CATALOG.find(s => s.id === data.marco);
  if (!item || !item.colors) return '';
  const [c1, c2] = item.colors;
  return ` style="box-shadow:0 0 0 3px ${c1}, 0 0 0 6px ${c2 || c1};"`;
}

function renderProfileCard() {
  const data = progressLoad();
  const { actual, siguiente, progresoPct } = getRankInfo(data.puntos);
  qsP('#profileCard').innerHTML = `
    <div class="profile-card__avatar"${marcoRingStyle(data)}>${data.avatar}</div>
    <div class="profile-card__name">${data.nombre}</div>
    <div class="profile-card__title">${data.titulo}</div>
    <div class="profile-card__rank">
      <div class="profile-card__rank-icon">${actual.icono}</div>
      <strong>${actual.nombre}</strong>
      <div class="rank-bar"><div class="rank-bar__fill" style="width:${progresoPct}%"></div></div>
      <span style="font-size:.78rem; color:var(--gray-500);">
        ${siguiente ? `${data.puntos} / ${siguiente.min} pts hasta ${siguiente.nombre}` : 'Rango máximo alcanzado 🎉'}
      </span>
    </div>
    <div class="profile-card__streak">🔥 ${data.racha} días de racha</div>
  `;
  qsP('#nameInput').value = data.nombre;
}

function renderStats() {
  const data = progressLoad();
  qsP('#statsGrid').innerHTML = `
    <div class="stat-box"><strong>${data.statsHoy.aciertos}</strong><span>Aciertos hoy</span></div>
    <div class="stat-box"><strong>${data.statsHoy.palabrasConsultadas}</strong><span>Palabras consultadas hoy</span></div>
    <div class="stat-box"><strong>${srsAllWords().length}</strong><span>Palabras en repaso</span></div>
  `;
}

function renderChallenges() {
  const data = progressLoad();
  qsP('#challengeList').innerHTML = RETOS_DIARIOS.map(r => {
    const done = r.check(data);
    const claimed = data.retosReclamados.includes(r.id);
    return `
      <div class="challenge-item ${claimed ? 'claimed' : ''}">
        <div class="challenge-item__icon">${r.icono}</div>
        <div class="challenge-item__info"><strong>${r.nombre}</strong><span>Recompensa: ${r.reward} 🪙</span></div>
        <button data-reto="${r.id}" data-reward="${r.reward}" ${(!done || claimed) ? 'disabled' : ''}>
          ${claimed ? 'Reclamado' : 'Reclamar'}
        </button>
      </div>
    `;
  }).join('');

  qsP('#challengeList').querySelectorAll('button[data-reto]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.reto;
      const reward = parseInt(btn.dataset.reward, 10);
      const d = progressLoad();
      if (d.retosReclamados.includes(id)) return;
      d.retosReclamados.push(id);
      d.monedas += reward;
      progressSave(d);
      if (typeof pushNow === 'function') pushNow();
      showToast(`+${reward} 🪙 reclamadas`);
      renderChallenges();
      renderProgressChip();
    });
  });
}

function renderAvatarGrid() {
  const data = progressLoad();
  qsP('#avatarGrid').innerHTML = AVATARES.map(a => `<button class="${a === data.avatar ? 'selected' : ''}" data-avatar="${a}">${a}</button>`).join('');
  qsP('#avatarGrid').querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      setAvatar(btn.dataset.avatar);
      renderProfileCard();
      renderAvatarGrid();
      renderProgressChip();
    });
  });
}

const SHOP_FIELD = { theme: { activo: 'tema', comprados: 'temasComprados' }, frame: { activo: 'marco', comprados: 'marcosComprados' }, title: { activo: 'tituloId', comprados: 'titulosComprados' } };

function renderShopSection(tipo, containerId) {
  const data = progressLoad();
  const { activo, comprados } = SHOP_FIELD[tipo];
  const items = SHOP_CATALOG.filter(s => s.type === tipo);
  const el = qsP(`#${containerId}`);
  if (!items.length) { el.innerHTML = '<p style="color:var(--gray-500); font-size:.82rem;">Sin catálogo todavía.</p>'; return; }

  el.innerHTML = items.map(item => {
    const owned = (data[comprados] || []).includes(item.id) || item.price === 0;
    const equipped = data[activo] === item.id;
    const preview = item.colors.length > 1
      ? `linear-gradient(135deg, ${item.colors.join(',')})`
      : item.colors[0];
    return `
      <div class="theme-swatch ${equipped ? 'equipped' : ''}">
        <div class="theme-swatch__preview" style="background:${preview};"></div>
        <strong>${item.name}</strong>
        <span>${owned ? (equipped ? 'Equipado' : 'Ya lo tienes') : `${item.price} 🪙`}</span>
        <button data-id="${item.id}">${equipped ? '✓ Equipado' : owned ? 'Equipar' : 'Comprar'}</button>
      </div>
    `;
  }).join('');

  el.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = items.find(i => i.id === btn.dataset.id);
      const d = progressLoad();
      if (d[activo] === item.id) return;
      const ok = comprarItemTienda(item);
      if (!ok) { showToast('No tienes suficientes monedas.'); return; }
      if (tipo === 'theme') applyTheme();
      showToast(`"${item.name}" activado.`);
      renderShopSection(tipo, containerId);
      renderProfileCard();
      renderProgressChip();
    });
  });
}

qsP('#btnSaveName').addEventListener('click', () => {
  setNombre(qsP('#nameInput').value.trim());
  renderProfileCard();
  showToast('Nombre guardado.');
});

// El botón "?" flotante para reabrir los tutoriales en cada página
// molestaba encima de la app -ahora se reinician desde aquí, y la
// próxima vez que se entre a Currículo/Lección/El libro el recorrido
// guiado vuelve a salir solo, como la primera vez.
qsP('#btnReiniciarTours').addEventListener('click', () => {
  if (typeof reiniciarTodosLosTours === 'function') reiniciarTodosLosTours();
  showToast('Listo. Verás los tutoriales de nuevo la próxima vez que entres a Currículo, Lección o El libro.');
});

qsP('#btnReset').addEventListener('click', async () => {
  if (!confirm('¿Seguro? Esto borra todo tu progreso: puntos, monedas, currículo y vocabulario guardado, en este navegador y en tu cuenta.')) return;
  await deleteCloudProgress();
  localStorage.removeItem(PROGRESS_KEY);
  localStorage.removeItem(CURRICULUM_KEY);
  localStorage.removeItem(SRS_KEY);
  localStorage.removeItem(AA_LOCAL_KEY);
  location.reload();
});

initAuthUI({
  protect: true,
  onReady: async (user) => {
    if (user) {
      qsP('#accountEmail').textContent = user.email;
      qsP('#btnLogout').addEventListener('click', logoutUser);
    } else {
      qsP('#accountEmail').textContent = 'Sin cuenta todavía (falta configurar Firebase)';
      qsP('#btnLogout').disabled = true;
      qsP('#btnLogout').style.opacity = '.4';
    }
    const content = await loadContent();
    SHOP_CATALOG = content.shopCatalog;

    renderProfileCard();
    renderStats();
    renderChallenges();
    renderAvatarGrid();
    renderShopSection('theme', 'themeGrid');
    renderShopSection('frame', 'frameGrid');
    renderShopSection('title', 'titleGrid');
  },
});
