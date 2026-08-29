/* ===========================================================
   DELPHIS METHOD — VERIFICAR CORREO (verificar.html)
   =========================================================== */

const verifyParams = new URLSearchParams(location.search);
const VERIFY_NEXT = verifyParams.get('next') || 'curriculo.html';

const vEls = {
  email: document.getElementById('verifyEmail'),
  btnCheck: document.getElementById('btnCheck'),
  btnResend: document.getElementById('btnResend'),
  btnLogout: document.getElementById('btnLogoutVerify'),
  errorBanner: document.getElementById('authError'),
  successBanner: document.getElementById('authSuccess'),
};

function vShowError(msg) {
  vEls.successBanner.classList.remove('show');
  vEls.errorBanner.textContent = msg;
  vEls.errorBanner.classList.add('show');
}
function vShowSuccess(msg) {
  vEls.errorBanner.classList.remove('show');
  vEls.successBanner.textContent = msg;
  vEls.successBanner.classList.add('show');
}

vEls.btnLogout.addEventListener('click', () => logoutUser());

vEls.btnCheck.addEventListener('click', () => {
  const u = auth.currentUser;
  if (!u) { location.href = 'login.html'; return; }
  vEls.btnCheck.disabled = true;
  vEls.btnCheck.textContent = 'Comprobando…';
  u.reload().then(() => {
    if (u.emailVerified) {
      location.href = VERIFY_NEXT;
    } else {
      vShowError('Todavía no detectamos la verificación. Revisa tu bandeja de entrada (y spam) y vuelve a intentarlo.');
      vEls.btnCheck.disabled = false;
      vEls.btnCheck.textContent = 'Ya verifiqué, continuar';
    }
  });
});

let resendCooldown = 0;
let resendTimer = null;
vEls.btnResend.addEventListener('click', () => {
  if (resendCooldown > 0) return;
  resendVerification()
    .then(() => {
      vShowSuccess('Correo reenviado. Puede tardar un par de minutos en llegar.');
      resendCooldown = 45;
      resendTimer = setInterval(() => {
        resendCooldown--;
        vEls.btnResend.textContent = `Reenviar correo (${resendCooldown}s)`;
        if (resendCooldown <= 0) {
          clearInterval(resendTimer);
          vEls.btnResend.textContent = 'Reenviar correo de verificación';
          vEls.btnResend.disabled = false;
        }
      }, 1000);
      vEls.btnResend.disabled = true;
    })
    .catch(err => vShowError(translateAuthError(err)));
});

if (FIREBASE_READY) {
  auth.onAuthStateChanged((user) => {
    if (!user) { location.href = 'login.html'; return; }
    vEls.email.textContent = user.email;
    user.reload().then(() => {
      if (user.emailVerified) location.href = VERIFY_NEXT;
    });
  });
} else {
  showFirebaseSetupNotice();
}
