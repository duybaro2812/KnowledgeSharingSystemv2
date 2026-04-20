export function createSearchModel(input) {
  return {
    isBusy: Boolean(input.isBusy),
    keyword: String(input.docFilter?.keyword || "").trim(),
    docs: Array.isArray(input.docs) ? input.docs : [],
  };
}
