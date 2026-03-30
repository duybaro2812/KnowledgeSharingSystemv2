export function createProfileModel(input) {
  return {
    user: input.user || null,
    stats: input.stats || { followers: 0, uploads: 0, upvotes: 0 },
  };
}
