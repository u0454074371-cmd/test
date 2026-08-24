// ==================== Modals (kleine eigen versie, restaurant.js/landing.js zijn hier niet geladen) ====================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  });
});

document.getElementById('btn-admin-logout').addEventListener('click', () => {
  sessionStorage.removeItem('isRestaurantAdmin');
  window.location.href = 'index.html';
});

function escapeHtmlAdmin(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function formatDatumAdmin(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ==================== Restaurants ophalen & tonen ====================
let editingRestaurantId = null;

db.ref('restaurants').on('value', snap => {
  const data = snap.val() || {};
  renderAdminRestaurants(data);
});

function renderAdminRestaurants(data) {
  const list = document.getElementById('admin-restaurant-list');
  const emptyMsg = document.getElementById('admin-empty-msg');

  // Restaurants zonder leden zijn "spookrestaurants" (bijv. overgebleven na een
  // fout, of nog in het proces van verwijderd worden) en gelden niet als een
  // echt bestaand restaurant, dus die tonen we niet in het beheer.
  const entries = Object.entries(data)
    .filter(([, r]) => r.leden && Object.keys(r.leden).length > 0)
    .sort((a, b) => (b[1].aangemaakt || 0) - (a[1].aangemaakt || 0));

  if (entries.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';
  list.innerHTML = '';

  entries.forEach(([id, r]) => {
    const ledenAantal = r.leden ? Object.keys(r.leden).length : 0;
    const card = document.createElement('div');
    card.className = 'restaurant-card admin-restaurant-card';
    card.innerHTML = `
      <div class="restaurant-card-main">
        <div class="restaurant-card-name">${escapeHtmlAdmin(r.naam || 'Restaurant')}</div>
        <div class="restaurant-card-role">Code: ${escapeHtmlAdmin(r.code || '—')} · ${ledenAantal} lid/leden · aangemaakt ${formatDatumAdmin(r.aangemaakt)}</div>
      </div>
      <div class="admin-restaurant-actions">
        <button type="button" class="mini-btn edit" data-view="${id}">Bekijken &amp; beheren</button>
        <button type="button" class="mini-btn edit" data-edit="${id}">Naam</button>
        <button type="button" class="mini-btn edit" data-warn="${id}">⚠️ Waarschuwing</button>
        <button type="button" class="mini-btn danger" data-delete="${id}">Verwijderen</button>
      </div>
    `;
    // Klik op de kaart zelf opent de volledige restaurant-weergave, met alle
    // rechten van een eigenaar (plattegrond, producten, voorraad, leden, enz).
    card.addEventListener('click', () => openAdminRestaurantView(id));
    card.querySelector('[data-view]').addEventListener('click', (e) => {
      e.stopPropagation();
      openAdminRestaurantView(id);
    });
    card.querySelector('[data-edit]').addEventListener('click', (e) => {
      e.stopPropagation();
      openAdminRename(id, r.naam || '');
    });
    card.querySelector('[data-warn]').addEventListener('click', (e) => {
      e.stopPropagation();
      openAdminWarning(id, r.naam || 'dit restaurant');
    });
    card.querySelector('[data-delete]').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteAdminRestaurant(id, r);
    });
    list.appendChild(card);
  });
}

function openAdminRestaurantView(id) {
  window.location.href = `restaurant.html?id=${encodeURIComponent(id)}&admin=1`;
}

function openAdminRename(id, naam) {
  editingRestaurantId = id;
  document.getElementById('admin-rename-input').value = naam;
  document.getElementById('admin-rename-error').textContent = '';
  openModal('modal-admin-rename');
}

document.getElementById('admin-rename-confirm').addEventListener('click', () => {
  const naam = document.getElementById('admin-rename-input').value.trim();
  const errorEl = document.getElementById('admin-rename-error');
  if (!naam) { errorEl.textContent = 'Vul een naam in.'; return; }
  if (!editingRestaurantId) return;

  const btn = document.getElementById('admin-rename-confirm');
  btn.disabled = true;
  db.ref('restaurants/' + editingRestaurantId + '/naam').set(naam).then(() => {
    btn.disabled = false;
    closeModal('modal-admin-rename');
  }).catch(err => {
    console.error(err);
    btn.disabled = false;
    errorEl.textContent = 'Er ging iets mis, probeer opnieuw.';
  });
});

// ==================== Waarschuwing naar restaurant sturen ====================
// De waarschuwing wordt in Firebase gezet en verschijnt de eerstvolgende keer
// dat de eigenaar (niet de admin zelf) het restaurant opent, groot in beeld.
// Zodra de eigenaar op "Oké" drukt, wordt de waarschuwing verwijderd en komt
// hij dus nooit meer terug (tenzij er een nieuwe wordt verstuurd).
let editingWarningRestaurantId = null;

function openAdminWarning(id, naam) {
  editingWarningRestaurantId = id;
  document.getElementById('admin-warning-restaurant-name').textContent = `Voor: ${naam}`;
  document.getElementById('admin-warning-input').value = '';
  document.getElementById('admin-warning-error').textContent = '';
  openModal('modal-admin-warning');
}

document.getElementById('admin-warning-confirm').addEventListener('click', () => {
  const tekst = document.getElementById('admin-warning-input').value.trim();
  const errorEl = document.getElementById('admin-warning-error');
  if (!tekst) { errorEl.textContent = 'Vul een bericht in.'; return; }
  if (!editingWarningRestaurantId) return;

  const btn = document.getElementById('admin-warning-confirm');
  btn.disabled = true;
  db.ref('restaurants/' + editingWarningRestaurantId + '/warning').set({
    text: tekst,
    createdAt: Date.now()
  }).then(() => {
    btn.disabled = false;
    closeModal('modal-admin-warning');
  }).catch(err => {
    console.error(err);
    btn.disabled = false;
    errorEl.textContent = 'Er ging iets mis, probeer opnieuw.';
  });
});

function deleteAdminRestaurant(id, r) {
  const naam = r.naam || 'dit restaurant';
  if (!confirm(`Weet je zeker dat je "${naam}" wilt verwijderen? Dit verwijdert het HELE restaurant definitief, inclusief alle leden, tafels, producten en geschiedenis. Dit kan niet ongedaan gemaakt worden.`)) return;

  db.ref('restaurants/' + id).remove().then(() => {
    if (r.code) return db.ref('restaurantCodes/' + r.code).remove();
  }).catch(err => {
    console.error(err);
    alert('Er ging iets mis bij het verwijderen, probeer het opnieuw.');
  });
}
