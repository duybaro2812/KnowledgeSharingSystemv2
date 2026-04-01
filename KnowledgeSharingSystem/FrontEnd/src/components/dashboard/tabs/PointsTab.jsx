import { createPointsController } from "./points/points.controller";
import { createPointsModel } from "./points/points.model";
import PointsTabView from "./points/PointsTabView";

function PointsTab(props) {
  const model = createPointsModel(props);
  const controller = createPointsController(props);
  return <PointsTabView model={model} controller={controller} />;
}

export default PointsTab;

