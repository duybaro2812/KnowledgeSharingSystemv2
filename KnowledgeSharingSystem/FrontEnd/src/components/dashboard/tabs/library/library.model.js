export function createLibraryModel(input) {
  return {
    myDocs: Array.isArray(input.myDocs) ? input.myDocs : [],
  };
}
