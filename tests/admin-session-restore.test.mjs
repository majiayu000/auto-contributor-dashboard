import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
const settle = () => new Promise((resolve) => setImmediate(resolve));

// Execute the real component and its handlers with deterministic hooks and deferred
// fetches. No browser session, auth service, database, or real credential is used.
function dashboard({ restore = deferred(), data_status = 200, login_status = 200, logout_status = 200,
  mutation_status = 200 } = {}) {
  const slots = [];
  const effects = [];
  const errors = [];
  let cursor = 0;
  let effect_cursor = 0;
  let restore_options;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => { slots[index] = value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback: (callback) => callback,
    useEffect(callback) {
      const index = effect_cursor++;
      if (!(index in effects)) effects[index] = { callback };
    },
  };
  const exports = {};
  runInNewContext(code, {
    exports, AbortController,
    console: { error: (...args) => errors.push(args) },
    window: { setTimeout: () => 1, clearTimeout() {} },
    setInterval: () => 1, clearInterval() {},
    fetch: async (url, options = {}) => {
      if (url === '/api/admin/login') {
        if (options.method === 'POST') return response({ error: 'Dummy login failed' }, login_status);
        if (options.method === 'DELETE') return response({}, logout_status);
        restore_options = options;
        // Deliberately allow a response after cancellation, including delayed JSON.
        return restore.promise;
      }
      if (options.method) return response({ error: 'Dummy mutation failed' }, mutation_status);
      if (url === '/api/stats') return response({
        total_issues: 1, pending_issues: 1, processing_issues: 0, completed_issues: 0,
        failed_issues: 0, total_prs: 0, success_rate: 0,
      }, data_status);
      return response([], data_status);
    },
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props }) };
      if (name === 'lucide-react') return {};
      if (name.startsWith('@/components/')) {
        const component = name.split('/').at(-1);
        return { [component]: component };
      }
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const render = () => {
    cursor = 0;
    effect_cursor = 0;
    return exports.default();
  };
  const find_panel = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'BlacklistManager') return node.props;
    for (const child of [node.props?.children].flat()) {
      const result = find_panel(child);
      if (result) return result;
    }
  };
  render();
  for (const effect of effects) effect.cleanup = effect.callback();
  return {
    restore, errors,
    panel: () => find_panel(render()),
    restore_signal: () => restore_options.signal,
    unmount: () => effects.forEach((effect) => effect.cleanup?.()),
    replay_effects() {
      effects.forEach((effect) => effect.cleanup?.());
      effects.forEach((effect) => { effect.cleanup = effect.callback(); });
    },
  };
}

test('a delayed logged-out restore cannot overwrite successful login', async () => {
  const app = dashboard();
  await settle();
  await app.panel().onAdminLogin('dummy-token');
  assert.equal(app.panel().adminAuthenticated, true);
  app.restore.resolve(response({ authenticated: false }));
  await settle();
  assert.equal(app.panel().adminAuthenticated, true);
  assert.equal(app.restore_signal().aborted, true);
});

test('logout cancels a delayed logged-in restore', async () => {
  const app = dashboard();
  await settle();
  await app.panel().onAdminLogout();
  app.restore.resolve(response({ authenticated: true }));
  await settle();
  assert.equal(app.panel().adminAuthenticated, false);
  assert.equal(app.restore_signal().aborted, true);
});

test('a dashboard 401 clears private data and cancels restore', async () => {
  const app = dashboard({ data_status: 401 });
  await settle();
  app.restore.resolve(response({ authenticated: true }));
  await settle();
  assert.equal(app.panel().adminAuthenticated, false);
  assert.equal(app.restore_signal().aborted, true);
});

for (const action of ['onAdd', 'onRemove']) {
  test(`${action} 401 cancels restore and retains its rejection`, async () => {
    const app = dashboard({ mutation_status: 401 });
    await settle();
    await assert.rejects(app.panel()[action]('dummy/repo', 'dummy reason'), { message: 'Dummy mutation failed' });
    app.restore.resolve(response({ authenticated: true }));
    await settle();
    assert.equal(app.panel().adminAuthenticated, false);
    assert.equal(app.restore_signal().aborted, true);
  });
}

test('login also invalidates restore after headers arrive but before JSON resolves', async () => {
  const json = deferred();
  const app = dashboard();
  app.restore.resolve({ ok: true, json: () => json.promise });
  await settle();
  await app.panel().onAdminLogin('dummy-token');
  json.resolve({ authenticated: false });
  await settle();
  assert.equal(app.panel().adminAuthenticated, true);
});

test('restore still authenticates an unchanged valid session', async () => {
  const app = dashboard();
  app.restore.resolve(response({ authenticated: true }));
  await settle();
  assert.equal(app.panel().adminAuthenticated, true);
});

test('Strict Mode effect replay cancels only the first restore', async () => {
  const app = dashboard();
  const first_signal = app.restore_signal();
  app.replay_effects();
  assert.equal(first_signal.aborted, true);
  assert.equal(app.restore_signal().aborted, false);
  app.restore.resolve(response({ authenticated: true }));
  await settle();
  assert.equal(app.panel().adminAuthenticated, true);
});

test('failed login preserves restore and its existing error', async () => {
  const app = dashboard({ login_status: 401 });
  await settle();
  await assert.rejects(app.panel().onAdminLogin('dummy-token'), { message: 'Dummy login failed' });
  app.restore.resolve(response({ authenticated: true }));
  await settle();
  assert.equal(app.panel().adminAuthenticated, true);
});

test('failed logout preserves restore and its existing error', async () => {
  const app = dashboard({ logout_status: 500 });
  await settle();
  await assert.rejects(app.panel().onAdminLogout(), { message: 'Failed to logout' });
  app.restore.resolve(response({ authenticated: true }));
  await settle();
  assert.equal(app.panel().adminAuthenticated, true);
});

test('unmount cancels restore without reporting cancellation as an error', async () => {
  const app = dashboard();
  app.unmount();
  app.restore.reject(new Error('Cancelled dummy request'));
  await settle();
  assert.equal(app.restore_signal().aborted, true);
  assert.equal(app.errors.length, 0);
});

test('non-cancellation restore failures remain visible', async () => {
  const app = dashboard();
  app.restore.reject(new Error('Dummy network failure'));
  await settle();
  assert.equal(app.panel().adminAuthenticated, false);
  assert.equal(app.errors.length, 1);
  assert.equal(app.errors[0][1].message, 'Dummy network failure');
});
