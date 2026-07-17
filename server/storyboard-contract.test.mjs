import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatStoryboardSlotContract,
  normalizeStoryboardSlotContract
} from '../shared/storyboard-contract.mjs';

test('primary listing slot always blocks visible copy, logo and brand colors', () => {
  const contract = normalizeStoryboardSlotContract({
    id: 1,
    outputPresetId: 'main-image',
    outputPresetSize: '2000 x 2000',
    projectForm: { brandId: 'cosyland', outputLanguage: 'ja-JP' },
    brand: { id: 'cosyland', colors: [{ hex: '#7E49FE' }] },
    slot: { allowedCopy: ['日本語タイトル'] }
  });
  assert.deepEqual(contract.allowedCopy, []);
  assert.deepEqual(contract.brandRules.allowedColors, []);
  assert.equal(contract.outputSpec.logoAllowed, false);
  assert.equal(contract.outputSpec.backgroundRule, '纯白背景');
});

test('secondary slot preserves a structured evidence and brand contract', () => {
  const contract = normalizeStoryboardSlotContract({
    id: 2,
    visualType: 'lifestyle',
    primaryClaim: 'Compact storage',
    visualProof: 'Show the folded product beside a narrow closet gap.',
    outputPresetId: 'main-image',
    outputPresetSize: '2000 x 2000',
    projectForm: { brandId: 'cosyland', outputLanguage: 'en-US' },
    brand: {
      id: 'cosyland',
      version: 3,
      colors: [{ hex: '#7E49FE' }],
      titleColor: '#2F4A35',
      arrowStyle: 'rounded'
    },
    slot: {
      allowedCopy: ['Folds Flat'],
      scenePlan: {
        environment: 'Bright home storage area',
        requiredElements: ['Folded product', 'Narrow storage gap']
      }
    }
  });
  assert.deepEqual(contract.evidenceMap, [{
    claim: 'Compact storage',
    evidence: 'Show the folded product beside a narrow closet gap.'
  }]);
  assert.deepEqual(contract.allowedCopy, ['Folds Flat']);
  assert.deepEqual(contract.brandRules.allowedColors, ['#7E49FE']);
  assert.equal(contract.outputSpec.titlePlacement, '标题统一置于画面上方');
  assert.match(formatStoryboardSlotContract(contract), /Evidence map:/);
});

test('no-visible-copy mode removes copy from every output type', () => {
  const contract = normalizeStoryboardSlotContract({
    id: 3,
    outputPresetId: 'aplus',
    projectForm: { brandId: 'none', outputLanguage: 'none' },
    slot: { allowedCopy: ['Should disappear'] }
  });
  assert.deepEqual(contract.allowedCopy, []);
  assert.equal(contract.outputSpec.titlePlacement, '无标题');
});
