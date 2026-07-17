import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAuthoritativeProjectContext,
  normalizeProjectOutputPresetId,
  ProjectBrandContextError
} from './project-brand-context.mjs';

const brandedProject = {
  brandSnapshot: {
    brandId: 'cosyland',
    brandName: 'Cosyland',
    brandVersion: 3,
    outputPresetId: 'a-plus',
    rules: {
      name: 'Cosyland',
      colors: [{ hex: '#FFFFFF', ratio: 70, role: 'background', scope: 'aplus-only' }],
      titleColor: '#20362C'
    }
  },
  projectData: { form: { brandId: 'cosyland', projectName: 'Frozen project' } }
};

test('normalizes A+ aliases to the client preset id', () => {
  assert.equal(normalizeProjectOutputPresetId('a-plus'), 'aplus');
  assert.equal(normalizeProjectOutputPresetId('aplus'), 'aplus');
  assert.equal(normalizeProjectOutputPresetId('main-image'), 'main-image');
});

test('replaces client brand data with the frozen project snapshot', () => {
  const result = applyAuthoritativeProjectContext({
    brandProfile: { id: 'fake', name: 'Local cache' },
    projectForm: { brandId: 'fake', projectName: 'Client project' },
    prompt: 'Generate the image.'
  }, brandedProject, { prependPrompt: true });
  assert.equal(result.brandProfile.id, 'cosyland');
  assert.equal(result.brandVersion, 3);
  assert.equal(result.projectForm.projectName, 'Frozen project');
  assert.equal(result.outputPresetId, 'aplus');
  assert.match(result.prompt, /version: 3/);
  assert.match(result.prompt, /role background/);
  assert.match(result.prompt, /scope aplus-only/);
  assert.match(result.prompt, /never print swatches, percentages, or HEX codes/i);
  assert.doesNotMatch(result.prompt, /Local cache/);
});

test('uses the saved project copy language as an authoritative generation contract', () => {
  const result = applyAuthoritativeProjectContext({
    projectForm: { marketplaceId: 'amazon-us', outputLanguage: 'en-US' },
    prompt: 'Render all text in English.'
  }, {
    ...brandedProject,
    projectData: {
      form: {
        brandId: 'cosyland',
        projectName: 'Japanese project',
        marketplaceId: 'amazon-jp',
        outputLanguage: 'ja-JP'
      }
    }
  }, { prependPrompt: true });
  assert.equal(result.projectForm.marketplaceId, 'amazon-jp');
  assert.equal(result.projectForm.outputLanguage, 'ja-JP');
  assert.match(result.prompt, /SERVER PROJECT COPY LANGUAGE CONTRACT/);
  assert.match(result.prompt, /natural Japanese suitable for Amazon Japan/);
});

test('allows explicit baseline mode without applying the project brand rules', () => {
  const result = applyAuthoritativeProjectContext({ baselineMode: true }, brandedProject);
  assert.equal(result.brandProfile.id, 'none');
  assert.equal(result.brandVersion, 0);
  assert.equal(result.brandSnapshot.brandId, 'cosyland');
});

test('does not send brand palette rules to the primary white-background slot', () => {
  const result = applyAuthoritativeProjectContext({
    slotId: 1,
    prompt: 'Generate the primary image.'
  }, {
    ...brandedProject,
    brandSnapshot: {
      ...brandedProject.brandSnapshot,
      outputPresetId: 'main-image',
      rules: {
        ...brandedProject.brandSnapshot.rules,
        colors: [{ hex: '#FF6600', ratio: 100, role: 'accent', scope: 'secondary-and-aplus' }]
      }
    }
  }, { prependPrompt: true });
  assert.doesNotMatch(result.prompt, /#FF6600/);
  assert.doesNotMatch(result.prompt, /Palette:/);
});

test('blocks branded generation when a frozen snapshot is missing', () => {
  assert.throws(
    () => applyAuthoritativeProjectContext({ baselineMode: false }, {
      brandSnapshot: { brandId: 'cosyland' },
      projectData: { form: { brandId: 'cosyland' } }
    }),
    ProjectBrandContextError
  );
});
