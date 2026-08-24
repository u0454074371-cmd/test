const params = new URLSearchParams(location.search);
const restaurantId = params.get('id');
const errorEl = document.getElementById('error');
const appEl = document.getElementById('app');

if (!restaurantId) {
  errorEl.textContent = 'Deze zelfservice-link is ongeldig.';
  throw new Error('Missing restaurant id');
}

const restRef = db.ref('restaurants/' + restaurantId);
const DEVICE_KEY = 'zelfserviceDeviceId';
let deviceId = localStorage.getItem(DEVICE_KEY);
if (!deviceId) {
  deviceId = 'd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  localStorage.setItem(DEVICE_KEY, deviceId);
}

let PRODUCTS = {};
let TABLES = {};
let STOCK = {};
let STOCK_OPTIONS = {};
let myOrders = {};
let selectedTable = null;
let counts = {};
let optionsByProduct = {};

function esc(v) {
  const d = document.createElement('div');
  d.textContent = v == null ? '' : String(v);
  return d.innerHTML;
}
function money(n) { return '€ ' + Number(n || 0).toFixed(2).replace('.', ','); }
function optionsFor(p) { return Array.isArray(p?.opties) ? p.opties : []; }

restRef.on('value', snap => {
  const r = snap.val() || {};
  document.getElementById('restaurant-name').textContent = r.naam || r.name || 'Restaurant';
  PRODUCTS = r.products || {};
  TABLES = r.floorplan?.tables || {};
  STOCK = r.stock || {};
  STOCK_OPTIONS = r.stockOpties || {};
  renderTables();
  renderProducts();
  renderMine();
  appEl.classList.remove('hidden');
}, err => {
  errorEl.textContent = 'Het restaurant kon niet worden geladen.';
  console.error(err);
});

function renderTables() {
  const el = document.getElementById('tables');
  const tables = Object.entries(TABLES).filter(([,t]) => (t.kind || 'tafel') === 'tafel');
  el.innerHTML = tables.length ? '' : '<div class="muted">Er zijn nog geen tafels ingesteld.</div>';
  tables.forEach(([id,t]) => {
    const b = document.createElement('button');
    b.className = 'table' + (selectedTable === t.number ? ' active' : '');
    b.textContent = '🪑 Tafel ' + t.number;
    b.onclick = () => { selectedTable = t.number; renderTables(); };
    el.appendChild(b);
  });
}

function renderProducts() {
  const el = document.getElementById('products');
  const entries = Object.entries(PRODUCTS);
  el.innerHTML = '';
  if (!entries.length) { el.innerHTML = '<div class="muted">Dit restaurant heeft nog geen producten ingesteld.</div>'; return; }

  entries.forEach(([key,p]) => {
    if (counts[key] == null) counts[key] = 0;
    if (!optionsByProduct[key]) optionsByProduct[key] = [];
    const card = document.createElement('div');
    card.className = 'product';
    const out = !!STOCK[key];
    card.innerHTML = `
      <div class="prodtop"><strong>${esc(p.emoji || '🍽️')} ${esc(p.label)}</strong><span class="price">${money(p.price)}</span></div>
      ${out ? '<div class="muted">Uitverkocht</div>' : ''}
      <div class="stepper">
        <button class="minus" ${out ? 'disabled' : ''}>−</button>
        <strong>${counts[key]}</strong>
        <button class="plus" ${out ? 'disabled' : ''}>+</button>
      </div>
      <div class="option"></div>`;
    const optionEl = card.querySelector('.option');
    const opts = optionsFor(p);
    opts.forEach(o => {
      const outOpt = !!STOCK_OPTIONS[String(o.label).toLowerCase()];
      const b = document.createElement('button');
      b.textContent = (o.emoji ? o.emoji + ' ' : '') + o.label + (outOpt ? ' (uitverkocht)' : '');
      b.disabled = outOpt;
      b.className = optionsByProduct[key].includes(o.label) ? 'active' : '';
      b.onclick = () => {
        if (optionsByProduct[key].includes(o.label)) optionsByProduct[key] = optionsByProduct[key].filter(x => x !== o.label);
        else optionsByProduct[key].push(o.label);
        renderProducts();
      };
      optionEl.appendChild(b);
    });
    card.querySelector('.minus').onclick = () => { counts[key] = Math.max(0, counts[key]-1); renderProducts(); };
    card.querySelector('.plus').onclick = () => { counts[key]++; renderProducts(); };
    el.appendChild(card);
  });
}

function submitOrder() {
  const sendError = document.getElementById('send-error');
  sendError.textContent = '';
  if (selectedTable == null) { sendError.textContent = 'Kies eerst een tafel.'; return; }

  const items = {};
  const itemOpties = {};
  Object.entries(counts).forEach(([key,n]) => {
    if (n > 0 && !STOCK[key]) {
      items[key] = n;
      if (optionsByProduct[key]?.length) itemOpties[key] = Array.from({length:n}, () => optionsByProduct[key].slice());
    }
  });
  if (!Object.keys(items).length) { sendError.textContent = 'Kies eerst minstens één product.'; return; }

  const order = {
    tableNumber: selectedTable,
    items,
    status: 'nieuw',
    tijd: Date.now(),
    deviceId
  };
  const note = document.getElementById('note').value.trim();
  if (note) order.opmerking = note;
  if (Object.keys(itemOpties).length) order.itemOpties = itemOpties;

  document.getElementById('send').disabled = true;
  restRef.child('orders').push().set(order).then(() => {
    counts = {};
    optionsByProduct = {};
    selectedTable = null;
    document.getElementById('note').value = '';
    document.getElementById('tab-mine').click();
  }).catch(err => {
    console.error(err);
    sendError.textContent = 'De bestelling kon niet worden verzonden.';
  }).finally(() => document.getElementById('send').disabled = false);
}
document.getElementById('send').onclick = submitOrder;

const ordersRef = restRef.child('orders');
ordersRef.on('value', snap => {
  const all = snap.val() || {};
  myOrders = Object.fromEntries(Object.entries(all).filter(([,o]) => o && o.deviceId === deviceId));
  renderMine();
});

function statusInfo(order) {
  const status = order.status;
  if (status === 'nieuw') return { label:'Ontvangen', pct:25, key:'nieuw' };
  if (status === 'bereiden') return { label:'Wordt bereid', pct:55, key:'bereiden' };
  if (status === 'klaar') return { label:'Klaar', pct:80, key:'klaar' };
  if (status === 'bezorgd') return { label:'Bezorgd / geserveerd', pct:100, key:'bezorgd' };
  return { label:status || 'Onbekend', pct:10, key:status };
}

function positionBefore(id, order) {
  if (!order || !['nieuw','bereiden','klaar'].includes(order.status)) return 0;
  return Object.entries(myOrders).filter(([oid,o]) => oid !== id && o.status === order.status && (o.tijd || 0) < (order.tijd || 0)).length;
}

function itemText(order) {
  return Object.entries(order.items || {}).map(([key,n]) => {
    const p = PRODUCTS[key];
    const label = p ? p.label : '(verwijderd product)';
    const opts = order.itemOpties?.[key]?.flat?.() || [];
    return `${n}x ${label}${opts.length ? ' — ' + opts.join(', ') : ''}`;
  }).join(' · ');
}

function renderMine() {
  const el = document.getElementById('mine');
  const entries = Object.entries(myOrders).sort((a,b)=>(b[1].tijd||0)-(a[1].tijd||0));
  if (!entries.length) {
    el.innerHTML = '<div class="card"><h2>Mijn bestellingen</h2><div class="muted">Je hebt op dit apparaat nog geen actieve bestellingen.</div></div>';
    return;
  }
  el.innerHTML = '<div class="card"><h2>Mijn bestellingen</h2><div class="small muted">Alleen bestellingen van dit apparaat worden hier getoond.</div></div>';
  entries.forEach(([id,o]) => {
    const st = statusInfo(o);
    const before = positionBefore(id,o);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div><strong>🪑 Tafel ${esc(o.tableNumber)}</strong> · <span class="status">${esc(st.label)}</span></div>
      <div class="progress"><div style="width:${st.pct}%"></div></div>
      <div>${esc(itemText(o))}</div>
      ${o.opmerking ? `<div class="small muted">Opmerking: "${esc(o.opmerking)}"</div>` : ''}
      ${['nieuw','bereiden'].includes(o.status) ? `<div class="small muted" style="margin-top:8px;">${before === 0 ? 'Je bestelling is aan de beurt.' : before + ' bestelling' + (before === 1 ? '' : 'en') + ' voor je in deze fase.'}</div>` : ''}
    `;
    el.appendChild(card);
  });
}

document.getElementById('tab-order').onclick = () => {
  document.getElementById('tab-order').classList.add('active');
  document.getElementById('tab-mine').classList.remove('active');
  document.getElementById('order-view').classList.remove('hidden');
  document.getElementById('mine-view').classList.add('hidden');
};
document.getElementById('tab-mine').onclick = () => {
  document.getElementById('tab-mine').classList.add('active');
  document.getElementById('tab-order').classList.remove('active');
  document.getElementById('mine-view').classList.remove('hidden');
  document.getElementById('order-view').classList.add('hidden');
};
