function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function invalidateProjectDataForBrandUpgrade(projectData = {}, metadata = {}) {
  const current = safeObject(projectData);
  const form = safeObject(current.form);
  return {
    ...current,
    form: {
      ...form,
      storyboardSlotCountOverride: 0
    },
    storyboardBriefs: [],
    reviewDecisions: [],
    generationRuns: [],
    promptOverrides: {},
    exportSelections: {},
    brandUpgrade: {
      fromVersion: Number(metadata.fromVersion || 0),
      toVersion: Number(metadata.toVersion || 0),
      upgradedAt: metadata.upgradedAt || new Date().toISOString(),
      invalidated: [
        'storyboardBriefs',
        'reviewDecisions',
        'generationRuns',
        'promptOverrides',
        'exportSelections'
      ]
    }
  };
}

export function getProjectStatusAfterBrandUpgrade(projectData = {}) {
  const ledgerFacts = Array.isArray(projectData?.ledgerFacts) ? projectData.ledgerFacts : [];
  return ledgerFacts.length ? 'content' : 'draft';
}
