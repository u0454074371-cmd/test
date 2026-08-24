const MAX_RESTAURANTS = 2;
const STORAGE_KEY = 'mijnRestaurants';

function getMyRestaurants() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveMyRestaurants(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function addMyRestaurant(entry) {
  const list = getMyRestaurants();
  if (list.some(r => r.id === entry.id)) return list;
  list.push(entry);
  saveMyRestaurants(list);
  return list;
}

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // zonder verwarrende tekens (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function genMemberId() {
  return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function genUniqueCode() {
  for (let i = 0; i < 20; i++) {
    const code = genCode();
    const snap = await db.ref('restaurantCodes/' + code).get();
    if (!snap.exists()) return code;
  }
  throw new Error('Kon geen unieke code genereren');
}

// ---- Render "Mijn restaurants" ----
const myRestaurantsEl = document.getElementById('my-restaurants');
const maxMsgEl = document.getElementById('max-msg');
const landingActionsEl = document.getElementById('landing-actions');

function renderMyRestaurants() {
  const list = getMyRestaurants();
  myRestaurantsEl.innerHTML = '';

  if (list.length === 0) {
    myRestaurantsEl.innerHTML = '<div class="empty-msg">Je hebt nog geen restaurant. Maak er één, of join met een code.</div>';
  } else {
    list.forEach(r => {
      const card = document.createElement('div');
      card.className = 'restaurant-card';
      card.innerHTML = `
        <div class="restaurant-card-main">
          <div class="restaurant-card-name">${escapeHtml(r.naam)}</div>
          <div class="restaurant-card-role">${r.rol === 'eigenaar' ? '👑 Eigenaar' : '👤 Gejoined'}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        window.location.href = `restaurant.html?id=${encodeURIComponent(r.id)}`;
      });
      myRestaurantsEl.appendChild(card);
    });
  }

  const atMax = list.length >= MAX_RESTAURANTS;
  maxMsgEl.style.display = atMax ? 'block' : 'none';
  landingActionsEl.style.display = atMax ? 'none' : 'flex';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

renderMyRestaurants();

// ---- Modals ----
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  });
});

// ---- Restaurant maken ----
document.getElementById('btn-open-create').addEventListener('click', () => {
  document.getElementById('create-name').value = '';
  document.getElementById('create-my-name').value = '';
  document.getElementById('create-error').textContent = '';
  openModal('modal-create');
});

document.getElementById('create-confirm').addEventListener('click', async () => {
  const naam = document.getElementById('create-name').value.trim();
  const mijnNaam = document.getElementById('create-my-name').value.trim();
  const errorEl = document.getElementById('create-error');
  if (!naam) { errorEl.textContent = 'Vul een naam in.'; return; }
  if (!mijnNaam) { errorEl.textContent = 'Vul je eigen naam in.'; return; }
  if (getMyRestaurants().length >= MAX_RESTAURANTS) { errorEl.textContent = 'Je zit al op het maximum van 2 restaurants.'; return; }

  const btn = document.getElementById('create-confirm');
  btn.disabled = true;
  btn.textContent = 'Bezig...';

  try {
    const code = await genUniqueCode();
    const newRef = db.ref('restaurants').push();
    const id = newRef.key;

    await newRef.set({
      naam: naam,
      code: code,
      aangemaakt: Date.now()
    });
    await db.ref('restaurantCodes/' + code).set(id);

    const memberId = genMemberId();
    await newRef.child('leden/' + memberId).set({
      rol: 'eigenaar',
      naam: mijnNaam,
      tabs: { bestellen: true, voorraad: true, keuken: true, gereed: true, historie: true, instellingen: true },
      toegevoegdOp: Date.now()
    });

    addMyRestaurant({ id, naam, code, rol: 'eigenaar', memberId });
    closeModal('modal-create');

    document.getElementById('code-display').textContent = code;
    window.pendingRestaurantId = id;
    openModal('modal-code-shown');
  } catch (e) {
    console.error(e);
    errorEl.textContent = 'Er ging iets mis, probeer het opnieuw.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Aanmaken';
  }
});

document.getElementById('code-shown-ok').addEventListener('click', () => {
  const id = window.pendingRestaurantId;
  window.location.href = `restaurant.html?id=${encodeURIComponent(id)}`;
});

// ---- Restaurant joinen ----
document.getElementById('btn-open-join').addEventListener('click', () => {
  document.getElementById('join-code').value = '';
  document.getElementById('join-my-name').value = '';
  document.getElementById('join-error').textContent = '';
  openModal('modal-join');
});

document.getElementById('join-confirm').addEventListener('click', async () => {
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  const mijnNaam = document.getElementById('join-my-name').value.trim();
  const errorEl = document.getElementById('join-error');
  if (!code) { errorEl.textContent = 'Vul een code in.'; return; }
  if (!mijnNaam) { errorEl.textContent = 'Vul je eigen naam in.'; return; }
  if (getMyRestaurants().length >= MAX_RESTAURANTS) { errorEl.textContent = 'Je zit al op het maximum van 2 restaurants.'; return; }

  const btn = document.getElementById('join-confirm');
  btn.disabled = true;
  btn.textContent = 'Bezig...';

  try {
    const snap = await db.ref('restaurantCodes/' + code).get();
    if (!snap.exists()) {
      errorEl.textContent = 'Geen restaurant gevonden met deze code.';
      return;
    }
    const id = snap.val();
    const infoSnap = await db.ref('restaurants/' + id + '/naam').get();
    const naam = infoSnap.exists() ? infoSnap.val() : 'Restaurant';

    if (getMyRestaurants().some(r => r.id === id)) {
      errorEl.textContent = 'Je zit al in dit restaurant.';
      return;
    }

    const memberId = genMemberId();
    await db.ref('restaurants/' + id + '/leden/' + memberId).set({
      rol: 'gejoined',
      naam: mijnNaam,
      tabs: { bestellen: true, voorraad: false, keuken: false, gereed: false, historie: false, instellingen: false },
      toegevoegdOp: Date.now()
    });

    addMyRestaurant({ id, naam, code, rol: 'gejoined', memberId });
    window.location.href = `restaurant.html?id=${encodeURIComponent(id)}`;
  } catch (e) {
    console.error(e);
    errorEl.textContent = 'Er ging iets mis, probeer het opnieuw.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Joinen';
  }
});
