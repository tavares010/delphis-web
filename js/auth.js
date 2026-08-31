/* ===========================================================
   DELPHIS METHOD — AUTENTICACIÓN (Firebase)
   Login/registro real, verificación de correo real, y guarda de
   páginas protegidas. Requiere que js/firebase-config.js tenga
   credenciales reales (ver ese archivo).
   =========================================================== */

let auth = null;
let db = null;

// ---------- Modo desarrollador ----------
// Cuentas que ven todo el currículo desbloqueado, sin el orden secuencial —
// para poder probar cualquier lección/capítulo sin tener que completar todo
// lo anterior. Es lo mismo que describe el brief original ("modo desarrollador
// oculto para pruebas"). No afecta el quiz/juego en sí, solo el bloqueo por progreso.
const DEV_MODE_EMAILS = ['semtavares010@gmail.com'];
let DEV_MODE = false;
const DEFAULT_LOGIN_EMAIL = 'semtavares010@gmail.com';

if (FIREBASE_READY) {
  firebase.initializeApp(FIREBASE_CONFIG);
  auth = firebase.auth();
  db = firebase.firestore();
  if (typeof FIREBASE_USE_EMULATOR !== 'undefined' && FIREBASE_USE_EMULATOR) {
    auth.useEmulator('http://localhost:9099');
    db.useEmulator('localhost', 8080);
  }
}

function translateAuthError(err) {
  const map = {
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
    'auth/invalid-email': 'Ese correo no es válido.',
    'auth/missing-password': 'Escribe una contraseña.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/invalid-login-credentials': 'Correo o contraseña incorrectos.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
    'auth/network-request-failed': 'Problema de conexión. Revisa tu internet.',
    'auth/user-disabled': 'Esta cuenta fue deshabilitada.',
  };
  return map[err.code] || `Ocurrió un error (${err.code || err.message}). Inténtalo de nuevo.`;
}

function registerUser(email, password) {
  return auth.createUserWithEmailAndPassword(email, password)
    .then((cred) => cred.user.sendEmailVerification().then(() => cred.user));
}

function loginUser(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

function logoutUser() {
  return auth.signOut().then(() => { location.href = 'login.html'; });
}

function resendVerification() {
  const u = auth.currentUser;
  if (!u) return Promise.reject(new Error('No hay sesión activa.'));
  return u.sendEmailVerification();
}

function resetPassword(email) {
  return auth.sendPasswordResetEmail(email);
}

// ---------- Aviso si Firebase no está configurado todavía ----------
// Un banner pequeño, no bloqueante — nunca debe impedir usar el curso.
function showFirebaseSetupNotice() {
  if (document.getElementById('fbSetupNotice')) return;
  const el = document.createElement('div');
  el.id = 'fbSetupNotice';
  el.innerHTML = `
    <span>⚠️ Firebase no está configurado — el login es de prueba. <a href="#" id="fbSetupInfo">Ver cómo configurarlo</a></span>
    <button id="fbSetupClose" aria-label="Cerrar aviso">✕</button>
  `;
  document.body.appendChild(el);
  document.getElementById('fbSetupClose').addEventListener('click', () => el.remove());
  document.getElementById('fbSetupInfo').addEventListener('click', (e) => {
    e.preventDefault();
    alert('El login todavía no funciona porque js/firebase-config.js tiene valores de ejemplo.\n\nCrea un proyecto gratis en firebase.google.com, activa Authentication (Correo/contraseña) y Firestore, y pega tus credenciales reales ahí — las instrucciones exactas están comentadas en ese archivo.');
  });
}

// ---------- UI de navbar según estado de sesión ----------
function renderNavForGuest() {
  document.querySelectorAll('[data-progress-chip]').forEach(wrap => {
    wrap.className = 'navbar__auth-actions';
    wrap.innerHTML = `
      <a href="login.html" class="btn btn--ghost">Iniciar sesión</a>
      <a href="login.html?modo=registro" class="btn btn--primary">Crear cuenta</a>
    `;
  });
  document.querySelectorAll('[data-mobile-auth]').forEach(wrap => {
    wrap.innerHTML = `
      <a href="login.html" class="mobile-link">Iniciar sesión</a>
      <a href="login.html?modo=registro" class="btn btn--primary mobile-cta">Crear cuenta</a>
    `;
  });
}

function renderNavForUser(user) {
  document.querySelectorAll('[data-progress-chip]').forEach(wrap => { wrap.className = 'progress-chip'; });
  renderProgressChip();
  if (DEV_MODE) {
    document.querySelectorAll('[data-progress-chip]').forEach(wrap => {
      if (wrap.querySelector('.dev-mode-badge')) return;
      wrap.insertAdjacentHTML('afterbegin', '<span class="dev-mode-badge" title="Modo desarrollador: todo desbloqueado">🛠️<span class="dev-mode-badge__text"> DEV</span></span>');
    });
  }
  document.querySelectorAll('[data-mobile-auth]').forEach(wrap => {
    wrap.innerHTML = `
      <a href="perfil.html" class="mobile-link">Mi perfil (${user.email})</a>
      <button id="mobileLogout" class="btn btn--outline mobile-cta">Cerrar sesión</button>
    `;
  });
  const btn = document.getElementById('mobileLogout');
  if (btn) btn.addEventListener('click', logoutUser);
}

// ---------- Punto de entrada de cada página ----------
// options.protect: true = requiere sesión + correo verificado, si no, redirige.
// options.onReady(user): se llama cuando ya se puede pintar la página
//   (con user=null si options.protect es false y no hay sesión).
function initAuthUI(options = {}) {
  if (!FIREBASE_READY) {
    // Firebase no está configurado todavía: no bloqueamos el curso por eso.
    // Se ve el aviso informativo, pero el contenido funciona igual que antes
    // (progreso solo en este navegador, sin cuentas reales).
    showFirebaseSetupNotice();
    renderNavForGuest();
    if (typeof options.onReady === 'function') options.onReady(null);
    return;
  }

  auth.onAuthStateChanged(async (user) => {
    DEV_MODE = !!(user && user.email && DEV_MODE_EMAILS.includes(user.email.toLowerCase()));

    if (!user) {
      renderNavForGuest();
      if (options.protect) {
        const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);
        location.href = `login.html?next=${next}`;
        return;
      }
      if (typeof options.onReady === 'function') options.onReady(null);
      return;
    }

    try { await user.reload(); } catch (e) { /* ignora, seguimos con el estado que ya teníamos */ }

    if (options.protect && !user.emailVerified) {
      const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);
      location.href = `verificar.html?next=${next}`;
      return;
    }

    // No bloquea el render: la sincronización con la nube corre en paralelo,
    // nunca debe retrasar que la página se pueda usar.
    if (typeof syncFromCloud === 'function') {
      syncFromCloud(user).catch(() => {});
    }

    renderNavForUser(user);
    if (DEV_MODE && typeof showToast === 'function') showToast('🛠️ Modo desarrollador activo — todo el currículo está desbloqueado.');
    if (typeof options.onReady === 'function') options.onReady(user);
  });
}
