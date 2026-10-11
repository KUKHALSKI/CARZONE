const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const get = (k, d) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : d; } catch (e) { return d; } };
const put = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const money = n => '$' + Number(n).toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"']/g, m => '&#' + m.charCodeAt(0) + ';');
const PER_PAGE = 8, TAX = 0.1, DELIVERY = 500;

// generated car illustration (used as default image / fallback)
const COLORS = { BMW: '#2a6df4', Mercedes: '#8d99a6', Toyota: '#e4572e', Audi: '#c1121f', Tesla: '#1f2937' };
function art(brand) {
  const c = COLORS[brand] || '#0f766e';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225"><rect width="400" height="225" fill="#e3e9ef"/><rect y="170" width="400" height="55" fill="#cdd6df"/><path d="M40 150L80 112Q100 90 140 88H240Q282 90 312 120L360 140Q374 146 374 160V172H28V160Q28 152 40 150Z" fill="${c}"/><path d="M92 114L135 98H190V128H80ZM205 98H245Q268 100 286 128H205Z" fill="#d6ecff"/><circle cx="105" cy="172" r="26" fill="#111"/><circle cx="105" cy="172" r="11" fill="#ddd"/><circle cx="300" cy="172" r="26" fill="#111"/><circle cx="300" cy="172" r="11" fill="#ddd"/></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
const mk = (id, brand, model, year, price, fuel, transmission, engine) =>
  ({ id, brand, model, year, price, fuel, transmission, engine, image: 'images/' + (brand + ' ' + model).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.jpg', custom: false });

const DEFAULT_CARS = [
  mk(1, 'BMW', 'M4', 2023, 65000, 'Petrol', 'Automatic', '3.0L'),
  mk(2, 'BMW', 'X5', 2021, 58000, 'Diesel', 'Automatic', '3.0L'),
  mk(3, 'Mercedes', 'C-Class', 2022, 52000, 'Hybrid', 'Automatic', '2.0L'),
  mk(4, 'Mercedes', 'E-Class', 2020, 48000, 'Diesel', 'Automatic', '2.0L'),
  mk(5, 'Toyota', 'Camry', 2022, 29000, 'Hybrid', 'Automatic', '2.5L'),
  mk(6, 'Toyota', 'Corolla', 2019, 18000, 'Petrol', 'Manual', '1.8L'),
  mk(7, 'Toyota', 'Land Cruiser', 2023, 82000, 'Diesel', 'Automatic', '3.3L'),
  mk(8, 'Audi', 'A6', 2021, 54000, 'Petrol', 'Automatic', '2.0L'),
  mk(9, 'Audi', 'A3', 2018, 22000, 'Diesel', 'Manual', '1.6L'),
  mk(10, 'Tesla', 'Model 3', 2023, 42000, 'Electric', 'Automatic', 'Dual Motor'),
  mk(11, 'Tesla', 'Model S', 2022, 95000, 'Electric', 'Automatic', 'Tri Motor'),
  mk(12, 'Audi', 'Q7', 2020, 61000, 'Petrol', 'Automatic', '3.0L')
];

// state
let cars = get('cars', null) || DEFAULT_CARS;
cars.forEach(c => { const d = DEFAULT_CARS.find(x => x.id === c.id); if (!c.custom && d) c.image = d.image; });
let favs = get('favorites', []);
let cart = get('cart', []);
let cmp = [], coupon = 0, statsDone = false;
const S = { q: '', brand: 'All', fuel: 'All', tr: 'All', min: '', max: '', slider: 150000, sort: 'default', page: 1 };
const save = () => { put('cars', cars); put('favorites', favs); put('cart', cart); };

// notifications
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast in';
  t.innerText = msg;
  $('#toasts').append(t);
  setTimeout(() => { t.classList.replace('in', 'out'); setTimeout(() => t.remove(), 300); }, 2500);
}

// filter + sort
const SORTS = {
  p1: (a, b) => a.price - b.price, p2: (a, b) => b.price - a.price,
  n1: (a, b) => (a.brand + a.model).localeCompare(b.brand + b.model),
  n2: (a, b) => (b.brand + b.model).localeCompare(a.brand + a.model),
  y1: (a, b) => b.year - a.year, y2: (a, b) => a.year - b.year
};
function filtered() {
  const q = S.q.trim().toLowerCase();
  const lo = Number(S.min) || 0;
  const hi = Math.min(Number(S.max) || Infinity, S.slider);
  const list = cars.filter(c =>
    (c.brand + ' ' + c.model).toLowerCase().includes(q) &&
    (S.brand === 'All' || c.brand === S.brand) &&
    (S.fuel === 'All' || c.fuel === S.fuel) &&
    (S.tr === 'All' || c.transmission === S.tr) &&
    c.price >= lo && c.price <= hi);
  if (SORTS[S.sort]) list.sort(SORTS[S.sort]);
  return list;
}

// rendering
function cardHTML(c, inFav) {
  const isFav = favs.includes(c.id), inCmp = cmp.includes(c.id);
  return `<article class="card"><div class="im"><img src="${esc(c.image)}" alt="${esc(c.brand + ' ' + c.model)}" data-b="${esc(c.brand)}" onerror="this.onerror=null;this.src=art(this.dataset.b)"></div>
  <div class="cb"><small>${esc(c.brand)}</small><h3>${esc(c.model)}</h3>
  <div class="meta"><span>${c.year}</span><span>${esc(c.fuel)}</span><span>${esc(c.transmission)}</span></div>
  <b class="pr">${money(c.price)}</b>
  <div class="row">
    ${inFav ? `<button data-a="fav" data-id="${c.id}">Remove From Favorites</button>` : `<button class="${isFav ? 'on' : ''}" data-a="fav" data-id="${c.id}" aria-label="Favorite">❤️</button>`}
    <button data-a="det" data-id="${c.id}">Details</button>
    <button class="${inCmp ? 'on' : ''}" data-a="cmp" data-id="${c.id}">⇄ Compare</button>
    <button class="add" data-a="cart" data-id="${c.id}">Add To Cart</button>
    ${c.custom ? `<button class="dl" data-a="del" data-id="${c.id}">DELETE</button>` : ''}
  </div></div></article>`;
}
const emptyHTML = msg => `<div class="empty"><div>🚗</div>${msg}</div>`;

function renderCars() {
  const list = filtered();
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  if (S.page > pages) S.page = pages;
  const slice = list.slice((S.page - 1) * PER_PAGE, S.page * PER_PAGE);
  $('#grid').innerHTML = slice.length ? slice.map(c => cardHTML(c)).join('') : emptyHTML('<h3>No cars found.</h3><p>Try another search.</p>');
  let pg = '';
  if (pages > 1) {
    pg = `<button data-a="page" data-p="${S.page - 1}">&lt;</button>`;
    for (let i = 1; i <= pages; i++) pg += `<button class="${i === S.page ? 'cur' : ''}" data-a="page" data-p="${i}">${i}</button>`;
    pg += `<button data-a="page" data-p="${S.page + 1}">&gt;</button>`;
  }
  $('#pager').innerHTML = pg;
}
function renderFav() {
  const list = cars.filter(c => favs.includes(c.id));
  $('#favGrid').innerHTML = list.length ? list.map(c => cardHTML(c, true)).join('') : emptyHTML('<h3>No favorite cars yet.</h3>');
  $('#favN').innerText = favs.length;
}
function totals() {
  const sub = cart.reduce((s, i) => { const c = cars.find(x => x.id === i.id); return s + (c ? c.price * i.qty : 0); }, 0);
  const disc = sub * coupon, tax = (sub - disc) * TAX, del = sub > 0 ? DELIVERY : 0;
  return { sub, disc, tax, del, total: sub - disc + tax + del };
}
function renderCart() {
  const rows = cart.map(i => {
    const c = cars.find(x => x.id === i.id);
    return c ? `<div class="ci"><div><b>${esc(c.brand)} ${esc(c.model)}</b><br>${money(c.price)}</div>
      <div class="qty"><button data-a="dec" data-id="${c.id}">-</button><span>${i.qty}</span><button data-a="inc" data-id="${c.id}">+</button></div>
      <button class="dl" style="background:none;color:#c1121f" data-a="rm" data-id="${c.id}">Remove</button></div>` : '';
  }).join('');
  $('#cartList').innerHTML = rows || '<p class="empty">Your cart is empty.</p>';
  const t = totals();
  $('#totals').innerHTML = `<div><span>Subtotal</span><span>${money(t.sub)}</span></div>` +
    (coupon ? `<div><span>Discount (10%)</span><span>-${money(t.disc)}</span></div>` : '') +
    `<div><span>Tax (10%)</span><span>${money(t.tax)}</span></div><div><span>Delivery</span><span>${money(t.del)}</span></div><div class="t"><span>TOTAL</span><span>${money(t.total)}</span></div>`;
  $('#cartN').innerText = cart.reduce((s, i) => s + i.qty, 0);
}
function renderCmpBar() {
  $('#cmpbar').innerHTML = cmp.length ? `<b>Compare ${cmp.length}/2</b><button class="btn2" data-a="cmpview" ${cmp.length < 2 ? 'disabled style="opacity:.5"' : ''}>View</button><button class="reset" data-a="cmpclear">Clear</button>` : '';
}
function renderAll() { renderCars(); renderFav(); renderCart(); renderCmpBar(); save(); }

// modal
function openModal(html) { $('#mbody').innerHTML = html; $('#modal').classList.add('open'); }
function closeModal() { $('#modal').classList.remove('open'); }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  const open = $('#modal').classList.contains('open');
  if (open && $('#galImg') && gal.imgs.length > 1) {
    if (e.key === 'ArrowLeft') galMove(-1);
    else if (e.key === 'ArrowRight') galMove(1);
  }
});

// actions
let gal = { imgs: [], i: 0 };
function galGo(i) {
  const img = $('#galImg');
  if (!img) return;
  gal.i = (i + gal.imgs.length) % gal.imgs.length;
  img.onerror = function () { this.onerror = null; this.src = art(this.dataset.b); };
  img.src = gal.imgs[gal.i];
  const cnt = $('#galCnt');
  if (cnt) cnt.innerText = (gal.i + 1) + ' / ' + gal.imgs.length;
  $$('.th').forEach((t, k) => t.classList.toggle('on', k === gal.i));
}
function galMove(d) { galGo(gal.i + d); }
function details(id) {
  const c = cars.find(x => x.id === id);
  gal = { imgs: c.images && c.images.length ? c.images : [c.image], i: 0 };
  const many = gal.imgs.length > 1;
  const fallback = `data-b="${esc(c.brand)}" onerror="this.onerror=null;this.src=art(this.dataset.b)"`;
  const nav = many
    ? `<button class="gnav prev" data-a="gal" data-d="-1" aria-label="Previous photo">&#8249;</button>
       <button class="gnav next" data-a="gal" data-d="1" aria-label="Next photo">&#8250;</button>
       <span class="gcnt" id="galCnt">1 / ${gal.imgs.length}</span>` : '';
  const thumbs = many
    ? `<div class="thumbs">${gal.imgs.map((u, k) => `<button class="th ${k === 0 ? 'on' : ''}" data-a="galgo" data-i="${k}" aria-label="Photo ${k + 1}"><img src="${esc(u)}" ${fallback} alt=""></button>`).join('')}</div>` : '';
  openModal(`<div class="gal"><img id="galImg" src="${esc(gal.imgs[0])}" ${fallback} alt="">${nav}</div>
  ${thumbs}
  <div class="dhead"><div><small class="dbrand">${esc(c.brand)}</small><h2>${esc(c.model)}</h2></div><b class="dprice">${money(c.price)}</b></div>
  <div class="specs">
    <div><span>Year</span><b>${c.year}</b></div>
    <div><span>Engine</span><b>${esc(c.engine || 'N/A')}</b></div>
    <div><span>Fuel</span><b>${esc(c.fuel)}</b></div>
    <div><span>Transmission</span><b>${esc(c.transmission)}</b></div>
  </div>
  <button class="btn2 full" data-a="cart" data-id="${id}">Add To Cart</button>`);
}
function toggleFav(id) {
  if (favs.includes(id)) { favs = favs.filter(x => x !== id); toast('Car removed'); }
  else { favs.push(id); toast('♥ Added to favorites'); }
  renderAll();
}
function addCart(id) {
  const c = cars.find(x => x.id === id), item = cart.find(i => i.id === id);
  if (item) item.qty++; else cart.push({ id, qty: 1 });
  toast(`✓ ${c.brand} ${c.model} added to cart`);
  renderAll();
}
function qty(id, d) {
  const item = cart.find(i => i.id === id);
  item.qty += d;
  if (item.qty <= 0) { cart = cart.filter(i => i.id !== id); toast('Car removed'); }
  renderAll();
}
function removeCart(id) { cart = cart.filter(i => i.id !== id); toast('Car removed'); renderAll(); }
function toggleCmp(id) {
  if (cmp.includes(id)) cmp = cmp.filter(x => x !== id);
  else { if (cmp.length === 2) cmp.pop(); cmp.push(id); }
  renderCmpBar(); renderCars();
}
function showCmp() {
  const [a, b] = cmp.map(id => cars.find(c => c.id === id));
  const col = c => `<div><img src="${esc(c.image)}" data-b="${esc(c.brand)}" onerror="this.onerror=null;this.src=art(this.dataset.b)" alt=""><h3>${esc(c.brand)} ${esc(c.model)}</h3><p>Price: ${money(c.price)}</p><p>Year: ${c.year}</p><p>Fuel: ${esc(c.fuel)}</p><p>Transmission: ${esc(c.transmission)}</p></div>`;
  openModal(`<h2>${esc(a.brand)} ${esc(a.model)} VS ${esc(b.brand)} ${esc(b.model)}</h2><div class="cmp">${col(a)}${col(b)}</div>`);
}
function askDelete(id) {
  openModal(`<h2>Are you sure?</h2><br><div class="row"><button data-a="close">Cancel</button><button class="add" data-a="delok" data-id="${id}">Delete</button></div>`);
}
function doDelete(id) {
  cars = cars.filter(c => c.id !== id);
  favs = favs.filter(x => x !== id); cart = cart.filter(i => i.id !== id); cmp = cmp.filter(x => x !== id);
  closeModal(); toast('Car removed'); renderAll();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b) return;
  const id = Number(b.dataset.id), a = b.dataset.a;
  if (a === 'fav') toggleFav(id);
  else if (a === 'cart') addCart(id);
  else if (a === 'det') details(id);
  else if (a === 'cmp') toggleCmp(id);
  else if (a === 'inc') qty(id, 1);
  else if (a === 'dec') qty(id, -1);
  else if (a === 'rm') removeCart(id);
  else if (a === 'del') askDelete(id);
  else if (a === 'delok') doDelete(id);
  else if (a === 'close') closeModal();
  else if (a === 'gal') galMove(Number(b.dataset.d));
  else if (a === 'galgo') galGo(Number(b.dataset.i));
  else if (a === 'cmpview') { if (cmp.length === 2) showCmp(); }
  else if (a === 'cmpclear') { cmp = []; renderCmpBar(); renderCars(); }
  else if (a === 'page') {
    const p = Number(b.dataset.p), max = Math.ceil(filtered().length / PER_PAGE);
    if (p >= 1 && p <= max) { S.page = p; renderCars(); }
  }
});

// filters
function readFilters() {
  S.brand = $('#fBrand').value; S.fuel = $('#fFuel').value; S.tr = $('#fTr').value;
  S.min = $('#fMin').value; S.max = $('#fMax').value; S.sort = $('#fSort').value;
  S.slider = Number($('#fRange').value);
  $('#rangeV').innerText = money(S.slider);
  S.page = 1; renderCars();
}
['#fBrand', '#fFuel', '#fTr', '#fSort'].forEach(s => $(s).addEventListener('change', readFilters));
['#fMin', '#fMax', '#fRange'].forEach(s => $(s).addEventListener('input', readFilters));
$('#hsearch').addEventListener('input', e => { S.q = e.target.value; S.page = 1; renderCars(); });
$('#reset').addEventListener('click', () => {
  $('#hsearch').value = ''; S.q = '';
  ['#fBrand', '#fFuel', '#fTr'].forEach(s => $(s).value = 'All');
  $('#fMin').value = ''; $('#fMax').value = ''; $('#fSort').value = 'default'; $('#fRange').value = 150000;
  readFilters();
});

// coupon
$('#applyCp').addEventListener('click', () => {
  const code = $('#coupon').value.trim().toUpperCase();
  if (code === 'CAR10') { coupon = 0.1; $('#cpMsg').className = 'ok'; $('#cpMsg').innerText = 'Coupon applied: 10% off'; }
  else { coupon = 0; $('#cpMsg').className = 'err'; $('#cpMsg').innerText = 'Invalid Coupon'; }
  renderCart();
});

// validation helper: rules = [id, testFn, message]
function check(rules) {
  let ok = true;
  rules.forEach(([id, fn, msg]) => {
    const bad = !fn($('#' + id).value.trim());
    $('#e-' + id).innerText = bad ? msg : '';
    if (bad) ok = false;
  });
  return ok;
}
const filled = v => v.length > 0;
const emailOk = v => /^\S+@\S+\.\S+$/.test(v);

// checkout
$('#checkout').addEventListener('submit', e => {
  e.preventDefault();
  if (!cart.length) { toast('Your cart is empty'); return; }
  const ok = check([
    ['co-name', filled, 'Please enter your name.'],
    ['co-email', emailOk, 'Please enter a valid email.'],
    ['co-phone', v => v.replace(/\D/g, '').length >= 7, 'Please enter a valid phone number.'],
    ['co-addr', filled, 'Please enter your address.'],
    ['co-card', v => /^\d{12,19}$/.test(v.replace(/\s/g, '')), 'Card number must have 12-19 digits.']
  ]);
  if (!ok) return;
  const t = totals();
  const id = 'CZ-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 900 + 100);
  const d = new Date().toLocaleString();
  cart = []; coupon = 0; $('#coupon').value = ''; $('#cpMsg').innerText = '';
  e.target.reset(); renderAll();
  toast('Order placed successfully!');
  openModal(`<h2>Order Successful!</h2><p>Thank you for your purchase.</p><br><p>Order ID: <b>${id}</b></p><p>Total: ${money(t.total)}</p><p>${d}</p><br><button class="btn2" data-a="close">Close</button>`);
});

// add car

// photos from a MyAuto link, through the small Node backend (server.js)
const API = 'http://localhost:3000';
async function loadFromLink() {
  const link = $('#ac-link').value.trim();
  const msg = $('#fetchMsg');
  if (!link) {
    msg.className = 'err';
    msg.innerText = 'Please paste a MyAuto link first.';
    return false;
  }
  msg.className = 'ok';
  msg.innerText = 'Loading photos...';
  try {
    const r = await fetch(API + '/api/photos?url=' + encodeURIComponent(link));
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Request failed.');
    $('#ac-img').value = data.photos.join('\n');
    msg.innerText = 'Found ' + data.photos.length + ' photos. Check them below, then press ADD CAR.';
    return true;
  } catch (err) {
    msg.className = 'err';
    msg.innerText = err instanceof TypeError
      ? 'The backend is not running. Start it with:  node server.js'
      : err.message;
    return false;
  }
}
$('#fetchPhotos').addEventListener('click', loadFromLink);

$('#addForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!$('#ac-img').value.trim() && $('#ac-link').value.trim()) await loadFromLink();
  const year = Number($('#ac-year').value), maxYear = new Date().getFullYear() + 1;
  const ok = check([
    ['ac-brand', filled, 'Please enter car brand.'],
    ['ac-model', filled, 'Please enter car model.'],
    ['ac-year', v => Number(v) >= 1950 && Number(v) <= maxYear, `Please enter a year between 1950 and ${maxYear}.`],
    ['ac-price', v => Number(v) > 0, 'Please enter a price greater than 0.'],
    ['ac-img', filled, 'Please enter an image URL.']
  ]);
  if (!ok) return;
  const urls = $('#ac-img').value.trim().split(/\s+/).filter(Boolean);
  const newId = Math.max(0, ...cars.map(c => c.id)) + 1;
  cars.push({ id: newId, brand: $('#ac-brand').value.trim(), model: $('#ac-model').value.trim(), year,
    price: Number($('#ac-price').value), fuel: $('#ac-fuel').value, transmission: $('#ac-tr').value,
    engine: 'N/A', image: urls[0], images: urls, custom: true });
  e.target.reset(); $('#fetchMsg').innerText = ''; renderAll(); toast('✓ Car added');
});

// contact
$('#contactForm').addEventListener('submit', e => {
  e.preventDefault();
  $('#ctOk').innerText = '';
  if (check([['ct-name', filled, 'Please enter your name.'], ['ct-email', emailOk, 'Please enter a valid email.'], ['ct-msg', filled, 'Please enter a message.']])) {
    $('#ctOk').innerText = 'Message sent successfully!'; e.target.reset();
  }
});

// theme (saved in localStorage)
function setTheme(dark) {
  document.body.classList.toggle('dark', dark);
  $('#theme').innerText = dark ? '☀️' : '🌙';
  put('theme', dark ? 'dark' : 'light');
}
$('#theme').addEventListener('click', () => setTheme(!document.body.classList.contains('dark')));
setTheme(get('theme', 'light') === 'dark');

// mobile menu
$('#burger').addEventListener('click', () => $('#nav').classList.toggle('open'));
$$('#nav a').forEach(a => a.addEventListener('click', () => $('#nav').classList.remove('open')));

// scroll animation + stats counter
function countUp() {
  if (statsDone) return;
  statsDone = true;
  $$('[data-n]').forEach(el => {
    const to = Number(el.dataset.n), step = Math.ceil(to / 60);
    let n = 0;
    const timer = setInterval(() => {
      n = Math.min(n + step, to);
      el.innerText = n + (el.dataset.p || '');
      if (n >= to) clearInterval(timer);
    }, 30);
  });
}
const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (en.isIntersecting) { en.target.classList.add('show'); if (en.target.id === 'about') countUp(); }
  else en.target.classList.remove('show');
}), { threshold: 0.1 });
$$('.rv').forEach(s => io.observe(s));

// init
$('#heroImg').onerror = function () { this.onerror = null; this.src = art('BMW'); };
$('#heroImg').src = 'images/hero.jpg';
$('#copy').innerText = '© ' + new Date().getFullYear() + ' CARZONE';
renderAll();
setTimeout(() => $('#loader').classList.add('hide'), 1200);