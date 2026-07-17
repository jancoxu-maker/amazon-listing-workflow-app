import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getVisibleCopyLanguageInstruction,
  normalizeProjectLanguageFields
} from '../shared/output-language.mjs';

test('defaults legacy projects to Amazon US and US English', () => {
  assert.deepEqual(normalizeProjectLanguageFields({}), {
    marketplaceId: 'amazon-us',
    outputLanguage: 'en-US'
  });
});

test('uses the marketplace default language when no explicit language is stored', () => {
  assert.equal(normalizeProjectLanguageFields({ marketplaceId: 'amazon-jp' }).outputLanguage, 'ja-JP');
});

test('keeps an explicit project language independent from the input language', () => {
  const instruction = getVisibleCopyLanguageInstruction({
    marketplaceId: 'amazon-jp',
    outputLanguage: 'ja-JP'
  });
  assert.match(instruction, /natural Japanese/);
  assert.match(instruction, /Input facts and instructions may be written in any language/);
  assert.doesNotMatch(instruction, /English only/);
});

test('supports a no-visible-copy project mode', () => {
  assert.match(
    getVisibleCopyLanguageInstruction({ outputLanguage: 'none' }, { review: true }),
    /NO VISIBLE COPY/
  );
});
