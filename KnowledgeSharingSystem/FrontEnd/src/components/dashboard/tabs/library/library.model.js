export function createLibraryModel(input) {
  return {
    isBusy: Boolean(input.isBusy),
    myDocs: Array.isArray(input.myDocs) ? input.myDocs : [],
  };
}
