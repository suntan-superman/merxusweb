/**
 * Capitalize the first letter of each word while preserving apostrophes.
 * Example: "o'brien law office" -> "O'Brien Law Office"
 */
export function capitalizeWordsPreservingApostrophes(value) {
  return String(value || '').replace(/(^|[\s\-/(])([a-z])/g, (match, prefix, letter) => {
    return `${prefix}${letter.toUpperCase()}`;
  });
}
