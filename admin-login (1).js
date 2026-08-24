// ==================== Restaurant beheer: inloggen ====================
// De eerste keer dat iemand hier komt, staat er nog niks in de database
// (onder "siteAdmin") en moet er een e-mailadres + wachtwoord ingesteld
// worden. Daarna moet iedereen inloggen met precies dat e-mailadres en
// wachtwoord om bij "Restaurant beheer" te kunnen.

const ADMIN_FAILS_KEY = 'adminLoginFails';
const ADMIN_LOCK_KEY = 'adminLoginLockUntil';

function getAdminFails() {
  return Number(localStorage.getItem(ADMIN_FAILS_KEY)) || 0;
}
function setAdminFails(n) {
  localStorage.setItem(ADMIN_FAILS_KEY, String(n));
}
function getAdminLockUntil() {
  return Number(localStorage.getItem(ADMIN_LOCK_KEY)) || 0;
}
function setAdminLockUntil(ts) {
  if (ts) localStorage.setItem(ADMIN_LOCK_KEY, String(ts));
  else localStorage.removeItem(ADMIN_LOCK_KEY);
}

function formatLockTime(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

let adminLockInterval = null;
let isSetupMode = false; // wordt bepaald zodra het modal opent

function updateAdminLoginUI() {
  const emailInput = document.getElementById('admin-email-input');
  const input = document.getElementById('admin-password-input');
  const confirmInput = document.getElementById('admin-password-confirm-input');
  const confirmBtn = document.getElementById('admin-login-confirm');
  const errorEl = document.getElementById('admin-login-error');
  const lockUntil = getAdminLockUntil();
  const remaining = lockUntil - Date.now();

  if (remaining > 0) {
    emailInput.disabled = true;
    input.disabled = true;
    confirmInput.disabled = true;
    confirmBtn.disabled = true;
    errorEl.textContent = `Te vaak fout, probeer het over ${formatLockTime(remaining)} opnieuw.`;
    if (!adminLockInterval) {
      adminLockInterval = setInterval(() => {
        if (getAdminLockUntil() - Date.now() <= 0) {
          clearInterval(adminLockInterval);
          adminLockInterval = null;
          setAdminLockUntil(0);
          setAdminFails(0);
          updateAdminLoginUI();
        } else {
          updateAdminLoginUI();
        }
      }, 1000);
    }
    return true;
  }

  if (adminLockInterval) { clearInterval(adminLockInterval); adminLockInterval = null; }
  emailInput.disabled = false;
  input.disabled = false;
  confirmInput.disabled = false;
  confirmBtn.disabled = false;
  return false;
}

function applyAdminLoginMode() {
  const title = document.getElementById('admin-login-title');
  const intro = document.getElementById('admin-setup-intro');
  const confirmLabel = document.getElementById('admin-password-confirm-label');
  const confirmInput = document.getElementById('admin-password-confirm-input');
  const btn = document.getElementById('admin-login-confirm');

  if (isSetupMode) {
    title.textContent = '🔧 Sitebeheerder instellen';
    intro.style.display = 'block';
    confirmLabel.style.display = 'block';
    confirmInput.style.display = 'block';
    btn.textContent = 'Instellen';
  } else {
    title.textContent = '🔧 Restaurant beheer';
    intro.style.display = 'none';
    confirmLabel.style.display = 'none';
    confirmInput.style.display = 'none';
    btn.textContent = 'Inloggen';
  }
}

const btnAdmin = document.getElementById('btn-admin');
if (btnAdmin) {
  btnAdmin.addEventListener('click', async () => {
    document.getElementById('admin-email-input').value = '';
    document.getElementById('admin-password-input').value = '';
    document.getElementById('admin-password-confirm-input').value = '';
    document.getElementById('admin-login-error').textContent = '';
    openModal('modal-admin-login');

    if (updateAdminLoginUI()) return; // geblokkeerd, geen reden om siteAdmin op te halen

    const btn = document.getElementById('admin-login-confirm');
    btn.disabled = true;
    btn.textContent = 'Laden...';
    try {
      const snap = await db.ref('siteAdmin').get();
      isSetupMode = !snap.exists() || !snap.val().email || !snap.val().wachtwoord;
    } catch (e) {
      console.error(e);
      document.getElementById('admin-login-error').textContent = 'Kon geen verbinding maken, probeer het opnieuw.';
    }
    applyAdminLoginMode();
    btn.disabled = false;
  });
}

document.getElementById('admin-login-confirm').addEventListener('click', async () => {
  if (updateAdminLoginUI()) return; // nog geblokkeerd

  const emailInput = document.getElementById('admin-email-input');
  const input = document.getElementById('admin-password-input');
  const confirmInput = document.getElementById('admin-password-confirm-input');
  const errorEl = document.getElementById('admin-login-error');
  const btn = document.getElementById('admin-login-confirm');

  const email = emailInput.value.trim().toLowerCase();
  const wachtwoord = input.value;

  if (!email) { errorEl.textContent = 'Vul een e-mailadres in.'; return; }
  if (!wachtwoord) { errorEl.textContent = 'Vul een wachtwoord in.'; return; }

  if (isSetupMode) {
    if (wachtwoord.length < 6) { errorEl.textContent = 'Wachtwoord moet minstens 6 tekens zijn.'; return; }
    if (wachtwoord !== confirmInput.value) { errorEl.textContent = 'Wachtwoorden komen niet overeen.'; return; }

    btn.disabled = true;
    btn.textContent = 'Bezig...';
    try {
      // Vlak voor het opslaan nog een keer checken, voor het geval iemand
      // anders net iets eerder was met instellen.
      const snap = await db.ref('siteAdmin').get();
      if (snap.exists() && snap.val().email && snap.val().wachtwoord) {
        isSetupMode = false;
        applyAdminLoginMode();
        errorEl.textContent = 'Er is net al een sitebeheerder ingesteld, log in met die gegevens.';
        return;
      }

      await db.ref('siteAdmin').set({
        email: email,
        wachtwoord: wachtwoord,
        ingesteldOp: Date.now()
      });

      setAdminFails(0);
      setAdminLockUntil(0);
      sessionStorage.setItem('isRestaurantAdmin', '1');
      window.location.href = 'admin.html';
    } catch (e) {
      console.error(e);
      errorEl.textContent = 'Er ging iets mis, probeer het opnieuw.';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Instellen';
    }
    return;
  }

  // ---- Login-modus ----
  btn.disabled = true;
  btn.textContent = 'Bezig...';
  try {
    const snap = await db.ref('siteAdmin').get();
    const opgeslagen = snap.exists() ? snap.val() : null;
    const klopt = opgeslagen
      && opgeslagen.email
      && opgeslagen.email.toLowerCase() === email
      && opgeslagen.wachtwoord === wachtwoord;

    if (klopt) {
      setAdminFails(0);
      setAdminLockUntil(0);
      sessionStorage.setItem('isRestaurantAdmin', '1');
      window.location.href = 'admin.html';
      return;
    }

    const fails = getAdminFails() + 1;
    if (fails >= ADMIN_MAX_POGINGEN) {
      setAdminFails(0);
      setAdminLockUntil(Date.now() + ADMIN_LOCKOUT_MINUTEN * 60 * 1000);
      updateAdminLoginUI();
    } else {
      setAdminFails(fails);
      const over = ADMIN_MAX_POGINGEN - fails;
      errorEl.textContent = `Onjuist e-mailadres of wachtwoord. Nog ${over} poging${over === 1 ? '' : 'en'} over.`;
    }
    input.value = '';
  } catch (e) {
    console.error(e);
    errorEl.textContent = 'Er ging iets mis, probeer het opnieuw.';
  } finally {
    btn.disabled = false;
    btn.textContent = isSetupMode ? 'Instellen' : 'Inloggen';
  }
});

document.getElementById('admin-password-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('admin-login-confirm').click();
});
document.getElementById('admin-password-confirm-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('admin-login-confirm').click();
});
