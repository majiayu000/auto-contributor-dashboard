import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const origin = 'https://dashboard.example';
const endpoint = `${origin}/api/admin/login`;
const secret = 'test-admin-token';

function loadLogin(node_env = 'production', token = secret) {
  const process = { env: { ADMIN_API_TOKEN: token, NODE_ENV: node_env } };
  function load(path, dependencies = {}) {
    const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {};
    runInNewContext(code, {
      exports, process, Buffer, URL, console,
      require(name) { return dependencies[name] ?? require(name); },
    });
    return exports;
  }
  const auth = load('../src/lib/admin-auth.ts');
  const route = load('../src/app/api/admin/login/route.ts', { '@/lib/admin-auth': auth });
  return { ...route, auth };
}

function request(method, headers = {}, body) {
  return new Request(endpoint, { method, headers, body });
}

async function assertForbidden(response) {
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: 'Forbidden' });
  assert.equal(response.headers.get('set-cookie'), null);
}

test('failed JSON and non-JSON login attempts preserve an existing session', async () => {
  const { POST, GET, auth } = loadLogin();
  const cookie = auth.buildAdminSessionCookie().split(';')[0];
  for (const headers of [{ origin }, { origin: 'https://attacker.example' }, {}]) {
    for (const [content_type, body] of [
      ['application/json', JSON.stringify({ token: 'wrong-token' })],
      ['application/json', '{}'],
      ['application/json', 'null'],
      ['application/json', '{'],
      ['application/x-www-form-urlencoded', 'token=wrong-token'],
      ['text/plain', 'token=wrong-token'],
    ]) {
      const response = await POST(request('POST', { ...headers, cookie, 'content-type': content_type }, body));
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: 'Unauthorized' });
      assert.equal(response.headers.get('set-cookie'), null, 'failed login must not expire the session');
      assert.deepEqual(await (await GET(request('GET', { cookie }))).json(), { authenticated: true });
    }
  }
});

test('cross-site form POST cannot clear a cookie even when SameSite withholds it', async () => {
  const { POST } = loadLogin();
  const response = await POST(request('POST', {
    origin: 'https://attacker.example',
    'content-type': 'application/x-www-form-urlencoded',
  }, 'token=wrong-token'));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('set-cookie'), null);
});

for (const method of ['POST', 'DELETE']) {
  test(`cookie-writing ${method} rejects untrusted or missing source headers`, async () => {
    const { POST, DELETE } = loadLogin();
    for (const headers of [
      {},
      { origin: 'null' },
      { origin: '' },
      { origin: 'invalid' },
      { origin: 'https://attacker.example' },
      { origin: 'http://dashboard.example' },
      { origin: 'https://dashboard.example:444' },
      { origin: 'https://dashboard.example.attacker.example' },
      { origin: 'https://sibling.dashboard.example' },
      { origin: 'https://attacker.example', referer: `${origin}/` },
      { origin: 'null', referer: `${origin}/` },
      { referer: 'invalid' },
      { referer: 'https://attacker.example/' },
      { referer: 'https://dashboard.example.attacker.example/' },
    ]) {
      await assertForbidden(method === 'POST'
        ? await POST(request('POST', headers, JSON.stringify({ token: secret })))
        : await DELETE(request('DELETE', headers)));
    }
  });
}

for (const node_env of ['production', 'development']) {
  test(`same-origin login and logout retain cookie attributes in ${node_env}`, async () => {
    const { POST, GET, DELETE, auth } = loadLogin(node_env, ` ${secret}\n`);
    for (const headers of [{ origin }, { referer: `${origin}/dashboard?tab=blacklist` }]) {
      for (const bearer of [false, true]) {
        const response = await POST(request('POST', {
          ...headers,
          'content-type': bearer ? 'text/plain' : 'application/json',
          ...(bearer ? { authorization: `Bearer ${secret}` } : {}),
        }, bearer ? 'not JSON' : JSON.stringify({ token: ` ${secret} ` })));
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { success: true });
        const cookie = response.headers.get('set-cookie');
        assert.match(cookie, /^admin_session=v1\./);
        assert.ok(!cookie.includes(secret), 'cookie stores a derived credential');
        assert.match(cookie, /; Path=\/; HttpOnly; SameSite=Strict; Max-Age=604800/);
        assert.equal(cookie.includes('; Secure'), node_env === 'production');
        const session = request('GET', { cookie: cookie.split(';')[0] });
        assert.deepEqual(await (await GET(session)).json(), { authenticated: true });
        assert.equal(auth.requireAdminAuth(session), null);
        const logout = await DELETE(request('DELETE', headers));
        assert.equal(logout.status, 200);
        assert.deepEqual(await logout.json(), { success: true });
        assert.equal(logout.headers.get('set-cookie'),
          `admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${node_env === 'production' ? '; Secure' : ''}`);
        assert.deepEqual(await (await GET(request('GET', { cookie: 'admin_session=' }))).json(),
          { authenticated: false });
      }
    }
    assert.equal(auth.requireAdminAuth(request('GET', { authorization: `Bearer ${secret}` })), null);
    assert.deepEqual(await (await GET(request('GET', { authorization: `Bearer ${secret}` }))).json(),
      { authenticated: false });
  });
}

test('unconfigured admin token keeps the unauthorized response without cookie writes', async () => {
  const { POST } = loadLogin('production', '');
  const response = await POST(request('POST', { origin }, JSON.stringify({ token: secret })));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized' });
  assert.equal(response.headers.get('set-cookie'), null);
});

test('same-origin cookie writes use the browser Host rather than the internal server URL', async () => {
  const { POST, DELETE } = loadLogin();
  for (const host of ['dashboard.example', 'dashboard.example:443']) {
    const headers = { host, origin };
    const internal_url = 'https://localhost:3000/api/admin/login';
    const login = await POST(new Request(internal_url, {
      method: 'POST', headers, body: JSON.stringify({ token: secret }),
    }));
    assert.equal(login.status, 200);
    assert.ok(login.headers.get('set-cookie'));
    assert.equal((await DELETE(new Request(internal_url, { method: 'DELETE', headers }))).status, 200);
    for (const source of ['https://localhost:3000', 'https://attacker.example']) {
      await assertForbidden(await DELETE(new Request(internal_url, {
        method: 'DELETE', headers: { host, origin: source, 'x-forwarded-host': 'attacker.example' },
      })));
    }
  }
});
