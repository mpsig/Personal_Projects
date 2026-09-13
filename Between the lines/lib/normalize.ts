export function normalize(value: string) {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/['’‘`]/g, '').replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
// No edit-distance matching, article removal, subtitle stripping, or surname-only matching.
export function sameName(a: string, b: string) { return normalize(a) === normalize(b); }
