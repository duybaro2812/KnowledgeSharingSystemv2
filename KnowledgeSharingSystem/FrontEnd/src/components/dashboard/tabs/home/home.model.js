export function createHomeModel(input) {
  const userPoints = Number(input.user?.points ?? 0);

  const docs = (Array.isArray(input.docs) ? input.docs : []).map((doc, index) => {
    const requiredPointsRaw = doc?.requiredPoints;
    const requiredPoints =
      Number.isFinite(Number(requiredPointsRaw)) && Number(requiredPointsRaw) >= 0
        ? Number(requiredPointsRaw)
        : index % 5 === 1
          ? 20
          : 0;

    const isLockedForPoints = userPoints < requiredPoints;
    return {
      ...doc,
      requiredPoints,
      isLockedForPoints,
    };
  });

  return {
    docs,
    myDocs: Array.isArray(input.myDocs) ? input.myDocs : [],
    currentUserId: input.user?.userId || null,
    userPoints,
  };
}
