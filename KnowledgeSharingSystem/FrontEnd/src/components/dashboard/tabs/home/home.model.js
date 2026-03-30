export function createHomeModel(input) {
  return {
    docs: Array.isArray(input.docs) ? input.docs : [],
    myDocs: Array.isArray(input.myDocs) ? input.myDocs : [],
  };
}
