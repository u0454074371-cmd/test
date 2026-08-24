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

function mix(hex, target, amt) {
  if (!hex || !target) return hex || target;
  const a = hex.replace('#','');
  const b = target.replace('#','');
  const ar = parseInt(a.slice(0,2),16), ag = parseInt(a.slice(2,4),16), ab = parseInt(a.slice(4,6),16);
  const br = parseInt(b.slice(0,2),16), bg = parseInt(b.slice(2,4),16), bb = parseInt(b.slice(4,6),16);
  const c = n => Math.round(n).toString(16).padStart(2,'0');
  return '#' + c(ar + (br-ar)*amt) + c(ag + (bg-ag)*amt) + c(ab + (bb-ab)*amt);
}
function relativeLuminance(hex) {
  const h = String(hex || '#171310').replace('#','');
  const rgb = [0,2,4].map(i => parseInt(h.slice(i,i+2),16)/255).map(v => v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055,2.4));
  return .2126*rgb[0] + .7152*rgb[1] + .0722*rgb[2];
}
function applyRestaurantTheme(r) {
  const root = document.documentElement.style;
  const bg = r.headerColor || '#171310';
  const isLight = relativeLuminance(bg) > .5;
  root.setProperty('--bg', bg);
  root.setProperty('--bg-elevated', mix(bg, isLight ? '#000000' : '#ffffff', .08));
  root.setProperty('--card', mix(bg, isLight ? '#000000' : '#ffffff', .16));
  root.setProperty('--line', mix(bg, isLight ? '#000000' : '#ffffff', .32));
  root.setProperty('--ink', isLight ? '#241c12' : '#f3ead9');
  root.setProperty('--muted', isLight ? '#5a4c38' : '#a99a83');
  if (r.font) { root.setProperty('--font-body', r.font); root.setProperty('--font-display', r.font); }
  else { root.removeProperty('--font-body'); root.removeProperty('--font-display'); }
  const title = document.getElementById('restaurant-name');
  if (title) {
    if (r.titleColor) { title.style.background='none'; title.style.webkitTextFillColor=r.titleColor; title.style.color=r.titleColor; }
    else { title.style.background=''; title.style.webkitTextFillColor=''; title.style.color=''; }
  }
}

restRef.on('value', snap => {
  const r = snap.val() || {};
  document.getElementById('restaurant-name').textContent = r.naam || r.name || 'Restaurant';
  applyRestaurantTheme(r);
  PRODUCTS = r.products || {};
  TABLES = r.floorplan?.tables || {};
  STOCK = r.stock || {};
  STOCK_OPTIONS = r.stockOpties || {};
  renderTables();
  renderProducts();
  renderMine();
  appEl.classList.remove('selfservice-hidden');
}, err => {
  errorEl.textContent = 'Het restaurant kon niet worden geladen.';
  console.error(err);
});

function renderTables() {
  const el = document.getElementById('tables');
  const tables = Object.entries(TABLES).filter(([,t]) => (t.kind || 'tafel') === 'tafel');
  el.innerHTML = tables.length ? '' : '<div class="selfservice-muted">Er zijn nog geen tafels ingesteld.</div>';
  tables.forEach(([id,t]) => {
    const b = document.createElement('button');
    b.className = 'selfservice-table' + (selectedTable === t.number ? ' active' : '');
    b.textContent = '🪑 Tafel ' + t.number;
    b.onclick = () => { selectedTable = t.number; renderTables(); };
    el.appendChild(b);
  });
}

function renderProducts() {
  const el = document.getElementById('products');
  const entries = Object.entries(PRODUCTS);
  el.innerHTML = '';
  if (!entries.length) { el.innerHTML = '<div class="selfservice-muted">Dit restaurant heeft nog geen producten ingesteld.</div>'; return; }

  entries.forEach(([key,p]) => {
    if (counts[key] == null) counts[key] = 0;
    if (!optionsByProduct[key]) optionsByProduct[key] = [];
    const card = document.createElement('div');
    card.className = 'selfservice-product';
    const out = !!STOCK[key];
    card.innerHTML = `
      <div class="selfservice-prodtop"><div class="selfservice-product-name"><span class="selfservice-product-emoji">${esc(p.emoji || '🍽️')}</span><strong>${esc(p.label)}</strong></div><span class="selfservice-price">${money(p.price)}</span></div>
      ${out ? '<div class="selfservice-out">Uitverkocht</div>' : ''}
      <div class="selfservice-stepper">
        <button class="minus" ${out ? 'disabled' : ''}>−</button>
        <strong>${counts[key]}</strong>
        <button class="plus" ${out ? 'disabled' : ''}>+</button>
      </div>
      <div class="selfservice-option"></div>`;
    const optionEl = card.querySelector('.selfservice-option');
    const opts = optionsFor(p);
    opts.forEach(o => {
      const outOpt = !!STOCK_OPTIONS[String(o.label).toLowerCase()];
      const b = document.createElement('button');
      b.textContent = (o.emoji ? o.emoji + ' ' : '') + o.label + (outOpt ? ' (uitverkocht)' : '');
      b.disabled = outOpt;
      b.className = 'selfservice-option-button' + (optionsByProduct[key].includes(o.label) ? ' active' : '');
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
    el.innerHTML = '<div class="selfservice-card"><h2>Mijn bestellingen</h2><div class="muted">Je hebt op dit apparaat nog geen actieve bestellingen.</div></div>';
    return;
  }
  el.innerHTML = '<div class="selfservice-card"><h2>Mijn bestellingen</h2><div class="selfservice-device-note">Alleen bestellingen van dit apparaat worden hier getoond.</div></div>';
  entries.forEach(([id,o]) => {
    const st = statusInfo(o);
    const before = positionBefore(id,o);
    const card = document.createElement('div');
    card.className = 'selfservice-card selfservice-order-card';
    card.innerHTML = `
      <div class="selfservice-order-top"><strong>🪑 Tafel ${esc(o.tableNumber)}</strong><span class="selfservice-status">${esc(st.label)}</span></div>
      <div class="selfservice-progress"><div style="width:${st.pct}%"></div></div>
      <div class="selfservice-items">${esc(itemText(o))}</div>
      ${o.opmerking ? `<div class="selfservice-small selfservice-muted">Opmerking: "${esc(o.opmerking)}"</div>` : ''}
      ${['nieuw','bereiden'].includes(o.status) ? `<div class="selfservice-small selfservice-muted" style="margin-top:8px;">${before === 0 ? 'Je bestelling is aan de beurt.' : before + ' bestelling' + (before === 1 ? '' : 'en') + ' voor je in deze fase.'}</div>` : ''}
    `;
    el.appendChild(card);
  });
}

document.getElementById('tab-order').onclick = () => {
  document.getElementById('tab-order').classList.add('active');
  document.getElementById('tab-mine').classList.remove('active');
  document.getElementById('order-view').classList.remove('selfservice-hidden');
  document.getElementById('mine-view').classList.add('selfservice-hidden');
};
document.getElementById('tab-mine').onclick = () => {
  document.getElementById('tab-mine').classList.add('active');
  document.getElementById('tab-order').classList.remove('active');
  document.getElementById('mine-view').classList.remove('selfservice-hidden');
  document.getElementById('order-view').classList.add('selfservice-hidden');
};
