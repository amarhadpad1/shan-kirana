const app = document.querySelector('#app');
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
async function api(path, method = 'GET', body) {
  const r = await fetch('/api/admin/' + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== 'login') { boot(); throw new Error('Please log in.'); }
  if (!r.ok) throw new Error(d.error || 'Something went wrong.');
  return d;
}
function field(type, value, label, extra = {}) {
  const i = el('input'); i.type = type; i.value = value ?? ''; i.setAttribute('aria-label', label); i.placeholder = label;
  Object.assign(i, extra); return i;
}

async function boot() {
  const s = await fetch('/api/admin/status').then((r) => r.json()).catch(() => null);
  if (!s) { app.replaceChildren(el('p', 'msg err', 'Could not reach the server.')); return; }
  if (!s.setup) return authView(true);
  if (!s.loggedIn) return authView(false);
  return mainView();
}

function authView(setup) {
  const c = el('div', 'card');
  c.append(el('h2', 'cat', setup ? 'Create the shop password' : 'Log in'));
  if (setup) c.append(el('p', null, 'Choose a password for the shopkeeper. Use at least 6 characters and keep it private.'));
  const pw = field('password', '', 'Password', { autocomplete: setup ? 'new-password' : 'current-password' });
  const msg = el('p', 'msg'); const btn = el('button', 'btn', setup ? 'Save password' : 'Log in');
  const go = async () => {
    try { await api(setup ? 'setup' : 'login', 'POST', { password: pw.value }); boot(); }
    catch (e) { msg.textContent = e.message; msg.className = 'msg err'; }
  };
  btn.onclick = go;
pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  c.append(pw, el('p'), btn, msg); app.replaceChildren(c); pw.focus();
}

async function mainView() {
  const [items, shop] = await Promise.all([fetch('/api/items').then((r) => r.json()), fetch('/api/shop').then((r) => r.json())]);
  app.replaceChildren();
  const top = el('div'); top.style.cssText = 'display:flex;justify-content:space-between;margin-top:16px;gap:8px';
  const view = el('a', 'btn ghost', 'View customer site'); view.href = '/'; view.target = '_blank'; view.style.textDecoration = 'none';
  const out = el('button', 'btn ghost', 'Log out'); out.onclick = async () => { await api('logout', 'POST'); boot(); };
  top.append(view, out); app.append(top);

  const dl = el('datalist'); dl.id = 'cats';
  [...new Set(items.map((x) => x.category))].forEach((c) => { const o = el('option'); o.value = c; dl.append(o); });
  app.append(dl);

  const add = el('div', 'card'); add.append(el('h2', 'cat', 'Add an item'));
  const g = el('div', 'grid add5'); g.style.gridTemplateColumns = '2fr 1.4fr 1fr 1fr auto';
  const n = field('text', '', 'Item name'), cg = field('text', '', 'Category'), u = field('text', '1 kg', 'Unit'), p = field('number', '', 'Price (₹)', { min: 0, step: '0.01' });
  cg.setAttribute('list', 'cats');
  const ab = el('button', 'btn', 'Add item'); const am = el('p', 'msg');
  ab.onclick = async () => {
    try { await api('items', 'POST', { name: n.value, category: cg.value, unit: u.value, price: p.value, in_stock: true }); mainView(); }
    catch (e) { am.textContent = e.message; am.className = 'msg err'; }
  };
  g.append(n, cg, u, p, ab); add.append(g, am); app.append(add);

  const box = el('div', 'card'); box.append(el('h2', 'cat', 'Prices and stock'));
  const head = el('div', 'grid head'); ['Item', 'Category', 'Unit', 'Price (₹)', 'In stock', ''].forEach((t) => head.append(el('span', null, t))); box.append(head);
  const status = el('p', 'msg');
  items.forEach((it) => {
    const r = el('div', 'grid irow');
    const n = field('text', it.name, 'Item name'), c = field('text', it.category, 'Category'), u = field('text', it.unit, 'Unit'), p = field('number', it.price, 'Price (₹)', { min: 0, step: '0.01' });
    c.setAttribute('list', 'cats');
    const lab = el('label', 'chk'); const k = el('input'); k.type = 'checkbox'; k.checked = !!it.in_stock; lab.append(k, el('span', null, 'In stock'));
    const d = el('button', 'btn del', 'Delete');
    const save = async () => {
      try { await api('items/' + it.id, 'PUT', { name: n.value, category: c.value, unit: u.value, price: p.value, in_stock: k.checked }); status.textContent = 'Saved ' + n.value; status.className = 'msg'; }
      catch (e) { status.textContent = e.message; status.className = 'msg err'; }
    };
    [n, c, u, p, k].forEach((x) => x.addEventListener('change', save));
    d.onclick = async () => { if (confirm('Delete ' + it.name + '?')) { await api('items/' + it.id, 'DELETE'); mainView(); } };
    r.append(n, c, u, p, lab, d); box.append(r);
  });
  if (!items.length) box.append(el('p', 'msg', 'No items yet. Add your first item above.'));
  box.append(status); app.append(box);

  const st = el('div', 'card'); st.append(el('h2', 'cat', 'Shop settings'));
  st.append(el('p', null, 'WhatsApp number for orders, with country code and no spaces. Example: 919876543210'));
  const ph = field('tel', shop.phone, 'WhatsApp number'); const pm = el('p', 'msg'); const pb = el('button', 'btn', 'Save number');
  pb.onclick = async () => { try { await api('settings', 'PUT', { phone: ph.value }); pm.textContent = 'Saved.'; pm.className = 'msg'; } catch (e) { pm.textContent = e.message; pm.className = 'msg err'; } };
  st.append(ph, el('p'), pb, pm);
  st.append(el('h2', 'cat', 'Change password'));
  const cur = field('password', '', 'Current password'), nx = field('password', '', 'New password'); const cm = el('p', 'msg'); const cb = el('button', 'btn', 'Change password');
  cb.onclick = async () => { try { await api('password', 'PUT', { current: cur.value, next: nx.value }); cm.textContent = 'Password changed.'; cm.className = 'msg'; cur.value = nx.value = ''; } catch (e) { cm.textContent = e.message; cm.className = 'msg err'; } };
  st.append(cur, el('p'), nx, el('p'), cb, cm); app.append(st);
}
boot();