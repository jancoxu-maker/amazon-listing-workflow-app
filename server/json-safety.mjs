const INLINE_ASSET_PATTERN = /^data:(?:image\/|application\/octet-stream)[^,]*;base64,/i;

export function findInlineAsset(value, path = '$', seen = new WeakSet()) {
  if (typeof value === 'string') {
    return INLINE_ASSET_PATTERN.test(value) ? path : '';
  }
  if (!value || typeof value !== 'object') return '';
  if (seen.has(value)) return '';
  seen.add(value);

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const match = findInlineAsset(value[index], `${path}[${index}]`, seen);
      if (match) return match;
    }
    return '';
  }

  for (const [key, item] of Object.entries(value)) {
    const match = findInlineAsset(item, `${path}.${key}`, seen);
    if (match) return match;
  }
  return '';
}

export function hasInlineAsset(value) {
  return Boolean(findInlineAsset(value));
}
