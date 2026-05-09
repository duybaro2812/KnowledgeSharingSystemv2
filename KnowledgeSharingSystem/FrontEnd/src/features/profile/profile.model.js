export function createProfileModel(input) {
  const uploadedDocs = Array.isArray(input.myDocs) ? input.myDocs : [];
  return {
    isBusy: Boolean(input.isBusy),
    user: input.user || null,
    stats: input.stats || { uploads: 0, pending: 0, upvotes: 0 },
    uploadedDocs,
  };
}
