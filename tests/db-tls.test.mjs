import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import pg from 'pg';
import connectionString from 'pg-connection-string';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('../src/lib/db.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function sslFor(url, insecure) {
  let config;
  runInNewContext(code, {
    exports: {}, URL,
    process: { env: { DATABASE_URL: url, DATABASE_SSL_INSECURE: insecure } },
    require(name) {
      if (name === 'pg') return { Pool: class { constructor(options) { config = options; } } };
      if (name === 'pg-connection-string') return connectionString;
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return new pg.Client(config).connectionParameters.ssl;
}

for (const query of ['', 'sslmode=no-verify', 'sslmode=disable', 'ssl=false', 'ssl=0',
  'sslmode=require', 'sslmode=require&uselibpqcompat=true',
  'connectionString=postgres%3A%2F%2Fuser%3Apassword%40localhost%2Fdb%3Fsslmode%3Dno-verify']) {
  test(`URL cannot weaken TLS: ${query || 'no parameters'}`, () => {
    const url = `postgres://user:password@localhost/db?${query}`;
    for (const flag of [undefined, 'false', 'TRUE', '1']) {
      const ssl = sslFor(url, flag);
      assert.equal(ssl.rejectUnauthorized, true);
      assert.equal(ssl.checkServerIdentity, undefined, 'retain Node hostname verification');
    }
    assert.equal(sslFor(url, 'true').rejectUnauthorized, false);
  });
}

test('preserves root CA and client certificate/key, including libpq and disabled SSL modes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dashboard-tls-'));
  try {
    const params = new URLSearchParams();
    for (const key of ['sslrootcert', 'sslcert', 'sslkey']) {
      const file = join(dir, key);
      writeFileSync(file, `fixture-${key}`);
      params.set(key, file);
    }
    params.set('uselibpqcompat', 'true');
    for (const mode of ['require', 'verify-ca', 'disable']) {
      params.set('sslmode', mode);
      const ssl = sslFor(`postgres://user:password@localhost/db?${params}`);
      assert.equal(ssl.ca, 'fixture-sslrootcert');
      assert.equal(ssl.cert, 'fixture-sslcert');
      assert.equal(ssl.key, 'fixture-sslkey');
      assert.equal(ssl.rejectUnauthorized, true);
      assert.equal(ssl.checkServerIdentity, undefined);
    }
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('invalid URLs fail without including database credentials', () => {
  assert.throws(() => sslFor('postgres://user:private-password@['),
    { message: 'DATABASE_URL is not a valid URL' });
});

test('TLS stays enabled without a connection URL', () => {
  assert.equal(sslFor(undefined).rejectUnauthorized, true);
});
