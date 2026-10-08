import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const code = ts.transpileModule(readFileSync(new URL('../src/components/IssueTable.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const exports = {};
runInNewContext(code, { exports, require });

// Render the real component with synthetic records; no API, login or database.
function statusCell(status) {
  const html = renderToStaticMarkup(createElement(exports.IssueTable, {
    title: 'Fixture issues',
    issues: [{
      id: 1, repo: 'example/project', issue_number: 1, title: 'Fixture issue',
      status, difficulty_score: 0.5, retry_count: 0, error_message: null,
      updated_at: '2026-01-01T00:00:00Z',
    }],
  }));
  const cells = [...html.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)];
  assert.equal(cells.length, 6);
  return cells[2][1];
}

function statusText(cell) {
  return cell.replace(/<svg\b[\s\S]*?<\/svg>/g, '').replace(/<[^>]*>/g, '');
}

for (const status of ['pending', 'processing', 'completed', 'failed']) {
  test(`retains the existing ${status} label and animation`, () => {
    const cell = statusCell(status);
    assert.equal(statusText(cell), status.toUpperCase());
    assert.equal(cell.includes('animate-spin'), status === 'processing');
    assert.ok(!cell.includes('Unrecognized issue status'));
  });
}

// Values in Auto-Contributor's issue model that have no dashboard presentation.
for (const status of ['discovered', 'analyzing', 'engineering', 'reviewing', 'rework',
  'submitting', 'merged', 'abandoned', 'pr_created', 'awaiting_review']) {
  test(`preserves unrecognized ${status} instead of calling it pending`, () => {
    const cell = statusCell(status);
    assert.equal(statusText(cell), status);
    assert.ok(cell.includes('Unrecognized issue status'));
    assert.ok(cell.includes('text-[#a1a1aa]'));
    assert.ok(!cell.includes('PENDING'));
    assert.ok(!cell.includes('animate-spin'));
  });
}

test('renders an empty status as unknown', () => {
  assert.equal(statusText(statusCell('')), 'UNKNOWN');
});

test('preserves and escapes unfamiliar status text through React', () => {
  const cell = statusCell('Awaiting <review> & "approval"');
  assert.equal(statusText(cell), 'Awaiting &lt;review&gt; &amp; &quot;approval&quot;');
});
