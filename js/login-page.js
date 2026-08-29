/* ===========================================================
   DELPHIS METHOD — LOGIN / REGISTRO (login.html)
   =========================================================== */

const loginParams = new URLSearchParams(location.search);
const NEXT_PAGE = loginParams.get('next') || 'curriculo.html';
let MODO = loginParams.get('modo') === 'registro' ? 'registro' : 'login';

const els = {
  title: document.getElementById('authTitle'),
  sub: document.getElementById('authSub'),
  tabLogin: document.getElementById('tabLogin'),
  tabRegistro: document.getElementById('tabRegistro'),
  form: document.getElementById('authForm'),
  email: document.getElementById('inputEmail'),
  password: document.getElementById('inputPassword'),
  confirm: document.getElementById('inputConfirm'),
  fieldConfirm: document.getElementById('fieldConfirm'),
  forgotWrap: document.getElementById('forgotWrap'),
  btnForgot: document.getElementById('btnForgot'),
  btnSubmit: document.getElementById('btnSubmit'),
  errorBanner: document.getElementById('authError'),
  successBanner: document.getElementById('authSuccess'),
  switchWrap: document.getElementById('authSwitch'),
  btnGoRegistro: document.getElementById('btnGoRegistro'),
};

function showError(msg) {
  els.successBanner.classList.remove('show');
  els.errorBanner.textContent = msg;
  els.errorBanner.classList.add('show');
}
function showSuccess(msg) {
  els.errorBanner.classList.remove('show');
  els.successBanner.textContent = msg;
  els.successBanner.classList.add('show');
}
function clearBanners() {
  els.errorBanner.classList.remove('show');
  els.successBanner.classList.remove('show');
}

function setFieldInvalid(fieldId, invalid) {
  document.getElementById(fieldId).classList.toggle('invalid', invalid);
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function applyMode() {
  const registro = MODO === 'registro';
  els.tabLogin.classList.toggle('active', !registro);
  els.tabRegistro.classList.toggle('active', registro);
  els.title.textContent = registro ? 'Crea tu cuenta' : 'Bienvenido de nuevo';
  els.sub.textContent = registro ? 'Gratis, sin tarjeta de crédito' : 'Inicia sesión para continuar tu curso';
  els.fieldConfirm.style.display = registro ? 'block' : 'none';
  els.forgotWrap.style.display = registro ? 'none' : 'block';
  els.btnSubmit.textContent = registro ? 'Crear cuenta' : 'Iniciar sesión';
  els.switchWrap.innerHTML = registro
    ? '¿Ya tienes cuenta? <button type="button" id="btnGoLogin">Inicia sesión</button>'
    : '¿No tienes cuenta? <button type="button" id="btnGoRegistro">Crea una gratis</button>';
  const swapBtn = document.getElementById(registro ? 'btnGoLogin' : 'btnGoRegistro');
  if (swapBtn) swapBtn.addEventListener('click', () => { MODO = registro ? 'login' : 'registro'; clearBanners(); applyMode(); });
  clearBanners();
  ['fieldEmail', 'fieldPassword', 'fieldConfirm'].forEach(id => setFieldInvalid(id, false));
}

els.tabLogin.addEventListener('click', () => { MODO = 'login'; applyMode(); });
els.tabRegistro.addEventListener('click', () => { MODO = 'registro'; applyMode(); });

els.btnForgot.addEventListener('click', () => {
  if (!FIREBASE_READY) return;
  const email = els.email.value.trim();
  if (!isValidEmail(email)) {
    setFieldInvalid('fieldEmail', true);
    showError('Escribe tu correo arriba primero, luego pulsa "¿Olvidaste tu contraseña?" de nuevo.');
    return;
  }
  els.btnForgot.disabled = true;
  resetPassword(email)
    .then(() => showSuccess('Te enviamos un correo para restablecer tu contraseña.'))
    .catch(err => showError(translateAuthError(err)))
    .finally(() => { els.btnForgot.disabled = false; });
});

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!FIREBASE_READY) { showFirebaseSetupNotice(); return; }
  clearBanners();

  const email = els.email.value.trim();
  const password = els.password.value;
  const confirm = els.confirm.value;
  const registro = MODO === 'registro';

  let valid = true;
  if (!isValidEmail(email)) { setFieldInvalid('fieldEmail', true); valid = false; } else setFieldInvalid('fieldEmail', false);
  if (password.length < 6) { setFieldInvalid('fieldPassword', true); valid = false; } else setFieldInvalid('fieldPassword', false);
  if (registro) {
    if (confirm !== password || !confirm) { setFieldInvalid('fieldConfirm', true); valid = false; } else setFieldInvalid('fieldConfirm', false);
  }
  if (!valid) return;

  const originalLabel = els.btnSubmit.textContent;
  els.btnSubmit.disabled = true;
  els.btnSubmit.textContent = registro ? 'Creando cuenta…' : 'Entrando…';

  const done = () => { els.btnSubmit.disabled = false; els.btnSubmit.textContent = originalLabel; };

  if (registro) {
    registerUser(email, password)
      .then(() => {
        showSuccess('Cuenta creada. Revisa tu correo para verificarla…');
        setTimeout(() => { location.href = `verificar.html?next=${encodeURIComponent(NEXT_PAGE)}`; }, 1200);
      })
      .catch(err => { showError(translateAuthError(err)); done(); });
  } else {
    loginUser(email, password)
      .then((cred) => {
        if (cred.user.emailVerified) {
          location.href = NEXT_PAGE;
        } else {
          location.href = `verificar.html?next=${encodeURIComponent(NEXT_PAGE)}`;
        }
      })
      .catch(err => { showError(translateAuthError(err)); done(); });
  }
});

applyMode();

// Cuenta predeterminada: precarga el correo para que no haga falta escribirlo cada vez.
if (typeof DEFAULT_LOGIN_EMAIL !== 'undefined' && !els.email.value) {
  els.email.value = DEFAULT_LOGIN_EMAIL;
}

// Si ya hay sesión iniciada, no tiene sentido quedarse en el login
if (FIREBASE_READY) {
  auth.onAuthStateChanged((user) => {
    if (!user) return;
    user.reload().finally(() => {
      location.href = user.emailVerified ? NEXT_PAGE : `verificar.html?next=${encodeURIComponent(NEXT_PAGE)}`;
    });
  });
} else {
  showFirebaseSetupNotice();
}
