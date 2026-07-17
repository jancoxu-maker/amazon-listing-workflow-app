export const MARKETPLACE_OPTIONS = [
  { id: 'amazon-us', label: 'Amazon US', defaultLanguage: 'en-US' },
  { id: 'amazon-uk', label: 'Amazon UK', defaultLanguage: 'en-GB' },
  { id: 'amazon-jp', label: 'Amazon JP', defaultLanguage: 'ja-JP' },
  { id: 'amazon-de', label: 'Amazon DE', defaultLanguage: 'de-DE' },
  { id: 'amazon-fr', label: 'Amazon FR', defaultLanguage: 'fr-FR' },
  { id: 'amazon-it', label: 'Amazon IT', defaultLanguage: 'it-IT' },
  { id: 'amazon-es', label: 'Amazon ES', defaultLanguage: 'es-ES' }
];

export const OUTPUT_LANGUAGE_OPTIONS = [
  { id: 'en-US', label: 'English (US)', promptName: 'natural Amazon-ready US English', reviewName: 'US English' },
  { id: 'en-GB', label: 'English (UK)', promptName: 'natural Amazon-ready British English', reviewName: 'British English' },
  { id: 'ja-JP', label: '日本語', promptName: 'natural Japanese suitable for Amazon Japan', reviewName: 'Japanese' },
  { id: 'de-DE', label: 'Deutsch', promptName: 'natural German suitable for Amazon Germany', reviewName: 'German' },
  { id: 'fr-FR', label: 'Français', promptName: 'natural French suitable for Amazon France', reviewName: 'French' },
  { id: 'it-IT', label: 'Italiano', promptName: 'natural Italian suitable for Amazon Italy', reviewName: 'Italian' },
  { id: 'es-ES', label: 'Español', promptName: 'natural Spanish suitable for Amazon Spain', reviewName: 'Spanish' },
  { id: 'none', label: '无可见文字', promptName: 'no visible copy', reviewName: 'no visible copy' }
];

export function getMarketplaceOption(value = '') {
  return MARKETPLACE_OPTIONS.find((option) => option.id === value) || MARKETPLACE_OPTIONS[0];
}

export function getOutputLanguageOption(value = '') {
  return OUTPUT_LANGUAGE_OPTIONS.find((option) => option.id === value) || OUTPUT_LANGUAGE_OPTIONS[0];
}

export function normalizeProjectLanguageFields(form = {}) {
  const marketplace = getMarketplaceOption(form.marketplaceId);
  const language = getOutputLanguageOption(form.outputLanguage || marketplace.defaultLanguage);
  return {
    marketplaceId: marketplace.id,
    outputLanguage: language.id
  };
}

export function getVisibleCopyLanguageInstruction(form = {}, options = {}) {
  const { review = false } = options;
  const language = getOutputLanguageOption(normalizeProjectLanguageFields(form).outputLanguage);
  if (language.id === 'none') {
    return review
      ? 'Project copy mode is NO VISIBLE COPY. Treat any newly generated title, label, badge, callout, caption, number, or marketing copy as a text-risk failure. Original photographed product labels may remain only when preserved from the reference image.'
      : 'Project copy mode is NO VISIBLE COPY. Do not render titles, labels, badges, callouts, captions, dimensions, or any other newly generated visible text.';
  }
  const exception = 'Official brand names, model names, and text already photographed on the referenced product may remain in their verified original spelling.';
  return review
    ? `The project target visible-copy language is ${language.reviewName}. Review all newly generated titles, labels, badges, callouts, captions, numbers, and claim text against that language. Text in another language, unnatural translation, mixed-language copy, misspelling, garbled characters, or unsupported wording is a text-risk warning or failure. ${exception}`
    : `All newly generated visible copy must use ${language.promptName} only. Input facts and instructions may be written in any language; understand them semantically and rewrite them in the project target language. Do not mix output languages or render garbled characters. ${exception}`;
}

export function getShortCopyDescription(form = {}) {
  const language = getOutputLanguageOption(normalizeProjectLanguageFields(form).outputLanguage);
  return language.id === 'none' ? 'no visible copy' : `short ${language.reviewName} copy`;
}
