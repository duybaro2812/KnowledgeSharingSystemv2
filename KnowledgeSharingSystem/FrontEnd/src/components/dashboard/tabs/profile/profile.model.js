export function createProfileModel(input) {
  return {
    isBusy: Boolean(input.isBusy),
    user: input.user || null,
    stats: input.stats || { uploads: 0, pending: 0, upvotes: 0 },
  };
}
