export function createSearchModel(input) {
  return {
    keyword: String(input.docFilter?.keyword || "").trim(),
    docs: Array.isArray(input.docs) ? input.docs : [],
  };
}
