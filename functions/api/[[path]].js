// All API routes live here: /api/items, /api/shop, /api/admin/*
const enc = new TextEncoder();
const json = (d, s = 200, h = {}) =>
  new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const rand = (n = 16) => hex(crypto.getRandomValues(new Uint8Array(n)));

async function hashPw(pw, salt) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 }, k, 256));
}
const getSet = async (db, k) => (await db.prepare('SELECT value FROM settings WHERE key=?').bind(k).first())?.value ?? null;
const putSet = (db, k, v) => db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k, v).run();

async function loggedIn(req, db) {
  const m = (req.headers.get('Cookie') || '').match(/(?:^|;\s*)sid=([a-f0-9]+)/);
  if (!m) return false;
  const row = await db.prepare('SELECT 1 AS ok FROM sessions WHERE token=? AND expires>?').bind(m[1], Date.now()).first();
  return !!row;
}
async function startSession(db) {
  const token = rand(24);
  await db.prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()).run();
  await db.prepare('INSERT INTO sessions (token,expires) VALUES (?,?)').bind(token, Date.now() + 7 * 864e5).run();
  return { 'Set-Cookie': `sid=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 86400}` };
}
const cleanItem = (b) => ({
  name: String(b.name || '').trim().slice(0, 80),
  category: String(b.category || 'Other').trim().slice(0, 40) || 'Other',
  unit: String(b.unit || '1 kg').trim().slice(0, 30),
  price: Math.max(0, Number(b.price) || 0),
  in_stock: b.in_stock ? 1 : 0,
});

export async function onRequest({ request, env, params }) {
  const db = env.DB;
  if (!db) return json({ error: 'Database not connected. See README step 2.' }, 500);
  const path = [].concat(params.path || []);
  const method = request.method;
  const body = ['POST', 'PUT'].includes(method) ? await request.json().catch(() => ({})) : {};

  // ---- Public (read only) ----
  if (path[0] === 'items' && method === 'GET') {
    const { results } = await db.prepare('SELECT id,name,category,unit,price,in_stock FROM items ORDER BY category,name').all();
    return json(results);
  }
  if (path[0] === 'shop' && method === 'GET') return json({ phone: (await getSet(db, 'phone')) || '' });

  // ---- Admin ----
  if (path[0] !== 'admin') return json({ error: 'Not found' }, 404);
  const sub = path[1];
  const hasPw = !!(await getSet(db, 'pw_hash'));

  if (sub === 'status') return json({ setup: hasPw, loggedIn: await loggedIn(request, db) });

  if (sub === 'setup' && method === 'POST') {
    if (hasPw) return json({ error: 'Password already set.' }, 400);
    if (String(body.password || '').length < 6) return json({ error: 'Use at least 6 characters.' }, 400);
    const salt = rand();
    await putSet(db, 'pw_salt', salt);
    await putSet(db, 'pw_hash', await hashPw(body.password, salt));
    return json({ ok: true }, 200, await startSession(db));
  }
  if (sub === 'login' && method === 'POST') {
    const salt = await getSet(db, 'pw_salt');
    if (!salt) return json({ error: 'Set a password first.' }, 400);
    if ((await hashPw(String(body.password || ''), salt)) !== (await getSet(db, 'pw_hash'))) return json({ error: 'Wrong password.' }, 401);
    return json({ ok: true }, 200, await startSession(db));
  }
  if (sub === 'logout') return json({ ok: true }, 200, { 'Set-Cookie': 'sid=; Path=/; Max-Age=0' });

  if (!(await loggedIn(request, db))) return json({ error: 'Please log in.' }, 401);

  if (sub === 'items') {
    const id = Number(path[2]);
    if (method === 'POST') {
      const i = cleanItem(body);
      if (!i.name) return json({ error: 'Item name is required.' }, 400);
      const r = await db.prepare('INSERT INTO items (name,category,unit,price,in_stock) VALUES (?,?,?,?,?)').bind(i.name, i.category, i.unit, i.price, i.in_stock).run();
      return json({ ok: true, id: r.meta.last_row_id });
    }
    if (method === 'PUT' && id) {
      const i = cleanItem(body);
      if (!i.name) return json({ error: 'Item name is required.' }, 400);
      await db.prepare('UPDATE items SET name=?,category=?,unit=?,price=?,in_stock=? WHERE id=?').bind(i.name, i.category, i.unit, i.price, i.in_stock, id).run();
      return json({ ok: true });
    }
    if (method === 'DELETE' && id) {
      await db.prepare('DELETE FROM items WHERE id=?').bind(id).run();
      return json({ ok: true });
    }
  }
  if (sub === 'settings' && method === 'PUT') {
    await putSet(db, 'phone', String(body.phone || '').replace(/\D/g, '').slice(0, 15));
    return json({ ok: true });
  }
  if (sub === 'password' && method === 'PUT') {
    const salt = await getSet(db, 'pw_salt');
    if ((await hashPw(String(body.current || ''), salt)) !== (await getSet(db, 'pw_hash'))) return json({ error: 'Current password is wrong.' }, 401);
    if (String(body.next || '').length < 6) return json({ error: 'Use at least 6 characters.' }, 400);
    const ns = rand();
    await putSet(db, 'pw_salt', ns);
    await putSet(db, 'pw_hash', await hashPw(body.next, ns));
    return json({ ok: true });
  }
  return json({ error: 'Not found' }, 404);
}