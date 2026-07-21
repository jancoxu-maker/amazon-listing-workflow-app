import test from 'node:test';
import assert from 'node:assert/strict';
import { isReworkRunReady } from '../src/rework-policy.mjs';

const returnedDecision = {
  returnedAt: '2026-07-21T08:00:00.000Z',
  returnedRunId: 'run-before-return'
};

test('a returned slot only accepts a new usable run generated after the return', () => {
  assert.equal(isReworkRunReady(returnedDecision, {
    id: 'run-before-return',
    verdict: 'usable',
    createdAt: '2026-07-21T07:59:00.000Z'
  }), false);
  assert.equal(isReworkRunReady(returnedDecision, {
    id: 'another-old-run',
    verdict: 'usable',
    createdAt: '2026-07-21T07:30:00.000Z'
  }), false);
  assert.equal(isReworkRunReady(returnedDecision, {
    id: 'run-after-return',
    verdict: 'needs_changes',
    createdAt: '2026-07-21T08:05:00.000Z'
  }), false);
  assert.equal(isReworkRunReady(returnedDecision, {
    id: 'run-after-return',
    verdict: 'usable',
    createdAt: '2026-07-21T08:05:00.000Z'
  }), true);
});
