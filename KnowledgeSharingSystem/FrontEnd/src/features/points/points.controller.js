export function createPointsController(input) {
  return {
    onRefresh: () => input.loadAllPointData?.(),
  };
}

