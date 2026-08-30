/* ===========================================================
   DELPHIS METHOD — BARRA DE NAVEGACIÓN INFERIOR (solo móvil, ≤720px)
   Se inyecta sola en las páginas "de dentro de la app" (currículo,
   lección, libro, paquetes, repaso, perfil, roleplay, cursos) — no en
   marketing/auth (index, login, verificar, cómo-funciona), igual que
   una app real no muestra tabs antes de entrar.
   =========================================================== */
const BOTTOM_NAV_ITEMS = [
  { id: 'curso', href: 'curriculo.html', label: 'Curso',
    icon: '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' },
  { id: 'paquetes', href: 'paquetes.html', label: 'Paquetes',
    icon: '<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' },
  { id: 'repaso', href: 'repaso.html', label: 'Repaso',
    icon: '<path d="M4 4v5h5M20 20v-5h-5M4.5 15a8 8 0 0014.3 3.2M19.5 9a8 8 0 00-14.3-3.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' },
  { id: 'idiomas', href: 'cursos.html', label: 'Idiomas',
    icon: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" stroke="currentColor" stroke-width="2" fill="none"/>' },
  { id: 'perfil', href: 'perfil.html', label: 'Perfil',
    icon: '<circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>' },
];

// Páginas que no son una de las 5 pestañas pero pertenecen a una: la
// lección de un repaso destaca "Repaso", el resto de leccion.html/libro.html
// /roleplay.html destaca "Curso" (son parte del camino principal).
function seccionActiva() {
  const page = location.pathname.split('/').pop() || 'index.html';
  if (page === 'leccion.html') {
    const tipo = new URLSearchParams(location.search).get('tipo');
    return tipo === 'repaso' ? 'repaso.html' : 'curriculo.html';
  }
  if (page === 'libro.html' || page === 'roleplay.html') return 'curriculo.html';
  return page;
}

function renderBottomNav() {
  const activa = seccionActiva();
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.setAttribute('data-active', '1');
  nav.innerHTML = `<div class="bottom-nav__inner">${BOTTOM_NAV_ITEMS.map(item => `
    <a class="bottom-nav__item ${item.href === activa ? 'active' : ''}" href="${item.href}">
      <svg viewBox="0 0 24 24">${item.icon}</svg>
      ${item.label}
      <span class="bottom-nav__dot"></span>
    </a>
  `).join('')}</div>`;
  document.body.appendChild(nav);
}

renderBottomNav();
