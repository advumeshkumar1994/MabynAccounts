import { createServer } from 'node:http';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { promisify } from 'node:util';

const { ADMIN_EMAIL, ADMIN_PASSWORD, PORT = '3000', DB_PATH = './data/mabyn.sqlite' } = process.env;
const production = process.env.NODE_ENV === 'production';
if (!ADMIN_EMAIL?.trim() || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 16) {
  throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 16 characters.');
}

const deriveKey = promisify(scrypt);
const salt = randomBytes(32);
const passwordKey = await deriveKey(ADMIN_PASSWORD, salt, 64);
const sessionLifetime = 8 * 60 * 60;
const cookieName = production ? '__Host-mabyn' : 'mabyn';
const hash = value => createHash('sha256').update(value).digest('hex');
mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
// A restart invalidates previous sessions, including after credential rotation.
db.exec('DELETE FROM sessions');
const session = db.prepare('SELECT 1 FROM sessions WHERE token_hash = ? AND expires_at > ?');
const addSession = db.prepare('INSERT INTO sessions VALUES (?, ?)');
const removeSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?');
const pruneSessions = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');
const totals = db.prepare(`SELECT (SELECT count(*) FROM accounts) AS accounts,
  (SELECT count(*) FROM invoices) AS invoices, (SELECT count(*) FROM payments) AS payments`);

function page(title, content) {
  return `<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | MabynAccounts</title>
<style>
body{margin:0;background:#f3f6fa;color:#182942;font:16px system-ui}
main{max-width:840px;margin:8vh auto;padding:24px}header{color:#385b86;font-weight:700}
section,form.login{background:white;border:1px solid #dbe4ef;border-radius:14px;padding:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px;margin:24px 0}
strong{display:block;font-size:2rem}label,input{display:block;margin:8px 0}
input,button{font:inherit;padding:9px;border:1px solid #7089a8;border-radius:6px}
button{background:#193c66;color:white;cursor:pointer}form.login{max-width:360px}
</style><main><header>MabynAccounts</header><h1>${title}</h1>${content}</main></html>`;
}

function login(message = '') {
  return page('Sign in', `<form class="login" method="post" action="/login">
  <p role="status">${message}</p>
  <label>Email <input name="email" type="email" autocomplete="username" required></label>
  <label>Password <input name="password" type="password" autocomplete="current-password" required></label>
  <button>Sign in</button></form>`);
}

function cookie(token, age) {
  return `${cookieName}=${token}; Path=/; Max-Age=${age}; HttpOnly; SameSite=Strict${production ? '; Secure' : ''}`;
}

async function formData(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > 4096) return null;
    chunks.push(chunk);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}

// Bound password checks for the single administrator on this instance.
let attempts = 0;
let resetAt = 0;

createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const send = (status, body) => { res.statusCode = status; res.end(body); };
  const redirect = path => { res.setHeader('Location', path); send(303); };
  const path = req.url.split('?')[0];
  const token = (req.headers.cookie || '').split(/; */)
    .find(pair => pair.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  const tokenHash = token && hash(token);
  try {
    const now = Math.floor(Date.now() / 1000);
    if (req.method === 'GET' && path === '/healthz') {
      db.prepare('SELECT 1 FROM sessions LIMIT 1').get();
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return send(200, 'ok');
    }
    if (req.method === 'POST' && ['/login', '/logout'].includes(path)) {
      const origin = `${production ? 'https' : 'http'}://${req.headers.host}`;
      if (req.headers.origin !== origin) return send(403, 'Invalid request origin');
      if (path === '/logout') {
        if (tokenHash) removeSession.run(tokenHash);
        res.setHeader('Set-Cookie', cookie('', 0));
        return redirect('/');
      }
      if (req.headers['content-type']?.split(';')[0] !== 'application/x-www-form-urlencoded') {
        return send(415, 'Expected a form submission');
      }
      const fields = await formData(req);
      if (!fields) return send(413, 'Form too large');
      if (now >= resetAt) {
        attempts = 0;
        resetAt = now + 60;
      }
      if (attempts >= 10) {
        res.setHeader('Retry-After', String(resetAt - now));
        return send(429, login('Too many attempts. Try again in a minute.'));
      }
      attempts += 1;
      const suppliedKey = await deriveKey(fields.get('password') || '', salt, 64);
      if (!timingSafeEqual(suppliedKey, passwordKey) ||
          fields.get('email')?.trim().toLowerCase() !== ADMIN_EMAIL.trim().toLowerCase()) {
        return send(401, login('Email or password is incorrect.'));
      }
      const newToken = randomBytes(32).toString('hex');
      pruneSessions.run(now);
      if (tokenHash) removeSession.run(tokenHash);
      addSession.run(hash(newToken), now + sessionLifetime);
      res.setHeader('Set-Cookie', cookie(newToken, sessionLifetime));
      return redirect('/dashboard');
    }
    if (req.method === 'GET' && (path === '/' || path === '/dashboard')) {
      const authenticated = tokenHash && session.get(tokenHash, now);
      if (path === '/') return authenticated ? redirect('/dashboard') : send(200, login());
      if (!authenticated) return redirect('/');
      const { accounts, invoices, payments } = totals.get();
      return send(200, page('Accounts dashboard', `<p>Overview of records in this workspace.</p>
        <div class="grid"><section>Accounts<strong>${accounts}</strong></section>
        <section>Invoices<strong>${invoices}</strong></section>
        <section>Payments<strong>${payments}</strong></section></div>
        <section><h2>Workspace setup</h2><p>Invoice entry, collections, and bank reconciliation are planned.</p>
        <form method="post" action="/logout"><button>Sign out</button></form></section>`));
    }
    return send(404, 'Page not found');
  } catch (error) {
    console.error(error);
    return send(500, 'Server error');
  }
}).listen(Number(PORT), production ? '0.0.0.0' : '127.0.0.1', () => {
  console.log(`MabynAccounts is listening on port ${PORT}`);
});
