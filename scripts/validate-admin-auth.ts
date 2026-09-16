/**
 * Lightweight validation for admin-auth session helpers (no test runner in package).
 * Run: npx --yes tsx scripts/validate-admin-auth.ts
 */
import assert from 'node:assert/strict';
import {
  createAdminSessionValue,
  safeEqualSecret,
  verifyAdminSessionValue,
} from '../src/lib/admin-auth';

const secret = 'test-secret-value';
const now = 1_700_000_000;

const session = createAdminSessionValue(secret, now);
assert.ok(verifyAdminSessionValue(session, secret, now), 'fresh session should verify');
assert.ok(
  !verifyAdminSessionValue(session, secret, now + 60 * 60 * 24 * 8),
  'expired session should fail'
);
assert.ok(!verifyAdminSessionValue(session, 'other-secret', now), 'wrong secret should fail');
assert.ok(!verifyAdminSessionValue('not-a-session', secret, now), 'garbage should fail');
assert.ok(!verifyAdminSessionValue(session.slice(0, -1) + 'x', secret, now), 'tampered sig should fail');

assert.ok(safeEqualSecret('abc', 'abc'));
assert.ok(!safeEqualSecret('abc', 'abd'));
assert.ok(!safeEqualSecret('abc', 'abcd'));

// Simulate decodeURIComponent throw path conceptually: malformed % is handled by extractCookieValue.
assert.throws(() => decodeURIComponent('%'), URIError);

console.log('admin-auth validation passed');
