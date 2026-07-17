import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProjectStatusAfterBrandUpgrade,
  invalidateProjectDataForBrandUpgrade
} from './project-brand-upgrade.mjs';

test('brand upgrade preserves inputs and invalidates all derived image work', () => {
  const upgraded = invalidateProjectDataForBrandUpgrade({
    form: { projectName: 'Chair', storyboardSlotCountOverride: 7, referenceImages: { main: { storageKey: 'main.png' } } },
    ledgerFacts: [{ claim: 'Foldable' }],
    storyboardBriefs: [{ id: 1 }],
    reviewDecisions: [{ slotId: 1, status: 'approved' }],
    generationRuns: [{ id: 'run-1' }],
    promptOverrides: { 1: 'old rule' },
    exportSelections: { 1: 'run-1' },
    productIdentity: { sku: 'CHAIR-01' }
  }, { fromVersion: 2, toVersion: 4, upgradedAt: '2026-07-16T00:00:00.000Z' });

  assert.equal(upgraded.form.projectName, 'Chair');
  assert.equal(upgraded.form.storyboardSlotCountOverride, 0);
  assert.equal(upgraded.form.referenceImages.main.storageKey, 'main.png');
  assert.deepEqual(upgraded.ledgerFacts, [{ claim: 'Foldable' }]);
  assert.deepEqual(upgraded.productIdentity, { sku: 'CHAIR-01' });
  assert.deepEqual(upgraded.storyboardBriefs, []);
  assert.deepEqual(upgraded.reviewDecisions, []);
  assert.deepEqual(upgraded.generationRuns, []);
  assert.deepEqual(upgraded.promptOverrides, {});
  assert.deepEqual(upgraded.exportSelections, {});
  assert.equal(upgraded.brandUpgrade.fromVersion, 2);
  assert.equal(upgraded.brandUpgrade.toVersion, 4);
});

test('brand upgrade status returns to the earliest valid workflow stage', () => {
  assert.equal(getProjectStatusAfterBrandUpgrade({ ledgerFacts: [{ claim: 'Durable' }] }), 'content');
  assert.equal(getProjectStatusAfterBrandUpgrade({ ledgerFacts: [] }), 'draft');
});
