const $ = (s) => document.querySelector(s);
const rs = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
let items = [], cart = {}, cat = 'All', q = '', phone = '';

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

async function load() {
  try {
    const [i, s] = await Promise.all([fetch('/api/items').then((r) => r.json()), fetch('/api/shop').then((r) => r.json())]);
    items = Array.isArray(i) ? i : []; phone = s.phone || '';
  } catch (e) { $('#list').replaceChildren(el('p', 'empty', 'Could not load prices. Check your internet and refresh.')); return; }
  const ids = new Set(items.map((x) => x.id));
  Object.keys(cart).forEach((k) => { if (!ids.has(+k)) delete cart[k]; });
  render();
}

function render() {
  const cats = ['All', ...new Set(items.map((x) => x.category))];
  if (!cats.includes(cat)) cat = 'All';
  const chips = $('#chips'); chips.replaceChildren();
  cats.forEach((c) => {
    const b = el('button', 'chip', c); b.setAttribute('aria-pressed', c === cat);
    b.onclick = () => { cat = c; render(); }; chips.append(b);
  });
  const list = $('#list'); list.replaceChildren();
  const shown = items.filter((x) => (cat === 'All' || x.category === cat) && x.name.toLowerCase().includes(q));
  if (!shown.length) list.append(el('p', 'empty', items.length ? 'No items match your search.' : 'The shop has not added items yet.'));
  let last = '';
  shown.forEach((x) => {
    if (x.category !== last) { list.append(el('h2', 'cat', x.category)); last = x.category; }
    const row = el('div', 'row' + (x.in_stock ? '' : ' out'));
    const nm = el('div', 'nm'); nm.append(el('b', null, x.name), el('small', null, x.unit));
    row.append(nm, el('div', 'pr', rs(x.price)));
    if (!x.in_stock) row.append(el('span', 'out-tag', 'Out of stock'));
    else if (!cart[x.id]) { const a = el('button', 'add', 'Add'); a.onclick = () => setQty(x.id, 1); row.append(a); }
    else {
      const w = el('div', 'qty'); const m = el('button', null, '−'), p = el('button', null, '+');
      m.setAttribute('aria-label', 'Remove one ' + x.name); p.setAttribute('aria-label', 'Add one ' + x.name);
      m.onclick = () => setQty(x.id, -1); p.onclick = () => setQty(x.id, 1);
      w.append(m, el('span', null, cart[x.id]), p); row.append(w);
    }
    list.append(row);
  });
  summary();
}

function setQty(id, d) { cart[id] = (cart[id] || 0) + d; if (cart[id] <= 0) delete cart[id]; render(); }

function lines() { return items.filter((x) => cart[x.id] && x.in_stock).map((x) => ({ x, n: cart[x.id] })); }
function summary() {
  const ls = lines(), total = ls.reduce((s, l) => s + l.x.price * l.n, 0), n = ls.reduce((s, l) => s + l.n, 0);
  $('#bar').classList.toggle('on', n > 0);
  $('#count').textContent = n + (n === 1 ? ' item' : ' items');
  $('#total').textContent = 'Total ' + rs(total);
}

$('#q').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); render(); });
$('#send').onclick = () => {
  const ls = lines(); if (!ls.length) return;
  const total = ls.reduce((s, l) => s + l.x.price * l.n, 0);
  const text = 'Order for Shan Kirana Shop\n' + ls.map((l) => `${l.x.name} (${l.x.unit}) x ${l.n} = ${rs(l.x.price * l.n)}`).join('\n') + `\nTotal: ${rs(total)}`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
};
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
setInterval(load, 60000);
load();